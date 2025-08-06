// Enhanced Bidding Routes
// This module provides routes for the enhanced fairness bidding system
// It integrates ROI normalization and sophisticated fairness scoring

const express = require('express');
const router = express.Router();
const EnhancedBiddingController = require('../controllers/enhancedBiddingController');
const auth = require('../../shared/middleware/auth');
const authorize = require('../../shared/middleware/authorize');

// Enhanced bidding endpoints with fairness system integration

/**
 * POST /api/enhanced-bidding/bids
 * Place a bid using enhanced fairness system
 * This endpoint uses ROI normalization and sophisticated fairness scoring
 * 
 * Request Body:
 * {
 *   "booking_id": 123,
 *   "bid_amount": 1000.00,
 *   "max_bid": 1500.00,        // Optional: for auto-bidding
 *   "bid_reason": "Q4 campaign",
 *   "campaign_type": "internal" // "internal" or "external"
 * }
 * 
 * Response:
 * {
 *   "message": "Enhanced bid placed successfully",
 *   "bid": {
 *     "id": 456,
 *     "bid_amount": 1000.00,
 *     "fairness_score": 1.85,
 *     "status": "active"
 *   },
 *   "warnings": []
 * }
 */
router.post('/bids', 
  auth, 
  authorize(['user', 'admin', 'manager']), 
  EnhancedBiddingController.placeEnhancedBid
);

/**
 * POST /api/enhanced-bidding/bookings/:booking_id/auction/start
 * Start an enhanced auction with fairness considerations
 * This ensures proper slot allocation and fairness tracking
 * 
 * Response:
 * {
 *   "message": "Enhanced auction started successfully",
 *   "auctionStatus": "active",
 *   "bookingId": 123
 * }
 */
router.post('/bookings/:booking_id/auction/start',
  auth,
  authorize(['user', 'admin', 'manager']),
  EnhancedBiddingController.startEnhancedAuction
);

/**
 * POST /api/enhanced-bidding/bookings/:booking_id/auction/end
 * End an enhanced auction with fairness-based winner selection
 * This uses sophisticated fairness scoring to select the winner
 * 
 * Response:
 * {
 *   "message": "Enhanced auction completed successfully",
 *   "winner": {
 *     "id": 456,
 *     "user_id": 789,
 *     "lob": "Pharmacy",
 *     "bid_amount": 1000.00,
 *     "fairness_score": 1.85
 *   },
 *   "totalBids": 5,
 *   "allocationBreakdown": {
 *     "total_bids": 5,
 *     "internal_bids": 4,
 *     "monetization_bids": 1,
 *     "avg_bid_amount": 850.00
 *   }
 * }
 */
router.post('/bookings/:booking_id/auction/end',
  auth,
  authorize(['user', 'admin', 'manager']),
  EnhancedBiddingController.endEnhancedAuction
);

/**
 * GET /api/enhanced-bidding/bookings/:booking_id/bids
 * Get all bids for a booking with enhanced fairness scores
 * This includes ROI normalization and fairness breakdown
 * 
 * Response:
 * {
 *   "bids": [
 *     {
 *       "id": 456,
 *       "user_id": 789,
 *       "lob": "Pharmacy",
 *       "bid_amount": 1000.00,
 *       "fairness_score": 1.85,
 *       "normalized_roi": 1.2,
 *       "strategic_weight": 1.4,
 *       "time_fairness": 1.3
 *     }
 *   ],
 *   "totalBids": 5,
 *   "fairnessBreakdown": {
 *     "highestScore": 1.85,
 *     "lowestScore": 0.95,
 *     "avgScore": 1.45
 *   }
 * }
 */
