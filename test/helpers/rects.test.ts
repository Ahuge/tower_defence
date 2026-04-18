/**
 * Spec for the rect helper utilities themselves. These are the
 * primitives tests across the suite will use to assert overlapping
 * / non-overlapping / containment behaviour, so they need their
 * own tests — a bug here would silently weaken every downstream
 * assertion.
 */
import { describe, it, expect } from 'vitest';
import {
  rectsOverlap,
  rectIntersection,
  rectContains,
  rectIsVisible,
  rectFullyInsideViewport,
  assertNoOverlap,
  assertOverlap,
  assertContains,
  toRect,
  Rect,
} from './rects';

const r = (x: number, y: number, w: number, h: number): Rect => ({ x, y, width: w, height: h });

describe('rectsOverlap', () => {
  it('detects intersecting rects', () => {
    expect(rectsOverlap(r(0, 0, 10, 10), r(5, 5, 10, 10))).toBe(true);
  });

  it('detects nested rects', () => {
    expect(rectsOverlap(r(0, 0, 100, 100), r(25, 25, 10, 10))).toBe(true);
  });

  it('returns false for rects that only touch edges', () => {
    // Touching but not overlapping — the common "next to, not on top of" case.
    expect(rectsOverlap(r(0, 0, 10, 10), r(10, 0, 10, 10))).toBe(false);
    expect(rectsOverlap(r(0, 0, 10, 10), r(0, 10, 10, 10))).toBe(false);
  });

  it('returns false for disjoint rects', () => {
    expect(rectsOverlap(r(0, 0, 10, 10), r(100, 100, 10, 10))).toBe(false);
  });
});

describe('rectIntersection', () => {
  it('returns the overlap region', () => {
    const ix = rectIntersection(r(0, 0, 10, 10), r(5, 5, 10, 10));
    expect(ix).toEqual({ x: 5, y: 5, width: 5, height: 5 });
  });

  it('returns null for disjoint rects', () => {
    expect(rectIntersection(r(0, 0, 10, 10), r(100, 100, 5, 5))).toBeNull();
  });

  it('returns null for edge-touching rects', () => {
    expect(rectIntersection(r(0, 0, 10, 10), r(10, 0, 10, 10))).toBeNull();
  });
});

describe('rectContains', () => {
  it('accepts an inner rect fully inside the outer', () => {
    expect(rectContains(r(0, 0, 100, 100), r(10, 10, 20, 20))).toBe(true);
  });

  it('accepts an inner rect touching the outer edges', () => {
    expect(rectContains(r(0, 0, 100, 100), r(0, 0, 100, 100))).toBe(true);
  });

  it('rejects an inner rect that crosses an edge', () => {
    expect(rectContains(r(0, 0, 100, 100), r(90, 0, 20, 10))).toBe(false);
  });
});

describe('rectIsVisible', () => {
  it('returns true when rect sits inside the viewport', () => {
    expect(rectIsVisible(r(10, 10, 20, 20), 400, 400)).toBe(true);
  });

  it('returns true when rect partially intrudes into the viewport', () => {
    expect(rectIsVisible(r(-5, -5, 10, 10), 400, 400)).toBe(true);
  });

  it('returns false when rect is fully off-screen', () => {
    expect(rectIsVisible(r(500, 500, 10, 10), 400, 400)).toBe(false);
  });
});

describe('rectFullyInsideViewport', () => {
  it('is true for a centred rect with room to spare', () => {
    expect(rectFullyInsideViewport(r(50, 50, 100, 100), 400, 400)).toBe(true);
  });

  it('respects the margin', () => {
    expect(rectFullyInsideViewport(r(0, 0, 100, 100), 400, 400, 10)).toBe(false);
    expect(rectFullyInsideViewport(r(10, 10, 100, 100), 400, 400, 10)).toBe(true);
  });
});

describe('toRect', () => {
  it('accepts DOMRect-like with left/top', () => {
    expect(toRect({ left: 10, top: 20, width: 30, height: 40 })).toEqual({ x: 10, y: 20, width: 30, height: 40 });
  });

  it('accepts {x,y,width,height}', () => {
    expect(toRect({ x: 10, y: 20, width: 30, height: 40 })).toEqual({ x: 10, y: 20, width: 30, height: 40 });
  });
});

describe('assertion helpers', () => {
  it('assertNoOverlap passes on disjoint rects', () => {
    expect(() => assertNoOverlap(r(0, 0, 10, 10), r(20, 20, 10, 10))).not.toThrow();
  });

  it('assertNoOverlap fails on overlapping rects with descriptive message', () => {
    try {
      assertNoOverlap(r(0, 0, 10, 10), r(5, 5, 10, 10), 'popover', 'spotlight');
      throw new Error('assertion did not throw');
    } catch (e) {
      expect(String((e as Error).message)).toContain('popover');
      expect(String((e as Error).message)).toContain('spotlight');
      expect(String((e as Error).message)).toContain('intersected');
    }
  });

  it('assertOverlap passes on overlapping rects', () => {
    expect(() => assertOverlap(r(0, 0, 10, 10), r(5, 5, 10, 10))).not.toThrow();
  });

  it('assertContains passes when inner fits', () => {
    expect(() => assertContains(r(0, 0, 100, 100), r(10, 10, 20, 20))).not.toThrow();
  });
});
