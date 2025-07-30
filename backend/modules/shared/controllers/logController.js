// controllers/logController.js
const LogViewer = require('../utils/logViewer');
const logger = require('../../shared/utils/logger');

const LogController = {
  async getSystemHealth(req, res) {
    const user_id = req.user.user_id;
    const startTime = Date.now();

    logger.info('System health check requested', { userId: user_id });

    try {
      const logViewer = new LogViewer();
      const health = logViewer.getSystemHealth();

      const duration = Date.now() - startTime;
      logger.performance('SYSTEM_HEALTH_CHECK', duration, { userId: user_id });

      res.json(health);
    } catch (err) {
      logger.logError(err, {
        context: 'system_health_check',
        userId: user_id
      });
      res.status(500).json({ message: 'Failed to get system health' });
    }
  },

  async getPerformanceMetrics(req, res) {
    const user_id = req.user.user_id;

    try {
      const logViewer = new LogViewer();
      const metrics = logViewer.getPerformanceMetrics();

      logger.info('Performance metrics requested', { userId: user_id });

      res.json(metrics);
    } catch (err) {
      logger.logError(err, {
        context: 'performance_metrics',
        userId: user_id
      });
      res.status(500).json({ message: 'Failed to get performance metrics' });
    }
  },

  async getRuleValidationStats(req, res) {
    const user_id = req.user.user_id;

    try {
      const logViewer = new LogViewer();
      const stats = logViewer.getRuleValidationStats();

      logger.info('Rule validation stats requested', { userId: user_id });

      res.json(stats);
    } catch (err) {
      logger.logError(err, {
        context: 'rule_validation_stats',
        userId: user_id
      });
      res.status(500).json({ message: 'Failed to get rule validation stats' });
    }
  },

  async getBookingStats(req, res) {
    const user_id = req.user.user_id;

    try {
      const logViewer = new LogViewer();
      const stats = logViewer.getBookingStats();

      logger.info('Booking stats requested', { userId: user_id });

      res.json(stats);
    } catch (err) {
      logger.logError(err, {
        context: 'booking_stats',
        userId: user_id
      });
      res.status(500).json({ message: 'Failed to get booking stats' });
    }
  },

  async getSecurityEvents(req, res) {
    const user_id = req.user.user_id;
    const { limit = 50 } = req.query;

    try {
      const logViewer = new LogViewer();
      const events = logViewer.getSecurityEvents(parseInt(limit));

      logger.info('Security events requested', { userId: user_id, limit });

      res.json(events);
    } catch (err) {
      logger.logError(err, {
        context: 'security_events',
        userId: user_id
      });
      res.status(500).json({ message: 'Failed to get security events' });
    }
  },

  async getErrorLogs(req, res) {
    const user_id = req.user.user_id;
    const { limit = 50 } = req.query;

    try {
      const logViewer = new LogViewer();
      const errors = logViewer.getErrorLogs(parseInt(limit));

      logger.info('Error logs requested', { userId: user_id, limit });

      res.json(errors);
    } catch (err) {
      logger.logError(err, {
        context: 'error_logs',
        userId: user_id
      });
      res.status(500).json({ message: 'Failed to get error logs' });
    }
  },

  async getAuditLogs(req, res) {
    const user_id = req.user.user_id;
    const { limit = 50 } = req.query;

    try {
      const logViewer = new LogViewer();
      const audits = logViewer.getAuditLogs(parseInt(limit));

      logger.info('Audit logs requested', { userId: user_id, limit });

      res.json(audits);
    } catch (err) {
      logger.logError(err, {
        context: 'audit_logs',
        userId: user_id
      });
      res.status(500).json({ message: 'Failed to get audit logs' });
    }
  },

  async searchLogs(req, res) {
    const user_id = req.user.user_id;
    const { criteria = {} } = req.body;

    try {
      const logViewer = new LogViewer();
      const results = logViewer.searchLogs(criteria);

      logger.info('Log search requested', { userId: user_id, criteria });

      res.json(results);
    } catch (err) {
      logger.logError(err, {
        context: 'log_search',
        userId: user_id
      });
      res.status(500).json({ message: 'Failed to search logs' });
    }
  },

  async getLogFiles(req, res) {
    const user_id = req.user.user_id;

    try {
      const logViewer = new LogViewer();
      const files = logViewer.getLogFiles();

      logger.info('Log files list requested', { userId: user_id });

      res.json(files);
    } catch (err) {
      logger.logError(err, {
        context: 'log_files',
        userId: user_id
      });
      res.status(500).json({ message: 'Failed to get log files' });
    }
  }
};

module.exports = LogController; 