// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');

// Apply RBAC middleware to add permissions to request
router.use(rbac.addPermissionsToRequest());

// User routes with RBAC permissions
router.get('/', auth, rbac.requirePermission('user:read'), userController.getAll);
router.post('/', auth, rbac.requirePermission('user:create'), userController.create);
router.get('/:id', auth, rbac.requirePermission('user:read'), userController.getById);
router.put('/:id', auth, rbac.requirePermission('user:update'), userController.update);
router.delete('/:id', auth, rbac.requirePermission('user:delete'), userController.delete);

// Role management routes
router.get('/:id/roles', auth, rbac.requirePermission('user:read'), userController.getUserRoles);
router.post('/:id/roles', auth, rbac.requirePermission('user:assign_roles'), userController.assignRole);
router.delete('/:id/roles/:roleId', auth, rbac.requirePermission('user:assign_roles'), userController.removeRole);

module.exports = router;