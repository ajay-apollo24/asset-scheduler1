// controllers/attributionController.js
const Attribution = require('../utils/attribution');
const logger = require('../../shared/utils/logger');

const attributionController = {
  async recordConversion(req, res) {
    try {
      const { impression_id: impressionId = null, click_id: clickId = null, value = 0, metadata = {} } = req.body || {};
      const result = await Attribution.recordConversion({ impressionId, clickId, value, metadata });
      if (result.error) return res.status(500).json({ message: 'Failed to record conversion' });
      res.status(201).json(result);
    } catch (error) {
      logger.error('Conversion record error:', error);
      res.status(500).json({ message: 'Failed to record conversion' });
    }
  },

  async status(req, res) {
    try {
      const status = await Attribution.getPipelineStatus();
      res.json(status);
    } catch (error) {
      logger.error('Attribution pipeline status error:', error);
      res.status(500).json({ message: 'Failed to get pipeline status' });
    }
  },

  async campaignAttribution(req, res) {
    try {
      const { campaignId } = req.params;
      const { timeRange = '7d' } = req.query;
      const summary = await Attribution.computeAttribution({ campaignId, timeRange });
      res.json(summary);
    } catch (error) {
      logger.error('Campaign attribution error:', error);
      res.status(500).json({ message: 'Failed to compute attribution' });
    }
  }
};

module.exports = attributionController; 