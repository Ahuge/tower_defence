/**
 * Playwright test hook.
 *
 * Lazily installed by main.ts only when the URL carries `?test=1`,
 * so production builds serve zero extra code. Exposes a small
 * surface on `window.__td_test` that Playwright specs use to:
 *
 *   - click grid cells on the Phaser canvas (world-coordinate input
 *     doesn't survive a plain Playwright `mouse.click(x, y)` because
 *     Phaser's pointer routing depends on synthetic pointer events)
 *   - query the current tutorial state without sleep/poll hacks
 *   - reset persisted tutorial state so fresh-install scenarios are
 *     a one-liner in tests
 *
 * Keep this surface intentionally tiny. Every hook is a durable
 * public API the tests rely on; adding more is easy, removing them
 * is a test rewrite.
 */
import { gridX, gridY } from './config';
import { UIBridge } from './ui/UIBridge';
import { TutorialManager } from './systems/Tutorial/TutorialManager';
import { TutorialPersistence } from './systems/Tutorial/TutorialPersistence';

declare global {
  interface Window {
    /** Present only when the page was loaded with `?test=1`. */
    __td_test?: TestHook;
  }
}

interface TestHook {
  /** Synthesise a click on the grid at the given cell. Maps world
   *  coordinates through the active GameScene camera's worldView to
   *  viewport CSS pixels, then dispatches pointerdown + pointerup on
   *  the canvas element. */
  clickCell: (col: number, row: number) => boolean;
  /** Active tutorial step id, or null if no tutorial is running. */
  getActiveTutorialStep: () => string | null;
  /** Active tutorial track id, or null. */
  getActiveTutorialTrack: () => string | null;
  /** Wipe persisted tutorial state and reload the page — tests use
   *  this to start a "fresh install" scenario without touching
   *  localStorage directly (cross-browser quirks). */
  resetTutorialState: () => void;
  /** True once the app-startup splash has emitted its "dismissed"
   *  signal. Tests poll this before interacting with the menu. */
  isBootComplete: () => boolean;
}

let bootComplete = false;
window.addEventListener('app-splash-dismissed', () => { bootComplete = true; });

function clickCell(col: number, row: number): boolean {
  const canvas = document.querySelector<HTMLCanvasElement>('#game-root canvas');
  if (!canvas) return false;
  const game = UIBridge.getGame();
  if (!game) return false;
  const scene = game.scene.getScene('GameScene') as unknown as { cameras?: { main: Phaser.Cameras.Scene2D.Camera } } | null;
  const cam = scene?.cameras?.main;
  if (!cam) return false;
  const wv = cam.worldView;
  if (!wv || wv.width === 0 || wv.height === 0) return false;

  const worldX = gridX(col);
  const worldY = gridY(row);
  const cr = canvas.getBoundingClientRect();
  const u = (worldX - wv.x) / wv.width;
  const v = (worldY - wv.y) / wv.height;
  const clientX = cr.left + u * cr.width;
  const clientY = cr.top + v * cr.height;

  const opts: PointerEventInit = {
    clientX, clientY,
    bubbles: true,
    cancelable: true,
    button: 0,
    buttons: 1,
    pointerId: 1,
    pointerType: 'mouse',
    isPrimary: true,
  };
  canvas.dispatchEvent(new PointerEvent('pointerdown', opts));
  canvas.dispatchEvent(new PointerEvent('pointerup', { ...opts, buttons: 0 }));
  return true;
}

export function installTestHook(): void {
  window.__td_test = {
    clickCell,
    getActiveTutorialStep: () => TutorialManager.getActive()?.step.id ?? null,
    getActiveTutorialTrack: () => TutorialManager.getActive()?.track.id ?? null,
    resetTutorialState: () => {
      TutorialPersistence.reset();
      location.reload();
    },
    isBootComplete: () => bootComplete,
  };
  // One-line breadcrumb — handy when a test fails and you open the
  // browser's console in trace viewer.
  console.info('[td-test] debug hook installed');
}
