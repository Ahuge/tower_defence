# Q-Network proposal: action-conditioned ranking for beam search

## Why we're here

- Rung 1 (online maze-optimizer, hand-engineered greedy): 0% plains
- Rung 2 (beam search + 3-wave forward-sim): 35% plains (matches PPO v4)
- Rung 3 (beam + V-network): worse on every map. V predicts -0.998 for every plains candidate — discrimination below noise floor
- Rung 2 tuning (type variety + width=20): 27% plains (worse than untuned baseline)

The 35% on plains appears to be a real ceiling for hand-engineered + V-only scoring on this map. Plains is open-topology with single entry/exit; A* routes around any individual wall, so the discrimination signal between candidate placements is fundamentally small.

## The Q-network proposition

**Q(state, action) → expected outcome of taking that action.**

Unlike V which scores STATES (and we've shown can't distinguish placements when states are nearly identical), Q learns explicitly action-conditioned: "given THIS state, taking THIS action leads to outcome X."

For our problem:
- state = grid + globals (the obs tensor we already have)
- action = (cell, tower_type) pair
- target = match outcome (+1 win, -1 loss) of trajectories that took this action at this state

## Architecture

### Network shape

Two reasonable architectures, pick one:

**Option A: Dueling Q-network (action as second input)**
```
encoder = v2 encoder (CoordConv + positional + FiLM + dilated convs)  → 64-d state feat
action_embed = Embedding(8 tower types, 16-d)                          → 16-d type feat
cell_pos = (col/COLS, row/ROWS, distance-to-path)                      → 3-d cell feat
combined = concat(state_feat, action_embed, cell_feat)                 → 83-d
Q = MLP(83 → 64 → 32 → 1)                                              → scalar Q value
```
Param count: ~170k (encoder) + ~10k (Q head) ≈ 180k.

Pro: action can be any (cell, type) — no per-cell head.
Con: needs forward pass per candidate (50-200 calls per decision).

**Option B: Spatial Q-network (per-cell heads, like PPO policy)**
```
encoder = v2 encoder → [64, 26, 36]
q_head = Conv2d(64 → 10) → [10, 26, 36]   # 10 channels = 8 place + upgrade + sell
```
Single forward pass produces Q for EVERY (cell, action) at once.

Pro: one forward pass per decision (massive speedup vs Option A).
Con: 9360 outputs in single tensor — harder to train than dueling head.

**Recommended: Option B** for compute reasons. Closer to AlphaZero's policy head architecture (which we already built in PPOPolicyNet).

### Training data requirements

Q needs (state, action_taken, outcome) tuples. We have these from the V-net data gen — same format, same source data. Just relabel the targets.

But — there's a subtlety. The V data is `(state, outcome)` regardless of action. For Q, we need to know WHICH action was taken at each state. The data gen pipeline already records this (each brain decides → records action → continues). I just need to MODIFY gen-vnet-selfplay to also record the action.

Estimated data needs: same scale as V (24k rows works for V, should work for Q too). If Q is harder to train than V, may need more.

### Loss function

Standard:
```
loss = MSE(Q(s, a_taken), outcome)
```

Where outcome = match's eventual win/loss (+1/-1). Same MC target as V, just per-action.

### Training tricks (to handle Q's harder learning)

1. **Replay buffer**: keep last N iters of data, sample uniformly. Prevents overfitting to the current iter's data.
2. **Target network**: freeze a copy of Q for use during scoring, update slowly. Stabilizes training.
3. **Double Q**: train two Q networks, use min(Q1, Q2) for action selection to reduce overestimation bias.

Skip 2-3 for v1 — start simple, add if Q training is unstable.

### Inference / beam scoring

Per between-wave decision:
1. Snapshot match.
2. Build obs tensor.
3. ONE forward pass: `q_grid, q_skip, q_upgrade, q_sell = Q(obs)` → [10, 26, 36] + scalar
4. Mask illegal actions (via legalMask).
5. Pick the action with highest Q over the masked actions.

