// utils/fairAllocation.js
const logger = require('../../shared/utils/logger');
const { differenceInDays, startOfDay, endOfDay } = require('date-fns');

class FairAllocationEngine {
  constructor() {
    this.strategicWeights = {
      'Monetization': 1.5,    // Revenue generation
      'Pharmacy': 1.3,        // Core business
      'Diagnostics': 1.2,     // Healthcare services
      'Insurance': 1.1,       // Financial services
      'Consult': 1.0,         // Standard weight
      'Credit Card': 1.0,     // Standard weight
      'Ask Apollo Circle': 0.9 // Lower priority
    };

    this.fairnessFactors = {
      lastBookingDays: 30,    // Consider bookings in last 30 days
      revenueMultiplier: 2.0, // Revenue campaigns get 2x weight
      strategicBonus: 0.3,    // Strategic LOBs get 30% bonus
      timeDecayFactor: 0.1    // 10% decay per day of no booking
    };
  }

  /**
   * Calculate fairness score for a LOB
   */
  async calculateFairnessScore(lob, assetId, startDate, endDate) {
    const baseScore = await this.getBaseScore(lob, assetId);
    const timeFairness = await this.getTimeFairness(lob, assetId);
    const strategicWeight = this.getStrategicWeight(lob);
    const revenueImpact = await this.getRevenueImpact(lob, assetId);
    const bookingHistory = await this.getBookingHistory(lob, assetId);

    const fairnessScore = (
      baseScore * 
      timeFairness * 
      strategicWeight * 
      revenueImpact * 
      bookingHistory
    );

    logger.info('Fairness score calculated', {
      lob,
      assetId,
      startDate,
      endDate,
      baseScore,
      timeFairness,
      strategicWeight,
      revenueImpact,
      bookingHistory,
      finalScore: fairnessScore
    });

    return fairnessScore;
  }

  /**
   * Get base score based on asset importance and LOB type
   */
  async getBaseScore(lob, assetId) {
    // This would query the asset importance and type
    const asset = await this.getAssetDetails(assetId);
    const baseScore = asset.importance * asset.value_per_day;
    
    // Adjust based on LOB type
    if (lob === 'Monetization') {
      return baseScore * 1.5; // Monetization gets higher base score
    }
    
    return baseScore;
  }

  /**
   * Calculate time-based fairness (LOBs that haven't booked recently get priority)
   */
  async getTimeFairness(lob, assetId) {
    const lastBooking = await this.getLastBookingByLOB(lob, assetId);
    
    if (!lastBooking) {
      return 2.0; // No recent bookings = high priority
    }

    const daysSinceLastBooking = differenceInDays(
      new Date(), 
      new Date(lastBooking.end_date)
    );

    // Exponential decay: more days = higher fairness score
    const timeFairness = 1 + (daysSinceLastBooking * this.fairnessFactors.timeDecayFactor);
    
    return Math.min(timeFairness, 3.0); // Cap at 3x
  }

  /**
   * Get strategic weight for the LOB
   */
  getStrategicWeight(lob) {
    return this.strategicWeights[lob] || 1.0;
  }

  /**
   * Calculate revenue impact of the booking
   */
  async getRevenueImpact(lob, assetId) {
    if (lob === 'Monetization') {
      return this.fairnessFactors.revenueMultiplier;
    }

    // For other LOBs, calculate based on historical revenue data
    const historicalRevenue = await this.getHistoricalRevenue(lob, assetId);
    const avgRevenue = await this.getAverageRevenue(assetId);
    
    if (avgRevenue === 0) return 1.0;
    
    return 1 + (historicalRevenue / avgRevenue - 1) * 0.5; // Max 50% bonus
  }

  /**
   * Get booking history fairness (prevent over-booking by same LOB)
   */
  async getBookingHistory(lob, assetId) {
    const recentBookings = await this.getRecentBookingsByLOB(lob, assetId, 90); // 90 days
    
    if (recentBookings.length === 0) {
      return 1.5; // No recent bookings = bonus
    }

    const totalDays = recentBookings.reduce((sum, booking) => {
      return sum + differenceInDays(
        new Date(booking.end_date), 
        new Date(booking.start_date)
      ) + 1;
    }, 0);

    // Penalty for over-booking: more days = lower score
    const penalty = Math.min(totalDays / 30, 0.5); // Max 50% penalty
    
    return 1 - penalty;
  }

