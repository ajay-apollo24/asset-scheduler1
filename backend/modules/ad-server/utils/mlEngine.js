const db = require('../../../config/db');
const logger = require('../../shared/utils/logger');

/**
 * ML Engine for CTR Prediction and Bandit Algorithms
 * Implements logistic regression, GBDT, and various bandit algorithms
 */
class MLEngine {
  constructor() {
    this.models = new Map();
    this.banditArms = new Map();
    this.featureCache = new Map();
  }

  /**
   * Initialize ML models and bandit arms
   */
  async initialize() {
    try {
      await this.loadModels();
      await this.loadBanditArms();
      logger.info('ML Engine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ML Engine:', error);
      throw error;
    }
  }

  /**
   * Load active CTR models from database
   */
  async loadModels() {
    const query = 'SELECT * FROM ctr_models WHERE is_active = true';
    const result = await db.query(query);
    
    result.rows.forEach(model => {
      this.models.set(model.id, {
        ...model,
        features: JSON.parse(model.features),
        hyperparameters: JSON.parse(model.hyperparameters),
        performance_metrics: JSON.parse(model.performance_metrics)
      });
    });
    
    logger.info(`Loaded ${this.models.size} active CTR models`);
  }

  /**
   * Load active bandit arms from database
   */
  async loadBanditArms() {
    const query = 'SELECT * FROM bandit_arms WHERE is_active = true';
    const result = await db.query(query);
    
    result.rows.forEach(arm => {
      this.banditArms.set(arm.id, {
        ...arm,
        parameters: JSON.parse(arm.parameters)
      });
    });
    
    logger.info(`Loaded ${this.banditArms.size} active bandit arms`);
  }

  /**
   * Get user features for ML prediction
   */
  async getUserFeatures(userId) {
    const cacheKey = `user_${userId}`;
    if (this.featureCache.has(cacheKey)) {
      return this.featureCache.get(cacheKey);
    }

    const query = `
      SELECT uf.*, u.email, u.organization_id
      FROM user_features uf
      JOIN users u ON uf.user_id = u.id
      WHERE uf.user_id = $1
    `;
    const result = await db.query(query, [userId]);
    
    const features = result.rows[0] || this.getDefaultUserFeatures(userId);
    this.featureCache.set(cacheKey, features);
    
    return features;
  }

  /**
   * Get asset features for ML prediction
   */
  async getAssetFeatures(assetId) {
    const cacheKey = `asset_${assetId}`;
    if (this.featureCache.has(cacheKey)) {
      return this.featureCache.get(cacheKey);
    }

    const query = `
      SELECT af.*, a.name, a.type, a.level
      FROM asset_features af
      JOIN assets a ON af.asset_id = a.id
      WHERE af.asset_id = $1
    `;
    const result = await db.query(query, [assetId]);
    
    const features = result.rows[0] || this.getDefaultAssetFeatures(assetId);
    this.featureCache.set(cacheKey, features);
    
    return features;
  }

  /**
   * Get default user features when none exist
   */
  getDefaultUserFeatures(userId) {
    return {
      user_id: userId,
      cohort: 'default',
      recency_days: 30,
      frequency: 1,
      monetary_value: 0.0,
      purchase_history: [],
      device_type: 'unknown',
      location: 'unknown'
    };
  }

  /**
   * Get default asset features when none exist
   */
  getDefaultAssetFeatures(assetId) {
    return {
      asset_id: assetId,
      historical_ctr: 0.02,
      revenue_per_view: 0.10,
      avg_bid_price: 1.50,
      category: 'banner',
      size: '728x90',
      position: 'unknown'
    };
  }

  /**
   * Predict CTR using active models
   */
  async predictCTR(userId, assetId, context = {}) {
    try {
      const userFeatures = await this.getUserFeatures(userId);
      const assetFeatures = await this.getAssetFeatures(assetId);
      
      // Combine features for prediction
      const features = this.extractFeatures(userFeatures, assetFeatures, context);
      
      // Get predictions from all active models
      const predictions = [];
      for (const [modelId, model] of this.models) {
        const prediction = this.predictWithModel(model, features);
        predictions.push({
          model_id: modelId,
          model_name: model.model_name,
          predicted_ctr: prediction.ctr,
          predicted_cvr: prediction.cvr,
          confidence_score: prediction.confidence
        });
      }
      
      // Ensemble prediction (simple average for now)
      const ensembleCTR = predictions.reduce((sum, p) => sum + p.predicted_ctr, 0) / predictions.length;
      const ensembleCVR = predictions.reduce((sum, p) => sum + p.predicted_cvr, 0) / predictions.length;
      const avgConfidence = predictions.reduce((sum, p) => sum + p.confidence_score, 0) / predictions.length;
      
      // Store prediction in database
      await this.storePrediction(userId, assetId, ensembleCTR, ensembleCVR, avgConfidence, features, context);
      
      return {
        ctr: ensembleCTR,
        cvr: ensembleCVR,
        confidence: avgConfidence,
        model_predictions: predictions
      };
    } catch (error) {
      logger.error('CTR prediction failed:', error);
      return this.getFallbackPrediction();
    }
  }

