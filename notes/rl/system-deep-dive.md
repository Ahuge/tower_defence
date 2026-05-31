# RL System Deep Dive (for ML engineer critique)

## Goal & current state

Self-play PPO for an asymmetric tower defense game. Faction = Arcane, map = Plains (36×26 grid). Train an agent to BUILD MAZES that channel creeps through dense corridors. Win rate measured at temperature=0 over 20 matches.

**The recurring failure mode (across 6 iterations):**
1. Within a version, different seeds produce visually near-identical mazes (mode collapse at the policy)
2. Across versions, we keep getting "different strategies that all converge poorly" rather than monotonic improvement in maze quality or win rate

| version | BC top1 | BC classes | wins T=0 w25 | avg wave | qualitative |
|---|---|---|---|---|---|
| v3 (bound30 chebyshev) | 33% | 196 | 5% | 23.8 | one template, all `tower_0` |
| v4 (unbounded chebyshev) | 43% | **555** | **50%** | 24.8 | one template, parallel horizontal lines |
| v5 (bound30 + flip-v) | 51% | 340 | 0% | 20.9 | bimodal placements, towers placed out-of-order, lost early |
| v6 (bound30 + flip-v + progressive) | 65% | 345 | 0% | 22.0 | same family as v5 |

## Pipeline architecture

```
                ┌──────────────────────────────────────┐
                │  rule-brain rotation (5 brains):     │
                │  balanced, ultimate, synergy,        │
                │  nature, aoe_focus                   │
                └─────────────┬────────────────────────┘
                              ↓ wrapped in
                ┌──────────────────────────────────────┐
                │  OptimizerBrain (TS, src/.../OptimizerBrain.ts)
                │  - W* = pre-computed maze (offline   │
                │    A*-based optimizer)               │
                │  - Per-match seeded RNG              │
                │  - Picks W* cell (chebyshev or       │
                │    progressive-gain), top-K=5        │
                │  - Picks random affordable tower     │
                │    type (above 3x cheapest budget)   │
                │  - Wave-gated to between-wave only   │
                │  - Per-match W* transformations:     │
                │    identity, flip-v, shift-up/down   │
                └─────────────┬────────────────────────┘
                              ↓ wrapped in
                ┌──────────────────────────────────────┐
                │  ObsRecorderBrain                    │
                │  - Encodes (obs, action) pairs       │
                │  - Drops illegal-under-mask          │
                │  - Drops send/frontier/frontierManage│
                └─────────────┬────────────────────────┘
                              ↓ writes JSONL.gz
                  rollouts/bc/<run>/<faction>/match_*.jsonl.gz
                              ↓
                ┌──────────────────────────────────────┐
                │  BC training (ml/train_bc.py)        │
                │  20 epochs, masked CE, ent_coef=0.1  │
                └─────────────┬────────────────────────┘
                              ↓
                  bc-<run>.pt + .onnx + .meta.json
                              ↓
                ┌──────────────────────────────────────┐
                │  PPO continuation (ml/train_ppo.py)  │
                │  60 iters × 16 matches × 50 waves    │
                │  T=1.0, ent_coef=0.05, clip=0.2      │
                │  GAE γ=0.995 λ=0.95                  │
                └──────────────────────────────────────┘
```

## Observation space (schema v1.1)

```
grid    Float32 [14, 26, 36]   (channel-major)
  ch 0..7   tower-by-slot occupancy
  ch 8      path cell (creeps walk here)
  ch 9      buildable-empty
  ch 10     blocked unwalkable
  ch 11     NoBuild (walkable but unbuildable)
  ch 12     entry or exit
  ch 13     creep density (count/8, clipped [0,1])
globals Float32 [25]
  0: gold/2000
  1: lives/STARTING_LIVES
  2: wave/60
  3: between_waves (0/1)
  4: sim_time/(15*60s)
  5..6: faction one-hot (arcane, mechanical)
  7..24: upcoming 3 waves × 6 features (armor counts, boss, hp scale)
mask    Uint8  [9361]   legal-action mask
```

## Action space

