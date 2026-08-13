import { defineConfig } from 'vitest/config';

/**
 * Test config is kept separate from vite.config.js on purpose: the app config
 * loads the React plugin and the /api/gemini dev middleware, neither of which
 * the parsing tests need.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js', 'api/**/*.test.js'],
    globals: false,
  },
});
