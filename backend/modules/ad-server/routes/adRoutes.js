// routes/adRoutes.js
const express = require('express');
const router = express.Router();
const AdController = require('../controllers/adController');
const auth = require('../../shared/middleware/auth');
const authorize = require('../../shared/middleware/authorize');
const { adRequestLimit, impressionLimit } = require('../../shared/middleware/rateLimit');
const Analytics = require('../utils/analytics');
const db = require('../../../config/db');
const logger = require('../../shared/utils/logger');

// Ad serving routes (no auth required for performance)
router.post('/request', adRequestLimit, AdController.serveAd);
router.get('/impression', impressionLimit, AdController.trackImpression);
router.post('/impression', impressionLimit, AdController.trackImpression);
router.get('/click', AdController.trackClick);
router.post('/click', AdController.trackClick);

// Analytics routes (auth required)
router.get('/analytics/realtime', auth, authorize(['admin', 'analyst']), async (req, res) => {
  const startTime = Date.now();
  
  try {
    const metrics = await Analytics.getRealTimeMetrics();
    
    const response = {
      ...metrics,
      last_updated: new Date().toISOString()
    };
    
    const duration = Date.now() - startTime;
    logger.performance('ANALYTICS_REALTIME', duration);
    
    res.json(response);
  } catch (error) {
    logger.error('Error fetching real-time analytics:', error);
    res.status(500).json({ message: 'Failed to fetch real-time analytics' });
  }
});

