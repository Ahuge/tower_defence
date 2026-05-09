/** Tracks whether the AppLoadingScreen has finished and dismissed.
 *  AppLoadingScreen fires `app-splash-dismissed` once its fade-out
 *  completes; anything that should wait until the user is actually
 *  looking at the menu (e.g. the announcement auto-pop, the
 *  first-launch tutorial cue) can read this instead of subscribing
 *  to the raw event itself. */

let bootComplete = false;

if (typeof window !== 'undefined') {
  window.addEventListener('app-splash-dismissed', () => {
    bootComplete = true;
  }, { once: true });
}

export function isBootComplete(): boolean {
  return bootComplete;
}
