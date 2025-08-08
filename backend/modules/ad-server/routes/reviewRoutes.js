// routes/reviewRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../../shared/middleware/auth');
const rbac = require('../../shared/middleware/rbac');
const reviewController = require('../controllers/reviewController');

router.post('/:campaignId/request', auth, rbac.requirePermission('campaign:update'), reviewController.request);
router.post('/:campaignId/approve', auth, rbac.requirePermission('campaign:approve'), reviewController.approve);
router.post('/:campaignId/reject', auth, rbac.requirePermission('campaign:approve'), reviewController.reject);

module.exports = router; 