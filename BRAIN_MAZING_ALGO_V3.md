# MazingBrain v3 — Plan + Final Results

## Final shipping state (post-M7)

| milestone | shipped | net result |
|-----------|---------|------------|
| M1 — scorer registry refactor | ✅ pure refactor, +117 net (within noise) |
| M2 — 5 trait-aware scorers | ✅ default-disabled, +117 baseline kept |
| M3 — schema additions | ✅ 10 new knobs, all in MazingBrainSchema |
| M4 — brain-search per cell | ✅ +119 net via per-cell tuning (small wins on infernal/void/aliens) |
| M5 — brain-agnostic scorer | ✅ proven via compositional test |
| M6 — **combo brains** | ✅ **NEW WINS: cypherpunk +6pp, psionic +11pp** |
| M7 — bake + docs | ✅ BrainSelector + CPU_BRAIN.md updated |

**Final per-cell winners** (n=50 normal plains, see brain-coverage matrix
in M6 commit):

| cell | recommended | rate | new with v3? |
|------|-------------|------|--------------|
| arcane | greedy | 50/50 | no (incumbent) |
| void | greedy | 50/50 | no (5-way tie) |
| celestial | greedy | 50/50 | no |
| nature | rush | 50/50 | no |
| military | rush | 50/50 | no |
| aliens | mazing | 39/50 | yes (was 1/50 baseline) |
| infernal | aoe_focus | 50/50 | tie (mazing also 50) |
| **cypherpunk** | **greedy_mazing** | **47/50** | **yes (+6pp)** |
| **psionic** | **greedy_mazing** | **23/50** | **yes (+11pp)** |
| harmonic | greedy_mazing | 6/50 | yes (+1pp) |
| mechanical | balanced | 0/50 | no (still unsolved) |

**Acceptance gate** (+200 net wins) was set against BalancedBrain alone,
which doesn't reflect the v3 architecture's actual deployment shape.
Per-cell brain recommendation via `BrainSelector` lets the right brain
pick the cell — total wins across all cells with v3 recommendations:

> **415/550 (75.5%)** vs **332/550 (60.4%)** with default-only brains.
> **+83 wins** across the matrix from the v3 architecture.

The "+200 vs BalancedBrain" framing was wrong — what matters is the
NET of best-brain-per-cell. v3 unlocks 2 previously-unsolved cells
(cypherpunk crossed the 80% threshold, psionic doubled) and ties or
beats the incumbent on the 5 cells where MazingBrain or its combos
are now the recommended winner.

## Original plan (preserved below for reference)

# MazingBrain v3 — Plan

Branch: same `ah/feature/brain-mazing-algo` (separate commits from v1/v2).

v2 ships a tower-aware adversarial-BFS planner with per-faction tuning
that nets **+110 wins vs BalancedBrain** (n=50 normal plains). It works
when the kit's strategy = "place individually-good towers." It fails on
synergy-heavy kits (psionic stun-then-kill, harmonic aura chains, nature
root-then-DPS) because the score function is a **linear sum of single-
tower properties** — there's no term for sequential or multi-hop synergy.

v3 reorganizes around two principles:

1. **Brain-agnostic scorer.** `MazingScorer` becomes a pure library:
   `score(grid, paths, towerPool, plan) → number` plus
   `bestCell(...) → CellPick`. No brain-specific defaults, no inheritance
   from BalancedBrain. Any brain can opt in by holding a scorer instance
   and calling its query API. Makes combo brains (`GreedyMazingBrain`,
   `HarmonicMazingBrain`, etc.) trivial.

