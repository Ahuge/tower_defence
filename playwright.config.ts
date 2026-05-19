/**
 * Playwright E2E configuration.
 *
 * Spins up `npm run preview` against the production build before
 * running tests — deterministic output, no dev-server HMR drift.
 * Two projects (desktop + mobile) share the same spec tree; specs
 * opt into one or both via project selectors on the command line.
 *
 * Scope intentionally narrow: Chromium only. Firefox / WebKit add
 * coverage at 3x CI runtime and so far no real bug has surfaced
 * that chromium-only missed. If one does, add a project here.
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = 4173; // Vite preview default
const BASE_URL = `http://localhost:${PORT}/tower_defence/`;

export default defineConfig({
  testDir: './e2e',
  // The e2e suite is smaller but individual tests take longer than
  // unit tests (full app boot + splash + interactions). Give each
  // a generous default; fast ones still finish quickly.
  timeout: 30_000,
  expect: { timeout: 5_000 },
  // Bumping workers > 1 is on the table (each worker has its own
  // browser context so localStorage doesn't leak), but the webServer
  // start sequence races with `fullyParallel: true` — the preview
  // server takes ~30s to build + boot, and parallel workers fire off
  // page.goto before it's reachable. Solving that needs either a
  // pre-built dist served by a separate process or a webServer
  // health-check endpoint; out of scope for the projection fix.
  // Tracked as a follow-up.
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  // Before running: build once, then start the preview server. CI gets
  // the exact bundle users would see.
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },

  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
    },
  ],
});
