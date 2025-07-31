const Campaign = require('../models/Campaign');
const AuditLog = require('../../shared/models/AuditLog');
const logger = require('../../shared/utils/logger');

const CampaignController = {
  async create(req, res) {
    const { advertiser_id, name, budget, start_date, end_date, status, targeting_criteria } = req.body;
    const user_id = req.user.user_id;
    const startTime = Date.now();

    logger.ad('CAMPAIGN_CREATE_ATTEMPT', null, user_id, { advertiser_id, name });

    if (!advertiser_id || !name) {
      return res.status(400).json({ message: 'advertiser_id and name are required' });
    }

    try {
      const campaign = await Campaign.create({
        advertiser_id,
        name,
        budget,
        start_date,
        end_date,
        status: status || 'draft',
        targeting_criteria: typeof targeting_criteria === 'string' ? targeting_criteria : JSON.stringify(targeting_criteria)
      });

      await AuditLog.create({
        user_id,
        action: 'CREATE_CAMPAIGN',
        entity_type: 'campaign',
        entity_id: campaign.id,
        metadata: { advertiser_id, name }
      });

      logger.performance('CAMPAIGN_CREATE', Date.now() - startTime, { campaignId: campaign.id });
      logger.ad('CAMPAIGN_CREATE_SUCCESS', campaign.id, user_id);
      res.status(201).json(campaign);
    } catch (err) {
      logger.logError(err, { context: 'campaign_create', userId: user_id });
      res.status(500).json({ message: 'Failed to create campaign' });
    }
  },

  async getAll(req, res) {
    try {
      const campaigns = await Campaign.findAll();
      res.json(campaigns);
    } catch (err) {
      logger.logError(err, { context: 'campaign_get_all' });
      res.status(500).json({ message: 'Failed to fetch campaigns' });
    }
  },

  async getById(req, res) {
    const { id } = req.params;
    try {
      const campaign = await Campaign.findById(id);
      if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
      res.json(campaign);
    } catch (err) {
      logger.logError(err, { context: 'campaign_get_by_id', campaignId: id });
      res.status(500).json({ message: 'Failed to fetch campaign' });
    }
  },

  async update(req, res) {
    const { id } = req.params;
    const updates = req.body;
    const user_id = req.user.user_id;
    try {
      const campaign = await Campaign.update(id, updates);
      await AuditLog.create({
        user_id,
        action: 'UPDATE_CAMPAIGN',
        entity_type: 'campaign',
        entity_id: id,
        metadata: { updates }
      });
      res.json(campaign);
    } catch (err) {
      logger.logError(err, { context: 'campaign_update', campaignId: id });
      res.status(500).json({ message: 'Failed to update campaign' });
    }
  },

  async delete(req, res) {
    const { id } = req.params;
    const user_id = req.user.user_id;
    try {
      const campaign = await Campaign.delete(id);
      if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

      await AuditLog.create({
        user_id,
        action: 'DELETE_CAMPAIGN',
        entity_type: 'campaign',
        entity_id: id
      });

      res.json({ message: 'Campaign deleted' });
    } catch (err) {
      logger.logError(err, { context: 'campaign_delete', campaignId: id });
      res.status(500).json({ message: 'Failed to delete campaign' });
    }
  },

  async updateStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body;
    const user_id = req.user.user_id;
    try {
      const campaign = await Campaign.updateStatus(id, status);
      await AuditLog.create({
        user_id,
        action: 'UPDATE_CAMPAIGN_STATUS',
        entity_type: 'campaign',
        entity_id: id,
        metadata: { status }
      });
      res.json(campaign);
    } catch (err) {
      logger.logError(err, { context: 'campaign_update_status', campaignId: id });
      res.status(500).json({ message: 'Failed to update campaign status' });
    }
  },

  async getPerformance(req, res) {
    const { id } = req.params;
    try {
      const metrics = await Campaign.getPerformanceMetrics(id);
      res.json(metrics);
    } catch (err) {
      logger.logError(err, { context: 'campaign_metrics', campaignId: id });
      res.status(500).json({ message: 'Failed to fetch metrics' });
    }
  }
};

module.exports = CampaignController;
