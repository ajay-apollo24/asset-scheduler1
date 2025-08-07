// Jest setup file for integration testing against real server

// Set test environment before any modules are loaded
process.env.NODE_ENV = 'test';

// Mock logger to prevent console noise during tests
jest.mock('../modules/shared/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  logError: jest.fn(),
  rule: jest.fn(),
  logRequest: jest.fn(),
  // Add missing logger methods
  performance: jest.fn(),
  booking: jest.fn(),
  asset: jest.fn(),
  security: jest.fn(), // Add missing security method
  logRequest: jest.fn()
}));

// Remove database mocking - use real database for integration tests
// jest.mock('./config/db', () => ({ ... }));

// Remove server mocking - use real server
// jest.mock('./server', () => { ... });

// Keep shared modules mocking for isolation
jest.mock('../modules/shared/index', () => {
  const express = require('express');
  return {
    logger: {
      logRequest: jest.fn()
    },
    authRoutes: express.Router(),
    userRoutes: express.Router(),
    auditRoutes: express.Router(),
    reportRoutes: express.Router(),
    cacheRoutes: express.Router(),
    logRoutes: express.Router(),
    fallback: {
      databaseFallback: jest.fn((req, res, next) => next()),
      responseCache: jest.fn(() => (req, res, next) => next()),
      healthCheckFallback: jest.fn((req, res, next) => next()),
      errorRecovery: jest.fn((err, req, res, next) => next(err))
    },
    errorHandler: jest.fn((err, req, res, next) => {
      res.status(500).json({ message: 'Internal Server Error' });
    })
  };
});

