'use strict';

const router = require('express').Router();
const { pool }                     = require('../config/db');
const { success, error, paginate } = require('../utils/response');
const { authenticate, authorize }  = require('../middleware/auth');

const SA = authorize('super_admin');

// GET /api/users — Super Admin (with sort)
router.get('/', authenticate, SA, async (req, res) => {
  const page    = Math.max(parseInt(req.query.page  || '1',  10), 1);
  const limit   = Math.min(parseInt(req.query.limit || '20', 10), 100);
  const offset  = (page - 1) * limit;

  // Sort params — whitelist to prevent SQL injection
  const allowedCols = ['created_at', 'full_name', 'email', 'role', 'balance'];
  const sortBy  = allowedCols.includes(req.query.sort_by)
    ? req.query.sort_by
    : 'created_at';
  const sortDir = req.query.sort_dir === 'asc' ? 'ASC' : 'DESC';

  try {
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM users WHERE deleted_at IS NULL`
    );

    if (total === 0) {
      return paginate(res, [], { page, limit, total: 0 });
    }

    const [rows] = await pool.query(
      `SELECT id, full_name, email, phone, role,
              balance, locked_balance, is_active,
              avatar_url, created_at
       FROM users
       WHERE deleted_at IS NULL
       ORDER BY ${sortBy} ${sortDir}
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    return paginate(res, rows, { page, limit, total });
  } catch (err) {
    console.error('[USERS ERROR]', err.message);
    return error(res, 'Failed to fetch users', 500, err.message);
  }
});

// PATCH /api/users/:id/edit — Super Admin
// Cannot edit yourself
router.patch('/:id/edit', authenticate, SA, async (req, res) => {
  const targetId = parseInt(req.params.id, 10);

  // Block self-edit
  if (req.user.id === targetId) {
    return error(
      res,
      'You cannot edit your own account. Another Super Admin must do this.',
      403
    );
  }

  const { full_name, phone, role } = req.body;

  const allowedRoles = ['warga', 'admin', 'super_admin'];
  if (role && !allowedRoles.includes(role)) {
    return error(res, 'Invalid role value', 400);
  }

  try {
    const [rows] = await pool.query(
      'SELECT id FROM users WHERE id = ? AND deleted_at IS NULL',
      [targetId]
    );
    if (rows.length === 0) return error(res, 'User not found', 404);

    await pool.query(
      `UPDATE users
       SET full_name = COALESCE(?, full_name),
           phone     = COALESCE(?, phone),
           role      = COALESCE(?, role)
       WHERE id = ?`,
      [full_name || null, phone || null, role || null, targetId]
    );

    const [updated] = await pool.query(
      `SELECT id, full_name, email, phone, role,
              balance, locked_balance, is_active, created_at
       FROM users WHERE id = ?`,
      [targetId]
    );

    return success(res, updated[0], 'User updated');
  } catch (err) {
    return error(res, 'Failed to update user', 500, err.message);
  }
});

// PATCH /api/users/:id/toggle-active — Super Admin (block self)
router.patch('/:id/toggle-active', authenticate, SA, async (req, res) => {
  const targetId = parseInt(req.params.id, 10);

  if (req.user.id === targetId) {
    return error(res, 'You cannot deactivate your own account.', 403);
  }

  try {
    const [rows] = await pool.query(
      'SELECT id FROM users WHERE id = ? AND deleted_at IS NULL',
      [targetId]
    );
    if (rows.length === 0) return error(res, 'User not found', 404);

    await pool.query(
      'UPDATE users SET is_active = NOT is_active WHERE id = ?',
      [targetId]
    );
    return success(res, null, 'User status toggled');
  } catch (err) {
    return error(res, 'Failed to toggle user', 500, err.message);
  }
});

// PATCH /api/users/:id/restore — Super Admin
router.patch('/:id/restore', authenticate, SA, async (req, res) => {
  try {
    await pool.query(
      'UPDATE users SET deleted_at = NULL, is_active = 1 WHERE id = ?',
      [req.params.id]
    );
    return success(res, null, 'User restored');
  } catch (err) {
    return error(res, 'Failed to restore user', 500, err.message);
  }
});

// DELETE /api/users/:id — Super Admin (soft delete, block self)
router.delete('/:id', authenticate, SA, async (req, res) => {
  const targetId = parseInt(req.params.id, 10);

  if (req.user.id === targetId) {
    return error(res, 'You cannot delete your own account.', 403);
  }

  try {
    const [rows] = await pool.query(
      'SELECT id FROM users WHERE id = ? AND deleted_at IS NULL',
      [targetId]
    );
    if (rows.length === 0) return error(res, 'User not found', 404);

    await pool.query(
      'UPDATE users SET deleted_at = NOW() WHERE id = ?',
      [targetId]
    );
    return success(res, null, 'User soft-deleted');
  } catch (err) {
    return error(res, 'Failed to delete user', 500, err.message);
  }
});

module.exports = router;