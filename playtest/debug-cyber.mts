/** Debug: watch one cypherpunk match with the best converged params. */
import { writeFileSync } from 'node:fs';
await import('../src/headless/harness/jsdom-setup.ts');
const uw = <T>(m: unknown): T => (m as { default?: T }).default ?? (m as T);
const { StrategistBrain } = uw<{ StrategistBrain: new (p?: Record<string, number>) => { decide(c: unknown): unknown } }>(
  await import('./StrategistBrain.ts'));
const { runMatch } = uw<{ runMatch: (c: object, b?: unknown) => Promise<unknown> }>(
  await import('../src/headless/HeadlessMatch.ts'));

const params = {
  mazeTowers: 7, slowByWave: 2, aoeByWave: 5, sniperByWave: 6,
  secondSlowByWave: 7, burstByWave: 8, expandFirst: 7, maxCheap: 7,
  panicLives: 14, ultTowers: 3, ultLives: 10, ultSaveByWave: 16,
  upgradeReserve: 44, expensiveBias: 0.25, linkerPairs: 1, aaEnabled: 1,
};

const brain = new StrategistBrain(params);
const origDecide = brain.decide.bind(brain);
const log: string[] = [];
let wave = 0;
(brain as { decide(c: unknown): unknown }).decide = (c: unknown) => {
  const ctx = c as { wave: number; budget: number; lives: number };
  const d = origDecide(c);
  const dd = d as { kind: string; type?: { id: string } };
  if (dd.kind === 'place') log.push(`w${ctx.wave} lives=${ctx.lives} budget=${ctx.budget} PLACE ${dd.type?.id}`);
  return d;
};

const r = await runMatch({
  faction: 'cypherpunk', difficulty: 'normal', mapId: 'plains',
  brainId: 'strategist', matchMode: 'standard', waveCount: 20, seed: 5000 * 31 + 57 * 7919,
}, brain) as { outcome: string; waveReached: number; lives: number };
console.log('outcome:', r.outcome, 'waveReached:', r.waveReached, 'lives:', r.lives);
console.log('--- placements ---');
console.log(log.join('\n'));
