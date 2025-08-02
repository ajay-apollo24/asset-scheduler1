module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'modules/**/controllers/**/*.js',
    'modules/**/models/**/*.js',
    'modules/**/utils/**/*.js',
    'modules/**/middleware/**/*.js',
    'modules/**/routes/**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests-setup/jest.setup.js'],
  testTimeout: 60000, // Increased to 60 seconds for integration tests
  verbose: true,
  // Remove maxWorkers and forceExit to allow tests to run against real server
  detectOpenHandles: true, // Detect open handles that prevent Jest from exiting
  // Add global test timeout
  globalSetup: '<rootDir>/tests-setup/globalSetup.js',
  globalTeardown: '<rootDir>/tests-setup/globalTeardown.js'
}; 