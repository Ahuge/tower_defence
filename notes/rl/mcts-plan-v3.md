# Plan v3: Search-Based Tower Defense AI (locked)

This is plan v3 — incorporates round-2 critic feedback on v2. All 4 critics gave verdicts in the "iterate once more" or "lock-and-execute with minor fixes" range. No HUGE changes from v2; v3 tightens specifications.

## What changed v2 → v3

1. **Baselines table reconciliation** (Game-tree + MCTS critics): `notes/rl/baselines.csv` was overwritten by an arch2-random eval. Authoritative PPO v4 = 35/100 wins on plains is in commit 8091dbce. Restored here so success bars are anchored to measured truth.

2. **Rung 1 spec tightened** (Game-tree critic): explicit receding-horizon replan every between-wave tick + tower-type chosen via 1-ply lookahead (not "cheapest affordable"). The previous spec was closer to "wrapped W*" than "online replanner".

3. **Rung 2 spec tightened** (Game-tree + Systems critics):
   - Beam width B=10 not 50 (compute realism + diminishing returns)
   - Depth = min(3, remaining_waves) not "remaining waves" (front-loaded variance avoidance)
   - Explicit beam pruning at each depth (not exponential!)
   - Rollout policy specified: continue with rung-1 brain for lookahead simulation
   - Seed averaging: N=3 creep-RNG seeds per beam node, score averaged
   - Mid-beam scoring: same as terminal (path-shape × wave HP clearance)

4. **Parallelism elevated** (Systems critic): worker_threads-based evaluation harness lands in rung 1 deliverables, not rung 4. The 4-map × 100-match eval suite is embarrassingly parallel; rung 1 wall-clock budget assumes 8x speedup from this.

5. **Mid-state resume spike** (Systems critic): added as rung 1.5 (a half-day investigation). Determines whether rung 2 needs cheap-clone state, or can use existing Match.

6. **Wall-time budgets per rung** (Systems critic): explicit budget for each rung. Cut features if exceeded.

7. **Rung 3 V-learning spec** (V-learning critic) intentionally kept as a stub. The four open questions (sample budget, exploration noise, replay/n-step, value densification) will be specified before any rung-3 code is written. Deferred is acceptable because the escalation ladder structure means we may never reach rung 3.

## Baselines (measured, n=100, T=0)

These are what the rungs are competing against. Authoritative — from `notes/rl/baselines.csv` commit 8091dbce.

| brain | wins/100 | Wilson 95% CI | avgWave |
|---|---|---|---|
| dumb (random) | 0 | [0%, 3.7%] | 3.7 |
| balanced (solo) | 1 | [0.2%, 5.4%] | 10.6 |
| **optimizer-teacher (offline W\*)** | **14** | **[8.5%, 22.1%]** | 13.2 |
| bc-v4 alone | 0 | [0%, 3.7%] | 4.0 |
| **PPO v4 (BC + PPO refinement)** | **35** | **[26.4%, 44.7%]** | 24.8 |
| PPO v4 on crossroads (held-out) | 0 | [0%, 3.7%] | 5.0 |

Two key implications:
- The offline W\* by itself (used as teacher OptimizerBrain) wins 14% — that's the static-plan ceiling.
- PPO v4 added 21 percentage points on top of the static W\* via RL refinement. Online replanning should land somewhere between 14% and 35% if it captures any of the adaptation PPO learned but no learning.

## Escalation ladder

### Rung 1 — Online maze-optimizer with receding-horizon replan (3-5 hours)

**Implementation:**

`src/systems/bots/brains/OnlineMazeOptimizerBrain.ts`:

```
on decide(ctx):
  if not ctx.betweenWaves:
    return inner.decide()  // upgrade / sell / skip during wave
  if no budget:
    return { skip }

  // Re-run optimizer from CURRENT state. Treat already-placed towers
  // as prefix (fixed walls). Generate top-K candidate W* cells from
  // greedy + restarts (1 restart, capped at next-3-cells).
  candidates = optimizer.replan(ctx.grid, ctx.budget, K=5)

  // Pick best candidate via 1-ply rollout: place tower at candidate
  // cell with each affordable tower type, score by:
  //   - path length gain (immediate maze)
  //   - tower DPS × adjacent path cells (immediate kill power)
  best = argmax_(cell, type) of 1ply_score(cell, type, ctx)

  return { place, col=best.col, row=best.row, type=best.type }
```

