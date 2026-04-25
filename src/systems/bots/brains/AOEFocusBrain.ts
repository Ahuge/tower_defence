/**
 * AOEFocusBrain — splash + aura specialist. Counterpart to RushBrain.
 *
 * Philosophy:
 *   - Lay a minimal cheap-DPS survival floor (1-2 towers) so wave 1
 *     doesn't leak.
 *   - Save aggressively for splash / chain / aura towers (tier-2 and
 *     tier-3 prices). Place them at maze chokepoints where they
 *     cover the densest path zone.
 *   - Few towers, high per-shot value. Compounds via upgrades on
 *     existing splash towers rather than spreading wide.
 *   - Buys ultimate when affordable AND lives are safe.
 *
 * Tower-pick rule: classify as "AOE" if role is 'dps-splash' OR
 * 'aura', OR the tower has any chain / pierce trait. If a faction
 * has no real AOE content, the brain still works but plays close
 * to a "save and upgrade" version of Balanced.
 *
 * Purpose in the harness: Rush optimises cost/DPS — that biases
 * toward cheap fast single-target towers and ignores the value of
 * killing 5 swarm creeps with one mortar shot. AOEFocus should
 * dominate Rush on swarm-count waves and lose to Rush on single-
 * boss waves; differential surfaces faction texture the existing
 * 4 brains miss.
 */
import { BotBrain, BotContext, BotDecision, registerBrain } from '../BotBrain';
import { TowerType } from '../../../data/TowerTypes';
import { TowerRole, getTowerRole, groupByRole } from '../../../data/TowerRoles';
import { PathPoint } from '../../Pathfinding';
import { bestMazeCell, pathCellsWithinRange } from '../MazePlanner';
import { hasTrait } from '../../traits/Trait';

const MAX_OPENING_WALLS = 2;
const SURVIVAL_FLOOR_TOWERS = 1;
const PANIC_LIVES = 10;

export class AOEFocusBrain implements BotBrain {
  readonly name = 'AOE Focus';

  private grouped: Record<TowerRole, TowerType[]> = {
    'wall': [], 'dps-single': [], 'dps-splash': [],
    'slow': [], 'aura': [], 'utility': [],
  };
  private wallIds: Set<string> = new Set();
  private aoePool: TowerType[] = [];
  private cheapDps: TowerType | null = null;
  private ultimate: TowerType | null = null;
  private wallsPlaced = 0;
  private placedUltimate = false;

  init(ctx: BotContext): void {
    this.grouped = groupByRole(ctx.towerPool);
    this.wallIds = new Set(this.grouped.wall.map(t => t.id));
    this.wallsPlaced = 0;
    this.placedUltimate = false;

    // AOE pool: splash + aura + chain/pierce-trait single-targets.
    // Cost-sorted ascending so afford-checks pick the smallest
    // affordable AOE first.
    this.aoePool = ctx.towerPool
      .filter(t => isAOE(t))
      .sort((a, b) => a.cost - b.cost);

    // Cheap DPS for the wave-1 survival floor.
    const cheap =
      this.grouped['dps-single'].length > 0 ? this.grouped['dps-single'] :
      this.grouped['dps-splash'];
    this.cheapDps = [...cheap].sort((a, b) => a.cost - b.cost)[0] ?? null;

    this.ultimate = ctx.towerPool.find(t => t.ultimate) ?? null;
  }

