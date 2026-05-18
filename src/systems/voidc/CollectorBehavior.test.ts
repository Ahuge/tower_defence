/**
 * Tests for CollectorBehavior — the M8 boss creep state machine.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  CollectorBehavior,
  COLLECTOR_TRAIT_ID,
  type CollectorTargetTower,
} from './CollectorBehavior';
import { resetSnakeEyesState, getSnakeEyesState } from './DebtTracker';
import { getCreepType } from '../../data/CreepTypes';

beforeEach(() => {
  resetSnakeEyesState();
});

describe('void_collector creep type', () => {
  it('is registered in CREEP_TYPES', () => {
    expect(() => getCreepType('void_collector')).not.toThrow();
  });

  it('stamps the collector trait id', () => {
    const ct = getCreepType('void_collector');
    expect(ct.traits[0]?.id).toBe(COLLECTOR_TRAIT_ID);
  });

  it('has boss-tier HP + slow speed', () => {
    const ct = getCreepType('void_collector');
    expect(ct.hpMultiplier).toBeGreaterThanOrEqual(8);
    expect(ct.speedMultiplier).toBeLessThan(1);
  });

  it('gold mult on kill is meaningful (Collector defeat is a bounty)', () => {
    const out = getCreepType('void_collector').applyDifficulty({
      toughness: 1, speed: 1, count: 1, goldMult: 1, toughnessPerWave: 0,
    });
    expect(out.goldMult).toBeGreaterThanOrEqual(3);
  });

  it('countMult is pinned to 1 (never multi-spawned)', () => {
    const out = getCreepType('void_collector').applyDifficulty({
      toughness: 2, speed: 1, count: 3, goldMult: 1, toughnessPerWave: 0,
    });
    expect(out.countMult).toBe(1);
  });
});

describe('CollectorBehavior — tick lifecycle', () => {
  const c = { col: 5, row: 5 };
  const someTower: CollectorTargetTower = { id: 1, col: 6, row: 5 };

  it('first tick winds up the cooldown without firing', () => {
    const b = new CollectorBehavior({ tokenIntervalMs: 1000 });
    expect(b.tick(0, c, [someTower])).toBeNull();
  });

  it('fires when cooldown elapses', () => {
    const b = new CollectorBehavior({ tokenIntervalMs: 1000, disableDurationMs: 4000 });
    expect(b.tick(0, c, [someTower])).toBeNull();
    expect(b.tick(999, c, [someTower])).toBeNull();
    const ev = b.tick(1000, c, [someTower]);
    expect(ev).not.toBeNull();
    expect(ev!.towerId).toBe(1);
    expect(ev!.disableDurationMs).toBe(4000);
    expect(ev!.emittedAtMs).toBe(1000);
  });

  it('reschedules for the next interval after firing', () => {
    const b = new CollectorBehavior({ tokenIntervalMs: 1000 });
    b.tick(0, c, [someTower]);
    b.tick(1000, c, [someTower]); // fires
    expect(b.tick(1500, c, [someTower])).toBeNull(); // mid-cooldown
    expect(b.tick(2000, c, [someTower])).not.toBeNull(); // next fire
  });

  it('does not fire if no towers in range', () => {
    const b = new CollectorBehavior({ tokenIntervalMs: 1000, rangeCells: 2 });
    const farTower: CollectorTargetTower = { id: 9, col: 20, row: 20 };
    b.tick(0, c, [farTower]);
    expect(b.tick(1000, c, [farTower])).toBeNull();
  });

  it('skips dead towers in targeting', () => {
    const b = new CollectorBehavior({ tokenIntervalMs: 1000 });
    const dead: CollectorTargetTower = { id: 1, col: 5, row: 5, alive: false };
    const alive: CollectorTargetTower = { id: 2, col: 7, row: 5 };
    b.tick(0, c, [dead, alive]);
    const ev = b.tick(1000, c, [dead, alive]);
    expect(ev!.towerId).toBe(2);
  });

  it('picks the NEAREST tower (Chebyshev)', () => {
    const b = new CollectorBehavior({ tokenIntervalMs: 1000, rangeCells: 10 });
    const near:  CollectorTargetTower = { id: 1, col: 6, row: 5 };  // dist 1
    const mid:   CollectorTargetTower = { id: 2, col: 8, row: 5 };  // dist 3
    const far:   CollectorTargetTower = { id: 3, col: 10, row: 10 };// dist 5
    b.tick(0, c, [far, mid, near]);
    const ev = b.tick(1000, c, [far, mid, near]);
    expect(ev!.towerId).toBe(1);
  });

  it('no fire when collector is defeated (after onDefeated)', () => {
    const b = new CollectorBehavior({ tokenIntervalMs: 1000 });
    b.tick(0, c, [someTower]);
    b.onDefeated(7); // M8
    expect(b.tick(1000, c, [someTower])).toBeNull();
    expect(b.tick(5000, c, [someTower])).toBeNull();
  });
});

describe('CollectorBehavior — onDefeated', () => {
  it('records collectorDefeatedAt in SnakeEyesState', () => {
    const b = new CollectorBehavior();
    b.onDefeated(7);
    expect(getSnakeEyesState().collectorDefeatedAt).toBe(7);
  });

  it('idempotent — second call does not overwrite or re-trigger', () => {
    const b = new CollectorBehavior();
    b.onDefeated(7);
    b.onDefeated(99); // should not overwrite via this behavior
    expect(getSnakeEyesState().collectorDefeatedAt).toBe(7);
    expect(b._isDefeatedForTest()).toBe(true);
  });
});