This is MUCH faster than rung 2's 3-wave forward-sim approach. Single ONNX forward (~1ms) vs 3-wave sim (~3-5s). Means ~3000-5000x speedup per decision.

With that speedup, we can afford to use Q DIRECTLY (no beam search at all) — Q itself becomes the policy.

## Step-by-step plan

### Step 1: Extend data gen to record actions

Modify `scripts/gen-vnet-selfplay.mjs`:
- For each between-wave decision, also record the action the brain took (cell + tower type + kind)
- Encode action as action_idx using the existing ActionSpace encoding (so it slots into a 9361-d output)

~30 min code.

### Step 2: Define Q architecture

Build `ml/networks/q_net.py` based on PPOPolicyNet:
- Same v2 encoder
- Output: spatial_logits [10, 26, 36] + skip_logit (these become Q values directly)
- Total params ≈ 172k (same as PPOPolicyNet)

~30 min code.

### Step 3: Train

`ml/train_qnet.py`:
- Load self-play tuples (obs, action_idx, outcome)
- Loss: MSE(Q[action_idx], outcome) for the taken action only
- Other Q values get masked (no signal for actions not taken)
- ~30 epochs, ~30 min training

~1h to write + train.

### Step 4: Inference brain

`src/systems/bots/brains/QPolicyBrain.ts`:
- Loads Q ONNX model
- At each between-wave decision: forward Q, apply legal mask, argmax
- Optional: temperature sampling for exploration during data gen iteration

~1-2h code.

### Step 5: Eval + iterate

- Run eval at n=100 across 5 maps
- If Q matches/beats rung 2 (35% plains, 23% gauntlet): SHIP
- If Q underperforms: investigate (likely needs better data — generate more self-play from Q itself, retrain, repeat)

Each iteration: ~3-5h (data gen + retrain + eval).

## Compute total

| step | wall time |
|---|---|
| 1: data gen extension + gen 5000 matches | ~3h (most reused from V-net) |
| 2: Q architecture | trivial |
| 3: Q training | ~30 min |
| 4: brain integration | ~1-2h |
| 5: first eval | ~3-5h |
| iteration buffer (1-2 cycles) | ~10-15h |
| **total** | **~20-25h** |

## My confidence

**40%** Q matches rung 2's 35% plains. (Same data limitation as V.)

**30%** Q significantly beats rung 2 (≥50% plains). Would require the dataset to actually have the discriminative signal Q needs.

**20%** Q reaches 60%+ plains via iteration (Q → better self-play → better Q).

**10%** Q catastrophically fails (predicts uniformly across actions like V did, but worse).

The killer concern: **the training data is bound by the brains used to generate it**. Beam-d2-w5 hit 48% on plains in data gen. Q can plausibly learn to match that ceiling but not exceed it without iterative self-play (each iteration's Q generates new data for the next iteration's Q).

## Alternative: AlphaZero-style policy + value head

If we're going to invest in Q, consider going one step further:
- Policy head π(a|s) trained on MCTS visit counts (or beam choices)
- Value head V(s) trained on outcomes
- MCTS lookahead at decision time using both heads

This is the full AlphaZero loop. Substantially more complex (need MCTS infrastructure, self-play coordinator, replay buffer with priorities). ~3-5 days vs Q's 2-3 days.

But would have much higher ceiling. I'd not recommend unless rung 4 (full MCTS) is the explicit goal.

## My recommendation

If we go the Q route: **commit to it as a 2-3 day project**, not a hopeful afternoon. Q-learning has more knobs than V-learning and needs more iteration. The data gen + training + brain + eval cycle is ~5h, and getting it right will likely take 2-3 cycles.

Alternative: **ship rung 2 (untuned)** as the project deliverable. 35% plains matches PPO v4 with no learning, generalizes 23% to held-out maps. That's a complete, defensible result.

The choice is "modest certain progress (ship)" vs "uncertain bigger swing (Q)".
