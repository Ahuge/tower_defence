/**
 * Tier-3 Wager effect handlers — high-risk Wagers, +3 Divergence each.
 *
 * Cards in this tier:
 *
 *   - **The Pact of Zeros** — Round all damage to nearest 10.
 *     Net effect: shots dealing < 5 damage round to 0 (whiff);
 *     shots dealing > 5 round up; "survivors die instantly" is
 *     a colour phrase — actual semantics are clean rounding.
 *     Per-tower trait on all towers.
 *
 *   - **Inverted Stakes** — Doubles win paydown ON PERFECT RUN;
 *     zero paydown on any leak. Pactbook's success criterion
 *     already gates on `r.won + r.perfectRun`; the paydown
 *     multiplier hook (new in commit 8) reads the same condition.
 *
 *   - **The Counterfactual's Cut** — Pays down Debt 100g at accept
 *     time (one-shot, via onMissionStart.debtDelta). Surfaces a
 *     `slots_locked: 2` flag for GameScene to apply mid-Phase 3 —
 *     the player loses 2 random tower placements all mission.
 *
 *   - **The Mirror Wager** — Activates the paired-grid Mirror Lane
 *     setpiece for the mission. Beat the Counterfactual's grid →
 *     `mirrorWagerWon: true` (3× paydown via the multiplier hook +
 *     Pactbook success criterion). Lose → instant mission loss
 *     (handled by MirrorLaneController, commit 16). For commit 8:
 *     just declare the flag and the paydown multiplier hook.
 */

import { registerWagerEffect, type WagerEffectHandler } from '../WagerEffects';
import { registerDamageMod, type Trait } from '../../traits/Trait';

// ─── Trait ids ───────────────────────────────────────────────────

const PACT_OF_ZEROS_TRAIT_ID = 'void_wager_pact_of_zeros';

// ─── The Pact of Zeros ───────────────────────────────────────────
const pactOfZeros: WagerEffectHandler = {
  meta: { summary: 'All damage rounded to the nearest 10.' },
  getTraitsForTower() {
    // Mission-wide — applies to every tower placed.
    return [{ id: PACT_OF_ZEROS_TRAIT_ID }];
  },
};

// ─── Inverted Stakes ─────────────────────────────────────────────
// No per-tower trait. The "double paydown on perfect run" / "zero
// paydown on leak" gating happens through the paydown-multiplier
// hook, which reads the final MissionResult.
const invertedStakes: WagerEffectHandler = {
  meta: { summary: 'Perfect run: 2× paydown. One leak: zero paydown.' },
  getPaydownMultiplier(result) {
    if (!result.won) return 1;       // not a paydown event anyway
    return result.perfectRun ? 2 : 0;
  },
};

// ─── The Counterfactual's Cut ────────────────────────────────────
// One-shot Debt paydown at accept (-100g). Surfaces a flag so
// GameScene's tower-placement path can lock 2 random slots when
// the mid-Phase wiring lands.
const counterfactualCut: WagerEffectHandler = {
  meta: { summary: '-100g Debt now. 2 random tower slots locked all mission.' },
  onMissionStart() {
    return {
      debtDelta: -100,
      flags: { slots_locked: 2 },
    };
  },
};

// ─── The Mirror Wager ────────────────────────────────────────────
// Activates the paired-grid Mirror Lane setpiece. Result-side: 3×
// paydown on `mirrorWagerWon`. The setpiece controller (commit 16)
// owns the actual lane runtime + write of the mirrorWagerWon flag.
const mirrorWager: WagerEffectHandler = {
  meta: { summary: 'Mirror Lane setpiece. Beat his grid: 3× paydown. Lose: lose mission.' },
  onMissionStart() {
    return { flags: { mirror_wager_active: true } };
  },
  getPaydownMultiplier(result) {
    // Only multiply if the win actually came through Mirror Lane —
    // anywhere else the multiplier is 1 (the Pactbook success
    // criterion separately enforces that `mirrorWagerWon` was the
    // win pathway).
    return result.won && result.custom['mirrorWagerWon'] ? 3 : 1;
  },
};

// ─── Trait.ts handler registration ───────────────────────────────

/** Pact of Zeros damage mod: round to nearest 10. */
registerDamageMod(PACT_OF_ZEROS_TRAIT_ID, (_trait, damage, _ctx) => {
  // round-to-nearest-10: 1..4 → 0; 5..14 → 10; 15..24 → 20; etc.
  return Math.round(damage / 10) * 10;
});

// ─── Public registration helper ──────────────────────────────────

export function registerTier3WagerEffects(): void {
  registerWagerEffect('pact_of_zeros', pactOfZeros);
  registerWagerEffect('inverted_stakes', invertedStakes);
  registerWagerEffect('counterfactual_cut', counterfactualCut);
  registerWagerEffect('mirror_wager', mirrorWager);
}

export const TIER3_WAGER_HANDLERS = {
  pactOfZeros,
  invertedStakes,
  counterfactualCut,
  mirrorWager,
};

export { PACT_OF_ZEROS_TRAIT_ID };
