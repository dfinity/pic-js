import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.test.ts',
        'vitest.config.ts',
      ],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    // Add delay between tests when running in Wallaby.js
    // Ensure proper cleanup between test runs
    setupFiles: ['./test/setup.ts'],
  },
}); 
