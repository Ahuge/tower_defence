/**
 * SlowValueScorer — ε·sum(path-cells-in-range × slow-strength).
 *
 * For every placed slow tower, count path cells within range and
 * multiply by the slow's strength factor (where 1.0 = no slow,
 * 0.4 = 60% slow → strength 0.6).
 *
 * Migrated from v2's per-tower role switch (`role === 'slow'`) inside
 * scoreState. Same math. Note: this is the v2 "slow value" term —
 * a NEW scorer in v3 (M2) will compute slow×DPS overlap which captures
 * the actual synergy a slow creates with neighbouring DPS towers.
 * They're complementary; both can register.
 */
import { ContributionScorer, ScorerContext } from './types';
import { getTrait } from '../../../traits/Trait';

export class SlowValueScorer implements ContributionScorer {
  readonly id = 'slow_value';

  contribute(c: ScorerContext): number {
    let total = 0;
    for (const placed of c.state.placedTowers) {
      const role = c.lookupRole(placed.towerId);
      if (role !== 'slow') continue;
      const t = c.lookupTower(placed.towerId);
      if (!t) continue;
      total += slowValueForTower(t, placed.col, placed.row, c.pathGeometries);
    }
    return total;
  }
}

/** Path cells within `tower.range` × slow strength (where 1.0 - factor).
 *  Returns 0 if the tower has no slow_on_hit trait. */
function slowValueForTower(
  tower: { range: number; traits: { id: string; factor?: number }[] },
  col: number, row: number,
  pathGeoms: { col: number; row: number }[][],
): number {
  const slow = getTrait(tower.traits, 'slow_on_hit');
  if (!slow) return 0;
  const factor = (slow as { factor?: number }).factor ?? 0.5;
  const slowStrength = Math.max(0, Math.min(1, 1 - factor));
  const r2 = tower.range * tower.range;
  let covered = 0;
  for (const path of pathGeoms) {
    for (const p of path) {
      const dc = p.col - col;
      const dr = p.row - row;
      if (dc * dc + dr * dr <= r2) covered++;
    }
  }
  return covered * slowStrength;
}
