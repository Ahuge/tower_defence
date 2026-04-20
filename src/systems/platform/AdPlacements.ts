/**
 * Canonical ad-placement identifiers + reward amounts.
 *
 * Every call into `platformBridge().ads.showInterstitial()` /
 * `.showRewarded()` passes one of these strings. AdMob reporting
 * groups revenue + fill-rate per placement, so:
 *   - we can tell which placement is actually pulling weight
 *   - we can retire or redesign underperformers
 *   - we can A/B reward amounts without guessing which call site
 *     is driving what
 *
 * Keep in lockstep with the placement table in docs/ad-strategy.md
 * — when a new placement ships in code it should be in the doc
 * first, reviewed, and only then land here.
 */

// ─── Interstitial ────────────────────────────────────────────

/** Single interstitial: game-over → menu transition. Plays on the
 *  Play Again / Menu buttons. Suppressed when a continue-ad already
 *  ran this match. */
export const AD_GAME_OVER_EXIT = 'game_over_exit';

// ─── Rewarded ───────────────────────────────────────────────

/** Lives→0 rescue offer (placement #6). 1/match. */
export const AD_GAME_OVER_CONTINUE = 'game_over_continue';

/** "Watch ad for +100 shards" button in the Store (placement #1).
 *  1/day local-midnight reset. */
export const AD_SHARDS_DAILY = 'shards_daily';

/** Draft modifier unlocks (placements #2, #3). 1/match each. */
export const AD_DRAFT_MODIFIER_2 = 'draft_modifier_2';
export const AD_DRAFT_MODIFIER_3 = 'draft_modifier_3';

/** Draft reroll-all (placement #4). Soft cap: 3/match then cooldown. */
export const AD_DRAFT_REROLL = 'draft_reroll';

/** 3× speed unlock for 10 min of real time (placement #5). Stackable
 *  to 30 min max. */
export const AD_SPEED_BOOST_10M = 'speed_boost_10m';

/** Re-roll a paid tower roll in the Store (placement #7). 1/roll. */
export const AD_TOWER_ROLL_REROLL = 'tower_roll_reroll';

// ─── Reward tuning ──────────────────────────────────────────
//
// Reward amounts live alongside placement ids so a single file is
// the source of truth — balance tweaks don't require chasing
// literals through UI components.

export const DAILY_SHARDS_REWARD = 100;
export const CONTINUE_LIVES_REWARD = 5;
