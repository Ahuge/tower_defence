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
 *      the throne, watch `gameWon` fire, assert mission marked complete
 *      in the player profile.
 *
 * Driver pattern matches tutorial-match.spec: programmatic launch via
 * the test hook, real Damageable.takeDamage path under the hood, no
 * coupling to balance numbers or placeholder art. See
 * docs/m10-e2e-prd.md for the design rationale.
 */
import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

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
    { timeout: 15_000 },
  );
  await page.evaluate(() => window.dispatchEvent(new Event('loading-screen-continue')));

  // SabotageController init runs inside GameScene.create; poll until
  // its snapshot is available before any assertion.
  await page.waitForFunction(
    () => window.__td_test?.getSabotageStatus() !== null,
    null,
    { timeout: 10_000 },
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
    const tooEarly = await page.evaluate(
      () => window.__td_test!.forceKillSabotageTarget('throne'),
    );
    expect(tooEarly, 'throne kill succeeded before generators were down').toBe(false);

    // Kill generators one by one. Between each, assert state advances
    // as expected. The throne must stay invulnerable until the LAST
    // generator dies.
    for (let i = 0; i < generatorCount; i++) {
      const killed = await page.evaluate(
        (idx) => window.__td_test!.forceKillSabotageTarget('generator', idx),
        i,
      );
      expect(killed, `forceKillSabotageTarget(generator, ${i}) returned false`).toBe(true);

      // Give the controller one update tick to drain the generator +
      // flip throne vulnerability when appropriate.
      await page.waitForFunction(
        (idx) => {
          const s = window.__td_test?.getSabotageStatus();
          return !!s && !s.generators[idx].alive;
        },
        i,
        { timeout: 5_000 },
      );

      const status = await page.evaluate(() => window.__td_test!.getSabotageStatus()!);
      const aliveCount = status.generators.filter(g => g.alive).length;
      expect(aliveCount, `aliveCount after killing gen ${i}`).toBe(generatorCount - i - 1);
      const expectThroneVuln = i === generatorCount - 1;
      // Vulnerability flip happens on the *next* update after the last
      // generator dies; poll briefly.
      if (expectThroneVuln) {
        await page.waitForFunction(
          () => window.__td_test?.getSabotageStatus()?.throne?.invulnerable === false,
          null,
          { timeout: 5_000 },
        );
      } else {
        expect(status.throne!.invulnerable, `throne should still be invulnerable after gen ${i}`).toBe(true);
      }
    }

    // Subscribe to gameWon BEFORE issuing the kill — onceEvent resolves
    // on the next emission. mech_throne_killed fires in the same frame
    // but slightly earlier; we wait on gameWon as the higher-level
    // signal so we don't race the GameOver scene swap.
    const winPromise = page.evaluate(() => window.__td_test!.onceEvent('gameWon', 10_000));
    const throneKilled = await page.evaluate(
      () => window.__td_test!.forceKillSabotageTarget('throne'),
    );
    expect(throneKilled, 'forceKillSabotageTarget(throne) returned false after gates lifted').toBe(true);
    await winPromise;

    // Profile was updated by MissionRunner.finalize inside goToGameOver.
    // Shape: campaignProgress[factionId][missionIdx] = stars (number).
    const stars = await page.evaluate(() => {
      const raw = localStorage.getItem('td_profile');
      if (!raw) return -1;
      try {
        const p = JSON.parse(raw);
        return p.campaignProgress?.mechanical?.[9] ?? -1;
      } catch {
        return -1;
      }
    });
    expect(stars, 'profile did not record M10 stars').toBeGreaterThanOrEqual(1);
  });
});
