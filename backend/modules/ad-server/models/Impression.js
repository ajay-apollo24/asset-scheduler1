// models/Impression.js
const db = require('../../../config/db');

const Impression = {
  async create({ ad_request_id, creative_id, user_id, metadata = {} }) {
    try {
      const result = await db.query(
        'INSERT INTO impressions (ad_request_id, creative_id, user_id, metadata) VALUES ($1, $2, $3, $4) RETURNING *',
        [ad_request_id, creative_id, user_id, JSON.stringify(metadata)]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error creating impression:', error);
      throw error;
    }
  },

  async findById(id) {
    try {
      const result = await db.query(
        'SELECT * FROM impressions WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding impression by ID:', error);
      throw error;
    }
  },

  async getImpressionsByCreativeId(creative_id, timeRange = '24h') {
    try {
      let timeFilter = '';
      let params = [creative_id];
      
      if (timeRange === '24h') {
        timeFilter = 'AND timestamp >= NOW() - INTERVAL \'24 hours\'';
      } else if (timeRange === '7d') {
        timeFilter = 'AND timestamp >= NOW() - INTERVAL \'7 days\'';
      } else if (timeRange === '30d') {
        timeFilter = 'AND timestamp >= NOW() - INTERVAL \'30 days\'';
      }

      const result = await db.query(
        `SELECT * FROM impressions WHERE creative_id = $1 ${timeFilter} ORDER BY timestamp DESC`,
        params
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting impressions by creative ID:', error);
      throw error;
    }
  },

  async getImpressionStats(creative_id, timeRange = '24h') {
    try {
      let timeFilter = '';
      let params = [creative_id];
      
      if (timeRange === '24h') {
        timeFilter = 'AND timestamp >= NOW() - INTERVAL \'24 hours\'';
      } else if (timeRange === '7d') {
        timeFilter = 'AND timestamp >= NOW() - INTERVAL \'7 days\'';
      } else if (timeRange === '30d') {
        timeFilter = 'AND timestamp >= NOW() - INTERVAL \'30 days\'';
      }

      const result = await db.query(`
        SELECT 
          COUNT(*) as total_impressions,
          COUNT(DISTINCT user_id) as unique_impressions,
          AVG(EXTRACT(EPOCH FROM (timestamp - LAG(timestamp) OVER (ORDER BY timestamp)))) as avg_view_time
        FROM impressions 
        WHERE creative_id = $1 ${timeFilter}
      `, params);

      const stats = result.rows[0];
      
      // Calculate viewability rate (impressions that were viewable)
      const viewableResult = await db.query(`
        SELECT COUNT(*) as viewable_impressions
        FROM impressions 
        WHERE creative_id = $1 ${timeFilter} 
        AND metadata->>'viewable' = 'true'
      `, params);

      const viewabilityRate = stats.total_impressions > 0 ? 
        (viewableResult.rows[0].viewable_impressions / stats.total_impressions) : 0;

      return {
        total_impressions: parseInt(stats.total_impressions) || 0,
        unique_impressions: parseInt(stats.unique_impressions) || 0,
        avg_view_time: parseFloat(stats.avg_view_time) || 0,
        viewability_rate: viewabilityRate
      };
    } catch (error) {
      console.error('Error getting impression stats:', error);
      throw error;
    }
  },

  async trackViewability(impression_id, viewability_data) {
    try {
      const result = await db.query(
        'UPDATE impressions SET metadata = metadata || $2 WHERE id = $1 RETURNING *',
        [impression_id, JSON.stringify({ viewable: viewability_data.viewable, view_time: viewability_data.view_time })]
      );
      return { success: true, impression: result.rows[0] };
    } catch (error) {
      console.error('Error tracking viewability:', error);
      throw error;
    }
  },

  async getImpressionsByCampaignId(campaign_id, timeRange = '24h') {
    try {
      let timeFilter = '';
      let params = [campaign_id];
      
      if (timeRange === '24h') {
        timeFilter = 'AND i.timestamp >= NOW() - INTERVAL \'24 hours\'';
      } else if (timeRange === '7d') {
        timeFilter = 'AND i.timestamp >= NOW() - INTERVAL \'7 days\'';
      } else if (timeRange === '30d') {
        timeFilter = 'AND i.timestamp >= NOW() - INTERVAL \'30 days\'';
      }

      const result = await db.query(`
        SELECT i.*, c.name as creative_name
        FROM impressions i
        JOIN creatives c ON i.creative_id = c.id
        WHERE c.campaign_id = $1 ${timeFilter}
        ORDER BY i.timestamp DESC
      `, params);
      
      return result.rows;
    } catch (error) {
      console.error('Error getting impressions by campaign ID:', error);
      throw error;
    }
  }
};

module.exports = Impression; 