await import('../src/headless/harness/jsdom-setup.ts');
const { runMatch } = await import('../src/headless/HeadlessMatch.ts');
const { preloadPPOModel } = await import('../src/systems/bots/brains/PPOBrain.ts');
await import('../src/systems/bots/brains/BalancedBrain.ts');
await import('../src/systems/bots/brains/PPOBrain.ts');
const modelPath = process.argv[2] ?? 'models/ppo-bc-opt-v3c.onnx';
await preloadPPOModel(modelPath, modelPath.replace('.onnx', '.meta.json'));
const found = [];
const startSeed = parseInt(process.argv[3] ?? '14000', 10);
const N = parseInt(process.argv[4] ?? '30', 10);
for (let i = 0; i < N; i++) {
  const seed = startSeed + i;
  const r = await runMatch({
    faction: 'arcane', difficulty: 'normal', mapId: 'plains',
    brainId: 'ppo', matchMode: 'standard',
    waveCount: 25, seed,
  });
  console.log(`seed=${seed}  wave=${r.waveReached}  towers=${r.towersBuilt}  outcome=${r.outcome}`);
  if (r.outcome === 'win') found.push(seed);
  if (r.waveReached >= 20 && r.outcome !== 'win') found.push(seed);
}
console.log(`\nGood seeds: ${found.join(',')}`);
