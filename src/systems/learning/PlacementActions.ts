/**
 * Factored placement action space.
 *
 * Today the RL policy picks (tower, zone) — 86 actions — and an
 * imitation scorer picks the exact cell inside the zone. That means
 * the policy can never learn "this cell forces a detour, that one
 * doesn't": the one decision the game is actually about is outsourced
 * to a model trained on 11 hand-engineered features with a hardcoded
 * plains path row.
 *
 * This module enumerates the full legal placement set directly —
 * (tower type × candidate cell) — as a flat, stable-indexed list, so a
 * policy can own placement end to end. The space stays tractable
 * because `ctx.candidateCells` is already the legal subset of the
 * board (hundreds of cells, not 36×26), and affordable towers are a
 * handful per faction.
 *
 * Encoding: action index = cellIndex * towerCount + towerIndex,
 * where cellIndex walks ctx.candidateCells in its given order and
 * towerIndex walks towerPool (pre-sorted by cost, driver-provided).
 * Both are stable within a decide() call; the returned list carries
 * the decode table so an action id can always be mapped back to a
 * concrete BotDecision.
 */
import { BotContext, BotDecision, Cell } from '../bots/BotBrain';
import type { TowerType } from '../../data/TowerTypes';

export interface PlacementAction {
  /** Flat action id within this enumeration. */
  id: number;
  towerIndex: number;
  cellIndex: number;
  col: number;
  row: number;
  towerId: string;
  cost: number;
}

export interface PlacementActionSet {
  actions: PlacementAction[];
  towerCount: number;
  cellCount: number;
  /** Index of the first non-placement action (save). */
  saveAction: number;
  /** Index of the upgrade action, or -1 when nothing is upgradable. */
  upgradeAction: number;
  /** Total action-space size including save + upgrade. */
  actionDim: number;
}

/**
 * Enumerate every legal (tower, cell) placement for this decision,
 * plus the always-legal save and (when available) one upgrade action.
 * Pure: reads ctx, returns a fresh structure.
 */
export function enumeratePlacementActions(ctx: BotContext): PlacementActionSet {
  const towers = ctx.towerPool.filter(t => t.cost <= ctx.budget);
  const cells: Cell[] = ctx.candidateCells;
  const towerCount = towers.length;
  const cellCount = cells.length;
  const actions: PlacementAction[] = [];

  let id = 0;
  for (let ci = 0; ci < cellCount; ci++) {
    const cell = cells[ci];
    for (let ti = 0; ti < towerCount; ti++) {
      const t = towers[ti];
      actions.push({
        id,
        towerIndex: ti,
        cellIndex: ci,
        col: cell.col,
        row: cell.row,
        towerId: t.id,
        cost: t.cost,
      });
      id++;
    }
  }

  const saveAction = id++;
  const upgradable = ctx.placedTowers.find(
    p => p.upgradeCost > 0 && p.upgradeCost <= ctx.budget,
  );
  const upgradeAction = upgradable ? id++ : -1;

  return {
    actions,
    towerCount,
    cellCount,
    saveAction,
    upgradeAction,
    actionDim: id,
  };
}

/** Decode a flat action id back to a decision. `towerType()` is the
 *  lookup from tower id to the full TowerType — passed in so this
 *  module stays free of the data layer (callers pass
 *  `id => TOWER_TYPES[id]`).
 *
 *  The upgrade action decodes to the first affordable upgradable
 *  tower — the same one `enumeratePlacementActions` found it from. */
export function decodePlacementAction(
  set: PlacementActionSet,
  action: number,
  towerType: (id: string) => TowerType | undefined,
  ctx?: BotContext,
): BotDecision {
  if (action === set.saveAction) return { kind: 'skip' };
  if (set.upgradeAction >= 0 && action === set.upgradeAction) {
    const target = ctx?.placedTowers.find(
      p => p.upgradeCost > 0 && p.upgradeCost <= (ctx?.budget ?? 0),
    );
    return target
      ? { kind: 'upgrade', col: target.col, row: target.row }
      : { kind: 'skip' };
  }
  const a = set.actions[action];
  if (!a) return { kind: 'skip' };
  const t = towerType(a.towerId);
  if (!t) return { kind: 'skip' };
  return { kind: 'place', col: a.col, row: a.row, type: t };
}

/**
 * Distance-weighted path coverage of one cell for one tower range —
 * the scalar the spatial encoder already implies per cell, exposed
 * here so placement scoring can rank actions without redoing the
 * geometry. Returns number of path cells in range.
 */
export function cellPathCoverage(
  cell: Cell, paths: { col: number; row: number }[][], range: number,
): number {
  if (range <= 0) return 0;
  const r2 = range * range;
  const seen = new Set<string>();
  for (const p of paths) {
    for (const pt of p) {
      const dx = pt.col - cell.col, dy = pt.row - cell.row;
      if (dx * dx + dy * dy <= r2) seen.add(`${pt.col},${pt.row}`);
    }
  }
  return seen.size;
}
