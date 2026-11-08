/**
 * run_episode.mts — RL episode runner.
 *
 * Runs headless matches with RLBrain and writes the trajectory
 * JSONL + episode summary the Python trainer consumes. Faction-
 * parameterized via --faction (default arcane).
 *
 * Usage:
 *   node --import tsx ml/desktop/rl/run_episode.mts \
 *     [--policy ml/desktop/rl/policy.json] \
 *     [--faction arcane|psionic] \
 *     [--episodes 8] [--difficulty hard|normal] \
 *     [--seeds 100,200,300 | --seed-base 1000] \
 *     [--out ml/desktop/rl/trajectories.jsonl] \
 *     [--summary ml/desktop/rl/summary.json] \
 *     [--placements ml/desktop/rl/placements.jsonl] \
 *     [--deterministic]
 *
 * --placements records every place/upgrade decision the brain
 * returns (same wrap-decide() pattern as eval_set.mts
 * wrapBrainForReplay) as JSONL: {episode, wave, kind, col, row,
 * tower, cost, gold_after, level?, branch?}. The cell recorded is
 * the cell in the returned decision — the cell HeadlessMatch
 * actually places on, not the scorer's internal top candidate.
 * (RLBrain only ever picks from ctx.candidateCells, which are
 * legal by construction, so applyDecision cannot reject one.)
 * rl_to_replay.py converts this file to replay-viewer format.
 *
 * No --policy means uniform-random actions (smoke tests). Seeds
 * default to random when neither --seeds nor --seed-base is given.
 * --seed-base N uses seeds N, N+1, ... (one per episode).
 */

await import('../../../src/headless/harness/jsdom-setup.ts');

const { runMatch } = await import('../../../src/headless/HeadlessMatch.ts');
const { RLBrain, RL_FACTION_TOWERS } = await import('../../../src/systems/bots/brains/RLBrain.ts');

import { writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const args = process.argv.slice(2);
const getArg = (name: string): string | null => {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : null;
};

const POLICY = getArg('policy') ?? undefined;
const FACTION = getArg('faction') ?? 'arcane';
const EPISODES = parseInt(getArg('episodes') ?? '8', 10);
const DIFFICULTY = (getArg('difficulty') ?? 'hard') as 'hard' | 'normal';
const OUT = getArg('out') ?? 'ml/desktop/rl/trajectories.jsonl';
const SUMMARY = getArg('summary') ?? 'ml/desktop/rl/summary.json';
const PLACEMENTS = getArg('placements') ?? undefined;
const DETERMINISTIC = args.includes('--deterministic');

// Reward shaping overrides for sweeps (env vars, defaults = originals).
const REWARD_WAVE = parseFloat(process.env.RL_REWARD_WAVE ?? '0.1');
const REWARD_GOLD_COEF = parseFloat(process.env.RL_REWARD_GOLD_COEF ?? '0.002');
const REWARD_GOLD_CAP = parseFloat(process.env.RL_REWARD_GOLD_CAP ?? '0.2');
const REWARD_LIFE_PENALTY = parseFloat(process.env.RL_REWARD_LIFE_PENALTY ?? '0.5');
const REWARD_BUILD_COEF = parseFloat(process.env.RL_REWARD_BUILD_COEF ?? '0.002');

if (!(FACTION in RL_FACTION_TOWERS)) {
  console.error(`--faction must be one of ${Object.keys(RL_FACTION_TOWERS).join(', ')}, got ${FACTION}`);
  process.exit(1);
}

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

interface PlacementRecord {
  episode: number;
  wave: number;
  kind: 'place' | 'upgrade';
  col: number;
  row: number;
  tower: string;
  cost?: number;
  gold_after?: number;
  level?: number;
  branch?: string | null;
}

/**
 * Wrap a brain's decide() to record every place/upgrade decision
 * it returns — same pattern as eval_set.mts wrapBrainForReplay.
 * The recorded cell is the cell in the returned decision, i.e.
 * the cell HeadlessMatch places the tower on. gold_after is the
 * decision-time budget minus the decision's cost (exactly what
 * HeadlessMatch spends via economy.spend).
 */
function wrapBrainForPlacements(
  brain: { decide: (ctx: any) => any },
  episode: number,
  outPath: string,
): void {
  const origDecide = brain.decide.bind(brain);
  brain.decide = (ctx: any) => {
    const d = origDecide(ctx);
    if (!d || d.kind === 'skip' || d.kind === 'send' || d.kind === 'frontier' || d.kind === 'frontierManage' || d.kind === 'sell') {
      return d;
    }
    let rec: PlacementRecord | null = null;
    if (d.kind === 'place' && d.type) {
      rec = {
        episode,
        wave: ctx.wave,
        kind: 'place',
        col: d.col,
        row: d.row,
        tower: d.type.id,
        cost: d.type.cost,
        gold_after: ctx.budget - d.type.cost,
      };
    } else if (d.kind === 'upgrade') {
      const existing = ctx.placedTowers?.find((t: any) => t.col === d.col && t.row === d.row);
      const cost = d.branch ? existing?.branchUpgradeCosts?.[d.branch] : existing?.upgradeCost;
      rec = {
        episode,
        wave: ctx.wave,
        kind: 'upgrade',
        col: d.col,
        row: d.row,
        tower: existing?.towerId ?? 'unknown',
        cost,
        gold_after: typeof cost === 'number' ? ctx.budget - cost : undefined,
        level: (existing?.level ?? 0) + 1,
        branch: d.branch ?? null,
      };
    }
    if (rec) appendFileSync(outPath, JSON.stringify(rec) + '\n');
    return d;
  };
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
  if (PLACEMENTS) {
    mkdirSync(dirname(PLACEMENTS), { recursive: true });
    writeFileSync(PLACEMENTS, '');
  }

  console.log(
    `RL run: ${episodes} episode(s), ${FACTION}/${DIFFICULTY}, ` +
    `policy=${POLICY ?? 'random'}, deterministic=${DETERMINISTIC}`,
  );

  const summaries: EpisodeSummary[] = [];
  let wins = 0;

  for (let ep = 0; ep < episodes; ep++) {
    const seed = seeds[ep];
    const brain = new RLBrain({
      faction: FACTION,
      policyPath: POLICY,
      deterministic: DETERMINISTIC,
      recordTrajectory: true,
      rewardWave: REWARD_WAVE,
      rewardGoldCoef: REWARD_GOLD_COEF,
      rewardGoldCap: REWARD_GOLD_CAP,
      rewardLifePenalty: REWARD_LIFE_PENALTY,
      rewardBuildCoef: REWARD_BUILD_COEF,
    });
    if (PLACEMENTS) wrapBrainForPlacements(brain, ep, PLACEMENTS);
    const result = await runMatch(
      {
        faction: FACTION as 'arcane' | 'psionic',
        difficulty: DIFFICULTY,
        mapId: 'plains',
        // brainId is unused when a brain override is supplied, but
        // MatchConfig requires it.
        brainId: `rl-${FACTION}`,
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
    // Batch the whole episode into one append. A synchronous append per
    // step is ~60 syscalls/episode; on a slow filesystem (WSL /mnt/d)
    // that was ~0.4 s/episode of blocked I/O. One write per episode
    // keeps the crash-resilience (finished episodes are on disk).
    const lines: string[] = [];
    for (const s of steps) {
      totalReward += s.reward;
      lines.push(
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
    appendFileSync(OUT, lines.join(''));
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
  if (PLACEMENTS) console.log(`placements: ${PLACEMENTS}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
