/**
 * TutorialPersistence — localStorage-backed record of which tutorial tracks
 * the player has seen (or explicitly skipped). Bump STATE_VERSION when we
 * add new tracks and want to re-prompt returning players.
 */

const STORAGE_KEY = 'td_tutorial_state';
const STATE_VERSION = 1;

export interface TutorialState {
  /** Track IDs the player has finished or explicitly skipped. */
  completedTracks: string[];
  /** True once the player has either completed or dismissed the first-launch flow.
   *  Prevents `basics` from auto-launching on every page load. */
  dismissedFirstLaunch: boolean;
  version: number;
}

function defaultState(): TutorialState {
  return { completedTracks: [], dismissedFirstLaunch: false, version: STATE_VERSION };
}

export const TutorialPersistence = {
  load(): TutorialState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw) as Partial<TutorialState>;
      if (parsed.version !== STATE_VERSION) return defaultState();
      return {
        completedTracks: Array.isArray(parsed.completedTracks) ? parsed.completedTracks : [],
        dismissedFirstLaunch: !!parsed.dismissedFirstLaunch,
        version: STATE_VERSION,
      };
    } catch {
      return defaultState();
    }
  },
  save(state: TutorialState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage disabled / quota exceeded — tutorial will simply re-trigger next session.
    }
  },
  reset(): void {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
  },
};
