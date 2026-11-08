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
# Episodes per PPO iteration default to a multiple of the worker count
# (target ~3 per worker, at least 64), not the trainer's 32. A static
# split of 64 across 28 workers leaves 8 workers with 3 episodes and 20
# with 2, so the collection phase ends with most cores idle; a multiple
# keeps every worker busy. Override with RL_EPISODES_PER_ITER.
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
# NOTE: when running several factions at once via sweep-multi.sh, that
# script divides the physical core count across factions and exports
# RL_WORKERS (2 factions on 14 cores = 7 workers each). Pass RL_WORKERS
# explicitly if you want a hard cap per sweep.
WORKERS="${RL_WORKERS:-$(nproc)}"

# Episodes per PPO iteration. Static split across workers means a count
# that isn't a multiple of WORKERS leaves some workers idle at the tail
# (64 episodes / 28 workers = 8 workers run 3, 20 run 2 → ~33% of the
# collection phase wasted). Round up to a multiple of WORKERS, aiming
# for ~3 episodes per worker so process startup is amortized.
# Override with RL_EPISODES_PER_ITER.
if [ -n "${RL_EPISODES_PER_ITER:-}" ]; then
  EPISODES_PER_ITER="$RL_EPISODES_PER_ITER"
else
  _target=$(( WORKERS * 3 ))
  [ "$_target" -lt 64 ] && _target=64
  EPISODES_PER_ITER=$(( ((_target + WORKERS - 1) / WORKERS) * WORKERS ))
fi
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

# Header for the summary CSV. Schema v2 adds the entropy schedule and the
# PPO/reward knobs the grid now varies. If an older summary exists with a
# different header, archive it: appending v2 rows under a v1 header would
# make DictReader misparse every column.
SUMMARY_HEADER="config,lr,entropy_coef,entropy_final,clip,life_penalty,wave_reward,gold_coef,gold_cap,build_coef,gamma,gae_lambda,ppo_epochs,minibatch,value_coef,pretrain,init_scorer,iters,eval_wins,eval_total,eval_win_rate,avg_wave,mean_reward,elapsed_min"
if [ -f "$SUMMARY_CSV" ] && [ "$(head -1 "$SUMMARY_CSV")" != "$SUMMARY_HEADER" ]; then
  _legacy="$RESULTS_DIR/summary-legacy-$(date '+%Y%m%d-%H%M%S').csv"
  mv "$SUMMARY_CSV" "$_legacy"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Archived old summary to $_legacy (schema v2)."
fi
if [ ! -f "$SUMMARY_CSV" ]; then
  echo "$SUMMARY_HEADER" > "$SUMMARY_CSV"
fi

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

time_left() {
  local now=$(date +%s)
  echo $((DEADLINE - now))
}

