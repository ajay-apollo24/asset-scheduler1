// controllers/yieldController.js
const YieldControls = require('../utils/yieldControls');
const BudgetPacing = require('../utils/budgetPacing');
const logger = require('../../shared/utils/logger');

const yieldController = {
  async abAssignments(req, res) {
    try {
      const { user_id: userId = 'anonymous', tests = [] } = req.body || {};
      const result = await YieldControls.abTestAssignments({ userId, tests });
      res.json(result);
    } catch (error) {
      logger.error('A/B assignment error:', error);
      res.status(500).json({ message: 'Failed to assign variants' });
    }
  },

  async controls(req, res) {
    try {
      const { campaign_id: campaignId, asset_id: assetId } = req.query;
      const levers = await YieldControls.calculateYieldControls({ campaignId, assetId });
      res.json(levers);
    } catch (error) {
      logger.error('Yield controls error:', error);
      res.status(500).json({ message: 'Failed to get yield controls' });
    }
  },

  async applyFloor(req, res) {
    try {
      const { bid = 0, asset_id: assetId } = req.body || {};
      const floors = await BudgetPacing.getFloorPrices(assetId);
      const adjusted = await YieldControls.applyFloorPrices(bid, floors.floors);
      res.json({ ...adjusted, floors });
    } catch (error) {
      logger.error('Apply floor error:', error);
      res.status(500).json({ message: 'Failed to apply floor prices' });
    }
  }
};

module.exports = yieldController; 