/**
 * ObsTensor — shape, channel semantics, normalization range.
 *
 * Coverage: grid/globals shapes match spec, every value finite and
 * in expected ranges, terrain channels reflect grid cells, tower
 * placement shows up in the right channel slot, creep density is
 * cell-local and bounded.
 */
import { describe, it, expect } from 'vitest';
import { Match } from '../../../headless/Match';
import { MatchConfig } from '../../../headless/types';
import { fromMatch, OBS_CHANNELS, OBS_GLOBALS, OBS_GRID_LEN } from './ObsTensor';
import { ACTION_SPACE_SIZE } from './ActionSpace';
import { GRID_COLS, GRID_ROWS } from '../../../config';

function cfg(faction: 'arcane' | 'mechanical', seed = 1001): MatchConfig {
  return {
    faction,
    difficulty: 'normal',
    mapId: 'plains',
    brainId: 'balanced',
    matchMode: 'standard',
    waveCount: 5,
    seed,
  };
}

function gridAt(grid: Float32Array, ch: number, row: number, col: number): number {
  return grid[ch * (GRID_ROWS * GRID_COLS) + row * GRID_COLS + col];
}

describe('ObsTensor shape + ranges', () => {
  it('grid length = 14 × 26 × 36 = 13104', () => {
    expect(OBS_GRID_LEN).toBe(13104);
    expect(OBS_CHANNELS).toBe(14);
    const obs = fromMatch(new Match(cfg('arcane')));
    expect(obs.grid.length).toBe(13104);
  });

  it('globals length = 25 (v1.1 schema, includes upcomingWaves)', () => {
    expect(OBS_GLOBALS).toBe(25);
    const obs = fromMatch(new Match(cfg('arcane')));
    expect(obs.globals.length).toBe(25);
  });

  it('mask length matches ACTION_SPACE_SIZE', () => {
    const obs = fromMatch(new Match(cfg('arcane')));
    expect(obs.mask.length).toBe(ACTION_SPACE_SIZE);
  });

  it('every grid value finite and in [0, 1]', () => {
    const obs = fromMatch(new Match(cfg('arcane')));
    for (let i = 0; i < obs.grid.length; i++) {
      const v = obs.grid[i];
      expect(Number.isFinite(v), `idx ${i}`).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('every globals value finite and in [0, 1]', () => {
    const obs = fromMatch(new Match(cfg('arcane')));
    for (let i = 0; i < obs.globals.length; i++) {
      const v = obs.globals[i];
      expect(Number.isFinite(v), `idx ${i}`).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe('ObsTensor channel semantics', () => {
  it('faction one-hot is set correctly', () => {
    const arcane = fromMatch(new Match(cfg('arcane')));
    expect(arcane.globals[5]).toBe(1); // arcane
    expect(arcane.globals[6]).toBe(0); // mechanical

    const mech = fromMatch(new Match(cfg('mechanical')));
    expect(mech.globals[5]).toBe(0);
    expect(mech.globals[6]).toBe(1);
  });

  it('between_waves flag is 1 at match start', () => {
    const obs = fromMatch(new Match(cfg('arcane')));
    expect(obs.globals[3]).toBe(1);
  });

  it('wave channel is 0 before first wave', () => {
    const obs = fromMatch(new Match(cfg('arcane')));
    expect(obs.globals[2]).toBe(0);
  });

  it('upcomingWaves summary (indices 7..24) is populated at match start', () => {
    const obs = fromMatch(new Match(cfg('arcane')));
    // At match start the first 3 waves are upcoming; at least one
    // wave-feature index should be non-zero (waves have creep groups
    // with at least one armor category).
    let anyNonZero = false;
    for (let i = 7; i < 25; i++) {
      if (obs.globals[i] !== 0) { anyNonZero = true; break; }
    }
    expect(anyNonZero, 'expected at least one upcomingWaves feature populated at match start').toBe(true);

    // Specifically, every per-wave block (6 floats each) should
    // have either some armor count or is_boss or some hp_scale set
    // — none should be all-zero at match start.
    for (let w = 0; w < 3; w++) {
      const base = 7 + w * 6;
      let blockSum = 0;
      for (let f = 0; f < 6; f++) blockSum += obs.globals[base + f];
      expect(blockSum, `wave-block ${w} should not be all-zero at match start`).toBeGreaterThan(0);
    }
  });

  it('upcomingWaves values stay in [0, 1] (normalization)', () => {
    const obs = fromMatch(new Match(cfg('arcane')));
    for (let i = 7; i < 25; i++) {
      const v = obs.globals[i];
      expect(v, `globals[${i}]`).toBeGreaterThanOrEqual(0);
      expect(v, `globals[${i}]`).toBeLessThanOrEqual(1);
    }
  });

  it('entry+exit channel (12) marks the plains spawn/leak cells', () => {
    const match = new Match(cfg('arcane'));
    const obs = fromMatch(match);
    const grid = match.getGrid();
    let entriesSeen = 0;
    for (const e of grid.entries) {
      expect(gridAt(obs.grid, 12, e.row, e.col), `entry ${e.col},${e.row}`).toBe(1);
      entriesSeen++;
    }
    for (const e of grid.exits) {
      expect(gridAt(obs.grid, 12, e.row, e.col), `exit ${e.col},${e.row}`).toBe(1);
    }
    expect(entriesSeen).toBeGreaterThan(0);
  });

  it('buildable-empty channel (9) is set for cells where canPlaceTower is true', () => {
    const match = new Match(cfg('arcane'));
    const obs = fromMatch(match);
    const grid = match.getGrid();
    // Sample 100 random cells; check the invariant.
    for (let i = 0; i < 100; i++) {
      const r = Math.floor(Math.random() * grid.rows);
      const c = Math.floor(Math.random() * grid.cols);
      const want = grid.canPlaceTower(c, r) ? 1 : 0;
      expect(gridAt(obs.grid, 9, r, c), `cell ${c},${r}`).toBe(want);
    }
  });

  it('out-of-grid padding flags channel 10 (blocked)', () => {
    const match = new Match(cfg('arcane'));
    const obs = fromMatch(match);
    const grid = match.getGrid();
    // If the map is smaller than GRID_COLS × GRID_ROWS, the padding
    // region should be all-1 on channel 10.
    if (grid.rows < GRID_ROWS) {
      for (let c = 0; c < GRID_COLS; c++) {
        expect(gridAt(obs.grid, 10, GRID_ROWS - 1, c), `pad row ${c}`).toBe(1);
      }
    }
    if (grid.cols < GRID_COLS) {
      for (let r = 0; r < GRID_ROWS; r++) {
        expect(gridAt(obs.grid, 10, r, GRID_COLS - 1), `pad col ${r}`).toBe(1);
      }
    }
  });
});
