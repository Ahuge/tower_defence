/**
 * run_episode.mts — RL episode runner for the arcane prototype.
 *
 * Runs headless arcane matches with RLBrain and writes the
 * trajectory JSONL + episode summary the Python trainer consumes.
 *
 * Usage:
 *   node --import tsx ml/desktop/rl/run_episode.mts \
 *     [--policy ml/desktop/rl/policy.json] \
 *     [--episodes 8] [--difficulty hard|normal] \
 *     [--seeds 100,200,300 | --seed-base 1000] \
 *     [--out ml/desktop/rl/trajectories.jsonl] \
 *     [--summary ml/desktop/rl/summary.json] \
 *     [--deterministic]
 *
 * No --policy means uniform-random actions (smoke tests). Seeds
 * default to random when neither --seeds nor --seed-base is given.
 * --seed-base N uses seeds N, N+1, ... (one per episode).
 */

await import('../../../src/headless/harness/jsdom-setup.ts');

const { runMatch } = await import('../../../src/headless/HeadlessMatch.ts');
const { RLBrain } = await import('../../../src/systems/bots/brains/RLBrain.ts');

import { writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const args = process.argv.slice(2);
const getArg = (name: string): string | null => {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : null;
};

const POLICY = getArg('policy') ?? undefined;
const EPISODES = parseInt(getArg('episodes') ?? '8', 10);
const DIFFICULTY = (getArg('difficulty') ?? 'hard') as 'hard' | 'normal';
const OUT = getArg('out') ?? 'ml/desktop/rl/trajectories.jsonl';
const SUMMARY = getArg('summary') ?? 'ml/desktop/rl/summary.json';
const DETERMINISTIC = args.includes('--deterministic');

// Reward shaping overrides for sweeps (env vars, defaults = originals).
const REWARD_WAVE = parseFloat(process.env.RL_REWARD_WAVE ?? '0.1');
const REWARD_GOLD_COEF = parseFloat(process.env.RL_REWARD_GOLD_COEF ?? '0.002');
const REWARD_GOLD_CAP = parseFloat(process.env.RL_REWARD_GOLD_CAP ?? '0.2');
const REWARD_LIFE_PENALTY = parseFloat(process.env.RL_REWARD_LIFE_PENALTY ?? '0.5');

if (DIFFICULTY !== 'hard' && DIFFICULTY !== 'normal') {
  console.error(`--difficulty must be hard|normal, got ${DIFFICULTY}`);
  process.exit(1);
}
if (!Number.isFinite(EPISODES) || EPISODES < 1) {
  console.error(`--episodes must be >= 1, got ${getArg('episodes')}`);
  process.exit(1);
}

function resolveSeeds(): number[] {
  const seedsArg = getArg('seeds');
  if (seedsArg) {
    const seeds = seedsArg.split(',').map(s => parseInt(s.trim(), 10));
    if (seeds.some(s => !Number.isFinite(s))) {
      console.error(`--seeds must be a comma-separated list of integers, got ${seedsArg}`);
      process.exit(1);
    }
    return seeds;
  }
  const baseArg = getArg('seed-base');
  if (baseArg) {
    const base = parseInt(baseArg, 10);
    if (!Number.isFinite(base)) {
      console.error(`--seed-base must be an integer, got ${baseArg}`);
      process.exit(1);
    }
    return Array.from({ length: EPISODES }, (_, i) => base + i);
  }
  return Array.from({ length: EPISODES }, () => Math.floor(Math.random() * 100000));
}

const round6 = (v: number): number => Math.round(v * 1e6) / 1e6;

interface EpisodeSummary {
  episode: number;
  total_reward: number;
  waveReached: number;
  won: boolean;
  steps: number;
}

async function main(): Promise<void> {
  const seeds = resolveSeeds();
  const episodes = Math.min(EPISODES, seeds.length);
  if (seeds.length < EPISODES) {
    console.warn(
      `--seeds gave ${seeds.length} seeds but --episodes is ${EPISODES}; running ${episodes} episodes.`,
    );
  }

  mkdirSync(dirname(OUT), { recursive: true });
  mkdirSync(dirname(SUMMARY), { recursive: true });
  // Fresh run: truncate the trajectory file up front, then append
  // per episode so a crash mid-run keeps what finished.
  writeFileSync(OUT, '');

  console.log(
    `RL run: ${episodes} episode(s), arcane/${DIFFICULTY}, ` +
    `policy=${POLICY ?? 'random'}, deterministic=${DETERMINISTIC}`,
  );

  const summaries: EpisodeSummary[] = [];
  let wins = 0;

  for (let ep = 0; ep < episodes; ep++) {
    const seed = seeds[ep];
    const brain = new RLBrain({
      policyPath: POLICY,
      deterministic: DETERMINISTIC,
      recordTrajectory: true,
      rewardWave: REWARD_WAVE,
      rewardGoldCoef: REWARD_GOLD_COEF,
      rewardGoldCap: REWARD_GOLD_CAP,
      rewardLifePenalty: REWARD_LIFE_PENALTY,
    });
    const result = await runMatch(
      {
        faction: 'arcane',
        difficulty: DIFFICULTY,
        mapId: 'plains',
        // brainId is unused when a brain override is supplied, but
        // MatchConfig requires it.
        brainId: 'rl-arcane',
        matchMode: 'standard',
        waveCount: 20,
        seed,
      },
      brain,
    );

    const won = result.outcome === 'win';
    if (won) wins++;
    // Terminal +1/-1 on the last step, mark it done.
    brain.finalize(won);

    const steps = brain.getTrajectory();
    let totalReward = 0;
    for (const s of steps) {
      totalReward += s.reward;
      appendFileSync(
        OUT,
        JSON.stringify({
          episode: ep,
          step: s.step,
          state: s.state.map(round6),
          action: s.action,
          logprob: round6(s.logprob),
          value: round6(s.value),
          reward: round6(s.reward),
          mask: s.mask,
          done: s.done,
        }) + '\n',
      );
    }
    totalReward = round6(totalReward);

    summaries.push({
      episode: ep,
      total_reward: totalReward,
      waveReached: result.waveReached,
      won,
      steps: steps.length,
    });
    console.log(
      `  ep ${ep} seed=${seed}: ${won ? 'WON' : result.outcome} ` +
      `wave ${result.waveReached}/20, steps=${steps.length}, ` +
      `total_reward=${totalReward.toFixed(3)}`,
    );
  }

  const avgWave = summaries.reduce((s, e) => s + e.waveReached, 0) / summaries.length;
  const avgReward = summaries.reduce((s, e) => s + e.total_reward, 0) / summaries.length;
  const avgSteps = summaries.reduce((s, e) => s + e.steps, 0) / summaries.length;

  writeFileSync(SUMMARY, JSON.stringify({ episodes: summaries }, null, 2));

  console.log(`\n=== Aggregate (${episodes} episodes) ===`);
  console.log(`win rate: ${wins}/${episodes} (${((wins / episodes) * 100).toFixed(1)}%)`);
  console.log(`avg wave reached: ${avgWave.toFixed(1)}`);
  console.log(`avg total reward: ${avgReward.toFixed(3)}`);
  console.log(`avg steps/episode: ${avgSteps.toFixed(1)}`);
  console.log(`trajectories: ${OUT}`);
  console.log(`summary: ${SUMMARY}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
