/**
 * Diagnostic: compare a winning fortress match vs a losing plains
 * match for OnlineMazeOptimizerBrain. Look for what's different.
 */
import { writeFileSync } from 'node:fs';
await import('../src/headless/harness/jsdom-setup.ts');
const { Match } = await import('../src/headless/Match.ts');
const { OnlineMazeOptimizerBrain } = await import('../src/systems/bots/brains/OnlineMazeOptimizerBrain.ts');

const SCENARIOS = [
  { name: 'fortress',   seed: 47919, map: 'fortress' },   // seed 40000 + 1*7919
  { name: 'plains',     seed: 47919, map: 'plains' },
  { name: 'crossroads', seed: 47919, map: 'crossroads' },
  { name: 'serpentine', seed: 47919, map: 'serpentine' },
];

for (const { name, seed, map } of SCENARIOS) {
  const brain = new OnlineMazeOptimizerBrain();
  const m = new Match({
    faction: 'arcane',
    difficulty: 'normal',
    mapId: map,
    brainId: 'placeholder',
    matchMode: 'standard',
    waveCount: 25,
    seed,
  }, brain);
  while (!m.isDone()) m.step();
  const r = m.result();

  // Aggregate placement stats.
  const placements = brain.stats.placements;
  const byType = {};
  let totalMazeGain = 0;
  let totalCoverage = 0;
  for (const p of placements) {
    byType[p.type] = (byType[p.type] ?? 0) + 1;
    totalMazeGain += p.mazeGain;
    totalCoverage += p.coverage;
  }

  // Wave at which towers got placed.
  const placesPerWave = {};
  for (const p of placements) {
    placesPerWave[p.wave] = (placesPerWave[p.wave] ?? 0) + 1;
  }

  console.log(`\n=== ${name} (seed=${seed}) ===`);
  console.log(`outcome=${r.outcome}  waveReached=${r.waveReached}  towers=${r.towersBuilt}  livesRemaining=${r.livesRemaining}`);
  console.log(`placements=${placements.length}  totalMazeGain=${totalMazeGain}  totalCoverage=${totalCoverage}  avgGain=${(totalMazeGain/Math.max(1,placements.length)).toFixed(2)}  avgCoverage=${(totalCoverage/Math.max(1,placements.length)).toFixed(1)}`);
  console.log(`towers by type:`, byType);
  console.log(`places per wave:`, placesPerWave);
  console.log(`first 8 placements (chose -> top-5 by gain):`);
  for (const p of placements.slice(0, 8)) {
    console.log(`  w${p.wave} pick (${p.col},${p.row})/g${p.mazeGain} cov=${p.coverage} | top: ${p.topGainCells}`);
  }
  console.log(`last 4 placements:`);
  for (const p of placements.slice(-4)) {
    console.log(`  w${p.wave} pick (${p.col},${p.row})/g${p.mazeGain} cov=${p.coverage} | top: ${p.topGainCells}`);
  }
}
