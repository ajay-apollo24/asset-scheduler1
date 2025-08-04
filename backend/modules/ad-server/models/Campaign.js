// models/Campaign.js
const db = require('../../../config/db');

const Campaign = {
  async create({
    advertiser_id,
    name,
    budget,
    start_date,
    end_date,
    targeting_criteria = {},
    status = 'draft',
    goal_type,
    goal_value,
    pacing = 'even',
    pricing_model = 'cpm',
    frequency_cap,
    day_parting = null
  }) {
    const result = await db.query(
      `INSERT INTO campaigns (advertiser_id, name, budget, start_date, end_date, status, targeting_criteria, goal_type, goal_value, pacing, pricing_model, frequency_cap, day_parting)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id, advertiser_id, name, budget, start_date, end_date, status, targeting_criteria, goal_type, goal_value, pacing, pricing_model, frequency_cap, day_parting, created_at, updated_at`,
      [
        advertiser_id,
        name,
        budget,
        start_date,
        end_date,
        status,
        JSON.stringify(targeting_criteria),
        goal_type,
        goal_value,
        pacing,
        pricing_model,
        frequency_cap,
        day_parting ? JSON.stringify(day_parting) : null
      ]
    );
    return result.rows[0];
  },

  async findById(id) {
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
        c.goal_type,
        c.goal_value,
        c.pacing,
        c.pricing_model,
        c.frequency_cap,
        c.day_parting,
        c.created_at,
        c.updated_at,
        u.email as advertiser_name,
        COALESCE(SUM(pm.impressions), 0) as impressions,
        COALESCE(SUM(pm.clicks), 0) as clicks,
        COALESCE(SUM(pm.revenue), 0) as revenue
       FROM campaigns c
       LEFT JOIN users u ON c.advertiser_id = u.id
       LEFT JOIN creatives cr ON c.id = cr.campaign_id
       LEFT JOIN performance_metrics pm ON cr.id = pm.creative_id
       WHERE c.id = $1
       GROUP BY c.id, c.advertiser_id, c.name, c.budget, c.start_date, c.end_date, c.status, c.targeting_criteria, c.goal_type, c.goal_value, c.pacing, c.pricing_model, c.frequency_cap, c.day_parting, c.created_at, c.updated_at, u.email`,
      [id]
    );
    
    const row = result.rows[0];
    if (row) {
      return {
        ...row,
        ctr: row.impressions > 0 ? ((row.clicks / row.impressions) * 100).toFixed(2) : '0.00'
      };
    }
    return row;
  },

  async findByAdvertiserId(advertiser_id) {
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
        c.goal_type,
        c.goal_value,
        c.pacing,
        c.pricing_model,
        c.frequency_cap,
        c.day_parting,
        c.created_at,
        c.updated_at,
        COALESCE(SUM(pm.impressions), 0) as impressions,
        COALESCE(SUM(pm.clicks), 0) as clicks,
        COALESCE(SUM(pm.revenue), 0) as revenue
       FROM campaigns c
       LEFT JOIN creatives cr ON c.id = cr.campaign_id
       LEFT JOIN performance_metrics pm ON cr.id = pm.creative_id
       WHERE c.advertiser_id = $1
       GROUP BY c.id, c.advertiser_id, c.name, c.budget, c.start_date, c.end_date, c.status, c.targeting_criteria, c.goal_type, c.goal_value, c.pacing, c.pricing_model, c.frequency_cap, c.day_parting, c.created_at, c.updated_at
       ORDER BY c.created_at DESC`,
      [advertiser_id]
    );
    
    // Calculate CTR for each campaign
    return result.rows.map(row => ({
      ...row,
      ctr: row.impressions > 0 ? ((row.clicks / row.impressions) * 100).toFixed(2) : '0.00'
    }));
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
        c.goal_type,
        c.goal_value,
        c.pacing,
        c.pricing_model,
        c.frequency_cap,
        c.day_parting,
        c.created_at,
        c.updated_at,
        u.email as advertiser_name,
        COALESCE(SUM(pm.impressions), 0) as impressions,
        COALESCE(SUM(pm.clicks), 0) as clicks,
        COALESCE(SUM(pm.revenue), 0) as revenue,
        COALESCE(c.budget * 0.3, 0) as spent
       FROM campaigns c
       LEFT JOIN users u ON c.advertiser_id = u.id
       LEFT JOIN creatives cr ON c.id = cr.campaign_id
       LEFT JOIN performance_metrics pm ON cr.id = pm.creative_id
       GROUP BY c.id, c.advertiser_id, c.name, c.budget, c.start_date, c.end_date, c.status, c.targeting_criteria, c.goal_type, c.goal_value, c.pacing, c.pricing_model, c.frequency_cap, c.day_parting, c.created_at, c.updated_at, u.email
       ORDER BY c.created_at DESC`
    );
    
    // Calculate CTR for each campaign
    return result.rows.map(row => ({
      ...row,
      ctr: row.impressions > 0 ? ((row.clicks / row.impressions) * 100).toFixed(2) : '0.00'
    }));
  },

  async update(id, updates) {
    const fields = [];
    const values = [];
    let idx = 1;

      for (const key in updates) {
        if (key === 'targeting_criteria' || key === 'day_parting') {
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

    const query = `UPDATE campaigns SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, advertiser_id, name, budget, start_date, end_date, status, targeting_criteria, goal_type, goal_value, pacing, pricing_model, frequency_cap, day_parting, created_at, updated_at`;
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
      "SELECT id, advertiser_id, name, budget, start_date, end_date, status, targeting_criteria, goal_type, goal_value, pacing, pricing_model, frequency_cap, day_parting, created_at, updated_at FROM campaigns WHERE status = 'active' ORDER BY start_date DESC"
    );
    return result.rows;
  }
};

module.exports = Campaign; 