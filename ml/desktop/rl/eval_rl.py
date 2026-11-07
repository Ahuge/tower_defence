"""Evaluate an RL policy JSON on fixed seeds (faction-parameterized).

Thin wrapper over the TypeScript episode runner: runs the policy in
deterministic (argmax) mode on the first N seeds of the eval_set.mts
scheme (100, 200, ..., 2500) and reports win rate / avg wave / avg reward
against the faction's imitation baseline.

Usage:
    python ml/desktop/eval_rl.py --policy ml/desktop/rl/policy-arcane.json \\
        --faction arcane --episodes 50 --difficulty hard --deterministic \\
        --out ml/desktop/rl/eval-arcane.json

NOTE: this passes --deterministic and --seeds <comma-separated> to the
runner; the TypeScript runner must accept those flags.
"""

import argparse
import json
import logging
from pathlib import Path

from env import build_towers, collect_trajectories, episode_stats, summary_stats

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

# Imitation baselines (eval-v5, hard, 50 episodes): wins / total.
# Arcane 20/50 (40%); psionic 13/50 (26%) — the v7 collapse to 0/50
# was a one-hot-removal artifact, so v5 is the comparison point.
BASELINES = {
    'arcane': (20, 50),
    'psionic': (13, 50),
}

EVAL_SEEDS = list(range(100, 2600, 100))  # 100..2500 step 100, eval_set.mts


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--policy', required=True, help='policy weights JSON')
    p.add_argument('--faction', default='arcane',
                   help='faction the policy plays (arcane, psionic, ...)')
    p.add_argument('--episodes', type=int, default=50)
    p.add_argument('--difficulty', default='hard')
    p.add_argument('--deterministic', action='store_true',
                   help='argmax actions instead of sampling')
    p.add_argument('--out', default=None, help='results JSON path')
    p.add_argument('--runner', default=str(Path(__file__).parent / 'run_episode.mts'))
    p.add_argument('--traj-dir', default=None,
                   help='trajectory output dir '
                        '(default: eval-trajs-<faction>)')
    p.add_argument('--workers', type=int, default=None,
                   help='parallel episode-runner processes (default: CPU '
                        'count, clamped to episode count)')
    args = p.parse_args()

    # Validate the faction early.
    build_towers(args.faction)
    if args.faction not in BASELINES:
        raise ValueError(
            f'no imitation baseline for faction {args.faction!r} '
            f'(known: {sorted(BASELINES)}) — add one to BASELINES')
    baseline_wins, baseline_episodes = BASELINES[args.faction]
    if args.traj_dir is None:
        args.traj_dir = str(Path(__file__).parent
                            / f'eval-trajs-{args.faction}')

    seeds = EVAL_SEEDS[:args.episodes]
    logger.info('Evaluating %s on %d episodes (%s, seeds %s..%s, '
                'deterministic=%s)',
                args.policy, args.episodes, args.difficulty,
                seeds[0], seeds[-1], args.deterministic)

    traj_dir = Path(args.traj_dir)
    traj_dir.mkdir(parents=True, exist_ok=True)
    traj_path = traj_dir / 'eval.jsonl'
    summary_path = traj_dir / 'eval-summary.json'

    extra_args = ['--faction', args.faction,
                  '--seeds', ','.join(str(s) for s in seeds)]
    if args.deterministic:
        extra_args.append('--deterministic')
    episodes, summary = collect_trajectories(
        args.policy, args.episodes, args.difficulty,
        traj_path, summary_path, args.runner, extra_args=extra_args,
        workers=args.workers)

    stats = summary_stats(summary, episode_stats(episodes))

    baseline_rate = baseline_wins / baseline_episodes
    results = {
        'policy': str(args.policy),
        'faction': args.faction,
        'difficulty': args.difficulty,
        'episodes': args.episodes,
        'seeds': seeds,
        'deterministic': args.deterministic,
        'win_rate': stats['win_rate'],
        'wins': (int(round(stats['win_rate'] * args.episodes))
                 if stats['win_rate'] is not None else None),
        'avg_wave': stats['avg_wave'],
        'mean_reward': stats['mean_reward'],
        'mean_length': stats['mean_length'],
        'baseline': {'wins': baseline_wins, 'episodes': baseline_episodes,
                     'win_rate': baseline_rate},
        'delta_vs_baseline': (
            stats['win_rate'] - baseline_rate
            if stats['win_rate'] is not None else None),
    }

    wr = results['win_rate']
    logger.info('Eval: win rate %s (%s/%d) vs imitation baseline %.2f '
                '(%d/%d); avg wave %.1f; mean reward %.3f',
                ('%.3f' % wr) if wr is not None else 'n/a',
                results['wins'], args.episodes, baseline_rate,
                baseline_wins, baseline_episodes,
                results['avg_wave'], results['mean_reward'])

    if args.out:
        out_path = Path(args.out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(results, indent=2))
        logger.info('Results written: %s', out_path)
    print(json.dumps(results, indent=2))


if __name__ == '__main__':
    main()
