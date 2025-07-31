const express = require('express');
const router = express.Router();
const CampaignController = require('../controllers/campaignController');
const auth = require('../../shared/middleware/auth');
const authorize = require('../../shared/middleware/authorize');

router.post('/', CampaignController.create); // Temporarily remove auth for testing
router.get('/', CampaignController.getAll); // Temporarily remove auth for testing
router.get('/:id', auth, authorize(['admin', 'advertiser', 'analyst']), CampaignController.getById);
router.put('/:id', auth, authorize(['admin', 'advertiser']), CampaignController.update);
router.get('/:id/performance', auth, authorize(['admin', 'advertiser', 'analyst']), CampaignController.getPerformanceMetrics);

module.exports = router;
