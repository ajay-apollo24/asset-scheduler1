// routes/yieldRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../../shared/middleware/auth');
const rbac = require('../../shared/middleware/rbac');
const yieldController = require('../controllers/yieldController');

router.post('/ab-assignments', auth, rbac.requirePermission('experiment:read'), yieldController.abAssignments);
router.get('/controls', auth, rbac.requirePermission('campaign:read'), yieldController.controls);
router.post('/apply-floor', auth, rbac.requirePermission('campaign:read'), yieldController.applyFloor);

module.exports = router; 