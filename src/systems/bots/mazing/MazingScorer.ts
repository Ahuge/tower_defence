/**
 * MazingScorer — public API the brain uses for cell selection.
 *
 * Wraps `AdversarialBeam.runBeam` with a wave-based cache so the
 * expensive beam search only runs when the situation has materially
 * changed (wave advanced OR the bot has placed up to the cached
 * plan's tail). Cross-bot grid mutations don't trigger replan — Circle
 * Co-op zones are isolated and a 3-bot lobby would otherwise replan
 * on every other bot's placement.
 *
 * v2 phase 3: per-role queries. `bestCell(ctx, towerType)` walks the
 * cached plan looking for an entry that matches the asked-for tower's
 * role — wall queries get wall cells, DPS queries get DPS cells, etc.
 * Falls back through tiers:
 *   1. exact tower-id match (the planner picked this exact tower for
 *      this cell — best fit)
 *   2. same-role match (any tower of the same role — spatial
 *      reasoning generalises across the role)
 *   3. type-fallback null (nothing role-compatible) — caller's
 *      wishlist falls down to the next tower
 *
 * Per-bot vs per-scene: each bot owns its own `MazingScorer` instance
 * so caches don't cross-pollute (different zones in Circle Co-op
 * produce different layouts even with identical grid versions).
 */
import { Grid } from '../../Grid';
import { PathPoint } from '../../Pathfinding';
import { Cell, BotContext } from '../BotBrain';
import { runBeam, BeamOptions, BeamResult, DEFAULT_BEAM_OPTIONS, PlacedTower } from './AdversarialBeam';
import { TowerType } from '../../../data/TowerTypes';
import { TowerRole, getTowerRole } from '../../../data/TowerRoles';
import { hasTrait } from '../../traits/Trait';

export interface MazingScorerOptions extends BeamOptions {
  /** Confidence floor for the wishlist veto. v2 compares the cell's
   *  *role-relative* rank against the rest of the plan — a cell at
   *  rank 0 in its role bucket has confidence 1, the last cell in
   *  its role bucket approaches 0. Below this floor we return null
   *  so the brain's wishlist falls through to the next tower.
   *
   *  Tuning notes: 0 = always accept (no veto), 1 = only accept the
   *  rank-0 role-bucket cell. brain-search will land here. */
  confidenceFloor: number;
}

export const DEFAULT_MAZING_OPTIONS: MazingScorerOptions = {
  ...DEFAULT_BEAM_OPTIONS,
  confidenceFloor: 0.4,
};

export interface CellPick {
  col: number;
  row: number;
  /** Position in the cached plan's full ordering. 0 = top priority. */
  planRank: number;
  /** Position within the cell's role bucket. 0 = best-of-role. */
  roleRank: number;
  /** The role this pick was scored for. */
  role: TowerRole;
  /** Match strength — 'exact' when the planner picked this exact
   *  tower-id; 'role' when any same-role tower fits; 'fallback' when
   *  no role match exists and we've defaulted to rank-0. */
  match: 'exact' | 'role' | 'fallback';
}

export class MazingScorer {
  /** Last cached plan. Null until the first `bestCell()` call
   *  triggers planning. */
  private cachedPlan: BeamResult | null = null;
  /** Per-role plan buckets, derived from `cachedPlan.bestPlan` and
   *  `ctx.towerPool` lookup. Lazily populated on first bestCell call
   *  per cache generation; reset whenever the plan replans. */
  private roleBuckets: Map<TowerRole, PlacedTower[]> | null = null;
  private cacheWave: number = -1;
  private readonly opts: MazingScorerOptions;

  constructor(opts: Partial<MazingScorerOptions> = {}) {
    this.opts = { ...DEFAULT_MAZING_OPTIONS, ...opts };
  }

  /** Force a re-plan on the next `bestCell()` call. */
  invalidate(): void {
    this.cacheWave = -1;
    this.cachedPlan = null;
    this.roleBuckets = null;
  }

