/**
 * Tests for tier-3 Wager handlers: Pact of Zeros, Inverted Stakes,
 * The Counterfactual's Cut, The Mirror Wager.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  TIER3_WAGER_HANDLERS,
  PACT_OF_ZEROS_TRAIT_ID,
  registerTier3WagerEffects,
} from './tier3';
import {
  resolveDamageModifiers,
  createHitStats,
  type HitContext,
} from '../../traits/Trait';
import {
  _resetWagerEffectsForTest,
  getWagerEffect,
  type WagerEffectContext,
} from '../WagerEffects';
import type { MissionResult } from '../../../data/campaigns/CampaignDef';

beforeEach(() => {
  _resetWagerEffectsForTest();
  registerTier3WagerEffects();
});

const ctx = (): WagerEffectContext => ({ rng: Math.random, missionIdx: 0 });

function hitCtx(damage: number): HitContext {
  return {
    towerLevel: 1,
    damage,
    damageType: 'physical',
    target: null as unknown as HitContext['target'],
    allTargets: [],
    hitTargets: [],
    goldEarned: 0,
    hitStats: createHitStats(),
  };
}

const WON: MissionResult = {
  won: true, wave: 10, durationMs: 60000, livesRemaining: 20, livesStart: 20,
  goldRemaining: 100, goldEarned: 500, towerCount: 5, perfectRun: false, custom: {},
};

describe('Pact of Zeros', () => {
  it('applies to all towers', () => {
    expect(TIER3_WAGER_HANDLERS.pactOfZeros.getTraitsForTower!('void_gambler').length).toBe(1);
    expect(TIER3_WAGER_HANDLERS.pactOfZeros.getTraitsForTower!('void_spike').length).toBe(1);
    expect(TIER3_WAGER_HANDLERS.pactOfZeros.getTraitsForTower!('nature_root').length).toBe(1);
  });

  it('trait id is PACT_OF_ZEROS_TRAIT_ID', () => {
    expect(TIER3_WAGER_HANDLERS.pactOfZeros.getTraitsForTower!('void_gambler')[0].id)
      .toBe(PACT_OF_ZEROS_TRAIT_ID);
  });

  it('1-4 damage rounds to 0 ("whiff")', () => {
    const traits = TIER3_WAGER_HANDLERS.pactOfZeros.getTraitsForTower!('void_gambler');
    for (const dmg of [1, 2, 3, 4]) {
      const c = hitCtx(dmg);
      resolveDamageModifiers(traits, c);
      expect(c.damage).toBe(0);
    }
  });

  it('5-14 damage rounds to 10', () => {
    const traits = TIER3_WAGER_HANDLERS.pactOfZeros.getTraitsForTower!('void_gambler');
    for (const dmg of [5, 10, 14]) {
      const c = hitCtx(dmg);
      resolveDamageModifiers(traits, c);
      expect(c.damage).toBe(10);
    }
  });

  it('15-24 damage rounds to 20; 95 → 100', () => {
    const traits = TIER3_WAGER_HANDLERS.pactOfZeros.getTraitsForTower!('void_gambler');
    let c = hitCtx(15); resolveDamageModifiers(traits, c); expect(c.damage).toBe(20);
    c = hitCtx(24); resolveDamageModifiers(traits, c); expect(c.damage).toBe(20);
    c = hitCtx(95); resolveDamageModifiers(traits, c); expect(c.damage).toBe(100);
  });

  it('100 damage stays 100', () => {
    const traits = TIER3_WAGER_HANDLERS.pactOfZeros.getTraitsForTower!('void_gambler');
    const c = hitCtx(100);
    resolveDamageModifiers(traits, c);
    expect(c.damage).toBe(100);
  });

  it('0 damage stays 0', () => {
    const traits = TIER3_WAGER_HANDLERS.pactOfZeros.getTraitsForTower!('void_gambler');
    const c = hitCtx(0);
    resolveDamageModifiers(traits, c);
    expect(c.damage).toBe(0);
  });
});

describe('Inverted Stakes', () => {
  it('no per-tower trait — paydown-only Wager', () => {
    expect(TIER3_WAGER_HANDLERS.invertedStakes.getTraitsForTower).toBeUndefined();
  });

  it('returns 2 on perfect win', () => {
    expect(TIER3_WAGER_HANDLERS.invertedStakes.getPaydownMultiplier!({
      ...WON, perfectRun: true,
    })).toBe(2);
  });

  it('returns 0 on win with leaks', () => {
    expect(TIER3_WAGER_HANDLERS.invertedStakes.getPaydownMultiplier!({
      ...WON, perfectRun: false,
    })).toBe(0);
  });

  it('returns 1 on loss (paydown not applicable)', () => {
    expect(TIER3_WAGER_HANDLERS.invertedStakes.getPaydownMultiplier!({
      ...WON, won: false, perfectRun: true,
    })).toBe(1);
  });
});

describe("The Counterfactual's Cut", () => {
  it('onMissionStart emits debtDelta -100 + slots_locked flag', () => {
    const out = TIER3_WAGER_HANDLERS.counterfactualCut.onMissionStart!(ctx());
    expect(out?.debtDelta).toBe(-100);
    expect(out?.flags?.slots_locked).toBe(2);
  });

  it('no per-tower trait', () => {
    expect(TIER3_WAGER_HANDLERS.counterfactualCut.getTraitsForTower).toBeUndefined();
  });
});

describe('The Mirror Wager', () => {
  it('onMissionStart sets mirror_wager_active flag', () => {
    const out = TIER3_WAGER_HANDLERS.mirrorWager.onMissionStart!(ctx());
    expect(out?.flags?.mirror_wager_active).toBe(true);
  });

  it('paydown multiplier is 3 when mirrorWagerWon flag set', () => {
    expect(TIER3_WAGER_HANDLERS.mirrorWager.getPaydownMultiplier!({
      ...WON, custom: { mirrorWagerWon: true },
    })).toBe(3);
  });

  it('paydown multiplier is 1 without the flag', () => {
    expect(TIER3_WAGER_HANDLERS.mirrorWager.getPaydownMultiplier!({
      ...WON, custom: {},
    })).toBe(1);
  });

  it('paydown multiplier is 1 on loss even with flag (defensive)', () => {
    expect(TIER3_WAGER_HANDLERS.mirrorWager.getPaydownMultiplier!({
      ...WON, won: false, custom: { mirrorWagerWon: true },
    })).toBe(1);
  });
});

describe('Tier-3 registry', () => {
  it('all 4 tier-3 cards registered', () => {
    for (const id of ['pact_of_zeros', 'inverted_stakes', 'counterfactual_cut', 'mirror_wager']) {
      expect(getWagerEffect(id)).toBeTruthy();
    }
  });
});
