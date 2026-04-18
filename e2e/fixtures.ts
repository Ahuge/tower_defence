/**
 * Shared Playwright test fixtures.
 *
 * `test` = the default Playwright test augmented with a `gotoFresh`
 * helper that:
 *   1. Navigates with `?test=1` so the debug hook installs
 *   2. Clears localStorage so no prior state leaks in
 *   3. Waits for the app-startup splash to dismiss (via the
 *      `isBootComplete` hook) so subsequent steps don't race the
 *      boot flow.
 *
 * Every E2E spec should use `gotoFresh()` instead of `page.goto`
 * unless it specifically wants to test mid-session behaviour.
 */
import { test as base, expect, Page } from '@playwright/test';

export { expect };

export interface TDFixtures {
  gotoFresh: (pathSuffix?: string) => Promise<void>;
}

export const test = base.extend<TDFixtures>({
  gotoFresh: async ({ page, baseURL }, use) => {
    const gotoFresh = async (pathSuffix = '') => {
      // First navigation primes the origin so localStorage exists.
      await page.goto(`${baseURL}${pathSuffix}?test=1`);
      // Wipe any state from a previous run in the same browser
      // context (Playwright reuses contexts per-test).
      await page.evaluate(() => {
        try { localStorage.clear(); } catch {}
        try { sessionStorage.clear(); } catch {}
      });
      // Navigate again so the reload picks up empty storage.
      await page.goto(`${baseURL}${pathSuffix}?test=1`);
      // Wait for the debug hook to install (it imports lazily), then
      // wait for the splash to dismiss.
      await page.waitForFunction(() => !!window.__td_test, null, { timeout: 15_000 });
      await page.waitForFunction(() => window.__td_test?.isBootComplete(), null, { timeout: 15_000 });
    };
    await use(gotoFresh);
  },
});

// ─── Re-usable helpers ──────────────────────────────────────

/** Wait for the tutorial overlay to be rendering a specific step. */
export async function waitForTutorialStep(page: Page, stepId: string, timeout = 10_000): Promise<void> {
  await page.waitForFunction(
    (id) => window.__td_test?.getActiveTutorialStep() === id,
    stepId,
    { timeout },
  );
}

/** Wait until no tutorial is active (after skip / complete). */
export async function waitForNoTutorial(page: Page, timeout = 5_000): Promise<void> {
  await page.waitForFunction(
    () => window.__td_test?.getActiveTutorialStep() === null,
    null,
    { timeout },
  );
}

/** Click the given grid cell via the test hook. */
export async function clickCell(page: Page, col: number, row: number): Promise<void> {
  const ok = await page.evaluate(
    ({ c, r }) => window.__td_test?.clickCell(c, r) ?? false,
    { c: col, r: row },
  );
  if (!ok) throw new Error(`clickCell(${col}, ${row}) returned false — scene not ready?`);
}

/** Ambient type for TypeScript in spec files. Playwright specs use
 *  window.__td_test directly via page.evaluate, and TS needs to
 *  know the shape. */
declare global {
  interface Window {
    __td_test?: {
      clickCell: (col: number, row: number) => boolean;
      getActiveTutorialStep: () => string | null;
      getActiveTutorialTrack: () => string | null;
      resetTutorialState: () => void;
      isBootComplete: () => boolean;
    };
  }
}
