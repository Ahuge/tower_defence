/**
 * ObsTensor — game state → fixed-shape tensors for the PPO policy.
 *
 * Spec lives in `notes/rl/action-and-observation-spec.md`. Quick
 * recap:
 *   grid    Float32Array, shape [14, 26, 36] = 13104 (channel-major)
 *   globals Float32Array, length 7
 *   mask    Uint8Array, length ACTION_SPACE_SIZE = 9361
 *
 * Channel layout (own-side only — opponent visibility deferred to
 * G6 schema bump):
 *   0..7   tower-by-slot occupancy
 *   8      path cell (creeps walk here)
 *   9      buildable-empty (Empty cell currently free)
 *   10     blocked unwalkable (Blocked rocks + out-of-grid padding)
 *   11     NoBuild — walkable but unbuildable
 *   12     entry or exit
 *   13     creep density (count / 8, clipped to [0, 1])
 *
 * Note: `Blocked` and `NoBuild` are intentionally distinct
 * channels. They look similar from a placement perspective (both
 * refuse towers) but Blocked is unwalkable rock while NoBuild lets
 * creeps cross. The path-planning signal would otherwise be lost
 * if collapsed.
 *
 * Globals (normalized):
 *   0 gold/2000, 1 lives/STARTING, 2 wave/60, 3 between_waves,
 *   4 sim_time/(15*60s), 5 arcane=1, 6 mechanical=1
 *
 * Grid normalization is intentionally cheap (mostly 0/1). The
 * encoder net's first norm layer handles any remaining centering.
 */
import { GRID_COLS, GRID_ROWS, STARTING_LIVES } from '../../../config';
import { FactionId } from '../../../data/Factions';
import { Match } from '../../../headless/Match';
import { ACTION_SPACE_SIZE, legalMask } from './ActionSpace';
import { NUM_TOWER_SLOTS, slotForTowerId } from './FactionVocab';
import { CellType } from '../../Grid';

export const OBS_CHANNELS = 14;
export const OBS_GLOBALS = 7;
export const OBS_GRID_LEN = OBS_CHANNELS * GRID_ROWS * GRID_COLS;

const FACTION_ONE_HOT_INDEX: Partial<Record<FactionId, number>> = {
  arcane: 5,
  mechanical: 6,
};

/** Pack `(channel, row, col)` into a flat index for the grid buffer. */
function gIdx(c: number, r: number, col: number): number {
  return c * (GRID_ROWS * GRID_COLS) + r * GRID_COLS + col;
}

export interface Obs {
  grid: Float32Array;
  globals: Float32Array;
  mask: Uint8Array;
}

export function fromMatch(match: Match): Obs {
  const ctx = match.observe();
  const grid = match.getGrid();
  const creeps = match.getCreeps();
  const allPaths = match.getAllPaths();
  const faction = ctx.faction;

  const tensor = new Float32Array(OBS_GRID_LEN);

  // ----- Terrain channels (8..11) — read straight from grid.cells -----
  // Pad cells outside the actual grid size with the "blocked" channel.
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let col = 0; col < GRID_COLS; col++) {
      if (r >= grid.rows || col >= grid.cols) {
        tensor[gIdx(10, r, col)] = 1;
        continue;
      }
      const cell = grid.cells[r][col];
      if (cell === CellType.Empty) {
        tensor[gIdx(9, r, col)] = 1;
      } else if (cell === CellType.Blocked) {
        tensor[gIdx(10, r, col)] = 1;
      } else if (cell === CellType.NoBuild) {
        tensor[gIdx(11, r, col)] = 1;
      } else if (cell === CellType.Entry || cell === CellType.Exit) {
        tensor[gIdx(12, r, col)] = 1;
      }
      // CellType.Tower handled by the tower-slot channels below.
    }
  }

  // ----- Path channel (8) — union of all active creep paths -----
  for (const path of allPaths) {
    if (!path) continue;
    for (const p of path) {
      if (p.row < 0 || p.row >= GRID_ROWS || p.col < 0 || p.col >= GRID_COLS) continue;
      tensor[gIdx(8, p.row, p.col)] = 1;
    }
  }

  // ----- Tower-slot channels (0..7) — per faction cost-sort -----
  for (const t of ctx.placedTowers) {
    const slot = slotForTowerId(faction, t.towerId);
    if (slot < 0 || slot >= NUM_TOWER_SLOTS) continue;
    if (t.row < 0 || t.row >= GRID_ROWS || t.col < 0 || t.col >= GRID_COLS) continue;
    tensor[gIdx(slot, t.row, t.col)] = 1;
  }

  // ----- Creep density (13) — count_in_cell / 8 clipped -----
  for (const c of creeps) {
    if (!c.alive) continue;
    const target = c.path[c.pathIndex] ?? c.path[c.path.length - 1];
    if (!target) continue;
    if (target.row < 0 || target.row >= GRID_ROWS || target.col < 0 || target.col >= GRID_COLS) continue;
    const idx = gIdx(13, target.row, target.col);
    tensor[idx] = Math.min(1, tensor[idx] + 1 / 8);
  }

  // ----- Globals -----
  const globals = new Float32Array(OBS_GLOBALS);
  globals[0] = Math.min(ctx.budget / 2000, 1);
  globals[1] = Math.max(0, Math.min(ctx.lives / STARTING_LIVES, 1));
  globals[2] = Math.min(ctx.wave / 60, 1);
  globals[3] = ctx.betweenWaves ? 1 : 0;
  globals[4] = Math.min(match.getSimTimeMs() / (15 * 60_000), 1);
  const factionIdx = FACTION_ONE_HOT_INDEX[faction];
  if (factionIdx !== undefined) globals[factionIdx] = 1;

  // ----- Mask -----
  const mask = legalMask(ctx);

  if (mask.length !== ACTION_SPACE_SIZE) {
    throw new Error(`mask length ${mask.length} != ACTION_SPACE_SIZE ${ACTION_SPACE_SIZE}`);
  }

  return { grid: tensor, globals, mask };
}
