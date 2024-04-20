import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: 'examples/counter/tests',
    globalSetup: './global-setup.ts',
  },
});
