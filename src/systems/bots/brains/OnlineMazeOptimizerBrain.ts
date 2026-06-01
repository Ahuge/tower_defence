/**
 * OnlineMazeOptimizerBrain — rung 1 of the search-based pivot.
 *
 * The maze-optimizer (scripts/maze-optimizer.mjs) computes W* once
 * OFFLINE per (map, budget) — that's what BC v4 was cloning. Across
 * 7 BC+PPO versions the best result (PPO v4, 35% wins on plains)
 * came from BC cloning that static W* then PPO refining it.
 *
 * This brain skips BC+PPO entirely. It runs the same maze-optimizer
 * logic ONLINE: every between-wave decision, replan W* candidates
 * from the CURRENT grid + remaining budget, then pick the best cell
 * via 1-ply lookahead (which tower type at which cell gives the
 * highest path-shape × DPS score right now).
 *
 * Why this should work where BC+PPO didn't:
 *   - The OptimizerBrain teacher used by BC was a static W* + naive
 *     tower-type choice. Online replan adapts to actually-placed
 *     towers, gold reality, and creep pressure.
 *   - No training. No reward shaping. No mode collapse.
 *   - The 14% offline-W* ceiling (notes/rl/baselines.csv) is the
 *     static-plan lower bound; online recompute should close the
 *     gap to PPO v4's 35% (and maybe beyond).
 *
 * Rung 1 success bar (notes/rl/mcts-plan-v3.md):
 *   ≥50% wins on plains (must beat PPO v4 = 35%)
 *   ≥10% wins on gauntlet (any non-zero generalization vs PPO v4's 0%)
 *
 * The spec is explicit (game-tree critic round 2): full receding-
 * horizon replan, tower type via 1-ply lookahead (NOT cheapest).
 *
 * In-wave decisions are delegated to a fallback brain (BalancedBrain
 * by default) which handles upgrade / sell / skip during waves.
 */
import { BotBrain, BotContext, BotDecision, Cell, registerBrain } from '../BotBrain';
import { BalancedBrain } from './BalancedBrain';
import { TowerType } from '../../../data/TowerTypes';
import { PathPoint } from '../../Pathfinding';
import { scoreMazeCells, totalPathLength } from '../MazePlanner';

/** Chebyshev distance from a cell to the nearest path cell.
 *  Used to filter candidates near the current creep path before
 *  scoring — random sampling from the full 900-cell empty pool
 *  misses good cells almost always. */
function minChebyshevToPath(col: number, row: number, allPaths: (PathPoint[] | null)[]): number {
  let best = Infinity;
  for (const p of allPaths) {
    if (!p) continue;
    for (const pt of p) {
      const dc = Math.abs(pt.col - col);
      const dr = Math.abs(pt.row - row);
      const d = dc > dr ? dc : dr;
      if (d < best) best = d;
    }
  }
  return best;
}

export interface OnlineMazeOptimizerBrainOptions {
  /** Fallback brain for in-wave decisions (upgrade / sell / skip).
   *  Default BalancedBrain. The brain is only consulted when the
   *  game state forbids placement. */
  inWaveBrain?: BotBrain;
  /** Cells to consider per between-wave decision. Capped to avoid
   *  per-decision A* blowup. Default 30 (same as MazePlanner default). */
  K_candidates?: number;
  /** Lookahead radius for tower-type scoring: count path cells
   *  within this Manhattan distance when scoring "DPS coverage".
   *  Default 4 (matches the typical tower range of 3-5 tiles). */
  coverageRange?: number;
  readonly name?: string;
}

export class OnlineMazeOptimizerBrain implements BotBrain {
  readonly name: string;
  private inWave: BotBrain;
  private K: number;
  private coverageRange: number;
  /** Telemetry */
  public stats = {
    decisions: 0,
    placesBetweenWaves: 0,
    delegatesInWave: 0,
    skipsLowBudget: 0,
    skipsNoCandidate: 0,
    // Diagnostic histograms
    nearPathPoolSizes: [],
    scoredCounts: [],
    topGains: [],
  };

  constructor(opts: OnlineMazeOptimizerBrainOptions = {}) {
    this.name = opts.name ?? 'online-maze-optimizer';
    this.inWave = opts.inWaveBrain ?? new BalancedBrain();
    this.K = opts.K_candidates ?? 30;
    this.coverageRange = opts.coverageRange ?? 4;
  }

  init(ctx: BotContext): void {
    this.inWave.init?.(ctx);
  }

