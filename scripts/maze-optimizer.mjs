#!/usr/bin/env node
/**
 * Maze Optimizer — standalone tool.
 *
 * Given a map id, finds wall placements that maximise the shortest-path
 * length from entries to exits. Reuses the game's Grid + Pathfinding
 * (BFS) so the optimum the tool reports is literally the same path the
 * in-game creep would walk if the player had built towers on those
 * cells.
 *
 * UNBOUNDED MODE (default): no wall budget — the optimizer keeps
 * placing walls greedily as long as each placement extends the path.
 * Terminates when no on/near-path cell improves the score, OR a safety
 * cap (empty-cell count) is hit. The theoretical bound is a
 * Hamiltonian-path on the playable graph; greedy approaches but does
 * not generally reach it.
 *
 * BOUNDED MODE (override): pass --wall-budget=N to cap the number of
 * walls — useful when you want a sized configuration (e.g. matching a
 * tower-count budget) rather than the absolute maximum.
 *
 * ALGORITHM — Greedy on-path with random restarts.
 *
 * Why this one (vs beam / GA / MCTS):
 *   - The branching factor on the raw grid is ~800 cells, but a
 *     wall placed OFF the current shortest path doesn't change the
 *     path AT ALL (the path stays where it was). So at each step
 *     we only need to consider candidates ON the current shortest
 *     path — typically 30-50 cells. That alone cuts the per-step
 *     inner loop by ~20x.
 *   - Greedy converges to a local optimum quickly. We run K random
 *     restarts (each seeded by a different first wall drawn from
 *     the path) and keep the best — this gives us natural diversity
 *     for topN at almost no cost.
 *   - Beam search adds complexity but produces near-duplicate
 *     solutions unless you bolt on an explicit diversity gate;
 *     restart-based search gets diversity for free.
 *
 *   Reference shape:  P = findPath(grid)
 *                     loop until no improvement (or budget hit):
 *                       best ← argmax over c ∈ P\{entry,exit}
 *                              of path_length(grid + wall@c)
 *                       if best > current, place(best) else stop.
 *                     restart with different RNG first-wall pick.
 *
 *   Cost in UNBOUNDED mode: O(restarts · maxChain · path_length · BFS).
 *   On plains the path can grow toward several hundred. Per-restart
 *   progress is emitted to stderr so the user can tell it isn't hung.
 *
 * Output format (single solution):
 *   { walls: [{col,row}], pathLength, path: [{col,row}],
 *     baselinePathLength, mapId, seed, wallBudget }
 *
 *   `wallBudget` is `null` when unbounded; the achieved wall count is
 *   always `walls.length`.
 *
 * Output format (topN > 1): array of the above, sorted by pathLength desc.
 *
 * CLI:
 *   # Unbounded (default) — find the absolute max:
 *   node --import tsx scripts/maze-optimizer.mjs \
 *     --map=plains --seed=42 --top-n=3 \
 *     --out=traces/mazes/plains-max.json
 *
 *   # Bounded (override) — cap wall count:
 *   node --import tsx scripts/maze-optimizer.mjs \
 *     --map=plains --wall-budget=20 --seed=42 --top-n=3
 *
 * No file output if --out is omitted; the JSON goes to stdout.
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── tsx-loaded TS imports ─────────────────────────────────────
// Grid + findPath are the canonical game modules. ResponsiveManager
// stays uninitialised in Node — its default _mode='desktop' makes
// gridCols() return 36 without touching window, so no jsdom needed.
const { Grid, CellType } = await import('../src/systems/Grid.ts');
const { findPath } = await import('../src/systems/Pathfinding.ts');
const { MAPS } = await import('../src/data/Maps.ts');

// ─── CLI parsing ───────────────────────────────────────────────
function parseArgs() {
  const args = {
    map: 'plains',
    wallBudget: null, // null = unbounded; bounded if --wall-budget=N is passed
    seed: 42,
    topN: 1,
    restarts: null, // null = derived from topN (Math.max(topN * 4, 8))
    out: null,
    quiet: false,
  };
  for (const arg of process.argv.slice(2)) {
    const [k, v] = arg.replace(/^--/, '').split('=');
    switch (k) {
      case 'map': args.map = v; break;
      case 'wall-budget': args.wallBudget = parseInt(v, 10); break;
      case 'seed': args.seed = parseInt(v, 10); break;
      case 'top-n': args.topN = parseInt(v, 10); break;
      case 'restarts': args.restarts = parseInt(v, 10); break;
      case 'out': args.out = v; break;
      case 'quiet': args.quiet = true; break;
      default: throw new Error(`Unknown arg: --${k}`);
    }
  }
  return args;
}

// ─── Deterministic RNG (mulberry32) ────────────────────────────
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 0xFFFFFFFF;
  };
}

// ─── Path-length scoring ───────────────────────────────────────
/**
 * Sum of shortest-path lengths over all (entry, exit) pairs. Returns
 * null (treated as -Infinity by callers) if ANY pair is disconnected
 * — that's our hard reject for "creeps would have no path at all".
 *
 * For maps where the game pairs each entry with the nearest exit
 * (multi-spawn round-robin), the sum-over-all-pairs is an upper
 * bound on what the game uses, but is monotone in the same direction
 * so it's safe to optimise.
 */
