/**
 * Pathfinding spec — A* on the grid.
 *
 * Pathfinding underpins every mazing decision in the game. Its
 * contract is narrow (findPath(grid, start?, end?) -> PathPoint[] | null),
 * which makes it a great candidate for exhaustive unit testing.
 */
import { describe, it, expect } from 'vitest';
import { findPath, findPathWithWaypoints, PathPoint } from './Pathfinding';
import { Grid, CellType } from './Grid';

/** Build a Grid filled entirely with Empty cells, plus the given entry
 *  and exit. Used as the base for scenarios where we then manually
 *  paint blocked cells. */
function openGrid(cols: number, rows: number, entry: PathPoint, exit: PathPoint): Grid {
  const g = new Grid(undefined, rows, cols);
  // overwrite the default entry/exit chosen by Grid's no-mapDef branch
  (g as any).entry = entry;
  (g as any).exit = exit;
  g.cells[entry.row][entry.col] = CellType.Entry;
  g.cells[exit.row][exit.col] = CellType.Exit;
  return g;
}

/** Paint a rectangle of Blocked cells into the grid. */
function paintBlocked(grid: Grid, c1: number, r1: number, c2: number, r2: number) {
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      if (r >= 0 && r < grid.rows && c >= 0 && c < grid.cols) {
        grid.cells[r][c] = CellType.Blocked;
      }
    }
  }
}

function pathLength(path: PathPoint[]): number {
  return path.length - 1; // number of edges (moves)
}

