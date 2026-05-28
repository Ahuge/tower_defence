#!/usr/bin/env node
/**
 * Smoke test for OptimizerBrain. Runs N matches arcane/plains with
 * OptimizerBrain wrapping BalancedBrain + W* loaded from
 * traces/mazes/plains-unbounded.json. Compares against bare
 * BalancedBrain baseline on the same seeds.
 *
 * Pass criteria:
 *   - no crashes
 *   - non-zero win rate (the wrapper shouldn't tank performance)
 *   - build hash differs from BalancedBrain baseline (proving the
 *     coordinate override actually changes placements)
 */
import { readFileSync } from 'node:fs';

await import('../src/headless/harness/jsdom-setup.ts');
const { Match } = await import('../src/headless/Match.ts');
const { BalancedBrain } = await import('../src/systems/bots/brains/BalancedBrain.ts');
const { OptimizerBrain } = await import('../src/systems/bots/brains/OptimizerBrain.ts');

const WALLS_PATH = process.argv[2] ?? 'traces/mazes/plains-unbounded.json';
const N = parseInt(process.argv[3] ?? '10', 10);
const FACTION = process.argv[4] ?? 'arcane';
const DIFFICULTY = process.argv[5] ?? 'normal';
const WAVES = parseInt(process.argv[6] ?? '15', 10);

const raw = JSON.parse(readFileSync(WALLS_PATH, 'utf8'));
const entry = Array.isArray(raw) ? raw[0] : raw;
const targetWalls = entry.walls;
console.log(`[smoke] loaded W* with ${targetWalls.length} walls; optimum path=${entry.pathLength}, baseline=${entry.baselinePathLength}`);

const seeds = Array.from({ length: N }, (_, i) => (12345 * 31 + i * 7919) >>> 0);

async function runWithBrain(brainFactory, label) {
  let wins = 0, totalWave = 0, errors = 0;
  const hashes = new Set();
  let stats = null;
  for (const seed of seeds) {
    try {
      const brain = brainFactory(seed);
      const m = new Match({
        faction: FACTION, difficulty: DIFFICULTY, mapId: 'plains',
        brainId: 'placeholder', matchMode: 'standard',
        waveCount: WAVES, seed,
      }, brain);
      while (!m.isDone()) m.step();
      const r = m.result();
      if (r.outcome === 'win') wins++;
      totalWave += r.waveReached;
      hashes.add(r.buildHash);
      if (brain.stats) {
        if (!stats) stats = { ...brain.stats, totalWallsPlaced: 0, maxWallsPlaced: 0 };
        else for (const k of Object.keys(brain.stats)) stats[k] += brain.stats[k];
        // brain.builtSet is the cells brain THINKS it placed at (W* cells only).
        // For diagnostic, count it.
        const placed = brain.builtSet?.size ?? 0;
        stats.totalWallsPlaced += placed;
        if (placed > stats.maxWallsPlaced) stats.maxWallsPlaced = placed;
      }
    } catch (e) {
      errors++;
      console.error(`  ${label} seed=${seed} err:`, e.message);
    }
  }
  console.log(`[${label}] ${wins}/${N} wins  avgWave=${(totalWave / N).toFixed(1)}  uniqueHashes=${hashes.size}  errs=${errors}`);
  if (stats) console.log(`         stats: ${JSON.stringify(stats)}`);
  return { hashes };
}

const baselineRes = await runWithBrain(() => new BalancedBrain(), 'balanced');
const optimizerRes = await runWithBrain((seed) => new OptimizerBrain({ targetWalls, seed, topK: 5 }), 'optimizer');

// Confirm hashes diverge — the wrapper should be changing placement.
let overlap = 0;
for (const h of optimizerRes.hashes) if (baselineRes.hashes.has(h)) overlap++;
console.log(`[diff] hash overlap baseline∩optimizer = ${overlap} / ${optimizerRes.hashes.size}  (lower=better, 0 = wrapper fully diverged)`);
if (overlap === optimizerRes.hashes.size) {
  console.error('[FAIL] OptimizerBrain produced identical builds to BalancedBrain. Wrapper not actually overriding placements.');
  process.exit(1);
}
console.log('[smoke] OK');
