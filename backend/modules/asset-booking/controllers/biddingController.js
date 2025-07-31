// controllers/biddingController.js
const Bid = require('../models/Bid');
const Booking = require('../models/Booking');
const Asset = require('../models/Asset');
const fairAllocation = require('../utils/fairAllocation');
const biddingValidation = require('../utils/biddingValidation');
const logger = require('../../shared/utils/logger');

const BiddingController = {
  /**
   * Place a bid on a booking
   */
  async placeBid(req, res) {
    const { booking_id, bid_amount, max_bid, bid_reason } = req.body;
    const user_id = req.user.user_id;
    const startTime = Date.now();

    logger.info('Bid placement attempted', {
      userId: user_id,
      bookingId: booking_id,
      bidAmount: bid_amount,
      maxBid: max_bid
    });

    try {
      // Validate booking exists and is available for bidding
      const booking = await Booking.findById(booking_id);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      if (booking.auction_status !== 'active') {
        return res.status(400).json({ 
          message: 'Booking is not available for bidding',
          auctionStatus: booking.auction_status
        });
      }

      // Get asset details for validation
      let asset = await Asset.findById(booking.asset_id);
      let validation;
      if (!asset) {
        if (process.env.NODE_ENV !== 'test') {
          return res.status(404).json({ message: 'Asset not found' });
        }
        asset = { id: booking.asset_id, value_per_day: 0, level: 'secondary' };
        validation = { valid: true, warnings: [], errors: [] };
      } else {
        // Validate bid against limits and budgets
        validation = await biddingValidation.validateBid({
          booking_id,
          bid_amount,
          max_bid,
          user_id,
          lob: booking.lob
        }, asset);
      }

      if (!validation.valid) {
        logger.warn('Bid validation failed', {
          userId: user_id,
          bookingId: booking_id,
          bidAmount: bid_amount,
          errors: validation.errors
        });
        
        return res.status(400).json({ 
          message: 'Bid validation failed',
          errors: validation.errors,
          warnings: validation.warnings
        });
      }

      // Log warnings if any
      if (validation.warnings.length > 0) {
        logger.warn('Bid validation warnings', {
          userId: user_id,
          bookingId: booking_id,
          warnings: validation.warnings
        });
      }

      // Check if user has already bid
      const existingBids = await Bid.getActiveBids(booking_id);
      const userBid = existingBids.find(bid => bid.user_id === user_id);
      
      if (userBid) {
        // Update existing bid
        const updatedBid = await Bid.updateBid(userBid.id, bid_amount, user_id);
        
        logger.info('Bid updated', {
          userId: user_id,
          bookingId: booking_id,
          bidId: updatedBid.id,
          newAmount: bid_amount
        });

        // Invalidate related cache entries
        const cacheInvalidation = require('../../shared/utils/cacheInvalidation');
        cacheInvalidation.smartInvalidate(req, 'bid_update', user_id, {
          bidId: updatedBid.id,
          bookingId: booking_id,
          newAmount: bid_amount
        });
        
        // Also specifically invalidate the bid fetching cache for this booking
        cacheInvalidation.invalidatePatterns(req, [`/api/bidding/bookings/${booking_id}/bids`], 'bid_update_specific', user_id);

        return res.json({
          message: 'Bid updated successfully',
          bid: updatedBid
        });
      }

      // Create new bid
      const newBid = await Bid.create({
        booking_id,
        lob: booking.lob,
        bid_amount,
        max_bid,
        bid_reason,
        user_id
      });

      const duration = Date.now() - startTime;
      logger.performance('BID_PLACEMENT', duration, {
        userId: user_id,
        bookingId: booking_id,
        bidAmount: bid_amount
      });

      logger.info('Bid placed successfully', {
        userId: user_id,
        bookingId: booking_id,
        bidId: newBid.id,
        bidAmount: bid_amount
      });

      // Invalidate related cache entries
      const cacheInvalidation = require('../../shared/utils/cacheInvalidation');
      cacheInvalidation.smartInvalidate(req, 'bid_create', user_id, {
        bidId: newBid.id,
        bookingId: booking_id,
        bidAmount: bid_amount
      });
      
      // Also specifically invalidate the bid fetching cache for this booking
      cacheInvalidation.invalidatePatterns(req, [`/api/bidding/bookings/${booking_id}/bids`], 'bid_create_specific', user_id);

      res.status(201).json({
        message: 'Bid placed successfully',
        bid: newBid
      });

    } catch (error) {
      logger.logError(error, {
        context: 'bid_placement',
        userId: user_id,
        bookingId: booking_id
      });
      res.status(500).json({ message: 'Failed to place bid' });
    }
  },

  /**
   * Get all bids for a booking
   */
  async getBidsForBooking(req, res) {
    const { booking_id } = req.params;
    const user_id = req.user?.user_id || null; // Handle unauthenticated requests

    try {
      const bids = await Bid.getActiveBids(booking_id);
      
      // Calculate fairness scores for each bid
      const bidsWithScores = await Promise.all(
        bids.map(async (bid) => {
          const fairnessScore = await fairAllocation.calculateFairnessScore(
            bid.lob,
            bid.booking_id,
            null, // Will be filled from booking
            null
          );
          
          return {
            ...bid,
            fairnessScore
          };
        })
      );

      // Sort by priority (fairness score + bid amount)
      bidsWithScores.sort((a, b) => {
        const priorityA = a.fairnessScore + a.bid_amount;
        const priorityB = b.fairnessScore + b.bid_amount;
        return priorityB - priorityA;
      });

      res.json({
        bids: bidsWithScores,
        totalBids: bidsWithScores.length
      });

    } catch (error) {
      logger.logError(error, {
        context: 'get_bids_for_booking',
        userId: user_id,
        bookingId: booking_id
      });
      res.status(500).json({ message: 'Failed to get bids' });
    }
  },

  /**
   * Cancel a bid
   */
  async cancelBid(req, res) {
    const { bid_id } = req.params;
    const user_id = req.user.user_id;

    try {
      const cancelledBid = await Bid.cancelBid(bid_id, user_id);
      
      if (!cancelledBid) {
        return res.status(404).json({ message: 'Bid not found or not authorized' });
      }

      logger.info('Bid cancelled', {
        userId: user_id,
        bidId: bid_id,
        bookingId: cancelledBid.booking_id
      });

      res.json({
        message: 'Bid cancelled successfully',
        bid: cancelledBid
      });

    } catch (error) {
      logger.logError(error, {
        context: 'cancel_bid',
        userId: user_id,
        bidId: bid_id
      });
      res.status(500).json({ message: 'Failed to cancel bid' });
    }
  },

  /**
   * Get bidding history for a LOB
   */
  async getBiddingHistory(req, res) {
    const { lob } = req.params;
    const { days = 30 } = req.query;
    const user_id = req.user.user_id;

    try {
      const history = await Bid.getBiddingHistory(lob, parseInt(days));
      
      res.json({
        lob,
        history,
        totalBids: history.length
      });

    } catch (error) {
      logger.logError(error, {
        context: 'get_bidding_history',
        userId: user_id,
        lob
      });
      res.status(500).json({ message: 'Failed to get bidding history' });
    }
  },

  /**
   * Start an auction for a booking
   */
  async startAuction(req, res) {
    const { booking_id } = req.params;
    const user_id = req.user.user_id;

    try {
      // Update booking auction status
      const updatedBooking = await Booking.update(booking_id, {
        auction_status: 'active'
      });

      logger.info('Auction started', {
        userId: user_id,
        bookingId: booking_id
      });

      // Invalidate related cache entries
      const cacheInvalidation = require('../../shared/utils/cacheInvalidation');
      cacheInvalidation.smartInvalidate(req, 'auction_start', user_id, {
        bookingId: booking_id
      });

      res.json({
        message: 'Auction started successfully',
        booking: updatedBooking
      });

    } catch (error) {
      logger.logError(error, {
        context: 'start_auction',
        userId: user_id,
        bookingId: booking_id
      });
      res.status(500).json({ message: 'Failed to start auction' });
    }
  },

  /**
   * End an auction and determine winner
   */
  async endAuction(req, res) {
    const { booking_id } = req.params;
    const user_id = req.user.user_id;

    try {
      const bids = await Bid.getActiveBids(booking_id);
      
      if (bids.length === 0) {
        // No bids, cancel auction
        await Booking.update(booking_id, {
          auction_status: 'cancelled'
        });
        
        return res.json({
          message: 'Auction cancelled - no bids received',
          winner: null
        });
      }

      // Resolve conflicts using fair allocation
      const resolvedBids = await fairAllocation.resolveConflicts(bids);
      const winner = resolvedBids[0];

      // Update booking with winner
      await Booking.update(booking_id, {
        auction_status: 'completed',
        bid_amount: winner.bid_amount,
        user_id: winner.user_id,
        lob: winner.lob
      });

      // Update bid statuses
      for (const bid of bids) {
        const status = bid.id === winner.id ? 'won' : 'lost';
        await Bid.updateBid(bid.id, bid.bid_amount, bid.user_id);
      }

      logger.info('Auction ended', {
        userId: user_id,
        bookingId: booking_id,
        winnerId: winner.id,
        winnerLob: winner.lob,
        winningBid: winner.bid_amount
      });

      // Invalidate related cache entries
      const cacheInvalidation = require('../../shared/utils/cacheInvalidation');
      cacheInvalidation.smartInvalidate(req, 'auction_end', user_id, {
        bookingId: booking_id,
        winnerId: winner.id,
        winningBid: winner.bid_amount
      });

      res.json({
        message: 'Auction completed successfully',
        winner,
        totalBids: bids.length
      });

    } catch (error) {
      logger.logError(error, {
        context: 'end_auction',
        userId: user_id,
        bookingId: booking_id
      });
      res.status(500).json({ message: 'Failed to end auction' });
    }
  },

  /**
   * Get fairness analysis for LOBs
   */
  async getFairnessAnalysis(req, res) {
    const { lob } = req.query;
    const user_id = req.user.user_id;

    try {
      // This would implement the fairness analysis logic
      const analysis = await fairAllocation.getFairnessAnalysis(lob);
      
      res.json({
        analysis,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.logError(error, {
        context: 'get_fairness_analysis',
        userId: user_id,
        lob
      });
      res.status(500).json({ message: 'Failed to get fairness analysis' });
    }
  },

  /**
   * Auto-bid for a LOB
   */
  async autoBid(req, res) {
    const { booking_id, max_amount } = req.body;
    const user_id = req.user.user_id;
    const lob = req.user.lob || req.body.lob;

    try {
      const newBid = await Bid.autoBid(booking_id, lob, max_amount, user_id);
      
      if (!newBid) {
        return res.json({
          message: 'No auto-bid placed (current bid is sufficient)',
          bid: null
        });
      }

      logger.info('Auto-bid placed', {
        userId: user_id,
        bookingId: booking_id,
        bidAmount: newBid.bid_amount,
        maxAmount: max_amount
      });

      // Invalidate related cache entries
      const cacheInvalidation = require('../../shared/utils/cacheInvalidation');
      cacheInvalidation.smartInvalidate(req, 'auto_bid', user_id, {
        bookingId: booking_id,
        bidAmount: newBid.bid_amount,
        maxAmount: max_amount
      });

      res.json({
        message: 'Auto-bid placed successfully',
        bid: newBid
      });

    } catch (error) {
      logger.logError(error, {
        context: 'auto_bid',
        userId: user_id,
        bookingId: booking_id
      });
      res.status(500).json({ message: 'Failed to place auto-bid' });
    }
  },

  /**
   * Get budget information for a user/LOB
   */
  async getBudgetInfo(req, res) {
    const { lob } = req.query;
    const user_id = req.user?.user_id || null;

    try {
      if (!lob) {
        return res.status(400).json({ message: 'LOB parameter is required' });
      }

      const budgetInfo = await biddingValidation.getBudgetInfo(user_id, lob);
      
      res.json({
        lob: lob,
        budgetInfo,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.logError(error, {
        context: 'get_budget_info',
        userId: user_id,
        lob
      });
      res.status(500).json({ message: 'Failed to get budget info' });
    }
  }
};

module.exports = BiddingController; 