function totalPathLength(grid) {
  let total = 0;
  for (const entry of grid.entries) {
    for (const exit of grid.exits) {
      const p = findPath(grid, entry, exit);
      if (!p) return null;
      total += p.length;
    }
  }
  return total;
}

/** Path for the first entry/exit pair — used for "candidate cells lie on the path". */
function primaryPath(grid) {
  return findPath(grid, grid.entries[0], grid.exits[0]);
}

/**
 * Union of paths over ALL entry/exit pairs. Used as the candidate
 * generator on multi-entry / multi-exit maps so seed walls can land
 * on a path that doesn't pass through entries[0]/exits[0] (which on
 * e.g. gauntlet or crossroads is a small minority of the total
 * routing surface).
 */
function allPathCells(grid) {
  const cells = new Map();
  for (const entry of grid.entries) {
    for (const exit of grid.exits) {
      const p = findPath(grid, entry, exit);
      if (!p) continue;
      for (const c of p) {
        cells.set(keyOf(c.col, c.row), c);
      }
    }
  }
  return [...cells.values()];
}

// ─── Grid helpers ──────────────────────────────────────────────
function buildGrid(mapId) {
  const mapDef = MAPS[mapId];
  if (!mapDef) throw new Error(`Unknown map id: ${mapId}`);
  return new Grid(mapDef);
}

function isPlaceable(grid, col, row) {
  // Same gate the game uses: only CellType.Empty accepts a tower.
  return grid.canPlaceTower(col, row);
}

function placeWall(grid, col, row) {
  grid.cells[row][col] = CellType.Tower;
}

function clearWall(grid, col, row) {
  grid.cells[row][col] = CellType.Empty;
}

function keyOf(col, row) {
  return row * 1000 + col;
}

// ─── Greedy on-path with one starting wall ─────────────────────
/**
 * Run greedy until either (a) budget is exhausted, or (b) no legal
 * candidate placement remains (every candidate would disconnect the
 * graph). The first wall is forced to `firstWall` (must be a
 * Placeable cell on the initial path); after that we pick the best
 * on-path cell each iteration.
 *
 * IMPORTANT — non-improving walls are accepted on purpose. The greedy
 * lookahead is 1-step, so a placement that doesn't extend the path
 * RIGHT NOW often sets up a +2 gain on the next iteration (e.g., the
 * first wall of a serpentine "tooth" doesn't shift the path, but the
 * second wall on the OTHER side of it forces a U-turn). On plains
 * with a strict-improvement break, greedy stops after 1 wall (path
 * 36→38) because no second wall ALONE adds length; with the
 * non-improving-accepted policy, the same algorithm builds a full
 * serpentine path of length ~470.
 *
 * Termination in UNBOUNDED mode comes from the OUTER `step < budget`
 * loop, which is `step < placeableCount` — after that many walls the
 * map is saturated. In practice greedy stops earlier when no legal
 * candidate remains (every neighbouring cell would block the route).
 *
 * Returns { walls, pathLength } or null if firstWall disconnects.
 *
 * `onProgress(step, score, candidateCount)` is called once per
 * accepted placement, so callers can print a per-restart heartbeat.
 */
