// src/routes/dashboard.routes.js
'use strict';

const router = require('express').Router();
const { pool }                     = require('../config/db');
const { success, error }           = require('../utils/response');
const { authenticate, atLeast }    = require('../middleware/auth');

router.get('/stats', authenticate, atLeast('admin'), async (_req, res) => {
  try {
    const [[reportStats]] = await pool.query(
      `SELECT
         COUNT(*)                                    AS total_reports,
         SUM(status = 'pending')                     AS pending_reports,
         SUM(status = 'approved')                    AS approved_reports,
         SUM(status = 'rejected')                    AS rejected_reports
       FROM public_reports`
    );

    const [[withdrawalStats]] = await pool.query(
      `SELECT
         COUNT(*)                                    AS total_withdrawals,
         SUM(status = 'pending')                     AS pending_withdrawals,
         SUM(status = 'success')                     AS success_withdrawals
       FROM withdrawals`
    );

    const [[userStats]] = await pool.query(
      `SELECT
         COUNT(*)                                    AS total_users,
         SUM(is_active = 1 AND deleted_at IS NULL)   AS active_users,
         SUM(role = 'warga')                         AS total_warga,
         SUM(role = 'admin' OR role = 'super_admin') AS total_admins
       FROM users
       WHERE deleted_at IS NULL`
    );

    return success(res, {
      reports:     reportStats,
      withdrawals: withdrawalStats,
      users:       userStats,
    });
  } catch (err) {
    return error(res, 'Failed to fetch stats', 500, err.message);
  }
});

module.exports = router;