#!/usr/bin/env node
/**
 * Quick: do any of the 8 baseline brains win arcane|hard at the new
 * ramp=0.05? Tells us whether the cell is solvable at all, vs.
 * BalancedBrain having a structural ceiling no parameter sweep can
 * cross.
 */
await import('../src/headless/harness/jsdom-setup.ts');
const { runMatch } = await import('../src/headless/HeadlessMatch.ts');

// Force-import side-effect registrations for all brains
await import('../src/systems/bots/brains/BalancedBrain.ts');
await import('../src/systems/bots/brains/GreedyBrain.ts');
await import('../src/systems/bots/brains/RushBrain.ts');
await import('../src/systems/bots/brains/EconBrain.ts');
await import('../src/systems/bots/brains/SynergyBrain.ts');
await import('../src/systems/bots/brains/UltimateBrain.ts');
await import('../src/systems/bots/brains/AOEFocusBrain.ts');
await import('../src/systems/bots/brains/NatureBrain.ts');

const BRAINS = ['balanced', 'greedy', 'rush', 'econ', 'synergy', 'ultimate', 'aoe_focus', 'nature'];
const N = 100;

const { PatchEngine } = await import('../src/headless/harness/PatchEngine.ts');

async function sweepRamp(rampValue) {
  const patch = new PatchEngine();
  patch.patchDifficulty('hard', 'toughnessPerWave', rampValue);
  console.log(`\n=== arcane|hard at ramp=${rampValue.toFixed(3)} · ${N} seeds per brain ===`);
  const rows = [];
  for (const brain of BRAINS) {
    delete process.env.BALANCED_BRAIN_PARAMS;
    let wins = 0;
    let totalWave = 0;
    for (let i = 0; i < N; i++) {
      const r = await runMatch({
        faction: 'arcane', difficulty: 'hard', mapId: 'plains',
        brainId: brain, matchMode: 'standard', waveCount: 20,
        seed: (1 * 31 + i * 7919) >>> 0,
      });
      if (r.outcome === 'win') wins++;
      totalWave += r.waveReached;
    }
    rows.push({ brain, wins, avgWave: totalWave / N });
    console.log(`${brain.padEnd(12)} ${wins.toString().padStart(3)}/100 (${(wins).toString().padStart(2)}%)  avgWave=${(totalWave / N).toFixed(1)}`);
  }
  console.log(`max win rate: ${Math.max(...rows.map(r => r.wins))}%, brains winning: ${rows.filter(r => r.wins > 0).length}/8`);
  patch.revert();
  return rows;
}

await sweepRamp(0.05);
await sweepRamp(0.04);
await sweepRamp(0.03);
