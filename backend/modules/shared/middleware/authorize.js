// middleware/authorize.js

/**
 * authorize(requiredRoles)
 * Usage: app.get('/route', auth, authorize('admin', 'marketing_ops'), handler)
 */
module.exports = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthenticated' });
  
  // Handle both single role and roles array
  const userRoles = req.user.roles || [req.user.role].filter(Boolean);
  
  if (roles.length === 0 || roles.includes('*') || userRoles.some(role => roles.includes(role))) {
    return next();
  }
  return res.status(403).json({ message: 'Forbidden' });
}; 