// routes/attributionRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../../shared/middleware/auth');
const rbac = require('../../shared/middleware/rbac');
const attributionController = require('../controllers/attributionController');

// Conversions might be sent anonymously from client or server-side
router.post('/conversion', attributionController.recordConversion);

router.get('/status', auth, rbac.requirePermission('analytics:read'), attributionController.status);
router.get('/campaign/:campaignId', auth, rbac.requirePermission('analytics:read'), attributionController.campaignAttribution);

module.exports = router; 