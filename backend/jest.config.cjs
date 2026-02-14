module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  moduleFileExtensions: ['js', 'json'],
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
  detectOpenHandles: true,
  forceExit: true,
  testTimeout: 30000
};