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
  public stats: {
    decisions: number;
    placesBetweenWaves: number;
    delegatesInWave: number;
    skipsLowBudget: number;
    skipsNoCandidate: number;
    nearPathPoolSizes: number[];
    scoredCounts: number[];
    topGains: number[];
    placements: any[];
  } = {
    decisions: 0,
    placesBetweenWaves: 0,
    delegatesInWave: 0,
    skipsLowBudget: 0,
    skipsNoCandidate: 0,
    nearPathPoolSizes: [],
    scoredCounts: [],
    topGains: [],
    placements: [],
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

    // Build candidate set the same way the offline maze-optimizer
    // does (scripts/maze-optimizer.mjs greedyFromSeed): every path
    // cell PLUS the 4-neighbours of every path cell. This catches
    // "close the detour" cells that score gain=0 individually but
    // cluster to force longer paths.
    //
    // CRITICAL: the offline optimizer accepts gain=0 walls (its
    // docstring: "Accept the best wall even if it doesn't strictly
    // improve"). Greedy walls cumulate — adding many gain=0 walls
    // eventually forces gain>0 detours by closing alternative
    // routes. My v1 brain rejected gain=0 walls and got stuck at
    // path=38 on plains, never letting clusters form.
    const candidateSet = new Map<string, Cell>();
    const addCand = (col: number, row: number) => {
      if (col < 0 || col >= ctx.grid.cols || row < 0 || row >= ctx.grid.rows) return;
      if (!ctx.grid.canPlaceTower(col, row)) return;
      candidateSet.set(`${col},${row}`, { col, row });
    };
    for (const p of ctx.allPaths) {
      if (!p) continue;
      for (const cell of p) {
        addCand(cell.col, cell.row);
        addCand(cell.col + 1, cell.row);
        addCand(cell.col - 1, cell.row);
        addCand(cell.col, cell.row + 1);
        addCand(cell.col, cell.row - 1);
      }
    }
    const poolToScore = Array.from(candidateSet.values());
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

    // Two-stage decision (mirrors the offline maze-optimizer's flow):
    //
    // Stage A: if any candidate has POSITIVE mazeGain, ALWAYS pick the
    // highest-gain cell. Maze-building dominates DPS — that's the
    // entire pivot from "online greedy DPS" to "online greedy maze".
    //
    // Stage B: if max gain == 0 (path can't be extended this step),
    // fall back to DPS placement at the cell with highest path coverage.
    //
    // Why: scoreMazeCells is path-adjacent so even gain=0 cells are
    // structurally close to the maze. Placing them DOES make
    // marginal progress (later placements at the new path-adjacent
    // frontier may compound). Switching to DPS at this point gets
    // some kill-power on creeps while still preserving an opening
    // for future maze-building.
    let bestScore = -Infinity;
    let bestCell: Cell | null = null;
    let bestType: TowerType | null = null;
    const currentPathLen = totalPathLength(ctx.allPaths);

    const maxGain = usefulCells[0]?.gain ?? 0;

    if (maxGain > 0) {
      // Stage A: pick best gain cell. Tower type = mid-cost preferred
      // (we want functional DPS even on a wall cell, not just
      // cheapest). Bias to cheapest when affordable is small.
      for (const cellScore of usefulCells.filter(s => s.gain === maxGain)) {
        const cell: Cell = { col: cellScore.col, row: cellScore.row };
        for (const type of affordable) {
          const range = type.range ?? this.coverageRange;
          const coverage = countPathCellsInRange(ctx.allPaths, cell, range);
          const dps = type.damage * 1000 / Math.max(type.fireRate, 1);
          const coverageScore = coverage * dps / 100;
          // Maze-gain weighted heavily (gain*50 vs coverage*small).
          const score = cellScore.gain * 50 + coverageScore - type.cost / 1000;
          if (score > bestScore) {
            bestScore = score;
            bestCell = cell;
            bestType = type;
          }
        }
      }
    } else {
      // Stage B: no maze progress this step. Place a DPS tower at
      // the path-adjacent cell with maximum kill-zone coverage. Use
      // the FULL near-path candidate set (since maze cells are at
      // current path which has gain=0).
      for (const cellScore of usefulCells) {
        const cell: Cell = { col: cellScore.col, row: cellScore.row };
        for (const type of affordable) {
          const range = type.range ?? this.coverageRange;
          const coverage = countPathCellsInRange(ctx.allPaths, cell, range);
          const dps = type.damage * 1000 / Math.max(type.fireRate, 1);
          const coverageScore = coverage * dps / 100;
          const score = coverageScore - type.cost / 1000;
          if (score > bestScore) {
            bestScore = score;
            bestCell = cell;
            bestType = type;
          }
        }
      }
    }

    if (!bestCell || !bestType) {
      // Shouldn't happen given the guards above, but be safe.
      this.stats.skipsNoCandidate++;
      return this.inWave.decide(ctx);
    }

    this.stats.placesBetweenWaves++;
    // Recompute best-score diagnostics for telemetry.
    const bestRange = bestType.range ?? this.coverageRange;
    const bestCoverage = countPathCellsInRange(ctx.allPaths, bestCell, bestRange);
    const bestMazeGainEntry = usefulCells.find(s => s.col === bestCell.col && s.row === bestCell.row);
    // Top-5 candidates by gain for diagnostics.
    const topByGain = [...usefulCells].sort((a, b) => b.gain - a.gain).slice(0, 5)
      .map(s => `(${s.col},${s.row}):g${s.gain}`).join(' ');
    this.stats.placements.push({
      wave: ctx.wave,
      gold: ctx.budget,
      col: bestCell.col,
      row: bestCell.row,
      type: bestType.id,
      typeCost: bestType.cost,
      mazeGain: bestMazeGainEntry?.gain ?? 0,
      coverage: bestCoverage,
      score: bestScore,
      currentPathLen,
      topGainCells: topByGain,
    });
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
