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
    const phase = this.pickPhase(ctx);

    // Phase dispatch. Each phase returns a decision or 'skip'; if a
    // phase can't act (zone saturated, no affordable tower of the
    // right role), fall through to the next-best phase.
    switch (phase) {
      case 'building-maze': {
        const d = this.decideMaze(ctx);
        if (d.kind === 'place') return d;
        return this.decideDps(ctx); // fallback
      }
      case 'panic': {
        const d = this.decidePanic(ctx);
        if (d.kind === 'place') return d;
        return this.decideDps(ctx);
      }
      case 'filling-dps':
      default:
        return this.decideDps(ctx);
    }
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

}

registerBrain('balanced', () => new BalancedBrain());
