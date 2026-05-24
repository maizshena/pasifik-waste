// src/controllers/reports.controller.js
'use strict';

const { pool }               = require('../config/db');
const { calculatePoints }    = require('../utils/points');
const { success, error, paginate } = require('../utils/response');

// ─── create (Warga) ──────────────────────────────────────────────────────────
async function create(req, res) {
  const { category_id, estimated_weight, latitude, longitude, address_text, notes } = req.body;
  const photo_url = req.file ? `/uploads/${req.file.filename}` : null;

  if (!category_id || !estimated_weight) {
    return error(res, 'category_id and estimated_weight are required', 400);
  }

  try {
    const [cats] = await pool.query(
      'SELECT id, price_per_kg FROM categories WHERE id = ? AND is_active = 1',
      [category_id]
    );

    if (cats.length === 0) return error(res, 'Category not found or inactive', 404);

    const snapshot = cats[0].price_per_kg;

    const [result] = await pool.query(
      `INSERT INTO public_reports
         (user_id, category_id, price_per_kg_snapshot,
          estimated_weight, latitude, longitude, address_text, photo_url, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id, category_id, snapshot,
        parseFloat(estimated_weight),
        latitude  || null,
        longitude || null,
        address_text || null,
        photo_url,
        notes || null,
      ]
    );

    return success(res, { id: result.insertId }, 'Report submitted', 201);
  } catch (err) {
    return error(res, 'Failed to create report', 500, err.message);
  }
}

// list — replace existing function
async function list(req, res) {
  const page   = Math.max(parseInt(req.query.page  || '1',  10), 1);
  const limit  = Math.min(parseInt(req.query.limit || '20', 10), 100);
  const offset = (page - 1) * limit;
  const status = req.query.status || null;

  try {
    const conditions = [];
    const params     = [];

    if (status) { conditions.push('r.status = ?'); params.push(status); }

    const where = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : '';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM public_reports r ${where}`,
      params
    );

    if (total === 0) {
      return paginate(res, [], { page, limit, total: 0 });
    }

    const [rows] = await pool.query(
      `SELECT r.*,
              u.full_name  AS warga_name,
              u.phone      AS warga_phone,
              c.name       AS category_name
       FROM public_reports r
       JOIN users      u ON u.id = r.user_id
       JOIN categories c ON c.id = r.category_id
       ${where}
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return paginate(res, rows, { page, limit, total });
  } catch (err) {
    return error(res, 'Failed to fetch reports', 500, err.message);
  }
}

// ─── myReports (Warga) ───────────────────────────────────────────────────────
async function myReports(req, res) {
  const page   = Math.max(parseInt(req.query.page  || '1',  10), 1);
  const limit  = Math.min(parseInt(req.query.limit || '20', 10), 100);
  const offset = (page - 1) * limit;

  try {
    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) AS total FROM public_reports WHERE user_id = ?',
      [req.user.id]
    );

    const [rows] = await pool.query(
      `SELECT r.*, c.name AS category_name
       FROM public_reports r
       JOIN categories c ON c.id = r.category_id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, limit, offset]
    );

    return paginate(res, rows, { page, limit, total });
  } catch (err) {
    return error(res, 'Failed to fetch your reports', 500, err.message);
  }
}

// ─── validate (Admin+) ───────────────────────────────────────────────────────
async function validate(req, res) {
  const reportId = parseInt(req.params.id, 10);
  const { action, actual_weight, rejection_reason } = req.body;

  if (!['approve', 'reject'].includes(action)) {
    return error(res, 'action must be "approve" or "reject"', 400);
  }

  if (action === 'approve' && !actual_weight) {
    return error(res, 'actual_weight is required when approving', 400);
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [[report]] = await conn.query(
      'SELECT * FROM public_reports WHERE id = ? FOR UPDATE',
      [reportId]
    );

    if (!report) {
      await conn.rollback();
      return error(res, 'Report not found', 404);
    }

    if (report.status !== 'pending') {
      await conn.rollback();
      return error(res, 'Report already validated', 409);
    }

    if (action === 'reject') {
      await conn.query(
        `UPDATE public_reports
         SET status = 'rejected', rejection_reason = ?,
             validated_by = ?, validated_at = NOW()
         WHERE id = ?`,
        [rejection_reason || null, req.user.id, reportId]
      );

      await conn.commit();
      return success(res, null, 'Report rejected');
    }

    // ── Approve path ────────────────────────────────────────────────────────
    const weight = parseFloat(actual_weight);
    const { grossPoints, handlingFee, netPoints } = calculatePoints(
      weight,
      report.price_per_kg_snapshot
    );

    await conn.query(
      `UPDATE public_reports
       SET status = 'approved', actual_weight = ?,
           gross_points = ?, handling_fee = ?, net_points = ?,
           validated_by = ?, validated_at = NOW()
       WHERE id = ?`,
      [weight, grossPoints, handlingFee, netPoints, req.user.id, reportId]
    );

    // Credit warga balance
    await conn.query(
      'UPDATE users SET balance = balance + ? WHERE id = ?',
      [netPoints, report.user_id]
    );

    await conn.commit();
    return success(res, { grossPoints, handlingFee, netPoints }, 'Report approved');
  } catch (err) {
    await conn.rollback();
    return error(res, 'Validation failed', 500, err.message);
  } finally {
    conn.release();
  }
}

module.exports = { create, list, myReports, validate };