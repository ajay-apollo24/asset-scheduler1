// models/UnifiedCampaign.js
const db = require('../../../config/db');
const logger = require('../../shared/utils/logger');

const UnifiedCampaign = {
  /**
   * Create a new unified campaign (internal booking or external campaign)
   */
  async create({
    advertiser_id,
    advertiser_type = 'external', // 'internal' or 'external'
    name,
    title = null,
    asset_id = null,
    budget = 0,
    start_date,
    end_date,
    status = 'draft',
    lob = null, // for internal campaigns
    purpose = null, // for internal campaigns
    creative_url = null,
    targeting_criteria = {},
    goal_type = null,
    goal_value = null,
    pacing = 'even',
    pricing_model = 'cpm',
    frequency_cap = null,
    day_parting = null,
    priority_weight = 1.00, // for internal campaigns
    bidding_strategy = 'manual', // 'manual', 'rtb', 'auto'
    auction_status = 'none',
    creative_settings = {},
    performance_settings = {}
  }) {
    const result = await db.query(
      `INSERT INTO campaigns (
        advertiser_id, advertiser_type, name, title, asset_id, budget, 
        start_date, end_date, status, lob, purpose, creative_url,
        targeting_criteria, goal_type, goal_value, pacing, pricing_model,
        frequency_cap, day_parting, priority_weight, bidding_strategy, auction_status,
        creative_settings, performance_settings
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      RETURNING *`,
      [
        advertiser_id, advertiser_type, name, title, asset_id, budget,
        start_date, end_date, status, lob, purpose, creative_url,
        JSON.stringify(targeting_criteria), goal_type, goal_value, pacing, pricing_model,
        frequency_cap, day_parting ? JSON.stringify(day_parting) : null, priority_weight, bidding_strategy, auction_status,
        JSON.stringify(creative_settings), JSON.stringify(performance_settings)
      ]
    );

    logger.info('Unified campaign created', {
      campaignId: result.rows[0].id,
      advertiserType: advertiser_type,
      advertiserId: advertiser_id,
      assetId: asset_id,
      status
    });

    return result.rows[0];
  },

  /**
   * Find campaign by ID
   */
  async findById(id) {
    const result = await db.query(
      `SELECT 
        c.*,
        u.email as advertiser_name,
        a.name as asset_name,
        a.level as asset_level,
        COALESCE(SUM(pm.impressions), 0) as impressions,
        COALESCE(SUM(pm.clicks), 0) as clicks,
        COALESCE(SUM(pm.revenue), 0) as revenue
       FROM campaigns c
       LEFT JOIN users u ON c.advertiser_id = u.id
       LEFT JOIN assets a ON c.asset_id = a.id
       LEFT JOIN creatives cr ON c.id = cr.campaign_id
       LEFT JOIN performance_metrics pm ON cr.id = pm.creative_id
       WHERE c.id = $1 AND c.is_deleted = FALSE
       GROUP BY c.id, c.advertiser_id, c.name, c.budget, c.start_date, c.end_date, 
                c.status, c.targeting_criteria, c.goal_type, c.goal_value, c.pacing, 
                c.pricing_model, c.frequency_cap, c.day_parting, c.created_at, c.updated_at, 
                u.email, a.name, a.level`,
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

  /**
   * Find campaigns by advertiser type
   */
  async findByAdvertiserType(advertiser_type, options = {}) {
    let query = `
      SELECT 
        c.*,
        u.email as advertiser_name,
        a.name as asset_name,
        a.level as asset_level
      FROM campaigns c
      LEFT JOIN users u ON c.advertiser_id = u.id
      LEFT JOIN assets a ON c.asset_id = a.id
      WHERE c.advertiser_type = $1 AND c.is_deleted = FALSE
    `;
    
    const params = [advertiser_type];
    let paramIndex = 2;

    if (options.status) {
      query += ` AND c.status = $${paramIndex}`;
      params.push(options.status);
      paramIndex++;
    }

    if (options.advertiser_id) {
      query += ` AND c.advertiser_id = $${paramIndex}`;
      params.push(options.advertiser_id);
      paramIndex++;
    }

    query += ` ORDER BY c.created_at DESC`;

    if (options.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(options.limit);
    }

    const result = await db.query(query, params);
    return result.rows;
  },

  /**
   * Find internal bookings (for backward compatibility)
   */
  async findInternalBookings(options = {}) {
    return this.findByAdvertiserType('internal', options);
  },

  /**
   * Find external campaigns
   */
  async findExternalCampaigns(options = {}) {
    return this.findByAdvertiserType('external', options);
  },

  /**
   * Find conflicts for a given asset and date range
   */
  async findConflicts(asset_id, start_date, end_date, exclude_id = null) {
    let query = `
      SELECT * FROM campaigns
      WHERE asset_id = $1
        AND status IN ('pending', 'approved', 'active')
        AND is_deleted = FALSE
        AND NOT (end_date < $2 OR start_date > $3)
    `;
    
    const params = [asset_id, start_date, end_date];
    
    if (exclude_id) {
      query += ` AND id != $4`;
      params.push(exclude_id);
    }

    const result = await db.query(query, params);
    return result.rows;
  },

  /**
   * Get asset availability for a date range
   */
  async getAssetAvailability(asset_id, start_date, end_date) {
    const result = await db.query(
      `SELECT * FROM get_unified_asset_availability($1, $2, $3)`,
      [asset_id, start_date, end_date]
    );
    return result.rows;
  },

  /**
   * Process a unified bid
   */
  async processBid(campaign_id, asset_id, bid_amount, bid_type = 'manual') {
    const result = await db.query(
      `SELECT * FROM process_unified_bid($1, $2, $3, $4)`,
      [campaign_id, asset_id, bid_amount, bid_type]
    );
    return result.rows[0];
  },

  /**
   * Update campaign status
   */
  async updateStatus(id, status) {
    const result = await db.query(
      `UPDATE campaigns SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 AND is_deleted = FALSE RETURNING *`,
      [status, id]
    );
    
    logger.info('Campaign status updated', {
      campaignId: id,
      newStatus: status
    });
    
    return result.rows[0];
  },

  /**
   * Update campaign
   */
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

    values.push(id);
    const query = `
      UPDATE campaigns SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${idx} AND is_deleted = FALSE
      RETURNING *
    `;

    const result = await db.query(query, values);
    
    logger.info('Campaign updated', {
      campaignId: id,
      updatedFields: Object.keys(updates)
    });
    
    return result.rows[0];
  },

  /**
   * Soft delete campaign
   */
  async softDelete(id) {
    const result = await db.query(
      `UPDATE campaigns SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 RETURNING *`,
      [id]
    );
    
    logger.info('Campaign soft deleted', { campaignId: id });
    
    return result.rows[0];
  },

  /**
   * Get unified analytics
   */
  async getAnalytics(start_date, end_date) {
    const result = await db.query(
      `SELECT * FROM get_unified_analytics($1, $2)`,
      [start_date, end_date]
    );
    return result.rows;
  },

  /**
   * Find campaigns by LOB (for internal campaigns)
   */
  async findByLOB(lob, options = {}) {
    let query = `
      SELECT 
        c.*,
        u.email as advertiser_name,
        a.name as asset_name,
        a.level as asset_level
      FROM campaigns c
      LEFT JOIN users u ON c.advertiser_id = u.id
      LEFT JOIN assets a ON c.asset_id = a.id
      WHERE c.lob = $1 AND c.advertiser_type = 'internal' AND c.is_deleted = FALSE
    `;
    
    const params = [lob];
    let paramIndex = 2;

    if (options.status) {
      query += ` AND c.status = $${paramIndex}`;
      params.push(options.status);
      paramIndex++;
    }

    query += ` ORDER BY c.start_date DESC`;

    const result = await db.query(query, params);
    return result.rows;
  },

  /**
   * Get active campaigns for an asset
   */
  async getActiveForAsset(asset_id, date = new Date()) {
    const result = await db.query(
      `SELECT 
        c.*,
        u.email as advertiser_name,
        a.name as asset_name,
        a.level as asset_level
      FROM campaigns c
      LEFT JOIN users u ON c.advertiser_id = u.id
      LEFT JOIN assets a ON c.asset_id = a.id
      WHERE c.asset_id = $1
        AND c.status IN ('approved', 'active')
        AND c.is_deleted = FALSE
        AND $2::date BETWEEN c.start_date AND c.end_date
      ORDER BY c.priority_weight DESC, c.budget DESC`,
      [asset_id, date]
    );
    return result.rows;
  }
};

module.exports = UnifiedCampaign; 