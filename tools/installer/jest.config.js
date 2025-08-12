module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.test.js'
  ],
  collectCoverageFrom: [
    'lib/*.js',
    'bin/*.js',
    '!jest.config.js',
    '!**/__tests__/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 30000,
  verbose: true,
  // Setup for mocking modules
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};