import type { Config } from 'jest';

const config: Config = {
  transform: {
    '^.+\\.(t|j)sx?$': '@swc/jest',
  },
  // @icp-sdk/core v6 depends on @noble/* v2, which ship ESM only. Jest resolves
  // core's CJS build, so these have to be transformed rather than ignored.
  // The pattern has to match them at any depth: package managers nest them
  // under the dependent when versions conflict.
  transformIgnorePatterns: ['node_modules/(?!.*(@noble|@scure))'],
  watch: false,
  testEnvironment: 'node',
  globalSetup: '<rootDir>/tests/global-setup.ts',
  globalTeardown: '<rootDir>/tests/global-teardown.ts',
  testTimeout: 60_000,
};

export default config;
