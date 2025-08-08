// routes/launchRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../../shared/middleware/auth');
const rbac = require('../../shared/middleware/rbac');
const launchController = require('../controllers/campaignLaunchController');

router.post('/:campaignId/one-click', auth, rbac.requirePermission('campaign:update'), launchController.oneClickLaunch);

module.exports = router; 