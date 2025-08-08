// utils/targetingEngine.js
const db = require('../../../config/db');
const logger = require('../../shared/utils/logger');

const TargetingEngine = {
  async buildContextualMatches(pageContext = {}) {
    // Stub: derive keywords/categories from page context
    const { url = '', categories = [], keywords = [] } = pageContext || {};
    return {
      url,
      categories,
      keywords,
      matched_topics: keywords.slice(0, 5),
      confidence: 0.75
    };
  },

  async getAudienceSegments(userContext = {}) {
    // Stub: look up first-party audience segments
    const { user_id = 'anonymous', traits = [] } = userContext || {};
    try {
      const result = await db.query(
        'SELECT id, name, description FROM audience_segments WHERE is_active = true LIMIT 10',
        []
      );
      return {
        user_id,
        traits,
        segments: result.rows
      };
    } catch (error) {
      logger.error('Error fetching audience segments:', error);
      return { user_id, traits, segments: [] };
    }
  },

  async getStoreGeoTargets(storeContext = {}) {
    // Stub: store-level geo targeting (lat/lng, section)
    const { store_id = null, section = null, lat = null, lng = null } = storeContext || {};
    return {
      store_id,
      section,
      geo: lat && lng ? { lat, lng, radius_m: 500 } : null
    };
  },

  async evaluateTargeting({ pageContext, userContext, storeContext }) {
    // Combine signals into a simple eligibility score
    const contextual = await this.buildContextualMatches(pageContext);
    const audience = await this.getAudienceSegments(userContext);
    const geo = await this.getStoreGeoTargets(storeContext);

    const score = 0.4 * contextual.confidence + 0.4 * (audience.segments?.length ? 1 : 0) + 0.2 * (geo.store_id ? 1 : 0);

    return {
      contextual,
      audience,
      geo,
      eligibility_score: Number(score.toFixed(2)),
      reasons: []
    };
  }
};

module.exports = TargetingEngine; 