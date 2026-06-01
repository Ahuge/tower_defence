/**
 * Single-match diagnostic for BeamSearchBrain. Print per-decision
 * beam state to see why it picks bad placements.
 */
await import('../src/headless/harness/jsdom-setup.ts');
const { Match } = await import('../src/headless/Match.ts');
const { BeamSearchBrain } = await import('../src/systems/bots/brains/BeamSearchBrain.ts');

const config = {
  faction: 'arcane',
  difficulty: 'normal',
  mapId: 'plains',
  brainId: 'placeholder',
  matchMode: 'standard',
  waveCount: 25,
  seed: 47919,
};
const matchRef = { current: null };
const brain = new BeamSearchBrain({
  beamWidth: 5,
  depth: 2,
  matchConfig: config,
  matchRef,
});
const m = new Match(config, brain);
matchRef.current = m;
const t0 = Date.now();
while (!m.isDone()) m.step();
const r = m.result();
console.log(`outcome=${r.outcome} wave=${r.waveReached} towers=${r.towersBuilt} lives=${r.livesRemaining} wall=${(Date.now()-t0)/1000}s`);
console.log('stats:', JSON.stringify(brain.stats, null, 2));
