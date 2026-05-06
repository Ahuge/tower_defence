/**
 * Typed Play Games Services / Game Center achievement IDs.
 *
 * IDs are minted per-platform in the respective console (Play
 * Console → Play Games Services → Achievements; App Store Connect
 * → Game Center → Achievements). The IDs below are the Android /
 * Play Games Services ones; when the iOS parallel lands they'll
 * live in a parallel block and the platform bridge picks the right
 * set at runtime based on `platformBridge().platform`.
 *
 * Naming: internal keys are SCREAMING_SNAKE_CASE and describe the
 * trigger; the opaque ID strings come from the console and mean
 * nothing to us.
 */
import { platformBridge } from '../systems/platform';

/** Android / Play Games Services achievement IDs. */
const ANDROID_IDS = {
  FIRST_WIN: 'CgkI6NS1_-8KEAIQAg',
} as const;

/** Type guard: compile-time check that new platforms stay in sync
 *  with the Android source of truth. iOS achievement IDs (when we
 *  register them) have to cover the same keys. */
export type AchievementKey = keyof typeof ANDROID_IDS;

/**
 * Resolve a platform-specific achievement ID for the active runtime,
 * or null when the runtime has no achievement system (web). Callers
 * can safely no-op on null.
 */
export function achievementId(key: AchievementKey): string | null {
  const platform = platformBridge().platform;
  if (platform === 'android') return ANDROID_IDS[key];
  // iOS, Electron, Steam, web — return null until we register IDs
  // in the corresponding platform console. The profile bridge's
  // unlockAchievement is a no-op on web anyway, so this just saves
  // a round-trip.
  return null;
}

/**
 * Fire-and-forget wrapper. Never throws, never blocks the caller.
 *
 * Always dispatches a `td-achievement-unlocked` window event after
 * the native bridge call resolves (or fails), so the in-app
 * `AchievementToast` component can show local confirmation. The
 * event's `nativeOk` flag says whether the platform bridge
 * succeeded — false when the user isn't signed in, the plugin
 * isn't installed (web), or the platform doesn't have a registered
 * id for this key. In either case the player sees the toast so
 * they know the achievement fired locally; a signed-in Android
 * user ALSO gets the Play Games server-side unlock.
 */
export async function unlockAchievement(key: AchievementKey): Promise<void> {
  const id = achievementId(key);
  let nativeOk = false;
  if (id) {
    try {
      await platformBridge().profile.unlockAchievement(id);
      nativeOk = true;
    } catch (err) {
      console.warn(`[achievements] unlock failed for ${key}`, err);
    }
  } else {
    console.info(`[achievements] ${key}: no platform id registered for ${platformBridge().platform} — local toast only`);
  }
  try {
    window.dispatchEvent(new CustomEvent('td-achievement-unlocked', { detail: { key, nativeOk } }));
  } catch { /* ignore */ }
}
