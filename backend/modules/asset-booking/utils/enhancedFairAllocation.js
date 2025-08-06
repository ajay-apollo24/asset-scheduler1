// Enhanced Fair Allocation Engine
// This module implements a sophisticated fairness system that prevents monetization
// from always outbidding internal teams by normalizing different ROI metrics
// and implementing strict slot reservation and bid caps.

const logger = require('../../shared/utils/logger');
const { differenceInDays, startOfDay, endOfDay, isWithinInterval } = require('date-fns');
const db = require('../../../config/db');

class EnhancedFairAllocationEngine {
  constructor() {
    // Strategic weights for different LOBs - higher weights get priority
    // These weights are applied after ROI normalization to ensure fair competition
    this.strategicWeights = {
      'Monetization': 1.2,    // Revenue generation - capped to prevent domination
      'Pharmacy': 1.4,        // Core business - high strategic value
      'Diagnostics': 1.3,     // Healthcare services - critical for patient care
      'Insurance': 1.2,       // Financial services - moderate priority
      'Consult': 1.1,         // Standard weight
      'Credit Card': 1.1,     // Standard weight
      'Ask Apollo Circle': 1.0, // Lower priority
      'AI Bot': 1.3,          // Engagement-focused - high strategic value
      'Lab Test': 1.4         // Conversion-focused - critical for revenue
    };

    // ROI metrics configuration for different campaign types
    // This normalizes different success metrics to enable fair comparison
    this.roiMetrics = {
      'Monetization': {
        type: 'immediate_revenue',      // Direct revenue generation
        conversionWindow: 0,           // Same day conversion
        weight: 1.0,                   // Base weight
        maxBidMultiplier: 1.2,         // Strict cap on monetization bids
        targetMetric: 'revenue_per_day',
        normalizationFactor: 1.0       // No normalization needed for revenue
      },
      'AI Bot': {
        type: 'engagement',            // User engagement and interaction
        conversionWindow: 30,          // 30-day engagement window
        weight: 0.8,                   // Slightly lower weight than revenue
        maxBidMultiplier: 2.0,         // Higher bid allowance for engagement
        targetMetric: 'user_interactions',
        normalizationFactor: 0.1       // 10 interactions = 1 revenue unit
      },
      'Lab Test': {
        type: 'conversion',            // Booking conversions
        conversionWindow: 30,          // 30-day conversion window
        weight: 0.9,                   // High weight for conversions
        maxBidMultiplier: 1.8,         // Good bid allowance
        targetMetric: 'bookings',
        normalizationFactor: 0.05      // 20 bookings = 1 revenue unit
      },
      'Pharmacy': {
        type: 'revenue',               // Revenue generation
        conversionWindow: 7,           // 7-day conversion window
        weight: 0.85,                  // High weight for core business
        maxBidMultiplier: 1.6,         // Good bid allowance
        targetMetric: 'revenue_per_day',
        normalizationFactor: 0.8       // 80% of monetization value
      },
      'Diagnostics': {
        type: 'conversion',            // Test bookings
        conversionWindow: 14,          // 14-day conversion window
        weight: 0.9,                   // High weight for healthcare
        maxBidMultiplier: 1.7,         // Good bid allowance
        targetMetric: 'test_bookings',
        normalizationFactor: 0.03      // 33 test bookings = 1 revenue unit
      }
    };

    // Slot allocation rules - ensures internal teams get guaranteed access
    // This prevents external/monetization from dominating all slots
    this.slotAllocation = {
      primary: {
        internal: 0.6,    // 60% reserved for internal teams
        external: 0.4,    // 40% for external/monetization
        monetization: 0.2 // Max 20% for monetization (subset of external)
      },
      secondary: {
        internal: 0.7,    // 70% for internal teams
        external: 0.3,    // 30% for external
        monetization: 0.15 // Max 15% for monetization
      },
      tertiary: {
        internal: 0.8,    // 80% for internal teams
        external: 0.2,    // 20% for external
        monetization: 0.1  // Max 10% for monetization
      }
    };

    // Fairness factors for time-based and historical considerations
    this.fairnessFactors = {
      lastBookingDays: 30,        // Consider bookings in last 30 days
      timeDecayFactor: 0.1,       // 10% decay per day of no booking
      strategicBonus: 0.3,        // Strategic LOBs get 30% bonus
      revenueFloor: 1.5,          // Monetization must generate 1.5x revenue
      timeRestriction: {
        monetization: 'business_hours', // Monetization only during business hours
        internal: 'any_time'            // Internal teams can book anytime
      }
    };

    // Bidding rules for different campaign types
    this.biddingRules = {
      internal: {
        maxBidMultiplier: 2.0,    // Internal teams can bid up to 2x base
        fairnessBonus: 0.3,       // 30% fairness bonus
        timeDecayBonus: 0.2,      // 20% bonus for time-based fairness
        strategicBonus: 0.4,      // 40% bonus for strategic LOBs
        slotGuarantee: true       // Guaranteed slot access
      },
      external: {
        maxBidMultiplier: 1.5,    // External limited to 1.5x
        revenueRequirement: 0.8,  // Must show 80% revenue efficiency
        performancePenalty: 0.2,  // 20% penalty for poor performance
        slotGuarantee: false      // No guaranteed slots
      },
      monetization: {
        maxBidMultiplier: 1.2,    // Strict cap on monetization bids
        slotLimit: 0.2,           // Max 20% of slots
        revenueFloor: 1.5,        // Must generate 1.5x revenue
        timeRestriction: 'business_hours', // Only during business hours
        slotGuarantee: false      // No guaranteed slots
      }
    };
  }

