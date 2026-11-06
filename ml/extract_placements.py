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
    'alex_void_2026-11-04_1793807584275.jsonl',  # void win (gambler opening)
    'alex_void_2026-11-04_1793808508111.jsonl',  # void win (pure gamblers)
    'alex_celestial_2026-11-04_1793808114275.jsonl',  # celestial win (144 acolytes)
    'alex_celestial_2026-11-04_1793808983155.jsonl',  # celestial win (acolytes + smites)
    'alex_celestial_2026-11-06_1793925216433.jsonl',  # celestial win (Martyr/Prophet rework)
    'alex_celestial_2026-11-06_1793925909289.jsonl',  # celestial win (Martyr/Prophet rework)
    'alex_military_2026-11-06_1793934774558.jsonl',  # military win (sniper/artillery)
    'alex_celestial_2026-11-06_1793824905407_win.jsonl',  # celestial win (76 acolytes)
    'alex_mechanical_2026-11-06_1793937065902_win.jsonl',  # mech win (mortar heavy)
    'alex_mechanical_2026-11-06_1793937875897_win.jsonl',  # mech win (turret/wall)
    'alex_void_2026-11-06_1793941040026_win.jsonl',  # void win (siphon/gambler/spike)
    'alex_void_2026-11-06_1793941705026_win.jsonl',  # void win (90 spikes!)
    'alex_cypherpunk_2026-11-06_1793942302569_win.jsonl',  # cypherpunk win (188 pings)
    'alex_cypherpunk_2026-11-06_1793942710094_win.jsonl',  # cypherpunk win (mixed)
    'alex_nature_2026-11-06_1793944333260_win.jsonl',  # nature win (bramble/root/blossom)
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
            # Skip capture-v2 event/summary rows (no turnIdx)
            if r.get('rowType') not in (None, 'turn'):
                continue
            if 'turnIdx' not in r:
                continue
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
