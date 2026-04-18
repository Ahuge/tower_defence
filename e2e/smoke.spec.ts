/**
 * Smoke test — the minimal "app boots" sanity check that gates the
 * rest of the E2E suite. If this fails everything else is pointless
 * to run, so it's the first file Playwright picks up by default
 * (alphabetical under the e2e/ dir).
 */
import { test, expect } from './fixtures';

test.describe('smoke', () => {
  test('app loads, splash dismisses, menu appears', async ({ page, gotoFresh }) => {
    await gotoFresh();
    // gotoFresh already waits for isBootComplete. After that the
    // MenuScreen should be mounted — assert on a stable anchor from
    // the menu header.
    await expect(page.getByText('FACTIONS', { exact: true }).first()).toBeVisible();
  });

  test('debug hook is installed and reports no active tutorial initially', async ({ page, gotoFresh }) => {
    await gotoFresh();
    const hasHook = await page.evaluate(() => typeof window.__td_test?.clickCell === 'function');
    expect(hasHook).toBe(true);
    // On fresh load the basics track auto-starts ~200ms after splash,
    // so allow either "no tutorial yet" or "basics started" depending
    // on timing — both are valid post-boot states.
    const track = await page.evaluate(() => window.__td_test?.getActiveTutorialTrack());
    expect([null, 'basics']).toContain(track);
  });
});
