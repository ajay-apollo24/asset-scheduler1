// controllers/budgetController.js
const BudgetPacing = require('../utils/budgetPacing');
const logger = require('../../shared/utils/logger');

const budgetController = {
  async status(req, res) {
    try {
      const { campaignId } = req.params;
      const status = await BudgetPacing.getBudgetStatus(campaignId);
      res.json(status);
    } catch (error) {
      logger.error('Budget status error:', error);
      res.status(500).json({ message: 'Failed to fetch budget status' });
    }
  },

  async pacing(req, res) {
    try {
      const { campaignId } = req.params;
      const pacing = await BudgetPacing.computePacing(campaignId);
      res.json(pacing);
    } catch (error) {
      logger.error('Budget pacing error:', error);
      res.status(500).json({ message: 'Failed to compute pacing' });
    }
  },

  async floors(req, res) {
    try {
      const { assetId } = req.params;
      const floors = await BudgetPacing.getFloorPrices(assetId);
      res.json(floors);
    } catch (error) {
      logger.error('Floor prices error:', error);
      res.status(500).json({ message: 'Failed to get floor prices' });
    }
  }
};

module.exports = budgetController; 