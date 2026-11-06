"""
train_gpu.py — Train placement scorers on GPU.

Bigger model than the CPU version, trained on synthetic + expert data.
17 input features (see FEATURE_NAMES) — must match the TypeScript side.
Uses CUDA automatically if available (RTX 4080).

Usage:
    python ml/desktop/train_gpu.py --data ml/desktop/combined.jsonl --epochs 100 --out ml/desktop/models/
"""

import json
import math
import random
import argparse
from pathlib import Path
from collections import defaultdict

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader

COLS, ROWS = 36, 26

# Plains map path is row 13 (all training data is plains). Path distance
# uses |row - 13| here; the TypeScript side computes the same value from
# ctx.allPaths (min distance to any path point), which agrees exactly on
# plains because the path runs the full row.
PATH_ROW = 13

# Tower base costs, extracted from src/data/TowerTypes.ts (2026-11-06).
# Unknown towers (e.g. removed ones like celestial_sanctuary) default to 50.
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


# Canonical feature order — MUST match playtest/LearnedScorer.ts,
# src/systems/PlacementAdvisor.ts and ml/desktop/model-architecture.html.
FEATURE_NAMES = [
    'col', 'row', 'left', 'mid_col', 'right', 'top', 'mid_row', 'bottom',
    'min_dist', 'density', 'same_dist', 'path_dist',
    'wave', 'tower_count', 'gold', 'tower_cost', 'lives',
]

def cell_features(col, row, board, tower_id):
    """Spatial features for a candidate cell. Indices 0-11 of FEATURE_NAMES.

    Must match TypeScript LearnedScorer.extractFeatures / PlacementAdvisor.
    """
    feats = []
    feats.append(col / COLS)
    feats.append(row / ROWS)
    feats.append(1.0 if col < 12 else 0.0)
    feats.append(1.0 if 12 <= col < 24 else 0.0)
    feats.append(1.0 if col >= 24 else 0.0)
    feats.append(1.0 if row < 9 else 0.0)
    feats.append(1.0 if 9 <= row < 17 else 0.0)
    feats.append(1.0 if row >= 17 else 0.0)

    if board:
        min_dist = min(math.hypot(col - bc, row - br) for _, bc, br in board)
        feats.append(min(min_dist / 10.0, 1.0))
        nearby = sum(1 for _, bc, br in board
                     if abs(bc - col) <= 1 and abs(br - row) <= 1)
        feats.append(min(nearby / 5.0, 1.0))
        same = [b for b in board if b[0] == tower_id]
        if same:
            d = min(math.hypot(col - bc, row - br) for _, bc, br in same)
            feats.append(min(d / 10.0, 1.0))
        else:
            feats.append(1.0)
    else:
        feats.extend([1.0, 0.0, 1.0])

    # Distance to the creep path (plains: full row 13), / 20 capped at 1.
    feats.append(min(abs(row - PATH_ROW) / 20.0, 1.0))

    return feats

def board_features(board, wave, gold=500.0, lives=20.0, tower_cost=50.0):
    """Game-state features. Indices 12-16 of FEATURE_NAMES.

    gold/lives default to full (500/20) for legacy examples that don't
    record them — placements happened, so they were affordable, and most
    expert data is early/mid game with lives intact. Once captures record
    gold/lives, these become informative; until then they are near-constant
    and the model learns ~zero weight for them. tower_cost comes from the
    TOWER_COSTS lookup by tower id.
    """
    return [
        wave / 20.0,
        min(len(board) / 100.0, 1.0),
        min(gold / 500.0, 1.0),
        min(tower_cost / 500.0, 1.0),
        min(lives / 20.0, 1.0),
    ]

