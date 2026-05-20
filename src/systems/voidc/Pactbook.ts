/**
 * Pactbook — Snake Eyes campaign's signature mechanic.
 *
 * Before every mission, the player draws 3 Wagers from a 12-card
 * deck (with replacement, optionally tier-weighted per-mission, and
 * optionally with card-id exclusions). They pick 1 to ACCEPT (the
 * Wager's effect applies for this mission, Divergence rises by tier)
 * or DECLINE ALL THREE (+20g Debt penalty).
 *
 * Two architecture decisions (user-locked, see plan doc §"Pactbook
 * Deck"):
 *
 *   1. **Wager outcome = hybrid.** Default success criterion is "the
 *      player won the mission" (`r.won`). Specific cards override
 *      via an explicit `successCriteria` predicate that reads
 *      MissionResult.custom (e.g. Hot Streak checks the streak
 *      counter, Inverted Stakes checks zero-leaks).
 *
 *   2. **Per-mission deck bias = tier-weight vector** `[wT1, wT2, wT3]`.
 *      A mission can pass `[0.5, 0.5, 3]` to weight draws toward
 *      tier 3 (the M3 "deck draws heavy" beat). Default `[1, 1, 1]`
 *      is uniform across tiers.
 *
 * THIS COMMIT IS PURE LOGIC. Wager effect implementations (the
 * runtime mutators) land in commit 6 (tier-1), commit 7 (tier-2),
 * and commit 8 (tier-3). Each Wager's `effectId` is the handle to
 * its future entry in the `WagerEffects` registry.
 *
 * No UI in this commit either — `PactbookPanel` (the Phaser scene)
 * lands in Phase 4 commit 19.
 */

import type { MissionResult } from '../campaign/types';
import {
  getSnakeEyesState,
  setSnakeEyesState,
  applyDeclinePenalty,
  type PactbookTally,
} from './DebtTracker';
import type { WagerTier } from './DivergenceTracker';

// ─── Types ───────────────────────────────────────────────────────

/** A single Pactbook card. The effect is identified by `effectId`;
 *  the actual mutator behaviour lives in the WagerEffects registry
 *  (commits 6-8). */
export interface Wager {
  /** Stable id within the deck. Drives tally analytics + selection. */
  id: string;
  /** Display name (e.g. "Coin Flip", "The Mirror Wager"). */
  name: string;
  /** Tier 1 (small) / 2 (medium) / 3 (high-risk). Sets Divergence
   *  gain on accept. */
  tier: WagerTier;
  /** One-line flavor text shown on the card. */
  flavor: string;
  /** Handle to the WagerEffects registry. Same as `id` for the
   *  shipped 12 cards, but kept as a separate field so future
   *  cosmetic-rename / re-skin doesn't have to touch effect code. */
  effectId: string;
  /** Optional success predicate. Receives the mission result at
   *  game-end. Default (omitted): `r.won` — the Wager succeeds
   *  whenever the player wins the mission. */
  successCriteria?: (r: MissionResult) => boolean;
}

/** Tier-weight bias for the draw. Index 0 = tier-1, etc. Per-mission
 *  override on the Pactbook draw; default [1,1,1] is uniform. */
export type TierWeights = readonly [number, number, number];

export const DEFAULT_WEIGHTS: TierWeights = [1, 1, 1] as const;

// ─── The 12-card deck ────────────────────────────────────────────

/** The 12 Wagers in the Pactbook. Order is not gameplay-significant
 *  (draws are random); the listing follows tier ascending for
 *  reading clarity. Effects implemented in commits 6-8. */
