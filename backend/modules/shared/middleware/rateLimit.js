const rateLimit = require('express-rate-limit');

// Environment-based rate limit configuration
const isDevelopment = process.env.NODE_ENV === 'development';
const rateLimitMultiplier = isDevelopment ? 10 : 1; // 10x higher limits in development
const bypassRateLimit = process.env.BYPASS_RATE_LIMIT === 'true'; // Option to bypass rate limiting in dev

// Ad Server Rate Limits (High Volume)
const adRequestLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10000 * rateLimitMultiplier, // 10,000 requests per minute for ad requests (100k in dev)
  message: 'Too many ad requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use IP + user agent for ad requests to prevent abuse
    return `${req.ip}-${req.headers['user-agent']?.substring(0, 50) || 'unknown'}`;
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  }
});

const impressionLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50000 * rateLimitMultiplier, // 50,000 impression requests per minute (500k in dev)
  message: 'Too many impression requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use IP for impression tracking
    return req.ip;
  }
});

const clickLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000 * rateLimitMultiplier, // 1,000 click requests per minute (10k in dev)
  message: 'Too many click requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use IP for click tracking
    return req.ip;
  }
});

// Asset Management Rate Limits (Lower Volume)
const assetManagementLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300 * rateLimitMultiplier, // 300 requests per minute for asset management (3k in dev)
  message: 'Too many asset management requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user?.user_id || req.ip;
  }
});

const authLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 * rateLimitMultiplier, // 100 login attempts per 15 minutes (1k in dev)
  message: 'Too many authentication attempts from this IP',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip;
  }
});

const reportLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100 * rateLimitMultiplier, // 100 report requests per minute (1k in dev)
  message: 'Too many report requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.user_id || req.ip;
  }
});

// Admin/System Rate Limits (Very Low Volume)
const adminLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50 * rateLimitMultiplier, // 50 admin requests per minute (500 in dev)
  message: 'Too many admin requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.user_id || req.ip;
  }
});

// Utility function to apply rate limits based on route
const applyRateLimit = (req, res, next) => {
  // Bypass rate limiting in development if explicitly set
  if (bypassRateLimit && isDevelopment) {
    return next();
  }
  
  const path = req.path;
  
  // Log rate limit application in development
  if (isDevelopment) {
    console.log(`🔒 Applying rate limit for: ${req.method} ${path}`);
  }
  
  // Ad Server routes (high volume)
  if (path.startsWith('/api/ads/request')) {
    return adRequestLimit(req, res, next);
  }
  
  if (path.startsWith('/api/ads/impression')) {
    return impressionLimit(req, res, next);
  }
  
  if (path.startsWith('/api/ads/click')) {
    return clickLimit(req, res, next);
  }
  
  // Asset Management routes (medium volume)
  if (path.startsWith('/api/assets') || 
      path.startsWith('/api/bookings') || 
      path.startsWith('/api/approvals') || 
      path.startsWith('/api/bidding')) {
    return assetManagementLimit(req, res, next);
  }
  
  // Authentication routes (low volume)
  if (path.startsWith('/api/auth')) {
    return authLimit(req, res, next);
  }
  
  // Report routes (medium volume)
  if (path.startsWith('/api/reports')) {
    return reportLimit(req, res, next);
  }
  
  // Admin routes (very low volume)
  if (path.startsWith('/api/users') || 
      path.startsWith('/api/audit') || 
      path.startsWith('/api/logs') || 
      path.startsWith('/api/cache')) {
    return adminLimit(req, res, next);
  }
  
  // Campaign management (medium volume)
  if (path.startsWith('/api/ad-server/campaigns') || 
      path.startsWith('/api/creatives')) {
    return assetManagementLimit(req, res, next);
  }
  
  // Default to asset management limit for unknown routes
  return assetManagementLimit(req, res, next);
};

module.exports = { 
  adRequestLimit, 
  impressionLimit, 
  clickLimit,
  assetManagementLimit, 
  authLimit, 
  reportLimit, 
  adminLimit,
  applyRateLimit 
};
