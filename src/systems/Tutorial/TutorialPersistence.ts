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
  /** Plan 4: when true, suppress every `faction:*` auto-trigger.
   *  The player can still replay any individual brief from the Help
   *  carousel. Toggleable from the brief dialog itself and from
   *  Settings later. */
  skipAllFactionBriefs?: boolean;
  version: number;
}

function defaultState(): TutorialState {
  return { completedTracks: [], dismissedFirstLaunch: false, skipAllFactionBriefs: false, version: STATE_VERSION };
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
        skipAllFactionBriefs: !!parsed.skipAllFactionBriefs,
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

  /** Idempotent flip of `dismissedFirstLaunch`. Used by the cold-boot
   *  splash so the next launch (or a re-mount during this session)
   *  doesn't re-prompt. */
  markFirstLaunchDismissed(): void {
    const state = TutorialPersistence.load();
    if (state.dismissedFirstLaunch) return;
    state.dismissedFirstLaunch = true;
    TutorialPersistence.save(state);
  },

  /** Read / write the global "skip all faction briefs" toggle. */
  isFactionBriefsSkipped(): boolean {
    return !!TutorialPersistence.load().skipAllFactionBriefs;
  },
  setFactionBriefsSkipped(value: boolean): void {
    const state = TutorialPersistence.load();
    if (!!state.skipAllFactionBriefs === value) return;
    state.skipAllFactionBriefs = value;
    TutorialPersistence.save(state);
  },
};
