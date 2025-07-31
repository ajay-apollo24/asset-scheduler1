// routes/bookingRoutes.js
const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const auth = require('../../shared/middleware/auth');
const rbac = require('../../shared/middleware/rbac');

// Apply RBAC middleware to add permissions to request
router.use(rbac.addPermissionsToRequest());

// Booking routes with RBAC permissions
router.get('/', auth, rbac.requirePermission('campaign:read'), bookingController.getAll);
router.post('/', auth, rbac.requirePermission('campaign:create'), bookingController.create);
router.get('/:id', auth, rbac.requirePermission('campaign:read'), bookingController.getById);
router.put('/:id', auth, rbac.requirePermission('campaign:update'), bookingController.update);
router.delete('/:id', auth, rbac.requirePermission('campaign:delete'), bookingController.delete);

module.exports = router;