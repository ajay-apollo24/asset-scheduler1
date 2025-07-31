// utils/biddingValidation.js
const Bid = require('../models/Bid');
const Asset = require('../models/Asset');
const Booking = require('../models/Booking');
const logger = require('../../shared/utils/logger');
const { startOfDay, endOfDay, startOfMonth, endOfMonth } = require('date-fns');

// Load bidding configuration
const biddingConfig = require('../../../config/biddingConfig.json');

/**
 * Validates a bid against all bidding limits and rules
 * @param {Object} bidData - { booking_id, bid_amount, max_bid, user_id, lob }
 * @param {Object} asset - Asset details
 * @returns {Promise<{valid: boolean, errors: string[], warnings: string[]}>}
 */
async function validateBid(bidData, asset) {
  const errors = [];
  const warnings = [];
  const { booking_id, bid_amount, max_bid, user_id, lob } = bidData;

  logger.info('Bid validation started', {
    userId: user_id,
    bookingId: booking_id,
    bidAmount: bid_amount,
    lob,
    assetId: asset.id
  });

  if (!biddingConfig.biddingLimits.enabled) {
    return { valid: true, errors: [], warnings: [] };
  }

  // 1. Global Limits Validation
  const globalLimits = biddingConfig.biddingLimits.globalLimits;
  
  if (bid_amount < globalLimits.minBidAmount) {
    errors.push(`Minimum bid amount is ₹${globalLimits.minBidAmount.toLocaleString()}`);
  }
  
  if (bid_amount > globalLimits.maxBidAmount) {
    errors.push(`Maximum bid amount is ₹${globalLimits.maxBidAmount.toLocaleString()}`);
  }

  // Validate against asset value
  const assetDailyValue = parseFloat(asset.value_per_day) || 0;
  const maxAllowedBid = (assetDailyValue * globalLimits.maxBidPercentageOfAssetValue) / 100;
  
  if (bid_amount > maxAllowedBid) {
    errors.push(`Bid cannot exceed ${globalLimits.maxBidPercentageOfAssetValue}% of asset value (₹${maxAllowedBid.toLocaleString()})`);
  }

  // 2. LOB-Specific Limits
  if (biddingConfig.biddingLimits.lobLimits.enabled) {
    const lobBudget = biddingConfig.biddingLimits.lobLimits.budgets[lob] || 
                     biddingConfig.biddingLimits.lobLimits.defaultBudget;

    if (bid_amount > lobBudget.maxBidAmount) {
      errors.push(`Maximum bid for ${lob} is ₹${lobBudget.maxBidAmount.toLocaleString()}`);
    }

    // Check daily LOB budget
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    const todayLOBSpend = await calculateLOBSpending(lob, todayStart, todayEnd);
    
    if (todayLOBSpend + bid_amount > lobBudget.dailyBudget) {
      errors.push(`Daily budget for ${lob} exceeded. Remaining: ₹${(lobBudget.dailyBudget - todayLOBSpend).toLocaleString()}`);
    }

    // Warning for high budget usage
    const budgetUsagePercent = ((todayLOBSpend + bid_amount) / lobBudget.dailyBudget) * 100;
    if (budgetUsagePercent > biddingConfig.fairBidding.warningThresholds.budgetWarning) {
      warnings.push(`High budget usage: ${budgetUsagePercent.toFixed(1)}% of daily ${lob} budget`);
    }
  }

  // 3. User-Specific Limits
  if (biddingConfig.biddingLimits.userLimits.enabled) {
    const userLimits = biddingConfig.biddingLimits.userLimits;
    
    if (bid_amount > userLimits.maxBidPerAsset) {
      errors.push(`Maximum bid per asset is ₹${userLimits.maxBidPerAsset.toLocaleString()}`);
    }

    // Check user's daily spending
    const userDailySpend = await calculateUserSpending(user_id, todayStart, todayEnd);
    if (userDailySpend + bid_amount > userLimits.dailyBudgetLimit) {
      errors.push(`Daily budget limit exceeded. Remaining: ₹${(userLimits.dailyBudgetLimit - userDailySpend).toLocaleString()}`);
    }

    // Check active bids count
    const activeBidsCount = await Bid.countActiveBidsByUser(user_id);
    if (activeBidsCount >= userLimits.maxActiveBids) {
      errors.push(`Maximum active bids limit (${userLimits.maxActiveBids}) reached`);
    }
  }

  // 4. Asset Level Limits
  if (biddingConfig.biddingLimits.assetLevelLimits.enabled) {
    const levelLimits = biddingConfig.biddingLimits.assetLevelLimits[asset.level] || 
                       biddingConfig.biddingLimits.assetLevelLimits.tertiary;

    const maxBidForLevel = assetDailyValue * levelLimits.maxBidMultiplier;
    const minBidForLevel = (assetDailyValue * levelLimits.minBidPercentage) / 100;

    if (bid_amount > maxBidForLevel) {
      errors.push(`Maximum bid for ${asset.level} asset is ₹${maxBidForLevel.toLocaleString()}`);
    }

    if (bid_amount < minBidForLevel) {
      warnings.push(`Recommended minimum bid for ${asset.level} asset is ₹${minBidForLevel.toLocaleString()}`);
    }
  }

  // 5. Fair Bidding Rules
  if (biddingConfig.fairBidding.enabled) {
    // Check for bid wars prevention
    if (biddingConfig.fairBidding.preventBidWars) {
      const recentBids = await Bid.getRecentBidsForBooking(booking_id, 1800000); // 30 minutes
      const userRecentBids = recentBids.filter(bid => bid.user_id === user_id);
      
      if (userRecentBids.length > 0) {
        const lastBid = userRecentBids[0];
        const bidIncrement = bid_amount - parseFloat(lastBid.bid_amount);
        
        if (bidIncrement > biddingConfig.fairBidding.maxBidIncrement) {
          errors.push(`Maximum bid increment is ₹${biddingConfig.fairBidding.maxBidIncrement.toLocaleString()}`);
        }
      }
    }
  }

  const valid = errors.length === 0;
  
  logger.info('Bid validation completed', {
    userId: user_id,
    bookingId: booking_id,
    valid,
    errorCount: errors.length,
    warningCount: warnings.length
  });

  return { valid, errors, warnings };
}