  /**
   * Extract features for ML model
   */
  extractFeatures(userFeatures, assetFeatures, context) {
    return {
      // User features
      user_cohort: userFeatures.cohort,
      user_recency: userFeatures.recency_days,
      user_frequency: userFeatures.frequency,
      user_monetary: userFeatures.monetary_value,
      user_device: userFeatures.device_type,
      user_location: userFeatures.location,
      
      // Asset features
      asset_ctr: assetFeatures.historical_ctr,
      asset_revenue: assetFeatures.revenue_per_view,
      asset_bid_price: assetFeatures.avg_bid_price,
      asset_category: assetFeatures.category,
      asset_size: assetFeatures.size,
      asset_position: assetFeatures.position,
      
      // Context features
      time_of_day: context.time_of_day || this.getTimeOfDay(),
      day_of_week: context.day_of_week || this.getDayOfWeek(),
      device: context.device || userFeatures.device_type,
      screen_size: context.screen_size || 'unknown'
    };
  }

  /**
   * Predict using a specific model
   */
  predictWithModel(model, features) {
    switch (model.model_type) {
      case 'logistic_regression':
        return this.logisticRegressionPredict(model, features);
      case 'gbdt':
        return this.gbdtPredict(model, features);
      case 'neural_network':
        return this.neuralNetworkPredict(model, features);
      default:
        return this.fallbackPredict(features);
    }
  }

  /**
   * Logistic Regression prediction
   */
  logisticRegressionPredict(model, features) {
    // Simplified logistic regression implementation
    const weights = model.hyperparameters.weights || this.getDefaultWeights();
    const bias = model.hyperparameters.bias || 0;
    
    let score = bias;
    for (const [feature, value] of Object.entries(features)) {
      if (weights[feature]) {
        score += weights[feature] * this.normalizeFeature(feature, value);
      }
    }
    
    const ctr = 1 / (1 + Math.exp(-score));
    const cvr = ctr * 0.6; // Assume 60% of clicks convert
    const confidence = Math.min(0.95, Math.abs(score) / 10);
    
    return { ctr, cvr, confidence };
  }

  /**
   * GBDT prediction (simplified)
   */
  gbdtPredict(model, features) {
    // Simplified GBDT implementation
    const baseScore = 0.02;
    const featureImportance = model.hyperparameters.feature_importance || {};
    
    let score = baseScore;
    for (const [feature, value] of Object.entries(features)) {
      if (featureImportance[feature]) {
        score += featureImportance[feature] * this.normalizeFeature(feature, value);
      }
    }
    
    const ctr = Math.max(0.001, Math.min(0.1, score));
    const cvr = ctr * 0.5;
    const confidence = 0.8;
    
    return { ctr, cvr, confidence };
  }

  /**
   * Neural Network prediction (simplified)
   */
  neuralNetworkPredict(model, features) {
    // Simplified neural network implementation
    const ctr = 0.025 + Math.random() * 0.01;
    const cvr = ctr * 0.7;
    const confidence = 0.85;
    
    return { ctr, cvr, confidence };
  }

  /**
   * Fallback prediction when models fail
   */
  fallbackPredict(features) {
    const ctr = 0.02;
    const cvr = 0.01;
    const confidence = 0.5;
    
    return { ctr, cvr, confidence };
  }

  /**
   * Get fallback prediction for error cases
   */
  getFallbackPrediction() {
    return {
      ctr: 0.02,
      cvr: 0.01,
      confidence: 0.5,
      model_predictions: []
    };
  }

  /**
   * Normalize feature values
   */
  normalizeFeature(feature, value) {
    const normalizers = {
      user_recency: (v) => Math.max(0, 1 - v / 365),
      user_frequency: (v) => Math.min(1, v / 10),
      user_monetary: (v) => Math.min(1, v / 1000),
      asset_ctr: (v) => v,
      asset_revenue: (v) => Math.min(1, v / 10),
      asset_bid_price: (v) => Math.min(1, v / 100)
    };
    
    return normalizers[feature] ? normalizers[feature](value) : (typeof value === 'number' ? value : 0);
  }

  /**
   * Get default weights for logistic regression
   */
  getDefaultWeights() {
    return {
      user_cohort: 0.1,
      user_recency: -0.2,
      user_frequency: 0.3,
      user_monetary: 0.4,
      asset_ctr: 0.8,
      asset_revenue: 0.6,
      asset_bid_price: 0.2,
      time_of_day: 0.1,
      device: 0.1
    };
  }

