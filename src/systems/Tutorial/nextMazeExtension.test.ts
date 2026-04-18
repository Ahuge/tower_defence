/**
 * Spec for the dynamic maze-extension hint (nextMazeExtensionTarget).
 *
 * The helper is module-internal, so we exercise it through the
 * tutorial match's place_third step (whose target *is* the helper's
 * output) and control its inputs by mocking getCurrentTutorialPath.
 *
 * Why this matters: if the bulge-detection gets it wrong, the hint
 * points at cells creeps never walk through, and the player's
 * additional towers do nothing. A silent correctness bug.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TILE_SIZE, gridX, gridY, GRID_ROWS, GRID_COLS, getGridOffsetX } from '../../config';
import type { PathPoint } from '../Pathfinding';

// Hoisted mock so getTrack can still run normally; we only override the
// path source used by nextMazeExtensionTarget's compute.
const mocks = vi.hoisted(() => ({
  currentPath: null as PathPoint[] | null,
}));

vi.mock('./TutorialTargets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./TutorialTargets')>();
  return {
    ...actual,
    getCurrentTutorialPath: () => mocks.currentPath,
  };
});

// Import AFTER the mock so the module picks up our stubbed path source.
import { getTrack } from './TutorialTracks';

const DEFAULT_ROW = Math.floor(GRID_ROWS / 2);
const GRID_RECT_PAD = 4; // keep in sync with gridCellWorldRect

function place(col: number, row: number): PathPoint {
  return { col, row };
}

function straightPath(cols: number): PathPoint[] {
  return Array.from({ length: cols }, (_, i) => place(i, DEFAULT_ROW));
}

/** Compute the helper by reaching into the tutorial match's place_second
 *  step (whose target IS the helper's output — place_second, place_frost,
 *  and place_fourth all use nextMazeExtensionTarget). */
function computeHint(): { x: number; y: number; width: number; height: number } | null {
  const match = getTrack('tutorial_match')!;
  const step = match.steps.find(s => s.id === 'place_second')!;
  expect(step.target.kind).toBe('canvas-dynamic');
  if (step.target.kind !== 'canvas-dynamic') throw new Error('unexpected target kind');
  return step.target.compute();
}

/** Convert a world-rect back to the grid row it's centred on, for easier
 *  assertions. Accepts the GRID_RECT_PAD added by gridCellWorldRect. */
function rectCenterRow(rect: { y: number; height: number }): number {
  const centreY = rect.y + rect.height / 2;
  return Math.round((centreY - TILE_SIZE / 2) / TILE_SIZE);
}

function rectLeftCol(rect: { x: number }): number {
  // rect.x = gridX(col) - TILE_SIZE/2 - pad
  //        = col*TILE_SIZE + TILE_SIZE/2 + offset - TILE_SIZE/2 - pad
  //        = col*TILE_SIZE + offset - pad
  // So col = (rect.x - offset + pad) / TILE_SIZE.
  return Math.round((rect.x - getGridOffsetX() + GRID_RECT_PAD) / TILE_SIZE);
}

function rectColSpan(rect: { width: number }): number {
  // width = TILE_SIZE * colSpan + pad * 2 → solve for colSpan
  return Math.round((rect.width - GRID_RECT_PAD * 2) / TILE_SIZE);
}

