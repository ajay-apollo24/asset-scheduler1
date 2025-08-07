const logger = require('../../shared/utils/logger');
const { beta } = require('jstat');

/**
 * Simple logistic regression implementation using gradient descent.
 * This keeps dependencies minimal while allowing us to train a model
 * on historical user/asset/context features.
 */
class LogisticRegression {
  constructor() {
    this.weights = null; // includes bias term as weight[0]
  }

  train(X, y, options = {}) {
    const epochs = options.epochs || 200;
    const lr = options.learningRate || 0.1;
    const n = X[0].length;
    this.weights = new Array(n + 1).fill(0); // bias + weights

    for (let epoch = 0; epoch < epochs; epoch++) {
      for (let i = 0; i < X.length; i++) {
        const features = [1, ...X[i]]; // prepend bias
        let z = 0;
        for (let j = 0; j < features.length; j++) {
          z += this.weights[j] * features[j];
        }
        const pred = 1 / (1 + Math.exp(-z));
        const error = y[i] - pred;
        // update
        for (let j = 0; j < features.length; j++) {
          this.weights[j] += lr * error * features[j];
        }
      }
    }
  }

  predict(x) {
    if (!this.weights) return 0.5;
    const features = [1, ...x];
    let z = 0;
    for (let j = 0; j < features.length; j++) {
      z += this.weights[j] * features[j];
    }
    return 1 / (1 + Math.exp(-z));
  }
}

/**
 * Convert creative/user/context objects into a numeric feature vector
 * for the CTR model. In production this would be far more extensive
 * and handle categorical encoding, missing values, etc.
 */
function extractFeatures(creative = {}, user = {}, context = {}) {
  return [
    creative.performance && creative.performance.ctr ? creative.performance.ctr : 0,
    creative.performance && creative.performance.revenue_per_view
      ? creative.performance.revenue_per_view
      : 0,
    creative.bid_price || 0,
    user.recency || 0,
    user.purchase_history || 0,
    context.screen === 'home' ? 1 : 0,
    context.device === 'mobile' ? 1 : 0
  ];
}

const MLEngine = {
  ctrModel: null,

  /**
   * Train a logistic regression model on provided data.
   * Each datum should contain: { creative, user, context, label }
   */
  trainCTRModel(trainingData = []) {
    try {
      const X = trainingData.map(d => extractFeatures(d.creative, d.user, d.context));
      const y = trainingData.map(d => d.label);
      const model = new LogisticRegression();
      model.train(X, y);
      this.ctrModel = model;
    } catch (err) {
      logger.error('Error training CTR model', { error: err.message });
      this.ctrModel = null;
    }
  },

  /**
   * Predict CTR using the trained model if available; otherwise fall back
   * to heuristic scoring based on creative/user/page context.
   */
  async predictCTR(creative = {}, user_context = {}, page_context = {}) {
    if (this.ctrModel) {
      const features = extractFeatures(creative, user_context, page_context);
      return this.ctrModel.predict(features);
    }

    // Heuristic fallback
    let baseCTR = 0.015; // 1.5% base CTR

    if (creative.performance && creative.performance.ctr) {
      baseCTR = creative.performance.ctr;
    }

    if (user_context.location && ['US', 'CA'].includes(user_context.location.country)) {
      baseCTR *= 1.2;
    }

    if (page_context && page_context.category === 'healthcare') {
      baseCTR *= 1.1;
    }

    return Math.min(baseCTR, 0.05);
  },

  /**
   * Sample from a Beta distribution for Thompson Sampling.
   */
  sampleBeta(alpha, betaParam) {
    return beta.sample(alpha, betaParam);
  },

  /**
   * Select the best creative using Thompson Sampling for exploration.
   */
  async optimizeCreativeSelection(creatives, user_context = {}, page_context = {}) {
    const scored = await Promise.all(
      creatives.map(async creative => {
        const predicted = await this.predictCTR(creative, user_context, page_context);
        const clicks = creative.performance && creative.performance.clicks
          ? creative.performance.clicks
          : 0;
        const impressions = creative.performance && (creative.performance.impressions || creative.performance.views)
          ? (creative.performance.impressions || creative.performance.views)
          : 0;
        const alpha = 1 + clicks + predicted * 10;
        const betaParam = 1 + Math.max(impressions - clicks, 0) + (1 - predicted) * 10;
        const score = this.sampleBeta(alpha, betaParam);
        return { creative, score };
      })
    );

    return scored.sort((a, b) => b.score - a.score)[0].creative;
  }
};

module.exports = MLEngine;

