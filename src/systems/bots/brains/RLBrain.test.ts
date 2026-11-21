/**
 * RLBrain state & network contract — v1/v2/v3/v4 are prefix-compatible,
 * and forwardPolicy supports both `shared` and `decoupled_res` architectures.
 */
import { describe, it, expect } from 'vitest';
import { BotContext } from '../BotBrain';
import { Grid } from '../../Grid';
import {
  extractState, forwardPolicy, PolicyWeights,
  RL_STATE_DIM, RL_STATE_DIM_V3, RL_STATE_DIM_V4, RL_ACTION_DIM,
  ARCANE_TOWER_IDS,
} from './RLBrain';
import {
  SPATIAL_FEATURE_COUNT, ZONE_SPATIAL_FEATURE_COUNT,
} from '../../learning/BoardEncoder';

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
