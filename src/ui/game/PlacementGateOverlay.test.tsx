/**
 * Smoke tests for PlacementGateOverlay — renders / hides based on
 * GameUIStore.placementGhost; fires commit / cancel callbacks.
 */
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/preact';
import { PlacementGateOverlay } from './PlacementGateOverlay';
import { GameUIStore } from '../GameUIStore';
import { UIBridge } from '../UIBridge';

afterEach(() => {
  cleanup();
  GameUIStore.setPlacementGhost(null);
  // Best-effort callback reset between tests.
  GameUIStore.registerCallbacks({});
});

beforeEach(() => {
  // Mount a fake canvas so projectCellToScreen has something to read.
  // 1008 × 720 mirrors the production GAME_WIDTH / GAME_HEIGHT roughly.
  const canvas = document.createElement('canvas');
  canvas.width = 1008;
  canvas.height = 720;
  const root = document.createElement('div');
  root.id = 'game-root';
  root.appendChild(canvas);
  document.body.appendChild(root);
  // Stub getBoundingClientRect so jsdom returns non-zero dims.
  canvas.getBoundingClientRect = () => ({
    left: 0, top: 0, right: 1008, bottom: 720,
    width: 1008, height: 720, x: 0, y: 0, toJSON: () => ({}),
  });
});

afterEach(() => {
  document.getElementById('game-root')?.remove();
});

describe('PlacementGateOverlay', () => {
  it('renders nothing when no ghost is staged', () => {
    const { container } = render(<PlacementGateOverlay />);
    expect(container.querySelector('[data-testid="placement-gate-overlay"]')).toBeNull();
  });

  it('renders tick + cancel buttons when a ghost is staged', () => {
    GameUIStore.setPlacementGhost({ col: 10, row: 8, towerTypeId: 'arcane_bolt' });
    const { container } = render(<PlacementGateOverlay />);
    expect(container.querySelector('[data-testid="placement-gate-overlay"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="place-and-approve-commit"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="place-and-approve-cancel"]')).not.toBeNull();
  });

  it('fires onPlacementCommit when the tick is clicked', () => {
    let commits = 0;
    GameUIStore.registerCallbacks({
      onPlacementCommit: () => { commits++; },
    });
    GameUIStore.setPlacementGhost({ col: 5, row: 5, towerTypeId: 'arcane_bolt' });
    const { container } = render(<PlacementGateOverlay />);
    const tick = container.querySelector('[data-testid="place-and-approve-commit"]') as HTMLButtonElement;
    fireEvent.click(tick);
    expect(commits).toBe(1);
  });

  it('fires onPlacementCancel when the X is clicked', () => {
    let cancels = 0;
    GameUIStore.registerCallbacks({
      onPlacementCancel: () => { cancels++; },
    });
    GameUIStore.setPlacementGhost({ col: 5, row: 5, towerTypeId: 'arcane_bolt' });
    const { container } = render(<PlacementGateOverlay />);
    const cancel = container.querySelector('[data-testid="place-and-approve-cancel"]') as HTMLButtonElement;
    fireEvent.click(cancel);
    expect(cancels).toBe(1);
  });

  it('buttons have screen-reader-friendly aria-labels', () => {
    GameUIStore.setPlacementGhost({ col: 5, row: 5, towerTypeId: 'arcane_bolt' });
    const { container } = render(<PlacementGateOverlay />);
    const commit = container.querySelector('[data-testid="place-and-approve-commit"]');
    const cancel = container.querySelector('[data-testid="place-and-approve-cancel"]');
    expect(commit?.getAttribute('aria-label')).toContain('Confirm');
    expect(cancel?.getAttribute('aria-label')).toContain('Cancel');
  });

  it('renders a drag handle over the ghost cell', () => {
    GameUIStore.setPlacementGhost({ col: 5, row: 5, towerTypeId: 'arcane_bolt' });
    const { container } = render(<PlacementGateOverlay />);
    expect(container.querySelector('[data-testid="placement-gate-drag-handle"]')).not.toBeNull();
  });

  it('drag handle is touch-action:none (disables browser gestures mid-drag)', () => {
    GameUIStore.setPlacementGhost({ col: 5, row: 5, towerTypeId: 'arcane_bolt' });
    const { container } = render(<PlacementGateOverlay />);
    const handle = container.querySelector('[data-testid="placement-gate-drag-handle"]') as HTMLElement;
    const style = handle.getAttribute('style') ?? '';
    expect(style).toContain('touch-action');
  });
});

