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
    p.add_argument('--synthetic', required=True, help='Synthetic placements JSONL')
    p.add_argument('--expert', required=True, help='Expert placements JSONL (ml/placement-data.jsonl)')
    p.add_argument('--out', required=True, help='Output combined JSONL')
    p.add_argument('--expert-weight', type=int, default=10, help='How many times to repeat expert data')
    args = p.parse_args()
    
    examples = []
    
    # Load synthetic (weight 1)
    synth_count = 0
    for line in open(args.synthetic):
        r = json.loads(line)
        # Convert to training format
        examples.append({
            'faction': r['faction'],
            'towerId': r['towerId'],
            'chosen': r['chosen'],
            'board': r['board'],
            'wave': r['wave'],
            'source': 'synthetic',
        })
        synth_count += 1
    
    # Load expert (weight N)
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
    
    print(f"Synthetic: {synth_count}")
    print(f"Expert (x{args.expert_weight}): {expert_count}")
    print(f"Total: {len(examples)}")
    
    # Stats by faction
    c = Counter(e['faction'] for e in examples)
    print("\nBy faction:")
    for faction, n in sorted(c.items()):
        print(f"  {faction}: {n}")
    
    with open(args.out, 'w') as f:
        for e in examples:
            f.write(json.dumps(e) + '\n')
    
    print(f"\nWrote {args.out}")

if __name__ == '__main__':
    main()
