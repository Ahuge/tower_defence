# Rung 1.5 spike finding: Match has no built-in mid-state resume

## What I checked

Per plan v3 rung 1.5: verify whether headless `Match` supports forking from arbitrary `(grid, towers, gold, lives, wave, rngState)` state, or whether it can only run from t=0.

## Finding

**Match has no built-in snapshot/restore.** Public API is only `constructor / step / isDone / result / observe / getCreeps / getGrid / getAllPaths / getSimTimeMs`. Private state spans:

- `towerMgr` (TowerManager) — Tower objects with cooldowns, projectiles, attack state
- `creepMgr` (implied via observe) — Creep objects with position, HP, status effects, path index
- `waveCtrl` — wave timer + spawn state
- `statsTracker` — gold earned/spent, creeps killed
- `allPaths` — current creep paths
- Scalars: `currentWave`, `lives`, `simTime`, `rngState`, `finished`, `outcome`

To resume from a snapshot, every one of these would need serializable state.

## Implication for rung 2

Beam search at depth 3 with N=3 seeds needs to simulate forward 3 waves per beam node. Without snapshot/restore, the only options are:

### Option A — Implement cheap-clone state (1-2 days)

Add `Match.snapshot()` → plain object + `Match.restore(snapshot)` → reconstructs all managers. Requires:
- `Tower.toJSON / fromJSON`
- `Creep.toJSON / fromJSON`
- `TowerManager / CreepManager / WaveController` round-trip
- Determinism test: snapshot mid-match, restore, play 5 more waves, compare to non-restored continuation

This is the spec'd plan path. Real beam search with forward sim. Largest dev investment so far.

### Option B — Approximate scoring (no forward sim)

Beam degenerates to "multi-step heuristic ranking" — score candidates by hand-written function (path length + coverage + economy DP), pick top-B, recurse to next placement without simulating intervening waves.

Closer to rung 1's logic but with multi-step lookahead. Loses the "this maze breaks at wave 15" signal that makes true beam interesting. Effectively the same as rung 1 with depth.

### Option C — Replay from t=0 for each beam node (slow)

For each candidate, build a fresh Match from t=0 + simulate the prior decisions + place candidate + continue. Cost: 1 full match per beam node = 100-200ms × 30 nodes = 4-6s per decision × 30 decisions/match = 2-3 min/match. × 500-match eval = 17-25h sequentially, 2-3h parallel.

Doable but expensive AND requires recording the prior decision sequence per beam node (which itself needs state).

## The decision before writing more code

User should weigh in on:

1. **Are we committing to Option A (cheap-clone state, 1-2 days dev)?** This is the spec'd plan, gives us real beam search, but is the largest scope item in the entire pivot. Once done it also unlocks rung 3+ (MCTS, V-augmented beam).

2. **Or do we want Option B (approximate scoring, ~1 day)?** Less work but weaker rung 2 — may produce ~5% on plains instead of the ≥60% target. Risk: rung 2 ceilings out and we have to retry rung 2 with Option A anyway.

3. **Or has rung 1's mixed result (100% fortress, 0% elsewhere) given us enough information that we should pivot the plan further?** E.g., investigate WHY fortress works at 100% to understand what online maze-optimizer is missing on the other maps. This could yield a cheaper fix than building rung 2.

## My recommendation

Option 3 first (investigate fortress vs plains via webms / per-decision logs) — cheap (30 min) and might reveal a tuning fix to rung 1 that unblocks plains/crossroads/gauntlet without needing rung 2 at all.

If that doesn't find a fix → Option A (cheap-clone state). Real beam, real chance, unlocks future rungs.

If user wants speed-of-iteration over rigor → Option B as a quick rung 2 prototype.

## Stopping point

Halting autonomous execution here. The Option A/B/C choice is an architectural decision worth user input. Current state of the world is committed (rung 1 + rung 1.5 spike). Ready for direction.
