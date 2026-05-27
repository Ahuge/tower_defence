"""
BC trainer — supervised learning on rollout JSONL.

Per `notes/rl/bc-plan.md` decisions:
  D2 — Clone source: LearningBrain (already baked into the rollouts).
  D3 — Architecture: PPOPolicyNet (β conv-only + per-cell head + α globals broadcast).
  D4 — Skip handling: inverse-frequency class weighting on cross-entropy.
  D5 — Compute: 1000 matches/faction first run; smoke = 50/faction.
  D6 — PPOBrain temperature: configurable (T=1.0 default), unused at training.
  GAP-G — Holdout split by match_id (BC plan re-evaluation).

Workflow:
  python ml/train_bc.py --rollouts rollouts/bc/<run> \
                        --epochs 20 \
                        --batch-size 64 \
                        --out models/bc-best \
                        --schema-version v1.1

Outputs:
  <out>.pt          PyTorch state_dict
  <out>.onnx        ONNX export (consumed by PPOBrain at inference)
  <out>.meta.json   schema version + training stats + dataset hash

Logs go to runs/bc-<run_id>/ (TensorBoard event files).
"""
from __future__ import annotations

import argparse
import gzip
import json
import os
import sys
import time
from pathlib import Path

# Make `networks` and `data` importable when run as a script from
# the repo root (`python ml/train_bc.py ...`).
ML_DIR = os.path.dirname(os.path.abspath(__file__))
if ML_DIR not in sys.path:
    sys.path.insert(0, ML_DIR)

import numpy as np
import torch
import torch.nn.functional as F
from torch.utils.data import DataLoader
from torch.utils.tensorboard import SummaryWriter

from networks.policy import (
    PPOPolicyNet,
    OBS_CHANNELS,
    OBS_GLOBALS,
    GRID_ROWS,
    GRID_COLS,
    ACTION_SPACE_SIZE,
    count_params,
)
from data.jsonl_dataset import BCRolloutDataset, class_frequencies


def masked_cross_entropy(
    logits: torch.Tensor,
    action: torch.Tensor,
    mask: torch.Tensor,
    class_weight: torch.Tensor | None = None,
    ent_coef: float = 0.0,
) -> tuple[torch.Tensor, dict]:
    """
    logits:       [N, A]   raw policy logits
    action:       [N]      target action index in [0, A)
    mask:         [N, A]   uint8/bool — 1=legal, 0=illegal
    class_weight: [A]      per-class weight (None for uniform)
    ent_coef:     float    weight of the entropy bonus subtracted
                           from the loss. 0 = pure imitation; 0.01+
                           encourages broader output distributions
                           (use to make PPO updates from the BC
                           checkpoint less fragile — see
                           `notes/rl/bc-broaden-plan.md`).

    Returns (scalar loss, stats dict with `ce_loss`, `entropy`).
    """
    # Mask: set illegal-action logits to a large negative so they
    # never contribute to the partition function. -1e9 is enough
    # in float32; -inf risks NaN gradients on edge cases.
    mask_f = mask.float()
    masked_logits = logits + (mask_f - 1.0) * 1e9  # legal → unchanged; illegal → -1e9

    # Log-softmax over the masked logits, gather the target row's
    # log-prob, weight per-class, and mean.
    log_probs = F.log_softmax(masked_logits, dim=-1)  # [N, A]
    nll = -log_probs.gather(1, action.unsqueeze(1)).squeeze(1)  # [N]
    if class_weight is not None:
        w = class_weight[action]  # [N]
        ce_loss = (nll * w).mean()
    else:
        ce_loss = nll.mean()

    # Entropy of the masked distribution. Illegal indices contribute
    # 0 to the sum because exp(-1e9) ≈ 0 (so p_i * log p_i is
    # negligible there; we explicitly zero them just for numeric
    # cleanliness).
    if ent_coef != 0.0:
        probs = log_probs.exp()
        # Multiply by mask so illegal slots can't contribute even
        # under float32 underflow corner cases.
        ent_per_row = -(probs * log_probs * mask_f).sum(dim=-1)  # [N]
        entropy = ent_per_row.mean()
    else:
        entropy = torch.tensor(0.0, device=logits.device)

    loss = ce_loss - ent_coef * entropy
    return loss, {'ce_loss': ce_loss.item(), 'entropy': entropy.item()}


def topk_correct(logits: torch.Tensor, action: torch.Tensor, mask: torch.Tensor, k: int) -> int:
    mask_f = mask.float()
    masked_logits = logits + (mask_f - 1.0) * 1e9
    topk = masked_logits.topk(k, dim=-1).indices  # [N, k]
    correct = (topk == action.unsqueeze(1)).any(dim=-1)
    return int(correct.sum().item())


