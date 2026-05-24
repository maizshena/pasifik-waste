// src/utils/jwt.js
'use strict';

const jwt  = require('jsonwebtoken');
require('dotenv').config();

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXP     = process.env.JWT_ACCESS_EXPIRES  || '15m';
const REFRESH_EXP    = process.env.JWT_REFRESH_EXPIRES || '7d';

/**
 * @param {{ id, role }} payload
 * @returns {string} signed access token
 */
function signAccessToken(payload) {
  return jwt.sign(
    { sub: payload.id, role: payload.role },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXP }
  );
}

/**
 * @param {{ id }} payload
 * @returns {string} signed refresh token
 */
function signRefreshToken(payload) {
  return jwt.sign(
    { sub: payload.id },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXP }
  );
}

/**
 * @param {string} token
 * @returns {object} decoded payload
 * @throws {JsonWebTokenError | TokenExpiredError}
 */
function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

/**
 * @param {string} token
 * @returns {object} decoded payload
 * @throws {JsonWebTokenError | TokenExpiredError}
 */
function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};