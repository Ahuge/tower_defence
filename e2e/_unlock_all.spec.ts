/**
 * Throwaway screenshot spec: menu with `?unlock=true`, to confirm every
 * mode tile (including the Versus and Circle lobbies) renders.
 *
 * Run with:
 *   npx playwright test e2e/_unlock_all.spec.ts --project=desktop
 *
 * Output: e2e/_screenshots/unlock-all-menu.png
 */
import { test } from './fixtures';

test('?unlock=true shows every mode tile', async ({ page, gotoFresh, baseURL }) => {
  test.setTimeout(120_000);
  // gotoFresh seeds the profile + clears storage, but appends ?test=1
  // itself, so navigate to the combined query string afterwards.
  await gotoFresh();
  await page.goto(`${baseURL}?unlock=true&test=1`);
  await page.waitForFunction(() => !!window.__td_test, null, { timeout: 15_000 });
  await page.waitForFunction(() => window.__td_test?.isBootComplete(), null, { timeout: 15_000 });
  await page.evaluate(() => window.__td_test?.showScreen('menu'));
  await page.waitForTimeout(1_000);
  await page.screenshot({ path: 'e2e/_screenshots/unlock-all-menu.png' });
});