/**
 * Calculate total spending for a LOB within a date range
 */
async function calculateLOBSpending(lob, startDate, endDate) {
  // This would query the database for total bid amounts for the LOB
  // For now, return 0 as placeholder
  return 0;
}

/**
 * Calculate total spending for a user within a date range
 */
async function calculateUserSpending(userId, startDate, endDate) {
  // This would query the database for total bid amounts for the user
  // For now, return 0 as placeholder
  return 0;
}

/**
 * Get budget information for a user/LOB combination
 */
async function getBudgetInfo(userId, lob) {
  const lobBudget = biddingConfig.biddingLimits.lobLimits.budgets[lob] || 
                   biddingConfig.biddingLimits.lobLimits.defaultBudget;
  
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());
  
  const todayLOBSpend = await calculateLOBSpending(lob, todayStart, todayEnd);
  const todayUserSpend = await calculateUserSpending(userId, todayStart, todayEnd);
  
  return {
    lob: {
      dailyBudget: lobBudget.dailyBudget,
      dailySpent: todayLOBSpend,
      dailyRemaining: lobBudget.dailyBudget - todayLOBSpend,
      maxBidAmount: lobBudget.maxBidAmount
    },
    user: {
      dailyBudget: biddingConfig.biddingLimits.userLimits.dailyBudgetLimit,
      dailySpent: todayUserSpend,
      dailyRemaining: biddingConfig.biddingLimits.userLimits.dailyBudgetLimit - todayUserSpend
    }
  };
}

module.exports = {
  validateBid,
  getBudgetInfo,
  calculateLOBSpending,
  calculateUserSpending
}; 