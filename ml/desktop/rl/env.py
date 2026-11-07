"""RL environment interface for the tower_defence game (arcane faction).

The game itself runs in TypeScript — Python NEVER steps the game directly.
This module documents the shared state/action/reward contract and provides
the episode-granularity "env" operations: run the TypeScript episode runner
as a subprocess, parse the trajectory JSONL it produces, and compute GAE
advantages from recorded rewards/values.

Known limitation (by design): there is no tick-by-tick ``env.step()`` from
Python. The game loop lives in TypeScript and can only be driven at episode
granularity through ``run_episode.mts``. A persistent-process stepping
interface (e.g. a socket/stdio bridge the TS side polls each tick) is future
work if per-step control from Python is ever needed; for PPO, episode
granularity is sufficient because the runner records every step.
"""

import json
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np

STATE_DIM = 17
ACTION_DIM = 9

# Canonical state feature names, in the exact order of the state vector.
# MUST match the TypeScript side (RLBrain / episode runner).
STATE_NAMES = [
    'wave',                 # 0: wave / 20
    'gold',                 # 1: gold / 1000
    'lives',                # 2: lives / 100
    'tower_count',          # 3: tower_count / 100
    'count_arcane_bolt',    # 4: / 20
    'count_arcane_frost',   # 5: / 20
    'count_arcane_storm',   # 6: / 20
    'count_arcane_focus',   # 7: / 20
    'count_arcane_drain',   # 8: / 20
    'count_arcane_meteor',  # 9: / 20
    'count_arcane_nova',    # 10: / 20
    'next_wave_creeps',     # 11: next wave total creep count / 50
    'next_wave_armored',    # 12: 0/1
    'next_wave_flying',     # 13: 0/1
    'next_wave_shielded',   # 14: 0/1
    'between_waves',        # 15: 0/1
    'candidate_cells',      # 16: candidate cells / 936
]

ACTION_NAMES = [
    'build_arcane_bolt',    # 0
    'build_arcane_frost',   # 1
    'build_arcane_storm',   # 2
    'build_arcane_focus',   # 3
    'build_arcane_drain',   # 4
    'build_arcane_meteor',  # 5
    'build_arcane_nova',    # 6
    'save',                 # 7: skip / save gold
    'upgrade_cheapest',     # 8: upgrade cheapest upgradable tower
]

# Tower built by each build action (actions 0-6), in action order.
BUILD_TOWERS = [
    'arcane_bolt', 'arcane_frost', 'arcane_storm', 'arcane_focus',
    'arcane_drain', 'arcane_meteor', 'arcane_nova',
]

# Reward shaping, as implemented on the TypeScript side. Python only
# consumes these rewards; the terms are documented here so the training
# code and the runner stay in agreement about what the signal means.
reward_terms = {
    'wave_cleared': {
        'value': '+0.1',
        'when': 'each wave cleared',
        'why': 'dense progress signal — without it the agent only learns '
               'from the sparse terminal win/loss.',
    },
    'gold': {
        'value': '+0.002 per gold gained since the last decision, '
                 'capped at +0.2 per step',
        'when': 'settled at the next between-waves decision, from the '
                'budget delta since the previous step was recorded',
        'why': 'rewards economy (kill income) without punishing spending: '
               'building lowers the budget, so a gold-held term would '
               'penalize the very builds the policy must learn.',
    },
    'life_lost': {
        'value': '-0.5 per life lost',
        'when': 'when a creep leaks',
        'why': 'the actual failure pressure — lives are the loss '
               'condition, so leaks must hurt immediately, not only at '
               'the terminal -1.',
    },
    'terminal_win': {
        'value': '+1.0',
        'when': 'last step of a won episode',
        'why': 'the true objective: beating all 20 waves on hard.',
    },
    'terminal_loss': {
        'value': '-1.0',
        'when': 'last step of a lost episode',
        'why': 'the true objective, negative side.',
    },
}


def load_trajectories(path):
    """Parse a trajectory JSONL file into episodes.

    Each line is one step:
        {"episode": 0, "step": 3, "state": [...17 floats...],
         "action": 2, "logprob": -1.23, "value": 0.45, "reward": 0.12,
         "mask": [1,1,1,1,1,1,1,1,1], "done": false}

    Returns a list of episodes; each episode is a list of step dicts
    sorted by ``step``. Episodes are ordered by their ``episode`` id.
    """
    episodes = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            step = json.loads(line)
            episodes.setdefault(step['episode'], []).append(step)
    out = []
    for ep_id in sorted(episodes):
        out.append(sorted(episodes[ep_id], key=lambda s: s['step']))
    return out


