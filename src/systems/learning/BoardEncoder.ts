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
import { findPath, PathPoint } from '../Pathfinding';
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

// ──────────────────────────────────────────────────────────────────
// Per-zone spatial features (v4: 12 zones × 2 features = 24 dims)
// ──────────────────────────────────────────────────────────────────
//
// In v2/v3, the policy acts on 12 zones (6 cols × 2 rows) but only
// knows global `occupied_zones / 12` — it cannot tell WHICH zone already
// has 10 towers vs 0, nor which zone covers the lane. That causes
// deterministic argmax evaluation to pile every build into a single zone
// until it loses.
//
// Appended to v3 as v4 (22 + 24 = 46 dims):
//   0..11:  zone_tower_density_0..11   (towers in zone z / 10, clamped to [0,1])
//   12..23: zone_best_cover_0..11      (max path cells covered by a candidate cell in zone z / 25, clamped to [0,1])

export const ZONE_COLS = 6;
export const ZONE_ROWS = 2;
export const ZONE_COUNT = ZONE_COLS * ZONE_ROWS; // 12

export const ZONE_SPATIAL_FEATURE_NAMES: readonly string[] = [
  ...Array.from({ length: ZONE_COUNT }, (_, z) => `zone_towers_z${z}`),
  ...Array.from({ length: ZONE_COUNT }, (_, z) => `zone_cover_z${z}`),
];
export const ZONE_SPATIAL_FEATURE_COUNT = ZONE_SPATIAL_FEATURE_NAMES.length; // 24

// ──────────────────────────────────────────────────────────────────
// Per-zone mazing potential features (v5: 12 zones = 12 dims)
// ──────────────────────────────────────────────────────────────────
//
// Appended to v4 as v5 (46 + 12 = 58 dims):
//   0..11: zone_maze_gain_z0..11 (max path-length gain ΔL achievable by
//          placing a tower on an active-path or near-path cell in zone z,
//          normalized by / 10 and clamped to [0, 1]).
export const ZONE_MAZE_FEATURE_NAMES: readonly string[] = [
  ...Array.from({ length: ZONE_COUNT }, (_, z) => `zone_maze_gain_z${z}`),
];
export const ZONE_MAZE_FEATURE_COUNT = ZONE_MAZE_FEATURE_NAMES.length; // 12

// ──────────────────────────────────────────────────────────────────
// Per-zone post-placement Total Army Exposure features (v6: 12 dims)
// ──────────────────────────────────────────────────────────────────
//
// Appended to v5 as v6 (58 + 12 = 70 dims):
//   0..11: zone_exposure_gain_z0..11 (max post-placement Total Army Exposure
//          gain ΔE achievable in zone z: existing towers' gained path coverage
//          on the simulated post-placement path P_new plus the new tower's
//          own coverage on P_new, normalized by / 35 and clamped to [0, 1]).
export const ZONE_EXPOSURE_FEATURE_NAMES: readonly string[] = [
  ...Array.from({ length: ZONE_COUNT }, (_, z) => `zone_exposure_gain_z${z}`),
];
export const ZONE_EXPOSURE_FEATURE_COUNT = ZONE_EXPOSURE_FEATURE_NAMES.length; // 12

// ──────────────────────────────────────────────────────────────────
// Per-zone map topology features (v7: 24 dims)
// ──────────────────────────────────────────────────────────────────
//
// Appended to v6 as v7 (70 + 24 = 94 dims):
//   0..11:  zone_exit_prox_z0..11 — proximity of zone z to the nearest map
//           exit in [0, 1] (1.0 when an exit lies inside zone z, decaying
//           linearly with normalized Euclidean distance to nearest exit).
//   12..23: zone_path_traffic_z0..11 — fraction of active creep paths that
//           pass through zone z (1.0 at multi-lane convergence points on
//           Crossroads / Fortress / Gauntlet, 0.0 in off-path dead corners).
export const ZONE_TOPOLOGY_FEATURE_NAMES: readonly string[] = [
  ...Array.from({ length: ZONE_COUNT }, (_, z) => `zone_exit_prox_z${z}`),
  ...Array.from({ length: ZONE_COUNT }, (_, z) => `zone_path_traffic_z${z}`),
];
export const ZONE_TOPOLOGY_FEATURE_COUNT = ZONE_TOPOLOGY_FEATURE_NAMES.length; // 24

