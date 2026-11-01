/**
 * Balance sweep — direction 2, first pass.
 *
 * 11 factions × 4 brains × 20 seeds on Normal / Plains / Standard-20.
 * One fixed brain (balanced) gives the clean faction differential;
 * the best-of-brains view gives each faction's "competent play" ceiling.
 * Results: playtest/sweep-results.jsonl (+ printed report).
 *
 *   node --import tsx playtest/sweep.mts
 */
import { writeFileSync } from 'node:fs';

await import('../src/headless/harness/jsdom-setup.ts');
const batchMod = await import('../src/headless/Batch.ts');
const { expandMatrix, runBatch, aggregate, formatReport, aggregateByFactionBest } =
  (batchMod as unknown as { default?: object }).default ?? batchMod;
import type { MatrixSpec } from '../src/headless/Batch.ts';
import type { FactionId } from '../src/data/Factions.ts';

const FACTIONS: FactionId[] = [
  'arcane', 'mechanical', 'nature', 'void', 'military', 'aliens',
  'cypherpunk', 'infernal', 'celestial', 'psionic', 'harmonic',
];

const spec: MatrixSpec = {
  factions: FACTIONS,
  difficulties: ['normal'],
  maps: ['plains'],
  brains: ['balanced', 'greedy', 'rush', 'synergy'],
  matchModes: ['standard'],
  seedsPerCell: 20,
  baseSeed: 1000,
  waveCount: 20,
};

const configs = expandMatrix(spec);
console.log(`sweep: ${configs.length} matches`);
const t0 = Date.now();
const results = await runBatch(configs, {
  progressEvery: 110,
  onProgress: (done, total, last) =>
    console.log(`  ${done}/${total} (${(((Date.now() - t0) / 1000) | 0)}s) last=${last.config.faction}/${last.config.brainId} ${last.outcome} w${last.waveReached}`),
});
writeFileSync(
  new URL('./sweep-results.jsonl', import.meta.url),
  results.map(r => JSON.stringify(r)).join('\n') + '\n',
);
console.log(`done in ${(((Date.now() - t0) / 1000) | 0)}s, results -> playtest/sweep-results.jsonl\n`);

const stats = aggregate(results);
console.log('=== per cell (faction|difficulty|map|brain|mode) ===');
console.log(formatReport(stats));
console.log('\n=== faction ceiling (best brain per faction) ===');
for (const f of aggregateByFactionBest(stats)) {
  console.log(
    `${f.faction}: best=${f.bestBrain} winRate=${(f.bestWinRate * 100).toFixed(1)}% avgWave=${f.bestAvgWave.toFixed(1)} ` +
    f.perBrain.map(p => `${p.brain}:${(p.winRate * 100).toFixed(0)}`).join(' '),
  );
}
