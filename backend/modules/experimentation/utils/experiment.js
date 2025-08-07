const db = require('../../../config/db');
const logger = require('../../shared/utils/logger');

class Experiment {
  static async createExperiment(experimentData) {
    try {
      const {
        experiment_name,
        experiment_type,
        traffic_split,
        metrics,
        start_date,
        end_date,
        status = 'draft'
      } = experimentData;

      // Validate required fields
      if (!experiment_name || !experiment_type || !traffic_split || !metrics) {
        throw new Error('Missing required experiment fields');
      }

      // Validate experiment type
      const validTypes = ['ab_test', 'bandit', 'ml_model'];
      if (!validTypes.includes(experiment_type)) {
        throw new Error('Invalid experiment type');
      }

      const result = await db.query(
        `INSERT INTO experiments (experiment_name, experiment_type, status, traffic_split, metrics, start_date, end_date) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [experiment_name, experiment_type, status, JSON.stringify(traffic_split), JSON.stringify(metrics), start_date, end_date]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create experiment:', error);
      throw error;
    }
  }

  static async assignToVariant(experiment, userId) {
    try {
      // Check if user already has an assignment
      const existingAssignment = await db.query(
        'SELECT * FROM experiment_assignments WHERE experiment_id = $1 AND user_id = $2',
        [experiment.id, userId]
      );

      if (existingAssignment.rows.length > 0) {
        return existingAssignment.rows[0];
      }

      // Assign based on traffic split
      const trafficSplit = typeof experiment.traffic_split === 'string' 
        ? JSON.parse(experiment.traffic_split) 
        : experiment.traffic_split;

      const variants = Object.keys(trafficSplit);
      const random = Math.random();
      let cumulative = 0;
      let selectedVariant = variants[0];

      for (const variant of variants) {
        cumulative += trafficSplit[variant];
        if (random <= cumulative) {
          selectedVariant = variant;
          break;
        }
      }

      const result = await db.query(
        `INSERT INTO experiment_assignments (experiment_id, user_id, variant_name, assigned_at) 
         VALUES ($1, $2, $3, NOW()) RETURNING *`,
        [experiment.id, userId, selectedVariant]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to assign user to variant:', error);
      throw error;
    }
  }

  static async assignToBanditArm(experiment, userId) {
    try {
      // Get available bandit arms
      const armsResult = await db.query(
        'SELECT * FROM bandit_arms WHERE is_active = true ORDER BY RANDOM() LIMIT 1'
      );

      if (armsResult.rows.length === 0) {
        throw new Error('No active bandit arms available');
      }

      const selectedArm = armsResult.rows[0];

      const result = await db.query(
        `INSERT INTO experiment_assignments (experiment_id, user_id, arm_name, assigned_at) 
         VALUES ($1, $2, $3, NOW()) RETURNING *`,
        [experiment.id, userId, selectedArm.arm_name]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to assign user to bandit arm:', error);
      throw error;
    }
  }

  static async assignToModel(experiment, userId) {
    try {
      // Get available models
      const modelsResult = await db.query(
        'SELECT * FROM ctr_models WHERE is_active = true ORDER BY RANDOM() LIMIT 1'
      );

      if (modelsResult.rows.length === 0) {
        throw new Error('No active models available');
      }

      const selectedModel = modelsResult.rows[0];

      const result = await db.query(
        `INSERT INTO experiment_assignments (experiment_id, user_id, model_name, assigned_at) 
         VALUES ($1, $2, $3, NOW()) RETURNING *`,
        [experiment.id, userId, selectedModel.model_name]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to assign user to model:', error);
      throw error;
    }
  }

  static async trackResult(resultData) {
    try {
      const {
        experiment_id,
        user_id,
        variant_name,
        metric_name,
        metric_value,
        timestamp = new Date()
      } = resultData;

      const result = await db.query(
        `INSERT INTO experiment_results (experiment_id, user_id, variant_name, metric_name, metric_value, timestamp) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [experiment_id, user_id, variant_name, metric_name, metric_value, timestamp]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to track experiment result:', error);
      throw error;
    }
  }

  static async trackBanditResult(resultData) {
    try {
      const {
        experiment_id,
        user_id,
        arm_name,
        reward,
        timestamp = new Date()
      } = resultData;

      // Update bandit arm statistics
      await db.query(
        `UPDATE bandit_arms SET total_pulls = total_pulls + 1, total_rewards = total_rewards + $1 
         WHERE arm_name = $2`,
        [reward, arm_name]
      );

      const result = await db.query(
        `INSERT INTO bandit_pulls (experiment_id, user_id, arm_name, reward, timestamp) 
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [experiment_id, user_id, arm_name, reward, timestamp]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to track bandit result:', error);
      throw error;
    }
  }

  static async trackModelResult(resultData) {
    try {
      const {
        experiment_id,
        user_id,
        model_name,
        predicted_ctr,
        actual_ctr,
        timestamp = new Date()
      } = resultData;

      const result = await db.query(
        `INSERT INTO experiment_results (experiment_id, user_id, model_name, predicted_ctr, actual_ctr, timestamp) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [experiment_id, user_id, model_name, predicted_ctr, actual_ctr, timestamp]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to track model result:', error);
      throw error;
    }
  }

  static async calculateSignificance(experimentId, metricName) {
    try {
      const result = await db.query(
        `SELECT 
           variant_name,
           AVG(metric_value) as mean,
           COUNT(*) as sample_size,
           STDDEV(metric_value) as std_dev
         FROM experiment_results 
         WHERE experiment_id = $1 AND metric_name = $2
         GROUP BY variant_name`,
        [experimentId, metricName]
      );

      const variants = result.rows;
      if (variants.length < 2) {
        throw new Error('Insufficient data for significance calculation');
      }

      // Simple t-test calculation
      const control = variants.find(v => v.variant_name === 'control');
      const treatment = variants.find(v => v.variant_name === 'treatment');

      if (!control || !treatment) {
        throw new Error('Control and treatment variants required');
      }

      const pooledStd = Math.sqrt(
        ((control.sample_size - 1) * Math.pow(control.std_dev, 2) + 
         (treatment.sample_size - 1) * Math.pow(treatment.std_dev, 2)) /
        (control.sample_size + treatment.sample_size - 2)
      );

      const tStat = (treatment.mean - control.mean) / 
        (pooledStd * Math.sqrt(1/control.sample_size + 1/treatment.sample_size));

      return {
        control_mean: control.mean,
        treatment_mean: treatment.mean,
        t_statistic: tStat,
        p_value: this.calculatePValue(tStat, control.sample_size + treatment.sample_size - 2),
        significant: Math.abs(tStat) > 1.96 // 95% confidence level
      };
    } catch (error) {
      logger.error('Failed to calculate significance:', error);
      throw error;
    }
  }

  static async calculateBanditPerformance(experimentId) {
    try {
      const result = await db.query(
        `SELECT 
           arm_name,
           AVG(reward) as avg_reward,
           COUNT(*) as total_pulls,
           SUM(reward) as total_reward
         FROM bandit_pulls 
         WHERE experiment_id = $1
         GROUP BY arm_name
         ORDER BY avg_reward DESC`,
        [experimentId]
      );

      const arms = result.rows;
      const bestArm = arms.length > 0 ? arms[0] : null;

      return {
        arms,
        best_arm: bestArm,
        total_pulls: arms.reduce((sum, arm) => sum + parseInt(arm.total_pulls), 0),
        total_reward: arms.reduce((sum, arm) => sum + parseFloat(arm.total_reward), 0)
      };
    } catch (error) {
      logger.error('Failed to calculate bandit performance:', error);
      throw error;
    }
  }

  static async calculateModelPerformance(experimentId) {
    try {
      const result = await db.query(
        `SELECT 
           model_name,
           AVG(predicted_ctr) as avg_predicted_ctr,
           AVG(actual_ctr) as avg_actual_ctr,
           COUNT(*) as predictions,
           AVG(ABS(predicted_ctr - actual_ctr)) as mae
         FROM experiment_results 
         WHERE experiment_id = $1 AND model_name IS NOT NULL
         GROUP BY model_name
         ORDER BY mae ASC`,
        [experimentId]
      );

      const models = result.rows;
      const bestModel = models.length > 0 ? models[0] : null;

      return {
        models,
        best_model: bestModel,
        total_predictions: models.reduce((sum, model) => sum + parseInt(model.predictions), 0)
      };
    } catch (error) {
      logger.error('Failed to calculate model performance:', error);
      throw error;
    }
  }

  static async getExperimentStatus(experimentId) {
    try {
      const result = await db.query(
        'SELECT * FROM experiments WHERE id = $1',
        [experimentId]
      );

      if (result.rows.length === 0) {
        throw new Error('Experiment not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to get experiment status:', error);
      throw error;
    }
  }

  static async getExperimentMetrics(experimentId) {
    try {
      const result = await db.query(
        `SELECT DISTINCT metric_name, COUNT(*) as count
         FROM experiment_results 
         WHERE experiment_id = $1
         GROUP BY metric_name`,
        [experimentId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to get experiment metrics:', error);
      throw error;
    }
  }

  static async checkExperimentHealth(experimentId) {
    try {
      const experiment = await this.getExperimentStatus(experimentId);
      const metrics = await this.getExperimentMetrics(experimentId);

      const issues = [];
      let isHealthy = true;

      // Check if experiment is active
      if (experiment.status !== 'active') {
        issues.push('Experiment is not active');
        isHealthy = false;
      }

      // Check if experiment has data
      if (metrics.length === 0) {
        issues.push('No metrics collected');
        isHealthy = false;
      }

      // Check if experiment is within date range
      const now = new Date();
      if (experiment.start_date > now || experiment.end_date < now) {
        issues.push('Experiment outside date range');
        isHealthy = false;
      }

      return {
        is_healthy: isHealthy,
        issues,
        experiment_status: experiment.status,
        metrics_count: metrics.length
      };
    } catch (error) {
      logger.error('Failed to check experiment health:', error);
      throw error;
    }
  }

  static async startExperiment(experimentId) {
    try {
      const result = await db.query(
        'UPDATE experiments SET status = $1 WHERE id = $2 RETURNING *',
        ['active', experimentId]
      );

      if (result.rows.length === 0) {
        throw new Error('Experiment not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to start experiment:', error);
      throw error;
    }
  }

  static async pauseExperiment(experimentId) {
    try {
      const result = await db.query(
        'UPDATE experiments SET status = $1 WHERE id = $2 RETURNING *',
        ['paused', experimentId]
      );

      if (result.rows.length === 0) {
        throw new Error('Experiment not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to pause experiment:', error);
      throw error;
    }
  }

  static async endExperiment(experimentId) {
    try {
      const result = await db.query(
        'UPDATE experiments SET status = $1 WHERE id = $2 RETURNING *',
        ['completed', experimentId]
      );

      if (result.rows.length === 0) {
        throw new Error('Experiment not found');
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Failed to end experiment:', error);
      throw error;
    }
  }

  static async getRecommendations(experimentId) {
    try {
      const experiment = await this.getExperimentStatus(experimentId);
      const recommendations = [];

      // Basic recommendations based on experiment type
      if (experiment.experiment_type === 'ab_test') {
        const significance = await this.calculateSignificance(experimentId, 'ctr');
        if (significance.significant) {
          recommendations.push({
            type: 'statistical_significance',
            recommendation: `Treatment variant shows significant improvement (p < 0.05)`,
            confidence: 'high'
          });
        }
      } else if (experiment.experiment_type === 'bandit') {
        const performance = await this.calculateBanditPerformance(experimentId);
        if (performance.best_arm) {
          recommendations.push({
            type: 'best_arm',
            recommendation: `Arm "${performance.best_arm.arm_name}" shows best performance`,
            confidence: 'medium'
          });
        }
      }

      return recommendations;
    } catch (error) {
      logger.error('Failed to get recommendations:', error);
      throw error;
    }
  }

  // Validation methods
  static validateTrafficSplit(trafficSplit) {
    const total = Object.values(trafficSplit).reduce((sum, value) => sum + value, 0);
    return Math.abs(total - 1.0) < 0.001; // Allow for floating point precision
  }

  static validateMetrics(metrics) {
    const validMetrics = ['ctr', 'conversion_rate', 'revenue', 'impressions', 'clicks'];
    return metrics.every(metric => validMetrics.includes(metric));
  }

  static validateDates(dates) {
    return dates.start_date < dates.end_date;
  }

  // Helper method for p-value calculation (simplified)
  static calculatePValue(tStat, degreesOfFreedom) {
    // Simplified p-value calculation - in production, use a proper statistical library
    const absT = Math.abs(tStat);
    if (absT > 3.291) return 0.001;
    if (absT > 2.576) return 0.01;
    if (absT > 1.96) return 0.05;
    return 0.1;
  }
}

module.exports = Experiment;
