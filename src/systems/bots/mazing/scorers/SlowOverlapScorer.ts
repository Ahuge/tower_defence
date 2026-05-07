/**
 * SlowOverlapScorer — slow tower's coverage × neighbouring DPS DPS,
 * counted on the OVERLAPPING path cells.
 *
 * v2's SlowValueScorer rewards slow placement based purely on its own
 * range × strength. But a slow's ACTUAL value is in extending creeps'
 * time-in-range for OTHER towers. Two slows in the same overlap zone
 * stack; a slow with no nearby DPS is wasted.
 *
 * Formula:
 *   For each placed slow tower S:
 *     reach_S = path cells within S.range
 *     For each placed DPS tower D (single or splash):
 *       overlap = path cells in reach_S ∩ reach_D
 *       contribution += S.strength × D.dps × overlap
 *
 *   Where strength = 1 - factor (so factor 0.4 → 0.6 strength).
 *
 * Captures: slow + DPS positioning matters. A Frost next to two
 * Bolts overlapping the path is way more valuable than a Frost off
 * by itself. Tests this on void / military.
 */
import { ContributionScorer, ScorerContext, PlacedTower } from './types';
import { getTrait } from '../../../traits/Trait';
import { TowerType } from '../../../../data/TowerTypes';

export class SlowOverlapScorer implements ContributionScorer {
  readonly id = 'slow_overlap';

  contribute(c: ScorerContext): number {
    // Pre-compute per-tower path-cell coverage so we don't iterate
    // pathGeometries N×M times.
    const towerCoverage = computeCoverage(c);
    let total = 0;
    for (const placed of c.state.placedTowers) {
      const role = c.lookupRole(placed.towerId);
      if (role !== 'slow') continue;
      const t = c.lookupTower(placed.towerId);
      if (!t) continue;
      const slow = getTrait(t.traits, 'slow_on_hit');
      if (!slow) continue;
      const factor = (slow as { factor?: number }).factor ?? 0.5;
      const strength = Math.max(0, 1 - factor);
      if (strength === 0) continue;
      const slowReach = towerCoverage.get(placed) ?? new Set<number>();
      for (const other of c.state.placedTowers) {
        const oRole = c.lookupRole(other.towerId);
        if (oRole !== 'dps-single' && oRole !== 'dps-splash') continue;
        const ot = c.lookupTower(other.towerId);
        if (!ot) continue;
        const otherReach = towerCoverage.get(other) ?? new Set<number>();
        let overlap = 0;
        for (const cellKey of slowReach) {
          if (otherReach.has(cellKey)) overlap++;
        }
        const dpsPerSec = ot.damage * 1000 / Math.max(ot.fireRate, 1);
        total += strength * dpsPerSec * overlap;
      }
    }
    return total;
  }
}

/** Path-cell coverage set per tower. Returns Map<placedTower → Set<cellKey>>.
 *  Cell key = row * 1000 + col. */
function computeCoverage(c: ScorerContext): Map<PlacedTower, Set<number>> {
  const out = new Map<PlacedTower, Set<number>>();
  for (const placed of c.state.placedTowers) {
    const t: TowerType | null = c.lookupTower(placed.towerId);
    if (!t) continue;
    const r2 = t.range * t.range;
    const set = new Set<number>();
    for (const path of c.pathGeometries) {
      for (const p of path) {
        const dc = p.col - placed.col;
        const dr = p.row - placed.row;
        if (dc * dc + dr * dr <= r2) set.add(p.row * 1000 + p.col);
      }
    }
    out.set(placed, set);
  }
  return out;
}
