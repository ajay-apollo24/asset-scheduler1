const express = require('express');
const router = express.Router();
const RTBController = require('../controllers/rtbController');

router.post('/request', RTBController.requestAuction);
router.post('/bid', RTBController.submitBid);
router.get('/auction', RTBController.getAuctionResult);

module.exports = router;
