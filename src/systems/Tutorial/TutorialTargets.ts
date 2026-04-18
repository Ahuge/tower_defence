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

/** World rect currently visible in the main camera — ground truth for
 *  world-to-canvas mapping. `worldView` is Phaser's own derived rect
 *  covering `(scrollX, scrollY)` through `(scrollX + width/zoom, ...)`.
 *  Returns null when there's no scene / camera active. */
function getCameraWorldView(): { x: number; y: number; width: number; height: number } | null {
  const game = UIBridge.getGame();
  if (!game) return null;
  const scene = game.scene.getScene('GameScene');
  if (!scene || !scene.cameras) return null;
  const cam = scene.cameras.main;
  if (!cam) return null;
  const wv = cam.worldView;
  if (!wv || wv.width === 0 || wv.height === 0) return null;
  return { x: wv.x, y: wv.y, width: wv.width, height: wv.height };
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

  // canvas — target {x,y,w,h} are in Phaser world coords.
  const canvas = document.querySelector<HTMLCanvasElement>('#game-root canvas');
  if (!canvas) return null;
  const cr = canvas.getBoundingClientRect();

  // Map world coords to the canvas's visible CSS rect by using the camera's
  // worldView rect. A world point at worldView.x maps to cr.left, a world
  // point at worldView.x + worldView.width maps to cr.right, etc. This
  // avoids assumptions about DPR, canvas buffer size, or camera viewport
  // offsets — Phaser tells us exactly which world rect the canvas is
  // currently displaying, and we linearly interpolate.
  //
  // Fallback (no camera / no scene): assume canvas shows world (0,0)–
  // (canvas.width, canvas.height). That's only correct on desktop at 1x
  // zoom, which is fine because canvas targets are only used during the
  // tutorial match anyway.
  const wv = getCameraWorldView() ?? { x: 0, y: 0, width: canvas.width, height: canvas.height };
  const u0 = (target.x - wv.x) / wv.width;
  const v0 = (target.y - wv.y) / wv.height;
  const u1 = (target.x + target.width - wv.x) / wv.width;
  const v1 = (target.y + target.height - wv.y) / wv.height;
  return {
    x: cr.left + u0 * cr.width,
    y: cr.top + v0 * cr.height,
    width: (u1 - u0) * cr.width,
    height: (v1 - v0) * cr.height,
  };
}
