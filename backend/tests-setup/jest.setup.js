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
    await db.query('DELETE FROM creatives WHERE name LIKE \'Test%\'');
    await db.query('DELETE FROM bookings WHERE title LIKE \'Test%\'');
    await db.query('DELETE FROM assets WHERE name LIKE \'Test%\'');
    await db.query('DELETE FROM bids WHERE bid_amount > 0');
    await db.query('DELETE FROM approvals WHERE decided_by IN (SELECT id FROM users WHERE email LIKE \'test%@%\' OR email LIKE \'admin%@%\')');
    await db.query('DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE email LIKE \'test%@%\' OR email LIKE \'admin%@%\')');
    await db.query('DELETE FROM users WHERE email LIKE \'test%@%\' OR email LIKE \'admin%@%\'');
    await db.query('DELETE FROM campaigns WHERE name LIKE \'Test%\'');
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