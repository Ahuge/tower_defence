/**
 * WorldMutatorImpl — install / shutdown semantics.
 *
 * Pins:
 *   - install* helpers forward to the host method.
 *   - shutdown() runs undos in reverse order (LIFO).
 *   - shutdown() is safe to call twice.
 *   - Empty input arrays skip both the host call and the undo record.
 */
import { describe, it, expect, vi } from 'vitest';
import { WorldMutatorImpl, type WorldHost } from './WorldMutator';

/** Build a complete WorldHost with vi.fn() stubs for every method, so
 *  tests can pass a partial override and rely on the rest being safe
 *  no-ops. Required since item 5 of the campaign-#5-unblocker audit
 *  made every WorldHost method non-optional. */
function makeHost(overrides: Partial<WorldHost> = {}): WorldHost {
  return {
    installPrePlacedTowers: vi.fn(),
    installSuppressionPylons: vi.fn(),
    installSummoningCircles: vi.fn(),
    installDestructibleTowers: vi.fn(),
    installWorkshop: vi.fn(),
    installMechSabotage: vi.fn(),
    installArcaneFinale: vi.fn(),
    installGreenwardRules: vi.fn(),
    applyRuinCells: vi.fn(),
    registerActionIntercept: vi.fn(() => ({ release: () => { /* no-op */ } })),
    setSendPathOverride: vi.fn(),
    removePrePlacedTowers: vi.fn(),
    removeSuppressionPylons: vi.fn(),
    removeSummoningCircles: vi.fn(),
    removeDestructibleTowers: vi.fn(),
    removeWorkshop: vi.fn(),
    removeMechSabotage: vi.fn(),
    removeArcaneFinale: vi.fn(),
    removeGreenwardRules: vi.fn(),
    clearRuinCells: vi.fn(),
    clearSendPathOverride: vi.fn(),
    ...overrides,
  };
}

describe('WorldMutatorImpl', () => {
  it('installPrePlacedTowers forwards to the host', () => {
    const installPrePlacedTowers = vi.fn();
    const mut = new WorldMutatorImpl(makeHost({ installPrePlacedTowers }));
    mut.installPrePlacedTowers([{ towerId: 'a', col: 0, row: 0 }]);
    expect(installPrePlacedTowers).toHaveBeenCalledTimes(1);
    expect(installPrePlacedTowers.mock.calls[0][0]).toEqual([{ towerId: 'a', col: 0, row: 0 }]);
  });

  it('skips empty arrays (no host call, no undo)', () => {
    const installPrePlacedTowers = vi.fn();
    const removePrePlacedTowers = vi.fn();
    const mut = new WorldMutatorImpl(makeHost({ installPrePlacedTowers, removePrePlacedTowers }));
    mut.installPrePlacedTowers([]);
    mut.shutdown();
    expect(installPrePlacedTowers).not.toHaveBeenCalled();
    expect(removePrePlacedTowers).not.toHaveBeenCalled();
  });

  it('shutdown runs undos in reverse install order', () => {
    const calls: string[] = [];
    const host = makeHost({
      installPrePlacedTowers: () => { calls.push('install-towers'); },
      installWorkshop: () => { calls.push('install-workshop'); },
      removePrePlacedTowers: () => { calls.push('undo-towers'); },
      removeWorkshop: () => { calls.push('undo-workshop'); },
    });
    const mut = new WorldMutatorImpl(host);
    mut.installPrePlacedTowers([{ towerId: 'a', col: 0, row: 0 }]);
    mut.installWorkshop({ col: 1, row: 1 });
    expect(calls).toEqual(['install-towers', 'install-workshop']);
    mut.shutdown();
    // LIFO — last installed is first undone.
    expect(calls).toEqual(['install-towers', 'install-workshop', 'undo-workshop', 'undo-towers']);
  });

  it('shutdown is safe to call twice', () => {
    const remove = vi.fn();
    const mut = new WorldMutatorImpl(makeHost({ removePrePlacedTowers: remove }));
    mut.installPrePlacedTowers([{ towerId: 'a', col: 0, row: 0 }]);
    mut.shutdown();
    mut.shutdown();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('a throwing undo does not abort the rest of shutdown', () => {
    const calls: string[] = [];
    const host = makeHost({
      removePrePlacedTowers: () => { calls.push('undo-towers'); },
      removeWorkshop: () => { throw new Error('boom'); },
    });
    const mut = new WorldMutatorImpl(host);
    mut.installPrePlacedTowers([{ towerId: 'a', col: 0, row: 0 }]);
    mut.installWorkshop({ col: 1, row: 1 });
    // Should NOT throw; the towers undo must still run.
    mut.shutdown();
    expect(calls).toEqual(['undo-towers']);
  });
});
