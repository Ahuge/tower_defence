# MazingBrain v2 — Plan

Branch: same `ah/feature/brain-mazing-algo` (separate commit from v1).

v1 ships an unweighted adversarial-BFS planner: every placement is a
generic wall, scored only by path-extension + BFS-work + frontier
width. v2 makes the planner **tower-aware** — same beam search, but
mutation operators pick a real tower type from the bot's pool, and
the score function rewards a tower's *role* contribution alongside
its *blocking* contribution.

## What changes

### 1. State carries tower types

```
// v1
interface BeamState {
  placedCells: Cell[];              // every cell is "a wall"
  cost: number;
  score: number;
}

// v2
interface BeamState {
  placedTowers: { col: number; row: number; towerId: string }[];
  cost: number;
  score: number;
}
```

The cache + dirty-bit approach are unchanged — only the payload of a
plan changes. `MazingScorer.bestCell(ctx, towerType)` now returns the
highest-priority entry whose `towerId` matches the asked-for type
(falling back to *any* role-compatible tower if exact match misses).

### 2. Mutation operators choose a tower from the pool

```
add_tower(towerId, x, y) — replaces add_wall
swap_tower(idx)          — change a placed tower's type, same cell
remove_tower(idx)        — same as v1's remove_wall
grow_branch_typed(...)   — random walk placing the cheapest wall
                           class tower in sequence
```

Tower picking inside `add_tower`:

- **Greedy pick** (recommended for v2 default): highest-scoring tower
  for this cell at this state. Cheap to compute — for each affordable
  tower, try it, score the result, keep the best.
- **Random sample with role-weighted probability**: matches the POC's
  exploration ethos but loses tower-pick signal. Worth probing in
  brain-search but not the default.

The mutation also respects the budget — a 600g ult is only an option
when the running cost is well below the budget for the current wave.

### 3. Score function adds role-aware terms

```
score_v2 =
    α · path_length            // walls + every blocking placement
  + β · nodes_expanded         // BFS work
  + γ · max_queue              // frontier width
  + δ · sum(dpsCoverage)       // every dps tower's path-cell coverage
  + ε · sum(slowValue)         // every slow tower's choke contribution
  + ζ · sum(auraAmplification) // every aura's neighbour-DPS boost
```

`dpsCoverage(t)` = (path cells within `t.range`) × (t.damage / t.fireRate)
— a proxy for total DPS dealt across the path. Higher when a tower
covers a long stretch of path with high effective damage.

`slowValue(t)` = (path cells within `t.range`) × `t.slow_factor`. The
factor is read from the slow trait. Slows score higher at chokepoints
where their range overlap intersects more path cells.

`auraAmplification(t)` = sum over Chebyshev≤1 neighbours `n` of
`n.damage / n.fireRate × t.aura_strength`. Auras are worth nothing in
isolation; the score must reflect their amplifier role.

Walls retain their value via the α term — the path-extension
contribution is the same whether the placement is a 10g wall or a
600g ult, so cheap walls placed at chokepoints still score well.

### 4. Brain wishlist with veto

Today's `MazingBrain.decideDps`:

```
const pickedType = this.pickTowerType(pool, ctx);  // ONE tower
const pick = this.scorer.bestCell(ctx, pickedType); // ANY plan cell
```

v2 walks an ordered wishlist:

```
const wishlist = this.buildTowerWishlist(ctx);  // ordered: [slow, splash, single, wall]
for (const towerType of wishlist) {
  const pick = this.scorer.bestCell(ctx, towerType);
  if (pick) return { kind: 'place', col, row, type: towerType };
}
// All vetoed — fall through to upgrade or skip.
return this.decideUpgrade(ctx);
```

The wishlist captures the brain's strategic intent (panic mode pushes
slow to the front, building-maze pushes wall first, etc.), and the
scorer's veto captures the spatial reality ("no good slow cells right
now"). The "wait N waves and slows will be great here" emergent
behavior falls out of the brain re-walking the wishlist every 4s.

#### Veto mechanism

v1 vetoes when `(1 - rank/planLen) < confidenceFloor`. Crude — rank
isn't the same thing as score quality. v2 compares against per-role
historical-best:

- Each plan run records `bestRoleScore[role] = max(score)` per role.
- `bestCell(ctx, type)` returns null when the cell's role-bucket score
  is < `confidenceFloor × bestRoleScore[type.role]`.
- This makes the floor a "% of the role's best-ever placement."

