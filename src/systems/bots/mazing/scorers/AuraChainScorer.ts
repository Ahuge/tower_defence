/**
 * AuraChainScorer — multi-hop aura amplification graph score.
 *
 * v2's AuraAmplificationScorer captures one-hop adjacency:
 *   aura A buffs DPS B → contribution = A.strength × B.dps
 *
 * Harmonic's design rewards CHAINS: aura A buffs aura B which buffs
 * DPS C. The compound effect is multiplicative, not additive. v3
 * captures it by:
 *
 *   1. Build adjacency graph of placed towers (Cheby ≤ 1).
 *   2. For each placed DPS tower D:
 *        effective_dps_D = D.dps × product(1 + a.strength) over
 *                          all auras a within an N-hop chain
 *                          reaching D, where each hop's strength
 *                          is the SUM of buff/firerate components.
 *      The chain factor is the multi-hop product, capped to avoid
 *      unbounded growth.
 *   3. contribution += sum over D of (effective_dps_D - D.dps) ×
 *      D's path-coverage (the AMPLIFIED portion).
 *
 * Practically: places that build aura webs around DPS chokepoints
 * score very high. Single-aura placements get the same value as
 * v2 (one-hop). Stacking 2-3 auras around the same DPS earns
 * super-linear bonus.
 */
import { ContributionScorer, ScorerContext } from './types';
import { getTrait } from '../../../traits/Trait';
import { TowerType } from '../../../../data/TowerTypes';

const MAX_CHAIN_HOPS = 3;
const MAX_CHAIN_FACTOR = 4.0; // cap on (1 + sum) so chains don't blow up

export class AuraChainScorer implements ContributionScorer {
  readonly id = 'aura_chain';

  contribute(c: ScorerContext): number {
    // Build neighbour map (Cheby ≤ 1).
    const neighbours = new Map<number, number[]>();
    const towers = c.state.placedTowers;
    for (let i = 0; i < towers.length; i++) {
      neighbours.set(i, []);
    }
    for (let i = 0; i < towers.length; i++) {
      for (let j = 0; j < towers.length; j++) {
        if (i === j) continue;
        const a = towers[i], b = towers[j];
        if (Math.abs(a.col - b.col) <= 1 && Math.abs(a.row - b.row) <= 1) {
          neighbours.get(i)!.push(j);
        }
      }
    }

    // Precompute aura strength per tower (0 for non-aura).
    const auraStrength = towers.map(p => {
      const t = c.lookupTower(p.towerId);
      if (!t) return 0;
      const aura = getTrait(t.traits, 'adjacency_buff');
      if (!aura) return 0;
      const ada = aura as { damageMult?: number; fireRateMult?: number };
      const dmgMult = (ada.damageMult ?? 1) - 1;
      const frMult = 1 - (ada.fireRateMult ?? 1);
      return Math.max(0, dmgMult + frMult);
    });

    // For each DPS tower, BFS the aura graph collecting chain-strength.
    let total = 0;
    for (let dpsIdx = 0; dpsIdx < towers.length; dpsIdx++) {
      const role = c.lookupRole(towers[dpsIdx].towerId);
      if (role !== 'dps-single' && role !== 'dps-splash') continue;
      const dpsTower = c.lookupTower(towers[dpsIdx].towerId);
      if (!dpsTower) continue;
      const baseDps = dpsTower.damage * 1000 / Math.max(dpsTower.fireRate, 1);

      // Walk the chain — accumulate `1 + sum(strength)` over reachable
      // auras up to MAX_CHAIN_HOPS away. We walk BFS so cycles don't
      // double-count via a `seen` set.
      const seen = new Set<number>([dpsIdx]);
      let chainStrengthSum = 0;
      let frontier = [dpsIdx];
      for (let hop = 0; hop < MAX_CHAIN_HOPS && frontier.length > 0; hop++) {
        const nextFrontier: number[] = [];
        for (const node of frontier) {
          for (const neigh of neighbours.get(node) ?? []) {
            if (seen.has(neigh)) continue;
            seen.add(neigh);
            chainStrengthSum += auraStrength[neigh];
            // Continue chain only through aura towers.
            if (auraStrength[neigh] > 0) nextFrontier.push(neigh);
          }
        }
        frontier = nextFrontier;
      }
      if (chainStrengthSum === 0) continue;
      const chainFactor = Math.min(MAX_CHAIN_FACTOR, 1 + chainStrengthSum);
      const amplifiedDelta = baseDps * (chainFactor - 1);
      // Multiply by path-coverage of THIS DPS tower so we credit the
      // amplification only when the DPS actually fires at the path.
      const coverage = pathCoverage(dpsTower, towers[dpsIdx].col, towers[dpsIdx].row, c.pathGeometries);
      total += amplifiedDelta * coverage;
    }
    return total;
  }
}

function pathCoverage(t: TowerType, col: number, row: number, pathGeoms: { col: number; row: number }[][]): number {
  const r2 = t.range * t.range;
  let n = 0;
  for (const path of pathGeoms) {
    for (const p of path) {
      const dc = p.col - col;
      const dr = p.row - row;
      if (dc * dc + dr * dr <= r2) n++;
    }
  }
  return n;
}
