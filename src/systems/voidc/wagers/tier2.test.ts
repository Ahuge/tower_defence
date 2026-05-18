/**
 * Tests for tier-2 Wager handlers: Double Down, Echo Ledger,
 * Loaded Dice, Hot Streak. Pins each handler in isolation +
 * exercises the Trait.ts damage-mod pipeline end-to-end.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  TIER2_WAGER_HANDLERS,
  DOUBLE_DOWN_TRAIT_ID,
  ECHO_LEDGER_TRAIT_ID,
  LOADED_DICE_TRAIT_ID,
  HOT_STREAK_COUNT_KEY,
  HOT_STREAK_TARGET,
  registerTier2WagerEffects,
} from './tier2';
import {
  resolveDamageModifiers,
  type HitContext,
  type Trait,
  createHitStats,
} from '../../traits/Trait';
import {
  _resetWagerEffectsForTest,
  getWagerEffect,
  type WagerEffectContext,
  type WagerMissionFlags,
} from '../WagerEffects';

beforeEach(() => {
  _resetWagerEffectsForTest();
  registerTier2WagerEffects();
});

const ctx = (rng: () => number = Math.random, missionIdx = 0): WagerEffectContext =>
  ({ rng, missionIdx });

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

describe('Double Down', () => {
  it('Spike towers get 2× damage trait', () => {
    const traits = TIER2_WAGER_HANDLERS.doubleDown.getTraitsForTower!('void_spike');
    expect(traits.length).toBe(1);
    expect(traits[0].id).toBe(DOUBLE_DOWN_TRAIT_ID);
    expect(traits[0].damageMult).toBe(2.0);
  });

  it('Gambler towers get 0.5× damage trait', () => {
    const traits = TIER2_WAGER_HANDLERS.doubleDown.getTraitsForTower!('void_gambler');
    expect(traits.length).toBe(1);
    expect(traits[0].damageMult).toBe(0.5);
  });

  it('Other towers get nothing', () => {
    expect(TIER2_WAGER_HANDLERS.doubleDown.getTraitsForTower!('void_siphon')).toEqual([]);
    expect(TIER2_WAGER_HANDLERS.doubleDown.getTraitsForTower!('void_rift')).toEqual([]);
    expect(TIER2_WAGER_HANDLERS.doubleDown.getTraitsForTower!('void_oblivion')).toEqual([]);
  });

  it('Trait.ts damage-mod handler is wired (Spike: 100 → 200)', () => {
    const traits = TIER2_WAGER_HANDLERS.doubleDown.getTraitsForTower!('void_spike');
    const c = hitCtx(100);
    resolveDamageModifiers(traits, c);
    expect(c.damage).toBe(200);
  });

  it('Trait.ts damage-mod handler is wired (Gambler: 100 → 50)', () => {
    const traits = TIER2_WAGER_HANDLERS.doubleDown.getTraitsForTower!('void_gambler');
    const c = hitCtx(100);
    resolveDamageModifiers(traits, c);
    expect(c.damage).toBe(50);
  });

  it('Registry lookup matches handler', () => {
    expect(getWagerEffect('double_down')).toBe(TIER2_WAGER_HANDLERS.doubleDown);
  });
});

describe('Echo Ledger', () => {
  it('only applies to Siphon', () => {
    expect(TIER2_WAGER_HANDLERS.echoLedger.getTraitsForTower!('void_siphon').length).toBe(1);
    expect(TIER2_WAGER_HANDLERS.echoLedger.getTraitsForTower!('void_gambler')).toEqual([]);
  });

  it('Trait carries the Gambler-equivalent bonus damage', () => {
    const traits = TIER2_WAGER_HANDLERS.echoLedger.getTraitsForTower!('void_siphon');
    expect(traits[0].id).toBe(ECHO_LEDGER_TRAIT_ID);
    expect(traits[0].bonusDamage).toBe(8);
  });

  it('Trait.ts damage-mod handler adds bonus damage flat (10 → 18)', () => {
    const traits = TIER2_WAGER_HANDLERS.echoLedger.getTraitsForTower!('void_siphon');
    const c = hitCtx(10);
    resolveDamageModifiers(traits, c);
    expect(c.damage).toBe(18);
  });

  it('stacks if both Echo Ledger + Double Down somehow apply (defensive)', () => {
    // Siphon doesn't get Double Down, so this is a defensive sanity
    // test on the trait pipeline (chain order: declaration order).
    const traits: Trait[] = [
      { id: ECHO_LEDGER_TRAIT_ID, bonusDamage: 8 },
      { id: DOUBLE_DOWN_TRAIT_ID, damageMult: 2 },
    ];
    const c = hitCtx(10);
    resolveDamageModifiers(traits, c);
    // First +8 → 18, then ×2 → 36.
    expect(c.damage).toBe(36);
  });
});

describe('Loaded Dice', () => {
  it('applies to all tower types', () => {
    const ids = ['void_gambler', 'void_spike', 'void_siphon', 'void_rift', 'void_oblivion'];
    for (const id of ids) {
      const traits = TIER2_WAGER_HANDLERS.loadedDice.getTraitsForTower!(id);
      expect(traits.length).toBe(1);
      expect(traits[0].id).toBe(LOADED_DICE_TRAIT_ID);
    }
  });

  it('Trait carries the locked 30% crit / 2× / 0.8× constants', () => {
    const t = TIER2_WAGER_HANDLERS.loadedDice.getTraitsForTower!('void_gambler')[0];
    expect(t.critChance).toBe(0.30);
    expect(t.critMult).toBe(2.0);
    expect(t.whiffMult).toBe(0.8);
  });

  it('crit branch (rng<0.3): 100 → 200', () => {
    const t = TIER2_WAGER_HANDLERS.loadedDice.getTraitsForTower!('void_gambler')[0];
    // Inject deterministic RNG via the trait._rng convention.
    const traits: Trait[] = [{ ...t, _rng: () => 0.1 }];
    const c = hitCtx(100);
    resolveDamageModifiers(traits, c);
    expect(c.damage).toBe(200);
  });

  it('whiff branch (rng>=0.3): 100 → 80', () => {
    const t = TIER2_WAGER_HANDLERS.loadedDice.getTraitsForTower!('void_gambler')[0];
    const traits: Trait[] = [{ ...t, _rng: () => 0.5 }];
    const c = hitCtx(100);
    resolveDamageModifiers(traits, c);
    expect(c.damage).toBe(80);
  });

  it('expected value over many shots is ~1.16× input (statistical)', () => {
    const t = TIER2_WAGER_HANDLERS.loadedDice.getTraitsForTower!('void_gambler')[0];
    let total = 0;
    let i = 0;
    const seed = () => {
      const r = i / 10000; // 0..1 deterministic
      i++;
      return r;
    };
    for (let n = 0; n < 10000; n++) {
      const traits: Trait[] = [{ ...t, _rng: seed }];
      const c = hitCtx(100);
      resolveDamageModifiers(traits, c);
      total += c.damage;
    }
    const avg = total / 10000;
    // Theoretical: 0.30 × 200 + 0.70 × 80 = 60 + 56 = 116.
    expect(avg).toBeCloseTo(116, 0);
  });
});

describe('Hot Streak', () => {
  it('onMissionStart seeds streak counter + hotStreakHit flag', () => {
    const out = TIER2_WAGER_HANDLERS.hotStreak.onMissionStart!(ctx());
    expect(out?.flags?.[HOT_STREAK_COUNT_KEY]).toBe(0);
    expect(out?.flags?.hotStreakHit).toBe(false);
  });

  it('wave cleared without leak increments streak', () => {
    let flags: WagerMissionFlags = { [HOT_STREAK_COUNT_KEY]: 0, hotStreakHit: false };
    flags = TIER2_WAGER_HANDLERS.hotStreak.onWaveCleared!(ctx(), false, flags) as WagerMissionFlags;
    expect(flags[HOT_STREAK_COUNT_KEY]).toBe(1);
    flags = TIER2_WAGER_HANDLERS.hotStreak.onWaveCleared!(ctx(), false, flags) as WagerMissionFlags;
    expect(flags[HOT_STREAK_COUNT_KEY]).toBe(2);
  });

  it('streak hits target after HOT_STREAK_TARGET clean waves', () => {
    let flags: WagerMissionFlags = { [HOT_STREAK_COUNT_KEY]: 0, hotStreakHit: false };
    for (let i = 0; i < HOT_STREAK_TARGET; i++) {
      flags = TIER2_WAGER_HANDLERS.hotStreak.onWaveCleared!(ctx(), false, flags) as WagerMissionFlags;
    }
    expect(flags.hotStreakHit).toBe(true);
    expect(flags[HOT_STREAK_COUNT_KEY]).toBe(HOT_STREAK_TARGET);
  });

  it('leak resets the streak', () => {
    let flags: WagerMissionFlags = { [HOT_STREAK_COUNT_KEY]: 0, hotStreakHit: false };
    flags = TIER2_WAGER_HANDLERS.hotStreak.onWaveCleared!(ctx(), false, flags) as WagerMissionFlags;
    flags = TIER2_WAGER_HANDLERS.hotStreak.onWaveCleared!(ctx(), false, flags) as WagerMissionFlags;
    expect(flags[HOT_STREAK_COUNT_KEY]).toBe(2);
    flags = TIER2_WAGER_HANDLERS.hotStreak.onWaveCleared!(ctx(), true, flags) as WagerMissionFlags;
    expect(flags[HOT_STREAK_COUNT_KEY]).toBe(0);
  });

  it('hotStreakHit stays true after a later leak (earned success not retracted)', () => {
    let flags: WagerMissionFlags = { [HOT_STREAK_COUNT_KEY]: 0, hotStreakHit: false };
    for (let i = 0; i < HOT_STREAK_TARGET; i++) {
      flags = TIER2_WAGER_HANDLERS.hotStreak.onWaveCleared!(ctx(), false, flags) as WagerMissionFlags;
    }
    expect(flags.hotStreakHit).toBe(true);
    flags = TIER2_WAGER_HANDLERS.hotStreak.onWaveCleared!(ctx(), true, flags) as WagerMissionFlags;
    expect(flags.hotStreakHit).toBe(true); // preserved
    expect(flags[HOT_STREAK_COUNT_KEY]).toBe(0); // but streak reset
  });

  it('does NOT inject per-tower traits (mission-wide only)', () => {
    expect(TIER2_WAGER_HANDLERS.hotStreak.getTraitsForTower).toBeUndefined();
  });
});

describe('Tier-2 registry', () => {
  it('all 4 tier-2 cards registered', () => {
    for (const id of ['double_down', 'echo_ledger', 'loaded_dice', 'hot_streak']) {
      expect(getWagerEffect(id)).toBeTruthy();
    }
  });

  it('each handler has a non-empty summary', () => {
    for (const id of ['double_down', 'echo_ledger', 'loaded_dice', 'hot_streak']) {
      expect(getWagerEffect(id)!.meta.summary.length).toBeGreaterThan(0);
    }
  });
});
