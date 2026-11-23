/**
 * PlacementActions spec — the factored (tower × cell) action space.
 *
 * The RL policy currently picks (tower, zone) and outsources the cell
 * to the imitation scorer. These tests pin the properties a policy
 * needs from a direct placement space: every action decodes back to a
 * legal decision, ids are stable within a decide() call, and the
 * space shrinks with what you can afford.
 */
import { describe, it, expect } from 'vitest';
import { BotContext } from '../bots/BotBrain';
import { enumeratePlacementActions, decodePlacementAction, cellPathCoverage } from './PlacementActions';
import { TOWER_TYPES } from '../../data/TowerTypes';

function makeCtx(overrides: Partial<BotContext> = {}): BotContext {
  return {
    playerIndex: 0,
    faction: 'arcane',
    candidateCells: [{ col: 1, row: 1 }, { col: 2, row: 2 }, { col: 3, row: 3 }],
    towerPool: [TOWER_TYPES['arcane_bolt'], TOWER_TYPES['arcane_frost']],
    budget: 1000,
    wave: 2,
    lives: 20,
    grid: undefined as any,
    allPaths: [],
    placedTowers: [],
    sendOptions: [],
    frontierOptions: [],
    betweenWaves: true,
    ...overrides,
  };
}

describe('enumeratePlacementActions', () => {
  it('enumerates cells × affordable towers plus save', () => {
    const set = enumeratePlacementActions(makeCtx());
    expect(set.towerCount).toBe(2);
    expect(set.cellCount).toBe(3);
    expect(set.actions.length).toBe(6);
    expect(set.saveAction).toBe(6);
    expect(set.actionDim).toBe(7); // no upgradable tower
    expect(set.upgradeAction).toBe(-1);
  });

  it('ids are contiguous and unique', () => {
    const set = enumeratePlacementActions(makeCtx());
    const ids = set.actions.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(Math.min(...ids)).toBe(0);
    expect(Math.max(...ids)).toBe(set.actions.length - 1);
  });

  it('is stable — same ctx twice gives the same enumeration', () => {
    const ctx = makeCtx();
    const a = enumeratePlacementActions(ctx);
    const b = enumeratePlacementActions(ctx);
    expect(a.actions.map(x => `${x.col},${x.row},${x.towerId}`))
      .toEqual(b.actions.map(x => `${x.col},${x.row},${x.towerId}`));
  });

  it('drops towers the budget cannot afford', () => {
    const set = enumeratePlacementActions(makeCtx({ budget: TOWER_TYPES['arcane_bolt'].cost }));
    expect(set.towerCount).toBe(1);
    expect(set.actions.every(a => a.towerId === 'arcane_bolt')).toBe(true);
  });

  it('adds an upgrade action when an affordable upgradable tower exists', () => {
    const set = enumeratePlacementActions(makeCtx({
      placedTowers: [{
        col: 0, row: 0, towerId: 'arcane_bolt', level: 1,
        upgradeCost: 40, upgradeBranches: [], branchUpgradeCosts: {}, sellValue: 10,
      }],
    }));
    expect(set.upgradeAction).toBe(set.saveAction + 1);
    expect(set.actionDim).toBe(set.actions.length + 2);
  });

  it('omits upgrade when the tower is at max level', () => {
    const set = enumeratePlacementActions(makeCtx({
      placedTowers: [{
        col: 0, row: 0, towerId: 'arcane_bolt', level: 3,
        upgradeCost: 0, upgradeBranches: [], branchUpgradeCosts: {}, sellValue: 10,
      }],
    }));
    expect(set.upgradeAction).toBe(-1);
  });
});

describe('decodePlacementAction', () => {
  const lookup = (id: string) => TOWER_TYPES[id];

  it('round-trips every enumerated action to a place decision', () => {
    const set = enumeratePlacementActions(makeCtx());
    for (const a of set.actions) {
      const d = decodePlacementAction(set, a.id, lookup);
      expect(d.kind).toBe('place');
      if (d.kind === 'place') {
        expect(d.col).toBe(a.col);
        expect(d.row).toBe(a.row);
        expect(d.type.id).toBe(a.towerId);
      }
    }
  });

  it('maps save to skip and upgrade to upgrade', () => {
    const ctx = makeCtx({
      placedTowers: [{
        col: 7, row: 2, towerId: 'arcane_bolt', level: 1,
        upgradeCost: 40, upgradeBranches: [], branchUpgradeCosts: {}, sellValue: 10,
      }],
    });
    const set = enumeratePlacementActions(ctx);
    expect(decodePlacementAction(set, set.saveAction, lookup, ctx).kind).toBe('skip');
    const upg = decodePlacementAction(set, set.upgradeAction, lookup, ctx);
    expect(upg.kind).toBe('upgrade');
    if (upg.kind === 'upgrade') {
      expect(upg.col).toBe(7);
      expect(upg.row).toBe(2);
    }
  });

  it('returns skip for out-of-range ids', () => {
    const set = enumeratePlacementActions(makeCtx());
    expect(decodePlacementAction(set, 9999, lookup).kind).toBe('skip');
  });
});

describe('cellPathCoverage', () => {
  it('counts distinct path cells within range', () => {
    const paths = [[{ col: 0, row: 0 }, { col: 1, row: 0 }, { col: 5, row: 5 }]];
    expect(cellPathCoverage({ col: 0, row: 0 }, paths, 1)).toBe(2); // (0,0),(1,0)
    expect(cellPathCoverage({ col: 0, row: 0 }, paths, 0)).toBe(0);
  });

  it('deduplicates cells shared by multiple paths', () => {
    const paths = [
      [{ col: 1, row: 1 }],
      [{ col: 1, row: 1 }],
    ];
    expect(cellPathCoverage({ col: 0, row: 0 }, paths, 5)).toBe(1);
  });
});
