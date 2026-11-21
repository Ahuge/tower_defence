/**
 * BoardEncoder spec — pins the channel contract and the spatial
 * facts the flat state features can't express.
 *
 * A trained spatial policy pins channel indices, so the most
 * important test here is that BOARD_CHANNEL_NAMES keeps its order:
 * appending is fine, reordering silently corrupts every model.
 */
import { describe, it, expect } from 'vitest';
import { Grid, CellType } from '../Grid';
import { BotContext } from '../bots/BotBrain';
import {
  encodeBoard, boardChannelMeans, extractSpatialFeatures,
  BOARD_CHANNEL_NAMES, BOARD_CHANNELS, SPATIAL_FEATURE_NAMES, SPATIAL_FEATURE_COUNT,
} from './BoardEncoder';
import { TOWER_TYPES } from '../../data/TowerTypes';

const COLS = 12;
const ROWS = 8;

/** Minimal BotContext over a hand-built grid. Only the fields the
 *  encoder reads are meaningful; the rest are typed stubs. */
function makeCtx(overrides: Partial<BotContext> = {}): BotContext {
  const grid = new Grid(undefined, ROWS, COLS);
  return {
    playerIndex: 0,
    faction: 'arcane',
    candidateCells: [],
    towerPool: [],
    budget: 100,
    wave: 3,
    lives: 20,
    grid,
    allPaths: [],
    placedTowers: [],
    sendOptions: [],
    frontierOptions: [],
    betweenWaves: true,
    ...overrides,
  };
}

function channel(board: ReturnType<typeof encodeBoard>, name: (typeof BOARD_CHANNEL_NAMES)[number]) {
  const c = BOARD_CHANNEL_NAMES.indexOf(name);
  return board.data.subarray(c * ROWS * COLS, (c + 1) * ROWS * COLS);
}

const idx = (col: number, row: number) => row * COLS + col;

describe('channel contract', () => {
  it('has the documented channel list in stable order', () => {
    expect(BOARD_CHANNEL_NAMES[0]).toBe('buildable');
    expect(BOARD_CHANNEL_NAMES[BOARD_CHANNELS - 1]).toBe('dist_to_path');
    expect(new Set(BOARD_CHANNEL_NAMES).size).toBe(BOARD_CHANNELS);
  });
});

