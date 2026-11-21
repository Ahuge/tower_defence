"""PPO training loop for the tower_defence RL prototype.

Faction-parameterized (--faction, default arcane): the policy shape
is shared across factions (17/22/46-dim state, 86 actions), with trailing
build slots padded/masked for factions with fewer than 7 towers
(see env.FACTION_TOWERS).
The game runs in TypeScript. Each iteration:
  1. Export the current policy to JSON (the live policy the TS runner loads).
  2. Run the TS episode runner as a subprocess to collect trajectories.
  3. Compute GAE advantages from the recorded rewards/values.
  4. PPO update (clipped surrogate + clipped value loss + entropy bonus + KL early stop).
  5. Optional periodic deterministic evaluation + best-policy checkpointing.

A failed runner invocation or missing trajectory file skips that iteration
(logged, run continues) instead of crashing the whole training run.
"""

import argparse
import json
import logging
import random
import shutil
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn

from env import (ACTION_DIM, ACTION_SAVE, ACTION_UPGRADE, MAX_BUILD_ACTIONS,
                 STATE_DIM, STATE_DIM_V3, STATE_DIM_V4, ZONE_DIM, build_towers,
                 collect_trajectories, compute_gae, episode_stats,
                 load_trajectories, summary_stats, zone_of_cell)
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

