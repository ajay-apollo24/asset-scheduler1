// routes/biddingRoutes.js
const express = require('express');
const router = express.Router();
const BiddingController = require('../controllers/biddingController');
const authMiddleware = require('../../shared/middleware/auth');
const authorize = require('../../shared/middleware/authorize');

// All bidding routes require authentication (except bid fetching for testing)
// router.use(authMiddleware);

// Bid management routes
router.post('/bids', authMiddleware, authorize('admin', 'marketing_ops'), BiddingController.placeBid);
router.get('/bookings/:booking_id/bids', BiddingController.getBidsForBooking); // Temporarily no auth for testing
router.delete('/bids/:bid_id', authMiddleware, authorize('admin', 'marketing_ops'), BiddingController.cancelBid);
router.get('/history/:lob', authMiddleware, authorize('admin', 'marketing_ops'), BiddingController.getBiddingHistory);

// Auction management routes (admin only)
router.post('/bookings/:booking_id/auction/start', authMiddleware, authorize('admin'), BiddingController.startAuction);
router.post('/bookings/:booking_id/auction/end', authMiddleware, authorize('admin'), BiddingController.endAuction);

// Analysis and auto-bidding routes
router.get('/fairness', authMiddleware, authorize('admin'), BiddingController.getFairnessAnalysis);
router.post('/auto-bid', authMiddleware, authorize('admin', 'marketing_ops'), BiddingController.autoBid);
router.get('/budget-info', BiddingController.getBudgetInfo); // Budget info (no auth for now)

module.exports = router; 