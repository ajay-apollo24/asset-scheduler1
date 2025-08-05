// controllers/unifiedCampaignController.js
const UnifiedCampaign = require('../models/UnifiedCampaign');
const Asset = require('../../asset-booking/models/Asset');
const AuditLog = require('../../shared/models/AuditLog');
const logger = require('../../shared/utils/logger');
const { validateBookingRules } = require('../../asset-booking/utils/ruleEngine');
const biddingValidation = require('../../asset-booking/utils/biddingValidation');

const UnifiedCampaignController = {
  /**
   * Create a new unified campaign (internal booking or external campaign)
   */
  async create(req, res) {
    const {
      advertiser_type = 'external',
      name,
      title,
      asset_id,
      budget = 0,
      start_date,
      end_date,
      lob,
      purpose,
      creative_url,
      targeting_criteria = {},
      goal_type,
      goal_value,
      priority_weight = 1.00,
      bidding_strategy = 'manual'
    } = req.body;

    const user_id = req.user.user_id;
    const startTime = Date.now();

    logger.info('Unified campaign creation attempted', {
      userId: user_id,
      advertiserType: advertiser_type,
      assetId: asset_id,
      name,
      startDate: start_date,
      endDate: end_date
    });

    try {
      // Validate required fields based on advertiser type
      if (advertiser_type === 'internal') {
        if (!asset_id || !title || !lob || !purpose || !start_date || !end_date) {
          return res.status(400).json({ 
            message: 'For internal campaigns, asset_id, title, lob, purpose, start_date, and end_date are required' 
          });
        }
      } else {
        if (!name || !start_date || !end_date) {
          return res.status(400).json({ 
            message: 'For external campaigns, name, start_date, and end_date are required' 
          });
        }
      }

      // Validate asset exists if asset_id is provided
      if (asset_id) {
        const asset = await Asset.findById(asset_id);
        if (!asset) {
          return res.status(404).json({ message: 'Asset not found' });
        }
      }

      // Check for conflicts if asset_id is provided
      if (asset_id) {
        const conflicts = await UnifiedCampaign.findConflicts(asset_id, start_date, end_date);
        if (conflicts.length > 0) {
          return res.status(409).json({ 
            message: 'Asset is already booked for the given dates', 
            conflicts 
          });
        }

        // Apply rule engine validation for internal campaigns
        if (advertiser_type === 'internal') {
          const ruleErrors = await validateBookingRules({ 
            asset_id, lob, purpose, start_date, end_date 
          });
          
          if (ruleErrors.length > 0) {
            return res.status(422).json({ 
              message: 'Rule validation failed', 
              errors: ruleErrors 
            });
          }
        }
      }

      // Create the unified campaign
      const campaign = await UnifiedCampaign.create({
        advertiser_id: user_id,
        advertiser_type,
        name: advertiser_type === 'internal' ? title : name,
        title,
        asset_id,
        budget,
        start_date,
        end_date,
        status: 'pending',
        lob,
        purpose,
        creative_url,
        targeting_criteria,
        goal_type,
        goal_value,
        priority_weight,
        bidding_strategy
      });

      // Log audit
      await AuditLog.create({
        user_id,
        action: 'CREATE_CAMPAIGN',
        entity_type: 'campaign',
        entity_id: campaign.id,
        metadata: {
          advertiser_type,
          asset_id,
          budget,
          start_date,
          end_date
        }
      });

      logger.info('Unified campaign created successfully', {
        campaignId: campaign.id,
        advertiserType: advertiser_type,
        duration: Date.now() - startTime
      });

      res.status(201).json({
        message: 'Campaign created successfully',
        campaign
      });

    } catch (error) {
      logger.error('Failed to create unified campaign', {
        error: error.message,
        userId: user_id,
        advertiserType: advertiser_type
      });
      res.status(500).json({ message: 'Failed to create campaign' });
    }
  },

  /**
   * Get campaigns by type
   */
  async getCampaigns(req, res) {
    const { advertiser_type, status, limit } = req.query;
    const user_id = req.user.user_id;

    try {
      let campaigns;
      
      if (advertiser_type) {
        campaigns = await UnifiedCampaign.findByAdvertiserType(advertiser_type, {
          status,
          advertiser_id: user_id,
          limit: limit ? parseInt(limit) : null
        });
      } else {
        // Get both internal and external campaigns
        const internal = await UnifiedCampaign.findByAdvertiserType('internal', {
          status,
          advertiser_id: user_id
        });
        const external = await UnifiedCampaign.findByAdvertiserType('external', {
          status,
          advertiser_id: user_id
        });
        campaigns = [...internal, ...external];
      }

      res.json({
        campaigns,
        total: campaigns.length
      });

    } catch (error) {
      logger.error('Failed to fetch campaigns', { error: error.message });
      res.status(500).json({ message: 'Failed to fetch campaigns' });
    }
  },

  /**
   * Get campaign by ID
   */
  async getCampaign(req, res) {
    const { id } = req.params;

    try {
      const campaign = await UnifiedCampaign.findById(id);
      
      if (!campaign) {
        return res.status(404).json({ message: 'Campaign not found' });
      }

      res.json({ campaign });

    } catch (error) {
      logger.error('Failed to fetch campaign', { error: error.message, campaignId: id });
      res.status(500).json({ message: 'Failed to fetch campaign' });
    }
  },

  /**
   * Update campaign
   */
  async updateCampaign(req, res) {
    const { id } = req.params;
    const updates = req.body;
    const user_id = req.user.user_id;

    try {
      const campaign = await UnifiedCampaign.findById(id);
      
      if (!campaign) {
        return res.status(404).json({ message: 'Campaign not found' });
      }

      // Check if user can update this campaign
      if (campaign.advertiser_id !== user_id) {
        return res.status(403).json({ message: 'Not authorized to update this campaign' });
      }

      // Validate conflicts if dates or asset are being updated
      if ((updates.start_date || updates.end_date || updates.asset_id) && campaign.asset_id) {
        const start_date = updates.start_date || campaign.start_date;
        const end_date = updates.end_date || campaign.end_date;
        const asset_id = updates.asset_id || campaign.asset_id;

        const conflicts = await UnifiedCampaign.findConflicts(asset_id, start_date, end_date, id);
        if (conflicts.length > 0) {
          return res.status(409).json({ 
            message: 'Asset is already booked for the given dates', 
            conflicts 
          });
        }
      }

      const updatedCampaign = await UnifiedCampaign.update(id, updates);

      // Log audit
      await AuditLog.create({
        user_id,
        action: 'UPDATE_CAMPAIGN',
        entity_type: 'campaign',
        entity_id: id,
        metadata: { updates }
      });

      res.json({
        message: 'Campaign updated successfully',
        campaign: updatedCampaign
      });

    } catch (error) {
      logger.error('Failed to update campaign', { error: error.message, campaignId: id });
      res.status(500).json({ message: 'Failed to update campaign' });
    }
  },

  /**
   * Delete campaign
   */
  async deleteCampaign(req, res) {
    const { id } = req.params;
    const user_id = req.user.user_id;

    try {
      const campaign = await UnifiedCampaign.findById(id);
      
      if (!campaign) {
        return res.status(404).json({ message: 'Campaign not found' });
      }

      // Check if user can delete this campaign
      if (campaign.advertiser_id !== user_id) {
        return res.status(403).json({ message: 'Not authorized to delete this campaign' });
      }

      await UnifiedCampaign.softDelete(id);

      // Log audit
      await AuditLog.create({
        user_id,
        action: 'DELETE_CAMPAIGN',
        entity_type: 'campaign',
        entity_id: id,
        metadata: { advertiser_type: campaign.advertiser_type }
      });

      res.json({ message: 'Campaign deleted successfully' });

    } catch (error) {
      logger.error('Failed to delete campaign', { error: error.message, campaignId: id });
      res.status(500).json({ message: 'Failed to delete campaign' });
    }
  },

  /**
   * Get asset availability
   */
  async getAssetAvailability(req, res) {
    const { asset_id, start_date, end_date } = req.query;

    if (!asset_id || !start_date || !end_date) {
      return res.status(400).json({ 
        message: 'asset_id, start_date, and end_date are required' 
      });
    }

    try {
      const availability = await UnifiedCampaign.getAssetAvailability(
        parseInt(asset_id), 
        start_date, 
        end_date
      );

      res.json({ availability });

    } catch (error) {
      logger.error('Failed to get asset availability', { error: error.message });
      res.status(500).json({ message: 'Failed to get asset availability' });
    }
  },

  /**
   * Process a bid
   */
  async processBid(req, res) {
    const { campaign_id, asset_id, bid_amount, bid_type = 'manual' } = req.body;
    const user_id = req.user.user_id;

    try {
      const campaign = await UnifiedCampaign.findById(campaign_id);
      
      if (!campaign) {
        return res.status(404).json({ message: 'Campaign not found' });
      }

      // Check if user can bid on this campaign
      if (campaign.advertiser_id !== user_id) {
        return res.status(403).json({ message: 'Not authorized to bid on this campaign' });
      }

      // Validate bid based on advertiser type
      if (campaign.advertiser_type === 'internal') {
        const asset = await Asset.findById(asset_id);
        const validation = await biddingValidation.validateBid({
          booking_id: campaign_id,
          bid_amount,
          user_id,
          lob: campaign.lob
        }, asset);

        if (!validation.valid) {
          return res.status(400).json({ 
            message: 'Bid validation failed', 
            errors: validation.errors,
            warnings: validation.warnings
          });
        }
      }

      const result = await UnifiedCampaign.processBid(campaign_id, asset_id, bid_amount, bid_type);

      res.json({
        message: 'Bid processed successfully',
        result
      });

    } catch (error) {
      logger.error('Failed to process bid', { error: error.message });
      res.status(500).json({ message: 'Failed to process bid' });
    }
  },

  /**
   * Get analytics
   */
  async getAnalytics(req, res) {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ 
        message: 'start_date and end_date are required' 
      });
    }

    try {
      const analytics = await UnifiedCampaign.getAnalytics(start_date, end_date);

      res.json({ analytics });

    } catch (error) {
      logger.error('Failed to get analytics', { error: error.message });
      res.status(500).json({ message: 'Failed to get analytics' });
    }
  }
};

module.exports = UnifiedCampaignController; 