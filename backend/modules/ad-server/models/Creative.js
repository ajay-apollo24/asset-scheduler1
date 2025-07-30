// models/Creative.js
const db = require('../../../config/db');

const Creative = {
  async create({ asset_id, campaign_id = null, name, type, content, dimensions, file_size, status = 'draft' }) {
    const result = await db.query(
      `INSERT INTO creatives (asset_id, campaign_id, name, type, content, dimensions, file_size, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, asset_id, campaign_id, name, type, content, dimensions, file_size, status, created_at, updated_at`,
      [asset_id, campaign_id, name, type, JSON.stringify(content), JSON.stringify(dimensions), file_size, status]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await db.query(
      'SELECT id, asset_id, campaign_id, name, type, content, dimensions, file_size, status, created_at, updated_at FROM creatives WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  async findByAssetId(asset_id) {
    const result = await db.query(
      'SELECT id, asset_id, campaign_id, name, type, content, dimensions, file_size, status, created_at, updated_at FROM creatives WHERE asset_id = $1 ORDER BY created_at DESC',
      [asset_id]
    );
    return result.rows;
  },

  async update(id, updates) {
    const fields = [];
    const values = [];
    let idx = 1;

    for (const key in updates) {
      if (key === 'content' || key === 'dimensions') {
        fields.push(`${key} = $${idx}`);
        values.push(JSON.stringify(updates[key]));
      } else {
        fields.push(`${key} = $${idx}`);
        values.push(updates[key]);
      }
      idx++;
    }

    // Add updated_at timestamp
    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    values.push(id); // last value is the WHERE id
    const query = `
      UPDATE creatives SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING id, asset_id, campaign_id, name, type, content, dimensions, file_size, status, created_at, updated_at
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  },

  async delete(id) {
    const result = await db.query(
      'DELETE FROM creatives WHERE id = $1 RETURNING id',
      [id]
    );
    return { success: result.rows.length > 0 };
  },

  async getPerformanceMetrics(id, timeRange = '24h') {
    let dateFilter = '';
    const params = [id];
    
    if (timeRange === '24h') {
      dateFilter = 'AND date >= CURRENT_DATE';
    } else if (timeRange === '7d') {
      dateFilter = 'AND date >= CURRENT_DATE - INTERVAL \'7 days\'';
    } else if (timeRange === '30d') {
      dateFilter = 'AND date >= CURRENT_DATE - INTERVAL \'30 days\'';
    }

    const result = await db.query(
      `SELECT 
        SUM(impressions) as total_impressions,
        SUM(clicks) as total_clicks,
        SUM(revenue) as total_revenue,
        CASE WHEN SUM(impressions) > 0 THEN ROUND((SUM(clicks)::DECIMAL / SUM(impressions)) * 100, 2) ELSE 0 END as ctr
       FROM performance_metrics 
       WHERE creative_id = $1 ${dateFilter}`,
      params
    );

    return result.rows[0] || {
      total_impressions: 0,
      total_clicks: 0,
      total_revenue: 0,
      ctr: 0
    };
  },

  async findByStatus(status) {
    const result = await db.query(
      'SELECT id, asset_id, campaign_id, name, type, content, dimensions, file_size, status, created_at, updated_at FROM creatives WHERE status = $1 ORDER BY created_at DESC',
      [status]
    );
    return result.rows;
  },

  async getApprovedCreativesForAsset(asset_id) {
    const result = await db.query(
      'SELECT id, asset_id, campaign_id, name, type, content, dimensions, file_size, status FROM creatives WHERE asset_id = $1 AND status = \'approved\' ORDER BY created_at DESC',
      [asset_id]
    );
    return result.rows;
  }
};

module.exports = Creative; 