function greedyFromSeed(grid, budget, firstWall, onProgress) {
  const walls = [];

  // Place the seed wall, verify it doesn't disconnect.
  placeWall(grid, firstWall.col, firstWall.row);
  walls.push({ col: firstWall.col, row: firstWall.row });
  let score = totalPathLength(grid);
  if (score === null) {
    clearWall(grid, firstWall.col, firstWall.row);
    walls.pop();
    return null;
  }

  // Greedy extension. `step < budget` is `true` forever when
  // budget = Infinity — termination happens via the "no improvement"
  // break below.
  for (let step = 1; step < budget; step++) {
    const path = primaryPath(grid);
    if (!path) break; // should not happen — score was just valid

    let bestScore = -Infinity;
    let bestCell = null;
    const wallSet = new Set(walls.map(w => keyOf(w.col, w.row)));

    // Candidate set = cells ON the current shortest path PLUS cells
    // directly adjacent (4-neighbour) to it. Off-path-on-path-only
    // misses the "close the detour" moves: walling a cell just off
    // the path doesn't change the path now, but combined with a
    // future on-path wall it forces a longer detour. We let BFS
    // evaluate the score and only need the candidate set to include
    // every cell that COULD plausibly help.
    const candidates = new Map();
    const addCandidate = (c, r) => {
      if (r < 0 || r >= grid.rows || c < 0 || c >= grid.cols) return;
      if (!isPlaceable(grid, c, r)) return;
      const k = keyOf(c, r);
      if (wallSet.has(k)) return;
      if (!candidates.has(k)) candidates.set(k, { col: c, row: r });
    };
    for (const cell of path) {
      addCandidate(cell.col, cell.row);
      addCandidate(cell.col + 1, cell.row);
      addCandidate(cell.col - 1, cell.row);
      addCandidate(cell.col, cell.row + 1);
      addCandidate(cell.col, cell.row - 1);
    }

    for (const cell of candidates.values()) {
      placeWall(grid, cell.col, cell.row);
      const s = totalPathLength(grid);
      clearWall(grid, cell.col, cell.row);

      if (s !== null && s > bestScore) {
        bestScore = s;
        bestCell = cell;
      }
    }

    if (!bestCell) break; // no legal candidate at all

    // Accept the best wall even if it doesn't strictly improve (see
    // docstring). The outer `step < budget` loop bounds total walls:
    // in BOUNDED mode budget is the user-supplied N; in UNBOUNDED mode
    // budget is `placeableCount` (capped by the caller). Loop ends
    // when either limit is hit OR no legal candidate remains.
    placeWall(grid, bestCell.col, bestCell.row);
    walls.push({ col: bestCell.col, row: bestCell.row });
    score = bestScore;
    if (onProgress) onProgress(walls.length, score, candidates.size);
  }

  return { walls, pathLength: score };
}

// ─── Hill-climb post-pass ──────────────────────────────────────
/**
 * After greedy converges, try single-cell swaps: for each placed
 * wall w and each unplaced candidate c on/adjacent to the current
 * shortest path, swap w↔c and keep the swap if score improves. Loop
 * until no swap improves the score (locally optimal).
 *
 * Cheap: bounded by O(budget · candidates · BFS). On plains b=20
 * this typically does 1-3 passes of ~20·50 BFS calls each = ~5000
 * BFS in ~150ms.
 */
function hillClimbSwap(grid, walls) {
  let score = totalPathLength(grid);
  if (score === null) return { walls, pathLength: -Infinity };
  let improved = true;
  let safety = 0;
  while (improved && safety < 50) {
    improved = false;
    safety++;
    const path = primaryPath(grid);
    if (!path) break;
    // Build candidate set: on/adjacent to current path, not already a wall.
    const wallKeys = new Set(walls.map(w => keyOf(w.col, w.row)));
    const candidates = new Map();
    const addCand = (c, r) => {
      if (r < 0 || r >= grid.rows || c < 0 || c >= grid.cols) return;
      if (!isPlaceable(grid, c, r)) return;
      const k = keyOf(c, r);
      if (wallKeys.has(k)) return;
      if (!candidates.has(k)) candidates.set(k, { col: c, row: r });
    };
    for (const cell of path) {
      addCand(cell.col, cell.row);
      addCand(cell.col + 1, cell.row);
      addCand(cell.col - 1, cell.row);
      addCand(cell.col, cell.row + 1);
      addCand(cell.col, cell.row - 1);
    }

    // Try every (placed wall, candidate) swap. Greedy first-improvement
    // rather than best-improvement — cheaper and converges to the same
    // local optimum (just along a different trajectory).
    for (let i = 0; i < walls.length && !improved; i++) {
      const w = walls[i];
      clearWall(grid, w.col, w.row);
      for (const c of candidates.values()) {
        placeWall(grid, c.col, c.row);
        const s = totalPathLength(grid);
        if (s !== null && s > score) {
          // Accept swap.
          walls[i] = { col: c.col, row: c.row };
          score = s;
          improved = true;
          break;
        }
        clearWall(grid, c.col, c.row);
      }
      if (!improved) {
        placeWall(grid, w.col, w.row); // restore
      }
    }
  }
  return { walls, pathLength: score };
}