def reconstruct_bc_state(example, faction='arcane', state_version=2):
    """Rebuild the RL state and v2 action at a recorded placement.

    From a placement-data example (wave, gold/lives if recorded, board
    list of [towerId, col, row], chosen [col, row]). Next-wave features
    are unknown at capture time so they are 0; candidate-cell count is
    unknown, use 0.5. Feature 15 is occupied zones / 12.
    For state_version 3 or 4, pads spatial features with sensible estimates
    (zone tower counts derived from board).
    Returns (state list of floats, action int) or None if the tower
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
    zone_towers = [0] * ZONE_DIM
    for entry in board:
        tid = entry[0] if entry else None
        if tid in counts:
            counts[tid] += 1
        if entry and len(entry) >= 3:
            z = zone_of_cell(entry[1], entry[2])
            occupied.add(z)
            zone_towers[z] += 1
    state = [
        example.get('wave', 0) / 20.0,
        min(example.get('gold', 1000.0) / 1000.0, 1.0),
        min(example.get('lives', 100.0) / 100.0, 1.0),
        min(len(board) / 100.0, 1.0),
    ]
    state += [min(counts.get(t, 0) / 20.0, 1.0) for t in towers]
    state += [0.0] * (MAX_BUILD_ACTIONS - len(towers))
    state += [0.0, 0.0, 0.0, 0.0]  # next-wave features unknown
    state += [min(len(occupied) / ZONE_DIM, 1.0)]  # occupied zones
    state += [0.5]                  # candidate cells unknown
    if state_version >= 3:
        # 5 global spatial aggregates (estimated from board size)
        cov_est = min(len(board) / 20.0, 1.0)
        state += [cov_est, 0.0, 0.3, 0.2, 1.0 if len(board) >= 6 else 0.0]
    if state_version >= 4:
        # 12 zone tower densities + 12 zone path-coverage potentials
        state += [min(c / 10.0, 1.0) for c in zone_towers]
        state += [0.3] * ZONE_DIM
    expected = (STATE_DIM_V4 if state_version >= 4
                else STATE_DIM_V3 if state_version == 3
                else STATE_DIM)
    assert len(state) == expected
    tower_idx = towers.index(tower_id)
    zone = zone_of_cell(chosen[0], chosen[1])
    return state, tower_idx * ZONE_DIM + zone


def load_bc_data(path, faction='arcane', state_version=2):
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
            rec = reconstruct_bc_state(ex, faction, state_version=state_version)
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
                   batch_size=16, faction='arcane', state_version=2):
    """Cross-entropy warm start: teach 'build what Alex builds'."""
    states, actions = load_bc_data(data_path, faction, state_version=state_version)
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
    states, actions, old_logprobs, old_values, masks, advs, rets = (
        [], [], [], [], [], [], []
    )
    for ep in episodes:
        for s in ep:
            states.append(s['state'])
            actions.append(s['action'])
            old_logprobs.append(s['logprob'])
            old_values.append(s.get('value', 0.0))
            masks.append(s.get('mask', [1] * ACTION_DIM))
            advs.append(s['advantage'])
            rets.append(s['return'])
    return {
        'states': np.array(states, dtype=np.float32),
        'actions': np.array(actions, dtype=np.int64),
        'old_logprobs': np.array(old_logprobs, dtype=np.float32),
        'old_values': np.array(old_values, dtype=np.float32),
        'masks': np.array(masks, dtype=np.float32),
        'advantages': np.array(advs, dtype=np.float32),
        'returns': np.array(rets, dtype=np.float32),
    }


def ppo_update(policy, opt, batch, device, clip, ppo_epochs, minibatch,
               entropy_coef, value_coef, target_kl=None, clip_value=True):
    """Run ppo_epochs of minibatch PPO updates on one iteration's data.

    Includes:
      - Clipped value loss (prevents sudden return spikes from destabilizing
        critic weights)
      - Target-KL early stopping per epoch (prevents catastrophic policy
        drift when advantages spike)
    """
    states = torch.tensor(batch['states'], device=device)
    actions = torch.tensor(batch['actions'], device=device)
    old_logprobs = torch.tensor(batch['old_logprobs'], device=device)
    old_values = torch.tensor(batch['old_values'], device=device)
    masks = torch.tensor(batch['masks'], device=device)
    advantages = torch.tensor(batch['advantages'], device=device)
    returns = torch.tensor(batch['returns'], device=device)
    n = len(states)

    stats = {'policy_loss': 0.0, 'value_loss': 0.0, 'entropy': 0.0,
             'approx_kl': 0.0, 'clip_frac': 0.0}
    n_updates = 0
    for epoch in range(ppo_epochs):
        perm = torch.randperm(n, device=device)
        epoch_kl = 0.0
        epoch_steps = 0
        for i in range(0, n, minibatch):
            idx = perm[i:i + minibatch]
            logits, value = policy(states[idx], masks[idx])
            v_pred = value.squeeze(-1)
            log_probs = torch.log_softmax(logits, dim=-1)
            new_logprobs = log_probs.gather(1, actions[idx].unsqueeze(1)).squeeze(1)
            probs = log_probs.exp()
            entropy = -(probs * log_probs).sum(-1).mean()

            logratio = new_logprobs - old_logprobs[idx]
            ratio = torch.exp(logratio)
            surr1 = ratio * advantages[idx]
            surr2 = torch.clamp(ratio, 1 - clip, 1 + clip) * advantages[idx]
            policy_loss = -torch.min(surr1, surr2).mean()

            if clip_value:
                v_clipped = old_values[idx] + torch.clamp(
                    v_pred - old_values[idx], -clip, clip)
                v_loss1 = (v_pred - returns[idx]) ** 2
                v_loss2 = (v_clipped - returns[idx]) ** 2
                value_loss = 0.5 * torch.max(v_loss1, v_loss2).mean()
            else:
                value_loss = nn.functional.mse_loss(v_pred, returns[idx])

            loss = policy_loss + value_coef * value_loss - entropy_coef * entropy

            opt.zero_grad()
            loss.backward()
            torch.nn.utils.clip_grad_norm_(policy.parameters(), 0.5)
            opt.step()

            with torch.no_grad():
                # Schulman's unbiased approx KL estimator: (ratio - 1) - logratio
                approx_kl = ((ratio - 1) - logratio).mean().item()
                clip_frac = ((ratio < 1 - clip) | (ratio > 1 + clip)).float().mean().item()
            stats['policy_loss'] += policy_loss.item()
            stats['value_loss'] += value_loss.item()
            stats['entropy'] += entropy.item()
            stats['approx_kl'] += approx_kl
            stats['clip_frac'] += clip_frac
            n_updates += 1
            epoch_kl += approx_kl
            epoch_steps += 1

        if target_kl is not None and epoch_steps > 0:
            if (epoch_kl / epoch_steps) > 1.5 * target_kl:
                break

    for k in stats:
        stats[k] /= max(n_updates, 1)
    return stats


def run_mid_eval(policy_json, faction, difficulty, episodes, runner_path,
                 traj_dir, workers):
    """Run a deterministic evaluation on fixed seeds (100..100*episodes)."""
    seeds = [100 * (i + 1) for i in range(episodes)]
    eval_traj = traj_dir / '_mid_eval.jsonl'
    eval_sum = traj_dir / '_mid_eval_summary.json'
    extra = ['--faction', faction, '--deterministic',
             '--seeds', ','.join(str(s) for s in seeds)]
    eps, summary = collect_trajectories(
        policy_json, episodes, difficulty, eval_traj, eval_sum,
        runner_path, extra_args=extra, workers=workers)
    st = summary_stats(summary, episode_stats(eps))
    wins = int(round((st['win_rate'] or 0.0) * st['episodes']))
    return {
        'wins': wins,
        'episodes': st['episodes'],
        'win_rate': st['win_rate'] or 0.0,
        'avg_wave': st['avg_wave'] or 0.0,
        'mean_reward': st['mean_reward'] or 0.0,
    }


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
    p.add_argument('--best-policy-out', default=None,
                   help='path to save the best deterministic-eval policy JSON')
    p.add_argument('--ckpt-dir', default=str(DEFAULT_CKPT_DIR))
    p.add_argument('--resume', default=None, help='checkpoint .pt to resume from')
    p.add_argument('--arch', default='decoupled_res',
                   choices=['shared', 'decoupled_res'],
                   help='network architecture (default: decoupled_res)')
    p.add_argument('--hidden-dim', type=int, default=128,
                   help='hidden dimension for decoupled_res trunk')
    p.add_argument('--lr', type=float, default=3e-4)
    p.add_argument('--lr-final', type=float, default=None,
                   help='if set, linearly anneal learning rate to this value')
    p.add_argument('--clip', type=float, default=0.2)
    p.add_argument('--target-kl', type=float, default=0.02,
                   help='target KL for early-stopping PPO epochs (0 to disable)')
    p.add_argument('--gamma', type=float, default=0.99)
    p.add_argument('--gae-lambda', type=float, default=0.95)
    p.add_argument('--ppo-epochs', type=int, default=4)
    p.add_argument('--minibatch', type=int, default=64)
    p.add_argument('--entropy-coef', type=float, default=0.01)
    p.add_argument('--entropy-final', type=float, default=None,
                   help='if set, linearly anneal the entropy coefficient '
                        'from --entropy-coef to this value over the run.')
    p.add_argument('--value-coef', type=float, default=0.5)
    p.add_argument('--eval-every', type=int, default=20,
                   help='run deterministic eval every N iterations (0 to disable)')
    p.add_argument('--eval-episodes', type=int, default=25,
                   help='number of fixed-seed episodes per mid-run eval')
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
    p.add_argument('--state-version', type=int, default=4, choices=[2, 3, 4],
                   help='state features: 2 = 17-dim, 3 = 22-dim, '
                        '4 = 46-dim (adds per-zone tower & coverage)')
    p.add_argument('--workers', type=int, default=None,
                   help='parallel episode-runner processes')
    p.add_argument('--device', default='auto',
                   choices=['auto', 'cpu', 'cuda'])
    args = p.parse_args()

    build_towers(args.faction)
    if args.policy_out is None:
        args.policy_out = str(Path(__file__).parent
                              / f'policy-{args.faction}.json')
    if args.traj_dir is None:
        args.traj_dir = str(Path(__file__).parent
                            / f'trajectories-{args.faction}')

    if args.device == 'auto':
        device = torch.device('cpu')
        logger.info('Device: cpu (auto)')
    else:
        device = torch.device(args.device)
        if device.type == 'cuda' and not torch.cuda.is_available():
            logger.warning('--device cuda requested but CUDA not available — CPU')
            device = torch.device('cpu')
        logger.info('Device: %s', device)
    torch.manual_seed(0)
    random.seed(0)
    np.random.seed(0)

    state_dim = (STATE_DIM_V4 if args.state_version == 4
                 else STATE_DIM_V3 if args.state_version == 3
                 else STATE_DIM)
    hidden = ([args.hidden_dim, args.hidden_dim]
              if args.arch == 'decoupled_res' else [128, 64])
    policy = ActorCritic(state_dim=state_dim, hidden=hidden,
                         arch=args.arch).to(device)
    opt = torch.optim.AdamW(policy.parameters(), lr=args.lr, weight_decay=1e-4)
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
                       faction=args.faction,
                       state_version=args.state_version)

    policy_out = Path(args.policy_out)
    best_policy_out = (Path(args.best_policy_out)
                       if args.best_policy_out
                       else policy_out.with_name(policy_out.stem + '-best.json'))
    traj_dir = Path(args.traj_dir)
    traj_dir.mkdir(parents=True, exist_ok=True)

    best_eval_key = (-1, -1.0)  # (wins, avg_wave)
    target_kl = args.target_kl if (args.target_kl and args.target_kl > 0) else None

    for it in range(start_iter + 1, start_iter + args.iters + 1):
        logger.info('=== iteration %d/%d ===', it, start_iter + args.iters)
        policy.export_json(policy_out)

        traj_path = traj_dir / f'iter{it}.jsonl'
        summary_path = traj_dir / f'iter{it}-summary.json'
        try:
            episodes, summary = collect_trajectories(
                policy_out, args.episodes_per_iter, args.difficulty,
                traj_path, summary_path, args.runner,
                extra_args=['--faction', args.faction,
                            '--state-version', str(args.state_version)],
                workers=args.workers)
        except (FileNotFoundError, RuntimeError) as e:
            logger.error('iteration %d: runner failed, skipping: %s', it, e)
            continue
        if not episodes:
            logger.error('iteration %d: no trajectories collected, skipping', it)
            continue

        compute_gae(episodes, gamma=args.gamma, lam=args.gae_lambda)
        batch = flatten(episodes)
        adv = batch['advantages']
        batch['advantages'] = (adv - adv.mean()) / (adv.std() + 1e-8)

        total = max(args.iters, 1)
        progress = (it - start_iter - 1) / max(total - 1, 1)
        progress = min(1.0, max(0.0, progress))
        ent_coef = args.entropy_coef
        if args.entropy_final is not None:
            ent_coef = (args.entropy_coef
                        + (args.entropy_final - args.entropy_coef) * progress)

        if args.lr_final is not None:
            cur_lr = args.lr + (args.lr_final - args.lr) * progress
            for pg in opt.param_groups:
                pg['lr'] = cur_lr

        upd = ppo_update(policy, opt, batch, device, args.clip,
                         args.ppo_epochs, args.minibatch,
                         ent_coef, args.value_coef,
                         target_kl=target_kl, clip_value=True)

        act_counts = np.bincount(batch['actions'], minlength=ACTION_DIM)
        n_act = max(int(act_counts.sum()), 1)
        build_frac = float(act_counts[:ACTION_SAVE].sum()) / n_act
        save_frac = float(act_counts[ACTION_SAVE]) / n_act
        upg_frac = float(act_counts[ACTION_UPGRADE]) / n_act
        top_action = int(act_counts.argmax())

        stats = summary_stats(summary, episode_stats(episodes))
        rec = {'iteration': it, **stats, **upd,
               'entropy_coef': ent_coef,
               'build_frac': build_frac, 'save_frac': save_frac,
               'upgrade_frac': upg_frac, 'top_action': top_action,
               'action_counts': act_counts.tolist()}

        policy.export_json(policy_out)

        # Periodic deterministic evaluation & best-checkpoint tracking
        if args.eval_every > 0 and (it % args.eval_every == 0 or it == start_iter + args.iters):
            try:
                ev = run_mid_eval(policy_out, args.faction, args.difficulty,
                                  args.eval_episodes, args.runner, traj_dir,
                                  args.workers)
                rec['eval'] = ev
                key = (ev['wins'], round(ev['avg_wave'], 2))
                is_best = key > best_eval_key
                if is_best:
                    best_eval_key = key
                    shutil.copyfile(policy_out, best_policy_out)
                logger.info(
                    '  [EVAL iter %d] det wins=%d/%d (%.1f%%) avg_wave=%.1f %s',
                    it, ev['wins'], ev['episodes'], 100.0 * ev['win_rate'],
                    ev['avg_wave'], '*** NEW BEST ***' if is_best else '')
            except Exception as e:
                logger.warning('  [EVAL iter %d] failed: %s', it, e)

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

        if it % 5 == 0:
            ckpt_path = save_checkpoint(policy, opt, it, history,
                                        args.ckpt_dir, args.faction)
            logger.info('checkpoint saved: %s', ckpt_path)
        hist_path = Path(args.ckpt_dir) / 'history.json'
        hist_path.parent.mkdir(parents=True, exist_ok=True)
        hist_path.write_text(json.dumps(history, indent=2))

    save_checkpoint(policy, opt, start_iter + args.iters, history,
                    args.ckpt_dir, args.faction)
    # If we tracked a best deterministic-eval policy during the run, restore it
    # to policy_out at the end so downstream eval_rl.py evaluates the peak model
    # rather than a potentially over-sharpened final iteration.
    if best_policy_out.exists() and best_eval_key[0] >= 0:
        shutil.copyfile(best_policy_out, policy_out)
        logger.info('Restored best eval policy (wins=%d, avg_wave=%.2f) -> %s',
                    best_eval_key[0], best_eval_key[1], policy_out)
    else:
        policy.export_json(policy_out)
    logger.info('Done. Final policy: %s', policy_out)


if __name__ == '__main__':
    main()