function manhattan(a: PathPoint, b: PathPoint): number {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

describe('findPath', () => {
  it('returns a straight-line path when the grid is empty', () => {
    const g = openGrid(10, 5, { col: 0, row: 2 }, { col: 9, row: 2 });
    const path = findPath(g);
    expect(path).not.toBeNull();
    expect(path![0]).toEqual({ col: 0, row: 2 });
    expect(path![path!.length - 1]).toEqual({ col: 9, row: 2 });
    // Optimal length on an empty grid equals the Manhattan distance.
    expect(pathLength(path!)).toBe(manhattan({ col: 0, row: 2 }, { col: 9, row: 2 }));
  });

  it('returns null when no path exists', () => {
    const g = openGrid(5, 3, { col: 0, row: 1 }, { col: 4, row: 1 });
    // Wall the entire column 2 off.
    paintBlocked(g, 2, 0, 2, 2);
    expect(findPath(g)).toBeNull();
  });

  it('routes around a partial wall', () => {
    const g = openGrid(10, 5, { col: 0, row: 2 }, { col: 9, row: 2 });
    // Block the direct path at (5, 2) — pathfinder must detour.
    paintBlocked(g, 5, 2, 5, 2);
    const path = findPath(g);
    expect(path).not.toBeNull();
    expect(pathLength(path!)).toBeGreaterThan(manhattan({ col: 0, row: 2 }, { col: 9, row: 2 }));
    // No step lands on the blocked cell.
    expect(path!.some(p => p.col === 5 && p.row === 2)).toBe(false);
  });

  it('every step is 4-directional (no diagonals)', () => {
    const g = openGrid(10, 5, { col: 0, row: 0 }, { col: 9, row: 4 });
    const path = findPath(g)!;
    for (let i = 1; i < path.length; i++) {
      const dc = Math.abs(path[i].col - path[i - 1].col);
      const dr = Math.abs(path[i].row - path[i - 1].row);
      expect(dc + dr, `step ${i} was not 4-directional`).toBe(1);
    }
  });

  it('accepts explicit start and end overrides', () => {
    const g = openGrid(10, 5, { col: 0, row: 0 }, { col: 9, row: 4 });
    const path = findPath(g, { col: 3, row: 1 }, { col: 7, row: 3 });
    expect(path![0]).toEqual({ col: 3, row: 1 });
    expect(path![path!.length - 1]).toEqual({ col: 7, row: 3 });
  });

  it('treats Tower cells as non-walkable', () => {
    const g = openGrid(10, 5, { col: 0, row: 2 }, { col: 9, row: 2 });
    // Block the direct row with a Tower (not Blocked) — same contract.
    g.cells[2][5] = CellType.Tower;
    const path = findPath(g);
    expect(path).not.toBeNull();
    expect(path!.some(p => p.col === 5 && p.row === 2)).toBe(false);
  });

  it('treats NoBuild cells as walkable', () => {
    const g = openGrid(10, 5, { col: 0, row: 2 }, { col: 9, row: 2 });
    g.cells[2][5] = CellType.NoBuild;
    const path = findPath(g)!;
    // Direct path through row 2 should still be taken — length equals Manhattan.
    expect(pathLength(path)).toBe(manhattan({ col: 0, row: 2 }, { col: 9, row: 2 }));
    expect(path.some(p => p.col === 5 && p.row === 2)).toBe(true);
  });

  it('returns a single-point path when start equals end', () => {
    const g = openGrid(10, 5, { col: 4, row: 2 }, { col: 4, row: 2 });
    const path = findPath(g);
    expect(path).toEqual([{ col: 4, row: 2 }]);
  });

  it('produces the optimal-length path (A* admissible heuristic)', () => {
    // S-curve wall forces a specific minimal detour. The Manhattan-
    // heuristic A* is admissible so it always returns an optimal path
    // on unweighted 4-dir grids.
    const g = openGrid(7, 5, { col: 0, row: 2 }, { col: 6, row: 2 });
    //   0 1 2 3 4 5 6
    // 0 . . . . . . .
    // 1 . . # # # . .
    // 2 S . . . . . E
    // 3 . . # # # . .
    // 4 . . . . . . .
    paintBlocked(g, 2, 1, 4, 1);
    paintBlocked(g, 2, 3, 4, 3);
    const path = findPath(g)!;
    // Optimal is straight across row 2 — 6 steps.
    expect(pathLength(path)).toBe(6);
  });

  it('handles a start cell that is blocked by walking off it once', () => {
    // Real maps can't have a blocked entry, but the algorithm should at
    // least not crash if the start is surrounded by non-walkable terrain.
    const g = openGrid(3, 3, { col: 0, row: 0 }, { col: 2, row: 2 });
    paintBlocked(g, 1, 0, 1, 0); // walls to the right
    paintBlocked(g, 0, 1, 0, 1); // walls below
    // Start has no walkable neighbours — should return null without looping.
    const path = findPath(g);
    expect(path).toBeNull();
  });
});

describe('findPathWithWaypoints', () => {
  it('stitches segments through ordered waypoints', () => {
    const g = openGrid(10, 5, { col: 0, row: 2 }, { col: 9, row: 2 });
    const path = findPathWithWaypoints(
      g,
      { col: 0, row: 2 },
      [{ col: 5, row: 0 }],
      { col: 9, row: 2 },
    );
    expect(path).not.toBeNull();
    const cells = path!.map(p => `${p.col},${p.row}`);
    expect(cells[0]).toBe('0,2');
    expect(cells[cells.length - 1]).toBe('9,2');
    expect(cells).toContain('5,0'); // waypoint visited
  });

  it('de-duplicates the joining cell between segments', () => {
    const g = openGrid(5, 5, { col: 0, row: 0 }, { col: 4, row: 4 });
    const path = findPathWithWaypoints(
      g,
      { col: 0, row: 0 },
      [{ col: 2, row: 2 }],
      { col: 4, row: 4 },
    );
    expect(path).not.toBeNull();
    // '2,2' should appear exactly once even though it's the end of
    // segment 1 AND the start of segment 2.
    const count = path!.filter(p => p.col === 2 && p.row === 2).length;
    expect(count).toBe(1);
  });

  it('returns null if any segment is unreachable', () => {
    const g = openGrid(6, 6, { col: 0, row: 0 }, { col: 5, row: 5 });
    // Wall off the centre column — start can't reach a waypoint on
    // the other side.
    paintBlocked(g, 3, 0, 3, 5);
    const path = findPathWithWaypoints(
      g,
      { col: 0, row: 0 },
      [{ col: 5, row: 0 }],
      { col: 0, row: 5 },
    );
    expect(path).toBeNull();
  });

  it('handles empty waypoint list — equivalent to findPath(start, end)', () => {
    const g = openGrid(5, 5, { col: 0, row: 0 }, { col: 4, row: 0 });
    const direct = findPath(g, { col: 0, row: 0 }, { col: 4, row: 0 });
    const withEmpty = findPathWithWaypoints(g, { col: 0, row: 0 }, [], { col: 4, row: 0 });
    expect(withEmpty).toEqual(direct);
  });

  it('multiple waypoints in sequence — visits each in order', () => {
    const g = openGrid(10, 10, { col: 0, row: 5 }, { col: 9, row: 5 });
    const path = findPathWithWaypoints(
      g,
      { col: 0, row: 5 },
      [
        { col: 5, row: 0 },
        { col: 9, row: 5 },
        { col: 5, row: 9 },
      ],
      { col: 0, row: 5 },
    );
    expect(path).not.toBeNull();
    const idxOf = (c: number, r: number) => path!.findIndex(p => p.col === c && p.row === r);
    // Each waypoint appears in the path, in order.
    const i1 = idxOf(5, 0);
    const i2 = idxOf(9, 5);
    const i3 = idxOf(5, 9);
    expect(i1).toBeGreaterThan(0);
    expect(i2).toBeGreaterThan(i1);
    expect(i3).toBeGreaterThan(i2);
  });
});
