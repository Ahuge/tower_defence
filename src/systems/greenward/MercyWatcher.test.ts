/**
 * Tests for MercyWatcherTracker — the binding layer for Mercy-mode
 * Watcher creeps. Asserts the damage forwarding + AoE-warning
 * predicate the HUD uses.
 */
import { describe, it, expect } from 'vitest';
import { ConsecrationManager, type RuinSpec } from './ConsecrationManager';
import { MercyWatcherTracker } from './MercyWatcher';

function mercyRuin(id: string, col: number, row: number): RuinSpec {
  return { id, col, row, mode: 'mercy' };
}

function setup(specs: RuinSpec[]) {
  const cm = new ConsecrationManager(specs);
  const mwt = new MercyWatcherTracker(cm);
  return { cm, mwt };
}

describe('MercyWatcherTracker — binding + query', () => {
  it('attach registers a creep as a Watcher + forwards to ConsecrationManager', () => {
    const { cm, mwt } = setup([mercyRuin('a', 5, 5)]);
    mwt.attach({ creepId: 99, col: 5, row: 5, ruinId: 'a' }, 100);
    expect(mwt.isWatcher(99)).toBe(true);
    expect(cm.getRuin('a')?.watcherCreepId).toBe(99);
  });

  it('getBinding returns the full record for a registered watcher', () => {
    const { mwt } = setup([mercyRuin('a', 5, 5)]);
    mwt.attach({ creepId: 99, col: 5, row: 5, ruinId: 'a' }, 100);
    expect(mwt.getBinding(99)?.ruinId).toBe('a');
    expect(mwt.getBinding(123)).toBeNull();
  });

  it('detach drops the binding but mercy state in ConsecrationManager persists', () => {
    const { cm, mwt } = setup([mercyRuin('a', 5, 5)]);
    mwt.attach({ creepId: 99, col: 5, row: 5, ruinId: 'a' }, 100);
    mwt.notifyHpChanged(99, 50);   // damage → flips mercyTouched
    mwt.detach(99);
    expect(mwt.isWatcher(99)).toBe(false);
    // ConsecrationManager remembers the touched state.
    expect(cm.allMercyWatchersUnharmed()).toBe(false);
  });
});

describe('MercyWatcherTracker — notifyHpChanged', () => {
  it('forwards a Watcher damage event to ConsecrationManager', () => {
    const { cm, mwt } = setup([mercyRuin('a', 5, 5)]);
    mwt.attach({ creepId: 99, col: 5, row: 5, ruinId: 'a' }, 100);
    expect(cm.allMercyWatchersUnharmed()).toBe(true);
    const flipped = mwt.notifyHpChanged(99, 90);
    expect(flipped).toBe(true);
    expect(cm.allMercyWatchersUnharmed()).toBe(false);
  });

  it('does not flip again on subsequent damage (already flipped)', () => {
    const { mwt } = setup([mercyRuin('a', 5, 5)]);
    mwt.attach({ creepId: 99, col: 5, row: 5, ruinId: 'a' }, 100);
    expect(mwt.notifyHpChanged(99, 90)).toBe(true);
    expect(mwt.notifyHpChanged(99, 80)).toBe(false);
  });

  it('ignores notifications for non-Watcher creep ids', () => {
    const { cm, mwt } = setup([mercyRuin('a', 5, 5)]);
    expect(mwt.notifyHpChanged(7, 1)).toBe(false);
    expect(cm.allMercyWatchersUnharmed()).toBe(true);
  });

  it('does not flip on a heal (hp rises)', () => {
    const { cm, mwt } = setup([mercyRuin('a', 5, 5)]);
    mwt.attach({ creepId: 99, col: 5, row: 5, ruinId: 'a' }, 100);
    expect(mwt.notifyHpChanged(99, 105)).toBe(false);
    expect(cm.allMercyWatchersUnharmed()).toBe(true);
  });
});

describe('MercyWatcherTracker — AoE warning predicate', () => {
  it('returns false when no Watchers are bound', () => {
    const { mwt } = setup([]);
    expect(mwt.aoeWouldHitWatcher(5, 5, 3)).toBe(false);
  });

  it('returns false when the splash radius is 0', () => {
    const { mwt } = setup([mercyRuin('a', 5, 5)]);
    mwt.attach({ creepId: 99, col: 5, row: 5, ruinId: 'a' }, 100);
    expect(mwt.aoeWouldHitWatcher(5, 5, 0)).toBe(false);
  });

  it('returns true when the Watcher sits on the center cell', () => {
    const { mwt } = setup([mercyRuin('a', 5, 5)]);
    mwt.attach({ creepId: 99, col: 5, row: 5, ruinId: 'a' }, 100);
    expect(mwt.aoeWouldHitWatcher(5, 5, 1)).toBe(true);
  });

  it('returns true at the edge of the splash radius (Chebyshev)', () => {
    const { mwt } = setup([mercyRuin('a', 7, 5)]);
    mwt.attach({ creepId: 99, col: 7, row: 5, ruinId: 'a' }, 100);
    // 2 cells away with radius 2 → on edge → covered
    expect(mwt.aoeWouldHitWatcher(5, 5, 2)).toBe(true);
    // 3 cells away with radius 2 → outside
    expect(mwt.aoeWouldHitWatcher(4, 5, 2)).toBe(false);
  });

  it('reports closest Watcher by squared distance', () => {
    const { mwt } = setup([
      mercyRuin('a', 0, 0),
      mercyRuin('b', 10, 10),
      mercyRuin('c', 3, 4),
    ]);
    mwt.attach({ creepId: 1, col: 0, row: 0, ruinId: 'a' }, 100);
    mwt.attach({ creepId: 2, col: 10, row: 10, ruinId: 'b' }, 100);
    mwt.attach({ creepId: 3, col: 3, row: 4, ruinId: 'c' }, 100);
    expect(mwt.closestWatcher(0, 0)?.ruinId).toBe('a');
    expect(mwt.closestWatcher(4, 4)?.ruinId).toBe('c');
    expect(mwt.closestWatcher(9, 9)?.ruinId).toBe('b');
  });

  it('closestWatcher returns null with no bindings', () => {
    const { mwt } = setup([]);
    expect(mwt.closestWatcher(5, 5)).toBeNull();
  });
});
