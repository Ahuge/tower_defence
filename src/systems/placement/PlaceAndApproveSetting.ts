/**
 * PlaceAndApproveSetting — persistence + default logic for the
 * "place and approve" accessibility toggle.
 *
 * Default behaviour:
 *   - Phone players: ON (the feature exists primarily to fix mobile
 *     mis-taps).
 *   - Desktop players: OFF (preserves existing one-tap-to-commit
 *     behaviour for power users).
 *   - Either platform can opt in or out via Settings → toggle.
 *
 * Storage: a single localStorage entry (`td_place_and_approve`)
 * with three states:
 *   - `'on'`  — user explicitly enabled
 *   - `'off'` — user explicitly disabled
 *   - missing — use the platform default (phone=ON, desktop=OFF)
 *
 * The "missing" tri-state lets us flip platform defaults later
 * without overriding explicit user choice.
 *
 * Mirrors the existing `td_analytics_optout` convention in
 * AnalyticsClient — direct localStorage read/write, no profile-
 * store coupling needed for a device-level toggle.
 */

import { ResponsiveManager } from '../ResponsiveManager';

const STORAGE_KEY = 'td_place_and_approve';

/** Raw preference (no platform-default applied). Used by the
 *  Settings UI toggle to render the user's explicit choice
 *  (or "default" if unset). */
export type RawPreference = 'on' | 'off' | null;

export function getRawPreference(): RawPreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'on' || v === 'off') return v;
    return null;
  } catch {
    return null; // localStorage may throw in private mode / sandboxed iframes
  }
}

/** Effective enabled state — explicit preference if set, else the
 *  platform default (phone ON, desktop OFF). This is the function
 *  GameScene + PlacementGateController consumers should read. */
export function isPlaceAndApproveEnabled(): boolean {
  const raw = getRawPreference();
  if (raw === 'on') return true;
  if (raw === 'off') return false;
  return ResponsiveManager.isPhone();
}

/** Persist an explicit preference. Passing `null` clears the
 *  setting back to platform default. */
export function setPreference(value: RawPreference): void {
  try {
    if (value === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, value);
    }
  } catch {
    // Silently swallow — best-effort persistence; the toggle still
    // works for the current session via the in-memory read path
    // (callers do `isPlaceAndApproveEnabled()` per check).
  }
}

/** Test-only — clear the storage key so each test starts fresh. */
export function _resetForTest(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* swallow */ }
}
