/**
 * DpsCoverageScorer — δ·sum(path-cells-in-range × effective-DPS).
 *
 * For every placed DPS tower, count path cells within range and
 * multiply by the tower's effective DPS. Sums across all placed
 * single-target + splash damage towers. Aura, slow, wall, utility,
 * and unknown roles contribute 0 (other scorer modules cover them).
 *
 * Two trait-aware adjustments to the raw DPS:
 *   1. expires_after_waves (Infernal Imp): the tower vanishes after
 *      N waves, so its lifetime contribution is `min(N, horizon) /
 *      horizon` of a permanent tower's. With horizon=10, an Imp
 *      (4 waves) contributes 40% — still strong enough to be picked
 *      early when budget is tight, fades naturally late-game when the
 *      planner wants long-run value.
 *   2. jackpot (Void Gambler/Oblivion): adds an instakill % chance
 *      per hit. Effective extra damage ≈ chance × representative HP.
 *      Without this, all 5 Void towers look identical to the planner
 *      (same role, similar damage); jackpot is the trait that makes
 *      Gambler distinctly worth its 15g.
 */
import { ContributionScorer, ScorerContext } from './types';
import { hasTrait } from '../../../traits/Trait';

/** Plan horizon (in waves). Tied to a standard 20-wave match length, not
 *  the beam search's `waves` knob — the planner reasons about which
 *  towers will pay off across the *match*, not just the next few beam
 *  steps. Used to discount expiring towers: a 4-wave Imp under a 20-wave
 *  horizon contributes 20% of a permanent tower's coverage. With Imp's
 *  17.1 raw DPS × 0.2 = 3.4 effective vs Hellfire's 23.3, the planner
 *  prefers Hellfire — but Imp is still picked early when budget can't
 *  afford a 45g Hellfire (cheap × short-life still beats nothing). Swap
 *  to ScorerContext-plumbed in v3.1 so brain-search can tune per cell. */
const PLAN_HORIZON_WAVES = 20;

/** Representative creep HP for the jackpot expected-damage uplift.
 *  100 ≈ mid-game normal creep HP; chosen so a 4% jackpot adds ~4
 *  effective damage per hit (Gambler 20→24), 15% adds ~15 (Oblivion
 *  80→95). Constant rather than wave-aware because the planner reasons
 *  about layout shape, not wave timing. */
const JACKPOT_REPRESENTATIVE_HP = 100;

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

interface DpsTower {
  range: number;
  damage: number;
  fireRate: number;
  traits: { id: string; [k: string]: unknown }[];
}

/** Path cells within `tower.range` × effective DPS, where effective DPS
 *  bakes in jackpot (instakill chance × representative HP) and the
 *  expiring-tower lifespan factor. */
function dpsCoverageForTower(
  tower: DpsTower,
  col: number, row: number,
  pathGeoms: { col: number; row: number }[][],
): number {
  const r2 = tower.range * tower.range;
  const baseDamage = tower.damage;
  // Jackpot uplift: chance × representative HP added to per-hit damage.
  // Trait shape: { id: 'jackpot', chance: 0.04 } (Void Gambler).
  const jackpot = tower.traits.find(t => t.id === 'jackpot') as { chance?: number } | undefined;
  const jackpotChance = jackpot?.chance ?? 0;
  const effectiveDamage = baseDamage + jackpotChance * JACKPOT_REPRESENTATIVE_HP;
  const dpsPerSec = effectiveDamage * 1000 / Math.max(tower.fireRate, 1);
  // Expiring-tower lifespan factor. Trait shape: { id: 'expires_after_waves', waves: 4 }.
  const expires = tower.traits.find(t => t.id === 'expires_after_waves') as { waves?: number } | undefined;
  const lifespanFactor = expires?.waves
    ? Math.min(expires.waves, PLAN_HORIZON_WAVES) / PLAN_HORIZON_WAVES
    : 1;
  let covered = 0;
  for (const path of pathGeoms) {
    for (const p of path) {
      const dc = p.col - col;
      const dr = p.row - row;
      if (dc * dc + dr * dr <= r2) covered++;
    }
  }
  return covered * dpsPerSec * lifespanFactor;
}

void hasTrait;
