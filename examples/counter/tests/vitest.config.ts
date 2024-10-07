import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: 'examples/counter/tests',
    globalSetup: './global-setup.ts',
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
