import { readFileSync } from 'node:fs';
await import('../src/headless/harness/jsdom-setup.ts');
const { Match } = await import('../src/headless/Match.ts');
const { BalancedBrain } = await import('../src/systems/bots/brains/BalancedBrain.ts');
const { OptimizerBrain } = await import('../src/systems/bots/brains/OptimizerBrain.ts');

const wallsPath = process.argv[2] ?? 'traces/mazes/plains-bound30.json';
const raw = JSON.parse(readFileSync(wallsPath, 'utf8'));
const targetWalls = raw.walls;
const N = 10;
const seeds = Array.from({ length: N }, (_, i) => (12345 * 31 + i * 7919) >>> 0);

async function runWithBrain(brainFactory, label, mode) {
  let wins = 0, totalWave = 0, decisions = 0;
  const hashes = new Set();
  let stats = null;
  for (const seed of seeds) {
    const brain = brainFactory(seed);
    const m = new Match({
      faction: 'arcane', difficulty: 'normal', mapId: 'plains',
      brainId: 'placeholder', matchMode: mode,
      waveCount: 50, seed,
    }, brain);
    while (!m.isDone()) m.step();
    const r = m.result();
    if (r.outcome === 'win') wins++;
    totalWave += r.waveReached;
    hashes.add(r.buildHash);
    if (brain.stats) {
      if (!stats) stats = { ...brain.stats };
      else for (const k of Object.keys(brain.stats)) stats[k] += brain.stats[k];
      decisions += brain.stats.totalDecisions ?? 0;
    }
  }
  console.log(`[${label}|${mode}] ${wins}/${N} wins  avgWave=${(totalWave/N).toFixed(1)}  uniqueHashes=${hashes.size}  decisions/match=${(decisions/N).toFixed(0)}`);
  if (stats) console.log(`         stats: ${JSON.stringify(stats)}`);
}

await runWithBrain(() => new BalancedBrain(), 'balanced', 'standard_long_scaled');
await runWithBrain((s) => new OptimizerBrain({ targetWalls, seed: s, topK: 5 }), 'optimizer', 'standard_long_scaled');