def compute_gae(episodes, gamma=0.99, lam=0.95):
    """Compute GAE advantages and returns, annotating each step in place.

    For each step t in an episode:
        delta_t = r_t + gamma * V(s_{t+1}) * (1 - done_t) - V(s_t)
        A_t     = delta_t + gamma * lam * (1 - done_t) * A_{t+1}
        return_t = A_t + V(s_t)

    V(s_{t+1}) is the recorded ``value`` of the next step; at the final
    step of an episode (done=True) the bootstrap value is 0.

    Args:
        episodes: list of episodes as returned by load_trajectories
            (each step has 'reward', 'value', 'done').
        gamma: discount factor.
        lam: GAE lambda (1 = Monte Carlo, 0 = one-step TD).

    Returns the same episodes list, with 'advantage' and 'return' added
    to every step dict.
    """
    for ep in episodes:
        last_gae = 0.0
        for t in reversed(range(len(ep))):
            step = ep[t]
            done = bool(step.get('done', t == len(ep) - 1))
            if t == len(ep) - 1 or done:
                next_value = 0.0
            else:
                next_value = float(ep[t + 1]['value'])
            value = float(step['value'])
            delta = (float(step['reward'])
                     + gamma * next_value * (0.0 if done else 1.0)
                     - value)
            last_gae = delta + gamma * lam * (0.0 if done else 1.0) * last_gae
            step['advantage'] = last_gae
            step['return'] = last_gae + value
    return episodes


def summary_stats(summary, fallback=None):
    """Merge a runner summary JSON into episode stats.

    The runner's summary format is {"episodes": [{episode, total_reward,
    waveReached, won, steps}, ...]}. Prefer its waveReached/won fields:
    the trajectory-derived wave (max state wave) lags by up to a wave
    because the state is recorded before the wave counter advances, and
    trajectory steps carry no 'won' flag. Top-level win_rate/mean_reward/
    avg_wave keys are also accepted if a future runner writes them.
    Falls back to ``fallback`` (episode_stats output) for anything missing.
    """
    stats = dict(fallback or {})
    if not summary:
        return stats
    eps = summary.get('episodes')
    if isinstance(eps, list) and eps:
        stats['episodes'] = len(eps)
        stats['win_rate'] = float(np.mean([bool(e.get('won', False)) for e in eps]))
        stats['avg_wave'] = float(np.mean([e.get('waveReached', 0) for e in eps]))
        stats['mean_reward'] = float(np.mean([e.get('total_reward', 0.0) for e in eps]))
        stats['mean_length'] = float(np.mean([e.get('steps', 0) for e in eps]))
    for key, aliases in [('win_rate', ('winRate',)),
                         ('mean_reward', ('meanReward',)),
                         ('avg_wave', ('avgWave',))]:
        if stats.get(key) is None:
            for a in aliases:
                if a in summary:
                    stats[key] = summary[a]
                    break
    return stats


def episode_stats(episodes):
    """Aggregate stats from loaded episodes (fallback when no summary)."""
    if not episodes:
        return {'episodes': 0, 'mean_reward': 0.0, 'avg_wave': 0.0,
                'mean_length': 0.0, 'win_rate': None}
    rewards = [sum(s['reward'] for s in ep) for ep in episodes]
    # wave reached = max wave feature (index 0, scaled by /20) in the ep.
    # NOTE: this lags the runner's waveReached by up to a wave (state is
    # recorded before the wave counter advances) — prefer summary_stats.
    waves = [max(s['state'][0] for s in ep) * 20 for ep in episodes]
    wins = None
    if all('won' in ep[-1] for ep in episodes):
        wins = float(np.mean([bool(ep[-1]['won']) for ep in episodes]))
    return {
        'episodes': len(episodes),
        'mean_reward': float(np.mean(rewards)),
        'avg_wave': float(np.mean(waves)),
        'mean_length': float(np.mean([len(ep) for ep in episodes])),
        'win_rate': wins,
    }


