// middleware/fallback.js
const logger = require('../../shared/utils/logger');

/**
 * Graceful fallback middleware for API failures
 */
const fallbackMiddleware = {
  /**
   * Database connection fallback
   */
  databaseFallback: (req, res, next) => {
    const originalQuery = req.app.locals.db?.query;
    
    if (originalQuery) {
      req.app.locals.db.query = async (...args) => {
        try {
          return await originalQuery(...args);
        } catch (error) {
          logger.logError(error, {
            context: 'database_fallback',
            query: args[0]?.substring(0, 100),
            userId: req.user?.user_id
          });

          // Return cached data if available
          const cachedData = req.app.locals.cache?.get(args[0]);
          if (cachedData) {
            logger.info('Using cached data due to database error', {
              query: args[0]?.substring(0, 100),
              userId: req.user?.user_id
            });
            return { rows: cachedData };
          }

          // Return empty result for read operations
          if (args[0]?.toLowerCase().includes('select')) {
            logger.warn('Returning empty result due to database error', {
              query: args[0]?.substring(0, 100),
              userId: req.user?.user_id
            });
            return { rows: [] };
          }

          throw error;
        }
      };
    }
    
    next();
  },

  /**
   * External service fallback
   */
  externalServiceFallback: (serviceName, fallbackData) => {
    return async (req, res, next) => {
      const originalService = req.app.locals[serviceName];
      
      if (originalService) {
        req.app.locals[serviceName] = new Proxy(originalService, {
          get(target, prop) {
            const originalMethod = target[prop];
            
            if (typeof originalMethod === 'function') {
              return async (...args) => {
                try {
                  return await originalMethod.apply(target, args);
                } catch (error) {
                  logger.logError(error, {
                    context: `${serviceName}_fallback`,
                    method: prop,
                    userId: req.user?.user_id
                  });

                  // Return fallback data
                  if (fallbackData && fallbackData[prop]) {
                    logger.info(`Using fallback data for ${serviceName}.${prop}`, {
                      userId: req.user?.user_id
                    });
                    return fallbackData[prop];
                  }

                  // Return default fallback
                  return null;
                }
              };
            }
            
            return originalMethod;
          }
        });
      }
      
      next();
    };
  },

  /**
   * Rate limiting fallback
   */
  rateLimitFallback: (req, res, next) => {
    const rateLimitKey = `rate_limit:${req.user?.user_id || req.ip}`;
    const currentTime = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxRequests = 100;

    try {
      const userRequests = req.app.locals.rateLimit?.get(rateLimitKey) || [];
      const windowStart = currentTime - windowMs;
      
      // Remove old requests outside the window
      const recentRequests = userRequests.filter(time => time > windowStart);
      
      if (recentRequests.length >= maxRequests) {
        logger.warn('Rate limit exceeded, using fallback response', {
          userId: req.user?.user_id,
          ip: req.ip,
          requestCount: recentRequests.length
        });

        return res.status(429).json({
          message: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }

      // Add current request
      recentRequests.push(currentTime);
      req.app.locals.rateLimit?.set(rateLimitKey, recentRequests);
      
      next();
    } catch (error) {
      logger.logError(error, {
        context: 'rate_limit_fallback',
        userId: req.user?.user_id
      });
      
      // Continue without rate limiting if there's an error
      next();
    }
  },

  /**
   * Circuit breaker pattern
   */
  circuitBreaker: (serviceName, options = {}) => {
    const {
      failureThreshold = 5,
      timeout = 60000, // 1 minute
      resetTimeout = 300000 // 5 minutes
    } = options;

    let failures = 0;
    let lastFailureTime = 0;
    let state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN

    return async (req, res, next) => {
      const currentTime = Date.now();

      // Check if circuit breaker should be reset
      if (state === 'OPEN' && currentTime - lastFailureTime > resetTimeout) {
        state = 'HALF_OPEN';
        failures = 0;
        logger.info(`Circuit breaker for ${serviceName} moved to HALF_OPEN`);
      }

      if (state === 'OPEN') {
        logger.warn(`Circuit breaker for ${serviceName} is OPEN, using fallback`, {
          userId: req.user?.user_id
        });

        return res.status(503).json({
          message: 'Service temporarily unavailable. Please try again later.',
          service: serviceName
        });
      }

      // Add circuit breaker to request
      req.circuitBreaker = {
        serviceName,
        state,
        recordSuccess: () => {
          if (state === 'HALF_OPEN') {
            state = 'CLOSED';
            failures = 0;
            logger.info(`Circuit breaker for ${serviceName} moved to CLOSED`);
          }
        },
        recordFailure: () => {
          failures++;
          lastFailureTime = currentTime;
          
          if (failures >= failureThreshold) {
            state = 'OPEN';
            logger.warn(`Circuit breaker for ${serviceName} moved to OPEN`, {
              failures,
              threshold: failureThreshold
            });
          }
        }
      };

      next();
    };
  },

  /**
   * Response caching fallback
   */
  responseCache: (ttl = 300000) => { // 5 minutes default
    return (req, res, next) => {
      const cacheKey = `${req.method}:${req.originalUrl}:${req.user?.user_id || 'anonymous'}`;
      
      // Skip caching for non-GET requests
      if (req.method !== 'GET') {
        return next();
      }

      const cachedResponse = req.app.locals.responseCache?.get(cacheKey);
      if (cachedResponse && Date.now() - cachedResponse.timestamp < ttl) {
        logger.info('Serving cached response', {
          key: cacheKey,
          userId: req.user?.user_id
        });
        
        return res.json(cachedResponse.data);
      }

      // Intercept response to cache it
      const originalJson = res.json;
      res.json = function(data) {
        req.app.locals.responseCache?.set(cacheKey, {
          data,
          timestamp: Date.now()
        });
        
        return originalJson.call(this, data);
      };

      next();
    };
  },

  /**
   * Health check fallback
   */
  healthCheckFallback: (req, res, next) => {
    const healthStatus = {
      database: 'unknown',
      externalServices: 'unknown',
      lastCheck: Date.now()
    };

    // Check database health
    req.app.locals.db?.query('SELECT 1')
      .then(() => {
        healthStatus.database = 'healthy';
      })
      .catch(() => {
        healthStatus.database = 'unhealthy';
        logger.warn('Database health check failed');
      });

    // Store health status
    req.app.locals.healthStatus = healthStatus;
    
    next();
  },

  /**
   * Error recovery middleware
   */
  errorRecovery: (error, req, res, next) => {
    logger.logError(error, {
      context: 'error_recovery',
      userId: req.user?.user_id,
      path: req.path,
      method: req.method
    });

    // Try to recover gracefully
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        message: 'Service temporarily unavailable. Please try again later.',
        error: 'Connection refused'
      });
    }

    if (error.code === 'ETIMEDOUT') {
      return res.status(504).json({
        message: 'Request timeout. Please try again.',
        error: 'Request timeout'
      });
    }

    if (error.code === 'ENOTFOUND') {
      return res.status(502).json({
        message: 'Service not found. Please try again later.',
        error: 'Service not found'
      });
    }

    // Default error response
    res.status(500).json({
      message: 'Internal server error. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal error'
    });
  }
};

module.exports = fallbackMiddleware; 