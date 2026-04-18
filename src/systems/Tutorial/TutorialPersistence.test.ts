/**
 * Spec for TutorialPersistence. Tiny surface area (load/save/reset),
 * but every tutorial trigger depends on its state being correct. A
 * version-bump bug silently wiping user state is the kind of thing
 * we want a test to catch before it ships.
 */
import { describe, it, expect, vi } from 'vitest';
import { TutorialPersistence, TutorialState } from './TutorialPersistence';

const STORAGE_KEY = 'td_tutorial_state';

/** The current STATE_VERSION in production. If the module bumps it, this
 *  spec intentionally fails — force the author to also update any
 *  migration logic or explicitly acknowledge "yes, old state should be
 *  discarded". */
const EXPECTED_VERSION = 1;

describe('TutorialPersistence.load', () => {
  it('returns default state when storage is empty', () => {
    const s = TutorialPersistence.load();
    expect(s).toEqual({
      completedTracks: [],
      dismissedFirstLaunch: false,
      version: EXPECTED_VERSION,
    });
  });

  it('round-trips a saved state', () => {
    const state: TutorialState = {
      completedTracks: ['basics', 'tutorial_match'],
      dismissedFirstLaunch: true,
      version: EXPECTED_VERSION,
    };
    TutorialPersistence.save(state);
    expect(TutorialPersistence.load()).toEqual(state);
  });

  it('discards state with a mismatched version', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ completedTracks: ['basics'], dismissedFirstLaunch: true, version: 999 }),
    );
    const s = TutorialPersistence.load();
    expect(s.completedTracks).toEqual([]);
    expect(s.dismissedFirstLaunch).toBe(false);
    expect(s.version).toBe(EXPECTED_VERSION);
  });

  it('discards state missing a version', () => {
    // Old builds before versioning existed wrote {completedTracks, dismissedFirstLaunch}
    // with no version. That counts as a mismatch too.
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ completedTracks: ['basics'], dismissedFirstLaunch: true }),
    );
    expect(TutorialPersistence.load()).toEqual({
      completedTracks: [],
      dismissedFirstLaunch: false,
      version: EXPECTED_VERSION,
    });
  });

  it('returns default state on corrupt JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');
    expect(() => TutorialPersistence.load()).not.toThrow();
    expect(TutorialPersistence.load()).toEqual({
      completedTracks: [],
      dismissedFirstLaunch: false,
      version: EXPECTED_VERSION,
    });
  });

  it('coerces a non-array completedTracks field safely', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ completedTracks: 'not-an-array', dismissedFirstLaunch: true, version: EXPECTED_VERSION }),
    );
    const s = TutorialPersistence.load();
    expect(Array.isArray(s.completedTracks)).toBe(true);
    expect(s.completedTracks).toEqual([]);
    // Other fields from the same payload are still honoured.
    expect(s.dismissedFirstLaunch).toBe(true);
  });

  it('coerces a non-boolean dismissedFirstLaunch via double-bang', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ completedTracks: ['basics'], dismissedFirstLaunch: 1, version: EXPECTED_VERSION }),
    );
    const s = TutorialPersistence.load();
    expect(s.dismissedFirstLaunch).toBe(true);
  });

  it('survives a localStorage.getItem that throws', () => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => { throw new Error('quota / disabled / blocked'); };
    try {
      expect(() => TutorialPersistence.load()).not.toThrow();
      expect(TutorialPersistence.load().completedTracks).toEqual([]);
    } finally {
      Storage.prototype.getItem = original;
    }
  });
});

describe('TutorialPersistence.save', () => {
  it('writes JSON to the known storage key', () => {
    const state: TutorialState = {
      completedTracks: ['basics'],
      dismissedFirstLaunch: false,
      version: EXPECTED_VERSION,
    };
    TutorialPersistence.save(state);
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual(state);
  });

  it('does not throw when storage is full / disabled', () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error('QuotaExceededError'); };
    try {
      expect(() =>
        TutorialPersistence.save({
          completedTracks: ['basics'],
          dismissedFirstLaunch: true,
          version: EXPECTED_VERSION,
        }),
      ).not.toThrow();
    } finally {
      Storage.prototype.setItem = original;
    }
  });
});

describe('TutorialPersistence.reset', () => {
  it('removes the stored state', () => {
    TutorialPersistence.save({
      completedTracks: ['basics'],
      dismissedFirstLaunch: true,
      version: EXPECTED_VERSION,
    });
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    TutorialPersistence.reset();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('does not throw when removeItem throws', () => {
    const original = Storage.prototype.removeItem;
    Storage.prototype.removeItem = () => { throw new Error('blocked'); };
    try {
      expect(() => TutorialPersistence.reset()).not.toThrow();
    } finally {
      Storage.prototype.removeItem = original;
    }
  });

  it('after reset, load returns default state', () => {
    TutorialPersistence.save({
      completedTracks: ['basics', 'tutorial_match'],
      dismissedFirstLaunch: true,
      version: EXPECTED_VERSION,
    });
    TutorialPersistence.reset();
    expect(TutorialPersistence.load()).toEqual({
      completedTracks: [],
      dismissedFirstLaunch: false,
      version: EXPECTED_VERSION,
    });
  });
});
