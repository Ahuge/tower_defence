"""PPO training loop for the tower_defence RL prototype.

Faction-parameterized (--faction, default arcane): the policy shape
is shared across factions (17-dim state, 86 actions), with trailing
build slots padded/masked for factions with fewer than 7 towers
(see env.FACTION_TOWERS).
The game runs in TypeScript. Each iteration:
  1. Export the current policy to JSON (the live policy the TS runner loads).
  2. Run the TS episode runner as a subprocess to collect trajectories.
  3. Compute GAE advantages from the recorded rewards/values.
  4. PPO update (clipped surrogate + value loss + entropy bonus).

Usage:
    python ml/desktop/train_ppo.py --episodes-per-iter 32 --iters 50 \\
        --policy-out ml/desktop/rl/policy-arcane.json \\
        --ckpt-dir ml/desktop/rl/checkpoints \\
        --traj-dir ml/desktop/rl/trajectories \\
        --pretrain --init-from-scorer ml/desktop/models/scorer-arcane.pt

A failed runner invocation or missing trajectory file skips that iteration
(logged, run continues) instead of crashing the whole training run.
"""

import argparse
import json
import logging
import random
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn

from env import (ACTION_DIM, ACTION_SAVE, ACTION_UPGRADE, MAX_BUILD_ACTIONS,
                 STATE_DIM, ZONE_DIM, build_towers, collect_trajectories,
                 compute_gae, episode_stats, load_trajectories,
                 summary_stats, zone_of_cell)
from policy import ActorCritic

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_RUNNER = Path(__file__).parent / 'run_episode.mts'
DEFAULT_POLICY_OUT = Path(__file__).parent / 'policy-arcane.json'
DEFAULT_CKPT_DIR = Path(__file__).parent / 'checkpoints'
DEFAULT_TRAJ_DIR = Path(__file__).parent / 'trajectories'
DEFAULT_BC_DATA = REPO_ROOT / 'ml' / 'placement-data.jsonl'


# ---------------------------------------------------------------------------
# Behavior-cloning warm start
# ---------------------------------------------------------------------------

def reconstruct_bc_state(example, faction='arcane'):
    """Rebuild the 17-dim RL state and v2 action at a recorded placement.

    From a placement-data example (wave, gold/lives if recorded, board
    list of [towerId, col, row], chosen [col, row]). Next-wave features
    are unknown at capture time so they are 0; candidate-cell count is
    unknown, use 0.5. Feature 15 is occupied zones / 12.
    Returns (state list of 17 floats, action int) or None if the tower
    built is not one of the faction's build actions or the placement
    cell is missing.
    """
    towers = build_towers(faction)
    tower_id = example.get('towerId')
    if tower_id not in towers:
        return None
    chosen = example.get('chosen')
    if not chosen or len(chosen) < 2:
        return None
    board = example.get('board', []) or []
    counts = {t: 0 for t in towers}
    occupied = set()
    for entry in board:
        tid = entry[0] if entry else None
        if tid in counts:
            counts[tid] += 1
        if entry and len(entry) >= 3:
            occupied.add(zone_of_cell(entry[1], entry[2]))
    state = [
        example.get('wave', 0) / 20.0,
        min(example.get('gold', 1000.0) / 1000.0, 1.0),
        min(example.get('lives', 100.0) / 100.0, 1.0),
        min(len(board) / 100.0, 1.0),
    ]
    # Per-tower counts in action order; trailing slots pad with 0 for
    # factions with fewer than 7 towers (always-masked actions).
    state += [min(counts.get(t, 0) / 20.0, 1.0) for t in towers]
    state += [0.0] * (MAX_BUILD_ACTIONS - len(towers))
    state += [0.0, 0.0, 0.0, 0.0]  # next-wave features unknown
    state += [min(len(occupied) / ZONE_DIM, 1.0)]  # occupied zones
    state += [0.5]                  # candidate cells unknown
    assert len(state) == STATE_DIM
    tower_idx = towers.index(tower_id)
    zone = zone_of_cell(chosen[0], chosen[1])
    return state, tower_idx * ZONE_DIM + zone


