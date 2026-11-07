# RL Prototype — PPO for Tower Defence (arcane)

Reinforcement learning that can eventually surpass imitation learning.
Start narrow (arcane only), prove the pipeline, then expand.

## Why RL, why arcane

Imitation learning hit its ceiling in eval-v7: better data + cleaner
features = worse results (85/550, psionic 13→0). The model can only copy
what Alex has done. RL learns from its own wins and losses and can
discover strategies nobody has tried.

Arcane is the first faction because it already wins 20/50 with the
imitation model — the faction is learnable, there's a working baseline
to beat, and improvement is measurable. Void at 0% would force RL to
discover everything from scratch with no way to tell a broken setup
from a hard faction.

## Architecture — two-stage

```
┌─────────────────────────────────────────────────────────┐
│  RL policy (WHAT)          Imitation scorer (WHERE)    │
│  17-dim state → 9 actions  cell → score                 │
│  "build frost"             "put it at (5, 12)"          │
└─────────────────────────────────────────────────────────┘
```

The RL policy decides **what** to do (which tower to build, when to
save, when to upgrade). The existing imitation placement scorer decides
**where** to put it. This reuses what works (the scorer knows Alex's
placement patterns) and lets RL focus on strategy — the part imitation
can't learn.

```
                    ┌──────────────┐
                    │ train_ppo.py │  Python (PyTorch)
                    │  PPO update  │
                    └──────┬───────┘
                           │ policy JSON
                           ▼
┌──────────────────────────────────────────────────────┐
│ run_episode.mts → runMatch → RLBrain.decide()        │  TypeScript
│  - extracts 17-dim state                             │
│  - runs policy forward pass                          │
│  - applies action mask, samples action               │
│  - places via LearnedScorer / saves / upgrades       │
│  - records (state, action, logprob, value, reward)   │
└──────────────────────────────────────────────────────┘
                           │ trajectories JSONL
                           ▼
                    ┌──────────────┐
                    │ train_ppo.py │  GAE → PPO update → new policy
                    └──────────────┘
```

## State (17 dims)

| # | Feature | Notes |
|---|---------|-------|
| 0 | wave / 20 | |
| 1 | gold / 1000 | |
| 2 | lives / 100 | |
| 3 | tower_count / 100 | |
| 4–10 | count per arcane tower / 20 | bolt, frost, storm, focus, drain, meteor, nova |
| 11 | next wave creep count / 50 | from ctx.upcomingWaves[0] |
| 12 | next wave has armored 0/1 | |
| 13 | next wave has flying 0/1 | |
| 14 | next wave has shielded 0/1 | |
| 15 | betweenWaves 0/1 | |
| 16 | candidate cells / 936 | |

All values clamped to [0, 1]. The canonical order is defined in
`env.py` (`STATE_NAMES`) and mirrored in `RLBrain.ts` — they must stay
in sync.

## Action space (9 actions)

| # | Action |
|---|--------|
| 0–6 | build arcane_bolt / frost / storm / focus / drain / meteor / nova |
| 7 | save (skip — ends the decision round, starts the next wave) |
| 8 | upgrade cheapest upgradable tower |

**Action masking:** build actions are valid only if affordable;
upgrade only if an upgradable affordable tower exists; save is always
valid. The mask is applied to logits (invalid → −1e9) before softmax,
both in the TS brain (when acting) and in Python (when recomputing
logprobs for the PPO loss). The mask is recorded in every trajectory
step.

**Send is excluded.** Standard mode has no send target
(`HeadlessMatch` returns false for sends), so including it would teach
the agent a no-op action.

## Policy network

```
17 → 128 (ReLU) → 64 (ReLU) → policy head → 9 logits (softmax)
                              → value head  → 1 (state value)
```