# Run one PPO config, eval it, and log the result.
#
# Usage: run_config NAME key=value [key=value ...]
#
# Defaults are the validated "new shaping" config (small leak penalty +
# positive build-investment reward, annealed entropy, no BC bias), so a
# config only needs to name the knobs it varies.
#
# Keys (default):
#   lr=1e-3            learning rate
#   entropy=0.3        initial entropy coefficient
#   entropy_final=0.05 anneal target (empty string disables annealing)
#   clip=0.2           PPO clip range
#   life=0.05          reward per life lost
#   wave=0.1           reward per wave cleared
#   gold_coef=0.002    reward per gold earned (income)
#   gold_cap=0.2       per-wave cap on the gold reward
#   build=0.002        reward per gold spent on a build/upgrade
#   gamma=0.99         discount
#   lam=0.95           GAE lambda
#   ppo_epochs=4       PPO epochs per iteration
#   minibatch=64       minibatch size
#   value_coef=0.5     value-loss coefficient
#   pretrain=0         1 = behavior-clone warm start from ml/placement-data.jsonl
#   init_scorer=0      1 = initialise trunk/heads from the placement scorer
#   iters=100          PPO iterations
run_config() {
  local name="$1"; shift
  local lr=1e-3 ent=0.3 ent_final=0.05 clip=0.2 life=0.05 wave=0.1
  local gold_coef=0.002 gold_cap=0.2 build=0.002
  local gamma=0.99 lam=0.95 ppo_epochs=4 minibatch=64 value_coef=0.5
  local pretrain=0 init_scorer=0 iters=100

  local kv key val
  for kv in "$@"; do
    key="${kv%%=*}"
    val="${kv#*=}"
    if [ "$key" = "$kv" ]; then
      log "WARNING: ignoring malformed config arg '$kv' (expected key=value)"
      continue
    fi
    case "$key" in
      lr) lr="$val" ;;
      entropy) ent="$val" ;;
      entropy_final) ent_final="$val" ;;
      clip) clip="$val" ;;
      life) life="$val" ;;
      wave) wave="$val" ;;
      gold_coef) gold_coef="$val" ;;
      gold_cap) gold_cap="$val" ;;
      build) build="$val" ;;
      gamma) gamma="$val" ;;
      lam) lam="$val" ;;
      ppo_epochs) ppo_epochs="$val" ;;
      minibatch) minibatch="$val" ;;
      value_coef) value_coef="$val" ;;
      pretrain) pretrain="$val" ;;
      init_scorer) init_scorer="$val" ;;
      iters) iters="$val" ;;
      *) log "WARNING: unknown config key '$key' (ignored)" ;;
    esac
  done

  local result_file="$RESULTS_DIR/${name}.json"

  # Only skip configs that completed successfully. A previous run that
  # wrote an error result (train/eval failed) should be retried.
  # NOTE: exit 0 = result exists and has no 'error' key → skip; exit 1
  # = error result (or unreadable file) → fall through and re-run.
  if [ -f "$result_file" ] && python3 -c "import json,sys; sys.exit(0 if 'error' not in json.load(open('$result_file')) else 1)" 2>/dev/null; then
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
  log "  lr=$lr ent=$ent->${ent_final:-none} clip=$clip life=$life wave=$wave gold=$gold_coef/$gold_cap build=$build gamma=$gamma lam=$lam epochs=$ppo_epochs mb=$minibatch vcoef=$value_coef pretrain=$pretrain init_scorer=$init_scorer iters=$iters"

  local policy="$RESULTS_DIR/policy-${name}.json"
  local ckpt="$RESULTS_DIR/ckpt-${name}"

  # Optional flags assembled from the config.
  local extra=()
  [ "$pretrain" = "1" ] && extra+=(--pretrain)
  [ "$init_scorer" = "1" ] && extra+=(--init-from-scorer "ml/desktop/models/scorer-${FACTION}.pt")
  [ -n "$ent_final" ] && extra+=(--entropy-final "$ent_final")

  # Train with this config's reward shaping via env vars (inherited by
  # the episode-runner workers that train_ppo spawns).
  RL_REWARD_LIFE_PENALTY="$life" RL_REWARD_WAVE="$wave" \
  RL_REWARD_GOLD_COEF="$gold_coef" RL_REWARD_GOLD_CAP="$gold_cap" \
  RL_REWARD_BUILD_COEF="$build" \
    python ml/desktop/rl/train_ppo.py --faction "$FACTION" \
      --policy-out "$policy" \
      --ckpt-dir "$ckpt" \
      --traj-dir "$RESULTS_DIR/trajectories/${name}" \
      --lr "$lr" --entropy-coef "$ent" --clip "$clip" \
      --gamma "$gamma" --gae-lambda "$lam" \
      --ppo-epochs "$ppo_epochs" --minibatch "$minibatch" \
      --value-coef "$value_coef" \
      --iters "$iters" --workers "$WORKERS" \
      --episodes-per-iter "$EPISODES_PER_ITER" \
      "${extra[@]}" \
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
      --traj-dir "$RESULTS_DIR/eval-trajs/${name}" \
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
r['hyperparams'] = {
  'lr': float('$lr'), 'entropy_coef': float('$ent'),
  'entropy_final': ('$ent_final' if '$ent_final' else None),
  'clip': float('$clip'), 'life_penalty': float('$life'),
  'wave_reward': float('$wave'), 'gold_coef': float('$gold_coef'),
  'gold_cap': float('$gold_cap'), 'build_coef': float('$build'),
  'gamma': float('$gamma'), 'gae_lambda': float('$lam'),
  'ppo_epochs': int('$ppo_epochs'), 'minibatch': int('$minibatch'),
  'value_coef': float('$value_coef'),
  'pretrain': int('$pretrain'), 'init_scorer': int('$init_scorer'),
  'iters': int('$iters'),
}
r['elapsed_min'] = $elapsed_min
json.dump(r, open('$result_file', 'w'), indent=2)
"

  echo "$name,$lr,$ent,$ent_final,$clip,$life,$wave,$gold_coef,$gold_cap,$build,$gamma,$lam,$ppo_epochs,$minibatch,$value_coef,$pretrain,$init_scorer,$iters,$wins,$total,$win_rate,$avg_wave,$mean_reward,$elapsed_min" >> "$SUMMARY_CSV"
  log "  RESULT: $wins/$total wins ($win_rate), avg wave $avg_wave, reward $mean_reward, ${elapsed_min}min"

  # Track the best policy: highest wins, tie-broken by avg wave (a 0-win
  # config that survives much deeper is a better base for the long run).
  if [ "$wins" != "?" ] && [ "$avg_wave" != "?" ]; then
    local better
    better=$(python3 -c "
import json, os
new_w, new_avg = int('$wins'), float('$avg_wave')
path = '$RESULTS_DIR/best.json'
if not os.path.exists(path):
    print('1'); raise SystemExit
d = json.load(open(path))
old_w = int(d.get('wins', -1))
old_avg = float(d.get('avg_wave', -1))
print('1' if (new_w, new_avg) > (old_w, old_avg) else '0')
" 2>/dev/null || echo 0)
    if [ "$better" = "1" ]; then
      cp "$policy" "ml/desktop/rl/policy-best-${FACTION}.json"
      cp "$result_file" "$RESULTS_DIR/best.json"
      log "  *** NEW BEST: $wins wins, avg wave $avg_wave — policy copied to ml/desktop/rl/policy-best-${FACTION}.json ***"
    fi
  fi
  return 0
}

