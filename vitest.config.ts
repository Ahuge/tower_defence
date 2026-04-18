/**
 * Vitest configuration — pure-logic + component tests run in jsdom.
 *
 * Vitest 4 transforms JSX via oxc (Rolldown) by default, so we set
 * oxc-shaped JSX options here instead of esbuild-shaped ones. The
 * `preact/compat` resolve aliases mirror vite.config.ts so tests
 * import React-style components the same way the app does.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: {
    jsx: {
      runtime: 'automatic',
      importSource: 'preact',
    },
  },

  resolve: {
    alias: {
      'react': 'preact/compat',
      'react-dom': 'preact/compat',
    },
  },

  // Build-time defines mirrored from vite.config.ts so modules that
  // reference them (main.ts prints __BUILD_TIME__) don't explode
  // under the test runner.
  define: {
    __GIT_SHA__: JSON.stringify('test'),
    __BUILD_TIME__: JSON.stringify('test'),
  },

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'test/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/**/__tests__/**',
        'src/**/__smoke__/**',
        'src/main.ts',
      ],
    },
  },
});
