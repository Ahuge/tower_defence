/**
 * AdCooldowns — daily reset + interval cooldown semantics.
 *
 * The date math is easy to get subtly wrong (off-by-one day at
 * local-midnight boundary, rolling-window misses at sub-second
 * precision), so every branch gets a test.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  AD_COOLDOWN_STORAGE_KEY,
  getLastShown,
  markShown,
  resetCooldown,
  isDailyReady,
  msUntilNextDaily,
  isIntervalReady,
  msUntilNextInterval,
  formatCountdown,
} from './AdCooldowns';

const PLACEMENT = 'test_placement';

function at(iso: string): number {
  // Parse as local-time so the daily-boundary tests aren't at the
  // mercy of the CI runner's timezone. `YYYY-MM-DDTHH:mm:ss` without
  // a Z is parsed as local time in the JS Date spec.
  return new Date(iso).getTime();
}

beforeEach(() => {
  localStorage.clear();
});

describe('getLastShown / markShown / resetCooldown', () => {
  it('returns null when nothing stored', () => {
    expect(getLastShown(PLACEMENT)).toBeNull();
  });

  it('round-trips a timestamp', () => {
    markShown(PLACEMENT, at('2026-04-20T10:30:00'));
    expect(getLastShown(PLACEMENT)).toBe(at('2026-04-20T10:30:00'));
  });

  it('isolates placements', () => {
    markShown('a', 1000);
    markShown('b', 2000);
    expect(getLastShown('a')).toBe(1000);
    expect(getLastShown('b')).toBe(2000);
    expect(getLastShown('c')).toBeNull();
  });

  it('resetCooldown forgets a specific placement', () => {
    markShown('a', 1000);
    markShown('b', 2000);
    resetCooldown('a');
    expect(getLastShown('a')).toBeNull();
    expect(getLastShown('b')).toBe(2000);
  });

  it('gracefully handles corrupt storage', () => {
    localStorage.setItem(AD_COOLDOWN_STORAGE_KEY, '{not json');
    expect(getLastShown(PLACEMENT)).toBeNull();
    // markShown after corruption overwrites cleanly.
    markShown(PLACEMENT, 123);
    expect(getLastShown(PLACEMENT)).toBe(123);
  });
});

describe('isDailyReady / msUntilNextDaily', () => {
  it('ready when no play recorded', () => {
    expect(isDailyReady(PLACEMENT, at('2026-04-20T12:00:00'))).toBe(true);
    expect(msUntilNextDaily(PLACEMENT, at('2026-04-20T12:00:00'))).toBe(0);
  });

  it('not ready when played earlier same local day', () => {
    markShown(PLACEMENT, at('2026-04-20T03:00:00'));
    expect(isDailyReady(PLACEMENT, at('2026-04-20T23:59:00'))).toBe(false);
  });

  it('ready once local midnight rolls over', () => {
    markShown(PLACEMENT, at('2026-04-20T23:59:00'));
    // Still same day:
    expect(isDailyReady(PLACEMENT, at('2026-04-20T23:59:59'))).toBe(false);
    // Midnight exactly, next day:
    expect(isDailyReady(PLACEMENT, at('2026-04-21T00:00:00'))).toBe(true);
  });

  it('msUntilNextDaily counts down to tomorrow local midnight', () => {
    markShown(PLACEMENT, at('2026-04-20T22:00:00'));
    const ms = msUntilNextDaily(PLACEMENT, at('2026-04-20T23:00:00'));
    // One hour until 00:00 the next day.
    expect(ms).toBe(60 * 60 * 1000);
  });

  it('msUntilNextDaily returns 0 when ready', () => {
    markShown(PLACEMENT, at('2026-04-19T12:00:00'));
    expect(msUntilNextDaily(PLACEMENT, at('2026-04-20T12:00:00'))).toBe(0);
  });
});

describe('isIntervalReady / msUntilNextInterval', () => {
  it('ready when no play recorded', () => {
    expect(isIntervalReady(PLACEMENT, 60_000, 1_000_000)).toBe(true);
    expect(msUntilNextInterval(PLACEMENT, 60_000, 1_000_000)).toBe(0);
  });

  it('not ready during the cooldown window', () => {
    markShown(PLACEMENT, 1_000_000);
    expect(isIntervalReady(PLACEMENT, 60_000, 1_030_000)).toBe(false);
    expect(msUntilNextInterval(PLACEMENT, 60_000, 1_030_000)).toBe(30_000);
  });

  it('ready exactly at the interval boundary', () => {
    markShown(PLACEMENT, 1_000_000);
    expect(isIntervalReady(PLACEMENT, 60_000, 1_060_000)).toBe(true);
    expect(msUntilNextInterval(PLACEMENT, 60_000, 1_060_000)).toBe(0);
  });

  it('ready after the interval has passed', () => {
    markShown(PLACEMENT, 1_000_000);
    expect(isIntervalReady(PLACEMENT, 60_000, 1_999_999)).toBe(true);
  });
});

describe('formatCountdown', () => {
  it.each([
    [0, ''],
    [-5000, ''],
    [30 * 1000, '30s'],
    [59 * 1000, '59s'],
    [60 * 1000, '1m'],
    [15 * 60 * 1000, '15m'],
    [59 * 60 * 1000, '59m'],
    [60 * 60 * 1000, '1h 0m'],
    [(7 * 60 + 23) * 60 * 1000, '7h 23m'],
    [(23 * 60 + 59) * 60 * 1000, '23h 59m'],
  ])('%dms → %s', (ms, expected) => {
    expect(formatCountdown(ms)).toBe(expected);
  });

  it('rounds sub-second ms up to 1s (never empty mid-cooldown)', () => {
    expect(formatCountdown(500)).toBe('1s');
  });
});
