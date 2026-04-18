/**
 * Mobile viewport smoke.
 *
 * Runs only on the `mobile` project (Pixel 7). Verifies the
 * regressions we've already hit don't come back — popover doesn't
 * leak off-screen, spotlight lands on its target cell at the
 * animated zoom, modal portal covers the menu.
 */
import { test, expect, waitForTutorialStep, dismissAllAutoTutorials } from './fixtures';

// Scope this file to the mobile project only — running it on
// desktop doesn't exercise anything the other specs don't cover.
test.describe('mobile', () => {
  test.beforeEach(({ }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile-only spec');
  });

  test('basics popover fits inside the viewport', async ({ page, gotoFresh }) => {
    await gotoFresh();
    await waitForTutorialStep(page, 'intro', 8_000);

    const popover = page.locator('.tutorial-popover').first();
    await expect(popover).toBeVisible();

    const box = await popover.boundingBox();
    const viewport = page.viewportSize();
    expect(box, 'popover has no bounding box').not.toBeNull();
    expect(viewport).not.toBeNull();

    // Popover must be fully inside the viewport (no off-screen leak).
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);
  });

  test('help modal portals cover the full viewport on mobile', async ({ page, gotoFresh }) => {
    await gotoFresh();
    await dismissAllAutoTutorials(page);

    await page.getByRole('button', { name: '?' }).click();
    // The modal backdrop is position: fixed inset:0. Find the
    // scrim div by its inline style — it should have the same
    // size as the viewport, proving portal-out-of-stacking-
    // context worked (earlier bug: modal got trapped inside the
    // .ui-header stacking context and only covered part of the
    // screen).
    const viewport = page.viewportSize()!;
    const modalSize = await page.evaluate(() => {
      const bd = Array.from(document.querySelectorAll<HTMLElement>('div[style*="position: fixed"]'))
        .find(el => el.style.background?.includes('rgba(10'));
      if (!bd) return null;
      const r = bd.getBoundingClientRect();
      return { width: r.width, height: r.height };
    });
    expect(modalSize).not.toBeNull();
    expect(modalSize!.width).toBe(viewport.width);
    expect(modalSize!.height).toBe(viewport.height);
  });

  test('tutorial match spotlight lands on-screen for place_first', async ({ page, gotoFresh }) => {
    await gotoFresh();
    await dismissAllAutoTutorials(page);

    await page.getByRole('button', { name: '?' }).click();
    await page.getByText('Tutorial Match').first().click();

    await waitForTutorialStep(page, 'welcome', 20_000);
    // Click Next once to get to pick_tower.
    await page
      .locator('.tutorial-popover')
      .getByRole('button', { name: 'Next', exact: true })
      .click();

    // pick_tower → select Bolt → place_first.
    await waitForTutorialStep(page, 'pick_tower');
    await page.evaluate(() => window.__td_test?.selectDockTower(0));
    await waitForTutorialStep(page, 'place_first');

    // The spotlight should now be visible and inside the viewport —
    // the regression this guards was "canvas target resolved to an
    // off-screen rect because camera.worldView wasn't being consulted".
    const spotlight = page.locator('.tutorial-spotlight').first();
    await expect(spotlight).toBeVisible();

    const box = await spotlight.boundingBox();
    const vp = page.viewportSize()!;
    expect(box, 'spotlight has no bounding box').not.toBeNull();
    // At least partially inside the viewport.
    expect(box!.x + box!.width).toBeGreaterThan(0);
    expect(box!.y + box!.height).toBeGreaterThan(0);
    expect(box!.x).toBeLessThan(vp.width);
    expect(box!.y).toBeLessThan(vp.height);
  });
});
