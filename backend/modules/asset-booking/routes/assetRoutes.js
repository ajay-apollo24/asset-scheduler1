// routes/assetRoutes.js
const express = require('express');
const router = express.Router();
const assetController = require('../controllers/assetController');
const auth = require('../../shared/middleware/auth');
const rbac = require('../../shared/middleware/rbac');

// Apply RBAC middleware to add permissions to request
router.use(rbac.addPermissionsToRequest());

// Asset routes with RBAC permissions
router.get('/', auth, rbac.requirePermission('campaign:read'), assetController.getAll);
router.post('/', auth, rbac.requirePermission('campaign:create'), assetController.create);
router.get('/:id', auth, rbac.requirePermission('campaign:read'), assetController.getById);
router.put('/:id', auth, rbac.requirePermission('campaign:update'), assetController.update);
router.delete('/:id', auth, rbac.requirePermission('campaign:delete'), assetController.delete);

module.exports = router;