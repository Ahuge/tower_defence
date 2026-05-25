/**
 * Snake Eyes M10 — Counterfactual finale launch + setpiece flow.
 *
 * Pre-PR-#85 this mission threw `final_unimplemented` on launch.
 * This spec exercises the v1 three-setpiece flow end-to-end through
 * the testHook fast-forward seams (real wave-by-wave play would
 * take 5+ minutes per spec; the seams advance setpieces without
 * authoring inputs).
 *
 * Tests:
 *   1. Launch — no throw, scene active, controller in 'approach' stage.
 *   2. Approach → Mirror Lane — 5 approach advances flip the stage.
 *   3. Mirror Lane → Table — player force-wins the lane, stage flips.
 *   4. Table → complete — boss force-kill flips isWon, gameWon fires,
 *      SnakeEyesEndingPanel renders.
 *
 * Cell-level mechanic correctness (Mirror Lane race timing, Approach
 * wave content, boss HP scaling) is covered by the SnakeEyesMissionController
 * unit suite. This spec is the boots-on-the-ground integration check
 * — confirms the wiring through MissionRunner + GameScene + GameOverScreen
 * holds together.
 */
import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

const SCENE_BOOT_TIMEOUT_MS = 15_000;
const CONTROLLER_INIT_TIMEOUT_MS = 10_000;

async function launchSnakeEyesM10(page: Page): Promise<void> {
  const ok = await page.evaluate(
    () => window.__td_test?.launchCampaignMission('void', 9) ?? false,
  );
  if (!ok) throw new Error('launchCampaignMission(void, 9) returned false');

  await page.waitForFunction(
    () => window.__td_test?.isGameSceneActive() ?? false,
    null,
    { timeout: SCENE_BOOT_TIMEOUT_MS },
  );
  await page.waitForFunction(
    () => window.__td_test?.getSnakeEyesM10Status() !== null,
    null,
    { timeout: CONTROLLER_INIT_TIMEOUT_MS },
  );
}

test.describe('Snake Eyes M10 — Counterfactual finale', () => {
  test.setTimeout(60_000);

  test('launches without throw + controller starts in approach stage', async ({ page, gotoFresh }) => {
    await gotoFresh();
    await launchSnakeEyesM10(page);

    const status = await page.evaluate(() => window.__td_test?.getSnakeEyesM10Status() ?? null);
    expect(status, 'M10 status null on launch').not.toBeNull();
    expect(status!.stage).toBe('approach');
    expect(status!.approachCleared).toBe(0);
    expect(status!.approachTotal).toBe(5);
    expect(status!.isWon).toBe(false);
    expect(status!.isLost).toBe(false);
  });

  test('Approach setpiece advances on 5 wave clears + flips to mirror_lane', async ({ page, gotoFresh }) => {
    await gotoFresh();
    await launchSnakeEyesM10(page);

    for (let i = 0; i < 4; i++) {
      const advanced = await page.evaluate(() => window.__td_test?.m10AdvanceApproach() ?? false);
      expect(advanced).toBe(true);
    }
    let status = await page.evaluate(() => window.__td_test?.getSnakeEyesM10Status() ?? null);
    expect(status!.stage).toBe('approach');
    expect(status!.approachCleared).toBe(4);

    // 5th advance flips the stage.
    const advanced5 = await page.evaluate(() => window.__td_test?.m10AdvanceApproach() ?? false);
    expect(advanced5).toBe(true);
    status = await page.evaluate(() => window.__td_test?.getSnakeEyesM10Status() ?? null);
    expect(status!.stage).toBe('mirror_lane');
    expect(status!.approachCleared).toBe(5);
  });

  test('Mirror Lane player force-win flips stage to table', async ({ page, gotoFresh }) => {
    await gotoFresh();
    await launchSnakeEyesM10(page);

    // Walk through approach.
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.__td_test?.m10AdvanceApproach());
    }

    // Player force-win on the Mirror Lane.
    const won = await page.evaluate(() => window.__td_test?.m10ForcePlayerLaneWin() ?? false);
    expect(won).toBe(true);

    const status = await page.evaluate(() => window.__td_test?.getSnakeEyesM10Status() ?? null);
    expect(status!.stage).toBe('table');
    expect(status!.laneWinner).toBe('player');
  });

  test('Boss force-kill flips isWon + GameOverScreen renders SnakeEyesEndingPanel', async ({ page, gotoFresh }) => {
    await gotoFresh();
    await launchSnakeEyesM10(page);

    // Fast-forward Approach + Mirror Lane.
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.__td_test?.m10AdvanceApproach());
    }
    await page.evaluate(() => window.__td_test?.m10ForcePlayerLaneWin());

    // Boss kill — flips stage to complete. Capture the killed flag AND
    // the status snapshot in the same page.evaluate call. If we split
    // them across two evaluates, Phaser's update loop ticks between the
    // calls, GameScene detects `consumeM10WinTrigger() === true`, emits
    // `gameWon`, and tears the scene down — clearing MissionRunner.active
    // so the second evaluate sees a null controller. CI is fast enough
    // to reliably lose this race; the test was flaky in v1 of this spec.
    const result = await page.evaluate(() => {
      const killed = window.__td_test?.m10ForceBossKill() ?? false;
      const status = window.__td_test?.getSnakeEyesM10Status() ?? null;
      return { killed, status };
    });
    expect(result.killed).toBe(true);
    expect(result.status, 'controller torn down before snapshot — race regression').not.toBeNull();
    expect(result.status!.isWon).toBe(true);
    expect(result.status!.stage).toBe('complete');

    // The boss-kill flips controller state; the gameWon emit happens
    // on the NEXT GameScene update tick (per-frame check). Poll for
    // the SnakeEyesEndingPanel via its data-testid.
    await page.waitForSelector('[data-testid="snake-eyes-ending"]', { timeout: 10_000 });
    const panel = page.locator('[data-testid="snake-eyes-ending"]');
    await expect(panel).toBeVisible();
  });
});
