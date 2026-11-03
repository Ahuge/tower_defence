#!/bin/bash
# train-eval-push.sh — Full pipeline: train, export, eval, compare, push.
#
# Usage:
#   ./ml/desktop/train-eval-push.sh                    # uses combined.jsonl, eval-v2.json
#   ./ml/desktop/train-eval-push.sh combined-v2.jsonl eval-v2.json
#
# Does everything: trains on GPU, exports models, runs eval,
# compares to baseline, commits and pushes results.

set -e

BRANCH="feature/imitation-placement"
DATA_FILE="${1:-ml/desktop/combined.jsonl}"
EVAL_NAME="${2:-eval-v2}"
EPOCHS="${3:-100}"
EVAL_FILE="ml/desktop/${EVAL_NAME}.json"

cd "$(git rev-parse --show-toplevel)"

echo "=== Step 1: Training ==="
source venv-gpu/bin/activate
python ml/desktop/train_gpu.py --data "$DATA_FILE" --epochs "$EPOCHS" --out ml/desktop/models/ 2>&1 | tee ml/desktop/train.log

echo ""
echo "=== Step 2: Exporting ==="
python ml/desktop/export_for_game.py --models ml/desktop/models/ --out playtest/models/

echo ""
echo "=== Step 3: Eval ==="
node --import tsx ml/desktop/eval_set.mts --learned --out "$EVAL_FILE"

echo ""
echo "=== Step 4: Compare ==="
node --import tsx ml/desktop/eval_set.mts --compare ml/desktop/eval-baseline.json "$EVAL_FILE"

echo ""
echo "=== Step 5: Push ==="
git add "$EVAL_FILE" ml/desktop/train.log playtest/models/scorer-*.json

if git diff --cached --quiet; then
  echo "Nothing new to commit."
  exit 0
fi

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
git -c user.name="Alex Hughes" -c user.email="Ahuge@users.noreply.github.com" commit -m "Training results: $EVAL_NAME ($TIMESTAMP)

Data: $DATA_FILE
Eval: $EVAL_FILE"

git push origin "$BRANCH"

echo ""
echo "Done. Results pushed to $BRANCH."
