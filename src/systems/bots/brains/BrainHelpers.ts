/**
 * Shared placement helpers for specialised brains. Extracted from
 * HarmonicBrain so future per-faction brains don't reinvent them.
 *
 * These helpers all return BotDecision objects (`place` or `skip`)
 * — they're meant to slot directly into a brain's decide() switch,
 * not into the driver. No new decision kinds; the strategy is
 * encoded in *where* the brain chooses to place a tower.
 */
import { BotContext, BotDecision, PlacedTower } from '../BotBrain';
import { TowerType, TOWER_TYPES } from '../../../data/TowerTypes';
import { PathPoint } from '../../Pathfinding';
import { pathCellsWithinRange } from '../MazePlanner';

/** Place at the candidate cell with the highest path coverage —
 *  the "no constraints" placement scorer used as a fallback. */
export function placeAtBestCoverage(ctx: BotContext, type: TowerType): BotDecision {
  if (ctx.budget < type.cost) return { kind: 'skip' };
  if (ctx.candidateCells.length === 0) return { kind: 'skip' };
  const paths = ctx.allPaths.filter((p): p is PathPoint[] => !!p && p.length > 0);
  if (paths.length === 0) return { kind: 'skip' };
  let bestCol = -1, bestRow = -1, bestCoverage = -1;
  for (const c of ctx.candidateCells) {
    let coverage = 0;
    for (const p of paths) coverage += pathCellsWithinRange(c, p, type.range);
    if (coverage > bestCoverage) {
      bestCoverage = coverage; bestCol = c.col; bestRow = c.row;
    }
  }
  if (bestCoverage <= 0) return { kind: 'skip' };
  return { kind: 'place', col: bestCol, row: bestRow, type };
}

/** Place inside the buff zone of `anchors` — i.e. within at least
 *  one anchor's range (using the anchor tower's authored range as
 *  the aura radius). Falls back to plain best-coverage if no
 *  candidate cell is within range of any anchor (early-game before
 *  anchors exist). */
export function placeInBuffZone(
  ctx: BotContext, type: TowerType, anchors: PlacedTower[],
): BotDecision {
  if (ctx.budget < type.cost) return { kind: 'skip' };
  if (ctx.candidateCells.length === 0) return { kind: 'skip' };
  const paths = ctx.allPaths.filter((p): p is PathPoint[] => !!p && p.length > 0);
  if (paths.length === 0) return { kind: 'skip' };

  const anchorRanges = anchors.map(a => {
    const def = TOWER_TYPES[a.towerId];
    return { a, r2: def ? def.range * def.range : 0 };
  });

  let bestCol = -1, bestRow = -1, bestScore = -Infinity;
  for (const c of ctx.candidateCells) {
    let anchorCount = 0;
    for (const { a, r2 } of anchorRanges) {
      const dx = a.col - c.col, dy = a.row - c.row;
      if (dx * dx + dy * dy <= r2) anchorCount++;
    }
    if (anchorCount === 0 && anchorRanges.length > 0) continue;
    let coverage = 0;
    for (const p of paths) coverage += pathCellsWithinRange(c, p, type.range);
    const score = anchorCount * 100 + coverage;
    if (score > bestScore) {
      bestScore = score; bestCol = c.col; bestRow = c.row;
    }
  }
  if (bestCol < 0) return placeAtBestCoverage(ctx, type);
  return { kind: 'place', col: bestCol, row: bestRow, type };
}

/** Place at the cell where the most aura ranges overlap. Used for
 *  ultimate placement on synergy-heavy factions where buff density
 *  matters more than path coverage. */
export function placeAtMaxStack(
  ctx: BotContext, type: TowerType, auras: PlacedTower[],
): BotDecision {
  if (ctx.budget < type.cost) return { kind: 'skip' };
  if (ctx.candidateCells.length === 0) return { kind: 'skip' };
  const auraRanges = auras.map(a => {
    const def = TOWER_TYPES[a.towerId];
    return { a, r2: def ? def.range * def.range : 0 };
  });
  let bestCol = -1, bestRow = -1, bestStack = 0;
  for (const c of ctx.candidateCells) {
    let stack = 0;
    for (const { a, r2 } of auraRanges) {
      const dx = a.col - c.col, dy = a.row - c.row;
      if (dx * dx + dy * dy <= r2) stack++;
    }
    if (stack > bestStack) { bestStack = stack; bestCol = c.col; bestRow = c.row; }
  }
  if (bestCol < 0) return placeAtBestCoverage(ctx, type);
  return { kind: 'place', col: bestCol, row: bestRow, type };
}

/** Score upgrade targets by how many aura towers' ranges currently
 *  cover them. Returns the best-scoring tower's location, or null
 *  if nothing is upgradable within budget. Uses level as a tiebreaker
 *  (compounding higher levels) so when no auras exist, behaves like
 *  "upgrade highest-level tower". */
export function bestUpgradeInBuffZone(
  ctx: BotContext, candidates: PlacedTower[], auras: PlacedTower[],
): { col: number; row: number } | null {
  const affordable = candidates.filter(p => p.upgradeCost > 0 && p.upgradeCost <= ctx.budget);
  if (affordable.length === 0) return null;
  let bestCol = -1, bestRow = -1, bestScore = -1;
  for (const t of affordable) {
    let auraCount = 0;
    for (const a of auras) {
      const def = TOWER_TYPES[a.towerId];
      if (!def) continue;
      const dx = a.col - t.col, dy = a.row - t.row;
      if (dx * dx + dy * dy <= def.range * def.range) auraCount++;
    }
    const score = auraCount * 10 + t.level;
    if (score > bestScore) { bestScore = score; bestCol = t.col; bestRow = t.row; }
  }
  if (bestCol < 0) return null;
  return { col: bestCol, row: bestRow };
}