export const PACTBOOK_DECK: readonly Wager[] = [
  // ─── Tier 1 — small (Divergence +1) ───────────────────────────
  {
    id: 'coin_flip', name: 'Coin Flip', tier: 1,
    flavor: 'He flipped it. He didn\'t look at it.',
    effectId: 'coin_flip',
  },
  {
    id: 'house_cut', name: 'House Cut', tier: 1,
    flavor: 'Always works out in the long run.',
    effectId: 'house_cut',
  },
  {
    id: 'sleeve_card', name: 'Sleeve Card', tier: 1,
    flavor: 'Card up the sleeve. Pick a tower.',
    effectId: 'sleeve_card',
  },
  {
    id: 'markers', name: 'Markers', tier: 1,
    flavor: 'Closer to the table.',
    effectId: 'markers',
  },

  // ─── Tier 2 — medium (Divergence +2) ──────────────────────────
  {
    id: 'double_down', name: 'Double Down', tier: 2,
    flavor: 'Pick the side. Stay there.',
    effectId: 'double_down',
  },
  {
    id: 'echo_ledger', name: 'Echo Ledger', tier: 2,
    flavor: 'The book reads itself.',
    effectId: 'echo_ledger',
  },
  {
    id: 'loaded_dice', name: 'Loaded Dice', tier: 2,
    flavor: 'The dice are honest. He just knows them better.',
    effectId: 'loaded_dice',
  },
  {
    id: 'hot_streak', name: 'Hot Streak', tier: 2,
    flavor: "Don't break it.",
    effectId: 'hot_streak',
    // Hot Streak succeeds if the player chained at least 3 wave
    // clears with no leaks at some point during the mission. The
    // streak counter is written to `MissionResult.custom.hotStreakHit`
    // by the in-mission Hot Streak effect (commit 7).
    successCriteria: r => Boolean(r.won && r.custom['hotStreakHit']),
  },

  // ─── Tier 3 — high-risk (Divergence +3) ───────────────────────
  {
    id: 'pact_of_zeros', name: 'The Pact of Zeros', tier: 3,
    flavor: 'The table only deals in tens tonight.',
    effectId: 'pact_of_zeros',
  },
  {
    id: 'inverted_stakes', name: 'Inverted Stakes', tier: 3,
    flavor: 'All or nothing. Pretty much always all.',
    effectId: 'inverted_stakes',
    // Inverted Stakes succeeds iff the player won with zero leaks
    // (the "perfectRun" flag captures this exactly). On success,
    // the in-mission effect doubles the Debt paydown.
    successCriteria: r => r.won && r.perfectRun,
  },
  {
    id: 'counterfactual_cut', name: "The Counterfactual's Cut", tier: 3,
    flavor: "He's playing your hand for you. Pay him for it.",
    effectId: 'counterfactual_cut',
  },
  {
    id: 'mirror_wager', name: 'The Mirror Wager', tier: 3,
    flavor: 'His deal.',
    effectId: 'mirror_wager',
    // Mirror Wager succeeds iff the player beat the paired grid
    // faster than the Counterfactual cleared his. The Mirror Lane
    // controller (commit 16) writes `mirrorWagerWon: true` into
    // MissionResult.custom when this happens; on failure the
    // mission ends in instant loss (not a "graceful fail").
    successCriteria: r => r.won && Boolean(r.custom['mirrorWagerWon']),
  },
] as const;

/** Stable id of the Mirror Wager — the one card that must be
 *  excluded from the M10 deck because M10 already has the paired-
 *  grid setpiece (collision). */
export const MIRROR_WAGER_ID = 'mirror_wager';

// ─── Helpers ─────────────────────────────────────────────────────

/** Returns a Wager by id, or throws if no such card exists. Used by
 *  tests + the WagerEffects registry. */
export function getWager(id: string): Wager {
  const w = PACTBOOK_DECK.find(x => x.id === id);
  if (!w) throw new Error(`Unknown Pactbook card: ${id}`);
  return w;
}

/** Filter the deck by tier — handy for tests + the draw algorithm. */
export function deckOfTier(tier: WagerTier): readonly Wager[] {
  return PACTBOOK_DECK.filter(w => w.tier === tier);
}

// ─── The Pactbook lifecycle (per-mission instance) ───────────────

/** Options at construction. RNG defaults to Math.random; tests
 *  inject a deterministic source. */
export interface PactbookOptions {
  rng?: () => number;
}

/** Per-mission Pactbook instance. GameScene constructs one at scene
 *  init for Snake Eyes missions, calls draw() once, then waits for
 *  the player to accept() or declineAll(). After the mission ends,
 *  GameScene calls resolveOutcome(missionResult). */
export class Pactbook {
  private readonly rng: () => number;
  private _drawn: Wager[] = [];
  private _selected: Wager | null = null;
  private _declined: boolean = false;

  constructor(opts: PactbookOptions = {}) {
    this.rng = opts.rng ?? Math.random;
  }