router.get('/analytics/campaigns', auth, authorize(['admin', 'analyst']), async (req, res) => {
  const { timeRange = '24h', limit = 50, offset = 0 } = req.query;
  const startTime = Date.now();
  
  try {
    // Get all active campaigns
    const campaignsResult = await db.query(
      `SELECT id, name, budget, status, start_date, end_date, advertiser_id
       FROM campaigns 
       WHERE status IN ('active', 'paused')
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), parseInt(offset)]
    );
    
    // Get performance for each campaign
    const campaigns = await Promise.all(
      campaignsResult.rows.map(async (campaign) => {
        const performance = await Analytics.getCampaignPerformance(campaign.id, timeRange);
        return {
          ...campaign,
          performance
        };
      })
    );
    
    // Calculate summary metrics
    const summary = campaigns.reduce((acc, campaign) => {
      acc.total_impressions += campaign.performance.total_impressions;
      acc.total_clicks += campaign.performance.total_clicks;
      acc.total_revenue += campaign.performance.total_revenue;
      acc.total_budget += parseFloat(campaign.budget || 0);
      return acc;
    }, { total_impressions: 0, total_clicks: 0, total_revenue: 0, total_budget: 0 });
    
    summary.overall_ctr = summary.total_impressions > 0 ? 
      (summary.total_clicks / summary.total_impressions) * 100 : 0;
    summary.budget_utilization = summary.total_budget > 0 ? 
      (summary.total_revenue / summary.total_budget) * 100 : 0;
    
    const response = {
      campaigns,
      summary,
      time_range: timeRange,
      total_count: campaigns.length,
      calculated_at: new Date().toISOString()
    };
    
    const duration = Date.now() - startTime;
    logger.performance('ANALYTICS_CAMPAIGNS', duration);
    
    res.json(response);
  } catch (error) {
    logger.error('Error fetching campaign analytics:', error);
    res.status(500).json({ message: 'Failed to fetch campaign analytics' });
  }
});

router.get('/analytics/creatives', auth, authorize(['admin', 'analyst']), async (req, res) => {
  const { timeRange = '7d', limit = 10, status = 'approved' } = req.query;
  const startTime = Date.now();
  
  try {
    const topCreatives = await Analytics.getTopPerformingCreatives(parseInt(limit), timeRange);
    
    // Get additional creative statistics
    const statsResult = await db.query(
      `SELECT 
        COUNT(*) as total_creatives,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_creatives,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_creatives,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_creatives
       FROM creatives`,
      []
    );
    
    const response = {
      ...topCreatives,
      statistics: statsResult.rows[0],
      calculated_at: new Date().toISOString()
    };
    
    const duration = Date.now() - startTime;
    logger.performance('ANALYTICS_CREATIVES', duration);
    
    res.json(response);
  } catch (error) {
    logger.error('Error fetching creative analytics:', error);
    res.status(500).json({ message: 'Failed to fetch creative analytics' });
  }
});

router.get('/analytics/assets/:id', auth, authorize(['admin', 'analyst']), async (req, res) => {
  const { id } = req.params;
  const { timeRange = '30d' } = req.query;
  const startTime = Date.now();
  
  try {
    const assetPerformance = await Analytics.getAssetPerformance(id, timeRange);
    
    // Get creative breakdown for this asset
    const creativesResult = await db.query(
      `SELECT 
        cr.id,
        cr.name,
        cr.type,
        cr.status,
        c.name as campaign_name,
        SUM(pm.impressions) as impressions,
        SUM(pm.clicks) as clicks,
        SUM(pm.revenue) as revenue
       FROM creatives cr
       LEFT JOIN campaigns c ON cr.campaign_id = c.id
       LEFT JOIN performance_metrics pm ON cr.id = pm.creative_id
       WHERE cr.asset_id = $1
       GROUP BY cr.id, cr.name, cr.type, cr.status, c.name
       ORDER BY revenue DESC`,
      [id]
    );
    
    const response = {
      ...assetPerformance,
      creatives: creativesResult.rows,
      calculated_at: new Date().toISOString()
    };
    
    const duration = Date.now() - startTime;
    logger.performance('ANALYTICS_ASSET', duration);
    
    res.json(response);
  } catch (error) {
    logger.error('Error fetching asset analytics:', error);
    res.status(500).json({ message: 'Failed to fetch asset analytics' });
  }
});

router.get('/analytics/trends', auth, authorize(['admin', 'analyst']), async (req, res) => {
  const { timeRange = '30d', metric = 'revenue' } = req.query;
  const startTime = Date.now();
  
  try {
    const revenueTrends = await Analytics.getRevenueTrends(timeRange);
    
    // Get additional trend metrics
    const additionalTrends = await db.query(
      `SELECT 
        ${timeRange === '90d' ? 'DATE_TRUNC(\'week\', pm.date) as period' : 'pm.date as period'},
        COUNT(DISTINCT cr.campaign_id) as active_campaigns,
        COUNT(DISTINCT cr.asset_id) as active_assets,
        COUNT(DISTINCT cr.id) as active_creatives
       FROM performance_metrics pm
       JOIN creatives cr ON pm.creative_id = cr.id
       WHERE pm.date >= CURRENT_DATE - INTERVAL '${timeRange === '90d' ? '90 days' : timeRange === '7d' ? '7 days' : '30 days'}'
       ${timeRange === '90d' ? 'GROUP BY DATE_TRUNC(\'week\', pm.date) ORDER BY DATE_TRUNC(\'week\', pm.date)' : 'GROUP BY pm.date ORDER BY pm.date'}`,
      []
    );
    
    const response = {
      ...revenueTrends,
      additional_metrics: additionalTrends.rows,
      calculated_at: new Date().toISOString()
    };
    
    const duration = Date.now() - startTime;
    logger.performance('ANALYTICS_TRENDS', duration);
    
    res.json(response);
  } catch (error) {
    logger.error('Error fetching trend analytics:', error);
    res.status(500).json({ message: 'Failed to fetch trend analytics' });
  }
});

router.get('/analytics/geographic', auth, authorize(['admin', 'analyst']), async (req, res) => {
  const { timeRange = '30d' } = req.query;
  const startTime = Date.now();
  
  try {
    const geographicPerformance = await Analytics.getGeographicPerformance(timeRange);
    
    const response = {
      ...geographicPerformance,
      calculated_at: new Date().toISOString()
    };
    
    const duration = Date.now() - startTime;
    logger.performance('ANALYTICS_GEOGRAPHIC', duration);
    
    res.json(response);
  } catch (error) {
    logger.error('Error fetching geographic analytics:', error);
    res.status(500).json({ message: 'Failed to fetch geographic analytics' });
  }
});

router.get('/analytics/summary', auth, authorize(['admin', 'analyst']), async (req, res) => {
  const { timeRange = '24h' } = req.query;
  const startTime = Date.now();
  
  try {
    // Get real-time metrics
    const realTimeMetrics = await Analytics.getRealTimeMetrics();
    
    // Get top performing campaigns
    const topCampaignsResult = await db.query(
      `SELECT 
        c.id,
        c.name,
        c.budget,
        SUM(pm.impressions) as impressions,
        SUM(pm.clicks) as clicks,
        SUM(pm.revenue) as revenue
       FROM campaigns c
       LEFT JOIN creatives cr ON c.id = cr.campaign_id
       LEFT JOIN performance_metrics pm ON cr.id = pm.creative_id
       WHERE c.status = 'active' AND pm.date >= CURRENT_DATE - INTERVAL '1 day'
       GROUP BY c.id, c.name, c.budget
       ORDER BY revenue DESC
       LIMIT 5`,
      []
    );
    
    // Get top performing assets
    const topAssetsResult = await db.query(
      `SELECT 
        a.id,
        a.name,
        a.location,
        SUM(pm.impressions) as impressions,
        SUM(pm.clicks) as clicks,
        SUM(pm.revenue) as revenue
       FROM assets a
       LEFT JOIN creatives cr ON a.id = cr.asset_id
       LEFT JOIN performance_metrics pm ON cr.id = pm.creative_id
       WHERE a.is_active = true AND pm.date >= CURRENT_DATE - INTERVAL '1 day'
       GROUP BY a.id, a.name, a.location
       ORDER BY revenue DESC
       LIMIT 5`,
      []
    );
    
    const response = {
      real_time: realTimeMetrics,
      top_campaigns: topCampaignsResult.rows,
      top_assets: topAssetsResult.rows,
      time_range: timeRange,
      calculated_at: new Date().toISOString()
    };
    
    const duration = Date.now() - startTime;
    logger.performance('ANALYTICS_SUMMARY', duration);
    
    res.json(response);
  } catch (error) {
    logger.error('Error fetching analytics summary:', error);
    res.status(500).json({ message: 'Failed to fetch analytics summary' });
  }
});

module.exports = router; 