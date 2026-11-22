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
