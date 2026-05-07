/**
 * AuraAmplificationScorer — ζ·sum(neighbour-DPS × aura-strength).
 *
 * For every placed aura tower, sum the DPS-per-second of its Cheby≤1
 * neighbours and multiply by the aura's combined strength
 * (damage-mult delta + fire-rate-mult delta).
 *
 * Migrated verbatim from v2's `auraAmplification` term. This is the
 * SINGLE-HOP version — captures one aura → one DPS adjacency. A v3
 * `AuraChainScorer` (M2) computes multi-hop amp→amp→DPS chains for
 * harmonic. Both can register; their contributions stack.
 */
import { ContributionScorer, ScorerContext, PlacedTower } from './types';
import { getTrait } from '../../../traits/Trait';
import { TowerType } from '../../../../data/TowerTypes';

export class AuraAmplificationScorer implements ContributionScorer {
  readonly id = 'aura_amplification';

  contribute(c: ScorerContext): number {
    let total = 0;
    for (const placed of c.state.placedTowers) {
      const role = c.lookupRole(placed.towerId);
      if (role !== 'aura') continue;
      const t = c.lookupTower(placed.towerId);
      if (!t) continue;
      total += auraAmpForTower(t, placed.col, placed.row, c.state.placedTowers, c.lookupTower);
    }
    return total;
  }
}

function auraAmpForTower(
  tower: TowerType,
  col: number, row: number,
  placed: PlacedTower[],
  lookupType: (id: string) => TowerType | null,
): number {
  const aura = getTrait(tower.traits, 'adjacency_buff');
  if (!aura) return 0;
  const ada = aura as { damageMult?: number; fireRateMult?: number };
  const dmgMult = (ada.damageMult ?? 1) - 1;
  const frMult = 1 - (ada.fireRateMult ?? 1);
  const strength = Math.max(0, dmgMult + frMult);
  if (strength === 0) return 0;
  let amplified = 0;
  for (const p of placed) {
    if (p.col === col && p.row === row) continue;
    if (Math.abs(p.col - col) > 1 || Math.abs(p.row - row) > 1) continue;
    const nt = lookupType(p.towerId);
    if (!nt) continue;
    const dpsPerSec = nt.damage * 1000 / Math.max(nt.fireRate, 1);
    amplified += dpsPerSec;
  }
  return amplified * strength;
}
