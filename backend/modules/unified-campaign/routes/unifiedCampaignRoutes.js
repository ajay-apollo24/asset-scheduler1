// routes/unifiedCampaignRoutes.js
const express = require('express');
const router = express.Router();
const UnifiedCampaignController = require('../controllers/unifiedCampaignController');
const authenticate = require('../../shared/middleware/auth');
const authorize = require('../../shared/middleware/authorize');

// Apply authentication to all routes
router.use(authenticate);

// Campaign management routes
router.post('/', authorize('admin', 'marketing_ops'), UnifiedCampaignController.create);
router.get('/', authorize('admin', 'marketing_ops', 'analyst'), UnifiedCampaignController.getCampaigns);
router.get('/:id', authorize('admin', 'marketing_ops', 'analyst'), UnifiedCampaignController.getCampaign);
router.put('/:id', authorize('admin', 'marketing_ops'), UnifiedCampaignController.updateCampaign);
router.delete('/:id', authorize('admin'), UnifiedCampaignController.deleteCampaign);

// Asset availability routes
router.get('/availability/asset', authorize('admin', 'marketing_ops', 'analyst'), UnifiedCampaignController.getAssetAvailability);

// Bidding routes
router.post('/bid', authorize('admin', 'marketing_ops'), UnifiedCampaignController.processBid);

// Asset allocation routes
router.post('/allocate', authorize('admin', 'marketing_ops'), UnifiedCampaignController.allocateAsset);

// Analytics routes
router.get('/analytics/summary', authorize('admin', 'marketing_ops', 'analyst'), UnifiedCampaignController.getAnalytics);

module.exports = router; 