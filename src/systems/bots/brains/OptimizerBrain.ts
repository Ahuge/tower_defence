/**
 * OptimizerBrain — wraps a base brain and rewrites placement decisions
 * so the agent learns to build a maze in the shape of W* (output of
 * `scripts/maze-optimizer.mjs`).
 *
 * Why this exists:
 *   Hand-crafted brains converge to "blob at entrance" or "parallel
 *   rows" layouts. PPO inherits this prior from BC and can't escape.
 *   By cloning the optimizer's wall positions while randomising cell
 *   order + tower type, we hand PPO a maze-shaped starting policy
 *   with enough entropy to avoid a deterministic-collapse failure.
 *
 * v2 changes (after observing BC-from-v1 collapse to a single maze
 * with all `tower 0` placements):
 *   - Top-K randomised cell selection (deterministic per match via
 *     seeded RNG). Different matches build different orders even
 *     from a single W*.
 *   - Two-mode tower-type policy:
 *       (a) When inner brain wants to place (kind='place'): override
 *           POSITION only, keep inner's chosen TYPE. Inner brain's
 *           smart picks flow through.
 *       (b) When inner brain returns non-place but we're forcing
 *           a W* placement: pick a RANDOM affordable tower (not
 *           the cheapest). Spreads tower-type distribution in BC.
 *   - Wider tower-pool sampling: per-match RNG also drives type
 *     selection so the same match doesn't always pick the same
 *     type for cell #1.
 *
 * What it changes:
 *   - 'place' decisions: cell overridden to a top-K W* candidate.
 *   - Non-place decisions: when W* has unbuilt cells AND budget
 *     allows the cheapest affordable tower, an INSERTED place
 *     decision replaces the inner brain's choice.
 *
 * Fall-through behaviour:
 *   When W* is exhausted (all walls already built), fully delegates
 *   to inner. Inner brain then does upgrades, DPS placement, sends,
 *   etc. unchanged.
 *
 * Caveats:
 *   - W* is map-specific. Wrong map → wrapper warns and falls through.
 *   - Random sampling is seeded per-match (via constructor `seed`);
 *     same seed → same trajectory. Matches the rest of the headless
 *     harness's seeded determinism.
 */
import { BotBrain, BotContext, BotDecision, Cell, registerBrain } from '../BotBrain';
import { BalancedBrain } from './BalancedBrain';
import { PathPoint } from '../../Pathfinding';
import { TowerType } from '../../../data/TowerTypes';
import { scoreMazeCells } from '../MazePlanner';

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
  /** Top-K cells (by closeness-to-path) we sample from. K=1 means
   *  fully deterministic (legacy v1 behaviour); K=5 gives notable
   *  diversity without sacrificing maze coherence. Default 5. */
  topK?: number;
  /** Picking strategy:
   *    'chebyshev' — pick from K nearest unbuilt W* cells (legacy).
   *    'progressive' — pick from K cells with highest current
   *                    path-length GAIN (cells that extend the
   *                    current creep path NOW). Falls back to
   *                    chebyshev when no cell has positive gain
   *                    so the maze keeps building.
   *
   *  Added 2026-05-31 after v5 webm review: reflected-W* mazes
   *  had agents placing bottom-half walls when the current creep
   *  path was in row 13, producing towers that did nothing for
   *  many waves while lives bled. Progressive picking forces every
   *  placement to immediately compress the path. */
  pickMode?: 'chebyshev' | 'progressive';
  /** Per-match seed used by both cell-selection and tower-type
   *  randomisation. Driven by match seed in scripts that construct
   *  OptimizerBrain per match. Default 0 (legacy). */
  seed?: number;
}

/** xorshift32 — small deterministic PRNG. Same family as the game's
 *  shared RNG so seeded matches reproduce. */
class XorShift32 {
  private state: number;
  constructor(seed: number) {
    // Guard against seed=0 (xorshift collapses on zero).
    this.state = (seed | 0) || 0x9e3779b9;
  }
  next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x;
    // Map to [0,1).
    return (x >>> 0) / 0x100000000;
  }
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

export class OptimizerBrain implements BotBrain {
  readonly name: string;
  private inner: BotBrain;
  private targetWalls: OptimizerWall[];
  private topK: number;
  private pickMode: 'chebyshev' | 'progressive';
  private rng: XorShift32;
  /** Cells in W* we've already placed at, keyed "col,row". Public
   *  for diagnostic / telemetry use. */
  public builtSet: Set<string> = new Set();
  private warnedNoMatch: boolean = false;
  /** Telemetry. */
  public stats = {
    totalDecisions: 0,
    overridePosOnly: 0,    // inner placed; we changed coord
    insertForced: 0,       // inner didn't place; we forced one
    passthrough: 0,        // W* exhausted / no budget → inner wins
    wExhausted: 0,
    /** Per-slot count for both Mode A and Mode B placements. */
    slotA: [0, 0, 0, 0, 0, 0, 0, 0] as number[],
    slotB: [0, 0, 0, 0, 0, 0, 0, 0] as number[],
  };

