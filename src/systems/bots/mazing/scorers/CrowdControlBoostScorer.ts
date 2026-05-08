/**
 * CrowdControlBoostScorer — confuse / root traits boost neighbouring
 * DPS coverage by extending creep time-in-range.
 *
 * Captures: psionic Mesmer (confuse_on_hit) and nature/coalition root
 * towers force creeps to stop / backtrack, which means OTHER DPS
 * towers covering the same path cells get extra hits in.
 *
 * Formula:
 *   For each placed CC tower (root_on_hit / confuse_on_hit / stun_on_hit):
 *     reach_CC = path cells within CC.range
 *     cc_uptime = trait.duration * trait.chance / max(trait.cooldown, fireRate)
 *     For each placed DPS tower D:
 *       overlap = path cells in reach_CC ∩ reach_D
 *       contribution += cc_uptime × D.dps × overlap
 *
 * This is the psionic-cracking term. v2 had no concept of CC; psionic
 * brain-search hit only 10% because the planner couldn't recognise
 * Mesmer + Probe overlap as a winning combo.
 */
import { ContributionScorer, ScorerContext } from './types';
import { getTrait } from '../../../traits/Trait';
import { TowerType } from '../../../../data/TowerTypes';

/** Trait IDs treated as crowd-control. Each contributes uptime
 *  (chance × duration / fireRate) when the tower is placed near DPS. */
const CC_TRAITS = ['root_on_hit', 'confuse_on_hit', 'stun_on_hit'];

export class CrowdControlBoostScorer implements ContributionScorer {
  readonly id = 'cc_boost';

  contribute(c: ScorerContext): number {
    let total = 0;
    for (const placed of c.state.placedTowers) {
      const t: TowerType | null = c.lookupTower(placed.towerId);
      if (!t) continue;
      const ccTrait = pickCcTrait(t);
      if (!ccTrait) continue;
      const ccUptime = computeCcUptime(t, ccTrait);
      if (ccUptime === 0) continue;
      const ccReach = pathCellsInRange(t, placed.col, placed.row, c.pathGeometries);
      if (ccReach.size === 0) continue;
      for (const other of c.state.placedTowers) {
        if (other === placed) continue;
        const oRole = c.lookupRole(other.towerId);
        if (oRole !== 'dps-single' && oRole !== 'dps-splash') continue;
        const ot = c.lookupTower(other.towerId);
        if (!ot) continue;
        const otherReach = pathCellsInRange(ot, other.col, other.row, c.pathGeometries);
        let overlap = 0;
        for (const k of ccReach) if (otherReach.has(k)) overlap++;
        if (overlap === 0) continue;
        const dpsPerSec = ot.damage * 1000 / Math.max(ot.fireRate, 1);
        total += ccUptime * dpsPerSec * overlap;
      }
    }
    return total;
  }
}

function pickCcTrait(t: TowerType): { id: string; chance?: number; duration?: number } | null {
  for (const id of CC_TRAITS) {
    const tr = getTrait(t.traits, id);
    if (tr) return tr as { id: string; chance?: number; duration?: number };
  }
  return null;
}

function computeCcUptime(
  tower: { fireRate: number },
  trait: { chance?: number; duration?: number },
): number {
  const chance = trait.chance ?? 1.0;
  const durationMs = trait.duration ?? 1000;
  const cycleMs = Math.max(tower.fireRate, 100);
  // Uptime ≈ (chance × duration) / cycle. Capped at 1 because a CC
  // that's always on can't extend time-in-range further per-cell.
  return Math.min(1, (chance * durationMs) / cycleMs);
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
