import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: 'examples/http/tests',
    globalSetup: './global-setup.ts',
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
