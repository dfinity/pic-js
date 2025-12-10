import type { Config } from 'jest';

const config: Config = {
  watch: false,
  transform: {
    '^.+\\.(t|j)sx?$': '@swc/jest',
  },
  testEnvironment: 'node',
  globalSetup: '<rootDir>/global-setup.ts',
  globalTeardown: '<rootDir>/global-teardown.ts',
  testTimeout: 120_000,
};

export default config;
