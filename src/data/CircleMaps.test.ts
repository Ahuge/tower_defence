/**
 * Circle-map loader round-trip: the JSON files under
 * `src/data/maps/circle/` load into well-formed MapDefinitions
 * with spawners matching their declared playerCount.
 */
import { describe, it, expect } from 'vitest';
import { CIRCLE_MAPS, getCircleMap, getCircleMapsForPlayerCount } from './CircleMaps';

describe('CircleMaps loader', () => {
  it('loads every committed circle map', () => {
    expect(CIRCLE_MAPS.length).toBeGreaterThanOrEqual(3);
    const ids = CIRCLE_MAPS.map(m => m.id);
    expect(ids).toContain('circle_2p');
    expect(ids).toContain('circle_3p');
    expect(ids).toContain('circle_4p');
  });

  it('spawner count matches player count', () => {
    for (const m of CIRCLE_MAPS) {
      expect(m.spawners, `${m.id} has no spawners`).toBeDefined();
      expect(m.spawners!.length).toBe(m.circlePlayers);
    }
  });

  it('entries and exits are derived from spawners', () => {
    for (const m of CIRCLE_MAPS) {
      expect(m.entries.length).toBe(m.spawners!.length);
      expect(m.exits.length).toBe(m.spawners!.length);
      for (let i = 0; i < m.spawners!.length; i++) {
        expect(m.entries[i]).toEqual(m.spawners![i].entry);
        expect(m.exits[i]).toEqual(m.spawners![i].exit);
      }
    }
  });

  it('zone colors are numbers (parsed from hex strings at load)', () => {
    for (const m of CIRCLE_MAPS) {
      expect(m.zoneColors).toBeDefined();
      for (const color of m.zoneColors!) {
        expect(typeof color).toBe('number');
        expect(color).toBeGreaterThanOrEqual(0);
        expect(color).toBeLessThanOrEqual(0xffffff);
      }
    }
  });

  it('every spawner has at least one waypoint', () => {
    // The whole point of the schema — circle maps force creeps to
    // traverse the map, so a zero-waypoint spawner would mean
    // "walk straight to exit" which isn't what circle maps do.
    for (const m of CIRCLE_MAPS) {
      for (const s of m.spawners!) {
        expect(s.waypoints.length, `${m.id} spawner entry=(${s.entry.col},${s.entry.row}) has no waypoints`).toBeGreaterThan(0);
      }
    }
  });

  it('getCircleMap returns the requested map and undefined for unknowns', () => {
    expect(getCircleMap('circle_2p')).toBeDefined();
    expect(getCircleMap('does_not_exist')).toBeUndefined();
  });

  it('getCircleMapsForPlayerCount filters correctly', () => {
    expect(getCircleMapsForPlayerCount(2).length).toBeGreaterThanOrEqual(1);
    expect(getCircleMapsForPlayerCount(3).length).toBeGreaterThanOrEqual(1);
    expect(getCircleMapsForPlayerCount(4).length).toBeGreaterThanOrEqual(1);
    expect(getCircleMapsForPlayerCount(5).length).toBe(0);
  });
});