def load_bc_data(path, faction='arcane'):
    """Load (states, actions) for behavior cloning from placement data."""
    path = Path(path)
    if not path.exists():
        logger.warning('BC data not found: %s (may only exist on Alex\'s '
                       'desktop) — skipping pre-training', path)
        return None, None
    states, actions = [], []
    n_skipped = 0
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            ex = json.loads(line)
            if ex.get('faction') != faction:
                continue
            rec = reconstruct_bc_state(ex, faction)
            if rec is None:
                n_skipped += 1
                continue
            s, a = rec
            states.append(s)
            actions.append(a)
    if not states:
        logger.warning('BC data: no usable %s examples in %s', faction, path)
        return None, None
    logger.info('BC data: %d %s examples (%d skipped: non-build tower '
                'or missing placement)', len(states), faction, n_skipped)
    return (torch.tensor(states, dtype=torch.float32),
            torch.tensor(actions, dtype=torch.long))


def behavior_clone(policy, data_path, device, epochs=20, lr=1e-3,
                   batch_size=16, faction='arcane'):
    """Cross-entropy warm start: teach 'build what Alex builds'.

    Trains only the policy head path (whole net, but the loss is the
    policy cross-entropy on the recorded build action). Returns the final
    top-1 accuracy on the BC set, or None if no data was available.
    """
    states, actions = load_bc_data(data_path, faction)
    if states is None:
        return None
    states, actions = states.to(device), actions.to(device)
    if len(states) < 10:
        logger.warning('BC data is very thin (%d examples) — warm start '
                       'will be weak; PPO will have to do most of the work',
                       len(states))
    opt = torch.optim.AdamW(policy.parameters(), lr=lr, weight_decay=0.01)
    n = len(states)
    for epoch in range(epochs):
        policy.train()
        perm = torch.randperm(n, device=device)
        total_loss, total_correct = 0.0, 0
        for i in range(0, n, batch_size):
            idx = perm[i:i + batch_size]
            logits, _ = policy(states[idx])
            loss = nn.functional.cross_entropy(logits, actions[idx])
            opt.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(policy.parameters(), 1.0)
            opt.step()
            total_loss += loss.item() * len(idx)
            total_correct += (logits.argmax(-1) == actions[idx]).sum().item()
        acc = total_correct / n
        if (epoch + 1) % 5 == 0 or epoch == 0:
            logger.info('  BC epoch %d/%d: loss=%.4f top1-acc=%.3f',
                        epoch + 1, epochs, total_loss / n, acc)
    policy.eval()
    with torch.no_grad():
        logits, _ = policy(states)
        acc = (logits.argmax(-1) == actions).float().mean().item()
    logger.info('BC pre-training done: top-1 accuracy %.3f on %d examples',
                acc, n)
    return acc


# ---------------------------------------------------------------------------
# PPO
# ---------------------------------------------------------------------------

def flatten(episodes):
    """Flatten GAE-annotated episodes into training tensors (numpy)."""
    states, actions, old_logprobs, masks, advs, rets = [], [], [], [], [], []
    for ep in episodes:
        for s in ep:
            states.append(s['state'])
            actions.append(s['action'])
            old_logprobs.append(s['logprob'])
            masks.append(s.get('mask', [1] * ACTION_DIM))
            advs.append(s['advantage'])
            rets.append(s['return'])
    return {
        'states': np.array(states, dtype=np.float32),
        'actions': np.array(actions, dtype=np.int64),
        'old_logprobs': np.array(old_logprobs, dtype=np.float32),
        'masks': np.array(masks, dtype=np.float32),
        'advantages': np.array(advs, dtype=np.float32),
        'returns': np.array(rets, dtype=np.float32),
    }