  /** Ask for the best placement cell for a specific tower. Returns
   *  null when the wishlist veto fires (no role-compatible cell at
   *  acceptable confidence). The brain handles null by walking down
   *  its tower preference list.
   *
   *  Match priority:
   *    1. Same `towerId` placed at this cell in the plan (exact)
   *    2. Same role placed at this cell (role-fallback)
   *    3. None of the above → null (caller wishlist advances)
   *
   *  The exact-vs-role distinction matters when the brain's tower
   *  pick differs from the planner's greedy/random pick — e.g. the
   *  planner placed a Sniper at a high-coverage cell, but the brain
   *  is asking for a Mortar (counter-pick to upcoming swarm). The
   *  spatial reasoning still applies (the cell IS a high-coverage
   *  cell for any single-target DPS), so we accept the role match. */
  bestCell(ctx: BotContext, tower: TowerType | null = null): CellPick | null {
    this.ensurePlan(ctx);
    const plan = this.cachedPlan?.bestPlan;
    if (!plan || plan.length === 0) return null;

    // Build the candidate-allowed lookup once per call.
    const allowed = new Set<number>();
    for (const c of ctx.candidateCells) allowed.add(this.cellKey(c));

    // Tower-less query (legacy v1 path): return rank-0 plan cell that's
    // still in the allowed pool. Used by code that doesn't yet know
    // about per-role queries (e.g. unspecified-role fallbacks).
    if (!tower) {
      for (let i = 0; i < plan.length; i++) {
        const entry = plan[i];
        if (!allowed.has(this.cellKey(entry))) continue;
        const confidence = 1 - (i / plan.length);
        if (confidence < this.opts.confidenceFloor) return null;
        const role = this.lookupRole(entry.towerId, ctx.towerPool);
        return {
          col: entry.col, row: entry.row,
          planRank: i, roleRank: 0, role, match: 'fallback',
        };
      }
      return null;
    }

    const askedRole = getTowerRole(tower);
    const buckets = this.getRoleBuckets(ctx.towerPool);

    // Tier 1: exact tower-id match. Walk plan in priority order; first
    // entry whose towerId === tower.id AND is in allowed wins.
    for (let i = 0; i < plan.length; i++) {
      const entry = plan[i];
      if (entry.towerId !== tower.id) continue;
      if (!allowed.has(this.cellKey(entry))) continue;
      const roleRank = this.indexInBucket(buckets, askedRole, entry);
      const confidence = 1 - (roleRank / Math.max(1, buckets.get(askedRole)?.length ?? 1));
      if (confidence < this.opts.confidenceFloor) return null;
      return {
        col: entry.col, row: entry.row,
        planRank: i, roleRank, role: askedRole, match: 'exact',
      };
    }

    // Tier 2: same-role match. Walk the role bucket in priority order;
    // first allowed cell wins.
    const bucket = buckets.get(askedRole) ?? [];
    for (let r = 0; r < bucket.length; r++) {
      const entry = bucket[r];
      if (!allowed.has(this.cellKey(entry))) continue;
      const confidence = 1 - (r / bucket.length);
      if (confidence < this.opts.confidenceFloor) return null;
      const planIdx = plan.indexOf(entry);
      return {
        col: entry.col, row: entry.row,
        planRank: planIdx >= 0 ? planIdx : r,
        roleRank: r, role: askedRole, match: 'role',
      };
    }

    // Tier 3: no role match. Wishlist veto — caller falls through.
    return null;
  }

  /** Diagnostics: returns the latest plan + score history. */
  getCachedPlan(): BeamResult | null {
    return this.cachedPlan;
  }

  /** Force role-bucket rebuild (mostly for tests). */
  resetRoleBuckets(): void {
    this.roleBuckets = null;
  }