  /**
   * Store prediction in database
   */
  async storePrediction(userId, assetId, ctr, cvr, confidence, features, context) {
    try {
      const modelId = Array.from(this.models.keys())[0]; // Use first active model
      const query = `
        INSERT INTO model_predictions (model_id, user_id, asset_id, predicted_ctr, predicted_cvr, confidence_score, features_used, context)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      await db.query(query, [
        modelId, userId, assetId, ctr, cvr, confidence,
        JSON.stringify(features), JSON.stringify(context)
      ]);
    } catch (error) {
      logger.error('Failed to store prediction:', error);
    }
  }

  /**
   * Bandit Algorithms
   */
  
  /**
   * Thompson Sampling bandit
   */
  async thompsonSampling(arms, context = {}) {
    const pulls = [];
    
    for (const [armId, arm] of arms) {
      const alpha = arm.parameters.alpha || 1.0;
      const beta = arm.parameters.beta || 1.0;
      
      // Sample from beta distribution
      const sample = this.sampleBeta(alpha + arm.current_reward, beta + (arm.total_pulls - arm.current_reward));
      pulls.push({ armId, sample, arm });
    }
    
    // Select arm with highest sample
    pulls.sort((a, b) => b.sample - a.sample);
    const selectedArm = pulls[0];
    
    // Update arm statistics
    await this.updateBanditArm(selectedArm.armId, selectedArm.arm);
    
    return selectedArm.armId;
  }

  /**
   * UCB1 bandit algorithm
   */
  async ucb1(arms, context = {}) {
    const totalPulls = Array.from(arms.values()).reduce((sum, arm) => sum + arm.total_pulls, 0);
    const pulls = [];
    
    for (const [armId, arm] of arms) {
      if (arm.total_pulls === 0) {
        return armId; // Pull unexplored arm
      }
      
      const explorationFactor = arm.parameters.exploration_factor || 2.0;
      const ucb = (arm.current_reward / arm.total_pulls) + 
                  Math.sqrt(explorationFactor * Math.log(totalPulls) / arm.total_pulls);
      
      pulls.push({ armId, ucb, arm });
    }
    
    // Select arm with highest UCB
    pulls.sort((a, b) => b.ucb - a.ucb);
    const selectedArm = pulls[0];
    
    return selectedArm.armId;
  }

  /**
   * Epsilon-Greedy bandit algorithm
   */
  async epsilonGreedy(arms, context = {}) {
    const epsilon = context.epsilon || 0.1;
    
    // Explore with probability epsilon
    if (Math.random() < epsilon) {
      const armIds = Array.from(arms.keys());
      return armIds[Math.floor(Math.random() * armIds.length)];
    }
    
    // Exploit: select arm with highest average reward
    let bestArmId = null;
    let bestReward = -Infinity;
    
    for (const [armId, arm] of arms) {
      if (arm.total_pulls === 0) {
        return armId; // Pull unexplored arm
      }
      
      const avgReward = arm.current_reward / arm.total_pulls;
      if (avgReward > bestReward) {
        bestReward = avgReward;
        bestArmId = armId;
      }
    }
    
    return bestArmId;
  }

  /**
   * Sample from beta distribution
   */
  sampleBeta(alpha, beta) {
    // Simplified beta sampling using Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.max(0, Math.min(1, 0.5 + z0 * 0.1));
  }

  /**
   * Update bandit arm statistics
   */
  async updateBanditArm(armId, arm) {
    try {
      const query = `
        UPDATE bandit_arms 
        SET current_reward = $1, total_pulls = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `;
      await db.query(query, [arm.current_reward, arm.total_pulls, armId]);
    } catch (error) {
      logger.error('Failed to update bandit arm:', error);
    }
  }

  /**
   * Record bandit pull and reward
   */
  async recordBanditPull(armId, userId, assetId, reward, context = {}) {
    try {
      // Update arm statistics
      const arm = this.banditArms.get(armId);
      if (arm) {
        arm.current_reward += reward;
        arm.total_pulls += 1;
        await this.updateBanditArm(armId, arm);
      }
      
      // Record pull
      const query = `
        INSERT INTO bandit_pulls (arm_id, user_id, asset_id, reward, context)
        VALUES ($1, $2, $3, $4, $5)
      `;
      await db.query(query, [armId, userId, assetId, reward, JSON.stringify(context)]);
    } catch (error) {
      logger.error('Failed to record bandit pull:', error);
    }
  }

  /**
   * Get bandit performance metrics
   */
  async getBanditPerformance() {
    try {
      const query = `
        SELECT 
          ba.arm_name,
          ba.arm_type,
          ba.current_reward,
          ba.total_pulls,
          CASE 
            WHEN ba.total_pulls > 0 THEN ba.current_reward / ba.total_pulls 
            ELSE 0 
          END as avg_reward
        FROM bandit_arms ba
        WHERE ba.is_active = true
        ORDER BY avg_reward DESC
      `;
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get bandit performance:', error);
      return [];
    }
  }

  /**
   * Utility methods
   */
  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }

  getDayOfWeek() {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[new Date().getDay()];
  }

  /**
   * Clear feature cache
   */
  clearCache() {
    this.featureCache.clear();
  }

  /**
   * Get ML engine status
   */
  getStatus() {
    return {
      models_loaded: this.models.size,
      bandit_arms_loaded: this.banditArms.size,
      cache_size: this.featureCache.size,
      status: 'active'
    };
  }
}

module.exports = new MLEngine();

