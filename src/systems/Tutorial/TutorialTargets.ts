/**
 * TutorialTargets — how a step describes the thing it wants to highlight.
 *
 * Three kinds:
 *  - `dom`     — a CSS selector for a DOM element rendered above the Phaser canvas
 *                (sidebar panels, tower dock, status bar, menu buttons). The
 *                selector is resolved each render so panels that open/close still
 *                get tracked.
 *  - `canvas`  — a rect in Phaser WORLD coordinates. We walk it through the
 *                active Phaser camera (scroll + zoom) to get buffer-space
 *                coords, then scale to viewport via the canvas bounding rect.
 *                Needed on mobile, where the camera is zoomed 1.8x and
 *                centered so the grid isn't swallowed by the tall canvas.
 *  - `screen`  — no spotlight; the popover is centered. Used for intro/outro steps.
 */
import { UIBridge } from '../../ui/UIBridge';

export type TutorialTarget =
  | { kind: 'dom'; selector: string }
  | { kind: 'canvas'; x: number; y: number; width: number; height: number }
  | { kind: 'screen' };

export interface ResolvedRect {
  /** Viewport-space rect in CSS pixels. */
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Find the active GameScene's main camera, or null if there isn't one
 *  (pre-game, mid-scene-transition, etc.). */
function getGameCamera(): { scrollX: number; scrollY: number; zoom: number } | null {
  const game = UIBridge.getGame();
  if (!game) return null;
  const scene = game.scene.getScene('GameScene');
  if (!scene || !scene.cameras) return null;
  const cam = scene.cameras.main;
  if (!cam) return null;
  return { scrollX: cam.scrollX, scrollY: cam.scrollY, zoom: cam.zoom };
}

/** Resolve a target to a viewport-pixel rect, or null if it can't be found
 *  right now (DOM selector not yet mounted, canvas not attached). */
export function resolveTarget(target: TutorialTarget): ResolvedRect | null {
  if (target.kind === 'screen') return null;

  if (target.kind === 'dom') {
    const el = document.querySelector<HTMLElement>(target.selector);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return null;
    return { x: r.left, y: r.top, width: r.width, height: r.height };
  }

  // canvas — target {x,y} are in Phaser world coords.
  const canvas = document.querySelector<HTMLCanvasElement>('#game-root canvas');
  if (!canvas) return null;
  const cr = canvas.getBoundingClientRect();
  const sx = cr.width / canvas.width;
  const sy = cr.height / canvas.height;

  // World → buffer: account for camera scroll + zoom. Fallback to identity
  // if no camera is available (desktop pre-match, scene unmounted, etc.).
  const cam = getGameCamera() ?? { scrollX: 0, scrollY: 0, zoom: 1 };
  const bufX = (target.x - cam.scrollX) * cam.zoom;
  const bufY = (target.y - cam.scrollY) * cam.zoom;
  const bufW = target.width * cam.zoom;
  const bufH = target.height * cam.zoom;

  // Buffer → viewport CSS pixels.
  return {
    x: cr.left + bufX * sx,
    y: cr.top + bufY * sy,
    width: bufW * sx,
    height: bufH * sy,
  };
}
