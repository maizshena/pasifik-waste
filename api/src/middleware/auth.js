// src/middleware/auth.js
'use strict';

const { verifyAccessToken } = require('../utils/jwt');
const { error }             = require('../utils/response');

// ─── Role hierarchy ──────────────────────────────────────────────────────────
const ROLE_LEVEL = {
  warga:       1,
  admin:       2,
  super_admin: 3,
};

// ─── authenticate ────────────────────────────────────────────────────────────
/**
 * Validates Bearer JWT in Authorization header.
 * Attaches `req.user = { id, role }` on success.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, 'Authorization token required', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);
    req.user = { id: decoded.sub, role: decoded.role };
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return error(res, 'Access token expired', 401);
    }
    return error(res, 'Invalid access token', 401);
  }
}

// ─── authorize ───────────────────────────────────────────────────────────────
/**
 * Exact role match guard.
 * Usage: router.get('/path', authenticate, authorize('admin'), handler)
 *
 * @param {...string} roles  Allowed roles
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return error(res, 'Unauthenticated', 401);

    if (!roles.includes(req.user.role)) {
      return error(res, 'Insufficient permissions', 403);
    }

    return next();
  };
}

// ─── atLeast ─────────────────────────────────────────────────────────────────
/**
 * Minimum role level guard (hierarchy-aware).
 * e.g. atLeast('admin') passes for both 'admin' and 'super_admin'.
 *
 * @param {string} minRole  Minimum required role
 */
function atLeast(minRole) {
  return (req, res, next) => {
    if (!req.user) return error(res, 'Unauthenticated', 401);

    const userLevel    = ROLE_LEVEL[req.user.role]    || 0;
    const requiredLevel = ROLE_LEVEL[minRole]         || 99;

    if (userLevel < requiredLevel) {
      return error(res, 'Insufficient permissions', 403);
    }

    return next();
  };
}

// ─── isSelf ──────────────────────────────────────────────────────────────────
/**
 * Ensures the requesting user is acting on their own resource,
 * unless they are admin or super_admin.
 *
 * Expects the route parameter to be named `id` (e.g. /users/:id).
 */
function isSelf(req, res, next) {
  if (!req.user) return error(res, 'Unauthenticated', 401);

  const targetId = parseInt(req.params.id, 10);
  const isOwner  = req.user.id === targetId;
  const isAdmin  = ROLE_LEVEL[req.user.role] >= ROLE_LEVEL['admin'];

  if (!isOwner && !isAdmin) {
    return error(res, 'Access denied: not your resource', 403);
  }

  return next();
}

module.exports = { authenticate, authorize, atLeast, isSelf };