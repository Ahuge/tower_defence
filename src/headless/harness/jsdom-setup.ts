/**
 * Minimum browser shim for the harness — makes Phaser happy when
 * the match runs outside vitest (which otherwise sets up jsdom).
 *
 * Phaser's feature-detection code touches `window.cordova` at
 * import time, which throws `ReferenceError: window is not defined`
 * in plain Node. Installing jsdom puts a minimal DOM on
 * `globalThis.window / .document / .navigator` so the detection
 * path returns its fallback values and Phaser proceeds without
 * trying to attach to a real canvas.
 *
 * Only runs in plain-Node contexts (detected via the absence of
 * `globalThis.window`) so importing this from a vitest test stays
 * a no-op.
 */
import { JSDOM } from 'jsdom';

if (typeof (globalThis as any).window === 'undefined') {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost/',
    pretendToBeVisual: false,
  });
  // Phaser touches a long tail of browser globals at import time
  // (HTMLCanvasElement, HTMLImageElement, CSS, matchMedia, ...).
  // Rather than enumerate every property the library reaches for,
  // copy every non-existing property from dom.window onto
  // globalThis. Stays defensive: we don't overwrite anything
  // already defined (e.g. Node's setTimeout). Node 24 makes some
  // globals getter-only (navigator, fetch) — defineProperty works
  // around the TypeError from direct assignment.
  const win = dom.window as any;
  const g = globalThis as any;
  for (const key of Object.getOwnPropertyNames(win)) {
    if (g[key] !== undefined) continue;
    try {
      g[key] = win[key];
    } catch {
      try {
        Object.defineProperty(g, key, {
          value: win[key], writable: true, configurable: true, enumerable: false,
        });
      } catch { /* some props are genuinely sealed — skip */ }
    }
  }
  // The window + document references themselves need to exist even
  // if Node already has a `navigator`-like placeholder.
  Object.defineProperty(g, 'window', { value: win, writable: true, configurable: true });
  Object.defineProperty(g, 'document', { value: win.document, writable: true, configurable: true });
}
