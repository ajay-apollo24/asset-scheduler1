// routes/approvalRoutes.js
const express = require('express');
const router = express.Router();
const ApprovalController = require('../controllers/approvalController');
const authMiddleware = require('../../shared/middleware/auth');

router.get('/', authMiddleware, ApprovalController.listPending); // list approvals for current user role
router.post('/:id/action', authMiddleware, ApprovalController.act); // approve or reject

module.exports = router; 