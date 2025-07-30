// server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');

// Load environment variables
dotenv.config();

// Import modules
const shared = require('./modules/shared');
const assetBooking = require('./modules/asset-booking');
const adServer = require('./modules/ad-server');

const app = express();

// Initialize app locals for fallback mechanisms
app.locals.rateLimit = new Map();
app.locals.responseCache = new Map();
app.locals.cache = new Map();

// Request logging middleware (must be first)
app.use(shared.logger.logRequest);

// Fallback middleware
app.use(shared.fallback.databaseFallback);
app.use(shared.fallback.rateLimitFallback);
app.use(shared.fallback.responseCache(300000)); // 5 minutes
app.use(shared.fallback.healthCheckFallback);

app.use(cors());
app.use(bodyParser.json());

// Route mounting - Shared Routes
app.use('/api/auth', shared.authRoutes);
app.use('/api/users', shared.userRoutes);
app.use('/api/reports', shared.reportRoutes);
app.use('/api/logs', shared.logRoutes);
app.use('/api/audit', shared.auditRoutes);

// Route mounting - Asset Booking Routes
app.use('/api/assets', assetBooking.assetRoutes);
app.use('/api/bookings', assetBooking.bookingRoutes);
app.use('/api/approvals', assetBooking.approvalRoutes);
app.use('/api/bidding', assetBooking.biddingRoutes);

// Route mounting - Ad Server Routes
app.use('/api/ads', adServer.adRoutes);
app.use('/api/ads/rtb', adServer.rtbRoutes);
app.use('/api/creatives', adServer.creativeRoutes);

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
  shared.logger.warn('404 Not Found', { path: req.path, method: req.method });
  res.status(404).json({ message: 'Not Found' });
});

// Error handler with fallback recovery
app.use(shared.fallback.errorRecovery);
app.use(shared.errorHandler);

// Export the app for testing
module.exports = app;

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    shared.logger.info('Server started', {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  shared.logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  shared.logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  shared.logger.logError(error, { type: 'uncaughtException' });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  shared.logger.logError(new Error(reason), { 
    type: 'unhandledRejection',
    promise: promise.toString()
  });
  process.exit(1);
});