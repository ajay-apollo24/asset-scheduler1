// Jest setup file to mock external dependencies

// Set test environment before any modules are loaded
process.env.NODE_ENV = 'test';

// Mock logger to prevent console noise during tests
jest.mock('./modules/shared/utils/logger', () => ({
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

// Mock database connection for tests that don't need real DB
jest.mock('./config/db', () => ({
  query: jest.fn().mockImplementation((sql, params) => {
    // Return appropriate mock data based on SQL query
    if (sql.includes('INSERT')) {
      return Promise.resolve({ rows: [{ id: 1 }] });
    }
    if (sql.includes('SELECT') && sql.includes('users')) {
      return Promise.resolve({ rows: [{ id: 1, email: 'test@example.com', role: 'user' }] });
    }
    if (sql.includes('SELECT') && sql.includes('assets')) {
      return Promise.resolve({ rows: [{ id: 1, name: 'Test Asset', type: 'billboard' }] });
    }
    if (sql.includes('SELECT') && sql.includes('bookings')) {
      return Promise.resolve({ rows: [{ id: 1, title: 'Test Booking', status: 'pending' }] });
    }
    if (sql.includes('SELECT') && sql.includes('creatives')) {
      return Promise.resolve({ rows: [{ id: 1, name: 'Test Creative', type: 'image' }] });
    }
    if (sql.includes('SELECT') && sql.includes('bids')) {
      return Promise.resolve({ rows: [{ id: 1, amount: 100.00, status: 'active' }] });
    }
    if (sql.includes('UPDATE')) {
      return Promise.resolve({ rows: [{ id: 1 }] });
    }
    if (sql.includes('DELETE')) {
      return Promise.resolve({ rows: [] });
    }
    // Default response
    return Promise.resolve({ rows: [] });
  })
}));

// Mock the server module to prevent middleware issues
jest.mock('./server', () => {
  const express = require('express');
  const app = express();
  
  // Add the address method that supertest expects
  app.address = jest.fn().mockReturnValue({ port: 5000 });
  
  return app;
});

// Mock shared modules
jest.mock('./modules/shared/index', () => ({
  logger: {
    logRequest: jest.fn()
  },
  authRoutes: {
    use: jest.fn()
  },
  userRoutes: {
    use: jest.fn()
  },
  auditRoutes: {
    use: jest.fn()
  },
  reportRoutes: {
    use: jest.fn()
  },
  cacheRoutes: {
    use: jest.fn()
  },
  logRoutes: {
    use: jest.fn()
  }
}));

// Mock models
jest.mock('./modules/asset-booking/models/Asset', () => ({
  findById: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
  // Add missing methods used in tests
  findByLocation: jest.fn(),
  findByType: jest.fn(),
  findActive: jest.fn()
}));

jest.mock('./modules/asset-booking/models/Booking', () => ({
  findById: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateStatus: jest.fn(),
  destroy: jest.fn(),
  // Add missing methods used in rule engine tests
  findConflicts: jest.fn(),
  findAdjacentByAssetAndLOB: jest.fn(),
  findByAssetLOBWithinWindow: jest.fn(),
  findByAssetPurposeWithinWindow: jest.fn(),
  findActiveByLOB: jest.fn(),
  findLastBookingByAssetLOB: jest.fn(),
  // Add missing methods used in booking controller tests
  softDelete: jest.fn(),
  updateDates: jest.fn()
}));

jest.mock('./modules/asset-booking/models/Bid', () => ({
  findById: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
  // Add missing methods used in bidding tests
  getActiveBids: jest.fn(),
  findByBookingAndUser: jest.fn(),
  getBidsForBooking: jest.fn(),
  getBiddingHistory: jest.fn(),
  // Add missing methods used in bidding controller tests
  updateBid: jest.fn(),
  cancelBid: jest.fn()
}));

jest.mock('./modules/ad-server/models/Creative', () => ({
  findById: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn()
}));

jest.mock('./modules/ad-server/models/Campaign', () => ({
  findById: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn()
}));

// Mock AuditLog model
jest.mock('./modules/shared/models/AuditLog', () => ({
  findById: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn()
}));

// Mock rule engine - but allow tests to override this
jest.mock('./modules/asset-booking/utils/ruleEngine', () => {
  const originalModule = jest.requireActual('./modules/asset-booking/utils/ruleEngine');
  return {
    ...originalModule,
    validateBookingRules: jest.fn().mockImplementation(async (booking) => {
      // Default implementation that returns empty array
      // Tests can override this by calling mockResolvedValue on the function
      return [];
    })
  };
});

// Mock bidding validation
jest.mock('./modules/asset-booking/utils/biddingValidation', () => ({
  validateBid: jest.fn().mockResolvedValue({ isValid: true, errors: [] })
}));

// Mock fair allocation
jest.mock('./modules/asset-booking/utils/fairAllocation', () => ({
  allocateAsset: jest.fn().mockResolvedValue({ success: true }),
  calculateFairnessScore: jest.fn().mockResolvedValue(0.5),
  resolveConflicts: jest.fn().mockResolvedValue([])
}));

// Global test utilities
global.testUtils = {
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
  
  cleanup: jest.fn().mockResolvedValue(undefined),
  
  createTestUser: jest.fn().mockResolvedValue({
    id: 1,
    email: 'test@example.com',
    role: 'user',
    token: 'test-token'
  }),
  
  createTestAsset: jest.fn().mockResolvedValue({
    id: 1,
    name: 'Test Asset',
    type: 'billboard',
    location: 'Test Location'
  }),
  
  createTestCreative: jest.fn().mockResolvedValue({
    id: 1,
    name: 'Test Creative',
    type: 'image',
    status: 'approved'
  }),
  
  createTestCampaign: jest.fn().mockResolvedValue({
    id: 1,
    name: 'Test Campaign',
    status: 'active',
    budget: 1000
  }),
  
  createTestPerformanceMetrics: jest.fn().mockResolvedValue({
    id: 1,
    creative_id: 1,
    impressions: 1000,
    clicks: 50,
    revenue: 100
  }),
  
  // Add missing test utility functions
  generateTestUser: jest.fn().mockReturnValue({
    id: 1,
    email: 'test@example.com',
    username: 'testuser',
    role: 'user'
  }),
  
  generateTestAsset: jest.fn().mockReturnValue({
    id: 1,
    name: 'Test Asset',
    type: 'billboard',
    location: 'Test Location',
    level: 'secondary'
  }),
  
  generateTestBooking: jest.fn().mockReturnValue({
    id: 1,
    title: 'Test Booking',
    asset_id: 1,
    user_id: 1,
    start_date: '2024-01-15',
    end_date: '2024-01-20',
    status: 'pending'
  }),
  
  generateTestCreative: jest.fn().mockReturnValue({
    id: 1,
    name: 'Test Creative',
    type: 'image',
    status: 'approved',
    asset_id: 1,
    campaign_id: 1
  }),
  
  generateTestCampaign: jest.fn().mockReturnValue({
    id: 1,
    name: 'Test Campaign',
    status: 'active',
    budget: 1000.00
  }),
  
  generateTestBid: jest.fn().mockReturnValue({
    id: 1,
    booking_id: 1,
    user_id: 1,
    amount: 100.00,
    status: 'active'
  })
};

// Global test cleanup
afterAll(async () => {
  // Clean up any remaining handles
  jest.clearAllMocks();
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

console.log('✅ Jest setup complete - Test environment configured'); 