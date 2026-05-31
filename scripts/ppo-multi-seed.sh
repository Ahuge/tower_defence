#!/bin/bash
# Stage 1.2 — measure PPO seed variance.
#
# Run PPO from bc-optimizer-v4.pt N times with different RNG seeds,
# identical hyperparameters otherwise. Measure final win-rate
# variance to determine if cross-version comparisons are signal or
# noise.
#
# Cost: N × 60 iters × ~2 min/iter = ~2h per seed = ~10h for N=5.
# Run sequentially to avoid disk thrash from 5 concurrent
# rollout-gen processes.
#
# Usage:
#   scripts/ppo-multi-seed.sh
#
# Output:
#   models/ppo-multi-seed-s<N>.{onnx,pt,meta.json}

set -euo pipefail
cd "$(dirname "$0")/.."

source ml/.venv/bin/activate

# Seeds chosen as widely-spaced primes so the per-iter rollout
# seed cascades (seed_base + iter_idx * 9973) don't collide.
SEEDS=(70000 71000 72000 73000 74000)

for seed in "${SEEDS[@]}"; do
  out="models/ppo-multi-seed-s${seed}"
  if [ -f "${out}.meta.json" ] && [ "$(jq -r '.iter' ${out}.meta.json)" = "59" ]; then
    echo "[multi-seed] s=${seed} already done, skipping"
    continue
  fi
  echo "===== [multi-seed] s=${seed} starting ====="
  python ml/train_ppo.py \
    --iters=60 \
    --matches-per-iter=16 \
    --factions=arcane \
    --difficulty=normal \
    --waves=50 \
    --mode=standard_long_scaled \
    --temperature=1.0 \
    --ent-coef=0.05 \
    --box-in-k=0.02 \
    --corridor-k=0.05 \
    --seed-base=${seed} \
    --init-from=models/bc-optimizer-v4.pt \
    --out-model=${out}.onnx \
    --out-pt=${out}.pt \
    --out-meta=${out}.meta.json \
    2>&1 | grep --line-buffered -E "^\[iter |DONE\." | tee /tmp/ppo-multi-s${seed}.log
  echo "===== [multi-seed] s=${seed} done ====="
done

echo
echo "=== All 5 PPO runs complete ==="
for seed in "${SEEDS[@]}"; do
  out="models/ppo-multi-seed-s${seed}"
  iter=$(jq -r '.iter' ${out}.meta.json 2>/dev/null || echo "?")
  r_mean=$(jq -r '.meanStepReward' ${out}.meta.json 2>/dev/null || echo "?")
  entropy=$(jq -r '.entropy' ${out}.meta.json 2>/dev/null || echo "?")
  echo "  s=${seed} iter=${iter} r_mean=${r_mean} entropy=${entropy}"
done
