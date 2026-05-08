/**
 * WaveCounterScorer — bonus per placed tower based on how well its
 * traits counter the upcoming creep mix.
 *
 * The scorer reads `ctx.creepMix` (precomputed once per plan from
 * `ctx.upcomingWaves`) and gives each placed tower a counter-effectiveness
 * uplift proportional to:
 *   - splash_damage trait against group/swarm/heavy/flying creeps
 *   - pierce_damage / damage_variance against heavy/shielded
 *   - slow_on_hit / barbed_wire against fast creeps
 *   - jackpot / damage_amp_on_hit against bosses (high HP makes
 *     instakill genuinely valuable)
 *   - chain_lightning against group spawns
 *
 * The bonus is scaled by tower's path coverage, so it only credits
 * towers that actually engage creeps. Empty mix (no upcoming waves) →
 * 0 contribution, behaviour-equivalent to the v3.2 plan.
 *
 * Why a separate scorer rather than baked into DpsCoverageScorer?
 * The counter terms are categorically different from raw DPS — they
 * scale with creep mix proportions rather than tower stats alone. A
 * splash-damage tower against a 90%-swarm wave is genuinely more
 * valuable than the same tower against 90%-single-spawn waves;
 * separating the two makes brain-search able to dial counter-weight
 * up on synergy-heavy cells (aliens, military) without distorting
 * raw-DPS tuning.
 */
import { ContributionScorer, ScorerContext } from './types';

interface CounterTower {
  range: number;
  damage: number;
  fireRate: number;
  traits: { id: string; [k: string]: unknown }[];
}

export class WaveCounterScorer implements ContributionScorer {
  readonly id = 'wave_counter';

  contribute(c: ScorerContext): number {
    if (c.creepMix.empty) return 0;
    let total = 0;
    for (const placed of c.state.placedTowers) {
      const t = c.lookupTower(placed.towerId);
      if (!t) continue;
      total += counterContributionForTower(t, placed.col, placed.row, c.pathGeometries, c.creepMix);
    }
    return total;
  }

  breakdown(c: ScorerContext): Record<string, number> {
    if (c.creepMix.empty) return {};
    const out: Record<string, number> = {};
    for (const placed of c.state.placedTowers) {
      const t = c.lookupTower(placed.towerId);
      if (!t) continue;
      const v = counterContributionForTower(t, placed.col, placed.row, c.pathGeometries, c.creepMix);
      if (v !== 0) {
        out[`${placed.col},${placed.row}:${placed.towerId}`] = v;
      }
    }
    return out;
  }
}

function counterContributionForTower(
  tower: CounterTower,
  col: number, row: number,
  pathGeoms: { col: number; row: number }[][],
  mix: { heavyArmorShare: number; groupShare: number; flyingShare: number; bossShare: number; fastShare: number; avgHpScale: number },
): number {
  const hasSplash = tower.traits.some(t => t.id === 'splash_damage');
  const hasPierce = tower.traits.some(t => t.id === 'pierce_damage' || t.id === 'damage_variance');
  const hasSlow = tower.traits.some(t => t.id === 'slow_on_hit' || t.id === 'barbed_wire');
  const hasJackpot = tower.traits.some(t => t.id === 'jackpot');
  const hasAmp = tower.traits.some(t => t.id === 'damage_amp_on_hit');
  const hasChain = tower.traits.some(t => t.id === 'chain_lightning');

  // Quick exit when the tower has no counter-relevant trait.
  if (!hasSplash && !hasPierce && !hasSlow && !hasJackpot && !hasAmp && !hasChain) return 0;

  // Path coverage proxy — a counter trait only matters if the tower
  // actually shoots creeps. Same r² + path-cell walk as DpsCoverage.
  const r2 = tower.range * tower.range;
  let pathCells = 0;
  for (const path of pathGeoms) {
    for (const p of path) {
      const dc = p.col - col;
      const dr = p.row - row;
      if (dc * dc + dr * dr <= r2) pathCells++;
    }
  }
  if (pathCells === 0) return 0;

  // Counter terms — each is `share × dpsRate × pathCells × multiplier`.
  // The multipliers reflect how strong the counter is in practice
  // (splash vs swarm doubles effective damage; jackpot vs boss is
  // capped at quartered-killChance per the trait handler).
  const dpsRate = tower.damage * 1000 / Math.max(tower.fireRate, 1);
  let bonus = 0;
  if (hasSplash) {
    bonus += mix.groupShare * pathCells * dpsRate * 0.8;
    bonus += mix.heavyArmorShare * pathCells * dpsRate * 0.4;
    bonus += mix.flyingShare * pathCells * dpsRate * 0.5;
  }
  if (hasPierce) {
    bonus += mix.heavyArmorShare * pathCells * dpsRate * 0.5;
  }
  if (hasSlow) {
    bonus += mix.fastShare * pathCells * dpsRate * 0.6;
  }
  if (hasJackpot || hasAmp) {
    // High-HP creeps amplify per-hit-bonus traits. Boss share goes
    // through jackpot's quartered-killChance so it scales smaller.
    bonus += mix.bossShare * pathCells * dpsRate * 0.3 * mix.avgHpScale;
  }
  if (hasChain) {
    bonus += mix.groupShare * pathCells * dpsRate * 0.6;
  }
  return bonus;
}
