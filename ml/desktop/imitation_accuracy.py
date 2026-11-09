"""
imitation_accuracy.py — Does the model actually place like Alex?

For each expert placement in ml/placement-data.jsonl, scores the ACTUAL
placed cell against every other legal candidate cell on that board state
using the trained model, and reports how often Alex's choice ranks in the
model's top 1 / top 3 / top 5.

This is the direct test of "did the model learn Alex's style" — val loss
only says the model separates chosen cells from random ones, not that it
would pick the same cell Alex picked.

Usage:
    python ml/desktop/imitation_accuracy.py --models ml/desktop/models/ [--faction void] [--limit 200]

Notes:
- Candidate cells = all cells not occupied and not on the path (plains row
  13). Lakes/decorations aren't excluded — the replay data doesn't record
  them — so top-k rates are slightly pessimistic (the model may rank an
  unplaceable lake cell above Alex's pick).
- Models trained on the old 13-feature or 17-feature sets are supported:
  features are computed in the current 11-feature layout and expanded
  with the region one-hots for older models.
- Gold/lives in the expert data default to full (1000/100) when the example
  doesn't record them; tower cost comes from the TOWER_COSTS lookup.
"""

import json
import math
import argparse
from pathlib import Path
from collections import defaultdict

import torch
import torch.nn as nn

import sys
sys.path.insert(0, str(Path(__file__).parent))
from train_gpu import (  # noqa: E402
    cell_features, board_features, TOWER_COSTS, ScorerMLP, COLS, ROWS, PATH_ROW,
)

# Feature layouts (current = 11, region one-hots removed 2026-11-06).
# New 11:  [col, row, min_dist, density, same_dist, path_dist, wave, count, gold, cost, lives]
# Old 17:  [col, row, left, mid_col, right, top, mid_row, bottom, min_dist, density, same_dist, path_dist, wave, count, gold, cost, lives]
# Old 13:  [col, row, left, mid_col, right, top, mid_row, bottom, min_dist, density, same_dist, wave, count]
def expand_features(f11, col, row):
    """Expand an 11-dim feature vector to a legacy layout by re-inserting
    the region one-hots (derivable from col/row)."""
    onehots = [
        1.0 if col < 12 else 0.0,
        1.0 if 12 <= col < 24 else 0.0,
        1.0 if col >= 24 else 0.0,
        1.0 if row < 9 else 0.0,
        1.0 if 9 <= row < 17 else 0.0,
        1.0 if row >= 17 else 0.0,
    ]
    return {
        11: f11,
        17: f11[:2] + onehots + f11[2:],
        13: f11[:2] + onehots + f11[2:5] + f11[6:8],
    }


def legal_cells(board):
    occupied = {(bc, br) for _, bc, br in board}
    return [(c, r) for r in range(ROWS) for c in range(COLS)
            if (c, r) not in occupied and r != PATH_ROW]


def score_all(model, feats_list, device):
    """Batched forward pass over all candidate feature vectors."""
    with torch.no_grad():
        x = torch.tensor(feats_list, dtype=torch.float32).to(device)
        return model(x).cpu().flatten().tolist()


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--models', required=True, help='Dir with scorer-<faction>.pt files')
    p.add_argument('--data', default='ml/placement-data.jsonl')
    p.add_argument('--faction', default=None, help='Only evaluate one faction')
    p.add_argument('--limit', type=int, default=0, help='Max examples per faction (0 = all)')
    args = p.parse_args()

    model_dir = Path(args.models)
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f'Device: {device}')

    examples = [json.loads(l) for l in open(args.data)]
    by_faction = defaultdict(list)
    for ex in examples:
        by_faction[ex['faction']].append(ex)
    factions = sorted(by_faction)
    if args.faction:
        factions = [args.faction] if args.faction in by_faction else []
        if not factions:
            print(f'No examples for faction {args.faction}')
            return

    print(f'{"faction":<12} {"n":>5} {"top1":>6} {"top3":>6} {"top5":>6} {"mean rank":>9}')
    print('-' * 52)

    overall = {'n': 0, 'top1': 0, 'top3': 0, 'top5': 0, 'rank_sum': 0}
    for faction in factions:
        pt = model_dir / f'scorer-{faction}.pt'
        if not pt.exists():
            print(f'{faction:<12} no model at {pt} — skipping')
            continue
        state = torch.load(pt, map_location='cpu', weights_only=True)
        input_dim = state['net.0.weight'].shape[1]
        model = ScorerMLP(input_dim).to(device)
        model.load_state_dict(state)
        model.eval()
        if input_dim not in (11, 13, 17):
            print(f'{faction:<12} unexpected input_dim {input_dim} — skipping')
            continue

        exs = by_faction[faction]
        if args.limit:
            exs = exs[:args.limit]
        top1 = top3 = top5 = 0
        rank_sum = 0
        evaluated = 0
        for ex in exs:
            board = ex['board']
            tower_id = ex['towerId']
            wave = ex['wave']
            gold = ex.get('gold', 1000.0)
            lives = ex.get('lives', 100.0)
            tower_cost = TOWER_COSTS.get(tower_id, 50)
            chosen = tuple(ex['chosen'])

            cands = legal_cells(board)
            if chosen not in cands:
                # Chosen cell is on the path or occupied in our approximation
                # (e.g. a branch placement) — skip rather than miscount.
                continue
            feats = []
            for (c, r) in cands:
                f11 = (cell_features(c, r, board, tower_id) +
                       board_features(board, wave, gold, lives, tower_cost))
                feats.append(expand_features(f11, c, r)[input_dim])
            scores = score_all(model, feats, device)
            chosen_idx = cands.index(chosen)
            evaluated += 1
            rank = 1 + sum(1 for s in scores if s > scores[chosen_idx])
            rank_sum += rank
            if rank <= 1:
                top1 += 1
            if rank <= 3:
                top3 += 1
            if rank <= 5:
                top5 += 1

        n = evaluated
        if n == 0:
            print(f'{faction:<12} no evaluable examples — skipping')
            continue
        print(f'{faction:<12} {n:>5} {top1 / n:>5.1%} {top3 / n:>5.1%} {top5 / n:>5.1%} {rank_sum / n:>9.1f}')
        overall['n'] += n
        overall['top1'] += top1
        overall['top3'] += top3
        overall['top5'] += top5
        overall['rank_sum'] += rank_sum

    n = overall['n']
    if n:
        print('-' * 52)
        print(f'{"OVERALL":<12} {n:>5} {overall["top1"] / n:>5.1%} {overall["top3"] / n:>5.1%} {overall["top5"] / n:>5.1%} {overall["rank_sum"] / n:>9.1f}')
        print()
        print('Interpretation: top-1 is the share of Alex placements the model')
        print('would pick first. Random guessing over ~900 cells would be ~0.1%.')
        print('Top-3/5 above ~50% means the model has genuinely learned his style;')
        print('below ~20% means it is mostly memorizing the training distribution.')


if __name__ == '__main__':
    main()
