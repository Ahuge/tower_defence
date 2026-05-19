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
      // context (Playwright reuses contexts per-test). Then mark the
      // player as "returning" so the first-launch SplashScreen
      // doesn't intercept the auto-start flows the tutorial tests
      // depend on (basics → skip_hint → match-mode primers). The
      // splash itself has its own dedicated test if/when one is
      // needed; every other spec wants the post-splash menu state.
      await page.evaluate(() => {
        try { localStorage.clear(); } catch {}
        try { sessionStorage.clear(); } catch {}
        try {
          localStorage.setItem('td_profile', JSON.stringify({
            schemaVersion: 1,
            xp: 0,
            cores: 0,
            coreTransactions: [],
            unlockedModes: ['standard', 'tutorial'],
            unlockedMaps: ['plains', 'tutorial', 'hero_plains'],
            unlockedFactionsLifetime: ['arcane'],
            campaignProgress: {},
            campaignState: {},
            careerHighStage: 0,
            towerChips: {},
            // Pre-mark every shipped announcement as seen so the
            // AnnouncementModal doesn't auto-pop over the tutorial /
            // menu state the specs are exercising. Add new entries
            // here when src/data/Announcements.ts gains an id.
            flags: {
              first_game_complete: true,
              'announcement_seen.campaigns-released': true,
              'announcement_seen.mech-campaign-iron-cascade': true,
            },
          }));
        } catch {}
      });
      // Navigate again so the reload picks up the seeded profile.
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

/** Assert the popover's rendered box does NOT overlap the given
 *  element's box. Reads both via Playwright's boundingBox() so the
 *  assertion measures the real rendered layout on the live page,
 *  not our offline math. Descriptive failure message shows both
 *  boxes + the intersection region so regressions are diagnosable
 *  from the log alone. */
export async function assertPopoverDoesNotCover(page: Page, selector: string, label = selector): Promise<void> {
  const popover = page.locator('.tutorial-popover').first();
  const target = page.locator(selector).first();
  const pBox = await popover.boundingBox();
  const tBox = await target.boundingBox();
  if (!pBox) throw new Error('popover has no bounding box');
  if (!tBox) throw new Error(`${label} has no bounding box (not rendered?)`);
  const ix = {
    x: Math.max(pBox.x, tBox.x),
    y: Math.max(pBox.y, tBox.y),
    x2: Math.min(pBox.x + pBox.width, tBox.x + tBox.width),
    y2: Math.min(pBox.y + pBox.height, tBox.y + tBox.height),
  };
  const overlaps = ix.x2 > ix.x && ix.y2 > ix.y;
  if (overlaps) {
    const iw = Math.round(ix.x2 - ix.x);
    const ih = Math.round(ix.y2 - ix.y);
    throw new Error(
      `Popover overlaps ${label} by ${iw}×${ih}px.\n` +
      `  popover: x=${Math.round(pBox.x)} y=${Math.round(pBox.y)} w=${Math.round(pBox.width)} h=${Math.round(pBox.height)}\n` +
      `  ${label}: x=${Math.round(tBox.x)} y=${Math.round(tBox.y)} w=${Math.round(tBox.width)} h=${Math.round(tBox.height)}`,
    );
  }
}

/** Dismiss every tutorial track that auto-fires after a fresh boot:
 *  basics first, then skip_hint (which surfaces on menu return). By
 *  the time this resolves the menu is clean and no overlay is in the
 *  way of subsequent interactions.
 *
 *  Note: skip_hint is a single-step track with no Skip button (only
 *  Done). We click whatever dismiss-button the popover is currently
 *  rendering rather than assuming one is always present. */
export async function dismissAllAutoTutorials(page: Page): Promise<void> {
  // Dismiss basics (multi-step — has Skip).
  await waitForTutorialStep(page, 'intro', 8_000);
  await page.locator('.tutorial-popover').getByRole('button', { name: 'Skip' }).click();

  // skip_hint (single-step — Skip hidden, only Done).
  try {
    await waitForTutorialStep(page, 'hint', 3_000);
    await page.locator('.tutorial-popover').getByRole('button', { name: 'Done' }).click();
  } catch {
    // skip_hint already dismissed or didn't appear — fine.
  }
  await waitForNoTutorial(page);
}

/** Ambient type for TypeScript in spec files. Playwright specs use
 *  window.__td_test directly via page.evaluate, and TS needs to
 *  know the shape. */
interface SabotageStatusSnapshot {
  generators: { idx: number; alive: boolean; hp: number; maxHp: number }[];
  throne: { alive: boolean; invulnerable: boolean; hp: number; maxHp: number } | null;
}

declare global {
  interface Window {
    __td_test?: {
      clickCell: (col: number, row: number) => boolean;
      getCellClientPos: (col: number, row: number) => { x: number; y: number } | null;
      emitGameEvent: (event: string, ...args: unknown[]) => boolean;
      jumpToTutorialStep: (stepId: string, maxSteps?: number) => boolean;
      selectDockTower: (index: number) => void;
      getActiveTutorialStep: () => string | null;
      getActiveTutorialTrack: () => string | null;
      resetTutorialState: () => void;
      isBootComplete: () => boolean;
      isGameSceneActive: () => boolean;
      getSabotageStatus: () => SabotageStatusSnapshot | null;
      forceKillSabotageTarget: (kind: 'generator' | 'throne', idx?: number) => boolean;
      getGreenwardStatus: () => {
        ruins: { id: string; mode: 'ceremony' | 'siege' | 'mercy'; claimed: boolean; progress01: number }[];
        claimedByMode: { ceremony: number; siege: number; mercy: number };
        finale: { active: string; resolvedNaveMode: string | null } | null;
      } | null;
      forceClaimGreenwardRuin: (ruinId: string) => boolean;
      getMissionStars: (campaignFactionId: string, missionIdx: number) => number;
      onceEvent: (event: string, timeoutMs?: number) => Promise<unknown[]>;
      launchCampaignMission: (campaignFactionId: string, missionIdx: number) => boolean;
      setCameraZoom: (zoom: number, scrollX?: number, scrollY?: number) => boolean;
      stagePlacementGhost: (towerTypeId: string, col: number, row: number) => boolean;
    };
  }
}
