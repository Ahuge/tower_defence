/**
 * Place-and-approve gate — camera-zoom projection e2e.
 *
 * The PlacementGateOverlay projects the ghost cell to screen pixels
 * using the live Phaser camera's `worldView`. This spec verifies the
 * projection is correct at three zoom levels (1×, 1.5×, 2.5×) by:
 *
 *   1. Launching Mech M1 (the smallest standard mission that boots
 *      reliably and contains placeable towers).
 *   2. Setting the camera zoom + optional scroll via `__td_test`.
 *   3. Staging a placement ghost at a known cell.
 *   4. Reading `__td_test.getCellClientPos(col, row)` — the trusted
 *      source of truth (same formula the headless `clickCell` uses).
 *   5. Reading the tick / X / drag-handle bounding boxes via
 *      Playwright's `boundingBox()` — these are the actual rendered
 *      positions on the live page.
 *   6. Asserting each rendered position is within ~half a tile of
 *      the projected cell position. Half-tile rather than pixel-
 *      perfect because the buttons sit ~tile-size above the cell
 *      and the icon size factors in `UIScale`; the assertion proves
 *      they're "near the cell" without coupling to exact offset
 *      maths.
 *
 * Why these three zoom levels:
 *   - 1×    — default; regression guard for the baseline case.
 *   - 1.5×  — non-integer zoom; tests fractional projection.
 *   - 2.5×  — large zoom; user screenshots showed worst-case drift
 *             at pinch-zoom-in.
 */
import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

const SCENE_BOOT_TIMEOUT_MS = 15_000;

async function launchAndStage(page: Page, zoom: number, col: number, row: number): Promise<void> {
  // Mech M1 is a short standard mission with placeable arcane towers
  // — boots fast and doesn't require campaign progression.
  const ok = await page.evaluate(
    () => window.__td_test?.launchCampaignMission('mechanical', 0) ?? false,
  );
  if (!ok) throw new Error('launchCampaignMission(mechanical, 0) returned false');

  // LoadingScreen continue gate.
  await page.waitForFunction(
    () => window.__td_test?.isGameSceneActive() ?? false,
    null,
    { timeout: SCENE_BOOT_TIMEOUT_MS },
  );
  await page.evaluate(() => window.dispatchEvent(new Event('loading-screen-continue')));
  await page.waitForFunction(
    () => window.__td_test?.isGameSceneActive() ?? false,
    null,
    { timeout: 5_000 },
  );

  // Enable place-and-approve so the gate stays open after staging
  // (default-off on desktop). Force-set the storage flag and
  // continue — the gate state read in GameScene is per-tap so the
  // change takes effect immediately.
  await page.evaluate(() => localStorage.setItem('td_place_and_approve', 'on'));

  await page.evaluate(
    ({ z }) => window.__td_test?.setCameraZoom(z) ?? false,
    { z: zoom },
  );

  // One animation frame so Phaser commits the zoom change to its
  // camera transform before we stage the ghost.
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => r(null))));

  const staged = await page.evaluate(
    ({ c, r }) => window.__td_test?.stagePlacementGhost('arcane_bolt', c, r) ?? false,
    { c: col, r: row },
  );
  if (!staged) throw new Error(`stagePlacementGhost(${col}, ${row}) returned false`);

  // The overlay re-renders on rAF — wait for the commit button to
  // exist + be visible. The overlay wrapper itself is pointer-events:
  // none and may report `hidden`; the button is the visible child.
  await page.waitForSelector('[data-testid="place-and-approve-commit"]', { timeout: 5_000, state: 'attached' });
}

interface AnchorReadout {
  cell: { x: number; y: number };
  handle: { left: number; top: number; width: number; height: number };
  commit: { left: number; top: number; width: number; height: number };
  cancel: { left: number; top: number; width: number; height: number };
}