def _split_work(n_episodes, n_workers, extra_args):
    """Split episodes (and seed args) across workers.

    Returns a list of (episode_count, extra_args) tuples, one per
    worker, in episode order. Seed-bearing args are split so no two
    workers replay the same seed:
    - ``--seeds a,b,c,...`` is chunked across workers;
    - ``--seed-base N`` becomes per-worker bases N + offset;
    - no seed args means random seeds per invocation (no collision
      risk — each worker is a fresh process).
    All other extra args pass through unchanged to every worker.
    """
    extra_args = list(extra_args or [])
    counts = [n_episodes // n_workers + (1 if i < n_episodes % n_workers else 0)
              for i in range(n_workers)]
    counts = [c for c in counts if c > 0]

    def _arg_value(name):
        if name in extra_args:
            idx = extra_args.index(name)
            return extra_args[idx + 1] if idx + 1 < len(extra_args) else None
        return None

    seeds = _arg_value('--seeds')
    seed_base = _arg_value('--seed-base')
    if seeds is not None:
        seed_list = [s.strip() for s in seeds.split(',') if s.strip()]
        if len(seed_list) < n_episodes:
            raise ValueError(
                f'--seeds gave {len(seed_list)} seeds but {n_episodes} '
                'episodes were requested')
        chunks, off = [], 0
        for c in counts:
            chunks.append(seed_list[off:off + c])
            off += c
        out = []
        for c, chunk in zip(counts, chunks):
            args = [a for a in extra_args]
            idx = args.index('--seeds')
            args[idx + 1] = ','.join(chunk)
            out.append((c, args))
        return out
    if seed_base is not None:
        base = int(seed_base)
        out, off = [], 0
        for c in counts:
            args = [a for a in extra_args]
            idx = args.index('--seed-base')
            args[idx + 1] = str(base + off)
            out.append((c, args))
            off += c
        return out
    return [(c, list(extra_args)) for c in counts]


def _runner_cmd(runner_path):
    """Build the node invocation for the episode runner.

    Prefers the esbuild bundle (run_episode.bundle.mjs) when it exists
    next to the .mts runner — plain `node`, no tsx startup tax (~1-4s
    saved per worker spawn). Falls back to `node --import tsx` with a
    warning when the bundle is missing (run
    `node ml/desktop/rl/build-runner.mjs` to build it).
    """
    runner_path = Path(runner_path)
    bundle = runner_path.with_name('run_episode.bundle.mjs')
    if runner_path.suffix == '.mjs' and runner_path.exists():
        return ['node', str(runner_path)]
    if bundle.exists():
        return ['node', str(bundle)]
    print(f'WARNING: runner bundle not found at {bundle} — falling back '
          f'to tsx (slow startup). Run node ml/desktop/rl/build-runner.mjs.',
          file=sys.stderr)
    return ['node', '--import', 'tsx', str(runner_path)]


def _run_one_worker(policy_json, n_episodes, difficulty, traj_path,
                    summary_path, runner_path, extra_args):
    """Run the episode runner once; return (episodes, summary)."""
    cmd = _runner_cmd(runner_path) + [
        '--policy', str(policy_json),
        '--episodes', str(n_episodes),
        '--difficulty', difficulty,
        '--out', str(traj_path),
        '--summary', str(summary_path),
    ]
    if extra_args:
        cmd += list(extra_args)
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(
            f'episode runner failed (exit {result.returncode}):\n'
            f'stdout: {result.stdout[-2000:]}\n'
            f'stderr: {result.stderr[-2000:]}')
    if result.stdout.strip():
        print(result.stdout.strip()[-2000:])
    episodes = load_trajectories(traj_path) if traj_path.exists() else []
    summary = None
    if summary_path.exists():
        summary = json.loads(summary_path.read_text())
    return episodes, summary


def _merge_parts(traj_path, summary_path, part_traj_paths,
                 part_summary_paths):
    """Merge per-worker trajectory/summary files into the final outputs.

    Episode ids restart at 0 in every part file, so each part's ids are
    shifted by the cumulative episode count of the earlier parts.
    Part files are deleted after a successful merge.
    """
    traj_path = Path(traj_path)
    summary_path = Path(summary_path)
    merged_summaries = []
    offset = 0
    with open(traj_path, 'w') as out_f:
        for part_traj, part_summary in zip(part_traj_paths,
                                           part_summary_paths):
            part_eps = load_trajectories(part_traj) if part_traj.exists() else []
            n_eps = len(part_eps)
            # Rewrite episode ids with the global offset, streaming.
            if part_traj.exists():
                with open(part_traj) as in_f:
                    for line in in_f:
                        line = line.strip()
                        if not line:
                            continue
                        step = json.loads(line)
                        step['episode'] += offset
                        out_f.write(json.dumps(step) + '\n')
            if part_summary.exists():
                part_sum = json.loads(part_summary.read_text())
                for e in part_sum.get('episodes', []):
                    e = dict(e)
                    e['episode'] += offset
                    merged_summaries.append(e)
            offset += n_eps
    summary_path.write_text(
        json.dumps({'episodes': merged_summaries}, indent=2))
    for p in list(part_traj_paths) + list(part_summary_paths):
        try:
            p.unlink()
        except FileNotFoundError:
            pass
    return offset


