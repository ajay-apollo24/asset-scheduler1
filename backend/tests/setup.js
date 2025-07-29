// tests/setup.js
const dotenv = require('dotenv');
const db = require('../config/db');

// Load test environment variables
dotenv.config({ path: './test.env' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.TEST_DB_NAME || 'asset_scheduler_test';
process.env.LOG_LEVEL = 'info'; // Enable logs during tests

// Global test timeout - increased for integration tests
jest.setTimeout(60000); // 60 seconds

// Mock console methods to reduce noise (commented out to see logs)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// Global test utilities
global.testUtils = {
  // Generate test data
  generateTestUser: (overrides = {}) => ({
    user_id: 1,
    email: 'test@example.com',
    role: 'user',
    ...overrides
  }),

  generateTestAsset: (overrides = {}) => ({
    name: 'Test Asset',
    location: 'test_location',
    type: 'banner',
    max_slots: 1,
    importance: 1,
    impressions_per_day: 1000,
    value_per_day: 100,
    level: 'secondary',
    is_active: true,
    ...overrides
  }),

  generateTestBooking: (overrides = {}) => ({
    asset_id: 1,
    user_id: 1,
    title: 'Test Booking',
    lob: 'Pharmacy',
    purpose: 'Test Purpose',
    start_date: '2024-01-15',
    end_date: '2024-01-20',
    status: 'pending',
    ...overrides
  }),

  // Mock request object
  mockRequest: (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    user: global.testUtils.generateTestUser(),
    ip: '127.0.0.1',
    get: jest.fn(),
    ...overrides
  }),

  // Mock response object
  mockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
  },

  // Mock next function
  mockNext: jest.fn(),

  // Clean up function
  cleanup: async () => {
    // Clean up any test data
    jest.clearAllMocks();
  }
};

// Global setup and teardown
beforeAll(async () => {
  // Ensure database is ready
  try {
    await db.query('SELECT 1');
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
});

afterAll(async () => {
  // Close all database connections
  try {
    await db.close();
  } catch (error) {
    console.error('Error closing database connections:', error);
  }
}); 