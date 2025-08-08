// utils/budgetPacing.js
const db = require('../../../config/db');
const logger = require('../../shared/utils/logger');

const BudgetPacing = {
  async getBudgetStatus(campaignId) {
    try {
      const result = await db.query(
        `SELECT id, name, budget, spend_to_date, start_date, end_date
         FROM campaigns WHERE id = $1`,
        [campaignId]
      );
      const campaign = result.rows[0] || { budget: 0, spend_to_date: 0 };
      const spent = Number(campaign.spend_to_date || 0);
      const budget = Number(campaign.budget || 0);
      const utilization = budget > 0 ? (spent / budget) : 0;
      return {
        campaign_id: campaignId,
        budget,
        spend_to_date: spent,
        utilization: Number((utilization * 100).toFixed(2)),
        pacing_status: utilization > 0.9 ? 'over' : utilization < 0.5 ? 'under' : 'on_track'
      };
    } catch (error) {
      logger.error('Error calculating budget status:', error);
      return { campaign_id: campaignId, budget: 0, spend_to_date: 0, utilization: 0, pacing_status: 'unknown' };
    }
  },

  async computePacing(campaignId) {
    // Stub: compute recommended daily spend to hit budget evenly
    const daysRemaining = 7; // placeholder
    const status = await this.getBudgetStatus(campaignId);
    const remaining = Math.max(status.budget - status.spend_to_date, 0);
    const recommendedDaily = daysRemaining > 0 ? remaining / daysRemaining : 0;
    return {
      campaign_id: campaignId,
      recommended_daily_spend: Number(recommendedDaily.toFixed(2)),
      notes: []
    };
  },

  async getFloorPrices(assetId) {
    // Stub: return simple floor prices per format
    return {
      asset_id: assetId,
      floors: {
        display: 0.5,
        video: 3.0,
        native: 0.8
      },
      currency: 'USD'
    };
  }
};

module.exports = BudgetPacing; 