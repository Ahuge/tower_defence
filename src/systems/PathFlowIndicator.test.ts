/**
 * Spec for the samplePath helper — PathFlowIndicator's core sampling
 * math separated from the Phaser.Graphics rendering so we can test it
 * directly. The indicator's visual output is hard to assert in jsdom
 * (no WebGL); the sample array is the thing that matters for spacing
 * and traveling-wave math correctness.
 */
import { describe, it, expect } from 'vitest';
import { samplePath } from './PathFlowIndicator';
import { TILE_SIZE, gridX, gridY } from '../config';
import type { PathPoint } from './Pathfinding';

/** Helper: produce a horizontal straight path of N cells starting at
 *  (0, 13). */
function straightHorizontal(cells: number, row = 13): PathPoint[] {
  return Array.from({ length: cells }, (_, i) => ({ col: i, row }));
}

describe('samplePath', () => {
  it('returns an empty array for paths shorter than 2 points', () => {
    expect(samplePath([], 14)).toEqual([]);
    expect(samplePath([{ col: 0, row: 0 }], 14)).toEqual([]);
  });

  it('starts the first sample at the path origin', () => {
    const samples = samplePath(straightHorizontal(10), 14);
    expect(samples.length).toBeGreaterThan(0);
    expect(samples[0].x).toBe(gridX(0));
    expect(samples[0].y).toBe(gridY(13));
    expect(samples[0].dist).toBe(0);
  });

  it('spaces samples evenly at `spacing` pixels along a straight path', () => {
    const path = straightHorizontal(10); // 10 cells = 9 segments × TILE_SIZE
    const spacing = 14;
    const samples = samplePath(path, spacing);
    for (let i = 1; i < samples.length; i++) {
      // Dist should increase by exactly `spacing` for each new sample.
      expect(samples[i].dist - samples[i - 1].dist).toBeCloseTo(spacing, 6);
    }
  });

  it('accumulates dist across segments (no reset at corners)', () => {
    // L-shaped path: 5 cells right, then 3 down.
    const path: PathPoint[] = [
      { col: 0, row: 13 }, { col: 1, row: 13 }, { col: 2, row: 13 },
      { col: 3, row: 13 }, { col: 4, row: 13 }, { col: 4, row: 14 },
      { col: 4, row: 15 }, { col: 4, row: 16 },
    ];
    const samples = samplePath(path, TILE_SIZE);
    // Every sample's dist must be strictly greater than the previous one.
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i].dist).toBeGreaterThan(samples[i - 1].dist);
    }
    // Last sample's dist should be close to total path length (9 cells × TILE).
    const totalLen = 7 * TILE_SIZE;
    expect(samples[samples.length - 1].dist).toBeLessThanOrEqual(totalLen);
  });

  it('carries the spacing remainder across segment boundaries', () => {
    // Two 14px segments joined end-to-end with spacing=10 — the carry
    // from segment 1 should offset segment 2's first sample, not reset.
    const path: PathPoint[] = [
      { col: 0, row: 0 }, { col: 1, row: 0 }, // 28px segment
      { col: 1, row: 1 },                      // 28px segment (total 56)
    ];
    const spacing = 10;
    const samples = samplePath(path, spacing);
    // Deltas should all be exactly `spacing`, including at the corner.
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i].dist - samples[i - 1].dist).toBeCloseTo(spacing, 6);
    }
  });

  it('ignores zero-length segments (duplicate adjacent path points)', () => {
    const path: PathPoint[] = [
      { col: 0, row: 13 }, { col: 0, row: 13 }, // dup → segLen 0 → skip
      { col: 1, row: 13 }, { col: 2, row: 13 },
    ];
    const samples = samplePath(path, TILE_SIZE);
    // Should still produce samples from the non-zero segments, without
    // throwing or producing NaN.
    expect(samples.length).toBeGreaterThan(0);
    for (const s of samples) {
      expect(Number.isFinite(s.x)).toBe(true);
      expect(Number.isFinite(s.y)).toBe(true);
      expect(Number.isFinite(s.dist)).toBe(true);
    }
  });

  it('produces a predictable sample count for a known path length', () => {
    // 10 cells horizontal = 9 segments × 28 = 252 px total.
    // Spacing 14 → samples at 0, 14, 28, ..., 252 → 19 samples.
    const samples = samplePath(straightHorizontal(10), 14);
    expect(samples.length).toBe(19);
  });

  it('all sample (x,y) lie on the path polyline', () => {
    const path = straightHorizontal(8);
    const samples = samplePath(path, 12);
    const rowY = gridY(13);
    for (const s of samples) {
      expect(s.y).toBe(rowY); // horizontal path at constant row
    }
  });
});
