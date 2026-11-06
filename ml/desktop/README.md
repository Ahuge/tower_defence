# Desktop GPU Training Pipeline

Train placement models on your Nvidia 4080 using synthetic + expert data.

## Setup

```bash
# 1. Clone the repo (if not already)
git clone https://github.com/Ahuge/tower_defence.git
cd tower_defence

# 2. Install Node dependencies
npm install

# 3. Set up Python with GPU support
python -m venv venv-gpu
source venv-gpu/bin/activate  # or venv-gpu\Scripts\activate on Windows

# Install PyTorch with CUDA (for RTX 4080)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
pip install numpy

# Verify GPU
python -c "import torch; print(torch.cuda.is_available())"  # should print True
```

## Pipeline

### Step 1: Generate synthetic data (CPU, ~2-4 hours for 10k games)

```bash
# Generate 10,000 headless matches across all factions
# Uses the hand-coded brains (Balanced, Greedy, Strategist) to generate
# diverse (board_state, placement) pairs
node --import tsx ml/desktop/generate_data.mts --count 10000 --out ml/desktop/synthetic.jsonl
```

This runs the game headless — no GPU needed. It'll use all your CPU cores.
Expect ~2-4 hours for 10k games. You can run it overnight.

### Step 2: Combine with expert data

```bash
# Merge synthetic data with Alex's 790 expert placements
python ml/desktop/combine_data.py \
  --synthetic ml/desktop/synthetic.jsonl \
  --expert ml/placement-data.jsonl \
  --out ml/desktop/combined.jsonl \
  --expert-weight 10
```

Expert placements get 10x weight — they're higher quality.

### Step 2b: Procedural generation (optional, round 2)

Two proc gen approaches to expand beyond bot knowledge:

**A. Augment expert data** (fast, CPU-only):
```bash
# Jitter positions ±2 tiles + mirror boards → 790 becomes ~5,000+
python ml/desktop/augment_expert.py \
  --expert ml/placement-data.jsonl \
  --out ml/desktop/augmented-expert.jsonl \
  --mirror
```

**B. Simulate procedural patterns** (slower, generates novel strategies):
```bash
# Generate placements via patterns (random/cluster/corridor/grid),
# simulate in headless harness for real win/loss labels
node --import tsx ml/desktop/procgen_simulate.mts --count 2000 --out ml/desktop/procgen.jsonl
```

Then combine everything:
```bash
python ml/desktop/combine_data.py \
  --synthetic ml/desktop/synthetic.jsonl \
  --expert ml/placement-data.jsonl \
  --augmented ml/desktop/augmented-expert.jsonl \
  --procgen ml/desktop/procgen.jsonl \
  --out ml/desktop/combined-v2.jsonl \
  --expert-weight 10 --augment-weight 3 --procgen-weight 2
```

### Step 3: Train on GPU (~30-60 min on 4080)

```bash
source venv-gpu/bin/activate
python ml/desktop/train_gpu.py \
  --data ml/desktop/combined.jsonl \
  --epochs 300 \
  --batch-size 256 \
  --out ml/desktop/models/
```

Uses CUDA automatically if available. Val loss levels out around epoch 270, so 300 is the default. The 4070/4080 should train 300 epochs in ~2-3 hours.

### Step 4: Export for game use

```bash
source venv-gpu/bin/activate  # torch must come from the venv, not system python
python ml/desktop/export_for_game.py \
  --models ml/desktop/models/ \
  --out playtest/models/
```

Converts PyTorch models to JSON for the TypeScript LearnedScorer.

### Step 5: Test in game

```bash
# The models are now in playtest/models/scorer-<faction>.json
# Enable in StrategistBrain via params: { useLearnedScorer: 1 }
```

## Evaluation

We have a fixed benchmark to measure progress:

```bash
# Baseline (hand-coded scorers)
node --import tsx ml/desktop/eval_set.mts --out ml/desktop/eval-baseline.json

# With learned scorer
node --import tsx ml/desktop/eval_set.mts --learned --out ml/desktop/eval-learned.json

# Compare
node --import tsx ml/desktop/eval_set.mts --compare ml/desktop/eval-baseline.json ml/desktop/eval-learned.json
```