  /** Draw `count` Wagers from the deck. With replacement (the same
   *  card may appear twice; this is rare for 3 draws across 12 cards
   *  but possible). Bias the draw by tier weights; exclude specific
   *  card ids (e.g. mirror_wager on M10). Returns the drawn list. */
  draw(
    count: number = 3,
    weights: TierWeights = DEFAULT_WEIGHTS,
    excludeIds: readonly string[] = [],
  ): Wager[] {
    if (count <= 0) {
      this._drawn = [];
      return this._drawn;
    }
    const pool = PACTBOOK_DECK.filter(w => !excludeIds.includes(w.id));
    const drawn: Wager[] = [];
    for (let i = 0; i < count; i++) {
      drawn.push(weightedDraw(pool, weights, this.rng));
    }
    this._drawn = drawn;
    this._selected = null;
    this._declined = false;
    return drawn;
  }

  /** Player accepts one of the drawn Wagers. Updates the campaign-
   *  wide tally (acceptedTN++). Returns the accepted Wager.
   *  Throws if no cards drawn yet or the id isn't in the drawn set. */
  accept(wagerId: string): Wager {
    if (this._drawn.length === 0) {
      throw new Error('Pactbook.accept called before draw');
    }
    if (this._selected || this._declined) {
      throw new Error('Pactbook.accept called after the mission Wager is already resolved');
    }
    const w = this._drawn.find(x => x.id === wagerId);
    if (!w) {
      throw new Error(`Pactbook.accept: ${wagerId} was not in the drawn set`);
    }
    this._selected = w;
    bumpTally(t => {
      if (w.tier === 1) t.acceptedT1++;
      else if (w.tier === 2) t.acceptedT2++;
      else t.acceptedT3++;
    });
    return w;
  }

  /** Player declines all three drawn Wagers. Applies the Debt
   *  decline penalty (+20g, see DebtTracker) and bumps the tally
   *  declined counter. Throws if no cards drawn or selection
   *  already resolved. */
  declineAll(): void {
    if (this._drawn.length === 0) {
      throw new Error('Pactbook.declineAll called before draw');
    }
    if (this._selected || this._declined) {
      throw new Error('Pactbook.declineAll called after the mission Wager is already resolved');
    }
    this._declined = true;
    applyDeclinePenalty();
    bumpTally(t => { t.declined++; });
  }

  /** Resolve the Wager's success/failure given the mission's final
   *  result. Updates the succeeded / failed tally accordingly.
   *  No-op if the player declined (succeed/fail doesn't apply to a
   *  declined Wager). Returns true on success, false on fail, null
   *  if not applicable (declined / not selected). */
  resolveOutcome(result: MissionResult): boolean | null {
    if (this._declined || !this._selected) return null;
    const w = this._selected;
    const predicate = w.successCriteria ?? defaultSuccess;
    const ok = predicate(result);
    bumpTally(t => { if (ok) t.succeeded++; else t.failed++; });
    return ok;
  }

  // ─── Inspection ─────────────────────────────────────────────────

  getDrawn(): readonly Wager[] { return this._drawn; }
  getSelected(): Wager | null { return this._selected; }
  isDeclined(): boolean { return this._declined; }
  /** True iff the player has either accepted a card or declined all
   *  three. Used by the UI to enable the "start mission" button. */
  isResolved(): boolean { return this._selected !== null || this._declined; }
}

// ─── Internals ───────────────────────────────────────────────────

function defaultSuccess(r: MissionResult): boolean {
  return r.won;
}

/** Weighted random pick from `pool` using `weights[tier-1]` as each
 *  card's weight. Zero-weight cards are excluded. If all weights are
 *  zero (pathological), falls back to uniform.
 *
 *  Uses a single-pass roulette-wheel walk over the filtered pool.
 *  O(pool.length) per draw; fine at 12 cards. */
function weightedDraw(
  pool: readonly Wager[],
  weights: TierWeights,
  rng: () => number,
): Wager {
  if (pool.length === 0) {
    throw new Error('weightedDraw: empty pool (all cards excluded?)');
  }

  let total = 0;
  for (const w of pool) total += weights[w.tier - 1];

  // Pathological all-zero weights: fall back to uniform.
  if (total <= 0) {
    return pool[Math.floor(rng() * pool.length)];
  }

  let r = rng() * total;
  for (const w of pool) {
    r -= weights[w.tier - 1];
    if (r <= 0) return w;
  }
  // Floating-point safety: return the last card.
  return pool[pool.length - 1];
}

/** Read-modify-write the persisted Pactbook tally. Internal helper
 *  used by accept / declineAll / resolveOutcome. */
function bumpTally(mut: (t: PactbookTally) => void): void {
  const state = getSnakeEyesState();
  const next: PactbookTally = { ...state.pactbookTally };
  mut(next);
  setSnakeEyesState({ ...state, pactbookTally: next });
}
