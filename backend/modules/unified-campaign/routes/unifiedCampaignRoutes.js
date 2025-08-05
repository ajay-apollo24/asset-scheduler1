// routes/unifiedCampaignRoutes.js
const express = require('express');
const router = express.Router();
const UnifiedCampaignController = require('../controllers/unifiedCampaignController');
const { authenticate } = require('../../shared/middleware/auth');
const { authorize } = require('../../shared/middleware/authorize');

// Apply authentication to all routes
router.use(authenticate);

// Campaign management routes
router.post('/', authorize(['campaign', 'create']), UnifiedCampaignController.create);
router.get('/', authorize(['campaign', 'read']), UnifiedCampaignController.getCampaigns);
router.get('/:id', authorize(['campaign', 'read']), UnifiedCampaignController.getCampaign);
router.put('/:id', authorize(['campaign', 'update']), UnifiedCampaignController.updateCampaign);
router.delete('/:id', authorize(['campaign', 'delete']), UnifiedCampaignController.deleteCampaign);

// Asset availability routes
router.get('/availability/asset', authorize(['campaign', 'read']), UnifiedCampaignController.getAssetAvailability);

// Bidding routes
router.post('/bid', authorize(['campaign', 'update']), UnifiedCampaignController.processBid);

// Asset allocation routes
router.post('/allocate', authorize(['campaign', 'update']), UnifiedCampaignController.allocateAsset);

// Analytics routes
router.get('/analytics/summary', authorize(['campaign', 'read']), UnifiedCampaignController.getAnalytics);

module.exports = router; 