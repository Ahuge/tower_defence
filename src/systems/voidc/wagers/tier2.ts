/**
 * Tier-2 Wager effect handlers — medium Wagers, +2 Divergence each.
 *
 * First commit (commit 7) that wires real `Trait.ts` registry
 * handlers. Per-tower trait stamps from `getTraitsForTower` carry
 * the data; the actual mutation logic registers via
 * registerDamageMod / etc. once on module load.
 *
 * Cards in this tier:
 *   - **Double Down** — Spike towers 2× damage / Gambler towers 0.5×.
 *   - **Echo Ledger** — Each Siphon hit deals a free Gambler-equivalent
 *     follow-up shot. Implemented as a flat damage bonus on Siphon hits
 *     (full Gambler-firing semantics — 4% instakill etc. — deferred to
 *     Phase 2 when Tower spawn wires Wager traits in).
 *   - **Loaded Dice** — All towers: 30% chance per shot to deal 2×
 *     ("crit"); else 0.8×. Net expected value +16%, variance high.
 *   - **Hot Streak** — Mission-wide streak counter. 3 wave-clears in
 *     a row without a leak flips `hotStreakHit` (the Wager's success
 *     flag — see Pactbook.ts). Any leak resets streak to 0.
 *
 * Each per-tower trait registers ONE Trait.ts handler at module
 * load. Importing this module is the side-effect that wires them
 * in; `wagers/index.ts` triggers that import.
 */

import { registerWagerEffect, type WagerEffectHandler } from '../WagerEffects';
import {
  registerDamageMod,
  type Trait,
} from '../../traits/Trait';

// ─── Trait ids (forward-declared + handler-wired below) ──────────

const DOUBLE_DOWN_TRAIT_ID = 'void_wager_double_down';
const ECHO_LEDGER_TRAIT_ID = 'void_wager_echo_ledger';
const LOADED_DICE_TRAIT_ID = 'void_wager_loaded_dice';

// ─── Double Down ─────────────────────────────────────────────────
// Spike towers fire 2× damage; Gamblers fire 0.5×. The damage
// multiplier is read off the trait at fire-time.
const doubleDown: WagerEffectHandler = {
  meta: { summary: 'Spike 2× damage. Gambler 0.5× damage.' },
  getTraitsForTower(towerTypeId) {
    if (towerTypeId === 'void_spike') {
      return [{ id: DOUBLE_DOWN_TRAIT_ID, damageMult: 2.0 }];
    }
    if (towerTypeId === 'void_gambler') {
      return [{ id: DOUBLE_DOWN_TRAIT_ID, damageMult: 0.5 }];
    }
    return [];
  },
};

// ─── Echo Ledger ─────────────────────────────────────────────────
// Each Siphon hit adds a flat bonus damage component matching a
// Gambler's base damage. Simplified from "fire a free Gambler shot"
// — the bonus damage is the gameplay payoff; the visual flair lands
// in Phase 4 when the in-mission Wager HUD displays the echo.
//
// We carry `bonusDamage: 8` on the trait (Gambler's base damage).
const echoLedger: WagerEffectHandler = {
  meta: { summary: 'Siphon hits also deal a Gambler-shot bonus.' },
  getTraitsForTower(towerTypeId) {
    if (towerTypeId !== 'void_siphon') return [];
    const trait: Trait = { id: ECHO_LEDGER_TRAIT_ID, bonusDamage: 8 };
    return [trait];
  },
};

// ─── Loaded Dice ─────────────────────────────────────────────────
// Every tower's shot RNG-rolls: 30% → 2× damage ("crit"), 70% →
// 0.8× damage ("whiff"). Net EV +16% but variance is high — bursty
// kills + missed shots. Trait carries the crit chance + multipliers.
const loadedDice: WagerEffectHandler = {
  meta: { summary: '30% crit (2×). 70% whiff (0.8×). All towers.' },
  getTraitsForTower() {
    // Applies to ALL towers — Wager is mission-wide.
    return [{
      id: LOADED_DICE_TRAIT_ID,
      critChance: 0.30,
      critMult: 2.0,
      whiffMult: 0.8,
    }];
  },
};

