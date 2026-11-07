#!/bin/bash
# RL sweep — runs PPO training across many configs for up to 24 hours,
# logging every result so we can find what actually works.
#
# Usage:
#   source venv-gpu/bin/activate
#   ./ml/desktop/rl/sweep.sh [max_hours] [faction]
#
# Defaults: 24 hours, arcane.
# Runs in the foreground — use tmux or nohup to keep it alive:
#   tmux new -s rl-sweep
#   ./ml/desktop/rl/sweep.sh 24
#   (Ctrl-B, D to detach; tmux attach -t rl-sweep to rejoin)
#
# Or with nohup:
#   nohup ./ml/desktop/rl/sweep.sh 24 > ml/desktop/rl/sweep.log 2>&1 &
#
# Results land in ml/desktop/rl/sweep-results-<faction>/ as one JSON
# per config, plus a running CSV summary at
# ml/desktop/rl/sweep-results-<faction>/summary.csv. The best policy
# (by eval win rate) is copied to
# ml/desktop/rl/policy-best-<faction>.json.
#
# Parallel sweeps: each faction writes to its own results dir, traj
# dir, and best-policy file, so two factions can run at once — use
# sweep-multi.sh to launch several. A lockfile
# ml/desktop/rl/.sweep-<faction>.lock prevents double-launching the
# same faction (it holds the sweep's PID; a stale lock from a dead
# process is reclaimed automatically).
#
# Speed: episode collection runs in parallel across all CPU cores
# (--workers, default $(nproc) via RL_WORKERS). Game simulation is the
# bottleneck and parallelizes nearly linearly up to core count — expect
# roughly 3-4x faster configs on a 4-core machine, more on many-core
# desktops. Lower RL_WORKERS if Node processes run out of RAM:
#   RL_WORKERS=4 ./ml/desktop/rl/sweep.sh 24
#
# The episode runner is bundled with esbuild before the sweep starts
# (node ml/desktop/rl/build-runner.mjs) so each worker pays ~0.2s of
# Node startup instead of ~1-4s of tsx transpiling. The bundle and its
# copied scorer models are build artifacts (gitignored).
#
# Episodes per PPO iteration default to 64 (not the trainer's 32):
# with startup fixed and 20 workers, 32 episodes is only 1-2 per
# worker — poor amortization — and 64 gives better PPO gradient
# estimates for the same wall-clock cost.
#
# Resume: if the script is interrupted, re-running it skips configs
# that already have a result file. Delete a result file to re-run it.

set -u
# Resolve the repo root from this script's location (ml/desktop/rl/sweep.sh).
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT" || exit 1

# Sanity check: the trainer must exist here, otherwise we'd silently
# fail every config (as happened when the cd was wrong).
if [ ! -f "ml/desktop/rl/train_ppo.py" ]; then
  echo "ERROR: ml/desktop/rl/train_ppo.py not found in $REPO_ROOT — aborting."
  exit 1
fi

MAX_HOURS="${1:-24}"
FACTION="${2:-arcane}"
case "$FACTION" in
  arcane|psionic) ;;
  *)
    echo "ERROR: unknown faction '$FACTION' (known: arcane, psionic)" >&2
    exit 1
    ;;
esac

# --- Single-instance lock for this faction ---
# Refuse to run if a live sweep for the same faction already holds
# the lock; reclaim a stale lock (PID no longer alive). Checked
# BEFORE the bundle build so a double-launched sweep exits fast
# instead of wasting time building.
LOCK_FILE="ml/desktop/rl/.sweep-${FACTION}.lock"
if [ -f "$LOCK_FILE" ]; then
  LOCK_PID=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
  if [ -n "$LOCK_PID" ] && kill -0 "$LOCK_PID" 2>/dev/null; then
    echo "ERROR: a $FACTION sweep is already running (PID $LOCK_PID, lock $LOCK_FILE). Not double-launching." >&2
    exit 1
  fi
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Reclaiming stale lock $LOCK_FILE (PID $LOCK_PID not alive)."
fi
echo $$ > "$LOCK_FILE"
trap 'rm -f "$LOCK_FILE"' EXIT

