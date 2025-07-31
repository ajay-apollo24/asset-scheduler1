const User = require('../models/User');
const logger = require('../utils/logger');

const rbac = {
  // Check if user has a specific permission
  requirePermission(permission) {
    return async (req, res, next) => {
      try {
        if (!req.user || !req.user.user_id) {
          return res.status(401).json({ message: 'Authentication required' });
        }

        const hasPermission = await User.hasPermission(req.user.user_id, permission);
        
        if (!hasPermission) {
          logger.warn('Permission denied', {
            userId: req.user.user_id,
            email: req.user.email,
            requiredPermission: permission,
            path: req.path,
            method: req.method
          });
          return res.status(403).json({ 
            message: 'Insufficient permissions',
            requiredPermission: permission
          });
        }

        next();
      } catch (error) {
        logger.error('RBAC permission check error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    };
  },

  // Check if user has any of the specified permissions
  requireAnyPermission(permissions) {
    return async (req, res, next) => {
      try {
        if (!req.user || !req.user.user_id) {
          return res.status(401).json({ message: 'Authentication required' });
        }

        const hasPermission = await User.hasAnyPermission(req.user.user_id, permissions);
        
        if (!hasPermission) {
          logger.warn('Permission denied', {
            userId: req.user.user_id,
            email: req.user.email,
            requiredPermissions: permissions,
            path: req.path,
            method: req.method
          });
          return res.status(403).json({ 
            message: 'Insufficient permissions',
            requiredPermissions: permissions
          });
        }

        next();
      } catch (error) {
        logger.error('RBAC permission check error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    };
  },

  // Check if user has all of the specified permissions
  requireAllPermissions(permissions) {
    return async (req, res, next) => {
      try {
        if (!req.user || !req.user.user_id) {
          return res.status(401).json({ message: 'Authentication required' });
        }

        const hasPermissions = await User.hasAllPermissions(req.user.user_id, permissions);
        
        if (!hasPermissions) {
          logger.warn('Permission denied', {
            userId: req.user.user_id,
            email: req.user.email,
            requiredPermissions: permissions,
            path: req.path,
            method: req.method
          });
          return res.status(403).json({ 
            message: 'Insufficient permissions',
            requiredPermissions: permissions
          });
        }

        next();
      } catch (error) {
        logger.error('RBAC permission check error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    };
  },

  // Check if user has a specific role
  requireRole(roleName) {
    return async (req, res, next) => {
      try {
        if (!req.user || !req.user.user_id) {
          return res.status(401).json({ message: 'Authentication required' });
        }

        const roles = await User.getUserRoles(req.user.user_id);
        const hasRole = roles.some(role => role.name === roleName);
        
        if (!hasRole) {
          logger.warn('Role access denied', {
            userId: req.user.user_id,
            email: req.user.email,
            requiredRole: roleName,
            userRoles: roles.map(r => r.name),
            path: req.path,
            method: req.method
          });
          return res.status(403).json({ 
            message: 'Insufficient role access',
            requiredRole: roleName
          });
        }

        next();
      } catch (error) {
        logger.error('RBAC role check error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    };
  },

  // Check if user has any of the specified roles
  requireAnyRole(roleNames) {
    return async (req, res, next) => {
      try {
        if (!req.user || !req.user.user_id) {
          return res.status(401).json({ message: 'Authentication required' });
        }

        const roles = await User.getUserRoles(req.user.user_id);
        const hasRole = roles.some(role => roleNames.includes(role.name));
        
        if (!hasRole) {
          logger.warn('Role access denied', {
            userId: req.user.user_id,
            email: req.user.email,
            requiredRoles: roleNames,
            userRoles: roles.map(r => r.name),
            path: req.path,
            method: req.method
          });
          return res.status(403).json({ 
            message: 'Insufficient role access',
            requiredRoles: roleNames
          });
        }

        next();
      } catch (error) {
        logger.error('RBAC role check error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    };
  },

  // Check if user belongs to a specific organization
  requireOrganization(organizationId) {
    return async (req, res, next) => {
      try {
        if (!req.user || !req.user.user_id) {
          return res.status(401).json({ message: 'Authentication required' });
        }

        // Platform admins can access any organization
        const roles = await User.getUserRoles(req.user.user_id);
        const isPlatformAdmin = roles.some(role => role.name === 'platform_admin' && role.is_system_role);

        if (isPlatformAdmin) {
          return next();
        }

        // Check if user belongs to the specified organization
        if (req.user.organization_id !== organizationId) {
          logger.warn('Organization access denied', {
            userId: req.user.user_id,
            email: req.user.email,
            userOrgId: req.user.organization_id,
            requiredOrgId: organizationId,
            path: req.path,
            method: req.method
          });
          return res.status(403).json({ 
            message: 'Access denied to this organization'
          });
        }

        next();
      } catch (error) {
        logger.error('RBAC organization check error:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    };
  },

  // Add user permissions to request for frontend use
  addPermissionsToRequest() {
    return async (req, res, next) => {
      try {
        if (req.user && req.user.user_id) {
          const permissions = await User.getUserPermissions(req.user.user_id);
          req.userPermissions = permissions.map(p => p.name);
        }
        next();
      } catch (error) {
        logger.error('Error adding permissions to request:', error);
        next(); // Continue even if permission loading fails
      }
    };
  }
};

module.exports = rbac; 