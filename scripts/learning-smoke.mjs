#!/usr/bin/env node
/**
 * Quick smoke test that LearningBrain runs end-to-end. With no
 * model file present it should fall through to BalancedBrain. With
 * a model present, it should outperform that fallback.
 */
await import('../src/headless/harness/jsdom-setup.ts');
const { runMatch } = await import('../src/headless/HeadlessMatch.ts');
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

const N = 20;
const r = { wins: 0, totalWave: 0, errors: 0 };
for (let i = 0; i < N; i++) {
  try {
    const m = await runMatch({
      faction: 'arcane', difficulty: 'normal', mapId: 'plains',
      brainId: 'learning', matchMode: 'standard', waveCount: 20,
      seed: (1 * 31 + i * 7919) >>> 0,
    });
    if (m.outcome === 'win') r.wins++;
    r.totalWave += m.waveReached;
  } catch (e) {
    r.errors++;
    console.error('error:', e.message);
  }
}
console.log(`learning on arcane|normal: ${r.wins}/${N} wins, avgWave=${(r.totalWave / N).toFixed(1)}, errors=${r.errors}`);