  /**
   * Calculate enhanced fairness score with ROI normalization
   * This is the core method that ensures fair competition between different LOBs
   * by normalizing their different ROI metrics and applying appropriate weights
   */
  async calculateEnhancedFairnessScore(lob, assetId, startDate, endDate, bidAmount, context = {}) {
    try {
      // Get base fairness factors
      const baseScore = await this.getBaseScore(lob, assetId);
      const timeFairness = await this.getTimeFairness(lob, assetId);
      const strategicWeight = this.getStrategicWeight(lob);
      const bookingHistory = await this.getBookingHistory(lob, assetId);
      
      // Calculate normalized ROI based on campaign type
      const normalizedROI = await this.calculateNormalizedROI(lob, assetId, bidAmount, context);
      
      // Apply bid caps based on campaign type
      const bidCapMultiplier = this.getBidCapMultiplier(lob);
      const cappedBidAmount = bidAmount * bidCapMultiplier;
      
      // Calculate slot availability factor
      const slotAvailability = await this.getSlotAvailabilityFactor(lob, assetId, startDate, endDate);
      
      // Calculate time restriction factor
      const timeRestrictionFactor = this.getTimeRestrictionFactor(lob, startDate, endDate);
      
      // Final enhanced fairness score calculation
      const fairnessScore = (
        baseScore * 
        timeFairness * 
        strategicWeight * 
        normalizedROI * 
        cappedBidAmount * 
        bookingHistory * 
        slotAvailability * 
        timeRestrictionFactor
      );

      logger.info('Enhanced fairness score calculated', {
        lob,
        assetId,
        startDate,
        endDate,
        bidAmount,
        baseScore,
        timeFairness,
        strategicWeight,
        normalizedROI,
        cappedBidAmount,
        bookingHistory,
        slotAvailability,
        timeRestrictionFactor,
        finalScore: fairnessScore,
        context
      });

      return fairnessScore;
    } catch (error) {
      logger.error('Error calculating enhanced fairness score', {
        error: error.message,
        lob,
        assetId,
        startDate,
        endDate,
        bidAmount
      });
      return 0;
    }
  }

