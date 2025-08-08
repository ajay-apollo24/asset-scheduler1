// controllers/reviewController.js
const Campaign = require('../models/Campaign');
const AuditLog = require('../../shared/models/AuditLog');
const logger = require('../../shared/utils/logger');

const reviewController = {
  async request(req, res) {
    try {
      const { campaignId } = req.params;
      const user_id = req.user?.user_id;
      const campaign = await Campaign.update(campaignId, { status: 'pending_review' });
      if (user_id) {
        await AuditLog.create({ user_id, action: 'REQUEST_REVIEW', entity_type: 'campaign', entity_id: campaignId });
      }
      res.json({ message: 'Review requested', campaign });
    } catch (error) {
      logger.error('Review request error:', error);
      res.status(500).json({ message: 'Failed to request review' });
    }
  },

  async approve(req, res) {
    try {
      const { campaignId } = req.params;
      const user_id = req.user?.user_id;
      const campaign = await Campaign.update(campaignId, { status: 'approved' });
      if (user_id) {
        await AuditLog.create({ user_id, action: 'APPROVE_CAMPAIGN', entity_type: 'campaign', entity_id: campaignId });
      }
      res.json({ message: 'Campaign approved', campaign });
    } catch (error) {
      logger.error('Review approve error:', error);
      res.status(500).json({ message: 'Failed to approve campaign' });
    }
  },

  async reject(req, res) {
    try {
      const { campaignId } = req.params;
      const { reason = 'unspecified' } = req.body || {};
      const user_id = req.user?.user_id;
      const campaign = await Campaign.update(campaignId, { status: 'rejected', rejection_reason: reason });
      if (user_id) {
        await AuditLog.create({ user_id, action: 'REJECT_CAMPAIGN', entity_type: 'campaign', entity_id: campaignId, metadata: { reason } });
      }
      res.json({ message: 'Campaign rejected', campaign });
    } catch (error) {
      logger.error('Review reject error:', error);
      res.status(500).json({ message: 'Failed to reject campaign' });
    }
  }
};

module.exports = reviewController; 