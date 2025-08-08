// routes/targetingRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../../shared/middleware/auth');
const rbac = require('../../shared/middleware/rbac');
const targetingController = require('../controllers/targetingController');

router.post('/preview', auth, rbac.requirePermission('campaign:read'), targetingController.preview);
router.get('/audience/:userId?', auth, rbac.requirePermission('campaign:read'), targetingController.audience);
router.get('/geo', auth, rbac.requirePermission('campaign:read'), targetingController.geo);

module.exports = router; 