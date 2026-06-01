#!/usr/bin/env node
/**
 * Rung 1 evaluation — OnlineMazeOptimizerBrain across 5 maps.
 *
 * Runs n=100 matches per map on plains/crossroads/fortress/serpentine
 * (training set) + gauntlet (held-out). Reports Wilson 95% CI per
 * map. Compares against random + balanced as noise-floor baselines.
 *
 * Success bar (notes/rl/mcts-plan-v3.md rung 1):
 *   ≥50% wins on plains  (must beat PPO v4 = 35%)
 *   ≥10% wins on gauntlet (any non-zero generalization)
 *
 * Usage:
 *   node --import tsx scripts/eval-online-optimizer.mjs [--matches=100]
 */
import { writeFileSync } from 'node:fs';

await import('../src/headless/harness/jsdom-setup.ts');
const { Match } = await import('../src/headless/Match.ts');
const { BalancedBrain } = await import('../src/systems/bots/brains/BalancedBrain.ts');
const { DumbBrain } = await import('../src/systems/bots/brains/DumbBrain.ts');
const { OnlineMazeOptimizerBrain } = await import('../src/systems/bots/brains/OnlineMazeOptimizerBrain.ts');

const N = parseInt((process.argv.find(a => a.startsWith('--matches=')) ?? '--matches=100').slice('--matches='.length), 10);
const MAPS = ['plains', 'crossroads', 'fortress', 'serpentine', 'gauntlet'];
const SEED_BASE = 40000;
const OUT = 'notes/rl/rung1-eval.csv';

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
  for (let i = 0; i < N; i++) {
    const seed = (SEED_BASE + i * 7919) >>> 0;
    try {
      const brain = brainFactory();
      const m = new Match({
        faction: 'arcane',
        difficulty: 'normal',
        mapId: map,
        brainId: 'placeholder',
        matchMode: 'standard',
        waveCount: 25,
        seed,
      }, brain);
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
  const [lo, hi] = wilson95(wins, N);
  return {
    brain: brainName,
    map,
    n: N,
    wins,
    winRate: wins / N,
    ciLow: lo,
    ciHigh: hi,
    avgWave: totalWave / N,
    avgLives: totalLives / N,
    errors,
  };
}

const brains = [
  { name: 'dumb', factory: () => new DumbBrain() },
  { name: 'balanced', factory: () => new BalancedBrain() },
  { name: 'online-optimizer', factory: () => new OnlineMazeOptimizerBrain() },
];

const results = [];
for (const map of MAPS) {
  console.log(`\n=== ${map} ===`);
  for (const { name, factory } of brains) {
    const t0 = Date.now();
    const r = await runMatchSet(factory, name, map);
    const dt = (Date.now() - t0) / 1000;
    console.log(
      `  ${name.padEnd(20)} ${r.wins}/${N} (${(r.winRate*100).toFixed(1).padStart(5)}%)` +
      `  CI [${(r.ciLow*100).toFixed(1).padStart(4)}%, ${(r.ciHigh*100).toFixed(1).padStart(5)}%]` +
      `  avgW=${r.avgWave.toFixed(1).padStart(5)} avgL=${r.avgLives.toFixed(1)}` +
      `  wall=${dt.toFixed(0)}s`
    );
    results.push(r);
  }
}

// CSV.
const csv = ['brain,map,n,wins,winRate,ciLow,ciHigh,avgWave,avgLives,errors'];
for (const r of results) {
  csv.push(`${r.brain},${r.map},${r.n},${r.wins},${r.winRate.toFixed(4)},${r.ciLow.toFixed(4)},${r.ciHigh.toFixed(4)},${r.avgWave.toFixed(2)},${r.avgLives.toFixed(2)},${r.errors}`);
}
writeFileSync(OUT, csv.join('\n') + '\n');
console.log(`\nwrote ${OUT}`);

// Success-bar check.
console.log('\n=== Rung 1 success bar (per notes/rl/mcts-plan-v3.md) ===');
const onlinePlains = results.find(r => r.brain === 'online-optimizer' && r.map === 'plains');
const onlineGauntlet = results.find(r => r.brain === 'online-optimizer' && r.map === 'gauntlet');
const plainsPass = onlinePlains && onlinePlains.winRate >= 0.5;
const gauntletPass = onlineGauntlet && onlineGauntlet.winRate >= 0.1;
console.log(`  plains   ≥50% : ${onlinePlains?.wins}/${N} (${(onlinePlains?.winRate*100).toFixed(1)}%) — ${plainsPass ? 'PASS' : 'FAIL'}`);
console.log(`  gauntlet ≥10% : ${onlineGauntlet?.wins}/${N} (${(onlineGauntlet?.winRate*100).toFixed(1)}%) — ${gauntletPass ? 'PASS' : 'FAIL'}`);
if (plainsPass && gauntletPass) {
  console.log(`  OVERALL: SHIP IT — rung 1 cleared the bar, escalation stops here.`);
} else {
  console.log(`  OVERALL: pivot to rung 2 (beam search).`);
}
