import type { Config } from 'jest';

const config: Config = {
  transform: {
    '^.+\\.(t|j)sx?$': '@swc/jest',
  },
  watch: false,
  testEnvironment: 'node',
  globalSetup: '<rootDir>/tests/global-setup.ts',
  globalTeardown: '<rootDir>/tests/global-teardown.ts',
  testTimeout: 60_000,
};

export default config;
