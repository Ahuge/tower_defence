"""
Baseline placement scorer: MLP that learns Alex's positioning preferences.

For each placement, we extract features for the chosen cell vs random alternatives,
and train the model to score Alex's choice higher.

Features per (board, cell, tower):
- Cell: distance to path, path coverage estimate, board region
- Board: tower density nearby, distance to nearest tower of each role
- Tower: cost, range (from tower def)
- Game: wave (normalized)

This is a starting point — simple MLP, per-faction training.
"""

import json
import math
import random
from pathlib import Path
from collections import defaultdict

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader

DATA = Path('ml/placement-data.jsonl')
MODEL_DIR = Path('ml/placement-models')
MODEL_DIR.mkdir(exist_ok=True)

# Grid dimensions
COLS, ROWS = 36, 26

# Plains map path is row 13. See ml/desktop/train_gpu.py for the canonical
# feature list — this file mirrors it (17 features).
PATH_ROW = 13

TOWER_COSTS = {
    'acolyte_blessing_aura': 45, 'adjacency_buff': 55, 'alien_acid': 100, 'alien_brood_mother': 80,
    'alien_hive_spire': 180, 'alien_overmind': 700, 'alien_spitter': 12, 'alien_stinger': 25,
    'alien_swarm_node': 60, 'alien_swarmling': 15, 'arcane_bolt': 25, 'arcane_conduit': 40,
    'arcane_drain': 120, 'arcane_focus': 90, 'arcane_frost': 35, 'arcane_meteor': 200,
    'arcane_nova': 700, 'arcane_storm': 55, 'arcane_ult_throne': 0, 'armor_scaling_damage': 70,
    'armor_shred_on_hit': 250, 'arrow': 20, 'barbed_wire': 30, 'bonus_vs_boss': 90,
    'bonus_vs_mage': 130, 'burn_dot': 160, 'cannon': 35, 'celestial_absolution': 600,
    'celestial_acolyte': 25, 'celestial_martyr': 120, 'celestial_prophet': 180, 'celestial_smite': 80,
    'celestial_ward': 40, 'chain_damage': 150, 'coalition_root': 100, 'coalition_wall': 10,
    'commander_aura': 70, 'conduit_link': 90, 'confuse_on_hit': 50, 'crit_aura': 75,
    'crit_chance': 100, 'cyber_backdoor': 90, 'cyber_ddos': 150, 'cyber_firewall': 35,
    'cyber_ping': 15, 'cyber_rootkit': 300, 'cyber_virus': 55, 'cyber_zeroday': 800,
    'damage_amp_on_hit': 180, 'damage_aura': 35, 'damage_variance': 40, 'decay_per_wave': 50,
    'direct_damage': 40, 'faction_speed_aura': 55, 'firewall_link': 40, 'gold_on_hit': 55,
    'gold_per_kill_range': 65, 'hack_reverse': 80, 'harmonic_amplifier': 30, 'harmonic_conduit': 100,
    'harmonic_crescendo': 650, 'harmonic_critical_mass': 80, 'harmonic_quickener': 40, 'harmonic_reach': 50,
    'harmonic_resonator': 20, 'infernal_apocalypse': 900, 'infernal_bomber': 20, 'infernal_hellfire': 45,
    'infernal_immolate': 200, 'infernal_imp': 12, 'infernal_soul_drain': 90, 'jackpot': 30,
    'life_execute': 10, 'life_on_kill': 30, 'life_scaling': 150, 'mech_flamethrower': 40,
    'mech_mortar': 120, 'mech_piercer': 45, 'mech_railgun': 300, 'mech_shredder': 150,
    'mech_tesla': 80, 'mech_titan': 800, 'mech_turret': 30, 'mech_wall': 8,
    'mil_artillery': 220, 'mil_brawler': 55, 'mil_commander': 750, 'mil_heavy': 120,
    'mil_rifleman': 40, 'mil_sandbag': 4, 'mil_sniper': 85, 'mil_wire': 25,
    'mobile_unit': 15, 'nature_blossom': 60, 'nature_bramble': 12, 'nature_elder': 450,
    'nature_razor_bramble': 15, 'nature_root': 25, 'nature_spore': 100, 'nature_sunroot': 140,
    'nature_vine': 160, 'nature_viper': 30, 'pierce_delivery': 250, 'piercer': 60,
    'poison_dot': 90, 'psi_mesmer': 45, 'psi_mind_spike': 150, 'psi_overmind': 750,
    'psi_probe': 20, 'psi_terror': 80, 'ramp_up': 35, 'range_aura': 55,
    'rate_aura': 45, 'razor': 25, 'root_on_hit': 120, 'siphons_pylons': 80,
    'slow': 25, 'slow_aura': 75, 'slow_on_hit': 40, 'sniper': 50,
    'splash_damage': 100, 'teleport_delivery': 100, 'true_damage': 25, 'virus_spread': 60,
    'void_gambler': 15, 'void_oblivion': 900, 'void_rift': 120, 'void_siphon': 50,
    'void_spike': 30,
}


