#!/usr/bin/env node
/**
 * Compare LearningBrain to the best-of-existing brain on each
 * (faction × normal) cell. Output is a markdown table that shows
 * whether action-value regression matched, beat, or lost to
 * hand-coded brains.
 *
 * Requires:
 *   - models/brain-q-model.json present (run ml/train.py first).
 *   - All brains registered (we side-effect-import them below).
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = resolve(HERE, '..');

await import('../src/headless/harness/jsdom-setup.ts');
const { runMatch } = await import('../src/headless/HeadlessMatch.ts');
// Side-effect imports for every brain we want to score against.
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
await import('../src/systems/bots/brains/HumanReplayBrain.ts');
await import('../src/systems/bots/brains/LearningBrain.ts');

const FACTIONS = ['arcane', 'mechanical', 'nature', 'void', 'military', 'aliens', 'cypherpunk', 'infernal', 'celestial', 'psionic', 'harmonic'];
const N = parseInt(process.argv[2] ?? '50', 10);

// Best-of-existing pulled from coverage scan + tuned-brain wins.
const BEST_OF_EXISTING = {
  arcane:     { brain: 'greedy',    expectedWins: 50 },
  void:       { brain: 'greedy',    expectedWins: 50 },
  celestial:  { brain: 'greedy',    expectedWins: 50 },
  nature:     { brain: 'rush',      expectedWins: 50 },
  military:   { brain: 'rush',      expectedWins: 50 },
  infernal:   { brain: 'synergy',   expectedWins: 50 },
  cypherpunk: { brain: 'aoe_focus', expectedWins: 41 },
  harmonic:   { brain: 'harmonic',  expectedWins: 47 },
  psionic:    { brain: 'psionic',   expectedWins: 18 },
  mechanical: { brain: 'balanced',  expectedWins: 0 },
  aliens:     { brain: 'balanced',  expectedWins: 0 },
};

async function eval_(brainId, faction, n, baseSeed) {
  let wins = 0, totalWave = 0;
  for (let i = 0; i < n; i++) {
    const r = await runMatch({
      faction, difficulty: 'normal', mapId: 'plains',
      brainId, matchMode: 'standard', waveCount: 20,
      seed: (baseSeed * 31 + i * 7919) >>> 0,
    });
    if (r.outcome === 'win') wins++;
    totalWave += r.waveReached;
  }
  return { wins, n, avgWave: totalWave / n };
}

console.log(`Validation · LearningBrain vs best-of-existing · n=${N} per cell`);
console.log('');
console.log('| faction | best brain | best | learning | Δ | learning avgWave |');
console.log('|---|---|---|---|---|---|');

const results = [];
for (const faction of FACTIONS) {
  const refBrain = BEST_OF_EXISTING[faction].brain;
  const ref = await eval_(refBrain, faction, N, 1);
  const learn = await eval_('learning', faction, N, 1);
  const delta = learn.wins - ref.wins;
  const sign = delta > 0 ? `+${delta}` : `${delta}`;
  console.log(`| ${faction} | ${refBrain} | ${ref.wins}/${N} | ${learn.wins}/${N} | ${sign} | ${learn.avgWave.toFixed(1)} |`);
  results.push({ faction, refBrain, refWins: ref.wins, learnWins: learn.wins, delta });
}

const totalDelta = results.reduce((s, r) => s + r.delta, 0);
const wins_ge = results.filter(r => r.learnWins >= r.refWins).length;
console.log('');
console.log(`Cells where LearningBrain ≥ best-of-existing: ${wins_ge}/${results.length}`);
console.log(`Net Δ across all cells: ${totalDelta > 0 ? '+' : ''}${totalDelta}`);
