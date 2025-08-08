// utils/reporting.js
const db = require('../../../config/db');

const Reporting = {
  async getYieldAnalytics(timeRange = '24h') {
    // Stub: aggregate simple yield metrics
    const result = await db.query(
      `SELECT COALESCE(SUM(pm.revenue), 0) as revenue, COALESCE(SUM(pm.impressions), 0) as impressions
       FROM performance_metrics pm WHERE pm.date >= CURRENT_DATE - INTERVAL '1 day'`,
      []
    );
    const impressions = Number(result.rows[0]?.impressions || 0);
    const revenue = Number(result.rows[0]?.revenue || 0);
    return {
      time_range: timeRange,
      revenue,
      impressions,
      rpm: impressions > 0 ? Number(((revenue / impressions) * 1000).toFixed(2)) : 0
    };
  },

  async getMultiChannelPerformance(timeRange = '7d') {
    // Stub: fake breakdown by channel
    return {
      time_range: timeRange,
      channels: [
        { channel: 'web', impressions: 10000, clicks: 250, revenue: 1234.56 },
        { channel: 'social', impressions: 6000, clicks: 140, revenue: 845.12 },
        { channel: 'in_store', impressions: 4000, clicks: 60, revenue: 560.33 }
      ]
    };
  },

  async exportReport({ reportType = 'campaign', format = 'csv' }) {
    // Stub: return a signed URL or placeholder
    return {
      report_type: reportType,
      format,
      url: `https://downloads.example.com/reports/${reportType}-${Date.now()}.${format}`
    };
  }
};

module.exports = Reporting; 