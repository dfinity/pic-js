import { createJsWithTsPreset, type JestConfigWithTsJest } from 'ts-jest';

const config: JestConfigWithTsJest = {
  ...createJsWithTsPreset({
    tsconfig: '<rootDir>/tsconfig.test.json',
  }),
  watch: false,
  testEnvironment: 'node',
  globalSetup: '<rootDir>/tests/global-setup.ts',
  globalTeardown: '<rootDir>/tests/global-teardown.ts',
  testTimeout: 60_000,
};

export default config;