No dropout (PPO policies typically don't use it). ~11k parameters.

**Pre-training — two warm starts, both optional:**
1. **Behavior cloning** (`--pretrain`): trains the policy head with
   cross-entropy on arcane examples from `ml/placement-data.jsonl`
   (state reconstructed from board/wave/gold/lives, action = tower
   built). Teaches "build what Alex builds". Currently thin — only 49
   arcane examples, mostly bolt — so it teaches little beyond "build
   bolt". Still worth keeping as a warm start.
2. **Scorer weight transfer** (`--init-from-scorer`): copies the
   imitation scorer's 128→64 trunk layer and 64→1 output layer into
   the RL network (same shapes). The 17→128 first layer can't transfer
   (scorer is 11-dim input) and the 64→9 policy head is random.

## Reward function

Shaped (dense) reward, not just win/loss — sparse rewards make early
training nearly impossible when the agent dies at wave 3.

| Term | Value | Why |
|------|-------|-----|
| Wave cleared | +0.1 per wave | Surviving longer is the primary goal |
| Gold gained | +0.002 per gold, capped at +0.2/step | Economy matters; dense signal for kills + income |
| Life lost | −0.5 per life | Leaks are costly; the dominant negative signal early |
| Win | +1.0 terminal | The actual objective |
| Loss | −1.0 terminal | |

**Gold is delta-based and floored at 0.** Only gold *gains* are
rewarded — spending gold is NOT punished (an earlier version
punished spending, which taught the agent to never build anything).

**Pending rewards.** The reward for a "save" action (which launches
the next wave) is only known once that wave resolves. The brain
records each step with reward 0 and patches it at the next
between-waves `decide()` from wave/gold/lives deltas. The terminal
+1/−1 is applied by the runner to the last step.

**Known issue:** early-training rewards run strongly negative
(−8 to −9 per episode) because a random policy loses ~15 lives
(−7.5) plus the terminal −1. This is expected — the value function
starts near 0 and has to learn the negative baseline. It should
improve as the policy learns to survive longer.

## PPO hyperparameters

| Param | Value |
|-------|-------|
| Learning rate | 3e-4 (AdamW) |
| Clip ratio | 0.2 |
| Gamma (discount) | 0.99 |
| GAE lambda | 0.95 |
| PPO epochs per update | 4 |
| Minibatch size | 64 |
| Entropy coefficient | 0.01 |
| Value loss coefficient | 0.5 |
| Grad clip norm | 1.0 |

## Files

| File | What |
|------|------|
| `src/systems/bots/brains/RLBrain.ts` | BotBrain: state extraction, policy forward, masking, trajectory recording, lazy rewards |
| `ml/desktop/rl/run_episode.mts` | Episode runner: plays N matches, writes trajectories + summary |
| `ml/desktop/rl/policy.py` | ActorCritic, export/load JSON, scorer weight transfer |
| `ml/desktop/rl/env.py` | Constants, reward docs, trajectory loading, GAE, subprocess wrapper |
| `ml/desktop/rl/train_ppo.py` | PPO loop + BC pre-training |
| `ml/desktop/rl/eval_rl.py` | Fixed-seed eval vs the 20/50 imitation baseline |
| `ml/desktop/rl/test_rl.py` | Verification tests (GAE, masking, BC state) |

## Usage

```bash
# Behavior-cloning warm start + PPO (50 iters × 32 episodes)
# Needs a CUDA torch install on the training machine.
python ml/desktop/rl/train_ppo.py --pretrain \
    --init-from-scorer ml/desktop/models/scorer-arcane.pt \
    --policy-out ml/desktop/rl/policy-arcane.json

# Resume from a checkpoint
python ml/desktop/rl/train_ppo.py \
    --resume ml/desktop/rl/checkpoints/ppo-arcane-iter5.pt --iters 20

# Evaluate a policy on 50 fixed seeds, deterministic
python ml/desktop/rl/eval_rl.py --policy ml/desktop/rl/policy-arcane.json \
    --episodes 50 --deterministic --out ml/desktop/rl/eval-arcane.json
```

**Timing estimate:** each headless match takes ~1–5s. 32 episodes per
iteration ≈ 1–3 min. 50 iterations ≈ 1–3 hours on a desktop. The
bottleneck is game simulation, not the PPO update.

**Torch:** this VM has CPU torch 2.15 in `~/.venvs/rl-torch` (for
verification only — too slow for real training). Alex's desktop needs
a CUDA torch install for actual runs.

## Verification status (2026-11-06)

- TS side: `tsc` clean. Random-policy smoke test (2 episodes):
  0 wins, avg wave 9.0. Trajectory validation passed on 50 steps
  (17-dim states in [0,1], masks match affordability, logprobs
  correct, rewards recompute from deltas). Deterministic mode is
  byte-identical across runs with the same seeds.
- Python side: GAE verified against hand-computed examples. Policy
  forward shapes correct, masking zeroes invalid actions after
  softmax, export→load round trip exact. PPO update on a synthetic
  batch produces finite losses.
- **End-to-end:** 1-iteration PPO run completed (Python → TS runner →
  trajectories → PPO update → checkpoint). BC warm start + 2-episode
  deterministic eval ran (avg wave 8.0 vs 3.5 for random policy).
- Untested: multi-iteration training, `--resume`, full 50-episode
  eval, CUDA path, real scorer checkpoint transfer (models live on
  Alex's desktop).

## Known limitations

- **Episode granularity, not tick-level.** Python can't step the game
  tick-by-tick — it drives whole episodes via subprocess. A
  persistent Node process with a JSON-RPC interface would be faster
  (no per-episode Node startup) and would allow mid-wave decisions.
  Future optimization, not needed for the prototype.
- **Between-waves decisions only.** The brain returns skip mid-wave.
  Mid-wave upgrades (spending kill gold during combat) are a real
  part of play but not yet in the action space.
- **No placement learning.** The WHERE is fixed to the imitation
  scorer. If the scorer is wrong for a situation, RL can't fix it.
  A future version could let RL pick the cell too (much larger action
  space — needs a CNN board encoding).
- **Single map (plains), single difficulty default (hard).**
- **BC data is thin** (49 arcane examples) — the warm start is weak.
- **Reward shaping is a guess.** The +0.1/wave, −0.5/life weights
  were chosen by intuition, not tuned. If training stalls or the
  agent learns degenerate behavior (e.g. never spending gold, or
  spamming cheap towers), the reward function is the first thing to
  revisit.

## Next steps

1. **Run it.** Multi-iteration training on Alex's GPU. Watch whether
   win rate climbs above the 20/50 imitation baseline.
2. **Tune rewards** if the agent plateaus or learns degenerate
   behavior.
3. **Add mid-wave upgrade actions** (the brain already gets called
   mid-wave every 30 ticks).
4. **Expand to other factions** — same pipeline, different tower set.
   Void is the interesting test: 0% imitation baseline means any RL
   win is pure discovery.
5. **CNN board encoding** — replace the 17-dim hand-crafted state
   with a spatial board representation so the policy can see the maze.
6. **Persistent Node process** (JSON-RPC) for faster episode
   collection once the pipeline is proven.
