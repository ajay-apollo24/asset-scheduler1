const express = require('express');
const router = express.Router();
const CampaignController = require('../controllers/campaignController');
const auth = require('../../shared/middleware/auth');
const authorize = require('../../shared/middleware/authorize');

router.post('/', auth, authorize(['admin', 'advertiser']), CampaignController.create);
router.get('/', auth, authorize(['admin', 'advertiser', 'analyst']), CampaignController.getAll);
router.get('/:id', auth, authorize(['admin', 'advertiser', 'analyst']), CampaignController.getById);
router.put('/:id', auth, authorize(['admin', 'advertiser']), CampaignController.update);
router.get('/:id/performance', auth, authorize(['admin', 'advertiser', 'analyst']), CampaignController.getPerformanceMetrics);

module.exports = router;
