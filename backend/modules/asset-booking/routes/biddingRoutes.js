// routes/biddingRoutes.js
const express = require('express');
const router = express.Router();
const BiddingController = require('../controllers/biddingController');
const authMiddleware = require('../../shared/middleware/auth');
const authorize = require('../../shared/middleware/authorize');

// All bidding routes require authentication
router.use(authMiddleware);

// Bid management routes
router.post('/bids', authorize('user', 'admin'), BiddingController.placeBid);
router.get('/bookings/:booking_id/bids', authorize('user', 'admin'), BiddingController.getBidsForBooking);
router.delete('/bids/:bid_id', authorize('user', 'admin'), BiddingController.cancelBid);
router.get('/history/:lob', authorize('user', 'admin'), BiddingController.getBiddingHistory);

// Auction management routes (admin only)
router.post('/bookings/:booking_id/auction/start', authorize('admin'), BiddingController.startAuction);
router.post('/bookings/:booking_id/auction/end', authorize('admin'), BiddingController.endAuction);

// Analysis and auto-bidding routes
router.get('/fairness', authorize('admin'), BiddingController.getFairnessAnalysis);
router.post('/auto-bid', authorize('user', 'admin'), BiddingController.autoBid);

module.exports = router; 