# Canonical feature order — MUST match ml/desktop/train_gpu.py, the
# TypeScript LearnedScorer and the PlacementAdvisor.
FEATURE_NAMES = [
    'col', 'row', 'left', 'mid_col', 'right', 'top', 'mid_row', 'bottom',
    'min_dist', 'density', 'same_dist', 'path_dist',
    'wave', 'tower_count', 'gold', 'tower_cost', 'lives',
]

def load_examples():
    examples = []
    for line in open(DATA):
        examples.append(json.loads(line))
    return examples

def cell_features(col, row, board, tower_id):
    """Hand-engineered spatial features for a candidate cell."""
    feats = []
    # Normalized position
    feats.append(col / COLS)
    feats.append(row / ROWS)
    # Board region one-hots: left/right, top/mid/bottom
    feats.append(1.0 if col < 12 else 0.0)  # left third
    feats.append(1.0 if 12 <= col < 24 else 0.0)  # middle third
    feats.append(1.0 if col >= 24 else 0.0)  # right third
    feats.append(1.0 if row < 9 else 0.0)  # top third
    feats.append(1.0 if 9 <= row < 17 else 0.0)  # middle third
    feats.append(1.0 if row >= 17 else 0.0)  # bottom third
    
    # Distance to nearest tower (any)
    if board:
        min_dist = min(math.hypot(col - bc, row - br) for _, bc, br in board)
        feats.append(min(min_dist / 10.0, 1.0))
        # Tower density in 3x3 neighborhood
        nearby = sum(1 for _, bc, br in board 
                     if abs(bc - col) <= 1 and abs(br - row) <= 1)
        feats.append(min(nearby / 5.0, 1.0))
        # Distance to nearest same-type tower
        same = [b for b in board if b[0] == tower_id]
        if same:
            d = min(math.hypot(col - bc, row - br) for _, bc, br in same)
            feats.append(min(d / 10.0, 1.0))
        else:
            feats.append(1.0)  # no same-type yet
    else:
        feats.extend([1.0, 0.0, 1.0])  # empty board

    # Distance to the creep path (plains: full row 13), / 20 capped at 1.
    feats.append(min(abs(row - PATH_ROW) / 20.0, 1.0))

    return feats

def board_features(board, wave, gold=500.0, lives=20.0, tower_cost=50.0):
    """Global board state features. gold/lives default to full for legacy
    examples that don't record them (see train_gpu.py)."""
    return [
        wave / 20.0,
        min(len(board) / 100.0, 1.0),  # tower count normalized
        min(gold / 500.0, 1.0),
        min(tower_cost / 500.0, 1.0),
        min(lives / 20.0, 1.0),
    ]

