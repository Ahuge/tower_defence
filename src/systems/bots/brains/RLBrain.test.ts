/**
 * RLBrain state & network contract — v1/v2/v3/v4 are prefix-compatible,
 * and forwardPolicy supports both `shared` and `decoupled_res` architectures.
 */
import { describe, it, expect } from 'vitest';
import { BotContext } from '../BotBrain';
import { Grid } from '../../Grid';
import {
  extractState, forwardPolicy, computeMazeDelta, computePlacementImpact,
  buildDynamicSerpentineScaffold, PolicyWeights,
  RL_STATE_DIM, RL_STATE_DIM_V3, RL_STATE_DIM_V4, RL_STATE_DIM_V5, RL_STATE_DIM_V6, RL_STATE_DIM_V7, RL_STATE_DIM_V8, RL_ACTION_DIM,
  ARCANE_TOWER_IDS, RL_FACTION_TOWERS, buildSlotsForTowers,
} from './RLBrain';
import { MAPS, MapId } from '../../../data/Maps';
import {
  SPATIAL_FEATURE_COUNT, ZONE_SPATIAL_FEATURE_COUNT, ZONE_MAZE_FEATURE_COUNT,
  ZONE_EXPOSURE_FEATURE_COUNT, ZONE_TOPOLOGY_FEATURE_COUNT,
  AURA_FEATURE_COUNT, ZONE_SYNERGY_FEATURE_COUNT,
} from '../../learning/BoardEncoder';
import { findPath } from '../../Pathfinding';

function ctx(): BotContext {
  const grid = new Grid(undefined, 8, 12);
  return {
    playerIndex: 0,
    faction: 'arcane',
    candidateCells: [{ col: 3, row: 3 }, { col: 4, row: 4 }],
    towerPool: [],
    budget: 250,
    wave: 5,
    lives: 17,
    grid,
    allPaths: [[{ col: 0, row: 4 }, { col: 1, row: 4 }]],
    placedTowers: [{
      col: 2, row: 4, towerId: 'arcane_bolt', level: 1,
      upgradeCost: 30, upgradeBranches: [], branchUpgradeCosts: {}, sellValue: 10,
    }],
    sendOptions: [],
    frontierOptions: [],
    betweenWaves: true,
  };
}

