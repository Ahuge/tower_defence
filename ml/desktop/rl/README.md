# RL prototype — Python side (arcane, PPO)

Python never runs the game. It reads trajectory JSONL from the TypeScript
episode runner (`run_episode.mts`, built by the parallel TS agent) and writes
policy weight JSON the TypeScript brain (`RLBrain`) loads.

## Shared contract

- **State (17 dims):** wave/20, gold/1000, lives/100, tower_count/100,
  counts of arcane_bolt/frost/storm/focus/drain/meteor/nova (/20),
  next-wave creep count/50, next-wave armored/flying/shielded (0/1),
  betweenWaves (0/1), candidate cells/936.
- **Actions (9):** build bolt/frost/storm/focus/drain/meteor/nova,
  save, upgrade cheapest.
- **Policy JSON:** `{"state_dim": 17, "hidden": [128, 64], "action_dim": 9,
  "layers": {"trunk1_w": ..., "trunk1_b": ..., "trunk2_w": ..., "trunk2_b": ...,
  "policy_w": ..., "policy_b": ..., "value_w": ..., "value_b": ...}}`
  Forward: h1 = relu(W1·x + b1); h2 = relu(W2·h1 + b2);
  logits = Wpi·h2 + bpi; value = Wv·h2 + bv. No dropout.
- **Trajectory JSONL:** one line per step —
  `{"episode": 0, "step": 3, "state": [...17...], "action": 2,
  "logprob": -1.23, "value": 0.45, "reward": 0.12,
  "mask": [1,1,1,1,1,1,1,1,1], "done": false}`

## Files

- `env.py` — constants, reward-term docs, `load_trajectories`,
  `compute_gae`, `collect_trajectories` (subprocess wrapper for the runner).
- `policy.py` — `ActorCritic` (17→128→64, policy head →9, value head →1),
  `export_json` / `load_json`, `init_from_scorer` (transfers the scorer's
  128→64 trunk layer and 64→1 output layer; skips the 11→17 shape mismatch).
- `train_ppo.py` — PPO loop + `--pretrain` behavior cloning from
  `ml/placement-data.jsonl` (arcane examples only).
- `eval_rl.py` — fixed-seed eval (seeds 100..2500 step 100, first N)
  vs the imitation baseline (20/50 hard).

## Usage

```bash
# Behavior-cloning warm start + PPO (50 iters x 32 episodes)
python ml/desktop/train_ppo.py --pretrain \
    --init-from-scorer ml/desktop/models/scorer-arcane.pt \
    --policy-out ml/desktop/rl/policy-arcane.json

# Resume from a checkpoint
python ml/desktop/train_ppo.py --resume ml/desktop/rl/checkpoints/ppo-arcane-iter5.pt --iters 20

# Evaluate a policy on 50 fixed seeds, deterministic
python ml/desktop/eval_rl.py --policy ml/desktop/rl/policy-arcane.json \
    --episodes 50 --deterministic --out ml/desktop/rl/eval-arcane.json
```

Notes:

- The TS runner must accept the flags used here: `--policy --episodes
  --difficulty --out --summary` (training) plus `--deterministic --seeds
  <comma-separated>` (eval).
- The scorer checkpoint `ml/desktop/models/scorer-arcane.pt` is not in this
  VM (models live on Alex's desktop); `--init-from-scorer` is optional.
- BC data is thin: only 49 arcane examples in `ml/placement-data.jsonl`,
  and they carry no gold/lives (defaults 1000/100 are used).
- No tick-by-tick `env.step()` from Python: the game loop lives in
  TypeScript and is driven at episode granularity. See `env.py`.
```

## Verification

```bash
python3 -m py_compile ml/desktop/rl/*.py
python3 ml/desktop/rl/test_rl.py   # numpy-only GAE + BC-state checks
```
