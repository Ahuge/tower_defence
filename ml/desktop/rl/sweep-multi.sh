#!/bin/bash
# RL multi-faction sweep — launches one sweep.sh per faction in
# parallel so a many-core desktop actually gets used. A single sweep
# only reaches ~35% CPU on a 20-core machine (the game sim + tiny
# PPO update can't saturate it); two factions side by side use ~70%.
#
# Usage:
#   source venv-gpu/bin/activate
#   ./ml/desktop/rl/sweep-multi.sh [max_hours] faction1 [faction2 ...]
#   ./ml/desktop/rl/sweep-multi.sh --dry-run [max_hours] faction1 ...
#
# Examples:
#   ./ml/desktop/rl/sweep-multi.sh 24 arcane psionic
#   ./ml/desktop/rl/sweep-multi.sh 12 psionic
#
# Each faction runs its own sweep.sh in the background with its own
# log (ml/desktop/rl/sweep-<faction>.log) and its own results dir
# (ml/desktop/rl/sweep-results-<faction>/). This script waits for all
# of them, then prints a combined summary.
#
# Already-running factions are skipped, not double-launched: sweep.sh
# holds a per-faction lockfile (ml/desktop/rl/.sweep-<faction>.lock)
# and refuses to start a second sweep for the same faction.
#
# Workers: each sweep defaults to $(nproc) parallel episode runners,
# but the workers are shared across sweeps — 2 factions on 20 cores
# each get ~10 effective workers. Pass RL_WORKERS to cap per sweep:
#   RL_WORKERS=10 ./ml/desktop/rl/sweep-multi.sh 24 arcane psionic
#
# Stopping: Ctrl-C here only stops the waiting, NOT the sweeps — they
# keep running in the background. Stop one faction with:
#   kill "$(cat ml/desktop/rl/.sweep-<faction>.lock)"
# (or just let it run to its deadline; the lock is released on exit).

set -u
# Resolve the repo root from this script's location (ml/desktop/rl/).
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$REPO_ROOT" || exit 1

if [ ! -f "ml/desktop/rl/sweep.sh" ]; then
  echo "ERROR: ml/desktop/rl/sweep.sh not found in $REPO_ROOT — aborting."
  exit 1
fi

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

DRY_RUN=0
if [ "${1:-}" = "--dry-run" ]; then
  DRY_RUN=1
  shift
fi

MAX_HOURS="${1:-24}"
shift || true
if [ "$#" -eq 0 ]; then
  echo "Usage: $0 [--dry-run] [max_hours] faction1 [faction2 ...]" >&2
  echo "  known factions: arcane, psionic" >&2
  exit 1
fi
FACTIONS=("$@")

# Validate factions up front so a typo doesn't launch a half-set.
for f in "${FACTIONS[@]}"; do
  case "$f" in
    arcane|psionic) ;;
    *)
      echo "ERROR: unknown faction '$f' (known: arcane, psionic)" >&2
      exit 1
      ;;
  esac
done

log "Multi-faction RL sweep: ${FACTIONS[*]} for up to ${MAX_HOURS}h"
if [ "$DRY_RUN" = 1 ]; then
  for f in "${FACTIONS[@]}"; do
    echo "  would launch: ./ml/desktop/rl/sweep.sh $MAX_HOURS $f"
    echo "    log:    ml/desktop/rl/sweep-${f}.log"
    echo "    results: ml/desktop/rl/sweep-results-${f}/"
    lock="ml/desktop/rl/.sweep-${f}.lock"
    if [ -f "$lock" ]; then
      pid=$(cat "$lock" 2>/dev/null || echo "?")
      if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
        echo "    status: ALREADY RUNNING (PID $pid) — would skip"
      else
        echo "    status: stale lock (PID $pid not alive) — would reclaim"
      fi
    else
      echo "    status: not running"
    fi
  done
  exit 0
fi

# Build the runner bundle once up front so the parallel sweeps don't
# race the build (sweep.sh also builds it, with a lock, but doing it
# here first means every sweep starts with a fresh bundle).
log "Bundling episode runner (esbuild)..."
if node ml/desktop/rl/build-runner.mjs; then
  log "Runner bundle ready."
else
  log "WARNING: bundle build failed — sweeps will fall back to tsx (slow startup)."
fi

declare -a PIDS=()
declare -a NAMES=()
for f in "${FACTIONS[@]}"; do
  lock="ml/desktop/rl/.sweep-${f}.lock"
  if [ -f "$lock" ]; then
    pid=$(cat "$lock" 2>/dev/null || echo "")
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      log "SKIP $f (already running, PID $pid) — watch ml/desktop/rl/sweep-${f}.log"
      continue
    fi
  fi
  log "Launching $f sweep (log: ml/desktop/rl/sweep-${f}.log)..."
  nohup ./ml/desktop/rl/sweep.sh "$MAX_HOURS" "$f" > "ml/desktop/rl/sweep-${f}.log" 2>&1 &
  PIDS+=($!)
  NAMES+=("$f")
done

if [ "${#PIDS[@]}" -eq 0 ]; then
  log "Nothing to launch — all requested factions are already running."
  exit 0
fi

log "Waiting for ${#PIDS[@]} sweep(s): ${NAMES[*]} (Ctrl-C stops waiting, not the sweeps)"
for i in "${!PIDS[@]}"; do
  wait "${PIDS[$i]}" 2>/dev/null
  log "Sweep finished: ${NAMES[$i]} (exit $?)"
done

# --- Combined summary ---
log "All sweeps done. Combined summary:"
for f in "${FACTIONS[@]}"; do
  csv="ml/desktop/rl/sweep-results-${f}/summary.csv"
  echo "--- $f ---"
  if [ -f "$csv" ]; then
    python3 -c "
import csv
rows = list(csv.DictReader(open('$csv')))
if not rows:
    print('  (no results yet)')
else:
    scored = [r for r in rows if r['eval_wins'] not in ('?', '')]
    if scored:
        best = max(scored, key=lambda r: (int(r['eval_wins']), float(r['avg_wave'] or 0)))
        print(f\"  best: {best['config']} — {best['eval_wins']}/{best['eval_total']} wins, avg wave {best['avg_wave']}\")
    for r in rows:
        print(f\"  {r['config']}: {r['eval_wins']}/{r['eval_total']} wins, avg wave {r['avg_wave']}\")
"
  else
    echo "  (no summary.csv — sweep may have failed early; see ml/desktop/rl/sweep-${f}.log)"
  fi
done
log "Full results: ml/desktop/rl/sweep-results-<faction>/ per faction"