110 matches (11 factions × 2 difficulties × 5 fixed seeds).
Current baseline: **17/110 wins (15.5%), avg wave 13.1** (2026-11-02).

**5x eval** (550 matches, 25 seeds per cell):
```bash
node --import tsx ml/desktop/eval_set.mts --out ml/desktop/eval-5x.json
```
Takes ~3-4x longer but gives tighter confidence intervals.

### Watching replays

Every eval run saves replays to `ml/desktop/replays/<eval-name>/` — all wins
plus ~1% of losses — with an `index.json` listing them. Open
`ml/desktop/replay-viewer.html` directly in a browser (no server needed):

- **Replay tab**: load one replay JSON, watch placements play back on the
  plains grid (Play/Pause, step, 1x–8x speed, click a placement to jump to it).
  Also accepts `?replay=<path>` and drag-and-drop.
- **Heatmap tab**: load a whole folder of replays and see where the bot places
  towers on average — yellow→red intensity per cell, with faction / outcome /
  tower / best-games (wave ≥ 18) filters and a top-10 cell list.

Run this after every model iteration to track progress.

### Training dashboard

`ml/desktop/training-dashboard.html` visualizes progress across eval rounds.
Open it directly in a browser (no server needed) — eval data from baseline
through eval-v5 is embedded, so it works immediately:

- **Overall trend**: win rate % and avg wave across rounds (dual-axis line chart).
- **Per-faction table**: wins/total per round, color-coded vs previous round
  (green = improved, red = regressed). Click a faction to expand its trend
  chart with per-round wins, avg wave, training examples, and val loss.
- **Key insights**: auto-generated bullets (biggest improver, regressions,
  factions still at 0%, val-loss-vs-wins mismatches).
- **Training data composition**: per-faction example counts and best val loss
  from the latest training run.

To update with newer evals: use "Load eval JSONs…" (multi-select eval-*.json
files), or serve the directory over HTTP and it will auto-load eval-*.json
files from the same folder. `?evals=eval-v6.json,eval-v5.json` also works.

## Recursive Self-Improvement

The pipeline can improve itself. After each eval:

```bash
# Analyze weaknesses and auto-modify generator + eval
python ml/desktop/recursive_improve.py --eval ml/desktop/eval-new.json

# This will:
# 1. Identify weakest factions (lowest win rate)
# 2. Modify generate_data.mts to oversample them 3x
# 3. Track what worked in ml/desktop/improve-history.json
# 4. Suggest next steps

# Then regenerate, retrain, re-eval:
node --import tsx ml/desktop/generate_data.mts --count 5000 --out ml/desktop/synthetic-v2.jsonl
python ml/desktop/combine_data.py --synthetic ml/desktop/synthetic-v2.jsonl --expert ml/placement-data.jsonl --out ml/desktop/combined-v2.jsonl
python ml/desktop/train_gpu.py --data ml/desktop/combined-v2.jsonl --out ml/desktop/models-v2/
node --import tsx ml/desktop/eval_set.mts --learned --out ml/desktop/eval-v2.json
node --import tsx ml/desktop/eval_set.mts --compare ml/desktop/eval-baseline.json ml/desktop/eval-v2.json

# Feed the comparison back into the loop:
python ml/desktop/recursive_improve.py --eval ml/desktop/eval-v2.json
```

The improver tracks which strategies (oversampling, eval hardening, etc.)
actually improve win rates and prioritizes what works. It's a simple
meta-learner — not magic, but it automates the "what should we try next?"
question.

## What you're training

A placement policy: given (board state, tower to place), where to put it.

**Input features** (17 per candidate cell — see `ml/desktop/model-architecture.html`
for the interactive diagram and explorer):
- Normalized position (col/36, row/26)
- Board region one-hots (left/mid/right, top/mid/bottom)
- Distance to nearest tower, tower density nearby
- Distance to nearest same-type tower
- Distance to creep path (plains: row 13) / 20
- Wave, tower count (global)
- Gold / 1000, tower cost / 500, lives / 100

