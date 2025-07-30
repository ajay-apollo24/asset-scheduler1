// routes/adRoutes.js
const express = require('express');
const router = express.Router();
const AdController = require('../controllers/adController');
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { adRequestLimit, impressionLimit } = require('../middleware/rateLimit');

// Ad serving routes (no auth required for performance)
router.post('/request', adRequestLimit, AdController.serveAd);
router.post('/impression', impressionLimit, AdController.trackImpression);
router.post('/click', AdController.trackClick);

// Analytics routes (auth required)
router.get('/analytics/realtime', auth, authorize(['admin', 'analyst']), (req, res) => {
  // TODO: Implement real-time analytics
  res.json({
    impressions_per_minute: 1250,
    revenue_per_hour: 45.50,
    fill_rate: 0.92
  });
});

router.get('/analytics/campaigns', auth, authorize(['admin', 'analyst']), (req, res) => {
  // TODO: Implement campaign analytics
  res.json({
    campaigns: [
      {
        id: 'camp_001',
        name: 'Summer Sale 2024',
        impressions: 100000,
        clicks: 1500,
        ctr: 0.015,
        revenue: 250.00
      }
    ]
  });
});

module.exports = router; 