/**
 * AdversarialBeam — beam-search adversarial maze planner.
 *
 * v2 update — the planner is now **tower-aware**. Each placement
 * carries a real `towerId` selected from the bot's pool, and the
 * score function rewards a tower's *role* contribution (DPS coverage,
 * slow value, aura amplification) on top of the v1 BFS-workload
 * terms. Brain queries `bestCell(ctx, towerType)` get cells that were
 * actually scored for that role — no more "best wall cell returned
 * for a DPS query" mismatch that capped v1's effectiveness.
 *
 * v1 score: α·path_length + β·nodes_expanded + γ·max_queue
 * v2 score: ↑ + δ·dpsCoverage + ε·slowValue + ζ·auraAmplification
 *
 * Mutation operators choose tower types from `towerPool`:
 *  - `addTower`     — random cell, greedy-or-random tower pick
 *  - `swapTower`    — change a placed tower's type, keep cell
 *  - `removeTower`  — drop the most-recent placement
 *  - `growBranchTyped` — random walk placing the cheapest wall in
 *                        sequence (mazing structure-builder)
 *
 * Greedy `tower-pick` (`towerPickMode=0`, default): for each picked
 * cell, try every affordable tower in the pool, score each result,
 * keep the best. Random pick (`towerPickMode=1`): pick uniformly
 * from affordable + role-bias-weighted.
 *
 * Beam-width-K elitism preserves the top score across waves — the
 * candidate pool starts each wave with the prior beam intact.
 */
import { Grid, CellType } from '../../Grid';
import { findPathWithMetrics, PathPoint } from '../../Pathfinding';
import { rng } from '../../Rng';
import { Cell } from '../BotBrain';
import { TowerType } from '../../../data/TowerTypes';
import { TowerRole, getTowerRole } from '../../../data/TowerRoles';
import { hasTrait, getTrait } from '../../traits/Trait';
import { TILE_SIZE } from '../../../config';

/** Score components per BFS run. */
interface BfsScoreParts {
  pathLength: number;
  nodesExpanded: number;
  maxQueue: number;
  success: boolean;
}

export interface BeamOptions {
  /** v1 BFS-workload weights. */
  alpha: number;
  beta: number;
  gamma: number;
  /** v2 role-aware weights. */
  deltaDps: number;
  epsilonSlow: number;
  zetaAura: number;
  /** Beam search shape. */
  beamWidth: number;
  mutationsPerState: number;
  waves: number;
  /** Budget grows per wave: `baseBudget + wave * budgetGrowth`. v2
   *  defaults are scaled to real gold (×10 vs v1) so tower costs map
   *  in naturally — a 60g Sniper costs 60 budget units. */
  baseBudget: number;
  budgetGrowth: number;
  /** Mutation operator probabilities, sum-normalised at runtime. */
  pAddTower: number;
  pGrowBranch: number;
  pRemoveTower: number;
  pSwapTower: number;
  /** Cap on how many cells `growBranch` paints in one mutation. */
  growBranchMaxLen: number;
  /** 0 = greedy (try every affordable tower per cell, keep best),
   *  1 = random (uniform sample weighted by addBiasRole). Greedy
   *  converges faster but may over-fit; brain-search probes both. */
  towerPickMode: number;
  /** Per-role multiplier on the chance of an `addTower` op picking
   *  that role under random-mode. Default 1.0 = uniform. Sweeping
   *  these via brain-search lets the harness discover faction-
   *  specific picks (e.g. nature might benefit from slow-heavy bias). */
  addBiasWall: number;
  addBiasDps: number;
  addBiasSlow: number;
  addBiasAura: number;
}