describe('PlacementGateOverlay — FIT-aware projection (portrait mobile fix)', () => {
  // Regression test for PR #79 mobile bug: tick/X were offset to the
  // top-left because the projection ignored Phaser's Scale.FIT
  // letterbox. On portrait viewports (canvas aspect 1.4:1 inside a
  // viewport ~0.46:1), there's a top + bottom letterbox the original
  // math didn't account for.
  beforeEach(() => {
    // Stub a portrait viewport: canvas internal 1008x720 (aspect ~1.4),
    // rendered into a 540x1170 viewport box. With FIT, the rendered
    // playfield is 540 wide × ~386 tall, centered vertically with
    // ~392px of letterbox top + bottom.
    document.getElementById('game-root')?.remove();
    const canvas = document.createElement('canvas');
    canvas.width = 1008;
    canvas.height = 720;
    const root = document.createElement('div');
    root.id = 'game-root';
    root.appendChild(canvas);
    document.body.appendChild(root);
    canvas.getBoundingClientRect = () => ({
      left: 0, top: 0, right: 540, bottom: 1170,
      width: 540, height: 1170, x: 0, y: 0, toJSON: () => ({}),
    });
  });

  it('drag handle is positioned inside the FIT-letterboxed playfield, not the full DOM rect', () => {
    GameUIStore.setPlacementGhost({ col: 18, row: 13, towerTypeId: 'arcane_bolt' });
    const { container } = render(<PlacementGateOverlay />);
    const handle = container.querySelector('[data-testid="placement-gate-drag-handle"]') as HTMLElement;
    const style = handle.getAttribute('style') ?? '';
    // FIT scale = min(540/1008, 1170/720) = min(0.536, 1.625) = 0.536
    // Letterbox offset top = (1170 - 720*0.536) / 2 ≈ 392
    // Pre-fix bug: tick lands near top:0 of the page.
    const topMatch = style.match(/top:\s*([\d.]+)px/);
    expect(topMatch, 'handle should have a top px value').not.toBeNull();
    const topPx = parseFloat(topMatch![1]);
    expect(topPx, 'handle y should be in the playfield region, not at the page top').toBeGreaterThan(200);
  });

  it('commit + cancel buttons land near the ghost cell on portrait mobile', () => {
    GameUIStore.setPlacementGhost({ col: 18, row: 13, towerTypeId: 'arcane_bolt' });
    const { container } = render(<PlacementGateOverlay />);
    const handle = container.querySelector('[data-testid="placement-gate-drag-handle"]') as HTMLElement;
    const commit = container.querySelector('[data-testid="place-and-approve-commit"]') as HTMLElement;
    const cancel = container.querySelector('[data-testid="place-and-approve-cancel"]') as HTMLElement;

    const handleTop = parseFloat((handle.getAttribute('style') ?? '').match(/top:\s*([\d.]+)px/)![1]);
    const commitTop = parseFloat((commit.getAttribute('style') ?? '').match(/top:\s*([\d.]+)px/)![1]);
    const cancelTop = parseFloat((cancel.getAttribute('style') ?? '').match(/top:\s*([\d.]+)px/)![1]);

    // Buttons sit ABOVE the handle (lower top px) — same vertical band.
    expect(commitTop).toBeLessThan(handleTop);
    expect(cancelTop).toBeLessThan(handleTop);
    // Both buttons at the same y (they flank the cell).
    expect(Math.abs(commitTop - cancelTop)).toBeLessThan(1);
    // Within ~one tile of the handle vertically — not off-screen.
    expect(handleTop - commitTop).toBeLessThan(120);
  });
});

describe('PlacementGateOverlay — double-tap to commit', () => {
  function tapHandle(handle: HTMLElement, atX: number = 100, atY: number = 100): void {
    handle.dispatchEvent(new PointerEvent('pointerdown', { clientX: atX, clientY: atY, pointerId: 1, bubbles: true }));
    handle.dispatchEvent(new PointerEvent('pointerup',   { clientX: atX, clientY: atY, pointerId: 1, bubbles: true }));
  }

  it('a single tap does NOT commit', () => {
    let commits = 0;
    GameUIStore.registerCallbacks({ onPlacementCommit: () => { commits++; } });
    GameUIStore.setPlacementGhost({ col: 5, row: 5, towerTypeId: 'arcane_bolt' });
    const { container } = render(<PlacementGateOverlay />);
    const handle = container.querySelector('[data-testid="placement-gate-drag-handle"]') as HTMLElement;
    tapHandle(handle);
    expect(commits).toBe(0);
  });

  it('two taps within the double-tap window commit the placement', () => {
    let commits = 0;
    GameUIStore.registerCallbacks({ onPlacementCommit: () => { commits++; } });
    GameUIStore.setPlacementGhost({ col: 5, row: 5, towerTypeId: 'arcane_bolt' });
    const { container } = render(<PlacementGateOverlay />);
    const handle = container.querySelector('[data-testid="placement-gate-drag-handle"]') as HTMLElement;
    tapHandle(handle);
    tapHandle(handle);
    expect(commits).toBe(1);
  });

  it('a long-travel pointerup is a drag, NOT a tap — does not contribute to double-tap', () => {
    let commits = 0;
    GameUIStore.registerCallbacks({ onPlacementCommit: () => { commits++; } });
    GameUIStore.setPlacementGhost({ col: 5, row: 5, towerTypeId: 'arcane_bolt' });
    const { container } = render(<PlacementGateOverlay />);
    const handle = container.querySelector('[data-testid="placement-gate-drag-handle"]') as HTMLElement;
    // First "tap" — but with high travel (drag).
    handle.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 100, pointerId: 1, bubbles: true }));
    handle.dispatchEvent(new PointerEvent('pointerup',   { clientX: 200, clientY: 100, pointerId: 1, bubbles: true }));
    // Real tap right after — should NOT commit (drag reset the tracker).
    tapHandle(handle, 150, 150);
    expect(commits).toBe(0);
  });
});

