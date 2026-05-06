# Brain Mazing Algorithm — Plan

Branch: `ah/feature/brain-mazing-algo` (off `develop`)

## What we have today

- **`MazePlanner.bestMazeCell(grid, candidates, max, allPaths?)`** in `src/systems/bots/MazePlanner.ts` — single helper. Greedy: simulates blocking each candidate cell with a wall, returns the cell whose blockage maximizes path length. Tower-agnostic.
- **`BalancedBrain.decideMaze()`** calls `bestMazeCell` for **walls only**. DPS / slow / mobile / aura placements all use a different scorer (`scoreDpsCells`, `scoreMobileCells`) that ranks by path-cell coverage within range, not by maze contribution.
- **`BalancedBrain.pickTowerType(pool, ctx)`** picks the tower first (by strategy: expensive-bias / damage-per-cost / fast-fire / long-range; with creep-counter swap). Then `decideDps` finds the best cell for *that specific tower's range*.
- Decisions fire on a **4-second cooldown** per bot (`BASE_COOLDOWN_MS`). Plenty of compute headroom — A* on the 36×26 grid is sub-ms.

## Goal

Build a dedicated cell-scoring algorithm that brains can plug into, replacing the current ad-hoc split (`bestMazeCell` for walls, `scoreDpsCells` for DPS, etc.). v1 unweighted by tower type; v2 tower-aware.

## Where it plugs in

The natural seam is the **cell selection** step inside the brain's `decide()`. Today this is scattered:

```
BalancedBrain.decide()
  → decideMaze()    → bestMazeCell()                  ← path-extension only
  → decideDps()     → scoreDpsCells(range, placed)    ← coverage + aura adjacency
  → decidePanic()   → scoreDpsCells(slow.range, ...)  ← same as DPS
  → decideMobile() inline → scoreMobileCells(paths)   ← proximity-to-path
  → tryPlaceUltimate() → scoreDpsCells / Mobile       ← same again
```

The new algorithm becomes a single `MazingScorer` interface (tentative name) with one entry point that all of these call. Each call site can stop owning its own scoring math.

```
MazingScorer.score(ctx, towerOrNull, candidates) → ScoredCell[]
```

Returning `ScoredCell[]` (sorted, decorated with breakdown) keeps callers flexible: `[0]` is the best, but a brain can scan deeper if it wants to filter by other criteria. v1 ignores `towerOrNull`; v2 uses it for tower-specific weighting.

## v1 — Unweighted

Single-pass scorer that combines path-extension (today's `bestMazeCell` math) with path-coverage (today's `scoreDpsCells` math). Returns one ranked list per call.

Score components per candidate cell:
- **`pathExtensionGain`**: cells added to creep path if blocked here. Reuses `simulateWallAllPaths`. Negative gain or null = reject.
- **`coverageProxy`**: count of unique path cells within a *fixed* generic range (e.g. 4 tiles — the median tower range). Gives every cell a coverage score even when the tower is unknown.
- **`adjacencyToOwn`**: bonus for being adjacent to existing same-team towers (encourages clustering for aura synergy).
- **`distanceToEntry`**: small bias against placing right at the spawner (lets towers attack creeps already slowed/damaged).

Final score = `α·pathExtensionGain + β·coverageProxy + γ·adjacencyToOwn − δ·distanceToEntry`. Weights tuned by harness, with sane defaults.

## v2 — Tower-weighted

When a tower is provided, weights shift:

