const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for structured logging
const structuredFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.json(),
  format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const logEntry = {
      timestamp,
      level,
      message,
      ...meta
    };
    
    if (stack) {
      logEntry.stack = stack;
    }
    
    return JSON.stringify(logEntry);
  })
);

// Console format for development
const consoleFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.colorize(),
  format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let output = `${timestamp} ${level}: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      output += ` ${JSON.stringify(meta)}`;
    }
    
    if (stack) {
      output += `\n${stack}`;
    }
    
    return output;
  })
);

// Create different loggers for different purposes
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: structuredFormat,
  transports: [
    // Console transport for development
    new transports.Console({
      format: consoleFormat,
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
    }),
    
    // Rotating file transport for all logs
    new DailyRotateFile({
      filename: path.join(logsDir, 'application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      level: 'info'
    }),
    
    // Error-only log file
    new DailyRotateFile({
      filename: path.join(logsDir, 'errors-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error'
    }),
    
    // Audit log file for business events
    new DailyRotateFile({
      filename: path.join(logsDir, 'audit-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '90d',
      level: 'info'
    })
  ]
});

// Enhanced logger with additional methods
const enhancedLogger = {
  // Standard logging methods
  error: (message, meta = {}) => logger.error(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  info: (message, meta = {}) => logger.info(message, meta),
  debug: (message, meta = {}) => logger.debug(message, meta),
  
  // Business-specific logging methods
  audit: (action, entity, userId, details = {}) => {
    logger.info('AUDIT', {
      type: 'audit',
      action,
      entity,
      userId,
      timestamp: new Date().toISOString(),
      ...details
    });
  },
  
  booking: (action, bookingId, userId, details = {}) => {
    logger.info('BOOKING', {
      type: 'booking',
      action,
      bookingId,
      userId,
      timestamp: new Date().toISOString(),
      ...details
    });
  },
  
  asset: (action, assetId, userId, details = {}) => {
    logger.info('ASSET', {
      type: 'asset',
      action,
      assetId,
      userId,
      timestamp: new Date().toISOString(),
      ...details
    });
  },
  
  rule: (ruleName, bookingId, result, details = {}) => {
    logger.info('RULE_VALIDATION', {
      type: 'rule',
      ruleName,
      bookingId,
      result: result ? 'PASSED' : 'FAILED',
      timestamp: new Date().toISOString(),
      ...details
    });
  },
  
  performance: (operation, duration, details = {}) => {
    logger.info('PERFORMANCE', {
      type: 'performance',
      operation,
      duration,
      timestamp: new Date().toISOString(),
      ...details
    });
  },

  // Ad logging
  ad: (action, adId, userId, details = {}) => {
    logger.info('AD', {
      type: 'ad',
      action,
      adId,
      userId,
      timestamp: new Date().toISOString(),
      ...details
    });
  },

  // Creative logging
  creative: (action, creativeId, userId, details = {}) => {
    logger.info('CREATIVE', {
      type: 'creative',
      action,
      creativeId,
      userId,
      timestamp: new Date().toISOString(),
      ...details
    });
  },
  
  security: (action, userId, ip, details = {}) => {
    logger.warn('SECURITY', {
      type: 'security',
      action,
      userId,
      ip,
      timestamp: new Date().toISOString(),
      ...details
    });
  },
  
  api: (method, path, statusCode, duration, userId, details = {}) => {
    const level = statusCode >= 400 ? 'warn' : 'info';
    logger[level]('API_REQUEST', {
      type: 'api',
      method,
      path,
      statusCode,
      duration,
      userId,
      timestamp: new Date().toISOString(),
      ...details
    });
  },
  
  // Utility methods
  logError: (error, context = {}) => {
    logger.error('ERROR', {
      type: 'error',
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString(),
      ...context
    });
  },
  
  logRequest: (req, res, next) => {
    const start = Date.now();
    const { method, path, ip } = req;
    const userId = req.user?.user_id || 'anonymous';
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      enhancedLogger.api(method, path, res.statusCode, duration, userId, {
        userAgent: req.get('User-Agent'),
        ip
      });
    });
    
    next();
  }
};

module.exports = enhancedLogger; 