"""
combine_data.py — Merge synthetic and expert placement data.

Expert data (Alex's replays) gets higher weight because it's higher quality.
"""

import json
import argparse
from pathlib import Path
from collections import Counter

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--synthetic', required=False, default=None, help='Synthetic placements JSONL')
    p.add_argument('--expert', required=False, default=None, help='Expert placements JSONL (ml/placement-data.jsonl)')
    p.add_argument('--augmented', required=False, default=None, help='Augmented expert JSONL (from augment_expert.py)')
    p.add_argument('--procgen', required=False, default=None, help='Proc gen JSONL (from procgen_simulate.mts)')
    p.add_argument('--directed', required=False, default=None, help='Directed search JSONL (from directed_search.mts)')
    p.add_argument('--out', required=True, help='Output combined JSONL')
    p.add_argument('--expert-weight', type=int, default=10, help='How many times to repeat expert data')
    p.add_argument('--augment-weight', type=int, default=3, help='Weight for augmented expert data')
    p.add_argument('--procgen-weight', type=int, default=2, help='Weight for proc gen data (wins only)')
    p.add_argument('--directed-weight', type=int, default=5, help='Weight for directed search data (improved variations)')
    args = p.parse_args()
    
    examples = []
    
    # Load synthetic (weight 1)
    if args.synthetic:
        synth_count = 0
        for line in open(args.synthetic):
            r = json.loads(line)
            examples.append({
                'faction': r['faction'],
                'towerId': r['towerId'],
                'chosen': r['chosen'],
                'board': r['board'],
                'wave': r['wave'],
                'source': 'synthetic',
            })
            synth_count += 1
        print(f"Synthetic: {synth_count}")
    
    # Load expert (weight N)
    if args.expert:
        expert_count = 0
        for line in open(args.expert):
            r = json.loads(line)
            for _ in range(args.expert_weight):
                examples.append({
                    'faction': r['faction'],
                    'towerId': r['towerId'],
                    'chosen': r['chosen'],
                    'board': r['board'],
                    'wave': r['wave'],
                    'source': 'expert',
                })
                expert_count += 1
        print(f"Expert (x{args.expert_weight}): {expert_count}")
    
    # Load augmented expert (weight M)
    if args.augmented:
        aug_count = 0
        for line in open(args.augmented):
            r = json.loads(line)
            for _ in range(args.augment_weight):
                examples.append({
                    'faction': r['faction'],
                    'towerId': r['towerId'],
                    'chosen': r['chosen'],
                    'board': r['board'],
                    'wave': r['wave'],
                    'source': r.get('source', 'augmented'),
                })
                aug_count += 1
        print(f"Augmented (x{args.augment_weight}): {aug_count}")
    
    # Load proc gen (wins only, weight P)
    # Losses are skipped — a placement in a losing game isn't necessarily bad
    if args.procgen:
        proc_count = 0
        proc_skipped = 0
        for line in open(args.procgen):
            r = json.loads(line)
            if not r.get('won', False):
                proc_skipped += 1
                continue
            for _ in range(args.procgen_weight):
                examples.append({
                    'faction': r['faction'],
                    'towerId': r['towerId'],
                    'chosen': r['chosen'],
                    'board': r['board'],
                    'wave': r['wave'],
                    'source': f"procgen-{r.get('pattern', 'unknown')}",
                })
                proc_count += 1
        print(f"Proc gen wins (x{args.procgen_weight}): {proc_count} (skipped {proc_skipped} losses)")
    
    # Load directed search (improved variations — these survived longer than baseline)
    # Weight higher because they're targeted discoveries, not random
    if args.directed:
        dir_count = 0
        for line in open(args.directed):
            r = json.loads(line)
            # Keep all directed results — even non-wins are improvements over baseline
            for _ in range(args.directed_weight):
                examples.append({
                    'faction': r['faction'],
                    'towerId': r['towerId'],
                    'chosen': r['chosen'],
                    'board': r['board'],
                    'wave': r['wave'],
                    'source': 'directed-search',
                })
                dir_count += 1
        print(f"Directed search (x{args.directed_weight}): {dir_count}")
    
    # Stats by faction
    c = Counter(e['faction'] for e in examples)
    print("\nBy faction:")
    for faction, n in sorted(c.items()):
        print(f"  {faction}: {n}")
    
    # Stats by source
    s = Counter(e['source'] for e in examples)
    print("\nBy source:")
    for source, n in sorted(s.items()):
        print(f"  {source}: {n}")
    
    with open(args.out, 'w') as f:
        for e in examples:
            f.write(json.dumps(e) + '\n')
    
    print(f"\nWrote {args.out}")

if __name__ == '__main__':
    main()