export function extractZoneTopologyFeatures(ctx: BotContext): number[] {
  const exitProx = new Array<number>(ZONE_COUNT).fill(0);
  const pathTraffic = new Array<number>(ZONE_COUNT).fill(0);
  if (!ctx.grid) return [...exitProx, ...pathTraffic];

  const cols = ctx.grid.cols ?? 36;
  const rows = ctx.grid.rows ?? 26;
  const zw = cols / ZONE_COLS;
  const zh = rows / ZONE_ROWS;
  const maxDist = Math.hypot(cols, rows) || 1;
  const exits = ctx.grid.exits ?? [];

  if (exits.length > 0) {
    for (let z = 0; z < ZONE_COUNT; z++) {
      const cb = z % ZONE_COLS;
      const rb = Math.floor(z / ZONE_COLS);
      const cMin = cb * zw;
      const cMax = (cb + 1) * zw - 1;
      const rMin = rb * zh;
      const rMax = (rb + 1) * zh - 1;
      let minDist = Infinity;
      for (const ex of exits) {
        // Distance from exit to nearest point in zone z's bounding box
        // (0 when the exit lies inside zone z).
        const dx = ex.col < cMin ? cMin - ex.col : ex.col > cMax ? ex.col - cMax : 0;
        const dy = ex.row < rMin ? rMin - ex.row : ex.row > rMax ? ex.row - rMax : 0;
        const d = Math.hypot(dx, dy);
        if (d < minDist) minDist = d;
      }
      exitProx[z] = Math.max(0, Math.min(1, 1 - minDist / maxDist));
    }
  }

  const paths = (ctx.allPaths ?? []).filter((p): p is PathPoint[] => !!p && p.length > 0);
  if (paths.length > 0) {
    const counts = new Array<number>(ZONE_COUNT).fill(0);
    for (const p of paths) {
      const touched = new Set<number>();
      for (const pt of p) {
        touched.add(cellZone(pt.col, pt.row, cols, rows));
      }
      for (const z of touched) counts[z]++;
    }
    for (let z = 0; z < ZONE_COUNT; z++) {
      pathTraffic[z] = Math.min(1, counts[z] / paths.length);
    }
  }

  return [...exitProx, ...pathTraffic];
}

function cellZone(col: number, row: number, cols: number, rows: number): number {
  const zw = cols / ZONE_COLS;
  const zh = rows / ZONE_ROWS;
  const cb = Math.min(ZONE_COLS - 1, Math.max(0, Math.floor(col / zw)));
  const rb = Math.min(ZONE_ROWS - 1, Math.max(0, Math.floor(row / zh)));
  return rb * ZONE_COLS + cb;
}

/** Count how many path tiles across `paths` fall within Euclidean `range` of `(col, row)`. */
function countPathTilesInRange(
  col: number,
  row: number,
  range: number,
  paths: readonly PathPoint[][],
): number {
  const r2 = range * range;
  let hits = 0;
  for (const p of paths) {
    for (const pt of p) {
      const dx = pt.col - col;
      const dy = pt.row - row;
      if (dx * dx + dy * dy <= r2) hits++;
    }
  }
  return hits;
}

/** Total (tower, path_tile) exposure across all currently placed towers for `paths`. */
export function computeArmyExposure(
  ctx: BotContext,
  paths: readonly PathPoint[][],
): number {
  let total = 0;
  for (const t of ctx.placedTowers) {
    const def = TOWER_TYPES[t.towerId];
    const r = Math.max(2, def?.range ?? 3);
    total += countPathTilesInRange(t.col, t.row, r, paths);
  }
  return total;
}

/** Cap A* simulations per zone so long pre-walled maps (spiral, serpentine)
 *  stay fast while open maps (plains, ~6 on-path cells/zone) stay exact. */
const MAX_ON_PATH_SIM_PER_ZONE = 8;

function sampleOnPathPerZone(
  candidates: readonly { col: number; row: number }[],
  pathSet: ReadonlySet<string>,
  cols: number,
  rows: number,
): { col: number; row: number }[] {
  const byZone: { col: number; row: number }[][] = Array.from({ length: ZONE_COUNT }, () => []);
  for (const c of candidates) {
    if (!pathSet.has(`${c.col},${c.row}`)) continue;
    byZone[cellZone(c.col, c.row, cols, rows)].push(c);
  }
  const out: { col: number; row: number }[] = [];
  for (const bucket of byZone) {
    if (bucket.length <= MAX_ON_PATH_SIM_PER_ZONE) {
      out.push(...bucket);
    } else {
      const step = bucket.length / MAX_ON_PATH_SIM_PER_ZONE;
      for (let i = 0; i < MAX_ON_PATH_SIM_PER_ZONE; i++) {
        out.push(bucket[Math.floor(i * step)]);
      }
    }
  }
  return out;
}

