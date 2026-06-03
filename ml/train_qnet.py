"""
Q-net trainer — regresses Q(s, action_taken) to match outcome ±1.

Per-action loss: only the taken action's Q gets a gradient. Other
9360 actions float free. Q learns "if I take this action in this
state, what's my eventual outcome?"

Loss: MSE(Q[action_idx], outcome)

Usage:
  python ml/train_qnet.py --data data/qnet-selfplay/v1 \\
                          --epochs 30 \\
                          --out models/qnet-v1
"""
from __future__ import annotations

import argparse
import base64
import gzip
import json
import os
import sys
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader

sys.path.insert(0, str(Path(__file__).parent / 'networks'))
from q_net import QNet, count_params, OBS_CHANNELS, OBS_GLOBALS, GRID_ROWS, GRID_COLS, ACTION_SPACE_SIZE


def _decode_b64_f32(b64: str, n: int) -> np.ndarray:
    raw = base64.b64decode(b64)
    return np.frombuffer(raw, dtype=np.float32, count=n).copy()


def _decode_b64_u8(b64: str, n: int) -> np.ndarray:
    raw = base64.b64decode(b64)
    return np.frombuffer(raw, dtype=np.uint8, count=n).copy()


class QNetDataset(Dataset):
    def __init__(self, data_dir: str):
        self.rows = []
        for cell_dir in sorted(os.listdir(data_dir)):
            full = os.path.join(data_dir, cell_dir)
            if not os.path.isdir(full):
                continue
            for filename in sorted(os.listdir(full)):
                if not filename.endswith('.jsonl.gz'):
                    continue
                path = os.path.join(full, filename)
                with gzip.open(path, 'rt') as f:
                    for line in f:
                        if not line.strip():
                            continue
                        self.rows.append(json.loads(line))
        wins = sum(1 for r in self.rows if r['outcome'] == 1)
        print(f'[QNetDataset] loaded {len(self.rows):,} rows from {data_dir}: {wins:,} win-labelled ({wins/max(1,len(self.rows))*100:.1f}%)')

    def __len__(self):
        return len(self.rows)

    def __getitem__(self, idx):
        r = self.rows[idx]
        grid = _decode_b64_f32(r['obs_b64'], OBS_CHANNELS * GRID_ROWS * GRID_COLS).reshape(OBS_CHANNELS, GRID_ROWS, GRID_COLS)
        globals_vec = _decode_b64_f32(r['globals_b64'], OBS_GLOBALS)
        return {
            'grid': torch.from_numpy(grid),
            'globals': torch.from_numpy(globals_vec),
            'action_idx': torch.tensor(int(r['action']), dtype=torch.long),
            'target': torch.tensor(float(r['outcome']), dtype=torch.float32),
        }


def evaluate(model: QNet, loader: DataLoader, device: torch.device) -> dict:
    model.eval()
    total_loss = 0.0
    n = 0
    sign_correct = 0
    with torch.no_grad():
        for batch in loader:
            grid = batch['grid'].to(device)
            glb = batch['globals'].to(device)
            act = batch['action_idx'].to(device)
            tgt = batch['target'].to(device)
            q = model(grid, glb)  # [N, 9361]
            q_taken = q.gather(1, act.unsqueeze(1)).squeeze(1)  # [N]
            loss = F.mse_loss(q_taken, tgt, reduction='sum')
            total_loss += loss.item()
            sign_correct += (torch.sign(q_taken) == torch.sign(tgt)).sum().item()
            n += tgt.shape[0]
    return {
        'mse': total_loss / max(1, n),
        'sign_acc': sign_correct / max(1, n),
        'n': n,
    }


