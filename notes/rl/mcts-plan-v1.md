# MCTS-Based Tower Defense AI — Design v1

## Why pivot from BC+PPO

Six BC→PPO iterations + architecture upgrade + multi-map data have failed to produce a generalizing agent. PPO v4 hit 35% on plains but 0% on crossroads (memorization). v2 architecture + random init was worse. The 5-critic synthesis identified PPO as the wrong tool for this problem: small sample budget, deterministic environment, search-friendly structure, sparse winning trajectories.

The user's insight (verbatim): "wouldn't it be best to build a tree based system where you can place a tower at posX and then have (roughly) (totalCells-placedCells) options for new tower positions next? likely all except a few could be filtered out because they're doing one of the following: a) Blocking the path, b) Quite far away from the currently placed towers, or c) a decision that led to an early death of the model."

This is exactly **AlphaZero-style MCTS with value-network guidance**. Search over decisions, evaluate trajectories, network learns value (and optionally prior probabilities) from search results.

## Core design

### 1. Environment as a search tree

A node in the tree = a `(match state, decision-tick)` pair. Children = legal actions at that state. At each node we maintain:
- `N(s, a)`: visit count for each child
- `W(s, a)`: total accumulated value of trajectories through that child
- `Q(s, a) = W(s, a) / N(s, a)`: mean value
- `P(s, a)`: prior probability (from policy network — initially uniform over legal actions if no learned prior)

UCB1 selection at a node: `argmax_a [Q(s, a) + c_puct × P(s, a) × √(Σ_b N(s, b)) / (1 + N(s, a))]`

### 2. Compute budget

Per-match decision budget: **K = 32 simulations**. Each simulation:
1. Selection: walk from root by UCB1 until reaching a leaf (typically 10-30 deep)
2. Expansion: add the leaf's children to the tree
3. Evaluation: use value network V(leaf_state) — OR roll out to match end with default policy
4. Backup: propagate value back up the path

Per match: ~50-100 placement decisions × 32 simulations = ~3200 sim steps per match. Cheaper than PPO's 16 matches/iter × 100 decisions/match × 4 epochs of 128-minibatch gradient = 50k+ gradient steps per iter.

### 3. Network role: value-only, no policy head

**Critical departure from AlphaZero**: we drop the policy head. Reasons:
- Our action space (9361 actions) is too large for the policy head to learn from sparse self-play
- The maze-optimizer already encodes the search-derived prior offline (`scripts/maze-optimizer.mjs`)
- Action selection at each MCTS node uses UCB1 + the maze-optimizer's W\* prior, not a learned policy

The network is V(state) → scalar in [-1, 1]. Trained via self-play to predict match outcome from each visited state.

### 4. Training loop

Each iteration:
1. **Generate self-play games**: K_games matches, each played by MCTS using current value network V_θ. Save every (state, action_taken, eventual_outcome) tuple.
2. **Train V_θ**: regression toward outcome. Loss = MSE(V_θ(s), outcome).
3. Repeat.

No PPO. No advantage. No clipping. No KL. No entropy regularization. No reward shaping. Just: "given this state, did the match end in a win?"

### 5. State representation

Same as v2 architecture's obs: 14-channel grid + 25 globals. The v2 network's encoder (CoordConv + pos embed + FiLM + dilated convs) → 64-d feature vector after pool. Linear → V scalar.

Total params: ~140k (slightly smaller — no policy head, no scalar trunk for skip).

### 6. Per-decision action filtering (your three criteria)

At each MCTS node:
- **(a) Blocking path**: legal-action filter from `Grid.canPlaceTower` + path-existence check (placing this tower must leave SOME path from entry to exit). Implemented at expansion time — children that block all paths are not added.
- **(b) Locality**: only consider cells within Chebyshev distance K of either (i) existing towers, (ii) creep path cells, or (iii) entry/exit. K=4. Cells outside this radius are pruned at expansion.
- **(c) Outcome-based**: this happens naturally via UCB1 + value backup. Cells whose subtree consistently leads to losses get low Q values and stop being expanded. This is the AlphaZero magic — pruning emerges from the search, not from hand-coded rules.

### 7. Multi-map handling

The value network has been forced (via Stage 4 architecture work) to encode position via CoordConv + pos embed. Multi-map self-play matches will train it to encode "maze concept" not "specific cell coords" — each map's terrain looks structurally different to the network, but the value targets (win/loss) are consistent.

