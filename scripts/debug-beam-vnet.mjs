/**
 * Diagnostic: what is BeamVNetBrain doing? Run one match, print
 * stats + first few decision details.
 */
await import('../src/headless/harness/jsdom-setup.ts');
const { Match } = await import('../src/headless/Match.ts');
const { BeamVNetBrain, preloadVNet } = await import('../src/systems/bots/brains/BeamVNetBrain.ts');

await preloadVNet('models/vnet-v1.onnx');

const config = {
  faction: 'arcane',
  difficulty: 'normal',
  mapId: 'plains',
  brainId: 'placeholder',
  matchMode: 'standard',
  waveCount: 25,
  seed: 80000,
};
const matchRef = { current: null };
const brain = new BeamVNetBrain({
  beamWidth: 10,
  vnetModelPath: 'models/vnet-v1.onnx',
  matchConfig: config,
  matchRef,
});
const m = new Match(config, brain);
matchRef.current = m;
while (!m.isDone()) await m.stepAsync();
const r = m.result();
console.log(`outcome=${r.outcome} wave=${r.waveReached} towers=${r.towersBuilt} lives=${r.livesRemaining}`);
console.log('stats:', JSON.stringify(brain.stats, null, 2));
