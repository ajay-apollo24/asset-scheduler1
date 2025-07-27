// routes/logRoutes.js
const express = require('express');
const router = express.Router();
const LogController = require('../controllers/logController');
const authMiddleware = require('../middleware/auth');
const authorize = require('../middleware/authorize');

// All log routes require admin access
router.use(authMiddleware);
router.use(authorize(['admin']));

// System monitoring endpoints
router.get('/health', LogController.getSystemHealth);
router.get('/performance', LogController.getPerformanceMetrics);
router.get('/rules', LogController.getRuleValidationStats);
router.get('/bookings', LogController.getBookingStats);

// Log analysis endpoints
router.get('/security', LogController.getSecurityEvents);
router.get('/errors', LogController.getErrorLogs);
router.get('/audit', LogController.getAuditLogs);
router.post('/search', LogController.searchLogs);
router.get('/files', LogController.getLogFiles);

module.exports = router; 