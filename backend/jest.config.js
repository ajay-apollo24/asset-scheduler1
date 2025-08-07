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
  detectOpenHandles: true
}; 