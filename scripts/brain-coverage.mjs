#!/usr/bin/env node
/**
 * Per-(brain × faction × difficulty) win-rate snapshot using the
 * default config for every brain. Surfaces which cells are already
 * solved by some existing brain, even if it's not the "primary"
 * brain we've been tuning. The idea: before building specialised
 * brains, see whether one of the 8 existing brains already wins a
 * cell — saves work.
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
await import('../src/systems/bots/brains/MazingBrain.ts');
await import('../src/systems/bots/brains/ComboMazingBrains.ts');

const FACTIONS = ['arcane', 'mechanical', 'nature', 'void', 'military', 'aliens', 'cypherpunk', 'infernal', 'celestial', 'psionic', 'harmonic'];
const BRAINS = ['balanced', 'greedy', 'rush', 'aoe_focus', 'nature', 'mazing', 'greedy_mazing', 'rush_mazing', 'aoe_focus_mazing'];
const N = 50;

console.log(`brain × faction snapshot · normal · n=${N}`);
console.log('');
process.stdout.write('faction'.padEnd(12));
for (const b of BRAINS) process.stdout.write(b.slice(0, 4).padStart(7));
console.log('  best');

const cellWinners = {};
for (const faction of FACTIONS) {
  process.stdout.write(faction.padEnd(12));
  let bestBrain = '';
  let bestWins = -1;
  for (const brain of BRAINS) {
    delete process.env.BALANCED_BRAIN_PARAMS;
    delete process.env.GREEDY_BRAIN_PARAMS;
    delete process.env.MAZING_BRAIN_PARAMS;
    let wins = 0;
    for (let i = 0; i < N; i++) {
      const r = await runMatch({
        faction, difficulty: 'normal', mapId: 'plains',
        brainId: brain, matchMode: 'standard', waveCount: 20,
        seed: (1 * 31 + i * 7919) >>> 0,
      });
      if (r.outcome === 'win') wins++;
    }
    process.stdout.write((wins > 0 ? `${wins}` : '·').padStart(7));
    if (wins > bestWins) { bestWins = wins; bestBrain = brain; }
  }
  console.log(`  ${bestBrain}@${bestWins}/${N}`);
  cellWinners[faction] = { brain: bestBrain, wins: bestWins };
}

console.log('\nFactions where some default brain wins ≥80%:');
for (const [faction, v] of Object.entries(cellWinners)) {
  if (v.wins >= N * 0.8) console.log(`  ${faction}: ${v.brain} ${v.wins}/${N}`);
}
console.log('\nFactions where no default brain reaches even 50%:');
for (const [faction, v] of Object.entries(cellWinners)) {
  if (v.wins < N * 0.5) console.log(`  ${faction}: best ${v.brain} ${v.wins}/${N}`);
}
