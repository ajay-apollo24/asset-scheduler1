// controllers/reportingController.js
const Reporting = require('../utils/reporting');
const logger = require('../../shared/utils/logger');

const reportingController = {
  async yieldAnalytics(req, res) {
    try {
      const { timeRange = '24h' } = req.query;
      const data = await Reporting.getYieldAnalytics(timeRange);
      res.json(data);
    } catch (error) {
      logger.error('Yield analytics error:', error);
      res.status(500).json({ message: 'Failed to fetch yield analytics' });
    }
  },

  async multiChannel(req, res) {
    try {
      const { timeRange = '7d' } = req.query;
      const data = await Reporting.getMultiChannelPerformance(timeRange);
      res.json(data);
    } catch (error) {
      logger.error('Multi-channel performance error:', error);
      res.status(500).json({ message: 'Failed to fetch multi-channel performance' });
    }
  },

  async export(req, res) {
    try {
      const { report_type: reportType = 'campaign', format = 'csv' } = req.body || {};
      const out = await Reporting.exportReport({ reportType, format });
      res.json(out);
    } catch (error) {
      logger.error('Report export error:', error);
      res.status(500).json({ message: 'Failed to export report' });
    }
  }
};

module.exports = reportingController; 