class PlacementDataset(Dataset):
    def __init__(self, examples, neg_samples=5):
        self.pairs = []
        for ex in examples:
            board = ex['board']
            tower_id = ex['towerId']
            chosen_col, chosen_row = ex['chosen']
            wave = ex['wave']
            
            gold = ex.get('gold', 500.0)
            lives = ex.get('lives', 20.0)
            tower_cost = TOWER_COSTS.get(tower_id, 50)
            # Positive example
            pos_feats = (cell_features(chosen_col, chosen_row, board, tower_id) +
                         board_features(board, wave, gold, lives, tower_cost))
            self.pairs.append((pos_feats, 1.0))
            
            # Negative examples: random other cells
            # (In practice, we'd use actual candidate cells, but we don't have
            # them in the replay data. Random cells are a reasonable proxy.)
            for _ in range(neg_samples):
                # Sample a random cell not occupied and not the chosen one
                for _ in range(10):  # try 10 times
                    nc, nr = random.randint(0, COLS-1), random.randint(0, ROWS-1)
                    if (nc, nr) == (chosen_col, chosen_row):
                        continue
                    if any(bc == nc and br == nr for _, bc, br in board):
                        continue
                    break
                neg_feats = (cell_features(nc, nr, board, tower_id) +
                             board_features(board, wave, gold, lives, tower_cost))
                self.pairs.append((neg_feats, 0.0))
    
    def __len__(self):
        return len(self.pairs)
    
    def __getitem__(self, idx):
        feats, label = self.pairs[idx]
        return torch.tensor(feats, dtype=torch.float32), torch.tensor([label], dtype=torch.float32)

class ScorerMLP(nn.Module):
    def __init__(self, input_dim):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(32, 1),
            nn.Sigmoid(),
        )
    
    def forward(self, x):
        return self.net(x)

def train_faction(faction, examples, epochs=50):
    faction_ex = [e for e in examples if e['faction'] == faction]
    if len(faction_ex) < 20:
        print(f"Skip {faction}: only {len(faction_ex)} examples")
        return None
    
    # Split 80/20
    random.shuffle(faction_ex)
    split = int(len(faction_ex) * 0.8)
    train_ex, val_ex = faction_ex[:split], faction_ex[split:]
    
    train_ds = PlacementDataset(train_ex)
    val_ds = PlacementDataset(val_ex, neg_samples=5)
    
    train_loader = DataLoader(train_ds, batch_size=32, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=64)
    
    # Get input dim from a sample
    sample_feats, _ = train_ds[0]
    input_dim = len(sample_feats)
    
    model = ScorerMLP(input_dim)
    opt = torch.optim.Adam(model.parameters(), lr=0.001)
    criterion = nn.BCELoss()
    
    best_val = float('inf')
    for epoch in range(epochs):
        model.train()
        for feats, labels in train_loader:
            opt.zero_grad()
            out = model(feats)
            loss = criterion(out, labels)
            loss.backward()
            opt.step()
        
        # Validate
        model.eval()
        val_loss = 0
        with torch.no_grad():
            for feats, labels in val_loader:
                out = model(feats)
                val_loss += criterion(out, labels).item()
        val_loss /= len(val_loader)
        
        if val_loss < best_val:
            best_val = val_loss
            torch.save(model.state_dict(), MODEL_DIR / f'scorer-{faction}.pt')
        
        if (epoch + 1) % 10 == 0:
            print(f"  {faction} epoch {epoch+1}: val_loss={val_loss:.4f}")
    
    print(f"  {faction}: best val_loss={best_val:.4f} ({len(faction_ex)} examples)")
    return best_val

def main():
    examples = load_examples()
    print(f"Loaded {len(examples)} examples")
    
    factions = sorted(set(e['faction'] for e in examples))
    for faction in factions:
        print(f"\nTraining {faction}...")
        train_faction(faction, examples)

if __name__ == '__main__':
    main()
