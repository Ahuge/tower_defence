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

Current defaults are tuned for **absurd confidence + overnight runs**:

- **seedsPerCell = 1,000** → ±1.5% CI. Any delta ≥ ±3% is statistically
  meaningful; no more chasing 5-seed variance.
- **Baseline sweep** = 11 factions × 4 difficulties × 4 brains × 1000 seeds = **176,000 matches**.
- **Faction-scoped change** (one per catalog entry with a specific faction):
  narrows to that faction only = 16,000 matches. A Nature change can't
  affect Arcane, so the other 10 factions are skipped — ~10× faster per change.
- **Global change** (difficulty ramp, kill gold, starting gold): full 176,000.

Catalog as shipped (~220 faction-scoped + ~12 global):
- Matches: 176,000 + 220 × 16,000 + 12 × 176,000 = **5,808,000**.
- Aggregate throughput: 28 cores × ~30 matches/s/core = 840 matches/s.
- Runtime on 28 cores: **~2 hours wall time** (well within an overnight window).
- Serial (no workers): ~2 days — don't.

For quick iteration drop `seedsPerCell: 1000` → `100`:
- Baseline drops to 17,600. Faction-scoped to 1,600.
- Full catalog runs in ~13 min on 28 cores, ±4.5% CI.

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
