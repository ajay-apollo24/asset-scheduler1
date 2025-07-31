// models/PerformanceMetrics.js
const db = require('../../../config/db');

const PerformanceMetrics = {
  async create({ creative_id, date, impressions = 0, clicks = 0, revenue = 0 }) {
    try {
      const result = await db.query(
        `INSERT INTO performance_metrics (creative_id, date, impressions, clicks, revenue) 
         VALUES ($1, $2, $3, $4, $5) 
         ON CONFLICT (creative_id, date) 
         DO UPDATE SET 
           impressions = performance_metrics.impressions + $3,
           clicks = performance_metrics.clicks + $4,
           revenue = performance_metrics.revenue + $5,
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [creative_id, date, impressions, clicks, revenue]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error creating/updating performance metrics:', error);
      throw error;
    }
  },

  async findByCreativeId(creative_id, timeRange = '30d') {
    try {
      let timeFilter = '';
      let params = [creative_id];
      
      if (timeRange === '24h') {
        timeFilter = 'AND date >= CURRENT_DATE - INTERVAL \'1 day\'';
      } else if (timeRange === '7d') {
        timeFilter = 'AND date >= CURRENT_DATE - INTERVAL \'7 days\'';
      } else if (timeRange === '30d') {
        timeFilter = 'AND date >= CURRENT_DATE - INTERVAL \'30 days\'';
      }

      const result = await db.query(
        `SELECT * FROM performance_metrics 
         WHERE creative_id = $1 ${timeFilter}
         ORDER BY date DESC`,
        params
      );
      return result.rows;
    } catch (error) {
      console.error('Error finding performance metrics by creative ID:', error);
      throw error;
    }
  },

  async getCampaignMetrics(campaign_id, timeRange = '30d') {
    try {
      let timeFilter = '';
      let params = [campaign_id];
      
      if (timeRange === '24h') {
        timeFilter = 'AND pm.date >= CURRENT_DATE - INTERVAL \'1 day\'';
      } else if (timeRange === '7d') {
        timeFilter = 'AND pm.date >= CURRENT_DATE - INTERVAL \'7 days\'';
      } else if (timeRange === '30d') {
        timeFilter = 'AND pm.date >= CURRENT_DATE - INTERVAL \'30 days\'';
      }

      const result = await db.query(`
        SELECT 
          pm.*,
          c.name as creative_name,
          c.type as creative_type
        FROM performance_metrics pm
        JOIN creatives c ON pm.creative_id = c.id
        WHERE c.campaign_id = $1 ${timeFilter}
        ORDER BY pm.date DESC
      `, params);
      
      return result.rows;
    } catch (error) {
      console.error('Error getting campaign metrics:', error);
      throw error;
    }
  },

  async getAggregatedMetrics(timeRange = '30d') {
    try {
      let timeFilter = '';
      
      if (timeRange === '24h') {
        timeFilter = 'WHERE date >= CURRENT_DATE - INTERVAL \'1 day\'';
      } else if (timeRange === '7d') {
        timeFilter = 'WHERE date >= CURRENT_DATE - INTERVAL \'7 days\'';
      } else if (timeRange === '30d') {
        timeFilter = 'WHERE date >= CURRENT_DATE - INTERVAL \'30 days\'';
      }

      const result = await db.query(`
        SELECT 
          SUM(impressions) as total_impressions,
          SUM(clicks) as total_clicks,
          SUM(revenue) as total_revenue,
          AVG(CASE WHEN impressions > 0 THEN clicks::float / impressions ELSE 0 END) as avg_ctr
        FROM performance_metrics 
        ${timeFilter}
      `);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error getting aggregated metrics:', error);
      throw error;
    }
  },

  async updateMetrics(creative_id, event_type, count = 1) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      if (event_type === 'impression') {
        await this.create({ creative_id, date: today, impressions: count });
      } else if (event_type === 'click') {
        await this.create({ creative_id, date: today, clicks: count });
      }
      
      return true;
    } catch (error) {
      console.error('Error updating metrics:', error);
      throw error;
    }
  }
};

module.exports = PerformanceMetrics; 