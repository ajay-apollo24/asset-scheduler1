// routes/activationRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../../shared/middleware/auth');
const rbac = require('../../shared/middleware/rbac');
const activationController = require('../controllers/activationController');

router.post('/:campaignId/activate', auth, rbac.requirePermission('campaign:update'), activationController.activate);
router.get('/:campaignId/plans', auth, rbac.requirePermission('campaign:read'), activationController.plans);

module.exports = router; 