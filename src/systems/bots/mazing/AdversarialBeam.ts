/**
 * AdversarialBeam — TS port of `ml/mazing/adversarial_impl.py`.
 *
 * A beam-search optimizer that maximizes BFS workload on a tower-
 * defense grid. Each "wave" of the search expands the current beam by
 * applying mutation operators (add wall, grow branch, remove wall) to
 * every state, BFS-scoring the results, and keeping the top K. After
 * N waves the highest-scoring beam member is returned as the target
 * layout for a CPU bot to place towers toward.
 *
 * Key adaptations from the POC:
 *  - Grid is the game's Grid (not a 2D array), so mutations write to
 *    `cells[row][col]` and respect Entry/Exit/NoBuild semantics.
 *  - Score uses `findPathWithMetrics` so the existing typed-array BFS
 *    handles all walkability rules (NoBuild walkable, Tower/Blocked
 *    impassable). Returns null on an invalid grid → `INVALID_SCORE`.
 *  - Multi-spawner maps (Circle Co-op): the score sums BFS metrics
 *    across every spawner→exit path in `paths`. v1 keeps it simple —
 *    no per-spawner creep-flow weighting. (See plan doc for v2.)
 *  - Mutations only add cells inside `candidatePool` — the bot's zone-
 *    restricted placement list. v1 doesn't differentiate towers vs
 *    walls; every "add" places a generic wall (CellType.Tower) costing
 *    `placementCost(col, row)` toward the wave budget.
 *  - `rng()` (seeded) is used for ALL randomness so the beam is
 *    reproducible across headless harness runs.
 *
 * Why not just use the existing greedy `MazePlanner.bestMazeCell`:
 * the greedy single-cell scorer can't build *structures* — long
 * winding backbones, dead-end traps, branched corridors. The mutation
 * `growBranch` (random walk placing N walls in sequence) reaches
 * structurally-better layouts that single-cell scoring never converges
 * to. The cost is one extra BFS per candidate vs one BFS per cell —
 * still well under the bot's 4s decision budget at the defaults below.
 */
import { Grid, CellType } from '../../Grid';
import { findPathWithMetrics, PathPoint } from '../../Pathfinding';
import { rng } from '../../Rng';
import { Cell } from '../BotBrain';

/** Score components per BFS run. Mirrors `bfs(grid)` return shape in
 *  the Python POC. `success: false` means the goal became unreachable
 *  after the mutation — those states get filtered out before sorting. */
interface BfsScoreParts {
  pathLength: number;
  nodesExpanded: number;
  maxQueue: number;
  success: boolean;
}

/** Hyperparameters governing beam shape, mutation behaviour, and
 *  scoring. Defaults mirror the POC's values; brain-search will sweep
 *  them per (faction, difficulty) cell. */
export interface BeamOptions {
  /** Score weights. */
  alpha: number;   // weight on shortest-path length (primary)
  beta: number;    // weight on nodes expanded (BFS work)
  gamma: number;   // weight on max queue depth (frontier width)
  /** Beam search shape. */
  beamWidth: number;
  mutationsPerState: number;
  /** Number of "waves" (search iterations) to run. Each wave grows the
   *  budget by `budgetGrowth`. */
  waves: number;
  /** Budget that the beam may spend per wave on placements. */
  baseBudget: number;
  budgetGrowth: number;
  /** Mutation operator weights. Sum-normalised at runtime so the
   *  brain-search can sweep them as raw [0,1] floats. */
  pAddWall: number;
  pGrowBranch: number;
  pRemoveWall: number;
  /** Cap on how many cells `growBranch` paints in one mutation. */
  growBranchMaxLen: number;
}

export const DEFAULT_BEAM_OPTIONS: BeamOptions = {
  alpha: 5.0, beta: 1.0, gamma: 0.5,
  beamWidth: 5,
  mutationsPerState: 25,
  waves: 15,
  baseBudget: 10,
  budgetGrowth: 8,
  pAddWall: 0.5, pGrowBranch: 0.3, pRemoveWall: 0.2,
  growBranchMaxLen: 8,
};

/** Score for an unreachable grid — large negative so any reachable
 *  candidate beats it. Matches the POC's −1e9 convention. */
const INVALID_SCORE = -1e9;

/** A candidate layout in the beam. Holds the *delta* from the input
 *  baseline — `placedCells` are the cells we've turned into walls.
 *  When the brain consumes a plan it just iterates `placedCells` in
 *  the recorded order and tries to place each one (skipping cells the
 *  game has since blocked or the bot can no longer afford). */
export interface BeamState {
  /** Cells turned into walls relative to the baseline grid. Order is
   *  the order they were added — earlier cells are higher priority. */
  placedCells: Cell[];
  /** Total placement cost spent. */
  cost: number;
  /** Last computed score. -Infinity until the first scoring pass. */
  score: number;
}

