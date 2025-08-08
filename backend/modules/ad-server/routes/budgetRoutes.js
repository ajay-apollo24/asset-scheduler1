// routes/budgetRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../../shared/middleware/auth');
const rbac = require('../../shared/middleware/rbac');
const budgetController = require('../controllers/budgetController');

router.get('/:campaignId/status', auth, rbac.requirePermission('campaign:read'), budgetController.status);
router.get('/:campaignId/pacing', auth, rbac.requirePermission('campaign:read'), budgetController.pacing);
router.get('/floors/:assetId', auth, rbac.requirePermission('campaign:read'), budgetController.floors);

module.exports = router; 