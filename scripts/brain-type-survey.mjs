/**
 * Quick survey: what tower types does each inner brain place when
 * wrapped in OptimizerBrain? 5 matches arcane/plains/normal/w25.
 * Counts only RECORDED placements (between-wave, mask-legal).
 */
import { readFileSync } from 'node:fs';
await import('../src/headless/harness/jsdom-setup.ts');
const { Match } = await import('../src/headless/Match.ts');
const { OptimizerBrain } = await import('../src/systems/bots/brains/OptimizerBrain.ts');
const { ObsRecorderBrain } = await import('../src/systems/bots/learning/ObsRecorderBrain.ts');
const { BRAIN_REGISTRY } = await import('../src/systems/bots/BotBrain.ts');
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

const raw = JSON.parse(readFileSync('traces/mazes/plains-bound30.json', 'utf8'));
const targetWalls = raw.walls;
const brains = ['balanced', 'greedy', 'rush', 'econ', 'aoefocus', 'ultimate', 'synergy', 'learning', 'nature'];
const N = 3;

for (const bid of brains) {
  const factory = BRAIN_REGISTRY[bid];
  if (!factory) { console.log(`[${bid}] MISSING`); continue; }
  let totalRecorded = 0;
  const slotCount = new Array(8).fill(0);
  let wins = 0, totalWave = 0;
  for (let i = 0; i < N; i++) {
    const seed = (12345 * 31 + i * 7919) >>> 0;
    const inner = factory();
    const teacher = new OptimizerBrain({ inner, targetWalls, seed, topK: 5 });
    const recorder = new ObsRecorderBrain(teacher, `${bid}-${seed}`);
    const m = new Match({
      faction: 'arcane', difficulty: 'normal', mapId: 'plains',
      brainId: bid, matchMode: 'standard',
      waveCount: 25, seed,
    }, recorder);
    while (!m.isDone()) m.step();
    const r = m.result();
    if (r.outcome === 'win') wins++;
    totalWave += r.waveReached;
    for (const row of recorder.rows) {
      if (row.action < 7488) {
        slotCount[Math.floor(row.action / 936)]++;
        totalRecorded++;
      }
    }
  }
  const dist = slotCount.map((c, i) => c > 0 ? `s${i}=${(c*100/totalRecorded).toFixed(0)}%` : null).filter(Boolean).join(' ');
  console.log(`[${bid.padEnd(8)}] ${wins}/${N} wins  avgW=${(totalWave/N).toFixed(1)}  recorded-places=${totalRecorded}  ${dist}`);
}
