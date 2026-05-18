/**
 * Wagers — runtime effect-handler registrations for the Pactbook deck.
 *
 * Side-effect import: importing this module triggers
 * `registerWagerEffect()` for every shipped Wager. `main.ts` (or
 * the Snake Eyes campaign init path) imports this once to populate
 * the WagerEffects registry.
 *
 * Tier-1 handlers shipped in commit 6 (Coin Flip / House Cut /
 * Sleeve Card / Markers). Tier-2 lands in commit 7; tier-3 in
 * commit 8.
 */

import { registerTier1WagerEffects } from './tier1';

registerTier1WagerEffects();