def make_class_weights(train_counts: np.ndarray, n_train: int) -> torch.Tensor:
    """
    Inverse-frequency weights per class. Classes with zero
    occurrence in train get weight 0 (no gradient signal — they
    can't be supervised anyway since no labels exist). Weights are
    scaled so the mean weight on observed classes is 1.0, which
    keeps the loss magnitude comparable to uniform-CE for
    monitoring purposes.
    """
    w = np.zeros(ACTION_SPACE_SIZE, dtype=np.float32)
    seen = train_counts > 0
    w[seen] = n_train / (train_counts[seen] * seen.sum())
    # Normalize so mean weight on observed classes is 1.0.
    mean_seen = w[seen].mean()
    if mean_seen > 0:
        w /= mean_seen
    return torch.from_numpy(w)


def evaluate(model: PPOPolicyNet, loader: DataLoader, device: torch.device, class_weight: torch.Tensor | None, ent_coef: float = 0.0) -> dict:
    model.eval()
    total = 0
    loss_sum = 0.0
    ent_sum = 0.0
    top1 = 0
    top5 = 0
    with torch.no_grad():
        for batch in loader:
            grid = batch['grid'].to(device)
            globals_vec = batch['globals'].to(device)
            action = batch['action'].to(device)
            mask = batch['mask'].to(device)
            logits = model.flat_logits(grid, globals_vec)
            # Always compute entropy for monitoring even if ent_coef=0 — the
            # bc-broaden gate cares about absolute entropy of the policy.
            loss, stats = masked_cross_entropy(logits, action, mask, class_weight, ent_coef=max(ent_coef, 1e-30))
            n = action.shape[0]
            total += n
            loss_sum += loss.item() * n
            ent_sum += stats['entropy'] * n
            top1 += topk_correct(logits, action, mask, 1)
            top5 += topk_correct(logits, action, mask, 5)
    return {
        'loss': loss_sum / max(1, total),
        'entropy': ent_sum / max(1, total),
        'top1': top1 / max(1, total),
        'top5': top5 / max(1, total),
        'n': total,
    }


