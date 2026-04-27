/**
 * Tutorial match walkthrough — headline E2E test.
 *
 * Drives the full 18-step scripted round, asserting the step id
 * after every transition so a broken advance fails loudly rather
 * than hangs on a timeout.
 *
 * For event-gated steps (towerPlaced, waveStarted, waveCleared,
 * sendPurchased, frontierPurchased) we use the __td_test
 * `emitGameEvent` hook to fire the event directly on the scene's
 * EventBus. The unit suite owns the assertion that the REAL user
 * actions produce those events; this spec verifies the tutorial's
 * reaction and the overlay's wiring — which is what E2E is for.
 *
 * Click-style steps (welcome, mazing, income_bonus) go through
 * the real popover Next button.
 */
import {
  test,
  expect,
  waitForTutorialStep,
  waitForNoTutorial,
  dismissAllAutoTutorials,
} from './fixtures';
import type { Page } from '@playwright/test';

async function emit(page: Page, event: string, ...args: unknown[]): Promise<void> {
  const ok = await page.evaluate(
    ({ e, a }) => window.__td_test?.emitGameEvent(e, ...a) ?? false,
    { e: event, a: args },
  );
  if (!ok) throw new Error(`emitGameEvent(${event}) returned false — scene not ready?`);
}

async function clickNextInPopover(page: Page): Promise<void> {
  await page
    .locator('.tutorial-popover')
    .getByRole('button', { name: 'Next', exact: true })
    .click();
}

test.describe('tutorial match', () => {
  test.setTimeout(60_000);

  test('full walkthrough completes and returns to menu', async ({ page, gotoFresh }) => {
    await gotoFresh();
    await dismissAllAutoTutorials(page);

    // ProfileAvatar renders a "?" button when no profile is signed
    // in (`title="Tap to sign in"`), colliding with the Tutorials
    // help button by accessible name. Disambiguate by title.
    await page.getByTitle('Tutorials').click();
    await page.getByText('Tutorial Match').first().click();

    // 'welcome' — click-advance.
    await waitForTutorialStep(page, 'welcome', 20_000);
    await clickNextInPopover(page);

    // 'pick_tower' — select Arcane Bolt (dock slot 0).
    await waitForTutorialStep(page, 'pick_tower');
    await page.evaluate(() => window.__td_test?.selectDockTower(0));

    // 'place_first' — event-gated on towerPlaced.
    await waitForTutorialStep(page, 'place_first');
    await emit(page, 'towerPlaced', 12, 13, 'arcane_bolt');

    // 'mazing' — explainer.
    await waitForTutorialStep(page, 'mazing');
    await clickNextInPopover(page);

    // 'pick_bolt_2' — re-select Arcane Bolt before the 2nd placement.
    await waitForTutorialStep(page, 'pick_bolt_2');
    await page.evaluate(() => window.__td_test?.selectDockTower(0));

    // 'place_second' — another tower to extend the maze.
    await waitForTutorialStep(page, 'place_second');
    await emit(page, 'towerPlaced', 11, 12, 'arcane_bolt');

    // 'start_wave_1' — event-gated on waveStarted.
    await waitForTutorialStep(page, 'start_wave_1');
    await emit(page, 'waveStarted', 1);

    // 'watch_wave_1' — advances on waveCleared.
    await waitForTutorialStep(page, 'watch_wave_1');
    await emit(page, 'waveCleared', 1);

    // 'income_bonus' — click-advance.
    await waitForTutorialStep(page, 'income_bonus');
    await clickNextInPopover(page);

    // 'pick_frost' — select Frost (slot 1).
    await waitForTutorialStep(page, 'pick_frost');
    await page.evaluate(() => window.__td_test?.selectDockTower(1));

    // 'place_frost' — another towerPlaced.
    await waitForTutorialStep(page, 'place_frost');
    await emit(page, 'towerPlaced', 12, 11, 'arcane_frost');

    // 'buy_send' — event-gated on sendPurchased.
    await waitForTutorialStep(page, 'buy_send');
    await emit(page, 'sendPurchased', 'send_standard');

    // 'start_wave_2' — waveStarted.
    await waitForTutorialStep(page, 'start_wave_2');
    await emit(page, 'waveStarted', 2);

    // 'watch_wave_2' — waveCleared.
    await waitForTutorialStep(page, 'watch_wave_2');
    await emit(page, 'waveCleared', 2);

    // 'pick_bolt_reinforce' — re-select Bolt for the reinforcement step.
    await waitForTutorialStep(page, 'pick_bolt_reinforce');
    await page.evaluate(() => window.__td_test?.selectDockTower(0));

    // 'place_fourth' — reinforcement tower.
    await waitForTutorialStep(page, 'place_fourth');
    await emit(page, 'towerPlaced', 12, 10, 'arcane_bolt');

    // 'frontier_intro' — explainer: what Frontier is.
    await waitForTutorialStep(page, 'frontier_intro');
    await clickNextInPopover(page);

    // 'leyline_nexus_intro' — explainer: what the Arcane Nexus does.
    await waitForTutorialStep(page, 'leyline_nexus_intro');
    await clickNextInPopover(page);

    // 'buy_frontier' — event-gated on frontierPurchased.
    await waitForTutorialStep(page, 'buy_frontier');
    await emit(page, 'frontierPurchased', 'leyline_nexus_1');

    // 'start_wave_3' — waveStarted.
    await waitForTutorialStep(page, 'start_wave_3');
    await emit(page, 'waveStarted', 3);

    // 'watch_wave_3' — final waveCleared.
    await waitForTutorialStep(page, 'watch_wave_3');
    await emit(page, 'waveCleared', 3);

    // 'done' — terminal step with CTA.
    await waitForTutorialStep(page, 'done');
    await page
      .locator('.tutorial-popover')
      .getByRole('button', { name: 'Back to Menu' })
      .click();

    // Back on the menu.
    await waitForNoTutorial(page);
    await expect(page.getByText('FACTIONS', { exact: true }).first()).toBeVisible();

    // tutorial_match should now be marked completed.
    const completed = await page.evaluate(() => {
      const raw = localStorage.getItem('td_tutorial_state');
      if (!raw) return [] as string[];
      try {
        return (JSON.parse(raw).completedTracks ?? []) as string[];
      } catch {
        return [];
      }
    });
    expect(completed).toContain('tutorial_match');
  });

  test('quit mid-match returns to menu', async ({ page, gotoFresh }) => {
    await gotoFresh();
    await dismissAllAutoTutorials(page);

    // ProfileAvatar renders a "?" button when no profile is signed
    // in (`title="Tap to sign in"`), colliding with the Tutorials
    // help button by accessible name. Disambiguate by title.
    await page.getByTitle('Tutorials').click();
    await page.getByText('Tutorial Match').first().click();
    await waitForTutorialStep(page, 'welcome', 20_000);

    // tutorial_match overrides skipLabel to 'Quit'.
    await page
      .locator('.tutorial-popover')
      .getByRole('button', { name: 'Quit' })
      .click();

    await waitForNoTutorial(page);
    await expect(page.getByText('FACTIONS', { exact: true }).first()).toBeVisible();
  });
});