Per-role historical bests live on the scorer instance and persist
across replans — so as the match progresses the bar rises (more
towers placed = better placements available = higher floor). Auto-
tuned via `confidenceFloor`.

### 5. Schema adds new dimensions

`MazingBrainSchema.ts` gets:

```
deltaDps:    { min: 0.0, max: 5.0, default: 1.0, step: 0.3 },
epsilonSlow: { min: 0.0, max: 5.0, default: 1.0, step: 0.3 },
zetaAura:    { min: 0.0, max: 3.0, default: 0.5, step: 0.2 },
// Mutation operator pick mode (greedy vs random)
towerPickMode:  { min: 0, max: 1, default: 0, step: 1, integer: true },
// Per-role mutation bias — each role gets a chance multiplier on
// add_tower so harness can find faction-specific picks (e.g. nature
// might benefit from a slow-heavy bias on most maps).
addBiasWall:    { min: 0.0, max: 2.0, default: 1.0, step: 0.2 },
addBiasDps:     { min: 0.0, max: 2.0, default: 1.0, step: 0.2 },
addBiasSlow:    { min: 0.0, max: 2.0, default: 1.0, step: 0.2 },
addBiasAura:    { min: 0.0, max: 2.0, default: 1.0, step: 0.2 },
```

## Open architectural questions

### Q1: greedy vs random tower pick inside `add_tower`?

**Recommendation: greedy default.** The POC's "random sample" makes
sense when the operator doesn't know what's good — but we've spent
the engineering to score role contributions, so we should USE that
signal. Brain-search can probe random-mode via `towerPickMode=1` if
greedy turns out to over-fit.

### Q2: does the planner project gold across waves?

The POC's budget grows with `baseBudget + wave * budgetGrowth` in
abstract units. v1 carried that forward. v2 needs to align with real
gold so the planner can decide between "save for a 600g ult next wave"
and "buy two 200g towers now":

- Pull `wave_creep_count × kill_gold + wave_clear_bonus` from the
  current difficulty config.
- Project per-wave income for the next `planHorizonWaves` waves.
- Budget = sum of per-wave incomes for the horizon.

This is more accurate than the POC's abstract budget — but not free
to compute. Pre-compute once per cache miss, store on the BeamState.

### Q3: per-role plan or per-tower-type plan?

When the brain asks `bestCell(ctx, towerType)`, does it match against
plan entries with that exact `towerId`, or against plan entries that
share the same role (any DPS-single tower)?

**Recommendation: role-match with type-fallback.** The plan is built
with greedy tower picks, so the recorded `towerId` reflects what
SCORED best at that cell. The brain might be asking for a different
DPS tower for tactical reasons (counter-pick, affordability), but the
*spatial* reasoning (range, choke-overlap) generalises across the
role. Match by role first, prefer-but-don't-require an exact type
match.

### Q4: does the brain provide the wishlist or does the scorer compute it?

The brain has strategic context (panic mode, phase, upcoming-wave
counter-pick). The scorer has spatial wisdom. The wishlist is
strategic, so the brain owns it.

`buildTowerWishlist(ctx)` lives in MazingBrain. Returns an ordered
list of TowerType. The scorer doesn't see the wishlist — it just
answers per-tower queries.

## Implementation order

1. **Tower-typed state + greedy add_tower** — the planner now records
   tower IDs and the score function still uses only α/β/γ. Behavior
   should match v1 closely (every placement is "a tower" but not yet
   role-weighted). Tests still pass.
2. **Role-weighted score terms** — add δ/ε/ζ. Adjust score function
   and ensure `runBeam` still produces valid plans.
3. **Per-role bestCell** — `bestCell(ctx, towerType)` matches against
   role rather than just rank. Add per-role historical-best tracking
   to MazingScorer.
4. **Brain wishlist** — `MazingBrain.buildTowerWishlist` + `decideDps`
   walks it. `decidePanic` and `tryPlaceUltimate` get analogous
   treatment.
5. **Gold projection** — replace abstract budget with realistic gold
   curve. Test that the planner reaches faction ults at expected wave.
6. **Schema additions** — δ, ε, ζ, towerPickMode, addBiasRole knobs.
7. **Comparison run** — same `brain-coverage.mjs` matrix vs v1. Wins
   should appear on at least 1-2 cells where v1 was below 50%.

## What v2 explicitly defers to v3

