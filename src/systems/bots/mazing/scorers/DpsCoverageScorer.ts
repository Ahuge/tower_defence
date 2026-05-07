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
 *      horizon` of a permanent tower's. With horizon=20, an Imp
 *      (4 waves) contributes 20% — still picked early when budget
 *      is tight, fades naturally late-game when the planner wants
 *      long-run value.
 *   2. jackpot (Void Gambler/Oblivion): per-hit roll for instakill
 *      (killChance) or whiff (missChance). Expected per-hit damage:
 *        E[dmg] = killChance × representativeHp
 *               + (1 - killChance - missChance) × damage
 *               + missChance × 0
 *      Boss case (1% effective on bosses since the trait quarters
 *      killChance vs isBoss creeps) handled via a weighted average
 *      with BOSS_FREQUENCY = 0.1. Representative HP 200 ≈ mid-late
 *      game normal-creep HP — that's the regime where Gambler's
 *      4% instakill is genuinely strong (a normal hit only chips
 *      200hp creeps, instakills clear them outright).
 */
import { ContributionScorer, ScorerContext } from './types';
import { hasTrait } from '../../../traits/Trait';

/** Plan horizon (in waves). Tied to a standard 20-wave match length, not
 *  the beam search's `waves` knob — the planner reasons about which
 *  towers will pay off across the *match*, not just the next few beam
 *  steps. Used to discount expiring towers: a 4-wave Imp under a 20-wave
 *  horizon contributes 20% of a permanent tower's coverage. */
const PLAN_HORIZON_WAVES = 20;

/** Representative creep HP for the jackpot expected-damage calculation.
 *  200 ≈ mid-late wave normal-creep HP; that's the regime where
 *  instakills genuinely matter (a 20-damage Gambler hit chips ~10% of
 *  the creep; an instakill clears 100%). */
const JACKPOT_NORMAL_HP = 200;
/** Representative boss HP. Bosses are ~10x normal at the same wave. */
const JACKPOT_BOSS_HP = 2000;
/** Fraction of hits that target a boss. Roughly 1 boss per ~10 normals
 *  in mid-game waves. Used as a mixing weight between normal/boss
 *  expected damage. */
const BOSS_FREQUENCY = 0.1;

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
 *  bakes in jackpot (instakill / whiff weighted across boss + normal)
 *  and the expiring-tower lifespan factor. */
function dpsCoverageForTower(
  tower: DpsTower,
  col: number, row: number,
  pathGeoms: { col: number; row: number }[][],
): number {
  const r2 = tower.range * tower.range;
  const effectiveDamage = expectedDamagePerHit(tower);
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

/** Expected per-hit damage, accounting for jackpot's instakill +
 *  whiff probability split. For non-jackpot towers this is just the
 *  raw `tower.damage`. For jackpot towers, the player's perception is
 *  driven by late-game outcomes (creeps with high HP get one-shot)
 *  rather than the average — but the planner still reasons in expected
 *  values, so we use representative HP constants that reflect that
 *  late-game regime. */
function expectedDamagePerHit(tower: DpsTower): number {
  const jackpot = tower.traits.find(t => t.id === 'jackpot') as
    { killChance?: number; missChance?: number } | undefined;
  if (!jackpot) return tower.damage;
  const killChance = jackpot.killChance ?? 0;
  const missChance = jackpot.missChance ?? 0;
  // Boss-case: TowerTraitHandlers quarters killChance for bosses.
  const bossKillChance = killChance * 0.25;
  const normalRegular = 1 - killChance - missChance;
  const bossRegular = 1 - bossKillChance - missChance;
  const eNormal =
    killChance * JACKPOT_NORMAL_HP +
    Math.max(0, normalRegular) * tower.damage;
  const eBoss =
    bossKillChance * JACKPOT_BOSS_HP +
    Math.max(0, bossRegular) * tower.damage;
  return (1 - BOSS_FREQUENCY) * eNormal + BOSS_FREQUENCY * eBoss;
}

void hasTrait;
