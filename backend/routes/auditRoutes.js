// routes/auditRoutes.js
const express = require('express');
const router = express.Router();
const AuditController = require('../controllers/auditController');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// All audit routes require admin access
router.use(authMiddleware);
router.use(authorize(['admin']));

// Audit trail endpoints
router.get('/booking/:bookingId', AuditController.getBookingAuditTrail);
router.get('/asset/:assetId', AuditController.getAssetAuditTrail);
router.get('/approval/:approvalId', AuditController.getApprovalAuditTrail);

// Activity endpoints
router.get('/recent', AuditController.getRecentActivity);
router.get('/summary', AuditController.getActivitySummary);
router.post('/search', AuditController.searchAuditLogs);
router.get('/stats', AuditController.getAuditStats);

module.exports = router; 