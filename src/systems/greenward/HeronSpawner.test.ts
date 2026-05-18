/**
 * Tests for HeronSpawner — the state machine that picks the Heron's
 * appearance per mission + (at M10) per mode-lean.
 */
import { describe, it, expect } from 'vitest';
import {
  getHeronStateFor,
  getHeronFrame,
  missionHasHeron,
  HERON_FRAME,
} from './HeronSpawner';

describe('HeronSpawner — per-mission state', () => {
  it('M3 (idx 2) returns silhouette', () => {
    expect(getHeronStateFor(2)).toBe('silhouette');
  });

  it('M6 (idx 5) returns watching', () => {
    expect(getHeronStateFor(5)).toBe('watching');
  });

  it('M8 (idx 7) returns walking', () => {
    expect(getHeronStateFor(7)).toBe('walking');
  });

  it('missions without the Heron return null', () => {
    expect(getHeronStateFor(0)).toBeNull(); // M1
    expect(getHeronStateFor(1)).toBeNull(); // M2
    expect(getHeronStateFor(3)).toBeNull(); // M4
    expect(getHeronStateFor(4)).toBeNull(); // M5
    expect(getHeronStateFor(6)).toBeNull(); // M7
    expect(getHeronStateFor(8)).toBeNull(); // M9
  });
});

describe('HeronSpawner — M10 state by mode-lean', () => {
  it('Mercy lean → kneeling', () => {
    expect(getHeronStateFor(9, 'mercy')).toBe('kneeling');
  });

  it('Ceremony lean → watching', () => {
    expect(getHeronStateFor(9, 'ceremony')).toBe('watching');
  });

  it('Siege fallback → walking', () => {
    expect(getHeronStateFor(9, 'siege')).toBe('walking');
  });

  it('Both lean → kneeling (prefer the gentler spawn frame)', () => {
    expect(getHeronStateFor(9, 'both')).toBe('kneeling');
  });

  it('Undefined lean (Reserves-zero override) → walking', () => {
    expect(getHeronStateFor(9, undefined)).toBe('walking');
  });
});

describe('HeronSpawner — frame index lookup', () => {
  it('maps state to a stable frame index matching the spritesheet', () => {
    expect(getHeronFrame('silhouette')).toBe(HERON_FRAME.silhouette);
    expect(getHeronFrame('watching')).toBe(HERON_FRAME.watching);
    expect(getHeronFrame('walking')).toBe(HERON_FRAME.walking);
    expect(getHeronFrame('kneeling')).toBe(HERON_FRAME.kneeling);
  });

  it('returns -1 for null state (caller skips render)', () => {
    expect(getHeronFrame(null)).toBe(-1);
  });

  it('frame indices are 0..3 unique', () => {
    const frames = [HERON_FRAME.silhouette, HERON_FRAME.watching, HERON_FRAME.walking, HERON_FRAME.kneeling];
    expect(new Set(frames).size).toBe(4);
    for (const f of frames) {
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(4);
    }
  });
});

describe('HeronSpawner — missionHasHeron predicate', () => {
  it('is true for M3 / M6 / M8 / M10', () => {
    expect(missionHasHeron(2)).toBe(true);
    expect(missionHasHeron(5)).toBe(true);
    expect(missionHasHeron(7)).toBe(true);
    expect(missionHasHeron(9)).toBe(true);
  });

  it('is false for every other mission', () => {
    for (const idx of [0, 1, 3, 4, 6, 8]) {
      expect(missionHasHeron(idx)).toBe(false);
    }
  });
});
