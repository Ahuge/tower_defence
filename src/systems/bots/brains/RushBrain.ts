/**
 * RushBrain — greedy cheap-DPS spammer. Counterpart to BalancedBrain.
 *
 * Philosophy:
 *   - Never saves for an ultimate. Every coin becomes a tower now.
 *   - Never buys frontier. Early income is wasted gold while the
 *     first wave is killing you.
 *   - Short maze phase (3 walls max) — just enough to bend the
 *     path. Beyond that every cell should be shooting.
 *   - Prefers cheap high-fire-rate DPS. Cost/DPS ratio wins over
 *     big splash towers for the hypothesis this brain is testing.
 *   - Only upgrades once the candidate-cell set is empty.
 *
 * Intended to out-perform BalancedBrain on swarm-aggressive factions
 * (Aliens — Spitter/Stinger; Infernal — Imp; Nature — Bramble) where
 * the save-for-ult pause is actively harmful.
 */
import { BotBrain, BotContext, BotDecision, registerBrain } from '../BotBrain';
import { TowerType } from '../../../data/TowerTypes';
import { TowerRole, groupByRole } from '../../../data/TowerRoles';
import { PathPoint } from '../../Pathfinding';
import { bestMazeCell, pathCellsWithinRange } from '../MazePlanner';
import { hasTrait } from '../../traits/Trait';

const MAX_WALLS = 3;

export class RushBrain implements BotBrain {
  readonly name = 'Rush';

  private grouped: Record<TowerRole, TowerType[]> = {
    'wall': [], 'dps-single': [], 'dps-splash': [],
    'slow': [], 'aura': [], 'utility': [],
  };
  private wallsPlaced = 0;
  private wallIds: Set<string> = new Set();
  private mobileUnits: TowerType[] = [];

  init(ctx: BotContext): void {
    this.grouped = groupByRole(ctx.towerPool);
    this.wallsPlaced = 0;
    this.wallIds = new Set(this.grouped.wall.map(t => t.id));
    this.mobileUnits = ctx.towerPool.filter(t => hasTrait(t.traits, 'mobile_unit'));
  }

  decide(ctx: BotContext): BotDecision {
    // No meta-economy pass. No save-for-ultimate. Straight into
    // placements, then upgrades as fallback.

    // Tiny maze phase — 3 walls is enough to bend the path; more
    // is wasted gold that should be shooting things.
    if (this.wallsPlaced < MAX_WALLS) {
      const maze = this.decideMaze(ctx);
      if (maze.kind === 'place') return maze;
    }

    const dps = this.decideDps(ctx);
    if (dps.kind === 'place') return dps;

    // Candidate grid is saturated — fall back to upgrades so the
    // budget isn't sitting idle. Rush philosophy: every coin works.
    const upgrade = this.decideUpgrade(ctx);
    if (upgrade.kind === 'upgrade') return upgrade;

    return { kind: 'skip' };
  }

  private decideMaze(ctx: BotContext): BotDecision {
    const walls = this.grouped.wall.filter(t => t.cost <= ctx.budget);
    if (walls.length === 0) return { kind: 'skip' };
    const best = bestMazeCell(ctx.grid, ctx.candidateCells, 30, ctx.allPaths);
    if (!best || best.gain <= 0) {
      this.wallsPlaced = MAX_WALLS;
      return { kind: 'skip' };
    }
    this.wallsPlaced++;
    return { kind: 'place', col: best.col, row: best.row, type: walls[0] };
  }

  /** Pick the tower with the best damage-per-coin ratio in our
   *  budget, then place it where it covers the most path cells.
   *  Mobile units are scored by proximity-to-path. */
  private decideDps(ctx: BotContext): BotDecision {
    const pool = [
      ...this.grouped['dps-single'],
      ...this.grouped['dps-splash'],
      ...this.mobileUnits,
    ].filter(t => t.cost <= ctx.budget);
    if (pool.length === 0) return { kind: 'skip' };

    const paths = ctx.allPaths.filter((p): p is PathPoint[] => !!p && p.length > 0);
    if (paths.length === 0) return { kind: 'skip' };

    // Rush heuristic: pick the tower with the best damage-per-coin
    // adjusted for fire rate. dps = damage * (1000 / fireRate).
    // efficiency = dps / cost.
    const scored = pool.map(t => {
      const dps = t.damage * 1000 / Math.max(1, t.fireRate);
      return { type: t, eff: dps / Math.max(1, t.cost) };
    }).sort((a, b) => b.eff - a.eff);
    const pick = scored[0].type;

    const isMobile = hasTrait(pick.traits, 'mobile_unit');
    const cells = ctx.candidateCells.map(c => {
      if (isMobile) {
        let minDist = Infinity;
        for (const p of paths) for (const pt of p) {
          const dx = pt.col - c.col, dy = pt.row - c.row;
          const d = dx * dx + dy * dy;
          if (d < minDist) minDist = d;
        }
        return { col: c.col, row: c.row, score: minDist === Infinity ? 0 : 1000 - Math.round(minDist) };
      }
      let coverage = 0;
      for (const p of paths) coverage += pathCellsWithinRange(c, p, pick.range);
      return { col: c.col, row: c.row, score: coverage };
    }).sort((a, b) => b.score - a.score);

    if (cells.length === 0 || cells[0].score === 0) return { kind: 'skip' };
    return { kind: 'place', col: cells[0].col, row: cells[0].row, type: pick };
  }

  private decideUpgrade(ctx: BotContext): BotDecision {
    const candidates = ctx.placedTowers.filter(p => p.upgradeCost > 0 && p.upgradeCost <= ctx.budget);
    if (candidates.length === 0) return { kind: 'skip' };
    // Prefer non-wall towers. Among those, upgrade the highest-level
    // one first — compound returns, since later upgrades scale
    // damage more than early ones.
    const nonWall = candidates.filter(p => !this.wallIds.has(p.towerId));
    const pool = nonWall.length > 0 ? nonWall : candidates;
    pool.sort((a, b) => b.level - a.level);
    return { kind: 'upgrade', col: pool[0].col, row: pool[0].row };
  }
}

registerBrain('rush', () => new RushBrain());