def ppo_update(policy, opt, batch, device, clip, ppo_epochs, minibatch,
               entropy_coef, value_coef):
    """Run ppo_epochs of minibatch PPO updates on one iteration's data."""
    states = torch.tensor(batch['states'], device=device)
    actions = torch.tensor(batch['actions'], device=device)
    old_logprobs = torch.tensor(batch['old_logprobs'], device=device)
    masks = torch.tensor(batch['masks'], device=device)
    advantages = torch.tensor(batch['advantages'], device=device)
    returns = torch.tensor(batch['returns'], device=device)
    n = len(states)

    stats = {'policy_loss': 0.0, 'value_loss': 0.0, 'entropy': 0.0,
             'approx_kl': 0.0, 'clip_frac': 0.0}
    n_updates = 0
    for _ in range(ppo_epochs):
        perm = torch.randperm(n, device=device)
        for i in range(0, n, minibatch):
            idx = perm[i:i + minibatch]
            logits, value = policy(states[idx], masks[idx])
            log_probs = torch.log_softmax(logits, dim=-1)
            new_logprobs = log_probs.gather(1, actions[idx].unsqueeze(1)).squeeze(1)
            probs = log_probs.exp()
            entropy = -(probs * log_probs).sum(-1).mean()

            ratio = torch.exp(new_logprobs - old_logprobs[idx])
            surr1 = ratio * advantages[idx]
            surr2 = torch.clamp(ratio, 1 - clip, 1 + clip) * advantages[idx]
            policy_loss = -torch.min(surr1, surr2).mean()
            value_loss = nn.functional.mse_loss(value.squeeze(-1), returns[idx])
            loss = policy_loss + value_coef * value_loss - entropy_coef * entropy

            opt.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(policy.parameters(), 1.0)
            opt.step()

            with torch.no_grad():
                approx_kl = (old_logprobs[idx] - new_logprobs).mean().item()
                clip_frac = ((ratio < 1 - clip) | (ratio > 1 + clip)).float().mean().item()
            stats['policy_loss'] += policy_loss.item()
            stats['value_loss'] += value_loss.item()
            stats['entropy'] += entropy.item()
            stats['approx_kl'] += approx_kl
            stats['clip_frac'] += clip_frac
            n_updates += 1
    for k in stats:
        stats[k] /= max(n_updates, 1)
    return stats


