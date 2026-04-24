/**
 * BalancedBrain — a hand-crafted, role-aware, path-scoring brain.
 *
 * Design from the "dumb but alive" upgrade plan:
 *   1. Classify tower pool by role (wall / dps-single / dps-splash /
 *      slow / aura / utility) via `getTowerRole()`.
 *   2. Phase state machine:
 *        building-maze: prioritise wall placements that extend the
 *                       creep path. Falls back to DPS if no wall
 *                       improves the path (zone saturated).
 *        filling-dps:   place damage towers in cells that cover the
 *                       most path cells with their range.
 *        upgrading:     hand off to driver (future upgrade support).
 *        panic:         lives < PANIC_LIVES — pivot to slow/AOE.
 *   3. Score-based cell selection:
 *        wall: path-length gain (from MazePlanner).
 *        dps:  # of path cells within the tower's range.
 *        slow: same as dps but weighted higher when panicking.
 *
 * Explicitly NOT doing (yet):
 *   - Upgrades. Driver will support later — stub phase present.
 *   - Wave reactivity. Role choice ignores wave composition for now;
 *     a future wave-aware brain can subclass or replace this.
 *   - Creep-type specialisation (anti-armor, anti-flying).
 */
import { BotBrain, BotContext, BotDecision, Cell, registerBrain } from '../BotBrain';
import { TowerType } from '../../../data/TowerTypes';
import { TowerRole, groupByRole } from '../../../data/TowerRoles';
import { PathPoint } from '../../Pathfinding';
import { bestMazeCell, pathCellsWithinRange } from '../MazePlanner';
import { rng } from '../../Rng';

type Phase = 'building-maze' | 'filling-dps' | 'panic';

const PANIC_LIVES = 5;
/** Stop trying to maze once further walls produce ≤ this gain. We
 *  could keep pushing but diminishing returns hit fast and DPS
 *  fills are usually more valuable from that point on. */
const MAZE_SATURATION_THRESHOLD = 0;
/** Maze-building is preferred for early rounds — after this many
 *  successful placements, favour DPS even if more wall gain exists.
 *  Keeps bots from endlessly re-mazing their zone at the expense
 *  of actual damage output. */
const MAX_WALL_PLACEMENTS = 8;

export class BalancedBrain implements BotBrain {
  readonly name = 'Balanced';

  private grouped: Record<TowerRole, TowerType[]> = {
    'wall': [], 'dps-single': [], 'dps-splash': [],
    'slow': [], 'aura': [], 'utility': [],
  };
  private wallsPlaced = 0;

  init(ctx: BotContext): void {
    this.grouped = groupByRole(ctx.towerPool);
    this.wallsPlaced = 0;
  }

  decide(ctx: BotContext): BotDecision {
    // Meta-economy pass: between waves, prefer investing in
    // permanent income (frontier) or tempo-shifting sends before
    // committing to another tower. Roughly mirrors how a competent
    // human plays 1v1 — you don't blow every coin on walls when
    // frontier buildings pay dividends every round after.
    //
    // GATE: only consider meta once this bot has a fighting
    // footprint on the board. Without this the 70% meta roll on
    // wave 0 could fire before the bot placed its first tower,
    // leaving the zone defenceless through the entire first wave.
    // "Fighting" = at least one non-wall tower (actual damage
    // output), so placing a single wall then buying frontier
    // doesn't count.
    if (ctx.betweenWaves && this.hasFightingTower(ctx)) {
      const meta = this.decideMeta(ctx);
      if (meta.kind !== 'skip') return meta;
    }

    const phase = this.pickPhase(ctx);

    // Phase dispatch. Each phase returns a decision or 'skip'; if a
    // phase can't act (zone saturated, no affordable tower of the
    // right role), fall through to the next-best phase. Upgrades
    // are considered before falling through to 'skip' — a bot that
    // can't place should still level up what it already has.
    let primary: BotDecision;
    switch (phase) {
      case 'building-maze': {
        const d = this.decideMaze(ctx);
        primary = d.kind === 'place' ? d : this.decideDps(ctx);
        break;
      }
      case 'panic': {
        const d = this.decidePanic(ctx);
        primary = d.kind === 'place' ? d : this.decideDps(ctx);
        break;
      }
      case 'filling-dps':
      default:
        primary = this.decideDps(ctx);
    }

    if (primary.kind === 'place') return primary;

    const upgrade = this.decideUpgrade(ctx);
    if (upgrade.kind === 'upgrade') return upgrade;

    // Last resort: when we own towers but nothing we can usefully
    // upgrade or place, sell the weakest to free up budget. Gated
    // tightly — we only sell if we have no candidateCells AND can't
    // upgrade AND own enough towers to spare one.
    if (ctx.candidateCells.length === 0 && ctx.placedTowers.length >= 3) {
      const sell = this.decideSell(ctx);
      if (sell.kind === 'sell') return sell;
    }

    return { kind: 'skip' };
  }

