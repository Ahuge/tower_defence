/**
 * Ad-placement cooldown tracking.
 *
 * Frequency caps are a strategy-doc principle — "Frequency caps on
 * anything unlimited" — and that math has to live somewhere durable
 * so it survives reloads / app kills. Stored in localStorage under a
 * single key as a simple map of `placementId → lastShownTimestamp`.
 *
 * The module exposes two cooldown strategies:
 *   - **Daily** (local-midnight reset) — used by the daily-shards
 *     button. Ready whenever the last play happened before today's
 *     local midnight.
 *   - **Interval** (fixed ms since last play) — used by anything
 *     with a rolling cooldown (the draft-reroll escalating cooldown,
 *     the 60 s same-session interstitial throttle).
 *
 * Both use the same stored-timestamp backing — the difference is
 * whether we compare against a calendar boundary or a wall-clock
 * delta. Callers pick the strategy at the call site.
 *
 * Future: when ProfileBridge.cloudSave is wired up, these
 * timestamps should sync to the PlayGames / Game Center account so
 * reinstalls and cross-device play don't reset the daily claim.
 * The ad-strategy doc captures this as the "cloud-synced cooldowns"
 * open question. For now localStorage only.
 */

export const AD_COOLDOWN_STORAGE_KEY = 'td_ad_cooldowns';

type CooldownMap = Record<string, number>;

function load(): CooldownMap {
  try {
    const raw = localStorage.getItem(AD_COOLDOWN_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed as CooldownMap : {};
  } catch {
    return {};
  }
}

function save(data: CooldownMap): void {
  try {
    localStorage.setItem(AD_COOLDOWN_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage can be unavailable (private mode) or full (quota);
    // cooldowns degrade to "always ready" in that case, which is
    // user-friendly enough — worst-case the player gets extra free
    // shards rather than being locked out.
  }
}

/** Last time this placement was shown (ms since epoch) or null. */
export function getLastShown(placementId: string): number | null {
  const v = load()[placementId];
  return typeof v === 'number' ? v : null;
}

/** Mark this placement as just shown. Call only after a 'shown'
 *  result from the ad bridge — skipped / unavailable / errored ads
 *  don't consume the cooldown. */
export function markShown(placementId: string, at: number = Date.now()): void {
  const data = load();
  data[placementId] = at;
  save(data);
}

/** Reset a placement's cooldown. Not currently used at runtime but
 *  exposed for tests and a future "reset dev progress" tool. */
export function resetCooldown(placementId: string): void {
  const data = load();
  delete data[placementId];
  save(data);
}

// ─── Daily (UTC midnight) ───────────────────────────────────

/** UTC-midnight timestamp for the date containing `ms`. */
function utcMidnightOf(ms: number): number {
  const d = new Date(ms);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

/** True when the placement has never played, or when it last played
 *  before the most-recent UTC midnight. UTC rather than local so
 *  cloud-synced cooldowns (future) agree across devices in different
 *  timezones, and a player can't farm the daily by crossing a
 *  timezone boundary on a flight. */
export function isDailyReady(placementId: string, now: number = Date.now()): boolean {
  const last = getLastShown(placementId);
  if (last === null) return true;
  return utcMidnightOf(last) < utcMidnightOf(now);
}

/** Milliseconds until the next UTC midnight after the last play.
 *  Returns 0 when already available. */
export function msUntilNextDaily(placementId: string, now: number = Date.now()): number {
  if (isDailyReady(placementId, now)) return 0;
  const d = new Date(now);
  d.setUTCHours(24, 0, 0, 0); // next UTC 00:00
  return d.getTime() - now;
}

// ─── Interval (rolling window) ──────────────────────────────

/** True when the placement has never played, or played more than
 *  `intervalMs` ago. */
export function isIntervalReady(
  placementId: string,
  intervalMs: number,
  now: number = Date.now(),
): boolean {
  const last = getLastShown(placementId);
  if (last === null) return true;
  return now - last >= intervalMs;
}

/** Milliseconds until the placement can play again under an interval
 *  cooldown. Returns 0 when already available. */
export function msUntilNextInterval(
  placementId: string,
  intervalMs: number,
  now: number = Date.now(),
): number {
  if (isIntervalReady(placementId, intervalMs, now)) return 0;
  const last = getLastShown(placementId);
  // last cannot be null here (isIntervalReady would have returned true).
  return Math.max(0, (last as number) + intervalMs - now);
}

// ─── Formatting ─────────────────────────────────────────────

/** "7h 23m" / "23m" / "42s" — used by countdown labels. */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return '';
  if (ms < 60_000) return `${Math.ceil(ms / 1000)}s`;
  const totalMinutes = Math.ceil(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
