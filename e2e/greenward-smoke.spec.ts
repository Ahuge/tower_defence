/**
 * Greenward campaign — smoke spec.
 *
 * Two tests:
 *
 *   1. M1 (The Boundary Stones) boots and reports a Ceremony ruin
 *      via getGreenwardStatus.
 *
 *   2. M10 (Caer Lythen) boots, reports three setpiece ruins
 *      (Courtyard / Nave / Throne), and the finale controller
 *      reports the initial 'courtyard' setpiece.
 *
 * No happy-path / win-condition assertions yet — the Greenward
 * framework is freshly wired and full end-to-end mission completion
 * via Phaser headless is a follow-up spec. This smoke covers the
 * "framework boots without crash" regression surface.
 */
import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

const SCENE_BOOT_TIMEOUT_MS = 15_000;
const CONTROLLER_INIT_TIMEOUT_MS = 10_000;

async function launchGreenward(page: Page, missionIdx: number): Promise<void> {
  const ok = await page.evaluate(
    (idx) => window.__td_test?.launchCampaignMission('nature', idx) ?? false,
    missionIdx,
  );
  if (!ok) throw new Error(`launchCampaignMission(nature, ${missionIdx}) returned false`);

  await page.waitForFunction(
    () => window.__td_test?.isGameSceneActive() ?? false,
    null,
    { timeout: SCENE_BOOT_TIMEOUT_MS },
  );
  await page.evaluate(() => window.dispatchEvent(new Event('loading-screen-continue')));

  // GreenwardMissionController init runs inside GameScene.create — poll
  // until its snapshot is available.
  await page.waitForFunction(
    () => window.__td_test?.getGreenwardStatus() !== null,
    null,
    { timeout: CONTROLLER_INIT_TIMEOUT_MS },
  );
}

test.describe('Greenward — smoke', () => {
  test.setTimeout(60_000);

  test('M1 The Boundary Stones boots with a single Ceremony ruin', async ({ page, gotoFresh }) => {
    await gotoFresh();
    await launchGreenward(page, 0);

    const status = await page.evaluate(() => window.__td_test?.getGreenwardStatus() ?? null);
    expect(status, 'greenward snapshot null on M1').not.toBeNull();
    expect(status!.ruins).toHaveLength(1);
    expect(status!.ruins[0].mode).toBe('ceremony');
    expect(status!.ruins[0].claimed).toBe(false);
    expect(status!.finale, 'M1 is not the finale; finale state should be null').toBeNull();
  });

  test('M10 Caer Lythen boots with three setpiece ruins + finale at "courtyard"', async ({ page, gotoFresh }) => {
    await gotoFresh();
    await launchGreenward(page, 9);

    const status = await page.evaluate(() => window.__td_test?.getGreenwardStatus() ?? null);
    expect(status, 'greenward snapshot null on M10').not.toBeNull();
    expect(status!.ruins).toHaveLength(3);
    const ids = status!.ruins.map(r => r.id).sort();
    expect(ids).toEqual(['courtyard', 'nave', 'throne']);
    expect(status!.finale, 'M10 finale state should not be null').not.toBeNull();
    expect(status!.finale!.active).toBe('courtyard');
    expect(status!.finale!.resolvedNaveMode, 'Nave mode unresolved until Courtyard claims').toBeNull();
  });
});
