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

/** Tunable knobs for the brain-search loop. Defaults preserve the
 *  historical hardcoded constants. */
export interface AOEFocusBrainParams {
  /** Max opening walls before we stop mazing and start placing DPS. */
  maxOpeningWalls: number;
  /** Cheap-DPS towers to lay down before saving for splash. */
  survivalFloorTowers: number;
  /** Lives ≤ this triggers an emergency cheap-DPS placement. */
  panicLives: number;
  /** AOE tower pick rule. See AOE_PICK_STRATEGIES.
   *    0 expensive       – most expensive affordable AOE (legacy)
   *    1 cheap           – cheapest AOE (volume)
   *    2 damage-per-cost – best damage / cost
   *    3 long-range      – longest range */
  aoePickStrategyIdx: number;
  /** Lives required before committing to the ultimate. */
  ultimateLivesThreshold: number;
  /** Towers placed required before committing to the ultimate. */
  ultimateMinTowers: number;
  /** Upgrade pick rule. See AOE_UPGRADE_STRATEGIES.
   *    0 compound – highest-level tower (legacy)
   *    1 spread   – lowest-level tower (broaden) */
  upgradeStrategyIdx: number;
}

export const DEFAULT_AOE_FOCUS_PARAMS: AOEFocusBrainParams = {
  maxOpeningWalls: 2,
  survivalFloorTowers: 1,
  panicLives: 10,
  aoePickStrategyIdx: 0,
  ultimateLivesThreshold: 15,
  ultimateMinTowers: 3,
  upgradeStrategyIdx: 0,
};

export const AOE_PICK_STRATEGIES = ['expensive', 'cheap', 'damage-per-cost', 'long-range'] as const;
export const AOE_UPGRADE_STRATEGIES = ['compound', 'spread'] as const;

function loadAOEFocusParamsFromEnv(): AOEFocusBrainParams {
  const raw = (typeof process !== 'undefined' && process.env)
    ? process.env.AOE_FOCUS_BRAIN_PARAMS : undefined;
  if (!raw) return DEFAULT_AOE_FOCUS_PARAMS;
  try {
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_AOE_FOCUS_PARAMS, ...parsed };
  } catch {
    return DEFAULT_AOE_FOCUS_PARAMS;
  }
}

export class AOEFocusBrain implements BotBrain {
  readonly name = 'AOE Focus';
  readonly params: AOEFocusBrainParams;

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

  constructor(params?: Partial<AOEFocusBrainParams>) {
    this.params = params ? { ...DEFAULT_AOE_FOCUS_PARAMS, ...params } : loadAOEFocusParamsFromEnv();
  }

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
    // Short opening maze — bend the path into a chokepoint where a
    // single mortar covers a long path strip.
    if (this.wallsPlaced < this.params.maxOpeningWalls) {
      const maze = this.decideMaze(ctx);
      if (maze.kind === 'place') return maze;
    }

    // Survival floor: at least N cheap DPS on the board before we
    // start saving for splash. Without it the first wave clips us.
    const dpsOwned = ctx.placedTowers.filter(p => !this.wallIds.has(p.towerId)).length;
    if (dpsOwned < this.params.survivalFloorTowers && this.cheapDps && ctx.budget >= this.cheapDps.cost) {
      const place = placeAtBestCoverage(ctx, this.cheapDps);
      if (place.kind === 'place') return place;
    }
    // Lives panic — drop a survival tower no matter what.
    if (ctx.lives < this.params.panicLives && this.cheapDps && ctx.budget >= this.cheapDps.cost) {
      const place = placeAtBestCoverage(ctx, this.cheapDps);
      if (place.kind === 'place') return place;
    }

    // Ultimate: only when survival floor + lives safe.
    if (
      !this.placedUltimate && this.ultimate &&
      ctx.lives >= this.params.ultimateLivesThreshold &&
      ctx.placedTowers.length >= this.params.ultimateMinTowers
    ) {
      if (ctx.budget >= this.ultimate.cost) {
        const place = placeAtBestCoverage(ctx, this.ultimate);
        if (place.kind === 'place') {
          this.placedUltimate = true;
          return place;
        }
      }
    }

    // Core loop: pick an AOE tower per the configured strategy.
    const aoeAffordable = this.aoePool.filter(t => t.cost <= ctx.budget);
    if (aoeAffordable.length > 0) {
      const pick = this.pickAOE(aoeAffordable);
      const place = placeAtBestCoverage(ctx, pick);
      if (place.kind === 'place') return place;
    }

    // Upgrade an existing AOE tower per the configured strategy.
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
      this.wallsPlaced = this.params.maxOpeningWalls;
      return { kind: 'skip' };
    }
    this.wallsPlaced++;
    return { kind: 'place', col: best.col, row: best.row, type: walls[0] };
  }

  /** Pick from the affordable AOE pool per the configured strategy.
   *  Pool is cost-sorted ascending (set up in init). */
  private pickAOE(pool: TowerType[]): TowerType {
    const strategy = AOE_PICK_STRATEGIES[
      Math.max(0, Math.min(AOE_PICK_STRATEGIES.length - 1, this.params.aoePickStrategyIdx))
    ] ?? 'expensive';
    switch (strategy) {
      case 'cheap': return pool[0];
      case 'damage-per-cost': {
        const sorted = [...pool].sort((a, b) =>
          (b.damage / Math.max(1, b.cost)) - (a.damage / Math.max(1, a.cost)));
        return sorted[0];
      }
      case 'long-range': {
        const sorted = [...pool].sort((a, b) => b.range - a.range);
        return sorted[0];
      }
      case 'expensive':
      default: return pool[pool.length - 1];
    }
  }

  private upgradeBestAOE(ctx: BotContext): BotDecision {
    const aoeIds = new Set(this.aoePool.map(t => t.id));
    const candidates = ctx.placedTowers.filter(p =>
      aoeIds.has(p.towerId) && p.upgradeCost > 0 && p.upgradeCost <= ctx.budget,
    );
    if (candidates.length === 0) return { kind: 'skip' };
    const strategy = AOE_UPGRADE_STRATEGIES[
      Math.max(0, Math.min(AOE_UPGRADE_STRATEGIES.length - 1, this.params.upgradeStrategyIdx))
    ] ?? 'compound';
    if (strategy === 'spread') {
      candidates.sort((a, b) => a.level - b.level); // lowest level first
    } else {
      candidates.sort((a, b) => b.level - a.level); // compound — highest level first
    }
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