# Bundle the episode runner once up front so every worker spawn is a
# plain `node` launch (~0.2s) instead of tsx transpiling (~1-4s).
# Skip the build when the bundle is newer than its sources; when a
# build is needed, take a lock dir so two parallel sweeps don't race
# writing the same bundle file (mkdir is atomic). If the lock is held
# by another sweep, wait for the bundle to appear instead of building.
# Falls back to tsx at runtime if the build fails — warn, don't abort.
BUNDLE="ml/desktop/rl/run_episode.bundle.mjs"
if [ ! -f "$BUNDLE" ] || [ "ml/desktop/rl/run_episode.mts" -nt "$BUNDLE" ] || [ "ml/desktop/rl/build-runner.mjs" -nt "$BUNDLE" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Bundling episode runner (esbuild)..."
  BUNDLE_LOCK="ml/desktop/rl/.bundle-build.lock"
  if mkdir "$BUNDLE_LOCK" 2>/dev/null; then
    if node ml/desktop/rl/build-runner.mjs; then
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] Runner bundle ready."
    else
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: bundle build failed — workers will fall back to tsx (slow startup)."
    fi
    rmdir "$BUNDLE_LOCK" 2>/dev/null || true
  else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Another sweep is building the bundle — waiting..."
    for _ in $(seq 1 60); do
      [ -f "$BUNDLE" ] && break
      sleep 2
    done
    if [ -f "$BUNDLE" ]; then
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] Runner bundle ready (built by the other sweep)."
    else
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: bundle never appeared — workers will fall back to tsx (slow startup)."
    fi
  fi
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Runner bundle up to date, skipping build."
fi

# Parallel episode-runner processes (default: all cores). Override with
# RL_WORKERS=4 ./ml/desktop/rl/sweep.sh 24 if RAM is tight.
# NOTE: when running several factions at once via sweep-multi.sh, the
# workers are shared across sweeps — with 2 factions on 20 cores each
# sweep gets ~10 effective workers. Pass RL_WORKERS explicitly if you
# want a hard cap per sweep.
WORKERS="${RL_WORKERS:-$(nproc)}"
START_TIME=$(date +%s)
DEADLINE=$((START_TIME + MAX_HOURS * 3600))
RESULTS_DIR="ml/desktop/rl/sweep-results-${FACTION}"
mkdir -p "$RESULTS_DIR"
SUMMARY_CSV="$RESULTS_DIR/summary.csv"

# One-time migration: sweeps before the per-faction split wrote to
# ml/desktop/rl/sweep-results/ (arcane only). Move it into the new
# per-faction dir so resume still finds the completed configs.
if [ "$FACTION" = "arcane" ] && [ ! -f "$SUMMARY_CSV" ] && [ -d "ml/desktop/rl/sweep-results" ] && [ -f "ml/desktop/rl/sweep-results/summary.csv" ]; then
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Migrating legacy sweep-results/ -> $RESULTS_DIR (arcane resume state preserved)."
  cp -a ml/desktop/rl/sweep-results/. "$RESULTS_DIR"/ 2>/dev/null || true
  mv ml/desktop/rl/sweep-results "ml/desktop/rl/sweep-results-legacy-$(date '+%Y%m%d-%H%M%S')" 2>/dev/null || true
fi

# Header for the summary CSV (only if it doesn't exist yet).
if [ ! -f "$SUMMARY_CSV" ]; then
  echo "config,lr,entropy_coef,clip,life_penalty,wave_reward,iters,eval_wins,eval_total,eval_win_rate,avg_wave,mean_reward,elapsed_min" > "$SUMMARY_CSV"
fi

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

time_left() {
  local now=$(date +%s)
  echo $((DEADLINE - now))
}