export const DEFAULT_BEAM_OPTIONS: BeamOptions = {
  alpha: 5.0, beta: 1.0, gamma: 0.5,
  // Role weights default to 0 until phase 3 (per-role bestCell)
  // ships. With non-zero δ/ε/ζ, the planner ranks DPS placements
  // over walls, but the brain's decideMaze still asks for "any
  // rank-0 cell" — so it places walls at DPS-best cells and the
  // visible mazing collapses. Keeping these at 0 makes the v2
  // architecture behave like v1 (path-extension only) until phase
  // 3+4 wire the brain's per-role queries. brain-search will
  // raise these once the loop is closed.
  deltaDps: 0.0, epsilonSlow: 0.0, zetaAura: 0.0,
  // Beam search shape — reduced from POC defaults to fit a 4s bot
  // decision budget with multiple bots running concurrently. POC
  // had beam=5 mutations=25 waves=15 = ~1875 evals/plan; the trim
  // below is ~3x cheaper without much score loss in practice.
  beamWidth: 3,
  mutationsPerState: 12,
  waves: 8,
  // ×10 vs v1 to match real gold scale. POC budgets were abstract.
  baseBudget: 100,
  budgetGrowth: 80,
  pAddTower: 0.5, pGrowBranch: 0.3, pRemoveTower: 0.15, pSwapTower: 0.05,
  growBranchMaxLen: 8,
  // Random-mode tower-pick is the default — greedy mode runs a full
  // state score per affordable tower per mutation attempt, which is
  // ~10x more expensive. Brain-search can probe greedy via
  // towerPickMode=0 once the plumbing is well-tuned.
  towerPickMode: 1,
  // Default-time bias toward walls so the planner produces visible
  // mazes (the user's stated expectation) rather than spreading
  // placements across roles. brain-search will rebalance.
  addBiasWall: 2.5, addBiasDps: 1.0, addBiasSlow: 0.6, addBiasAura: 0.4,
};

const INVALID_SCORE = -1e9;

/** Single placement record — what tower at what cell. The order in
 *  the state's array is the priority order (earlier = higher rank). */
export interface PlacedTower {
  col: number;
  row: number;
  towerId: string;
}

export interface BeamState {
  placedTowers: PlacedTower[];
  cost: number;
  score: number;
}

export interface BeamResult {
  /** Top beam member's plan, in priority order. */
  bestPlan: PlacedTower[];
  /** Score history per wave for diagnostics. */
  scoreHistory: number[];
  /** Final beam (top K). */
  finalBeam: BeamState[];
  /** Per-role best score across the planner run. Exposed so the
   *  scorer's confidence-floor veto can compare role-relative
   *  quality instead of plan-position rank. */
  bestRoleScore: Record<TowerRole, number>;
}

/** Placement cost — tower's gold cost plus a positional penalty
 *  that discourages clustering near the entry (cheap mazing without
 *  meaningful pressure). v2 keeps the POC's positional penalty
 *  formula but applies it to gold cost rather than abstract units. */
function placementCost(tower: TowerType, col: number, row: number, entry: PathPoint): number {
  const d = Math.abs(col - entry.col) + Math.abs(row - entry.row);
  return tower.cost * (1 + d * 0.005);
}

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

/** DPS coverage proxy: path cells within `tower.range` × tower DPS.
 *  Higher when the tower covers a long stretch of path with high
 *  effective damage. Range converted from tile units to pixels for
 *  consistency with the in-game tower range semantics. */
function dpsCoverage(tower: TowerType, col: number, row: number, paths: PathPoint[][]): number {
  const rangeCells = tower.range; // already in tile units in TowerType
  const r2 = rangeCells * rangeCells;
  const dpsPerSec = tower.damage * 1000 / Math.max(tower.fireRate, 1);
  let covered = 0;
  for (const path of paths) {
    for (const p of path) {
      const dc = p.col - col;
      const dr = p.row - row;
      if (dc * dc + dr * dr <= r2) covered++;
    }
  }
  return covered * dpsPerSec;
}

/** Slow value — same coverage formula, but multiplied by the slow
 *  factor (lower = stronger slow → higher value). 0.4 factor (60%
 *  slow) is a typical Frost. Returns 0 if the tower has no slow. */
function slowValue(tower: TowerType, col: number, row: number, paths: PathPoint[][]): number {
  const slow = getTrait(tower.traits, 'slow_on_hit');
  if (!slow) return 0;
  const factor = (slow as { factor?: number }).factor ?? 0.5;
  // Stronger slow = lower factor → higher value. Map 1.0..0 to 0..1.
  const slowStrength = Math.max(0, Math.min(1, 1 - factor));
  const rangeCells = tower.range;
  const r2 = rangeCells * rangeCells;
  let covered = 0;
  for (const path of paths) {
    for (const p of path) {
      const dc = p.col - col;
      const dr = p.row - row;
      if (dc * dc + dr * dr <= r2) covered++;
    }
  }
  return covered * slowStrength;
}

