/**
 * Tests for ModeLeanTracker — the campaign-wide Consecration tally
 * that gates the M10 Nave choice.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getModeLean,
  computeLean,
  recordMission,
  resetModeLean,
  hasAnyLean,
  LEAN_THRESHOLD,
} from './ModeLeanTracker';
import { resetGreenwardState } from './WildwoodReserves';

beforeEach(() => {
  resetGreenwardState();
});

describe('ModeLeanTracker — initial state', () => {
  it('starts at zero on every axis', () => {
    const r = getModeLean();
    expect(r.ceremony).toBe(0);
    expect(r.siege).toBe(0);
    expect(r.mercy).toBe(0);
  });

  it('default lean is "siege" (fallback) when nothing is recorded', () => {
    expect(getModeLean().lean).toBe('siege');
  });

  it('hasAnyLean is false on a fresh state', () => {
    expect(hasAnyLean()).toBe(false);
  });
});

describe('ModeLeanTracker — recordMission', () => {
  it('accumulates per-mode contributions', () => {
    recordMission({ ceremony: 1, siege: 1, mercy: 0 });
    recordMission({ ceremony: 1, siege: 0, mercy: 1 });
    const r = getModeLean();
    expect(r.ceremony).toBe(2);
    expect(r.siege).toBe(1);
    expect(r.mercy).toBe(1);
  });

  it('hasAnyLean flips to true after the first contribution', () => {
    expect(hasAnyLean()).toBe(false);
    recordMission({ ceremony: 0, siege: 1, mercy: 0 });
    expect(hasAnyLean()).toBe(true);
  });

  it('zero contributions are no-ops', () => {
    recordMission({ ceremony: 0, siege: 0, mercy: 0 });
    expect(hasAnyLean()).toBe(false);
  });
});

describe('ModeLeanTracker — lean computation', () => {
  it('returns "siege" until either threshold is met', () => {
    recordMission({ ceremony: 2, siege: 5, mercy: 2 });
    expect(getModeLean().lean).toBe('siege');
  });

  it('returns "ceremony" at the Ceremony threshold', () => {
    recordMission({ ceremony: LEAN_THRESHOLD, siege: 0, mercy: 0 });
    expect(getModeLean().lean).toBe('ceremony');
  });

  it('returns "mercy" at the Mercy threshold', () => {
    recordMission({ ceremony: 0, siege: 0, mercy: LEAN_THRESHOLD });
    expect(getModeLean().lean).toBe('mercy');
  });

  it('returns "both" when both thresholds are met', () => {
    recordMission({ ceremony: LEAN_THRESHOLD, siege: 0, mercy: LEAN_THRESHOLD });
    expect(getModeLean().lean).toBe('both');
  });
});

describe('ModeLeanTracker — computeLean (pure)', () => {
  it('matches the readout', () => {
    expect(computeLean({ ceremony: 0, siege: 0, mercy: 0 })).toBe('siege');
    expect(computeLean({ ceremony: 3, siege: 0, mercy: 2 })).toBe('ceremony');
    expect(computeLean({ ceremony: 2, siege: 0, mercy: 3 })).toBe('mercy');
    expect(computeLean({ ceremony: 5, siege: 0, mercy: 5 })).toBe('both');
  });
});

describe('ModeLeanTracker — reset', () => {
  it('resetModeLean wipes the tally', () => {
    recordMission({ ceremony: 5, siege: 5, mercy: 5 });
    resetModeLean();
    const r = getModeLean();
    expect(r.ceremony).toBe(0);
    expect(r.siege).toBe(0);
    expect(r.mercy).toBe(0);
    expect(r.lean).toBe('siege');
  });
});
