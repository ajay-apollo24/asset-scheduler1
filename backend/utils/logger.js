const { createLogger, format, transports } = require('winston');

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.colorize(),
    format.printf(({ timestamp, level, message, stack }) => `${timestamp} ${level}: ${stack || message}`)
  ),
  transports: [
    new transports.Console(),
  ],
});

module.exports = logger; 