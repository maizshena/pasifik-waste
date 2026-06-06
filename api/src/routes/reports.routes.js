'use strict';

const router  = require('express').Router();
const { pool }            = require('../config/db');
const { success, error }  = require('../utils/response');
const { notify }          = require('../utils/notify');
const { authenticate, atLeast, authorize } = require('../middleware/auth');
const upload  = require('../middleware/upload');
const {
  create, list, myReports, validate,
} = require('../controllers/reports.controller');

// POST — Warga submits report (up to 5 photos)
router.post('/',
  authenticate, authorize('warga'),
  upload.array('photos', 5),
  create
);

// GET — Warga's own reports
router.get('/my', authenticate, authorize('warga'), myReports);

// GET — Single report detail
router.get('/:id', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.*,
              u.full_name   AS warga_name,
              u.phone       AS warga_phone,
              u.email       AS warga_email,
              c.name        AS category_name,
              c.unit        AS category_unit,
              v.full_name   AS validated_by_name
       FROM public_reports r
       JOIN users      u ON u.id = r.user_id
       JOIN categories c ON c.id = r.category_id
       LEFT JOIN users v ON v.id = r.validated_by
       WHERE r.id = ? AND r.deleted_at IS NULL`,
      [req.params.id]
    );

    if (rows.length === 0) return error(res, 'Report not found', 404);

    const report = rows[0];

    if (req.user.role === 'warga' && report.user_id !== req.user.id) {
      return error(res, 'Access denied', 403);
    }

    // Safely parse photo_urls
    if (report.photo_urls && typeof report.photo_urls === 'string') {
      try {
        report.photo_urls = JSON.parse(report.photo_urls);
      } catch {
        report.photo_urls = null;
      }
    }

    return success(res, report);
  } catch (err) {
    console.error('[REPORT DETAIL ERROR]', err.message);
    return error(res, 'Failed to fetch report', 500, err.message);
  }
});

// GET — All reports (Admin+)
router.get('/', authenticate, atLeast('admin'), list);

// PATCH — Validate report (Admin+)
router.patch('/:id/validate', authenticate, atLeast('admin'), validate);

// PATCH — Soft delete report (Admin+)
router.patch('/:id/soft-delete', authenticate, atLeast('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id FROM public_reports WHERE id = ? AND deleted_at IS NULL',
      [req.params.id]
    );
    if (rows.length === 0) return error(res, 'Report not found', 404);

    await pool.query(
      'UPDATE public_reports SET deleted_at = NOW() WHERE id = ?',
      [req.params.id]
    );
    return success(res, null, 'Report soft-deleted');
  } catch (err) {
    return error(res, 'Failed to delete report', 500, err.message);
  }
});

// GET — Comments for a report
router.get('/:id/comments', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.body, c.created_at,
              u.full_name  AS author_name,
              u.role       AS author_role,
              u.avatar_url AS author_avatar
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.report_id = ?
       ORDER BY c.created_at ASC`,
      [req.params.id]
    );
    return success(res, rows);
  } catch (err) {
    return error(res, 'Failed to fetch comments', 500, err.message);
  }
});

// POST — Add comment
router.post('/:id/comments', authenticate, async (req, res) => {
  const { body } = req.body;
  if (!body?.trim()) return error(res, 'Comment body is required', 400);

  try {
    const [reports] = await pool.query(
      'SELECT id, user_id FROM public_reports WHERE id = ? AND deleted_at IS NULL',
      [req.params.id]
    );
    if (reports.length === 0) return error(res, 'Report not found', 404);

    const report = reports[0];

    const [result] = await pool.query(
      'INSERT INTO comments (report_id, user_id, body) VALUES (?, ?, ?)',
      [req.params.id, req.user.id, body.trim()]
    );

    const [newComment] = await pool.query(
      `SELECT c.id, c.body, c.created_at,
              u.full_name  AS author_name,
              u.role       AS author_role,
              u.avatar_url AS author_avatar
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.id = ?`,
      [result.insertId]
    );

    const [commenterRows] = await pool.query(
      'SELECT full_name, role FROM users WHERE id = ?',
      [req.user.id]
    );
    const commenter = commenterRows[0];

    if (commenter.role === 'warga') {
      // Warga commented → notify all admins
      await notify({
        recipients: 'admins',
        type:       'new_comment',
        title:      'New Comment on Report',
        body:       `${commenter.full_name} commented on report #${req.params.id}.`,
        link:       `/history/${req.params.id}`,
      });
    } else if (report.user_id !== req.user.id) {
      // Admin commented → notify the warga report owner only
      await notify({
        recipients: [report.user_id],
        type:       'new_comment',
        title:      'Admin Replied to Your Report',
        body:       `${commenter.full_name} replied on report #${req.params.id}.`,
        link:       `/history/${req.params.id}`,
      });
    }

    return success(res, newComment[0], 'Comment added', 201);
  } catch (err) {
    return error(res, 'Failed to add comment', 500, err.message);
  }
});

module.exports = router;