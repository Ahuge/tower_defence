"""Evaluate an RL policy JSON on fixed seeds (arcane, hard).

Thin wrapper over the TypeScript episode runner: runs the policy in
deterministic (argmax) mode on the first N seeds of the eval_set.mts
scheme (100, 200, ..., 2500) and reports win rate / avg wave / avg reward
against the imitation baseline (20/50 wins on hard = 40%).

Usage:
    python ml/desktop/eval_rl.py --policy ml/desktop/rl/policy-arcane.json \\
        --episodes 50 --difficulty hard --deterministic \\
        --out ml/desktop/rl/eval-arcane.json

NOTE: this passes --deterministic and --seeds <comma-separated> to the
runner; the TypeScript runner must accept those flags.
"""

import argparse
import json
import logging
from pathlib import Path

from env import collect_trajectories, episode_stats, summary_stats

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)

# Imitation baseline: eval-v5/v7, arcane on hard.
BASELINE_WINS = 20
BASELINE_EPISODES = 50

EVAL_SEEDS = list(range(100, 2600, 100))  # 100..2500 step 100, eval_set.mts


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--policy', required=True, help='policy weights JSON')
    p.add_argument('--episodes', type=int, default=50)
    p.add_argument('--difficulty', default='hard')
    p.add_argument('--deterministic', action='store_true',
                   help='argmax actions instead of sampling')
    p.add_argument('--out', default=None, help='results JSON path')
    p.add_argument('--runner', default=str(Path(__file__).parent / 'run_episode.mts'))
    p.add_argument('--traj-dir', default=str(Path(__file__).parent / 'eval-trajs'))
    p.add_argument('--workers', type=int, default=None,
                   help='parallel episode-runner processes (default: CPU '
                        'count, clamped to episode count)')
    args = p.parse_args()

    seeds = EVAL_SEEDS[:args.episodes]
    logger.info('Evaluating %s on %d episodes (%s, seeds %s..%s, '
                'deterministic=%s)',
                args.policy, args.episodes, args.difficulty,
                seeds[0], seeds[-1], args.deterministic)

    traj_dir = Path(args.traj_dir)
    traj_dir.mkdir(parents=True, exist_ok=True)
    traj_path = traj_dir / 'eval.jsonl'
    summary_path = traj_dir / 'eval-summary.json'

    extra_args = ['--seeds', ','.join(str(s) for s in seeds)]
    if args.deterministic:
        extra_args.append('--deterministic')
    episodes, summary = collect_trajectories(
        args.policy, args.episodes, args.difficulty,
        traj_path, summary_path, args.runner, extra_args=extra_args,
        workers=args.workers)

    stats = summary_stats(summary, episode_stats(episodes))

    baseline_rate = BASELINE_WINS / BASELINE_EPISODES
    results = {
        'policy': str(args.policy),
        'faction': 'arcane',
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
        'baseline': {'wins': BASELINE_WINS, 'episodes': BASELINE_EPISODES,
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
                BASELINE_WINS, BASELINE_EPISODES,
                results['avg_wave'], results['mean_reward'])

    if args.out:
        out_path = Path(args.out)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(results, indent=2))
        logger.info('Results written: %s', out_path)
    print(json.dumps(results, indent=2))


if __name__ == '__main__':
    main()
