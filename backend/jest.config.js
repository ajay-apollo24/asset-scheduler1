module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'controllers/**/*.js',
    'models/**/*.js',
    'utils/**/*.js',
    'middleware/**/*.js',
    'routes/**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 60000, // Increased to 60 seconds for integration tests
  verbose: true,
  // Add these options for better test isolation and debugging
  maxWorkers: 1, // Run tests sequentially to avoid database conflicts
  forceExit: true, // Force exit after tests complete
  detectOpenHandles: true // Detect open handles that prevent Jest from exiting
}; 