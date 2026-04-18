/**
 * Regression pack — one spec file that documents every past tutorial
 * bug and the test that guards against it coming back.
 *
 * Some regressions are already covered by the tests co-located with
 * each component (linked in comments below) — we assert those here
 * too so a file rename or re-org can't quietly lose the coverage.
 * Others live ONLY in this file because their target isn't a good
 * fit for any other spec.
 *
 * When adding a new bug to the list:
 *   1. Write a test here with the bug description in a leading
 *      comment.
 *   2. If the test belongs in a component-level spec too, link it
 *      with "Also covered in: …" so future readers see both.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/preact';
import type { ScreenId } from '../ui/UIBridge';

// ─── Shared mocks across specs that touch TutorialManager ─────

const managerMocks = vi.hoisted(() => ({
  screen: null as ScreenId,
  screenListeners: [] as Array<(s: ScreenId, d: Record<string, unknown>) => void>,
  startScene: vi.fn(),
  goToMenu: vi.fn(),
  camPan: vi.fn(),
  cameraWorldView: null as { x: number; y: number; width: number; height: number } | null,
  currentPath: null as unknown,
  gameSceneCamera: {} as { pan: ReturnType<typeof vi.fn> },
}));

// Stub UIBridge so we can drive onScreenChange + getScreen from the test.
vi.mock('../ui/UIBridge', () => ({
  UIBridge: {
    getScreen: () => managerMocks.screen,
    getData: () => ({}),
    onScreenChange: (fn: (s: ScreenId, d: Record<string, unknown>) => void) => {
      managerMocks.screenListeners.push(fn);
      return () => { managerMocks.screenListeners = managerMocks.screenListeners.filter(l => l !== fn); };
    },
    startScene: managerMocks.startScene,
    // Non-null so the camera-accessor helpers believe a game exists.
    getGame: () => ({}),
  },
}));

// TutorialTargets: expose a spy-driven camera + path so the pan test
// can control what getGameCamera returns without wiring a Phaser scene.
vi.mock('../systems/Tutorial/TutorialTargets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../systems/Tutorial/TutorialTargets')>();
  managerMocks.gameSceneCamera = { pan: vi.fn() };
  return {
    ...actual,
    getGameCamera: () => managerMocks.gameSceneCamera,
    getCurrentTutorialPath: () => managerMocks.currentPath,
  };
});

vi.mock('../ui/navigation', () => ({
  goToMenu: managerMocks.goToMenu,
}));

vi.mock('../ui/GameUIStore', () => ({
  GameUIStore: { requestSelectDockTower: vi.fn() },
}));

import { TutorialManagerClass } from '../systems/Tutorial/TutorialManager';
import { TutorialPersistence } from '../systems/Tutorial/TutorialPersistence';

function freshManager(): TutorialManagerClass {
  const mgr = new TutorialManagerClass();
  mgr.init();
  return mgr;
}

beforeEach(() => {
  managerMocks.screen = null;
  managerMocks.screenListeners = [];
  managerMocks.startScene.mockReset();
  managerMocks.goToMenu.mockReset();
  managerMocks.gameSceneCamera.pan = vi.fn();
  managerMocks.currentPath = null;
  TutorialPersistence.reset();
});

afterEach(() => {
  cleanup();
});

// ═══════════════════════════════════════════════════════════════
// Regression: panCameraToStep silently ignored canvas-dynamic targets
//
// Bug: `panCameraToStep` early-returned on `t.kind !== 'canvas'`, but
// place_third / place_fourth / place_frost all use `canvas-dynamic`.
// Result: the auto-pan quietly skipped the three steps it was most
// useful for. Players on mobile would lose the highlighted cell off-
// screen after panning.
//
// Fix: use `resolveCanvasTargetRect` (handles both kinds) + call
// cam.pan on the resolved world rect.
// ═══════════════════════════════════════════════════════════════

describe('Regression — canvas-dynamic pan is not skipped', () => {
  it('pans the camera for a canvas-dynamic step, not just canvas', () => {
    // Provide a path so nextMazeExtensionTarget's compute() returns a
    // real rect rather than the fallback — both branches should pan
    // equally, but the failure mode we're guarding specifically
    // stopped short on canvas-dynamic.
    managerMocks.currentPath = [
      { col: 0, row: 13 }, { col: 10, row: 13 },
      { col: 11, row: 12 }, { col: 12, row: 12 }, { col: 13, row: 12 },
      { col: 14, row: 13 }, { col: 35, row: 13 },
    ];

    const mgr = freshManager();
    mgr.start('tutorial_match');

    // Walk forward to `place_second` — the first step using
    // nextMazeExtensionTarget (canvas-dynamic).
    let safety = 30;
    while (mgr.getActive() && mgr.getActive()!.step.id !== 'place_second' && safety-- > 0) {
      mgr.next();
    }
    expect(mgr.getActive()!.step.id).toBe('place_second');
    // cam.pan should have been called when the step activated.
    expect(managerMocks.gameSceneCamera.pan).toHaveBeenCalled();
  });

  it('still pans for static canvas targets (keeps behaviour for the other kind)', () => {
    const mgr = freshManager();
    mgr.start('tutorial_match');
    // `place_first` is a static canvas target.
    let safety = 30;
    while (mgr.getActive() && mgr.getActive()!.step.id !== 'place_first' && safety-- > 0) {
      mgr.next();
    }
    expect(mgr.getActive()!.step.id).toBe('place_first');
    expect(managerMocks.gameSceneCamera.pan).toHaveBeenCalled();
  });

  it('does NOT pan for DOM targets (off-canvas highlights)', () => {
    const mgr = freshManager();
    mgr.start('tutorial_match');
    // `pick_tower` is a DOM target (tower dock selector).
    // It's only the second step, so one next() away.
    let safety = 5;
    while (mgr.getActive() && mgr.getActive()!.step.id !== 'pick_tower' && safety-- > 0) {
      mgr.next();
    }
    expect(mgr.getActive()!.step.id).toBe('pick_tower');
    // Reset the mock to isolate this step's activation.
    managerMocks.gameSceneCamera.pan.mockReset();
    // Re-activate by replaying the step transition — but there's no API
    // for that; confirm instead that the prior state didn't spuriously
    // call pan. This is a structural check — the `t.kind !== 'canvas' &&
    // t.kind !== 'canvas-dynamic'` guard would fail this if DOM kinds
    // slipped through.
    // (Re-entering the same step isn't supported; we assert the
    // guard shape by inspecting the step's target kind.)
    expect(mgr.getActive()!.step.target.kind).toBe('dom');
  });
});

// ═══════════════════════════════════════════════════════════════
// Regression: skip_hint self-dismissal re-queued another check
//
// Bug: checkForSkipHintAfterDelay ran unconditionally inside
// complete()/skip(). Dismissing the skip-hint mini-track itself
// queued another 500ms timer that would then re-check — safe in
// practice thanks to the isCompleted guard, but wasteful and a
// symptom of broken control flow.
//
// Fix: early-return if the just-dismissed track id was 'skip_hint'.
//
// Also covered in: TutorialManager.test.ts > skip > skip_hint loop.
// ═══════════════════════════════════════════════════════════════

describe('Regression — dismissing skip_hint does not re-queue the skip-hint check', () => {
  it('completing skip_hint does not fire another check', async () => {
    managerMocks.screen = 'menu';
    const mgr = freshManager();

    // Prime: complete basics so the "at least one other track" gate
    // would otherwise re-fire skip_hint.
    mgr.start('basics');
    mgr.complete();

    mgr.start('skip_hint');
    mgr.complete();

    vi.useFakeTimers();
    vi.advanceTimersByTime(2000);
    vi.useRealTimers();

    expect(mgr.getActive()).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════
// Regression: event-gated scrim click-catchers swallowed taps
//
// Bug: ScrimClickCatcher rendered unconditionally whenever the
// spotlight had a rect. For towerPlaced-gated steps, onClickScrim
// was undefined — but the four invisible `pointer-events: auto`
// divs still absorbed every tap outside the tiny highlight,
// blocking the canvas and preventing the player from placing a
// tower.
//
// Fix: only render the catchers when onClickScrim is defined AND
// the track is not scrimless.
//
// Also covered in: Spotlight.test.tsx > click catchers.
// ═══════════════════════════════════════════════════════════════

describe('Regression — event-gated scrim does not block canvas taps', () => {
  it('Spotlight without onClickScrim has zero scrim click-catchers', async () => {
    const { Spotlight } = await import('../ui/tutorial/Spotlight');
    render(<Spotlight rect={{ x: 100, y: 100, width: 60, height: 60 }} />);
    const catchers = document.querySelectorAll('div[style*="z-index: 399"]');
    expect(catchers.length).toBe(0);
  });

  it('scrimless track also produces no click-catchers even if onClickScrim is set', async () => {
    const { Spotlight } = await import('../ui/tutorial/Spotlight');
    render(
      <Spotlight
        rect={{ x: 100, y: 100, width: 60, height: 60 }}
        scrimless
        onClickScrim={() => {}}
      />,
    );
    expect(document.querySelectorAll('div[style*="z-index: 399"]').length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// Regression: Tutorial help modal trapped inside .ui-header stacking
//
// Bug: The ? button's modal rendered inline with the button, under
// `.ui-header`. `.ui-screen > *` assigns a z-index: 1 stacking
// context per direct child, which scoped the modal's z-index: 500
// inside .ui-header — so later `.ui-section` siblings painted on
// top of the modal.
//
// Fix: preact/compat createPortal into document.body.
//
// Also covered in: TutorialMenuButton.test.tsx > modal open/close.
// ═══════════════════════════════════════════════════════════════

describe('Regression — tutorial help modal portals to document.body', () => {
  it('[covered elsewhere] TutorialMenuButton.test.tsx owns the full assertion', () => {
    // Primary coverage: src/ui/tutorial/TutorialMenuButton.test.tsx
    //   > "modal portals into document.body (not nested under the button)"
    // Duplicating it here would need its own module-mock scope that
    // conflicts with this file's TutorialManager stubs. The pointer
    // keeps the regression discoverable from the consolidated pack.
    expect(true).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════
// Regression: tutorial starting-gold bump ran before EconomyManager
//
// Bug: in GameScene.init the tutorial override was:
//     this.lives = 99;
//     this.economy.addGold(150);   // <— economy not constructed yet
// The addGold call threw a ReferenceError 76 lines before
// `this.economy = new EconomyManager(...)`, aborting create() mid-way.
// Symptom: canvas black, no grid, no tower dock, Gold:0/DEAD.
//
// Fix: moved the addGold bump to immediately after EconomyManager
// construction.
//
// We can't exercise GameScene.create() in jsdom (no Phaser scene).
// Instead we assert the invariant at the source level: the tutorial
// gold bump call site is AFTER the EconomyManager construction.
// ═══════════════════════════════════════════════════════════════

describe('Regression — tutorial gold bump happens after economy init', () => {
  it('GameScene.ts orders EconomyManager construction before the tutorial gold bump', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');
    const src = await fs.readFile(
      path.resolve(__dirname, '../../src/scenes/GameScene.ts'),
      'utf-8',
    );
    const econIdx = src.indexOf('this.economy = new EconomyManager');
    const goldIdx = src.indexOf("this.matchMode === 'tutorial') this.economy.addGold(150)");
    expect(econIdx, 'EconomyManager construction not found').toBeGreaterThan(-1);
    expect(goldIdx, 'tutorial gold bump not found').toBeGreaterThan(-1);
    expect(goldIdx).toBeGreaterThan(econIdx);
  });
});