  /**
   * Resolve conflicts between competing bookings
   */
  async resolveConflicts(competingBookings) {
    const scoredBookings = [];

    for (const booking of competingBookings) {
      const fairnessScore = await this.calculateFairnessScore(
        booking.lob,
        booking.asset_id,
        booking.start_date,
        booking.end_date
      );

      scoredBookings.push({
        ...booking,
        fairnessScore,
        priority: this.calculatePriority(booking, fairnessScore)
      });
    }

    // Sort by priority (highest first)
    scoredBookings.sort((a, b) => b.priority - a.priority);

    logger.info('Conflict resolution completed', {
      competingCount: competingBookings.length,
      winner: scoredBookings[0],
      allScores: scoredBookings.map(b => ({
        id: b.id,
        lob: b.lob,
        fairnessScore: b.fairnessScore,
        priority: b.priority
      }))
    });

    return scoredBookings;
  }

  /**
   * Calculate final priority score
   */
  calculatePriority(booking, fairnessScore) {
    const bidAmount = booking.bid_amount || 0;
    const strategicBonus = this.getStrategicWeight(booking.lob) * 100;
    
    return fairnessScore + bidAmount + strategicBonus;
  }

  /**
   * Suggest alternative slots for rejected bookings
   */
  async suggestAlternatives(booking, rejectionReason) {
    const alternatives = [];
    const asset = await this.getAssetDetails(booking.asset_id);
    
    // Look for available slots in next 30 days
    for (let i = 1; i <= 30; i++) {
      const testDate = new Date();
      testDate.setDate(testDate.getDate() + i);
      
      const isAvailable = await this.checkSlotAvailability(
        booking.asset_id,
        testDate,
        testDate
      );
      
      if (isAvailable) {
                 alternatives.push({
           start_date: testDate.toISOString().split('T')[0],
           end_date: testDate.toISOString().split('T')[0],
           priority: i <= 7 ? 'high' : i <= 14 ? 'medium' : 'low'
         });
      }
    }

    // Also suggest alternative assets
    const alternativeAssets = await this.findAlternativeAssets(booking.lob, booking.asset_id);
    
    return {
      alternatives,
      alternativeAssets,
      rejectionReason,
      suggestions: this.generateSuggestions(rejectionReason)
    };
  }

  /**
   * Generate helpful suggestions based on rejection reason
   */
  generateSuggestions(rejectionReason) {
    const suggestions = {
      'conflict': [
        'Try booking a shorter duration',
        'Consider alternative dates',
        'Check for available slots in next week'
      ],
      'quota_exceeded': [
        'Wait for next quarter allocation',
        'Consider lower-priority assets',
        'Reduce booking duration'
      ],
      'fairness': [
        'Your LOB has had recent bookings',
        'Consider alternative assets',
        'Wait for fairness window to reset'
      ]
    };

    return suggestions[rejectionReason] || ['Contact admin for assistance'];
  }

  // Mock methods for database queries (to be implemented)
  async getAssetDetails(assetId) {
    // TODO: Implement actual database query
    return { importance: 1, value_per_day: 100 };
  }

  async getLastBookingByLOB(lob, assetId) {
    // TODO: Implement actual database query
    return null;
  }

  async getHistoricalRevenue(lob, assetId) {
    // TODO: Implement actual database query
    return 1000;
  }

  async getAverageRevenue(assetId) {
    // TODO: Implement actual database query
    return 800;
  }

  async getRecentBookingsByLOB(lob, assetId, days) {
    // TODO: Implement actual database query
    return [];
  }

  async checkSlotAvailability(assetId, startDate, endDate) {
    // TODO: Implement actual database query
    return true;
  }

  async findAlternativeAssets(lob, currentAssetId) {
    // TODO: Implement actual database query
    return [];
  }
}

module.exports = new FairAllocationEngine(); 