describe('encodeBoard', () => {
  it('marks buildable cells and excludes blocked terrain', () => {
    const ctx = makeCtx();
    ctx.grid.cells[2][3] = CellType.Blocked;
    const b = encodeBoard(ctx);
    expect(b.channels).toBe(BOARD_CHANNELS);
    expect(b.data.length).toBe(BOARD_CHANNELS * ROWS * COLS);
    const buildable = channel(b, 'buildable');
    expect(buildable[idx(3, 2)]).toBe(0); // blocked
    expect(buildable[idx(4, 2)]).toBe(1); // empty
  });

  it('marks legal placement from candidateCells, not the whole board', () => {
    const ctx = makeCtx({ candidateCells: [{ col: 5, row: 4 }] });
    const legal = channel(encodeBoard(ctx), 'legal_placement');
    expect(legal[idx(5, 4)]).toBe(1);
    expect(legal[idx(5, 3)]).toBe(0);
    expect(legal.reduce((s, v) => s + v, 0)).toBe(1);
  });

  it('marks path cells from allPaths and skips null entries', () => {
    const ctx = makeCtx({
      allPaths: [
        [{ col: 0, row: 0 }, { col: 1, row: 0 }],
        null,
        [{ col: 2, row: 0 }],
      ],
    });
    const path = channel(encodeBoard(ctx), 'path');
    expect(path[idx(0, 0)]).toBe(1);
    expect(path[idx(1, 0)]).toBe(1);
    expect(path[idx(2, 0)]).toBe(1);
    expect(path.reduce((s, v) => s + v, 0)).toBe(3);
  });

  it('splits placed towers into wall / damage / support channels', () => {
    const ctx = makeCtx({
      placedTowers: [
        { col: 1, row: 1, towerId: 'mech_wall', level: 1, upgradeCost: 0, upgradeBranches: [], branchUpgradeCosts: {}, sellValue: 0 },
        { col: 2, row: 1, towerId: 'arcane_bolt', level: 1, upgradeCost: 0, upgradeBranches: [], branchUpgradeCosts: {}, sellValue: 0 },
      ],
    });
    const b = encodeBoard(ctx);
    const anyTower = channel(b, 'tower');
    expect(anyTower[idx(1, 1)]).toBe(1);
    expect(anyTower[idx(2, 1)]).toBe(1);
    // Every placed tower lands in exactly one role channel.
    const roleChannels = ['tower_wall', 'tower_damage', 'tower_support'] as const;
    const roles = roleChannels
      .map(n => channel(b, n)[idx(1, 1)] + channel(b, n)[idx(2, 1)]);
    expect(roles.reduce((s, v) => s + v, 0)).toBe(2);
  });

  it('paints range coverage around a placed tower and leaves far cells clear', () => {
    const ctx = makeCtx({
      placedTowers: [
        { col: 2, row: 4, towerId: 'arcane_meteor', level: 1, upgradeCost: 0, upgradeBranches: [], branchUpgradeCosts: {}, sellValue: 0 },
      ],
    });
    const range = TOWER_TYPES['arcane_meteor'].range;
    const coverage = channel(encodeBoard(ctx), 'range_coverage');
    expect(coverage[idx(2, 4)]).toBe(1);
    // Inside range (straight line one tile less than range).
    expect(coverage[idx(2 + Math.max(1, range - 1), 4)]).toBe(1);
    // Outside range — the grid is wide enough that this cell exists.
    expect(coverage[idx(2 + range + 1, 4)]).toBe(0);
  });

  it('computes normalized BFS distance from the path', () => {
    const ctx = makeCtx({ allPaths: [[{ col: 0, row: 0 }]] });
    const d = channel(encodeBoard(ctx), 'dist_to_path');
    expect(d[idx(0, 0)]).toBe(0);          // on the path
    expect(d[idx(1, 0)]).toBeGreaterThan(0); // one away
    expect(d[idx(2, 0)]).toBeGreaterThan(d[idx(1, 0)]); // monotone outward
    const max = Math.max(...d);
    expect(max).toBeCloseTo(1, 6); // farthest cell normalizes to 1
  });

  it('is deterministic — same ctx twice gives identical tensors', () => {
    const ctx = makeCtx({
      allPaths: [[{ col: 3, row: 3 }]],
      candidateCells: [{ col: 4, row: 3 }],
    });
    const a = encodeBoard(ctx).data;
    const b = encodeBoard(ctx).data;
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('does not mutate the grid', () => {
    const ctx = makeCtx({ allPaths: [[{ col: 2, row: 2 }]] });
    const before = ctx.grid.cells.map(r => [...r]);
    encodeBoard(ctx);
    expect(ctx.grid.cells).toEqual(before);
  });
});

describe('boardChannelMeans', () => {
  it('returns one mean per channel, all in [0, 1]', () => {
    const ctx = makeCtx({ allPaths: [[{ col: 0, row: 0 }]] });
    const means = boardChannelMeans(encodeBoard(ctx));
    expect(means.length).toBe(BOARD_CHANNELS);
    for (const m of means) {
      expect(m).toBeGreaterThanOrEqual(0);
      expect(m).toBeLessThanOrEqual(1);
    }
  });
});

describe('extractSpatialFeatures', () => {
  const named = (v: number[]) =>
    Object.fromEntries(SPATIAL_FEATURE_NAMES.map((n, i) => [n, v[i]]));

  it('returns one value per named feature, all in [0, 1]', () => {
    const ctx = makeCtx({ allPaths: [[{ col: 0, row: 2 }, { col: 1, row: 2 }]] });
    const f = extractSpatialFeatures(ctx);
    expect(f.length).toBe(SPATIAL_FEATURE_COUNT);
    for (const v of f) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('path coverage rises when a tower covers the lane', () => {
    const path = [{ col: 2, row: 2 }, { col: 3, row: 2 }, { col: 4, row: 2 }];
    const bare = named(extractSpatialFeatures(makeCtx({ allPaths: [path] })));
    const covered = named(extractSpatialFeatures(makeCtx({
      allPaths: [path],
      placedTowers: [{
        col: 3, row: 2, towerId: 'arcane_meteor', level: 1,
        upgradeCost: 0, upgradeBranches: [], branchUpgradeCosts: {}, sellValue: 0,
      }],
    })));
    expect(bare['path_cover_pct']).toBe(0);
    expect(covered['path_cover_pct']).toBeGreaterThan(0);
    expect(covered['exit_covered']).toBe(0); // exit is off-map here
  });

  it('exit_covered flips when a tower reaches the exit', () => {
    const ctx = makeCtx({ allPaths: [[{ col: 0, row: 4 }]] });
    // Default grid exit is the right-hand middle cell.
    const exit = ctx.grid.exit;
    const far = named(extractSpatialFeatures(ctx));
    const near = named(extractSpatialFeatures({
      ...ctx,
      placedTowers: [{
        col: exit.col - 1, row: exit.row, towerId: 'arcane_meteor', level: 1,
        upgradeCost: 0, upgradeBranches: [], branchUpgradeCosts: {}, sellValue: 0,
      }],
    }));
    expect(far['exit_covered']).toBe(0);
    expect(near['exit_covered']).toBe(1);
  });

  it('tower distance is 0 with no towers and grows when towers sit off the lane', () => {
    const path = [{ col: 0, row: 0 }];
    expect(named(extractSpatialFeatures(makeCtx({ allPaths: [path] })))['mean_tower_dist']).toBe(0);
    const off = named(extractSpatialFeatures(makeCtx({
      allPaths: [path],
      placedTowers: [{
        col: 5, row: 5, towerId: 'arcane_bolt', level: 1,
        upgradeCost: 0, upgradeBranches: [], branchUpgradeCosts: {}, sellValue: 0,
      }],
    })));
    expect(off['mean_tower_dist']).toBeGreaterThan(0);
  });

  it('best cell coverage picks the best candidate, not the first', () => {
    const path = [{ col: 5, row: 5 }];
    const f = named(extractSpatialFeatures(makeCtx({
      allPaths: [path],
      candidateCells: [{ col: 0, row: 0 }, { col: 5, row: 5 }],
      towerPool: [TOWER_TYPES['arcane_meteor']],
    })));
    expect(f['best_cell_cover']).toBeGreaterThan(0);
  });

  it('is deterministic', () => {
    const ctx = makeCtx({ allPaths: [[{ col: 1, row: 1 }]], candidateCells: [{ col: 2, row: 1 }] });
    expect(extractSpatialFeatures(ctx)).toEqual(extractSpatialFeatures(ctx));
  });
});