  /**
   * Calculate normalized ROI for different campaign types
   * This method converts different success metrics (engagement, conversions, revenue)
   * into comparable values for fair competition
   */
  async calculateNormalizedROI(lob, assetId, bidAmount, context = {}) {
    const metric = this.roiMetrics[lob];
    if (!metric) return 1.0;

    try {
      switch (metric.type) {
        case 'immediate_revenue':
          return await this.calculateRevenueROI(lob, assetId, bidAmount, context);
        
        case 'engagement':
          return await this.calculateEngagementROI(lob, assetId, bidAmount, context);
        
        case 'conversion':
          return await this.calculateConversionROI(lob, assetId, bidAmount, context);
        
        case 'revenue':
          return await this.calculateDelayedRevenueROI(lob, assetId, bidAmount, context);
        
        default:
          return 1.0;
      }
    } catch (error) {
      logger.error('Error calculating normalized ROI', {
        error: error.message,
        lob,
        metricType: metric.type
      });
      return 1.0;
    }
  }

  /**
   * Calculate ROI for immediate revenue campaigns (Monetization)
   * Direct revenue generation with no conversion window
   */
  async calculateRevenueROI(lob, assetId, bidAmount, context) {
    const historicalRevenue = await this.getHistoricalRevenue(lob, assetId, 30); // Last 30 days
    const avgRevenue = await this.getAverageRevenue(assetId, 30);
    
    if (avgRevenue === 0) return 1.0;
    
    // Calculate revenue efficiency
    const revenueEfficiency = historicalRevenue / avgRevenue;
    
    // Apply revenue floor requirement for monetization
    const revenueFloor = this.biddingRules.monetization.revenueFloor;
    if (revenueEfficiency < revenueFloor) {
      return revenueEfficiency / revenueFloor; // Penalty for poor performance
    }
    
    return Math.min(revenueEfficiency, 2.0); // Cap at 2x
  }

  /**
   * Calculate ROI for engagement campaigns (AI Bot)
   * Converts engagement metrics to comparable revenue value
   */
  async calculateEngagementROI(lob, assetId, bidAmount, context) {
    const engagementMetrics = await this.getEngagementMetrics(lob, assetId, 30);
    const targetEngagements = this.roiMetrics[lob].engagementTarget || 1000;
    
    // Calculate engagement rate
    const engagementRate = engagementMetrics.totalEngagements / targetEngagements;
    
    // Normalize to revenue equivalent
    const normalizedValue = engagementRate * this.roiMetrics[lob].normalizationFactor;
    
    return Math.min(normalizedValue, 1.5); // Cap at 1.5x
  }

  /**
   * Calculate ROI for conversion campaigns (Lab Test, Diagnostics)
   * Converts booking/conversion metrics to comparable revenue value
   */
  async calculateConversionROI(lob, assetId, bidAmount, context) {
    const conversionMetrics = await this.getConversionMetrics(lob, assetId, 30);
    const targetConversions = this.roiMetrics[lob].conversionTarget || 50;
    
    // Calculate conversion rate
    const conversionRate = conversionMetrics.totalConversions / targetConversions;
    
    // Normalize to revenue equivalent
    const normalizedValue = conversionRate * this.roiMetrics[lob].normalizationFactor;
    
    return Math.min(normalizedValue, 1.8); // Cap at 1.8x
  }

  /**
   * Calculate ROI for delayed revenue campaigns (Pharmacy)
   * Revenue generation with conversion window
   */
  async calculateDelayedRevenueROI(lob, assetId, bidAmount, context) {
    const historicalRevenue = await this.getHistoricalRevenue(lob, assetId, 7); // Last 7 days
    const avgRevenue = await this.getAverageRevenue(assetId, 7);
    
    if (avgRevenue === 0) return 1.0;
    
    // Calculate revenue efficiency with normalization factor
    const revenueEfficiency = (historicalRevenue / avgRevenue) * this.roiMetrics[lob].normalizationFactor;
    
    return Math.min(revenueEfficiency, 1.6); // Cap at 1.6x
  }

