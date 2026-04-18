/**
 * Rect geometry helpers for tests.
 *
 * Use these in overlay / popover / spotlight specs to assert things
 * like "the popover does not cover the spotlight" or "the help modal
 * is fully inside the viewport". All helpers treat a `Rect` as a
 * non-rotated axis-aligned rectangle in CSS pixel space.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Clone a DOMRect-like into the plain Rect shape used by assertions. */
export function toRect(r: { left?: number; x?: number; top?: number; y?: number; width: number; height: number }): Rect {
  return {
    x: (r.left ?? r.x ?? 0),
    y: (r.top ?? r.y ?? 0),
    width: r.width,
    height: r.height,
  };
}

/** True when the two rects share any interior area. Touching edges
 *  (a.right === b.left) counts as NOT overlapping — that's usually
 *  what you want when checking "popover sits next to spotlight, not
 *  on top of it". */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  const ax2 = a.x + a.width;
  const ay2 = a.y + a.height;
  const bx2 = b.x + b.width;
  const by2 = b.y + b.height;
  return a.x < bx2 && ax2 > b.x && a.y < by2 && ay2 > b.y;
}

/** The intersection of two rects, or null if they don't overlap.
 *  Useful when the question is "how much does the popover cover"
 *  rather than the binary "does it cover at all". */
export function rectIntersection(a: Rect, b: Rect): Rect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  if (x2 <= x || y2 <= y) return null;
  return { x, y, width: x2 - x, height: y2 - y };
}

/** True when `inner` is entirely inside `outer` (touching edges OK). */
export function rectContains(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

/** True when at least one pixel of `rect` sits inside the (0,0,vw,vh)
 *  viewport box. Used for "element is at least partially visible". */
export function rectIsVisible(rect: Rect, viewportWidth: number, viewportHeight: number): boolean {
  return rectsOverlap(rect, { x: 0, y: 0, width: viewportWidth, height: viewportHeight });
}

/** True when `rect` is fully inside the viewport with at least `margin`
 *  pixels of breathing room on each side. */
export function rectFullyInsideViewport(rect: Rect, viewportWidth: number, viewportHeight: number, margin = 0): boolean {
  return rectContains(
    { x: margin, y: margin, width: viewportWidth - margin * 2, height: viewportHeight - margin * 2 },
    rect,
  );
}

/** Read the bounding rect of an element. Wraps getBoundingClientRect
 *  and normalises to the plain Rect shape so tests can pass the result
 *  straight into the other helpers. */
export function elementRect(el: Element): Rect {
  return toRect(el.getBoundingClientRect());
}

// ─── Vitest assertion helpers ──────────────────────────────────
//
// These wrap the predicates above with descriptive failure messages.
// Import them in specs and do `assertNoOverlap(popover, spotlight);`
// to get a clear message on failure.

import { expect } from 'vitest';

/** Fails the test if `a` and `b` overlap. */
export function assertNoOverlap(a: Rect, b: Rect, aLabel = 'a', bLabel = 'b'): void {
  const ix = rectIntersection(a, b);
  expect(
    ix,
    `Expected ${aLabel} and ${bLabel} to not overlap, but they intersected by ${
      ix ? `${Math.round(ix.width)}×${Math.round(ix.height)} at (${Math.round(ix.x)}, ${Math.round(ix.y)})` : 'null'
    }.\n  ${aLabel}: ${rectDesc(a)}\n  ${bLabel}: ${rectDesc(b)}`,
  ).toBeNull();
}

/** Fails the test if `a` and `b` do not overlap. */
export function assertOverlap(a: Rect, b: Rect, aLabel = 'a', bLabel = 'b'): void {
  expect(
    rectsOverlap(a, b),
    `Expected ${aLabel} and ${bLabel} to overlap.\n  ${aLabel}: ${rectDesc(a)}\n  ${bLabel}: ${rectDesc(b)}`,
  ).toBe(true);
}

/** Fails if `inner` is not fully inside `outer`. */
export function assertContains(outer: Rect, inner: Rect, outerLabel = 'outer', innerLabel = 'inner'): void {
  expect(
    rectContains(outer, inner),
    `Expected ${outerLabel} to contain ${innerLabel}.\n  ${outerLabel}: ${rectDesc(outer)}\n  ${innerLabel}: ${rectDesc(inner)}`,
  ).toBe(true);
}

function rectDesc(r: Rect): string {
  return `x=${Math.round(r.x)} y=${Math.round(r.y)} w=${Math.round(r.width)} h=${Math.round(r.height)}`;
}
