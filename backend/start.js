// start.js - Production server starter
const app = require('./server');
const logger = require('./modules/shared/utils/logger');

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
}); 
