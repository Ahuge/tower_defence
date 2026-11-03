#!/bin/bash
# push-results.sh — Push training/eval results to the branch for Muse to analyze.
#
# Usage:
#   ./ml/desktop/push-results.sh                          # auto-find latest eval
#   ./ml/desktop/push-results.sh ml/desktop/eval-v2.json  # specific eval file
#   ./ml/desktop/push-results.sh --no-models               # skip model files (smaller push)
#
# Run this before walking away. It commits and pushes:
#   - Eval results JSON (essential)
#   - Model JSON files in playtest/models/ (optional, useful for inspection)
#   - Training stdout log if you saved one

set -e

BRANCH="feature/imitation-placement"
INCLUDE_MODELS=true
EVAL_FILE=""

for arg in "$@"; do
  case $arg in
    --no-models) INCLUDE_MODELS=false ;;
    *) EVAL_FILE="$arg" ;;
  esac
done

cd "$(git rev-parse --show-toplevel)"

# Find latest eval file if not specified
if [ -z "$EVAL_FILE" ]; then
  EVAL_FILE=$(ls -t ml/desktop/eval-*.json 2>/dev/null | head -1)
  if [ -z "$EVAL_FILE" ]; then
    echo "No eval files found in ml/desktop/eval-*.json"
    exit 1
  fi
fi

echo "Eval file: $EVAL_FILE"

# Show quick summary for chat (in case push fails, paste this)
echo ""
echo "=== Summary to paste in chat if push fails ==="
python3 -c "
import json
d = json.load(open('$EVAL_FILE'))
o = d['overall']
print(f\"Wins: {o['wins']}/{o['total']} ({o['winRate']:.1%}), avg wave {o['avgWave']:.1f}\")
for f, s in sorted(d['byFaction'].items()):
    wr = s['wins']/s['total'] if s['total'] else 0
    print(f\"  {f}: {s['wins']}/{s['total']} ({wr:.0%}), avg {s['avgWave']:.1f}\")
"
echo "=== End summary ==="
echo ""

# Stage files
git add "$EVAL_FILE"
echo "Staged: $EVAL_FILE"

if [ "$INCLUDE_MODELS" = true ]; then
  MODEL_COUNT=$(ls playtest/models/scorer-*.json 2>/dev/null | wc -l)
  if [ "$MODEL_COUNT" -gt 0 ]; then
    git add playtest/models/scorer-*.json
    echo "Staged: $MODEL_COUNT model files"
  else
    echo "No model files found in playtest/models/"
  fi
fi

# Stage training log if it exists
if [ -f ml/desktop/train.log ]; then
  git add ml/desktop/train.log
  echo "Staged: ml/desktop/train.log"
fi

# Check if there's anything to commit
if git diff --cached --quiet; then
  echo "Nothing new to commit."
  exit 0
fi

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
EVAL_BASENAME=$(basename "$EVAL_FILE" .json)

git -c user.name="Alex Hughes" -c user.email="Ahuge@users.noreply.github.com" commit -m "Training results: $EVAL_BASENAME ($TIMESTAMP)

Eval results and models from desktop 4080 training run." 

echo ""
echo "Pushing to $BRANCH..."
git push origin "$BRANCH"

echo ""
echo "Done. Muse can now pull and analyze."
echo "If you want, paste the summary above in chat too."
