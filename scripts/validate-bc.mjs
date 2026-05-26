#!/usr/bin/env node
/**
 * BC step 5 — validate the trained ONNX policy via PPOBrain.
 *
 * Loads the BC checkpoint (default `models/bc-smoke.onnx`), runs
 * PPOBrain through async Match step + step + ... vs RandomBrain
 * and BalancedBrain on Arcane and Mechanical, then reports win
 * rates per (brain, faction).
 *
 * DoD thresholds (PRD §7 P2-T4):
 *   - BC beats RandomBrain >= 85% per faction
 *   - BC beats BalancedBrain >= 30% per faction
 *
 * "Beats" here = win rate of BC at that faction vs the other
 * brain's win rate at the same faction on independent seeds.
 *
 * CLI:
 *   --model=models/bc-smoke.onnx
 *   --meta=models/bc-smoke.meta.json
 *   --matches=50
 *   --waves=10
 *   --seed-base=9000
 */
import { writeFileSync, appendFileSync, existsSync } from 'node:fs';

await import('../src/headless/harness/jsdom-setup.ts');
const { Match } = await import('../src/headless/Match.ts');
const { BRAIN_REGISTRY } = await import('../src/systems/bots/BotBrain.ts');

// Side-effect imports so brains register themselves.
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
await import('../src/systems/bots/brains/DumbBrain.ts');
await import('../src/systems/bots/brains/PPOBrain.ts');

const { preloadPPOModel, PPOBrain } = await import('../src/systems/bots/brains/PPOBrain.ts');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    model: 'models/bc-smoke.onnx',
    meta: 'models/bc-smoke.meta.json',
    matches: 50,
    waves: 10,
    difficulty: 'normal',
    seedBase: 9000,
    factions: ['arcane', 'mechanical'],
    temperature: 1.0,
    csv: 'notes/rl/elo-history.csv',
    label: 'bc-smoke',
  };
  for (const a of args) {
    if (a.startsWith('--model='))   out.model = a.slice('--model='.length);
    else if (a.startsWith('--meta=')) out.meta = a.slice('--meta='.length);
    else if (a.startsWith('--matches=')) out.matches = parseInt(a.slice('--matches='.length), 10);
    else if (a.startsWith('--waves=')) out.waves = parseInt(a.slice('--waves='.length), 10);
    else if (a.startsWith('--difficulty=')) out.difficulty = a.slice('--difficulty='.length);
    else if (a.startsWith('--seed-base=')) out.seedBase = parseInt(a.slice('--seed-base='.length), 10);
    else if (a.startsWith('--factions=')) out.factions = a.slice('--factions='.length).split(',');
    else if (a.startsWith('--temperature=')) out.temperature = parseFloat(a.slice('--temperature='.length));
    else if (a.startsWith('--csv=')) out.csv = a.slice('--csv='.length);
    else if (a.startsWith('--label=')) out.label = a.slice('--label='.length);
  }
  return out;
}

const opts = parseArgs();
console.log('[validate-bc] opts:', opts);

if (!existsSync(opts.model)) {
  console.error(`[validate-bc] model not found: ${opts.model}`);
  process.exit(1);
}

// Preload the session so PPOBrain.attachMatch picks it up
// synchronously and the first decideAsync uses the real model.
console.log('[validate-bc] preloading ONNX session...');
const t_load = Date.now();
const session = await preloadPPOModel(opts.model, opts.meta);
console.log(`  loaded in ${Date.now() - t_load}ms  session=${session ? 'OK' : 'FAILED (fallback path will be used)'}`);
if (!session) {
  console.error('[validate-bc] session failed to load — exiting');
  process.exit(2);
}

async function runMatchWithBrain(brainKind, faction, seed) {
  const cfg = {
    faction,
    difficulty: opts.difficulty,
    mapId: 'plains',
    brainId: brainKind === 'ppo' ? 'ppo' : brainKind,
    matchMode: 'standard',
    waveCount: opts.waves,
    seed,
  };
  let brainOverride = null;
  if (brainKind === 'ppo') {
    brainOverride = new PPOBrain({ modelPath: opts.model, metaPath: opts.meta, temperature: opts.temperature });
  }
  const match = new Match(cfg, brainOverride);
  return await match.runToEndAsync();
}

const stats = {}; // {brain: {faction: {wins, total, avgWave, avgLives}}}
const brainOrder = ['ppo', 'random', 'balanced'];

for (const brainKind of brainOrder) {
  // RandomBrain hides in DumbBrain in the registry — there's no
  // 'random' factory. Skip if not registered; warn so we know.
  if (brainKind !== 'ppo' && !BRAIN_REGISTRY[brainKind]) {
    console.warn(`[validate-bc] brain "${brainKind}" not registered; substituting "dumb"`);
  }
}

