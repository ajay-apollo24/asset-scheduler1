// routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const ReportController = require('../controllers/reportController');
const auth = require('../../shared/middleware/auth');
const rbac = require('../../shared/middleware/rbac');

// Apply RBAC middleware to add permissions to request
router.use(rbac.addPermissionsToRequest());

// Legacy performance report
router.get('/performance', auth, rbac.requirePermission('reports:read'), ReportController.performance);

// Ad Server Reports
router.get('/ad-server/performance', auth, rbac.requirePermission('reports:read'), ReportController.adServerPerformance);
router.get('/ad-server/summary', auth, rbac.requirePermission('reports:read'), ReportController.adServerSummary);

// Asset Reports
router.get('/assets/performance', auth, rbac.requirePermission('reports:read'), ReportController.assetPerformance);
router.get('/assets/summary', auth, rbac.requirePermission('reports:read'), ReportController.assetSummary);

// Daily Metrics
router.get('/daily-metrics', auth, rbac.requirePermission('reports:read'), ReportController.dailyMetrics);

module.exports = router; 