  /**
   * Get bid cap multiplier based on campaign type
   * This prevents certain campaign types from overbidding
   */
  getBidCapMultiplier(lob) {
    const metric = this.roiMetrics[lob];
    if (!metric) return 1.0;
    
    return metric.maxBidMultiplier;
  }

  /**
   * Get slot availability factor
   * Ensures internal teams get guaranteed access to slots
   * Now uses asset-specific configuration with fallback to asset level defaults
   */
  async getSlotAvailabilityFactor(lob, assetId, startDate, endDate) {
    try {
      const asset = await this.getAssetDetails(assetId);
      const assetLevel = asset.level || 'secondary';
      
      // Check if this is an internal campaign
      const isInternal = this.isInternalCampaign(lob);
      
      if (isInternal) {
        // Internal campaigns get guaranteed access
        return 1.2; // 20% bonus for internal campaigns
      } else if (lob === 'Monetization') {
        // Get asset-specific monetization limit
        const assetMonetizationLimit = await this.getAssetSpecificMonetizationLimit(assetId);
        
        // Check if monetization slot limit is reached
        const monetizationUsage = await this.getMonetizationSlotUsage(assetId, startDate, endDate);
        
        if (monetizationUsage >= assetMonetizationLimit) {
          return 0.1; // Severe penalty if slot limit exceeded
        }
        
        return 1.0;
      } else {
        // External campaigns (non-monetization)
        return 0.8; // 20% penalty for external campaigns
      }
    } catch (error) {
      logger.error('Error calculating slot availability factor', {
        error: error.message,
        lob,
        assetId
      });
      return 1.0; // Default to neutral factor on error
    }
  }

  /**
   * Get asset-specific monetization slot limit
   * Falls back to asset level defaults if no custom configuration exists
   */
  async getAssetSpecificMonetizationLimit(assetId) {
    try {
      // First check for asset-specific configuration
      const result = await db.query(`
        SELECT monetization_slot_limit
        FROM asset_monetization_limits
        WHERE asset_id = $1 AND is_active = true
      `, [assetId]);

      if (result.rows.length > 0) {
        logger.info('Using asset-specific monetization limit', {
          assetId,
          customLimit: result.rows[0].monetization_slot_limit
        });
        return result.rows[0].monetization_slot_limit;
      }

      // Fall back to asset level defaults
      const asset = await this.getAssetDetails(assetId);
      const assetLevel = asset.level || 'secondary';
      const allocation = this.slotAllocation[assetLevel];
      
      logger.info('Using asset level default monetization limit', {
        assetId,
        assetLevel,
        defaultLimit: allocation?.monetization || 0.15
      });
      
      return allocation?.monetization || 0.15;
    } catch (error) {
      logger.error('Error getting asset-specific monetization limit', {
        error: error.message,
        assetId
      });
      return 0.15; // Default to secondary level limit on error
    }
  }

  /**
   * Get asset-specific slot allocation configuration
   * Returns complete slot allocation for an asset (internal, external, monetization)
   */
  async getAssetSpecificSlotAllocation(assetId) {
    try {
      // First check for asset-specific configuration
      const result = await db.query(`
        SELECT 
          internal_slot_guarantee,
          external_slot_limit,
          monetization_slot_limit
        FROM asset_monetization_limits
        WHERE asset_id = $1 AND is_active = true
      `, [assetId]);

      if (result.rows.length > 0) {
        const config = result.rows[0];
        logger.info('Using asset-specific slot allocation', {
          assetId,
          internal: config.internal_slot_guarantee,
          external: config.external_slot_limit,
          monetization: config.monetization_slot_limit
        });
        
        return {
          internal: config.internal_slot_guarantee,
          external: config.external_slot_limit,
          monetization: config.monetization_slot_limit
        };
      }

      // Fall back to asset level defaults
      const asset = await this.getAssetDetails(assetId);
      const assetLevel = asset.level || 'secondary';
      const allocation = this.slotAllocation[assetLevel];
      
      logger.info('Using asset level default slot allocation', {
        assetId,
        assetLevel,
        allocation
      });
      
      return allocation || {
        internal: 0.7,
        external: 0.3,
        monetization: 0.15
      };
    } catch (error) {
      logger.error('Error getting asset-specific slot allocation', {
        error: error.message,
        assetId
      });
      return {
        internal: 0.7,
        external: 0.3,
        monetization: 0.15
      };
    }
  }

