/**
 * Smoke tests for the Plan 14 v1.1 bespoke Arcane campaign maps.
 * Catches regressions where a map gets accidentally renamed or
 * de-registered, and confirms the Arcane campaign still references
 * valid maps.
 */
import { describe, it, expect } from 'vitest';
import { MAPS, type MapId } from '../Maps';
import { ARCANE_CAMPAIGN } from '../campaigns/arcane';

const ARCANE_MAP_IDS: MapId[] = ['arcane_outskirts', 'arcane_pass', 'arcane_throne'];

describe('Bespoke Arcane maps', () => {
  it('all three Arcane maps are registered', () => {
    for (const id of ARCANE_MAP_IDS) {
      expect(MAPS[id]).toBeTruthy();
    }
  });

  it('every Arcane map uses the arcane_crystal terrain theme', () => {
    for (const id of ARCANE_MAP_IDS) {
      expect(MAPS[id].theme).toBe('arcane_crystal');
    }
  });

  it('every Arcane map has at least one entry and one exit', () => {
    for (const id of ARCANE_MAP_IDS) {
      const m = MAPS[id];
      expect(m.entries.length).toBeGreaterThan(0);
      expect(m.exits.length).toBeGreaterThan(0);
    }
  });

  it('arcane_outskirts is the simple opener (one entry, decorative blocks)', () => {
    const m = MAPS.arcane_outskirts;
    expect(m.entries.length).toBe(1);
    expect(m.exits.length).toBe(1);
    expect(m.blocked.length).toBeGreaterThan(0);
  });

  it('arcane_throne has 3 entries (multi-approach final showdown)', () => {
    expect(MAPS.arcane_throne.entries.length).toBe(3);
  });
});

describe('Plan 11 / Plan 13 v1 maps', () => {
  it('base_arena registers with 32 perimeter spawners + 1 central exit', () => {
    const m = MAPS.base_arena;
    expect(m).toBeTruthy();
    // Bumped from 4 cardinal entries to 32 (8 per edge) for truly
    // 360° threat coverage on the M4 base_defense mission.
    expect(m.entries.length).toBe(32);
    expect(m.exits.length).toBe(1);
    // Exit is at the geometric center.
    expect(m.exits[0].col).toBe(Math.floor(36 / 2));
    expect(m.exits[0].row).toBe(Math.floor(26 / 2));
    // All entries are on the perimeter (col 0 or 35, OR row 0 or 25).
    for (const e of m.entries) {
      const onPerimeter = e.col === 0 || e.col === 35 || e.row === 0 || e.row === 25;
      expect(onPerimeter).toBe(true);
    }
  });

  it('base_arena has no noBuild ring — player can build to the base', () => {
    const m = MAPS.base_arena;
    expect(m.noBuild).toBeTruthy();
    // The pathfinder rejects placements that would seal any spawn off
    // from the exit, so the base remains reachable without an explicit
    // noBuild ring. Empty array is the locked state.
    expect(m.noBuild!.length).toBe(0);
  });

  it('heist_vault has reverse direction (east entry, west exit)', () => {
    const m = MAPS.heist_vault;
    expect(m).toBeTruthy();
    // Entry on east edge.
    expect(m.entries[0].col).toBe(36 - 1);
    // Exit on west edge.
    expect(m.exits[0].col).toBe(0);
  });
});

describe('Arcane campaign references the bespoke maps', () => {
  const used = new Set(ARCANE_CAMPAIGN.missions.map(m => m.overrides.mapId));

  it('mission 1 (Crystal Outskirts) uses arcane_outskirts', () => {
    expect(ARCANE_CAMPAIGN.missions[0].overrides.mapId).toBe('arcane_outskirts');
  });

  it('mission 6 (Forced March / speedrun) uses arcane_pass', () => {
    expect(ARCANE_CAMPAIGN.missions[5].overrides.mapId).toBe('arcane_pass');
  });

  it('mission 10 (Reckoning / final showdown) uses arcane_throne', () => {
    expect(ARCANE_CAMPAIGN.missions[9].overrides.mapId).toBe('arcane_throne');
  });

  it('every map referenced by the campaign exists in MAPS', () => {
    for (const id of used) {
      expect(MAPS[id]).toBeTruthy();
    }
  });
});
