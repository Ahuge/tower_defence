"""
Tower encoder: converts each tower into a feature vector capturing
"everything a tower contributes" — stats, efficiency, traits, upgrades.

This is the foundation for the tower-as-neuron model. Each tower
becomes a vector; the model learns how vectors combine.
"""
import json
import numpy as np
from pathlib import Path

# Trait vocabulary (from the game's trait system)
TRAITS = [
    'direct_damage', 'true_damage', 'splash_damage', 'slow_on_hit',
    'slow_aura', 'confuse_on_hit', 'armor_shred_on_hit', 'poison_dot',
    'firewall_link', 'conduit_link', 'faction_speed_aura', 'damage_aura',
    'rate_aura', 'range_aura', 'crit_aura', 'ramp_up', 'bonus_vs_boss',
    'bonus_vs_mage', 'bonus_vs_armored', 'mute_mage_aura',
]

def load_towers():
    """Load tower definitions via node (handles the TS module)."""
    import subprocess
    js = """
    const mod = await import('./src/data/TowerTypes.ts');
    const TT = mod.default?.TOWER_TYPES || mod.default;
    const out = {};
    for (const [id, t] of Object.entries(TT)) {
        out[id] = {
            cost: t.cost || 0,
            damage: t.damage || 0,
            range: t.range || 0,
            fireRate: t.fireRate || 1000,
            traits: (t.traits || []).map(x => x.id),
            upgrades: (t.upgrades || []).length,
            maxUpgradeDamage: Math.max(0, ...((t.upgrades || []).map(u => u.damage || 0))),
        };
    }
    console.log(JSON.stringify(out));
    """
    result = subprocess.run(
        ['node', '--import', 'tsx', '-e', js],
        cwd='/home/hatch/workspace/tower_defence',
        capture_output=True, text=True
    )
    return json.loads(result.stdout)

def tower_to_vector(tower, trait_to_idx):
    """Convert a tower to a feature vector."""
    # Base stats (normalized)
    cost = tower['cost'] / 800.0  # max ~800
    damage = tower['damage'] / 60.0  # max ~60
    rng = tower['range'] / 5.0  # max ~5
    # Fire rate: lower = faster. Convert to DPS-ish
    fire_rate = 1000.0 / max(100, tower['fireRate'])  # attacks per second-ish
    
    # Efficiency
    dps = tower['damage'] * fire_rate
    dps_per_gold = dps / max(1, tower['cost'])
    
    # Upgrade potential
    upgrade_levels = tower['upgrades'] / 5.0
    max_dmg = tower['maxUpgradeDamage'] / 60.0
    
    # Traits (multi-hot)
    trait_vec = np.zeros(len(trait_to_idx))
    for tr in tower['traits']:
        if tr in trait_to_idx:
            trait_vec[trait_to_idx[tr]] = 1.0
    
    # Combine: [cost, damage, range, fire_rate, dps, dps_per_gold,
    #           upgrade_levels, max_dmg, ...traits]
    base = np.array([cost, damage, rng, fire_rate, dps/100.0, 
                     dps_per_gold*10.0, upgrade_levels, max_dmg])
    return np.concatenate([base, trait_vec])

def build_dataset():
    """Create training data: builds -> outcomes."""
    towers = load_towers()
    trait_to_idx = {t: i for i, t in enumerate(TRAITS)}
    
    # Tower vectors
    tower_vecs = {}
    for tid, t in towers.items():
        tower_vecs[tid] = tower_to_vector(t, trait_to_idx)
    
    print(f"Loaded {len(tower_vecs)} towers")
    print(f"Feature dim: {len(next(iter(tower_vecs.values())))}")
    
    # Alex's winning builds (positive examples)
    builds = []
    for name in ['alex_mech_hard_human', 'alex_aliens_hard_human', 
                 'alex_psionic_hard_human', 'alex_harmonic_hard_human',
                 'alex_mech_normal_human']:
        path = Path(f'/home/hatch/workspace/tower_defence/ml/captured/{name}.jsonl')
        if not path.exists():
            continue
        from collections import Counter
        counts = Counter()
        for line in open(path):
            t = json.loads(line)
            if t['decisionKind'] == 'place':
                tid = t['decisionRaw'].get('towerId', '')
                counts[tid] += 1
        builds.append({'towers': dict(counts), 'win': 1, 'source': name})
    
    print(f"Alex builds: {len(builds)}")
    return tower_vecs, builds, trait_to_idx

if __name__ == '__main__':
    tower_vecs, builds, trait_to_idx = build_dataset()
    # Save for training
    np.save('/tmp/tower_vecs.npy', 
            np.array([tower_vecs[tid] for tid in sorted(tower_vecs.keys())]))
    with open('/tmp/tower_ids.json', 'w') as f:
        json.dump(sorted(tower_vecs.keys()), f)
    with open('/tmp/alex_builds.json', 'w') as f:
        json.dump(builds, f)
    print("Saved to /tmp/")