/** Aura amplification — sum over Chebyshev≤1 neighbours of their
 *  damage-per-second × the aura's strength. Auras score zero in
 *  isolation; only neighbours boost their value. v2 reads the
 *  `adjacency_buff` trait's strength fields. */
function auraAmplification(
  tower: TowerType, col: number, row: number,
  placed: PlacedTower[], lookupType: (id: string) => TowerType | null,
): number {
  const aura = getTrait(tower.traits, 'adjacency_buff');
  if (!aura) return 0;
  const ada = aura as { damageMult?: number; fireRateMult?: number };
  const dmgMult = (ada.damageMult ?? 1) - 1; // 1.2 → +0.2
  const frMult = 1 - (ada.fireRateMult ?? 1); // 0.8 → +0.2 (faster)
  const strength = Math.max(0, dmgMult + frMult);
  if (strength === 0) return 0;
  let amplified = 0;
  for (const p of placed) {
    if (p.col === col && p.row === row) continue;
    if (Math.abs(p.col - col) > 1 || Math.abs(p.row - row) > 1) continue;
    const t = lookupType(p.towerId);
    if (!t) continue;
    const dpsPerSec = t.damage * 1000 / Math.max(t.fireRate, 1);
    amplified += dpsPerSec;
  }
  return amplified * strength;
}

/** Score a state by applying its placedTowers to the baseline grid,
 *  measuring BFS metrics, and adding role-weighted role contributions.
 *  Restores the grid before returning. */
function scoreState(
  baseline: Grid,
  state: BeamState,
  paths: { start: PathPoint; end: PathPoint }[],
  opts: BeamOptions,
  lookupType: (id: string) => TowerType | null,
): { total: number; perRole: Record<TowerRole, number> } {
  const restore: { col: number; row: number; prev: CellType }[] = [];
  for (const p of state.placedTowers) {
    const prev = baseline.cells[p.row][p.col];
    if (prev === CellType.Empty || prev === CellType.NoBuild) {
      restore.push({ col: p.col, row: p.row, prev });
      baseline.cells[p.row][p.col] = CellType.Tower;
    }
  }
  try {
    const bfs = bfsScoreMulti(baseline, paths);
    if (!bfs.success) {
      return {
        total: INVALID_SCORE,
        perRole: emptyRoleScores(),
      };
    }

    // BFS-workload component (v1 terms).
    let total = (
      opts.alpha * bfs.pathLength +
      opts.beta * bfs.nodesExpanded +
      opts.gamma * bfs.maxQueue
    );

    // Role-aware components — sum across placed towers, bucketed by
    // role for the per-role best tracking. We need the BFS path
    // geometry for coverage scoring; pull it once and reuse.
    const pathGeoms: PathPoint[][] = [];
    for (const seg of paths) {
      const m = findPathWithMetrics(baseline, seg.start, seg.end);
      if (m) pathGeoms.push(m.path);
    }

    const perRole = emptyRoleScores();
    for (const placed of state.placedTowers) {
      const t = lookupType(placed.towerId);
      if (!t) continue;
      const role = getTowerRole(t);
      let cellScore = 0;
      if (role === 'dps-single' || role === 'dps-splash') {
        cellScore = opts.deltaDps * dpsCoverage(t, placed.col, placed.row, pathGeoms);
      } else if (role === 'slow') {
        cellScore = opts.epsilonSlow * slowValue(t, placed.col, placed.row, pathGeoms);
      } else if (role === 'aura') {
        cellScore = opts.zetaAura * auraAmplification(t, placed.col, placed.row, state.placedTowers, lookupType);
      }
      // Walls + utility get no role bonus — their value is purely
      // path-extension via the α term.
      perRole[role] = Math.max(perRole[role], cellScore);
      total += cellScore;
    }
    return { total, perRole };
  } finally {
    for (const r of restore) baseline.cells[r.row][r.col] = r.prev;
  }
}