Flat 9361-dim. Layout:
- `[0..7487]`   `place(slot 0..7, cell 0..935)` → 8 × 936 = 7488
- `[7488..8423]` `upgrade(cell)` → 936
- `[8424..9359]` `sell(cell)` → 936
- `9360` skip

`slot 0..7` map to the 7 faction towers cost-sorted ASC. Arcane: bolt(25), frost(35), storm(55), focus(90), drain(120), meteor(200), nova(700).

Note: `arcane_conduit` (wall tower) is NOT in the vocab — actions involving it get dropped by recorder.

## Policy network (ml/networks/policy.py)

```
Input: grid [N, 14, 26, 36] + globals [N, 25]
       ↓ (globals tiled inside model, concat → [N, 39, 26, 36])
Conv2d(39→32, 3×3, pad=1) + ReLU
       ↓
Conv2d(32→64, 3×3, pad=1) + ReLU
       ↓
Conv2d(64→64, 3×3, pad=1) + ReLU  →  [N, 64, 26, 36]
       ↓
       ├──→ Conv2d(64→10, 1×1)          → spatial_logits [N, 10, 26, 36]
       │    (channels 0..7=place per slot, 8=upgrade, 9=sell)
       ↓
       AdaptiveAvgPool2d(1) → flatten   → [N, 64]
       ↓
       Linear(64→32) + ReLU
       ↓
       ├──→ Linear(32→1) → skip_logit
       └──→ Linear(32→1) → value
```

**Total params: ~69,484.** Receptive field = 7×7 (3 stacked 3×3 convs). Very small relative to the 26×36 grid.

## PPO loss (ml/train_ppo.py)

Standard PPO with GAE. `loss = policy_loss + vf_coef × value_loss − ent_coef × entropy`.
- `clip_coef = 0.2`
- `vf_coef = 0.5`
- `ent_coef = 0.05` (raised from default 0.01)
- `ppo_epochs = 4`
- `minibatch_size = 128`
- `lr = 3e-4`
- `gamma = 0.995`, `lam = 0.95`
- `grad_norm_clip = 0.5`
- Advantage normalized per-batch
- `temperature = 1.0` during rollouts (model logits scaled before sampling)

## Reward shaping (per-decision attribution, one-step-late)

Each row's reward is a sum of:
- `perDecisionTickPenalty = -0.0001` (always)
- `perWaveBonus = +0.1` per new wave cleared
- `winBonus = +1.0` / `lossPenalty = -1.0` on terminal step
- `lengthCoverageProductK = 0.0005` × Δ(path_length × tower-path-cell-pair-count)
- `turnsRewardK = 0.05` × Δ(direction-changes in path)
- `boxInRewardK = 0.02` × Δ(sum over path cells of wall-neighbor-count)
- `corridorRewardK = 0.05` × Δ(sum over path cells of opposing-pair-walls)
- `optimizerOverlapK = 0.05` × placements-on-W* (only when caller wires up)

Linear `mazePerCell` and `coveragePerUnit` rewards were retired earlier in favor of multiplicative L×C.

## OptimizerBrain (teacher)

The BC teacher. Wraps a base rule-brain.

```
on decide(ctx):
  if !between_waves: return inner.decide()
  inner_decision = inner.decide()
  target = pickTarget(ctx)   // top-K closest unbuilt W* cell, or top-K by path-gain
  
  if inner_decision.kind == 'place' and target exists:
    return { place, col=target.col, row=target.row, type=inner_decision.type }
  
  if budget >= 3 × cheapest_tower_cost and target exists:
    type = rng.pick(affordable_towers)
    return { place, col=target.col, row=target.row, type }
  
  return inner_decision  // pass through
```

Per-match seeded XorShift32 drives:
- top-K cell selection (K=5)
- random tower-type from affordable pool

Per-match transformations rotate W* across `identity` and `flip-v` (reflect across midrow).

## What we've actually tried

**v1 (single brain, single W*):** 100% match same maze, all `tower_0`.

**v2 (top-K random cell + per-match seed):** Same maze structure across matches.

