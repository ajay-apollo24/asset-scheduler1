const MLEngine = require('../../modules/ad-server/utils/mlEngine');
const db = require('../../config/db');

// Mock database queries
jest.mock('../../config/db', () => ({
  query: jest.fn()
}));

describe('ML Engine - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MLEngine.models.clear();
    MLEngine.banditArms.clear();
    MLEngine.featureCache.clear();
  });

  describe('Initialization', () => {
    it('should initialize ML engine successfully', async () => {
      const mockModels = [
        {
          id: 1,
          model_name: 'Test Model',
          model_type: 'logistic_regression',
          features: JSON.stringify(['user_cohort', 'asset_ctr']),
          hyperparameters: JSON.stringify({ learning_rate: 0.01 }),
          performance_metrics: JSON.stringify({ auc: 0.85 })
        }
      ];

      const mockArms = [
        {
          id: 1,
          arm_name: 'Test Arm',
          arm_type: 'thompson_sampling',
          parameters: JSON.stringify({ alpha: 1.0, beta: 1.0 }),
          current_reward: 0.0,
          total_pulls: 0
        }
      ];

      db.query
        .mockResolvedValueOnce({ rows: mockModels })
        .mockResolvedValueOnce({ rows: mockArms });

      await MLEngine.initialize();

      expect(MLEngine.models.size).toBe(1);
      expect(MLEngine.banditArms.size).toBe(1);
      expect(db.query).toHaveBeenCalledTimes(2);
    });

    it('should handle initialization errors gracefully', async () => {
      db.query.mockRejectedValue(new Error('Database error'));

      await expect(MLEngine.initialize()).rejects.toThrow('Database error');
    });
  });

  describe('Feature Extraction', () => {
    it('should extract user features correctly', async () => {
      const mockUserFeatures = {
        user_id: 1,
        cohort: 'test_cohort',
        recency_days: 30,
        frequency: 5,
        monetary_value: 150.00,
        device_type: 'mobile',
        location: 'US'
      };

      db.query.mockResolvedValue({ rows: [mockUserFeatures] });

      const features = await MLEngine.getUserFeatures(1);

      expect(features).toEqual(mockUserFeatures);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT uf.*, u.email, u.organization_id'),
        [1]
      );
    });

    it('should return default user features when none exist', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const features = await MLEngine.getUserFeatures(1);

      expect(features).toEqual({
        user_id: 1,
        cohort: 'default',
        recency_days: 30,
        frequency: 1,
        monetary_value: 0.0,
        purchase_history: [],
        device_type: 'unknown',
        location: 'unknown'
      });
    });

    it('should extract asset features correctly', async () => {
      const mockAssetFeatures = {
        asset_id: 1,
        historical_ctr: 0.025,
        revenue_per_view: 0.15,
        avg_bid_price: 2.50,
        category: 'banner',
        size: '728x90',
        position: 'top'
      };

      db.query.mockResolvedValue({ rows: [mockAssetFeatures] });

      const features = await MLEngine.getAssetFeatures(1);

      expect(features).toEqual(mockAssetFeatures);
    });

    it('should combine features for ML prediction', () => {
      const userFeatures = {
        user_id: 1,
        cohort: 'test_cohort',
        recency_days: 30,
        frequency: 5,
        monetary_value: 150.00,
        device_type: 'mobile',
        location: 'US'
      };

      const assetFeatures = {
        asset_id: 1,
        historical_ctr: 0.025,
        revenue_per_view: 0.15,
        avg_bid_price: 2.50,
        category: 'banner',
        size: '728x90',
        position: 'top'
      };

      const context = { time_of_day: 'morning', device: 'mobile' };

      const features = MLEngine.extractFeatures(userFeatures, assetFeatures, context);

      expect(features).toHaveProperty('user_cohort', 'test_cohort');
      expect(features).toHaveProperty('asset_ctr', 0.025);
      expect(features).toHaveProperty('time_of_day', 'morning');
      expect(features).toHaveProperty('device', 'mobile');
    });
  });

  describe('CTR Prediction', () => {
    beforeEach(() => {
      // Setup mock models
      MLEngine.models.set(1, {
        id: 1,
        model_name: 'Test Model',
        model_type: 'logistic_regression',
        features: ['user_cohort', 'asset_ctr'],
        hyperparameters: { weights: { user_cohort: 0.1, asset_ctr: 0.8 }, bias: 0.1 },
        performance_metrics: { auc: 0.85 }
      });
    });

    it('should predict CTR using logistic regression', async () => {
      const mockUserFeatures = {
        user_id: 1,
        cohort: 'test_cohort',
        recency_days: 30,
        frequency: 5,
        monetary_value: 150.00,
        device_type: 'mobile',
        location: 'US'
      };

      const mockAssetFeatures = {
        asset_id: 1,
        historical_ctr: 0.025,
        revenue_per_view: 0.15,
        avg_bid_price: 2.50,
        category: 'banner',
        size: '728x90',
        position: 'top'
      };

      db.query
        .mockResolvedValueOnce({ rows: [mockUserFeatures] })
        .mockResolvedValueOnce({ rows: [mockAssetFeatures] })
        .mockResolvedValueOnce({ rows: [] }); // storePrediction

      const prediction = await MLEngine.predictCTR(1, 1, { time_of_day: 'morning' });

      expect(prediction).toHaveProperty('ctr');
      expect(prediction).toHaveProperty('cvr');
      expect(prediction).toHaveProperty('confidence');
      expect(prediction).toHaveProperty('model_predictions');
      expect(prediction.model_predictions).toHaveLength(1);
    });

    it('should handle prediction errors gracefully', async () => {
      db.query.mockRejectedValue(new Error('Database error'));

      const prediction = await MLEngine.predictCTR(1, 1);

      expect(prediction).toEqual({
        ctr: 0.02,
        cvr: 0.01,
        confidence: 0.5,
        model_predictions: []
      });
    });

    it('should normalize features correctly', () => {
      expect(MLEngine.normalizeFeature('user_recency', 30)).toBeCloseTo(0.918, 3);
      expect(MLEngine.normalizeFeature('user_frequency', 5)).toBe(0.5);
      expect(MLEngine.normalizeFeature('user_monetary', 150)).toBe(0.15);
      expect(MLEngine.normalizeFeature('asset_ctr', 0.025)).toBe(0.025);
    });
  });

  describe('Bandit Algorithms', () => {
    beforeEach(() => {
      // Setup mock bandit arms
      MLEngine.banditArms.set(1, {
        id: 1,
        arm_name: 'Arm 1',
        arm_type: 'thompson_sampling',
        parameters: { alpha: 1.0, beta: 1.0 },
        current_reward: 10,
        total_pulls: 100
      });

      MLEngine.banditArms.set(2, {
        id: 2,
        arm_name: 'Arm 2',
        arm_type: 'thompson_sampling',
        parameters: { alpha: 1.0, beta: 1.0 },
        current_reward: 15,
        total_pulls: 100
      });
    });

    it('should select arm using Thompson Sampling', async () => {
      db.query.mockResolvedValue({ rows: [] }); // updateBanditArm

      const selectedArmId = await MLEngine.thompsonSampling(MLEngine.banditArms);

      expect([1, 2]).toContain(selectedArmId);
      expect(db.query).toHaveBeenCalled();
    });

    it('should select arm using UCB1', async () => {
      const selectedArmId = await MLEngine.ucb1(MLEngine.banditArms);

      expect([1, 2]).toContain(selectedArmId);
    });

    it('should select arm using Epsilon-Greedy', async () => {
      const selectedArmId = await MLEngine.epsilonGreedy(MLEngine.banditArms, { epsilon: 0.1 });

      expect([1, 2]).toContain(selectedArmId);
    });

    it('should record bandit pull and reward', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await MLEngine.recordBanditPull(1, 1, 1, 0.5, { context: 'test' });

      expect(db.query).toHaveBeenCalledTimes(2); // updateBanditArm + record pull
    });

    it('should get bandit performance metrics', async () => {
      const mockPerformance = [
        {
          arm_name: 'Arm 1',
          arm_type: 'thompson_sampling',
          current_reward: 10,
          total_pulls: 100,
          avg_reward: 0.1
        }
      ];

      db.query.mockResolvedValue({ rows: mockPerformance });

      const performance = await MLEngine.getBanditPerformance();

      expect(performance).toEqual(mockPerformance);
    });
  });

  describe('Model Types', () => {
    it('should predict with logistic regression', () => {
      const model = {
        model_type: 'logistic_regression',
        hyperparameters: {
          weights: { user_cohort: 0.1, asset_ctr: 0.8 },
          bias: 0.1
        }
      };

      const features = {
        user_cohort: 'test_cohort',
        asset_ctr: 0.025
      };

      const prediction = MLEngine.predictWithModel(model, features);

      expect(prediction).toHaveProperty('ctr');
      expect(prediction).toHaveProperty('cvr');
      expect(prediction).toHaveProperty('confidence');
    });

    it('should predict with GBDT', () => {
      const model = {
        model_type: 'gbdt',
        hyperparameters: {
          feature_importance: { user_cohort: 0.1, asset_ctr: 0.8 }
        }
      };

      const features = {
        user_cohort: 'test_cohort',
        asset_ctr: 0.025
      };

      const prediction = MLEngine.predictWithModel(model, features);

      expect(prediction).toHaveProperty('ctr');
      expect(prediction).toHaveProperty('cvr');
      expect(prediction).toHaveProperty('confidence');
    });

    it('should predict with neural network', () => {
      const model = {
        model_type: 'neural_network'
      };

      const features = {
        user_cohort: 'test_cohort',
        asset_ctr: 0.025
      };

      const prediction = MLEngine.predictWithModel(model, features);

      expect(prediction).toHaveProperty('ctr');
      expect(prediction).toHaveProperty('cvr');
      expect(prediction).toHaveProperty('confidence');
    });

    it('should use fallback prediction for unknown model type', () => {
      const model = {
        model_type: 'unknown'
      };

      const features = {
        user_cohort: 'test_cohort',
        asset_ctr: 0.025
      };

      const prediction = MLEngine.predictWithModel(model, features);

      expect(prediction).toEqual({
        ctr: 0.02,
        cvr: 0.01,
        confidence: 0.5
      });
    });
  });

  describe('Utility Methods', () => {
    it('should get time of day correctly', () => {
      const timeOfDay = MLEngine.getTimeOfDay();
      expect(['night', 'morning', 'afternoon', 'evening']).toContain(timeOfDay);
    });

    it('should get day of week correctly', () => {
      const dayOfWeek = MLEngine.getDayOfWeek();
      expect(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']).toContain(dayOfWeek);
    });

    it('should clear feature cache', () => {
      MLEngine.featureCache.set('test_key', 'test_value');
      expect(MLEngine.featureCache.size).toBe(1);

      MLEngine.clearCache();
      expect(MLEngine.featureCache.size).toBe(0);
    });

    it('should get ML engine status', () => {
      MLEngine.models.set(1, {});
      MLEngine.banditArms.set(1, {});
      MLEngine.featureCache.set('test', 'value');

      const status = MLEngine.getStatus();

      expect(status).toEqual({
        models_loaded: 1,
        bandit_arms_loaded: 1,
        cache_size: 1,
        status: 'active'
      });
    });
  });

  describe('Beta Distribution Sampling', () => {
    it('should sample from beta distribution', () => {
      const sample = MLEngine.sampleBeta(1.0, 1.0);
      expect(sample).toBeGreaterThanOrEqual(0);
      expect(sample).toBeLessThanOrEqual(1);
    });

    it('should handle edge cases in beta sampling', () => {
      const sample1 = MLEngine.sampleBeta(0.1, 0.1);
      const sample2 = MLEngine.sampleBeta(10, 10);

      expect(sample1).toBeGreaterThanOrEqual(0);
      expect(sample1).toBeLessThanOrEqual(1);
      expect(sample2).toBeGreaterThanOrEqual(0);
      expect(sample2).toBeLessThanOrEqual(1);
    });
  });

  describe('Feature Caching', () => {
    it('should cache user features', async () => {
      const mockFeatures = { user_id: 1, cohort: 'test' };
      db.query.mockResolvedValue({ rows: [mockFeatures] });

      // First call should hit database
      await MLEngine.getUserFeatures(1);
      expect(db.query).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await MLEngine.getUserFeatures(1);
      expect(db.query).toHaveBeenCalledTimes(1); // No additional calls
    });

    it('should cache asset features', async () => {
      const mockFeatures = { asset_id: 1, historical_ctr: 0.025 };
      db.query.mockResolvedValue({ rows: [mockFeatures] });

      // First call should hit database
      await MLEngine.getAssetFeatures(1);
      expect(db.query).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await MLEngine.getAssetFeatures(1);
      expect(db.query).toHaveBeenCalledTimes(1); // No additional calls
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors in feature extraction', async () => {
      db.query.mockRejectedValue(new Error('Database error'));

      const userFeatures = await MLEngine.getUserFeatures(1);
      expect(userFeatures).toEqual(MLEngine.getDefaultUserFeatures(1));

      const assetFeatures = await MLEngine.getAssetFeatures(1);
      expect(assetFeatures).toEqual(MLEngine.getDefaultAssetFeatures(1));
    });

    it('should handle errors in bandit arm updates', async () => {
      db.query.mockRejectedValue(new Error('Database error'));

      // Should not throw error
      await expect(MLEngine.updateBanditArm(1, { current_reward: 10, total_pulls: 100 })).resolves.toBeUndefined();
    });

    it('should handle errors in prediction storage', async () => {
      MLEngine.models.set(1, { id: 1 });
      db.query.mockRejectedValue(new Error('Database error'));

      // Should not throw error
      await expect(MLEngine.storePrediction(1, 1, 0.025, 0.015, 0.85, {}, {})).resolves.toBeUndefined();
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent predictions efficiently', async () => {
      const mockUserFeatures = { user_id: 1, cohort: 'test' };
      const mockAssetFeatures = { asset_id: 1, historical_ctr: 0.025 };
      
      MLEngine.models.set(1, {
        model_type: 'logistic_regression',
        hyperparameters: { weights: { user_cohort: 0.1 }, bias: 0.1 }
      });

      db.query.mockResolvedValue({ rows: [mockUserFeatures] });

      const startTime = Date.now();
      const promises = Array(10).fill().map(() => MLEngine.predictCTR(1, 1));
      await Promise.all(promises);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle large feature sets efficiently', () => {
      const largeFeatures = {};
      for (let i = 0; i < 100; i++) {
        largeFeatures[`feature_${i}`] = Math.random();
      }

      const startTime = Date.now();
      MLEngine.extractFeatures(
        { user_id: 1, cohort: 'test' },
        { asset_id: 1, historical_ctr: 0.025 },
        largeFeatures
      );
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });
  });
});
