// Shared Module
// This module contains shared functionality used across all modules

// Controllers
const AuthController = require('./controllers/authController');
const UserController = require('./controllers/userController');
const AuditController = require('./controllers/auditController');
const LogController = require('./controllers/logController');
const ReportController = require('./controllers/reportController');

// Models
const User = require('./models/User');
const AuditLog = require('./models/AuditLog');
const AssetMetric = require('./models/AssetMetric');

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const auditRoutes = require('./routes/auditRoutes');
const logRoutes = require('./routes/logRoutes');
const reportRoutes = require('./routes/reportRoutes');

// Middleware
const auth = require('./middleware/auth');
const authorize = require('./middleware/authorize');
const errorHandler = require('./middleware/errorHandler');
const rateLimit = require('./middleware/rateLimit');
const fallback = require('./middleware/fallback');

// Utils
const logger = require('./utils/logger');
const cache = require('./utils/cache');
const validators = require('./utils/validators');
const logViewer = require('./utils/logViewer');

module.exports = {
  // Controllers
  AuthController,
  UserController,
  AuditController,
  LogController,
  ReportController,
  
  // Models
  User,
  AuditLog,
  AssetMetric,
  
  // Routes
  authRoutes,
  userRoutes,
  auditRoutes,
  logRoutes,
  reportRoutes,
  
  // Middleware
  auth,
  authorize,
  errorHandler,
  rateLimit,
  fallback,
  
  // Utils
  logger,
  cache,
  validators,
  logViewer
}; 