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
import { GREENWARD_EXTENSION as GREENWARD_CAMPAIGN } from '../campaigns/greenward-v2';
import { Grid, CellType } from '../../systems/Grid';
import { findPath } from '../../systems/Pathfinding';

function loadGreenwardMap(id: MapId): Grid {
  const def = MAPS[id];
  if (!def) throw new Error(`map ${id} not in MAPS`);
  return new Grid(def);
}

function ruinsFor(missionIdx: number): { col: number; row: number; id: string }[] {
  const m = GREENWARD_CAMPAIGN.missions[missionIdx];
  // Greenward v2 cfg payload always carries `ruins[]` on both
  // 'consecration' and 'final' kinds.
  const cfg = m?.campaign as { ruins?: { col: number; row: number; id: string }[] } | undefined;
  return (cfg?.ruins ?? []).map(r => ({ col: r.col, row: r.row, id: r.id }));
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
  it('pathfind succeeds from every entry to at least one exit', () => {
    // Multi-entry maps (M2 / M4 / M7 / M8) must verify EACH entry
    // reaches some exit — otherwise a misplaced Blocked cluster
    // could orphan a spawner without the test catching it. We don't
    // require every entry → every exit combo: spawners pick the
    // shortest path each, so "at least one exit reachable per entry"
    // is the gameplay contract.
    const grid = loadGreenwardMap(mapId);
    for (const entry of grid.entries) {
      let reached = false;
      for (const exit of grid.exits) {
        const path = findPath(grid, entry, exit);
        if (path && path.length > 0) { reached = true; break; }
      }
      expect(
        reached,
        `${name} entry (${entry.col}, ${entry.row}) — no path to any exit`,
      ).toBe(true);
    }
  });

  it('pathfind succeeds from at least one entry to every exit', () => {
    // The reverse direction — every exit must be reachable from
    // SOME entry. Catches the rarer case where an entry-only-reachable
    // exit gets walled off but the entries still see another exit.
    const grid = loadGreenwardMap(mapId);
    for (const exit of grid.exits) {
      let reached = false;
      for (const entry of grid.entries) {
        const path = findPath(grid, entry, exit);
        if (path && path.length > 0) { reached = true; break; }
      }
      expect(
        reached,
        `${name} exit (${exit.col}, ${exit.row}) — no entry reaches it`,
      ).toBe(true);
    }
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

describe('Greenward bespoke maps — M10 Caer Lythen', () => {
  describe('M10 Caer Lythen', () => assertMapShape('greenward_cathedral', 9, 'M10 Caer Lythen'));

  it('declares three setpiece ruins (Courtyard / Nave / Throne)', () => {
    const grid = loadGreenwardMap('greenward_cathedral');
    const expected: { col: number; row: number; id: string }[] = [
      { col: 6,  row: 13, id: 'courtyard' },
      { col: 18, row: 13, id: 'nave' },
      { col: 30, row: 13, id: 'throne' },
    ];
    for (const r of expected) {
      expect(grid.cells[r.row][r.col], `${r.id} should be NoBuild`).toBe(CellType.NoBuild);
    }
  });

  it('vertical divider walls separate the three sections with mid-row gaps', () => {
    const grid = loadGreenwardMap('greenward_cathedral');
    // Courtyard / Nave divider at col 11 — wall above + below mid-row.
    expect(grid.cells[0][11]).toBe(CellType.Blocked);
    expect(grid.cells[5][11]).toBe(CellType.Blocked);
    expect(grid.cells[20][11]).toBe(CellType.Blocked);
    expect(grid.cells[25][11]).toBe(CellType.Blocked);
    // Mid-row gap — pathfind threads through here.
    expect(grid.cells[13][11]).not.toBe(CellType.Blocked);
    // Nave / Throne divider at col 24 — same shape.
    expect(grid.cells[0][24]).toBe(CellType.Blocked);
    expect(grid.cells[13][24]).not.toBe(CellType.Blocked);
  });
});
