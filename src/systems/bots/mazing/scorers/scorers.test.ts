/**
 * Smoke tests for the 5 new v3 trait-aware scorers.
 *
 * Each test builds a minimal ScorerContext with hand-placed towers
 * and asserts the scorer's output is in a sensible range. We don't
 * assert exact numbers (math is intentionally heuristic and brain-
 * search will retune the weights anyway) — just that:
 *  - empty placement → 0 contribution
 *  - tower of the wrong type → 0 contribution
 *  - relevant trait combos → > 0 contribution
 */
import { describe, it, expect } from 'vitest';
import { Grid } from '../../../Grid';
import { TowerType } from '../../../../data/TowerTypes';
import { TowerRole, getTowerRole } from '../../../../data/TowerRoles';
import { PathPoint } from '../../../Pathfinding';
import {
  ScorerContext, ScorerState, BfsMetrics, PlacedTower,
} from './types';
import { SlowOverlapScorer } from './SlowOverlapScorer';
import { AuraChainScorer } from './AuraChainScorer';
import { CrowdControlBoostScorer } from './CrowdControlBoostScorer';
import { MobileEngagementScorer } from './MobileEngagementScorer';
import { DotOverlapScorer } from './DotOverlapScorer';
import { GoldOnHitScorer } from './GoldOnHitScorer';
import { TeleportDeliveryScorer } from './TeleportDeliveryScorer';

function tower(overrides: Partial<TowerType> & Pick<TowerType, 'id' | 'cost' | 'damage' | 'range' | 'fireRate'>): TowerType {
  return {
    name: overrides.id, description: '',
    damageType: 'physical', color: 0, projectileSpeed: 0,
    sellRefundRatio: 0, upgrades: [],
    traits: [{ id: 'direct_damage' }],
    hotkey: '1',
    ...overrides,
  };
}

const WALL = tower({ id: 'wall', cost: 10, damage: 0, range: 1, fireRate: 99999 });
const DPS = tower({ id: 'dps', cost: 50, damage: 30, range: 4, fireRate: 600 });
const SLOW = tower({
  id: 'slow', cost: 50, damage: 5, range: 3, fireRate: 800,
  traits: [{ id: 'direct_damage' }, { id: 'slow_on_hit', factor: 0.4, duration: 1500, chance: 1.0 }],
});
const AURA = tower({
  id: 'aura', cost: 80, damage: 0, range: 1, fireRate: 99999,
  traits: [{ id: 'adjacency_buff', damageMult: 1.3 }],
});
const ROOT = tower({
  id: 'root', cost: 60, damage: 8, range: 3, fireRate: 1000,
  traits: [{ id: 'direct_damage' }, { id: 'root_on_hit', chance: 0.5, duration: 1000 }],
});
const MOBILE = tower({
  id: 'mob', cost: 80, damage: 12, range: 1, fireRate: 700,
  traits: [{ id: 'mobile_unit', engageRange: 2, leashRange: 4, attackCooldown: 700 }],
});
const BURN = tower({
  id: 'burn', cost: 70, damage: 15, range: 4, fireRate: 1500,
  traits: [{ id: 'direct_damage' }, { id: 'burn_dot', dps: 12, duration: 3000 }],
});
const SIPHON = tower({
  id: 'siphon', cost: 50, damage: 5, range: 3, fireRate: 700,
  traits: [{ id: 'direct_damage' }, { id: 'gold_on_hit', amount: 2, chance: 0.4 }],
});
const SOUL_DRAIN = tower({
  id: 'soul_drain', cost: 90, damage: 18, range: 4, fireRate: 900,
  traits: [{ id: 'direct_damage' }, { id: 'gold_per_kill_range', goldPerKill: 2 }],
});
const RIFT = tower({
  id: 'rift', cost: 120, damage: 2, range: 3.5, fireRate: 3500,
  traits: [{ id: 'teleport_delivery', stepsBase: 4, stepsPerLevel: 2 }],
});

const POOL = [WALL, DPS, SLOW, AURA, ROOT, MOBILE, BURN, SIPHON, SOUL_DRAIN, RIFT];

function makeCtx(placedTowers: PlacedTower[], path: PathPoint[]): ScorerContext {
  const grid = new Grid(undefined, 5, 10);
  const lookup = new Map<string, TowerType>(POOL.map(t => [t.id, t]));
  const bfs: BfsMetrics = { pathLength: path.length, nodesExpanded: 25, maxQueue: 5, success: true };
  // Tests pre-date the v3.2 cost field; default to 0 (low-urgency
  // regime) so gold contributions are at full strength in test asserts.
  const state: ScorerState = { placedTowers, cost: 0 };
  return {
    grid, paths: [{ start: path[0], end: path[path.length - 1] }],
    towerPool: POOL,
    state, bfs,
    pathGeometries: [path],
    lookupTower: (id) => lookup.get(id) ?? null,
    lookupRole: (id) => {
      const t = lookup.get(id);
      return t ? getTowerRole(t) : 'utility' as TowerRole;
    },
  };
}

const HORIZONTAL_PATH: PathPoint[] = Array.from({ length: 10 }, (_, i) => ({ col: i, row: 2 }));

describe('SlowOverlapScorer', () => {
  it('returns 0 with no placements', () => {
    expect(new SlowOverlapScorer().contribute(makeCtx([], HORIZONTAL_PATH))).toBe(0);
  });

  it('returns 0 when only DPS present (no slow)', () => {
    const ctx = makeCtx([{ col: 5, row: 2, towerId: 'dps' }], HORIZONTAL_PATH);
    expect(new SlowOverlapScorer().contribute(ctx)).toBe(0);
  });

  it('returns positive when slow + DPS overlap on path', () => {
    const ctx = makeCtx([
      { col: 4, row: 1, towerId: 'slow' },
      { col: 5, row: 1, towerId: 'dps' },
    ], HORIZONTAL_PATH);
    expect(new SlowOverlapScorer().contribute(ctx)).toBeGreaterThan(0);
  });
});

