// utils/yieldControls.js
const db = require('../../../config/db');

const YieldControls = {
  async applyFloorPrices(bid, floors = {}) {
    const { display = 0, video = 0, native = 0 } = floors;
    const adjusted = Math.max(bid || 0, display);
    return { adjusted_bid: adjusted };
  },

  async abTestAssignments({ userId = 'anonymous', tests = [] }) {
    // Stub: deterministic bucketing by userId hash
    const assignments = tests.map(test => ({
      test_key: test.key,
      variant: (userId.charCodeAt(0) % 2 === 0) ? 'B' : 'A'
    }));
    return { user_id: userId, assignments };
  },

  async calculateYieldControls({ campaignId, assetId }) {
    // Stub: return fixed levers
    return {
      campaign_id: campaignId,
      asset_id: assetId,
      levers: {
        frequency_cap: 5,
        dynamic_floor_enabled: true,
        viewability_threshold: 0.5
      }
    };
  }
};

module.exports = YieldControls; 