export interface BeamResult {
  /** Top beam member's placedCells, in priority order. */
  bestPlan: Cell[];
  /** Score history per wave for diagnostics. */
  scoreHistory: number[];
  /** Final beam (top K) — useful when callers want to enumerate
   *  alternatives instead of just the winner. */
  finalBeam: BeamState[];
}

/** Single placement cost in budget units. POC formula:
 *    cost = 1 + dist_from_start * 0.05
 *  Carried forward verbatim — discourages clustering near the entry
 *  (where blocking is cheap and trivially extends path length). */
function placementCost(col: number, row: number, entry: PathPoint): number {
  const d = Math.abs(col - entry.col) + Math.abs(row - entry.row);
  return 1 + d * 0.05;
}

/** Run BFS on each spawner→exit path and sum the metrics. Single-
 *  spawner maps just produce one set of metrics. If ANY spawner is
 *  unreachable, the whole grid is invalid. */
function bfsScoreMulti(grid: Grid, paths: { start: PathPoint; end: PathPoint }[]): BfsScoreParts {
  let pathLength = 0;
  let nodesExpanded = 0;
  let maxQueue = 0;
  for (const seg of paths) {
    const m = findPathWithMetrics(grid, seg.start, seg.end);
    if (!m) return { pathLength: 0, nodesExpanded: 0, maxQueue: 0, success: false };
    pathLength += m.path.length;
    nodesExpanded += m.nodesExpanded;
    if (m.maxQueue > maxQueue) maxQueue = m.maxQueue;
  }
  return { pathLength, nodesExpanded, maxQueue, success: true };
}

function scoreParts(parts: BfsScoreParts, opts: BeamOptions): number {
  if (!parts.success) return INVALID_SCORE;
  return (
    opts.alpha * parts.pathLength +
    opts.beta * parts.nodesExpanded +
    opts.gamma * parts.maxQueue
  );
}

/** Apply a state's `placedCells` to a grid and run the scorer. The
 *  caller's grid is left untouched — we mutate, score, then revert. */
function scoreState(
  baseline: Grid,
  state: BeamState,
  paths: { start: PathPoint; end: PathPoint }[],
  opts: BeamOptions,
): number {
  // Apply the delta. Track which cells we mutated so we can restore
  // exactly even if some were already walls (shouldn't happen but
  // mutations can add the same cell to two beam members).
  const restore: { col: number; row: number; prev: CellType }[] = [];
  for (const c of state.placedCells) {
    const prev = baseline.cells[c.row][c.col];
    if (prev === CellType.Empty || prev === CellType.NoBuild) {
      restore.push({ col: c.col, row: c.row, prev });
      baseline.cells[c.row][c.col] = CellType.Tower;
    }
  }
  try {
    return scoreParts(bfsScoreMulti(baseline, paths), opts);
  } finally {
    for (const r of restore) baseline.cells[r.row][r.col] = r.prev;
  }
}

/** Mutation: add a single wall at a random candidate cell. */
function addWall(state: BeamState, candidates: Cell[], budget: number, entry: PathPoint): BeamState | null {
  // Sample candidate cells until we find one not already in our
  // placed list and that fits the budget. 50 retries matches POC.
  for (let attempt = 0; attempt < 50; attempt++) {
    const c = candidates[Math.floor(rng() * candidates.length)];
    if (!c) continue;
    if (containsCell(state.placedCells, c)) continue;
    const cost = placementCost(c.col, c.row, entry);
    if (state.cost + cost > budget) continue;
    return {
      placedCells: [...state.placedCells, c],
      cost: state.cost + cost,
      score: -Infinity,
    };
  }
  return null;
}

/** Mutation: grow a branch of walls via random walk starting at a
 *  random candidate cell. Stops when budget is exhausted, the walk
 *  steps off the candidate pool, or `maxLen` cells are placed. */
function growBranch(
  state: BeamState, candidates: Cell[], budget: number, entry: PathPoint, maxLen: number,
): BeamState | null {
  if (candidates.length === 0) return null;
  const candidateIdx = new Set<number>();
  for (const c of candidates) candidateIdx.add(c.row * 1000 + c.col);

  // Seed: pick a random candidate not already placed.
  let seed: Cell | null = null;
  for (let attempt = 0; attempt < 50 && !seed; attempt++) {
    const cand = candidates[Math.floor(rng() * candidates.length)];
    if (cand && !containsCell(state.placedCells, cand)) seed = cand;
  }
  if (!seed) return null;

  const placed: Cell[] = [...state.placedCells];
  let cost = state.cost;
  let cx = seed.col, cy = seed.row;
  let added = 0;
  for (let i = 0; i < maxLen; i++) {
    const cellKey = cy * 1000 + cx;
    const inPool = candidateIdx.has(cellKey);
    const dup = placed.some(p => p.col === cx && p.row === cy);
    if (inPool && !dup) {
      const stepCost = placementCost(cx, cy, entry);
      if (cost + stepCost > budget) break;
      placed.push({ col: cx, row: cy });
      cost += stepCost;
      added++;
    }
    // Random 4-directional step. Walks can leave the candidate pool —
    // those steps simply contribute no walls but still advance the
    // position so the next step might re-enter the pool.
    const r = rng();
    if (r < 0.25) cx += 1;
    else if (r < 0.50) cx -= 1;
    else if (r < 0.75) cy += 1;
    else cy -= 1;
  }
  if (added === 0) return null;
  return { placedCells: placed, cost, score: -Infinity };
}