  decide(ctx: BotContext): BotDecision {
    // Short opening maze — 2 walls to bend the path into a chokepoint
    // where a single mortar covers a long path strip. More walls is
    // wasted gold we'd rather sink into the splash tower.
    if (this.wallsPlaced < MAX_OPENING_WALLS) {
      const maze = this.decideMaze(ctx);
      if (maze.kind === 'place') return maze;
    }

    // Survival floor: at least 1 cheap DPS on the board before we
    // start saving for splash. Without it the first wave clips us.
    const dpsOwned = ctx.placedTowers.filter(p => !this.wallIds.has(p.towerId)).length;
    if (dpsOwned < SURVIVAL_FLOOR_TOWERS && this.cheapDps && ctx.budget >= this.cheapDps.cost) {
      const place = placeAtBestCoverage(ctx, this.cheapDps);
      if (place.kind === 'place') return place;
    }
    // Lives panic — drop a survival tower no matter what.
    if (ctx.lives < PANIC_LIVES && this.cheapDps && ctx.budget >= this.cheapDps.cost) {
      const place = placeAtBestCoverage(ctx, this.cheapDps);
      if (place.kind === 'place') return place;
    }

    // Ultimate: only when survival floor + lives safe. Prevents
    // saving-into-loss on hard difficulty.
    if (!this.placedUltimate && this.ultimate && ctx.lives >= 15 && ctx.placedTowers.length >= 3) {
      if (ctx.budget >= this.ultimate.cost) {
        const place = placeAtBestCoverage(ctx, this.ultimate);
        if (place.kind === 'place') {
          this.placedUltimate = true;
          return place;
        }
      }
    }

    // Core loop: place the most expensive AOE tower we can afford.
    // Bigger AOE = bigger ROI on a tower built where the path
    // bends, so we prefer up-tier over multiple cheap copies.
    const aoeAffordable = this.aoePool.filter(t => t.cost <= ctx.budget);
    if (aoeAffordable.length > 0) {
      const pick = aoeAffordable[aoeAffordable.length - 1]; // max-cost we can afford
      const place = placeAtBestCoverage(ctx, pick);
      if (place.kind === 'place') return place;
    }

    // Compound returns: upgrade an existing AOE tower before buying
    // another cheap copy.
    const upgrade = this.upgradeBestAOE(ctx);
    if (upgrade.kind === 'upgrade') return upgrade;

    // Last resort: cheap DPS spam in any remaining cell.
    if (this.cheapDps && ctx.budget >= this.cheapDps.cost) {
      const place = placeAtBestCoverage(ctx, this.cheapDps);
      if (place.kind === 'place') return place;
    }

    return { kind: 'skip' };
  }

  private decideMaze(ctx: BotContext): BotDecision {
    const walls = this.grouped.wall.filter(t => t.cost <= ctx.budget);
    if (walls.length === 0) return { kind: 'skip' };
    const best = bestMazeCell(ctx.grid, ctx.candidateCells, 30, ctx.allPaths);
    if (!best || best.gain <= 0) {
      this.wallsPlaced = MAX_OPENING_WALLS;
      return { kind: 'skip' };
    }
    this.wallsPlaced++;
    return { kind: 'place', col: best.col, row: best.row, type: walls[0] };
  }

  private upgradeBestAOE(ctx: BotContext): BotDecision {
    const aoeIds = new Set(this.aoePool.map(t => t.id));
    const candidates = ctx.placedTowers.filter(p =>
      aoeIds.has(p.towerId) && p.upgradeCost > 0 && p.upgradeCost <= ctx.budget,
    );
    if (candidates.length === 0) return { kind: 'skip' };
    candidates.sort((a, b) => b.level - a.level); // compound — highest level first
    return { kind: 'upgrade', col: candidates[0].col, row: candidates[0].row };
  }
}

function isAOE(t: TowerType): boolean {
  const role = getTowerRole(t);
  if (role === 'dps-splash' || role === 'aura') return true;
  if (hasTrait(t.traits, 'chain_damage')) return true;
  if (hasTrait(t.traits, 'pierce')) return true;
  return false;
}

function placeAtBestCoverage(ctx: BotContext, type: TowerType): BotDecision {
  if (ctx.budget < type.cost) return { kind: 'skip' };
  if (ctx.candidateCells.length === 0) return { kind: 'skip' };
  const paths = ctx.allPaths.filter((p): p is PathPoint[] => !!p && p.length > 0);
  if (paths.length === 0) return { kind: 'skip' };

  let bestCol = -1, bestRow = -1, bestCoverage = -1;
  for (const c of ctx.candidateCells) {
    let coverage = 0;
    for (const p of paths) coverage += pathCellsWithinRange(c, p, type.range);
    if (coverage > bestCoverage) {
      bestCoverage = coverage;
      bestCol = c.col;
      bestRow = c.row;
    }
  }
  if (bestCoverage <= 0) return { kind: 'skip' };
  return { kind: 'place', col: bestCol, row: bestRow, type };
}

registerBrain('aoe_focus', () => new AOEFocusBrain());
