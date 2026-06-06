'use strict';

const router = require('express').Router();
const { pool }          = require('../config/db');
const { success, error } = require('../utils/response');
const { authenticate, atLeast } = require('../middleware/auth');

router.get('/stats', authenticate, atLeast('admin'), async (_req, res) => {
  try {
    // Reports stats
    const [[reportStats]] = await pool.query(`
      SELECT
        COUNT(*)                                          AS total_reports,
        SUM(CASE WHEN status = 'pending'  THEN 1 ELSE 0 END) AS pending_reports,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_reports,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected_reports
      FROM public_reports
      WHERE deleted_at IS NULL
    `);

    // Withdrawal stats
    const [[withdrawalStats]] = await pool.query(`
      SELECT
        COUNT(*)                                           AS total_withdrawals,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)  AS pending_withdrawals,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END)  AS success_withdrawals
      FROM withdrawals
    `);

    // User stats — use explicit integer comparison to avoid typeCast issue
    const [[userStats]] = await pool.query(`
      SELECT
        COUNT(*)                                                       AS total_users,
        SUM(CASE WHEN is_active = 1  AND deleted_at IS NULL THEN 1 ELSE 0 END) AS active_users,
        SUM(CASE WHEN role = 'warga' AND deleted_at IS NULL THEN 1 ELSE 0 END) AS total_warga,
        SUM(CASE WHEN role IN ('admin','super_admin') AND deleted_at IS NULL THEN 1 ELSE 0 END) AS total_admins
      FROM users
    `);

    // Convert BigInt to Number safely
    const toNum = (v) => (v == null ? 0 : Number(v));

    return success(res, {
      reports: {
        total_reports:    toNum(reportStats.total_reports),
        pending_reports:  toNum(reportStats.pending_reports),
        approved_reports: toNum(reportStats.approved_reports),
        rejected_reports: toNum(reportStats.rejected_reports),
      },
      withdrawals: {
        total_withdrawals:   toNum(withdrawalStats.total_withdrawals),
        pending_withdrawals: toNum(withdrawalStats.pending_withdrawals),
        success_withdrawals: toNum(withdrawalStats.success_withdrawals),
      },
      users: {
        total_users:  toNum(userStats.total_users),
        active_users: toNum(userStats.active_users),
        total_warga:  toNum(userStats.total_warga),
        total_admins: toNum(userStats.total_admins),
      },
    });
  } catch (err) {
    console.error('[STATS ERROR]', err.message);
    return error(res, 'Failed to fetch stats', 500, err.message);
  }
});

module.exports = router;