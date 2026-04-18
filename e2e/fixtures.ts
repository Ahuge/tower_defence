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

/** Click the given grid cell via Playwright's real mouse at the
 *  computed client coordinates. Goes through the browser's real
 *  pointer pipeline (more reliable on Phaser than dispatchEvent). */
export async function clickCell(page: Page, col: number, row: number): Promise<void> {
  const pos = await page.evaluate(
    ({ c, r }) => window.__td_test?.getCellClientPos(c, r) ?? null,
    { c: col, r: row },
  );
  if (!pos) throw new Error(`clickCell(${col}, ${row}): scene not ready or cell out of view`);
  await page.mouse.click(pos.x, pos.y);
}

/** Dismiss every tutorial track that auto-fires after a fresh boot:
 *  basics first, then skip_hint (which surfaces on menu return). By
 *  the time this resolves the menu is clean and no overlay is in the
 *  way of subsequent interactions. */
export async function dismissAllAutoTutorials(page: Page): Promise<void> {
  // Dismiss basics if it's running.
  await waitForTutorialStep(page, 'intro', 8_000);
  await page.getByRole('button', { name: 'Skip' }).click();

  // skip_hint should auto-appear after the 500ms delay.
  try {
    await waitForTutorialStep(page, 'hint', 3_000);
    await page.getByRole('button', { name: 'Skip' }).click();
  } catch {
    // skip_hint already dismissed or didn't appear — fine.
  }
  await waitForNoTutorial(page);
}

/** Ambient type for TypeScript in spec files. Playwright specs use
 *  window.__td_test directly via page.evaluate, and TS needs to
 *  know the shape. */
declare global {
  interface Window {
    __td_test?: {
      clickCell: (col: number, row: number) => boolean;
      getCellClientPos: (col: number, row: number) => { x: number; y: number } | null;
      emitGameEvent: (event: string, ...args: unknown[]) => boolean;
      selectDockTower: (index: number) => void;
      getActiveTutorialStep: () => string | null;
      getActiveTutorialTrack: () => string | null;
      resetTutorialState: () => void;
      isBootComplete: () => boolean;
    };
  }
}