# Run one PPO config, eval it, and log the result.
# Args: name lr entropy_coef clip life_penalty wave_reward iters
run_config() {
  local name="$1" lr="$2" ent="$3" clip="$4" life="$5" wave="$6" iters="$7"
  local result_file="$RESULTS_DIR/${name}.json"

  # Only skip configs that completed successfully. A previous run that
  # wrote an error result (train/eval failed) should be retried.
  if [ -f "$result_file" ] && ! python3 -c "import json,sys; sys.exit(0 if 'error' not in json.load(open('$result_file')) else 1)" 2>/dev/null; then
    log "SKIP $name (already done)"
    return 0
  fi

  local remaining=$(time_left)
  if [ "$remaining" -le 600 ]; then
    log "Less than 10 min left, stopping sweep."
    return 1
  fi

  local t0=$(date +%s)
  log "=== $name ==="
  log "  lr=$lr entropy=$ent clip=$clip life_penalty=$life wave_reward=$wave iters=$iters"

  local policy="$RESULTS_DIR/policy-${name}.json"
  local ckpt="$RESULTS_DIR/ckpt-${name}"

  # Train with this config's reward shaping via env vars.
  RL_REWARD_LIFE_PENALTY="$life" RL_REWARD_WAVE="$wave" \
    python ml/desktop/rl/train_ppo.py --pretrain --faction "$FACTION" \
      --init-from-scorer "ml/desktop/models/scorer-${FACTION}.pt" \
      --policy-out "$policy" \
      --ckpt-dir "$ckpt" \
      --traj-dir "$RESULTS_DIR/trajectories" \
      --lr "$lr" --entropy-coef "$ent" --clip "$clip" \
      --iters "$iters" --workers "$WORKERS" \
      --episodes-per-iter 64 \
      > "$RESULTS_DIR/${name}-train.log" 2>&1
  local train_rc=$?
  if [ $train_rc -ne 0 ]; then
    log "  TRAIN FAILED (exit $train_rc), see ${name}-train.log"
    echo "{\"config\": \"$name\", \"error\": \"train failed rc=$train_rc\"}" > "$result_file"
    return 0
  fi

  # Eval: 50 episodes, deterministic, fixed seeds.
  python ml/desktop/rl/eval_rl.py --policy "$policy" --faction "$FACTION" \
      --episodes 50 --deterministic --workers "$WORKERS" \
      --traj-dir "$RESULTS_DIR/eval-trajs" \
      --out "$RESULTS_DIR/${name}-eval.json" \
      > "$RESULTS_DIR/${name}-eval.log" 2>&1
  local eval_rc=$?
  if [ $eval_rc -ne 0 ]; then
    log "  EVAL FAILED (exit $eval_rc), see ${name}-eval.log"
    echo "{\"config\": \"$name\", \"error\": \"eval failed rc=$eval_rc\"}" > "$result_file"
    return 0
  fi

  # Extract numbers from the eval JSON.
  local wins avg_wave mean_reward
  wins=$(python3 -c "import json; print(json.load(open('$RESULTS_DIR/${name}-eval.json'))['wins'])" 2>/dev/null || echo "?")
  avg_wave=$(python3 -c "import json; print(round(json.load(open('$RESULTS_DIR/${name}-eval.json'))['avg_wave'],1))" 2>/dev/null || echo "?")
  mean_reward=$(python3 -c "import json; print(round(json.load(open('$RESULTS_DIR/${name}-eval.json'))['mean_reward'],2))" 2>/dev/null || echo "?")
  local total=50
  local win_rate="?"
  if [ "$wins" != "?" ]; then
    win_rate=$(python3 -c "print(round($wins/$total,3))")
  fi

  local t1=$(date +%s)
  local elapsed_min=$(( (t1 - t0) / 60 ))

  # Save the full result.
  python3 -c "
import json
r = json.load(open('$RESULTS_DIR/${name}-eval.json'))
r['config'] = '$name'
r['hyperparams'] = {'lr': $lr, 'entropy_coef': $ent, 'clip': $clip, 'life_penalty': $life, 'wave_reward': $wave, 'iters': $iters}
r['elapsed_min'] = $elapsed_min
json.dump(r, open('$result_file', 'w'), indent=2)
"

  echo "$name,$lr,$ent,$clip,$life,$wave,$iters,$wins,$total,$win_rate,$avg_wave,$mean_reward,$elapsed_min" >> "$SUMMARY_CSV"
  log "  RESULT: $wins/$total wins ($win_rate), avg wave $avg_wave, reward $mean_reward, ${elapsed_min}min"

  # Track the best policy.
  if [ "$wins" != "?" ]; then
    local best_wins=0
    if [ -f "$RESULTS_DIR/best.json" ]; then
      best_wins=$(python3 -c "import json; print(json.load(open('$RESULTS_DIR/best.json'))['wins'])" 2>/dev/null || echo 0)
    fi
    if [ "$wins" -gt "$best_wins" ]; then
      cp "$policy" "ml/desktop/rl/policy-best-${FACTION}.json"
      cp "$result_file" "$RESULTS_DIR/best.json"
      log "  *** NEW BEST: $wins wins — policy copied to ml/desktop/rl/policy-best-${FACTION}.json ***"
    fi
  fi
  return 0
}

