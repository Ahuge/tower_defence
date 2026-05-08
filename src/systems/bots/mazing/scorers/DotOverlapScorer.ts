/**
 * DotOverlapScorer — burn / poison DOTs gain extra value when stacked
 * with slow / root / confuse OR placed at chokepoints.
 *
 * v2 doesn't differentiate a Mortar (splash + burn) from a plain
 * Cannon (splash only). The DOT damage continues over duration, and
 * its actual damage dealt depends on creep movement speed — a slowed
 * creep takes more burn ticks. v3 captures this:
 *
 * Formula:
 *   For each placed DOT-trait tower D (burn_dot / poison_dot):
 *     dot_dps = trait.dps OR trait.percentPerSec × 100 (rough)
 *     dot_duration_s = trait.duration / 1000
 *     dot_total_per_hit = dot_dps × dot_duration_s
 *     reach_D = path cells within D.range
 *     For each placed slow/root/confuse tower CC:
 *       overlap = path cells in reach_D ∩ reach_CC
 *       contribution += dot_total_per_hit × overlap × cc_factor
 *
 *   Where cc_factor = (1 + chance × duration / fireRate) — boosts the
 *   DOT's effective duration when the creep is slowed/stopped.
 *
 * Captures: nature Sunroot (burn) + Bramble (root) combo, infernal
 * Hellfire (burn + splash) layouts where slows are present.
 */
import { ContributionScorer, ScorerContext } from './types';
import { getTrait } from '../../../traits/Trait';
import { TowerType } from '../../../../data/TowerTypes';

const DOT_TRAITS = ['burn_dot', 'poison_dot'];
const CC_TRAITS = ['slow_on_hit', 'root_on_hit', 'confuse_on_hit', 'stun_on_hit'];

export class DotOverlapScorer implements ContributionScorer {
  readonly id = 'dot_overlap';

  contribute(c: ScorerContext): number {
    let total = 0;
    for (const placed of c.state.placedTowers) {
      const t: TowerType | null = c.lookupTower(placed.towerId);
      if (!t) continue;
      const dot = pickDotTrait(t);
      if (!dot) continue;
      const dotDps = (dot as { dps?: number }).dps
        ?? ((dot as { percentPerSec?: number }).percentPerSec ?? 0) * 100;
      const dotDurMs = (dot as { duration?: number }).duration ?? 1000;
      const dotPerHit = dotDps * (dotDurMs / 1000);
      if (dotPerHit === 0) continue;
      const dotReach = pathCellsInRange(t, placed.col, placed.row, c.pathGeometries);
      if (dotReach.size === 0) continue;
      // Bonus from CC overlap.
      for (const other of c.state.placedTowers) {
        if (other === placed) continue;
        const ot = c.lookupTower(other.towerId);
        if (!ot) continue;
        const ccTrait = pickCcTrait(ot);
        if (!ccTrait) continue;
        const ccFactor = computeCcBoost(ot, ccTrait);
        if (ccFactor === 0) continue;
        const otherReach = pathCellsInRange(ot, other.col, other.row, c.pathGeometries);
        let overlap = 0;
        for (const k of dotReach) if (otherReach.has(k)) overlap++;
        if (overlap === 0) continue;
        total += dotPerHit * overlap * ccFactor;
      }
    }
    return total;
  }
}

function pickDotTrait(t: TowerType): { id: string; dps?: number; percentPerSec?: number; duration?: number } | null {
  for (const id of DOT_TRAITS) {
    const tr = getTrait(t.traits, id);
    if (tr) return tr as { id: string; dps?: number; percentPerSec?: number; duration?: number };
  }
  return null;
}

function pickCcTrait(t: TowerType): { id: string; chance?: number; duration?: number; factor?: number } | null {
  for (const id of CC_TRAITS) {
    const tr = getTrait(t.traits, id);
    if (tr) return tr as { id: string; chance?: number; duration?: number; factor?: number };
  }
  return null;
}

function computeCcBoost(
  tower: { fireRate: number },
  trait: { chance?: number; duration?: number; factor?: number },
): number {
  // For slow_on_hit, slowing extends DOT exposure proportional to slow strength.
  // For root/confuse/stun, total stop = full duration of CC effect.
  const chance = trait.chance ?? 1.0;
  const durationMs = trait.duration ?? 800;
  const cycleMs = Math.max(tower.fireRate, 100);
  const upTime = Math.min(1, (chance * durationMs) / cycleMs);
  // For slow_on_hit factor=0.4 means creep at 40% speed → 2.5× exposure.
  // Express that as +1.5 multiplier when factor=0.4.
  const factor = trait.factor;
  if (factor !== undefined && factor < 1) {
    return upTime * Math.max(0, (1 / Math.max(factor, 0.05)) - 1);
  }
  // Root/stun/confuse — pure freeze, +upTime worth of extra DOT exposure.
  return upTime;
}

function pathCellsInRange(
  t: { range: number },
  col: number, row: number,
  pathGeoms: { col: number; row: number }[][],
): Set<number> {
  const r2 = t.range * t.range;
  const set = new Set<number>();
  for (const path of pathGeoms) {
    for (const p of path) {
      const dc = p.col - col;
      const dr = p.row - row;
      if (dc * dc + dr * dr <= r2) set.add(p.row * 1000 + p.col);
    }
  }
  return set;
}
