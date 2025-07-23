// middleware/auth.js
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // includes: user_id, email, role
    next();
  } catch (err) {
    logger.warn('Invalid token');
    return res.status(401).json({ message: 'Invalid token' });
  }
}

module.exports = authMiddleware;