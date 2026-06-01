import { writeFileSync } from 'node:fs';
await import('../src/headless/harness/jsdom-setup.ts');
const { Match } = await import('../src/headless/Match.ts');
const { OnlineMazeOptimizerBrain } = await import('../src/systems/bots/brains/OnlineMazeOptimizerBrain.ts');
const { BalancedBrain } = await import('../src/systems/bots/brains/BalancedBrain.ts');

for (let seed = 14000; seed < 14005; seed++) {
  const brain = new OnlineMazeOptimizerBrain();
  const m = new Match({
    faction: 'arcane',
    difficulty: 'normal',
    mapId: 'plains',
    brainId: 'placeholder',
    matchMode: 'standard',
    waveCount: 25,
    seed,
  }, brain);
  while (!m.isDone()) m.step();
  const r = m.result();
  console.log(`seed=${seed}  outcome=${r.outcome}  wave=${r.waveReached}  towers=${r.towersBuilt}  lives=${r.livesRemaining}  hash=${r.buildHash.slice(0,8)}  stats=${JSON.stringify(brain.stats)}`);
}
