#!/bin/bash
# Train the v7 multi-map PPO recipe for several factions.
#
# The v7 recipe (94/95-dim state, decoupled_res, all 8 standard maps)
# was tuned on Arcane and is the default for every other fixed-roster
# faction. Each faction gets its own policy / checkpoint / trajectory
# paths and log, so runs never collide and can resume independently.
#
# Usage:
#   ./ml/desktop/rl/train-factions.sh [options] [faction ...]
#
# Options (environment variables):
#   ITERS=200        PPO iterations per faction
#   PARALLEL=2       factions trained concurrently
#   EPISODES=32      episodes collected per iteration
#   WORKERS=auto     episode-runner processes per faction (nproc/PARALLEL)
#   DEVICE=cuda      torch device
#   NODE_BIN=node    node binary used to build/eval the runner
#   BUILD_RUNNER=1   rebuild the esbuild runner bundle first
#   EVAL=1           run a deterministic 40-episode all-map eval afterwards
#   FORCE=0          retrain even when policy-<faction>-multimap.json exists
#
# With no faction arguments, trains every fixed-roster faction except
# arcane (which already has policy-v7-arcane-multimap.json).
#
# Examples:
#   ./ml/desktop/rl/train-factions.sh mechanical nature
#   ITERS=120 PARALLEL=3 ./ml/desktop/rl/train-factions.sh
#   DEVICE=cpu ITERS=5 ./ml/desktop/rl/train-factions.sh void --dry-run
#
# Logs land in ml/desktop/rl/train-<faction>-multimap.log and policies in
# ml/desktop/rl/policy-<faction>-multimap.json. The script returns a
# non-zero status if any faction failed.

set -u
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT" || exit 1

ITERS="${ITERS:-200}"
PARALLEL="${PARALLEL:-2}"
EPISODES="${EPISODES:-32}"
DEVICE="${DEVICE:-cuda}"
NODE_BIN="${NODE_BIN:-node}"
BUILD_RUNNER="${BUILD_RUNNER:-1}"
EVAL="${EVAL:-1}"
FORCE="${FORCE:-0}"

DRY_RUN=0
FACTIONS=()
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    -*) echo "unknown option: $arg" >&2; exit 2 ;;
    *) FACTIONS+=("$arg") ;;
  esac
done

ALL_FACTIONS=(mechanical nature void military aliens cypherpunk infernal celestial psionic harmonic)
if [ ${#FACTIONS[@]} -eq 0 ]; then
  FACTIONS=("${ALL_FACTIONS[@]}")
fi

NPROC="$(nproc 2>/dev/null || echo 4)"
WORKERS="${WORKERS:-$(( NPROC / PARALLEL ))}"
if [ "$WORKERS" -lt 1 ]; then WORKERS=1; fi

RUNNER="ml/desktop/rl/run_episode.bundle.mjs"
if [ ! -f "ml/desktop/rl/train_ppo.py" ]; then
  echo "ERROR: train_ppo.py not found in $REPO_ROOT" >&2
  exit 1
fi

if [ "$BUILD_RUNNER" = "1" ] && [ "$DRY_RUN" = "0" ]; then
  echo "Building episode runner with $NODE_BIN..."
  "$NODE_BIN" ml/desktop/rl/build-runner.mjs || exit 1
fi
if [ "$DRY_RUN" = "0" ] && [ ! -f "$RUNNER" ]; then
  echo "ERROR: $RUNNER missing (run build-runner.mjs)" >&2
  exit 1
fi

mkdir -p ml/desktop/rl
declare -a PIDS=()

train_one() {
  local faction="$1"
  local policy="ml/desktop/rl/policy-${faction}-multimap.json"
  local log="ml/desktop/rl/train-${faction}-multimap.log"
  local ckpt="ml/desktop/rl/ckpt-${faction}-multimap"
  local traj="ml/desktop/rl/traj-${faction}-multimap"

  if [ "$FORCE" != "1" ] && [ -f "$policy" ]; then
    echo "[skip] $faction: $policy already exists (FORCE=1 to retrain)"
    return 0
  fi

  echo "[train] $faction: $ITERS iters, ${WORKERS} workers -> $policy"
  python3 ml/desktop/rl/train_ppo.py \
    --faction "$faction" --difficulty hard --map all \
    --state-version 7 --arch decoupled_res --hidden-dim 128 \
    --lr 3e-4 --lr-final 5e-5 \
    --entropy-coef 0.08 --entropy-final 0.01 \
    --episodes-per-iter "$EPISODES" --iters "$ITERS" \
    --eval-every 20 --eval-episodes 16 \
    --device "$DEVICE" \
    --runner "$RUNNER" \
    --policy-out "$policy" \
    --ckpt-dir "$ckpt" \
    --traj-dir "$traj" \
    --workers "$WORKERS" \
    > "$log" 2>&1
  local status=$?
  if [ $status -ne 0 ]; then
    echo "[fail] $faction: training exited $status (see $log)" >&2
    return $status
  fi

  if [ "$EVAL" = "1" ]; then
    echo "[eval] $faction: 40 deterministic episodes on all maps"
    python3 ml/desktop/rl/eval_rl.py \
      --policy "$policy" --faction "$faction" --difficulty hard --map all \
      --episodes 40 --deterministic --runner "$RUNNER" \
      --out "ml/desktop/rl/eval-${faction}-multimap-det.json" \
      >> "$log" 2>&1 || echo "[warn] $faction: eval failed" >&2
  fi
  echo "[done] $faction -> $policy"
}

if [ "$DRY_RUN" = "1" ]; then
  echo "dry run: iters=$ITERS parallel=$PARALLEL episodes=$EPISODES workers=$WORKERS device=$DEVICE eval=$EVAL"
  for f in "${FACTIONS[@]}"; do
    echo "  would train $f -> ml/desktop/rl/policy-${f}-multimap.json"
  done
  exit 0
fi

fail=0
running=0
RESULT_DIR="$(mktemp -d)"
run_wrapped() {
  local faction="$1"
  train_one "$faction"
  echo $? > "$RESULT_DIR/$faction.status"
}
for f in "${FACTIONS[@]}"; do
  run_wrapped "$f" &
  PIDS+=($!)
  running=$((running + 1))
  if [ "$running" -ge "$PARALLEL" ]; then
    wait -n || true
    running=$((running - 1))
  fi
done
wait || true
for f in "${FACTIONS[@]}"; do
  status="$(cat "$RESULT_DIR/$f.status" 2>/dev/null || echo 1)"
  if [ "$status" != "0" ]; then
    echo "[fail] $f exited $status" >&2
    fail=1
  fi
done
rm -rf "$RESULT_DIR"

echo "All requested factions finished (fail=$fail)."
exit $fail