Self-play matches rotate maps per game (same as BC v7's rotation: plains, crossroads, fortress, serpentine). Held-out: gauntlet.

### 8. Action-type handling

The action space has 9361 entries. At a given state, the legal mask reduces this to ~50-200 actions. Of those:
- ~30-150 `place` actions (8 tower types × cells with affordable + buildable)
- ~10-50 `upgrade` actions (existing towers)
- ~10-50 `sell` actions (existing towers — rare in our problem)
- 1 `skip`

MCTS expansion considers all legal children. Locality pruning typically reduces to ~10-30 candidates per node.

### 9. Non-determinism

The game has RNG (wave order, creep spawn timing). MCTS works on the deterministic state-action transition where applicable — for branching on stochastic outcomes, we use the random seed of the rollout and treat creep RNG as part of the state. Since same (state, seed, action) → same next state, the tree is deterministic given the seed.

For self-play training, we vary seeds across games to give the network diverse outcomes for the same opening positions.

### 10. Comparison to W* offline optimizer

The maze-optimizer (`scripts/maze-optimizer.mjs`) is essentially a greedy MCTS without value learning:
- Selects cells one-at-a-time by greedy path-length gain
- No tree backup, no exploration
- Result: a single static W\* solution per map

This MCTS plan is the **trained, online** version of the same idea. Self-play replaces greedy with UCB1; value network replaces "path-length gain" with "actual outcome of trajectories through this cell".

We can warm-start the value network by training V to predict outcomes from the W\* sequences — gives it a non-random prior before MCTS self-play begins.

## Concrete file structure

```
ml/networks/value_net.py        — V-only network (drops policy head from v2)
ml/train_mcts.py                — self-play loop + V training
src/systems/bots/mcts/
  MCTSBrain.ts                   — TS brain wrapping the value net + UCB search
  MCTSTree.ts                    — node + UCB selection + expansion + backup
  ActionMask.ts                  — locality + path-existence filters
scripts/generate-mcts-selfplay.mjs — N games, save (state, action, outcome) tuples
```

## Open design questions

1. **Tree caching across decisions in a match.** A single match has ~50-100 decisions. The MCTS tree from decision T can be reused as a subtree for decision T+1 (the actual move taken becomes the new root). This amortizes search cost. Worth implementing v1, or defer?

2. **Rollouts vs value-network-only leaf evaluation.** Pure AlphaZero uses V(leaf) directly, no rollout. Faster but requires good V. Early in training V is random — rollouts give better signal. Hybrid: rollout for first 5 iters, then switch to V-only?

3. **Per-decision compute budget K.** K=32 might be too low to escape mode collapse. K=128 is closer to AlphaZero-Go. Each simulation costs ~5ms (one A* recompute + value forward). K=128 × 100 decisions = 50 sec/match. Affordable per match, but K_games × 50s gets expensive.

4. **Value network warmup data.** Should V be pre-trained on:
   - The existing BC v7 dataset (just the outcomes — discard actions)?
   - Synthetic data from W\* trajectories?
   - Just random init and self-play?

5. **Network input — should we add tree-state features?** AlphaGo includes "what move number am I" as an input. We have wave/decision-tick as part of globals already. Probably enough.

6. **Reward signal**. Pure +1/−1 at terminal? Or +1/−1 + wave-based bonus to give intermediate signal? Pure-terminal is cleaner but training may be slower.

## Risk register

- **Compute**: K=32 × 50 decisions/match × 16 games/iter × 50 iters = 1.3M simulations per training run. Each simulation does an A* recompute (~0.1ms) + value forward (~0.5ms). Estimated 10-15 min per iter. Better than PPO's ~2 min/iter at much higher quality? Or much worse? Unknown until measured.
- **V learning**: From sparse +1/−1 terminal signals, V learning may be slow (needs many games to disambiguate "this state was good"). Architecture critic flagged value head as undertrained in PPO — MCTS makes V even more critical.
- **Branching factor**: 30-150 legal actions per node × tree depth ~10 = 10^14 states. Even with UCB, the tree never explores most of the space. Pruning (b) and (c) are essential.
- **Stochastic environment**: creep RNG could blow up search if same (state, action) yields different rewards. We fix the seed per match but the tree could still be noisy.

## What to validate (before scaling)

After 5 self-play iterations:
1. V loss decreasing on validation set
2. Wins on plains ≥ 30% (matches v4)
3. Wins on held-out gauntlet ≥ 10% (proof of generalization)
4. Render mazes — they should look more corridor-y than the PPO v4 "parallel lines"

If all 4 pass: scale up. If any fail: critique, redesign.
