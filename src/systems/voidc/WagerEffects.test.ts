/**
 * Tests for the WagerEffects registry + the four tier-1 handlers.
 * Tier-1 effects don't yet mutate towers; the per-tower trait
 * pipeline integration lands in Phase 2 (per the plan doc). These
 * tests pin the handlers' behaviour in isolation.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getWagerEffect,
  listRegisteredWagerEffects,
  registerWagerEffect,
  _resetWagerEffectsForTest,
  type WagerEffectContext,
} from './WagerEffects';
import { registerTier1WagerEffects, TIER1_WAGER_HANDLERS, MARKERS_TRAIT_ID } from './wagers/tier1';

function ctx(rng: () => number = Math.random, missionIdx: number = 0): WagerEffectContext {
  return { rng, missionIdx };
}

beforeEach(() => {
  _resetWagerEffectsForTest();
  registerTier1WagerEffects();
});

describe('WagerEffects registry', () => {
  it('register + lookup roundtrip', () => {
    expect(getWagerEffect('coin_flip')).toBeTruthy();
    expect(getWagerEffect('house_cut')).toBeTruthy();
    expect(getWagerEffect('sleeve_card')).toBeTruthy();
    expect(getWagerEffect('markers')).toBeTruthy();
  });

  it('lookup returns null for unregistered effect', () => {
    expect(getWagerEffect('not_a_card')).toBeNull();
  });

  it('list returns the four tier-1 ids (alphabetised)', () => {
    expect(listRegisteredWagerEffects()).toEqual([
      'coin_flip', 'house_cut', 'markers', 'sleeve_card',
    ]);
  });

  it('register is idempotent — later registration wins', () => {
    const replacement = { meta: { summary: 'replaced' } };
    registerWagerEffect('coin_flip', replacement);
    expect(getWagerEffect('coin_flip')).toBe(replacement);
  });

  it('every tier-1 handler has a meta summary string', () => {
    for (const id of ['coin_flip', 'house_cut', 'sleeve_card', 'markers']) {
      const h = getWagerEffect(id)!;
      expect(typeof h.meta.summary).toBe('string');
      expect(h.meta.summary.length).toBeGreaterThan(0);
    }
  });
});

describe('Coin Flip', () => {
  it('heads (rng<0.5): +50g goldDelta', () => {
    const result = TIER1_WAGER_HANDLERS.coinFlip.onMissionStart!(ctx(() => 0.3));
    expect(result?.goldDelta).toBe(+50);
    expect(result?.flags?.coin_flip_outcome).toBe('heads');
  });

  it('tails (rng>=0.5): -50g goldDelta', () => {
    const result = TIER1_WAGER_HANDLERS.coinFlip.onMissionStart!(ctx(() => 0.7));
    expect(result?.goldDelta).toBe(-50);
    expect(result?.flags?.coin_flip_outcome).toBe('tails');
  });

  it('records the outcome flag for HUD readout', () => {
    const result = TIER1_WAGER_HANDLERS.coinFlip.onMissionStart!(ctx(() => 0));
    expect(result?.flags).toBeDefined();
    expect(result?.flags?.coin_flip_outcome).toBe('heads');
  });
});

describe('House Cut', () => {
  it('reduces kill gold by ~10% + 1g per kill', () => {
    // 100 × 0.9 = 90, floor → 90, +1 = 91.
    expect(TIER1_WAGER_HANDLERS.houseCut.modifyCreepKillGold!(ctx(), 100)).toBe(91);
  });

  it('on 1g kills: floor(0.9)=0 + 1 = 1g (parity preserved at the floor)', () => {
    expect(TIER1_WAGER_HANDLERS.houseCut.modifyCreepKillGold!(ctx(), 1)).toBe(1);
  });

  it('on 0g kills (gold-less creeps like Civilians): 0 + 1 = 1g', () => {
    // This is intentional — House Cut gives a flat +1 per kill,
    // so even a Civilian kill awards 1g under the Wager. Surfaces
    // a small player-side incentive to keep the pace up.
    expect(TIER1_WAGER_HANDLERS.houseCut.modifyCreepKillGold!(ctx(), 0)).toBe(1);
  });

  it('large kills get a big absolute hit (10% of 500 = 50)', () => {
    // floor(500 × 0.9) + 1 = 450 + 1 = 451.
    expect(TIER1_WAGER_HANDLERS.houseCut.modifyCreepKillGold!(ctx(), 500)).toBe(451);
  });
});

describe('Sleeve Card', () => {
  it('surfaces sleeve_card_available flag at mission start', () => {
    const result = TIER1_WAGER_HANDLERS.sleeveCard.onMissionStart!(ctx());
    expect(result?.flags?.sleeve_card_available).toBe(true);
  });

  it('does not adjust starting gold', () => {
    const result = TIER1_WAGER_HANDLERS.sleeveCard.onMissionStart!(ctx());
    expect(result?.goldDelta).toBeUndefined();
  });
});

describe('Markers', () => {
  it('only applies to void_siphon towers', () => {
    expect(TIER1_WAGER_HANDLERS.markers.getTraitsForTower!('void_siphon').length).toBe(1);
    expect(TIER1_WAGER_HANDLERS.markers.getTraitsForTower!('void_gambler')).toEqual([]);
    expect(TIER1_WAGER_HANDLERS.markers.getTraitsForTower!('void_oblivion')).toEqual([]);
    expect(TIER1_WAGER_HANDLERS.markers.getTraitsForTower!('nature_blossom')).toEqual([]);
  });

  it('injects a trait with the right shape', () => {
    const traits = TIER1_WAGER_HANDLERS.markers.getTraitsForTower!('void_siphon');
    expect(traits.length).toBe(1);
    const t = traits[0];
    expect(t.id).toBe(MARKERS_TRAIT_ID);
    expect(t.goldPerHitBonus).toBe(1);
    expect(t.rangeMult).toBe(0.75);
  });

  it('the trait id is forward-declared (not yet wired in Trait.ts handlers)', () => {
    // Forward-declaration is intentional at commit 6 — the trait
    // handler lands when wager-trait pipeline integrates with Tower
    // spawn (Phase 2). This test pins the contract: anyone who
    // moves the trait id must update both ends.
    expect(MARKERS_TRAIT_ID).toBe('void_markers_siphon');
  });
});
