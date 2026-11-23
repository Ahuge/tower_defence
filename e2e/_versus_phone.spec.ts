/**
 * Throwaway screenshot spec: Versus on a phone viewport, to check the
 * WAVES / ECONOMY panels against the opponent minimap.
 *
 * Run with:
 *   npx playwright test e2e/_versus_phone.spec.ts --project=mobile
 *
 * Output: e2e/_screenshots/versus-phone.png
 */
import { test, Page } from './fixtures';

async function settleTutorials(page: Page): Promise<void> {
  let quiet = 0;
  for (let i = 0; i < 40 && quiet < 3; i++) {
    const popover = page.locator('.tutorial-popover').first();
    if (!(await popover.isVisible({ timeout: 200 }).catch(() => false))) {
      quiet++;
      await page.waitForTimeout(500);
      continue;
    }
    quiet = 0;
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

test('versus phone: waves/economy vs opponent minimap', async ({ page, gotoFresh }) => {
  test.setTimeout(300_000);
  await gotoFresh();
  await page.evaluate(() => window.__td_test?.showScreen('lobby'));
  await settleTutorials(page);
  await page.getByRole('button', { name: 'VS CPU' }).click();
  await settleTutorials(page);
  await page.getByText('Arcane', { exact: true }).first().click();

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
  await page.waitForTimeout(2_000);
  await page.screenshot({ path: 'e2e/_screenshots/versus-phone.png' });
});