describe('AuraChainScorer', () => {
  it('returns 0 with no auras', () => {
    expect(new AuraChainScorer().contribute(makeCtx([{ col: 5, row: 2, towerId: 'dps' }], HORIZONTAL_PATH))).toBe(0);
  });

  it('returns positive for aura→DPS one-hop', () => {
    const ctx = makeCtx([
      { col: 5, row: 1, towerId: 'aura' },
      { col: 5, row: 2, towerId: 'dps' },
    ], HORIZONTAL_PATH);
    expect(new AuraChainScorer().contribute(ctx)).toBeGreaterThan(0);
  });

  it('returns more for multi-hop chain (aura→aura→DPS)', () => {
    const oneHop = makeCtx([
      { col: 5, row: 1, towerId: 'aura' },
      { col: 5, row: 2, towerId: 'dps' },
    ], HORIZONTAL_PATH);
    const twoHop = makeCtx([
      { col: 4, row: 1, towerId: 'aura' },
      { col: 5, row: 1, towerId: 'aura' },
      { col: 5, row: 2, towerId: 'dps' },
    ], HORIZONTAL_PATH);
    expect(new AuraChainScorer().contribute(twoHop)).toBeGreaterThan(new AuraChainScorer().contribute(oneHop));
  });
});

describe('CrowdControlBoostScorer', () => {
  it('returns 0 with no CC towers', () => {
    expect(new CrowdControlBoostScorer().contribute(makeCtx([{ col: 5, row: 2, towerId: 'dps' }], HORIZONTAL_PATH))).toBe(0);
  });

  it('returns positive when root + DPS overlap on path', () => {
    const ctx = makeCtx([
      { col: 4, row: 1, towerId: 'root' },
      { col: 5, row: 1, towerId: 'dps' },
    ], HORIZONTAL_PATH);
    expect(new CrowdControlBoostScorer().contribute(ctx)).toBeGreaterThan(0);
  });
});

describe('MobileEngagementScorer', () => {
  it('returns 0 with no mobile units', () => {
    expect(new MobileEngagementScorer().contribute(makeCtx([{ col: 5, row: 2, towerId: 'dps' }], HORIZONTAL_PATH))).toBe(0);
  });

  it('returns positive for mobile unit near path', () => {
    const ctx = makeCtx([{ col: 5, row: 0, towerId: 'mob' }], HORIZONTAL_PATH);
    expect(new MobileEngagementScorer().contribute(ctx)).toBeGreaterThan(0);
  });

  it('returns less for mobile unit far from path', () => {
    const near = makeCtx([{ col: 5, row: 0, towerId: 'mob' }], HORIZONTAL_PATH);
    const far  = makeCtx([{ col: 9, row: 4, towerId: 'mob' }], HORIZONTAL_PATH);
    expect(new MobileEngagementScorer().contribute(near)).toBeGreaterThanOrEqual(new MobileEngagementScorer().contribute(far));
  });
});

describe('DotOverlapScorer', () => {
  it('returns 0 with no DOT towers', () => {
    expect(new DotOverlapScorer().contribute(makeCtx([{ col: 5, row: 2, towerId: 'dps' }], HORIZONTAL_PATH))).toBe(0);
  });

  it('returns positive when burn DOT + slow overlap on path', () => {
    const ctx = makeCtx([
      { col: 4, row: 1, towerId: 'burn' },
      { col: 5, row: 1, towerId: 'slow' },
    ], HORIZONTAL_PATH);
    expect(new DotOverlapScorer().contribute(ctx)).toBeGreaterThan(0);
  });
});

describe('GoldOnHitScorer', () => {
  it('returns 0 with no gold-trait towers', () => {
    expect(new GoldOnHitScorer().contribute(makeCtx([{ col: 5, row: 2, towerId: 'dps' }], HORIZONTAL_PATH))).toBe(0);
  });

  it('returns positive for gold_on_hit tower covering path', () => {
    const ctx = makeCtx([{ col: 5, row: 2, towerId: 'siphon' }], HORIZONTAL_PATH);
    expect(new GoldOnHitScorer().contribute(ctx)).toBeGreaterThan(0);
  });

  it('returns positive for gold_per_kill_range tower covering path', () => {
    const ctx = makeCtx([{ col: 5, row: 2, towerId: 'soul_drain' }], HORIZONTAL_PATH);
    expect(new GoldOnHitScorer().contribute(ctx)).toBeGreaterThan(0);
  });

  it('returns 0 when gold-trait tower is far from path', () => {
    const ctx = makeCtx([{ col: 5, row: 9, towerId: 'siphon' }], HORIZONTAL_PATH);
    expect(new GoldOnHitScorer().contribute(ctx)).toBe(0);
  });
});

describe('TeleportDeliveryScorer', () => {
  it('returns 0 with no teleport towers', () => {
    expect(new TeleportDeliveryScorer().contribute(makeCtx([{ col: 5, row: 2, towerId: 'dps' }], HORIZONTAL_PATH))).toBe(0);
  });

  it('returns positive for rift covering path', () => {
    const ctx = makeCtx([{ col: 5, row: 2, towerId: 'rift' }], HORIZONTAL_PATH);
    expect(new TeleportDeliveryScorer().contribute(ctx)).toBeGreaterThan(0);
  });

  it('returns 0 for rift far from path', () => {
    const ctx = makeCtx([{ col: 5, row: 9, towerId: 'rift' }], HORIZONTAL_PATH);
    expect(new TeleportDeliveryScorer().contribute(ctx)).toBe(0);
  });
});
