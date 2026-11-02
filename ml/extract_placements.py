"""
Extract imitation learning data from Alex's Hard-win replays.

For each tower placement, produces:
- board: list of (towerId, col, row) for all previously placed towers
- towerId: the tower being placed
- chosen: (col, row) that Alex chose
- wave: current wave
- faction: faction being played

Output: ml/placement-data.jsonl, one JSON per placement.
"""

import json
from pathlib import Path

CAPTURE_DIR = Path('ml/captured')
OUTPUT = Path('ml/placement-data.jsonl')

# Only Hard wins — the expert demonstrations
FILES = [
    'alex_void_cypherpunk_chaos.jsonl',  # void, cypherpunk, chaos wins
    'alex_military_rework.jsonl',         # military win
    'alex_chaos_2.jsonl',                 # chaos win
    'alex_psionic_hard_human.jsonl',      # psionic win
    'alex_mech_hard_human.jsonl',         # mech win
    'alex_harmonic_hard_human.jsonl',     # harmonic win
    'alex_aliens_hard_human.jsonl',       # aliens win
    'alex_infernal_econ.jsonl',           # arcane, celestial, infernal wins
    'alex_military_nature.jsonl',         # nature win
]

def extract():
    examples = []
    for fname in FILES:
        path = CAPTURE_DIR / fname
        if not path.exists():
            print(f"Skip missing: {fname}")
            continue
        # Group by match
        matches = {}
        for line in open(path):
            r = json.loads(line)
            # Only Hard difficulty wins
            if r.get('difficulty') != 'hard':
                continue
            if not r.get('won'):
                continue
            mid = str(r['matchId'])
            if mid not in matches:
                matches[mid] = {'faction': r['faction'], 'turns': []}
            matches[mid]['turns'].append(r)
        
        for mid, m in matches.items():
            # Sort by turn order, replay placements
            turns = sorted(m['turns'], key=lambda t: t['turnIdx'])
            board = []  # (towerId, col, row)
            for t in turns:
                if t.get('decisionKind') != 'place':
                    continue
                raw = t.get('decisionRaw', {})
                if raw.get('col') is None:
                    continue
                tower_id = raw['towerId']
                col, row = raw['col'], raw['row']
                examples.append({
                    'faction': m['faction'],
                    'matchId': mid,
                    'wave': t['wave'],
                    'towerId': tower_id,
                    'chosen': [col, row],
                    'board': [list(b) for b in board],  # all previous placements
                })
                board.append((tower_id, col, row))
    
    print(f"Extracted {len(examples)} placement examples")
    # Stats by faction
    from collections import Counter
    c = Counter(e['faction'] for e in examples)
    for faction, n in sorted(c.items()):
        print(f"  {faction}: {n}")
    
    with open(OUTPUT, 'w') as f:
        for e in examples:
            f.write(json.dumps(e) + '\n')
    print(f"Wrote {OUTPUT}")

if __name__ == '__main__':
    extract()
