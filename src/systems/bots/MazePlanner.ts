/**
 * MazePlanner — scores candidate cells for how much they contribute
 * to a longer creep path ("mazing").
 *
 * The Balanced brain uses this to decide *where* a wall should go:
 * "the cell that forces creeps to detour the most, without blocking
 * the exit entirely".
 *
 * Algorithm (v1 — greedy single-cell scoring):
 *   1. Measure the current creep-path length through the grid.
 *   2. For each candidate cell in the bot's zone, simulate placing
 *      a wall there and re-run pathfinding.
 *   3. Score = (new length − current length). Negative or null
 *      paths (exit blocked) score −∞ and are rejected.
 *
 * Greedy isn't optimal — a globally-optimal maze needs multi-step
 * lookahead — but it's cheap (one A* per candidate, and we cap the
 * candidate count) and it gives a reasonable maze after a few
 * placements. Brains can call this as often as every placement.
 *
 * Tradeoffs considered:
 *   - Simulating N cells × one A* = O(N × grid). With cell caps at
 *     ~30 candidates per call and A* on a 36×26 grid, this is well
 *     under a millisecond per call. Acceptable at a 4-second cadence.
 *   - We only rewind the grid; tower objects don't need to be
 *     created/destroyed during simulation. See `simulateWithWall`.
 */
import { Grid, CellType } from '../Grid';
import { findPath, PathPoint } from '../Pathfinding';
import { Cell } from './BotBrain';

export interface MazeScore {
  col: number;
  row: number;
  /** Path-length gain (cells) if a wall is placed here. Higher is
   *  better. Zero means "no effect on pathing". */
  gain: number;
}

/** Measure the current shortest path from the map's entry to exit.
 *  Returns the number of cells in the path, or null if unreachable
 *  (which would be a broken map state). */
export function currentPathLength(grid: Grid): number | null {
  const path = findPath(grid);
  return path ? path.length : null;
}

/** Measure path length after temporarily setting `(col, row)` to a
 *  blocked cell. Restores the original cell value before returning.
 *  Returns null if the placement breaks pathing (exit unreachable). */
function simulateWithWall(grid: Grid, col: number, row: number): number | null {
  const original = grid.cells[row][col];
  grid.cells[row][col] = CellType.Blocked;
  try {
    const path = findPath(grid);
    return path ? path.length : null;
  } finally {
    grid.cells[row][col] = original;
  }
}

/**
 * Score every candidate cell by the path-length gain it would
 * produce. Cells that block the exit get filtered out. Results are
 * sorted best-first.
 *
 * `maxCandidates` caps how many cells we test — useful when a bot's
 * zone is large and we can't afford to simulate every empty cell.
 * Default 30 is well inside the per-frame budget at 4s cadence.
 */
export function scoreMazeCells(grid: Grid, candidates: Cell[], maxCandidates: number = 30): MazeScore[] {
  const baseline = currentPathLength(grid);
  if (baseline == null) return [];

  // If there are more candidates than the cap, sample randomly —
  // keeps per-call work bounded while still exploring the zone
  // evenly over many calls.
  const pool = candidates.length > maxCandidates
    ? sampleRandom(candidates, maxCandidates)
    : candidates;

  const scores: MazeScore[] = [];
  for (const c of pool) {
    const newLen = simulateWithWall(grid, c.col, c.row);
    if (newLen == null) continue; // would break the map — skip
    scores.push({ col: c.col, row: c.row, gain: newLen - baseline });
  }
  scores.sort((a, b) => b.gain - a.gain);
  return scores;
}

/** Return the cell that would most extend the creep path, or null
 *  if no placement would help (or if the zone is saturated). */
export function bestMazeCell(grid: Grid, candidates: Cell[], maxCandidates: number = 30): MazeScore | null {
  const scores = scoreMazeCells(grid, candidates, maxCandidates);
  if (scores.length === 0) return null;
  if (scores[0].gain <= 0) return null; // a neutral wall isn't worth it
  return scores[0];
}

/** Count cells in the bot's zone that lie within `range` pixels of
 *  any cell in `path`. Used by the scorer to rate DPS placements:
 *  more path-adjacent cells covered = more time the tower fires.
 *
 *  `range` is in *pixels* to match TowerType.range semantics × tile.
 *  We compute in tile units here and scale the caller's tower range
 *  up by TILE_SIZE. Returned value is the number of unique path
 *  cells within reach. */
export function pathCellsWithinRange(cell: Cell, path: PathPoint[], rangeCells: number): number {
  let count = 0;
  const r2 = rangeCells * rangeCells;
  for (const p of path) {
    const dc = p.col - cell.col;
    const dr = p.row - cell.row;
    if (dc * dc + dr * dr <= r2) count++;
  }
  return count;
}

function sampleRandom<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr.slice();
  // Fisher-Yates partial shuffle — O(n) and unbiased.
  const copy = arr.slice();
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(Math.random() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}
