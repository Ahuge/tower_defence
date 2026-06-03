#!/usr/bin/env node
/**
 * Rung 4 eval — QPolicyBrain across 5 maps.
 * No beam search. Q itself IS the policy. ~1ms per decision.
 *
 * Usage:
 *   node --import tsx scripts/eval-q-policy.mjs --matches=100 --model=models/qnet-v1.onnx
 */
import { writeFileSync } from 'node:fs';

await import('../src/headless/harness/jsdom-setup.ts');
const { Match } = await import('../src/headless/Match.ts');
const { DumbBrain } = await import('../src/systems/bots/brains/DumbBrain.ts');
const { BalancedBrain } = await import('../src/systems/bots/brains/BalancedBrain.ts');
const { OnlineMazeOptimizerBrain } = await import('../src/systems/bots/brains/OnlineMazeOptimizerBrain.ts');
const { QPolicyBrain, preloadQNet } = await import('../src/systems/bots/brains/QPolicyBrain.ts');

function parseArgs() {
  const out = {
    matches: 100,
    model: 'models/qnet-v1.onnx',
    temperature: 0,
  };
  for (const a of process.argv.slice(2)) {
    if (a.startsWith('--matches=')) out.matches = parseInt(a.slice('--matches='.length), 10);
    else if (a.startsWith('--model=')) out.model = a.slice('--model='.length);
    else if (a.startsWith('--temperature=')) out.temperature = parseFloat(a.slice('--temperature='.length));
  }
  return out;
}

const opts = parseArgs();
const MAPS = ['plains', 'crossroads', 'fortress', 'serpentine', 'gauntlet'];
const SEED_BASE = 100000;

function wilson95(k, n) {
  if (n === 0) return [0, 0];
  const z = 1.96;
  const p = k / n;
  const denom = 1 + z * z / n;
  const center = p + z * z / (2 * n);
  const margin = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
  return [Math.max(0, (center - margin) / denom), Math.min(1, (center + margin) / denom)];
}

console.log(`[eval-q-policy] preloading ${opts.model}`);
await preloadQNet(opts.model);

async function runMatchSet(brainFactory, brainName, map) {
  let wins = 0, totalWave = 0, totalLives = 0, errors = 0;
  for (let i = 0; i < opts.matches; i++) {
    const seed = (SEED_BASE + i * 7919) >>> 0;
    try {
      const config = {
        faction: 'arcane', difficulty: 'normal', mapId: map,
        brainId: 'placeholder', matchMode: 'standard',
        waveCount: 25, seed,
      };
      const matchRef = { current: null };
      const brain = brainFactory(matchRef);
      const m = new Match(config, brain);
      matchRef.current = m;
      while (!m.isDone()) await m.stepAsync();
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
    brain: brainName, map, n: opts.matches, wins,
    winRate: wins / opts.matches, ciLow: lo, ciHigh: hi,
    avgWave: totalWave / opts.matches, avgLives: totalLives / opts.matches, errors,
  };
}

const brains = [
  { name: 'dumb', factory: () => new DumbBrain() },
  { name: 'online-opt', factory: () => new OnlineMazeOptimizerBrain() },
  { name: 'q-policy', factory: (matchRef) => new QPolicyBrain({
    modelPath: opts.model, matchRef, temperature: opts.temperature,
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
      `  ${name.padEnd(15)} ${r.wins}/${opts.matches} (${(r.winRate*100).toFixed(1).padStart(5)}%)` +
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
writeFileSync('notes/rl/rung4-eval.csv', csv.join('\n') + '\n');

const qPlains = results.find(r => r.brain === 'q-policy' && r.map === 'plains');
const qGauntlet = results.find(r => r.brain === 'q-policy' && r.map === 'gauntlet');
console.log('\n=== Q policy on bar ===');
console.log(`  plains   ≥35% (PPO v4 / beam baseline) : ${qPlains?.wins}/${opts.matches} (${(qPlains?.winRate*100).toFixed(1)}%)`);
console.log(`  gauntlet ≥23% (beam baseline)          : ${qGauntlet?.wins}/${opts.matches} (${(qGauntlet?.winRate*100).toFixed(1)}%)`);