// Global test utilities for integration testing
global.testUtils = {
  // Base URL for the running server
  baseURL: 'http://localhost:5001',
  
  // Helper to make authenticated requests
  authenticatedRequest: (request, token) => {
    return request.set('Authorization', `Bearer ${token}`);
  },
  
  // Mock request/response utilities for unit tests
  mockRequest: (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    user: { id: 1, role: 'user' },
    ...overrides
  }),
  
  mockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.end = jest.fn().mockReturnValue(res);
    return res;
  },
  
  mockNext: () => jest.fn(),
  
  // Generate test data utilities
  generateTestUser: (overrides = {}) => ({
    id: 1,
    email: 'test@example.com',
    username: 'testuser',
    role: 'user',
    ...overrides
  }),
  
  generateTestAsset: (overrides = {}) => ({
    id: 1,
    name: 'Test Asset',
    type: 'billboard',
    location: 'Test Location',
    level: 'secondary',
    ...overrides
  }),
  
  generateTestBooking: (overrides = {}) => ({
    id: 1,
    title: 'Test Booking',
    asset_id: 1,
    user_id: 1,
    start_date: '2024-01-15',
    end_date: '2024-01-20',
    status: 'pending',
    ...overrides
  }),
  
  generateTestCreative: (overrides = {}) => ({
    id: 1,
    name: 'Test Creative',
    type: 'image',
    status: 'approved',
    asset_id: 1,
    campaign_id: 1,
    ...overrides
  }),
  
  generateTestCampaign: (overrides = {}) => ({
    id: 1,
    name: 'Test Campaign',
    status: 'active',
    budget: 1000.00,
    ...overrides
  }),
  
  generateTestBid: (overrides = {}) => ({
    id: 1,
    booking_id: 1,
    user_id: 1,
    amount: 100.00,
    status: 'active',
    ...overrides
  }),
  
  // Helper to create test data in database
  createTestUser: async (overrides = {}) => {
    // This will create a real user in the test database
    const db = require('../config/db');
    const defaultUser = {
      email: 'test@example.com',
      password_hash: 'hashed_password',
      organization_id: 1,
      ...overrides
    };
    
    const result = await db.query(
      'INSERT INTO users (email, password_hash, organization_id) VALUES ($1, $2, $3) RETURNING *',
      [defaultUser.email, defaultUser.password_hash, defaultUser.organization_id]
    );
    
    // Assign default user role
    await db.query(
      'INSERT INTO user_roles (user_id, role_id, organization_id) VALUES ($1, $2, $3)',
      [result.rows[0].id, 2, defaultUser.organization_id] // role_id 2 = 'user'
    );
    
    return result.rows[0];
  },
  
  createTestAdmin: async (overrides = {}) => {
    // This will create a real admin user in the test database
    const db = require('../config/db');
    const defaultAdmin = {
      email: 'admin@example.com',
      password_hash: 'hashed_password',
      organization_id: 1,
      ...overrides
    };
    
    const result = await db.query(
      'INSERT INTO users (email, password_hash, organization_id) VALUES ($1, $2, $3) RETURNING *',
      [defaultAdmin.email, defaultAdmin.password_hash, defaultAdmin.organization_id]
    );
    
    // Assign admin role
    await db.query(
      'INSERT INTO user_roles (user_id, role_id, organization_id) VALUES ($1, $2, $3)',
      [result.rows[0].id, 1, defaultAdmin.organization_id] // role_id 1 = 'admin'
    );
    
    return result.rows[0];
  },
  
  createTestAsset: async (overrides = {}) => {
    const db = require('../config/db');
    const defaultAsset = {
      name: 'Test Asset',
      type: 'billboard',
      location: 'Test Location',
      level: 'secondary',
      ...overrides
    };
    
    const result = await db.query(
      'INSERT INTO assets (name, type, location, level) VALUES ($1, $2, $3, $4) RETURNING *',
      [defaultAsset.name, defaultAsset.type, defaultAsset.location, defaultAsset.level]
    );
    return result.rows[0];
  },
  
  createTestBooking: async (overrides = {}) => {
    const db = require('../config/db');
    const defaultBooking = {
      title: 'Test Booking',
      asset_id: 1,
      user_id: 1,
      start_date: '2024-01-15',
      end_date: '2024-01-20',
      status: 'pending',
      ...overrides
    };
    
    const result = await db.query(
      'INSERT INTO bookings (title, asset_id, user_id, start_date, end_date, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [defaultBooking.title, defaultBooking.asset_id, defaultBooking.user_id, defaultBooking.start_date, defaultBooking.end_date, defaultBooking.status]
    );
    return result.rows[0];
  },
  
  createTestCreative: async (overrides = {}) => {
    const db = require('../config/db');
    const defaultCreative = {
      name: 'Test Creative',
      type: 'image',
      status: 'approved',
      asset_id: 1,
      campaign_id: 1,
      ...overrides
    };
    
    const result = await db.query(
      'INSERT INTO creatives (name, type, status, asset_id, campaign_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [defaultCreative.name, defaultCreative.type, defaultCreative.status, defaultCreative.asset_id, defaultCreative.campaign_id]
    );
    return result.rows[0];
  },
  
  createTestCampaign: async (overrides = {}) => {
    const db = require('../config/db');
    const defaultCampaign = {
      name: 'Test Campaign',
      status: 'active',
      budget: 1000.00,
      ...overrides
    };
    
    const result = await db.query(
      'INSERT INTO campaigns (name, status, budget) VALUES ($1, $2, $3) RETURNING *',
      [defaultCampaign.name, defaultCampaign.status, defaultCampaign.budget]
    );
    return result.rows[0];
  },
  
  // Cleanup test data
  cleanup: async () => {
    const db = require('../config/db');
    try {
      // Clean up in reverse dependency order
      await db.query('DELETE FROM bids WHERE bid_amount > 0');
      await db.query('DELETE FROM creatives WHERE name LIKE \'Test%\'');
      await db.query('DELETE FROM campaigns WHERE name LIKE \'Test%\'');
      await db.query('DELETE FROM assets WHERE name LIKE \'Test%\'');
      await db.query('DELETE FROM approvals WHERE decided_by IN (SELECT id FROM users WHERE email LIKE \'test%@%\' OR email LIKE \'admin%@%\')');
      await db.query('DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'test%@%\' OR email LIKE \'admin%@%\')');
      await db.query('DELETE FROM users WHERE email LIKE \'test%@%\' OR email LIKE \'admin%@%\'');
      
      // Clean up ML/experimentation data
      await db.query('DELETE FROM model_predictions WHERE created_at > NOW() - INTERVAL \'1 hour\'');
      await db.query('DELETE FROM experiment_results WHERE experiment_name LIKE \'Test%\'');
      await db.query('DELETE FROM user_features WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'test%@%\')');
      await db.query('DELETE FROM asset_features WHERE asset_id IN (SELECT id FROM assets WHERE name LIKE \'Test%\')');
      await db.query('DELETE FROM bandit_arms WHERE arm_name LIKE \'Test%\'');
      await db.query('DELETE FROM ctr_models WHERE model_name LIKE \'Test%\'');
    } catch (error) {
      console.warn('Cleanup warning:', error.message);
    }
  },

  // Create test data for ML/experimentation
  createTestUserFeatures: async (overrides = {}) => {
    const db = require('../config/db');
    const defaultFeatures = {
      user_id: 1,
      cohort: 'test_cohort',
      recency_days: 30,
      frequency: 5,
      monetary_value: 150.00,
      purchase_history: JSON.stringify(['product1', 'product2']),
      device_type: 'mobile',
      location: 'US',
      ...overrides
    };
    
    const result = await db.query(
      `INSERT INTO user_features (user_id, cohort, recency_days, frequency, monetary_value, purchase_history, device_type, location) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [defaultFeatures.user_id, defaultFeatures.cohort, defaultFeatures.recency_days, defaultFeatures.frequency, 
       defaultFeatures.monetary_value, defaultFeatures.purchase_history, defaultFeatures.device_type, defaultFeatures.location]
    );
    return result.rows[0];
  },

  createTestAssetFeatures: async (overrides = {}) => {
    const db = require('../config/db');
    const defaultFeatures = {
      asset_id: 1,
      historical_ctr: 0.025,
      revenue_per_view: 0.15,
      avg_bid_price: 2.50,
      category: 'banner',
      size: '728x90',
      position: 'top',
      ...overrides
    };
    
    const result = await db.query(
      `INSERT INTO asset_features (asset_id, historical_ctr, revenue_per_view, avg_bid_price, category, size, position) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [defaultFeatures.asset_id, defaultFeatures.historical_ctr, defaultFeatures.revenue_per_view, 
       defaultFeatures.avg_bid_price, defaultFeatures.category, defaultFeatures.size, defaultFeatures.position]
    );
    return result.rows[0];
  },

  createTestCTRModel: async (overrides = {}) => {
    const db = require('../config/db');
    const defaultModel = {
      model_name: 'Test CTR Model',
      model_type: 'logistic_regression',
      version: '1.0.0',
      features: JSON.stringify(['user_cohort', 'asset_ctr', 'device_type', 'time_of_day']),
      hyperparameters: JSON.stringify({ learning_rate: 0.01, max_depth: 6 }),
      performance_metrics: JSON.stringify({ auc: 0.85, accuracy: 0.78 }),
      is_active: true,
      ...overrides
    };
    
    const result = await db.query(
      `INSERT INTO ctr_models (model_name, model_type, version, features, hyperparameters, performance_metrics, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [defaultModel.model_name, defaultModel.model_type, defaultModel.version, defaultModel.features,
       defaultModel.hyperparameters, defaultModel.performance_metrics, defaultModel.is_active]
    );
    return result.rows[0];
  },

  createTestBanditArm: async (overrides = {}) => {
    const db = require('../config/db');
    const defaultArm = {
      arm_name: 'Test Arm',
      arm_type: 'thompson_sampling',
      parameters: JSON.stringify({ alpha: 1.0, beta: 1.0 }),
      current_reward: 0.0,
      total_pulls: 0,
      is_active: true,
      ...overrides
    };
    
    const result = await db.query(
      `INSERT INTO bandit_arms (arm_name, arm_type, parameters, current_reward, total_pulls, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [defaultArm.arm_name, defaultArm.arm_type, defaultArm.parameters, defaultArm.current_reward,
       defaultArm.total_pulls, defaultArm.is_active]
    );
    return result.rows[0];
  },

  createTestExperiment: async (overrides = {}) => {
    const db = require('../config/db');
    const defaultExperiment = {
      experiment_name: 'Test Experiment',
      experiment_type: 'ab_test',
      status: 'active',
      traffic_split: JSON.stringify({ control: 0.5, treatment: 0.5 }),
      metrics: JSON.stringify(['ctr', 'conversion_rate', 'revenue']),
      start_date: new Date(),
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      ...overrides
    };
    
    const result = await db.query(
      `INSERT INTO experiments (experiment_name, experiment_type, status, traffic_split, metrics, start_date, end_date) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [defaultExperiment.experiment_name, defaultExperiment.experiment_type, defaultExperiment.status,
       defaultExperiment.traffic_split, defaultExperiment.metrics, defaultExperiment.start_date, defaultExperiment.end_date]
    );
    return result.rows[0];
  },

  createTestModelPrediction: async (overrides = {}) => {
    const db = require('../config/db');
    const defaultPrediction = {
      model_id: 1,
      user_id: 1,
      asset_id: 1,
      predicted_ctr: 0.025,
      predicted_cvr: 0.015,
      confidence_score: 0.85,
      features_used: JSON.stringify(['user_cohort', 'asset_ctr', 'device_type']),
      context: JSON.stringify({ time_of_day: 'morning', device: 'mobile' }),
      ...overrides
    };
    
    const result = await db.query(
      `INSERT INTO model_predictions (model_id, user_id, asset_id, predicted_ctr, predicted_cvr, confidence_score, features_used, context) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [defaultPrediction.model_id, defaultPrediction.user_id, defaultPrediction.asset_id, defaultPrediction.predicted_ctr,
       defaultPrediction.predicted_cvr, defaultPrediction.confidence_score, defaultPrediction.features_used, defaultPrediction.context]
    );
    return result.rows[0];
  },
  
  // Wait for server to be ready
  waitForServer: async () => {
    const request = require('supertest');
    const maxAttempts = 30;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        await request('http://localhost:5001').get('/api/health');
        return true;
      } catch (error) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    throw new Error('Server not ready after 30 seconds');
  }
};

// Global test cleanup
afterAll(async () => {
  // Clean up test data
  await global.testUtils.cleanup();
  jest.clearAllMocks();
  
  // Close database connections
  const db = require('../config/db');
  if (db.pool) {
    await db.pool.end();
  }
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('✅ Jest setup complete - Integration test environment configured'); 