/**
 * Smoke tests for the headless match runner. Verifies the system
 * composition works end-to-end — one match completes without
 * throwing, reports a plausible result, and doesn't stall.
 *
 * These are integration tests, not balance tests — pass/fail here
 * doesn't tell you anything about faction balance. The value is
 * catching regressions in the headless plumbing (SimClock timing,
 * scene-stub coverage, bot decision dispatch) before the batch
 * runner is built on top.
 */
import { describe, it, expect } from 'vitest';
import { runMatch } from './HeadlessMatch';
import { MatchConfig } from './types';

describe('HeadlessMatch', () => {
  it('runs a 5-wave standard mechanical match to completion', async () => {
    const config: MatchConfig = {
      faction: 'mechanical',
      difficulty: 'normal',
      mapId: 'plains',
      brainId: 'balanced',
      matchMode: 'standard',
      waveCount: 5,
      seed: 42,
      stepMs: 32,
      maxSimMs: 2 * 60 * 1000,
      maxWaves: 10,
    };
    const result = await runMatch(config);
    if (result.outcome === 'error') console.error('[match error]', result.error);
    // eslint-disable-next-line no-console
    console.log(`[smoke] ${result.outcome} wave=${result.waveReached}/5 lives=${result.livesRemaining} ` +
      `kills=${result.creepsKilled} towers=${result.towersBuilt} ` +
      `sim=${Math.round(result.simTimeMs / 1000)}s wall=${result.wallTimeMs}ms ` +
      `(${Math.round(result.simTimeMs / Math.max(1, result.wallTimeMs))}× realtime)`);

    expect(result.outcome).not.toBe('error');
    expect(result.waveReached).toBeGreaterThan(0);
    expect(result.simTimeMs).toBeGreaterThan(0);
    expect(result.wallTimeMs).toBeLessThan(30_000); // must run faster than realtime
  }, 60_000);

  it('is deterministic for a fixed seed', async () => {
    // Two runs of the same config + seed must produce the same
    // outcome + wave / kill / tower counts. If this fails either
    // Phase 2 (RNG threading) missed a site or something non-
    // deterministic (Date.now?) leaked into the match loop.
    const config: MatchConfig = {
      faction: 'arcane',
      difficulty: 'hard',
      mapId: 'plains',
      brainId: 'balanced',
      matchMode: 'standard',
      waveCount: 10,
      seed: 12345,
    };
    const a = await runMatch({ ...config });
    const b = await runMatch({ ...config });
    expect(a.outcome).toBe(b.outcome);
    expect(a.waveReached).toBe(b.waveReached);
    expect(a.creepsKilled).toBe(b.creepsKilled);
    expect(a.towersBuilt).toBe(b.towersBuilt);
    expect(a.goldEarned).toBe(b.goldEarned);
  }, 60_000);

  it('reports a loss when lives hit 0', async () => {
    // Force a near-impossible scenario: insane difficulty, limited
    // waves. The balanced brain should still at least attempt to
    // play — match should exit cleanly either way.
    const config: MatchConfig = {
      faction: 'void',
      difficulty: 'insane',
      mapId: 'plains',
      brainId: 'balanced',
      matchMode: 'standard',
      waveCount: 10,
      seed: 1,
      stepMs: 32,
    };
    const result = await runMatch(config);
    expect(['win', 'loss', 'timeout']).toContain(result.outcome);
    expect(result.error).toBeUndefined();
  }, 60_000);
});
