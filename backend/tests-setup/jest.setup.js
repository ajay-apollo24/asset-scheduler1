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

const db = require('../config/db');

// Test configuration
const TEST_MODE = process.env.TEST_MODE || 'integration';
const baseURL = process.env.TEST_SERVER_URL || 'http://localhost:5001';

console.log(`🧪 Running tests in ${TEST_MODE.toUpperCase()} mode`);
console.log(`🌐 Server URL: ${baseURL}`);

// Global test utilities
global.testUtils = {
  // Test mode configuration
  isIntegrationMode: TEST_MODE === 'integration',
  isUnitMode: TEST_MODE === 'unit',
  
  // Server configuration
  baseURL,
  
  // Database configuration
  dbConfig: {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: process.env.TEST_DB_PORT || '5435',
    database: process.env.TEST_DB_NAME || 'asset_allocation_test',
    user: process.env.TEST_DB_USER || 'asset_allocation',
    password: process.env.TEST_DB_PASSWORD || 'asset_allocation'
  },

  // Mock request/response objects for unit tests
  mockRequest: () => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    user: { user_id: 1, email: 'test@example.com', role: 'admin' },
    ip: '127.0.0.1',
    get: jest.fn().mockReturnValue('test-user-agent')
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

  // Integration test utilities
  async makeRequest(method, endpoint, data = null, token = null) {
    if (!this.isIntegrationMode) {
      throw new Error('makeRequest only available in integration mode');
    }

    const url = `${this.baseURL}${endpoint}`;
    const options = {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    };

    if (data && ['POST', 'PUT', 'PATCH'].includes(options.method)) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    const responseData = await response.text();
    
    let jsonData;
    try {
      jsonData = JSON.parse(responseData);
    } catch (e) {
      jsonData = responseData;
    }

    return {
      status: response.status,
      data: jsonData,
      headers: response.headers,
      ok: response.ok
    };
  },

  // Authentication utilities for integration tests
  async loginUser(email, password) {
    if (!this.isIntegrationMode) {
      return { token: 'mock-token' };
    }

    const response = await this.makeRequest('POST', '/api/auth/login', {
      email,
      password
    });

    if (response.ok) {
      return response.data;
    }
    throw new Error(`Login failed: ${response.data.message || response.status}`);
  },

  async createTestUser(userData = {}) {
    if (!this.isIntegrationMode) {
      return { id: 1, ...userData };
    }

    const defaultUser = {
      email: `test-${Date.now()}@example.com`,
      password: 'password123',
      first_name: 'Test',
      last_name: 'User',
      role: 'user',
      ...userData
    };

    const response = await this.makeRequest('POST', '/api/auth/register', defaultUser);
    if (response.ok) {
      return response.data;
    }
    throw new Error(`User creation failed: ${response.data.message || response.status}`);
  },

  // Database utilities
  async setupTestDatabase() {
    if (this.isUnitMode) {
      console.log('🗄️  Unit mode: Skipping database setup');
      return;
    }

    console.log('🗄️  Setting up test database...');
    
    try {
      // Clear test data
      await this.cleanup();
      
      // Create test data
      await this.createTestData();
      
      console.log('✅ Test database setup complete');
    } catch (error) {
      console.error('❌ Test database setup failed:', error.message);
      throw error;
    }
  },

  async createTestData() {
    if (this.isUnitMode) return;

    try {
      // Create test organizations
      const timestamp = Date.now();
      const org1 = await db.query(
        'INSERT INTO organizations (name, domain) VALUES ($1, $2) RETURNING *',
        [`Test Org 1 ${timestamp}`, `test1-${timestamp}.com`]
      );

      const org2 = await db.query(
        'INSERT INTO organizations (name, domain) VALUES ($1, $2) RETURNING *',
        [`Test Org 2 ${timestamp}`, `test2-${timestamp}.com`]
      );

      // Create test users
      const user1 = await db.query(
        'INSERT INTO users (email, password_hash, organization_id) VALUES ($1, $2, $3) RETURNING *',
        ['test1@test1.com', '$2a$10$test.hash', org1.rows[0].id]
      );

      const user2 = await db.query(
        'INSERT INTO users (email, password_hash, organization_id) VALUES ($1, $2, $3) RETURNING *',
        ['test2@test2.com', '$2a$10$test.hash', org2.rows[0].id]
      );

      // Create test assets
      const asset1 = await db.query(
        `INSERT INTO assets (name, type, location, level, max_slots, importance, impressions_per_day, value_per_day, is_active) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        ['Test Billboard 1', 'billboard', 'Downtown', 'primary', 3, 5, 15000, 750.00, true]
      );

      const asset2 = await db.query(
        `INSERT INTO assets (name, type, location, level, max_slots, importance, impressions_per_day, value_per_day, is_active) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        ['Test Digital Screen 1', 'digital_screen', 'Mall', 'secondary', 2, 3, 8000, 400.00, true]
      );

      // Create test campaigns
      const campaign1 = await db.query(
        `INSERT INTO campaigns (name, advertiser_id, asset_id, start_date, end_date, status, budget, lob, 
         creative_settings, performance_settings) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [
          'Test Campaign 1', 
          user1.rows[0].id, 
          asset1.rows[0].id, 
          new Date(Date.now() + 86400000), // Tomorrow
          new Date(Date.now() + 7 * 86400000), // 7 days from now
          'active',
          5000.00,
          'Pharmacy',
          JSON.stringify({ format: 'banner', dimensions: '300x250' }),
          JSON.stringify({ optimization_goal: 'clicks' })
        ]
      );

      // Create test creatives
      const creative1 = await db.query(
        `INSERT INTO creatives (name, campaign_id, asset_id, type, dimensions, file_size, status, content) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          'Test Creative 1',
          campaign1.rows[0].id,
          asset1.rows[0].id,
          'banner',
          JSON.stringify({ width: 300, height: 250 }),
          50000,
          'active',
          'Test creative content'
        ]
      );

      console.log('✅ Test data created successfully');
    } catch (error) {
      console.error('❌ Test data creation failed:', error.message);
      throw error;
    }
  },

  // Wait for server to be ready
  waitForServer: async () => {
    if (global.testUtils.isUnitMode) {
      console.log('⏭️  Unit mode: Skipping server wait');
      return;
    }

    const maxAttempts = 60;
    const delay = 500;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(`${baseURL}/api/health`);
        if (response.ok) {
          console.log(`✅ Server is ready for testing (attempt ${attempt})`);
          return;
        }
      } catch (error) {
        if (attempt % 10 === 0) {
          console.log(`⏳ Waiting for server... (attempt ${attempt}/${maxAttempts})`);
        }
      }
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    console.error('❌ Server failed to start within expected time');
    throw new Error('Server failed to start within expected time');
  },

  // Close database connections
  closeDatabase: async () => {
    try {
      await db.close();
      console.log('✅ Database connections closed');
    } catch (error) {
      console.warn('Warning: Error closing database connections:', error.message);
    }
  },

  // Cleanup test data
  cleanup: async () => {
    if (global.testUtils.isUnitMode) {
      console.log('⏭️  Unit mode: Skipping cleanup');
      return;
    }

    try {
      // Clean up in reverse dependency order
      try {
        await db.query('DELETE FROM creatives WHERE name LIKE \'Test%\'');
      } catch (error) {
        // Table might not exist
      }
      try {
        await db.query('DELETE FROM campaigns WHERE name LIKE \'Test%\'');
      } catch (error) {
        // Table might not exist
      }
      try {
        await db.query('DELETE FROM assets WHERE name LIKE \'Test%\'');
      } catch (error) {
        // Table might not exist
      }
      try {
        await db.query('DELETE FROM approvals WHERE decided_by IN (SELECT id FROM users WHERE email LIKE \'test%@%\' OR email LIKE \'admin%@%\')');
      } catch (error) {
        // Table might not exist
      }
      try {
        await db.query('DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'test%@%\' OR email LIKE \'admin%@%\')');
      } catch (error) {
        // Table might not exist
      }
      try {
        await db.query('DELETE FROM users WHERE email LIKE \'test%@%\' OR email LIKE \'admin%@%\'');
      } catch (error) {
        // Table might not exist
      }
      
      // Clean up ML/experimentation data
      try {
        await db.query('DELETE FROM model_predictions WHERE features_used LIKE \'%test%\'');
      } catch (error) {
        // Table might not exist
      }
      try {
        await db.query('DELETE FROM experiment_results WHERE experiment_id IN (SELECT id FROM experiments WHERE name LIKE \'Test%\' OR name LIKE \'test%\')');
      } catch (error) {
        // Table might not exist
      }
      try {
        await db.query('DELETE FROM bandit_pulls WHERE arm_id IN (SELECT id FROM bandit_arms WHERE arm_name LIKE \'Test%\' OR arm_name LIKE \'test%\')');
      } catch (error) {
        // Table might not exist
      }
      try {
        await db.query('DELETE FROM experiments WHERE name LIKE \'Test%\' OR name LIKE \'test%\'');
      } catch (error) {
        // Table might not exist
      }
      try {
        await db.query('DELETE FROM bandit_arms WHERE arm_name LIKE \'Test%\' OR arm_name LIKE \'test%\'');
      } catch (error) {
        // Table might not exist
      }
      try {
        await db.query('DELETE FROM ctr_models WHERE model_name LIKE \'Test%\'');
      } catch (error) {
        // Table might not exist
      }
    } catch (error) {
      console.warn('Cleanup warning:', error.message);
    }
  },

  // Generate JWT token for testing
  generateToken: (user) => {
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'test-secret';
    return jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        organization_id: user.organization_id,
        roles: user.roles || []
      }, 
      secret, 
      { expiresIn: '1h' }
    );
  }
};

// Setup based on test mode
if (global.testUtils.isIntegrationMode) {
  console.log('🚀 Integration test mode: Will test against real server');
  // Wait for server to be ready
  global.testUtils.waitForServer().then(() => {
    console.log('✅ Jest setup complete - Integration test environment configured');
  }).catch((error) => {
    console.error('❌ Server setup failed:', error.message);
  });
} else {
  console.log('🧪 Unit test mode: Using mocks');
  console.log('✅ Jest setup complete - Unit test environment configured');
}

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