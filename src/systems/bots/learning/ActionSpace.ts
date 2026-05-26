/**
 * ActionSpace — flat-indexed integer action representation for the
 * RL policy. Wraps the narrowed Phase 1-2 subset of `BotDecision`
 * (place / upgrade / sell / skip — no send / frontier yet) into a
 * fixed `[0, ACTION_SPACE_SIZE)` integer space the policy can
 * sample from after a masked softmax.
 *
 * Layout (see `notes/rl/action-and-observation-spec.md`):
 *   [0..7487]     place(tower_slot, cell)
 *   [7488..8423]  upgrade(cell)             // auto-default branch
 *   [8424..9359]  sell(cell)
 *   [9360]        skip
 *
 * Total = 9361 actions per faction. Cross-faction differences in
 * tower count are handled by the legal mask, not by reshaping the
 * space — every faction sees the same integer range so a shared
 * policy can be trained.
 *
 * Schema is versioned. `OBS_ACTION_SCHEMA_VERSION` is stamped onto
 * every committed ONNX policy via `models/ppo-policy.meta.json`
 * and `PPOBrain` refuses to load mismatched versions. Bump when
 * channel count, action surface, or globals reorder.
 */
import { GRID_COLS, GRID_ROWS } from '../../../config';
import { FactionId } from '../../../data/Factions';
import { TOWER_TYPES, getTowerType } from '../../../data/TowerTypes';
import { BotContext } from '../BotBrain';
import { NUM_TOWER_SLOTS, getFactionTowerIds, slotForTowerId, towerIdForSlot } from './FactionVocab';

export const OBS_ACTION_SCHEMA_VERSION = 'v1.1';

export const NUM_CELLS = GRID_COLS * GRID_ROWS;

export const PLACE_BASE = 0;
export const PLACE_SIZE = NUM_TOWER_SLOTS * NUM_CELLS;       // 7488
export const UPGRADE_BASE = PLACE_BASE + PLACE_SIZE;          // 7488
export const UPGRADE_SIZE = NUM_CELLS;                        // 936
export const SELL_BASE = UPGRADE_BASE + UPGRADE_SIZE;         // 8424
export const SELL_SIZE = NUM_CELLS;                           // 936
export const SKIP_INDEX = SELL_BASE + SELL_SIZE;              // 9360
export const ACTION_SPACE_SIZE = SKIP_INDEX + 1;              // 9361

/** Narrowed subset of `BotDecision` exposed to / produced by the
 *  RL policy. `send / frontier / frontierManage` are out of scope
 *  for Phase 1-2 and `encodeAction` throws on them. */
export type ActionSpaceDecision =
  | { kind: 'place'; col: number; row: number; towerId: string }
  | { kind: 'upgrade'; col: number; row: number }
  | { kind: 'sell'; col: number; row: number }
  | { kind: 'skip' };

function cellIndex(col: number, row: number): number {
  return row * GRID_COLS + col;
}

function decodeCell(idx: number): { col: number; row: number } {
  return { col: idx % GRID_COLS, row: Math.floor(idx / GRID_COLS) };
}

export function encodeAction(d: ActionSpaceDecision, faction: FactionId): number {
  switch (d.kind) {
    case 'place': {
      const slot = slotForTowerId(faction, d.towerId);
      if (slot < 0) throw new Error(`tower ${d.towerId} not in faction ${faction}`);
      return PLACE_BASE + slot * NUM_CELLS + cellIndex(d.col, d.row);
    }
    case 'upgrade':
      return UPGRADE_BASE + cellIndex(d.col, d.row);
    case 'sell':
      return SELL_BASE + cellIndex(d.col, d.row);
    case 'skip':
      return SKIP_INDEX;
  }
}

