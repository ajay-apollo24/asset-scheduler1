// models/Campaign.js
const db = require('../../../config/db');

const Campaign = {
  async create({ advertiser_id, name, budget, start_date, end_date, targeting_criteria = {}, status = 'draft' }) {
    const result = await db.query(
      `INSERT INTO campaigns (advertiser_id, name, budget, start_date, end_date, status, targeting_criteria)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, advertiser_id, name, budget, start_date, end_date, status, targeting_criteria, created_at, updated_at`,
      [advertiser_id, name, budget, start_date, end_date, status, JSON.stringify(targeting_criteria)]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await db.query(
      'SELECT id, advertiser_id, name, budget, start_date, end_date, status, targeting_criteria, created_at, updated_at FROM campaigns WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  async findByAdvertiserId(advertiser_id) {
    const result = await db.query(
      'SELECT id, advertiser_id, name, budget, start_date, end_date, status, targeting_criteria, created_at, updated_at FROM campaigns WHERE advertiser_id = $1 ORDER BY created_at DESC',
      [advertiser_id]
    );
    return result.rows;
  },

  async findAll() {
    const result = await db.query(
      `SELECT 
        c.id, 
        c.advertiser_id, 
        c.name, 
        c.budget, 
        c.start_date, 
        c.end_date, 
        c.status, 
        c.targeting_criteria, 
        c.created_at, 
        c.updated_at,
        u.email as advertiser_name,
        0 as impressions,
        0 as clicks,
        0 as revenue,
        COALESCE(c.budget * 0.3, 0) as spent
       FROM campaigns c
       LEFT JOIN users u ON c.advertiser_id = u.id
       ORDER BY c.created_at DESC`
    );
    return result.rows;
  },

  async update(id, updates) {
    const fields = [];
    const values = [];
    let idx = 1;

    for (const key in updates) {
      if (key === 'targeting_criteria') {
        fields.push(`${key} = $${idx}`);
        values.push(JSON.stringify(updates[key]));
      } else {
        fields.push(`${key} = $${idx}`);
        values.push(updates[key]);
      }
      idx++;
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const query = `UPDATE campaigns SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, advertiser_id, name, budget, start_date, end_date, status, targeting_criteria, created_at, updated_at`;
    const result = await db.query(query, values);
    return result.rows[0];
  },

  async delete(id) {
    const result = await db.query('DELETE FROM campaigns WHERE id = $1 RETURNING *', [id]);
    return result.rows[0];
  },

  async updateStatus(id, status) {
    const result = await db.query(
      'UPDATE campaigns SET status = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id, status]
    );
    return result.rows[0];
  },

  async getPerformanceMetrics(id) {
    const result = await db.query(
      `SELECT
        SUM(pm.impressions) as impressions,
        SUM(pm.clicks) as clicks,
        SUM(pm.revenue) as revenue,
        CASE WHEN SUM(pm.impressions) > 0 THEN ROUND((SUM(pm.clicks)::DECIMAL / SUM(pm.impressions)) * 100, 2) ELSE 0 END as ctr
       FROM creatives c
       JOIN performance_metrics pm ON c.id = pm.creative_id
       WHERE c.campaign_id = $1`,
      [id]
    );

    const row = result.rows[0] || { impressions: 0, clicks: 0, revenue: 0, ctr: 0 };
    return {
      impressions: parseInt(row.impressions) || 0,
      clicks: parseInt(row.clicks) || 0,
      ctr: parseFloat(row.ctr) || 0,
      revenue: parseFloat(row.revenue) || 0
    };
  },

  async getActiveCampaigns() {
    const result = await db.query(
      'SELECT id, advertiser_id, name, budget, start_date, end_date, status, targeting_criteria, created_at, updated_at FROM campaigns WHERE status = \'active\' ORDER BY start_date DESC'
    );
    return result.rows;
  }
};

module.exports = Campaign; 