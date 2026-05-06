/**
 * MazingScorer — public API the brain uses for cell selection.
 *
 * Wraps `AdversarialBeam.runBeam` with a dirty-bit cache so the
 * expensive beam search only runs when the situation has materially
 * changed (grid mutated OR wave advanced). Per-decision queries are
 * cheap: just walk the cached plan and find the highest-priority
 * cell that's still in the brain's candidate pool and affordable.
 *
 * Cache key is intentionally simple — `Grid.version` (bumps on every
 * placeTower/removeTower) plus `ctx.wave`. Same versions = reuse the
 * plan. Different versions = re-run the beam. No hashing, no LRU,
 * no per-bot fancy bucketing. v1 wants correctness over efficiency;
 * if a follow-up profile shows we're replanning too often, this is
 * the place to layer in a hashed-grid + budget-bucket key.
 *
 * Per-bot vs per-scene: each bot owns its own `MazingScorer` instance
 * so caches don't cross-pollute (different zones in Circle Co-op
 * produce different layouts even with identical grid versions).
 */
import { Grid } from '../../Grid';
import { PathPoint } from '../../Pathfinding';
import { Cell, BotContext } from '../BotBrain';
import { runBeam, BeamOptions, BeamResult, DEFAULT_BEAM_OPTIONS } from './AdversarialBeam';

export interface MazingScorerOptions extends BeamOptions {
  /** Confidence floor — when the brain asks for a cell and the best
   *  candidate scores below `confidenceFloor` × bestHistorical, return
   *  null so the brain falls down its tower wishlist. v1 doesn't yet
   *  consume historical data — the floor compares the cell's plan
   *  position against the plan length (front of plan = high
   *  confidence, tail = low). brain-search will tune. */
  confidenceFloor: number;
}

export const DEFAULT_MAZING_OPTIONS: MazingScorerOptions = {
  ...DEFAULT_BEAM_OPTIONS,
  confidenceFloor: 0.4,
};

export interface CellPick {
  col: number;
  row: number;
  /** Position in the cached plan. 0 = top priority. Useful for
   *  diagnostics + the confidence-floor check. */
  planRank: number;
}

export class MazingScorer {
  /** Last cached plan, keyed by `(gridVersion, wave)`. Null until the
   *  first `bestCell()` call triggers planning. */
  private cachedPlan: BeamResult | null = null;
  private cacheGridVersion: number = -1;
  private cacheWave: number = -1;
  private readonly opts: MazingScorerOptions;

  constructor(opts: Partial<MazingScorerOptions> = {}) {
    this.opts = { ...DEFAULT_MAZING_OPTIONS, ...opts };
  }

  /** Force a re-plan on the next `bestCell()` call. Called rarely —
   *  the dirty-bit normally catches mutations on its own. Useful when
   *  the brain wants to manually invalidate (e.g. after losing a key
   *  tower to enemy fire). */
  invalidate(): void {
    this.cacheGridVersion = -1;
    this.cacheWave = -1;
    this.cachedPlan = null;
  }

  /** Public: ask for the best placement cell given the current
   *  context. Returns null when no plan cell qualifies — the brain
   *  should fall back to upgrading or skip.
   *
   *  v1 ignores the `_tower` argument (every "wall" looks the same).
   *  v2 will use it for role-weighted scoring + tower-aware mutations. */
  bestCell(ctx: BotContext, _tower: unknown = null): CellPick | null {
    this.ensurePlan(ctx);
    const plan = this.cachedPlan?.bestPlan;
    if (!plan || plan.length === 0) return null;

    // Build a quick lookup of currently-allowed cells. The bot's
    // candidate pool is the source of truth — it's already pre-
    // filtered for zone restrictions, walkability, and tower-
    // adjacency rules. A plan cell that isn't in this pool is no
    // longer placeable (someone built there, or the path moved
    // through it, or it became a noBuild) and we skip it.
    const allowed = new Set<number>();
    for (const c of ctx.candidateCells) allowed.add(this.cellKey(c));

    for (let i = 0; i < plan.length; i++) {
      const c = plan[i];
      if (!allowed.has(this.cellKey(c))) continue;
      const confidence = 1 - (i / plan.length);
      if (confidence < this.opts.confidenceFloor) return null;
      return { col: c.col, row: c.row, planRank: i };
    }
    return null;
  }

  /** Diagnostics: returns the latest plan + score history so callers
   *  (tests, debug overlays) can inspect what the beam produced. */
  getCachedPlan(): BeamResult | null {
    return this.cachedPlan;
  }

  /** Replan iff the grid version or wave has advanced since the
   *  last cached plan. Otherwise no-op. */
  private ensurePlan(ctx: BotContext): void {
    if (
      this.cachedPlan &&
      ctx.grid.version === this.cacheGridVersion &&
      ctx.wave === this.cacheWave
    ) {
      return;
    }
    const paths = pathSegmentsFor(ctx);
    if (paths.length === 0) {
      // No paths means the map state is invalid (or the bot has been
      // called pre-init). Don't waste a beam search on it; return
      // an empty plan that bestCell() naturally rejects.
      this.cachedPlan = { bestPlan: [], scoreHistory: [], finalBeam: [] };
    } else {
      this.cachedPlan = runBeam(ctx.grid, ctx.candidateCells, paths, this.opts);
    }
    this.cacheGridVersion = ctx.grid.version;
    this.cacheWave = ctx.wave;
  }

  private cellKey(c: Cell): number {
    // Cheap unique key for a cell within the 36×26 grid. 1000-mul
    // matches the AdversarialBeam containsCell heuristic so a grid
    // up to 999 cols stays unambiguous.
    return c.row * 1000 + c.col;
  }
}

/** Derive the (start, end) segments the BFS scorer measures. Single-
 *  path maps just return [{entry, exit}]. Multi-path maps (Circle
 *  Co-op with waypoint chains) provide their own paths via
 *  `ctx.allPaths`; we use the first/last point of each as the BFS
 *  endpoints — sufficient for length scoring even though the in-
 *  game pathfinder also visits waypoints. */
function pathSegmentsFor(ctx: BotContext): { start: PathPoint; end: PathPoint }[] {
  const segs: { start: PathPoint; end: PathPoint }[] = [];
  if (ctx.allPaths && ctx.allPaths.length > 0) {
    for (const p of ctx.allPaths) {
      if (!p || p.length < 2) continue;
      segs.push({ start: p[0], end: p[p.length - 1] });
    }
    if (segs.length > 0) return segs;
  }
  // Fallback: grid's default entry → exit.
  if (ctx.grid.entry && ctx.grid.exit) {
    segs.push({ start: ctx.grid.entry, end: ctx.grid.exit });
  }
  return segs;
}
