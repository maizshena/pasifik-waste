'use strict';

const router = require('express').Router();
const { listMy, request, list, process } = require('../controllers/withdrawals.controller');
const { authenticate, authorize, atLeast } = require('../middleware/auth');
const pool = require('../config/db'); 
const { success, error } = require('../utils/response');

// GET /api/withdrawals/my (warga sees own withdrawals)
router.get('/my', authenticate, authorize('warga'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, amount, e_wallet, account_number, account_holder,
      status, rejection_reason, transfer_ref,
              created_at, processed_at
              FROM withdrawals
              WHERE user_id = ?
              ORDER BY created_at DESC`,
              [req.user.id]
    );
    return success(res, rows);
  } catch (err) {
    return error(res, 'Failed to fetch withdrawals', 500, err.message);
  }
});

router.get('/my', authenticate, authorize('warga'), listMy);
router.post('/', authenticate, authorize('warga'), request);
router.get('/', authenticate, atLeast('admin'), list);
router.patch('/:id/process', authenticate, atLeast('admin'), process);

module.exports = router;