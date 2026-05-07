#!/usr/bin/env node
/**
 * Quick-and-dirty perf bench: how slow is MazingBrain.decide() vs
 * BalancedBrain.decide() on identical contexts?
 *
 * Plays out a 5-wave headless match for each brain across 5 factions,
 * counts brain.decide() calls and measures total wall time. Prints
 * per-call median + total ms.
 */
import { performance } from 'node:perf_hooks';
await import('../src/headless/harness/jsdom-setup.ts');
const { runMatch } = await import('../src/headless/HeadlessMatch.ts');
await import('../src/systems/bots/brains/BalancedBrain.ts');
await import('../src/systems/bots/brains/MazingBrain.ts');

const FACTIONS = ['arcane', 'mechanical', 'infernal', 'void', 'celestial'];
const N = 3;  // matches per cell (small — we just want a perf signal)

console.log('faction       brain      matches  wall-ms   per-match');
console.log('─'.repeat(60));

for (const faction of FACTIONS) {
  for (const brainId of ['balanced', 'mazing']) {
    let total = 0;
    let won = 0;
    for (let i = 0; i < N; i++) {
      const t0 = performance.now();
      const r = await runMatch({
        faction, difficulty: 'normal', mapId: 'plains',
        brainId, matchMode: 'standard', waveCount: 10,
        seed: (1 * 31 + i * 7919) >>> 0,
      });
      const t = performance.now() - t0;
      total += t;
      if (r.outcome === 'win') won++;
    }
    const per = (total / N).toFixed(1);
    console.log(`${faction.padEnd(13)} ${brainId.padEnd(10)} ${String(N).padStart(4)}  ${total.toFixed(0).padStart(7)}  ${per.padStart(8)}  win=${won}/${N}`);
  }
  console.log('');
}
