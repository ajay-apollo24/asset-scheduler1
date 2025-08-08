// controllers/activationController.js
const CrossChannel = require('../utils/crossChannel');
const logger = require('../../shared/utils/logger');

const activationController = {
  async activate(req, res) {
    try {
      const { campaignId } = req.params;
      const { channels = ['web', 'social'] } = req.body || {};
      const result = await CrossChannel.activateChannels({ campaignId, channels });
      res.json(result);
    } catch (error) {
      logger.error('Channel activation error:', error);
      res.status(500).json({ message: 'Failed to activate channels' });
    }
  },

  async plans(req, res) {
    try {
      const { campaignId } = req.params;
      const result = await CrossChannel.getChannelPlans({ campaignId });
      res.json(result);
    } catch (error) {
      logger.error('Channel plan error:', error);
      res.status(500).json({ message: 'Failed to fetch channel plans' });
    }
  }
};

module.exports = activationController; 