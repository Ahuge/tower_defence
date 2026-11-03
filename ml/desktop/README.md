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

### Step 3: Train on GPU (~30-60 min on 4080)

```bash
source venv-gpu/bin/activate
python ml/desktop/train_gpu.py \
  --data ml/desktop/combined.jsonl \
  --epochs 100 \
  --batch-size 256 \
  --out ml/desktop/models/
```

Uses CUDA automatically if available. The 4080 should train 100 epochs in under an hour.

### Step 4: Export for game use

```bash
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

Run this after every model iteration to track progress.

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

**Input features** (per candidate cell):
- Normalized position (col/36, row/26)
- Board region (left/mid/right, top/mid/bottom)
- Distance to nearest tower, tower density nearby
- Distance to nearest same-type tower
- Wave, tower count (global)

**Architecture**: MLP 14 -> 128 -> 64 -> 1 with dropout.
Bigger than the CPU version (which was 14 -> 64 -> 32 -> 1).

**Loss**: Binary cross-entropy. Alex's chosen cell = 1, random alternatives = 0.

## Expected results

With 10k synthetic + 790 expert examples:
- Should beat the small CPU model (which overfit on 790 alone)
- May approach hand-coded performance on some factions
- Won't beat Alex — but might discover useful variations

## Troubleshooting

- **CUDA out of memory**: Reduce --batch-size to 128 or 64
- **Slow generation**: Reduce --count, or run with fewer factions
- **Model not improving**: Check that expert data is included (should see "expert" in logs)
