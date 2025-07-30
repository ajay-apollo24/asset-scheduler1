// controllers/cacheController.js
const logger = require('../utils/logger');

const CacheController = {
  /**
   * Clear all response cache
   */
  async clearCache(req, res) {
    try {
      const cacheSize = req.app.locals.responseCache?.size || 0;
      
      // Clear the response cache
      if (req.app.locals.responseCache) {
        req.app.locals.responseCache.clear();
      }
      
      logger.info('Cache cleared successfully', {
        userId: req.user?.user_id,
        previousCacheSize: cacheSize
      });
      
      res.json({ 
        message: 'Cache cleared successfully',
        previousCacheSize: cacheSize
      });
    } catch (error) {
      logger.logError(error, {
        context: 'cache_clear',
        userId: req.user?.user_id
      });
      res.status(500).json({ message: 'Failed to clear cache' });
    }
  },

  /**
   * Get cache status
   */
  async getCacheStatus(req, res) {
    try {
      const cacheSize = req.app.locals.responseCache?.size || 0;
      const cacheKeys = req.app.locals.responseCache ? 
        Array.from(req.app.locals.responseCache.keys()) : [];
      
      res.json({
        cacheSize,
        cacheKeys: cacheKeys.slice(0, 10), // Show first 10 keys
        totalKeys: cacheKeys.length
      });
    } catch (error) {
      logger.logError(error, {
        context: 'cache_status',
        userId: req.user?.user_id
      });
      res.status(500).json({ message: 'Failed to get cache status' });
    }
  }
};

module.exports = CacheController; 