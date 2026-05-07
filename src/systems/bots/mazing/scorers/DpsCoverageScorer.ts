/**
 * DpsCoverageScorer — δ·sum(path-cells-in-range × DPS-per-second).
 *
 * For every placed DPS tower, count path cells within range and
 * multiply by the tower's effective DPS. Sums across all placed
 * single-target + splash damage towers. Aura, slow, wall, utility,
 * and unknown roles contribute 0 (other scorer modules cover them).
 *
 * Migrated from v2's per-tower role switch inside scoreState that
 * read `getTowerRole(t) === 'dps-single' || 'dps-splash'` and called
 * the inline `dpsCoverage` helper. Same math.
 */
import { ContributionScorer, ScorerContext } from './types';

export class DpsCoverageScorer implements ContributionScorer {
  readonly id = 'dps_coverage';

  contribute(c: ScorerContext): number {
    let total = 0;
    for (const placed of c.state.placedTowers) {
      const t = c.lookupTower(placed.towerId);
      if (!t) continue;
      const role = c.lookupRole(placed.towerId);
      if (role !== 'dps-single' && role !== 'dps-splash') continue;
      total += dpsCoverageForTower(t, placed.col, placed.row, c.pathGeometries);
    }
    return total;
  }

  breakdown(c: ScorerContext): Record<string, number> {
    const out: Record<string, number> = {};
    for (const placed of c.state.placedTowers) {
      const t = c.lookupTower(placed.towerId);
      if (!t) continue;
      const role = c.lookupRole(placed.towerId);
      if (role !== 'dps-single' && role !== 'dps-splash') continue;
      const key = `${placed.col},${placed.row}:${placed.towerId}`;
      out[key] = dpsCoverageForTower(t, placed.col, placed.row, c.pathGeometries);
    }
    return out;
  }
}

/** Path cells within `tower.range` × tower DPS-per-second.
 *  Range is in tile units; coordinates are tile units; r² compare. */
function dpsCoverageForTower(
  tower: { range: number; damage: number; fireRate: number },
  col: number, row: number,
  pathGeoms: { col: number; row: number }[][],
): number {
  const r2 = tower.range * tower.range;
  const dpsPerSec = tower.damage * 1000 / Math.max(tower.fireRate, 1);
  let covered = 0;
  for (const path of pathGeoms) {
    for (const p of path) {
      const dc = p.col - col;
      const dr = p.row - row;
      if (dc * dc + dr * dr <= r2) covered++;
    }
  }
  return covered * dpsPerSec;
}
