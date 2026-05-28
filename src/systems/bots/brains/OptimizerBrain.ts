/**
 * OptimizerBrain — wraps a base brain (default BalancedBrain) and
 * rewrites the *coordinate* of place decisions to come from a
 * pre-computed wall set W* (output of `scripts/maze-optimizer.mjs`).
 *
 * Why this exists:
 *   Hand-crafted brains converge to "blob at entrance" or "parallel
 *   rows" layouts. PPO inherits this prior from BC and can't escape.
 *   By cloning the optimizer's wall positions while keeping the
 *   base brain's tower-type / upgrade / economy choices, we hand
 *   PPO a maze-shaped starting policy and a fighting chance at a
 *   real zigzag.
 *
 * What it changes:
 *   - 'place' decisions: cell overridden to next unbuilt W* cell
 *     (priority = closest to current creep path; ties broken by
 *     entry-proximity).
 *   - All other decisions (upgrade / sell / send / frontier / skip):
 *     passthrough.
 *
 * Fall-through behaviour:
 *   When W* is exhausted (all walls already built), passes the
 *   base brain's original cell straight through. The brain then
 *   places freely — typically as econ towers or coverage padding.
 *
 * What it does NOT change:
 *   - Tower type selection (BalancedBrain still picks)
 *   - Whether to place vs upgrade vs save
 *   - Targeting / send timing
 *
 * Caveats:
 *   - W* is map-specific. Wrong map → wrapper falls through every
 *     placement (no W* cells match grid layout). Loud warning at
 *     init if zero W* cells are placeable.
 *   - The base brain might pick a cell the optimizer doesn't think
 *     is valuable. We override anyway — the brain wanted *a* wall,
 *     and the optimizer says where the best wall is.
 *   - Currently overrides ALL place decisions, including those
 *     where the brain wanted to place a DPS tower (not a wall).
 *     This is intentional: the optimizer outputs locations, not
 *     wall-vs-dps roles. The placed tower at an optimum cell will
 *     happen to function as a maze wall regardless of its type.
 */
import { BotBrain, BotContext, BotDecision, Cell, registerBrain } from '../BotBrain';
import { BalancedBrain } from './BalancedBrain';
import { PathPoint } from '../../Pathfinding';
import { getTowerRole } from '../../../data/TowerRoles';
import { TowerType } from '../../../data/TowerTypes';

/** A wall the optimizer says should exist. */
export interface OptimizerWall {
  col: number;
  row: number;
}

export interface OptimizerBrainOptions {
  /** Optimizer wall set (W*). When undefined, brain behaves as a
   *  pass-through to the inner brain. */
  targetWalls?: OptimizerWall[];
  /** Inner brain to delegate everything-but-position to. Default
   *  BalancedBrain. */
  inner?: BotBrain;
  /** Name shown in lobby/event log. Default 'optimizer'. */
  name?: string;
}

export class OptimizerBrain implements BotBrain {
  readonly name: string;
  private inner: BotBrain;
  private targetWalls: OptimizerWall[];
  /** Cells in W* keyed as "col,row" for O(1) lookup. */
  private targetSet: Set<string>;
  /** Cells in W* we've already placed at. Same key format. Public
   *  for diagnostic / telemetry use. */
  public builtSet: Set<string> = new Set();
  /** True once we've warned about W* not matching the map. */
  private warnedNoMatch: boolean = false;
  /** Telemetry: counts of how the wrapper handled each place decision. */
  public stats = { totalPlaces: 0, overridesByRole: 0, skipsByRole: 0, wExhausted: 0, overridden: 0 };

  constructor(opts: OptimizerBrainOptions = {}) {
    this.name = opts.name ?? 'optimizer';
    this.inner = opts.inner ?? new BalancedBrain();
    this.targetWalls = opts.targetWalls ?? [];
    this.targetSet = new Set(this.targetWalls.map(w => `${w.col},${w.row}`));
  }

  init(ctx: BotContext): void {
    if (this.inner.init) this.inner.init(ctx);
    if (this.targetWalls.length === 0) return;
    // Sanity check that at least some W* cells are legal placements.
    let legalCount = 0;
    for (const w of this.targetWalls) {
      if (ctx.grid.canPlaceTower(w.col, w.row)) legalCount++;
    }
    if (legalCount === 0 && !this.warnedNoMatch) {
      console.warn(`[OptimizerBrain] 0/${this.targetWalls.length} W* cells are placeable on this map. Wrapper will fall through every placement.`);
      this.warnedNoMatch = true;
    }
  }

  decide(ctx: BotContext): BotDecision {
    if (this.targetWalls.length === 0) {
      return this.inner.decide(ctx);
    }
    this.refreshBuiltSet(ctx);

    // Aggressive maze-first override: as long as W* still has
    // unbuilt cells AND we can afford the cheapest tower in the
    // pool, we INSERT a place decision at the next W* cell. This
    // overrides whatever the inner brain wanted to do (upgrade,
    // skip, save, place elsewhere) and forces maze construction.
    // The cheapest tower doubles as a wall (footprint) AND a token
    // damage source.
    //
    // Why this is correct for the "clone the optimizer" use case:
    //   The whole point is to teach the network "in this state,
    //   place at this cell." BC clones decisions, not strategies —
    //   so we need the decision distribution to BE maze placement.
    //   Letting the brain steer would mean BC learns the brain's
    //   distribution, not the optimizer's.
    //
    // What we still delegate to inner brain:
    //   - Once W* is exhausted (all walls built): fully delegate.
    //   - When we can't afford ANY tower: delegate (brain may pick
    //     upgrade / sell / send / skip).
    //
    // Caveat: tower type isn't optimized. We pick cheapest available
    // because (a) it maximises wall count per gold and (b) the
    // optimizer doesn't say what type goes where. Type choice is
    // PPO's job to refine.
    const cheapestType = this.findCheapestAffordableTower(ctx);
    const haveBudget = cheapestType !== null;

    const target = haveBudget ? this.pickBestTarget(ctx) : null;

    this.stats.totalPlaces++;
    if (target && cheapestType) {
      const key = `${target.col},${target.row}`;
      this.builtSet.add(key);
      this.stats.overridden++;
      return { kind: 'place', col: target.col, row: target.row, type: cheapestType };
    }
    if (!target && haveBudget) this.stats.wExhausted++;
    return this.inner.decide(ctx);
  }

