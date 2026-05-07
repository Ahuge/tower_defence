/**
 * ChainLightningScorer — bonus per placed tower with chain damage.
 *
 * Trait: `chain_damage` (Mech Tesla, others) with shape:
 *   { chainCount: number, chainRange: number, falloff: number }
 *
 * Each shot fires at the primary target then bounces to up to
 * `chainCount` additional creeps within `chainRange`, each hit at
 * `falloff^k` damage where k is the bounce index.
 *
 * Effective DPS per tower ≈ baseDPS × bouncesValueFactor, where
 *   bouncesValueFactor = 1 + falloff + falloff² + ... + falloff^N
 *                      = (1 - falloff^(N+1)) / (1 - falloff)
 * with N = chainCount, valid only when there are creeps in the
 * chainRange to bounce to. We approximate "creeps available to bounce
 * to" as a function of how many path cells are within the chainRange
 * around the primary path cells the tower covers.
 *
 * Why a separate scorer? Chain damage is categorically different from
 * splash (which hits everyone in a radius simultaneously). Chain
 * shoots N+1 times sequentially, each at decaying damage. Modelling
 * it inside DpsCoverageScorer would conflate two mechanics.
 *
 * Active for Mech Tesla. Default-on at weight 0.05 (matched to
 * dpsCoverage). brain-search re-tunes per cell.
 */
import { ContributionScorer, ScorerContext } from './types';

interface ChainTower {
  range: number;
  damage: number;
  fireRate: number;
  traits: { id: string; [k: string]: unknown }[];
}

export class ChainLightningScorer implements ContributionScorer {
  readonly id = 'chain_lightning';

  contribute(c: ScorerContext): number {
    let total = 0;
    for (const placed of c.state.placedTowers) {
      const t = c.lookupTower(placed.towerId);
      if (!t) continue;
      total += chainContributionForTower(t, placed.col, placed.row, c.pathGeometries);
    }
    return total;
  }

  breakdown(c: ScorerContext): Record<string, number> {
    const out: Record<string, number> = {};
    for (const placed of c.state.placedTowers) {
      const t = c.lookupTower(placed.towerId);
      if (!t) continue;
      const v = chainContributionForTower(t, placed.col, placed.row, c.pathGeometries);
      if (v !== 0) {
        out[`${placed.col},${placed.row}:${placed.towerId}`] = v;
      }
    }
    return out;
  }
}

function chainContributionForTower(
  tower: ChainTower,
  col: number, row: number,
  pathGeoms: { col: number; row: number }[][],
): number {
  const trait = tower.traits.find(t => t.id === 'chain_damage') as
    { chainCount?: number; chainRange?: number; falloff?: number } | undefined;
  if (!trait) return 0;
  const chainCount = trait.chainCount ?? 0;
  const falloff = trait.falloff ?? 0.7;
  if (chainCount <= 0) return 0;

  // Path cells the tower can fire AT (its own range).
  const r2 = tower.range * tower.range;
  let pathCellsInRange = 0;
  for (const path of pathGeoms) {
    for (const p of path) {
      const dc = p.col - col, dr = p.row - row;
      if (dc * dc + dr * dr <= r2) pathCellsInRange++;
    }
  }
  if (pathCellsInRange === 0) return 0;

  // Geometric series of bounce damages: 1 + falloff + falloff² + ...
  // = (1 - falloff^(N+1)) / (1 - falloff). For falloff=0.7, N=2 →
  // 1 + 0.7 + 0.49 = 2.19 ≈ 2.2× base damage delivered per shot.
  let bounceFactor = 1;
  for (let k = 1; k <= chainCount; k++) bounceFactor += Math.pow(falloff, k);
  // Bounces only land if there are creeps to bounce to. Simplification:
  // assume on-path creep density is high enough that bounces find
  // targets (we'd need creep simulation to do better). Cap bonus at
  // (bounceFactor - 1) — i.e. only count the EXTRA damage from chains,
  // since the base hit is already in DpsCoverageScorer.
  const extraDamageFactor = bounceFactor - 1;
  const dpsPerSec = tower.damage * 1000 / Math.max(tower.fireRate, 1);
  return pathCellsInRange * dpsPerSec * extraDamageFactor;
}
