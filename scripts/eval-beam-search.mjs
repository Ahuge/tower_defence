#!/usr/bin/env node
/**
 * Rung 2 evaluation — BeamSearchBrain across 5 maps.
 *
 * Same harness as rung 1 (scripts/eval-online-optimizer.mjs) but
 * with BeamSearchBrain wired up to use Match.snapshot/restore.
 *
 * Smaller n by default — beam search is much more expensive per
 * decision than rung 1 (snapshot + restore + simulate per candidate).
 *
 * Success bar (notes/rl/mcts-plan-v3.md rung 2):
 *   ≥60% wins on plains  (must beat PPO v4 = 35%, rung 1 = 0%)
 *   ≥25% wins on gauntlet (real generalization)
 *
 * Usage:
 *   node --import tsx scripts/eval-beam-search.mjs [--matches=20] [--depth=3] [--width=10]
 */
import { writeFileSync } from 'node:fs';

await import('../src/headless/harness/jsdom-setup.ts');
const { Match } = await import('../src/headless/Match.ts');
const { BalancedBrain } = await import('../src/systems/bots/brains/BalancedBrain.ts');
const { DumbBrain } = await import('../src/systems/bots/brains/DumbBrain.ts');
const { OnlineMazeOptimizerBrain } = await import('../src/systems/bots/brains/OnlineMazeOptimizerBrain.ts');
const { BeamSearchBrain } = await import('../src/systems/bots/brains/BeamSearchBrain.ts');

function parseArgs() {
  const out = { matches: 20, depth: 3, width: 10 };
  for (const a of process.argv.slice(2)) {
    if (a.startsWith('--matches=')) out.matches = parseInt(a.slice('--matches='.length), 10);
    else if (a.startsWith('--depth=')) out.depth = parseInt(a.slice('--depth='.length), 10);
    else if (a.startsWith('--width=')) out.width = parseInt(a.slice('--width='.length), 10);
  }
  return out;
}

const opts = parseArgs();
const MAPS = ['plains', 'crossroads', 'fortress', 'serpentine', 'gauntlet'];
const SEED_BASE = 50000;

function wilson95(k, n) {
  if (n === 0) return [0, 0];
  const z = 1.96;
  const p = k / n;
  const denom = 1 + z * z / n;
  const center = p + z * z / (2 * n);
  const margin = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
  return [Math.max(0, (center - margin) / denom), Math.min(1, (center + margin) / denom)];
}

async function runMatchSet(brainFactory, brainName, map) {
  let wins = 0, totalWave = 0, totalLives = 0, errors = 0;
  for (let i = 0; i < opts.matches; i++) {
    const seed = (SEED_BASE + i * 7919) >>> 0;
    try {
      const config = {
        faction: 'arcane',
        difficulty: 'normal',
        mapId: map,
        brainId: 'placeholder',
        matchMode: 'standard',
        waveCount: 25,
        seed,
      };
      const matchRef = { current: null };
      const brain = brainFactory(config, matchRef);
      const m = new Match(config, brain);
      matchRef.current = m;
      while (!m.isDone()) m.step();
      const r = m.result();
      if (r.outcome === 'win') wins++;
      totalWave += r.waveReached;
      totalLives += r.livesRemaining;
    } catch (e) {
      errors++;
      if (errors < 3) console.error(`  ${brainName}@${map} seed=${seed} err:`, e.message);
    }
  }
  const [lo, hi] = wilson95(wins, opts.matches);
  return {
    brain: brainName,
    map,
    n: opts.matches,
    wins,
    winRate: wins / opts.matches,
    ciLow: lo,
    ciHigh: hi,
    avgWave: totalWave / opts.matches,
    avgLives: totalLives / opts.matches,
    errors,
  };
}

const brains = [
  { name: 'dumb', factory: () => new DumbBrain() },
  { name: 'balanced', factory: () => new BalancedBrain() },
  { name: 'online-opt', factory: () => new OnlineMazeOptimizerBrain() },
  { name: `beam-d${opts.depth}-w${opts.width}`, factory: (config, matchRef) => new BeamSearchBrain({
    beamWidth: opts.width,
    depth: opts.depth,
    matchConfig: config,
    matchRef,
  })},
];

const results = [];
for (const map of MAPS) {
  console.log(`\n=== ${map} ===`);
  for (const { name, factory } of brains) {
    const t0 = Date.now();
    const r = await runMatchSet(factory, name, map);
    const dt = (Date.now() - t0) / 1000;
    console.log(
      `  ${name.padEnd(20)} ${r.wins}/${opts.matches} (${(r.winRate*100).toFixed(1).padStart(5)}%)` +
      `  CI [${(r.ciLow*100).toFixed(1).padStart(4)}%, ${(r.ciHigh*100).toFixed(1).padStart(5)}%]` +
      `  avgW=${r.avgWave.toFixed(1).padStart(5)} avgL=${r.avgLives.toFixed(1)}` +
      `  wall=${dt.toFixed(0)}s`
    );
    results.push(r);
  }
}

const csv = ['brain,map,n,wins,winRate,ciLow,ciHigh,avgWave,avgLives,errors'];
for (const r of results) {
  csv.push(`${r.brain},${r.map},${r.n},${r.wins},${r.winRate.toFixed(4)},${r.ciLow.toFixed(4)},${r.ciHigh.toFixed(4)},${r.avgWave.toFixed(2)},${r.avgLives.toFixed(2)},${r.errors}`);
}
writeFileSync('notes/rl/rung2-eval.csv', csv.join('\n') + '\n');

const beamName = `beam-d${opts.depth}-w${opts.width}`;
const beamPlains = results.find(r => r.brain === beamName && r.map === 'plains');
const beamGauntlet = results.find(r => r.brain === beamName && r.map === 'gauntlet');
console.log('\n=== Rung 2 success bar (per notes/rl/mcts-plan-v3.md) ===');
console.log(`  plains   ≥60% : ${beamPlains?.wins}/${opts.matches} (${(beamPlains?.winRate*100).toFixed(1)}%) — ${beamPlains?.winRate >= 0.6 ? 'PASS' : 'FAIL'}`);
console.log(`  gauntlet ≥25% : ${beamGauntlet?.wins}/${opts.matches} (${(beamGauntlet?.winRate*100).toFixed(1)}%) — ${beamGauntlet?.winRate >= 0.25 ? 'PASS' : 'FAIL'}`);
