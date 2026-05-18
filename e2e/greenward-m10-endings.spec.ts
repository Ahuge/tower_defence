/**
 * Greenward M10 — endings walkthrough.
 *
 * Drives M10 Caer Lythen end-to-end (programmatic claim of each
 * setpiece ruin) and asserts the GameOver screen surfaces the
 * resolved ending tableau + title. The mode is the Siege fallback
 * because no campaign mode-lean was accrued in a fresh-install
 * spec run — this is the most-narrowed path and the canonical
 * smoke for the M10 endings UI.
 *
 * Per-ending parameterisation (Ceremony / Mercy) can extend this
 * spec once a test hook injects pre-mission ModeLeanTracker state.
 */
import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

const SCENE_BOOT_TIMEOUT_MS = 15_000;
const CONTROLLER_INIT_TIMEOUT_MS = 10_000;

async function launchM10(page: Page): Promise<void> {
  const ok = await page.evaluate(
    () => window.__td_test?.launchCampaignMission('nature', 9) ?? false,
  );
  if (!ok) throw new Error('launchCampaignMission(nature, 9) returned false');
  await page.waitForFunction(
    () => window.__td_test?.isGameSceneActive() ?? false,
    null,
    { timeout: SCENE_BOOT_TIMEOUT_MS },
  );
  await page.evaluate(() => window.dispatchEvent(new Event('loading-screen-continue')));
  await page.waitForFunction(
    () => window.__td_test?.getGreenwardStatus() !== null,
    null,
    { timeout: CONTROLLER_INIT_TIMEOUT_MS },
  );
}

test.describe('Greenward M10 — endings walkthrough', () => {
  test.setTimeout(60_000);

  test('Siege fallback walkthrough surfaces the Siege ending tableau', async ({ page, gotoFresh }) => {
    await gotoFresh();
    await launchM10(page);

    // Force-claim the three setpiece ruins in order. The
    // FinaleController's per-frame tick walks Courtyard → Nave →
    // Throne as each claims; the Nave resolves to Siege because
    // no mode-lean has been accrued (fresh install).
    for (const ruinId of ['courtyard', 'nave', 'throne']) {
      const claimed = await page.evaluate(
        (id) => window.__td_test!.forceClaimGreenwardRuin(id),
        ruinId,
      );
      expect(claimed, `forceClaimGreenwardRuin('${ruinId}') should succeed`).toBe(true);
      // Allow one update tick for the FinaleController to advance.
      await page.waitForTimeout(50);
    }

    // Wait for gameWon. The throne claim triggers M10's win path
    // via the standard SabotageController-style onWin → emit
    // gameWon → goToGameOver sequence.
    // M10 currently doesn't fire gameWon on ruin-claim — the win
    // condition for final_greenward archetype lives in the
    // controller. Wait for the GameOver UI to mount instead.
    await page.waitForSelector('[data-testid="greenward-ending"]', { timeout: 15_000 });

    // Assert the ending tableau is present + reports Siege.
    const resolvedMode = await page.locator('[data-testid="greenward-ending"]').getAttribute('data-resolved-mode');
    expect(resolvedMode).toBe('siege');

    // Assert the Siege title is visible.
    const title = await page.locator('[data-testid="greenward-ending"]').textContent();
    expect(title).toContain('Cathedral Hollow');
  });
});