  decide(ctx: BotContext): BotDecision {
    this.stats.decisions++;

    // In-wave: delegate. The brain itself only operates between waves
    // because place is illegal mid-wave (legalMask drops it).
    if (!ctx.betweenWaves) {
      this.stats.delegatesInWave++;
      return this.inWave.decide(ctx);
    }

    // No tower in the pool we can afford → defer to fallback (probably skip).
    const affordable = ctx.towerPool.filter(t => t.cost <= ctx.budget);
    if (affordable.length === 0) {
      this.stats.skipsLowBudget++;
      return this.inWave.decide(ctx);
    }

    // Score K best maze cells from the current empty-cell pool.
    // Pre-filter to cells WITHIN K_dist of any current creep path —
    // scoreMazeCells's default behaviour is to randomly sample from
    // ctx.candidateCells (~900 cells on plains), which means most
    // sampled cells are far from the path and have gain=0. Pre-
    // filtering to ~50-150 near-path cells lets us score ALL of
    // them within the same time budget, finding actual useful walls.
    const NEAR_PATH_DIST = 3;
    const nearPath = ctx.candidateCells.filter(c =>
      minChebyshevToPath(c.col, c.row, ctx.allPaths) <= NEAR_PATH_DIST,
    );
    // If pre-filter is too aggressive (e.g. weird maps), fall back
    // to the full candidate set.
    const poolToScore = nearPath.length >= 5 ? nearPath : ctx.candidateCells;
    // Pass maxCandidates = pool.length so scoreMazeCells doesn't
    // re-sample — we already pre-filtered, all of these matter.
    const scored = scoreMazeCells(ctx.grid, poolToScore, poolToScore.length, ctx.allPaths);
    this.stats.nearPathPoolSizes.push(poolToScore.length);
    this.stats.scoredCounts.push(scored.length);
    if (scored.length > 0) this.stats.topGains.push(scored[0].gain);

    // Keep ALL cells with gain >= 0 (gain<0 means placing closes
    // the path — invalid). When no cell has positive gain, the
    // maze is saturated for now — but the tower can still serve as
    // DPS. Including gain=0 cells lets the 1-ply scorer pick a
    // good DPS placement instead of forfeiting to the fallback.
    const usefulCells = scored.filter(s => s.gain >= 0);
    if (usefulCells.length === 0) {
      this.stats.skipsNoCandidate++;
      return this.inWave.decide(ctx);
    }

    // 1-ply lookahead over (cell, tower_type). For each affordable tower,
    // for each useful cell, score = α × maze_gain + β × dps_coverage.
    // dps_coverage = number of path cells within tower.range of the cell,
    // after the placement reroutes the path.
    let bestScore = -Infinity;
    let bestCell: Cell | null = null;
    let bestType: TowerType | null = null;

    // Pre-compute current path total — useful for normalising maze_gain
    // versus dps_coverage in the score.
    const currentPathLen = totalPathLength(ctx.allPaths);

    for (const cellScore of usefulCells.slice(0, this.K)) {
      const cell: Cell = { col: cellScore.col, row: cellScore.row };
      const mazeGain = cellScore.gain; // path length added by this wall

      for (const type of affordable) {
        // Coverage: path cells within `range` of the placed cell, using
        // the NEW path (post-placement). We approximate by counting cells
        // from the CURRENT path within range — the new path will be
        // similar shape but longer, and the tower covers ~the same
        // cells either way. Cheap approximation.
        const range = type.range ?? this.coverageRange;
        const coverage = countPathCellsInRange(ctx.allPaths, cell, range);

        // Score weights — keep maze-gain and coverage in comparable units.
        // Maze gain is in CELLS (typically 1-10 per placement).
        // Coverage is in path-cell hits (typically 5-50).
        // DPS multiplier: more expensive towers do more per cell hit.
        const dps = type.damage * 1000 / Math.max(type.fireRate, 1);
        const coverageScore = coverage * dps / 100; // normalise

        // Mild preference for cheaper towers when scores tie (don't burn
        // budget on expensive towers when a cheap one does the same job).
        const costPenalty = type.cost / 1000;

        const score = mazeGain * 5 + coverageScore - costPenalty;
        if (score > bestScore) {
          bestScore = score;
          bestCell = cell;
          bestType = type;
        }
      }
    }

    if (!bestCell || !bestType) {
      // Shouldn't happen given the guards above, but be safe.
      this.stats.skipsNoCandidate++;
      return this.inWave.decide(ctx);
    }

    this.stats.placesBetweenWaves++;
    return { kind: 'place', col: bestCell.col, row: bestCell.row, type: bestType };
  }
}

/** Count path cells within Manhattan-or-euclidean distance ≤ range
 *  of the candidate cell. Uses Euclidean² ≤ range² to match how
 *  the game evaluates tower targeting. */
function countPathCellsInRange(
  allPaths: (PathPoint[] | null)[],
  cell: Cell,
  range: number,
): number {
  const r2 = range * range;
  let count = 0;
  for (const path of allPaths) {
    if (!path) continue;
    for (const p of path) {
      const dx = p.col - cell.col;
      const dy = p.row - cell.row;
      if (dx * dx + dy * dy <= r2) count++;
    }
  }
  return count;
}

registerBrain('online-maze-optimizer', () => new OnlineMazeOptimizerBrain());
