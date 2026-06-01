# Plan v2: Search-Based Tower Defense AI

## Summary of v1 → v2 changes

v1 proposed AlphaZero-style MCTS with V-only network. Four critics reviewed:
- MCTS specialist: redesign MCTS (K≥256, tree caching, policy head)
- Value-learning specialist: add replay buffer + n-step bootstrap + per-map heads
- **Game-tree specialist: don't do MCTS at all — try online maze-optimizer first**
- Systems engineer: feasible but only with cheap-clone state + tree caching + workers

The game-tree specialist's argument restructures the entire plan:

> "The maze-optimizer is the algorithmic asset you already paid for. Don't bury it under a tree search you'd need a year to make work."

> "MCTS is for two-player games with opponent uncertainty. Our problem is single-player planning."

This is the largest possible change to v1. v2 incorporates it: **escalation ladder from cheapest to most-expensive, measure at each rung**.

## Escalation ladder

Each rung is a fully working agent with a defined success bar. Move to the next rung only if the current one's results don't clear that bar.

### Rung 1 — Online maze-optimizer (cheapest, ~1 day)

The existing `scripts/maze-optimizer.mjs` produces W* offline. Run it *online* between waves with current grid state + remaining gold + a 2-wave economy DP.

**Implementation:**
- New brain: `OnlineMazeOptimizerBrain.ts`
- Each between-wave decision: replan from current state with current budget
- Use existing optimizer's greedy + restarts
- Pick top-1 cell, place cheapest tower we can afford
- Once W* is "done" (path saturated), pivot to DPS upgrades (use BalancedBrain logic)

**Why it's likely to work:**
- v4 was cloning a SINGLE static W* (the offline one computed at match start)
- Online recomputation adapts to actually-placed towers + budget reality
- No training. No reward shaping. No mode collapse risk.

