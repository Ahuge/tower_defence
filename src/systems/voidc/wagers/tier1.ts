/**
 * Tier-1 Wager effect handlers — small Wagers, +1 Divergence each.
 *
 * Imported as a side-effect from `src/systems/voidc/wagers/index.ts`
 * which runs registerWagerEffect() for each. Add new tier-1 cards
 * here; tier-2 cards live in `./tier2.ts` (commit 7), tier-3 in
 * `./tier3.ts` (commit 8).
 *
 * None of these mutate Tower behaviour directly. Markers declares a
 * Siphon-only trait id, but the actual Trait.ts handler for that id
 * is registered when the per-tower wager-trait pipeline integrates
 * with Tower spawn in Phase 2 (per the plan doc). For commit 6 the
 * trait is a forward-declaration — `getTraitsForTower` returns the
 * trait stamp, but Tower spawn ignores unknown trait ids gracefully
 * (the existing trait pipeline does this already by design).
 */

import { registerWagerEffect, type WagerEffectHandler } from '../WagerEffects';
import type { Trait } from '../../traits/Trait';

// ─── Coin Flip ───────────────────────────────────────────────────
// 50% chance: start mission with +50g, else -50g.
// Uses the RNG from the context (so deterministic in tests).
const coinFlip: WagerEffectHandler = {
  meta: {
    summary: 'Flip: +50g or -50g start gold.',
  },
  onMissionStart(ctx) {
    const heads = ctx.rng() < 0.5;
    return {
      goldDelta: heads ? +50 : -50,
      flags: { coin_flip_outcome: heads ? 'heads' : 'tails' },
    };
  },
};

// ─── House Cut ───────────────────────────────────────────────────
// All kill gold reduced by 10%; +1g flat per kill.
// Floors after multiplier so 1g kills become 1g (0.9 → floor → 0, +1 → 1).
// 100g kills become 91g (90 + 1).
const houseCut: WagerEffectHandler = {
  meta: {
    summary: "-10% kill gold, +1g per kill.",
  },
  modifyCreepKillGold(_ctx, baseGold) {
    return Math.floor(baseGold * 0.9) + 1;
  },
};

// ─── Sleeve Card ─────────────────────────────────────────────────
// One free tower sell at full price (anytime during the mission).
// Surfaces a mission flag the sell-path reads; flag is consumed
// the first time a sell happens via that path.
const sleeveCard: WagerEffectHandler = {
  meta: {
    summary: 'One free tower sell at full price.',
  },
  onMissionStart() {
    return {
      flags: { sleeve_card_available: true },
    };
  },
};

// ─── Markers ─────────────────────────────────────────────────────
// +1g per Siphon hit, -25% Siphon range.
// Per-tower trait injection: only `void_siphon` receives the
// `void_markers_siphon` trait. The trait handler lives with the
// wager-trait pipeline (Phase 2) — registry hook is forward-declared.
const MARKERS_TRAIT_ID = 'void_markers_siphon';

const markers: WagerEffectHandler = {
  meta: {
    summary: '+1g per Siphon hit, -25% Siphon range.',
  },
  getTraitsForTower(towerTypeId) {
    if (towerTypeId !== 'void_siphon') return [];
    const trait: Trait = { id: MARKERS_TRAIT_ID, goldPerHitBonus: 1, rangeMult: 0.75 };
    return [trait];
  },
};

// ─── Registration (side-effect) ──────────────────────────────────

export function registerTier1WagerEffects(): void {
  registerWagerEffect('coin_flip', coinFlip);
  registerWagerEffect('house_cut', houseCut);
  registerWagerEffect('sleeve_card', sleeveCard);
  registerWagerEffect('markers', markers);
}

// Exported handlers for direct test access (the registry is the
// production path; tests can also assert on the handlers directly).
export const TIER1_WAGER_HANDLERS = { coinFlip, houseCut, sleeveCard, markers };
export { MARKERS_TRAIT_ID };