const t0 = Date.now();
for (const brainKind of brainOrder) {
  const effectiveBrain = brainKind !== 'ppo' && !BRAIN_REGISTRY[brainKind] ? 'dumb' : brainKind;
  stats[brainKind] = {};
  for (const faction of opts.factions) {
    stats[brainKind][faction] = { wins: 0, total: 0, avgWave: 0, avgLives: 0 };
    for (let i = 0; i < opts.matches; i++) {
      const seed = (opts.seedBase * 31 + i * 7919) >>> 0;
      const r = await runMatchWithBrain(effectiveBrain, faction, seed);
      const s = stats[brainKind][faction];
      s.total++;
      if (r.outcome === 'win') s.wins++;
      s.avgWave += r.waveReached;
      s.avgLives += r.livesRemaining;
      if ((i + 1) % 10 === 0 || i === opts.matches - 1) {
        const dt = (Date.now() - t0) / 1000;
        console.log(`  [${brainKind}|${faction}] ${i + 1}/${opts.matches}  wins=${s.wins} (${(100 * s.wins / s.total).toFixed(0)}%)  wall=${dt.toFixed(0)}s`);
      }
    }
    const s = stats[brainKind][faction];
    s.avgWave /= Math.max(1, s.total);
    s.avgLives /= Math.max(1, s.total);
  }
}

console.log(`\n[validate-bc] DONE in ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);

// Markdown table.
console.log('| brain    | faction    | N | win% | avg wave | avg lives |');
console.log('|----------|------------|---|------|----------|-----------|');
for (const brainKind of brainOrder) {
  for (const faction of opts.factions) {
    const s = stats[brainKind][faction];
    const wrPct = (100 * s.wins / s.total).toFixed(1);
    console.log(`| ${brainKind.padEnd(8)} | ${faction.padEnd(10)} | ${String(s.total).padStart(3)} | ${wrPct.padStart(5)}% | ${s.avgWave.toFixed(1).padStart(8)} | ${s.avgLives.toFixed(1).padStart(9)} |`);
  }
}

// DoD check (PRD §7 P2-T4):
//   "BC policy beats RandomAgent ≥85%" — BC's own win rate ≥ 0.85
//   "BC policy beats RuleAgent ≥30%"   — BC's own win rate ≥ 0.30
// (In single-side defense, "beats" reads as "wins at least N% of
// matches." It's not a head-to-head delta; Random/Balanced are
// listed as reference baselines for comparing absolute strength.)
console.log('\n=== DoD check (PRD §7 P2-T4) ===');
let allPass = true;
for (const faction of opts.factions) {
  const ppoWR = stats.ppo[faction].wins / stats.ppo[faction].total;
  const randWR = stats.random[faction].wins / stats.random[faction].total;
  const balWR = stats.balanced[faction].wins / stats.balanced[faction].total;
  const ppoBeatsRandom = ppoWR >= 0.85;
  const ppoBeatsBalanced = ppoWR >= 0.30;

  console.log(`${faction.padEnd(12)} ppo=${(ppoWR * 100).toFixed(0)}%  random=${(randWR * 100).toFixed(0)}%  balanced=${(balWR * 100).toFixed(0)}%`);
  console.log(`            beats Random  threshold >=85% — ${ppoBeatsRandom ? 'PASS' : 'FAIL'} (got ${(ppoWR * 100).toFixed(0)}%)`);
  console.log(`            beats Balanced threshold >=30% — ${ppoBeatsBalanced ? 'PASS' : 'FAIL'} (got ${(ppoWR * 100).toFixed(0)}%)`);
  if (!ppoBeatsRandom || !ppoBeatsBalanced) allPass = false;
}
console.log(`\nOVERALL: ${allPass ? 'PASS — BC DoD met' : 'FAIL — BC DoD missed; iterate (more data, harder difficulty, or schema review)'}`);

// Append rows to elo-history.csv. Format matches the schema at the
// top of that file. Use a per-row date and current label.
const dateIso = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
const rows = [];
for (const brainKind of brainOrder) {
  for (const faction of opts.factions) {
    const s = stats[brainKind][faction];
    const snapshotPath = brainKind === 'ppo' ? opts.model : `brain:${brainKind}`;
    rows.push(`${dateIso},${opts.label},${snapshotPath},${faction},solo-defense-${opts.difficulty}-${opts.waves}wave,${s.total},${s.wins},${(s.wins / s.total).toFixed(4)},,${opts.label}`);
  }
}
if (existsSync(opts.csv)) {
  appendFileSync(opts.csv, '\n' + rows.join('\n') + '\n');
  console.log(`\nAppended ${rows.length} rows to ${opts.csv}`);
} else {
  console.warn(`\n[validate-bc] CSV file not found at ${opts.csv} — skipping append`);
}
