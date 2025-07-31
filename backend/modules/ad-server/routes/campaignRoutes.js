const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const auth = require('../../shared/middleware/auth');
const rbac = require('../../shared/middleware/rbac');

// Apply RBAC middleware to add permissions to request
router.use(rbac.addPermissionsToRequest());

// Campaign routes with RBAC permissions
router.get('/', auth, rbac.requirePermission('campaign:read'), campaignController.getAll);
router.post('/', auth, rbac.requirePermission('campaign:create'), campaignController.create);
router.get('/:id', auth, rbac.requirePermission('campaign:read'), campaignController.getById);
router.put('/:id', auth, rbac.requirePermission('campaign:update'), campaignController.update);
router.delete('/:id', auth, rbac.requirePermission('campaign:delete'), campaignController.delete);
router.put('/:id/status', auth, rbac.requirePermission('campaign:update'), campaignController.updateStatus);
router.get('/:id/performance', auth, rbac.requirePermission('analytics:read'), campaignController.getPerformance);

module.exports = router;
