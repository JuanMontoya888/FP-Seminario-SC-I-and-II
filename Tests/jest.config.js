module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/unit', '<rootDir>/scenarios'],
  testMatch: ['**/*.test.js', '**/*.spec.js'],
  clearMocks: true,
  restoreMocks: true,
  verbose: true
};
