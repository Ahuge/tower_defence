await import('../src/headless/harness/jsdom-setup.ts');
const { Match } = await import('../src/headless/Match.ts');
await import('../src/systems/bots/brains/LearningBrain.ts');
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
for (const cfg of [
  { brain: 'learning', mode: 'standard_long', difficulty: 'normal' },
  { brain: 'learning', mode: 'standard_long_scaled', difficulty: 'normal' },
  { brain: 'learning', mode: 'standard_long_scaled', difficulty: 'hard' },
  { brain: 'balanced', mode: 'standard_long_scaled', difficulty: 'normal' },
]) {
  const m = new Match({ faction: 'arcane', difficulty: cfg.difficulty, mapId: 'plains', brainId: cfg.brain, matchMode: cfg.mode, waveCount: 50, seed: 20000, maxWaves: 50 });
  const r = await m.runToEnd();
  console.log(`${cfg.difficulty}/${cfg.mode}/${cfg.brain}: outcome=${r.outcome} wave=${r.waveReached} lives=${r.livesRemaining}`);
}
