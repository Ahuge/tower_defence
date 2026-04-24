# Balance harness

A/B-tests balance changes by running the autonomous-play
tournament once per change and diffing the best-brain win rates
against a baseline.

## Install

Adds one dev dep:

```
npm install
```

(pulls `tsx`, used as the TS loader inside worker threads).

## Run

```
# Full 32-change catalog, all cores
node --import tsx scripts/run-harness.mjs

# Limit worker count
node --import tsx scripts/run-harness.mjs --workers=8

# Single change (spot-check)
node --import tsx scripts/run-harness.mjs --change=nature.4
```

Stdout = markdown report. `harness-results.json` is also written
to the cwd for re-analysis without re-running.

## How it works

1. **Catalog** — `ChangeCatalog.ts`. Each entry is an `apply(patch)`
   function that mutates `TOWER_TYPES` / `DIFFICULTIES` via the
   `PatchEngine` (which records reverters for automatic rollback).

2. **Baseline + per-change sweeps** — `HarnessRunner.ts` runs the
   same tournament matrix used by `batch.test.ts` (11 factions ×
   4 difficulties × 4 brains × 20 seeds = 3,520 matches per sweep).
   Baseline runs first; then one sweep per change.

3. **Parallelism** — `Pool.ts` spawns `worker_threads` (one per
   CPU by default, capped by `--workers`). Each worker has its
   own V8 heap so `TOWER_TYPES` mutations don't cross-contaminate.
   Tasks are round-robin split; results stream back as each sweep
   finishes.

4. **Report** — `HarnessReport.ts` formats a ranking table
   (weighted score = `targetFactionDelta × 2 + netDelta`) plus
   per-change breakdowns showing which (faction, difficulty)
   cells moved and whether they landed in their target band.

## Scale

- Baseline sweep ≈ 8,800 matches (11 factions × 4 difficulties × 4 brains × 50 seeds).
- Per-change sweep (faction-scoped): narrows to just that faction = 800 matches.
  - A Nature change can't affect Arcane's win rate, so the other 10 factions
    are skipped. ~10× faster per change vs. sweeping all factions.
- Per-change sweep (global-scoped): full 8,800 matches.
- `seedsPerCell: 50` gives ±6.5% CI on a binary win rate — balance
  deltas of ±10% land outside the noise floor reliably.

Total catalog (baseline + 32 faction-scoped changes):
- Matches: 8,800 + 32 × 800 = **34,400**.
- Runtime on 28 cores: ~40 s sim + 15-30 s startup/aggregation ≈ **~1 min**.
- Serial: ~20 min.

Add a `global` change (e.g. difficulty ramp) and each one adds
8,800 matches (~18 s serial, much less with parallel).

## Target bands

A change is "good" when it pulls cells toward these windows:

| Difficulty | Target win rate |
|---|---|
| Easy | 75–100% |
| Normal | 35–65% |
| Hard | 0–25% |
| Insane | no band (mostly 0) |

Report's `✅/❌` flags mark in-band vs. out-of-band per cell.

## Catalog shape

Each entry:

```ts
{
  id: 'nature.4',                 // stable; used as result key
  faction: 'nature',              // target (or 'global')
  description: 'Viper damage 8→12',
  apply: (p) => p.patchTower('nature_viper', 'damage', 12),
}
```

Add new changes as plain array entries. `PatchEngine` covers
tower fields (`patchTower`), per-level upgrade stats
(`patchUpgrade`), individual trait fields (`patchTrait`), whole-
upgrade arrays (`patchUpgrades`), and difficulty hints
(`patchDifficulty`).
