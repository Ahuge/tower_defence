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