  private findCheapestAffordableTower(ctx: BotContext): TowerType | null {
    // towerPool is already cost-sorted ASC by the driver.
    for (const t of ctx.towerPool) {
      if (t.cost <= ctx.budget) return t;
    }
    return null;
  }

  /** Like pickBestTarget but rejects W* cells that aren't within
   *  `rangeCells` of any creep-path cell. Used for DPS towers so
   *  they don't get stranded at distant W* cells before the maze
   *  is built. Same priority (proximity-to-path) so closer = better. */
  private pickInRangeTarget(ctx: BotContext, rangeCells: number): Cell | null {
    const pathCells = collectPathCells(ctx.allPaths);
    if (pathCells.length === 0) return null;

    let best: { col: number; row: number; dist: number } | null = null;
    for (const w of this.targetWalls) {
      const key = `${w.col},${w.row}`;
      if (this.builtSet.has(key)) continue;
      if (!ctx.grid.canPlaceTower(w.col, w.row)) continue;

      const dist = minEuclidean(w.col, w.row, pathCells);
      if (dist > rangeCells) continue; // out of range — DPS tower can't reach

      if (best === null || dist < best.dist) {
        best = { col: w.col, row: w.row, dist };
      }
    }
    return best ? { col: best.col, row: best.row } : null;
  }

  /** Update builtSet by scanning grid for towers on W* cells. The
   *  driver may have rejected a previous placement (e.g. cell got
   *  taken by another bot in shared-grid modes), so we trust the
   *  grid as source of truth. */
  private refreshBuiltSet(ctx: BotContext): void {
    const observed = new Set<string>();
    for (const w of this.targetWalls) {
      // Anything that can't accept a placement right now is treated
      // as "already built" so we don't keep re-picking it. Includes
      // towers, blocked, nobuild, entry/exit.
      if (!ctx.grid.canPlaceTower(w.col, w.row)) {
        observed.add(`${w.col},${w.row}`);
      }
    }
    this.builtSet = observed;
  }

  /** Pick the next W* cell to build at, ranked by Chebyshev
   *  distance to the nearest live creep-path cell. Closer = higher
   *  priority (block creeps where they actually walk).
   *
   *  Ties broken by entry-proximity using path index 0 as a proxy.
   *  Cells already built or not currently placeable are filtered. */
  private pickBestTarget(ctx: BotContext): Cell | null {
    const pathCells = collectPathCells(ctx.allPaths);
    if (pathCells.length === 0) return null;

    const entryCell = firstPathPoint(ctx.allPaths);

    let best: { col: number; row: number; dist: number; entryDist: number } | null = null;
    for (const w of this.targetWalls) {
      const key = `${w.col},${w.row}`;
      if (this.builtSet.has(key)) continue;
      if (!ctx.grid.canPlaceTower(w.col, w.row)) continue;

      const dist = minChebyshev(w.col, w.row, pathCells);
      const entryDist = entryCell ? chebyshev(w.col, w.row, entryCell.col, entryCell.row) : 0;

      if (best === null || dist < best.dist || (dist === best.dist && entryDist < best.entryDist)) {
        best = { col: w.col, row: w.row, dist, entryDist };
      }
    }
    return best ? { col: best.col, row: best.row } : null;
  }
}

function collectPathCells(allPaths: (PathPoint[] | null)[]): PathPoint[] {
  const out: PathPoint[] = [];
  for (const p of allPaths) {
    if (!p) continue;
    for (const pt of p) out.push(pt);
  }
  return out;
}

function firstPathPoint(allPaths: (PathPoint[] | null)[]): PathPoint | null {
  for (const p of allPaths) {
    if (p && p.length > 0) return p[0];
  }
  return null;
}

function chebyshev(c1: number, r1: number, c2: number, r2: number): number {
  return Math.max(Math.abs(c1 - c2), Math.abs(r1 - r2));
}

function minChebyshev(col: number, row: number, cells: { col: number; row: number }[]): number {
  let best = Infinity;
  for (const c of cells) {
    const d = chebyshev(col, row, c.col, c.row);
    if (d < best) best = d;
  }
  return best;
}

function minEuclidean(col: number, row: number, cells: { col: number; row: number }[]): number {
  let best = Infinity;
  for (const c of cells) {
    const dx = col - c.col, dy = row - c.row;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < best) best = d;
  }
  return best;
}

// Registry registration — default config (no W*) so generic
// `--brain=optimizer` works as a pass-through if no walls supplied.
// Callers that want real optimizer behaviour must construct directly
// with options or use the dedicated rollout script.
registerBrain('optimizer', () => new OptimizerBrain());
