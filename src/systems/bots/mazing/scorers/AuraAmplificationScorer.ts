/**
 * AuraAmplificationScorer — ζ·sum(neighbour-DPS × aura-strength).
 *
 * For every placed aura tower, sum the effective-DPS uplift it grants
 * to towers within its `range`. Handles every aura trait shape we
 * have data for:
 *   - adjacency_buff       (Mech turret/titan, Mil commander):
 *                          {damagePercent, ratePercent} on Cheby≤1 cells.
 *   - damage_aura          (Harmonic Amplifier): {percent} on cells
 *                          within tower.range.
 *   - rate_aura            (Harmonic Quickener): {percent} fire-rate
 *                          uplift on cells within tower.range. For
 *                          small %, fire-rate shortening ≈ same
 *                          proportion of DPS uplift.
 *   - crit_aura            (Harmonic Critical Mass): {chance, multiplier}
 *                          → effective DPS uplift = chance × (mult - 1).
 *   - spell_amp            (Arcane buff): {bonus} on magic-damage
 *                          neighbours only.
 *   - overclock_buff       (Mech Mortar): {damageMult, fireRateMult}
 *                          on Cheby≤1 cells.
 *
 * Range-of-effect: adjacency_buff and overclock_buff use Chebyshev≤1
 * (the engine's adjacency convention). Harmonic's auras use the
 * tower's full `range` field. spell_amp uses Cheby≤1 (the tower's
 * own definition is grid-adjacent only).
 *
 * Excluded for now: range_aura (geometric — changes neighbour range,
 * not flat % multiplier), conduit_link (meta-aura linking other auras),
 * commander_aura (mobile-only, planner doesn't place mobile units).
 */
import { ContributionScorer, ScorerContext, PlacedTower } from './types';
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
  let total = 0;
  for (const trait of tower.traits) {
    total += contributionForTrait(
      trait as { id: string; [k: string]: unknown },
      tower, col, row, placed, lookupType,
    );
  }
  return total;
}

function contributionForTrait(
  trait: { id: string; [k: string]: unknown },
  ownerTower: TowerType,
  col: number, row: number,
  placed: PlacedTower[],
  lookupType: (id: string) => TowerType | null,
): number {
  switch (trait.id) {
    case 'adjacency_buff':
    case 'overclock_buff': {
      // Chebyshev≤1 effect, multiplicative damage + rate.
      const damageMult = (trait.damageMult as number | undefined) ?? (1 + (trait.damagePercent as number ?? 0));
      const fireRateMult = (trait.fireRateMult as number | undefined) ?? (1 - (trait.ratePercent as number ?? 0));
      const strength = Math.max(0, (damageMult - 1) + (1 - fireRateMult));
      if (strength === 0) return 0;
      return sumNeighbourDps(col, row, 1, placed, lookupType) * strength;
    }
    case 'damage_aura': {
      // tower.range effect, additive % to neighbour damage.
      const percent = (trait.percent as number | undefined) ?? 0;
      if (percent <= 0) return 0;
      return sumNeighbourDpsWithinRange(col, row, ownerTower.range, placed, lookupType) * percent;
    }
    case 'rate_aura': {
      // tower.range effect, % fire-rate uplift ≈ same % DPS uplift for small %.
      const percent = (trait.percent as number | undefined) ?? 0;
      if (percent <= 0) return 0;
      return sumNeighbourDpsWithinRange(col, row, ownerTower.range, placed, lookupType) * percent;
    }
    case 'crit_aura': {
      // tower.range effect, expected damage uplift = chance × (mult - 1).
      const chance = (trait.chance as number | undefined) ?? 0;
      const multiplier = (trait.multiplier as number | undefined) ?? 1;
      const strength = chance * Math.max(0, multiplier - 1);
      if (strength === 0) return 0;
      return sumNeighbourDpsWithinRange(col, row, ownerTower.range, placed, lookupType) * strength;
    }
    case 'spell_amp': {
      // Cheby≤1 effect, only buffs magic-damage neighbours.
      const bonus = (trait.bonus as number | undefined) ?? 0;
      if (bonus === 0) return 0;
      return sumNeighbourDpsFiltered(col, row, 1, placed, lookupType, t => t.damageType === 'magic') * bonus;
    }
    default:
      return 0;
  }
}

/** Sum of DPS-per-second of every placed tower within Chebyshev≤chebyshev
 *  of (col, row), excluding the source cell itself. */
function sumNeighbourDps(
  col: number, row: number, chebyshev: number,
  placed: PlacedTower[],
  lookupType: (id: string) => TowerType | null,
): number {
  let total = 0;
  for (const p of placed) {
    if (p.col === col && p.row === row) continue;
    if (Math.abs(p.col - col) > chebyshev || Math.abs(p.row - row) > chebyshev) continue;
    const nt = lookupType(p.towerId);
    if (!nt) continue;
    total += nt.damage * 1000 / Math.max(nt.fireRate, 1);
  }
  return total;
}

/** Sum of DPS-per-second of placed towers within Euclidean `range` tiles.
 *  Used for harmonic-style auras that affect a radius rather than a
 *  Chebyshev-1 shell. */
function sumNeighbourDpsWithinRange(
  col: number, row: number, range: number,
  placed: PlacedTower[],
  lookupType: (id: string) => TowerType | null,
): number {
  const r2 = range * range;
  let total = 0;
  for (const p of placed) {
    if (p.col === col && p.row === row) continue;
    const dc = p.col - col, dr = p.row - row;
    if (dc * dc + dr * dr > r2) continue;
    const nt = lookupType(p.towerId);
    if (!nt) continue;
    total += nt.damage * 1000 / Math.max(nt.fireRate, 1);
  }
  return total;
}

/** Like sumNeighbourDps but applies a filter predicate to the
 *  neighbour tower (e.g. spell_amp only buffs magic damage). */
function sumNeighbourDpsFiltered(
  col: number, row: number, chebyshev: number,
  placed: PlacedTower[],
  lookupType: (id: string) => TowerType | null,
  filter: (t: TowerType) => boolean,
): number {
  let total = 0;
  for (const p of placed) {
    if (p.col === col && p.row === row) continue;
    if (Math.abs(p.col - col) > chebyshev || Math.abs(p.row - row) > chebyshev) continue;
    const nt = lookupType(p.towerId);
    if (!nt) continue;
    if (!filter(nt)) continue;
    total += nt.damage * 1000 / Math.max(nt.fireRate, 1);
  }
  return total;
}
