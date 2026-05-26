"""
PPO self-play trainer + orchestrator.

Per `notes/rl/g3-plan.md` decisions:
  D1 — Reward: shaped (+1 win, -1 loss, +0.1/wave, -0.0001/tick).
       Computed by PPORecorderBrain at rollout time; trainer just
       reads `reward` field.
  D2 — Self-play: single-side for smoke (mirrored deferred).
  D3 — Cadence: smoke 20 iters × 16 matches/faction.
  D4 — Init: warm start from BC checkpoint.
  D5 — Orchestrator: this script. Spawns Node rollout gen, reads
       JSONL, computes GAE, runs PPO loss, exports ONNX. Loops.
  D6 — Stats: PPOBrain.decideAsyncWithStats returns log_prob + value
       per decision; recorder captures.
  D7 — Difficulty: hard / 15 waves (PPO can't learn at saturated
       normal/10w).

Workflow:
  # Smoke (validates loop, ~15 min):
  python ml/train_ppo.py --iters 20 --matches-per-iter 16 \
                         --init-from models/bc-smoke.pt \
                         --difficulty hard --waves 15

ONNX in/out contract matches PPOBrain.decideAsyncWithStats:
  inputs:  grid    Float32 [N, 14, 26, 36]
           globals Float32 [N, 25]
  outputs: spatial_logits Float32 [N, 10, 26, 36]
           skip_logit     Float32 [N, 1]
           value          Float32 [N, 1]
"""
from __future__ import annotations

import argparse
import base64
import gzip
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Iterator

ML_DIR = os.path.dirname(os.path.abspath(__file__))
if ML_DIR not in sys.path:
    sys.path.insert(0, ML_DIR)

import numpy as np
import torch
import torch.nn.functional as F
from torch.utils.data import DataLoader, Dataset
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
from train_bc import export_onnx as _export_onnx_impl

GRID_FLOATS = OBS_CHANNELS * GRID_ROWS * GRID_COLS


# ===== PPO rollout dataset =====

def _decode_b64_f32(b64: str, n: int) -> np.ndarray:
    arr = np.frombuffer(base64.b64decode(b64), dtype=np.float32)
    if arr.size != n: raise ValueError(f'expected {n} float32 values, got {arr.size}')
    return arr


def _decode_b64_u8(b64: str, n: int) -> np.ndarray:
    arr = np.frombuffer(base64.b64decode(b64), dtype=np.uint8)
    if arr.size != n: raise ValueError(f'expected {n} uint8 values, got {arr.size}')
    return arr


def _iter_rollout_files(run_dir: str) -> Iterator[Path]:
    for p in sorted(Path(run_dir).rglob('*.jsonl.gz')):
        yield p


def _load_episodes(run_dir: str) -> list[list[dict]]:
    """Group rollout rows back into per-episode lists so we can
    compute returns + GAE per episode (rewards bootstrap from the
    next step's value within an episode, terminate at `done=True`).
    """
    episodes: list[list[dict]] = []
    for jsonl_gz in _iter_rollout_files(run_dir):
        with gzip.open(jsonl_gz, 'rt', encoding='utf-8') as f:
            rows = []
            for line in f:
                line = line.strip()
                if not line:
                    continue
                rows.append(json.loads(line))
        if rows:
            episodes.append(rows)
    return episodes