  constructor(opts: OptimizerBrainOptions = {}) {
    this.name = opts.name ?? 'optimizer';
    this.inner = opts.inner ?? new BalancedBrain();
    this.targetWalls = opts.targetWalls ?? [];
    this.topK = Math.max(1, opts.topK ?? 5);
    this.pickMode = opts.pickMode ?? 'chebyshev';
    this.rng = new XorShift32(opts.seed ?? 0);
  }

  init(ctx: BotContext): void {
    if (this.inner.init) this.inner.init(ctx);
    if (this.targetWalls.length === 0) return;
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
    this.stats.totalDecisions++;

    if (this.targetWalls.length === 0) {
      this.stats.passthrough++;
      return this.inner.decide(ctx);
    }

    // Ask inner FIRST so we can passthrough its tower-type when it
    // wants to place. This is the v2 type-variety mechanism.
    const innerDecision = this.inner.decide(ctx);

    // Critical: place actions are only LEGAL between waves. The
    // recorder drops any place decision that violates legalMask
    // (mask=0 during waves), so our Mode A/B overrides during
    // waves would be silently filtered from BC data — even worse,
    // they'd contribute to the "100% bolt" bias because the
    // mid-wave income flow keeps budget low and only Mode A
    // bolt-placements survive in data.
    //
    // During waves, just passthrough — inner brain handles upgrade
    // / sell / skip / sends, all of which the recorder accepts.
    if (!ctx.betweenWaves) {
      this.stats.passthrough++;
      return innerDecision;
    }

    this.refreshBuiltSet(ctx);
    const target = this.pickTargetTopK(ctx);

    // Mode A — inner wants to place: override position only, keep
    // inner's tower type. Falls through if no W* cell available.
    if (innerDecision.kind === 'place') {
      if (!target) {
        this.stats.wExhausted++;
        this.stats.passthrough++;
        return innerDecision;
      }
      this.markBuilt(target);
      this.stats.overridePosOnly++;
      const slotA = ctx.towerPool.indexOf(innerDecision.type);
      if (slotA >= 0 && slotA < 8) this.stats.slotA[slotA]++;
      return { kind: 'place', col: target.col, row: target.row, type: innerDecision.type };
    }

    // Mode B — inner doesn't want to place. Force placement only
    // when budget is "comfortable" (≥ 3× cheapest tower cost). When
    // gated, pick uniformly from the AFFORDABLE pool — variety
    // grows as gold accumulates between forced placements.
    //
    // Why the 3× threshold:
    //   - Cheap-only force (no threshold) drains budget so only the
    //     cheapest is ever affordable → 100% of training data ends
    //     up being one tower type (the v2 bug we just diagnosed).
    //   - Random-pick-from-full-pool means 6/7 of picks are
    //     unaffordable → maze never finishes building → matches
    //     die early → no data past early-game.
    //   - 3× cheapest threshold leaves enough budget after a
    //     forced placement that 2+ tower types stay affordable for
    //     the next decision, breaking the feedback loop. Gold
    //     accumulates between waves and unlocks tier-2+ picks.
    const cheapest = ctx.towerPool[0]?.cost ?? Infinity;
    if (target && ctx.budget >= cheapest * 3) {
      const affordable = this.findAffordableTowers(ctx);
      if (affordable.length > 0) {
        const type = this.rng.pick(affordable);
        this.markBuilt(target);
        this.stats.insertForced++;
        const slotB = ctx.towerPool.indexOf(type);
        if (slotB >= 0 && slotB < 8) this.stats.slotB[slotB]++;
        return { kind: 'place', col: target.col, row: target.row, type };
      }
    }

    // No W* cells left OR no budget → pass through inner's non-place
    // decision (upgrade / sell / send / frontier / skip).
    if (!target) this.stats.wExhausted++;
    this.stats.passthrough++;
    return innerDecision;
  }

  private markBuilt(cell: Cell): void {
    this.builtSet.add(`${cell.col},${cell.row}`);
  }

  private findAffordableTowers(ctx: BotContext): TowerType[] {
    return ctx.towerPool.filter(t => t.cost <= ctx.budget);
  }

