'use strict';

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { pool }                                                  = require('../config/db');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { success, error }                                        = require('../utils/response');
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
require('dotenv').config();

const UPLOAD_DIR     = path.resolve(process.env.UPLOAD_DIR || 'src/uploads');
const MAX_SIZE_BYTES = (parseInt(process.env.MAX_FILE_SIZE_MB || '5', 10)) * 1024 * 1024;

// ─── register ────────────────────────────────────────────────────────────────
async function register(req, res) {
  const { full_name, email, password, phone } = req.body;

  if (!full_name || !email || !password) {
    return error(res, 'full_name, email, and password are required', 400);
  }

  try {
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ? AND deleted_at IS NULL',
      [email.toLowerCase()]
    );

    if (existing.length > 0) {
      return error(res, 'Email already registered', 409);
    }

    const hash = await bcrypt.hash(password, 12);

    const [result] = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, phone, role)
       VALUES (?, ?, ?, ?, 'warga')`,
      [full_name.trim(), email.toLowerCase(), hash, phone || null]
    );

    const user = {
      id:        result.insertId,
      full_name: full_name.trim(),
      email:     email.toLowerCase(),
      role:      'warga',
    };

    const accessToken  = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [user.id, tokenHash, expiresAt]
    );

    return success(res, { user, accessToken, refreshToken }, 'Registered successfully', 201);
  } catch (err) {
    return error(res, 'Registration failed', 500, err.message);
  }
}

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return error(res, 'Email and password are required', 400);
  }

  try {
    const [rows] = await pool.query(
      `SELECT id, full_name, email, password_hash, role, is_active
       FROM users
       WHERE email = ? AND deleted_at IS NULL`,
      [email.toLowerCase()]
    );

    // account not found vs wrong password
    if (rows.length === 0) {
      return error(
        res,
        'Account does not exist. Please check your email or register.',
        404
      );
    }

    const user = rows[0];

    if (!user.is_active) {
      return error(res, 'Account is deactivated. Contact support.', 403);
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return error(res, 'Incorrect password. Please try again.', 401);

    const payload      = { id: user.id, role: user.role };
    const accessToken  = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [user.id, tokenHash, expiresAt]
    );

    const profile = {
      id:        user.id,
      full_name: user.full_name,
      email:     user.email,
      role:      user.role,
    };

    return success(res, { user: profile, accessToken, refreshToken }, 'Login successful');
  } catch (err) {
    return error(res, 'Login failed', 500, err.message);
  }
}

// ─── refresh ─────────────────────────────────────────────────────────────────
async function refresh(req, res) {
  const { refreshToken } = req.body;

  if (!refreshToken) return error(res, 'Refresh token required', 400);

  try {
    const decoded   = verifyRefreshToken(refreshToken);
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const [rows] = await pool.query(
      `SELECT rt.id, u.id AS user_id, u.role, u.is_active
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = ? AND rt.expires_at > NOW() AND u.deleted_at IS NULL`,
      [tokenHash]
    );

    if (rows.length === 0) {
      return error(res, 'Refresh token invalid or expired', 401);
    }

    const record = rows[0];

    if (!record.is_active) {
      return error(res, 'Account deactivated', 403);
    }

    await pool.query('DELETE FROM refresh_tokens WHERE id = ?', [record.id]);

    const payload    = { id: record.user_id, role: record.role };
    const newAccess  = signAccessToken(payload);
    const newRefresh = signRefreshToken(payload);
    const newHash    = crypto.createHash('sha256').update(newRefresh).digest('hex');
    const newExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await pool.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [record.user_id, newHash, newExpires]
    );

    return success(res, { accessToken: newAccess, refreshToken: newRefresh }, 'Token refreshed');
  } catch (err) {
    if (err.name === 'TokenExpiredError') return error(res, 'Refresh token expired', 401);
    return error(res, 'Token refresh failed', 500, err.message);
  }
}

// ─── me ──────────────────────────────────────────────────────────────────────
async function me(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT id, full_name, email, phone, role, balance, locked_balance, avatar_url, created_at
       FROM users
       WHERE id = ? AND deleted_at IS NULL`,
      [req.user.id]
    );

    if (rows.length === 0) return error(res, 'User not found', 404);

    return success(res, rows[0]);
  } catch (err) {
    return error(res, 'Failed to fetch profile', 500, err.message);
  }
}

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const ext      = path.extname(file.originalname).toLowerCase();
    const basename = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${basename}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WEBP images are allowed'), false);
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_BYTES },
});

module.exports = { register, login, refresh, me };