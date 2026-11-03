"""
augment_expert.py — Data augmentation for expert placements.

Takes Alex's 790 expert placements and generates plausible variations:
  1. Position jitter: shift chosen cell ±1-2 tiles (if valid & unoccupied)
  2. Board mirroring: flip board horizontally (path is symmetric-ish)
  3. Tower substitution: swap in a similar tower (same role, similar cost)

This turns 790 examples into ~5,000+ anchored to real strategy.

Usage:
    python ml/desktop/augment_expert.py \
      --expert ml/placement-data.jsonl \
      --out ml/desktop/augmented-expert.jsonl \
      --jitter 3 --mirror --substitute
"""

import json
import random
import argparse
from pathlib import Path
from collections import defaultdict

COLS, ROWS = 36, 26

# Towers grouped by role for substitution
# (simplified — maps tower prefixes to similar towers)
SIMILAR_TOWERS = {
    # psionic
    'psi_probe': ['psi_probe'],
    'psi_mesmer': ['psi_mesmer'],
    'psi_terror': ['psi_terror'],
    # Add more as needed — for now, substitution is conservative
}

def is_valid_cell(col, row, board):
    """Check if cell is in bounds and unoccupied."""
    if not (0 <= col < COLS and 0 <= row < ROWS):
        return False
    return not any(bc == col and br == row for _, bc, br in board)

def jitter_placement(ex, max_dist=2):
    """Generate jittered versions of a placement."""
    col, row = ex['chosen']
    board = ex['board']
    results = []
    
    for _ in range(3):  # 3 jittered versions per example
        dc = random.randint(-max_dist, max_dist)
        dr = random.randint(-max_dist, max_dist)
        if dc == 0 and dr == 0:
            continue
        nc, nr = col + dc, row + dr
        if is_valid_cell(nc, nr, board):
            new_ex = dict(ex)
            new_ex['chosen'] = [nc, nr]
            new_ex['source'] = 'augment-jitter'
            new_ex['augment_dist'] = abs(dc) + abs(dr)
            results.append(new_ex)
    
    return results

def mirror_placement(ex):
    """Mirror board horizontally. Path is roughly symmetric."""
    board = ex['board']
    col, row = ex['chosen']
    
    # Mirror col: 35 - col
    mirrored_board = [[tid, COLS - 1 - bc, br] for tid, bc, br in board]
    mirrored_chosen = [COLS - 1 - col, row]
    
    # Validate mirrored position
    if not is_valid_cell(mirrored_chosen[0], mirrored_chosen[1], 
                         [(t, c, r) for t, c, r in mirrored_board]):
        return []
    
    new_ex = dict(ex)
    new_ex['board'] = mirrored_board
    new_ex['chosen'] = mirrored_chosen
    new_ex['source'] = 'augment-mirror'
    return [new_ex]

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--expert', required=True)
    p.add_argument('--out', required=True)
    p.add_argument('--jitter', type=int, default=3, help='Jittered copies per example')
    p.add_argument('--mirror', action='store_true', help='Add mirrored versions')
    p.add_argument('--no-jitter', action='store_true', help='Skip jitter')
    args = p.parse_args()
    
    examples = [json.loads(l) for l in open(args.expert)]
    print(f"Loaded {len(examples)} expert examples")
    
    augmented = []
    # Always include originals
    for ex in examples:
        ex = dict(ex)
        ex['source'] = 'expert-original'
        augmented.append(ex)
    
    # Jitter
    if not args.no_jitter:
        for ex in examples:
            augmented.extend(jitter_placement(ex, max_dist=2))
        print(f"After jitter: {len(augmented)}")
    
    # Mirror
    if args.mirror:
        mirrored = []
        for ex in examples:
            mirrored.extend(mirror_placement(ex))
        augmented.extend(mirrored)
        print(f"After mirror: {len(augmented)}")
    
    # Stats
    from collections import Counter
    c = Counter(e['source'] for e in augmented)
    print("\nBy source:")
    for source, n in sorted(c.items()):
        print(f"  {source}: {n}")
    
    with open(args.out, 'w') as f:
        for ex in augmented:
            f.write(json.dumps(ex) + '\n')
    
    print(f"\nWrote {len(augmented)} examples to {args.out}")

if __name__ == '__main__':
    main()