  /** Between-wave meta-economy: 40% frontier, 30% send, 30% fall
   *  through to tower decisions. We only commit to a meta purchase
   *  when it fits the budget and (for sends) the wave is late
   *  enough that sending back matters. Frontier has priority
   *  because income compounds — a frontier building bought on wave
   *  3 pays out for every remaining wave. */
  private decideMeta(ctx: BotContext): BotDecision {
    const roll = rng();
    const wantFrontier = roll < 0.4;
    const wantSend = roll >= 0.4 && roll < 0.7;

    if (wantFrontier && ctx.frontierOptions.length > 0) {
      // Pick the cheapest affordable frontier building with the
      // best income/cost ratio — a simple heuristic that favours
      // fast-payoff buildings in early waves.
      const affordable = ctx.frontierOptions.filter(o => o.cost <= ctx.budget);
      if (affordable.length > 0) {
        affordable.sort((a, b) => (b.income / b.cost) - (a.income / a.cost));
        return { kind: 'frontier', buildingId: affordable[0].id };
      }
    }

    if (wantSend && ctx.sendOptions.length > 0) {
      // Pick the most expensive unlocked send we can afford — bigger
      // sends pressure the opponent more per gold spent than spamming
      // the cheapest tier.
      const affordable = ctx.sendOptions.filter(o => o.unlocked && o.cost <= ctx.budget);
      if (affordable.length > 0) {
        affordable.sort((a, b) => b.cost - a.cost);
        return { kind: 'send', sendOptionId: affordable[0].id };
      }
    }

    return { kind: 'skip' };
  }

  // ===== Phase selection =====

  private pickPhase(ctx: BotContext): Phase {
    if (ctx.lives > 0 && ctx.lives <= PANIC_LIVES) return 'panic';
    if (this.wallsPlaced < MAX_WALL_PLACEMENTS) return 'building-maze';
    return 'filling-dps';
  }

  // ===== Phase handlers =====

  /** Place a wall in the cell that most extends the creep path.
   *  Scores across all spawners' paths so bots on circle maps
   *  correctly credit walls that only slow their own spawner. */
  private decideMaze(ctx: BotContext): BotDecision {
    const walls = this.affordable(this.grouped.wall, ctx.budget);
    if (walls.length === 0) return { kind: 'skip' };

    const best = bestMazeCell(ctx.grid, ctx.candidateCells, 30, ctx.allPaths);
    if (!best || best.gain <= MAZE_SATURATION_THRESHOLD) {
      this.wallsPlaced = MAX_WALL_PLACEMENTS;
      return { kind: 'skip' };
    }

    const type = walls[0];
    this.wallsPlaced++;
    return { kind: 'place', col: best.col, row: best.row, type };
  }

  /** Place a damage tower in the cell that covers the most path
   *  cells with its range. Prefers splash if affordable (better per
   *  coin in grouped creep waves). */
  private decideDps(ctx: BotContext): BotDecision {
    const splash = this.affordable(this.grouped['dps-splash'], ctx.budget);
    const single = this.affordable(this.grouped['dps-single'], ctx.budget);
    const pool = [...splash, ...single];
    if (pool.length === 0) return { kind: 'skip' };

    const paths = ctx.allPaths.filter((p): p is PathPoint[] => !!p && p.length > 0);
    if (paths.length === 0) return { kind: 'skip' };

    const pickedType = [...pool].sort((a, b) => b.cost - a.cost)[0];

    const scored = this.scoreDpsCells(ctx.candidateCells, paths, pickedType.range);
    if (scored.length === 0) return { kind: 'skip' };
    const best = scored[0];
    if (best.coverage === 0) return { kind: 'skip' };

    return { kind: 'place', col: best.col, row: best.row, type: pickedType };
  }

  /** Panic mode: place a slow (if affordable) in the cell that
   *  covers the most path cells. Slows buy time for humans to
   *  reinforce. Falls through to DPS if no slow is affordable. */
  private decidePanic(ctx: BotContext): BotDecision {
    const slows = this.affordable(this.grouped.slow, ctx.budget);
    if (slows.length === 0) return { kind: 'skip' };
    const paths = ctx.allPaths.filter((p): p is PathPoint[] => !!p && p.length > 0);
    if (paths.length === 0) return { kind: 'skip' };
    const type = slows[0];
    const scored = this.scoreDpsCells(ctx.candidateCells, paths, type.range);
    if (scored.length === 0 || scored[0].coverage === 0) return { kind: 'skip' };
    return { kind: 'place', col: scored[0].col, row: scored[0].row, type };
  }