**Success bar:**
- ≥50% wins on plains (must beat PPO v4's 35%)
- ≥10% wins on held-out gauntlet (any generalization is progress)

If clears bar: STOP. Ship as the baseline.

### Rung 2 — Beam search over placement sequences (1 week)

If rung 1 ceilings out below the bar.

**Implementation:**
- Each between-wave decision, enumerate top-K candidate placements via online maze-optimizer + locality prior
- Look ahead 2-3 waves: simulate each candidate forward via the existing headless Match, evaluating reward shaping + economy + wave HP
- Beam width B=50, depth = remaining waves
- Best-scoring path = next move

**Scoring function:**
- Path length × turn count (from existing reward shaping)
- Economy DP: gold accrued + wave HP cleared
- Penalty for early lives lost

**Why it might beat rung 1:**
- Lookahead handles economy tradeoffs (save vs spend) that single-tick optimizer can't
- Multi-wave evaluation catches "this maze breaks at wave 15" before committing

**Success bar:**
- ≥60% wins on plains
- ≥25% wins on gauntlet

### Rung 3 — Learned V network ranks beam frontier (1-2 weeks)

Only if rung 2 ceilings out.

**Implementation:**
- Same beam structure as rung 2
- At each beam expansion, score candidates with V(state) instead of (or alongside) hand-written scoring function
- V trained from rung-1 + rung-2 self-play outcomes
- V network = v2 architecture's encoder + value head (already built)

**Why it might beat rung 2:**
- Hand-written scoring misses subtle positional tradeoffs
- V can learn cross-state-cross-map "this is a good board" signal
- Network architecture is already validated (full RF, positional embed, FiLM globals)

**Success bar:**
- ≥75% wins on plains
- ≥40% wins on gauntlet

### Rung 4 — MCTS with policy head + V (last resort)

Only if rung 3 ceilings out.

**Implementation:**
- AlphaZero-style MCTS with policy head, K=256, tree caching, batched leaf V
- Self-play loop trains policy from visit counts, V from outcomes
- All v1 fixes from critics: replay buffer, n-step bootstrap, per-map V calibration

**Why we'd consider it:**
- If hand-engineered planning and V-ranked beam search both ceiling out, the residual ceiling-buster is more search budget
- MCTS is the canonical "search-budget-bounded explorer"

**Success bar:**
- ≥85% wins on plains
- ≥60% wins on gauntlet

## Concrete next steps

### Rung 1 implementation (start immediately if PPO v7 doesn't clear bar)

Files to write:
- `src/systems/bots/brains/OnlineMazeOptimizerBrain.ts` — implements BotBrain, wraps the existing maze-optimizer logic but called per-decision
- `scripts/online-maze-optimizer-eval.mjs` — runs the new brain through `measurement-baselines.mjs`-style harness, n=100 per map (plains + 4 held-out)
- No training, no Python, no PPO. Just JavaScript.

Reuse:
- `scripts/maze-optimizer.mjs`'s `scoreMazeCells` + `simulateWithWall` logic — refactor those into `src/systems/bots/MazePlanner.ts` if not already there
- `BalancedBrain`'s phase machine for post-maze DPS placement
- Existing measurement-baselines harness for evaluation

Implementation time: ~3-5 hours of work.

### Validation protocol

Same as Stage 1.1 baselines but with the new brain added:
- 100 matches × (random / balanced / optimizer-teacher / online-maze-optimizer / PPO v4 / PPO v7)
- 5 maps (4 train + gauntlet held-out)
- Same difficulty, same waves, same Wilson CIs

### What we'd commit to ship vs keep exploring

- **If rung 1 ≥50% plains + ≥10% gauntlet**: ship as the production agent. Document it. PPO + MCTS work is permanently shelved. ~1 day of work total.
- **Anything less**: rung 2. Document rung 1's ceiling and what was missed.

## Architecture decisions locked

These are non-negotiable based on critic convergence:

1. **No reward shaping beyond +1 win / −1 loss / +0.05 per-wave bonus on terminal step (lives-conditional).** Reward design critic was emphatic: 7-term shaping has one optimum and the policy found it. Stacking more shaping is the wrong move.

2. **Multi-map training mandatory.** Methodology + architecture critics confirmed: single-map training memorizes terrain. All training and evaluation rotates plains/crossroads/fortress/serpentine.

3. **n=100 Wilson-CI evaluation is the minimum.** Methodology critic was emphatic: n=20 is below the noise floor.

4. **Held-out map for generalization test.** Gauntlet, n=100. If train-set wins but held-out is 0%, we memorized — pivot.

5. **Hand-written scoring function (rungs 1-2) MUST be compared to learned V (rungs 3-4)** before committing to learning. Game-tree critic was emphatic: we may not need the learning at all.

6. **Cheap-clone state is the gating dependency for any rung 3+ work.** Systems critic: don't start MCTS until snapshot cost < 0.2ms.

## Decision points

When PPO v7 finishes (in ~2-3 hours), we have one of three outcomes:

- **PPO v7 clears the original bar (≥30% plains + ≥20% gauntlet)**: ship PPO v7 (multi-map BC + PPO actually worked), shelve this whole rung 1-4 plan
- **PPO v7 fails**: execute rung 1 (online maze-optimizer). Decision tree from there.

## Open questions deferred for now

- Whether to ALSO train policy head later for amortized search (MCTS specialist's recommendation) — defer to rung 4 if we get there
- Per-map V calibration heads (value specialist's recommendation) — defer to rung 3 if we get there
- Tree caching + batched V + worker_threads parallelism (systems specialist's recommendations) — defer to rung 4 if we get there

These are all addressed by the escalation ladder structure — if we never reach those rungs, we never need the fixes.

## Risk register

- **Rung 1 may work too well**: if online maze-optimizer is 80% on plains and 50% on gauntlet, we've effectively "solved" the problem with no learning. This is a *good* outcome but means months of PPO/BC work was wasted. (We knew that already from the critic synthesis.)
- **Rung 1 may match PPO v4**: 35% plains, 0% gauntlet. Doesn't ship as a clear improvement but proves the online-vs-offline-optimizer hypothesis. Move to rung 2.
- **Rung 1 may UNDERPERFORM PPO v4**: indicates that PPO's 35% on plains contained real refinement over pure maze-optimizer scoring. In that case we genuinely need learning. Move to rung 3 directly (skip rung 2's hand-written scoring).

## Sanity check the critics may have missed

The 4 critics didn't see the existing `notes/rl/baselines.csv` showing:
- OptimizerBrain teacher = 14/100 wins on plains
- PPO v4 = 35/100 wins on plains

That gap (14% → 35%) means PPO's RL refinement added 21 percentage points beyond what the static teacher could provide. Whatever the online maze-optimizer baseline adds will likely be in between — maybe 20-30% on plains. If we want to beat PPO v4 we'll need more than rung 1.

This is what gates the rung 1 → rung 2 transition. The bar must be set above PPO v4 (≥50% plains) for rung 1 to count as a win, otherwise it's just "PPO v4 is still SOTA, and the simpler approach matched it."
