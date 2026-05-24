'use strict';

const router = require('express').Router();
const { pool }                    = require('../config/db');
const { success, error }          = require('../utils/response');
const { authenticate, authorize } = require('../middleware/auth');

const SA = authorize('super_admin');

// get /api/categories
router.get('/', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM categories ORDER BY name ASC'
    );
    return success(res, rows);
  } catch (err) {
    return error(res, 'Failed to fetch categories', 500, err.message);
  }
});

// post /api/categories
router.post('/', authenticate, SA, async (req, res) => {
  const { name, slug, price_per_kg, unit, icon_url } = req.body;

  if (!name || !slug || !price_per_kg) {
    return error(res, 'name, slug, and price_per_kg are required', 400);
  }

  try {
    const [existing] = await pool.query(
      'SELECT id FROM categories WHERE slug = ?', [slug]
    );
    if (existing.length > 0) {
      return error(res, 'A category with this slug already exists', 409);
    }

    const [result] = await pool.query(
      `INSERT INTO categories (name, slug, price_per_kg, unit, icon_url)
       VALUES (?, ?, ?, ?, ?)`,
      [
        name.trim(),
        slug.trim(),
        parseInt(price_per_kg, 10),
        unit  || 'kg',
        icon_url || null,
      ]
    );
    return success(res, { id: result.insertId }, 'Category created', 201);
  } catch (err) {
    return error(res, 'Failed to create category', 500, err.message);
  }
});

// patch /api/categories/:id
router.patch('/:id', authenticate, SA, async (req, res) => {
  const { name, price_per_kg, unit, icon_url, is_active } = req.body;

  try {
    const [cats] = await pool.query(
      'SELECT * FROM categories WHERE id = ?', [req.params.id]
    );
    if (cats.length === 0) return error(res, 'Category not found', 404);

    const cur = cats[0];

    // coerce is_active from any incoming type to strict 0 or 1
    let activeValue = cur.is_active ? 1 : 0; // default: keep current
    if (is_active !== undefined && is_active !== null) {
      // Handles: true, false, 1, 0, "true", "false", "1", "0"
      activeValue = (is_active === true  ||
                     is_active === 1     ||
                     is_active === '1'   ||
                     is_active === 'true') ? 1 : 0;
    }

    await pool.query(
      `UPDATE categories
       SET name         = ?,
           price_per_kg = ?,
           unit         = ?,
           icon_url     = ?,
           is_active    = ?
       WHERE id = ?`,
      [
        name         ?? cur.name,
        price_per_kg != null ? parseInt(price_per_kg, 10) : cur.price_per_kg,
        unit         ?? cur.unit,
        icon_url     ?? cur.icon_url,
        activeValue,
        req.params.id,
      ]
    );
    return success(res, null, 'Category updated');
  } catch (err) {
    return error(res, 'Failed to update category', 500, err.message);
  }
});

// delete /api/categories/:id 
router.delete('/:id', authenticate, SA, async (req, res) => {
  try {
    const [cats] = await pool.query(
      'SELECT id FROM categories WHERE id = ?', [req.params.id]
    );
    if (cats.length === 0) return error(res, 'Category not found', 404);

    // Check if category is used by any report
    const [reports] = await pool.query(
      'SELECT id FROM public_reports WHERE category_id = ? LIMIT 1',
      [req.params.id]
    );
    if (reports.length > 0) {
      return error(
        res,
        'Cannot delete — this category has existing reports attached to it.',
        409
      );
    }

    await pool.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    return success(res, null, 'Category deleted');
  } catch (err) {
    return error(res, 'Failed to delete category', 500, err.message);
  }
});

module.exports = router;