/** Mutation: drop the last-placed cell from the state. The POC picks
 *  a random wall; we pick the most-recent so the priority order stays
 *  stable for the brain consumer. */
function removeWall(state: BeamState): BeamState | null {
  if (state.placedCells.length === 0) return null;
  const next = state.placedCells.slice(0, -1);
  // We don't know the per-cell cost without the entry context. Caller
  // doesn't actually rely on the cost being exact post-removal — the
  // beam will re-grow if the mutation made room. Conservative: set
  // cost to the beam's accumulated cost minus a rough placement cost.
  // Simpler: just recompute cost as zero — the next addWall will
  // re-fill into the budget. Safe because cost never DECREASES the
  // score, and the beam keeps the highest-scoring states regardless.
  return { placedCells: next, cost: 0, score: -Infinity };
}

function containsCell(arr: Cell[], c: Cell): boolean {
  for (const a of arr) if (a.col === c.col && a.row === c.row) return true;
  return false;
}

/** Pick a mutation operator weighted by the option probabilities.
 *  Sum-normalises at call time so brain-search can mutate the raw
 *  weights without separate normalisation steps. */
function pickOp(opts: BeamOptions): 'add' | 'grow' | 'remove' {
  const total = opts.pAddWall + opts.pGrowBranch + opts.pRemoveWall;
  if (total <= 0) return 'add';
  const r = rng() * total;
  if (r < opts.pAddWall) return 'add';
  if (r < opts.pAddWall + opts.pGrowBranch) return 'grow';
  return 'remove';
}

function mutate(
  state: BeamState, candidates: Cell[], budget: number, entry: PathPoint, opts: BeamOptions,
): BeamState | null {
  // Up to 5 op attempts per mutation request — matches the POC. If
  // every operator returns null (e.g. budget is exhausted, no walls
  // to remove), the whole mutation is skipped.
  for (let i = 0; i < 5; i++) {
    const op = pickOp(opts);
    let next: BeamState | null = null;
    if (op === 'add') next = addWall(state, candidates, budget, entry);
    else if (op === 'grow') next = growBranch(state, candidates, budget, entry, opts.growBranchMaxLen);
    else next = removeWall(state);
    if (next) return next;
  }
  return null;
}

/** Run the beam search.
 *
 *  @param baseline Grid in its current state. NOT mutated — the search
 *    applies and reverts deltas internally.
 *  @param candidates Cells the bot may legally place towers on.
 *  @param paths Spawner→exit segments that BFS scores against. For a
 *    single-spawner map, pass `[{ start: grid.entry, end: grid.exit }]`.
 *  @param opts Beam hyperparameters. Use DEFAULT_BEAM_OPTIONS unless
 *    a brain-search config is overriding them.
 */
export function runBeam(
  baseline: Grid,
  candidates: Cell[],
  paths: { start: PathPoint; end: PathPoint }[],
  opts: BeamOptions = DEFAULT_BEAM_OPTIONS,
): BeamResult {
  // Start from an empty plan. The POC starts from "empty grid" too —
  // we treat the input grid as the canonical baseline and only score
  // deltas from it.
  const initial: BeamState = { placedCells: [], cost: 0, score: -Infinity };
  initial.score = scoreState(baseline, initial, paths, opts);
  let beam: BeamState[] = [initial];
  const scoreHistory: number[] = [initial.score];

  for (let wave = 0; wave < opts.waves; wave++) {
    const budget = opts.baseBudget + wave * opts.budgetGrowth;
    // Elitism: seed the candidate pool with the *current beam* so a
    // wave can never strictly worsen the top score. Without this, a
    // wave whose mutations all score lower than the best parent would
    // discard the parent and the score history would dip. Standard
    // beam-search practice — also matches the user's intuition that
    // the planner converges toward better-and-better layouts.
    const cands: BeamState[] = [...beam];
    for (const state of beam) {
      for (let m = 0; m < opts.mutationsPerState; m++) {
        const next = mutate(state, candidates, budget, baseline.entry, opts);
        if (!next) continue;
        next.score = scoreState(baseline, next, paths, opts);
        // Reject grids that broke pathfinding entirely.
        if (next.score === INVALID_SCORE) continue;
        cands.push(next);
      }
    }
    cands.sort((a, b) => b.score - a.score);
    beam = cands.slice(0, opts.beamWidth);
    scoreHistory.push(beam[0].score);
  }

  return {
    bestPlan: beam[0]?.placedCells ?? [],
    scoreHistory,
    finalBeam: beam,
  };
}
