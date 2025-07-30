// models/AssetMetric.js
const db = require('../../../config/db');

const AssetMetric = {
  /**
   * Upsert daily metrics (impressions, clicks) for an asset & LOB for a given date.
   */
  async upsert({ asset_id, lob, date, impressions, clicks }) {
    const result = await db.query(
      `INSERT INTO asset_metrics (asset_id, lob, date, impressions, clicks)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (asset_id, lob, date)
       DO UPDATE SET impressions = $4, clicks = $5
       RETURNING *`,
      [asset_id, lob, date, impressions, clicks]
    );
    return result.rows[0];
  },

  async getByAssetAndDateRange(asset_id, from, to) {
    const result = await db.query(
      `SELECT * FROM asset_metrics WHERE asset_id = $1 AND date BETWEEN $2 AND $3 ORDER BY date`,
      [asset_id, from, to]
    );
    return result.rows;
  },
};

module.exports = AssetMetric; 