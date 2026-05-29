await import('../src/headless/harness/jsdom-setup.ts');
const { runMatch } = await import('../src/headless/HeadlessMatch.ts');
const { preloadPPOModel } = await import('../src/systems/bots/brains/PPOBrain.ts');
await import('../src/systems/bots/brains/BalancedBrain.ts');
await import('../src/systems/bots/brains/PPOBrain.ts');
const modelPath = process.argv[2] ?? 'models/ppo-bc-opt-v3.onnx';
const metaPath = modelPath.replace('.onnx', '.meta.json');
console.log(`Using model: ${modelPath}`);
await preloadPPOModel(modelPath, metaPath);
const hashes = new Set();
const buildLogs = [];
for (let i = 0; i < 10; i++) {
  const seed = 14000 + i;
  const r = await runMatch({
    faction: 'arcane', difficulty: 'normal', mapId: 'plains',
    brainId: 'ppo', matchMode: 'standard',
    waveCount: 25, seed,
  });
  hashes.add(r.buildHash);
  buildLogs.push(`seed=${seed}  hash=${r.buildHash.slice(0,12)}  towers=${r.towersBuilt}  wave=${r.waveReached}  outcome=${r.outcome}`);
}
buildLogs.forEach(l => console.log(l));
console.log(`\nUnique hashes: ${hashes.size}/10`);
