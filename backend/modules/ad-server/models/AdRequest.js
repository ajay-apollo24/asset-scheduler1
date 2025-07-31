// models/AdRequest.js
const db = require('../../../config/db');

const AdRequest = {
  async create({ asset_id, user_context, page_context }) {
    try {
      const result = await db.query(
        'INSERT INTO ad_requests (asset_id, user_context, page_context) VALUES ($1, $2, $3) RETURNING *',
        [asset_id, JSON.stringify(user_context), JSON.stringify(page_context)]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error creating ad request:', error);
      throw error;
    }
  },

  async findById(id) {
    try {
      const result = await db.query(
        'SELECT * FROM ad_requests WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding ad request by ID:', error);
      throw error;
    }
  },

  async getRequestsByAssetId(asset_id, limit = 100) {
    try {
      const result = await db.query(
        'SELECT * FROM ad_requests WHERE asset_id = $1 ORDER BY timestamp DESC LIMIT $2',
        [asset_id, limit]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting ad requests by asset ID:', error);
      throw error;
    }
  },

  async getRequestStats(asset_id, timeRange = '24h') {
    try {
      let timeFilter = '';
      let params = [asset_id];
      
      if (timeRange === '24h') {
        timeFilter = 'AND timestamp >= NOW() - INTERVAL \'24 hours\'';
      } else if (timeRange === '7d') {
        timeFilter = 'AND timestamp >= NOW() - INTERVAL \'7 days\'';
      } else if (timeRange === '30d') {
        timeFilter = 'AND timestamp >= NOW() - INTERVAL \'30 days\'';
      }

      const result = await db.query(`
        SELECT 
          COUNT(*) as total_requests,
          COUNT(DISTINCT user_context->>'ip') as unique_users,
          AVG(EXTRACT(EPOCH FROM (timestamp - LAG(timestamp) OVER (ORDER BY timestamp)))) as avg_response_time
        FROM ad_requests 
        WHERE asset_id = $1 ${timeFilter}
      `, params);

      const stats = result.rows[0];
      
      // Calculate fill rate (requests that resulted in impressions)
      const impressionResult = await db.query(`
        SELECT COUNT(DISTINCT ar.id) as impressions
        FROM ad_requests ar
        JOIN impressions i ON ar.id = i.ad_request_id
        WHERE ar.asset_id = $1 ${timeFilter}
      `, params);

      const fillRate = stats.total_requests > 0 ? 
        (impressionResult.rows[0].impressions / stats.total_requests) : 0;

      return {
        total_requests: parseInt(stats.total_requests) || 0,
        unique_users: parseInt(stats.unique_users) || 0,
        fill_rate: fillRate,
        avg_response_time: parseFloat(stats.avg_response_time) || 0
      };
    } catch (error) {
      console.error('Error getting ad request stats:', error);
      throw error;
    }
  },

  async getRecentRequests(limit = 50) {
    try {
      const result = await db.query(
        'SELECT * FROM ad_requests ORDER BY timestamp DESC LIMIT $1',
        [limit]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting recent ad requests:', error);
      throw error;
    }
  }
};

module.exports = AdRequest; 