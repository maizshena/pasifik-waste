'use strict';

const { pool }                     = require('../config/db');
const { success, error, paginate } = require('../utils/response');

// Safe notify wrapper — never crashes the caller
async function safeNotify(payload) {
  try {
    const { notify } = require('../utils/notify');
    await notify(payload);
  } catch (e) {
    console.warn('[NOTIFY WARN withdrawal]', e.message);
  }
}

// ─── request (Warga) ─────────────────────────────────────────────────────────
async function request(req, res) {
  const { amount, e_wallet, account_number, account_holder } = req.body;

  console.log('[WITHDRAWAL REQUEST] body:', req.body, 'user:', req.user);

  if (!amount || !e_wallet || !account_number || !account_holder) {
    return error(
      res,
      'amount, e_wallet, account_number, and account_holder are required',
      400
    );
  }

  const amt = parseInt(amount, 10);
  if (isNaN(amt) || amt <= 0) {
    return error(res, 'amount must be a positive integer', 400);
  }

  const userId = parseInt(req.user.id, 10);
  const conn   = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [[user]] = await conn.query(
      'SELECT id, balance, locked_balance FROM users WHERE id = ? FOR UPDATE',
      [userId]
    );

    console.log('[WITHDRAWAL] found user:', user);

    if (!user) {
      await conn.rollback();
      return error(res, 'User not found', 404);
    }

    const currentBalance = parseInt(String(user.balance), 10);
    const currentLocked  = parseInt(String(user.locked_balance), 10);

    console.log('[WITHDRAWAL] balance:', currentBalance, 'locked:', currentLocked, 'amt:', amt);

    if (currentBalance < amt) {
      await conn.rollback();
      return error(
        res,
        `Insufficient balance. Available: ${currentBalance.toLocaleString('id-ID')} pts`,
        400
      );
    }

    await conn.query(
      `UPDATE users
       SET balance        = balance - ?,
           locked_balance = locked_balance + ?
       WHERE id = ?`,
      [amt, amt, userId]
    );

    const [result] = await conn.query(
      `INSERT INTO withdrawals
         (user_id, amount, e_wallet, account_number, account_holder)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, amt, e_wallet.trim(), account_number.trim(), account_holder.trim()]
    );

    await conn.commit();

    console.log('[WITHDRAWAL] success, id:', result.insertId);

    // Non-critical — after commit, safe to fire and forget
    await safeNotify({
      recipients: 'admins',
      type:       'new_withdrawal',
      title:      'New Withdrawal Request',
      body:       `A warga requested a withdrawal of ${amt.toLocaleString('id-ID')} points.`,
      link:       '/withdrawals',
    });

    return success(
      res,
      { id: result.insertId },
      'Withdrawal request submitted',
      201
    );
  } catch (err) {
    await conn.rollback();
    console.error('[WITHDRAWAL ERROR]', err.message, err.stack);
    return error(res, 'Withdrawal request failed', 500, err.message);
  } finally {
    conn.release();
  }
}

// ─── listMy (Warga) ───────────────────────────────────────────────────────────
async function listMy(req, res) {
  const userId = parseInt(req.user.id, 10);
  try {
    const [rows] = await pool.query(
      `SELECT id, amount, , account_number, account_holder,
              status, rejection_reason, transfer_ref,
              created_at, processed_at
       FROM withdrawals
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );
    return success(res, rows);
  } catch (err) {
    return error(res, 'Failed to fetch withdrawals', 500, err.message);
  }
}

// ─── list (Admin+) ────────────────────────────────────────────────────────────
async function list(req, res) {
  const page   = Math.max(parseInt(req.query.page  || '1',  10), 1);
  const limit  = Math.min(parseInt(req.query.limit || '20', 10), 100);
  const offset = (page - 1) * limit;
  const status = req.query.status && req.query.status.trim() !== ''
    ? req.query.status : null;

  try {
    const conditions = [];
    const params     = [];

    if (status) { conditions.push('w.status = ?'); params.push(status); }

    const where = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : '';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM withdrawals w ${where}`,
      params
    );

    if (total === 0) return paginate(res, [], { page, limit, total: 0 });

    const [rows] = await pool.query(
      `SELECT w.*, u.full_name, u.email
       FROM withdrawals w
       JOIN users u ON u.id = w.user_id
       ${where}
       ORDER BY w.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return paginate(res, rows, { page, limit, total });
  } catch (err) {
    return error(res, 'Failed to fetch withdrawals', 500, err.message);
  }
}

// ─── process (Admin+) ────────────────────────────────────────────────────────
async function process(req, res) {
  const wdId   = parseInt(req.params.id, 10);
  const { action, transfer_ref, rejection_reason } = req.body;

  if (!['confirm', 'reject'].includes(action)) {
    return error(res, 'action must be "confirm" or "reject"', 400);
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [[wd]] = await conn.query(
      'SELECT * FROM withdrawals WHERE id = ? FOR UPDATE',
      [wdId]
    );

    if (!wd) {
      await conn.rollback();
      return error(res, 'Withdrawal not found', 404);
    }

    if (wd.status !== 'pending') {
      await conn.rollback();
      return error(res, 'Withdrawal already processed', 409);
    }

    if (action === 'reject') {
      await conn.query(
        `UPDATE users
         SET balance        = balance + ?,
             locked_balance = locked_balance - ?
         WHERE id = ?`,
        [wd.amount, wd.amount, wd.user_id]
      );

      await conn.query(
        `UPDATE withdrawals
         SET status           = 'rejected',
             rejection_reason = ?,
             processed_by     = ?,
             processed_at     = NOW()
         WHERE id = ?`,
        [rejection_reason || null, req.user.id, wdId]
      );

      await conn.commit();

      await safeNotify({
        recipients: [wd.user_id],
        type:       'withdrawal_processed',
        title:      'Withdrawal Rejected',
        body:       `Your withdrawal of ${parseInt(wd.amount, 10).toLocaleString('id-ID')} pts was rejected.`,
        link:       '/wallet',
      });

      return success(res, null, 'Withdrawal rejected, balance restored');
    }

    // Confirm
    const ref = transfer_ref || `PSF-${Date.now()}`;

    await conn.query(
      'UPDATE users SET locked_balance = locked_balance - ? WHERE id = ?',
      [wd.amount, wd.user_id]
    );

    await conn.query(
      `UPDATE withdrawals
       SET status       = 'success',
           transfer_ref = ?,
           processed_by = ?,
           processed_at = NOW()
       WHERE id = ?`,
      [ref, req.user.id, wdId]
    );

    await conn.commit();

    await safeNotify({
      recipients: [wd.user_id],
      type:       'withdrawal_processed',
      title:      'Withdrawal Confirmed',
      body:       `Your withdrawal of ${parseInt(wd.amount, 10).toLocaleString('id-ID')} pts was confirmed. Ref: ${ref}`,
      link:       '/wallet',
    });

    return success(res, { transfer_ref: ref }, 'Withdrawal confirmed');
  } catch (err) {
    await conn.rollback();
    console.error('[WITHDRAWAL PROCESS ERROR]', err.message);
    return error(res, 'Processing failed', 500, err.message);
  } finally {
    conn.release();
  }
}

module.exports = { request, listMy, list, process };