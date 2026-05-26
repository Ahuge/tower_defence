/**
 * Two-sided headless determinism — G1 acceptance test.
 *
 * Builds on the existing `determinism.test.ts` but exercises a
 * different invariant: two `Match` instances running in the same
 * process, stepped in lockstep on a shared seed, must not stomp
 * each other's RNG. With identical brains both sides have to
 * produce bit-identical outcomes; with different brains the only
 * divergence is the brains' own decision-making (not RNG drift).
 *
 * 10 seeds × {arcane, mechanical} = 20 same-brain assertions,
 * +20 rerun-determinism assertions (calling twice → same result
 * both times), +1 sanity check that different brains actually
 * diverge. Each match runs 5 waves on the `plains` map so the
 * suite stays under ~30s.
 */
import { describe, it, expect } from 'vitest';
import { runTwoSidedMatch } from './TwoSidedMatch';
import { MatchResult, TwoSidedConfig } from './types';
import { FactionId } from '../data/Factions';

const SEEDS = [1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010];
const FACTIONS: FactionId[] = ['arcane', 'mechanical'];

/** Outcome fields that determinism actually controls. `simTimeMs`
 *  is excluded for the same reason `determinism.test.ts` excludes
 *  it: some sub-tick scheduling isn't fully seeded yet, so the
 *  exact tick count can drift between otherwise-identical runs.
 *  Every other field is a game-state outcome that must match
 *  exactly. */
function outcomeDigest(r: MatchResult) {
  return {
    outcome: r.outcome,
    waveReached: r.waveReached,
    livesRemaining: r.livesRemaining,
    goldEarned: r.goldEarned,
    goldSpent: r.goldSpent,
    creepsKilled: r.creepsKilled,
    towersBuilt: r.towersBuilt,
    buildHash: r.buildHash,
    simTimeMs: r.simTimeMs,
  };
}

function cfgFor(faction: FactionId, seed: number, brain = 'balanced'): TwoSidedConfig {
  return {
    faction,
    difficulty: 'normal',
    mapId: 'plains',
    matchMode: 'standard',
    waveCount: 5,
    seed,
    brainIdA: brain,
    brainIdB: brain,
  };
}

describe('TwoSidedMatch determinism (G1 acceptance)', () => {
  for (const faction of FACTIONS) {
    for (const seed of SEEDS) {
      it(`${faction} seed=${seed}: same brain → both sides identical`, async () => {
        const r = await runTwoSidedMatch(cfgFor(faction, seed));
        expect(outcomeDigest(r.sideA), `seed=${seed} faction=${faction}`)
          .toEqual(outcomeDigest(r.sideB));
      });

      it(`${faction} seed=${seed}: rerun → identical both sides`, async () => {
        const a = await runTwoSidedMatch(cfgFor(faction, seed));
        const b = await runTwoSidedMatch(cfgFor(faction, seed));
        expect(outcomeDigest(a.sideA)).toEqual(outcomeDigest(b.sideA));
        expect(outcomeDigest(a.sideB)).toEqual(outcomeDigest(b.sideB));
      });
    }
  }

  it('different brains produce different outcomes (sanity)', async () => {
    const r = await runTwoSidedMatch({
      ...cfgFor('arcane', 1001),
      brainIdA: 'balanced',
      brainIdB: 'rush',
    });
    // At least one of these should differ — same seed but
    // different brains can't realistically converge on identical
    // builds + economy. (Towers built is the most reliable proxy:
    // RushBrain builds aggressively early, BalancedBrain saves.)
    const sameBuild = r.sideA.buildHash === r.sideB.buildHash
      && r.sideA.towersBuilt === r.sideB.towersBuilt
      && r.sideA.goldSpent === r.sideB.goldSpent;
    expect(sameBuild).toBe(false);
  });
});