describe('nextMazeExtensionTarget', () => {
  beforeEach(() => {
    mocks.currentPath = null;
  });

  it('returns the fallback rect when no path is available', () => {
    mocks.currentPath = null;
    const rect = computeHint();
    expect(rect).not.toBeNull();
    // Fallback = row (DEFAULT_ROW - 2), starting at col 9, span 7.
    expect(rectCenterRow(rect!)).toBe(DEFAULT_ROW - 2);
    expect(rectLeftCol(rect!)).toBe(9);
    expect(rectColSpan(rect!)).toBe(7);
  });

  it('returns the fallback when the path is empty', () => {
    mocks.currentPath = [];
    const rect = computeHint();
    expect(rect).not.toBeNull();
    expect(rectCenterRow(rect!)).toBe(DEFAULT_ROW - 2);
  });

  it('returns the fallback for a straight path with no deviation', () => {
    mocks.currentPath = straightPath(36);
    const rect = computeHint();
    expect(rect).not.toBeNull();
    expect(rectCenterRow(rect!)).toBe(DEFAULT_ROW - 2);
  });

  it('points above when the path bulges above (one row up)', () => {
    // Path: enters straight, detours up to row 12 around cols 11-13, rejoins.
    mocks.currentPath = [
      ...Array.from({ length: 11 }, (_, i) => place(i, DEFAULT_ROW)),
      place(11, DEFAULT_ROW - 1),
      place(12, DEFAULT_ROW - 1),
      place(13, DEFAULT_ROW - 1),
      ...Array.from({ length: 22 }, (_, i) => place(14 + i, DEFAULT_ROW)),
    ];
    const rect = computeHint()!;
    // One row past the bulge's extreme (DEFAULT_ROW - 1 - 1 = DEFAULT_ROW - 2).
    expect(rectCenterRow(rect)).toBe(DEFAULT_ROW - 2);
    // Cols cover the bulge span 11-13 with +/- 1 padding.
    expect(rectLeftCol(rect)).toBe(10);
    expect(rectColSpan(rect)).toBe(5);
  });

  it('points below when the path bulges below', () => {
    // Mirror case — detour downward to row 14 around cols 11-13.
    mocks.currentPath = [
      ...Array.from({ length: 11 }, (_, i) => place(i, DEFAULT_ROW)),
      place(11, DEFAULT_ROW + 1),
      place(12, DEFAULT_ROW + 1),
      place(13, DEFAULT_ROW + 1),
      ...Array.from({ length: 22 }, (_, i) => place(14 + i, DEFAULT_ROW)),
    ];
    const rect = computeHint()!;
    expect(rectCenterRow(rect)).toBe(DEFAULT_ROW + 2);
    expect(rectLeftCol(rect)).toBe(10);
    expect(rectColSpan(rect)).toBe(5);
  });

  it('prefers the side with the larger bulge when both deviate', () => {
    // Path deviates up by 2 rows but down by only 1 — should pick up.
    mocks.currentPath = [
      ...Array.from({ length: 5 }, (_, i) => place(i, DEFAULT_ROW)),
      place(5, DEFAULT_ROW - 1),
      place(6, DEFAULT_ROW - 2),
      place(7, DEFAULT_ROW - 1),
      ...Array.from({ length: 12 }, (_, i) => place(8 + i, DEFAULT_ROW)),
      place(20, DEFAULT_ROW + 1),
      ...Array.from({ length: 15 }, (_, i) => place(21 + i, DEFAULT_ROW)),
    ];
    const rect = computeHint()!;
    // Biggest deviation is above (row -2 from default). One past that is -3.
    expect(rectCenterRow(rect)).toBe(DEFAULT_ROW - 3);
  });

  it('breaks ties in favour of "go up"', () => {
    // Symmetric deviation — both sides reach 1 row from default. Tie → up.
    mocks.currentPath = [
      place(0, DEFAULT_ROW),
      place(1, DEFAULT_ROW - 1),
      place(2, DEFAULT_ROW),
      place(3, DEFAULT_ROW + 1),
      place(4, DEFAULT_ROW),
    ];
    const rect = computeHint()!;
    expect(rectCenterRow(rect)).toBe(DEFAULT_ROW - 2);
  });

  it('clamps the target row to the grid bounds', () => {
    // Force a bulge that reaches row 0 — one past that would be -1.
    mocks.currentPath = [
      place(0, DEFAULT_ROW),
      ...Array.from({ length: 5 }, (_, i) => place(1 + i, 0)),
      place(6, DEFAULT_ROW),
    ];
    const rect = computeHint()!;
    // Should clamp to row 0, not go negative.
    expect(rectCenterRow(rect)).toBe(0);
  });

  it('clamps the target row to GRID_ROWS - 1 at the bottom', () => {
    mocks.currentPath = [
      place(0, DEFAULT_ROW),
      ...Array.from({ length: 5 }, (_, i) => place(1 + i, GRID_ROWS - 1)),
      place(6, DEFAULT_ROW),
    ];
    const rect = computeHint()!;
    expect(rectCenterRow(rect)).toBe(GRID_ROWS - 1);
  });

  it('clamps the col range to valid grid bounds', () => {
    // Bulge that reaches col 0 — -1 padding would otherwise go negative.
    mocks.currentPath = [
      place(0, DEFAULT_ROW - 1),
      place(1, DEFAULT_ROW - 1),
      ...Array.from({ length: 34 }, (_, i) => place(2 + i, DEFAULT_ROW)),
    ];
    const rect = computeHint()!;
    expect(rectLeftCol(rect)).toBe(0);
    // Right edge of col range shouldn't exceed GRID_COLS - 1. We know
    // bulge cols 0-1, +1 pad on each side → 0..2 → 3 wide (minCol clamped
    // to 0 so only right side gets the +1).
    expect(rectColSpan(rect)).toBeLessThanOrEqual(GRID_COLS);
  });
});

describe('gridCellWorldRect math', () => {
  it('rect x matches gridX(col) - TILE_SIZE/2 - pad', () => {
    // Exercise through the static place_first step (col 10, row 13, span 5).
    const match = getTrack('tutorial_match')!;
    const step = match.steps.find(s => s.id === 'place_first')!;
    expect(step.target.kind).toBe('canvas');
    if (step.target.kind !== 'canvas') throw new Error('unexpected');
    const expectedX = gridX(10) - TILE_SIZE / 2 - GRID_RECT_PAD;
    const expectedY = gridY(13) - TILE_SIZE / 2 - GRID_RECT_PAD;
    expect(step.target.x).toBe(expectedX);
    expect(step.target.y).toBe(expectedY);
    expect(step.target.width).toBe(TILE_SIZE * 5 + GRID_RECT_PAD * 2);
    expect(step.target.height).toBe(TILE_SIZE + GRID_RECT_PAD * 2);
  });
});