  /**
   * Get asset-specific fairness configuration
   * Returns custom fairness parameters for an asset
   */
  async getAssetSpecificFairnessConfig(assetId) {
    try {
      const result = await db.query(`
        SELECT 
          strategic_weight_override,
          time_decay_factor,
          revenue_floor,
          fairness_bonus
        FROM asset_fairness_config
        WHERE asset_id = $1 AND is_active = true
      `, [assetId]);

      if (result.rows.length > 0) {
        const config = result.rows[0];
        logger.info('Using asset-specific fairness config', {
          assetId,
          config
        });
        return config;
      }

      // Return default configuration
      return {
        strategic_weight_override: null,
        time_decay_factor: 0.1,
        revenue_floor: 1.5,
        fairness_bonus: 0.3
      };
    } catch (error) {
      logger.error('Error getting asset-specific fairness config', {
        error: error.message,
        assetId
      });
      return {
        strategic_weight_override: null,
        time_decay_factor: 0.1,
        revenue_floor: 1.5,
        fairness_bonus: 0.3
      };
    }
  }

  /**
   * Get time restriction factor
   * Applies time-based restrictions for certain campaign types
   */
  getTimeRestrictionFactor(lob, startDate, endDate) {
    const restriction = this.fairnessFactors.timeRestriction[lob] || 'any_time';
    
    if (restriction === 'any_time') {
      return 1.0; // No time restrictions
    } else if (restriction === 'business_hours') {
      // Check if booking is within business hours (9 AM - 6 PM)
      const startHour = new Date(startDate).getHours();
      const endHour = new Date(endDate).getHours();
      
      if (startHour >= 9 && endHour <= 18) {
        return 1.0; // Within business hours
      } else {
        return 0.3; // 70% penalty for non-business hours
      }
    }
    
    return 1.0;
  }

  /**
   * Hybrid allocation algorithm with ROI normalization
   * This is the main allocation method that balances internal and external campaigns
   * Now uses asset-specific configuration with fallback to asset level defaults
   */
  async hybridAllocationWithROI(internalCampaigns, externalCampaigns, totalSlots, asset) {
    try {
      // Get asset-specific slot allocation configuration
      const allocation = await this.getAssetSpecificSlotAllocation(asset.id);
      
      // Calculate reserved slots based on asset-specific configuration
      const reservedInternalSlots = Math.floor(totalSlots * allocation.internal);
      const availableExternalSlots = totalSlots - reservedInternalSlots;
      
      logger.info('Starting hybrid allocation with asset-specific config', {
        totalSlots,
        reservedInternalSlots,
        availableExternalSlots,
        assetId: asset.id,
        assetLevel: asset.level,
        allocation,
        internalCampaigns: internalCampaigns.length,
        externalCampaigns: externalCampaigns.length
      });
      
      // Step 1: Allocate internal campaigns with ROI normalization
      const internalAllocated = await this.allocateInternalWithROI(
        internalCampaigns, 
        reservedInternalSlots, 
        asset
      );
      
      // Step 2: Allocate external campaigns with strict caps
      const externalAllocated = await this.allocateExternalWithCaps(
        externalCampaigns, 
        availableExternalSlots, 
        asset
      );
      
      // Step 3: Handle unallocated campaigns
      const allCampaigns = [...internalCampaigns, ...externalCampaigns];
      const allocatedIds = [...internalAllocated, ...externalAllocated].map(c => c.id);
      const unallocatedCampaigns = allCampaigns.filter(c => !allocatedIds.includes(c.id));
      
      const result = {
        allocated: [...internalAllocated, ...externalAllocated],
        unallocated: unallocatedCampaigns,
        internal: internalAllocated,
        external: externalAllocated,
        remainingSlots: totalSlots - internalAllocated.length - externalAllocated.length,
        allocation: {
          totalSlots,
          internalSlots: internalAllocated.length,
          externalSlots: externalAllocated.length,
          internalPercentage: (internalAllocated.length / totalSlots) * 100,
          externalPercentage: (externalAllocated.length / totalSlots) * 100,
          assetSpecificConfig: allocation
        }
      };
      
      logger.info('Hybrid allocation completed with asset-specific config', {
        totalAllocated: result.allocated.length,
        internalAllocated: internalAllocated.length,
        externalAllocated: externalAllocated.length,
        unallocated: unallocatedCampaigns.length,
        remainingSlots: result.remainingSlots,
        assetId: asset.id,
        assetSpecificConfig: allocation
      });
      
      return result;
    } catch (error) {
      logger.error('Error in hybrid allocation with asset-specific config', {
        error: error.message,
        totalSlots,
        internalCampaigns: internalCampaigns.length,
        externalCampaigns: externalCampaigns.length,
        assetId: asset.id
      });
      throw error;
    }
  }

