'use strict';

const router = require('express').Router();
const { request, list, process } = require('../controllers/withdrawals.controller');
const { authenticate, authorize, atLeast } = require('../middleware/auth');

router.post('/',              authenticate, authorize('warga'),  request);
router.get('/',               authenticate, atLeast('admin'),   list);
router.patch('/:id/process',  authenticate, atLeast('admin'),   process);

module.exports = router;