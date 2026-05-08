# Brain Mazing Algorithm — Plan (v2)

Branch: `ah/feature/brain-mazing-algo` (off `develop`)

This plan supersedes the v1 draft. Reoriented around your `ml/mazing/`
PRD + POC, with the answers you locked in:
- v1 ships a new brain `MazingBrain` that subclasses BalancedBrain
- Auto-tuning via `scripts/brain-search.mjs`
- Module name: `MazingScorer`

## What we're aligning to

**Your POC** (`ml/mazing/adversarial_impl.py` + `adversarial_bfs_mazing_prd.md`):
an offline beam-search optimizer that maximizes BFS workload. Each wave
expands a beam of candidate grids via mutation operators (`add_wall`,
`grow_branch`, `remove_wall`), scored by:

```
score = α·path_length + β·nodes_expanded + γ·max_queue
```

Defaults α=5, β=1, γ=0.5. Budget grows per wave (10 + wave×8 in the POC).

**The game's existing seam** (`src/systems/bots/MazePlanner.ts`):
greedy single-cell scorer used only for walls in `BalancedBrain.decideMaze()`.
DPS / slow / mobile / aura placements use a different scorer entirely.

The new module replaces the greedy scorer with the adversarial planner,
exposes a per-decision API the brain can consume, and a new brain
(`MazingBrain`) drives placement off it.

## Naming

`MazingScorer` per your preference. Module exposes both a planner API
(beam search produces a target layout) and a per-decision query API
(brain pulls the next best placement from the cached plan).

## Architecture

### Three layers

```
                      ┌─────────────────────┐
                      │   MazingBrain       │  decide()
                      │   (subclass of      │
                      │    BalancedBrain)   │
                      └──────────┬──────────┘
                                 │
                       wishlist  │  next-cell
                       fall-     │  query
                       through   ▼
                      ┌─────────────────────┐
                      │   MazingScorer      │  bestCell()
                      │   - per-decision    │  scoreCells()
                      │     API             │
                      │   - cached target   │
                      │     layout          │
                      └──────────┬──────────┘
                                 │
                                 ▼
                      ┌─────────────────────┐
                      │   AdversarialBeam   │  beamSearch()
                      │   (port of POC)     │
                      │   - mutate          │
                      │   - bfsScore        │
                      │   - select          │
                      └─────────────────────┘
```

### How a decision works (v1 — unweighted)

```
MazingBrain.decide(ctx):
  1. inherit BalancedBrain's meta pass + phase logic (frontier/send rolls,
     panic mode, ultimate-save). Tower-pick still uses BalancedBrain.
  2. when the decision is "place a tower":
     a. if no cached layout for this match-state-key:
        run AdversarialBeam.beamSearch(grid, totalBudget, opts)
        cache the result keyed by (paths, blockedCells, totalBudget bucket)
     b. pick the next cell in the layout that is:
        - currently in ctx.candidateCells (zone + walkable check)
        - currently affordable for the chosen tower
     c. if no such cell, fall through to the brain's existing scorer
        (preserves baseline behavior — no regression)
  3. upgrade / sell fallback paths unchanged
```

Cache invalidation on (a) new tower placed by anyone, (b) wave count crossing
a threshold, (c) budget jumping by ≥30% from the cached projection. Stale
cache entry just triggers a re-plan; cost is bounded.

### How v2 (tower-weighted) extends

The POC's `add_wall` mutation becomes `add_tower(towerId)`. The score
function gains tower-typed terms:

```
score_v2 = α·path_length + β·nodes_expanded + γ·max_queue
        + δ·dps_in_path_range_for_dps_towers
        + ε·slow_time_at_choke_for_slow_towers
        + ζ·adjacency_bonus_for_aura_towers
```

Tower-pool drives mutations: instead of "add wall", the engine picks a
tower from `ctx.towerPool` weighted by role and remaining wave budget,
then chooses the cell. v2 still respects v1's path-extension term so
walls remain valuable; the new terms add dimensions specific to each
tower's purpose.

Brain side: the wishlist becomes the *brain's* preference order
(slow → splash → single → wall → upgrade), and `MazingScorer.bestCell(ctx, towerType)`
returns null when no cell scores above a confidence floor. This is the
"wait N waves and slows will be great here" emergent behavior — every
4s the brain re-walks its wishlist and the planner's veto changes.

## Module layout

```
src/systems/bots/mazing/
  MazingScorer.ts          public API: scoreCells, bestCell, planLayout
  AdversarialBeam.ts       port of the POC: mutate, bfsScore, beam loop
  layoutCache.ts           per-(grid, budget) memoization
  RoleWeights.ts           v2: per-role α/β/γ/δ/ε/ζ weights
  MazingScorer.test.ts     vitest specs (≥15)
src/systems/bots/brains/
  MazingBrain.ts           extends BalancedBrain, swaps cell selection
  MazingBrain.test.ts      regression: behaviour under known seeds
src/headless/brain-search/
  MazingBrainSchema.ts     ParamSchema for ES auto-tuning
```

## Mapping the POC to the game

### POC primitives → game equivalents