def export_onnx(model: PPOPolicyNet, out_path: str, device: torch.device) -> None:
    """Export the model to ONNX. Names must match PPOBrain.decideAsync."""
    model.eval()
    grid_dummy = torch.randn(1, OBS_CHANNELS, GRID_ROWS, GRID_COLS, device=device)
    globals_dummy = torch.randn(1, OBS_GLOBALS, device=device)
    # We need three outputs: spatial_logits, skip_logit, value.
    # torch.onnx.export wires them up by name automatically when
    # the forward returns a tuple.
    torch.onnx.export(
        model,
        (grid_dummy, globals_dummy),
        out_path,
        input_names=['grid', 'globals'],
        output_names=['spatial_logits', 'skip_logit', 'value'],
        dynamic_axes={
            'grid': {0: 'batch'},
            'globals': {0: 'batch'},
            'spatial_logits': {0: 'batch'},
            'skip_logit': {0: 'batch'},
            'value': {0: 'batch'},
        },
        opset_version=17,
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--rollouts', required=True, help='one or more rollout run dirs (comma-separated)')
    ap.add_argument('--epochs', type=int, default=20)
    ap.add_argument('--batch-size', type=int, default=64)
    ap.add_argument('--lr', type=float, default=3e-4)
    ap.add_argument('--weight-decay', type=float, default=1e-5)
    ap.add_argument('--holdout-pct', type=float, default=0.1)
    ap.add_argument('--seed', type=int, default=42)
    ap.add_argument('--out', default='models/bc-best')
    ap.add_argument('--device', default='cpu', choices=['cpu', 'cuda'])
    ap.add_argument('--schema-version', default='v1.1')
    ap.add_argument('--log-dir', default='runs/bc')
    ap.add_argument('--smoke', action='store_true', help='1-epoch smoke run for pipeline validation')
    ap.add_argument('--ent-coef', type=float, default=0.0, help='entropy regularization coefficient. 0 = pure imitation. 0.01+ broadens the policy distribution so PPO updates from this BC are less fragile. See notes/rl/bc-broaden-plan.md.')
    args = ap.parse_args()

    torch.manual_seed(args.seed)
    np.random.seed(args.seed)

    rollout_dirs = args.rollouts.split(',')
    print(f'[train_bc] rollout dirs: {rollout_dirs}')

    t_load = time.time()
    train_ds = BCRolloutDataset(rollout_dirs, split='train', holdout_pct=args.holdout_pct, seed=args.seed)
    val_ds = BCRolloutDataset(rollout_dirs, split='val', holdout_pct=args.holdout_pct, seed=args.seed)
    print(f'[train_bc] loaded train={len(train_ds)} val={len(val_ds)} in {time.time() - t_load:.1f}s')
    if len(train_ds) == 0:
        raise SystemExit('train set is empty — check rollout dirs')

    counts = class_frequencies(train_ds)
    seen = (counts > 0).sum()
    print(f'[train_bc] distinct action classes in train: {seen}')

    cw = make_class_weights(counts, len(train_ds)).to(args.device)

    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=0)

    device = torch.device(args.device)
    model = PPOPolicyNet().to(device)
    print(f'[train_bc] PPOPolicyNet params: {count_params(model):,}')

    opt = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=args.weight_decay)

    run_id = f'{time.strftime("%Y%m%d-%H%M%S")}'
    log_path = Path(args.log_dir) / run_id
    log_path.mkdir(parents=True, exist_ok=True)
    writer = SummaryWriter(str(log_path))
    print(f'[train_bc] tensorboard: {log_path}')

    n_epochs = 1 if args.smoke else args.epochs
    best_top1 = -1.0
    global_step = 0

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    for epoch in range(n_epochs):
        model.train()
        ep_loss = 0.0
        ep_n = 0
        ep_top1 = 0
        t0 = time.time()
        for batch in train_loader:
            grid = batch['grid'].to(device)
            globals_vec = batch['globals'].to(device)
            action = batch['action'].to(device)
            mask = batch['mask'].to(device)

            logits = model.flat_logits(grid, globals_vec)
            loss, train_stats = masked_cross_entropy(logits, action, mask, cw, ent_coef=args.ent_coef)

            opt.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            opt.step()

            n = action.shape[0]
            ep_loss += loss.item() * n
            ep_n += n
            ep_top1 += topk_correct(logits, action, mask, 1)
            global_step += 1
            writer.add_scalar('train/loss_step', loss.item(), global_step)
            writer.add_scalar('train/entropy_step', train_stats['entropy'], global_step)

        train_loss = ep_loss / max(1, ep_n)
        train_top1 = ep_top1 / max(1, ep_n)
        val_stats = evaluate(model, val_loader, device, cw, ent_coef=args.ent_coef)

        writer.add_scalar('train/loss_epoch', train_loss, epoch)
        writer.add_scalar('train/top1_epoch', train_top1, epoch)
        writer.add_scalar('val/entropy', val_stats['entropy'], epoch)
        writer.add_scalar('val/loss', val_stats['loss'], epoch)
        writer.add_scalar('val/top1', val_stats['top1'], epoch)
        writer.add_scalar('val/top5', val_stats['top5'], epoch)

        dt = time.time() - t0
        print(f'epoch {epoch:3d}  train: loss={train_loss:.4f} top1={train_top1*100:.1f}%  val: loss={val_stats["loss"]:.4f} top1={val_stats["top1"]*100:.1f}% top5={val_stats["top5"]*100:.1f}% entropy={val_stats["entropy"]:.3f}  ({dt:.1f}s)')

        if val_stats['top1'] > best_top1:
            best_top1 = val_stats['top1']
            torch.save(model.state_dict(), str(out_path.with_suffix('.pt')))
            print(f'  saved best to {out_path.with_suffix(".pt")} (val_top1={best_top1*100:.1f}%)')

    # Reload best and export ONNX.
    model.load_state_dict(torch.load(str(out_path.with_suffix('.pt')), map_location=device, weights_only=True))
    onnx_path = str(out_path.with_suffix('.onnx'))
    export_onnx(model, onnx_path, device)
    print(f'[train_bc] exported ONNX: {onnx_path}')

    # Final entropy measurement on the best checkpoint — the
    # bc-broaden gate cares about this absolute value to decide if
    # the policy is broad enough for stable PPO.
    final_val = evaluate(model, val_loader, device, cw, ent_coef=max(args.ent_coef, 1e-30))
    meta = {
        'schemaVersion': args.schema_version,
        'createdAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'rolloutDirs': rollout_dirs,
        'trainSize': len(train_ds),
        'valSize': len(val_ds),
        'distinctClasses': int(seen),
        'bestValTop1': best_top1,
        'finalValEntropy': final_val['entropy'],
        'entCoef': args.ent_coef,
        'epochs': n_epochs,
        'lr': args.lr,
        'batchSize': args.batch_size,
        'params': count_params(model),
    }
    meta_path = str(out_path.with_suffix('.meta.json'))
    with open(meta_path, 'w') as f:
        json.dump(meta, f, indent=2)
    print(f'[train_bc] wrote meta: {meta_path}')
    writer.close()


if __name__ == '__main__':
    main()
