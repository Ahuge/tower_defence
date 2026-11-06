"""
ablate.py — Which input features actually matter?

Retrains one faction's model with a feature (or feature group) zeroed out
and compares best val loss against the full-feature baseline. A big val
loss increase when a feature is removed means the model was relying on it.

Uses train_gpu.py's training code (same seeds for baseline and ablated
runs, so the train/val split and negative samples are identical — deltas
are signal, not sampling noise). Models are written to a scratch dir, NOT
to the real models dir, so ablation never clobbers production models.

Usage:
    # Single feature, void, 50 epochs
    python ml/desktop/ablate.py --data ml/desktop/combined-v5.jsonl --feature gold

    # Whole group (e.g. all region one-hots)
    python ml/desktop/ablate.py --data ml/desktop/combined-v5.jsonl --feature region

    # Every group, ranked by importance
    python ml/desktop/ablate.py --data ml/desktop/combined-v5.jsonl --all --faction psionic

    # More epochs for more stable deltas (slower)
    python ml/desktop/ablate.py --data ml/desktop/combined-v5.jsonl --all --epochs 100

Feature groups (indices into FEATURE_NAMES):
    position      col, row
    col_region    left, mid_col, right        (alias: left_mid_right)
    row_region    top, mid_row, bottom        (alias: top_mid_bottom)
    region        all 6 region one-hots
    min_dist      distance to nearest tower
    density       3x3 tower density
    same_dist     distance to nearest same-type tower
    path_dist     distance to creep path
    wave          wave / 20
    tower_count   towers placed / 100
    gold          gold / 500
    tower_cost    tower cost / 500
    lives         lives / 20
"""

import argparse
import json
import tempfile
from pathlib import Path

import torch

import sys
sys.path.insert(0, str(Path(__file__).parent))
from train_gpu import FEATURE_NAMES, train_faction  # noqa: E402

GROUPS = {
    'position': [0, 1],
    'col_region': [2, 3, 4],
    'left_mid_right': [2, 3, 4],
    'row_region': [5, 6, 7],
    'top_mid_bottom': [5, 6, 7],
    'region': [2, 3, 4, 5, 6, 7],
    'min_dist': [8],
    'density': [9],
    'same_dist': [10],
    'path_dist': [11],
    'wave': [12],
    'tower_count': [13],
    'gold': [14],
    'tower_cost': [15],
    'lives': [16],
}

# Single features by name (for --feature gold etc. without group syntax).
for i, name in enumerate(FEATURE_NAMES):
    GROUPS.setdefault(name, [i])


def run_ablation(faction, examples, device, epochs, batch_size, out_dir, zero):
    """Train one faction with `zero` feature indices forced to 0. Returns best val loss."""
    return train_faction(faction, examples, device, epochs, batch_size, out_dir,
                         zero_features=set(zero) if zero else None)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--data', required=True, help='Combined training JSONL')
    p.add_argument('--faction', default='void')
    p.add_argument('--feature', default=None,
                   help='Feature or group to ablate (see GROUPS). Ignored with --all.')
    p.add_argument('--all', action='store_true', help='Ablate every group, ranked by delta')
    p.add_argument('--epochs', type=int, default=50)
    p.add_argument('--batch-size', type=int, default=256)
    args = p.parse_args()

    if not args.all and args.feature not in GROUPS:
        print(f'Unknown feature {args.feature!r}. Known: {sorted(GROUPS)}')
        return

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f'Device: {device}')

    print(f'Loading {args.data}...')
    examples = [json.loads(l) for l in open(args.data)]
    faction_ex = [e for e in examples if e['faction'] == args.faction]
    print(f'{args.faction}: {len(faction_ex)} examples')
    if len(faction_ex) < 50:
        print('Too few examples to ablate.')
        return

    targets = list(GROUPS) if args.all else [args.feature]
    # Deduplicate aliases (left_mid_right == col_region etc.)
    seen = set()
    uniq_targets = []
    for t in targets:
        key = tuple(GROUPS[t])
        if key in seen:
            continue
        seen.add(key)
        uniq_targets.append(t)

    with tempfile.TemporaryDirectory() as tmp:
        out_dir = Path(tmp)
        print(f'\nBaseline (all features), {args.epochs} epochs...')
        baseline = run_ablation(args.faction, examples, device, args.epochs,
                                args.batch_size, out_dir, zero=None)
        print(f'  baseline best val_loss={baseline:.4f}\n')

        results = []
        for name in uniq_targets:
            idx = GROUPS[name]
            names = [FEATURE_NAMES[i] for i in idx]
            print(f'Ablating {name} ({", ".join(names)})...')
            val = run_ablation(args.faction, examples, device, args.epochs,
                               args.batch_size, out_dir, zero=idx)
            delta = val - baseline
            results.append((name, idx, val, delta))
            print(f'  {name}: val_loss={val:.4f} (delta {delta:+.4f})\n')

    print(f'{"feature":<16} {"val_loss":>9} {"delta":>8}  interpretation')
    print('-' * 64)
    for name, idx, val, delta in sorted(results, key=lambda r: -r[3]):
        if delta > 0.02:
            interp = 'MATTERS — model relies on it'
        elif delta > 0.005:
            interp = 'helps a little'
        elif delta > -0.005:
            interp = 'neutral — removable'
        else:
            interp = 'hurts?! (noise or the feature misleads)'
        print(f'{name:<16} {val:>9.4f} {delta:>+8.4f}  {interp}')
    print()
    print('Caveat: deltas at 50 epochs are noisy. Re-run interesting ones with')
    print('--epochs 100+ before removing a feature for real.')


if __name__ == '__main__':
    main()
