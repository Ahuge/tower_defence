/**
 * EconBrain — survival-first frontier-investment brain.
 *
 * Philosophy:
 *   1. SURVIVE FIRST. Never buy frontier or upgrade towers if the
 *      survival DPS floor is unmet. The user's note from spec:
 *      "It has to prioritize staying alive before building frontier
 *      otherwise it won't last 2 waves."
 *   2. Once survival is comfortable, redirect surplus into frontier
 *      buildings (cheap one first, then the expensive tier).
 *   3. After both frontier slots are filled, fall back to cheap DPS
 *      spam + upgrades — same as Greedy but with a much fatter
 *      gold pipe behind it.
 *
 * Survival heuristic: same DPS floor as UltimateBrain so the two
 * brains compare cleanly. Floor scales with wave number; lives
 * below 10 forces panic-spend.
 *
 * Purpose in the harness: validates Frontier balance. Currently
 * none of the four shipping brains lean into frontier, so frontier
 * cost / income tweaks register near-zero signal in the harness.
 * EconBrain creates a knob that frontier changes can actually move.
 */
import { BotBrain, BotContext, BotDecision, registerBrain } from '../BotBrain';
import { TowerType } from '../../../data/TowerTypes';
import { TowerRole, groupByRole } from '../../../data/TowerRoles';
import { PathPoint } from '../../Pathfinding';
import { pathCellsWithinRange } from '../MazePlanner';
import { hasTrait } from '../../traits/Trait';

const PANIC_LIVES = 10;
const SURVIVE_DPS_FLOOR = (wave: number) => Math.max(2, Math.min(6, 2 + Math.floor(wave / 4)));

export class EconBrain implements BotBrain {
  readonly name = 'Econ';

  private grouped: Record<TowerRole, TowerType[]> = {
    'wall': [], 'dps-single': [], 'dps-splash': [],
    'slow': [], 'aura': [], 'utility': [],
  };
  private cheapDps: TowerType | null = null;
  private wallIds: Set<string> = new Set();
  private boughtFrontiers: Set<string> = new Set();

  init(ctx: BotContext): void {
    this.grouped = groupByRole(ctx.towerPool);
    this.wallIds = new Set(this.grouped.wall.map(t => t.id));
    this.boughtFrontiers = new Set();

    const cheap =
      this.grouped['dps-single'].length > 0 ? this.grouped['dps-single'] :
      this.grouped['dps-splash'].length > 0 ? this.grouped['dps-splash'] :
      ctx.towerPool.filter(t => !hasTrait(t.traits, 'mobile_unit'));
    const sorted = [...cheap].sort((a, b) => a.cost - b.cost);
    this.cheapDps = sorted[0] ?? null;
  }

  decide(ctx: BotContext): BotDecision {
    if (!this.cheapDps) return { kind: 'skip' };

    const dpsOwned = ctx.placedTowers.filter(p => !this.wallIds.has(p.towerId)).length;
    const survivalFloor = SURVIVE_DPS_FLOOR(ctx.wave);
    const lowLives = ctx.lives < PANIC_LIVES;
    const belowFloor = dpsOwned < survivalFloor;

    // Survival gate. While unmet, this brain behaves like Greedy
    // (cheap DPS spam) and ignores frontier.
    if (belowFloor || lowLives) {
      const place = this.placeCheap(ctx);
      if (place.kind === 'place') return place;
      // Couldn't place this tick (no cells / no budget) — fall
      // through to upgrades to keep the sim moving, but never
      // frontier while we're below floor.
      const upgrade = this.upgradeBest(ctx);
      if (upgrade.kind === 'upgrade') return upgrade;
      return { kind: 'skip' };
    }

    // Survival comfortable. Buy frontier in cost order: cheap first
    // (gets payback rolling sooner), then the expensive one.
    if (ctx.betweenWaves) {
      const frontier = this.decideFrontier(ctx);
      if (frontier.kind === 'frontier') return frontier;
    }

    // Both frontier slots taken (or no frontier offered). Greedy
    // spam + upgrades with the surplus.
    const place = this.placeCheap(ctx);
    if (place.kind === 'place') return place;
    const upgrade = this.upgradeBest(ctx);
    if (upgrade.kind === 'upgrade') return upgrade;
    return { kind: 'skip' };
  }

  private decideFrontier(ctx: BotContext): BotDecision {
    if (ctx.frontierOptions.length === 0) return { kind: 'skip' };
    const sorted = [...ctx.frontierOptions].sort((a, b) => a.cost - b.cost);
    for (const opt of sorted) {
      if (this.boughtFrontiers.has(opt.id)) continue;
      if (opt.cost > ctx.budget) continue;
      this.boughtFrontiers.add(opt.id);
      return { kind: 'frontier', buildingId: opt.id };
    }
    return { kind: 'skip' };
  }

  private placeCheap(ctx: BotContext): BotDecision {
    if (!this.cheapDps) return { kind: 'skip' };
    if (ctx.budget < this.cheapDps.cost) return { kind: 'skip' };
    if (ctx.candidateCells.length === 0) return { kind: 'skip' };
    const paths = ctx.allPaths.filter((p): p is PathPoint[] => !!p && p.length > 0);
    if (paths.length === 0) return { kind: 'skip' };

    let bestCol = -1, bestRow = -1, bestCoverage = -1;
    for (const c of ctx.candidateCells) {
      let coverage = 0;
      for (const p of paths) coverage += pathCellsWithinRange(c, p, this.cheapDps.range);
      if (coverage > bestCoverage) {
        bestCoverage = coverage;
        bestCol = c.col;
        bestRow = c.row;
      }
    }
    if (bestCoverage <= 0) return { kind: 'skip' };
    return { kind: 'place', col: bestCol, row: bestRow, type: this.cheapDps };
  }

  private upgradeBest(ctx: BotContext): BotDecision {
    const candidates = ctx.placedTowers.filter(p =>
      !this.wallIds.has(p.towerId) && p.upgradeCost > 0 && p.upgradeCost <= ctx.budget,
    );
    if (candidates.length === 0) return { kind: 'skip' };
    candidates.sort((a, b) => b.level - a.level);
    return { kind: 'upgrade', col: candidates[0].col, row: candidates[0].row };
  }
}

registerBrain('econ', () => new EconBrain());
