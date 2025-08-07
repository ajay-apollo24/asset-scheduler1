module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests-setup/jest.setup.js'],
  globalSetup: '<rootDir>/tests-setup/globalSetup.js',
  globalTeardown: '<rootDir>/tests-setup/globalTeardown.js',
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/modules/**/__tests__/**/*.test.js'
  ],
  collectCoverageFrom: [
    'modules/**/*.js',
    '!modules/**/__tests__/**',
    '!modules/**/*.test.js',
    '!server.js',
    '!start.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  detectOpenHandles: true,
  
  // Environment variables for test configuration
  globals: {
    // Set to 'integration' to run against real server, 'unit' for mocks
    TEST_MODE: process.env.TEST_MODE || 'integration',
    // Server configuration for integration tests
    TEST_SERVER_URL: process.env.TEST_SERVER_URL || 'http://localhost:5001',
    // Database configuration for integration tests
    TEST_DB_NAME: process.env.TEST_DB_NAME || 'asset_allocation_test',
    TEST_DB_USER: process.env.TEST_DB_USER || 'asset_allocation',
    TEST_DB_PASSWORD: process.env.TEST_DB_PASSWORD || 'asset_allocation',
    TEST_DB_HOST: process.env.TEST_DB_HOST || 'localhost',
    TEST_DB_PORT: process.env.TEST_DB_PORT || '5435'
  }
}; 