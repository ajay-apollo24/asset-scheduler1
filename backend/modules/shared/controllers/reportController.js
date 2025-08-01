// controllers/reportController.js
const db = require('../../../config/db');
const logger = require('../../shared/utils/logger');

const ReportController = {
  async performance(req, res) {
    const { from, to } = req.query; // expect YYYY-MM-DD
    try {
      const result = await db.query(
        `SELECT lob,
                SUM(impressions) AS impressions,
                SUM(clicks) AS clicks
         FROM asset_metrics
         WHERE date BETWEEN $1 AND $2
         GROUP BY lob
         ORDER BY impressions DESC`,
        [from, to]
      );
      res.json(result.rows);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Failed to generate report' });
    }
  },

  async adServerPerformance(req, res) {
    const { from, to, campaign_id } = req.query;
    try {
      let query = `
        SELECT 
          c.id as campaign_id,
          c.name as campaign_name,
          cr.id as creative_id,
          cr.name as creative_name,
          cr.type as creative_type,
          COALESCE(SUM(pm.impressions), 0) as impressions,
          COALESCE(SUM(pm.clicks), 0) as clicks,
          COALESCE(SUM(pm.revenue), 0) as revenue,
          CASE WHEN SUM(pm.impressions) > 0 THEN ROUND((SUM(pm.clicks)::DECIMAL / SUM(pm.impressions)) * 100, 2) ELSE 0 END as ctr,
          c.status as campaign_status,
          c.start_date,
          c.end_date
        FROM campaigns c
        LEFT JOIN creatives cr ON c.id = cr.campaign_id
        LEFT JOIN performance_metrics pm ON cr.id = pm.creative_id
      `;

      const params = [];
      const conditions = [];

      if (from && to) {
        conditions.push(`pm.date BETWEEN $${params.length + 1} AND $${params.length + 2}`);
        params.push(from, to);
      }

      if (campaign_id) {
        conditions.push(`c.id = $${params.length + 1}`);
        params.push(campaign_id);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += `
        GROUP BY c.id, c.name, cr.id, cr.name, cr.type, c.status, c.start_date, c.end_date
        ORDER BY impressions DESC, clicks DESC
      `;

      const result = await db.query(query, params);
      res.json(result.rows);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Failed to generate ad server report' });
    }
  },

  async adServerSummary(req, res) {
    const { from, to } = req.query;
    try {
      const result = await db.query(`
        SELECT 
          COUNT(DISTINCT c.id) as total_campaigns,
          COUNT(DISTINCT cr.id) as total_creatives,
          COALESCE(SUM(pm.impressions), 0) as total_impressions,
          COALESCE(SUM(pm.clicks), 0) as total_clicks,
          COALESCE(SUM(pm.revenue), 0) as total_revenue,
          CASE WHEN SUM(pm.impressions) > 0 THEN ROUND((SUM(pm.clicks)::DECIMAL / SUM(pm.impressions)) * 100, 2) ELSE 0 END as overall_ctr,
          COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as active_campaigns,
          COUNT(DISTINCT CASE WHEN c.status = 'paused' THEN c.id END) as paused_campaigns
        FROM campaigns c
        LEFT JOIN creatives cr ON c.id = cr.campaign_id
        LEFT JOIN performance_metrics pm ON cr.id = pm.creative_id
        ${from && to ? 'WHERE pm.date BETWEEN $1 AND $2' : ''}
      `, from && to ? [from, to] : []);

      res.json(result.rows[0]);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Failed to generate ad server summary' });
    }
  },

  async assetPerformance(req, res) {
    const { from, to, asset_id } = req.query;
    try {
      let query = `
        SELECT 
          a.id as asset_id,
          a.name as asset_name,
          a.type as asset_type,
          CASE WHEN a.is_active THEN 'active' ELSE 'inactive' END as asset_status,
          COALESCE(COUNT(DISTINCT b.id), 0) as total_bookings,
          COALESCE(COUNT(DISTINCT ar.id), 0) as total_ad_requests,
          COALESCE(COUNT(DISTINCT i.id), 0) as total_impressions,
          COALESCE(COUNT(DISTINCT c.id), 0) as total_clicks,
          0 as total_revenue,
          CASE WHEN COUNT(DISTINCT i.id) > 0 THEN ROUND((COUNT(DISTINCT c.id)::DECIMAL / COUNT(DISTINCT i.id)) * 100, 2) ELSE 0 END as ctr,
          a.created_at,
          a.created_at as updated_at
        FROM assets a
        LEFT JOIN bookings b ON a.id = b.asset_id
        LEFT JOIN ad_requests ar ON a.id = ar.asset_id
        LEFT JOIN impressions i ON ar.id = i.ad_request_id
        LEFT JOIN clicks c ON i.id = c.impression_id
      `;

      const params = [];
      const conditions = [];

      if (from && to) {
        conditions.push(`(b.start_date BETWEEN $${params.length + 1} AND $${params.length + 2} OR ar.timestamp BETWEEN $${params.length + 1} AND $${params.length + 2})`);
        params.push(from, to);
      }

      if (asset_id) {
        conditions.push(`a.id = $${params.length + 1}`);
        params.push(asset_id);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += `
        GROUP BY a.id, a.name, a.type, a.is_active, a.created_at
        ORDER BY total_impressions DESC, total_bookings DESC
      `;

      const result = await db.query(query, params);
      res.json(result.rows);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Failed to generate asset report' });
    }
  },

  async assetSummary(req, res) {
    const { from, to } = req.query;
    try {
      const result = await db.query(`
        SELECT 
          COUNT(DISTINCT a.id) as total_assets,
          COUNT(DISTINCT b.id) as total_bookings,
          COUNT(DISTINCT ar.id) as total_ad_requests,
          COALESCE(COUNT(DISTINCT i.id), 0) as total_impressions,
          COALESCE(COUNT(DISTINCT c.id), 0) as total_clicks,
          0 as total_revenue,
          CASE WHEN COUNT(DISTINCT i.id) > 0 THEN ROUND((COUNT(DISTINCT c.id)::DECIMAL / COUNT(DISTINCT i.id)) * 100, 2) ELSE 0 END as overall_ctr,
          COUNT(DISTINCT CASE WHEN a.is_active THEN a.id END) as active_assets,
          COUNT(DISTINCT CASE WHEN NOT a.is_active THEN a.id END) as inactive_assets
        FROM assets a
        LEFT JOIN bookings b ON a.id = b.asset_id
        LEFT JOIN ad_requests ar ON a.id = ar.asset_id
        LEFT JOIN impressions i ON ar.id = i.ad_request_id
        LEFT JOIN clicks c ON i.id = c.impression_id
        ${from && to ? 'WHERE (b.start_date BETWEEN $1 AND $2 OR ar.timestamp BETWEEN $1 AND $2)' : ''}
      `, from && to ? [from, to] : []);

      res.json(result.rows[0]);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Failed to generate asset summary' });
    }
  },

  async dailyMetrics(req, res) {
    const { from, to, type } = req.query; // type: 'ad_server' or 'assets'
    try {
      let query = '';
      let params = [];

      if (type === 'ad_server') {
        query = `
          SELECT 
            pm.date,
            COALESCE(SUM(pm.impressions), 0) as impressions,
            COALESCE(SUM(pm.clicks), 0) as clicks,
            COALESCE(SUM(pm.revenue), 0) as revenue,
            CASE WHEN SUM(pm.impressions) > 0 THEN ROUND((SUM(pm.clicks)::DECIMAL / SUM(pm.impressions)) * 100, 2) ELSE 0 END as ctr
          FROM performance_metrics pm
          WHERE pm.date BETWEEN $1 AND $2
          GROUP BY pm.date
          ORDER BY pm.date DESC
        `;
        params = [from, to];
      } else {
        query = `
          SELECT 
            DATE(ar.timestamp) as date,
            COALESCE(COUNT(ar.id), 0) as ad_requests,
            COALESCE(COUNT(i.id), 0) as impressions,
            COALESCE(COUNT(c.id), 0) as clicks,
            0 as revenue
          FROM ad_requests ar
          LEFT JOIN impressions i ON ar.id = i.ad_request_id
          LEFT JOIN clicks c ON i.id = c.impression_id
          WHERE ar.timestamp BETWEEN $1 AND $2
          GROUP BY DATE(ar.timestamp)
          ORDER BY date DESC
        `;
        params = [from, to];
      }

      const result = await db.query(query, params);
      res.json(result.rows);
    } catch (err) {
      logger.error(err);
      res.status(500).json({ message: 'Failed to generate daily metrics' });
    }
  }
};

module.exports = ReportController; 