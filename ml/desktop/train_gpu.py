"""
train_gpu.py — Train placement scorers on GPU.

Bigger model than the CPU version, trained on synthetic + expert data.
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

def cell_features(col, row, board, tower_id):
    """Same features as train_placement.py — must match TypeScript LearnedScorer."""
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
    
    return feats

def board_features(board, wave):
    return [
        wave / 20.0,
        min(len(board) / 100.0, 1.0),
    ]

class PlacementDataset(Dataset):
    def __init__(self, examples, neg_samples=5):
        self.pairs = []
        for ex in examples:
            board = ex['board']
            tower_id = ex['towerId']
            chosen_col, chosen_row = ex['chosen']
            wave = ex['wave']
            
            pos_feats = (cell_features(chosen_col, chosen_row, board, tower_id) +
                         board_features(board, wave))
            self.pairs.append((pos_feats, 1.0))
            
            for _ in range(neg_samples):
                for _ in range(10):
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
    """Bigger than CPU version: 13 -> 128 -> 64 -> 1"""
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

def train_faction(faction, examples, device, epochs, batch_size, out_dir):
    faction_ex = [e for e in examples if e['faction'] == faction]
    if len(faction_ex) < 50:
        print(f"  Skip {faction}: only {len(faction_ex)} examples")
        return
    
    random.shuffle(faction_ex)
    split = int(len(faction_ex) * 0.85)
    train_ex, val_ex = faction_ex[:split], faction_ex[split:]
    
    train_ds = PlacementDataset(train_ex)
    val_ds = PlacementDataset(val_ex, neg_samples=5)
    
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