log "RL sweep starting: max ${MAX_HOURS}h, faction ${FACTION}"
log "Workers: $WORKERS, episodes/iteration: $EPISODES_PER_ITER"
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
  echo "bc-only,-,-,-,-,-,-,-,-,-,-,-,-,-,-,1,1,0,$bc_wins,50,?,${bc_wave},?,-" >> "$SUMMARY_CSV"
  log "  BC-only: $bc_wins/50 wins, avg wave $bc_wave"
else
  log "SKIP Phase 0 (bc-only already done)"
fi

# --- Phase 1: reward shaping under the new credit assignment ---
# The window-credit fix gives builds the wave outcome; these configs find
# the leak penalty / build-investment balance. Defaults (lr 1e-3, annealed
# entropy 0.3->0.05, no BC) are the config that took psionic from wave 3.0
# to wave 9.3 in 60 iters.
run_config "v2-life-0.05-build-0.002" || exit 0
run_config "v2-life-0.02-build-0.002" life=0.02 || exit 0
run_config "v2-life-0.10-build-0.002" life=0.10 || exit 0
run_config "v2-life-0.00-build-0.002" life=0.0 || exit 0
run_config "v2-life-0.05-build-0.005" build=0.005 || exit 0
run_config "v2-life-0.05-build-0.001" build=0.001 || exit 0
run_config "v2-life-0.05-build-0.000" build=0.0 || exit 0
# Does the build reward rescue the old high leak penalty (which used to
# teach hoarding)? Old code at life=0.5 got 0 wins / wave 8.8.
run_config "v2-life-0.50-build-0.002" life=0.5 || exit 0

# --- Phase 2: learning rate / wave weight around the 1e-3 winner ---
run_config "v2-lr-3e-3" lr=3e-3 || exit 0
run_config "v2-lr-5e-4" lr=5e-4 || exit 0
run_config "v2-wave-0.3" wave=0.3 || exit 0

# --- Phase 3: exploration schedule ---
run_config "v2-ent-0.5-0.1" entropy=0.5 entropy_final=0.1 || exit 0
run_config "v2-ent-0.2-0.02" entropy=0.2 entropy_final=0.02 || exit 0
run_config "v2-ent-0.3-flat" entropy=0.3 entropy_final= || exit 0

# --- Phase 4: warm start (BC data is probe-biased for psionic) ---
# Compare the BC warm start and scorer init against from-scratch above.
run_config "v2-pretrain" pretrain=1 init_scorer=1 || exit 0
run_config "v2-init-scorer" init_scorer=1 || exit 0

# --- Phase 5: long run on the best config so far ---
# Re-read the summary CSV, pick the best non-BC config by (wins, avg_wave),
# and run it for 300 iterations (or until the deadline).
BEST_CONFIG=$(python3 -c "
import csv
best = None
best_key = (-1, -1.0)
with open('$SUMMARY_CSV') as f:
    for row in csv.DictReader(f):
        if row['config'] == 'bc-only':
            continue
        try:
            w = int(row['eval_wins'])
            aw = float(row['avg_wave'])
        except (ValueError, TypeError):
            continue
        key = (w, aw)
        if key > best_key:
            best_key = key
            best = row
if best:
    kv = ' '.join([
        'lr=' + best['lr'], 'entropy=' + best['entropy_coef'],
        'entropy_final=' + best['entropy_final'], 'clip=' + best['clip'],
        'life=' + best['life_penalty'], 'wave=' + best['wave_reward'],
        'gold_coef=' + best['gold_coef'], 'gold_cap=' + best['gold_cap'],
        'build=' + best['build_coef'], 'gamma=' + best['gamma'],
        'lam=' + best['gae_lambda'], 'ppo_epochs=' + best['ppo_epochs'],
        'minibatch=' + best['minibatch'], 'value_coef=' + best['value_coef'],
        'pretrain=' + best['pretrain'], 'init_scorer=' + best['init_scorer'],
    ])
    print(f\"{best_key[0]}|{best['config']}|{kv}\")
" 2>/dev/null)

if [ -n "$BEST_CONFIG" ]; then
  # NOTE: BEST_WINS comes from the Python output above — it is not a
  # shell variable (set -u would abort the sweep on an unset reference).
  IFS='|' read -r BEST_WINS _cfg BEST_KV <<< "$BEST_CONFIG"
  log "=== Phase 5: long run on best config ($_cfg, $BEST_WINS wins) — 300 iters ==="
  # shellcheck disable=SC2086  # intentional word splitting of key=value pairs
  run_config "long-${_cfg}" $BEST_KV iters=300 || exit 0
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