**Reuse:**
- Existing `MazePlanner.scoreMazeCells` for path-gain scoring
- Existing `BalancedBrain.phase` for in-wave logic (upgrade / sell / skip)
- Existing `Match` for harness

**Eval suite:**
- 4 train maps + gauntlet held-out
- 100 matches per map, T=0 sampling
- Run via `worker_threads` parallelism (8 workers, one per CPU core minus 5)

**Wall-time budget**: 4 hours including parallel eval. If we exceed this, cut: drop seed averaging at eval (single seed per match) → ~30 min.

**Success bar (pivot trigger)**:
- ≥50% wins on plains *(must beat PPO v4 = 35%)*
- ≥10% wins on gauntlet *(any non-zero generalization vs PPO v4's 0%)*

Per the Game-tree round-2 critic: "Rung 1's success bar may be unreachable in principle. v2 itself notes online-optimizer probably lands 20-30%. So rung 1 is set up to fail-by-design, then we go to rung 2. That's not wrong, but call it: the bar is a pivot trigger, not a realistic target."

I'm explicit: rung 1 likely lands 20-30% on plains. We move to rung 2 unless we get lucky.

### Rung 1.5 — Mid-state resume spike (half day)

**Question**: does the existing headless `Match` support forking from an arbitrary `(grid, towers, gold, lives, wave, rngState)`? Or does it require running from t=0?

**Why this matters**: rung 2 (beam search) needs to simulate forward from non-initial state. If Match can't do that, rung 2 is gated on a cheap-clone state representation — which is rung-3-gated work moved forward.

**Method**: write a unit test that:
1. Starts a match
2. Plays 10 waves
3. Captures `(grid, towers, gold, lives, wave, rngState)`
4. Resumes a new Match instance from that state
5. Asserts the same next 5 waves play out identically (modulo float comparison tolerance)

If passes: rung 2 unblocked.
If fails: rung 2 needs cheap-clone state work (~1-2 days of structural change) before any beam work begins.

### Rung 2 — Beam search with explicit pruning (1 week, IF rung 1 fails bar AND rung 1.5 passes)

**Implementation:**

`src/systems/bots/brains/BeamSearchBrain.ts`:

```
on decide(ctx):
  if not ctx.betweenWaves: return inner.decide()
  if no budget: return { skip }

  // Generate K=10 candidates from online maze-optimizer (rung 1 logic)
  candidates = rung1.replan(ctx, K=10)

  // For each candidate, simulate forward `depth` waves with N=3
  // creep-RNG seeds. Beam width B=10 maintained across depth.
  // Pruning: at each depth, drop bottom 50% by score.
  beam = candidates.map(c => ({ state: simulate_place(ctx, c), score: 0, history: [c] }))
  depth = min(3, remaining_waves)

  for d in 1..depth:
    expanded = []
    for entry in beam:
      next_candidates = rung1.replan(entry.state, K=10)
      for nc in next_candidates:
        // Average across N=3 creep-RNG seeds.
        avg_score = mean([simulate_n_steps(entry.state + nc, seed=s) for s in [1,2,3]])
        expanded.push({ state: entry.state + nc, score: entry.score + avg_score, history: entry.history + [nc] })
    beam = top_B(expanded, B=10)  // prune to width 10

  // Return the FIRST move of the best beam path
  best = argmax_b(beam.score)
  return best.history[0]
```

**Rollout policy during lookahead**: rung-1 brain (online maze-optimizer with 1-ply tower selection). So beam evaluates "what happens if I follow this candidate then play rung 1 from then on."

**Scoring at each beam node** (mid-beam, not just terminal):
- Path length × turn count (existing reward shaping)
- Tower DPS × path-cell-in-range pairs
- Penalty for lives lost in simulated waves

**Wall-time budget**: 8 hours for 1 evaluation suite (parallelized). If exceeded, cut B=10→5 or depth=3→2 or N=3→1 seeds.

**Compute reality check** (from Systems critic):
- 10 candidates × 3 seeds × 3 depth × 150ms simulation = 13.5s per decision
- × 30 decisions per match = 7 min per match
- × 500 matches eval = ~58 hours sequentially
- × 8 workers parallel = ~7.5 hours

If actual measured cost is higher, we cut parameters. Budget enforced.

**Success bar (pivot trigger):**
- ≥60% wins on plains
- ≥25% wins on gauntlet

### Rung 3 — V-augmented beam (1-2 weeks, IF rung 2 fails bar)

**STUB — to be specified if we reach it.** Will require addressing all four V-learning critic concerns:
1. How many self-play games feed V (sample budget)
2. Where exploration noise comes from (since beam is deterministic)
3. Replay buffer + n-step bootstrap (NOT deferred to rung 4 — needed here)
4. Whether terminal +1/-1 + lives-conditional wave bonus densifies V target enough

Plus systems requirements:
- Cheap-clone state (if not already done in rung 1.5)
- Batched V inference at beam frontier
- Worker_threads parallelism for self-play

**Conservative success bar (anchored against actual measurements):**
- ≥50% wins on plains *(beats PPO v4's 35%)*
- ≥25% wins on gauntlet *(beats PPO v4's 0%)*

Note: lower than v2's "75% plains" bar — round-2 V critic flagged "success bars are aspirational, not derived." Anchor to PPO v4 + improvement margin.

### Rung 4 — MCTS with policy + V (last resort)

Lock as v2's spec: K=256, tree caching, policy head trained from MCTS visit counts, batched leaf V, multi-map self-play, replay buffer, n-step bootstrap, per-map V calibration. All round-1 critic concerns addressed.

Only worth attempting if rungs 1-3 ceiling out below the rung-3 bar AND we have appetite for 1-2 weeks of implementation + 6-10 hours per training run.

## Architecture decisions locked

Same as v2 §"Architecture decisions locked":

1. No reward shaping beyond +1 win / −1 loss / +0.05 per-wave bonus on terminal step (lives-conditional). The wave bonus is **for evaluation only**, not for V training target — V regresses to pure outcome.
2. Multi-map training mandatory. All training and evaluation rotates plains/crossroads/fortress/serpentine.
3. n=100 Wilson-CI evaluation. Smaller n = below noise floor.
4. Held-out map for generalization (gauntlet).
5. Hand-written scoring (rungs 1-2) must be compared to learned V (rungs 3-4) before committing to learning.
6. Cheap-clone state work is rung-1.5-gated (not rung-3-gated). Confirms whether rung 2 needs it.

## Per-rung exit criteria summary

| rung | what's built | wall-time budget | success bar |
|---|---|---|---|
| 1 | OnlineMazeOptimizerBrain + parallel eval | 4 hours | ≥50% plains + ≥10% gauntlet |
| 1.5 | Mid-state resume spike | 0.5 day | passes → rung 2 unblocked |
| 2 | BeamSearchBrain (B=10, depth=3, N=3 seeds) | 8 hours | ≥60% plains + ≥25% gauntlet |
| 3 | V-augmented beam (V trained on rung 1-2 self-play) | 1-2 weeks | ≥50% plains + ≥25% gauntlet |
| 4 | Full AlphaZero MCTS | 2-3 weeks | (vary by data) |

## Decision: lock and execute on rung 1

Per the user's stop criterion: "iterate until the sub agents aren't providing huge changes (only small or stylistic ones)".

Round-2 critic verdicts on v2:
- MCTS critic: **lock-and-execute** with minor fixes (now in v3)
- V-learning critic: **iterate on rung 3 spec only** (v3 keeps it as a stub — acceptable because we may not reach it)
- Game-tree critic: **iterate** — minor fixes (now in v3)
- Systems critic: **iterate one more pass** — two cheap fixes (worker_threads to rung 1, mid-state resume spike) — both in v3

No round-3 critic spawn. Lock v3 as the executable plan.

## When this executes

Currently waiting on PPO v7 (multi-map BC + PPO with v2 architecture) — iter 20/60, r_mean=+0.009, entropy=0.64. Final at iter 60, validate n=100 on 5 maps. **If PPO v7 clears ≥30% plains + ≥20% gauntlet**, ship PPO v7 and shelve this plan. **Otherwise execute plan v3 starting at rung 1.**
