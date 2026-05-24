'use strict';

const router = require('express').Router();
const { pool }             = require('../config/db');
const { success, error }   = require('../utils/response');
const { authenticate }     = require('../middleware/auth');

// GET /api/notifications — current user's notifications
router.get('/', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, type, title, body, link, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 30`,
      [req.user.id]
    );

    const [[{ unread }]] = await pool.query(
      'SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );

    return success(res, { notifications: rows, unread });
  } catch (err) {
    return error(res, 'Failed to fetch notifications', 500, err.message);
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    return success(res, null, 'Marked as read');
  } catch (err) {
    return error(res, 'Failed to mark as read', 500, err.message);
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', authenticate, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );
    return success(res, null, 'All marked as read');
  } catch (err) {
    return error(res, 'Failed to mark all as read', 500, err.message);
  }
});

module.exports = router;