log "RL sweep starting: max ${MAX_HOURS}h, faction ${FACTION}"
log "Deadline: $(date -d "@$DEADLINE" '+%Y-%m-%d %H:%M:%S')"
log "Results: $RESULTS_DIR"

# --- Phase 0: BC-only baseline (no PPO) ---
# Establishes whether the warm start alone beats 0%.
if [ ! -f "$RESULTS_DIR/bc-only.json" ]; then
  log "=== Phase 0: BC-only baseline ==="
  python ml/desktop/rl/train_ppo.py --pretrain --faction "$FACTION" \
      --init-from-scorer "ml/desktop/models/scorer-${FACTION}.pt" \
      --policy-out "$RESULTS_DIR/policy-bc-only.json" \
      --ckpt-dir "$RESULTS_DIR/ckpt-bc-only" \
      --traj-dir "$RESULTS_DIR/trajectories" \
      --iters 0 --workers "$WORKERS" \
      > "$RESULTS_DIR/bc-only-train.log" 2>&1
  python ml/desktop/rl/eval_rl.py --policy "$RESULTS_DIR/policy-bc-only.json" \
      --faction "$FACTION" \
      --episodes 50 --deterministic --workers "$WORKERS" \
      --traj-dir "$RESULTS_DIR/eval-trajs" \
      --out "$RESULTS_DIR/bc-only.json" \
      > "$RESULTS_DIR/bc-only-eval.log" 2>&1
  bc_wins=$(python3 -c "import json; print(json.load(open('$RESULTS_DIR/bc-only.json'))['wins'])" 2>/dev/null || echo "?")
  bc_wave=$(python3 -c "import json; print(round(json.load(open('$RESULTS_DIR/bc-only.json'))['avg_wave'],1))" 2>/dev/null || echo "?")
  echo "bc-only,0,0,0,0,0,0,$bc_wins,50,?,${bc_wave},?,-" >> "$SUMMARY_CSV"
  log "  BC-only: $bc_wins/50 wins, avg wave $bc_wave"
else
  log "SKIP Phase 0 (bc-only already done)"
fi

# --- Phase 1: reward shaping (life penalty is the prime suspect) ---
# Same PPO hyperparams, vary only the life penalty.
# 100 iters each — enough to see if the agent learns to survive.
run_config "life-0.5"  3e-4 0.01 0.2 0.5  0.1 100 || exit 0
run_config "life-0.1"  3e-4 0.01 0.2 0.1  0.1 100 || exit 0
run_config "life-0.05" 3e-4 0.01 0.2 0.05 0.1 100 || exit 0