def save_checkpoint(policy, opt, iteration, history, ckpt_dir, faction='arcane'):
    ckpt_dir = Path(ckpt_dir)
    ckpt_dir.mkdir(parents=True, exist_ok=True)
    path = ckpt_dir / f'ppo-{faction}-iter{iteration}.pt'
    torch.save({
        'iteration': iteration,
        'policy_state': policy.state_dict(),
        'optimizer_state': opt.state_dict(),
        'history': history,
    }, path)
    return path


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--faction', default='arcane',
                   help='faction to train (arcane, psionic, ...)')
    p.add_argument('--episodes-per-iter', type=int, default=32)
    p.add_argument('--iters', type=int, default=50)
    p.add_argument('--policy-out', default=None,
                   help='live policy weights JSON the TS runner loads '
                        '(default: policy-<faction>.json)')
    p.add_argument('--ckpt-dir', default=str(DEFAULT_CKPT_DIR))
    p.add_argument('--resume', default=None, help='checkpoint .pt to resume from')
    p.add_argument('--lr', type=float, default=3e-4)
    p.add_argument('--clip', type=float, default=0.2)
    p.add_argument('--gamma', type=float, default=0.99)
    p.add_argument('--gae-lambda', type=float, default=0.95)
    p.add_argument('--ppo-epochs', type=int, default=4)
    p.add_argument('--minibatch', type=int, default=64)
    p.add_argument('--entropy-coef', type=float, default=0.01)
    p.add_argument('--entropy-final', type=float, default=None,
                   help='if set, linearly anneal the entropy coefficient '
                        'from --entropy-coef to this value over the run. '
                        'High early exploration, low late convergence.')
    p.add_argument('--value-coef', type=float, default=0.5)
    p.add_argument('--pretrain', action='store_true',
                   help='behavior-cloning warm start before PPO')
    p.add_argument('--bc-data', default=str(DEFAULT_BC_DATA))
    p.add_argument('--bc-epochs', type=int, default=20)
    p.add_argument('--bc-lr', type=float, default=1e-3)
    p.add_argument('--init-from-scorer', default=None,
                   help='imitation scorer .pt to warm-start trunk2/value')
    p.add_argument('--runner', default=str(DEFAULT_RUNNER),
                   help='path to run_episode.mts')
    p.add_argument('--traj-dir', default=None,
                   help='trajectory output dir '
                        '(default: trajectories-<faction>)')
    p.add_argument('--difficulty', default='hard')
    p.add_argument('--workers', type=int, default=None,
                   help='parallel episode-runner processes (default: CPU '
                        'count, clamped to episodes per iteration)')
    p.add_argument('--device', default='auto',
                   choices=['auto', 'cpu', 'cuda'],
                   help='torch device. auto (default) uses CPU: the policy '
                        'is a tiny 17->128->64 MLP, and a PPO update on an '
                        'RTX 4070 measured ~3x SLOWER than CPU (kernel-launch '
                        'overhead dominates). Pass cuda to force the GPU.')
    args = p.parse_args()

    # Validate the faction early — build_towers raises for unknown ones.
    build_towers(args.faction)
    if args.policy_out is None:
        args.policy_out = str(Path(__file__).parent
                              / f'policy-{args.faction}.json')
    if args.traj_dir is None:
        args.traj_dir = str(Path(__file__).parent
                            / f'trajectories-{args.faction}')

    if args.device == 'auto':
        # The policy is 17->128->64->86: ~16k params. At that size a PPO
        # update (4 epochs x ~240 minibatches) is dominated by per-kernel
        # launch latency, so CPU is faster than the GPU (measured 0.29 s
        # vs 0.88 s per iteration on an RTX 4070). GPU is also 6% idle by
        # design here — the bottleneck is episode simulation, not the net.
        device = torch.device('cpu')
        logger.info('Device: cpu (auto: tiny MLP is faster on CPU; '
                    'pass --device cuda to force the GPU)')
    else:
        device = torch.device(args.device)
        if device.type == 'cuda' and not torch.cuda.is_available():
            logger.warning('--device cuda requested but CUDA is not '
                           'available — falling back to CPU')
            device = torch.device('cpu')
        logger.info('Device: %s', device)
        if device.type == 'cuda':
            logger.info('GPU: %s', torch.cuda.get_device_name(0))
    torch.manual_seed(0)
    random.seed(0)
    np.random.seed(0)

    policy = ActorCritic().to(device)
    opt = torch.optim.AdamW(policy.parameters(), lr=args.lr, weight_decay=0.01)
    start_iter = 0
    history = []

    if args.resume:
        ckpt = torch.load(args.resume, map_location=device, weights_only=False)
        policy.load_state_dict(ckpt['policy_state'])
        opt.load_state_dict(ckpt['optimizer_state'])
        start_iter = ckpt['iteration']
        history = ckpt.get('history', [])
        logger.info('Resumed from %s at iteration %d', args.resume, start_iter)

    if args.init_from_scorer:
        transferred = policy.init_from_scorer(args.init_from_scorer)
        logger.info('init_from_scorer transferred: %s',
                    transferred or 'none (all skipped)')

    if args.pretrain:
        logger.info('Behavior-cloning warm start (%s)...', args.faction)
        behavior_clone(policy, args.bc_data, device,
                       epochs=args.bc_epochs, lr=args.bc_lr,
                       faction=args.faction)

    policy_out = Path(args.policy_out)
    traj_dir = Path(args.traj_dir)
    traj_dir.mkdir(parents=True, exist_ok=True)

    for it in range(start_iter + 1, start_iter + args.iters + 1):
        logger.info('=== iteration %d/%d ===', it, start_iter + args.iters)
        # 1. Export current policy for the runner.
        policy.export_json(policy_out)

        # 2. Collect trajectories from the TS runner.
        traj_path = traj_dir / f'iter{it}.jsonl'
        summary_path = traj_dir / f'iter{it}-summary.json'
        try:
            episodes, summary = collect_trajectories(
                policy_out, args.episodes_per_iter, args.difficulty,
                traj_path, summary_path, args.runner,
                extra_args=['--faction', args.faction],
                workers=args.workers)
        except (FileNotFoundError, RuntimeError) as e:
            logger.error('iteration %d: runner failed, skipping: %s', it, e)
            continue
        if not episodes:
            logger.error('iteration %d: no trajectories collected, skipping', it)
            continue

        # 3. GAE advantages, normalized per iteration.
        compute_gae(episodes, gamma=args.gamma, lam=args.gae_lambda)
        batch = flatten(episodes)
        adv = batch['advantages']
        batch['advantages'] = (adv - adv.mean()) / (adv.std() + 1e-8)

        # Entropy coefficient: optionally anneal over the run so the
        # agent explores hard early (escaping the cheap-tower local
        # optimum) and sharpens late.
        total = max(args.iters, 1)
        progress = (it - start_iter - 1) / max(total - 1, 1)
        progress = min(1.0, max(0.0, progress))
        ent_coef = args.entropy_coef
        if args.entropy_final is not None:
            ent_coef = (args.entropy_coef
                        + (args.entropy_final - args.entropy_coef) * progress)

        # 4. PPO update (recomputes logprobs with current policy + mask).
        upd = ppo_update(policy, opt, batch, device, args.clip,
                         args.ppo_epochs, args.minibatch,
                         ent_coef, args.value_coef)

        # Action mix, so a collapse to one action is visible in the log
        # (psionic previously collapsed to 100% cheapest-tower builds).
        act_counts = np.bincount(batch['actions'], minlength=ACTION_DIM)
        n_act = max(int(act_counts.sum()), 1)
        build_frac = float(act_counts[:ACTION_SAVE].sum()) / n_act
        save_frac = float(act_counts[ACTION_SAVE]) / n_act
        upg_frac = float(act_counts[ACTION_UPGRADE]) / n_act
        top_action = int(act_counts.argmax())

        # 5. Log. Prefer the runner summary (waveReached/won) over the
        # trajectory-derived fallback (see env.summary_stats).
        stats = summary_stats(summary, episode_stats(episodes))
        rec = {'iteration': it, **stats, **upd,
               'entropy_coef': ent_coef,
               'build_frac': build_frac, 'save_frac': save_frac,
               'upgrade_frac': upg_frac, 'top_action': top_action,
               'action_counts': act_counts.tolist()}
        history.append(rec)
        logger.info(
            'iter %d: mean_reward=%.3f win_rate=%s avg_wave=%.1f '
            'mean_len=%.1f pol_loss=%.4f val_loss=%.4f entropy=%.4f '
            'approx_kl=%.4f clip_frac=%.3f ent_coef=%.4f '
            'mix(build/save/upg)=%.2f/%.2f/%.2f top=%d',
            it, rec['mean_reward'],
            ('%.3f' % rec['win_rate']) if rec['win_rate'] is not None else 'n/a',
            rec['avg_wave'], rec['mean_length'],
            upd['policy_loss'], upd['value_loss'], upd['entropy'],
            upd['approx_kl'], upd['clip_frac'], ent_coef,
            build_frac, save_frac, upg_frac, top_action)

        # 6. Checkpoint every 5 iterations; always keep weights JSON fresh.
        policy.export_json(policy_out)
        if it % 5 == 0:
            ckpt_path = save_checkpoint(policy, opt, it, history,
                                        args.ckpt_dir, args.faction)
            logger.info('checkpoint saved: %s', ckpt_path)
        hist_path = Path(args.ckpt_dir) / 'history.json'
        hist_path.parent.mkdir(parents=True, exist_ok=True)
        hist_path.write_text(json.dumps(history, indent=2))

    save_checkpoint(policy, opt, start_iter + args.iters, history,
                    args.ckpt_dir, args.faction)
    policy.export_json(policy_out)
    logger.info('Done. Final policy: %s', policy_out)


if __name__ == '__main__':
    main()
