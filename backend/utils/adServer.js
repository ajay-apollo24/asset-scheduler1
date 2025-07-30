// utils/adServer.js
const Asset = require('../models/Asset');
const Creative = require('../models/Creative');
const Campaign = require('../models/Campaign');
const AdRequest = require('../models/AdRequest');
const logger = require('./logger');
const cache = require('./cache');

const AdServer = {
  async selectCreative(asset_id, user_context, page_context) {
    try {
      // 1. Get available creatives for the asset (with caching)
      const cacheKey = `creative:asset:${asset_id}`;
      let creatives = await cache.get(cacheKey);
      if (!creatives) {
        creatives = await Creative.getApprovedCreativesForAsset(asset_id);
        await cache.set(cacheKey, creatives, 300);
      }
      
      if (creatives.length === 0) {
        logger.warn('No approved creatives found for asset', { asset_id });
        return null;
      }

      // 2. Apply targeting filters
      const targetedCreatives = [];
      for (const creative of creatives) {
        const targetingPassed = await this.applyTargeting(creative, user_context);
        if (targetingPassed) {
          targetedCreatives.push(creative);
        }
      }

      if (targetedCreatives.length === 0) {
        logger.warn('No creatives passed targeting for asset', { asset_id, user_context });
        return null;
      }

      // 3. Apply performance optimization (select best performing creative)
      const bestCreative = await this.selectBestCreative(targetedCreatives, user_context);
      
      return bestCreative;
    } catch (error) {
      logger.error('Error in selectCreative', { error: error.message, asset_id });
      return null;
    }
  },

  async applyTargeting(creative, user_context) {
    try {
      // Get campaign targeting criteria
      const campaign = await Campaign.findById(creative.campaign_id);
      if (!campaign || !campaign.targeting_criteria) {
        return true; // No targeting criteria means show to everyone
      }

      const targeting = campaign.targeting_criteria;

      // Geographic targeting
      if (targeting.geolocation && user_context.location) {
        const userCountry = user_context.location.country;
        if (!targeting.geolocation.includes(userCountry)) {
          return false;
        }
      }

      // Demographic targeting
      if (targeting.demographics && user_context.demographics) {
        const userAge = user_context.demographics.age;
        const userGender = user_context.demographics.gender;
        
        if (targeting.demographics.age_range) {
          const [minAge, maxAge] = targeting.demographics.age_range;
          if (userAge < minAge || userAge > maxAge) {
            return false;
          }
        }
        
        if (targeting.demographics.gender && !targeting.demographics.gender.includes(userGender)) {
          return false;
        }
      }

      // Interest targeting
      if (targeting.interests && user_context.interests) {
        const hasMatchingInterest = targeting.interests.some(interest => 
          user_context.interests.includes(interest)
        );
        if (!hasMatchingInterest) {
          return false;
        }
      }

      // Device targeting
      if (targeting.devices && user_context.device) {
        if (!targeting.devices.includes(user_context.device.type)) {
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('Error in applyTargeting', { error: error.message, creative_id: creative.id });
      return false;
    }
  },

  async selectBestCreative(creatives, user_context) {
    try {
      // Simple performance-based selection
      // In a real implementation, this would use ML models, A/B testing, etc.
      
      let bestCreative = creatives[0];
      let bestScore = 0;

      for (const creative of creatives) {
        const perfKey = `performance:creative:${creative.id}`;
        let metrics = await cache.get(perfKey);
        if (!metrics) {
          metrics = await Creative.getPerformanceMetrics(creative.id, '7d');
          await cache.set(perfKey, metrics, 1800);
        }
        const score = this.calculateCreativeScore(creative, metrics, user_context);
        
        if (score > bestScore) {
          bestScore = score;
          bestCreative = creative;
        }
      }

      return bestCreative;
    } catch (error) {
      logger.error('Error in selectBestCreative', { error: error.message });
      return creatives[0]; // Fallback to first creative
    }
  },

  calculateCreativeScore(creative, metrics, user_context) {
    // Simple scoring algorithm - can be enhanced with ML
    let score = 0;
    
    // Base score from CTR
    if (metrics.ctr > 0) {
      score += metrics.ctr * 100; // Convert percentage to points
    }
    
    // Recency bonus (newer creatives get slight boost)
    const daysSinceCreation = Math.floor((Date.now() - new Date(creative.created_at)) / (1000 * 60 * 60 * 24));
    if (daysSinceCreation < 7) {
      score += 10; // New creative bonus
    }
    
    // Performance volume bonus
    if (metrics.total_impressions > 1000) {
      score += 5; // High volume bonus
    }
    
    return score;
  },

  async calculateBid(asset_id, user_context, creative_id) {
    try {
      const asset = await Asset.findById(asset_id);
      const creative = await Creative.findById(creative_id);
      
      if (!asset || !creative) {
        return { bid_amount: 0, currency: 'USD', pricing_model: 'cpm' };
      }

      // Base pricing from asset
      let baseBid = asset.value_per_day / 24; // Convert daily value to hourly
      
      // Apply targeting multipliers
      const targetingMultiplier = this.calculateTargetingMultiplier(user_context);
      baseBid *= targetingMultiplier;
      
      // Apply performance multipliers
      const metrics = await Creative.getPerformanceMetrics(creative_id, '7d');
      const performanceMultiplier = this.calculatePerformanceMultiplier(metrics);
      baseBid *= performanceMultiplier;
      
      // Apply competition factors (time of day, day of week)
      const competitionMultiplier = this.calculateCompetitionMultiplier();
      baseBid *= competitionMultiplier;

      return {
        bid_amount: Math.round(baseBid * 100) / 100, // Round to 2 decimal places
        currency: 'USD',
        pricing_model: 'cpm'
      };
    } catch (error) {
      logger.error('Error in calculateBid', { error: error.message });
      return { bid_amount: 2.50, currency: 'USD', pricing_model: 'cpm' };
    }
  },

  calculateTargetingMultiplier(user_context) {
    let multiplier = 1.0;
    
    // Premium location multiplier
    if (user_context.location && ['US', 'CA', 'UK'].includes(user_context.location.country)) {
      multiplier *= 1.2;
    }
    
    // Premium demographic multiplier
    if (user_context.demographics && user_context.demographics.age >= 25 && user_context.demographics.age <= 54) {
      multiplier *= 1.1;
    }
    
    // Device multiplier
    if (user_context.device && user_context.device.type === 'desktop') {
      multiplier *= 1.05;
    }
    
    return multiplier;
  },

  calculatePerformanceMultiplier(metrics) {
    let multiplier = 1.0;
    
    // High CTR bonus
    if (metrics.ctr > 2.0) {
      multiplier *= 1.3;
    } else if (metrics.ctr > 1.0) {
      multiplier *= 1.1;
    }
    
    // High volume bonus
    if (metrics.total_impressions > 10000) {
      multiplier *= 1.05;
    }
    
    return multiplier;
  },

  calculateCompetitionMultiplier() {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    
    let multiplier = 1.0;
    
    // Peak hours (9 AM - 5 PM)
    if (hour >= 9 && hour <= 17) {
      multiplier *= 1.2;
    }
    
    // Weekday premium
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      multiplier *= 1.1;
    }
    
    return multiplier;
  },

  async validateAdRequest(asset_id, user_context, page_context) {
    try {
      const errors = [];
      
      // 1. Validate asset exists and is active
      const asset = await Asset.findById(asset_id);
      if (!asset) {
        errors.push('Asset not found');
      } else if (!asset.is_active) {
        errors.push('Asset is not active');
      }
      
      // 2. Validate user context
      if (!user_context || !user_context.ip) {
        errors.push('Invalid user context');
      }
      
      // 3. Check rate limiting (implement with Redis in production)
      const rateLimitPassed = await this.checkRateLimit(asset_id, user_context.ip);
      if (!rateLimitPassed) {
        errors.push('Rate limit exceeded');
      }
      
      // 4. Basic fraud detection
      const fraudCheck = await this.performFraudCheck(user_context, page_context);
      if (!fraudCheck.passed) {
        errors.push(fraudCheck.reason);
      }
      
      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      logger.error('Error in validateAdRequest', { error: error.message });
      return { valid: false, errors: ['Validation error'] };
    }
  },

  async checkRateLimit(asset_id, ip) {
    try {
      const key = `rate:${asset_id}:${ip}`;
      const count = (await cache.get(key)) || 0;
      if (count >= 1000) {
        return false;
      }
      await cache.set(key, count + 1, 60);
      return true;
    } catch (error) {
      logger.error('Rate limit check error', { error: error.message });
      return true;
    }
  },

  async performFraudCheck(user_context, page_context) {
    // Basic fraud detection
    const checks = {
      passed: true,
      reason: null
    };
    
    // Check for suspicious IP patterns
    if (user_context.ip && user_context.ip.startsWith('192.168.')) {
      checks.passed = false;
      checks.reason = 'Internal IP address';
    }
    
    // Check for missing user agent
    if (!user_context.user_agent || user_context.user_agent.length < 10) {
      checks.passed = false;
      checks.reason = 'Invalid user agent';
    }
    
    return checks;
  },

  async generateTrackingUrls(ad_id, creative_id) {
    const baseUrl = process.env.TRACKING_BASE_URL || 'https://tracking.example.com';
    
    return {
      impression_url: `${baseUrl}/impression/${ad_id}?creative=${creative_id}`,
      click_url: `${baseUrl}/click/${ad_id}?creative=${creative_id}`,
      viewability_url: `${baseUrl}/viewability/${ad_id}?creative=${creative_id}`
    };
  },

  async updatePerformanceMetrics(creative_id, event_type, metadata = {}) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get current metrics for today
      const result = await db.query(
        'SELECT * FROM performance_metrics WHERE creative_id = $1 AND date = $2',
        [creative_id, today]
      );
      
      if (result.rows.length === 0) {
        // Create new record for today
        await db.query(
          'INSERT INTO performance_metrics (creative_id, date, impressions, clicks, revenue) VALUES ($1, $2, 0, 0, 0)',
          [creative_id, today]
        );
      }
      
      // Update metrics based on event type
      let updateQuery = '';
      if (event_type === 'impression') {
        updateQuery = 'UPDATE performance_metrics SET impressions = impressions + 1 WHERE creative_id = $1 AND date = $2';
      } else if (event_type === 'click') {
        updateQuery = 'UPDATE performance_metrics SET clicks = clicks + 1 WHERE creative_id = $1 AND date = $2';
      }
      
      if (updateQuery) {
        await db.query(updateQuery, [creative_id, today]);
      }
      
      return { success: true };
    } catch (error) {
      logger.error('Error in updatePerformanceMetrics', { error: error.message, creative_id, event_type });
      return { success: false };
    }
  }
};

module.exports = AdServer; 