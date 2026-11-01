/**
 * First autopilot-style playtest run.
 *
 * Boots the headless harness (same system layer GameScene drives, no
 * rendering) and plays one full match as MuseBrain — observe → decide →
 * act, with every decision traced to playtest/trace.jsonl.
 *
 *   node --import tsx playtest/first-run.mts [--seed=N] [--waves=N]
 */
await import('../src/headless/harness/jsdom-setup.ts');
const { runMatch } = await import('../src/headless/HeadlessMatch.ts');
const { MuseBrain } = await import('./MuseBrain.ts');
import type { MatchConfig } from '../src/headless/types.ts';

const argv = process.argv.slice(2);
const flag = (name: string, def: string): string => {
  const m = argv.find(a => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!m) return def;
  return m.includes('=') ? m.split('=').slice(1).join('=') : def;
};

const config: MatchConfig = {
  faction: 'arcane',
  difficulty: 'normal',
  mapId: 'plains',
  brainId: 'muse-playtest',
  matchMode: 'standard',
  waveCount: parseInt(flag('waves', '30'), 10),
  seed: parseInt(flag('seed', '7'), 10),
};

console.log('config:', JSON.stringify(config));
const t0 = Date.now();
const result = await runMatch(config, new MuseBrain());
console.log('wall ms:', Date.now() - t0);
console.log(JSON.stringify(result, null, 2));