describe('extractState versions', () => {
  it('v1 and v2 are RL_STATE_DIM long', () => {
    expect(extractState(ctx(), ARCANE_TOWER_IDS, 1)).toHaveLength(RL_STATE_DIM);
    expect(extractState(ctx(), ARCANE_TOWER_IDS, 2)).toHaveLength(RL_STATE_DIM);
  });

  it('v3 is v2 plus the spatial features, dimension declared once', () => {
    const v3 = extractState(ctx(), ARCANE_TOWER_IDS, 3);
    expect(v3).toHaveLength(RL_STATE_DIM_V3);
    expect(RL_STATE_DIM_V3).toBe(RL_STATE_DIM + SPATIAL_FEATURE_COUNT);
  });

  it('v4 is v3 plus per-zone tower & coverage features (46 dims)', () => {
    const v3 = extractState(ctx(), ARCANE_TOWER_IDS, 3);
    const v4 = extractState(ctx(), ARCANE_TOWER_IDS, 4);
    expect(v4).toHaveLength(RL_STATE_DIM_V4);
    expect(RL_STATE_DIM_V4).toBe(RL_STATE_DIM_V3 + ZONE_SPATIAL_FEATURE_COUNT);
    expect(v4.slice(0, RL_STATE_DIM_V3)).toEqual(v3);
  });

  it('v4 reflects per-zone tower density and path coverage', () => {
    const v4 = extractState(ctx(), ARCANE_TOWER_IDS, 4);
    const zoneTowers = v4.slice(RL_STATE_DIM_V3, RL_STATE_DIM_V3 + 12);
    const zoneCover = v4.slice(RL_STATE_DIM_V3 + 12, RL_STATE_DIM_V3 + 24);
    expect(zoneTowers.some(x => x > 0)).toBe(true);
    expect(zoneCover.some(x => x > 0)).toBe(true);
  });

  it('v5 is v4 plus per-zone mazing potential features (58 dims) and computeMazeDelta measures detours', () => {
    const grid = new Grid(undefined, 8, 12);
    const fullPath = findPath(grid, grid.entries[0], grid.exits[0])!;
    const c: BotContext = {
      ...ctx(),
      grid,
      allPaths: [fullPath],
      candidateCells: fullPath.slice(1, fullPath.length - 1).map(p => ({ col: p.col, row: p.row })),
    };
    const v4 = extractState(c, ARCANE_TOWER_IDS, 4);
    const v5 = extractState(c, ARCANE_TOWER_IDS, 5);
    expect(v5).toHaveLength(RL_STATE_DIM_V5);
    expect(RL_STATE_DIM_V5).toBe(RL_STATE_DIM_V4 + ZONE_MAZE_FEATURE_COUNT);
    expect(v5.slice(0, RL_STATE_DIM_V4)).toEqual(v4);
    const zoneMaze = v5.slice(RL_STATE_DIM_V4, RL_STATE_DIM_V5);
    expect(zoneMaze.some(x => x > 0)).toBe(true);

    const midCell = fullPath[Math.floor(fullPath.length / 2)];
    expect(computeMazeDelta(c, midCell.col, midCell.row)).toBeGreaterThan(0);
    expect(computeMazeDelta(c, 3, 0)).toBe(0);
  });

  it('v6 is v5 plus per-zone post-placement Total Army Exposure gain features (70 dims)', () => {
    const grid = new Grid(undefined, 8, 12);
    const fullPath = findPath(grid, grid.entries[0], grid.exits[0])!;
    const c: BotContext = {
      ...ctx(),
      grid,
      allPaths: [fullPath],
      candidateCells: fullPath.slice(1, fullPath.length - 1).map(p => ({ col: p.col, row: p.row })),
    };
    const v5 = extractState(c, ARCANE_TOWER_IDS, 5);
    const v6 = extractState(c, ARCANE_TOWER_IDS, 6);
    expect(v6).toHaveLength(RL_STATE_DIM_V6);
    expect(RL_STATE_DIM_V6).toBe(RL_STATE_DIM_V5 + ZONE_EXPOSURE_FEATURE_COUNT);
    expect(v6.slice(0, RL_STATE_DIM_V5)).toEqual(v5);
    const zoneExp = v6.slice(RL_STATE_DIM_V5, RL_STATE_DIM_V6);
    expect(zoneExp.some(x => x > 0)).toBe(true);

    const midCell = fullPath[Math.floor(fullPath.length / 2)];
    const impact = computePlacementImpact(c, midCell.col, midCell.row);
    expect(impact.mazeDelta).toBeGreaterThan(0);
    expect(impact.exposureDelta).toBeGreaterThan(0);
  });

  it('v7 adds 24 per-zone exit proximity & path traffic features (94 dims) distinguishing map exits', () => {
    const plainsGrid = new Grid(MAPS.plains);
    const plainsPaths = plainsGrid.entries.flatMap(e =>
      plainsGrid.exits.map(x => findPath(plainsGrid, e, x)!),
    );
    const fortressGrid = new Grid(MAPS.fortress);
    const fortressPaths = fortressGrid.entries.flatMap(e =>
      fortressGrid.exits.map(x => findPath(fortressGrid, e, x)!),
    );

    const v6Plains = extractState({ ...ctx(), grid: plainsGrid, allPaths: plainsPaths }, ARCANE_TOWER_IDS, 6);
    const v7Plains = extractState({ ...ctx(), grid: plainsGrid, allPaths: plainsPaths }, ARCANE_TOWER_IDS, 7);
    const v8Plains = extractState({ ...ctx(), grid: plainsGrid, allPaths: plainsPaths }, ARCANE_TOWER_IDS, 8);
    const v7Fortress = extractState({ ...ctx(), grid: fortressGrid, allPaths: fortressPaths }, ARCANE_TOWER_IDS, 7);

    expect(v7Plains).toHaveLength(RL_STATE_DIM_V7);
    expect(RL_STATE_DIM_V7).toBe(RL_STATE_DIM_V6 + ZONE_TOPOLOGY_FEATURE_COUNT);
    expect(v7Plains.slice(0, RL_STATE_DIM_V6)).toEqual(v6Plains);

    // Plains exit is at (35,13) -> zone 11 has exit_prox === 1.0
    const plainsExitProx = v7Plains.slice(RL_STATE_DIM_V6, RL_STATE_DIM_V6 + 12);
    expect(plainsExitProx[11]).toBeCloseTo(1.0, 5);
    expect(plainsExitProx[0]).toBeLessThan(0.5);

    // Fortress exit is at center (18,13) -> zone 9 has exit_prox === 1.0 and 3-lane traffic === 1.0
    const fortExitProx = v7Fortress.slice(RL_STATE_DIM_V6, RL_STATE_DIM_V6 + 12);
    const fortTraffic = v7Fortress.slice(RL_STATE_DIM_V6 + 12, RL_STATE_DIM_V7);
    expect(fortExitProx[9]).toBeCloseTo(1.0, 5);
    expect(fortTraffic[9]).toBeCloseTo(1.0, 5);
    expect(fortExitProx[11]).toBeLessThan(fortExitProx[9]);
  });

  it('v8 is v7 plus aura synergy & short-range coverage features (122 dims)', () => {
    const plainsGrid = new Grid(MAPS.plains);
    const plainsPaths = plainsGrid.entries.flatMap(e =>
      plainsGrid.exits.map(x => findPath(plainsGrid, e, x)!),
    );
    const v7Plains = extractState({ ...ctx(), grid: plainsGrid, allPaths: plainsPaths }, ARCANE_TOWER_IDS, 7);
    const v8Plains = extractState({ ...ctx(), grid: plainsGrid, allPaths: plainsPaths }, ARCANE_TOWER_IDS, 8);

    expect(v8Plains).toHaveLength(RL_STATE_DIM_V8);
    expect(RL_STATE_DIM_V8).toBe(RL_STATE_DIM_V7 + AURA_FEATURE_COUNT + ZONE_SYNERGY_FEATURE_COUNT);
    expect(RL_STATE_DIM_V8).toBe(122);
    expect(v8Plains.slice(0, RL_STATE_DIM_V7)).toEqual(v7Plains);
    // Aura features at indices 94..97, per-zone synergy 98..121.
    expect(v8Plains[94]).toBeGreaterThanOrEqual(0);
    expect(v8Plains.length).toBe(RL_STATE_DIM_V8);
    const zoneShort = v8Plains.slice(RL_STATE_DIM_V7 + AURA_FEATURE_COUNT, v8Plains.length);
    expect(zoneShort).toHaveLength(24);
  });

  it('v3 keeps the first 17 features identical to v2', () => {
    const v2 = extractState(ctx(), ARCANE_TOWER_IDS, 2);
    const v3 = extractState(ctx(), ARCANE_TOWER_IDS, 3);
    expect(v3.slice(0, RL_STATE_DIM)).toEqual(v2);
  });

  it('v1 differs from v2 only at the betweenWaves/occupied-zones slot', () => {
    const v1 = extractState(ctx(), ARCANE_TOWER_IDS, 1);
    const v2 = extractState(ctx(), ARCANE_TOWER_IDS, 2);
    const differing = v1.map((v, i) => (v !== v2[i] ? i : -1)).filter(i => i >= 0);
    expect(differing).toEqual([15]);
  });

  it('every value is clamped to [0, 1]', () => {
    for (const v of extractState(ctx(), ARCANE_TOWER_IDS, 4)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic', () => {
    expect(extractState(ctx(), ARCANE_TOWER_IDS, 4))
      .toEqual(extractState(ctx(), ARCANE_TOWER_IDS, 4));
  });
});

describe('forwardPolicy', () => {
  it('computes decoupled_res forward pass with residual Tanh blocks', () => {
    const d = 4;
    const sDim = 3;
    const aDim = 2;
    const eye = (rows: number, cols: number, val = 0.5) =>
      Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => (r === c ? val : 0)),
      );
    const weights: PolicyWeights = {
      arch: 'decoupled_res',
      state_dim: sDim,
      hidden: [d, d],
      action_dim: aDim,
      layers: {
        actor_in_w: eye(d, sDim, 1.0),
        actor_in_b: new Array(d).fill(0),
        actor_res1_w: eye(d, d, 0.0), // zero res weights -> identity skip
        actor_res1_b: new Array(d).fill(0),
        actor_res2_w: eye(d, d, 0.0),
        actor_res2_b: new Array(d).fill(0),
        critic_in_w: eye(d, sDim, 1.0),
        critic_in_b: new Array(d).fill(0),
        critic_res1_w: eye(d, d, 0.0),
        critic_res1_b: new Array(d).fill(0),
        critic_res2_w: eye(d, d, 0.0),
        critic_res2_b: new Array(d).fill(0),
        policy_w: [[1, 0, 0, 0], [0, 1, 0, 0]],
        policy_b: [0.1, -0.1],
        value_w: [[1, 1, 0, 0]],
        value_b: [0.5],
      },
    };
    const state = [0.5, -0.5, 0.0];
    const { logits, value } = forwardPolicy(weights, state);
    expect(logits[0]).toBeCloseTo(Math.tanh(0.5) + 0.1, 6);
    expect(logits[1]).toBeCloseTo(Math.tanh(-0.5) - 0.1, 6);
    expect(value).toBeCloseTo(Math.tanh(0.5) + Math.tanh(-0.5) + 0.5, 6);
  });
});

