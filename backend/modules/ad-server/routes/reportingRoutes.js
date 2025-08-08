// routes/reportingRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../../shared/middleware/auth');
const rbac = require('../../shared/middleware/rbac');
const reportingController = require('../controllers/reportingController');

router.get('/yield', auth, rbac.requirePermission('analytics:read'), reportingController.yieldAnalytics);
router.get('/multi-channel', auth, rbac.requirePermission('analytics:read'), reportingController.multiChannel);
router.post('/export', auth, rbac.requirePermission('analytics:read'), reportingController.export);

module.exports = router; 