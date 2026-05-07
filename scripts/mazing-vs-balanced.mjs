#!/usr/bin/env node
/**
 * Focused MazingBrain vs BalancedBrain comparison — much faster than
 * the full brain-coverage matrix (~5x faster) since it only runs
 * 2 brains instead of 9. Intended as the iteration loop for tuning
 * Mazing's defaults / weights / wave-lock decisions.
 *
 * Usage:
 *   node --import tsx scripts/mazing-vs-balanced.mjs            # all cells
 *   node --import tsx scripts/mazing-vs-balanced.mjs infernal   # one cell
 */
await import('../src/headless/harness/jsdom-setup.ts');
const { runMatch } = await import('../src/headless/HeadlessMatch.ts');
await import('../src/systems/bots/brains/BalancedBrain.ts');
await import('../src/systems/bots/brains/MazingBrain.ts');

const ALL = ['arcane', 'mechanical', 'nature', 'void', 'military', 'aliens', 'cypherpunk', 'infernal', 'celestial', 'psionic', 'harmonic'];
const argFaction = process.argv[2];
const FACTIONS = argFaction ? [argFaction] : ALL;
const N = 50;

console.log(`mazing vs balanced · normal · plains · n=${N}`);
console.log('');
console.log('faction        bal   maz   Δ');
console.log('─'.repeat(40));

let totBal = 0, totMaz = 0;
for (const faction of FACTIONS) {
  let bal = 0, maz = 0;
  for (let i = 0; i < N; i++) {
    // NOTE: deliberately do NOT delete process.env.MAZING_BRAIN_PARAMS
    // here — pass it via the script invocation to test tuned configs.
    const seed = (1 * 31 + i * 7919) >>> 0;
    const rb = await runMatch({ faction, difficulty: 'normal', mapId: 'plains', brainId: 'balanced', matchMode: 'standard', waveCount: 20, seed });
    const rm = await runMatch({ faction, difficulty: 'normal', mapId: 'plains', brainId: 'mazing',   matchMode: 'standard', waveCount: 20, seed });
    if (rb.outcome === 'win') bal++;
    if (rm.outcome === 'win') maz++;
  }
  const d = maz - bal;
  const dStr = d > 0 ? `+${d}` : `${d}`;
  const tag = d > 0 ? ' ←win' : d < 0 ? ' ←loss' : '';
  console.log(`${faction.padEnd(13)} ${String(bal).padStart(4)}  ${String(maz).padStart(4)}  ${dStr.padStart(4)}${tag}`);
  totBal += bal;
  totMaz += maz;
}
console.log('─'.repeat(40));
const totD = totMaz - totBal;
const totDStr = totD > 0 ? `+${totD}` : `${totD}`;
console.log(`TOTAL         ${String(totBal).padStart(4)}  ${String(totMaz).padStart(4)}  ${totDStr.padStart(4)}`);