describe('PlacementGateOverlay — camera-zoom/scroll-aware projection', () => {
  // Regression test: the v1 fix (FIT-letterbox) didn't account for the
  // game camera's live zoom + scroll, so the tick/X icons appeared
  // disconnected from the dashed ghost cell as soon as the player
  // pinch-zoomed or pan-dragged the playfield. Two user screenshots
  // (bad_click_to_placement.png, bad_click_to_placement_2.png) confirm
  // the icons land in a global, zoom-invariant location while the
  // ghost cell is rendered in zoomed/panned coords.

  function withFakeCamera(zoom: number, scrollX: number, scrollY: number, fn: () => void) {
    // Canvas intrinsic dims match the test beforeEach (1008×720).
    // The projection reads `cam.worldView` directly — at zoom z and
    // scroll (sx, sy), the visible world rect is
    // (sx, sy, canvas.W / z, canvas.H / z).
    const fakeGame = {
      scene: {
        getScene: () => ({
          cameras: {
            main: {
              worldView: {
                x: scrollX,
                y: scrollY,
                width: 1008 / zoom,
                height: 720 / zoom,
              },
            },
          },
        }),
      },
    };
    const original = UIBridge.getGame;
    UIBridge.getGame = () => fakeGame as unknown as ReturnType<typeof original>;
    try { fn(); } finally { UIBridge.getGame = original; }
  }

  it('tile-size in screen px factors in camera zoom', () => {
    // At zoom=2 the tile reads twice as big on screen as at zoom=1.
    // The hit area + cell highlight read this from anchor.tileSize, so
    // the rendered cell box scales with the live camera.
    let baselineWidth = 0;
    withFakeCamera(1, 0, 0, () => {
      GameUIStore.setPlacementGhost({ col: 10, row: 8, towerTypeId: 'arcane_bolt' });
      const { container, unmount } = render(<PlacementGateOverlay />);
      const handle = container.querySelector('[data-testid="placement-gate-drag-handle"]') as HTMLElement;
      const w = (handle.getAttribute('style') ?? '').match(/width:\s*([\d.]+)px/);
      expect(w).not.toBeNull();
      baselineWidth = parseFloat(w![1]);
      unmount();
      GameUIStore.setPlacementGhost(null);
    });
    let zoomedWidth = 0;
    withFakeCamera(2, 0, 0, () => {
      GameUIStore.setPlacementGhost({ col: 10, row: 8, towerTypeId: 'arcane_bolt' });
      const { container, unmount } = render(<PlacementGateOverlay />);
      const handle = container.querySelector('[data-testid="placement-gate-drag-handle"]') as HTMLElement;
      const w = (handle.getAttribute('style') ?? '').match(/width:\s*([\d.]+)px/);
      zoomedWidth = parseFloat(w![1]);
      unmount();
      GameUIStore.setPlacementGhost(null);
    });
    // 2× zoom → ~2× tile size on screen.
    expect(zoomedWidth / baselineWidth).toBeCloseTo(2, 1);
  });

  it('cell screen-position shifts with camera scroll', () => {
    // Same target cell, different camera scroll — the screen anchor
    // must move. Without the fix the anchor was zoom-invariant and the
    // icons floated in their old place while the ghost moved with the
    // camera, producing the disconnected-icons screenshot.
    let leftA = 0;
    withFakeCamera(1, 0, 0, () => {
      GameUIStore.setPlacementGhost({ col: 18, row: 13, towerTypeId: 'arcane_bolt' });
      const { container, unmount } = render(<PlacementGateOverlay />);
      const handle = container.querySelector('[data-testid="placement-gate-drag-handle"]') as HTMLElement;
      leftA = parseFloat((handle.getAttribute('style') ?? '').match(/left:\s*([\d.]+)px/)![1]);
      unmount();
      GameUIStore.setPlacementGhost(null);
    });
    let leftB = 0;
    withFakeCamera(1, 200, 0, () => {
      GameUIStore.setPlacementGhost({ col: 18, row: 13, towerTypeId: 'arcane_bolt' });
      const { container, unmount } = render(<PlacementGateOverlay />);
      const handle = container.querySelector('[data-testid="placement-gate-drag-handle"]') as HTMLElement;
      leftB = parseFloat((handle.getAttribute('style') ?? '').match(/left:\s*([\d.]+)px/)![1]);
      unmount();
      GameUIStore.setPlacementGhost(null);
    });
    // Camera scrolled right by 200 world-px → cell's screen-X shifts
    // left by 200 (× FIT scale). Sign of the delta is the regression.
    expect(leftB).toBeLessThan(leftA);
    expect(leftA - leftB).toBeGreaterThan(100);
  });
});
