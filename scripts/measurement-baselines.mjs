#!/usr/bin/env node
/**
 * Stage 1.1 — Wilson-CI baseline measurements.
 *
 * Runs N=100 matches each for a set of baselines, computes Wilson
 * 95% CI on the win rate, and reports a clean comparison table.
 * This is the measurement-crisis fix from the 5-critic synthesis:
 * we cannot interpret v3-v6 deltas until we know the noise floor.
 *
 * Baselines:
 *   - dumb       (random brain — true noise floor)
 *   - balanced   (BalancedBrain solo, no W*)
 *   - optimizer  (OptimizerBrain + bound30 W*, balanced inner)
 *   - bc-v4      (BC v4 model only, no PPO refinement)
 *   - ppo-v4     (the headline 50%-wins result)
 *
 * Same map (plains), same difficulty (normal), same wave count
 * (25), same matchMode (standard). Same seed range so all brains
 * face IDENTICAL match conditions.
 *
 * CLI:
 *   --matches=100
 *   --map=plains
 *   --difficulty=normal
 *   --waves=25
 *   --mode=standard
 *   --seed-base=20000
 *   --out=notes/rl/baselines.csv
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

await import('../src/headless/harness/jsdom-setup.ts');
const { Match } = await import('../src/headless/Match.ts');
const { BalancedBrain } = await import('../src/systems/bots/brains/BalancedBrain.ts');
const { DumbBrain } = await import('../src/systems/bots/brains/DumbBrain.ts');
const { OptimizerBrain } = await import('../src/systems/bots/brains/OptimizerBrain.ts');
const { preloadPPOModel, PPOBrain } = await import('../src/systems/bots/brains/PPOBrain.ts');

// Side-effects so all brains register.
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
    matches: 100,
    map: 'plains',
    difficulty: 'normal',
    waves: 25,
    mode: 'standard',
    seedBase: 20000,
    out: 'notes/rl/baselines.csv',
    wallsPath: 'traces/mazes/plains-bound30.json',
    bcModel: 'models/bc-optimizer-v4.onnx',
    bcMeta: 'models/bc-optimizer-v4.meta.json',
    ppoModel: 'models/ppo-bc-opt-v4.onnx',
    ppoMeta: 'models/ppo-bc-opt-v4.meta.json',
    temperature: 0,
    faction: 'arcane',
  };
  for (const a of process.argv.slice(2)) {
    if (a.startsWith('--matches=')) out.matches = parseInt(a.slice('--matches='.length), 10);
    else if (a.startsWith('--map=')) out.map = a.slice('--map='.length);
    else if (a.startsWith('--difficulty=')) out.difficulty = a.slice('--difficulty='.length);
    else if (a.startsWith('--waves=')) out.waves = parseInt(a.slice('--waves='.length), 10);
    else if (a.startsWith('--mode=')) out.mode = a.slice('--mode='.length);
    else if (a.startsWith('--seed-base=')) out.seedBase = parseInt(a.slice('--seed-base='.length), 10);
    else if (a.startsWith('--out=')) out.out = a.slice('--out='.length);
    else if (a.startsWith('--walls=')) out.wallsPath = a.slice('--walls='.length);
    else if (a.startsWith('--bc-model=')) out.bcModel = a.slice('--bc-model='.length);
    else if (a.startsWith('--bc-meta=')) out.bcMeta = a.slice('--bc-meta='.length);
    else if (a.startsWith('--ppo-model=')) out.ppoModel = a.slice('--ppo-model='.length);
    else if (a.startsWith('--ppo-meta=')) out.ppoMeta = a.slice('--ppo-meta='.length);
    else if (a.startsWith('--temperature=')) out.temperature = parseFloat(a.slice('--temperature='.length));
    else if (a.startsWith('--faction=')) out.faction = a.slice('--faction='.length);
  }
  return out;
}

// Wilson 95% CI for a binomial proportion. Returns [lo, hi].
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
console.log('[measurement-baselines] opts:', opts);

// Load W* for OptimizerBrain teacher.
let targetWalls = null;
if (existsSync(opts.wallsPath)) {
  const raw = JSON.parse(readFileSync(opts.wallsPath, 'utf8'));
  const entry = Array.isArray(raw) ? raw[0] : raw;
  targetWalls = entry.walls;
  console.log(`[measurement-baselines] loaded W* with ${targetWalls.length} walls`);
}

// Preload PPO models once.
let bcSession = null, ppoSession = null;
if (existsSync(opts.bcModel)) {
  bcSession = await preloadPPOModel(opts.bcModel, opts.bcMeta);
  console.log(`[measurement-baselines] BC v4 preloaded: ${bcSession ? 'OK' : 'FAIL'}`);
}
if (existsSync(opts.ppoModel)) {
  ppoSession = await preloadPPOModel(opts.ppoModel, opts.ppoMeta);
  console.log(`[measurement-baselines] PPO v4 preloaded: ${ppoSession ? 'OK' : 'FAIL'}`);
}

// Brain factories.
const brainFactories = {
  dumb: () => new DumbBrain(),
  balanced: () => new BalancedBrain(),
  optimizer: () => targetWalls
    ? new OptimizerBrain({ inner: new BalancedBrain(), targetWalls, seed: 0, topK: 5 })
    : null,
  'bc-v4': () => bcSession
    ? new PPOBrain({ modelPath: opts.bcModel, metaPath: opts.bcMeta, temperature: opts.temperature })
    : null,
  'ppo-v4': () => ppoSession
    ? new PPOBrain({ modelPath: opts.ppoModel, metaPath: opts.ppoMeta, temperature: opts.temperature })
    : null,
};

async function runBaseline(name, factory) {
  const factory_ = factory();
  if (!factory_) {
    console.log(`[${name}] SKIP — factory returned null`);
    return null;
  }
  console.log(`\n[${name}] running ${opts.matches} matches...`);
  const t0 = Date.now();
  let wins = 0, totalWave = 0, totalLives = 0, errors = 0;
  const waveDist = {};
  for (let i = 0; i < opts.matches; i++) {
    const seed = (opts.seedBase + i * 7919) >>> 0;
    try {
      const brain = factory();
      if (!brain) { errors++; continue; }
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
      waveDist[r.waveReached] = (waveDist[r.waveReached] ?? 0) + 1;
    } catch (e) {
      errors++;
      if (errors < 3) console.error(`  ${name} seed=${seed} err:`, e.message);
    }
    if ((i + 1) % 25 === 0) {
      const dt = (Date.now() - t0) / 1000;
      console.log(`  ${i + 1}/${opts.matches}  wins=${wins}  rate=${(wins/(i+1)*100).toFixed(0)}%  wall=${dt.toFixed(0)}s`);
    }
  }
  const dt = (Date.now() - t0) / 1000;
  const [lo, hi] = wilson95(wins, opts.matches);
  console.log(`[${name}] ${wins}/${opts.matches} (${(wins/opts.matches*100).toFixed(1)}%)  Wilson 95% CI [${(lo*100).toFixed(1)}%, ${(hi*100).toFixed(1)}%]  avgWave=${(totalWave/opts.matches).toFixed(1)}  avgLives=${(totalLives/opts.matches).toFixed(1)}  errs=${errors}  wall=${dt.toFixed(0)}s`);
  return {
    name,
    n: opts.matches,
    wins,
    winRate: wins / opts.matches,
    ciLow: lo,
    ciHigh: hi,
    avgWave: totalWave / opts.matches,
    avgLives: totalLives / opts.matches,
    errors,
    wallTimeSec: dt,
  };
}

const results = [];
for (const [name, factory] of Object.entries(brainFactories)) {
  const r = await runBaseline(name, factory);
  if (r) results.push(r);
}

console.log('\n=== SUMMARY ===');
console.log('brain       | n   | wins | rate   | Wilson 95% CI       | avgWave | avgLives');
console.log('------------|-----|------|--------|---------------------|---------|---------');
for (const r of results) {
  console.log(
    `${r.name.padEnd(11)} | ${String(r.n).padStart(3)} | ${String(r.wins).padStart(4)} | ` +
    `${(r.winRate * 100).toFixed(1).padStart(5)}% | ` +
    `[${(r.ciLow * 100).toFixed(1).padStart(4)}%, ${(r.ciHigh * 100).toFixed(1).padStart(5)}%] | ` +
    `${r.avgWave.toFixed(1).padStart(7)} | ${r.avgLives.toFixed(1).padStart(7)}`
  );
}

// CSV.
const csvLines = ['name,n,wins,winRate,ciLow,ciHigh,avgWave,avgLives,errors,wallTimeSec'];
for (const r of results) {
  csvLines.push(`${r.name},${r.n},${r.wins},${r.winRate.toFixed(4)},${r.ciLow.toFixed(4)},${r.ciHigh.toFixed(4)},${r.avgWave.toFixed(2)},${r.avgLives.toFixed(2)},${r.errors},${r.wallTimeSec.toFixed(0)}`);
}
writeFileSync(opts.out, csvLines.join('\n') + '\n');
console.log(`\nwrote ${opts.out}`);
