/**
 * WorldMutatorImpl — install / shutdown semantics.
 *
 * Pins:
 *   - install* helpers forward to the host method when present.
 *   - install* helpers no-op when the host doesn't implement them.
 *   - shutdown() runs undos in reverse order (LIFO).
 *   - shutdown() is safe to call twice.
 *   - Empty input arrays skip both the host call and the undo record.
 */
import { describe, it, expect, vi } from 'vitest';
import { WorldMutatorImpl, type WorldHost } from './WorldMutator';

describe('WorldMutatorImpl', () => {
  it('installPrePlacedTowers forwards to the host', () => {
    const installPrePlacedTowers = vi.fn();
    const mut = new WorldMutatorImpl({ installPrePlacedTowers });
    mut.installPrePlacedTowers([{ towerId: 'a', col: 0, row: 0 }]);
    expect(installPrePlacedTowers).toHaveBeenCalledTimes(1);
    expect(installPrePlacedTowers.mock.calls[0][0]).toEqual([{ towerId: 'a', col: 0, row: 0 }]);
  });

  it('installs no-op when host does not implement the method', () => {
    const mut = new WorldMutatorImpl({});
    // Should not throw.
    mut.installPrePlacedTowers([{ towerId: 'a', col: 0, row: 0 }]);
    mut.installSuppressionPylons([{ col: 1, row: 1, radius: 3 }]);
    mut.installSummoningCircles([{ col: 2, row: 2 }]);
    mut.installDestructibleTowers([{ towerId: 't', col: 3, row: 3 }]);
    mut.installWorkshop({ col: 4, row: 4 });
    mut.applyRuinCells([{ col: 5, row: 5 }]);
    mut.setSendPathOverride({});
    mut.shutdown();
    // No assertions — the test passes if nothing throws.
  });

  it('skips empty arrays (no host call, no undo)', () => {
    const installPrePlacedTowers = vi.fn();
    const removePrePlacedTowers = vi.fn();
    const mut = new WorldMutatorImpl({ installPrePlacedTowers, removePrePlacedTowers });
    mut.installPrePlacedTowers([]);
    mut.shutdown();
    expect(installPrePlacedTowers).not.toHaveBeenCalled();
    expect(removePrePlacedTowers).not.toHaveBeenCalled();
  });

  it('shutdown runs undos in reverse install order', () => {
    const calls: string[] = [];
    const host: WorldHost = {
      installPrePlacedTowers: () => calls.push('install-towers'),
      installWorkshop: () => calls.push('install-workshop'),
      removePrePlacedTowers: () => calls.push('undo-towers'),
      removeWorkshop: () => calls.push('undo-workshop'),
    };
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
    const host: WorldHost = {
      installPrePlacedTowers: () => {},
      removePrePlacedTowers: remove,
    };
    const mut = new WorldMutatorImpl(host);
    mut.installPrePlacedTowers([{ towerId: 'a', col: 0, row: 0 }]);
    mut.shutdown();
    mut.shutdown();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('a throwing undo does not abort the rest of shutdown', () => {
    const calls: string[] = [];
    const host: WorldHost = {
      installPrePlacedTowers: () => {},
      installWorkshop: () => {},
      removePrePlacedTowers: () => calls.push('undo-towers'),
      removeWorkshop: () => { throw new Error('boom'); },
    };
    const mut = new WorldMutatorImpl(host);
    mut.installPrePlacedTowers([{ towerId: 'a', col: 0, row: 0 }]);
    mut.installWorkshop({ col: 1, row: 1 });
    // Should NOT throw; the towers undo must still run.
    mut.shutdown();
    expect(calls).toEqual(['undo-towers']);
  });
});
