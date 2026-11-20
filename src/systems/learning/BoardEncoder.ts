/**
 * Spatial board encoding for the learning pipeline.
 *
 * The turn-level Q-model (FeatureExtractor) and the PPO policy
 * (RLBrain.extractState) both flatten the board into a handful of
 * scalars — tower counts, zone occupancy, path coverage percent.
 * That throws away *where* everything is, so a policy can never
 * learn the one thing that matters most in a tower defence: which
 * cell forces a detour, which cell covers the most path, where the
 * existing towers' ranges overlap.
 *
 * This module produces a dense [channels][rows][cols] tensor from a
 * BotContext. It is the state input for a spatial policy (small CNN
 * or a set-encoder over channels) and it is also useful as extra
 * aggregated features for the existing flat models.
 *
 * Keep it PURE and DETERMINISTIC — same context in, same tensor out.
 * No Date.now(), no Math.random(), no mutation of ctx.
 */
import { BotContext } from '../bots/BotBrain';
import { CellType } from '../Grid';
import { TOWER_TYPES } from '../../data/TowerTypes';
import { getTowerRole } from '../../data/TowerRoles';
import { PathPoint } from '../Pathfinding';
import { scoreMazeCells } from '../bots/MazePlanner';

/** One channel per concept. Order is part of the contract — a
 *  trained model pins channel indices, so append, never reorder. */
export const BOARD_CHANNEL_NAMES = [
  'buildable',        // terrain allows a tower here
  'legal_placement',  // also legal right now (ctx.candidateCells)
  'path',             // creep path cells
  'entry',            // spawn points
  'exit',             // goal points
  'blocked',          // unwalkable terrain
  'tower',            // any placed tower
  'tower_wall',       // placed tower with role 'wall'
  'tower_damage',     // role dps-single / dps-splash
  'tower_support',    // role slow / aura / utility
  'range_coverage',   // cells covered by at least one placed tower
  'dist_to_path',     // BFS distance to nearest path cell, normalized
] as const;
export type BoardChannelName = (typeof BOARD_CHANNEL_NAMES)[number];
export const BOARD_CHANNELS = BOARD_CHANNEL_NAMES.length;

export interface EncodedBoard {
  cols: number;
  rows: number;
  channels: number;
  /** Flattened channel-major tensor: data[c * rows * cols + row * cols + col]. */
  data: Float32Array;
}

const cellIdx = (col: number, row: number, cols: number): number => row * cols + col;

export function encodeBoard(ctx: BotContext): EncodedBoard {
  const grid = ctx.grid;
  const rows = grid.rows;
  const cols = grid.cols;
  const n = rows * cols;
  const data = new Float32Array(BOARD_CHANNELS * n);
  const at = (c: number, col: number, row: number): number => c * n + cellIdx(col, row, cols);

  // ── Terrain ────────────────────────────────────────────────────
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (grid.canPlaceTower(col, row)) data[at(0, col, row)] = 1;
      if (!grid.isWalkable(col, row)) data[at(5, col, row)] = 1;
      const cell = grid.cells[row][col];
      if (cell === CellType.Entry) data[at(3, col, row)] = 1;
      if (cell === CellType.Exit) data[at(4, col, row)] = 1;
    }
  }
  for (const e of grid.entries ?? []) {
    if (e.row >= 0 && e.row < rows && e.col >= 0 && e.col < cols) data[at(3, e.col, e.row)] = 1;
  }
  for (const e of grid.exits ?? []) {
    if (e.row >= 0 && e.row < rows && e.col >= 0 && e.col < cols) data[at(4, e.col, e.row)] = 1;
  }

  // ── Legal now ─────────────────────────────────────────────────
  for (const cell of ctx.candidateCells) {
    if (cell.row >= 0 && cell.row < rows && cell.col >= 0 && cell.col < cols) {
      data[at(1, cell.col, cell.row)] = 1;
    }
  }

  // ── Path ──────────────────────────────────────────────────────
  const paths = (ctx.allPaths ?? []).filter((p): p is PathPoint[] => !!p && p.length > 0);
  for (const p of paths) {
    for (const pt of p) {
      if (pt.row >= 0 && pt.row < rows && pt.col >= 0 && pt.col < cols) {
        data[at(2, pt.col, pt.row)] = 1;
      }
    }
  }

  // ── Towers ────────────────────────────────────────────────────
  for (const placed of ctx.placedTowers) {
    const { col, row } = placed;
    if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
    const t = TOWER_TYPES[placed.towerId];
    data[at(6, col, row)] = 1;
    if (!t) continue;
    const role = getTowerRole(t);
    if (role === 'wall') data[at(7, col, row)] = 1;
    else if (role === 'dps-single' || role === 'dps-splash') data[at(8, col, row)] = 1;
    else data[at(9, col, row)] = 1;

    // Range coverage — tile units, Euclidean, same convention as
    // MazePlanner.pathCellsWithinRange.
    if (t.range > 0) {
      const r2 = t.range * t.range;
      for (let rr = Math.max(0, row - t.range); rr <= Math.min(rows - 1, row + t.range); rr++) {
        for (let cc = Math.max(0, col - t.range); cc <= Math.min(cols - 1, col + t.range); cc++) {
          const dx = cc - col, dy = rr - row;
          if (dx * dx + dy * dy <= r2) data[at(10, cc, rr)] = 1;
        }
      }
    }
  }

  // ── Distance to path (multi-source BFS, 4-neighbour) ─────────
  // Ignores walls on purpose: this is a geometric signal ("how far
  // from the lane"), not a reachability signal — blocked cells are
  // already a separate channel.
  const dist = new Int32Array(n).fill(-1);
  const queue: number[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (data[at(2, col, row)] > 0 || data[at(3, col, row)] > 0) {
        dist[cellIdx(col, row, cols)] = 0;
        queue.push(cellIdx(col, row, cols));
      }
    }
  }
  let maxDist = 0;
  for (let qi = 0; qi < queue.length; qi++) {
    const cur = queue[qi];
    const curRow = Math.floor(cur / cols);
    const curCol = cur % cols;
    const d = dist[cur];
    if (d > maxDist) maxDist = d;
    const neighbours = [
      [curCol - 1, curRow], [curCol + 1, curRow],
      [curCol, curRow - 1], [curCol, curRow + 1],
    ];
    for (const [nc, nr] of neighbours) {
      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
      const ni = cellIdx(nc, nr, cols);
      if (dist[ni] !== -1) continue;
      dist[ni] = d + 1;
      queue.push(ni);
    }
  }
  if (maxDist > 0) {
    for (let i = 0; i < n; i++) {
      if (dist[i] > 0) data[11 * n + i] = dist[i] / maxDist;
    }
  }

  return { cols, rows, channels: BOARD_CHANNELS, data };
}

