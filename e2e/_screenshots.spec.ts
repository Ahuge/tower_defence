/**
 * Throwaway screenshot spec — captures the Snake Eyes campaign lobby
 * states at Pixel 7 (mobile) viewport so the assistant can actually
 * see the rendered sizes instead of guessing from cap policy.
 *
 * Run with:
 *   npx playwright test e2e/_screenshots.spec.ts --project=mobile
 *
 * Output: e2e/_screenshots/*.png. NOT committed; the underscore-prefix
 * keeps it out of the normal e2e run (specs are discovered by default
 * but this one is harmless when included — it just produces images).
 */
import { test, expect } from './fixtures';

test.describe('Snake Eyes lobby — mobile screenshots', () => {
  test.beforeEach(({ }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile-only screenshot capture');
  });

  test('lobby + story modal at Pixel 7', async ({ page, gotoFresh }) => {
    await gotoFresh();

    // Bump the seeded profile's XP high enough to clear the campaigns'
    // player-level 7 gate, and pre-unlock void so the BEGIN CAMPAIGN
    // status renders. Then reload so the profile is read fresh.
    await page.evaluate(() => {
      const raw = localStorage.getItem('td_profile');
      if (!raw) return;
      const p = JSON.parse(raw);
      p.xp = 999_999;
      p.unlockedFactionsLifetime = ['arcane', 'mechanical', 'nature', 'void'];
      localStorage.setItem('td_profile', JSON.stringify(p));
      // The campaign menu's "available" status checks
      // StorePersistence.unlockedFactions (separate key from the
      // profile's lifetime unlock). Seed it too so the void card
      // routes to the lobby rather than the faction tree.
      const storeRaw = localStorage.getItem('td_store');
      const store = storeRaw ? JSON.parse(storeRaw) : {};
      store.unlockedFactions = ['arcane', 'mechanical', 'nature', 'void'];
      localStorage.setItem('td_store', JSON.stringify(store));
    });
    await page.reload();
    await page.waitForFunction(() => !!window.__td_test, null, { timeout: 15_000 });
    await page.waitForFunction(() => window.__td_test?.isBootComplete(), null, { timeout: 15_000 });

    // Navigate to campaign menu, then click the Void card. That's the
    // actual user path and avoids needing a registry module reference.
    await page.evaluate(() => {
      window.__td_test?.showScreen('campaign-menu');
    });
    await page.waitForSelector('text=CAMPAIGNS', { timeout: 5_000 });

    // Find the Void card by its label and click it.
    await page.locator('button:has-text("VOID")').first().click();
    await page.waitForSelector('text=SNAKE EYES', { timeout: 5_000 });
    // Give the lobby a tick to settle (keyart load, layout paint).
    await page.waitForTimeout(400);

    // All screenshots are viewport-only (fullPage:false). The chat
    // reader chokes on tall PNGs (>~1500px tall), and `fullPage:true`
    // on a campaign lobby produces ~2500px images. Four short viewport
    // screenshots covering top / ledger / cards / modal give the same
    // visual coverage without the size blow-up.

    // Screenshot 1: lobby top (header, intro paragraphs)
    await page.screenshot({
      path: 'e2e/_screenshots/01-lobby-top.png',
      fullPage: false,
    });

    // Scroll to the ledger panel and screenshot just that region
    await page.evaluate(() => {
      const el = document.body.innerText.includes('THE HOUSE LEDGER')
        ? Array.from(document.querySelectorAll('div')).find(d => d.textContent === 'THE HOUSE LEDGER')
        : null;
      el?.scrollIntoView({ block: 'center' });
    });
    await page.waitForTimeout(200);
    await page.screenshot({
      path: 'e2e/_screenshots/02-lobby-ledger.png',
      fullPage: false,
    });

    // Scroll to first mission card
    await page.evaluate(() => {
      const button = Array.from(document.querySelectorAll('button.card')).find(b =>
        b.textContent?.includes('01') || b.textContent?.includes('THE LAST HAND'),
      );
      button?.scrollIntoView({ block: 'center' });
    });
    await page.waitForTimeout(200);
    await page.screenshot({
      path: 'e2e/_screenshots/03-lobby-mission-cards.png',
      fullPage: false,
    });

    // Open the story modal (click mission 1)
    await page.locator('button.card').first().click();
    await page.waitForSelector('text=Objectives', { timeout: 5_000 });
    await page.waitForTimeout(200);
    await page.screenshot({
      path: 'e2e/_screenshots/04-story-modal.png',
      fullPage: false,
    });

    // Sanity assertions so the spec actually fails if the layout
    // shifted in a way that broke navigation.
    await expect(page.locator('text=SNAKE EYES').first()).toBeVisible();
  });
});
