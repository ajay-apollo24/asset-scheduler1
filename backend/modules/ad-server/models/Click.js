// models/Click.js
const db = require('../../../config/db');

const Click = {
  async create({ impression_id, user_id, destination_url, metadata = {} }) {
    try {
      const result = await db.query(
        'INSERT INTO clicks (impression_id, user_id, destination_url, metadata) VALUES ($1, $2, $3, $4) RETURNING *',
        [impression_id, user_id, destination_url, JSON.stringify(metadata)]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error creating click:', error);
      throw error;
    }
  },

  async findById(id) {
    try {
      const result = await db.query(
        'SELECT * FROM clicks WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding click by ID:', error);
      throw error;
    }
  },

  async getClicksByCreativeId(creative_id, timeRange = '24h') {
    try {
      let timeFilter = '';
      let params = [creative_id];
      
      if (timeRange === '24h') {
        timeFilter = 'AND c.timestamp >= NOW() - INTERVAL \'24 hours\'';
      } else if (timeRange === '7d') {
        timeFilter = 'AND c.timestamp >= NOW() - INTERVAL \'7 days\'';
      } else if (timeRange === '30d') {
        timeFilter = 'AND c.timestamp >= NOW() - INTERVAL \'30 days\'';
      }

      const result = await db.query(`
        SELECT c.*, i.creative_id
        FROM clicks c
        JOIN impressions i ON c.impression_id = i.id
        WHERE i.creative_id = $1 ${timeFilter}
        ORDER BY c.timestamp DESC
      `, params);
      
      return result.rows;
    } catch (error) {
      console.error('Error getting clicks by creative ID:', error);
      throw error;
    }
  },

  async getClickStats(creative_id, timeRange = '24h') {
    try {
      let timeFilter = '';
      let params = [creative_id];
      
      if (timeRange === '24h') {
        timeFilter = 'AND c.timestamp >= NOW() - INTERVAL \'24 hours\'';
      } else if (timeRange === '7d') {
        timeFilter = 'AND c.timestamp >= NOW() - INTERVAL \'7 days\'';
      } else if (timeRange === '30d') {
        timeFilter = 'AND c.timestamp >= NOW() - INTERVAL \'30 days\'';
      }

      const result = await db.query(`
        SELECT 
          COUNT(*) as total_clicks,
          COUNT(DISTINCT c.user_id) as unique_clicks,
          COUNT(DISTINCT c.destination_url) as unique_destinations
        FROM clicks c
        JOIN impressions i ON c.impression_id = i.id
        WHERE i.creative_id = $1 ${timeFilter}
      `, params);

      const stats = result.rows[0];
      
      // Calculate CTR (Click Through Rate)
      const impressionResult = await db.query(`
        SELECT COUNT(*) as total_impressions
        FROM impressions 
        WHERE creative_id = $1 ${timeFilter.replace('c.timestamp', 'timestamp')}
      `, params);

      const ctr = impressionResult.rows[0].total_impressions > 0 ? 
        (stats.total_clicks / impressionResult.rows[0].total_impressions) : 0;

      return {
        total_clicks: parseInt(stats.total_clicks) || 0,
        unique_clicks: parseInt(stats.unique_clicks) || 0,
        unique_destinations: parseInt(stats.unique_destinations) || 0,
        ctr: ctr
      };
    } catch (error) {
      console.error('Error getting click stats:', error);
      throw error;
    }
  },

  async getClicksByCampaignId(campaign_id, timeRange = '24h') {
    try {
      let timeFilter = '';
      let params = [campaign_id];
      
      if (timeRange === '24h') {
        timeFilter = 'AND c.timestamp >= NOW() - INTERVAL \'24 hours\'';
      } else if (timeRange === '7d') {
        timeFilter = 'AND c.timestamp >= NOW() - INTERVAL \'7 days\'';
      } else if (timeRange === '30d') {
        timeFilter = 'AND c.timestamp >= NOW() - INTERVAL \'30 days\'';
      }

      const result = await db.query(`
        SELECT c.*, i.creative_id, cr.name as creative_name
        FROM clicks c
        JOIN impressions i ON c.impression_id = i.id
        JOIN creatives cr ON i.creative_id = cr.id
        WHERE cr.campaign_id = $1 ${timeFilter}
        ORDER BY c.timestamp DESC
      `, params);
      
      return result.rows;
    } catch (error) {
      console.error('Error getting clicks by campaign ID:', error);
      throw error;
    }
  }
};

module.exports = Click; 