def _compute_gae(
    rewards: np.ndarray, values: np.ndarray, dones: np.ndarray,
    gamma: float = 0.995, lam: float = 0.95,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Single-episode GAE. `values` includes a phantom V(s_T) appended
    at the end (we use 0 for terminal episodes since `done=True`
    means episode ends — no bootstrap).

    Returns (advantages, returns) both of length len(rewards).
    """
    n = len(rewards)
    advantages = np.zeros(n, dtype=np.float32)
    last_gae = 0.0
    for t in reversed(range(n)):
        next_value = values[t + 1] if t + 1 < n else 0.0
        next_done = dones[t]  # if this step ended the episode, no bootstrap
        delta = rewards[t] + (0.0 if next_done else gamma * next_value) - values[t]
        last_gae = delta + (0.0 if next_done else gamma * lam * last_gae)
        advantages[t] = last_gae
    returns = advantages + values
    return advantages, returns


class PPODataset(Dataset):
    """In-memory PPO rollout dataset with precomputed advantages."""
    def __init__(self, run_dir: str, gamma: float = 0.995, lam: float = 0.95):
        episodes = _load_episodes(run_dir)
        self.rows: list[dict] = []
        self.advantages: list[float] = []
        self.returns: list[float] = []

        for ep in episodes:
            rewards = np.array([r['reward'] for r in ep], dtype=np.float32)
            values = np.array([r['value'] for r in ep], dtype=np.float32)
            dones = np.array([r['done'] for r in ep], dtype=bool)
            adv, ret = _compute_gae(rewards, values, dones, gamma, lam)
            for r, a, rr in zip(ep, adv, ret):
                self.rows.append(r)
                self.advantages.append(float(a))
                self.returns.append(float(rr))

        # Normalize advantages across the whole batch (PPO best
        # practice — reduces gradient variance).
        if self.advantages:
            adv = np.array(self.advantages, dtype=np.float32)
            std = adv.std() + 1e-8
            adv = (adv - adv.mean()) / std
            self.advantages = adv.tolist()

    def __len__(self) -> int:
        return len(self.rows)

    def __getitem__(self, idx: int):
        r = self.rows[idx]
        grid = _decode_b64_f32(r['grid_b64'], GRID_FLOATS).reshape(OBS_CHANNELS, GRID_ROWS, GRID_COLS).copy()
        globals_vec = _decode_b64_f32(r['globals_b64'], OBS_GLOBALS).copy()
        mask = _decode_b64_u8(r['mask_b64'], ACTION_SPACE_SIZE).copy()
        return {
            'grid': torch.from_numpy(grid),
            'globals': torch.from_numpy(globals_vec),
            'mask': torch.from_numpy(mask),
            'action': torch.tensor(r['action'], dtype=torch.long),
            'log_prob_old': torch.tensor(r['log_prob'], dtype=torch.float32),
            'advantage': torch.tensor(self.advantages[idx], dtype=torch.float32),
            'return': torch.tensor(self.returns[idx], dtype=torch.float32),
        }


# ===== PPO training step =====

def masked_log_softmax(logits: torch.Tensor, mask: torch.Tensor) -> torch.Tensor:
    mask_f = mask.float()
    masked = logits + (mask_f - 1.0) * 1e9
    return F.log_softmax(masked, dim=-1)


def ppo_loss(
    model: PPOPolicyNet,
    batch: dict,
    clip_coef: float = 0.2,
    vf_coef: float = 0.5,
    ent_coef: float = 0.01,
) -> tuple[torch.Tensor, dict]:
    grid = batch['grid']
    globals_vec = batch['globals']
    mask = batch['mask']
    action = batch['action']
    log_prob_old = batch['log_prob_old']
    advantage = batch['advantage']
    ret = batch['return']

    spatial, skip, value = model(grid, globals_vec)
    n = spatial.shape[0]
    flat = torch.cat([spatial.reshape(n, -1), skip], dim=1)
    log_probs = masked_log_softmax(flat, mask)
    log_prob_new = log_probs.gather(1, action.unsqueeze(1)).squeeze(1)

    # PPO clipped objective. Ratio = exp(new - old).
    ratio = torch.exp(log_prob_new - log_prob_old)
    unclipped = ratio * advantage
    clipped = torch.clamp(ratio, 1 - clip_coef, 1 + clip_coef) * advantage
    policy_loss = -torch.min(unclipped, clipped).mean()

    # Value loss (regression toward return).
    value_pred = value.squeeze(-1)
    value_loss = F.mse_loss(value_pred, ret)

    # Entropy bonus over the masked distribution.
    probs = log_probs.exp()
    entropy = -(probs * log_probs).sum(dim=-1).mean()

    loss = policy_loss + vf_coef * value_loss - ent_coef * entropy

    with torch.no_grad():
        approx_kl = (log_prob_old - log_prob_new).mean().item()

    return loss, {
        'policy_loss': policy_loss.item(),
        'value_loss': value_loss.item(),
        'entropy': entropy.item(),
        'approx_kl': approx_kl,
        'ratio_mean': ratio.mean().item(),
    }


# ===== Orchestrator loop =====

def generate_rollouts(opts: argparse.Namespace, iter_idx: int, model_path: str) -> str:
    out_dir = f'rollouts/ppo/{opts.run_id}/iter_{iter_idx:04d}'
    cmd = [
        'node', '--import', 'tsx', 'scripts/generate-ppo-rollouts.mjs',
        f'--matches={opts.matches_per_iter}',
        f'--factions={",".join(opts.factions)}',
        f'--difficulty={opts.difficulty}',
        f'--waves={opts.waves}',
        f'--seed-base={opts.seed_base + iter_idx * 9973}',
        f'--temperature={opts.temperature}',
        f'--model={model_path}',
        f'--meta={Path(model_path).with_suffix(".meta.json")}',
        f'--out={out_dir}',
    ]
    print(f'[iter {iter_idx}] rollout: {" ".join(cmd)}')
    res = subprocess.run(cmd, capture_output=False)
    if res.returncode != 0:
        raise RuntimeError(f'rollout gen failed with exit {res.returncode}')
    return out_dir


def write_meta(path: str, schema_version: str, iter_idx: int, run_id: str, stats: dict) -> None:
    meta = {
        'schemaVersion': schema_version,
        'createdAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'iter': iter_idx,
        'runId': run_id,
        **stats,
    }
    with open(path, 'w') as f:
        json.dump(meta, f, indent=2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--iters', type=int, default=20)
    ap.add_argument('--matches-per-iter', type=int, default=16)
    ap.add_argument('--factions', default='arcane,mechanical')
    ap.add_argument('--difficulty', default='hard')
    ap.add_argument('--waves', type=int, default=15)
    ap.add_argument('--seed-base', type=int, default=12000)
    ap.add_argument('--temperature', type=float, default=1.0)
    ap.add_argument('--gamma', type=float, default=0.995)
    ap.add_argument('--lam', type=float, default=0.95)
    ap.add_argument('--clip-coef', type=float, default=0.2)
    ap.add_argument('--vf-coef', type=float, default=0.5)
    ap.add_argument('--ent-coef', type=float, default=0.01)
    ap.add_argument('--ppo-epochs', type=int, default=4)
    ap.add_argument('--minibatch-size', type=int, default=128)
    ap.add_argument('--lr', type=float, default=3e-4)
    ap.add_argument('--init-from', default='models/bc-smoke.pt')
    ap.add_argument('--out-model', default='models/ppo-policy.onnx')
    ap.add_argument('--out-pt', default='models/ppo-policy.pt')
    ap.add_argument('--out-meta', default='models/ppo-policy.meta.json')
    ap.add_argument('--device', default='cpu', choices=['cpu', 'cuda'])
    ap.add_argument('--schema-version', default='v1.1')
    ap.add_argument('--log-dir', default='runs/ppo')
    ap.add_argument('--keep-rollouts', action='store_true', help='keep iter rollouts after consumption')
    args = ap.parse_args()

    args.factions = args.factions.split(',')

    torch.manual_seed(args.seed_base)
    np.random.seed(args.seed_base)

    args.run_id = time.strftime('%Y%m%d-%H%M%S')
    log_path = Path(args.log_dir) / args.run_id
    log_path.mkdir(parents=True, exist_ok=True)
    writer = SummaryWriter(str(log_path))
    print(f'[train_ppo] run_id={args.run_id}  tensorboard={log_path}')

    device = torch.device(args.device)
    model = PPOPolicyNet().to(device)
    print(f'[train_ppo] PPOPolicyNet params: {count_params(model):,}')

    if args.init_from and Path(args.init_from).exists():
        model.load_state_dict(torch.load(args.init_from, map_location=device, weights_only=True))
        print(f'[train_ppo] warm-started from {args.init_from}')
    else:
        print(f'[train_ppo] no init-from found at {args.init_from}; starting fresh')

    # Export current model to the path PPOBrain reads — iter 0
    # rollouts use this initial state.
    Path(args.out_model).parent.mkdir(parents=True, exist_ok=True)
    _export_onnx_impl(model, args.out_model, device)
    write_meta(args.out_meta, args.schema_version, -1, args.run_id, {
        'iter': -1, 'initFrom': args.init_from,
    })
    print(f'[train_ppo] initial ONNX exported -> {args.out_model}')

    opt = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-5)

    for iter_idx in range(args.iters):
        t_iter = time.time()

        # 1. Generate rollouts using the current ONNX policy.
        rollout_dir = generate_rollouts(args, iter_idx, args.out_model)

        # 2. Load + compute advantages.
        ds = PPODataset(rollout_dir, gamma=args.gamma, lam=args.lam)
        if len(ds) == 0:
            print(f'[iter {iter_idx}] empty rollout dataset; skipping iter')
            continue
        print(f'[iter {iter_idx}] loaded {len(ds)} transitions')

        # Aggregate reward signal for diagnostics.
        rewards = np.array([r['reward'] for r in ds.rows], dtype=np.float32)
        writer.add_scalar('rollout/mean_step_reward', rewards.mean(), iter_idx)
        writer.add_scalar('rollout/transitions', len(ds), iter_idx)

        loader = DataLoader(ds, batch_size=args.minibatch_size, shuffle=True, num_workers=0)

        # 3. PPO update — K epochs × M minibatches per epoch.
        epoch_stats: dict[str, list[float]] = {'policy_loss': [], 'value_loss': [], 'entropy': [], 'approx_kl': []}
        for epoch in range(args.ppo_epochs):
            for batch in loader:
                batch = {k: v.to(device) for k, v in batch.items()}
                loss, stats = ppo_loss(
                    model, batch,
                    clip_coef=args.clip_coef, vf_coef=args.vf_coef, ent_coef=args.ent_coef,
                )
                opt.zero_grad()
                loss.backward()
                torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=0.5)
                opt.step()
                for k in epoch_stats:
                    epoch_stats[k].append(stats[k])

        for k, vs in epoch_stats.items():
            if vs:
                writer.add_scalar(f'ppo/{k}', float(np.mean(vs)), iter_idx)

        # 4. Export updated model.
        torch.save(model.state_dict(), args.out_pt)
        _export_onnx_impl(model, args.out_model, device)
        write_meta(args.out_meta, args.schema_version, iter_idx, args.run_id, {
            'iter': iter_idx,
            'transitions': len(ds),
            'meanStepReward': float(rewards.mean()),
            'policyLoss': float(np.mean(epoch_stats['policy_loss'])) if epoch_stats['policy_loss'] else None,
            'valueLoss': float(np.mean(epoch_stats['value_loss'])) if epoch_stats['value_loss'] else None,
            'entropy': float(np.mean(epoch_stats['entropy'])) if epoch_stats['entropy'] else None,
            'approxKL': float(np.mean(epoch_stats['approx_kl'])) if epoch_stats['approx_kl'] else None,
        })

        # 5. Clean up rollouts to save disk (opt-out via --keep-rollouts).
        if not args.keep_rollouts:
            shutil.rmtree(rollout_dir, ignore_errors=True)

        dt = time.time() - t_iter
        print(
            f'[iter {iter_idx}] '
            f'transitions={len(ds)}  '
            f'r_mean={rewards.mean():+.4f}  '
            f'policy_loss={np.mean(epoch_stats["policy_loss"]):.4f}  '
            f'value_loss={np.mean(epoch_stats["value_loss"]):.4f}  '
            f'entropy={np.mean(epoch_stats["entropy"]):.4f}  '
            f'KL={np.mean(epoch_stats["approx_kl"]):+.4f}  '
            f'({dt:.1f}s)'
        )

    writer.close()
    print(f'\n[train_ppo] DONE. Final model: {args.out_model}')


if __name__ == '__main__':
    main()