class PlacementDataset(Dataset):
    def __init__(self, examples, neg_samples=5, zero_features=None):
        # zero_features: set of FEATURE_NAMES indices to force to 0.0
        # (feature ablation — see ml/desktop/ablate.py).
        self.pairs = []
        for ex in examples:
            board = ex['board']
            tower_id = ex['towerId']
            chosen_col, chosen_row = ex['chosen']
            wave = ex['wave']
            gold = ex.get('gold', 500.0)
            lives = ex.get('lives', 20.0)
            tower_cost = TOWER_COSTS.get(tower_id, 50)

            pos_feats = self._feats(chosen_col, chosen_row, board, tower_id,
                                    wave, gold, lives, tower_cost, zero_features)
            self.pairs.append((pos_feats, 1.0))

            for _ in range(neg_samples):
                for _ in range(10):
                    nc, nr = random.randint(0, COLS-1), random.randint(0, ROWS-1)
                    if (nc, nr) == (chosen_col, chosen_row):
                        continue
                    if any(bc == nc and br == nr for _, bc, br in board):
                        continue
                    break
                neg_feats = self._feats(nc, nr, board, tower_id,
                                        wave, gold, lives, tower_cost, zero_features)
                self.pairs.append((neg_feats, 0.0))

    @staticmethod
    def _feats(col, row, board, tower_id, wave, gold, lives, tower_cost, zero_features):
        feats = (cell_features(col, row, board, tower_id) +
                 board_features(board, wave, gold, lives, tower_cost))
        if zero_features:
            feats = [0.0 if i in zero_features else v for i, v in enumerate(feats)]
        return feats
    
    def __len__(self):
        return len(self.pairs)
    
    def __getitem__(self, idx):
        feats, label = self.pairs[idx]
        return torch.tensor(feats, dtype=torch.float32), torch.tensor([label], dtype=torch.float32)

class ScorerMLP(nn.Module):
    """Bigger than CPU version: 17 -> 128 -> 64 -> 1"""
    def __init__(self, input_dim):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 128),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(64, 1),
            nn.Sigmoid(),
        )
    
    def forward(self, x):
        return self.net(x)

def train_faction(faction, examples, device, epochs, batch_size, out_dir,
                  zero_features=None):
    # Fixed seeds so baseline vs ablated runs share the same train/val
    # split and negative samples — otherwise ablation deltas are noise.
    random.seed(42)
    torch.manual_seed(42)
    faction_ex = [e for e in examples if e['faction'] == faction]
    if len(faction_ex) < 50:
        print(f"  Skip {faction}: only {len(faction_ex)} examples")
        return None
    
    random.shuffle(faction_ex)
    split = int(len(faction_ex) * 0.85)
    train_ex, val_ex = faction_ex[:split], faction_ex[split:]
    
    train_ds = PlacementDataset(train_ex, zero_features=zero_features)
    val_ds = PlacementDataset(val_ex, neg_samples=5, zero_features=zero_features)
    
    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True, num_workers=4)
    val_loader = DataLoader(val_ds, batch_size=batch_size * 2, num_workers=4)
    
    sample_feats, _ = train_ds[0]
    model = ScorerMLP(len(sample_feats)).to(device)
    opt = torch.optim.AdamW(model.parameters(), lr=0.001, weight_decay=0.01)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(opt, T_max=epochs)
    criterion = nn.BCELoss()
    
    best_val = float('inf')
    for epoch in range(epochs):
        model.train()
        for feats, labels in train_loader:
            feats, labels = feats.to(device), labels.to(device)
            opt.zero_grad()
            out = model(feats)
            loss = criterion(out, labels)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            opt.step()
        scheduler.step()
        
        model.eval()
        val_loss = 0
        with torch.no_grad():
            for feats, labels in val_loader:
                feats, labels = feats.to(device), labels.to(device)
                out = model(feats)
                val_loss += criterion(out, labels).item()
        val_loss /= len(val_loader)
        
        if val_loss < best_val:
            best_val = val_loss
            torch.save(model.state_dict(), out_dir / f'scorer-{faction}.pt')
        
        if (epoch + 1) % 10 == 0:
            print(f"    epoch {epoch+1}/{epochs}: val_loss={val_loss:.4f}")
    
    print(f"  {faction}: best val_loss={best_val:.4f} ({len(faction_ex)} examples)")
    return best_val

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--data', required=True)
    p.add_argument('--epochs', type=int, default=300)
    p.add_argument('--batch-size', type=int, default=256)
    p.add_argument('--out', required=True)
    args = p.parse_args()
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Device: {device}")
    if device.type == 'cuda':
        print(f"GPU: {torch.cuda.get_device_name(0)}")
    
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Loading {args.data}...")
    examples = [json.loads(l) for l in open(args.data)]
    print(f"Loaded {len(examples)} examples")
    
    factions = sorted(set(e['faction'] for e in examples))
    print(f"Factions: {factions}")
    
    for faction in factions:
        print(f"\nTraining {faction}...")
        train_faction(faction, examples, device, args.epochs, args.batch_size, out_dir)
    
    print(f"\nDone. Models in {out_dir}")

if __name__ == '__main__':
    main()