  /**
   * Allocate internal campaigns using enhanced fairness algorithm
   */
  async allocateInternalWithROI(campaigns, maxSlots, asset) {
    if (campaigns.length === 0) return [];

    try {
      // Calculate enhanced fairness scores for all campaigns
      const scoredCampaigns = await Promise.all(
        campaigns.map(async (campaign) => {
          const fairnessScore = await this.calculateEnhancedFairnessScore(
            campaign.lob,
            asset.id,
            campaign.start_date,
            campaign.end_date,
            campaign.budget || 0,
            { campaignType: 'internal' }
          );

          return {
            ...campaign,
            fairnessScore,
            finalScore: fairnessScore * (campaign.priority_weight || 1.0)
          };
        })
      );

      // Sort by final score (highest first)
      scoredCampaigns.sort((a, b) => b.finalScore - a.finalScore);

      // Allocate up to maxSlots
      const allocated = scoredCampaigns.slice(0, maxSlots);
      
      logger.info('Internal allocation completed', {
        totalCampaigns: campaigns.length,
        allocated: allocated.length,
        maxSlots,
        topScore: allocated[0]?.finalScore,
        bottomScore: allocated[allocated.length - 1]?.finalScore
      });

      return allocated;
    } catch (error) {
      logger.error('Error allocating internal campaigns', {
        error: error.message,
        campaignsCount: campaigns.length,
        maxSlots
      });
      return [];
    }
  }

  /**
   * Allocate external campaigns with strict caps and performance requirements
   * Now uses asset-specific monetization limits
   */
  async allocateExternalWithCaps(campaigns, maxSlots, asset) {
    if (campaigns.length === 0) return [];

    try {
      // Get asset-specific monetization limit
      const assetMonetizationLimit = await this.getAssetSpecificMonetizationLimit(asset.id);
      
      // Filter out monetization campaigns that exceed slot limits
      const monetizationUsage = await this.getMonetizationSlotUsage(asset.id);
      
      const filteredCampaigns = campaigns.filter(campaign => {
        if (campaign.lob === 'Monetization') {
          return monetizationUsage < assetMonetizationLimit;
        }
        return true;
      });

      // Calculate enhanced fairness scores
      const scoredCampaigns = await Promise.all(
        filteredCampaigns.map(async (campaign) => {
          const fairnessScore = await this.calculateEnhancedFairnessScore(
            campaign.lob,
            asset.id,
            campaign.start_date,
            campaign.end_date,
            campaign.budget || 0,
            { campaignType: 'external' }
          );

          return {
            ...campaign,
            fairnessScore,
            finalScore: fairnessScore
          };
        })
      );

      // Sort by final score (highest first)
      scoredCampaigns.sort((a, b) => b.finalScore - a.finalScore);

      // Allocate up to maxSlots
      const allocated = scoredCampaigns.slice(0, maxSlots);
      
      logger.info('External allocation completed with asset-specific limits', {
        totalCampaigns: campaigns.length,
        filteredCampaigns: filteredCampaigns.length,
        allocated: allocated.length,
        maxSlots,
        monetizationUsage,
        assetMonetizationLimit,
        assetId: asset.id
      });

      return allocated;
    } catch (error) {
      logger.error('Error allocating external campaigns with asset-specific limits', {
        error: error.message,
        campaignsCount: campaigns.length,
        maxSlots,
        assetId: asset.id
      });
      return [];
    }
  }

