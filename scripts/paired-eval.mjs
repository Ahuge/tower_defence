#!/usr/bin/env node
/**
 * Paired-seed evaluation with confidence intervals.
 *
 * The existing validation compares two brains on independently
 * seeded batteries and reports raw win counts (e.g. "16/20 vs 20/20").
 * With 20 seeds a single cell swings 2-3 wins from seed luck alone, so
 * a net Δ of -12 vs -9 cannot actually distinguish two models.
 *
 * This script plays the SAME seeds for every contender, so each seed
 * is a matched pair and the noise from "this seed was an easy map"
 * cancels out. It reports, per cell:
 *   - wins for each contender
 *   - the paired win delta vs the reference
 *   - a 95% CI on that delta (bootstrap over seeds)
 *   - the number of seeds where the two disagree (the only seeds
 *     that carry information about the delta)
 *
 * Usage:
 *   node --import tsx scripts/paired-eval.mjs \
 *     --faction arcane --seeds 50 \
 *     --brains balanced,learning \
 *     [--difficulty normal] [--map plains] [--boot 2000]
 *
 * Exit code is 0 always — this is a report, not a gate.
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = resolve(HERE, '..');

await import('../src/headless/harness/jsdom-setup.ts');
const { runMatch } = await import('../src/headless/HeadlessMatch.ts');

// Register every brain by side-effect import so --brains can name any.
const BRAIN_MODULES = [
  'BalancedBrain', 'GreedyBrain', 'RushBrain', 'EconBrain', 'SynergyBrain',
  'UltimateBrain', 'AOEFocusBrain', 'NatureBrain', 'HarmonicBrain',
  'PsionicBrain', 'HumanReplayBrain', 'LearningBrain', 'AttackerDefenderBrain',
];
for (const m of BRAIN_MODULES) {
  try {
    await import(`../src/systems/bots/brains/${m}.ts`);
  } catch {
    // Optional brains — missing registration just means --brains
    // can't name it.
  }
}

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const FACTION = arg('faction', 'arcane');
const SEEDS = parseInt(arg('seeds', '50'), 10);
const DIFFICULTY = arg('difficulty', 'normal');
const MAP = arg('map', 'plains');
const BOOT = parseInt(arg('boot', '2000'), 10);
const BRAINS = arg('brains', 'balanced,learning').split(',').map(s => s.trim());

// Deterministic seed battery — stable across runs and machines.
const seedBattery = Array.from({ length: SEEDS }, (_, i) => (104729 * (i + 1) + 7919) >>> 0);

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Bootstrap CI for the mean of paired deltas. */
function bootstrapCI(deltas, iters, alpha = 0.05) {
  if (deltas.length === 0) return [0, 0];
  const rng = mulberry32(12345);
  const means = [];
  for (let it = 0; it < iters; it++) {
    let sum = 0;
    for (let i = 0; i < deltas.length; i++) {
      sum += deltas[Math.floor(rng() * deltas.length)];
    }
    means.push(sum / deltas.length);
  }
  means.sort((a, b) => a - b);
  const lo = means[Math.floor((alpha / 2) * means.length)];
  const hi = means[Math.floor((1 - alpha / 2) * means.length) - 1];
  return [lo, hi];
}

async function play(brainId, seed) {
  const r = await runMatch({
    faction: FACTION,
    difficulty: DIFFICULTY,
    mapId: MAP,
    brainId,
    matchMode: 'standard',
    waveCount: 20,
    seed,
  });
  return { won: r.outcome === 'win', wave: r.waveReached };
}

console.log(`Paired eval · ${FACTION} · ${DIFFICULTY} · ${MAP} · ${SEEDS} seeds`);
console.log(`brains: ${BRAINS.join(', ')}`);
console.log('');

// Per-brain, per-seed results. Play seed-by-seed so the cache is warm.
const results = Object.fromEntries(BRAINS.map(b => [b, []]));
for (let i = 0; i < seedBattery.length; i++) {
  const seed = seedBattery[i];
  for (const b of BRAINS) {
    results[b].push(await play(b, seed));
  }
  const line = BRAINS.map(b => `${b}:${results[b][i].won ? 'W' : 'L'}${results[b][i].wave}`).join(' ');
  console.log(`  seed ${String(seed).padStart(10)}  ${line}`);
}

console.log('');
console.log('| brain | wins | win rate | avg wave |');
console.log('|---|---|---|---|');
for (const b of BRAINS) {
  const rs = results[b];
  const wins = rs.filter(r => r.won).length;
  const avgWave = rs.reduce((s, r) => s + r.wave, 0) / rs.length;
  console.log(`| ${b} | ${wins}/${rs.length} | ${(100 * wins / rs.length).toFixed(1)}% | ${avgWave.toFixed(1)} |`);
}

const ref = BRAINS[0];
console.log('');
console.log(`Paired deltas vs ${ref} (same seeds, so seed difficulty cancels):`);
console.log('');
console.log('| brain | Δ wins | 95% CI | seeds differing |');
console.log('|---|---|---|---|');
for (const b of BRAINS.slice(1)) {
  const deltas = results[b].map((r, i) => (r.won ? 1 : 0) - (results[ref][i].won ? 1 : 0));
  const mean = deltas.reduce((s, d) => s + d, 0) / deltas.length;
  const [lo, hi] = bootstrapCI(deltas, BOOT);
  const differing = deltas.filter(d => d !== 0).length;
  const fmt = v => `${v > 0 ? '+' : ''}${(v * 100).toFixed(1)}pt`;
  console.log(`| ${b} | ${fmt(mean)} | [${fmt(lo)}, ${fmt(hi)}] | ${differing}/${deltas.length} |`);
}
console.log('');
console.log('A CI that spans 0 means the difference is not distinguishable from seed luck.');