// ─── Hot Streak ──────────────────────────────────────────────────
// Mission-wide state-machine: counts consecutive wave-clears
// without a leak. At 3, flips `hotStreakHit: true` (which Pactbook's
// success criterion reads). One leak resets to 0.
//
// The 'free wave-skip' reward described in the plan is a runtime
// gameplay payoff that lands when GameScene integration ships in
// Phase 2; the flag flip + Wager-success-on-resolve are the
// commitments locked here.
const HOT_STREAK_COUNT_KEY = 'hot_streak_count';
const HOT_STREAK_TARGET = 3;

const hotStreak: WagerEffectHandler = {
  meta: { summary: '3 wave-clears in a row, no leaks: success.' },
  onMissionStart() {
    return { flags: { [HOT_STREAK_COUNT_KEY]: 0, hotStreakHit: false } };
  },
  onWaveCleared(_ctx, leaked, currentFlags) {
    if (leaked) {
      // Streak broken — reset, but don't unset hotStreakHit if
      // already achieved (a single later leak shouldn't retract
      // a Wager-success the player has earned).
      return { ...currentFlags, [HOT_STREAK_COUNT_KEY]: 0 };
    }
    const prev = numFlag(currentFlags[HOT_STREAK_COUNT_KEY], 0);
    const next = prev + 1;
    const reached = next >= HOT_STREAK_TARGET;
    return {
      ...currentFlags,
      [HOT_STREAK_COUNT_KEY]: next,
      hotStreakHit: reached || Boolean(currentFlags.hotStreakHit),
    };
  },
};

function numFlag(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

// ─── Trait.ts handler registration (side-effect on module load) ──

/** Damage modifier handler for Double Down. Trait carries
 *  `damageMult`; reads it off and multiplies the per-shot damage. */
registerDamageMod(DOUBLE_DOWN_TRAIT_ID, (trait, damage, _ctx) => {
  const mult = typeof trait.damageMult === 'number' ? trait.damageMult : 1;
  return damage * mult;
});

/** Damage modifier for Echo Ledger. Trait carries `bonusDamage`;
 *  adds it flat to the per-shot damage. */
registerDamageMod(ECHO_LEDGER_TRAIT_ID, (trait, damage, _ctx) => {
  const bonus = typeof trait.bonusDamage === 'number' ? trait.bonusDamage : 0;
  return damage + bonus;
});

/** Damage modifier for Loaded Dice. Per-shot RNG — Math.random
 *  in production. Tests inject deterministic RNG by replacing the
 *  handler temporarily (see test file). */
registerDamageMod(LOADED_DICE_TRAIT_ID, (trait, damage, _ctx) => {
  const critChance = typeof trait.critChance === 'number' ? trait.critChance : 0.3;
  const critMult   = typeof trait.critMult   === 'number' ? trait.critMult   : 2.0;
  const whiffMult  = typeof trait.whiffMult  === 'number' ? trait.whiffMult  : 0.8;
  const rng = typeof trait._rng === 'function'
    ? (trait._rng as () => number)
    : Math.random;
  return rng() < critChance ? damage * critMult : damage * whiffMult;
});

// ─── Public registration helper ──────────────────────────────────

export function registerTier2WagerEffects(): void {
  registerWagerEffect('double_down', doubleDown);
  registerWagerEffect('echo_ledger', echoLedger);
  registerWagerEffect('loaded_dice', loadedDice);
  registerWagerEffect('hot_streak', hotStreak);
}

export const TIER2_WAGER_HANDLERS = { doubleDown, echoLedger, loadedDice, hotStreak };
export {
  DOUBLE_DOWN_TRAIT_ID,
  ECHO_LEDGER_TRAIT_ID,
  LOADED_DICE_TRAIT_ID,
  HOT_STREAK_COUNT_KEY,
  HOT_STREAK_TARGET,
};
