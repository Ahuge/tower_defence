/**
 * Debug flag — set from the URL query string. Enables verbose
 * diagnostics (console logs, on-screen overlays) without paying
 * the console-spam cost in normal play.
 *
 * Visit the game with `?debug` in the URL to turn it on.
 */
export const DEBUG =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('debug');

/**
 * Unlock-all flag — set from the URL query string. Visit the game
 * with `?unlock=true` to make every faction playable and every game
 * mode / map available without going through the shard, campaign, or
 * Player Level unlock flow. Intended for testing and balance
 * playtesting; it bypasses the gate checks at runtime and does not
 * write anything to the player's stored unlock progress.
 */
export const UNLOCK_ALL_FACTIONS =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('unlock') === 'true';