| POC | Game |
|-----|------|
| `GRID_W × GRID_H` rectangular grid | `Grid` from `Grid.ts` (36×26, with map-defined walkability) |
| `START`, `GOAL` corner cells | `grid.entry`, `grid.exit` (or per-spawner endpoints in Circle Co-op) |
| `WALL`, `EMPTY` | `CellType.Blocked` (towers) vs `CellType.Empty` |
| `bfs(grid)` returning `path_length, nodes_expanded, max_queue` | Extend `Pathfinding.findPath` to return metrics. Existing impl is already typed-array BFS — just exposes the counters |
| `placement_cost(x, y) = 1 + dist_from_start * 0.05` | v1: tower's gold cost. v2: gold cost + positional penalty (cell distance from entry) so cheap walls near goal score higher than expensive towers near spawn |
| `WAVES = 15`, `BUDGET_GROWTH = 8` | `ctx.wave`, projected gold accumulation across remaining waves |
| `random_empty_cell` | `ctx.candidateCells` (already pre-filtered to bot's zone + walkable) |
| `BEAM_WIDTH = 5`, `MUTATIONS_PER_STATE = 25` | Same defaults at first; brain-search will sweep them |

### Pathfinding extension

`Pathfinding.ts` already does BFS but only returns the path. Add a sibling
`findPathWithMetrics(grid, start?, end?)` returning
`{ path, nodesExpanded, maxQueue }`. The two counters are already trivially
trackable inside the existing loop (one `head++` counter for nodesExpanded,
one running max of `tail - head` for maxQueue). 5-line addition.

This keeps the hot path (regular `findPath` used everywhere else) free of
the metrics overhead — only `MazingScorer` calls the metrics variant.

### Multi-spawner support

Circle Co-op has waypoint-chained paths from N spawners. The POC has one
start/goal. Two options:

1. **Sum BFS metrics across all spawners** (matches `MazePlanner.totalPathLength` today)
2. **Score per-spawner, weighted by that spawner's creep volume**

Going with #1 in v1 — simple sum, no creep-flow modeling. v2 can refine.

## Auto-tuning via brain-search

Drop-in: add `MAZING_BRAIN_SCHEMA` to `src/headless/brain-search/MazingBrainSchema.ts`,
register in `scripts/brain-search.mjs` alongside balanced / greedy /
aoe_focus.

Search-space candidates:

```ts
export const MAZING_BRAIN_SCHEMA: ParamSchema = {
  // Score weights (v1 + v2)
  alpha:    { min: 0.5, max: 15.0, default: 5.0, step: 1.0 },
  beta:     { min: 0.0,  max: 5.0,  default: 1.0, step: 0.3 },
  gamma:    { min: 0.0,  max: 3.0,  default: 0.5, step: 0.2 },
  // v2 tower-aware terms
  deltaDps:    { min: 0.0, max: 5.0, default: 1.0, step: 0.3 },
  epsilonSlow: { min: 0.0, max: 5.0, default: 1.0, step: 0.3 },
  zetaAura:    { min: 0.0, max: 3.0, default: 0.5, step: 0.2 },
  // Beam search shape
  beamWidth:        { min: 1, max: 12, default: 5, step: 1, integer: true },
  mutationsPerState:{ min: 5, max: 60, default: 25, step: 5, integer: true },
  planHorizonWaves: { min: 3, max: 20, default: 10, step: 2, integer: true },
  // Mutation operator probabilities (sum normalised at runtime)
  pAddWall:     { min: 0.0, max: 1.0, default: 0.5, step: 0.1 },
  pGrowBranch:  { min: 0.0, max: 1.0, default: 0.3, step: 0.1 },
  pRemoveWall:  { min: 0.0, max: 1.0, default: 0.2, step: 0.1 },
  // Confidence floor — when bestCell.score < this × historical-best,
  // return null so the brain falls down its wishlist
  confidenceFloor:  { min: 0.0, max: 1.0, default: 0.4, step: 0.1 },
  // Budget projection — how aggressively to assume future gold for the
  // plan horizon. 1.0 = current rate, 1.5 = optimistic
  budgetProjection: { min: 0.5, max: 2.0, default: 1.0, step: 0.2 },
  // Inheritance from BalancedBrain (subclass uses the same params for
  // meta/phase/upgrade — search can co-tune them with the maze terms)
  panicLives:        { min: 0, max: 15, default: 5, step: 2, integer: true },
  maxWallPlacements: { min: 0, max: 20, default: 8, step: 2, integer: true },
  // ... (other BalancedBrainParams inherited via spread)
};
```

Tuning protocol:
1. Hand-set defaults based on POC values.
2. Run `--probe=8` for a sensitivity check across a single (faction, difficulty) cell.
3. Full ES on each of arcane, mech, void, infernal, military, harmonic — the cells where BalancedBrain doesn't already hit ≥80% (`scripts/brain-coverage.mjs` finds them).
4. Validate: run 50-seed batches against the prior best brain on each cell. Ship if Δ ≥ +5pp win-rate AND no >3pp regression on solved cells.
5. If wins are concentrated on a single faction, save as a *specialised* brain (per the existing `HarmonicBrain`, `PsionicBrain` pattern) rather than as the default.

## v1 build order

1. **Pathfinding metrics** — `findPathWithMetrics` returning nodes/maxQueue.
2. **`AdversarialBeam.ts`** — direct port of POC. Mutation ops, beam loop, scorer.
3. **`MazingScorer.ts`** — public API. `planLayout(grid, paths, budget, opts)` runs the beam. `bestCell(ctx, tower, opts)` consults the cached plan + falls back to inline single-cell scoring when no plan or no match.
4. **`layoutCache.ts`** — keyed by hashed-grid + budget bucket. LRU 8 entries.
5. **`MazingBrain.ts`** — `extends BalancedBrain`. Override `decideMaze` / `decideDps` cell selection to call `MazingScorer.bestCell(ctx, type)`. Tower-pick logic from BalancedBrain reused as-is (the wishlist).
6. **Tests**:
   - `MazingScorer.test.ts`: BFS-metrics correctness, single-spawner score, multi-spawner score, budget cap respect, beam stability across runs (seeded).
   - `MazingBrain.test.ts`: at least mirrors `BalancedBrain` baselines on 2-3 fixed scenarios.
7. **`MazingBrainSchema.ts`** + register in `scripts/brain-search.mjs`.
8. **Sensitivity probe** — `node --import tsx scripts/brain-search.mjs --brain=mazing --faction=arcane --difficulty=normal --probe=8` to verify the search loop.
9. **Docs** — append a section to `CPU_BRAIN.md` once the brain ships.

## v2 extensions (separate PR)

- Tower-typed mutations (`add_tower(id, x, y)` selecting from `ctx.towerPool`)
- Role-weighted score terms (`δ·dps_coverage`, `ε·slow_time_at_choke`, `ζ·aura_adjacency`)
- Brain wishlist with per-tower confidence-floor veto
- `MazingScorer.bestCell(ctx, tower)` becomes tower-aware

## Verification

- `npx tsc --noEmit` clean.
- `npx vitest run` passes (existing 555 + new specs).
- Sensitivity probe at `--probe=8` completes without crashing.
- LearningBrain validation untouched (`scripts/validate-learning-brain.mjs 50` ≥9/11 cells).

## v1 status — shipped

All 9 build-order items in this branch:

| Step | Status | File |
|---|---|---|
| 1. `findPathWithMetrics` | ✅ | `src/systems/Pathfinding.ts` |
| 2. AdversarialBeam port | ✅ | `src/systems/bots/mazing/AdversarialBeam.ts` |
| 3. MazingScorer + dirty-bit cache | ✅ | `src/systems/bots/mazing/MazingScorer.ts` |
| 4. `Grid.version` dirty bit | ✅ | `src/systems/Grid.ts` |
| 5. MazingBrain | ✅ | `src/systems/bots/brains/MazingBrain.ts` |
| 6. Tests (27 specs, 3 files) | ✅ | `*.test.ts` |
| 7. MazingBrainSchema + brain-search wiring | ✅ | `src/headless/brain-search/MazingBrainSchema.ts` + `scripts/brain-search.mjs` |
| 8. Sensitivity probe | ✅ | `--brain=mazing --probe=4` clean, 16s/80 matches |
| 9. CPU_BRAIN.md docs | ✅ | New "MazingBrain" section |

Total diff: ~1100 LOC added (impl + tests + schema + docs). 334/334 vitest pass, `tsc --noEmit` clean.

## Decisions captured (from v2 plan + user answers)

1. ✅ `findPathWithMetrics` lives in `Pathfinding.ts` as a sibling of `findPath` — keeps the hot path metric-free.
2. ✅ **Dirty-bit cache** via `Grid.version` (bumps on placeTower/removeTower) + `ctx.wave`. Replaced the original hash+bucket idea with the simpler "did the situation change at all" check. Always-correct invalidation, one field, easy to debug.
3. ✅ Multi-spawner: sum BFS metrics across all spawner→exit paths in v1.
4. ✅ Confidence floor exposed as a brain-search-tunable knob (`confidenceFloor` in the schema).

## v2 — what's next (separate PR)

- Tower-typed mutations (`add_tower(id, x, y)` selecting from `ctx.towerPool`)
- Role-weighted score terms (`δ·dps_coverage`, `ε·slow_time_at_choke`, `ζ·aura_adjacency`)
- Wishlist with per-tower veto (today's confidence floor is plan-position; v2 compares against per-role historical-best)
- `MazingScorer.bestCell(ctx, tower)` actually consumes the `tower` arg

## Tuning protocol (for follow-up runs)

1. Probe to verify wiring: `--probe=8` against `arcane|normal` (already done — 0% at defaults).
2. Full ES on cells where BalancedBrain doesn't hit ≥80% (`scripts/brain-coverage.mjs`).
3. Validate: 50-seed batches against the prior best brain on each cell. Ship if Δ ≥ +5pp win-rate AND no >3pp regression on solved cells.
4. If wins are concentrated on a single faction, save as a *specialised* MazingBrain variant (per the existing HarmonicBrain / PsionicBrain pattern) rather than as the default.
