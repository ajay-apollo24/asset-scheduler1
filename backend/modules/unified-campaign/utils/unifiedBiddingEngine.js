// utils/unifiedBiddingEngine.js
const UnifiedCampaign = require('../models/UnifiedCampaign');
const Asset = require('../../asset-booking/models/Asset');
const fairAllocation = require('../../asset-booking/utils/fairAllocation');
const biddingValidation = require('../../asset-booking/utils/biddingValidation');
const logger = require('../../shared/utils/logger');

const UnifiedBiddingEngine = {
  /**
   * Process a unified bid for any campaign type
   */
  async processBid(campaign_id, asset_id, bid_amount, bid_type = 'manual', context = {}) {
    try {
      const campaign = await UnifiedCampaign.findById(campaign_id);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      const asset = await Asset.findById(asset_id);
      if (!asset) {
        throw new Error('Asset not found');
      }

      logger.info('Processing unified bid', {
        campaignId: campaign_id,
        assetId: asset_id,
        advertiserType: campaign.advertiser_type,
        bidAmount: bid_amount,
        bidType: bid_type
      });

      if (campaign.advertiser_type === 'internal') {
        return await this.processInternalBid(campaign, asset, bid_amount, bid_type, context);
      } else {
        return await this.processExternalBid(campaign, asset, bid_amount, bid_type, context);
      }
    } catch (error) {
      logger.error('Error in unified bid processing', {
        error: error.message,
        campaignId: campaign_id,
        assetId: asset_id
      });
      throw error;
    }
  },

  /**
   * Process internal team bid with fairness rules
   */
  async processInternalBid(campaign, asset, bid_amount, bid_type, context) {
    // Validate bid against internal rules
    const validation = await biddingValidation.validateBid({
      booking_id: campaign.id,
      bid_amount,
      user_id: campaign.advertiser_id,
      lob: campaign.lob
    }, asset);

    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors,
        warnings: validation.warnings
      };
    }

    // Calculate fairness score
    const fairnessScore = await fairAllocation.calculateFairnessScore(
      campaign.lob,
      asset.id,
      campaign.start_date,
      campaign.end_date
    );

    // Update campaign with bid amount
    await UnifiedCampaign.update(campaign.id, {
      budget: bid_amount,
      auction_status: 'active'
    });

    return {
      success: true,
      bid_amount,
      fairness_score: fairnessScore,
      warnings: validation.warnings,
      message: 'Internal bid processed successfully'
    };
  },

  /**
   * Process external advertiser bid with RTB rules
   */
  async processExternalBid(campaign, asset, bid_amount, bid_type, context) {
    // Validate bid against external rules
    const validation = await this.validateExternalBid(campaign, asset, bid_amount, context);
    
    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors,
        warnings: validation.warnings
      };
    }

    // Calculate performance score
    const performanceScore = await this.calculatePerformanceScore(campaign, asset, context);

    // Update campaign with bid amount
    await UnifiedCampaign.update(campaign.id, {
      budget: bid_amount,
      auction_status: 'active'
    });

    return {
      success: true,
      bid_amount,
      performance_score: performanceScore,
      warnings: validation.warnings,
      message: 'External bid processed successfully'
    };
  },

  /**
   * Validate external bid
   */
  async validateExternalBid(campaign, asset, bid_amount, context) {
    const errors = [];
    const warnings = [];

    // Check minimum bid
    if (bid_amount < 1) {
      errors.push('Minimum bid amount is $1');
    }

    // Check against campaign budget
    if (campaign.budget && bid_amount > campaign.budget) {
      errors.push(`Bid cannot exceed campaign budget of $${campaign.budget}`);
    }

    // Check asset availability
    const availability = await UnifiedCampaign.getAssetAvailability(
      asset.id,
      campaign.start_date,
      campaign.end_date
    );

    const totalBooked = availability.reduce((sum, day) => 
      sum + day.internal_bookings + day.external_campaigns, 0
    );

    if (totalBooked >= asset.max_slots) {
      errors.push('Asset is fully booked for the requested dates');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  },

  /**
   * Calculate performance score for external campaigns
   */
  async calculatePerformanceScore(campaign, asset, context) {
    let score = 1.0;

    // Base score from asset value
    score *= (asset.value_per_day / 1000); // Normalize to 0-1 range

    // User targeting bonus
    if (context.user_context) {
      score *= this.calculateTargetingMultiplier(campaign.targeting_criteria, context.user_context);
    }

    // Time-based factors
    score *= this.calculateTimeMultiplier(campaign.start_date, campaign.end_date);

    // Historical performance (if available)
    if (campaign.advertiser_id) {
      const historicalScore = await this.getHistoricalPerformance(campaign.advertiser_id);
      score *= historicalScore;
    }

    return Math.min(score, 10.0); // Cap at 10.0
  },

  /**
   * Calculate targeting multiplier
   */
  calculateTargetingMultiplier(targeting_criteria, user_context) {
    let multiplier = 1.0;

    if (!targeting_criteria || !user_context) {
      return multiplier;
    }

    // Geographic targeting
    if (targeting_criteria.geographic && user_context.location) {
      if (targeting_criteria.geographic.countries.includes(user_context.location.country)) {
        multiplier *= 1.2;
      }
    }

    // Device targeting
    if (targeting_criteria.device && user_context.user_agent) {
      const isMobile = /mobile/i.test(user_context.user_agent);
      if (targeting_criteria.device.type === 'mobile' && isMobile) {
        multiplier *= 1.1;
      }
    }

    return multiplier;
  },

  /**
   * Calculate time-based multiplier
   */
  calculateTimeMultiplier(start_date, end_date) {
    const start = new Date(start_date);
    const end = new Date(end_date);
    const now = new Date();

    // Peak season bonus (example: holiday season)
    const month = start.getMonth();
    if (month === 11 || month === 0) { // December/January
      return 1.3;
    }

    // Weekend bonus
    const dayOfWeek = start.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday/Saturday
      return 1.1;
    }

    return 1.0;
  },

  /**
   * Get historical performance for advertiser
   */
  async getHistoricalPerformance(advertiser_id) {
    // This would query historical campaign performance
    // For now, return a default score
    return 1.0;
  },

  /**
   * Allocate asset slots among competing campaigns
   */
  async allocateAsset(asset_id, start_date, end_date) {
    try {
      // Get all competing campaigns for the asset and date range
      const competingCampaigns = await UnifiedCampaign.findConflicts(asset_id, start_date, end_date);
      
      if (competingCampaigns.length === 0) {
        return { allocated: [], unallocated: [] };
      }

      // Separate internal and external campaigns
      const internalCampaigns = competingCampaigns.filter(c => c.advertiser_type === 'internal');
      const externalCampaigns = competingCampaigns.filter(c => c.advertiser_type === 'external');

      // Get asset details
      const asset = await Asset.findById(asset_id);
      const totalSlots = asset.max_slots;

      // Allocate using hybrid algorithm
      const allocation = await this.hybridAllocation(
        internalCampaigns,
        externalCampaigns,
        totalSlots,
        asset
      );

      logger.info('Asset allocation completed', {
        assetId: asset_id,
        totalSlots,
        internalAllocated: allocation.internal.length,
        externalAllocated: allocation.external.length,
        unallocated: allocation.unallocated.length
      });

      return allocation;
    } catch (error) {
      logger.error('Error in asset allocation', {
        error: error.message,
        assetId: asset_id
      });
      throw error;
    }
  },

  /**
   * Hybrid allocation algorithm balancing fairness and revenue
   */
  async hybridAllocation(internalCampaigns, externalCampaigns, totalSlots, asset) {
    const allocated = [];
    const unallocated = [];
    let remainingSlots = totalSlots;

    // Step 1: Allocate internal campaigns with fairness priority
    const internalAllocated = await this.allocateInternalCampaigns(
      internalCampaigns,
      Math.floor(remainingSlots * 0.6), // Reserve 60% for internal
      asset
    );

    allocated.push(...internalAllocated);
    remainingSlots -= internalAllocated.length;

    // Step 2: Allocate external campaigns with revenue priority
    const externalAllocated = await this.allocateExternalCampaigns(
      externalCampaigns,
      remainingSlots,
      asset
    );

    allocated.push(...externalAllocated);
    remainingSlots -= externalAllocated.length;

    // Step 3: Handle unallocated campaigns
    const allCampaigns = [...internalCampaigns, ...externalCampaigns];
    const allocatedIds = allocated.map(c => c.id);
    const unallocatedCampaigns = allCampaigns.filter(c => !allocatedIds.includes(c.id));

    unallocated.push(...unallocatedCampaigns);

    return {
      allocated,
      unallocated,
      internal: internalAllocated,
      external: externalAllocated,
      remainingSlots
    };
  },

  /**
   * Allocate internal campaigns using fairness algorithm
   */
  async allocateInternalCampaigns(campaigns, maxSlots, asset) {
    if (campaigns.length === 0) return [];

    // Calculate fairness scores for all campaigns
    const scoredCampaigns = await Promise.all(
      campaigns.map(async (campaign) => {
        const fairnessScore = await fairAllocation.calculateFairnessScore(
          campaign.lob,
          asset.id,
          campaign.start_date,
          campaign.end_date
        );

        return {
          ...campaign,
          fairnessScore,
          finalScore: fairnessScore * campaign.priority_weight
        };
      })
    );

    // Sort by fairness score (highest first)
    scoredCampaigns.sort((a, b) => b.finalScore - a.finalScore);

    // Allocate up to maxSlots
    return scoredCampaigns.slice(0, maxSlots);
  },

  /**
   * Allocate external campaigns using revenue optimization
   */
  async allocateExternalCampaigns(campaigns, maxSlots, asset) {
    if (campaigns.length === 0) return [];

    // Calculate revenue scores for all campaigns
    const scoredCampaigns = await Promise.all(
      campaigns.map(async (campaign) => {
        const performanceScore = await this.calculatePerformanceScore(campaign, asset, {});
        const revenueScore = campaign.budget * performanceScore;

        return {
          ...campaign,
          performanceScore,
          revenueScore
        };
      })
    );

    // Sort by revenue score (highest first)
    scoredCampaigns.sort((a, b) => b.revenueScore - a.revenueScore);

    // Allocate up to maxSlots
    return scoredCampaigns.slice(0, maxSlots);
  }
};

module.exports = UnifiedBiddingEngine; 