# --- Phase 2: entropy (exploration) ---
# Best life penalty from Phase 1 is unknown at script time, so try
# high entropy with both the default and the loosest life penalty.
run_config "ent-0.05-life-0.1"  3e-4 0.05 0.2 0.1  0.1 100 || exit 0
run_config "ent-0.05-life-0.05" 3e-4 0.05 0.2 0.05 0.1 100 || exit 0
run_config "ent-0.1-life-0.1"   3e-4 0.1  0.2 0.1  0.1 100 || exit 0

# --- Phase 3: learning rate ---
run_config "lr-1e4-life-0.1" 1e-4 0.05 0.2 0.1 0.1 100 || exit 0
run_config "lr-1e3-life-0.1" 1e-3 0.05 0.2 0.1 0.1 100 || exit 0

# --- Phase 4: wave reward (encourage pushing further) ---
run_config "wave-0.2-life-0.1" 3e-4 0.05 0.2 0.1 0.2 100 || exit 0
run_config "wave-0.3-life-0.1" 3e-4 0.05 0.2 0.1 0.3 100 || exit 0

# --- Phase 5: long run on the best config so far ---
# Re-read the summary CSV, pick the best non-BC config, and run it
# for 300 iterations (or until the deadline).
BEST_CONFIG=$(python3 -c "
import csv
best = None
best_wins = -1
with open('$SUMMARY_CSV') as f:
    for row in csv.DictReader(f):
        if row['config'] == 'bc-only':
            continue
        try:
            w = int(row['eval_wins'])
        except (ValueError, TypeError):
            continue
        if w > best_wins:
            best_wins = w
            best = row
if best:
    print(f\"{best['config']},{best['lr']},{best['entropy_coef']},{best['clip']},{best['life_penalty']},{best['wave_reward']}\")
" 2>/dev/null)

if [ -n "$BEST_CONFIG" ]; then
  IFS=',' read -r _cfg blr bent bclip blife bwave <<< "$BEST_CONFIG"
  log "=== Phase 5: long run on best config ($_cfg, $best_wins wins) — 300 iters ==="
  run_config "long-${_cfg}" "$blr" "$bent" "$bclip" "$blife" "$bwave" 300 || exit 0
else
  log "No successful PPO config found yet — skipping long run."
fi

# --- Done ---
log "Sweep finished (or deadline reached)."
log "Summary: $SUMMARY_CSV"
if [ -f "$RESULTS_DIR/best.json" ]; then
  log "Best config:"
  python3 -c "import json; d=json.load(open('$RESULTS_DIR/best.json')); print(f\"  {d['config']}: {d['wins']}/{d['episodes']} wins, avg wave {d['avg_wave']:.1f}\")"
  log "Best policy: ml/desktop/rl/policy-best-${FACTION}.json"
fi
log "Full results in $RESULTS_DIR"

# --- Push results so Muse can see them ---
# Parallel sweeps share this branch: another faction's sweep may
# have pushed first, so rebase and retry the push (up to 3 tries).
log "Pushing sweep results to feature/imitation-placement..."
git add "$RESULTS_DIR" "ml/desktop/rl/policy-best-${FACTION}.json" 2>/dev/null
if git diff --cached --quiet; then
  log "Nothing new to push."
else
  git -c user.name="Alex Hughes" -c user.email="Ahuge@users.noreply.github.com" commit -m "RL sweep results ${FACTION} ($(date '+%Y-%m-%d %H:%M'))" 2>&1 | tail -1
  push_ok=0
  for _try in 1 2 3; do
    if git push origin feature/imitation-placement > /tmp/rl-push.log 2>&1; then
      tail -1 /tmp/rl-push.log
      push_ok=1
      break
    fi
    tail -1 /tmp/rl-push.log
    log "Push rejected (another sweep pushed first?) — rebasing and retrying ($_try/3)..."
    git pull --rebase origin feature/imitation-placement > /tmp/rl-pull.log 2>&1
    tail -1 /tmp/rl-pull.log
  done
  if [ "$push_ok" = 1 ]; then
    log "Results pushed."
  else
    log "WARNING: push failed after 3 tries — results are committed locally, push manually with: git push origin feature/imitation-placement"
  fi
fi
