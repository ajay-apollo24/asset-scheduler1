// middleware/authorize.js

/**
 * authorize(requiredRoles)
 * Usage: app.get('/route', auth, authorize('admin', 'marketing_ops'), handler)
 */
module.exports = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthenticated' });
  if (roles.length === 0 || roles.includes('*') || roles.includes(req.user.role)) {
    return next();
  }
  return res.status(403).json({ message: 'Forbidden' });
}; 