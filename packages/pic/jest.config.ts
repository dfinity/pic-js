import type { Config } from 'jest';
import { createJsWithTsPreset } from 'ts-jest';

const config: Config = {
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
