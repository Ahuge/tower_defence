/**
 * AnalyticsClient — lightweight game telemetry that posts events to the
 * signaling server's analytics endpoint. Fire-and-forget, non-blocking.
 *
 * Usage:
 *   Analytics.event('game_start', { mode: 'standard', faction: 'arcane', difficulty: 'normal', map: 'plains' });
 *   Analytics.event('game_end', { mode: 'hero_defense', result: 'victory', wave: 30 });
 */

const DEFAULT_SERVER_URL = 'https://signal.streamingsplats.com';

interface AnalyticsEvent {
  type: string;
  [key: string]: string | number | boolean;
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

class AnalyticsClientClass {
  private serverUrl: string;
  private queue: AnalyticsEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private enabled: boolean = true;

  constructor() {
    this.serverUrl = localStorage.getItem('td_server_url') ?? DEFAULT_SERVER_URL;
    // Respect opt-out
    if (localStorage.getItem('td_analytics_optout') === '1') {
      this.enabled = false;
    }
  }

  /** Track a game event. Batched and sent periodically.
   *  Every event auto-includes `platform` (android/ios/desktop/web)
   *  so the dashboard can slice by player surface. */
  event(type: string, data: Record<string, string | number | boolean> = {}): void {
    if (!this.enabled) return;
    this.queue.push({ type, platform: PLATFORM, ...data });
    this.scheduleFlush();
  }

  /** Convenience: track game start */
  gameStart(mode: string, faction: string, difficulty: string, map: string): void {
    this.event('game_start', { mode, faction, difficulty, map });
    this.event('faction_pick', { faction });
  }

  /** Convenience: track game end */
  gameEnd(mode: string, result: 'victory' | 'defeat', wave: number, duration?: number): void {
    this.event('game_end', { mode, result, wave, ...(duration !== undefined ? { duration } : {}) });
  }

  /** Convenience: track multiplayer session */
  multiplayerStart(mode: 'versus' | 'circle', players: number): void {
    this.event('multiplayer_start', { mode, players });
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

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    localStorage.setItem('td_analytics_optout', enabled ? '0' : '1');
  }
}

/** Singleton analytics client */
export const Analytics = new AnalyticsClientClass();

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => Analytics.flushSync());
}
