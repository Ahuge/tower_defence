/**
 * MazePlanner spec — path-scoring helpers used by the Balanced bot.
 *
 * These tests exercise the scoring functions in isolation against
 * fixture grids. Anything that affects the bot's mazing quality
 * (simulateWithWall not leaking state, bestMazeCell rejecting
 * exit-blockers) should grow a test here before shipping a fix.
 */
import { describe, it, expect } from 'vitest';
import { Grid, CellType } from '../Grid';
import { currentPathLength, scoreMazeCells, bestMazeCell, pathCellsWithinRange } from './MazePlanner';
import { Cell } from './BotBrain';

/** Build a blank grid with the given entry/exit — mirrors the helper
 *  used in the Pathfinding tests. */
function openGrid(cols: number, rows: number, entry: Cell, exit: Cell): Grid {
  const g = new Grid(undefined, rows, cols);
  (g as any).entry = entry;
  (g as any).exit = exit;
  g.cells[entry.row][entry.col] = CellType.Entry;
  g.cells[exit.row][exit.col] = CellType.Exit;
  return g;
}

function rectCells(c1: number, r1: number, c2: number, r2: number): Cell[] {
  const out: Cell[] = [];
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      out.push({ col: c, row: r });
    }
  }
  return out;
}

describe('currentPathLength', () => {
  it('returns manhattan-ish length on an empty grid', () => {
    const g = openGrid(10, 5, { col: 0, row: 2 }, { col: 9, row: 2 });
    // Path has 10 cells (0..9) on the direct row.
    expect(currentPathLength(g)).toBe(10);
  });

  it('returns null when no path exists', () => {
    const g = openGrid(5, 3, { col: 0, row: 1 }, { col: 4, row: 1 });
    for (let r = 0; r < 3; r++) g.cells[r][2] = CellType.Blocked;
    expect(currentPathLength(g)).toBeNull();
  });
});

describe('scoreMazeCells', () => {
  it('returns positive gain for cells that force a detour', () => {
    const g = openGrid(10, 5, { col: 0, row: 2 }, { col: 9, row: 2 });
    // Direct-path cell at (5,2) forces a 2-cell detour when blocked.
    const scores = scoreMazeCells(g, [{ col: 5, row: 2 }]);
    expect(scores.length).toBe(1);
    expect(scores[0].gain).toBeGreaterThan(0);
  });

  it('returns 0 gain for off-path cells', () => {
    const g = openGrid(10, 5, { col: 0, row: 2 }, { col: 9, row: 2 });
    // (5,0) is nowhere near the direct path — blocking it has no effect.
    const scores = scoreMazeCells(g, [{ col: 5, row: 0 }]);
    expect(scores[0].gain).toBe(0);
  });

  it('filters out cells that would block the exit entirely', () => {
    const g = openGrid(5, 3, { col: 0, row: 1 }, { col: 4, row: 1 });
    // Column 2, rows 0 and 2 are already ok; blocking the whole column
    // would break the map. Force that by pre-blocking two cells and
    // scoring the third.
    g.cells[0][2] = CellType.Blocked;
    g.cells[2][2] = CellType.Blocked;
    const scores = scoreMazeCells(g, [{ col: 2, row: 1 }]);
    expect(scores.length).toBe(0); // rejected — would break pathing
  });

  it('sorts results best-first', () => {
    const g = openGrid(10, 5, { col: 0, row: 2 }, { col: 9, row: 2 });
    const scores = scoreMazeCells(g, [
      { col: 5, row: 0 }, // off-path, gain 0
      { col: 5, row: 2 }, // on-path, gain > 0
    ]);
    expect(scores[0].gain).toBeGreaterThanOrEqual(scores[1].gain);
  });

  it('restores grid state after simulation (no leak)', () => {
    const g = openGrid(10, 5, { col: 0, row: 2 }, { col: 9, row: 2 });
    const before = g.cells.map(r => [...r]);
    scoreMazeCells(g, [{ col: 5, row: 2 }, { col: 5, row: 0 }]);
    // Every cell should be identical after the call — no residual
    // Blocked values from the simulation pass.
    for (let r = 0; r < g.rows; r++) {
      for (let c = 0; c < g.cols; c++) {
        expect(g.cells[r][c]).toBe(before[r][c]);
      }
    }
  });

  it('caps the candidate pool at maxCandidates', () => {
    const g = openGrid(10, 10, { col: 0, row: 5 }, { col: 9, row: 5 });
    // 100 cells, cap at 5 — should score at most 5 (some may be
    // filtered if they break pathing).
    const scores = scoreMazeCells(g, rectCells(0, 0, 9, 9), 5);
    expect(scores.length).toBeLessThanOrEqual(5);
  });
});

describe('bestMazeCell', () => {
  it('returns the cell with max gain', () => {
    const g = openGrid(10, 5, { col: 0, row: 2 }, { col: 9, row: 2 });
    const best = bestMazeCell(g, [
      { col: 5, row: 0 }, // gain 0
      { col: 5, row: 2 }, // gain > 0 (forces detour)
    ]);
    expect(best).not.toBeNull();
    expect(best!.col).toBe(5);
    expect(best!.row).toBe(2);
  });

  it('returns null when no cell offers positive gain', () => {
    const g = openGrid(10, 5, { col: 0, row: 2 }, { col: 9, row: 2 });
    // All candidates are far from the path — zero-gain, should bail.
    expect(bestMazeCell(g, [
      { col: 5, row: 0 },
      { col: 6, row: 0 },
    ])).toBeNull();
  });

  it('returns null on an empty candidate list', () => {
    const g = openGrid(5, 3, { col: 0, row: 1 }, { col: 4, row: 1 });
    expect(bestMazeCell(g, [])).toBeNull();
  });
});

describe('pathCellsWithinRange', () => {
  it('counts path cells within squared distance', () => {
    const path = [
      { col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 }, { col: 3, row: 0 },
    ];
    // Tower at (1,1) with range 1 in tile units: reaches (0,0)?
    // (1,0) and (1,1) is range 1; (0,1)→(1,1) is range 1.
    // (1,1)→(0,0): dist² = 1+1 = 2. range² = 1. Not in range.
    // (1,1)→(1,0): dist² = 1. In range.
    // (1,1)→(2,0): dist² = 2. Out.
    expect(pathCellsWithinRange({ col: 1, row: 1 }, path, 1)).toBe(1);
  });

  it('counts all cells when range is large', () => {
    const path = [
      { col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 },
    ];
    expect(pathCellsWithinRange({ col: 1, row: 1 }, path, 100)).toBe(3);
  });

  it('returns 0 when path is empty', () => {
    expect(pathCellsWithinRange({ col: 0, row: 0 }, [], 10)).toBe(0);
  });
});
