/**
 * TutorialTargets — how a step describes the thing it wants to highlight.
 *
 * Three kinds:
 *  - `dom`     — a CSS selector for a DOM element rendered above the Phaser canvas
 *                (sidebar panels, tower dock, status bar, menu buttons). The
 *                selector is resolved each render so panels that open/close still
 *                get tracked.
 *  - `canvas`  — a rect in the Phaser game coordinate space. The overlay converts
 *                it to viewport pixels via the canvas bounding rect and Phaser's
 *                internal scale factor.
 *  - `screen`  — no spotlight; the popover is centered. Used for intro/outro steps.
 */

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

  // canvas
  const canvas = document.querySelector<HTMLCanvasElement>('#game-root canvas');
  if (!canvas) return null;
  const cr = canvas.getBoundingClientRect();
  // Phaser internal drawing buffer is canvas.width × canvas.height; on-screen
  // size is cr.width × cr.height. Scale factor converts game pixels to CSS.
  const sx = cr.width / canvas.width;
  const sy = cr.height / canvas.height;
  return {
    x: cr.left + target.x * sx,
    y: cr.top + target.y * sy,
    width: target.width * sx,
    height: target.height * sy,
  };
}