function emptyRoleScores(): Record<TowerRole, number> {
  return {
    'wall': 0, 'dps-single': 0, 'dps-splash': 0,
    'slow': 0, 'aura': 0, 'utility': 0,
  };
}

/** Filter pool to towers that fit the budget remaining + still build
 *  on this cell (skips already-placed cells implicitly via the
 *  candidate filter). */
function affordablePool(pool: TowerType[], remaining: number): TowerType[] {
  return pool.filter(t => t.cost <= remaining);
}

/** Random tower pick weighted by per-role addBiasRole. Used by the
 *  random-mode operator path. */
function pickTowerRandom(pool: TowerType[], opts: BeamOptions): TowerType | null {
  if (pool.length === 0) return null;
  const weights = pool.map(t => {
    const role = getTowerRole(t);
    if (role === 'wall') return opts.addBiasWall;
    if (role === 'dps-single' || role === 'dps-splash') return opts.addBiasDps;
    if (role === 'slow') return opts.addBiasSlow;
    if (role === 'aura') return opts.addBiasAura;
    return 0.5; // utility — small but non-zero so they're occasionally tried
  });
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return pool[Math.floor(rng() * pool.length)];
  let r = rng() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/** Greedy tower pick: try every affordable tower at the cell, score
 *  each, return the highest-scoring tower. Heavier than random — but
 *  the cost is one BFS per affordable tower, well under the 4s
 *  decision budget. */
function pickTowerGreedy(
  pool: TowerType[], state: BeamState, col: number, row: number,
  baseline: Grid, paths: { start: PathPoint; end: PathPoint }[],
  opts: BeamOptions, lookupType: (id: string) => TowerType | null,
): TowerType | null {
  if (pool.length === 0) return null;
  let best: TowerType | null = null;
  let bestScore = -Infinity;
  for (const t of pool) {
    const trial: BeamState = {
      placedTowers: [...state.placedTowers, { col, row, towerId: t.id }],
      cost: state.cost,
      score: 0,
    };
    const { total } = scoreState(baseline, trial, paths, opts, lookupType);
    if (total > bestScore) { bestScore = total; best = t; }
  }
  return best;
}

function containsCell(arr: PlacedTower[], col: number, row: number): boolean {
  for (const a of arr) if (a.col === col && a.row === row) return true;
  return false;
}

function addTower(
  state: BeamState, candidates: Cell[], budget: number, entry: PathPoint,
  pool: TowerType[], opts: BeamOptions,
  baseline: Grid, paths: { start: PathPoint; end: PathPoint }[],
  lookupType: (id: string) => TowerType | null,
): BeamState | null {
  for (let attempt = 0; attempt < 50; attempt++) {
    const c = candidates[Math.floor(rng() * candidates.length)];
    if (!c) continue;
    if (containsCell(state.placedTowers, c.col, c.row)) continue;

    const remainingBudget = budget - state.cost;
    const affordable = affordablePool(pool, remainingBudget);
    if (affordable.length === 0) continue;

    const tower = opts.towerPickMode === 1
      ? pickTowerRandom(affordable, opts)
      : pickTowerGreedy(affordable, state, c.col, c.row, baseline, paths, opts, lookupType);
    if (!tower) continue;

    const cost = placementCost(tower, c.col, c.row, entry);
    if (state.cost + cost > budget) continue;

    return {
      placedTowers: [...state.placedTowers, { col: c.col, row: c.row, towerId: tower.id }],
      cost: state.cost + cost,
      score: -Infinity,
    };
  }
  return null;
}

/** Random walk wall-builder. Always picks the cheapest wall-class
 *  tower (or cheapest pool entry when no walls exist). Sequential
 *  placement matches the POC's `grow_branch` operator — produces
 *  long backbone structures the single-cell scorer can't reach. */
function growBranchTyped(
  state: BeamState, candidates: Cell[], budget: number, entry: PathPoint,
  pool: TowerType[], opts: BeamOptions, maxLen: number,
): BeamState | null {
  if (candidates.length === 0 || pool.length === 0) return null;
  // Pick cheapest wall-class tower; fall back to cheapest pool entry.
  const walls = pool.filter(t => getTowerRole(t) === 'wall');
  const wallTower = (walls.length > 0 ? walls : pool).reduce((a, b) => a.cost <= b.cost ? a : b);

  const candidateIdx = new Set<number>();
  for (const c of candidates) candidateIdx.add(c.row * 1000 + c.col);

  let seed: Cell | null = null;
  for (let attempt = 0; attempt < 50 && !seed; attempt++) {
    const cand = candidates[Math.floor(rng() * candidates.length)];
    if (cand && !containsCell(state.placedTowers, cand.col, cand.row)) seed = cand;
  }
  if (!seed) return null;

  const placed: PlacedTower[] = [...state.placedTowers];
  let cost = state.cost;
  let cx = seed.col, cy = seed.row;
  let added = 0;
  for (let i = 0; i < maxLen; i++) {
    const cellKey = cy * 1000 + cx;
    const inPool = candidateIdx.has(cellKey);
    const dup = containsCell(placed, cx, cy);
    if (inPool && !dup) {
      const stepCost = placementCost(wallTower, cx, cy, entry);
      if (cost + stepCost > budget) break;
      placed.push({ col: cx, row: cy, towerId: wallTower.id });
      cost += stepCost;
      added++;
    }
    const r = rng();
    if (r < 0.25) cx += 1;
    else if (r < 0.50) cx -= 1;
    else if (r < 0.75) cy += 1;
    else cy -= 1;
  }
  if (added === 0) return null;
  // Suppress unused-param warning; opts may be consumed by a future
  // role-bias pick path inside grow_branch (currently always cheapest).
  void opts;
  return { placedTowers: placed, cost, score: -Infinity };
}

function removeTower(state: BeamState): BeamState | null {
  if (state.placedTowers.length === 0) return null;
  return {
    placedTowers: state.placedTowers.slice(0, -1),
    cost: 0, // recompute opportunity — see v1 comment
    score: -Infinity,
  };
}

/** Swap a placed tower's type, keeping its cell. Picks a random
 *  placement and a random affordable replacement. */
function swapTower(
  state: BeamState, budget: number, pool: TowerType[], opts: BeamOptions,
  lookupType: (id: string) => TowerType | null,
): BeamState | null {
  if (state.placedTowers.length === 0 || pool.length === 0) return null;
  const idx = Math.floor(rng() * state.placedTowers.length);
  const cur = state.placedTowers[idx];
  const curType = lookupType(cur.towerId);
  // Compute remaining budget after refund of the old placement.
  const refund = curType ? curType.cost : 0;
  const remaining = budget - state.cost + refund;
  const affordable = affordablePool(pool.filter(t => t.id !== cur.towerId), remaining);
  if (affordable.length === 0) return null;
  const replacement = pickTowerRandom(affordable, opts);
  if (!replacement) return null;
  const next = state.placedTowers.slice();
  next[idx] = { col: cur.col, row: cur.row, towerId: replacement.id };
  return {
    placedTowers: next,
    cost: state.cost - refund + replacement.cost,
    score: -Infinity,
  };
}

function pickOp(opts: BeamOptions): 'add' | 'grow' | 'remove' | 'swap' {
  const total = opts.pAddTower + opts.pGrowBranch + opts.pRemoveTower + opts.pSwapTower;
  if (total <= 0) return 'add';
  const r = rng() * total;
  if (r < opts.pAddTower) return 'add';
  if (r < opts.pAddTower + opts.pGrowBranch) return 'grow';
  if (r < opts.pAddTower + opts.pGrowBranch + opts.pRemoveTower) return 'remove';
  return 'swap';
}

function mutate(
  state: BeamState, candidates: Cell[], budget: number, entry: PathPoint,
  pool: TowerType[], opts: BeamOptions,
  baseline: Grid, paths: { start: PathPoint; end: PathPoint }[],
  lookupType: (id: string) => TowerType | null,
): BeamState | null {
  for (let i = 0; i < 5; i++) {
    const op = pickOp(opts);
    let next: BeamState | null = null;
    if (op === 'add') next = addTower(state, candidates, budget, entry, pool, opts, baseline, paths, lookupType);
    else if (op === 'grow') next = growBranchTyped(state, candidates, budget, entry, pool, opts, opts.growBranchMaxLen);
    else if (op === 'remove') next = removeTower(state);
    else next = swapTower(state, budget, pool, opts, lookupType);
    if (next) return next;
  }
  return null;
}

/** Run the beam search.
 *
 *  @param baseline Grid in its current state (NOT mutated).
 *  @param candidates Cells the bot may legally place towers on.
 *  @param paths Spawner→exit segments.
 *  @param towerPool Towers the bot can afford-check against. v2 picks
 *    placements from this pool. Pass empty to fall back to a single-
 *    wall-stub mode (for tests / legacy callers).
 *  @param opts Hyperparameters.
 */
export function runBeam(
  baseline: Grid,
  candidates: Cell[],
  paths: { start: PathPoint; end: PathPoint }[],
  towerPool: TowerType[],
  opts: BeamOptions = DEFAULT_BEAM_OPTIONS,
): BeamResult {
  const lookupType = makeTowerLookup(towerPool);
  // Empty pool fallback — synthesise a generic wall stub. This keeps
  // tests + unconfigured callers working without a tower-pool plumbed
  // through. The stub is only used for placement; role-aware scoring
  // returns 0 for the stub since it doesn't match any role.
  const pool = towerPool.length > 0 ? towerPool : [SYNTHETIC_WALL];
  if (towerPool.length === 0) lookupType.set(SYNTHETIC_WALL.id, SYNTHETIC_WALL);

  const initial: BeamState = { placedTowers: [], cost: 0, score: -Infinity };
  initial.score = scoreState(baseline, initial, paths, opts, (id) => lookupType.get(id) ?? null).total;
  let beam: BeamState[] = [initial];
  const scoreHistory: number[] = [initial.score];
  const bestRoleScore = emptyRoleScores();

  for (let wave = 0; wave < opts.waves; wave++) {
    const budget = opts.baseBudget + wave * opts.budgetGrowth;
    const cands: BeamState[] = [...beam];
    for (const state of beam) {
      for (let m = 0; m < opts.mutationsPerState; m++) {
        const next = mutate(state, candidates, budget, baseline.entry, pool, opts, baseline, paths, (id) => lookupType.get(id) ?? null);
        if (!next) continue;
        const s = scoreState(baseline, next, paths, opts, (id) => lookupType.get(id) ?? null);
        if (s.total === INVALID_SCORE) continue;
        next.score = s.total;
        for (const role of Object.keys(s.perRole) as TowerRole[]) {
          if (s.perRole[role] > bestRoleScore[role]) bestRoleScore[role] = s.perRole[role];
        }
        cands.push(next);
      }
    }
    cands.sort((a, b) => b.score - a.score);
    beam = cands.slice(0, opts.beamWidth);
    scoreHistory.push(beam[0].score);
  }

  return {
    bestPlan: beam[0]?.placedTowers ?? [],
    scoreHistory,
    finalBeam: beam,
    bestRoleScore,
  };
}

/** Cache lookups by id so the score function doesn't linear-scan
 *  `towerPool` per placed tower. */
function makeTowerLookup(pool: TowerType[]): Map<string, TowerType> {
  const m = new Map<string, TowerType>();
  for (const t of pool) m.set(t.id, t);
  return m;
}

/** Synthetic generic wall — used when no towerPool is provided.
 *  Behaves like a free wall placement for the BFS scorer; role
 *  scoring returns 0. */
const SYNTHETIC_WALL: TowerType = {
  id: '__beam_wall__',
  name: 'Beam Wall',
  cost: 10,
  damage: 0,
  range: 1,
  fireRate: 99999,
  damageType: 'physical',
  color: 0x666666,
  projectileSpeed: 0,
  sellRefundRatio: 0,
  upgrades: [],
  traits: [{ id: 'direct_damage' }],
  hotkey: '0',
  description: 'Beam-internal wall stub',
};

// Suppress unused warnings for symbols we keep imported for v3 work.
void TILE_SIZE;
void hasTrait;