describe('buildDynamicSerpentineScaffold', () => {
  it('generates valid empty-cell scaffolds across all 8 standard maps', () => {
    const standardMaps: MapId[] = [
      'plains', 'crossroads', 'fortress', 'serpentine',
      'islands', 'gauntlet', 'spiral', 'siege',
    ];
    for (const mapId of standardMaps) {
      const grid = new Grid(MAPS[mapId]);
      const paths = grid.entries.flatMap(e =>
        grid.exits.map(x => findPath(grid, e, x)).filter((p): p is NonNullable<typeof p> => !!p),
      );
      expect(paths.length).toBeGreaterThan(0);
      const dyn = buildDynamicSerpentineScaffold(grid, paths);
      expect(dyn.scaffolds.size).toBe(12);
      let totalCells = 0;
      for (const cells of dyn.scaffolds.values()) {
        for (const [c, r] of cells) {
          // Every scaffold cell must be in-bounds, buildable, and not an entry/exit
          expect(c).toBeGreaterThanOrEqual(0);
          expect(c).toBeLessThan(grid.cols);
          expect(r).toBeGreaterThanOrEqual(0);
          expect(r).toBeLessThan(grid.rows);
          expect(grid.cells[r][c]).toBe(0); // CellType.Empty
          totalCells++;
        }
      }
      expect(totalCells).toBeGreaterThan(30);
    }
  });
});