export function decodeAction(index: number, faction: FactionId): ActionSpaceDecision {
  if (index < 0 || index >= ACTION_SPACE_SIZE) {
    throw new Error(`action index ${index} out of range [0, ${ACTION_SPACE_SIZE})`);
  }
  if (index === SKIP_INDEX) return { kind: 'skip' };
  if (index >= SELL_BASE) {
    return { kind: 'sell', ...decodeCell(index - SELL_BASE) };
  }
  if (index >= UPGRADE_BASE) {
    return { kind: 'upgrade', ...decodeCell(index - UPGRADE_BASE) };
  }
  const slot = Math.floor(index / NUM_CELLS);
  const cell = decodeCell(index - slot * NUM_CELLS);
  const towerId = towerIdForSlot(faction, slot);
  if (!towerId) {
    // Should never happen if `legalMask` is respected — slot N for
    // a faction without that many towers is always masked off.
    throw new Error(`decode place(slot=${slot}) for faction ${faction} (only ${getFactionTowerIds(faction).length} towers)`);
  }
  return { kind: 'place', col: cell.col, row: cell.row, towerId };
}

/** Build the legality mask from a `BotContext`. The mask is
 *  uint8 (0 or 1) with the policy interpreting 0 as `logit = -inf`.
 *  `skip` is always 1 — the agent always has the option to do
 *  nothing this decision.
 *
 *  Affordability is checked against `ctx.budget`; placement legality
 *  against `ctx.candidateCells`; upgrade/sell legality against
 *  `ctx.placedTowers`. */
export function legalMask(ctx: BotContext): Uint8Array {
  const mask = new Uint8Array(ACTION_SPACE_SIZE);

  // Skip — always legal.
  mask[SKIP_INDEX] = 1;

  const towerIds = getFactionTowerIds(ctx.faction);

  // Place actions — only legal between waves AND when the tower
  // is affordable AND the cell is currently buildable.
  if (ctx.betweenWaves) {
    const cellSet = new Set<number>();
    for (const c of ctx.candidateCells) cellSet.add(cellIndex(c.col, c.row));

    for (let slot = 0; slot < NUM_TOWER_SLOTS; slot++) {
      if (slot >= towerIds.length) continue;
      const towerCost = getTowerType(towerIds[slot]).cost;
      if (towerCost > ctx.budget) continue;
      const slotBase = PLACE_BASE + slot * NUM_CELLS;
      for (const ci of cellSet) mask[slotBase + ci] = 1;
    }
  }

  // Upgrade + sell actions — legal both between waves and in-wave.
  // `Match.runOneIteration` accepts upgrade and sell decisions in
  // both the between-waves loop and the in-wave brain-decide tick
  // (every 30 sim-ticks), so the mask must too — otherwise the
  // policy gets no gradient on in-wave upgrade decisions that good
  // play depends on.
  for (const t of ctx.placedTowers) {
    const ci = cellIndex(t.col, t.row);
    mask[SELL_BASE + ci] = 1;
    if (t.upgradeCost > 0 && t.upgradeCost <= ctx.budget) {
      mask[UPGRADE_BASE + ci] = 1;
    }
  }

  return mask;
}

/** Helper for callers (PPOBrain, trainer scripts) that need to
 *  drop the auto-default branch back onto a `BotDecision` the
 *  Match driver can consume. Lifts `ActionSpaceDecision` to the
 *  wider `BotDecision` union. */
export function toBotDecision(d: ActionSpaceDecision): {
  kind: 'place'; col: number; row: number; type: ReturnType<typeof getTowerType>;
} | { kind: 'upgrade'; col: number; row: number; branch: null }
  | { kind: 'sell'; col: number; row: number }
  | { kind: 'skip' } {
  switch (d.kind) {
    case 'place':
      return { kind: 'place', col: d.col, row: d.row, type: TOWER_TYPES[d.towerId] };
    case 'upgrade':
      return { kind: 'upgrade', col: d.col, row: d.row, branch: null };
    case 'sell':
      return { kind: 'sell', col: d.col, row: d.row };
    case 'skip':
      return { kind: 'skip' };
  }
}
