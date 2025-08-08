// utils/crossChannel.js
const logger = require('../../shared/utils/logger');

const CrossChannel = {
  async activateChannels({ campaignId, channels = ['web', 'social'] }) {
    // Stub: simulate activation
    const activated = channels.map(ch => ({ channel: ch, status: 'queued' }));
    return { campaign_id: campaignId, activated };
  },

  async getChannelPlans({ campaignId }) {
    // Stub: a basic plan per channel
    return {
      campaign_id: campaignId,
      plans: [
        { channel: 'web', status: 'ready' },
        { channel: 'social', status: 'ready' },
        { channel: 'in_store', status: 'draft' }
      ]
    };
  }
};

module.exports = CrossChannel; 