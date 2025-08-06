// Enhanced Bidding Controller
// This controller integrates with the enhanced fairness system to provide
// sophisticated bidding with ROI normalization and fair allocation

const Bid = require('../models/Bid');
const Booking = require('../models/Booking');
const Asset = require('../models/Asset');
const enhancedFairAllocation = require('../utils/enhancedFairAllocation');
const biddingValidation = require('../utils/biddingValidation');
const logger = require('../../shared/utils/logger');
const db = require('../../../config/db');

const EnhancedBiddingController = {
  /**
   * Place a bid using enhanced fairness system
   * This method uses ROI normalization and sophisticated fairness scoring
   */
  async placeEnhancedBid(req, res) {
    const { booking_id, bid_amount, max_bid, bid_reason, campaign_type } = req.body;
    const user_id = req.user.user_id;
    const startTime = Date.now();

    logger.info('Enhanced bid placement attempted', {
      userId: user_id,
      bookingId: booking_id,
      bidAmount: bid_amount,
      maxBid: max_bid,
      campaignType: campaign_type
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
      const asset = await Asset.findById(booking.asset_id);
      if (!asset) {
        return res.status(404).json({ message: 'Asset not found' });
      }

      // Validate bid against enhanced rules
      const validation = await this.validateEnhancedBid({
        booking_id,
        bid_amount,
        max_bid,
        user_id,
        lob: booking.lob,
        campaign_type: campaign_type || 'internal'
      }, asset);

      if (!validation.valid) {
        return res.status(400).json({
          message: 'Bid validation failed',
          errors: validation.errors,
          warnings: validation.warnings
        });
      }

      // Calculate enhanced fairness score
      const fairnessScore = await enhancedFairAllocation.calculateEnhancedFairnessScore(
        booking.lob,
        booking.asset_id,
        booking.start_date,
        booking.end_date,
        bid_amount,
        {
          campaignType: campaign_type || 'internal',
          userId: user_id,
          bidReason: bid_reason
        }
      );

      // Create bid with enhanced fairness data
      const bidData = {
        booking_id,
        user_id,
        lob: booking.lob,
        bid_amount,
        max_bid: max_bid || null,
        bid_reason: bid_reason || null,
        fairness_score: fairnessScore,
        campaign_type: campaign_type || 'internal',
        status: 'active'
      };

      const bid = await Bid.create(bidData);

      // Update slot allocation
      await this.updateSlotAllocation(booking.asset_id, booking.start_date, booking.end_date);

      logger.info('Enhanced bid placed successfully', {
        userId: user_id,
        bookingId: booking_id,
        bidId: bid.id,
        bidAmount: bid_amount,
        fairnessScore: fairnessScore,
        campaignType: campaign_type
      });

      // Invalidate related cache entries
      const cacheInvalidation = require('../../shared/utils/cacheInvalidation');
      cacheInvalidation.smartInvalidate(req, 'enhanced_bid_placed', user_id, {
        bookingId: booking_id,
        bidId: bid.id,
        fairnessScore: fairnessScore
      });

      res.status(201).json({
        message: 'Enhanced bid placed successfully',
        bid: {
          id: bid.id,
          bid_amount: bid.bid_amount,
          fairness_score: fairnessScore,
          status: bid.status
        },
        warnings: validation.warnings
      });

    } catch (error) {
      logger.logError(error, {
        context: 'enhanced_bid_placement',
        userId: user_id,
        bookingId: booking_id
      });
      res.status(500).json({ message: 'Failed to place enhanced bid' });
    }
  },

  /**
   * Start an enhanced auction with fairness considerations
   */
  async startEnhancedAuction(req, res) {
    const { booking_id } = req.params;
    const user_id = req.user.user_id;

    try {
      const booking = await Booking.findById(booking_id);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      // Check if user has permission to start auction
      if (booking.user_id !== user_id && req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to start auction' });
      }

      // Initialize slot allocation for the asset
      await this.initializeSlotAllocation(booking.asset_id, booking.start_date, booking.end_date);

      // Update booking status
      await Booking.update(booking_id, {
        auction_status: 'active',
        auction_started_at: new Date()
      });

      logger.info('Enhanced auction started', {
        userId: user_id,
        bookingId: booking_id,
        assetId: booking.asset_id,
        lob: booking.lob
      });

      res.json({
        message: 'Enhanced auction started successfully',
        auctionStatus: 'active',
        bookingId: booking_id
      });

    } catch (error) {
      logger.logError(error, {
        context: 'start_enhanced_auction',
        userId: user_id,
        bookingId: booking_id
      });
      res.status(500).json({ message: 'Failed to start enhanced auction' });
    }
  },

  /**
   * End an enhanced auction with fairness-based winner selection
   */
  async endEnhancedAuction(req, res) {
    const { booking_id } = req.params;
    const user_id = req.user.user_id;

    try {
      const booking = await Booking.findById(booking_id);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      // Get all bids with enhanced fairness scores
      const bids = await this.getBidsWithFairnessScores(booking_id);
      
      if (bids.length === 0) {
        // No bids, cancel auction
        await Booking.update(booking_id, {
          auction_status: 'cancelled',
          auction_ended_at: new Date()
        });
        
        return res.json({
          message: 'Enhanced auction cancelled - no bids received',
          winner: null,
          totalBids: 0
        });
      }

      // Select winner based on enhanced fairness scores
      const winner = await this.selectFairnessWinner(bids, booking);

      // Update booking with winner
      await Booking.update(booking_id, {
        auction_status: 'completed',
        bid_amount: winner.bid_amount,
        user_id: winner.user_id,
        lob: winner.lob,
        fairness_score: winner.fairness_score,
        auction_ended_at: new Date()
      });

      // Update bid statuses
      for (const bid of bids) {
        const status = bid.id === winner.id ? 'won' : 'lost';
        await Bid.updateBid(bid.id, bid.bid_amount, bid.user_id, status);
      }

      // Update fairness score allocation result
      await this.updateFairnessAllocationResult(winner.id, 'allocated');

      logger.info('Enhanced auction ended', {
        userId: user_id,
        bookingId: booking_id,
        winnerId: winner.id,
        winnerLob: winner.lob,
        winningBid: winner.bid_amount,
        fairnessScore: winner.fairness_score,
        totalBids: bids.length
      });

      // Invalidate related cache entries
      const cacheInvalidation = require('../../shared/utils/cacheInvalidation');
      cacheInvalidation.smartInvalidate(req, 'enhanced_auction_ended', user_id, {
        bookingId: booking_id,
        winnerId: winner.id,
        winningBid: winner.bid_amount,
        fairnessScore: winner.fairness_score
      });

      res.json({
        message: 'Enhanced auction completed successfully',
        winner: {
          id: winner.id,
          user_id: winner.user_id,
          lob: winner.lob,
          bid_amount: winner.bid_amount,
          fairness_score: winner.fairness_score
        },
        totalBids: bids.length,
        allocationBreakdown: await this.getAllocationBreakdown(booking_id)
      });

    } catch (error) {
      logger.logError(error, {
        context: 'end_enhanced_auction',
        userId: user_id,
        bookingId: booking_id
      });
      res.status(500).json({ message: 'Failed to end enhanced auction' });
    }
  },

  /**
   * Get bids with enhanced fairness scores
   */
  async getBidsWithFairnessScores(booking_id) {
    try {
      const result = await db.query(`
        SELECT 
          b.*,
          fs.final_fairness_score,
          fs.normalized_roi,
          fs.strategic_weight,
          fs.time_fairness
        FROM bids b
        LEFT JOIN fairness_scores fs ON b.id = fs.campaign_id
        WHERE b.booking_id = $1 AND b.status = 'active'
        ORDER BY fs.final_fairness_score DESC NULLS LAST, b.bid_amount DESC
      `, [booking_id]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting bids with fairness scores', {
        error: error.message,
        bookingId: booking_id
      });
      return [];
    }
  },

  /**
   * Select winner based on enhanced fairness scores
   */
  async selectFairnessWinner(bids, booking) {
    // Sort bids by fairness score (highest first)
    const sortedBids = bids.sort((a, b) => {
      const scoreA = a.final_fairness_score || 0;
      const scoreB = b.final_fairness_score || 0;
      return scoreB - scoreA;
    });

    const winner = sortedBids[0];

    logger.info('Fairness winner selected', {
      bookingId: booking.id,
      winnerId: winner.id,
      winnerLob: winner.lob,
      fairnessScore: winner.final_fairness_score,
      bidAmount: winner.bid_amount,
      totalBids: bids.length
    });

    return winner;
  },

  /**
   * Validate enhanced bid with sophisticated rules
   */
  async validateEnhancedBid(bidData, asset) {
    const errors = [];
    const warnings = [];

    try {
      // Basic validation
      if (!bidData.bid_amount || bidData.bid_amount <= 0) {
        errors.push('Bid amount must be greater than 0');
      }

      // Check bid caps based on LOB and asset level
      const bidCap = await this.getBidCap(bidData.lob, asset.level);
      if (bidData.bid_amount > bidCap.maxBid) {
        errors.push(`Bid amount exceeds maximum allowed for ${bidData.lob} (${bidCap.maxBid})`);
      }

      // Check slot availability
      const slotAvailability = await this.checkSlotAvailability(bidData.lob, asset.id);
      if (!slotAvailability.available) {
        errors.push(`No slots available for ${bidData.lob} on this asset`);
      }

      // Check time restrictions
      const timeRestriction = await this.checkTimeRestriction(bidData.lob);
      if (!timeRestriction.allowed) {
        errors.push(`Bidding not allowed for ${bidData.lob} at this time`);
      }

      // Performance validation for external campaigns
      if (bidData.campaign_type === 'external') {
        const performanceValidation = await this.validatePerformance(bidData.lob, asset.id);
        if (!performanceValidation.valid) {
          warnings.push(`Performance below threshold for ${bidData.lob}`);
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      logger.error('Error validating enhanced bid', {
        error: error.message,
        bidData
      });
      return {
        valid: false,
        errors: ['Validation error occurred'],
        warnings: []
      };
    }
  },

  /**
   * Get bid cap for LOB and asset level
   */
  async getBidCap(lob, assetLevel) {
    try {
      const result = await db.query(`
        SELECT max_bid_multiplier, slot_limit_percentage, time_restriction
        FROM bid_caps
        WHERE lob = $1 AND asset_level = $2 AND is_active = true
      `, [lob, assetLevel]);

      if (result.rows.length > 0) {
        return result.rows[0];
      }

      // Default bid cap
      return {
        max_bid_multiplier: 1.0,
        slot_limit_percentage: 0.0,
        time_restriction: 'any_time'
      };
    } catch (error) {
      logger.error('Error getting bid cap', {
        error: error.message,
        lob,
        assetLevel
      });
      return {
        max_bid_multiplier: 1.0,
        slot_limit_percentage: 0.0,
        time_restriction: 'any_time'
      };
    }
  },

  /**
   * Check slot availability for LOB
   */
  async checkSlotAvailability(lob, assetId) {
    try {
      const result = await db.query(`
        SELECT 
          sa.total_slots,
          sa.internal_slots_allocated,
          sa.external_slots_allocated,
          sa.monetization_slots_allocated
        FROM slot_allocation sa
        WHERE sa.asset_id = $1 AND sa.date = CURRENT_DATE
      `, [assetId]);

      if (result.rows.length === 0) {
        return { available: true, reason: 'No allocation data' };
      }

      const allocation = result.rows[0];
      
      if (lob === 'Monetization') {
        const monetizationLimit = Math.floor(allocation.total_slots * 0.2); // 20% limit
        const available = allocation.monetization_slots_allocated < monetizationLimit;
        return {
          available,
          reason: available ? 'Slots available' : 'Monetization slot limit reached'
        };
      } else {
        // Internal campaigns have guaranteed access
        return { available: true, reason: 'Internal campaign - guaranteed access' };
      }

    } catch (error) {
      logger.error('Error checking slot availability', {
        error: error.message,
        lob,
        assetId
      });
      return { available: true, reason: 'Error checking availability' };
    }
  },

  /**
   * Check time restrictions for LOB
   */
  async checkTimeRestriction(lob) {
    if (lob === 'Monetization') {
      const now = new Date();
      const hour = now.getHours();
      const isBusinessHours = hour >= 9 && hour <= 18;
      
      return {
        allowed: isBusinessHours,
        reason: isBusinessHours ? 'Within business hours' : 'Outside business hours'
      };
    }

    return { allowed: true, reason: 'No time restrictions' };
  },

  /**
   * Validate performance for external campaigns
   */
  async validatePerformance(lob, assetId) {
    try {
      // This would check historical performance metrics
      // For now, return valid
      return { valid: true, score: 1.0 };
    } catch (error) {
      logger.error('Error validating performance', {
        error: error.message,
        lob,
        assetId
      });
      return { valid: true, score: 1.0 };
    }
  },

  /**
   * Initialize slot allocation for asset
   */
  async initializeSlotAllocation(assetId, startDate, endDate) {
    try {
      const asset = await Asset.findById(assetId);
      if (!asset) return;

      // Get total slots for the asset
      const totalSlots = asset.max_slots || 10;

      // Initialize allocation for each date in the range
      const start = new Date(startDate);
      const end = new Date(endDate);

      for (let date = start; date <= end; date.setDate(date.getDate() + 1)) {
        await db.query(`
          INSERT INTO slot_allocation (
            asset_id, date, total_slots, internal_slots_allocated,
            external_slots_allocated, monetization_slots_allocated
          ) VALUES ($1, $2, $3, 0, 0, 0)
          ON CONFLICT (asset_id, date) DO NOTHING
        `, [assetId, date.toISOString().split('T')[0], totalSlots]);
      }

      logger.info('Slot allocation initialized', {
        assetId,
        startDate,
        endDate,
        totalSlots
      });

    } catch (error) {
      logger.error('Error initializing slot allocation', {
        error: error.message,
        assetId,
        startDate,
        endDate
      });
    }
  },

  /**
   * Update slot allocation after bid placement
   */
  async updateSlotAllocation(assetId, startDate, endDate) {
    try {
      // This would update slot allocation based on current bids
      // For now, just log the update
      logger.info('Slot allocation updated', {
        assetId,
        startDate,
        endDate
      });
    } catch (error) {
      logger.error('Error updating slot allocation', {
        error: error.message,
        assetId,
        startDate,
        endDate
      });
    }
  },

  /**
   * Update fairness allocation result
   */
  async updateFairnessAllocationResult(campaignId, result, rejectionReason = null) {
    try {
      await db.query(`
        UPDATE fairness_scores
        SET allocation_result = $2, rejection_reason = $3
        WHERE campaign_id = $1
      `, [campaignId, result, rejectionReason]);
    } catch (error) {
      logger.error('Error updating fairness allocation result', {
        error: error.message,
        campaignId,
        result
      });
    }
  },

  /**
   * Get allocation breakdown for auction
   */
  async getAllocationBreakdown(bookingId) {
    try {
      const result = await db.query(`
        SELECT 
          COUNT(*) as total_bids,
          COUNT(CASE WHEN lob != 'Monetization' THEN 1 END) as internal_bids,
          COUNT(CASE WHEN lob = 'Monetization' THEN 1 END) as monetization_bids,
          AVG(bid_amount) as avg_bid_amount,
          MAX(bid_amount) as max_bid_amount,
          MIN(bid_amount) as min_bid_amount
        FROM bids
        WHERE booking_id = $1 AND status = 'active'
      `, [bookingId]);

      return result.rows[0] || {};
    } catch (error) {
      logger.error('Error getting allocation breakdown', {
        error: error.message,
        bookingId
      });
      return {};
    }
  },

  /**
   * Get enhanced fairness analysis
   */
  async getFairnessAnalysis(req, res) {
    const { lob, asset_id, date_range } = req.query;
    const user_id = req.user.user_id;

    try {
      let query = `
        SELECT 
          fs.lob,
          fs.asset_id,
          AVG(fs.final_fairness_score) as avg_fairness_score,
          COUNT(*) as total_bids,
          AVG(fs.normalized_roi) as avg_roi,
          AVG(fs.strategic_weight) as avg_strategic_weight
        FROM fairness_scores fs
        WHERE 1=1
      `;

      const params = [];
      let paramIndex = 1;

      if (lob) {
        query += ` AND fs.lob = $${paramIndex}`;
        params.push(lob);
        paramIndex++;
      }

      if (asset_id) {
        query += ` AND fs.asset_id = $${paramIndex}`;
        params.push(asset_id);
        paramIndex++;
      }

      if (date_range) {
        query += ` AND fs.created_at >= CURRENT_DATE - INTERVAL '1 day' * $${paramIndex}`;
        params.push(parseInt(date_range));
        paramIndex++;
      }

      query += `
        GROUP BY fs.lob, fs.asset_id
        ORDER BY avg_fairness_score DESC
      `;

      const result = await db.query(query, params);

      res.json({
        fairnessAnalysis: result.rows,
        summary: {
          totalRecords: result.rows.length,
          dateRange: date_range || 'all',
          lob: lob || 'all',
          assetId: asset_id || 'all'
        }
      });

    } catch (error) {
      logger.logError(error, {
        context: 'get_fairness_analysis',
        userId: user_id
      });
      res.status(500).json({ message: 'Failed to get fairness analysis' });
    }
  }
};

module.exports = EnhancedBiddingController; 