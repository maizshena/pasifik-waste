"use strict";

const { pool } = require("../config/db");
const { success, error, paginate } = require("../utils/response");

async function request(req, res) {
  const { amount, bank_name, account_number, account_holder } = req.body;

  if (!amount || !bank_name || !account_number || !account_holder) {
    return error(
      res,
      "amount, bank_name, account_number, account_holder are required",
      400,
    );
  }

  const amt = parseInt(amount, 10);
  if (isNaN(amt) || amt <= 0)
    return error(res, "amount must be a positive integer", 400);

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [[user]] = await conn.query(
      "SELECT balance, locked_balance FROM users WHERE id = ? FOR UPDATE",
      [req.user.id],
    );

    if (user.balance < amt) {
      await conn.rollback();
      return error(res, "Insufficient balance", 400);
    }

    // lock balance during pending state
    await conn.query(
      "UPDATE users SET balance = balance - ?, locked_balance = locked_balance + ? WHERE id = ?",
      [amt, amt, req.user.id],
    );

    const [result] = await conn.query(
      `INSERT INTO withdrawals (user_id, amount, bank_name, account_number, account_holder)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, amt, bank_name, account_number, account_holder],
    );

    await conn.commit();
    return success(
      res,
      { id: result.insertId },
      "Withdrawal request submitted",
      201,
    );
  } catch (err) {
    await conn.rollback();
    return error(res, "Withdrawal request failed", 500, err.message);
  } finally {
    conn.release();
  }
}

async function list(req, res) {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(parseInt(req.query.limit || "20", 10), 100);
  const offset = (page - 1) * limit;
  const status = req.query.status || null;

  try {
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push("w.status = ?");
      params.push(status);
    }

    const where =
      conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM withdrawals w ${where}`,
      params,
    );

    if (total === 0) {
      return paginate(res, [], { page, limit, total: 0 });
    }

    const [rows] = await pool.query(
      `SELECT w.*, u.full_name, u.email
       FROM withdrawals w
       JOIN users u ON u.id = w.user_id
       ${where}
       ORDER BY w.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    return paginate(res, rows, { page, limit, total });
  } catch (err) {
    return error(res, "Failed to fetch withdrawals", 500, err.message);
  }
}

// ─── process (Admin+) ────────────────────────────────────────────────────────
async function process(req, res) {
  const wdId = parseInt(req.params.id, 10);
  const { action, transfer_ref, rejection_reason } = req.body;

  if (!["confirm", "reject"].includes(action)) {
    return error(res, 'action must be "confirm" or "reject"', 400);
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [[wd]] = await conn.query(
      "SELECT * FROM withdrawals WHERE id = ? FOR UPDATE",
      [wdId],
    );

    if (!wd) {
      await conn.rollback();
      return error(res, "Withdrawal not found", 404);
    }

    if (wd.status !== "pending") {
      await conn.rollback();
      return error(res, "Withdrawal already processed", 409);
    }

    if (action === "reject") {
      // Unlock balance — return to spendable
      await conn.query(
        "UPDATE users SET locked_balance = locked_balance - ? WHERE id = ?",
        [wd.amount, wd.user_id],
      );

      // Restore balance
      await conn.query("UPDATE users SET balance = balance + ? WHERE id = ?", [
        wd.amount,
        wd.user_id,
      ]);

      await conn.query(
        `UPDATE withdrawals
         SET status = 'rejected', rejection_reason = ?,
             processed_by = ?, processed_at = NOW()
         WHERE id = ?`,
        [rejection_reason || null, req.user.id, wdId],
      );

      await conn.commit();
      return success(res, null, "Withdrawal rejected, balance restored");
    }

    // ── Confirm path (mock transfer) ────────────────────────────────────────
    const ref = transfer_ref || `PSF-${Date.now()}`;

    await conn.query(
      "UPDATE users SET locked_balance = locked_balance - ? WHERE id = ?",
      [wd.amount, wd.user_id],
    );

    await conn.query(
      `UPDATE withdrawals
       SET status = 'success', transfer_ref = ?,
           processed_by = ?, processed_at = NOW()
       WHERE id = ?`,
      [ref, req.user.id, wdId],
    );

    await conn.commit();

    await notify({
      recipients: "admins",
      type: "new_withdrawal",
      title: "New Withdrawal Request",
      body: `A warga requested a withdrawal of ${wd.amount.toLocaleString("id-ID")} points.`,
      link: "/withdrawals",
    });

    return success(res, { transfer_ref: ref }, "Withdrawal confirmed");
  } catch (err) {
    await conn.rollback();
    return error(res, "Processing failed", 500, err.message);
  } finally {
    conn.release();
  }
}

module.exports = { request, list, process };
