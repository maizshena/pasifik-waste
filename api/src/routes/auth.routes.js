// src/routes/auth.routes.js
'use strict';

const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const { pool }          = require('../config/db');
const { success, error } = require('../utils/response');
const { register, login, refresh, me } = require('../controllers/auth.controller');
const { authenticate }  = require('../middleware/auth');

router.post('/register', register);
router.post('/login',    login);
router.post('/refresh',  refresh);
router.get('/me',        authenticate, me);

router.get('/profile', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, full_name, email, phone, role, avatar_url, created_at
       FROM users WHERE id = ? AND deleted_at IS NULL`,
      [req.user.id]
    );
    if (rows.length === 0) return error(res, 'User not found', 404);
    return success(res, rows[0]);
  } catch (err) {
    return error(res, 'Failed to fetch profile', 500, err.message);
  }
});

router.patch('/profile', authenticate, async (req, res) => {
  const { full_name, phone, avatar_url, current_password, new_password } = req.body;

  try {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE id = ? AND deleted_at IS NULL',
      [req.user.id]
    );
    if (rows.length === 0) return error(res, 'User not found', 404);

    const user = rows[0];

    if (new_password) {
      if (!current_password) {
        return error(res, 'Current password is required to set a new one', 400);
      }
      const valid = await bcrypt.compare(current_password, user.password_hash);
      if (!valid) return error(res, 'Current password is incorrect', 401);
      if (new_password.length < 8) {
        return error(res, 'New password must be at least 8 characters', 400);
      }

      const newHash = await bcrypt.hash(new_password, 12);
      await pool.query(
        'UPDATE users SET password_hash = ? WHERE id = ?',
        [newHash, req.user.id]
      );
    }

    await pool.query(
      `UPDATE users
       SET full_name  = COALESCE(?, full_name),
           phone      = COALESCE(?, phone),
           avatar_url = COALESCE(?, avatar_url)
       WHERE id = ?`,
      [
        full_name  || null,
        phone      || null,
        avatar_url || null,
        req.user.id,
      ]
    );

    const [updated] = await pool.query(
      'SELECT id, full_name, email, phone, role, avatar_url FROM users WHERE id = ?',
      [req.user.id]
    );

    return success(res, updated[0], 'Profile updated');
  } catch (err) {
    return error(res, 'Failed to update profile', 500, err.message);
  }
});

const upload = require('../middleware/upload');
const path   = require('path');

// replace the existing upload-avatar route in auth.routes.js
router.post('/upload-avatar', authenticate, upload.single('avatar'), async (req, res) => {
  if (!req.file) return error(res, 'No file uploaded', 400);

  const url = `/uploads/${req.file.filename}`;

  try {
    // immediately persist to db so no separate Save Changes needed
    await pool.query(
      'UPDATE users SET avatar_url = ? WHERE id = ?',
      [url, req.user.id]
    );

    // return updated user profile
    const [rows] = await pool.query(
      'SELECT id, full_name, email, phone, role, avatar_url FROM users WHERE id = ?',
      [req.user.id]
    );

    return success(res, { url, user: rows[0] }, 'Avatar updated');
  } catch (err) {
    return error(res, 'Failed to save avatar', 500, err.message);
  }
});

module.exports = router;