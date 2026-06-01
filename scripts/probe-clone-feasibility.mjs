/**
 * Probe: can we use structuredClone (or similar) on a headless
 * Match? If yes, cheap-clone is free.
 */
await import('../src/headless/harness/jsdom-setup.ts');
const { Match } = await import('../src/headless/Match.ts');
const { BalancedBrain } = await import('../src/systems/bots/brains/BalancedBrain.ts');

// 1. Start a match.
const m = new Match({
  faction: 'arcane',
  difficulty: 'normal',
  mapId: 'plains',
  brainId: 'placeholder',
  matchMode: 'standard',
  waveCount: 25,
  seed: 7777,
}, new BalancedBrain());

console.log('starting match...');
for (let i = 0; i < 100; i++) m.step();
const beforeR = m.result();
console.log(`after 100 steps: wave=${beforeR.waveReached} lives=${beforeR.livesRemaining} towers=${beforeR.towersBuilt}`);

// 2. Try structuredClone.
console.log('\nattempting structuredClone(m)...');
try {
  const cloned = structuredClone(m);
  console.log('SUCCESS — structuredClone returned without throw');
  console.log('cloned type:', cloned?.constructor?.name);
} catch (e) {
  console.log('FAILED:', e.message?.slice(0, 200));
}

// 3. Probe what's NOT cloneable. Walk Match's own properties.
console.log('\nProbing each Match property for clone-ability:');
const proto = Object.getPrototypeOf(m);
const ownProps = [...Object.getOwnPropertyNames(m)];
for (const key of ownProps) {
  const val = (m)[key];
  if (val === null || val === undefined) {
    console.log(`  ${key}: ${val}`);
    continue;
  }
  const type = typeof val;
  try {
    structuredClone(val);
    console.log(`  ${key}: ${type} ${Array.isArray(val) ? `[len ${val.length}]` : ''} OK`);
  } catch (e) {
    console.log(`  ${key}: ${type} ${Array.isArray(val) ? `[len ${val.length}]` : ''} FAIL — ${e.message?.slice(0, 100)}`);
  }
}
