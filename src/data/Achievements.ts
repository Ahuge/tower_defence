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
 * Achievement shape:
 *   - **Standard** — one-shot unlock via `unlockAchievement(key)`.
 *   - **Incremental** — call `incrementAchievement(key, steps)` once
 *     per progress tick. Auto-unlocks server-side when cumulative
 *     steps hit the target count configured in the console. Native
 *     overlays show a "3/17 creeps discovered" progress bar.
 *
 * Naming: internal keys are SCREAMING_SNAKE_CASE and describe the
 * trigger; the opaque ID strings come from the console.
 *
 * Any achievement with an empty-string id here is a placeholder —
 * mint it in Play Console and replace. The helpers below treat
 * empty ids as "not registered" and silently skip the native call
 * while still dispatching the local `td-achievement-unlocked` event
 * so the in-app toast fires for dev + debug.
 */
import { platformBridge } from '../systems/platform';

// ─── Standard (one-shot) achievements ─────────────────────────

const ANDROID_IDS = {
  FIRST_WIN: 'CgkI6NS1_-8KEAIQAg',

  // First-win-with-faction achievements — one per playable faction.
  // Random faction is excluded (wins there blend rosters across
  // every faction; not a meaningful "mastery" moment).
  // Empty-string values are placeholders — mint in Play Console and
  // paste the real ids. The helpers treat empty-string as
  // "not registered" and skip the native call but still fire the
  // local toast for dev feedback.
  FIRST_WIN_ARCANE:     '',
  FIRST_WIN_MECHANICAL: '',
  FIRST_WIN_NATURE:     '',
  FIRST_WIN_VOID:       '',
  FIRST_WIN_MILITARY:   '',
  FIRST_WIN_ALIENS:     '',
  FIRST_WIN_CYPHERPUNK: '',
  FIRST_WIN_INFERNAL:   '',
  FIRST_WIN_CELESTIAL:  '',
  FIRST_WIN_PSIONIC:    '',
  FIRST_WIN_HARMONIC:   '',
} as const;

export type AchievementKey = keyof typeof ANDROID_IDS;

/**
 * Map `FactionId` → first-win achievement key. Returns null for
 * `random` (not rewarded — wins there blend rosters and aren't a
 * meaningful mastery moment) or any unknown faction id.
 */
export function firstWinAchievementKey(factionId: string): AchievementKey | null {
  switch (factionId) {
    case 'arcane':     return 'FIRST_WIN_ARCANE';
    case 'mechanical': return 'FIRST_WIN_MECHANICAL';
    case 'nature':     return 'FIRST_WIN_NATURE';
    case 'void':       return 'FIRST_WIN_VOID';
    case 'military':   return 'FIRST_WIN_MILITARY';
    case 'aliens':     return 'FIRST_WIN_ALIENS';
    case 'cypherpunk': return 'FIRST_WIN_CYPHERPUNK';
    case 'infernal':   return 'FIRST_WIN_INFERNAL';
    case 'celestial':  return 'FIRST_WIN_CELESTIAL';
    case 'psionic':    return 'FIRST_WIN_PSIONIC';
    case 'harmonic':   return 'FIRST_WIN_HARMONIC';
    default: return null;
  }
}

// ─── Incremental achievements ────────────────────────────────

const ANDROID_INCREMENTAL_IDS = {
  /** Progress ticks each time a new creep type is discovered.
   *  Target: 17 (one per creep type in CREEP_TYPES). Mint in Play
   *  Console as an incremental achievement with step count 17.
   *  Placeholder id — replace with the real Android id once minted. */
  DISCOVER_CREEPS: '',
} as const;

export type IncrementalAchievementKey = keyof typeof ANDROID_INCREMENTAL_IDS;

// ─── Lookup helpers ─────────────────────────────────────────

/**
 * Resolve a platform-specific achievement ID for the active runtime,
 * or null when the runtime has no achievement system (web) or no id
 * registered yet (placeholder).
 */
export function achievementId(key: AchievementKey): string | null {
  const platform = platformBridge().platform;
  if (platform !== 'android') return null;
  return ANDROID_IDS[key] || null;
}

export function incrementalAchievementId(key: IncrementalAchievementKey): string | null {
  const platform = platformBridge().platform;
  if (platform !== 'android') return null;
  return ANDROID_INCREMENTAL_IDS[key] || null;
}

// ─── Fire-and-forget wrappers ───────────────────────────────

/**
 * Unlock a one-shot achievement. Never throws, never blocks.
 * Always dispatches `td-achievement-unlocked` so the in-app toast
 * fires even when the native bridge call is a no-op (web, or
 * placeholder id). Event detail includes `nativeOk` so the toast
 * can render differently for "actually synced to Play Games" vs
 * "local-only".
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
    console.info(`[achievements] ${key}: no platform id registered — local toast only`);
  }
  try {
    window.dispatchEvent(new CustomEvent('td-achievement-unlocked', { detail: { key, nativeOk } }));
  } catch { /* ignore */ }
}

/**
 * Tick progress on an incremental achievement by `steps` (default 1).
 * Native consoles track cumulative progress server-side; we don't
 * need to know the total or current count locally. When progress
 * hits the target configured in the console, the server auto-unlocks
 * and a Play Games / Game Center toast pops.
 *
 * Callers own the "is this a NEW discovery?" dedup — we fire the
 * increment whether or not it would be redundant, and trust the
 * caller to only invoke on genuine progression. This matches the
 * Play Games Services contract: repeated increments above the
 * configured max are harmless.
 */
export async function incrementAchievement(key: IncrementalAchievementKey, steps: number = 1): Promise<void> {
  const id = incrementalAchievementId(key);
  if (!id) {
    console.info(`[achievements] ${key}: no platform id registered — skipping native increment`);
    return;
  }
  try {
    await platformBridge().profile.incrementAchievementProgress(id, steps);
  } catch (err) {
    console.warn(`[achievements] increment failed for ${key}`, err);
  }
}
