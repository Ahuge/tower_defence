/**
 * AnalyticsClient — lightweight game telemetry that posts events to the
 * signaling server's analytics endpoint. Fire-and-forget, non-blocking.
 *
 * Two ways to emit events:
 *
 *   1. Typed (preferred):
 *        Analytics.track('game_start', { mode, faction, difficulty, map });
 *      Payload shape is validated by the union in AnalyticsEvents.ts.
 *
 *   2. Untyped legacy shim:
 *        Analytics.event('custom_thing', { foo: 'bar' });
 *      Still works for ad-hoc events; new events should be typed.
 *
 * Auto-attached fields (do NOT pass them in payload):
 *   - platform: android | ios | desktop | web
 *   - sessionId: random per page load
 *   - playerLevel, cores, shards, unlockedFactionsCount: once
 *     setPlayerContextProvider() is wired by Plan 2's PlayerProfile
 *
 * Debug panel: visit with `?debug` in the URL and the panel becomes
 * available. The client keeps a ring buffer of the last 200 events
 * for the panel regardless of opt-out.
 */

import type { EventName, EventPayload } from './AnalyticsEvents';

const DEFAULT_SERVER_URL = 'https://signal.streamingsplats.com';
const RING_BUFFER_SIZE = 200;

interface AnalyticsEventPayload {
  type: string;
  [key: string]: string | number | boolean | undefined;
}

/** Detected once at module load. One of:
 *    'android' — Capacitor build running on Android
 *    'ios'     — Capacitor build running on iOS
 *    'desktop' — web build on a desktop browser
 *    'web'     — web build on a mobile browser
 *  Lets the analytics dashboard slice events by player surface
 *  without needing per-call instrumentation. */
function detectPlatform(): 'android' | 'ios' | 'desktop' | 'web' {
  if (typeof window === 'undefined') return 'web';
  // Capacitor exposes window.Capacitor with getPlatform() in native
  // builds; on web it's either undefined or returns 'web'.
  const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string; isNativePlatform?: () => boolean } }).Capacitor;
  if (cap?.isNativePlatform?.()) {
    const p = cap.getPlatform?.();
    if (p === 'android' || p === 'ios') return p;
  }
  // Web build — distinguish desktop vs mobile by touch capability +
  // viewport width. Same heuristic ResponsiveManager uses for its
  // phone/tablet/desktop split.
  const hasTouch = 'ontouchstart' in window || (navigator?.maxTouchPoints ?? 0) > 0;
  const smallViewport = (window.innerWidth || 0) < 1024;
  return (hasTouch && smallViewport) ? 'web' : 'desktop';
}

const PLATFORM = detectPlatform();

/** New random per page load. We deliberately don't persist this — the
 *  server can stitch sessions together by `td_player_id` later if we
 *  want anonymous-but-stable identity. */
function generateSessionId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

const SESSION_ID = generateSessionId();

/** Plan 2 will provide a snapshot of player context to attach to every
 *  event. Until then this returns undefined and no player fields are
 *  attached. */
type PlayerContext = {
  playerLevel?: number;
  cores?: number;
  shards?: number;
  unlockedFactionsCount?: number;
};
type PlayerContextProvider = () => PlayerContext;
let playerContextProvider: PlayerContextProvider | null = null;

class AnalyticsClientClass {
  private serverUrl: string;
  private queue: AnalyticsEventPayload[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private enabled: boolean = true;

  /** In-memory ring buffer for the debug panel. Independent of opt-out:
   *  even if the user has opted out of network telemetry, they (or a
   *  developer with `?debug`) can still inspect what *would* have been
   *  sent. */
  private ringBuffer: AnalyticsEventPayload[] = [];

  /** Listeners for the debug panel — fired on every event so the panel
   *  can re-render without polling. */
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.serverUrl = localStorage.getItem('td_server_url') ?? DEFAULT_SERVER_URL;
    // Respect opt-out
    if (localStorage.getItem('td_analytics_optout') === '1') {
      this.enabled = false;
    }
  }

