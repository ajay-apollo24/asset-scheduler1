const Experiment = require('../../../modules/experimentation/utils/experiment');
const db = require('../../../config/db');

// Mock database queries
jest.mock('../../../config/db', () => ({
  query: jest.fn()
}));

describe('Experimentation Module - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Experiment Creation and Management', () => {
    it('should create an A/B test experiment', async () => {
      const experimentData = {
        experiment_name: 'Test AB Experiment',
        experiment_type: 'ab_test',
        traffic_split: { control: 0.5, treatment: 0.5 },
        metrics: ['ctr', 'conversion_rate', 'revenue'],
        start_date: new Date(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      const mockResult = { rows: [{ id: 1, ...experimentData }] };
      db.query.mockResolvedValue(mockResult);

      const experiment = await Experiment.createExperiment(experimentData);

      expect(experiment).toHaveProperty('id', 1);
      expect(experiment).toHaveProperty('experiment_name', 'Test AB Experiment');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO experiments'),
        expect.arrayContaining(['Test AB Experiment', 'ab_test'])
      );
    });

    it('should create a bandit experiment', async () => {
      const experimentData = {
        experiment_name: 'Test Bandit Experiment',
        experiment_type: 'bandit',
        traffic_split: { thompson: 0.4, ucb: 0.3, epsilon: 0.3 },
        metrics: ['ctr', 'revenue'],
        start_date: new Date(),
        end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      };

      const mockResult = { rows: [{ id: 2, ...experimentData }] };
      db.query.mockResolvedValue(mockResult);

      const experiment = await Experiment.createExperiment(experimentData);

      expect(experiment).toHaveProperty('id', 2);
      expect(experiment).toHaveProperty('experiment_type', 'bandit');
    });

    it('should create an ML model experiment', async () => {
      const experimentData = {
        experiment_name: 'Test ML Experiment',
        experiment_type: 'ml_model',
        traffic_split: { model_a: 0.5, model_b: 0.5 },
        metrics: ['ctr', 'cvr', 'revenue'],
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };

      const mockResult = { rows: [{ id: 3, ...experimentData }] };
      db.query.mockResolvedValue(mockResult);

      const experiment = await Experiment.createExperiment(experimentData);

      expect(experiment).toHaveProperty('id', 3);
      expect(experiment).toHaveProperty('experiment_type', 'ml_model');
    });

    it('should validate experiment data', async () => {
      const invalidData = {
        experiment_name: '', // Invalid: empty name
        experiment_type: 'invalid_type', // Invalid: unknown type
        traffic_split: { control: 0.3, treatment: 0.3 } // Invalid: doesn't sum to 1
      };

      await expect(Experiment.createExperiment(invalidData)).rejects.toThrow();
    });
  });

  describe('Experiment Assignment', () => {
    it('should assign user to A/B test variant', async () => {
      const experiment = {
        id: 1,
        experiment_name: 'Test AB Experiment',
        experiment_type: 'ab_test',
        traffic_split: { control: 0.5, treatment: 0.5 },
        status: 'active'
      };

      const userId = 123;
      const mockResult = { rows: [{ variant: 'control' }] };
      db.query.mockResolvedValue(mockResult);

      const assignment = await Experiment.assignToVariant(experiment, userId);

      expect(assignment).toHaveProperty('variant', 'control');
      expect(assignment).toHaveProperty('experiment_id', 1);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO experiment_assignments'),
        expect.arrayContaining([1, 123])
      );
    });

    it('should assign user to bandit arm', async () => {
      const experiment = {
        id: 2,
        experiment_name: 'Test Bandit Experiment',
        experiment_type: 'bandit',
        traffic_split: { thompson: 0.4, ucb: 0.3, epsilon: 0.3 },
        status: 'active'
      };

      const userId = 456;
      const mockResult = { rows: [{ arm: 'thompson' }] };
      db.query.mockResolvedValue(mockResult);

      const assignment = await Experiment.assignToBanditArm(experiment, userId);

      expect(assignment).toHaveProperty('arm', 'thompson');
      expect(assignment).toHaveProperty('experiment_id', 2);
    });

    it('should assign user to ML model variant', async () => {
      const experiment = {
        id: 3,
        experiment_name: 'Test ML Experiment',
        experiment_type: 'ml_model',
        traffic_split: { model_a: 0.5, model_b: 0.5 },
        status: 'active'
      };

      const userId = 789;
      const mockResult = { rows: [{ model: 'model_a' }] };
      db.query.mockResolvedValue(mockResult);

      const assignment = await Experiment.assignToModel(experiment, userId);

      expect(assignment).toHaveProperty('model', 'model_a');
      expect(assignment).toHaveProperty('experiment_id', 3);
    });

    it('should handle consistent assignment for same user', async () => {
      const experiment = {
        id: 1,
        experiment_name: 'Test Experiment',
        experiment_type: 'ab_test',
        traffic_split: { control: 0.5, treatment: 0.5 },
        status: 'active'
      };

      const userId = 123;
      const mockResult = { rows: [{ variant: 'control' }] };
      db.query.mockResolvedValue(mockResult);

      // First assignment
      const assignment1 = await Experiment.assignToVariant(experiment, userId);
      
      // Second assignment should return same variant
      const assignment2 = await Experiment.assignToVariant(experiment, userId);

      expect(assignment1.variant).toBe(assignment2.variant);
    });
  });

  describe('Experiment Results Tracking', () => {
    it('should track A/B test results', async () => {
      const resultData = {
        experiment_id: 1,
        variant_name: 'treatment',
        metric_name: 'ctr',
        metric_value: 0.025,
        sample_size: 1000
      };

      const mockResult = { rows: [{ id: 1, ...resultData }] };
      db.query.mockResolvedValue(mockResult);

      const result = await Experiment.trackResult(resultData);

      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('variant_name', 'treatment');
      expect(result).toHaveProperty('metric_value', 0.025);
    });

    it('should track bandit results', async () => {
      const resultData = {
        experiment_id: 2,
        arm_name: 'thompson',
        reward: 0.5,
        context: { user_id: 123, asset_id: 456 }
      };

      const mockResult = { rows: [{ id: 2, ...resultData }] };
      db.query.mockResolvedValue(mockResult);

      const result = await Experiment.trackBanditResult(resultData);

      expect(result).toHaveProperty('id', 2);
      expect(result).toHaveProperty('arm_name', 'thompson');
      expect(result).toHaveProperty('reward', 0.5);
    });

    it('should track ML model results', async () => {
      const resultData = {
        experiment_id: 3,
        model_name: 'model_a',
        predicted_ctr: 0.025,
        actual_ctr: 0.023,
        confidence_score: 0.85
      };

      const mockResult = { rows: [{ id: 3, ...resultData }] };
      db.query.mockResolvedValue(mockResult);

      const result = await Experiment.trackModelResult(resultData);

      expect(result).toHaveProperty('id', 3);
      expect(result).toHaveProperty('model_name', 'model_a');
      expect(result).toHaveProperty('predicted_ctr', 0.025);
    });
  });

  describe('Statistical Analysis', () => {
    it('should calculate A/B test significance', async () => {
      const experimentId = 1;
      const mockResults = {
        rows: [
          { variant_name: 'control', metric_value: 0.02, sample_size: 1000 },
          { variant_name: 'treatment', metric_value: 0.025, sample_size: 1000 }
        ]
      };

      db.query.mockResolvedValue(mockResults);

      const analysis = await Experiment.calculateSignificance(experimentId, 'ctr');

      expect(analysis).toHaveProperty('control_mean');
      expect(analysis).toHaveProperty('treatment_mean');
      expect(analysis).toHaveProperty('p_value');
      expect(analysis).toHaveProperty('confidence_interval');
      expect(analysis).toHaveProperty('is_significant');
    });

    it('should calculate bandit performance', async () => {
      const experimentId = 2;
      const mockResults = {
        rows: [
          { arm_name: 'thompson', total_reward: 50, total_pulls: 100 },
          { arm_name: 'ucb', total_reward: 45, total_pulls: 100 },
          { arm_name: 'epsilon', total_reward: 40, total_pulls: 100 }
        ]
      };

      db.query.mockResolvedValue(mockResults);

      const performance = await Experiment.calculateBanditPerformance(experimentId);

      expect(performance).toHaveProperty('arms');
      expect(performance).toHaveProperty('best_arm');
      expect(performance).toHaveProperty('regret');
      expect(performance.arms).toHaveLength(3);
    });

    it('should calculate ML model performance', async () => {
      const experimentId = 3;
      const mockResults = {
        rows: [
          { model_name: 'model_a', auc: 0.85, accuracy: 0.78, mse: 0.001 },
          { model_name: 'model_b', auc: 0.87, accuracy: 0.80, mse: 0.0009 }
        ]
      };

      db.query.mockResolvedValue(mockResults);

      const performance = await Experiment.calculateModelPerformance(experimentId);

      expect(performance).toHaveProperty('models');
      expect(performance).toHaveProperty('best_model');
      expect(performance).toHaveProperty('improvement');
      expect(performance.models).toHaveLength(2);
    });
  });

  describe('Experiment Monitoring', () => {
    it('should get experiment status', async () => {
      const experimentId = 1;
      const mockStatus = {
        rows: [{
          experiment_name: 'Test Experiment',
          status: 'active',
          total_participants: 5000,
          days_remaining: 5
        }]
      };

      db.query.mockResolvedValue(mockStatus);

      const status = await Experiment.getExperimentStatus(experimentId);

      expect(status).toHaveProperty('experiment_name', 'Test Experiment');
      expect(status).toHaveProperty('status', 'active');
      expect(status).toHaveProperty('total_participants', 5000);
    });

    it('should get experiment metrics', async () => {
      const experimentId = 1;
      const mockMetrics = {
        rows: [
          { metric_name: 'ctr', control_value: 0.02, treatment_value: 0.025, lift: 0.25 },
          { metric_name: 'conversion_rate', control_value: 0.01, treatment_value: 0.012, lift: 0.20 }
        ]
      };

      db.query.mockResolvedValue(mockMetrics);

      const metrics = await Experiment.getExperimentMetrics(experimentId);

      expect(metrics).toHaveLength(2);
      expect(metrics[0]).toHaveProperty('metric_name', 'ctr');
      expect(metrics[0]).toHaveProperty('lift', 0.25);
    });

    it('should check experiment health', async () => {
      const experimentId = 1;
      const mockHealth = {
        rows: [{
          is_healthy: true,
          issues: [],
          recommendations: ['Continue monitoring']
        }]
      };

      db.query.mockResolvedValue(mockHealth);

      const health = await Experiment.checkExperimentHealth(experimentId);

      expect(health).toHaveProperty('is_healthy', true);
      expect(health).toHaveProperty('issues');
      expect(health).toHaveProperty('recommendations');
    });
  });

  describe('Experiment Lifecycle', () => {
    it('should start an experiment', async () => {
      const experimentId = 1;
      db.query.mockResolvedValue({ rows: [{ id: experimentId, status: 'active' }] });

      const result = await Experiment.startExperiment(experimentId);

      expect(result).toHaveProperty('status', 'active');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE experiments SET status = \'active\''),
        [experimentId]
      );
    });

    it('should pause an experiment', async () => {
      const experimentId = 1;
      db.query.mockResolvedValue({ rows: [{ id: experimentId, status: 'paused' }] });

      const result = await Experiment.pauseExperiment(experimentId);

      expect(result).toHaveProperty('status', 'paused');
    });

    it('should end an experiment', async () => {
      const experimentId = 1;
      db.query.mockResolvedValue({ rows: [{ id: experimentId, status: 'completed' }] });

      const result = await Experiment.endExperiment(experimentId);

      expect(result).toHaveProperty('status', 'completed');
    });

    it('should get experiment recommendations', async () => {
      const experimentId = 1;
      const mockRecommendations = {
        rows: [
          { recommendation: 'End experiment early - significant improvement detected' },
          { recommendation: 'Increase sample size for better statistical power' }
        ]
      };

      db.query.mockResolvedValue(mockRecommendations);

      const recommendations = await Experiment.getRecommendations(experimentId);

      expect(recommendations).toHaveLength(2);
      expect(recommendations[0]).toHaveProperty('recommendation');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      db.query.mockRejectedValue(new Error('Database connection failed'));

      await expect(Experiment.createExperiment({})).rejects.toThrow('Database connection failed');
    });

    it('should handle invalid experiment data', async () => {
      const invalidData = {
        experiment_name: null,
        experiment_type: 'invalid',
        traffic_split: {}
      };

      await expect(Experiment.createExperiment(invalidData)).rejects.toThrow();
    });

    it('should handle missing experiment', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await expect(Experiment.getExperimentStatus(999)).rejects.toThrow('Experiment not found');
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent experiment assignments efficiently', async () => {
      const experiment = {
        id: 1,
        experiment_name: 'Test Experiment',
        experiment_type: 'ab_test',
        traffic_split: { control: 0.5, treatment: 0.5 },
        status: 'active'
      };

      db.query.mockResolvedValue({ rows: [{ variant: 'control' }] });

      const startTime = Date.now();
      const promises = Array(100).fill().map((_, i) => 
        Experiment.assignToVariant(experiment, i)
      );
      await Promise.all(promises);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should handle large experiment result sets efficiently', async () => {
      const experimentId = 1;
      const largeResultSet = {
        rows: Array(10000).fill().map((_, i) => ({
          variant_name: i % 2 === 0 ? 'control' : 'treatment',
          metric_value: 0.02 + (Math.random() * 0.01),
          sample_size: 100
        }))
      };

      db.query.mockResolvedValue(largeResultSet);

      const startTime = Date.now();
      await Experiment.calculateSignificance(experimentId, 'ctr');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Data Validation', () => {
    it('should validate traffic split percentages', () => {
      const validSplit = { control: 0.5, treatment: 0.5 };
      const invalidSplit = { control: 0.3, treatment: 0.3 };

      expect(Experiment.validateTrafficSplit(validSplit)).toBe(true);
      expect(Experiment.validateTrafficSplit(invalidSplit)).toBe(false);
    });

    it('should validate metric names', () => {
      const validMetrics = ['ctr', 'conversion_rate', 'revenue'];
      const invalidMetrics = ['invalid_metric', 'ctr'];

      expect(Experiment.validateMetrics(validMetrics)).toBe(true);
      expect(Experiment.validateMetrics(invalidMetrics)).toBe(false);
    });

    it('should validate experiment dates', () => {
      const validDates = {
        start_date: new Date(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };
      const invalidDates = {
        start_date: new Date(),
        end_date: new Date(Date.now() - 24 * 60 * 60 * 1000) // Past date
      };

      expect(Experiment.validateDates(validDates)).toBe(true);
      expect(Experiment.validateDates(invalidDates)).toBe(false);
    });
  });
}); 