def collect_trajectories(policy_json, n_episodes, difficulty, traj_path,
                         summary_path, runner_path, extra_args=None,
                         workers=None):
    """Run the TypeScript episode runner and return (episodes, summary).

    This is the episode-granularity equivalent of env.step(): the runner
    loads the policy JSON, plays ``n_episodes`` full games, and writes a
    trajectory JSONL plus a summary JSON.

    Episodes are collected in parallel across ``workers`` Node processes
    (default: CPU count, clamped to ``n_episodes``) and merged into the
    single ``traj_path``/``summary_path`` outputs, so the merged files
    are identical in format to a single-worker run. Each worker gets its
    own trajectory/summary part files and its own slice of the seeds
    (``--seeds``/``--seed-base`` in ``extra_args`` are split, never
    duplicated). A single worker (``workers=1``) behaves exactly as
    before. If any worker fails, the whole call raises RuntimeError.

    Args:
        policy_json: path to the policy weights JSON the runner loads.
        n_episodes: number of episodes to run.
        difficulty: e.g. 'hard'.
        traj_path: where the runner writes trajectories.
        summary_path: where the runner writes its summary JSON.
        runner_path: path to run_episode.mts (TypeScript side) or
            run_episode.bundle.mjs. When given the .mts path, the
            esbuild bundle is preferred if it exists next to it
            (see _runner_cmd); pass the .bundle.mjs path directly to
            force the bundle.
        extra_args: optional extra CLI flags for the runner, e.g.
            ['--deterministic', '--seeds', '100,200'].
        workers: parallel runner processes; default os.cpu_count().

    Returns (episodes, summary dict or None). Raises FileNotFoundError if
    the runner is missing, RuntimeError if the runner exits non-zero.
    Callers that want to survive a failed iteration should catch these.
    """
    runner_path = Path(runner_path)
    if not runner_path.exists():
        raise FileNotFoundError(
            f'episode runner not found: {runner_path} '
            '(TypeScript side — RLBrain + run_episode.mts)')
    traj_path = Path(traj_path)
    summary_path = Path(summary_path)
    traj_path.parent.mkdir(parents=True, exist_ok=True)
    summary_path.parent.mkdir(parents=True, exist_ok=True)

    n_workers = workers if workers is not None else (os.cpu_count() or 4)
    n_workers = max(1, min(int(n_workers), n_episodes))
    if n_workers <= 1:
        return _run_one_worker(policy_json, n_episodes, difficulty,
                               traj_path, summary_path, runner_path,
                               extra_args)

    splits = _split_work(n_episodes, n_workers, extra_args)
    part_trajs = []
    part_summaries = []
    for i, (count, _args) in enumerate(splits):
        part_trajs.append(traj_path.with_name(
            f'{traj_path.stem}-part{i}{traj_path.suffix}'))
        part_summaries.append(summary_path.with_name(
            f'{summary_path.stem}-part{i}{summary_path.suffix}'))

    def _run(idx):
        count, w_args = splits[idx]
        return _run_one_worker(policy_json, count, difficulty,
                               part_trajs[idx], part_summaries[idx],
                               runner_path, w_args)

    with ThreadPoolExecutor(max_workers=len(splits)) as pool:
        # list() forces all futures to resolve; the first exception
        # propagates (subprocess.run releases the GIL while waiting,
        # so threads genuinely overlap here).
        list(pool.map(_run, range(len(splits))))

    _merge_parts(traj_path, summary_path, part_trajs, part_summaries)
    episodes = load_trajectories(traj_path) if traj_path.exists() else []
    summary = None
    if summary_path.exists():
        summary = json.loads(summary_path.read_text())
    return episodes, summary
