// controllers/targetingController.js
const TargetingEngine = require('../utils/targetingEngine');
const logger = require('../../shared/utils/logger');

const targetingController = {
  async preview(req, res) {
    try {
      const { page_context, user_context, store_context } = req.body || {};
      const result = await TargetingEngine.evaluateTargeting({
        pageContext: page_context,
        userContext: user_context,
        storeContext: store_context
      });
      res.json(result);
    } catch (error) {
      logger.error('Targeting preview error:', error);
      res.status(500).json({ message: 'Failed to generate targeting preview' });
    }
  },

  async audience(req, res) {
    try {
      const user_id = req.params.userId || req.query.user_id || 'anonymous';
      const segments = await TargetingEngine.getAudienceSegments({ user_id });
      res.json(segments);
    } catch (error) {
      logger.error('Audience fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch audience segments' });
    }
  },

  async geo(req, res) {
    try {
      const { store_id, section, lat, lng } = req.query;
      const geo = await TargetingEngine.getStoreGeoTargets({ store_id, section, lat, lng });
      res.json(geo);
    } catch (error) {
      logger.error('Geo fetch error:', error);
      res.status(500).json({ message: 'Failed to fetch geo targets' });
    }
  }
};

module.exports = targetingController; 