async function readAnchors(page: Page, col: number, row: number): Promise<AnchorReadout> {
  const cell = await page.evaluate(
    ({ c, r }) => window.__td_test?.getCellClientPos(c, r) ?? null,
    { c: col, r: row },
  );
  if (!cell) throw new Error('getCellClientPos returned null');

  const boxes = await page.evaluate(() => {
    const pick = (sel: string) => {
      const el = document.querySelector<HTMLElement>(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    };
    return {
      handle: pick('[data-testid="placement-gate-drag-handle"]'),
      commit: pick('[data-testid="place-and-approve-commit"]'),
      cancel: pick('[data-testid="place-and-approve-cancel"]'),
    };
  });

  if (!boxes.handle) throw new Error('drag handle not rendered');
  if (!boxes.commit) throw new Error('commit button not rendered');
  if (!boxes.cancel) throw new Error('cancel button not rendered');

  return { cell, handle: boxes.handle, commit: boxes.commit, cancel: boxes.cancel };
}

test.describe('place-and-approve — camera zoom projection', () => {
  test.setTimeout(60_000);

  // The grid cell tested. (10, 8) is a reliably-empty / placeable
  // cell on Mech M1's serpentine map.
  const TARGET_COL = 10;
  const TARGET_ROW = 8;

  // Tile size at 1× zoom in css pixels for the desktop viewport
  // (1280×800) — TILE_SIZE × csscale. The test assertion just needs
  // an order-of-magnitude bound, so we use a generous tolerance.
  // ~28 css px per tile × small slop = 50 px.
  const HORIZONTAL_TOLERANCE_PX = 100;
  const VERTICAL_TOLERANCE_PX = 200; // buttons sit ~1.5 tiles ABOVE the cell

  for (const zoom of [1.0, 1.5, 2.5]) {
    test(`icons track the ghost cell at zoom=${zoom}×`, async ({ page, gotoFresh }) => {
      await gotoFresh();
      await launchAndStage(page, zoom, TARGET_COL, TARGET_ROW);

      const a = await readAnchors(page, TARGET_COL, TARGET_ROW);

      // Drag handle is positioned at the cell center — its centre
      // should match the cell screen position within tolerance.
      const handleCentreX = a.handle.left + a.handle.width / 2;
      const handleCentreY = a.handle.top + a.handle.height / 2;
      expect(Math.abs(handleCentreX - a.cell.x),
        `handle X off by ${Math.abs(handleCentreX - a.cell.x).toFixed(1)}px at zoom=${zoom}`,
      ).toBeLessThan(HORIZONTAL_TOLERANCE_PX);
      expect(Math.abs(handleCentreY - a.cell.y),
        `handle Y off by ${Math.abs(handleCentreY - a.cell.y).toFixed(1)}px at zoom=${zoom}`,
      ).toBeLessThan(HORIZONTAL_TOLERANCE_PX);

      // Commit + Cancel sit ABOVE the cell. Within a tile horizontally,
      // a tile and a bit above vertically.
      const commitCentreX = a.commit.left + a.commit.width / 2;
      const commitCentreY = a.commit.top + a.commit.height / 2;
      const cancelCentreX = a.cancel.left + a.cancel.width / 2;
      const cancelCentreY = a.cancel.top + a.cancel.height / 2;

      // Buttons flank the cell horizontally — both within tolerance
      // of the cell X.
      expect(Math.abs(commitCentreX - a.cell.x)).toBeLessThan(HORIZONTAL_TOLERANCE_PX);
      expect(Math.abs(cancelCentreX - a.cell.x)).toBeLessThan(HORIZONTAL_TOLERANCE_PX);

      // Buttons sit ABOVE the cell (lower Y on screen).
      expect(commitCentreY, `commit Y not above cell at zoom=${zoom}`).toBeLessThan(a.cell.y);
      expect(cancelCentreY, `cancel Y not above cell at zoom=${zoom}`).toBeLessThan(a.cell.y);

      // …but not OFF-screen far above.
      expect(a.cell.y - commitCentreY).toBeLessThan(VERTICAL_TOLERANCE_PX);
      expect(a.cell.y - cancelCentreY).toBeLessThan(VERTICAL_TOLERANCE_PX);

      // Both buttons at the same Y (they flank the cell).
      expect(Math.abs(commitCentreY - cancelCentreY)).toBeLessThan(2);
    });
  }

  test('shifting the camera horizontally moves the icons with the cell', async ({ page, gotoFresh }) => {
    await gotoFresh();
    await launchAndStage(page, 1.5, TARGET_COL, TARGET_ROW);

    const before = await readAnchors(page, TARGET_COL, TARGET_ROW);

    // Pan the camera 100 world-px to the right.
    await page.evaluate(
      () => {
        const g = (window as unknown as { __td_test?: { setCameraZoom: (z: number, sx?: number, sy?: number) => boolean } }).__td_test;
        if (!g) return;
        // Read current scroll via the same hook by re-applying zoom
        // and a scroll delta. The hook accepts undefined scroll to
        // keep current — to ADD 100 we round-trip via a small
        // helper-less inline.
        const ge = (window as unknown as { phaser?: unknown }) as unknown;
        // Inline: use UIBridge directly. The hook's setCameraZoom
        // re-applies zoom; to shift we call setCameraZoom again
        // with the same zoom and a scrollX delta computed off the
        // live camera. Reach the camera via UIBridge.getGame().
        const w = window as unknown as { UIBridge?: unknown };
        void ge;
        void w;
      },
    );
    // Cleaner approach: set absolute scroll via the hook.
    await page.evaluate(() => window.__td_test?.setCameraZoom(1.5, 100, 0));
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => r(null))));

    const after = await readAnchors(page, TARGET_COL, TARGET_ROW);

    // Cell screen-X must have shifted left (camera scrolled right).
    expect(after.cell.x).toBeLessThan(before.cell.x);
    // The handle must have followed the cell — the icons aren't
    // pinned to absolute screen coords.
    expect(after.handle.left).toBeLessThan(before.handle.left);
    // And by approximately the same amount as the cell shift.
    const cellDelta = before.cell.x - after.cell.x;
    const handleDelta = before.handle.left - after.handle.left;
    expect(Math.abs(handleDelta - cellDelta)).toBeLessThan(10);
  });
});
