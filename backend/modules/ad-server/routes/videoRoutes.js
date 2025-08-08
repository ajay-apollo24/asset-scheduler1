// routes/videoRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../../shared/middleware/auth');
const rbac = require('../../shared/middleware/rbac');
const videoController = require('../controllers/videoController');

router.get('/config/:creativeId', auth, rbac.requirePermission('campaign:read'), videoController.config);
router.get('/quality/:creativeId', auth, rbac.requirePermission('creative:read'), videoController.quality);

// Quartile tracking can be anonymous; no auth to reduce friction
router.post('/quartile', videoController.quartile);

module.exports = router; 