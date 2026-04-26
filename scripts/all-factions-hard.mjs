#!/usr/bin/env node
/**
 * How does hard@varying ramp look across factions, with greedy
 * (the strongest default brain we have)? Tells us which factions
 * are arcane-style "needs tuning" vs. flat-out "needs ramp easing".
 */
await import('../src/headless/harness/jsdom-setup.ts');
const { runMatch } = await import('../src/headless/HeadlessMatch.ts');
await import('../src/systems/bots/brains/GreedyBrain.ts');
const { PatchEngine } = await import('../src/headless/harness/PatchEngine.ts');

const FACTIONS = ['arcane', 'nature', 'mechanical', 'void', 'military', 'aliens', 'cypherpunk', 'infernal', 'celestial', 'psionic', 'harmonic'];
const N = 50;

async function sweepRamp(rampValue) {
  const patch = new PatchEngine();
  patch.patchDifficulty('hard', 'toughnessPerWave', rampValue);
  console.log(`\n=== hard at ramp=${rampValue.toFixed(3)} · greedy brain · ${N} seeds ===`);
  const rows = [];
  for (const faction of FACTIONS) {
    let wins = 0;
    let totalWave = 0;
    for (let i = 0; i < N; i++) {
      const r = await runMatch({
        faction, difficulty: 'hard', mapId: 'plains',
        brainId: 'greedy', matchMode: 'standard', waveCount: 20,
        seed: (1 * 31 + i * 7919) >>> 0,
      });
      if (r.outcome === 'win') wins++;
      totalWave += r.waveReached;
    }
    rows.push({ faction, wins, avgWave: totalWave / N });
    console.log(`${faction.padEnd(12)} ${wins}/${N} (${(wins / N * 100).toFixed(0)}%)  avgWave=${(totalWave / N).toFixed(1)}`);
  }
  console.log(`winning factions: ${rows.filter(r => r.wins > 0).length}/${FACTIONS.length}`);
  patch.revert();
  return rows;
}

await sweepRamp(0.010);
await sweepRamp(0.005);