// ─── Multi-restart driver ──────────────────────────────────────
/**
 * Run `restarts` independent greedy runs, each seeded by a different
 * cell drawn from the BASELINE shortest path (no walls). Returns all
 * solutions deduplicated by wall-set, sorted by pathLength descending.
 *
 * Deduplication: two solutions are "the same" if their wall sets are
 * equal as integer sets. We hash by sorted-keys string.
 *
 * `wallBudget = Infinity` means unbounded — greedy stops on its own
 * once no candidate strictly improves the path.
 *
 * `verbose` toggles per-restart stderr progress lines.
 */
function optimize(mapId, wallBudget, seed, restarts, topN, verbose) {
  const rng = mulberry32(seed);

  // Baseline metric (no walls) — read this BEFORE we start touching
  // the grid, since we mutate-revert per candidate but want a clean
  // reference for the writeup.
  const baselineGrid = buildGrid(mapId);
  const baselinePath = primaryPath(baselineGrid);
  if (!baselinePath) {
    throw new Error(`Map ${mapId} has no entry→exit path even with zero walls.`);
  }
  const baselinePathLength = totalPathLength(baselineGrid);

  // Outer safety cap on wall count. In UNBOUNDED mode the user-
  // supplied budget is `Infinity`; we clamp to `placeableCount` so the
  // greedy loop has a finite outer bound. Greedy naturally terminates
  // earlier when no legal candidate remains (every neighbouring cell
  // would disconnect the route) — `placeableCount` is just the
  // pathological-case ceiling.
  let placeableCount = 0;
  for (let r = 0; r < baselineGrid.rows; r++) {
    for (let c = 0; c < baselineGrid.cols; c++) {
      if (isPlaceable(baselineGrid, c, r)) placeableCount++;
    }
  }
  const greedyBudget = Math.min(wallBudget, placeableCount);

  // Seed pool — two layers:
  //   (a) ON-PATH: placeable cells on ANY baseline entry/exit path. The
  //       natural start point — these guarantee the first wall cuts a
  //       working route.
  //   (b) OFF-PATH: placeable cells NOT on any baseline path. On maps
  //       where the baseline is a tight corridor (e.g. plains, row 13),
  //       on-path-only seeds bias every restart toward zigzagging in
  //       that same corridor. Off-path seeds force greedy to first build
  //       OUT to a different region of the grid, biasing toward
  //       structurally different mazes (top-anchored vs bottom-anchored
  //       vs perpendicular). The first off-path wall typically doesn't
  //       change the path, but it locks a future maze-shape decision.
  //
  // We feed (a) and (b) in interleaved order so the first few restarts
  // span both — the topN diversity-penalty pass at the end picks the
  // structurally distinct winners.
  const onPathCells = allPathCells(baselineGrid).filter(p => isPlaceable(baselineGrid, p.col, p.row));
  const onPathKeys = new Set(onPathCells.map(p => keyOf(p.col, p.row)));
  const offPathCells = [];
  for (let r = 0; r < baselineGrid.rows; r++) {
    for (let c = 0; c < baselineGrid.cols; c++) {
      if (!isPlaceable(baselineGrid, c, r)) continue;
      if (onPathKeys.has(keyOf(c, r))) continue;
      offPathCells.push({ col: c, row: r });
    }
  }
  if (onPathCells.length === 0) {
    return {
      baselinePathLength,
      baselinePath,
      solutions: [],
    };
  }

  // Shuffle each pool independently with the seeded RNG for reproducibility.
  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  const onShuffled = shuffle([...onPathCells]);
  const offShuffled = shuffle([...offPathCells]);

  // First restart starts from the path midpoint — a strong heuristic
  // that often beats random for the single-solution case (the longest
  // detours come from cutting the middle of the corridor). Remaining
  // restarts interleave on-path and off-path seeds (one of each, round-
  // robin) so we get structural variety in the first `restarts` runs.
  const primary = primaryPath(baselineGrid).filter(p => isPlaceable(baselineGrid, p.col, p.row));
  const mid = primary.length > 0 ? primary[Math.floor(primary.length / 2)] : onPathCells[0];
  const midKey = keyOf(mid.col, mid.row);
  const onRest = onShuffled.filter(o => keyOf(o.col, o.row) !== midKey);

  const seedCells = [mid];
  let oi = 0, fi = 0;
  // Interleave: one off-path, one on-path, one off-path, ... starting
  // with off-path so structurally different seeds get explored EARLY
  // (within the first few restarts when restart count is small).
  while (seedCells.length < onRest.length + offShuffled.length + 1) {
    if (fi < offShuffled.length) seedCells.push(offShuffled[fi++]);
    if (oi < onRest.length) seedCells.push(onRest[oi++]);
  }

  // Collect raw solutions first (greedy + swap pass), then apply a
  // diversity-penalised topN selection in a second pass.
  const seen = new Map(); // wall-set hash → solution
  let runs = 0;
  for (const firstWall of seedCells) {
    if (runs >= restarts) break;
    runs++;
    const restartStart = Date.now();
    const grid = buildGrid(mapId);
    const greedyResult = greedyFromSeed(grid, greedyBudget, firstWall);
    if (!greedyResult) {
      if (verbose) process.stderr.write(`[maze-optimizer] restart ${runs}/${restarts}: seed (${firstWall.col},${firstWall.row}) disconnected, skipped\n`);
      continue;
    }
    // Hill-climb post-pass: try wall swaps. Operates on the same grid
    // greedy left mutated. Cheap and usually finds 0-15% improvement
    // in bounded mode; near-zero in unbounded (greedy has already
    // saturated the local optimum).
    const polished = hillClimbSwap(grid, greedyResult.walls);
    if (polished.pathLength === -Infinity) continue;

    const sortedKeys = polished.walls.map(w => keyOf(w.col, w.row)).sort((a, b) => a - b).join(',');
    if (verbose) {
      const dupe = seen.has(sortedKeys) ? ' [dup]' : '';
      process.stderr.write(`[maze-optimizer] restart ${runs}/${restarts}: seed=(${firstWall.col},${firstWall.row}) walls=${polished.walls.length} path=${polished.pathLength} time=${Date.now() - restartStart}ms${dupe}\n`);
    }
    if (seen.has(sortedKeys)) continue;

    // Re-run pathfinding on a fresh grid so the returned `path` is
    // reproducible and pathLength is verified independent of any
    // per-restart accumulation drift.
    const finalGrid = buildGrid(mapId);
    for (const w of polished.walls) placeWall(finalGrid, w.col, w.row);
    const finalScore = totalPathLength(finalGrid);
    const finalPath = primaryPath(finalGrid);

    seen.set(sortedKeys, {
      walls: polished.walls.slice(),
      pathLength: finalScore,
      path: finalPath,
    });
  }

  const raw = [...seen.values()].sort((a, b) => b.pathLength - a.pathLength);

  // Diversity-penalised topN selection. The first solution is always
  // the best raw. For each subsequent slot we maximise:
  //   pathLength - λ · max_jaccard_similarity_to_existing
  // λ scales with the max pathLength so the penalty is meaningful
  // across different maps. A solution that overlaps 90% with #1 gets
  // a stiff penalty; one with 30% overlap is preferred even if its
  // raw score is slightly lower.
  if (raw.length === 0 || topN <= 1) {
    return { baselinePathLength, baselinePath, solutions: raw.slice(0, Math.max(1, topN)) };
  }
  const selected = [raw[0]];
  const candidates = raw.slice(1);
  const lambda = raw[0].pathLength * 0.5; // penalty up to 50% of the best score
  while (selected.length < topN && candidates.length > 0) {
    let bestIdx = -1;
    let bestUtil = -Infinity;
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      let maxSim = 0;
      for (const s of selected) {
        const sim = 1 - jaccard(c.walls, s.walls);
        if (sim > maxSim) maxSim = sim;
      }
      const util = c.pathLength - lambda * maxSim;
      if (util > bestUtil) {
        bestUtil = util;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) break;
    selected.push(candidates[bestIdx]);
    candidates.splice(bestIdx, 1);
  }
  return { baselinePathLength, baselinePath, solutions: selected };
}

