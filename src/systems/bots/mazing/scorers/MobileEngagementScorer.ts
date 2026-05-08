/**
 * MobileEngagementScorer — leashed mobile-unit value based on path
 * density within engage + leash range from the spawn cell.
 *
 * v2's MazingBrain routes mobile units through scoreMobileCells
 * (parent class) which does proximity-to-path scoring. The planner
 * itself never modelled mobile units — it scored them as 0 for role
 * contributions. v3 adds an explicit term so the planner learns
 * "mobile unit at this cell will engage N path cells" and integrates
 * that into beam decisions.
 *
 * Formula:
 *   For each placed mobile-unit tower M:
 *     leash_cells = path cells within (engageRange + leashRange) tiles
 *     reachable_dps_seconds = leash_cells × M.dps × 0.5
 *       (the 0.5 factor accounts for travel time — a leashed unit
 *       can't be everywhere at once; it engages ~half its reachable
 *       path-cells over a wave)
 *   contribution = sum
 *
 * Captures: military Rifleman/Tank/Brawler/Commander, nature Viper —
 * mobile DPS that the v2 planner ignored.
 */
import { ContributionScorer, ScorerContext } from './types';
import { hasTrait, getTrait } from '../../../traits/Trait';
import { TowerType } from '../../../../data/TowerTypes';

const MOBILE_REACH_FACTOR = 0.5;

export class MobileEngagementScorer implements ContributionScorer {
  readonly id = 'mobile_engagement';

  contribute(c: ScorerContext): number {
    let total = 0;
    for (const placed of c.state.placedTowers) {
      const t: TowerType | null = c.lookupTower(placed.towerId);
      if (!t) continue;
      if (!hasTrait(t.traits, 'mobile_unit')) continue;
      const mobile = getTrait(t.traits, 'mobile_unit') as {
        engageRange?: number; leashRange?: number; attackCooldown?: number;
      };
      const engageRange = mobile.engageRange ?? 1;
      const leashRange = mobile.leashRange ?? 4;
      const reach = engageRange + leashRange;
      const r2 = reach * reach;
      let pathCellsInReach = 0;
      for (const path of c.pathGeometries) {
        for (const p of path) {
          const dc = p.col - placed.col;
          const dr = p.row - placed.row;
          if (dc * dc + dr * dr <= r2) pathCellsInReach++;
        }
      }
      // Mobile units use attackCooldown (ms) instead of fireRate.
      // Fall back to the tower's fireRate if mobile.attackCooldown is
      // missing.
      const cooldownMs = mobile.attackCooldown ?? t.fireRate ?? 1000;
      const dpsPerSec = t.damage * 1000 / Math.max(cooldownMs, 1);
      total += pathCellsInReach * dpsPerSec * MOBILE_REACH_FACTOR;
    }
    return total;
  }
}
