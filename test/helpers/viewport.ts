/**
 * Viewport helpers for component tests.
 *
 * jsdom's window.innerWidth / innerHeight default to 1024×768. Many
 * tutorial components compute positions from those dimensions, so
 * specs that want to test a specific breakpoint (mobile, tablet,
 * desktop) need to override them temporarily.
 *
 * `withViewport` installs the overrides, runs the callback, then
 * restores the original values so every spec starts from a clean
 * state regardless of order.
 */

export interface Viewport {
  width: number;
  height: number;
}

/** Common device sizes used across component specs. */
export const VIEWPORTS = {
  /** Narrow phone — iPhone 14 portrait, roughly. */
  phone: { width: 390, height: 844 } as Viewport,
  /** Wider phone / small tablet. */
  phoneWide: { width: 480, height: 900 } as Viewport,
  /** iPad portrait. */
  tablet: { width: 768, height: 1024 } as Viewport,
  /** Typical desktop. */
  desktop: { width: 1280, height: 800 } as Viewport,
} as const;

/** Temporarily set window.innerWidth / innerHeight. Returns a
 *  restore fn — call it (or use `withViewport`) to put the
 *  originals back. */
export function setViewport(vp: Viewport): () => void {
  const originalW = window.innerWidth;
  const originalH = window.innerHeight;
  Object.defineProperty(window, 'innerWidth', { value: vp.width, writable: true, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: vp.height, writable: true, configurable: true });
  return () => {
    Object.defineProperty(window, 'innerWidth', { value: originalW, writable: true, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: originalH, writable: true, configurable: true });
  };
}

/** Run `fn` with the supplied viewport dimensions, then restore. */
export function withViewport<T>(vp: Viewport, fn: () => T): T {
  const restore = setViewport(vp);
  try {
    return fn();
  } finally {
    restore();
  }
}