export function extractZoneExposureFeatures(ctx: BotContext): number[] {
  const zoneExposure = new Array<number>(ZONE_COUNT).fill(0);
  if (!ctx.grid || ctx.candidateCells.length === 0) return zoneExposure;

  const cols = ctx.grid.cols ?? 36;
  const rows = ctx.grid.rows ?? 26;
  const paths = (ctx.allPaths ?? []).filter((p): p is PathPoint[] => !!p && p.length > 0);
  if (paths.length === 0) return zoneExposure;

  const poolRange = medianPoolRange(ctx);
  const baseArmyExp = computeArmyExposure(ctx, paths);

  const perPathSets: Set<string>[] = paths.map(p => {
    const s = new Set<string>();
    for (const pt of p) s.add(`${pt.col},${pt.row}`);
    return s;
  });
  const pathSet = new Set<string>();
  for (const s of perPathSets) {
    for (const k of s) pathSet.add(k);
  }

  // 1. Off-path candidate cells don't change the path (ΔArmy = 0), so their
  //    total army exposure gain is simply the new tower's own coverage of `paths`.
  for (const cell of ctx.candidateCells) {
    if (pathSet.has(`${cell.col},${cell.row}`)) continue;
    const z = cellZone(cell.col, cell.row, cols, rows);
    const selfCov = countPathTilesInRange(cell.col, cell.row, poolRange, paths);
    if (selfCov > zoneExposure[z]) zoneExposure[z] = selfCov;
  }

  // 2. On-path candidate cells alter the path to P_new: simulate P_new (only
  //    re-pathing paths that actually traverse `cell`) and measure
  //    (ArmyExposure(P_new) - ArmyExposure(P_old)) + SelfCoverage(P_new).
  const onPathSample = sampleOnPathPerZone(ctx.candidateCells, pathSet, cols, rows);
  for (const cell of onPathSample) {
    const cellKey = `${cell.col},${cell.row}`;
    const rowArr = ctx.grid.cells[cell.row];
    if (!rowArr) continue;
    const orig = rowArr[cell.col];
    rowArr[cell.col] = CellType.Blocked;
    let newPaths: PathPoint[][] | null = [];
    try {
      for (let pi = 0; pi < paths.length; pi++) {
        const p = paths[pi];
        if (!perPathSets[pi].has(cellKey)) {
          newPaths.push(p);
          continue;
        }
        const np = findPath(ctx.grid, p[0], p[p.length - 1]);
        if (!np) {
          newPaths = null;
          break;
        }
        newPaths.push(np);
      }
    } finally {
      rowArr[cell.col] = orig;
    }
    if (!newPaths) continue; // illegal block

    const newArmyExp = computeArmyExposure(ctx, newPaths);
    const selfCov = countPathTilesInRange(cell.col, cell.row, poolRange, newPaths);
    const deltaExp = (newArmyExp - baseArmyExp) + selfCov;
    const z = cellZone(cell.col, cell.row, cols, rows);
    if (deltaExp > zoneExposure[z]) zoneExposure[z] = deltaExp;
  }

  return zoneExposure.map(e => Math.min(1, Math.max(0, e / 35)));
}

export function extractZoneMazeFeatures(ctx: BotContext): number[] {
  const zoneMazeGain = new Array<number>(ZONE_COUNT).fill(0);
  if (!ctx.grid || ctx.candidateCells.length === 0) return zoneMazeGain;

  const cols = ctx.grid.cols ?? 36;
  const rows = ctx.grid.rows ?? 26;
  const paths = (ctx.allPaths ?? []).filter((p): p is PathPoint[] => !!p && p.length > 0);
  if (paths.length === 0) return zoneMazeGain;

  // Only cells directly ON an active creep path can change shortest-path
  // routing when blocked! Testing only on-path candidate cells makes this
  // exact across all 12 zones and ~25x faster than random candidate sampling.
  const pathSet = new Set<string>();
  for (const p of paths) {
    for (const pt of p) pathSet.add(`${pt.col},${pt.row}`);
  }
  const onPathCandidates = sampleOnPathPerZone(ctx.candidateCells, pathSet, cols, rows);
  if (onPathCandidates.length === 0) return zoneMazeGain;

  const scores = scoreMazeCells(ctx.grid, onPathCandidates, onPathCandidates.length, paths);
  for (const s of scores) {
    if (s.gain <= 0) continue;
    const z = cellZone(s.col, s.row, cols, rows);
    if (s.gain > zoneMazeGain[z]) zoneMazeGain[z] = s.gain;
  }

  return zoneMazeGain.map(g => Math.min(1, g / 10));
}

export function extractZoneSpatialFeatures(ctx: BotContext): number[] {
  const cols = ctx.grid?.cols ?? 36;
  const rows = ctx.grid?.rows ?? 26;
  const zoneTowers = new Array<number>(ZONE_COUNT).fill(0);
  for (const t of ctx.placedTowers) {
    const z = cellZone(t.col, t.row, cols, rows);
    zoneTowers[z]++;
  }

  const poolRange = medianPoolRange(ctx);
  const r2 = poolRange * poolRange;
  const paths = (ctx.allPaths ?? []).filter((p): p is PathPoint[] => !!p && p.length > 0);
  const zoneBestCover = new Array<number>(ZONE_COUNT).fill(0);
  for (const cell of ctx.candidateCells) {
    const z = cellZone(cell.col, cell.row, cols, rows);
    let count = 0;
    for (const p of paths) {
      for (const pt of p) {
        const dx = pt.col - cell.col, dy = pt.row - cell.row;
        if (dx * dx + dy * dy <= r2) count++;
      }
    }
    if (count > zoneBestCover[z]) zoneBestCover[z] = count;
  }

  return [
    ...zoneTowers.map(c => Math.min(1, c / 10)),
    ...zoneBestCover.map(c => Math.min(1, c / 25)),
  ];
}

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