describe('faction action/state contracts', () => {
  it('keeps arcane at 7 slots / 86 actions / 94-dim v7 state', () => {
    expect(buildSlotsForTowers(ARCANE_TOWER_IDS)).toBe(7);
    expect(RL_ACTION_DIM).toBe(86);
    expect(extractState(ctx(), ARCANE_TOWER_IDS, 7)).toHaveLength(RL_STATE_DIM_V7);
  });

  it('gives 8-tower factions 8 slots and one extra base state feature', () => {
    for (const faction of ['mechanical', 'nature', 'aliens'] as const) {
      const towers = RL_FACTION_TOWERS[faction];
      expect(towers).toHaveLength(8);
      expect(buildSlotsForTowers(towers)).toBe(8);
      // 7-slot v7 is 94 dims; the 8th count feature adds one.
      expect(extractState(ctx(), towers, 7)).toHaveLength(RL_STATE_DIM_V7 + 1);
    }
  });

  it('covers every fixed-roster faction with a consistent roster', () => {
    const factions = Object.keys(RL_FACTION_TOWERS);
    expect(factions.length).toBeGreaterThanOrEqual(11);
    for (const faction of factions) {
      const towers = RL_FACTION_TOWERS[faction];
      const slots = buildSlotsForTowers(towers);
      expect(slots).toBeGreaterThanOrEqual(7);
      expect(towers.length).toBeLessThanOrEqual(slots);
      expect(extractState(ctx(), towers, 7)).toHaveLength(
        RL_STATE_DIM_V7 + (slots - 7),
      );
    }
  });
});
