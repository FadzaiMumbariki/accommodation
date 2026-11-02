/**
 * Jest configuration used only by the Detox E2E suite (see `.detoxrc.js`).
 * Kept separate from the unit-test Jest config in `package.json` because Detox
 * needs a single worker, a long timeout and its own environment/reporters.
 *
 * @type {import('jest').Config}
 */
module.exports = {
  rootDir: '..',
  testMatch: ['<rootDir>/e2e/**/*.e2e.ts'],
  testTimeout: 180000,
  maxWorkers: 1,
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  reporters: ['detox/runners/jest/reporter'],
  testEnvironment: 'detox/runners/jest/testEnvironment',
  transform: {
    '\\.tsx?$': ['babel-jest', { presets: ['babel-preset-expo'] }],
  },
  verbose: true,
};