**v3 (multi-brain rotation, 5 brains):** Introduced type variety in DATA (bolt 46%, storm 31%, etc.). PPO converged to single template, 5% wins, all `tower_0` at inference.

**v4 (unbounded W* teacher):** 555 distinct classes in BC. PPO refined to **50% wins** at T=0 w25. Critical observation: at T=0/0.3/0.7/1.0 the maze stays the same template; higher T just produces sparser versions.

**v5 (bound30 + flip-v reflection):** Bimodal placement in BC (rows 5 + 18). Win rate crashed to 0%. User confirmed: "comprehensive maze BUT placed out of order, certain towers placed for later but not contributing yet".

**v6 (bound30 + flip-v + progressive picking):** BC top1 jumped to 65% (most consistent). Win rate still 0%. Renders show same family as v5.

**Diagnostic finding:** the bound30 W* itself has only 18/76 corridor cells (24%) — the "teacher" wasn't very corridor-y. Unbounded W* is 260/460 = 57%. PNG renders confirmed this.

## What the user actually wants

Mazes that look like (from their notes):
```
□□□□......
...□......
.□.□......
S□.□.....E
□□.□......
...□......
.□□□......
```
i.e. **tight corridors with walls on opposing sides** forcing the creep into a forced sequence of direction changes (↑↑→→↓↓↓↓←←↓↓ before any freedom).

**What the agent produces:** "two parallel horizontal lines with 3-6 squares of up/down areas" — sparse, mostly open path with a few bumps.

## Specific concerns to evaluate

1. **Network capacity (70k params)**: Can this representation hold MULTIPLE distinct strategies, or does it only have room for ONE peaked policy? Should we go to 200k–500k?

2. **Action space (skip-dominated)**: 32% of all recorded actions are `skip` (action 9360). The legal mask blocks place during waves, so skip dominates. Is the BC policy actually learning to act, or learning to skip with occasional bursts?

3. **Receptive field (7×7)**: A maze is a long-range structure. The convnet sees only local 7×7 windows. Is there enough effective range for "build the OTHER end of the corridor"?

4. **Reward shaping interactions**: 5+ shaping rewards stacked (L×C, turns, box-in, corridor, optimizer-overlap when on, plus wave bonus, win/loss). Are they pulling in conflicting directions? Are any reward-hacking opportunities?

5. **Teacher distribution shift**: BC clones from heuristic brains + W* overrides. The PPO rollouts are then SELF-PLAYED by the BC policy. The state distribution shifts hard. Is there meaningful gap?

6. **GAE / value learning**: We use `gamma=0.995` over 50-wave matches with rewards mostly clustered at termination (+/−1). Is the value function actually learning meaningful credit assignment, or just predicting the wave-bonus average?

7. **Entropy regularization**: We use `ent_coef=0.05` in PPO + `ent_coef=0.1` in BC. Is this enough? Too much? Inconsistent?

8. **PPO with 16 matches/iter, 60 iters**: ~1000 trajectories total. Is this enough samples to escape local optima? Or are we converging on the first basin?

9. **The "OptimizerBrain forces placements" idea**: We're cloning an adversarially-designed-by-us policy. Is this fundamentally limited compared to e.g. multi-agent self-play or evolutionary methods?

10. **Single-faction single-map**: We train only on Arcane/Plains. Plains has lakes (blocked cells) but mostly open. Could lack of map variety be locking us into one template?

## Files for reference

- `src/systems/bots/learning/PPORecorderBrain.ts` — reward + recording
- `src/systems/bots/learning/ObsTensor.ts` — observation encoding
- `src/systems/bots/learning/ActionSpace.ts` — action encoding
- `src/systems/bots/brains/OptimizerBrain.ts` — teacher
- `ml/networks/policy.py` — network
- `ml/train_bc.py` — BC trainer
- `ml/train_ppo.py` — PPO trainer
- `scripts/generate-bc-rollouts.mjs` — BC data gen
- `scripts/generate-ppo-rollouts.mjs` — PPO rollout gen
- `notes/rl/action-and-observation-spec.md` — schema spec