// ─── Wall-set diversity (Jaccard) ──────────────────────────────
/**
 * Jaccard distance between two wall sets — 0 = identical, 1 = disjoint.
 * Used to summarise topN diversity in the writeup.
 */
function jaccard(a, b) {
  const sa = new Set(a.map(w => keyOf(w.col, w.row)));
  const sb = new Set(b.map(w => keyOf(w.col, w.row)));
  let inter = 0;
  for (const k of sa) if (sb.has(k)) inter++;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : 1 - inter / union;
}

// ─── Public API ────────────────────────────────────────────────
/**
 * @param {string} mapId
 * @param {{
 *   wallBudget?: number | null,  // null/undefined/Infinity → unbounded
 *   seed?: number,
 *   topN?: number,
 *   restarts?: number,
 *   verbose?: boolean,           // per-restart stderr lines
 * }} opts
 * @returns single solution object if topN<=1, array of solutions otherwise.
 *
 * `wallBudget` is treated as `Infinity` when null/undefined. Use a
 * finite value to cap wall count; the achieved count (`walls.length`)
 * is what matters at the output.
 */
export function optimizeMaze(mapId, opts) {
  // null / undefined → unbounded. Sentinel passed downstream is Infinity.
  const requestedBudget = opts.wallBudget;
  const wallBudget = (requestedBudget == null || !isFinite(requestedBudget))
    ? Infinity
    : requestedBudget;
  const seed = opts.seed ?? 0;
  const topN = opts.topN ?? 1;
  // Default restarts: 8 is plenty for unbounded (each chain is long
  // and expensive). Bounded callers can bump it via opts.restarts.
  const restarts = opts.restarts ?? Math.max(topN * 4, 8);
  const verbose = !!opts.verbose;

  const { baselinePathLength, solutions } = optimize(mapId, wallBudget, seed, restarts, topN, verbose);

  // Emit `wallBudget: null` in the output when unbounded; the real
  // wall count is in walls.length anyway and a literal `Infinity`
  // doesn't survive JSON.stringify (becomes null silently).
  const outputBudget = isFinite(wallBudget) ? wallBudget : null;

  const enrich = (sol) => ({
    mapId,
    wallBudget: outputBudget,
    seed,
    baselinePathLength,
    pathLength: sol.pathLength,
    walls: sol.walls,
    path: sol.path,
  });

  if (topN <= 1) {
    return solutions[0]
      ? enrich(solutions[0])
      : { mapId, wallBudget: outputBudget, seed, baselinePathLength, pathLength: baselinePathLength, walls: [], path: null };
  }
  return solutions.slice(0, topN).map(enrich);
}