  /** Pick an upgrade for the DPS tower that already covers the most
   *  path cells. Walls are deliberately skipped UNLESS they have a
   *  divergent DPS branch available — e.g. Bramble Hedge → Razor
   *  Bramble — in which case the branch becomes the best use of
   *  the upgrade budget. */
  private decideUpgrade(ctx: BotContext): BotDecision {
    const wallIds = new Set(this.grouped.wall.map(t => t.id));

    // Affordability: for wall towers with a branch, check the
    // CHEAPEST branch cost. For everything else, the default cost.
    const affordableOn = (p: typeof ctx.placedTowers[0]): number => {
      if (wallIds.has(p.towerId) && p.upgradeBranches.length > 0) {
        const branchCosts = p.upgradeBranches.map(id => p.branchUpgradeCosts[id] ?? Infinity);
        return Math.min(...branchCosts);
      }
      return p.upgradeCost;
    };

    const candidates = ctx.placedTowers.filter(p => {
      if (p.upgradeCost <= 0) return false;
      return affordableOn(p) <= ctx.budget;
    });
    if (candidates.length === 0) return { kind: 'skip' };

    // Branch path first: if any candidate is a wall tower with a
    // DPS branch available, pick the first branch. This covers
    // Bramble → Razor Bramble without hard-coding tower ids.
    for (const c of candidates) {
      if (wallIds.has(c.towerId) && c.upgradeBranches.length > 0) {
        return { kind: 'upgrade', col: c.col, row: c.row, branch: c.upgradeBranches[0] };
      }
    }

    // Otherwise the original behaviour — prefer non-wall DPS towers
    // and rank by path coverage.
    const nonWall = candidates.filter(p => !wallIds.has(p.towerId));
    const pool = nonWall.length > 0 ? nonWall : candidates;

    const paths = ctx.allPaths.filter((p): p is PathPoint[] => !!p && p.length > 0);
    if (paths.length === 0) return { kind: 'upgrade', col: pool[0].col, row: pool[0].row };

    const scored = pool.map(p => {
      let coverage = 0;
      for (const path of paths) coverage += pathCellsWithinRange(p, path, 4 * 28); // 4-tile default range
      return { ...p, coverage };
    });
    scored.sort((a, b) => b.coverage - a.coverage);
    const best = scored[0];
    return { kind: 'upgrade', col: best.col, row: best.row };
  }

  /** Sell the tower with the lowest path coverage — i.e. the one
   *  carrying the least weight. Only called when we're genuinely
   *  saturated and need to free gold for something bigger. */
  private decideSell(ctx: BotContext): BotDecision {
    const paths = ctx.allPaths.filter((p): p is PathPoint[] => !!p && p.length > 0);
    if (paths.length === 0 || ctx.placedTowers.length === 0) return { kind: 'skip' };
    const wallIds = new Set(this.grouped.wall.map(t => t.id));
    // Prefer to sell a wall over a DPS tower — walls are fungible
    // and lose all their value once the maze is reshuffled anyway.
    const walls = ctx.placedTowers.filter(p => wallIds.has(p.towerId));
    const pool = walls.length > 0 ? walls : ctx.placedTowers;
    const scored = pool.map(p => {
      let coverage = 0;
      for (const path of paths) coverage += pathCellsWithinRange(p, path, 4 * 28);
      return { ...p, coverage };
    });
    scored.sort((a, b) => a.coverage - b.coverage);
    const worst = scored[0];
    return { kind: 'sell', col: worst.col, row: worst.row };
  }

  // ===== Scoring helpers =====

  /** DPS coverage = total number of path cells within range,
   *  summed across all spawner paths. A tower that covers both
   *  player 1's and player 2's paths is more valuable than one
   *  that only covers a single path. */
  private scoreDpsCells(cells: Cell[], paths: PathPoint[][], range: number): { col: number; row: number; coverage: number }[] {
    const scored = cells.map(c => {
      let coverage = 0;
      for (const p of paths) coverage += pathCellsWithinRange(c, p, range);
      return { col: c.col, row: c.row, coverage };
    });
    scored.sort((a, b) => b.coverage - a.coverage);
    return scored;
  }

  /** Affordable slice of a pre-filtered pool, sorted cheapest-first.
   *  Assumes the input is already sorted by cost ascending (the
   *  driver does this in `addBot`). */
  private affordable(pool: TowerType[], budget: number): TowerType[] {
    return pool.filter(t => t.cost <= budget);
  }

  /** True once the bot owns at least one non-wall tower. Walls
   *  don't attack, so a zone with just walls has zero DPS — the
   *  meta-economy gate uses this to avoid buying frontier when
   *  the board would be defenceless. */
  private hasFightingTower(ctx: BotContext): boolean {
    if (ctx.placedTowers.length === 0) return false;
    const wallIds = new Set(this.grouped.wall.map(t => t.id));
    for (const p of ctx.placedTowers) {
      if (!wallIds.has(p.towerId)) return true;
    }
    return false;
  }

}

registerBrain('balanced', () => new BalancedBrain());
