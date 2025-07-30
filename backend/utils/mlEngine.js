const logger = require('./logger');

const MLEngine = {
  async predictCTR(creative, user_context, page_context) {
    // Simple CTR prediction based on historical data
    // In production, this would use a trained ML model

    let baseCTR = 0.015; // 1.5% base CTR

    // Adjust based on creative performance
    if (creative.performance && creative.performance.ctr) {
      baseCTR = creative.performance.ctr;
    }

    // Adjust based on user context
    if (user_context.location && ['US', 'CA'].includes(user_context.location.country)) {
      baseCTR *= 1.2; // Premium location boost
    }

    // Adjust based on page context
    if (page_context && page_context.category === 'healthcare') {
      baseCTR *= 1.1; // Healthcare category boost
    }

    return Math.min(baseCTR, 0.05); // Cap at 5%
  },

  async optimizeCreativeSelection(creatives, user_context) {
    // Score creatives based on ML predictions
    const scoredCreatives = await Promise.all(
      creatives.map(async (creative) => {
        const predictedCTR = await this.predictCTR(creative, user_context);
        return {
          ...creative,
          score: predictedCTR * 1000 // Convert to score
        };
      })
    );

    // Return highest scoring creative
    return scoredCreatives.sort((a, b) => b.score - a.score)[0];
  }
};

module.exports = MLEngine;
