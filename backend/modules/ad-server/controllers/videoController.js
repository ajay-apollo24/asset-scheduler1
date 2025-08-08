// controllers/videoController.js
const VideoEngine = require('../utils/videoEngine');
const logger = require('../../shared/utils/logger');

const videoController = {
  async config(req, res) {
    try {
      const { creativeId } = req.params;
      const cfg = await VideoEngine.getVideoConfig({ creativeId });
      res.json(cfg);
    } catch (error) {
      logger.error('Video config error:', error);
      res.status(500).json({ message: 'Failed to get video config' });
    }
  },

  async quality(req, res) {
    try {
      const { creativeId } = req.params;
      const qc = await VideoEngine.runQualityChecks({ creativeId });
      res.json(qc);
    } catch (error) {
      logger.error('Video quality error:', error);
      res.status(500).json({ message: 'Failed to run quality checks' });
    }
  },

  async quartile(req, res) {
    try {
      const { creative_id: creativeId, ad_request_id: adRequestId, quartile } = req.body || {};
      const result = await VideoEngine.recordQuartileEvent({ creativeId, adRequestId, quartile });
      if (result.error) return res.status(500).json({ message: 'Failed to record quartile event' });
      res.status(201).json(result);
    } catch (error) {
      logger.error('Quartile track error:', error);
      res.status(500).json({ message: 'Failed to record quartile event' });
    }
  }
};

module.exports = videoController; 