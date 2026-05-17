/**
 * Mech M10 — "The Overthrow" finale.
 *
 * Two specs:
 *
 *   1. SMOKE — mission boots, SabotageController is wired, HUD-relevant
 *      state (generators alive, throne invulnerable) reads as expected.
 *
 *   2. HAPPY PATH — kill every generator one by one (asserting the
 *      throne stays invulnerable until the last one falls), then kill
 *      the throne, watch `gameWon` AND `mech_throne_killed` fire in the
 *      right order, assert mission marked complete in the player
 *      profile.
 *
 * Driver pattern matches tutorial-match.spec: programmatic launch via
 * the test hook, real Damageable.takeDamage path under the hood, no
 * coupling to balance numbers or placeholder art. See
 * docs/m10-e2e-prd.md for the design rationale.
 */
import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

/** How long Phaser typically takes to boot a scene from a cold preview
 *  server. Conservative — local runs settle in <2s. */
const SCENE_BOOT_TIMEOUT_MS = 15_000;
/** SabotageController is created synchronously in GameScene.create(),
 *  so this is a small "tighter than scene-boot" budget for the case
 *  where create() runs but the sabotage block is gated behind an
 *  async asset load on a future change. */
const CONTROLLER_INIT_TIMEOUT_MS = 10_000;
/** Once a synchronous test-hook call mutates controller state, the
 *  next Phaser update tick is ≤16ms. 5s is wide enough to absorb the
 *  preview-server's first-frame overhead without papering over a
 *  genuine stall. */
const STATE_TRANSITION_TIMEOUT_MS = 5_000;

/** Launch Mech M10 (idx 9) and dismiss the LoadingScreen's Begin gate.
 *  Resolves once the GameScene is active AND the SabotageController
 *  has finished init (`getSabotageStatus` returns non-null). */
async function launchM10(page: Page): Promise<void> {
  const ok = await page.evaluate(
    () => window.__td_test?.launchCampaignMission('mechanical', 9) ?? false,
  );
  if (!ok) throw new Error('launchCampaignMission(mechanical, 9) returned false');

  // LoadingScreen for missions waits for an explicit Begin tap. Dispatch
  // the same event the in-screen button fires; sidesteps button-visibility
  // timing without testing the button itself (covered elsewhere).
  await page.waitForFunction(
    () => window.__td_test?.isGameSceneActive() ?? false,
    null,
    { timeout: SCENE_BOOT_TIMEOUT_MS },
  );
  await page.evaluate(() => window.dispatchEvent(new Event('loading-screen-continue')));

  // SabotageController init runs inside GameScene.create; poll until
  // its snapshot is available before any assertion.
  await page.waitForFunction(
    () => window.__td_test?.getSabotageStatus() !== null,
    null,
    { timeout: CONTROLLER_INIT_TIMEOUT_MS },
  );
}

test.describe('M10 — The Overthrow', () => {
  test.setTimeout(60_000);

  test('mission boots, generators alive, throne invulnerable', async ({ page, gotoFresh }) => {
    await gotoFresh();
    await launchM10(page);

    const status = await page.evaluate(() => window.__td_test?.getSabotageStatus() ?? null);
    expect(status, 'sabotage snapshot null').not.toBeNull();
    expect(status!.generators.length, 'no generators placed').toBeGreaterThan(0);
    for (const g of status!.generators) {
      expect(g.alive, `generator ${g.idx} not alive at boot`).toBe(true);
    }
    expect(status!.throne, 'no throne placed').not.toBeNull();
    expect(status!.throne!.alive, 'throne not alive at boot').toBe(true);
    expect(status!.throne!.invulnerable, 'throne not invulnerable at boot').toBe(true);
  });

  test('kill all generators → throne becomes vulnerable → kill throne → gameWon', async ({ page, gotoFresh }) => {
    await gotoFresh();
    await launchM10(page);

    const initial = await page.evaluate(() => window.__td_test!.getSabotageStatus()!);
    const generatorCount = initial.generators.length;
    expect(generatorCount).toBeGreaterThan(0);

    // Sanity: throne kill before generators are dead is a no-op. Routes
    // through the real Damageable.takeDamage path, so this implicitly
    // verifies the controller's invulnerability gate.
    const earlyKill = await page.evaluate(
      () => window.__td_test!.forceKillSabotageTarget('throne'),
    );
    expect(earlyKill, 'throne kill succeeded before generators were down').toBe(false);

    // Kill generators one by one. Between each, assert state advances
    // as expected. The throne must stay invulnerable until the LAST
    // generator dies, then flip on the next controller update tick.
    for (let i = 0; i < generatorCount; i++) {
      const killed = await page.evaluate(
        (idx) => window.__td_test!.forceKillSabotageTarget('generator', idx),
        i,
      );
      expect(killed, `forceKillSabotageTarget(generator, ${i}) returned false`).toBe(true);

      // forceKillTarget drives hp to 0 + sets _expired synchronously, so
      // the snapshot's `alive` flag is correct immediately. Read once.
      const status = await page.evaluate(() => window.__td_test!.getSabotageStatus()!);
      const aliveCount = status.generators.filter(g => g.alive).length;
      expect(aliveCount, `aliveCount after killing gen ${i}`).toBe(generatorCount - i - 1);

      // Vulnerability flip happens inside the next SabotageController
      // update() — poll briefly when we just killed the last generator.
      const expectThroneVuln = i === generatorCount - 1;
      if (expectThroneVuln) {
        await page.waitForFunction(
          () => window.__td_test?.getSabotageStatus()?.throne?.invulnerable === false,
          null,
          { timeout: STATE_TRANSITION_TIMEOUT_MS },
        );
      } else {
        expect(status.throne!.invulnerable, `throne should still be invulnerable after gen ${i}`).toBe(true);
      }
    }

    // Subscribe to BOTH gameWon and mech_throne_killed *before* killing.
    // The controller fires them in the same frame, with mech_throne_killed
    // strictly first — asserting both fire defends the lower-level event
    // wiring (unit suite asserts ordering; this is the integration-level
    // "both signals reach the bus" check).
    const throneKilledPromise = page.evaluate(
      () => window.__td_test!.onceEvent('mech_throne_killed', 10_000),
    );
    const gameWonPromise = page.evaluate(
      () => window.__td_test!.onceEvent('gameWon', 10_000),
    );
    const throneKilled = await page.evaluate(
      () => window.__td_test!.forceKillSabotageTarget('throne'),
    );
    expect(throneKilled, 'forceKillSabotageTarget(throne) returned false after gates lifted').toBe(true);
    await Promise.all([throneKilledPromise, gameWonPromise]);

    // MissionRunner.finalize → PlayerProfile.recordMissionResult runs
    // *synchronously* in the same handler as gameWon, but waiting on the
    // event resolves via a microtask, so by the time control returns
    // here, the synchronous handler has unwound and the profile is
    // updated. Defensive poll anyway — guards against a future
    // `await` getting injected into the win path.
    await page.waitForFunction(
      () => (window.__td_test?.getMissionStars('mechanical', 9) ?? 0) >= 1,
      null,
      { timeout: STATE_TRANSITION_TIMEOUT_MS },
    );
  });
});
