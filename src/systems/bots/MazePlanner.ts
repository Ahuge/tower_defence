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
import { rng } from '../Rng';

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

/** Sum of cell-counts across all non-null paths. Used as the
 *  baseline when scoring maze placements on multi-spawner maps —
 *  a wall that lengthens player 2's path still counts even if
 *  player 0's path is unaffected. */
export function totalPathLength(paths: (PathPoint[] | null)[]): number {
  let total = 0;
  for (const p of paths) if (p) total += p.length;
  return total;
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
 * Sum path lengths across every spawner path after temporarily
 * blocking `(col, row)`. Returns null if blocking the cell breaks
 * any existing path. Used for multi-spawner maps (Circle Co-op)
 * so a bot's wall gets credit for slowing creeps from any spawner
 * whose path it forces through a detour.
 */
function simulateWallAllPaths(grid: Grid, col: number, row: number, paths: (PathPoint[] | null)[]): number | null {
  // Import lazily to avoid circular deps on the callsite.
  // We reuse the game's path logic: re-run the same pathing used
  // to produce each input path. For waypoint-chained maps the
  // inputs carry enough structure (entry/exit tuples), but we
  // don't have the spawners here — caller must pass valid paths.
  const original = grid.cells[row][col];
  grid.cells[row][col] = CellType.Blocked;
  try {
    let total = 0;
    for (const p of paths) {
      if (!p || p.length === 0) continue;
      const start = p[0];
      const end = p[p.length - 1];
      const newP = findPath(grid, start, end);
      if (!newP) return null; // would strand a spawner — reject
      total += newP.length;
    }
    return total;
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
export function scoreMazeCells(grid: Grid, candidates: Cell[], maxCandidates: number = 30, allPaths?: (PathPoint[] | null)[]): MazeScore[] {
  // Multi-path scoring path: sum lengths across every spawner's
  // path. Use this when `allPaths` is supplied (Circle Co-op or
  // any multi-spawner map). Fallback to single-path grid-default
  // behaviour when absent — matches the pre-multipath signature.
  if (allPaths && allPaths.length > 0) {
    const baseline = totalPathLength(allPaths);
    if (baseline === 0) return [];
    const pool = candidates.length > maxCandidates ? sampleRandom(candidates, maxCandidates) : candidates;
    const scores: MazeScore[] = [];
    for (const c of pool) {
      const newTotal = simulateWallAllPaths(grid, c.col, c.row, allPaths);
      if (newTotal == null) continue;
      scores.push({ col: c.col, row: c.row, gain: newTotal - baseline });
    }
    scores.sort((a, b) => b.gain - a.gain);
    return scores;
  }

  // Single-path fallback.
  const baseline = currentPathLength(grid);
  if (baseline == null) return [];

  const pool = candidates.length > maxCandidates
    ? sampleRandom(candidates, maxCandidates)
    : candidates;

  const scores: MazeScore[] = [];
  for (const c of pool) {
    const newLen = simulateWithWall(grid, c.col, c.row);
    if (newLen == null) continue;
    scores.push({ col: c.col, row: c.row, gain: newLen - baseline });
  }
  scores.sort((a, b) => b.gain - a.gain);
  return scores;
}

/** Return the cell that would most extend the creep path, or null
 *  if no placement would help (or if the zone is saturated). */
export function bestMazeCell(grid: Grid, candidates: Cell[], maxCandidates: number = 30, allPaths?: (PathPoint[] | null)[]): MazeScore | null {
  const scores = scoreMazeCells(grid, candidates, maxCandidates, allPaths);
  if (scores.length === 0) return null;
  if (scores[0].gain <= 0) return null;
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
    const j = i + Math.floor(rng() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}
