/**
 * Tests for GreenwardSpawns — verifies each named character's
 * spawn record is registered to the right mission with the right
 * cell + ruin binding. Discriminated-union shape lets the compiler
 * separate watcher-at-cell vs watcher-in-wave variants; tests use
 * narrowing assertions on `kind` before touching cell-only fields.
 */
import { describe, it, expect } from 'vitest';
import {
  NAMED_SPAWNS,
  namedSpawnsFor,
  BOSS_KILL_CUSTOM_FLAGS,
  type NamedSpawn,
  type WatcherAtCellSpawn,
  type WatcherInWaveSpawn,
} from './GreenwardSpawns';
import { getCreepType } from '../../data/CreepTypes';

/** Test helper: narrow a NamedSpawn to WatcherAtCellSpawn or fail
 *  the test with a clear message. Keeps individual cases free of
 *  TS-style type guards. */
function asAtCell(s: NamedSpawn | undefined): WatcherAtCellSpawn {
  expect(s).toBeTruthy();
  expect(s!.kind).toBe('watcher_at_cell');
  return s as WatcherAtCellSpawn;
}
function asInWave(s: NamedSpawn | undefined): WatcherInWaveSpawn {
  expect(s).toBeTruthy();
  expect(s!.kind).toBe('watcher_in_wave');
  return s as WatcherInWaveSpawn;
}