| Tower role | α (path-extension) | β (coverage) | γ (adjacency) | Notes |
|---|---|---|---|---|
| `wall` | high | low | — | path-extension dominates |
| `dps-single` | low | high (uses tower's actual range) | medium | coverage with the real range |
| `dps-splash` | low | high | medium | reuses coverage but also rewards path *bends* (more creep clustering) |
| `slow` | low | high | high (next to DPS) | a slow next to a damage tower amplifies it |
| `aura` | low | medium | very high (next to DPS) | placement value comes entirely from neighbors |
| `mobile` | — | — | — | use proximity-to-path only (existing `scoreMobileCells`) |
| `utility` (e.g. mana drain) | — | — | — | role-specific override hooks (channel-interrupt cells, summoning-circle adjacency, etc.) |

The weights live in a per-role `RoleWeights` table. Tower-pool roles already exist via `TowerRoles.ts` / `groupByRole()`. v2 just looks up the weights for the chosen tower's role.

## The architectural question — should the algo override the brain's tower choice?

Three plausible architectures, listed best→worst as I see it.

### Option A (recommended): Score-then-veto

Brain proposes a tower from its preference order. The algo scores its candidate cells. If the **best score is below a confidence threshold** (relative to historical best for this role on this map), the algo returns `null` and the brain falls down its preference list.

```
brain wants:    [slow, splash-dps, single-dps, wall, upgrade]
for each tower in wishlist:
  scored = scorer.score(ctx, tower, ctx.candidateCells)
  if scored.length > 0 and scored[0].score >= confidenceFloor(tower.role):
    return { kind: 'place', cell: scored[0], type: tower }
return decideUpgrade() ?? skip
```

- **Pro**: respects brain intent, defers spatial calls to the algo.
- **Pro**: easy to reason about — each subsystem owns one decision.
- **Pro**: implementable today with only a `confidenceFloor()` per role (heuristic at first, harness-tuned later).
- **Con**: confidence floor needs calibration; too high → brain skips too often.
- **Con**: doesn't capture "wait N waves and slows will be great here" — that's emergent from the wishlist falling-through, not explicit.

### Option B: Joint optimization

Brain hands the algo `(affordableTowers[], wishlist[])` and the algo scores all `(tower × cell)` pairs, returning the best.

```
scored = scorer.score(ctx, affordableTowers, ctx.candidateCells)
return { kind: 'place', cell: scored[0].cell, type: scored[0].tower }
```

- **Pro**: theoretically optimal each tick.
- **Con**: combinatorial — N×M evaluations per decide(). With per-tower-range pathfinding it's still fast at 4s cadence, but the score function gets harder to debug.
- **Con**: blurs responsibilities — strategic intent (when to maze vs DPS) lives in the algo's weighting, not in the brain.
- **Con**: harder to A/B test — you can't compare "the brain's wishlist" against "the algo's pick" because the brain has no wishlist anymore.

### Option C: Brain-only (current state)

Keep the brain owning everything. Just refine `bestMazeCell` / `scoreDpsCells` independently.

- **Pro**: no new abstraction.
- **Con**: doesn't actually solve the user's stated goal — there's still no shared "mazing algo" the brain can plug into.

### My recommendation

**Option A** for v1 + v2. The "next N iterations would accept a slow" idea you raised is naturally captured by the wishlist falling through:
- Tick 1: brain wants slow → algo says no good slow cells → brain falls to splash → places splash.
- Tick 2: situation changes (more towers placed, path geometry evolved) → algo now finds a good slow cell → places slow.

No state machine needed; the "N-tick wait" is emergent from the wishlist re-evaluating each decision.

## Implementation sketch

### Files

**Create:**
- `src/systems/bots/MazingScorer.ts` — the new module. Pure functions.
  - `interface ScoredCell { col, row, score, breakdown: {...} }`
  - `interface MazingScorerOpts { confidenceFloor?: ..., weights?: ... }`
  - `function scoreCells(ctx: BotContext, tower: TowerType | null, opts?: MazingScorerOpts): ScoredCell[]`
  - `function bestCell(ctx, tower, opts?): ScoredCell | null` — returns null when below confidence floor
- `src/systems/bots/MazingScorer.test.ts` — vitest specs covering single-path, multi-path, wall vs DPS bias, role weights v2, confidence-floor rejection.
- `notes/plans/brain_mazing_algo.md` — this doc.

**Modify (later, in a v1 polish pass):**
- `src/systems/bots/MazePlanner.ts` — keep `bestMazeCell` as a thin wrapper around `MazingScorer.bestCell(ctx, wallType)` once v1 lands. Or deprecate gradually.
- `src/systems/bots/brains/BalancedBrain.ts` — replace `decideMaze` / `decideDps` / `decidePanic` cell selection with calls to `MazingScorer`. Tower-pick logic stays.

### Sequencing

1. **v0 (this branch)**: ship `MazingScorer.ts` + tests. v1 unweighted scorer only. No brain changes yet — adopting it is opt-in via a new brain or a flag on BalancedBrain. Verify via harness (existing `scripts/validate-learning-brain.mjs` + `scripts/generate-training-data.mjs`).
2. **v1 polish**: refactor `BalancedBrain.decideDps` to call `MazingScorer.score(ctx, pickedType)`. Behavior should match within harness noise.
3. **v2**: add role weights. Tune via `scripts/brain-search.mjs` if it still exists.
4. **Score-then-veto wishlist**: extend `BalancedBrain.decide()` to walk a wishlist and use `MazingScorer.bestCell()`'s null return to fall through.

## Verification

- `npx tsc --noEmit` clean.
- New `MazingScorer.test.ts` covers ≥10 specs.
- `npx vitest run` passes (existing 555 + new tests).
- Harness sanity: run `scripts/generate-training-data.mjs` for ~5 cells, compare win-rate Δ to a baseline run on `develop`. v1 should be within ±3% (it's mostly a refactor); v2 with tuned weights should improve.
- LearningBrain validation: `node --import tsx scripts/validate-learning-brain.mjs 50` — should not regress.

## Open questions for you

1. **Architecture (A vs B vs C)** — does Option A's score-then-veto fall through your wishlist match how you want this to work? Or do you want Option B's joint optimization?
2. **Scope of v1**: is the unweighted scorer + opt-in adoption enough for the first PR, or should v1 also include the BalancedBrain refactor?
3. **Tuning**: should v2 weights be hand-tuned + harness-validated, or auto-tuned by extending `brain-search.mjs`?
4. **Naming**: `MazingScorer` is fine but slightly inaccurate (it's also a coverage scorer). Alternatives: `PlacementScorer`, `CellScorer`, `BuildAdvisor`. Pick one that reads well in `BalancedBrain.decide()`.

I haven't written any code yet — waiting on your call on (1)-(4) before drafting the v1 module. Let me know.
