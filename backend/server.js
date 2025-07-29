// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const logger = require('./utils/logger');
const fallbackMiddleware = require('./middleware/fallback');

// Load environment variables
dotenv.config();

const app = express();

// Initialize app locals for fallback mechanisms
app.locals.rateLimit = new Map();
app.locals.responseCache = new Map();
app.locals.cache = new Map();

// Request logging middleware (must be first)
app.use(logger.logRequest);

// Fallback middleware
app.use(fallbackMiddleware.databaseFallback);
app.use(fallbackMiddleware.rateLimitFallback);
app.use(fallbackMiddleware.responseCache(300000)); // 5 minutes
app.use(fallbackMiddleware.healthCheckFallback);

app.use(cors());
app.use(bodyParser.json());

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const assetRoutes = require('./routes/assetRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const approvalRoutes = require('./routes/approvalRoutes');
const reportRoutes = require('./routes/reportRoutes');
const logRoutes = require('./routes/logRoutes');
const auditRoutes = require('./routes/auditRoutes');

// Ad Server Routes
const adRoutes = require('./routes/adRoutes');
const creativeRoutes = require('./routes/creativeRoutes');

// Middleware
const errorHandler = require('./middleware/errorHandler');

// Route mounting
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/audit', auditRoutes);

// Ad Server Route mounting
app.use('/api/ads', adRoutes);
app.use('/api/creatives', creativeRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const healthStatus = req.app.locals.healthStatus || {
    database: 'unknown',
    externalServices: 'unknown',
    lastCheck: Date.now()
  };

  const isHealthy = healthStatus.database === 'healthy';
  
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    services: healthStatus
  });
});

// Fallback
app.use((req, res) => {
  logger.warn('404 Not Found', { path: req.path, method: req.method });
  res.status(404).json({ message: 'Not Found' });
});

// Error handler with fallback recovery
app.use(fallbackMiddleware.errorRecovery);
app.use(errorHandler);

// Export the app for testing
module.exports = app;

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    logger.info('Server started', {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.logError(error, { type: 'uncaughtException' });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.logError(new Error(reason), { 
    type: 'unhandledRejection',
    promise: promise.toString()
  });
  process.exit(1);
});