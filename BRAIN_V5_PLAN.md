# v5 — Faction Self-Balance + Utilization Validation

## Why v5

v3 search wins where the kit allows. v4 surfaced cells where the kit *doesn't*: military, mechanical, possibly nature/celestial. Those are kit-balance issues, not search-quality issues. v5 gives the search a way to fix the kit too — tune faction-internal values (tower stats, trait params, upgrade curves) within bounds that preserve the faction's identity.

**Hard scope rule**: v5 changes only things that affect this faction. Creep stats, wave composition, map layout, difficulty modifiers, send economy, engine constants are all OFF LIMITS. A v5 run on Mechanical cannot make Mechanical's wins come at the cost of Aliens being broken.

## Lever inventory — totality of changes v5 can make

For each faction:

### Per-tower stat knobs (core balance)
- `cost` — ±50% of nominal (capped to integer)
- `damage` — ±50%
- `range` — ±30% (geometry; bigger swings break maps)
- `fireRate` — ±40%
- `projectileSpeed` — ±50% (mostly cosmetic but affects in-flight kills)
- `targeting` — categorical (closest / first / last / strongest / weakest)

### Per-tower trait param knobs
Every faction trait has parameters; v5 tunes them within bounds. Examples:
- `jackpot`: killChance ±50%, missChance ±50%
- `slow_on_hit`: factor 0.3–0.9, duration 500–3000ms, chance 0.1–1.0
- `splash_damage`: radius ±40%
- `aura traits` (`damage_aura`, `rate_aura`, `crit_aura`, etc.): percent ±50%, range ±30%
- `gold_on_hit`: chance 0.1–0.6, amount 1–8
- `teleport_delivery`: stepsBase 2–8, stepsPerLevel 1–4
- `expires_after_waves`: waves 2–8 (Imp's lifespan)
- `decay_per_wave`: decayPercent 0.05–0.30
- `chain_damage`: chainCount 1–4, chainRange ±30%, falloff 0.4–0.9
- `damage_amp_on_hit`: ampAmount ±50%, duration ±50%

Trait params are scoped per faction — tuning Void's jackpot doesn't change Infernal's gold_on_hit.

### Per-tower upgrade-curve knobs
- `upgrade.cost` per level — ±40% scalar per level
- `upgrade.damage` / `range` / `fireRate` per level — ±30% scalar per level
- Number of upgrade levels — 0/1/2/3 (where currently 0–4 exist)

### Faction-roster knobs (carefully bounded)
- Tower **inclusion** — boolean per tower in the roster. Lets v5 try "what if Mechanical Tesla weren't in the pool?". Bounded so at least 4 towers + the ult must remain.
- Ultimate cost — ±30% (the ult is high-leverage, needs careful bounds)

### What v5 CANNOT change
- Creep stats (hp, speed, armor, count per wave) — shared, breaks balance globally
- Wave compositions — shared
- Trait IDs / kinds — adding a new trait to a tower is a design change, not a balance tweak
- Engine constants (gold per kill, lives count, wave-clear bonus, send costs)
- Map layouts, difficulty modifiers
- Other factions' anything

## Architecture

### v5.1: FactionBalanceSchema
Per faction, generate a schema (tower × stat × bound) from the current `TowerTypes.ts` data. Each tower contributes ~8 knobs (5 base stats + ~3 per trait × N traits). Total ~50 knobs per faction.

```ts
interface FactionBalanceSpec {
  faction: FactionId;
  /** Tower-id → flat knob map. Knob keys are dot-paths into the
   *  TowerType structure: "damage", "traits.jackpot.killChance",
   *  "upgrades.0.cost", "included" (boolean), etc. */
  towerKnobs: Record<string, Record<string, ParamSpec>>;
}
```

### v5.2: FactionBalance loader
At match start (HeadlessMatch), if `FACTION_BALANCE_<FACTION>_PARAMS` env var is set, parse it and patch `TOWER_TYPES` for that faction's towers before the brain initializes. Restore original at match end. Mirror's the existing `<BRAIN>_BRAIN_PARAMS` env-injection pattern.

Env scoping is critical: `FACTION_BALANCE_VOID_PARAMS` only patches Void towers. Aliens / Infernal / etc. stay untouched.

### v5.3: Joint brain-search (two-stage)

**Naïve joint search** (defender params + faction params searched together) blows up: 50 brain knobs × 50 faction knobs = 100-dim space. Too sparse for (μ+λ) ES.

**Two-stage alternation**:
1. **Stage A — tune faction**, defender frozen at current best.
   Search faction-balance knobs to maximize `winRate × utilizationGate(allTowers > 5%)`.
2. **Stage B — tune defender**, faction frozen at Stage A's winner.
   Standard MazingBrain search.
3. **Iterate** until both stages plateau — typically 3–5 outer rounds.

This makes each stage's search the same dimensionality as v3.5 brain-search (~50 knobs), with proven convergence.

### v5.4: Utilization validation loop

Three signals tracked across an eval batch:

**Signal 1 — placement frequency** (per tower, per match)
```
utilization[towerId] = matchesContaining(towerId) / totalMatches
```
A tower with utilization < 0.10 is **flagged** but not necessarily a problem. Niche towers (panic tools, situational counters) legitimately appear in 10–25% of matches.

**Signal 2 — placement density** (per tower, per match where placed)
```
density[towerId] = avgPlacements(towerId | placed) / avgTotalPlacements
```
A tower placed in 90% of matches at 1 placement / match is *less utilized* than a tower placed in 30% of matches at 5 placements each. The product `utilization × density` gives a proper "share of total play" number.

**Signal 3 — ablation impact** (per flagged tower)
For each flagged tower, run an N-match validation with that tower **removed from the roster**. Compare win rate:
- `Δ ≥ 5pp drop` → tower is contributing despite low frequency. Niche, but real value. **Keep, don't flag.**
- `Δ between -2pp and +2pp` → tower is redundant or unused. **Investigate** with classifier (Signal 4).
- `Δ ≥ 5pp gain` → tower is *actively bad* (planner places it sometimes but it loses matches). Probably an over-tuned trait or wrong stats. **Major red flag.**

**Signal 4 — redundancy vs brain-gap classifier**

For each ambiguous tower (low utilization + low ablation impact):

a. **Redundancy probe**: replace the next-most-similar tower (same role, similar cost) with this one. If win rate is preserved → the two are interchangeable, and the brain just picks the more familiar one.

b. **Brain-gap probe**: hand-craft a scenario where this tower's specific trait matters most. E.g., for a teleport tower, generate a long-path map with no other CC towers in the pool. If the brain *still* doesn't pick it → real brain gap (the planner doesn't model the trait's value correctly). File as a v5.5 follow-up scorer.

### v5.5: Reporting + gates

After a v5 run, output:
- `BRAIN_V5_RESULTS_{faction}.md` — per-faction balance + utilization report
- `factionWinrate`: vs static waves AND vs counter-pick (using v4 director)
- `utilization`: per-tower frequency + density
- `ablation`: per-flagged-tower impact
- `classifications`: per-ambiguous-tower redundancy/brain-gap verdict
- `recommendedDiff`: human-readable diff against current `TowerTypes.ts` for review before commit

Production gates (must pass before promoting):
1. **No regression** vs v3.5 baseline win rate (within ±2pp)
2. **Every tower utilization > 5%** OR explicitly classified as redundant
3. **No tower has ablation gain ≥ 5pp** (no "actively bad" towers)
4. **Faction identity preserved** — manual review of recommendedDiff (gate is not auto-passable; design call)

## Implementation order

1. **v5.1 — FactionBalanceSchema generator** (~3 days)
   - Reflects `TOWER_TYPES[faction]` into a flat knob schema
   - Bounds defined per-knob-class (cost ±50%, range ±30%, etc.)
   - Tests: round-trip through env injection produces identical TowerType when knobs are at default
2. **v5.2 — Match-start loader** (~2 days)
   - HeadlessMatch reads env var, patches `TOWER_TYPES[faction]` per-tower
   - Hot reset of the patched values at match end (no leakage between matches)
   - Worker support: brain-search-worker forwards FactionBalance env vars per task
3. **v5.3 — Two-stage alternating search** (~5 days)
   - `scripts/faction-balance.mjs` orchestrator (mirrors `self-play.mjs` shape)
   - Stage A: brain-search faction knobs vs frozen defender
   - Stage B: brain-search defender knobs vs frozen faction
   - Per-stage convergence + iteration cap
   - Resume support
4. **v5.4 — Utilization tracker + ablation harness** (~4 days)
   - `MatchResult.towerIdCounts` already tracks per-match counts (added in v3.4 M3 for diversity); extend with `per-match` granularity
   - Aggregator computes util × density × ablation impact across the eval batch
   - Per-tower roster removal: temporarily filter the tower from the pool, re-run match
   - Classifier: redundancy vs brain-gap probes
5. **v5.5 — Reporting + production gates** (~3 days)
   - Report generator (markdown + JSON)
   - Gate-checker that reads results and exits 0/1 for CI
   - Diff generator for human review

**Total v5 effort: ~3 weeks of focused work**, mostly mechanical plumbing. The non-trivial bit is the redundancy/brain-gap classifier; rest is search/eval pipelines we already have.

## Compute budget

- Stage A faction tune: ~150 evals × 20 seeds = 3000 matches × 8s / 4 workers ≈ 100 min
- Stage B defender tune: ~200 evals × 20 seeds = 4000 matches / 4 workers ≈ 130 min
- 3-5 outer rounds: 15 hours per cell at full settings
- 11 factions × normal: 165 hours of single-stream compute
- Parallelisable: 4 cells in parallel = ~40 wall hours

That's a long compute run. Practical recommendation: run faction-balance on the **0/50 cells first** (mechanical, military, nature, celestial, arcane) where v3.5 has the most to gain. Total ~75 hours for those 5 cells, ~20 wall hours at 4× parallelism. Borderline cells (cypherpunk, harmonic, psionic) come second.

## What v5 unlocks

- **Cells the kit currently can't win** become tunable. Mechanical at 0/50 might find a config where (e.g.) Tesla's chain count or Turret's fire rate makes the kit viable, *without* changing creeps or maps.
- **Underutilized towers get auto-flagged** for design attention. If Soul Drain is never picked across 1000 matches, that's now a measurable, reportable fact instead of a vibe.
- **Redundancy detection** — when two towers are interchangeable, design can collapse them or differentiate them deliberately.
- **Brain-gap detection** — when a tower has unique value the brain misses, it tells us what scorer is missing for v5.5+ work.

## What v5 explicitly does NOT solve

- **Cross-faction balance**. v5 makes Mechanical winnable on its own merits. It doesn't ensure Mechanical isn't *too strong* compared to Aliens — that's a separate cross-cell tournament, not in v5 scope.
- **Map balance**. If a faction is good on plains and bad on serpentine, v5 tunes only one cell at a time. Cross-map consistency requires running v5 per (faction, map) and reconciling.
- **Pacing / fun**. v5 optimizes win rate + utilization. It doesn't know whether the player *enjoys* the resulting kit. Manual review at the gate stage is essential.
- **Trait additions / removals**. v5 tunes existing traits, doesn't add new ones. If a tower needs a new trait to be viable, that's a manual design step.

## Open decisions to lock before starting

1. **Which faction first?** Recommend Mechanical — most kit components, biggest 0-win gap to climb, established v4 plateau confirms it's a kit-balance issue not a search issue. Good demo cell.
2. **Win-rate floor vs utilization floor**. If forcing utilization > 5% on every tower drops win rate by 10pp, which wins? Recommend: utilization floor as a **soft** constraint (penalty term in fitness, not hard veto). Lets the search find Pareto trade-offs.
3. **How aggressive on per-tower removal?** v5 could try roster compositions that drop 2 towers. Recommend: keep roster size fixed, only tune included/excluded *individual* towers per round to limit exploration.
4. **Stage-A direction**. Do we want faction tuned to be **easier** (so weak kits become viable) or **harder** (so strong kits get rebalanced down)? Recommend: target uniform 30–40/50 win rate on plains/normal across all factions. Pulls weak kits up AND prunes overpowered ones.