  /**
   * Check if a campaign is internal based on LOB
   */
  isInternalCampaign(lob) {
    // All campaigns except 'Monetization' are considered internal
    return lob !== 'Monetization';
  }

  /**
   * Get monetization slot usage for an asset
   */
  async getMonetizationSlotUsage(assetId, startDate = null, endDate = null) {
    try {
      // This would query the database for monetization bookings
      // For now, return a mock value
      return 0.1; // 10% usage
    } catch (error) {
      logger.error('Error getting monetization slot usage', {
        error: error.message,
        assetId
      });
      return 0;
    }
  }

  // Inherit methods from original FairAllocationEngine
  async getBaseScore(lob, assetId) {
    const asset = await this.getAssetDetails(assetId);
    const baseScore = asset.importance * asset.value_per_day;
    
    // Adjust based on LOB type
    if (lob === 'Monetization') {
      return baseScore * 1.2; // Reduced from 1.5 to 1.2
    }
    
    return baseScore;
  }

  async getTimeFairness(lob, assetId) {
    const lastBooking = await this.getLastBookingByLOB(lob, assetId);
    
    if (!lastBooking) {
      return 2.0; // No recent bookings = high priority
    }

    const daysSinceLastBooking = differenceInDays(
      new Date(), 
      new Date(lastBooking.end_date)
    );

    const timeFairness = 1 + (daysSinceLastBooking * this.fairnessFactors.timeDecayFactor);
    return Math.min(timeFairness, 3.0); // Cap at 3x
  }

  getStrategicWeight(lob) {
    return this.strategicWeights[lob] || 1.0;
  }

  async getBookingHistory(lob, assetId) {
    const recentBookings = await this.getRecentBookingsByLOB(lob, assetId, 90);
    
    if (recentBookings.length === 0) {
      return 1.5; // No recent bookings = bonus
    }

    const totalDays = recentBookings.reduce((sum, booking) => {
      return sum + differenceInDays(
        new Date(booking.end_date), 
        new Date(booking.start_date)
      ) + 1;
    }, 0);

    const penalty = Math.min(totalDays / 30, 0.5); // Max 50% penalty
    return 1 - penalty;
  }

  // Mock methods for database queries (to be implemented with actual queries)
  async getAssetDetails(assetId) {
    // TODO: Implement actual database query
    return { importance: 1, value_per_day: 100, level: 'secondary' };
  }

  async getLastBookingByLOB(lob, assetId) {
    // TODO: Implement actual database query
    return null;
  }

  async getHistoricalRevenue(lob, assetId, days = 30) {
    // TODO: Implement actual database query
    return 1000;
  }

  async getAverageRevenue(assetId, days = 30) {
    // TODO: Implement actual database query
    return 800;
  }

  async getRecentBookingsByLOB(lob, assetId, days) {
    // TODO: Implement actual database query
    return [];
  }

  async getEngagementMetrics(lob, assetId, days) {
    // TODO: Implement actual database query
    return {
      totalEngagements: 500,
      uniqueUsers: 300,
      avgTimeSpent: 120
    };
  }

  async getConversionMetrics(lob, assetId, days) {
    // TODO: Implement actual database query
    return {
      totalConversions: 25,
      conversionRate: 0.05,
      avgConversionValue: 200
    };
  }
}

module.exports = new EnhancedFairAllocationEngine(); 