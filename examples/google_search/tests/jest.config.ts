import { createJsWithTsPreset, type JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
  ...createJsWithTsPreset({
    tsconfig: '<rootDir>/tsconfig.json',
  }),
  watch: false,
  testEnvironment: 'node',
  globalSetup: '<rootDir>/global-setup.ts',
  globalTeardown: '<rootDir>/global-teardown.ts',
  testTimeout: 120_000,
};

export default config;
