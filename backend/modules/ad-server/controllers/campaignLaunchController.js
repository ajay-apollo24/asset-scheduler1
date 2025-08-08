// controllers/campaignLaunchController.js
const Campaign = require('../models/Campaign');
const activation = require('../utils/crossChannel');
const BudgetPacing = require('../utils/budgetPacing');
const logger = require('../../shared/utils/logger');

const campaignLaunchController = {
  async oneClickLaunch(req, res) {
    try {
      const { campaignId } = req.params;

      // Set to pending_review then approve for simplicity of 1-click
      await Campaign.update(campaignId, { status: 'pending_review' });
      await Campaign.update(campaignId, { status: 'approved' });

      // Initialize pacing defaults and activate channels
      const pacing = await BudgetPacing.computePacing(campaignId);
      const channels = await activation.activateChannels({ campaignId, channels: ['web', 'social'] });

      // Set to active
      const campaign = await Campaign.update(campaignId, { status: 'active' });

      res.json({
        message: 'Campaign launched',
        campaign,
        pacing,
        activation: channels
      });
    } catch (error) {
      logger.error('1-click launch error:', error);
      res.status(500).json({ message: 'Failed to launch campaign' });
    }
  }
};

module.exports = campaignLaunchController; 