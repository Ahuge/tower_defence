/**
 * Throwaway screenshot spec for the versus board swap. Captures
 * your board, then the opponent's, so the "full swap" can be checked
 * visually (your towers must not ghost through their layout).
 *
 * Run with:
 *   npx playwright test e2e/_board_swap.spec.ts --project=desktop
 *
 * Output: e2e/_screenshots/swap-01-your-board.png,
 *         swap-02-opponent-board.png
 */
import { test, Page } from './fixtures';

/** Dismiss tutorial popovers until none has shown up for a couple of
 *  seconds. They arrive asynchronously (a new track can trigger right
 *  after the match starts) and their scrim swallows canvas clicks, so
 *  this has to settle rather than dismiss once. */
async function settleTutorials(page: Page): Promise<void> {
  let quietRounds = 0;
  for (let i = 0; i < 40 && quietRounds < 3; i++) {
    const popover = page.locator('.tutorial-popover').first();
    const visible = await popover.isVisible({ timeout: 200 }).catch(() => false);
    if (!visible) {
      quietRounds++;
      await page.waitForTimeout(500);
      continue;
    }
    quietRounds = 0;
    const skip = popover.getByRole('button', { name: /skip/i }).first();
    if (await skip.isVisible({ timeout: 300 }).catch(() => false)) {
      await skip.click({ force: true }).catch(() => {});
    } else {
      const next = popover.getByRole('button', { name: /next|done|got it|continue/i }).first();
      if (await next.isVisible({ timeout: 300 }).catch(() => false)) {
        await next.click({ force: true }).catch(() => {});
      }
    }
    await page.waitForTimeout(250);
  }
}

test('versus board swap shows only the viewed board', async ({ page, gotoFresh }) => {
  test.setTimeout(300_000);
  await gotoFresh();
  await page.evaluate(() => window.__td_test?.showScreen('lobby'));
  await settleTutorials(page);

  await page.getByRole('button', { name: 'VS CPU' }).click();
  await settleTutorials(page);

  // Arcane is the last pick and starts the match.
  await page.getByText('Arcane', { exact: true }).first().click();

  // Draft screen(s) between lobby and the match.
  for (let i = 0; i < 6; i++) {
    if (await page.evaluate(() => window.__td_test?.isGameSceneActive())) break;
    await settleTutorials(page);
    const start = page.getByRole('button', { name: /skip — no modifier|skip - no modifier|continue|start|begin|deploy|ready/i }).first();
    if (await start.isVisible({ timeout: 500 }).catch(() => false)) {
      await start.click({ force: true }).catch(() => {});
    }
    await page.waitForTimeout(1_500);
  }
  await page.waitForFunction(() => window.__td_test?.isGameSceneActive(), null, { timeout: 60_000 });
  await settleTutorials(page);

  // Build a tower or two so "your board" has something to hide.
  await page.evaluate(() => window.__td_test?.selectDockTower(0));
  await page.waitForTimeout(300);
  for (const [c, r] of [[10, 8], [14, 10], [18, 12]]) {
    await settleTutorials(page);
    const pos = await page.evaluate(
      ({ cc, rr }) => window.__td_test?.getCellClientPos(cc, rr) ?? null,
      { cc: c, rr: r },
    );
    if (pos) await page.mouse.click(pos.x, pos.y);
    await page.waitForTimeout(400);
  }
  await settleTutorials(page);
  await page.waitForTimeout(6_000);
  await page.screenshot({ path: 'e2e/_screenshots/swap-01-your-board.png' });

  // Swap via the minimap (top-right of the canvas). Leave build mode
  // first: placing a tower fades the minimap and disables its click
  // zone, so a click would fall through onto the grid instead.
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (box) {
    await page.mouse.click(box.x + box.width * 0.86, box.y + box.height * 0.11);
  }
  await page.waitForTimeout(5_000);
  await page.screenshot({ path: 'e2e/_screenshots/swap-02-opponent-board.png' });
});