describe('GreenwardSpawns — registry shape', () => {
  it('namedSpawnsFor returns empty array for missions without named spawns', () => {
    expect(namedSpawnsFor(0)).toEqual([]); // M1 has no Watcher
  });

  it('every registered typeId resolves to a real creep type', () => {
    for (const spawns of Object.values(NAMED_SPAWNS)) {
      for (const s of spawns) {
        expect(() => getCreepType(s.typeId)).not.toThrow();
      }
    }
  });

  it('every spawn has a non-empty ruinId', () => {
    for (const spawns of Object.values(NAMED_SPAWNS)) {
      for (const s of spawns) {
        expect(s.ruinId.length).toBeGreaterThan(0);
      }
    }
  });

  it('every spawn declares a known kind', () => {
    const known = new Set(['watcher_at_cell', 'watcher_in_wave']);
    for (const spawns of Object.values(NAMED_SPAWNS)) {
      for (const s of spawns) {
        expect(known.has(s.kind)).toBe(true);
      }
    }
  });

  it('watcher_at_cell entries carry concrete cell coords', () => {
    // Stationarity itself comes from the spawn pipeline (single-point
    // path in spawnGreenwardNamed), not the CreepType's speedMultiplier
    // — e.g. the Child has speedMultiplier=0.5 but still stays put
    // because her path is one waypoint long. So we only require the
    // record to carry valid cell coords; rendering stays at that cell.
    for (const spawns of Object.values(NAMED_SPAWNS)) {
      for (const s of spawns) {
        if (s.kind === 'watcher_at_cell') {
          expect(Number.isFinite(s.col)).toBe(true);
          expect(Number.isFinite(s.row)).toBe(true);
          expect(s.col).toBeGreaterThanOrEqual(0);
          expect(s.row).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});

describe('GreenwardSpawns — M3 Old Woman of Eadwin', () => {
  it('is a watcher_at_cell bound to inn_hearth at col 18, row 10', () => {
    const spawns = namedSpawnsFor(2); // M3 = idx 2
    const oldWoman = asAtCell(spawns.find(s => s.typeId === 'inheritor_old_woman'));
    expect(oldWoman.col).toBe(18);
    expect(oldWoman.row).toBe(10);
    expect(oldWoman.ruinId).toBe('inn_hearth');
  });
});

describe('GreenwardSpawns — M4 Cethric the Crow-Priest', () => {
  it('is a watcher_at_cell bound to crossroads at col 18, row 13', () => {
    const spawns = namedSpawnsFor(3); // M4 = idx 3
    const cethric = asAtCell(spawns.find(s => s.typeId === 'inheritor_cethric'));
    expect(cethric.col).toBe(18);
    expect(cethric.row).toBe(13);
    expect(cethric.ruinId).toBe('crossroads');
  });
});

describe('GreenwardSpawns — M7 Stone Bride', () => {
  it('is a watcher_in_wave bound to the altar (no fixed cell — mingled in wave)', () => {
    const spawns = namedSpawnsFor(6); // M7 = idx 6
    const bride = asInWave(spawns.find(s => s.typeId === 'inheritor_stone_bride'));
    expect(bride.ruinId).toBe('altar');
    // Compile-time: `bride` has no col/row. Runtime: the controller
    // resolves the binding by scanning live creeps each tick, so no
    // up-front cell coords are required (or present).
    expect((bride as unknown as Record<string, unknown>).col).toBeUndefined();
    expect((bride as unknown as Record<string, unknown>).row).toBeUndefined();
  });

  it('Stone Bride walks slower than the wedding-stone livery (visual cue)', () => {
    // The visual cue the writer specified: "she walks slower than
    // the rest." Wedding-Stone livery speed is 0.65 (from PR #74);
    // Stone Bride is 0.55. The diff is small enough to read as
    // hesitation but large enough that an attentive player can
    // tell on a several-tile walk.
    const livery = getCreepType('inheritor_wedding_stone');
    const bride  = getCreepType('inheritor_stone_bride');
    expect(bride.speedMultiplier).toBeLessThan(livery.speedMultiplier);
  });
});

describe('GreenwardSpawns — M8 Knight + Herald bosses', () => {
  it('Knight registers a knightKilled flag in the boss kill-listeners', () => {
    expect(BOSS_KILL_CUSTOM_FLAGS.inheritor_knight).toBe('knightKilled');
  });

  it('Herald registers a heraldKilled flag', () => {
    expect(BOSS_KILL_CUSTOM_FLAGS.inheritor_herald).toBe('heraldKilled');
  });

  it('Knight has higher HP than Herald (heavier boss)', () => {
    const k = getCreepType('inheritor_knight');
    const h = getCreepType('inheritor_herald');
    expect(k.hpMultiplier).toBeGreaterThan(h.hpMultiplier);
  });

  it('Knight is heavy-armored; Herald is medium', () => {
    expect(getCreepType('inheritor_knight').armor).toBe('heavy');
    expect(getCreepType('inheritor_herald').armor).toBe('medium');
  });

  it('Both bosses pay boss-tier gold via applyDifficulty', () => {
    const k = getCreepType('inheritor_knight').applyDifficulty({ toughness: 1, speed: 1, count: 1, goldMult: 1, toughnessPerWave: 0 });
    const h = getCreepType('inheritor_herald').applyDifficulty({ toughness: 1, speed: 1, count: 1, goldMult: 1, toughnessPerWave: 0 });
    expect(k.goldMult).toBeGreaterThanOrEqual(4);
    expect(h.goldMult).toBeGreaterThanOrEqual(3);
  });

  it('Both bosses pin countMult to 1 (never multi-spawned)', () => {
    const k = getCreepType('inheritor_knight').applyDifficulty({ toughness: 2, speed: 1, count: 3, goldMult: 1, toughnessPerWave: 0 });
    const h = getCreepType('inheritor_herald').applyDifficulty({ toughness: 2, speed: 1, count: 3, goldMult: 1, toughnessPerWave: 0 });
    expect(k.countMult).toBe(1);
    expect(h.countMult).toBe(1);
  });
});

describe('GreenwardSpawns — M8 The Child', () => {
  it('is a watcher_at_cell bound to the_child ruin at col 22, row 13', () => {
    const spawns = namedSpawnsFor(7); // M8 = idx 7
    const child = asAtCell(spawns.find(s => s.typeId === 'inheritor_child'));
    expect(child.col).toBe(22);
    expect(child.row).toBe(13);
    expect(child.ruinId).toBe('the_child');
  });

  it('Child has elevated HP for AoE-positioning survivability', () => {
    // Child has high-ish HP because she threads through M8 boss
    // waves where splash damage is a real risk. The Mercy
    // condition is "no damage" — the high HP isn't to ensure
    // she survives any damage at all (notifyWatcherDamaged flips
    // mercyTouched on any hit), it's to ensure splash from a
    // grazing tower placement is recoverable.
    const child = getCreepType('inheritor_child');
    expect(child.hpMultiplier).toBeGreaterThanOrEqual(1.5);
  });

  it('Child grants no gold (Watcher, not target)', () => {
    const c = getCreepType('inheritor_child');
    const r = c.applyDifficulty({ toughness: 1, speed: 1, count: 1, goldMult: 1, toughnessPerWave: 0 });
    expect(r.goldMult).toBe(0);
  });
});
