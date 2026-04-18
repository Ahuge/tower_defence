/**
 * TutorialTargets — how a step describes the thing it wants to highlight.
 *
 * Kinds:
 *  - `dom`             — a CSS selector for a DOM element rendered above the
 *                         Phaser canvas (sidebar panels, tower dock, status
 *                         bar, menu buttons). Resolved each render so panels
 *                         that open/close still get tracked.
 *  - `canvas`          — a static rect in Phaser WORLD coordinates. Mapped
 *                         through the camera's worldView + the canvas
 *                         bounding rect to viewport CSS pixels.
 *  - `canvas-dynamic`  — same but the rect is recomputed each frame via
 *                         `compute()`. Used for hints that follow live game
 *                         state (e.g. "next cell along the current creep
 *                         path").
 *  - `screen`          — no spotlight; popover centres. Intro/outro steps.
 */
import { UIBridge } from '../../ui/UIBridge';
import type * as Phaser from 'phaser';
import type { PathPoint } from '../Pathfinding';

export type WorldRect = { x: number; y: number; width: number; height: number };

export type TutorialTarget =
  | { kind: 'dom'; selector: string }
  | { kind: 'canvas'; x: number; y: number; width: number; height: number }
  | { kind: 'screen' }
  | { kind: 'canvas-dynamic'; compute: () => WorldRect | null };

/** Phaser Scene interface we care about — declared structurally here so
 *  consumers across TutorialManager / TutorialTargets / TutorialTracks
 *  don't each re-define their own `as unknown as { allPaths: … }` cast. */
interface GameSceneLike extends Phaser.Scene {
  allPaths?: (PathPoint[] | null)[];
}

/** Active GameScene reference, or null. */
function getGameScene(): GameSceneLike | null {
  const game = UIBridge.getGame();
  if (!game) return null;
  return (game.scene.getScene('GameScene') as GameSceneLike | undefined) ?? null;
}

/** Current creep path for the main entry point, or null if no scene is
 *  active. Exposed here (not in a separate module) because tutorial
 *  target helpers are the only consumer. */
export function getCurrentTutorialPath(): PathPoint[] | null {
  const scene = getGameScene();
  const paths = scene?.allPaths;
  if (!paths || paths.length === 0) return null;
  return paths[0] ?? null;
}

/** Expose the main camera for the active GameScene, or null. Used by
 *  TutorialManager.panCameraToStep so it doesn't have to replicate
 *  the scene-lookup dance. */
export function getGameCamera(): Phaser.Cameras.Scene2D.Camera | null {
  const scene = getGameScene();
  if (!scene || !scene.cameras) return null;
  return scene.cameras.main ?? null;
}

/** Resolve a canvas / canvas-dynamic target to its world rect (or null
 *  if a dynamic compute returned null). Shared by resolveTarget (for
 *  the spotlight) and TutorialManager.panCameraToStep (for the camera
 *  auto-pan). Static `canvas` targets just pass through. */
export function resolveCanvasTargetRect(target: TutorialTarget): WorldRect | null {
  if (target.kind === 'canvas') {
    return { x: target.x, y: target.y, width: target.width, height: target.height };
  }
  if (target.kind === 'canvas-dynamic') {
    return target.compute();
  }
  return null;
}

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
function getCameraWorldView(): WorldRect | null {
  const cam = getGameCamera();
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

  // Static canvas or dynamic canvas target — get the world-space rect.
  const worldRect = resolveCanvasTargetRect(target);
  if (!worldRect) return null;

  // canvas — worldRect {x,y,w,h} are in Phaser world coords.
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
  const u0 = (worldRect.x - wv.x) / wv.width;
  const v0 = (worldRect.y - wv.y) / wv.height;
  const u1 = (worldRect.x + worldRect.width - wv.x) / wv.width;
  const v1 = (worldRect.y + worldRect.height - wv.y) / wv.height;
  return {
    x: cr.left + u0 * cr.width,
    y: cr.top + v0 * cr.height,
    width: (u1 - u0) * cr.width,
    height: (v1 - v0) * cr.height,
  };
}