def export_onnx(model: QNet, out_path: str, device: torch.device) -> None:
    model.eval()
    grid_dummy = torch.randn(1, OBS_CHANNELS, GRID_ROWS, GRID_COLS, device=device)
    globals_dummy = torch.randn(1, OBS_GLOBALS, device=device)
    torch.onnx.export(
        model,
        (grid_dummy, globals_dummy),
        out_path,
        input_names=['grid', 'globals'],
        output_names=['q'],
        dynamic_axes={
            'grid': {0: 'batch'},
            'globals': {0: 'batch'},
            'q': {0: 'batch'},
        },
        opset_version=17,
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', required=True)
    ap.add_argument('--epochs', type=int, default=30)
    ap.add_argument('--batch-size', type=int, default=64)
    ap.add_argument('--lr', type=float, default=3e-4)
    ap.add_argument('--weight-decay', type=float, default=1e-5)
    ap.add_argument('--holdout-pct', type=float, default=0.1)
    ap.add_argument('--seed', type=int, default=42)
    ap.add_argument('--out', default='models/qnet-v1')
    ap.add_argument('--device', default='cpu')
    args = ap.parse_args()

    torch.manual_seed(args.seed)
    np.random.seed(args.seed)

    device = torch.device(args.device)
    print(f'[train_qnet] device={device}')

    ds = QNetDataset(args.data)
    if len(ds) < 100:
        print(f'[train_qnet] FATAL: only {len(ds)} rows')
        sys.exit(1)

    # Holdout split by match_id.
    match_ids = list(set(r['matchId'] for r in ds.rows))
    rng = np.random.RandomState(args.seed)
    rng.shuffle(match_ids)
    n_val = int(len(match_ids) * args.holdout_pct)
    val_set = set(match_ids[:n_val])
    train_rows = [r for r in ds.rows if r['matchId'] not in val_set]
    val_rows = [r for r in ds.rows if r['matchId'] in val_set]
    print(f'[train_qnet] split: train={len(train_rows):,}, val={len(val_rows):,}')

    train_ds = QNetDataset.__new__(QNetDataset); train_ds.rows = train_rows
    val_ds = QNetDataset.__new__(QNetDataset); val_ds.rows = val_rows
    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=0)

    model = QNet().to(device)
    print(f'[train_qnet] QNet params: {count_params(model):,}')
    opt = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=args.weight_decay)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    best_val_mse = float('inf')

    for epoch in range(args.epochs):
        model.train()
        t0 = time.time()
        total = 0.0
        n_seen = 0
        for batch in train_loader:
            grid = batch['grid'].to(device)
            glb = batch['globals'].to(device)
            act = batch['action_idx'].to(device)
            tgt = batch['target'].to(device)
            q = model(grid, glb)
            q_taken = q.gather(1, act.unsqueeze(1)).squeeze(1)
            loss = F.mse_loss(q_taken, tgt)
            opt.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            opt.step()
            total += loss.item() * tgt.shape[0]
            n_seen += tgt.shape[0]
        train_mse = total / max(1, n_seen)
        val = evaluate(model, val_loader, device)
        dt = time.time() - t0
        print(f'epoch {epoch:3d}  train_mse={train_mse:.4f}  val_mse={val["mse"]:.4f}  val_sign_acc={val["sign_acc"]*100:.1f}%  ({dt:.1f}s)')
        if val['mse'] < best_val_mse:
            best_val_mse = val['mse']
            torch.save(model.state_dict(), str(out_path.with_suffix('.pt')))
            print(f'  saved best to {out_path.with_suffix(".pt")} (val_mse={best_val_mse:.4f})')

    model.load_state_dict(torch.load(str(out_path.with_suffix('.pt')), map_location=device, weights_only=True))
    onnx_path = str(out_path.with_suffix('.onnx'))
    export_onnx(model, onnx_path, device)
    print(f'[train_qnet] exported ONNX: {onnx_path}')

    final_val = evaluate(model, val_loader, device)
    meta = {
        'createdAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'dataDir': args.data,
        'trainSize': len(train_ds),
        'valSize': len(val_ds),
        'bestValMse': best_val_mse,
        'finalValSignAcc': final_val['sign_acc'],
        'epochs': args.epochs,
        'lr': args.lr,
        'batchSize': args.batch_size,
        'params': count_params(model),
    }
    with open(str(out_path.with_suffix('.meta.json')), 'w') as f:
        json.dump(meta, f, indent=2)
    print(f'[train_qnet] wrote meta: {out_path.with_suffix(".meta.json")}')


if __name__ == '__main__':
    main()