  /** Replan iff the wave has advanced since the last cached plan.
   *
   *  The earlier "placements-outpace-plan" trigger forced mid-wave
   *  replans which caused the brain to second-guess earlier
   *  placements made under a now-stale plan: tower 1 was placed for
   *  plan-v1's logic but now operates inside plan-v2's structure.
   *  Wave-only invalidation makes sequential execution match the
   *  plan's intent — the brain follows ONE plan all the way through
   *  a wave, falls back to the parent's coverage scorer when the plan
   *  runs out of cells, and only re-plans on the next wave start.
   *
   *  Cross-bot grid mutations don't invalidate either — Circle Co-op
   *  zones are isolated. */
  private ensurePlan(ctx: BotContext): void {
    if (this.cachedPlan && ctx.wave === this.cacheWave) return;
    const paths = pathSegmentsFor(ctx);
    if (paths.length === 0) {
      this.cachedPlan = {
        bestPlan: [], scoreHistory: [], finalBeam: [],
        bestRoleScore: { 'wall': 0, 'dps-single': 0, 'dps-splash': 0, 'slow': 0, 'aura': 0, 'utility': 0 },
      };
    } else {
      // Mobile-unit towers don't sit on grid cells — they wander from
      // their placement spot, so spatial reasoning about position is
      // meaningless. Filter those out of the long-term plan; the brain
      // places them reactively via the wishlist fallback.
      // Self-expiring towers (Infernal Imp) are NOT filtered — they're
      // strong early-game and the score function downweights their
      // contribution by remaining lifespan vs plan horizon (see
      // ExpiringTowerScorer in scorers/), so they fade out naturally
      // late-game without needing a hard exclude.
      const planPool = ctx.towerPool.filter(t => !hasTrait(t.traits, 'mobile_unit'));
      this.cachedPlan = runBeam(ctx.grid, ctx.candidateCells, paths, planPool, this.opts);
    }
    this.cacheWave = ctx.wave;
    this.roleBuckets = null;
  }

  /** Bucket the cached plan by role. Lazy — only built on first
   *  per-role bestCell query. Keyed by towerPool for the role lookup;
   *  re-derived on every plan reset. */
  private getRoleBuckets(pool: TowerType[]): Map<TowerRole, PlacedTower[]> {
    if (this.roleBuckets) return this.roleBuckets;
    const buckets = new Map<TowerRole, PlacedTower[]>();
    const plan = this.cachedPlan?.bestPlan ?? [];
    for (const entry of plan) {
      const role = this.lookupRole(entry.towerId, pool);
      if (!buckets.has(role)) buckets.set(role, []);
      buckets.get(role)!.push(entry);
    }
    this.roleBuckets = buckets;
    return buckets;
  }

  private indexInBucket(buckets: Map<TowerRole, PlacedTower[]>, role: TowerRole, entry: PlacedTower): number {
    const bucket = buckets.get(role) ?? [];
    return bucket.indexOf(entry);
  }

  private lookupRole(towerId: string, pool: TowerType[]): TowerRole {
    const t = pool.find(p => p.id === towerId);
    if (t) return getTowerRole(t);
    // Synthetic wall fallback path — when no tower pool was provided
    // to the planner, the synthetic wall stub doesn't appear in the
    // brain's pool. Treat as wall for role-bucket purposes.
    return 'wall';
  }

  private cellKey(c: Cell): number {
    return c.row * 1000 + c.col;
  }
}

/** Derive the (start, end) segments the BFS scorer measures. Single-
 *  path maps just return [{entry, exit}]. Multi-path maps provide
 *  their own paths via `ctx.allPaths`. */
function pathSegmentsFor(ctx: BotContext): { start: PathPoint; end: PathPoint }[] {
  const segs: { start: PathPoint; end: PathPoint }[] = [];
  if (ctx.allPaths && ctx.allPaths.length > 0) {
    for (const p of ctx.allPaths) {
      if (!p || p.length < 2) continue;
      segs.push({ start: p[0], end: p[p.length - 1] });
    }
    if (segs.length > 0) return segs;
  }
  if (ctx.grid.entry && ctx.grid.exit) {
    segs.push({ start: ctx.grid.entry, end: ctx.grid.exit });
  }
  return segs;
}

void Grid; // imported for type-completeness in interfaces
