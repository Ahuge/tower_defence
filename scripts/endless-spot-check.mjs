#!/usr/bin/env node
/** One-off: spot-check endless mode at various (brain, faction, difficulty) combos. */
await import('../src/headless/harness/jsdom-setup.ts');
const { Match } = await import('../src/headless/Match.ts');
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

const trials = [
  // standard for baseline
  { brain: 'learning',  faction: 'arcane',     difficulty: 'normal', mode: 'standard', maxWaves: 50, waveCount: 50 },
  { brain: 'learning',  faction: 'mechanical', difficulty: 'normal', mode: 'standard', maxWaves: 50, waveCount: 50 },
  // standard_long — capped-quadratic variant, should reach much further
  { brain: 'learning',  faction: 'arcane',     difficulty: 'normal', mode: 'standard_long', maxWaves: 50, waveCount: 50 },
  { brain: 'balanced',  faction: 'arcane',     difficulty: 'normal', mode: 'standard_long', maxWaves: 50, waveCount: 50 },
  { brain: 'learning',  faction: 'mechanical', difficulty: 'normal', mode: 'standard_long', maxWaves: 50, waveCount: 50 },
  { brain: 'learning',  faction: 'arcane',     difficulty: 'hard',   mode: 'standard_long', maxWaves: 50, waveCount: 50 },
  { brain: 'learning',  faction: 'arcane',     difficulty: 'normal', mode: 'standard_long', maxWaves: 100, waveCount: 100 },
];

for (const t of trials) {
  const cfg = {
    faction: t.faction,
    difficulty: t.difficulty,
    mapId: 'plains',
    brainId: t.brain,
    matchMode: t.mode,
    waveCount: t.waveCount,
    seed: 20000,
    maxWaves: t.maxWaves,
  };
  const m = new Match(cfg);
  const r = await m.runToEnd();
  console.log(`${t.difficulty}/${t.mode}/${t.brain}/${t.faction}: outcome=${r.outcome} wave=${r.waveReached} lives=${r.livesRemaining}`);
}
