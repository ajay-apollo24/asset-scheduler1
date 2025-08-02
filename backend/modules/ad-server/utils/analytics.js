// utils/analytics.js
const db = require('../../../config/db');
const logger = require('../../shared/utils/logger');

const Analytics = {
  async getRealTimeMetrics() {
    try {
      // Get metrics from last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      // Calculate impressions per minute
      const impressionsResult = await db.query(
        `SELECT COUNT(*) as count 
         FROM impressions 
         WHERE timestamp >= $1`,
        [fiveMinutesAgo]
      );
      const impressionsPerMinute = Math.round(impressionsResult.rows[0].count / 5);
      
      // Calculate revenue per hour
      const revenueResult = await db.query(
        `SELECT COALESCE(SUM(pm.revenue), 0) as total_revenue
         FROM performance_metrics pm
         WHERE pm.date = CURRENT_DATE`,
        []
      );
      const revenuePerHour = parseFloat(revenueResult.rows[0].total_revenue) / 24;
      
      // Calculate fill rate (impressions / ad requests)
      const requestsResult = await db.query(
        `SELECT COUNT(*) as count 
         FROM ad_requests 
         WHERE timestamp >= $1`,
        [fiveMinutesAgo]
      );
      const fillRate = requestsResult.rows[0].count > 0 ? 
        impressionsResult.rows[0].count / requestsResult.rows[0].count : 0;
      
      // Calculate average response time
      const responseTimeResult = await db.query(
        `SELECT AVG(EXTRACT(EPOCH FROM (timestamp - created_at))) as avg_response_time
         FROM ad_requests 
         WHERE timestamp >= $1`,
        [fiveMinutesAgo]
      );
      const avgResponseTime = responseTimeResult.rows[0].avg_response_time || 0;
      
      // Get active campaigns count
      const activeCampaignsResult = await db.query(
        'SELECT COUNT(*) as count FROM campaigns WHERE status = \'active\''
      );
      
      // Get total assets count
      const totalAssetsResult = await db.query(
        'SELECT COUNT(*) as count FROM assets WHERE is_active = true'
      );
      
      return {
        impressions_per_minute: impressionsPerMinute,
        revenue_per_hour: revenuePerHour,
        fill_rate: fillRate,
        avg_response_time: avgResponseTime,
        active_campaigns: parseInt(activeCampaignsResult.rows[0].count),
        total_assets: parseInt(totalAssetsResult.rows[0].count),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error calculating real-time metrics:', error);
      throw error;
    }
  },

  async getCampaignPerformance(campaign_id, timeRange = '24h') {
    try {
      let dateFilter = '';
      const params = [campaign_id];
      
      switch (timeRange) {
        case '1h':
          dateFilter = 'AND pm.date = CURRENT_DATE AND pm.created_at >= NOW() - INTERVAL \'1 hour\'';
          break;
        case '24h':
          dateFilter = 'AND pm.date >= CURRENT_DATE - INTERVAL \'1 day\'';
          break;
        case '7d':
          dateFilter = 'AND pm.date >= CURRENT_DATE - INTERVAL \'7 days\'';
          break;
        case '30d':
          dateFilter = 'AND pm.date >= CURRENT_DATE - INTERVAL \'30 days\'';
          break;
        default:
          dateFilter = 'AND pm.date >= CURRENT_DATE - INTERVAL \'1 day\'';
      }
      
      const result = await db.query(
        `SELECT 
          c.id as campaign_id,
          c.name as campaign_name,
          c.budget,
          SUM(pm.impressions) as total_impressions,
          SUM(pm.clicks) as total_clicks,
          SUM(pm.revenue) as total_revenue,
          CASE WHEN SUM(pm.impressions) > 0 THEN ROUND((SUM(pm.clicks)::DECIMAL / SUM(pm.impressions)) * 100, 2) ELSE 0 END as ctr,
          CASE WHEN c.budget > 0 THEN ROUND((SUM(pm.revenue)::DECIMAL / c.budget) * 100, 2) ELSE 0 END as budget_utilization,
          CASE WHEN SUM(pm.impressions) > 0 THEN ROUND((SUM(pm.revenue)::DECIMAL / SUM(pm.impressions)) * 1000, 2) ELSE 0 END as cpm,
          CASE WHEN SUM(pm.clicks) > 0 THEN ROUND(SUM(pm.revenue)::DECIMAL / SUM(pm.clicks), 2) ELSE 0 END as cpc
         FROM campaigns c
         LEFT JOIN creatives cr ON c.id = cr.campaign_id
         LEFT JOIN performance_metrics pm ON cr.id = pm.creative_id ${dateFilter}
         WHERE c.id = $1
         GROUP BY c.id, c.name, c.budget`,
        params
      );
      
      const campaign = result.rows[0] || {
        campaign_id,
        campaign_name: 'Unknown Campaign',
        budget: 0,
        total_impressions: 0,
        total_clicks: 0,
        total_revenue: 0,
        ctr: 0,
        budget_utilization: 0,
        cpm: 0,
        cpc: 0
      };
      
      return {
        ...campaign,
        time_range: timeRange,
        calculated_at: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error calculating campaign performance:', error);
      throw error;
    }
  },

  async getTopPerformingCreatives(limit = 10, timeRange = '7d') {
    try {
      let dateFilter = '';
      
      switch (timeRange) {
        case '1h':
          dateFilter = 'AND pm.date = CURRENT_DATE AND pm.created_at >= NOW() - INTERVAL \'1 hour\'';
          break;
        case '24h':
          dateFilter = 'AND pm.date >= CURRENT_DATE - INTERVAL \'1 day\'';
          break;
        case '7d':
          dateFilter = 'AND pm.date >= CURRENT_DATE - INTERVAL \'7 days\'';
          break;
        case '30d':
          dateFilter = 'AND pm.date >= CURRENT_DATE - INTERVAL \'30 days\'';
          break;
        default:
          dateFilter = 'AND pm.date >= CURRENT_DATE - INTERVAL \'7 days\'';
      }
      
      const result = await db.query(
        `SELECT 
          cr.id as creative_id,
          cr.name as creative_name,
          cr.type as creative_type,
          cr.status,
          a.name as asset_name,
          c.name as campaign_name,
          SUM(pm.impressions) as total_impressions,
          SUM(pm.clicks) as total_clicks,
          SUM(pm.revenue) as total_revenue,
          CASE WHEN SUM(pm.impressions) > 0 THEN ROUND((SUM(pm.clicks)::DECIMAL / SUM(pm.impressions)) * 100, 2) ELSE 0 END as ctr,
          CASE WHEN SUM(pm.impressions) > 0 THEN ROUND((SUM(pm.revenue)::DECIMAL / SUM(pm.impressions)) * 1000, 2) ELSE 0 END as cpm
         FROM creatives cr
         LEFT JOIN assets a ON cr.asset_id = a.id
         LEFT JOIN campaigns c ON cr.campaign_id = c.id
         LEFT JOIN performance_metrics pm ON cr.id = pm.creative_id ${dateFilter}
         WHERE cr.status = 'approved'
         GROUP BY cr.id, cr.name, cr.type, cr.status, a.name, c.name
         ORDER BY total_revenue DESC
         LIMIT $1`,
        [limit]
      );
      
      return {
        creatives: result.rows,
        time_range: timeRange,
        limit: limit,
        calculated_at: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting top performing creatives:', error);
      throw error;
    }
  },

  async getAssetPerformance(asset_id, timeRange = '30d') {
    try {
      let dateFilter = '';
      const params = [asset_id];
      
      switch (timeRange) {
        case '1h':
          dateFilter = 'AND pm.date = CURRENT_DATE AND pm.created_at >= NOW() - INTERVAL \'1 hour\'';
          break;
        case '24h':
          dateFilter = 'AND pm.date >= CURRENT_DATE - INTERVAL \'1 day\'';
          break;
        case '7d':
          dateFilter = 'AND pm.date >= CURRENT_DATE - INTERVAL \'7 days\'';
          break;
        case '30d':
          dateFilter = 'AND pm.date >= CURRENT_DATE - INTERVAL \'30 days\'';
          break;
        default:
          dateFilter = 'AND pm.date >= CURRENT_DATE - INTERVAL \'30 days\'';
      }
      
      const result = await db.query(
        `SELECT 
          a.id as asset_id,
          a.name as asset_name,
          a.location,
          a.type as asset_type,
          a.impressions_per_day,
          a.value_per_day,
          SUM(pm.impressions) as total_impressions,
          SUM(pm.clicks) as total_clicks,
          SUM(pm.revenue) as total_revenue,
          CASE WHEN SUM(pm.impressions) > 0 THEN ROUND((SUM(pm.clicks)::DECIMAL / SUM(pm.impressions)) * 100, 2) ELSE 0 END as ctr,
          CASE WHEN SUM(pm.impressions) > 0 THEN ROUND((SUM(pm.revenue)::DECIMAL / SUM(pm.impressions)) * 1000, 2) ELSE 0 END as cpm,
          COUNT(DISTINCT cr.id) as total_creatives,
          COUNT(DISTINCT cr.campaign_id) as total_campaigns
         FROM assets a
         LEFT JOIN creatives cr ON a.id = cr.asset_id
         LEFT JOIN performance_metrics pm ON cr.id = pm.creative_id ${dateFilter}
         WHERE a.id = $1
         GROUP BY a.id, a.name, a.location, a.type, a.impressions_per_day, a.value_per_day`,
        params
      );
      
      const asset = result.rows[0] || {
        asset_id,
        asset_name: 'Unknown Asset',
        location: '',
        asset_type: '',
        impressions_per_day: 0,
        value_per_day: 0,
        total_impressions: 0,
        total_clicks: 0,
        total_revenue: 0,
        ctr: 0,
        cpm: 0,
        total_creatives: 0,
        total_campaigns: 0
      };
      
      return {
        ...asset,
        time_range: timeRange,
        calculated_at: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting asset performance:', error);
      throw error;
    }
  },

  async getRevenueTrends(timeRange = '30d') {
    try {
      let dateFilter = '';
      let groupBy = '';
      
      switch (timeRange) {
        case '7d':
          dateFilter = 'WHERE pm.date >= CURRENT_DATE - INTERVAL \'7 days\'';
          groupBy = 'GROUP BY pm.date ORDER BY pm.date';
          break;
        case '30d':
          dateFilter = 'WHERE pm.date >= CURRENT_DATE - INTERVAL \'30 days\'';
          groupBy = 'GROUP BY pm.date ORDER BY pm.date';
          break;
        case '90d':
          dateFilter = 'WHERE pm.date >= CURRENT_DATE - INTERVAL \'90 days\'';
          groupBy = 'GROUP BY DATE_TRUNC(\'week\', pm.date) ORDER BY DATE_TRUNC(\'week\', pm.date)';
          break;
        default:
          dateFilter = 'WHERE pm.date >= CURRENT_DATE - INTERVAL \'30 days\'';
          groupBy = 'GROUP BY pm.date ORDER BY pm.date';
      }
      
      const result = await db.query(
        `SELECT 
          ${timeRange === '90d' ? 'DATE_TRUNC(\'week\', pm.date) as period' : 'pm.date as period'},
          SUM(pm.impressions) as impressions,
          SUM(pm.clicks) as clicks,
          SUM(pm.revenue) as revenue,
          CASE WHEN SUM(pm.impressions) > 0 THEN ROUND((SUM(pm.clicks)::DECIMAL / SUM(pm.impressions)) * 100, 2) ELSE 0 END as ctr
         FROM performance_metrics pm
         ${dateFilter}
         ${groupBy}`,
        []
      );
      
      return {
        trends: result.rows,
        time_range: timeRange,
        calculated_at: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting revenue trends:', error);
      throw error;
    }
  },

  async getGeographicPerformance(timeRange = '30d') {
    try {
      let dateFilter = '';
      
      switch (timeRange) {
        case '7d':
          dateFilter = 'AND pm.date >= CURRENT_DATE - INTERVAL \'7 days\'';
          break;
        case '30d':
          dateFilter = 'AND pm.date >= CURRENT_DATE - INTERVAL \'30 days\'';
          break;
        case '90d':
          dateFilter = 'AND pm.date >= CURRENT_DATE - INTERVAL \'90 days\'';
          break;
        default:
          dateFilter = 'AND pm.date >= CURRENT_DATE - INTERVAL \'30 days\'';
      }
      
      const result = await db.query(
        `SELECT 
          a.location,
          SUM(pm.impressions) as impressions,
          SUM(pm.clicks) as clicks,
          SUM(pm.revenue) as revenue,
          CASE WHEN SUM(pm.impressions) > 0 THEN ROUND((SUM(pm.clicks)::DECIMAL / SUM(pm.impressions)) * 100, 2) ELSE 0 END as ctr
         FROM performance_metrics pm
         JOIN creatives cr ON pm.creative_id = cr.id
         JOIN assets a ON cr.asset_id = a.id
         WHERE a.location IS NOT NULL ${dateFilter}
         GROUP BY a.location
         ORDER BY revenue DESC`,
        []
      );
      
      return {
        geographic_performance: result.rows,
        time_range: timeRange,
        calculated_at: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting geographic performance:', error);
      throw error;
    }
  }
};

module.exports = Analytics; 