// ─── CLI entrypoint ────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const isMain = process.argv[1] === __filename || resolve(process.argv[1]) === __filename;

if (isMain) {
  const args = parseArgs();
  const t0 = Date.now();
  const result = optimizeMaze(args.map, {
    wallBudget: args.wallBudget, // null → unbounded
    seed: args.seed,
    topN: args.topN,
    restarts: args.restarts ?? undefined, // undefined → default
    verbose: !args.quiet,
  });
  const wallMs = Date.now() - t0;

  const summary = (() => {
    const r = Array.isArray(result) ? result[0] : result;
    if (!r) return { baseline: null, optimized: null, wallCount: 0 };
    return { baseline: r.baselinePathLength, optimized: r.pathLength, wallCount: r.walls.length };
  })();

  if (!args.quiet) {
    const budgetLabel = args.wallBudget == null ? 'unbounded' : String(args.wallBudget);
    const restartsLabel = args.restarts == null ? 'auto' : String(args.restarts);
    process.stderr.write(`[maze-optimizer] map=${args.map} budget=${budgetLabel} seed=${args.seed} restarts=${restartsLabel} topN=${args.topN}\n`);
    process.stderr.write(`[maze-optimizer] baseline path length: ${summary.baseline}\n`);
    process.stderr.write(`[maze-optimizer] optimized path length: ${summary.optimized}\n`);
    process.stderr.write(`[maze-optimizer] walls placed: ${summary.wallCount}\n`);
    process.stderr.write(`[maze-optimizer] wall-clock: ${wallMs} ms\n`);
    if (Array.isArray(result) && result.length > 1) {
      const distances = [];
      for (let i = 1; i < result.length; i++) {
        distances.push(jaccard(result[0].walls, result[i].walls).toFixed(3));
      }
      process.stderr.write(`[maze-optimizer] topN jaccard distances vs #1: ${distances.join(', ')}\n`);
    }
  }

  const payload = JSON.stringify(result, null, 2);
  if (args.out) {
    mkdirSync(dirname(args.out), { recursive: true });
    writeFileSync(args.out, payload);
    if (!args.quiet) process.stderr.write(`[maze-optimizer] wrote ${args.out}\n`);
  } else {
    process.stdout.write(payload + '\n');
  }
}
