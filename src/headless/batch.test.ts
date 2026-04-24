/**
 * Batch runner integration test — verifies matrix expansion,
 * serial batch execution, and aggregation end-to-end. Uses a tiny
 * 4-match matrix so it runs in under 2 seconds even with the
 * simulation doing real work.
 *
 * For a real balance sweep, duplicate this file or just call the
 * runner directly with a bigger matrix — see `runBalanceSweep`
 * below for a representative example (skipped under `test.skip`
 * so it doesn't run during regular test passes).
 */
import { describe, it, expect, test } from 'vitest';
import { expandMatrix, runBatch, aggregate, formatReport } from './Batch';

describe('Batch', () => {
  it('expandMatrix produces a full cartesian product', () => {
    const configs = expandMatrix({
      factions: ['mechanical', 'arcane'],
      difficulties: ['normal', 'hard'],
      maps: ['plains'],
      brains: ['balanced'],
      matchModes: ['standard'],
      seedsPerCell: 3,
      baseSeed: 1,
      waveCount: 5,
    });
    // 2 factions × 2 difficulties × 1 map × 1 brain × 1 mode × 3 seeds = 12
    expect(configs).toHaveLength(12);
    const seeds = new Set(configs.map(c => c.seed));
    expect(seeds.size).toBeGreaterThan(1);
  });

  it('runs a tiny batch and aggregates without error', async () => {
    const configs = expandMatrix({
      factions: ['mechanical'],
      difficulties: ['normal'],
      maps: ['plains'],
      brains: ['balanced'],
      matchModes: ['standard'],
      seedsPerCell: 4,
      baseSeed: 42,
      waveCount: 5,
    });
    const results = await runBatch(configs);
    expect(results).toHaveLength(4);
    for (const r of results) expect(r.outcome).not.toBe('error');

    const stats = aggregate(results);
    expect(stats).toHaveLength(1);
    expect(stats[0].n).toBe(4);
    expect(stats[0].winRate).toBeGreaterThanOrEqual(0);
    expect(stats[0].winRate).toBeLessThanOrEqual(1);

    // eslint-disable-next-line no-console
    console.log('\n' + formatReport(stats));
  }, 60_000);
});

// Representative full-sweep example — enable by removing `.skip`
// to run ~1k matches and print a balance report. Takes ~60s
// serial. Usually invoked ad-hoc during balance tuning, not part
// of the regular test suite.
test.skip('runBalanceSweep — full faction matrix', async () => {
  const configs = expandMatrix({
    factions: ['mechanical', 'arcane', 'nature', 'void', 'military', 'aliens', 'cypherpunk', 'infernal', 'celestial', 'psionic', 'harmonic'],
    difficulties: ['easy', 'normal', 'hard', 'insane'],
    maps: ['plains'],
    brains: ['balanced'],
    matchModes: ['standard'],
    seedsPerCell: 20,
    baseSeed: 1,
    waveCount: 20,
  });
  const wallStart = Date.now();
  const results = await runBatch(configs, {
    onProgress: (done, total) => {
      // eslint-disable-next-line no-console
      console.log(`[sweep] ${done}/${total} — ${Math.round((done / total) * 100)}%`);
    },
    progressEvery: 50,
  });
  const wallMs = Date.now() - wallStart;
  const stats = aggregate(results);
  // eslint-disable-next-line no-console
  console.log(`\n[sweep] ${results.length} matches in ${(wallMs / 1000).toFixed(1)}s (${Math.round(results.length / (wallMs / 1000))}/s)\n`);
  // eslint-disable-next-line no-console
  console.log(formatReport(stats));
}, 10 * 60_000);
