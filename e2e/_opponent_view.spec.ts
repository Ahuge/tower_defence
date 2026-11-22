/**
 * Throwaway screenshot spec — captures the versus opponent-board view
 * so the opponent-page UI can be checked visually instead of guessed.
 *
 * Run with:
 *   npx playwright test e2e/_opponent_view.spec.ts --project=desktop
 *
 * Output: e2e/_screenshots/opponent-setup.png / opponent-view.png
 * (not committed).
 */
import { test } from './fixtures';

test('opponent board view renders towers + creeps', async ({ page, gotoFresh }) => {
  test.setTimeout(120_000);
  await gotoFresh();
  await page.evaluate(() => window.__td_test?.showScreen('lobby'));
  await page.getByRole('button', { name: 'VS CPU' }).click();

  // Pick an RL brain so the opponent actually builds, then Arcane as our
  // faction (the last pick starts the match).
  await page.getByRole('button', { name: 'RL Arcane', exact: true }).click();
  await page.screenshot({ path: 'e2e/_screenshots/opponent-setup.png' });
  // Dismiss the tutorial scrim if one is up (it intercepts clicks).
  // It can pop over the faction pick, so wait briefly for it first.
  const scrim = page.locator('.tutorial-scrim');
  await scrim.first().waitFor({ state: 'visible', timeout: 3_000 }).catch(() => {});
  if (await scrim.count() > 0 && await scrim.first().isVisible()) {
    // Click the scrim's own continue/skip control rather than the
    // backdrop, so the tutorial advances instead of just blocking.
    const skip = page.getByRole('button', { name: /skip|got it|continue|next/i }).first();
    if (await skip.count() > 0) await skip.click({ force: true }).catch(() => {});
    await page.keyboard.press('Escape');
    await scrim.first().waitFor({ state: 'detached', timeout: 8_000 }).catch(() => {});
  }
  await page.getByText('Arcane', { exact: true }).first().click();

  // Let the first wave run so the shadow sim has creeps on the board.
  await page.waitForTimeout(25_000);
  // Swap to the opponent's page (click the minimap).
  const minimap = page.locator('canvas');
  const box = await minimap.boundingBox();
  if (box) {
    // The minimap sits at the top-right of the canvas.
    await page.mouse.click(box.x + box.width - 60, box.y + 40);
  }
  await page.waitForTimeout(1_500);
  await page.screenshot({ path: 'e2e/_screenshots/opponent-view.png' });
});