router.get('/bookings/:booking_id/bids',
  auth,
  authorize(['user', 'admin', 'manager']),
  async (req, res) => {
    try {
      const { booking_id } = req.params;
      const bids = await EnhancedBiddingController.getBidsWithFairnessScores(booking_id);
      
      // Calculate fairness breakdown
      const fairnessScores = bids.map(bid => bid.final_fairness_score || 0).filter(score => score > 0);
      const fairnessBreakdown = {
        highestScore: Math.max(...fairnessScores, 0),
        lowestScore: Math.min(...fairnessScores, 0),
        avgScore: fairnessScores.length > 0 ? fairnessScores.reduce((a, b) => a + b, 0) / fairnessScores.length : 0
      };

      res.json({
        bids,
        totalBids: bids.length,
        fairnessBreakdown
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to get bids with fairness scores' });
    }
  }
);

/**
 * GET /api/enhanced-bidding/fairness-analysis
 * Get enhanced fairness analysis for LOBs and assets
 * This provides insights into fairness distribution and ROI normalization
 * 
 * Query Parameters:
 * - lob: Line of Business filter
 * - asset_id: Asset ID filter
 * - date_range: Number of days to analyze (default: 30)
 * 
 * Response:
 * {
 *   "fairnessAnalysis": [
 *     {
 *       "lob": "Pharmacy",
 *       "asset_id": 123,
 *       "avg_fairness_score": 1.45,
 *       "total_bids": 25,
 *       "avg_roi": 1.2,
 *       "avg_strategic_weight": 1.4
 *     }
 *   ],
 *   "summary": {
 *     "totalRecords": 10,
 *     "dateRange": "30",
 *     "lob": "all",
 *     "assetId": "all"
 *   }
 * }
 */
router.get('/fairness-analysis',
  auth,
  authorize(['admin', 'analyst', 'manager']),
  EnhancedBiddingController.getFairnessAnalysis
);

/**
 * GET /api/enhanced-bidding/slot-allocation/:asset_id
 * Get current slot allocation for an asset
 * This shows how slots are distributed between internal and external campaigns
 * Now uses asset-specific configuration with fallback to asset level defaults
 * 
 * Response:
 * {
 *   "slotAllocation": {
 *     "total_slots": 10,
 *     "internal_slots_allocated": 6,
 *     "external_slots_allocated": 3,
 *     "monetization_slots_allocated": 1,
 *     "internal_percentage": 60.0,
 *     "external_percentage": 30.0,
 *     "monetization_percentage": 10.0
 *   },
 *   "limits": {
 *     "internal_limit": 60,
 *     "external_limit": 40,
 *     "monetization_limit": 20,
 *     "isAssetSpecific": true,
 *     "assetLevel": "primary"
 *   }
 * }
 */
router.get('/slot-allocation/:asset_id',
  auth,
  authorize(['user', 'admin', 'manager']),
  async (req, res) => {
    try {
      const { asset_id } = req.params;
      const { date = new Date().toISOString().split('T')[0] } = req.query;

      const result = await db.query(`
        SELECT 
          sa.total_slots,
          sa.internal_slots_allocated,
          sa.external_slots_allocated,
          sa.monetization_slots_allocated,
          sa.internal_percentage,
          sa.external_percentage,
          sa.monetization_percentage
        FROM slot_allocation sa
        WHERE sa.asset_id = $1 AND sa.date = $2
      `, [asset_id, date]);

      const slotAllocation = result.rows[0] || {
        total_slots: 0,
        internal_slots_allocated: 0,
        external_slots_allocated: 0,
        monetization_slots_allocated: 0,
        internal_percentage: 0,
        external_percentage: 0,
        monetization_percentage: 0
      };

      // Get asset details and asset-specific configuration
      const assetResult = await db.query(`
        SELECT id, name, level FROM assets WHERE id = $1
      `, [asset_id]);

      if (assetResult.rows.length === 0) {
        return res.status(404).json({ message: 'Asset not found' });
      }

      const asset = assetResult.rows[0];

      // Get asset-specific monetization limits
      const assetConfigResult = await db.query(`
        SELECT 
          monetization_slot_limit,
          internal_slot_guarantee,
          external_slot_limit
        FROM asset_monetization_limits
        WHERE asset_id = $1 AND is_active = true
      `, [asset_id]);

      let limits;
      let isAssetSpecific = false;

      if (assetConfigResult.rows.length > 0) {
        // Use asset-specific configuration
        const config = assetConfigResult.rows[0];
        limits = {
          internal_limit: Math.round(config.internal_slot_guarantee * 100),
          external_limit: Math.round(config.external_slot_limit * 100),
          monetization_limit: Math.round(config.monetization_slot_limit * 100),
          isAssetSpecific: true,
          assetLevel: asset.level
        };
        isAssetSpecific = true;
      } else {
        // Fall back to asset level defaults
        const assetLevel = asset.level || 'secondary';
        limits = {
          internal_limit: assetLevel === 'primary' ? 60 : assetLevel === 'secondary' ? 70 : 80,
          external_limit: assetLevel === 'primary' ? 40 : assetLevel === 'secondary' ? 30 : 20,
          monetization_limit: assetLevel === 'primary' ? 20 : assetLevel === 'secondary' ? 15 : 10,
          isAssetSpecific: false,
          assetLevel: assetLevel
        };
      }

      res.json({
        slotAllocation,
        limits,
        asset: {
          id: asset.id,
          name: asset.name,
          level: asset.level
        },
        date,
        isAssetSpecific
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to get slot allocation' });
    }
  }
);

/**
 * GET /api/enhanced-bidding/bid-caps
 * Get bid caps and restrictions for different LOBs
 * This shows the maximum bid multipliers and slot limits
 * 
 * Response:
 * {
 *   "bidCaps": [
 *     {
 *       "lob": "Monetization",
 *       "asset_level": "primary",
 *       "max_bid_multiplier": 1.2,
 *       "slot_limit_percentage": 20.0,
 *       "time_restriction": "business_hours"
 *     }
 *   ]
 * }
 */
router.get('/bid-caps',
  auth,
  authorize(['user', 'admin', 'manager']),
  async (req, res) => {
    try {
      const result = await db.query(`
        SELECT 
          lob,
          asset_level,
          max_bid_multiplier,
          slot_limit_percentage,
          time_restriction,
          revenue_floor
        FROM bid_caps
        WHERE is_active = true
        ORDER BY lob, asset_level
      `);

      res.json({
        bidCaps: result.rows
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to get bid caps' });
    }
  }
);

/**
 * GET /api/enhanced-bidding/roi-metrics/:campaign_id
 * Get ROI metrics for a specific campaign
 * This shows the normalized ROI calculation and performance metrics
 * 
 * Response:
 * {
 *   "roiMetrics": {
 *     "lob": "AI Bot",
 *     "type": "engagement",
 *     "conversion_window": 30,
 *     "normalized_roi": 1.2,
 *     "target_metric": "user_interactions",
 *     "actual_value": 1200,
 *     "target_value": 1000,
 *     "performance_ratio": 1.2
 *   },
 *   "metrics": {
 *     "engagement": {
 *       "user_interactions": 1200,
 *       "unique_users": 800,
 *       "avg_time_spent_seconds": 150
 *     },
 *     "conversion": {
 *       "total_conversions": 0,
 *       "conversion_rate": 0
 *     },
 *     "revenue": {
 *       "daily_revenue": 0,
 *       "revenue_efficiency": 0
 *     }
 *   }
 * }
 */
router.get('/roi-metrics/:campaign_id',
  auth,
  authorize(['user', 'admin', 'manager']),
  async (req, res) => {
    try {
      const { campaign_id } = req.params;
      const { days = 30 } = req.query;

      // Get campaign details
      const campaignResult = await db.query(`
        SELECT lob, asset_id FROM campaigns WHERE id = $1
      `, [campaign_id]);

      if (campaignResult.rows.length === 0) {
        return res.status(404).json({ message: 'Campaign not found' });
      }

      const campaign = campaignResult.rows[0];

      // Get ROI configuration
      const roiConfig = {
        'Monetization': { type: 'immediate_revenue', target_metric: 'revenue_per_day', target_value: 1000 },
        'AI Bot': { type: 'engagement', target_metric: 'user_interactions', target_value: 1000 },
        'Lab Test': { type: 'conversion', target_metric: 'bookings', target_value: 50 },
        'Pharmacy': { type: 'revenue', target_metric: 'revenue_per_day', target_value: 5000 },
        'Diagnostics': { type: 'conversion', target_metric: 'test_bookings', target_value: 30 }
      };

      const config = roiConfig[campaign.lob] || { type: 'unknown', target_metric: 'unknown', target_value: 0 };

      // Get actual metrics
      const engagementResult = await db.query(`
        SELECT 
          SUM(user_interactions) as total_interactions,
          SUM(unique_users) as total_users,
          AVG(avg_time_spent_seconds) as avg_time_spent
        FROM engagement_metrics
        WHERE campaign_id = $1 AND date >= CURRENT_DATE - INTERVAL '1 day' * $2
      `, [campaign_id, days]);

      const conversionResult = await db.query(`
        SELECT 
          SUM(total_conversions) as total_conversions,
          AVG(conversion_rate) as avg_conversion_rate
        FROM conversion_metrics
        WHERE campaign_id = $1 AND date >= CURRENT_DATE - INTERVAL '1 day' * $2
      `, [campaign_id, days]);

      const revenueResult = await db.query(`
        SELECT 
          SUM(daily_revenue) as total_revenue,
          AVG(revenue_efficiency) as avg_revenue_efficiency
        FROM revenue_metrics
        WHERE campaign_id = $1 AND date >= CURRENT_DATE - INTERVAL '1 day' * $2
      `, [campaign_id, days]);

      // Calculate normalized ROI
      let actualValue = 0;
      let performanceRatio = 0;

      switch (config.type) {
        case 'immediate_revenue':
        case 'revenue':
          actualValue = revenueResult.rows[0]?.total_revenue || 0;
          break;
        case 'engagement':
          actualValue = engagementResult.rows[0]?.total_interactions || 0;
          break;
        case 'conversion':
          actualValue = conversionResult.rows[0]?.total_conversions || 0;
          break;
      }

      performanceRatio = config.target_value > 0 ? actualValue / config.target_value : 0;

      res.json({
        roiMetrics: {
          lob: campaign.lob,
          type: config.type,
          conversion_window: config.type === 'immediate_revenue' ? 0 : 30,
          normalized_roi: Math.min(performanceRatio, 2.0),
          target_metric: config.target_metric,
          actual_value: actualValue,
          target_value: config.target_value,
          performance_ratio: performanceRatio
        },
        metrics: {
          engagement: {
            user_interactions: engagementResult.rows[0]?.total_interactions || 0,
            unique_users: engagementResult.rows[0]?.total_users || 0,
            avg_time_spent_seconds: engagementResult.rows[0]?.avg_time_spent || 0
          },
          conversion: {
            total_conversions: conversionResult.rows[0]?.total_conversions || 0,
            conversion_rate: conversionResult.rows[0]?.avg_conversion_rate || 0
          },
          revenue: {
            daily_revenue: revenueResult.rows[0]?.total_revenue || 0,
            revenue_efficiency: revenueResult.rows[0]?.avg_revenue_efficiency || 0
          }
        }
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to get ROI metrics' });
    }
  }
);

/**
 * GET /api/enhanced-bidding/asset-config/:asset_id
 * Get asset-specific configuration including monetization limits and fairness settings
 * 
 * Response:
 * {
 *   "assetConfig": {
 *     "assetId": 123,
 *     "monetizationLimit": {
 *       "monetization_slot_limit": 0.25,
 *       "internal_slot_guarantee": 0.65,
 *       "external_slot_limit": 0.35,
 *       "is_active": true
 *     },
 *     "fairnessConfig": {
 *       "strategic_weight_override": 1.3,
 *       "time_decay_factor": 0.15,
 *       "revenue_floor": 1.8,
 *       "fairness_bonus": 0.4,
 *       "is_active": true
 *     },
 *     "defaults": {
 *       "assetLevel": "primary",
 *       "defaultMonetizationLimit": 0.2,
 *       "defaultInternalGuarantee": 0.6,
 *       "defaultExternalLimit": 0.4
 *     }
 *   }
 * }
 */
router.get('/asset-config/:asset_id',
  auth,
  authorize(['admin', 'manager']),
  async (req, res) => {
    try {
      const { asset_id } = req.params;

      // Get asset details
      const assetResult = await db.query(`
        SELECT id, name, level FROM assets WHERE id = $1
      `, [asset_id]);

      if (assetResult.rows.length === 0) {
        return res.status(404).json({ message: 'Asset not found' });
      }

      const asset = assetResult.rows[0];

      // Get asset-specific monetization limits
      const monetizationResult = await db.query(`
        SELECT 
          monetization_slot_limit,
          internal_slot_guarantee,
          external_slot_limit,
          is_active
        FROM asset_monetization_limits
        WHERE asset_id = $1
      `, [asset_id]);

      // Get asset-specific fairness config
      const fairnessResult = await db.query(`
        SELECT 
          strategic_weight_override,
          time_decay_factor,
          revenue_floor,
          fairness_bonus,
          is_active
        FROM asset_fairness_config
        WHERE asset_id = $1
      `, [asset_id]);

      // Calculate defaults based on asset level
      const defaults = {
        assetLevel: asset.level,
        defaultMonetizationLimit: asset.level === 'primary' ? 0.2 : asset.level === 'secondary' ? 0.15 : 0.1,
        defaultInternalGuarantee: asset.level === 'primary' ? 0.6 : asset.level === 'secondary' ? 0.7 : 0.8,
        defaultExternalLimit: asset.level === 'primary' ? 0.4 : asset.level === 'secondary' ? 0.3 : 0.2
      };

      res.json({
        assetConfig: {
          assetId: parseInt(asset_id),
          assetName: asset.name,
          monetizationLimit: monetizationResult.rows[0] || null,
          fairnessConfig: fairnessResult.rows[0] || null,
          defaults
        }
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to get asset configuration' });
    }
  }
);

/**
 * POST /api/enhanced-bidding/asset-config/:asset_id/monetization
 * Set asset-specific monetization slot limits
 * 
 * Request Body:
 * {
 *   "monetization_slot_limit": 0.25,    // 25% for monetization
 *   "internal_slot_guarantee": 0.65,    // 65% guaranteed for internal teams
 *   "external_slot_limit": 0.35,        // 35% for external campaigns
 *   "is_active": true
 * }
 * 
 * Response:
 * {
 *   "message": "Asset monetization limits updated successfully",
 *   "config": {
 *     "asset_id": 123,
 *     "monetization_slot_limit": 0.25,
 *     "internal_slot_guarantee": 0.65,
 *     "external_slot_limit": 0.35,
 *     "is_active": true
 *   }
 * }
 */
router.post('/asset-config/:asset_id/monetization',
  auth,
  authorize(['admin']),
  async (req, res) => {
    try {
      const { asset_id } = req.params;
      const { 
        monetization_slot_limit, 
        internal_slot_guarantee, 
        external_slot_limit, 
        is_active = true 
      } = req.body;

      // Validate asset exists
      const assetResult = await db.query(`
        SELECT id FROM assets WHERE id = $1
      `, [asset_id]);

      if (assetResult.rows.length === 0) {
        return res.status(404).json({ message: 'Asset not found' });
      }

      // Validate input constraints
      if (monetization_slot_limit < 0 || monetization_slot_limit > 1) {
        return res.status(400).json({ message: 'Monetization slot limit must be between 0 and 1' });
      }

      if (internal_slot_guarantee < 0 || internal_slot_guarantee > 1) {
        return res.status(400).json({ message: 'Internal slot guarantee must be between 0 and 1' });
      }

      if (external_slot_limit < 0 || external_slot_limit > 1) {
        return res.status(400).json({ message: 'External slot limit must be between 0 and 1' });
      }

      if ((internal_slot_guarantee + external_slot_limit) > 1) {
        return res.status(400).json({ message: 'Total allocation cannot exceed 100%' });
      }

      // Insert or update asset-specific monetization limits
      const result = await db.query(`
        INSERT INTO asset_monetization_limits (
          asset_id, monetization_slot_limit, internal_slot_guarantee, 
          external_slot_limit, is_active
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (asset_id)
        DO UPDATE SET
          monetization_slot_limit = EXCLUDED.monetization_slot_limit,
          internal_slot_guarantee = EXCLUDED.internal_slot_guarantee,
          external_slot_limit = EXCLUDED.external_slot_limit,
          is_active = EXCLUDED.is_active,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `, [asset_id, monetization_slot_limit, internal_slot_guarantee, external_slot_limit, is_active]);

      res.json({
        message: 'Asset monetization limits updated successfully',
        config: result.rows[0]
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update asset monetization limits' });
    }
  }
);

/**
 * POST /api/enhanced-bidding/asset-config/:asset_id/fairness
 * Set asset-specific fairness configuration
 * 
 * Request Body:
 * {
 *   "strategic_weight_override": 1.3,   // Optional: override strategic weight
 *   "time_decay_factor": 0.15,          // Custom time decay factor
 *   "revenue_floor": 1.8,               // Custom revenue floor for monetization
 *   "fairness_bonus": 0.4,              // Custom fairness bonus
 *   "is_active": true
 * }
 * 
 * Response:
 * {
 *   "message": "Asset fairness configuration updated successfully",
 *   "config": {
 *     "asset_id": 123,
 *     "strategic_weight_override": 1.3,
 *     "time_decay_factor": 0.15,
 *     "revenue_floor": 1.8,
 *     "fairness_bonus": 0.4,
 *     "is_active": true
 *   }
 * }
 */
router.post('/asset-config/:asset_id/fairness',
  auth,
  authorize(['admin']),
  async (req, res) => {
    try {
      const { asset_id } = req.params;
      const { 
        strategic_weight_override, 
        time_decay_factor = 0.1, 
        revenue_floor = 1.5, 
        fairness_bonus = 0.3, 
        is_active = true 
      } = req.body;

      // Validate asset exists
      const assetResult = await db.query(`
        SELECT id FROM assets WHERE id = $1
      `, [asset_id]);

      if (assetResult.rows.length === 0) {
        return res.status(404).json({ message: 'Asset not found' });
      }

      // Validate input constraints
      if (strategic_weight_override !== null && (strategic_weight_override < 0.1 || strategic_weight_override > 5.0)) {
        return res.status(400).json({ message: 'Strategic weight override must be between 0.1 and 5.0' });
      }

      if (time_decay_factor < 0 || time_decay_factor > 1) {
        return res.status(400).json({ message: 'Time decay factor must be between 0 and 1' });
      }

      if (revenue_floor < 0.5 || revenue_floor > 5.0) {
        return res.status(400).json({ message: 'Revenue floor must be between 0.5 and 5.0' });
      }

      if (fairness_bonus < 0 || fairness_bonus > 2.0) {
        return res.status(400).json({ message: 'Fairness bonus must be between 0 and 2.0' });
      }

      // Insert or update asset-specific fairness config
      const result = await db.query(`
        INSERT INTO asset_fairness_config (
          asset_id, strategic_weight_override, time_decay_factor, 
          revenue_floor, fairness_bonus, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (asset_id)
        DO UPDATE SET
          strategic_weight_override = EXCLUDED.strategic_weight_override,
          time_decay_factor = EXCLUDED.time_decay_factor,
          revenue_floor = EXCLUDED.revenue_floor,
          fairness_bonus = EXCLUDED.fairness_bonus,
          is_active = EXCLUDED.is_active,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `, [asset_id, strategic_weight_override, time_decay_factor, revenue_floor, fairness_bonus, is_active]);

      res.json({
        message: 'Asset fairness configuration updated successfully',
        config: result.rows[0]
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update asset fairness configuration' });
    }
  }
);

/**
 * DELETE /api/enhanced-bidding/asset-config/:asset_id/monetization
 * Remove asset-specific monetization limits (fall back to asset level defaults)
 * 
 * Response:
 * {
 *   "message": "Asset monetization limits removed, using asset level defaults"
 * }
 */
router.delete('/asset-config/:asset_id/monetization',
  auth,
  authorize(['admin']),
  async (req, res) => {
    try {
      const { asset_id } = req.params;

      // Delete asset-specific monetization limits
      await db.query(`
        DELETE FROM asset_monetization_limits WHERE asset_id = $1
      `, [asset_id]);

      res.json({
        message: 'Asset monetization limits removed, using asset level defaults'
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to remove asset monetization limits' });
    }
  }
);

/**
 * DELETE /api/enhanced-bidding/asset-config/:asset_id/fairness
 * Remove asset-specific fairness configuration (fall back to defaults)
 * 
 * Response:
 * {
 *   "message": "Asset fairness configuration removed, using defaults"
 * }
 */
router.delete('/asset-config/:asset_id/fairness',
  auth,
  authorize(['admin']),
  async (req, res) => {
    try {
      const { asset_id } = req.params;

      // Delete asset-specific fairness config
      await db.query(`
        DELETE FROM asset_fairness_config WHERE asset_id = $1
      `, [asset_id]);

      res.json({
        message: 'Asset fairness configuration removed, using defaults'
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to remove asset fairness configuration' });
    }
  }
);

/**
 * GET /api/enhanced-bidding/asset-config
 * Get all assets with their custom configurations
 * 
 * Query Parameters:
 * - has_custom_config: Filter assets with custom configuration
 * 
 * Response:
 * {
 *   "assets": [
 *     {
 *       "assetId": 123,
 *       "assetName": "Homepage Banner",
 *       "assetLevel": "primary",
 *       "hasMonetizationConfig": true,
 *       "hasFairnessConfig": false,
 *       "monetizationLimit": 0.25,
 *       "internalGuarantee": 0.65
 *     }
 *   ]
 * }
 */
router.get('/asset-config',
  auth,
  authorize(['admin', 'manager']),
  async (req, res) => {
    try {
      const { has_custom_config } = req.query;

      let query = `
        SELECT 
          a.id as asset_id,
          a.name as asset_name,
          a.level as asset_level,
          CASE WHEN aml.asset_id IS NOT NULL THEN true ELSE false END as has_monetization_config,
          CASE WHEN afc.asset_id IS NOT NULL THEN true ELSE false END as has_fairness_config,
          aml.monetization_slot_limit,
          aml.internal_slot_guarantee,
          afc.strategic_weight_override
        FROM assets a
        LEFT JOIN asset_monetization_limits aml ON a.id = aml.asset_id AND aml.is_active = true
        LEFT JOIN asset_fairness_config afc ON a.id = afc.asset_id AND afc.is_active = true
        WHERE a.is_active = true
      `;

      if (has_custom_config === 'true') {
        query += ` AND (aml.asset_id IS NOT NULL OR afc.asset_id IS NOT NULL)`;
      }

      query += ` ORDER BY a.level, a.name`;

      const result = await db.query(query);

      const assets = result.rows.map(row => ({
        assetId: row.asset_id,
        assetName: row.asset_name,
        assetLevel: row.asset_level,
        hasMonetizationConfig: row.has_monetization_config,
        hasFairnessConfig: row.has_fairness_config,
        monetizationLimit: row.monetization_slot_limit,
        internalGuarantee: row.internal_slot_guarantee,
        strategicWeightOverride: row.strategic_weight_override
      }));

      res.json({
        assets,
        summary: {
          totalAssets: assets.length,
          assetsWithCustomConfig: assets.filter(a => a.hasMonetizationConfig || a.hasFairnessConfig).length,
          assetsWithMonetizationConfig: assets.filter(a => a.hasMonetizationConfig).length,
          assetsWithFairnessConfig: assets.filter(a => a.hasFairnessConfig).length
        }
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to get asset configurations' });
    }
  }
);

module.exports = router; 