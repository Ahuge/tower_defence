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
import { BotBrain, BotContext, BotDecision, registerBrain } from '../BotBrain';
import { TowerType } from '../../../data/TowerTypes';
import { groupByRole } from '../../../data/TowerRoles';
import { PathPoint } from '../../Pathfinding';
import { pathCellsWithinRange } from '../MazePlanner';
import { hasTrait } from '../../traits/Trait';

export class GreedyBrain implements BotBrain {
  readonly name = 'Greedy';

  private pick: TowerType | null = null;

  init(ctx: BotContext): void {
    const grouped = groupByRole(ctx.towerPool);
    // Cheapest single-target DPS in the faction. If a faction has
    // no single-target tower (rare), fall back to splash, then any
    // non-wall, non-utility tower.
    const candidates =
      grouped['dps-single'].length > 0 ? grouped['dps-single'] :
      grouped['dps-splash'].length > 0 ? grouped['dps-splash'] :
      ctx.towerPool.filter(t => !hasTrait(t.traits, 'mobile_unit'));
    candidates.sort((a, b) => a.cost - b.cost);
    this.pick = candidates[0] ?? null;
  }

  decide(ctx: BotContext): BotDecision {
    if (!this.pick) return { kind: 'skip' };
    if (ctx.budget < this.pick.cost) return { kind: 'skip' };
    if (ctx.candidateCells.length === 0) return { kind: 'skip' };

    const paths = ctx.allPaths.filter((p): p is PathPoint[] => !!p && p.length > 0);
    if (paths.length === 0) return { kind: 'skip' };

    // Highest path-coverage cell wins. Pure deterministic placement,
    // no FP tie-break drift from MCTS scoring.
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

    if (bestCoverage <= 0) return { kind: 'skip' };
    return { kind: 'place', col: bestCol, row: bestRow, type: this.pick };
  }
}

registerBrain('greedy', () => new GreedyBrain());
