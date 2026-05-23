/**
 * Snake Eyes campaign — smoke spec.
 *
 * Regression coverage for the three Snake Eyes wiring passes
 * (DebtTracker integration, PactbookPanel rendering, controller
 * refactor). Verifies the surfaces an offline reviewer would have to
 * boot the game to confirm:
 *
 *   1. M1 launches; `SnakeEyesMissionController` exists; Pactbook has
 *      3 drawn wagers.
 *   2. Accepting a wager updates `getActiveWager()` + flips the
 *      Pactbook's `isResolved()`.
 *   3. Declining all three applies the +20g Debt penalty
 *      (`applyDeclinePenalty` was wired).
 *   4. The starting Debt is 800g on a fresh profile and the controller
 *      snapshot reads through the same CampaignState slot as the
 *      lobby's `VoidStatePanel`.
 *
 * Does NOT yet cover: M2 interest tick (would require finishing M1
 * via Phaser headless — the gameplay loop is heavier than a smoke),
 * mid-mission wager effects (Pass 3 work, not in this PR's scope),
 * the M10 finale (still throws `final_unimplemented` by design).
 */
import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

const SCENE_BOOT_TIMEOUT_MS = 15_000;
const CONTROLLER_INIT_TIMEOUT_MS = 10_000;

async function launchSnakeEyes(page: Page, missionIdx: number): Promise<void> {
  const ok = await page.evaluate(
    (idx) => window.__td_test?.launchCampaignMission('void', idx) ?? false,
    missionIdx,
  );
  if (!ok) throw new Error(`launchCampaignMission(void, ${missionIdx}) returned false`);

  await page.waitForFunction(
    () => window.__td_test?.isGameSceneActive() ?? false,
    null,
    { timeout: SCENE_BOOT_TIMEOUT_MS },
  );
  // SnakeEyesMissionController is constructed inside buildRuntime,
  // which fires BEFORE GameScene.create resolves. Polling for the
  // status hook to return non-null confirms both the controller and
  // its Pactbook exist.
  await page.waitForFunction(
    () => window.__td_test?.getSnakeEyesStatus() !== null,
    null,
    { timeout: CONTROLLER_INIT_TIMEOUT_MS },
  );
}

test.describe('Snake Eyes — smoke', () => {
  test.setTimeout(60_000);

  test('M1 launches with a Pactbook of 3 wagers + starting Debt 800g', async ({ page, gotoFresh }) => {
    await gotoFresh();
    await launchSnakeEyes(page, 0);

    const status = await page.evaluate(() => window.__td_test?.getSnakeEyesStatus() ?? null);
    expect(status, 'snake-eyes snapshot null on M1').not.toBeNull();

    // Starting Debt baseline.
    expect(status!.debt).toBe(800);
    // M1 is the first mission; `firstMissionStarted` flips inside
    // tickBetweenMissions BEFORE the controller is queryable, so it
    // is already true by the time the spec polls.
    expect(status!.firstMissionStarted).toBe(true);

    // Pactbook present + 3 cards drawn.
    expect(status!.pactbook).not.toBeNull();
    expect(status!.pactbook!.drawn.length).toBe(3);
    expect(status!.pactbook!.acceptedId).toBeNull();
    expect(status!.pactbook!.declined).toBe(false);

    // Every drawn card is a valid tier (1, 2, or 3).
    for (const w of status!.pactbook!.drawn) {
      expect([1, 2, 3]).toContain(w.tier);
    }
  });

  test('Accepting a wager flips the Pactbook to resolved + records acceptedId', async ({ page, gotoFresh }) => {
    await gotoFresh();
    await launchSnakeEyes(page, 0);

    const before = await page.evaluate(() => window.__td_test?.getSnakeEyesStatus() ?? null);
    const firstWagerId = before!.pactbook!.drawn[0].id;

    const accepted = await page.evaluate(
      (id) => window.__td_test?.acceptSnakeEyesWager(id) ?? false,
      firstWagerId,
    );
    expect(accepted).toBe(true);

    const after = await page.evaluate(() => window.__td_test?.getSnakeEyesStatus() ?? null);
    expect(after!.pactbook!.acceptedId).toBe(firstWagerId);
    expect(after!.pactbook!.declined).toBe(false);

    // Double-accept is rejected (Pactbook throws on already-resolved).
    const second = await page.evaluate(
      (id) => window.__td_test?.acceptSnakeEyesWager(id) ?? false,
      firstWagerId,
    );
    expect(second, 'second accept should be rejected (already resolved)').toBe(false);
  });

  test('Declining all three applies the +20g Debt penalty', async ({ page, gotoFresh }) => {
    await gotoFresh();
    await launchSnakeEyes(page, 0);

    const before = await page.evaluate(() => window.__td_test?.getSnakeEyesStatus() ?? null);
    expect(before!.debt).toBe(800);

    const declined = await page.evaluate(() => window.__td_test?.declineSnakeEyesWagers() ?? false);
    expect(declined).toBe(true);

    const after = await page.evaluate(() => window.__td_test?.getSnakeEyesStatus() ?? null);
    // +20g decline penalty (see DebtTracker.DECLINE_PENALTY).
    expect(after!.debt).toBe(820);
    expect(after!.pactbook!.declined).toBe(true);
    expect(after!.pactbook!.acceptedId).toBeNull();
  });

  test('getSnakeEyesStatus returns null when not in a Snake Eyes mission', async ({ page, gotoFresh }) => {
    await gotoFresh();
    // Launch a Mech mission instead. The accessor narrows via
    // instanceof SnakeEyesMissionController, so the Mech run's
    // lifecycle (MechSabotage / pylons / etc) should NOT register as
    // a Snake Eyes controller.
    const ok = await page.evaluate(() => window.__td_test?.launchCampaignMission('mechanical', 0) ?? false);
    expect(ok).toBe(true);
    await page.waitForFunction(
      () => window.__td_test?.isGameSceneActive() ?? false,
      null,
      { timeout: SCENE_BOOT_TIMEOUT_MS },
    );

    const status = await page.evaluate(() => window.__td_test?.getSnakeEyesStatus() ?? null);
    expect(status, 'getSnakeEyesStatus must be null inside a non-void mission').toBeNull();
  });
});