  /** Typed event entry point. Use this for any event defined in
   *  AnalyticsEvents.ts. Payload is validated at compile time. */
  track<E extends EventName>(name: E, payload: EventPayload<E>): void {
    this.emit(name, payload as Record<string, string | number | boolean | undefined>);
  }

  /** Untyped event entry point. Kept for backward compatibility with
   *  existing call sites; new code should use track(). */
  event(type: string, data: Record<string, string | number | boolean> = {}): void {
    this.emit(type, data);
  }

  /** Convenience: track game start (legacy shim). */
  gameStart(mode: string, faction: string, difficulty: string, map: string): void {
    this.track('game_start', { mode, faction, difficulty, map });
    this.track('faction_pick', { faction });
  }

  /** Convenience: track game end (legacy shim). */
  gameEnd(mode: string, result: 'victory' | 'defeat', wave: number, duration?: number): void {
    this.track('game_end', { mode, result, wave, ...(duration !== undefined ? { duration } : {}) });
  }

  /** Convenience: track multiplayer session (legacy shim). */
  multiplayerStart(mode: 'versus' | 'circle', players: number): void {
    this.track('multiplayer_start', { mode, players });
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    localStorage.setItem('td_analytics_optout', enabled ? '0' : '1');
    this.track('analytics_optout_changed', { optedOut: !enabled });
  }

  /** Plan 2 will call this once PlayerProfile is initialized. After
   *  this hook is set, every event picks up player-level context. */
  setPlayerContextProvider(provider: PlayerContextProvider | null): void {
    playerContextProvider = provider;
  }

  /** Debug panel API: read the ring buffer. */
  getRecentEvents(): readonly AnalyticsEventPayload[] {
    return this.ringBuffer;
  }

  /** Debug panel API: subscribe for updates. Returns unsubscribe. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private emit(type: string, data: Record<string, string | number | boolean | undefined>): void {
    const playerCtx = playerContextProvider?.() ?? {};
    const merged: Record<string, string | number | boolean | undefined> = {
      type,
      ts: Date.now(),
      sessionId: SESSION_ID,
      platform: PLATFORM,
      ...playerCtx,
      ...data,
    };

    // Strip undefined fields. The server schema is `string | number |
    // boolean` and JSON.stringify drops undefined keys anyway, but our
    // ring buffer should also be clean for debug-panel readability.
    const fullEvent: AnalyticsEventPayload = { type };
    for (const [k, v] of Object.entries(merged)) {
      if (v !== undefined) fullEvent[k] = v;
    }

    // Always record in ring buffer for debug panel.
    this.ringBuffer.push(fullEvent);
    if (this.ringBuffer.length > RING_BUFFER_SIZE) this.ringBuffer.shift();
    for (const l of this.listeners) {
      try { l(); } catch { /* listener errors are not our problem */ }
    }

    // Network send respects opt-out.
    if (!this.enabled) return;
    this.queue.push(fullEvent);
    this.scheduleFlush();
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return;
    // Batch events and send every 5 seconds
    this.flushTimer = setTimeout(() => {
      this.flush();
      this.flushTimer = null;
    }, 5000);
  }

  /** Send queued events to server */
  private async flush(): Promise<void> {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0, 50);
    try {
      await fetch(`${this.serverUrl}/api/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      });
    } catch {
      // Analytics are best-effort — don't block gameplay
    }
  }

  /** Flush any remaining events (call on page unload) */
  flushSync(): void {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0, 50);
    // Use sendBeacon for reliable delivery on page close
    try {
      navigator.sendBeacon(
        `${this.serverUrl}/api/analytics`,
        JSON.stringify(batch),
      );
    } catch {
      // Best effort
    }
  }
}

/** Singleton analytics client */
export const Analytics = new AnalyticsClientClass();

/** Re-exports for convenience. */
export type { EventName, EventPayload } from './AnalyticsEvents';

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => Analytics.flushSync());
}
