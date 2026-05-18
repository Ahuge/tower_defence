/**
 * Tests for GreenwardSpawns — verifies each named character's
 * spawn record is registered to the right mission with the right
 * cell + ruin binding.
 */
import { describe, it, expect } from 'vitest';
import { NAMED_SPAWNS, namedSpawnsFor } from './GreenwardSpawns';
import { getCreepType } from '../../data/CreepTypes';

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

  it('Watcher entries (ruinId set) have a stable ruinId convention', () => {
    for (const spawns of Object.values(NAMED_SPAWNS)) {
      for (const s of spawns) {
        if (s.ruinId !== null) {
          expect(s.ruinId.length).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('GreenwardSpawns — M3 Old Woman of Eadwin', () => {
  it('binds to inn_hearth at col 18, row 10', () => {
    const spawns = namedSpawnsFor(2); // M3 = idx 2
    const oldWoman = spawns.find(s => s.typeId === 'inheritor_old_woman');
    expect(oldWoman).toBeTruthy();
    expect(oldWoman!.col).toBe(18);
    expect(oldWoman!.row).toBe(10);
    expect(oldWoman!.ruinId).toBe('inn_hearth');
  });
});

describe('GreenwardSpawns — M4 Cethric the Crow-Priest', () => {
  it('binds to the crossroads ruin at col 18, row 13', () => {
    const spawns = namedSpawnsFor(3); // M4 = idx 3
    const cethric = spawns.find(s => s.typeId === 'inheritor_cethric');
    expect(cethric).toBeTruthy();
    expect(cethric!.col).toBe(18);
    expect(cethric!.row).toBe(13);
    expect(cethric!.ruinId).toBe('crossroads');
  });
});

describe('GreenwardSpawns — M7 Stone Bride', () => {
  it('binds to the altar ruin at col 18, row 10', () => {
    const spawns = namedSpawnsFor(6); // M7 = idx 6
    const bride = spawns.find(s => s.typeId === 'inheritor_stone_bride');
    expect(bride).toBeTruthy();
    expect(bride!.col).toBe(18);
    expect(bride!.row).toBe(10);
    expect(bride!.ruinId).toBe('altar');
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
