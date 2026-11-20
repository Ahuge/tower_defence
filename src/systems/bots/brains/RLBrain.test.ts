/**
 * RLBrain state contract — v1/v2/v3 are prefix-compatible.
 *
 * A v3 policy is a v2 policy with five extra inputs, so the first 17
 * features MUST stay byte-identical to v2. If that ever breaks,
 * every trained v3 trunk's first 17 weights silently mean something
 * else — a regression with no error, just worse play.
 */
import { describe, it, expect } from 'vitest';
import { BotContext } from '../BotBrain';
import { Grid } from '../../Grid';
import {
  extractState, RL_STATE_DIM, RL_STATE_DIM_V3, ARCANE_TOWER_IDS,
} from './RLBrain';
import { SPATIAL_FEATURE_COUNT } from '../../learning/BoardEncoder';

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
    for (const v of extractState(ctx(), ARCANE_TOWER_IDS, 3)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic', () => {
    expect(extractState(ctx(), ARCANE_TOWER_IDS, 3))
      .toEqual(extractState(ctx(), ARCANE_TOWER_IDS, 3));
  });
});
