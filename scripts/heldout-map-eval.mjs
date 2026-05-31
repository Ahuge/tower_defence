#!/usr/bin/env node
/**
 * Stage 1.3 — held-out map evaluation.
 *
 * Run baselines on a non-Plains map. If PPO v4 was learning
 * "maze" rather than "Plains-shaped placements", win rate should
 * be comparable across maps. If it's catastrophic, we memorized
 * terrain — architecture/data fix needed before any more work.
 *
 * Uses same baseline harness as measurement-baselines.mjs but
 * accepts --map=<id> for the held-out target.
 *
 * Usage:
 *   node --import tsx scripts/heldout-map-eval.mjs --map=crossroads --matches=50
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

await import('../src/headless/harness/jsdom-setup.ts');
const { Match } = await import('../src/headless/Match.ts');
const { BalancedBrain } = await import('../src/systems/bots/brains/BalancedBrain.ts');
const { DumbBrain } = await import('../src/systems/bots/brains/DumbBrain.ts');
const { OptimizerBrain } = await import('../src/systems/bots/brains/OptimizerBrain.ts');
const { preloadPPOModel, PPOBrain } = await import('../src/systems/bots/brains/PPOBrain.ts');
await import('../src/systems/bots/brains/BalancedBrain.ts');
await import('../src/systems/bots/brains/GreedyBrain.ts');
await import('../src/systems/bots/brains/RushBrain.ts');
await import('../src/systems/bots/brains/EconBrain.ts');
await import('../src/systems/bots/brains/SynergyBrain.ts');
await import('../src/systems/bots/brains/UltimateBrain.ts');
await import('../src/systems/bots/brains/AOEFocusBrain.ts');
await import('../src/systems/bots/brains/NatureBrain.ts');
await import('../src/systems/bots/brains/HarmonicBrain.ts');
await import('../src/systems/bots/brains/PsionicBrain.ts');
await import('../src/systems/bots/brains/LearningBrain.ts');

function parseArgs() {
  const out = {
    matches: 50,
    map: 'crossroads',
    difficulty: 'normal',
    waves: 25,
    mode: 'standard',
    seedBase: 30000,
    bcModel: 'models/bc-optimizer-v4.onnx',
    bcMeta: 'models/bc-optimizer-v4.meta.json',
    ppoModel: 'models/ppo-bc-opt-v4.onnx',
    ppoMeta: 'models/ppo-bc-opt-v4.meta.json',
    temperature: 0,
    faction: 'arcane',
    out: null,
  };
  for (const a of process.argv.slice(2)) {
    if (a.startsWith('--matches=')) out.matches = parseInt(a.slice('--matches='.length), 10);
    else if (a.startsWith('--map=')) out.map = a.slice('--map='.length);
    else if (a.startsWith('--difficulty=')) out.difficulty = a.slice('--difficulty='.length);
    else if (a.startsWith('--waves=')) out.waves = parseInt(a.slice('--waves='.length), 10);
    else if (a.startsWith('--mode=')) out.mode = a.slice('--mode='.length);
    else if (a.startsWith('--seed-base=')) out.seedBase = parseInt(a.slice('--seed-base='.length), 10);
    else if (a.startsWith('--out=')) out.out = a.slice('--out='.length);
    else if (a.startsWith('--bc-model=')) out.bcModel = a.slice('--bc-model='.length);
    else if (a.startsWith('--bc-meta=')) out.bcMeta = a.slice('--bc-meta='.length);
    else if (a.startsWith('--ppo-model=')) out.ppoModel = a.slice('--ppo-model='.length);
    else if (a.startsWith('--ppo-meta=')) out.ppoMeta = a.slice('--ppo-meta='.length);
    else if (a.startsWith('--temperature=')) out.temperature = parseFloat(a.slice('--temperature='.length));
    else if (a.startsWith('--faction=')) out.faction = a.slice('--faction='.length);
  }
  if (!out.out) out.out = `notes/rl/heldout-${out.map}.csv`;
  return out;
}

function wilson95(k, n) {
  if (n === 0) return [0, 0];
  const z = 1.96;
  const p = k / n;
  const denom = 1 + z * z / n;
  const center = p + z * z / (2 * n);
  const margin = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
  return [Math.max(0, (center - margin) / denom), Math.min(1, (center + margin) / denom)];
}

const opts = parseArgs();
console.log('[heldout-map-eval] opts:', opts);
console.log(`[heldout-map-eval] TRAIN map was plains; TEST map is ${opts.map}`);

let bcSession = null, ppoSession = null;
if (existsSync(opts.bcModel)) bcSession = await preloadPPOModel(opts.bcModel, opts.bcMeta);
if (existsSync(opts.ppoModel)) ppoSession = await preloadPPOModel(opts.ppoModel, opts.ppoMeta);
console.log(`[heldout-map-eval] BC=${bcSession ? 'OK' : 'FAIL'}  PPO=${ppoSession ? 'OK' : 'FAIL'}`);

const factories = {
  dumb: () => new DumbBrain(),
  balanced: () => new BalancedBrain(),
  'bc-v4': () => bcSession
    ? new PPOBrain({ modelPath: opts.bcModel, metaPath: opts.bcMeta, temperature: opts.temperature })
    : null,
  'ppo-v4': () => ppoSession
    ? new PPOBrain({ modelPath: opts.ppoModel, metaPath: opts.ppoMeta, temperature: opts.temperature })
    : null,
};

async function runBaseline(name, factory) {
  const probe = factory();
  if (!probe) { console.log(`[${name}] SKIP`); return null; }
  console.log(`\n[${name}@${opts.map}] running ${opts.matches} matches...`);
  const t0 = Date.now();
  let wins = 0, totalWave = 0, totalLives = 0, errors = 0;
  for (let i = 0; i < opts.matches; i++) {
    const seed = (opts.seedBase + i * 7919) >>> 0;
    try {
      const brain = factory();
      const match = new Match({
        faction: opts.faction,
        difficulty: opts.difficulty,
        mapId: opts.map,
        brainId: 'placeholder',
        matchMode: opts.mode,
        waveCount: opts.waves,
        seed,
      }, brain);
      while (!match.isDone()) await match.stepAsync();
      const r = match.result();
      if (r.outcome === 'win') wins++;
      totalWave += r.waveReached;
      totalLives += r.livesRemaining;
    } catch (e) {
      errors++;
      if (errors < 3) console.error(`  err:`, e.message);
    }
  }
  const dt = (Date.now() - t0) / 1000;
  const [lo, hi] = wilson95(wins, opts.matches);
  console.log(`[${name}@${opts.map}] ${wins}/${opts.matches} (${(wins/opts.matches*100).toFixed(1)}%)  Wilson 95% CI [${(lo*100).toFixed(1)}%, ${(hi*100).toFixed(1)}%]  avgWave=${(totalWave/opts.matches).toFixed(1)}  wall=${dt.toFixed(0)}s`);
  return { name, wins, n: opts.matches, ciLow: lo, ciHigh: hi, avgWave: totalWave/opts.matches, avgLives: totalLives/opts.matches };
}

const results = [];
for (const [name, factory] of Object.entries(factories)) {
  const r = await runBaseline(name, factory);
  if (r) results.push(r);
}

console.log(`\n=== ${opts.map} (TRAIN=plains, TEST=${opts.map}) ===`);
console.log('brain       | wins | rate   | Wilson 95% CI       | avgWave');
console.log('------------|------|--------|---------------------|--------');
for (const r of results) {
  console.log(
    `${r.name.padEnd(11)} | ${String(r.wins).padStart(4)} | ` +
    `${(r.wins/r.n * 100).toFixed(1).padStart(5)}% | ` +
    `[${(r.ciLow * 100).toFixed(1).padStart(4)}%, ${(r.ciHigh * 100).toFixed(1).padStart(5)}%] | ` +
    `${r.avgWave.toFixed(1).padStart(7)}`
  );
}

const csvLines = ['map,name,n,wins,winRate,ciLow,ciHigh,avgWave,avgLives'];
for (const r of results) {
  csvLines.push(`${opts.map},${r.name},${r.n},${r.wins},${(r.wins/r.n).toFixed(4)},${r.ciLow.toFixed(4)},${r.ciHigh.toFixed(4)},${r.avgWave.toFixed(2)},${r.avgLives.toFixed(2)}`);
}
writeFileSync(opts.out, csvLines.join('\n') + '\n');
console.log(`\nwrote ${opts.out}`);
