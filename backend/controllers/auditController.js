// controllers/auditController.js
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

const AuditController = {
  async getBookingAuditTrail(req, res) {
    const { bookingId } = req.params;
    const user_id = req.user.user_id;
    const startTime = Date.now();

    logger.info('Booking audit trail requested', { userId: user_id, bookingId });

    try {
      const auditTrail = await AuditLog.getBookingAuditTrail(bookingId);
      
      const duration = Date.now() - startTime;
      logger.performance('AUDIT_BOOKING_TRAIL', duration, {
        userId: user_id,
        bookingId,
        auditCount: auditTrail.length
      });

      res.json(auditTrail);
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.logError(err, {
        context: 'audit_booking_trail',
        userId: user_id,
        bookingId,
        duration
      });
      res.status(500).json({ message: 'Failed to get booking audit trail' });
    }
  },

  async getAssetAuditTrail(req, res) {
    const { assetId } = req.params;
    const user_id = req.user.user_id;
    const startTime = Date.now();

    logger.info('Asset audit trail requested', { userId: user_id, assetId });

    try {
      const auditTrail = await AuditLog.getAssetAuditTrail(assetId);
      
      const duration = Date.now() - startTime;
      logger.performance('AUDIT_ASSET_TRAIL', duration, {
        userId: user_id,
        assetId,
        auditCount: auditTrail.length
      });

      res.json(auditTrail);
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.logError(err, {
        context: 'audit_asset_trail',
        userId: user_id,
        assetId,
        duration
      });
      res.status(500).json({ message: 'Failed to get asset audit trail' });
    }
  },

  async getApprovalAuditTrail(req, res) {
    const { approvalId } = req.params;
    const user_id = req.user.user_id;
    const startTime = Date.now();

    logger.info('Approval audit trail requested', { userId: user_id, approvalId });

    try {
      const auditTrail = await AuditLog.getApprovalAuditTrail(approvalId);
      
      const duration = Date.now() - startTime;
      logger.performance('AUDIT_APPROVAL_TRAIL', duration, {
        userId: user_id,
        approvalId,
        auditCount: auditTrail.length
      });

      res.json(auditTrail);
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.logError(err, {
        context: 'audit_approval_trail',
        userId: user_id,
        approvalId,
        duration
      });
      res.status(500).json({ message: 'Failed to get approval audit trail' });
    }
  },

  async getRecentActivity(req, res) {
    const { limit = 50 } = req.query;
    const user_id = req.user.user_id;
    const startTime = Date.now();

    logger.info('Recent activity requested', { userId: user_id, limit });

    try {
      const activity = await AuditLog.getRecentActivity(parseInt(limit));
      
      const duration = Date.now() - startTime;
      logger.performance('AUDIT_RECENT_ACTIVITY', duration, {
        userId: user_id,
        limit,
        activityCount: activity.length
      });

      res.json(activity);
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.logError(err, {
        context: 'audit_recent_activity',
        userId: user_id,
        limit,
        duration
      });
      res.status(500).json({ message: 'Failed to get recent activity' });
    }
  },

  async getActivitySummary(req, res) {
    const { days = 30 } = req.query;
    const user_id = req.user.user_id;
    const startTime = Date.now();

    logger.info('Activity summary requested', { userId: user_id, days });

    try {
      const summary = await AuditLog.getActivitySummary(parseInt(days));
      
      const duration = Date.now() - startTime;
      logger.performance('AUDIT_ACTIVITY_SUMMARY', duration, {
        userId: user_id,
        days,
        summaryCount: summary.length
      });

      res.json(summary);
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.logError(err, {
        context: 'audit_activity_summary',
        userId: user_id,
        days,
        duration
      });
      res.status(500).json({ message: 'Failed to get activity summary' });
    }
  },

  async searchAuditLogs(req, res) {
    const { entity_type, entity_id, action, user_id, limit = 100 } = req.body;
    const current_user_id = req.user.user_id;
    const startTime = Date.now();

    logger.info('Audit log search requested', { 
      userId: current_user_id, 
      searchCriteria: { entity_type, entity_id, action, user_id } 
    });

    try {
      const criteria = {};
      if (entity_type) criteria.entity_type = entity_type;
      if (entity_id) criteria.entity_id = entity_id;
      if (action) criteria.action = action;
      if (user_id) criteria.user_id = user_id;

      const results = await AuditLog.searchLogs(criteria);
      const limitedResults = results.slice(0, parseInt(limit));
      
      const duration = Date.now() - startTime;
      logger.performance('AUDIT_SEARCH', duration, {
        userId: current_user_id,
        criteria,
        resultCount: limitedResults.length
      });

      res.json(limitedResults);
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.logError(err, {
        context: 'audit_search',
        userId: current_user_id,
        criteria: { entity_type, entity_id, action, user_id },
        duration
      });
      res.status(500).json({ message: 'Failed to search audit logs' });
    }
  },

  async getAuditStats(req, res) {
    const user_id = req.user.user_id;
    const startTime = Date.now();

    logger.info('Audit stats requested', { userId: user_id });

    try {
      const [recentActivity, activitySummary] = await Promise.all([
        AuditLog.getRecentActivity(10),
        AuditLog.getActivitySummary(7)
      ]);

      const stats = {
        recent_activity_count: recentActivity.length,
        weekly_summary: activitySummary,
        top_actions: activitySummary.reduce((acc, item) => {
          const key = `${item.action}_${item.entity_type}`;
          acc[key] = (acc[key] || 0) + parseInt(item.count);
          return acc;
        }, {}),
        generated_at: new Date().toISOString()
      };
      
      const duration = Date.now() - startTime;
      logger.performance('AUDIT_STATS', duration, {
        userId: user_id
      });

      res.json(stats);
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.logError(err, {
        context: 'audit_stats',
        userId: user_id,
        duration
      });
      res.status(500).json({ message: 'Failed to get audit stats' });
    }
  }
};

module.exports = AuditController; 