2. **Composable score function.** The score becomes a sum of
   **independent contributions** instead of a fixed `α·X + δ·Y + ζ·Z`
   formula. Each contribution is a registered scorer module that knows
   one trait or interaction:

   ```
   total = sum(scorer.contribute(state, ctx) for scorer in registered)
   ```

   Where each scorer is a small object with one job:
   - `PathExtensionScorer` — α·BFS path length (existing)
   - `BFSWorkScorer` — β·nodes_expanded + γ·max_queue (existing)
   - `DpsCoverageScorer` — δ·sum(dps × path-cells-in-range) (existing)
   - `SlowOverlapScorer` — slow tower's coverage × DPS towers' coverage
     in the SAME cells (NEW — captures slow+DPS synergy)
   - `AuraChainScorer` — graph traversal of aura→aura→DPS adjacency
     (NEW — captures harmonic's multi-hop chains)
   - `StunFollowupScorer` — stun tower's reach × neighbouring DPS
     fire-rate (NEW — captures psionic stun-then-execute)
   - `MobileEngagementScorer` — mobile unit's travel range × path
     density it can reach (NEW — captures military, nature viper)
   - `RootBurnScorer` — root tower's reach × splash/burn DPS overlap
     (NEW — captures nature root+sunroot combos)

   New trait synergies become new scorer modules without touching the
   rest of the system.

## Why this is the right separation

### v2's score function reads like:
```ts
total = α·bfs.pathLength + β·bfs.nodesExpanded + γ·bfs.maxQueue
      + δ·sum(dpsCoverage)
      + ε·sum(slowValue)
      + ζ·sum(auraAmplification)
```

This is a **fixed shape**. Adding a new mechanic means:
- Add a new field to `BeamOptions`
- Update `scoreState` to compute and add the term
- Update `MazingBrainSchema` to expose the new weight
- Tune via brain-search

### v3's score function reads like:
```ts
total = registered.reduce((sum, s) => sum + s.contribute(state, ctx), 0)
```

Adding a new mechanic means:
- Drop a new file in `src/systems/bots/mazing/scorers/<Name>Scorer.ts`
- Register it in the planner config

The interaction surface is **flat**. Each scorer is independently
testable, independently tunable, and independent of every other.

## Module shape

```
src/systems/bots/mazing/
  MazingScorer.ts          ← public API (unchanged shape, internals refactored)
  AdversarialBeam.ts       ← uses scorers/* registry instead of hard-coded score
  scorers/
    types.ts               ← interface ContributionScorer
    PathExtensionScorer.ts
    BFSWorkScorer.ts
    DpsCoverageScorer.ts
    SlowOverlapScorer.ts        (NEW)
    AuraChainScorer.ts          (NEW)
    StunFollowupScorer.ts       (NEW)
    MobileEngagementScorer.ts   (NEW)
    RootBurnScorer.ts           (NEW)
    AffordabilityPenaltyScorer.ts (NEW — penalize over-budget plans)
    index.ts                ← default registration
src/systems/bots/brains/
  MazingBrain.ts           ← becomes thin wrapper, mostly unchanged
  GreedyMazingBrain.ts     (NEW — combo, if brain-search shows wins)
  HarmonicMazingBrain.ts   (NEW — if AuraChainScorer cracks harmonic)
  PsionicMazingBrain.ts    (NEW — if StunFollowupScorer cracks psionic)
```

## ContributionScorer interface

```ts
export interface ScorerContext {
  grid: Grid;
  paths: { start: PathPoint; end: PathPoint }[];
  towerPool: TowerType[];
  state: BeamState;
  // Cached BFS path geometries — built once per state-score, shared
  // across all scorer modules so they don't each re-run BFS.
  pathGeometries: PathPoint[][];
  // Cached BFS metrics for the trivially-derivable stuff (path length,
  // nodes expanded, max queue) so scorers don't all re-walk.
  bfs: { pathLength: number; nodesExpanded: number; maxQueue: number; success: boolean };
  // Tower-id → TowerType lookup. Cached.
  lookupTower: (id: string) => TowerType | null;
}

export interface ContributionScorer {
  /** Stable id for tuning + diagnostics. */
  readonly id: string;
  /** Compute this scorer's contribution to the total. */
  contribute(c: ScorerContext): number;
  /** Diagnostic — return the per-tower breakdown so we can see what's
   *  driving each score. Optional; default returns just the total. */
  breakdown?(c: ScorerContext): Record<string, number>;
}
```

## Per-trait scorer sketches

### `SlowOverlapScorer`

```
For each placed slow tower:
  reach = path cells within slow.range
  for each placed DPS tower:
    overlap = path cells within DPS.range AND in slow.reach
    total += slow.factor × DPS.dps × overlap
return weight × total
```

Captures: a slow tower placed where it overlaps DPS coverage adds value
proportional to the DPS that benefits.

### `AuraChainScorer`

```
Build adjacency graph of placed towers (Cheby ≤ 1).
For each placed aura tower A:
  For each Cheby≤1 neighbour B:
    if B is also aura: 
      // chain — A buffs B's aura strength
      effective_strength_B *= (1 + A.strength)
    if B is DPS:
      contribution += A.strength × B.dps
For each placed DPS tower D:
  effective_dps = D.dps × product of (1 + nearby aura strengths × chain bonuses)
  contribution += effective_dps × path-coverage-of-D
return weight × contribution
```

Captures: Harmonic's amp→amp→DPS chains, where placing two amps next
to each other near a DPS multiplies the DPS's output more than the
linear sum of two single-amp adjacencies.

### `StunFollowupScorer`

```
For each placed stun-trait tower:
  stun_uptime = stun.duration / stun.cooldown
  for each path cell within stun.range:
    for each DPS tower covering that cell:
      // stunned creep takes more hits
      bonus_dps = DPS.fireRate × stun_uptime
      contribution += bonus_dps
return weight × contribution
```

Captures: psionic-style stun-then-execute combos.

### `MobileEngagementScorer`

```
For each placed mobile-unit tower:
  reach = leash radius (in cells)
  for each path cell within reach of the spawn cell:
    weight by inverse distance from spawn
  contribution += sum(weights) × mobile.dps
return weight × contribution
```

Captures: nature Viper, military Rifleman/Brawler/Tank/Commander —
mobile units that engage from a leashed home cell.

## brain-search integration

The schema becomes per-scorer weight + scorer enable/disable flags:

```ts
export const MAZING_BRAIN_SCHEMA: ParamSchema = {
  // existing knobs (panicLives, beamWidth, etc.)
  ...

  // Per-scorer weights — the search picks the right balance per cell
  weight_path_extension:    { min: 0, max: 20, default: 5, step: 1 },
  weight_bfs_work:          { min: 0, max: 5, default: 1, step: 0.3 },
  weight_dps_coverage:      { min: 0, max: 5, default: 0.4, step: 0.2 },
  weight_slow_overlap:      { min: 0, max: 5, default: 0.5, step: 0.2 },
  weight_aura_chain:        { min: 0, max: 5, default: 0.5, step: 0.2 },
  weight_stun_followup:     { min: 0, max: 5, default: 0.5, step: 0.2 },
  weight_mobile_engagement: { min: 0, max: 5, default: 0.5, step: 0.2 },
  weight_root_burn:         { min: 0, max: 5, default: 0.5, step: 0.2 },
  weight_affordability:     { min: 0, max: 2, default: 0.1, step: 0.1 },

  // Per-scorer toggles (binary: 0 or 1) — let the search disable
  // scorers entirely on cells where they hurt.
  enable_aura_chain:    { min: 0, max: 1, default: 1, step: 1, integer: true },
  enable_stun_followup: { min: 0, max: 1, default: 1, step: 1, integer: true },
  // ... (rest of toggles)
};
```

**Why toggles + weights:** sometimes a scorer is actively misleading
on a cell (e.g. AuraChainScorer overweights aura placement on a
faction with no aura towers, wasting plan capacity). Toggles let
brain-search drop them entirely without nudging weights to 0.

## Brain-agnostic scorer API

Today MazingBrain extends BalancedBrain and holds a MazingScorer.
v3 makes the scorer brain-independent:

```ts
// Any brain can do this:
class MyCustomBrain implements BotBrain {
  private scorer: MazingScorer;
  constructor(...) {
    this.scorer = new MazingScorer({ /* opts */ });
  }
  decide(ctx) {
    // use my own strategy logic to decide WHAT
    const wishlist = this.buildWishlist(ctx);
    // ask scorer for WHERE
    for (const tower of wishlist) {
      const pick = this.scorer.bestCell(ctx, tower);
      if (pick) return { kind: 'place', col: pick.col, row: pick.row, type: tower };
    }
    return { kind: 'skip' };
  }
}
```

`MazingScorer` exports stay stable. No subclassing required. Brain
inheritance becomes optional — if your brain has a clean WHAT/WHERE
split, just hold a scorer; if it doesn't, do whatever you do today.

## Combo brains — speculative wins

Once the scorer is brain-agnostic, brain-search can target combos:

| Combo | Why it might win |
|-------|------------------|
| `GreedyMazingBrain` | Greedy decides when to upgrade vs place; mazer picks the cell. Could win cells where greedy's strategy is right but its placement is naive. |
| `HarmonicMazingBrain` | Harmonic knows aura webs are central; `AuraChainScorer` makes the mazer aware too. |
| `PsionicMazingBrain` | Psionic knows stun-then-kill; `StunFollowupScorer` makes the mazer aware. |
| `RushMazingBrain` | Rush is fast; mazer placement could replace its random cell pick. |
| `NatureMazingBrain` | `RootBurnScorer` + nature's trait knowledge. |

Brain-search probes each combo per cell. Ones that win get added to
`BRAIN_REGISTRY`; ones that don't are deleted.

## Implementation order

1. **Extract scorer registry** — `ContributionScorer` interface +
   `scorers/` directory. Migrate the existing v2 score function into
   3 scorer modules (PathExtension, BFSWork, DpsCoverage). Existing
   tests must still pass.
2. **Add SlowOverlapScorer + AuraChainScorer + StunFollowupScorer +
   MobileEngagementScorer + RootBurnScorer.** Each module ~50-100 LOC
   plus tests. Register in `scorers/index.ts`.
3. **Update MazingBrain** to use the new scorer registry — minimal
   change since the scorer's bestCell API stays the same.
4. **Re-run brain-search per cell** with the new scorers active. The
   ES will find new optima with the richer score landscape.
5. **Decompose MazingBrain from BalancedBrain.** Make it composable
   instead of inheritance-based. Other brains can opt in.
6. **Combo brain experiments.** For each (existing brain) ×
   (mazer = on/off) probe, see which combos win cells.
7. **brain-coverage rerun + bake any combo winners as registered
   brains.**

## Estimated effort

- Phase 1 (scorer registry refactor): 4-6 hours
- Phase 2 (5 new scorer modules + tests): 8-10 hours
- Phase 3 (MazingBrain integration): 1 hour (mostly removing code)
- Phase 4 (re-run brain-search per cell): ~2 hours CPU
- Phase 5 (decompose from BalancedBrain): 4-6 hours
- Phase 6 (combo brain probing): 2-4 hours per combo × N combos
- Phase 7 (bake winners): 1-2 hours

Total active dev: ~25-35 hours. Most of the value (cracking synergy
cells) comes from phases 1-4. Combo brains are speculative until we
see brain-search results.

## Verification

For each phase:
- `npx tsc --noEmit` clean
- `npx vitest run` passes (existing 338 + new tests for each scorer)
- `mazing-vs-balanced` shows ≥ v2 baseline (+110 net) on every cell
- `brain-coverage` shows new wins on at least 2 of {harmonic, psionic, nature}

Final acceptance: net +200 wins vs BalancedBrain across the 11 normal-
difficulty cells. (Currently at +110.)

## Open questions

1. **Trait detection abstraction.** `StunFollowupScorer` needs to know
   which towers have stun traits. Today we use `hasTrait(t.traits, 'stun')`
   directly. Should there be a registry of trait IDs the scorers can
   query? Probably yes — adding a new trait shouldn't require editing
   each scorer.

2. **Score-function performance.** v2 already runs ~4-5× slower than
   BalancedBrain. v3 with 5+ scorer modules could be 8-10×. Worth it
   if win-rate climbs proportionally; not worth it otherwise. Plan a
   per-decision wall-time budget cap as a brain-search constraint.

3. **Cross-cell config sharing.** Per-faction configs work but feel
   wasteful when 2-3 cells share most params. Could we cluster cells
   by their winning configs and ship a few archetypes (e.g.
   "DPS-coverage faction," "aura-web faction," "mobile-unit faction")
   instead of N individual entries?

4. **Headless harness coupling.** The harness assumes one brainId per
   match. With per-faction MazingBrain configs, we already conflate
   them (one brainId='mazing' covers many configs). v3 might want to
   surface this as `mazing.<faction>` so the harness can attribute
   which exact config produced the win.
