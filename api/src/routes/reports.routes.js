// src/routes/reports.routes.js
'use strict';

const router  = require('express').Router();
const path    = require('path');
const {
  create, list, myReports, validate,
} = require('../controllers/reports.controller');
const { authenticate, atLeast, authorize } = require('../middleware/auth');
const { notify }  = require('../utils/notify');
const { pool }    = require('../config/db');
const { success, error } = require('../utils/response');
const upload  = require('../middleware/upload');

// POST — Warga submits report (up to 5 photos)
router.post('/',
  authenticate, authorize('warga'),
  upload.array('photos', 5),
  async (req, res) => {
    const {
      category_id, estimated_weight,
      latitude, longitude, address_text, notes,
    } = req.body;

    if (!category_id || !estimated_weight) {
      return error(res, 'category_id and estimated_weight are required', 400);
    }

    try {
      const [cats] = await pool.query(
        'SELECT id, price_per_kg FROM categories WHERE id = ? AND is_active = 1',
        [category_id]
      );
      if (cats.length === 0) return error(res, 'Category not found or inactive', 404);

      const snapshot  = cats[0].price_per_kg;
      const photoUrls = req.files?.map((f) => `/uploads/${f.filename}`) ?? [];

      const [result] = await pool.query(
        `INSERT INTO public_reports
           (user_id, category_id, price_per_kg_snapshot,
            estimated_weight, latitude, longitude,
            address_text, photo_url, photo_urls, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.id, category_id, snapshot,
          parseFloat(estimated_weight),
          latitude   || null,
          longitude  || null,
          address_text || null,
          photoUrls[0] || null,          // backward compat
          photoUrls.length > 0
            ? JSON.stringify(photoUrls)
            : null,
          notes || null,
        ]
      );

      // Notify all admins
      const [warga] = await pool.query(
        'SELECT full_name FROM users WHERE id = ?', [req.user.id]
      );
      await notify({
        recipients: 'admins',
        type:       'new_report',
        title:      'New Waste Report',
        body:       `${warga[0]?.full_name} submitted a new waste report.`,
        link:       `/reports/${result.insertId}`,
      });

      return success(res, { id: result.insertId }, 'Report submitted', 201);
    } catch (err) {
      return error(res, 'Failed to create report', 500, err.message);
    }
  }
);

router.get('/my',   authenticate, authorize('warga'), myReports);

// GET single report
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

    // Parse photo_urls JSON
    if (report.photo_urls && typeof report.photo_urls === 'string') {
      report.photo_urls = JSON.parse(report.photo_urls);
    }

    return success(res, report);
  } catch (err) {
    return error(res, 'Failed to fetch report', 500, err.message);
  }
});

router.get('/',               authenticate, atLeast('admin'),  list);
router.patch('/:id/validate', authenticate, atLeast('admin'),  validate);

// PATCH — Soft delete report (Admin+)
router.patch('/:id/soft-delete', authenticate, atLeast('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, status FROM public_reports WHERE id = ? AND deleted_at IS NULL',
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

// GET comments
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

// POST comment
router.post('/:id/comments', authenticate, async (req, res) => {
  const { body } = req.body;
  if (!body?.trim()) return error(res, 'Comment body is required', 400);

  try {
    const [reports] = await pool.query(
      'SELECT id, user_id FROM public_reports WHERE id = ? AND deleted_at IS NULL',
      [req.params.id]
    );
    if (reports.length === 0) return error(res, 'Report not found', 404);

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

    // Notify report owner (if commenter is admin notifying warga)
    const [commenter] = await pool.query(
      'SELECT full_name FROM users WHERE id = ?', [req.user.id]
    );
    await notify({
      recipients: [reports[0].user_id],
      type:       'new_comment',
      title:      'New Comment on Your Report',
      body:       `${commenter[0]?.full_name} commented on your report.`,
      link:       `/reports/${req.params.id}`,
    });

    return success(res, newComment[0], 'Comment added', 201);
  } catch (err) {
    return error(res, 'Failed to add comment', 500, err.message);
  }
});

module.exports = router;