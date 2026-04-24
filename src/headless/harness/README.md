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

- Single sweep ≈ 1,760 matches ≈ 50–60 s single-threaded (44 cells × 40 seeds).
- Catalog ≈ 33 tasks (baseline + 32 changes).
- With 28 cores: roughly `33 / 28 × 55 ≈ 65 s` — ~1–2 min including
  startup + result aggregation.
- With 8 cores: ~4 × single-sweep time ≈ 4 min.
- Serial (no workers): 33 × 55 s ≈ 30 min.

`seedsPerCell: 40` gives ±7% CI on a binary win rate — tight
enough to land ±10% balance deltas outside the noise floor.
Drop to 12 for quick iteration (±14% CI), bump to 80 for
publication-grade confidence.

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