  /** Refresh builtSet from grid state — handles cases where the
   *  driver rejected a previous placement (cell taken, illegal). */
  private refreshBuiltSet(ctx: BotContext): void {
    const observed = new Set<string>();
    for (const w of this.targetWalls) {
      if (!ctx.grid.canPlaceTower(w.col, w.row)) {
        observed.add(`${w.col},${w.row}`);
      }
    }
    this.builtSet = observed;
  }

  /** Pick from the top-K nearest-to-path unbuilt W* cells, uniformly
   *  at random via per-match seeded RNG. K=1 → deterministic legacy
   *  behaviour. K>1 → diverse mazes across matches with same W*. */
  private pickTargetTopK(ctx: BotContext): Cell | null {
    if (this.pickMode === 'progressive') {
      return this.pickTargetProgressive(ctx);
    }
    const pathCells = collectPathCells(ctx.allPaths);
    if (pathCells.length === 0) return null;

    type Scored = { cell: Cell; dist: number };
    const candidates: Scored[] = [];
    for (const w of this.targetWalls) {
      const key = `${w.col},${w.row}`;
      if (this.builtSet.has(key)) continue;
      if (!ctx.grid.canPlaceTower(w.col, w.row)) continue;
      const dist = minChebyshev(w.col, w.row, pathCells);
      candidates.push({ cell: { col: w.col, row: w.row }, dist });
    }
    if (candidates.length === 0) return null;

    candidates.sort((a, b) => a.dist - b.dist);
    const topK = candidates.slice(0, Math.min(this.topK, candidates.length));
    return this.rng.pick(topK).cell;
  }

  /** Progressive picker: score each unbuilt W* cell by how much it
   *  EXTENDS the current creep path right now. Pick uniformly from
   *  the top-K by gain. Falls back to chebyshev when no cell has
   *  positive gain (so the maze keeps building from the frontier
   *  even when no individual cell adds path).
   *
   *  This is what the user wants when they say "build progressively
   *  out from existing structure" — each placement immediately
   *  compresses the creep path instead of sitting unused waiting
   *  for the maze to fill in around it. */
  private pickTargetProgressive(ctx: BotContext): Cell | null {
    const pathCells = collectPathCells(ctx.allPaths);
    if (pathCells.length === 0) return null;

    // Build a candidate list of unbuilt + placeable W* cells.
    const unbuiltCells: Cell[] = [];
    for (const w of this.targetWalls) {
      const key = `${w.col},${w.row}`;
      if (this.builtSet.has(key)) continue;
      if (!ctx.grid.canPlaceTower(w.col, w.row)) continue;
      unbuiltCells.push({ col: w.col, row: w.row });
    }
    if (unbuiltCells.length === 0) return null;

    // Score each by current path-gain. scoreMazeCells re-runs A*
    // for each candidate so it's not free — cap at 30 candidates
    // (MazePlanner's default) and pre-filter to the K-cheby-closest
    // so the scoring set is always relevant to the current path.
    const SCORE_CAP = 30;
    let scoringPool = unbuiltCells;
    if (unbuiltCells.length > SCORE_CAP) {
      // Pre-filter by Chebyshev distance to current path so we score
      // the cells closest to action.
      const scored = unbuiltCells.map(c => ({
        c,
        d: minChebyshev(c.col, c.row, pathCells),
      }));
      scored.sort((a, b) => a.d - b.d);
      scoringPool = scored.slice(0, SCORE_CAP).map(s => s.c);
    }

    const scored = scoreMazeCells(ctx.grid, scoringPool, SCORE_CAP, ctx.allPaths);

    // Sort by gain DESC. Only consider cells with positive gain
    // first; if none, fall through to chebyshev.
    const positiveGain = scored.filter(s => s.gain > 0).sort((a, b) => b.gain - a.gain);
    if (positiveGain.length > 0) {
      const topK = positiveGain.slice(0, Math.min(this.topK, positiveGain.length));
      const pick = this.rng.pick(topK);
      return { col: pick.col, row: pick.row };
    }

    // No cell currently extends the path. Fall back to chebyshev
    // (pick closest-to-path unbuilt cell) to keep the maze
    // building from the frontier rather than stalling.
    const fallbackScored = unbuiltCells.map(c => ({
      c,
      d: minChebyshev(c.col, c.row, pathCells),
    }));
    fallbackScored.sort((a, b) => a.d - b.d);
    const topK = fallbackScored.slice(0, Math.min(this.topK, fallbackScored.length));
    return this.rng.pick(topK).c;
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

registerBrain('optimizer', () => new OptimizerBrain());