**Architecture**: MLP 17 -> 128 -> 64 -> 1 with dropout 0.3.
Bigger than the CPU version (which was 13 -> 64 -> 32 -> 1).

**Loss**: Binary cross-entropy. Alex's chosen cell = 1, random alternatives = 0.

**Feature parity**: the 17 features must be computed identically in Python
(`ml/desktop/train_gpu.py`, `ml/train_placement.py`) and TypeScript
(`playtest/LearnedScorer.ts`, `src/systems/PlacementAdvisor.ts`). The order
is defined by `FEATURE_NAMES` in train_gpu.py. A cross-language parity test
(same board state in both) is the way to verify after any change.

**Gold/lives in training data**: all three headless generators
(`generate_data.mts`, `procgen_simulate.mts`, `directed_search.mts`) record
`gold` (ctx.budget) and `lives` (ctx.lives) at decision time, and
`combine_data.py` passes them through to the combined output. `train_gpu.py`
reads them via `ex.get('gold', 1000.0)` / `ex.get('lives', 100.0)`. The
augmenter (`augment_expert.py`) copies them unchanged with the rest of the
example dict. Legacy data (generated/captured before this change) lacks the
fields and defaults to full (1000/100) — near-constant until regenerated.
Tower cost and path distance are derived from data already present (tower
id, row), so they're informative on legacy data too. Remaining follow-up:
record gold/lives in the human capture format (`?capture=1` recordings).

**Stale models**: models in `playtest/models/` trained on the old 13-feature
set will NOT work with the 17-feature code — the TypeScript side detects
the `input_dim` mismatch, warns once, and returns neutral scores (0.5)
instead of NaN. Retrain + re-export after any feature change.

### Model architecture page

`ml/desktop/model-architecture.html` — open directly in a browser. Shows the
network diagram (with dropout layers), the full feature list with
explanations, and an interactive explorer: click any cell to see all 17
features with plain-English meanings, plus gold/lives/wave sliders. The
**model recommendations** toggle loads the real trained model
(`playtest/models/scorer-<faction>.json`) and scores every cell — top 5
outlined with scores, heatmap overlay. Needs HTTP serving for fetch
(`python3 -m http.server` from the repo root); from `file://` it offers a
manual file load instead. Old 13-feature models are supported (features are
sliced to the old layout).

### Imitation accuracy — does the model place like Alex?

```bash
python ml/desktop/imitation_accuracy.py --models ml/desktop/models/ [--faction void] [--limit 200]
```

For each expert placement, scores Alex's actual cell against every other
legal cell and reports how often his choice ranks top 1 / 3 / 5, per
faction and overall. Random guessing over ~900 cells would be ~0.1%.
Top-3/5 above ~50% means the model genuinely learned his style.

### Feature ablation — which features matter?

```bash
# Single feature (void, 50 epochs)
python ml/desktop/ablate.py --data ml/desktop/combined-v5.jsonl --feature gold

# Every group, ranked by val-loss delta
python ml/desktop/ablate.py --data ml/desktop/combined-v5.jsonl --all --faction psionic
```

Retrains with a feature (or group) zeroed out and compares best val loss
to the full-feature baseline. Same seeds for both runs, so deltas are
signal, not sampling noise. Models go to a temp dir — ablation never
clobbers production models. Groups: `position`, `col_region`
(`left_mid_right`), `row_region` (`top_mid_bottom`), `region`,
`min_dist`, `density`, `same_dist`, `path_dist`, `wave`, `tower_count`,
`gold`, `tower_cost`, `lives`. Deltas at 50 epochs are noisy — re-run
interesting ones with `--epochs 100+` before removing a feature for real.

## Expected results

With 10k synthetic + 790 expert examples:
- Should beat the small CPU model (which overfit on 790 alone)
- May approach hand-coded performance on some factions
- Won't beat Alex — but might discover useful variations

## Troubleshooting

- **CUDA out of memory**: Reduce --batch-size to 128 or 64
- **Slow generation**: Reduce --count, or run with fewer factions
- **Model not improving**: Check that expert data is included (should see "expert" in logs)