/**
 * Collapse an encoded board to one scalar per channel (mean over
 * cells) — a cheap way to feed the spatial signal into the existing
 * flat models without changing their input shape semantics.
 */
export function boardChannelMeans(board: EncodedBoard): number[] {
  const n = board.rows * board.cols;
  const out: number[] = new Array(board.channels).fill(0);
  for (let c = 0; c < board.channels; c++) {
    let sum = 0;
    const base = c * n;
    for (let i = 0; i < n; i++) sum += board.data[base + i];
    out[c] = sum / n;
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────
// Decision-relevant spatial scalars
// ─────────────────────────────────────────���────────────────────────
//
// Channel means are a poor summary for a policy: "range coverage
// averaged over the board" barely changes between a good and a bad
// board. These aggregates are chosen so each one moves when the
// thing the player cares about moves — how much of the lane is
// covered, whether the exit is covered, whether a wall would force a
// detour, and whether towers sit near the lane at all.
//
// Appended to the flat state as a v3 extension (see RLBrain):
// version 3 = the 17 v2 features + these, in this order.

export const SPATIAL_FEATURE_NAMES = [
  'path_cover_pct',    // path cells inside some tower's range / path cells
  'maze_gain_norm',    // best single-cell detour gain / 50
  'best_cell_cover',   // best candidate cell's path coverage / 50
  'mean_tower_dist',   // mean normalized BFS distance of towers to path
  'exit_covered',      // 0/1, exit cell inside some tower's range
] as const;
export type SpatialFeatureName = (typeof SPATIAL_FEATURE_NAMES)[number];
export const SPATIAL_FEATURE_COUNT = SPATIAL_FEATURE_NAMES.length;

/** Median range across the faction's tower pool, used when scoring a
 *  candidate cell before a tower has been chosen. Falls back to 3. */
function medianPoolRange(ctx: BotContext): number {
  const ranges = ctx.towerPool.map(t => t.range).filter(r => r > 0).sort((a, b) => a - b);
  if (ranges.length === 0) return 3;
  return ranges[Math.floor(ranges.length / 2)];
}

export function extractSpatialFeatures(ctx: BotContext): number[] {
  const board = encodeBoard(ctx);
  const n = board.rows * board.cols;
  const ch = (name: BoardChannelName): Float32Array => {
    const c = BOARD_CHANNEL_NAMES.indexOf(name);
    return board.data.subarray(c * n, (c + 1) * n);
  };
  const path = ch('path');
  const range = ch('range_coverage');
  const dist = ch('dist_to_path');

  let pathCells = 0;
  let coveredPath = 0;
  let exitCell = -1;
  for (let i = 0; i < n; i++) {
    if (path[i] > 0) {
      pathCells++;
      if (range[i] > 0) coveredPath++;
    }
  }
  const exitCh = ch('exit');
  for (let i = 0; i < n; i++) {
    if (exitCh[i] > 0) { exitCell = i; break; }
  }

  // Best candidate cell by path coverage at a typical tower range.
  const poolRange = medianPoolRange(ctx);
  const paths = (ctx.allPaths ?? []).filter((p): p is PathPoint[] => !!p && p.length > 0);
  let bestCover = 0;
  for (const cell of ctx.candidateCells) {
    let count = 0;
    const r2 = poolRange * poolRange;
    for (const p of paths) {
      for (const pt of p) {
        const dx = pt.col - cell.col, dy = pt.row - cell.row;
        if (dx * dx + dy * dy <= r2) count++;
      }
    }
    if (count > bestCover) bestCover = count;
  }

  // Maze potential — how much path length one wall could buy. Capped
  // candidate pool since each probe re-runs pathfinding.
  let mazeGain = 0;
  if (ctx.grid && ctx.candidateCells.length > 0) {
    const scores = scoreMazeCells(ctx.grid, ctx.candidateCells, 40);
    if (scores.length > 0) mazeGain = Math.max(0, scores[0].gain);
  }

  // Tower-to-lane distance — placement quality, averaged.
  let towerDistSum = 0;
  for (const t of ctx.placedTowers) {
    if (t.col < 0 || t.col >= board.cols || t.row < 0 || t.row >= board.rows) continue;
    towerDistSum += dist[t.row * board.cols + t.col];
  }
  const meanTowerDist = ctx.placedTowers.length > 0
    ? towerDistSum / ctx.placedTowers.length
    : 0;

  return [
    pathCells > 0 ? coveredPath / pathCells : 0,
    Math.min(1, mazeGain / 50),
    Math.min(1, bestCover / 50),
    meanTowerDist,
    exitCell >= 0 && range[exitCell] > 0 ? 1 : 0,
  ];
}
