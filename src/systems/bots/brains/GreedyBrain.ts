/**
 * GreedyBrain — strict T1 single-target spam. The deterministic
 * stat-baseline brain.
 *
 * Philosophy:
 *   - Pick the single cheapest non-wall DPS tower in the faction
 *     pool at init. That's the ONLY tower this brain ever builds.
 *   - No mazing. No upgrades. No frontier. No sends. No ultimates.
 *   - Place at the highest-coverage candidate cell every decision.
 *   - When the candidate set is exhausted, skip — never falls back
 *     to upgrades or anything else.
 *
 * Purpose in the harness: when a tower-stat tweak moves the greedy
 * win-rate, it's a real arithmetic effect — not MCTS roulette from
 * the smarter brains rerouting their build. Use as a baseline anchor
 * to distinguish "the change made the cheapest tower stronger" from
 * "the change shifted brain heuristics into a different build". If
 * greedy and balanced both move in the same direction, real signal.
 */
import { BotBrain, BotContext, BotDecision, PlacedTower, registerBrain } from '../BotBrain';
import { TowerType } from '../../../data/TowerTypes';
import { groupByRole } from '../../../data/TowerRoles';
import { PathPoint } from '../../Pathfinding';
import { pathCellsWithinRange } from '../MazePlanner';
import { hasTrait } from '../../traits/Trait';

/** Tunable knobs for the brain-search loop. Defaults preserve the
 *  historical "cheapest single-target spam" behaviour. */
export interface GreedyBrainParams {
  /** Tower-pick strategy. See PICK_STRATEGIES.
   *    0 cheapest-single  – cheapest dps-single (legacy)
   *    1 damage-per-cost  – best damage/cost in dps-single + dps-splash
   *    2 fast-fire        – lowest fireRate in dps-single + dps-splash
   *    3 long-range       – longest range in dps-single + dps-splash */
  pickStrategyIdx: number;
  /** 0 = false, 1 = true. When 1, after candidate cells exhaust, the
   *  brain upgrades the highest-coverage tower it owns. Lets greedy
   *  scale into late-game without losing its "spam one tower" purity
   *  — same tower id, just more levels. */
  allowUpgrade: number;
}

export const DEFAULT_GREEDY_PARAMS: GreedyBrainParams = {
  pickStrategyIdx: 0,
  allowUpgrade: 0,
};

export const PICK_STRATEGIES = ['cheapest-single', 'damage-per-cost', 'fast-fire', 'long-range'] as const;

function loadGreedyParamsFromEnv(): GreedyBrainParams {
  const raw = (typeof process !== 'undefined' && process.env)
    ? process.env.GREEDY_BRAIN_PARAMS : undefined;
  if (!raw) return DEFAULT_GREEDY_PARAMS;
  try {
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_GREEDY_PARAMS, ...parsed };
  } catch {
    return DEFAULT_GREEDY_PARAMS;
  }
}

export class GreedyBrain implements BotBrain {
  readonly name = 'Greedy';
  readonly params: GreedyBrainParams;

  private pick: TowerType | null = null;

  constructor(params?: Partial<GreedyBrainParams>) {
    this.params = params ? { ...DEFAULT_GREEDY_PARAMS, ...params } : loadGreedyParamsFromEnv();
  }

  init(ctx: BotContext): void {
    const grouped = groupByRole(ctx.towerPool);
    const strategy = PICK_STRATEGIES[
      Math.max(0, Math.min(PICK_STRATEGIES.length - 1, this.params.pickStrategyIdx))
    ] ?? 'cheapest-single';

    if (strategy === 'cheapest-single') {
      // Legacy path — cheapest single-target DPS, narrow fallbacks.
      const candidates =
        grouped['dps-single'].length > 0 ? grouped['dps-single'] :
        grouped['dps-splash'].length > 0 ? grouped['dps-splash'] :
        ctx.towerPool.filter(t => !hasTrait(t.traits, 'mobile_unit'));
      candidates.sort((a, b) => a.cost - b.cost);
      this.pick = candidates[0] ?? null;
      return;
    }

    // For the alternative strategies, draw from both single + splash
    // since a non-cost ranking might prefer the splash tower's stats.
    const pool = [...grouped['dps-single'], ...grouped['dps-splash']]
      .filter(t => !hasTrait(t.traits, 'mobile_unit'));
    if (pool.length === 0) {
      this.pick = null;
      return;
    }
    if (strategy === 'damage-per-cost') {
      pool.sort((a, b) => (b.damage / Math.max(1, b.cost)) - (a.damage / Math.max(1, a.cost)));
    } else if (strategy === 'fast-fire') {
      pool.sort((a, b) => a.fireRate - b.fireRate);
    } else if (strategy === 'long-range') {
      pool.sort((a, b) => b.range - a.range);
    }
    this.pick = pool[0];
  }

  decide(ctx: BotContext): BotDecision {
    if (!this.pick) return { kind: 'skip' };

    // Try a placement first — same logic as the legacy brain.
    if (ctx.budget >= this.pick.cost && ctx.candidateCells.length > 0) {
      const paths = ctx.allPaths.filter((p): p is PathPoint[] => !!p && p.length > 0);
      if (paths.length === 0) return { kind: 'skip' };
      let bestCol = -1, bestRow = -1, bestCoverage = -1;
      for (const c of ctx.candidateCells) {
        let coverage = 0;
        for (const p of paths) coverage += pathCellsWithinRange(c, p, this.pick.range);
        if (coverage > bestCoverage) {
          bestCoverage = coverage;
          bestCol = c.col;
          bestRow = c.row;
        }
      }
      if (bestCoverage > 0) {
        return { kind: 'place', col: bestCol, row: bestRow, type: this.pick };
      }
    }

    // Optional upgrade pass — when allowUpgrade is on, after no
    // placements are possible, level up the highest-coverage tower.
    // Keeps the brain doing useful work in late-game when board is
    // saturated. Picks tower of the same `pick` type so the brain
    // stays "one-trick-pony" — never branches into other towers.
    if (this.params.allowUpgrade) {
      const owned = ctx.placedTowers.filter(p => p.towerId === this.pick!.id && p.upgradeCost > 0 && p.upgradeCost <= ctx.budget);
      if (owned.length > 0) {
        const paths = ctx.allPaths.filter((p): p is PathPoint[] => !!p && p.length > 0);
        let best: PlacedTower | null = null;
        let bestCoverage = -1;
        for (const t of owned) {
          let cov = 0;
          for (const p of paths) cov += pathCellsWithinRange(t, p, this.pick!.range);
          if (cov > bestCoverage) { bestCoverage = cov; best = t; }
        }
        if (best) return { kind: 'upgrade', col: best.col, row: best.row };
      }
    }

    return { kind: 'skip' };
  }
}

registerBrain('greedy', () => new GreedyBrain());
