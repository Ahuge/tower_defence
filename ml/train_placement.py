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
    
    return feats

def board_features(board, wave):
    """Global board state features."""
    return [
        wave / 20.0,
        min(len(board) / 100.0, 1.0),  # tower count normalized
    ]

class PlacementDataset(Dataset):
    def __init__(self, examples, neg_samples=5):
        self.pairs = []
        for ex in examples:
            board = ex['board']
            tower_id = ex['towerId']
            chosen_col, chosen_row = ex['chosen']
            wave = ex['wave']
            
            # Positive example
            pos_feats = (cell_features(chosen_col, chosen_row, board, tower_id) +
                         board_features(board, wave))
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
                             board_features(board, wave))
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