- **Multi-objective scoring** — currently a weighted sum. v3 could
  switch to Pareto frontier so the search returns multiple "best"
  layouts (e.g. one wall-heavy + one DPS-heavy) and the brain picks
  based on real-time situation.
- **Per-spawner creep flow weighting** — multi-spawner BFS still sums
  metrics uniformly. Real maps have biased creep flow (some spawners
  carry more creeps than others); v3 could weight BFS contributions
  by spawner volume.
- **Adaptive replan triggers** — v2 keeps the v1 dirty-bit. v3 could
  cheap-detect "current plan still good" via single-cell A/B and skip
  full replan when the situation hasn't materially shifted.
- **Online learning of weights** — instead of harness-tuned weights,
  v3 could learn α/β/γ/δ/ε/ζ from human-replay data via the LearningBrain
  pipeline.

## Verification (same protocol as v1)

- `npx tsc --noEmit` clean
- `npx vitest run` ≥ 334 + new role-weight tests
- Sensitivity probe `--brain=mazing --probe=8` still completes
- Comparison run (`brain-coverage.mjs`) shows v2 ≥ v1 on every cell
  AND wins ≥ +5pp on at least 1-2 previously-unsolved cells

## v1 vs BalancedBrain comparison (n=50, normal, plains, default params)

Captured via `node --import tsx scripts/brain-coverage.mjs` after
adding MazingBrain to the matrix.

```
faction        bala   gree   rush   econ   syne   ulti   aoe_   natu   mazi
arcane            2     50     50     50      8      5      ·      ·      ·
mechanical        ·      ·      ·      ·      ·      ·      ·      ·      ·
nature            ·      ·     50      ·      ·      ·      ·     50      ·
void              ·     50     50     48      ·      1     50      ·      ·
military          ·      ·     50      ·      ·      ·      ·     13      ·
aliens            ·      ·      ·      ·      1      ·      ·      ·      ·
cypherpunk        ·      ·      6      ·      ·      ·     41      ·      ·
infernal         28      ·      ·      ·     50      ·     50      6      2
celestial         ·     50     50     50      ·     50      ·      ·      ·
psionic           ·      6      6      ·      ·      ·      ·      ·      ·
harmonic          ·      ·      ·      ·      ·      ·      ·      ·      ·
```

**Verdict — v1 alone is a regression vs BalancedBrain.** Both are at
0/50 on 8 of 11 cells, but on **infernal** (the cell where Balanced
hits 28/50), Mazing only manages 2/50. On every other measurable cell
Mazing is no better than Balanced.

**Why this is exactly what v2 fixes:**

The v1 planner treats every placement as a generic wall — score is
purely α·path_length + β·BFS_work + γ·max_queue. When the brain calls
`bestCell(ctx, dpsTower)` for a DPS placement, the scorer returns the
top wall-mazing cell, not the cell with best DPS coverage. The DPS
tower lands at a high-path-extension cell, which is often a poor
shooting spot (creeps slowed there but no LOS to the chokepoint). On
infernal where Balanced was making good DPS-coverage decisions,
Mazing degrades the placement.

This is the entire premise of v2: **make the planner score role
contributions** (δ·dpsCoverage + ε·slowValue + ζ·auraAmplification),
so when the brain asks for a DPS cell, the planner returns one that's
actually a good DPS cell — not one that's only good at extending the
path. The wishlist+veto mechanism then makes the brain fall through
to its next preference (or upgrade) when no good cell exists for the
asked role.

**Implication for v2 priorities:**

1. Tower-typed mutations + role scoring is the most important step
   (currently the *only* term is path-extension, and DPS cells are
   misranked because of it).
2. Brain wishlist with veto is critical — without it, mazing places
   DPS towers at "best wall" cells. Wishlist falls through to skip /
   upgrade when no good cell exists for the role.
3. Per-role historical-best tracking matters more than expected —
   without it, the confidence-floor veto can't tell "this is a great
   wall cell but a bad DPS cell" from "this is a great DPS cell."

## Estimated scope

~600 LOC change vs v1. Most of it is:
- AdversarialBeam: ~150 LOC for tower-typed mutations + role scoring
- MazingScorer: ~80 LOC for role-bucketed plan + per-role bestCell
- MazingBrain: ~120 LOC for wishlist + per-role veto
- MazingBrainSchema: +9 knobs
- New tests: ~250 LOC across 3 files

3-4 hours for v2. Maybe another 1-2 hours for the comparison run
+ tuning probe + write-up.
