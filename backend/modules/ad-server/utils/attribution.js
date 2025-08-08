// utils/attribution.js
const db = require('../../../config/db');
const logger = require('../../shared/utils/logger');

const Attribution = {
  async recordConversion({ impressionId = null, clickId = null, value = 0, metadata = {} }) {
    try {
      const result = await db.query(
        `INSERT INTO conversions (impression_id, click_id, value, metadata)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [impressionId, clickId, value, metadata]
      );
      return { conversion_id: result.rows[0].id };
    } catch (error) {
      logger.error('Error recording conversion:', error);
      return { error: 'record_failed' };
    }
  },

  async getPipelineStatus() {
    // Stub: always healthy
    return {
      ingestion: 'healthy',
      processing: 'healthy',
      last_event_at: new Date().toISOString()
    };
  },

  async computeAttribution({ campaignId, timeRange = '7d' }) {
    // Stub: simple last-click model
    const result = await db.query(
      `SELECT COALESCE(SUM(value), 0) as conversions_value, COUNT(*) as conversions
       FROM conversions WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'`,
      []
    );
    return {
      campaign_id: campaignId,
      time_range: timeRange,
      conversions: Number(result.rows[0]?.conversions || 0),
      conversions_value: Number(result.rows[0]?.conversions_value || 0),
      model: 'last_click'
    };
  }
};

module.exports = Attribution; 