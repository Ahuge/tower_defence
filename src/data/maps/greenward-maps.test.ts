/**
 * Greenward bespoke map shape tests. Per the bespoke-maps PRD,
 * each Greenward map must:
 *   - declare entries + exits
 *   - mark its Consecration ruin cells as NoBuild (not Blocked)
 *   - support pathfind from at least one entry to at least one exit
 *     (no map-shape regression where a Blocked cluster severs the path)
 *
 * Each act gets its own describe block; per-mission cells reference
 * the Consecration ruin coords declared in greenward.ts.
 */
import { describe, it, expect } from 'vitest';
import { MAPS, type MapId } from '../Maps';
import { GREENWARD_CAMPAIGN } from '../campaigns/greenward';
import { Grid, CellType } from '../../systems/Grid';
import { findPath } from '../../systems/Pathfinding';

function loadGreenwardMap(id: MapId): Grid {
  const def = MAPS[id];
  if (!def) throw new Error(`map ${id} not in MAPS`);
  return new Grid(def);
}

function ruinsFor(missionIdx: number): { col: number; row: number; id: string }[] {
  const m = GREENWARD_CAMPAIGN.missions[missionIdx];
  return (m?.overrides.greenwardRules?.ruins ?? []).map(r => ({ col: r.col, row: r.row, id: r.id }));
}

const ACT_I_MAPS: { mapId: MapId; missionIdx: number; name: string }[] = [
  { mapId: 'greenward_boundary', missionIdx: 0, name: 'M1 Boundary Stones' },
  { mapId: 'greenward_meadow',   missionIdx: 1, name: 'M2 Salt Meadow' },
  { mapId: 'greenward_eadwin',   missionIdx: 2, name: 'M3 Eadwin' },
];

const ACT_II_MAPS: { mapId: MapId; missionIdx: number; name: string }[] = [
  { mapId: 'greenward_crows',        missionIdx: 3, name: 'M4 Road of Crows' },
  { mapId: 'greenward_river',        missionIdx: 4, name: 'M5 Dry River' },
  { mapId: 'greenward_tarrenford',   missionIdx: 5, name: 'M6 Tarrenford' },
  { mapId: 'greenward_weddingstone', missionIdx: 6, name: 'M7 Wedding-Stone' },
];

const ACT_III_PRE_FINALE_MAPS: { mapId: MapId; missionIdx: number; name: string }[] = [
  { mapId: 'greenward_court',      missionIdx: 7, name: 'M8 Stillborn Court' },
  { mapId: 'greenward_lastgarden', missionIdx: 8, name: 'M9 Last Garden' },
];

function assertMapShape(mapId: MapId, missionIdx: number, name: string) {
  it('has at least one entry + one exit', () => {
    const def = MAPS[mapId];
    expect(def.entries.length).toBeGreaterThanOrEqual(1);
    expect(def.exits.length).toBeGreaterThanOrEqual(1);
  });
  it('every Consecration ruin cell is NoBuild (not Blocked)', () => {
    const grid = loadGreenwardMap(mapId);
    for (const r of ruinsFor(missionIdx)) {
      expect(
        grid.cells[r.row][r.col],
        `${name} ruin "${r.id}" at (${r.col}, ${r.row}) — expected NoBuild`,
      ).toBe(CellType.NoBuild);
    }
  });
  it('pathfind from first entry to first exit succeeds', () => {
    const grid = loadGreenwardMap(mapId);
    const path = findPath(grid, grid.entry, grid.exit);
    expect(path, `${name} — no path entry → exit`).not.toBeNull();
    expect(path!.length).toBeGreaterThan(0);
  });
  it('description is non-empty (narrative anchor)', () => {
    const def = MAPS[mapId];
    expect(def.description.length).toBeGreaterThan(10);
  });
}

describe('Greenward bespoke maps — Act I', () => {
  for (const { mapId, missionIdx, name } of ACT_I_MAPS) {
    describe(name, () => assertMapShape(mapId, missionIdx, name));
  }
});

describe('Greenward bespoke maps — Act II', () => {
  for (const { mapId, missionIdx, name } of ACT_II_MAPS) {
    describe(name, () => assertMapShape(mapId, missionIdx, name));
  }
});

describe('Greenward bespoke maps — Act III pre-finale', () => {
  for (const { mapId, missionIdx, name } of ACT_III_PRE_FINALE_MAPS) {
    describe(name, () => assertMapShape(mapId, missionIdx, name));
  }

  it('M8 declares three entries (Stillborn Court three doors)', () => {
    expect(MAPS.greenward_court.entries.length).toBe(3);
  });
});
