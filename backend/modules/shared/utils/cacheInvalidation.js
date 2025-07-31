// utils/cacheInvalidation.js
const logger = require('./logger');

/**
 * Cache invalidation utility
 * Provides methods to invalidate specific cache patterns after data changes
 */
const CacheInvalidation = {
  /**
   * Invalidate cache entries matching specific patterns
   * @param {Object} req - Express request object (for accessing app.locals.responseCache)
   * @param {Array<string>} patterns - Array of URL patterns to match (e.g., ['/api/assets', '/api/bookings'])
   * @param {string} context - Context for logging (e.g., 'asset_creation', 'booking_update')
   * @param {number} userId - User ID for logging
   */
  invalidatePatterns(req, patterns, context, userId) {
    if (!req.app.locals.responseCache) {
      logger.debug('No response cache found', { context, userId });
      return;
    }

    const cacheKeysToDelete = Array.from(req.app.locals.responseCache.keys())
      .filter(key => patterns.some(pattern => key.includes(pattern)));
    
    cacheKeysToDelete.forEach(key => {
      req.app.locals.responseCache.delete(key);
    });
    
    logger.info('Cache invalidated', {
      context,
      userId,
      patterns,
      keysDeleted: cacheKeysToDelete.length,
      deletedKeys: cacheKeysToDelete.slice(0, 5) // Log first 5 keys for debugging
    });

    return cacheKeysToDelete.length;
  },

  /**
   * Invalidate all asset-related cache entries
   */
  invalidateAssets(req, context, userId) {
    return this.invalidatePatterns(req, ['/api/assets'], context, userId);
  },

  /**
   * Invalidate all booking-related cache entries
   */
  invalidateBookings(req, context, userId) {
    return this.invalidatePatterns(req, ['/api/bookings'], context, userId);
  },

  /**
   * Invalidate all approval-related cache entries
   */
  invalidateApprovals(req, context, userId) {
    return this.invalidatePatterns(req, ['/api/approvals'], context, userId);
  },

  /**
   * Invalidate all bidding-related cache entries
   */
  invalidateBidding(req, context, userId) {
    return this.invalidatePatterns(req, ['/api/bidding/bookings', '/api/bidding/bids', '/api/bidding'], context, userId);
  },

  /**
   * Invalidate dashboard and report cache entries
   */
  invalidateDashboard(req, context, userId) {
    return this.invalidatePatterns(req, ['/api/reports', '/api/analytics', '/api/dashboard'], context, userId);
  },

  /**
   * Invalidate all cache entries (nuclear option)
   */
  invalidateAll(req, context, userId) {
    if (!req.app.locals.responseCache) {
      logger.debug('No response cache found', { context, userId });
      return 0;
    }

    const cacheSize = req.app.locals.responseCache.size;
    req.app.locals.responseCache.clear();
    
    logger.info('All cache cleared', {
      context,
      userId,
      previousCacheSize: cacheSize
    });

    return cacheSize;
  },

  /**
   * Smart invalidation - invalidates related cache entries based on the operation
   * @param {Object} req - Express request object
   * @param {string} operation - Operation type ('asset_create', 'booking_update', etc.)
   * @param {number} userId - User ID for logging
   * @param {Object} metadata - Additional metadata for logging
   */
  smartInvalidate(req, operation, userId, metadata = {}) {
    const context = `smart_invalidation_${operation}`;
    let invalidatedCount = 0;

    // Asset operations
    if (operation.includes('asset')) {
      invalidatedCount += this.invalidateAssets(req, context, userId);
      invalidatedCount += this.invalidateDashboard(req, context, userId); // Assets affect dashboard
    }

    // Booking operations
    if (operation.includes('booking')) {
      invalidatedCount += this.invalidateBookings(req, context, userId);
      invalidatedCount += this.invalidateApprovals(req, context, userId); // Bookings create approvals
      invalidatedCount += this.invalidateDashboard(req, context, userId); // Bookings affect dashboard
    }

    // Approval operations
    if (operation.includes('approval')) {
      invalidatedCount += this.invalidateApprovals(req, context, userId);
      invalidatedCount += this.invalidateBookings(req, context, userId); // Approvals update booking status
      invalidatedCount += this.invalidateDashboard(req, context, userId); // Approvals affect dashboard
    }

    // Bidding operations
    if (operation.includes('bid')) {
      invalidatedCount += this.invalidateBidding(req, context, userId);
      invalidatedCount += this.invalidateBookings(req, context, userId); // Bids affect booking status
      invalidatedCount += this.invalidateDashboard(req, context, userId); // Bids affect dashboard
    }

    logger.info('Smart cache invalidation completed', {
      operation,
      userId,
      totalKeysInvalidated: invalidatedCount,
      metadata
    });

    return invalidatedCount;
  }
};

module.exports = CacheInvalidation; 