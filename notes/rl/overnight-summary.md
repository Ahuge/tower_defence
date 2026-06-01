# Overnight summary (read top-down)

## Where we ended up

Rung 1 (online maze-optimizer brain) is at a meaningful partial result. Bar from plan v3 (≥50% plains + ≥10% gauntlet) NOT cleared — plains and gauntlet still 0%. But the brain dominates fortress, serpentine, and partial crossroads where balanced fails entirely.

## All overnight progress (commit-by-commit)

1. **PPO v7 finished** — trained on 4-map BC + multi-map rollouts. Final r_mean +0.012, entropy 0.92. Validation: **0/100 wins on plains** at T=0. Failed bar. Confirmed: BC+PPO architecture cannot escape mode collapse even with multi-map data + larger network.

2. **Drafted MCTS pivot plan** — spawned 4 ML experts (MCTS specialist, V learning, game-tree, systems), iterated v1 → v2 → v3 through 2 rounds of critique. Plan v3 LOCKED as an escalation ladder:
   - Rung 1: Online maze-optimizer (3-5h)
   - Rung 1.5: Mid-state resume spike (0.5d)
   - Rung 2: Beam search (1 week)
   - Rung 3: V-augmented beam (1-2 weeks)
   - Rung 4: Full MCTS (last resort)

3. **Rung 1 implemented and iterated twice:**

   | map | random | balanced | rung1 v1 | rung1 v2 (final) | PPO v4 |
   |---|---|---|---|---|---|
   | plains | 0% w3.7 | 1% w10.3 | 0% w16.2 | 0% w16.8 | **35% w24.8** |
   | crossroads | 0% w4.6 | 0% w6.3 | 0% w5.0 | **9% w24.1** | 0% w5.0 |
   | fortress | 0% w3.4 | 0% w6.0 | 100% w25 | 83% w24.2 | n/a |
   | serpentine | 0% w10.8 | 98% w25 | 22% w24.9 | **100% w25 L17** | n/a |
   | gauntlet * | 0% w3.8 | 0% w5.4 | 0% w5.7 | 0% w9.8 | 0% w5.0 |

   * = held-out (gauntlet was not in plan v3's training maps either)

   **Major v1→v2 algorithmic fix**: I had two bugs in the first rung 1 vs the offline maze-optimizer's algorithm:
   - Candidate set was "all cells within Cheb=3 of path" instead of "path cells ∪ 4-neighbours of path cells"
   - Filter rejected gain=0 walls; the offline optimizer ACCEPTS them ("Accept the best wall even if it doesn't strictly improve") because gain=0 walls cluster to force longer detours later
   - Fix delivered crossroads 0→9%, serpentine 22→100%, gauntlet wave depth 5.7→9.8

4. **Rung 1.5 spike completed**: Match has no built-in snapshot/restore. Public API is only run-from-t=0. Beam search (rung 2) needs forward simulation from arbitrary state — gated on cheap-clone state work.

## The structural finding (don't miss this)

PPO v4 = 35% plains wins. Rung 1 v2 = 0% plains wins (but wave depth 16.8 — deeper than balanced's 10.3).

**This is a real result, not a noise floor.** The online maze-optimizer brain CAN'T beat plains because:
- Plains is open with single entry/exit
- Single-wall greedy can't extend the path beyond +2 cells (A* finds equivalent detours)
- Wall clusters need to cooperate to force long detours
- Offline maze-optimizer succeeds via *restarts* — tries different starting configurations
- Online has no "restart" option — committed to past placements

PPO v4's 35% came from RL refinement learning to adapt the maze to wave timing. **The online optimizer brain doesn't have that.**

Implication: rung 1 cannot match PPO v4 on plains as currently designed. Rung 2 (beam with lookahead) is where this gets fixed — beam can evaluate multiple placement sequences and pick the one that survives wave pressure.

## What's needed for rung 2

Per the plan v3 spec, rung 2 needs cheap-clone state on Match to forward-simulate from arbitrary state. The spike confirmed this is required.

Scope of cheap-clone work (estimated 1-2 days based on file sizes):

```
src/entities/Tower.ts         979 LOC  — add toJSON/fromJSON
src/entities/Creep.ts         559 LOC  — add toJSON/fromJSON
src/systems/TowerManager.ts   365 LOC  — round-trip helper
src/systems/CreepManager.ts   247 LOC  — round-trip helper
src/headless/Match.ts         668 LOC  — snapshot/restore API + coordinator
                            ─────
                            2818 LOC
```

Plus determinism tests (compare resumed match to non-resumed continuation, assert byte-equality of build hash + lives + wave + final outcome over 5 waves).

This is the largest single piece of dev work in the entire pivot. **I stopped before starting it** because it's an architectural change that warrants explicit go-ahead beyond "execute the plan."

## Three paths from here (need your call)

### Path A — Build cheap-clone state + real rung 2 (1-2 days)
Spec'd in plan v3. Real beam search. Also unlocks rungs 3+ (MCTS, V-augmented beam) for future work. The expected outcome: rung 2 beam search with B=10, depth=3, N=3 seeds could plausibly clear the ≥60% plains bar.

### Path B — Replay-from-t=0 beam (3-5 hours, expensive at eval time)
For each beam node, build a fresh Match from t=0 + replay the prior decisions to current state + try candidate. ~2-3h parallel for a 500-match eval. Slow but no new infrastructure. Bad for training rung 3+ but works for eval.

### Path C — Stop, ship rung 1 v2 as the best multi-map agent we have
Document the rung 1 result, ship the brain as a baseline agent. Multi-map win on fortress/serpentine/crossroads is genuinely a result; the rung-1-doesn't-beat-PPO-v4-on-plains finding is also informative. Reframe the project's deliverable.

## My recommendation

Path A. The cheap-clone work is 1-2 days but it's the foundation for everything else (rung 2, eventually rungs 3-4 if needed). Path B is a stopgap. Path C abandons the goal we've been chasing.

But Path A is your call — it's serious engineering scope.

## Files to read in the morning

- Latest git log (newest 10 commits cover the full overnight journey)
- `notes/rl/mcts-plan-v3.md` for the locked plan
- `notes/rl/rung1-eval.csv` for the measured results
- `notes/rl/rung1.5-spike-finding.md` for the resume spike result
- This file
