/**
 * Tests for GreenwardMissionController — the per-mission orchestrator
 * that bundles Consecration + Mercy + ModeLean writeback for Greenward
 * missions.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  GreenwardMissionController,
  type GreenwardMissionRules,
} from './GreenwardMissionController';
import { getModeLean, resetModeLean } from './ModeLeanTracker';
import { resetGreenwardState } from './WildwoodReserves';

beforeEach(() => {
  resetGreenwardState();
});

function rules(ruins: GreenwardMissionRules['ruins']): GreenwardMissionRules {
  return { ruins };
}

describe('GreenwardMissionController — construction', () => {
  it('builds a consecration manager + mercy watcher from rules', () => {
    const c = new GreenwardMissionController(
      rules([
        { id: 'a', col: 5, row: 5, mode: 'ceremony' },
        { id: 'b', col: 8, row: 8, mode: 'mercy' },
      ]),
      100,
    );
    expect(c.consecration.getRuins()).toHaveLength(2);
    expect(c.mercyWatcher).toBeDefined();
  });
});

describe('GreenwardMissionController — finalize', () => {
  it('reports claimed-by-mode in the custom payload', () => {
    const c = new GreenwardMissionController(
      rules([
        { id: 'a', col: 5, row: 5, mode: 'siege' },
        { id: 'b', col: 6, row: 6, mode: 'siege' },
        { id: 'c', col: 7, row: 7, mode: 'mercy' },
      ]),
      100,
    );
    c.consecration.bindDefender('a', 1);
    c.consecration.bindDefender('b', 2);
    c.consecration.bindWatcher('c', 99);
    c.consecration.bindDefender('c', 3);

    // Kill the siege defenders + the mercy defender. Leave watcher.
    c.consecration.notifyCreepKilled(1);
    c.consecration.notifyCreepKilled(2);
    c.consecration.notifyCreepKilled(3);

    const out = c.finalize(80);
    expect(out.ruinsClaimed).toBe(3);
    expect(out.siegeClaims).toBe(2);
    expect(out.mercyClaims).toBe(1);
    expect(out.ceremonyClaims).toBe(0);
    expect(out.watcherUnharmed).toBe(true);
    expect(out.reservesSpent).toBe(20);
    expect(out.reservesRemaining).toBe(80);
  });

  it('per-mission overrides win against derived defaults', () => {
    const c = new GreenwardMissionController(rules([]), 100);
    c.setCustom('headwaterClaimed', true);
    c.setCustom('knightKilled', true);
    c.setCustom('heraldKilled', true);
    c.incCustom('civiliansKilled', 2);
    c.incCustom('civiliansKilled', 1);

    const out = c.finalize(100);
    expect(out.headwaterClaimed).toBe(true);
    expect(out.knightKilled).toBe(true);
    expect(out.heraldKilled).toBe(true);
    expect(out.civiliansKilled).toBe(3);
  });

  it('advances ModeLeanTracker exactly once per finalize call', () => {
    resetModeLean();
    const c = new GreenwardMissionController(
      rules([
        { id: 'a', col: 5, row: 5, mode: 'ceremony' },
        { id: 'b', col: 6, row: 6, mode: 'mercy' },
      ]),
      100,
    );
    // Claim the ceremony ruin via the channel.
    c.tick(0, 12_000, [{ col: 4, row: 5, typeId: 'nature_blossom' }]);
    // Set up + claim the mercy ruin.
    c.consecration.bindDefender('b', 1);
    c.consecration.bindWatcher('b', 99);
    c.consecration.notifyCreepKilled(1);

    c.finalize(90);
    const lean = getModeLean();
    expect(lean.ceremony).toBe(1);
    expect(lean.mercy).toBe(1);
    expect(lean.siege).toBe(0);
  });

  it('watcherUnharmed is false when a Watcher was damaged', () => {
    const c = new GreenwardMissionController(
      rules([{ id: 'a', col: 5, row: 5, mode: 'mercy' }]),
      100,
    );
    c.consecration.bindWatcher('a', 99);
    c.consecration.notifyWatcherDamaged(99);
    const out = c.finalize(100);
    expect(out.watcherUnharmed).toBe(false);
  });
});

describe('GreenwardMissionController — tick', () => {
  it('progresses Ceremony channels via forwarded update', () => {
    const c = new GreenwardMissionController(
      rules([{ id: 'a', col: 5, row: 5, mode: 'ceremony' }]),
      100,
    );
    c.tick(0, 10_000, [{ col: 4, row: 5, typeId: 'nature_blossom' }]);
    expect(c.consecration.getRuin('a')?.claimed).toBe(true);
  });

  it('defaults the creeps arg to [] so existing 3-arg callers still type-check', () => {
    const c = new GreenwardMissionController(
      rules([{ id: 'a', col: 5, row: 5, mode: 'ceremony' }]),
      100,
    );
    expect(() => c.tick(0, 100, [])).not.toThrow();
  });
});

describe('GreenwardMissionController — watcher_in_wave binding contract', () => {
  // End-to-end coverage of the wave-mingled Watcher path:
  //   1. The controller has a pending binding registered.
  //   2. The wave spawns a creep with the matching typeId.
  //   3. The next tick observes it, calls mercyWatcher.attach, and
  //      removes the entry from pending.
  //   4. A subsequent HP drop on that creep is detected by the next
  //      tick and flips mercyWatcherTouched on the ruin.
  //
  // This is the contract that was missing in the original review —
  // without it, a refactor of the resolver / hp-scan would silently
  // break Stone Bride (M7) without any test catching it.

  it('binds a wave-spawned Watcher on the next tick that observes a matching creep', () => {
    const c = new GreenwardMissionController(
      rules([{ id: 'altar', col: 5, row: 5, mode: 'mercy' }]),
      100,
    );
    c.registerPendingWatcherBinding({
      kind: 'watcher_in_wave',
      typeId: 'inheritor_stone_bride',
      ruinId: 'altar',
    });

    // No creep yet — tick should not bind anything.
    c.tick(0, 16, []);
    expect(c.mercyWatcher.getBindings()).toHaveLength(0);

    // Wave spawns the Stone Bride.
    const bride = { id: 42, creepTypeId: 'inheritor_stone_bride', hp: 100, col: 3, row: 5 };
    c.tick(16, 16, [], [bride]);

    const bindings = c.mercyWatcher.getBindings();
    expect(bindings).toHaveLength(1);
    expect(bindings[0].creepId).toBe(42);
    expect(bindings[0].ruinId).toBe('altar');
    expect(c.consecration.getRuin('altar')?.watcherCreepId).toBe(42);
  });

  it('per-frame HP scan flips mercyWatcherTouched when the bound creep takes damage', () => {
    const c = new GreenwardMissionController(
      rules([{ id: 'altar', col: 5, row: 5, mode: 'mercy' }]),
      100,
    );
    c.registerPendingWatcherBinding({
      kind: 'watcher_in_wave',
      typeId: 'inheritor_stone_bride',
      ruinId: 'altar',
    });

    const bride = { id: 7, creepTypeId: 'inheritor_stone_bride', hp: 100, col: 4, row: 5 };
    c.tick(0, 16, [], [bride]);
    expect(c.consecration.getRuin('altar')?.mercyWatcherTouched).toBe(false);

    // Splash tower clips the bride.
    bride.hp = 80;
    c.tick(16, 16, [], [bride]);
    expect(c.consecration.getRuin('altar')?.mercyWatcherTouched).toBe(true);
  });

  it('only binds the FIRST creep with a matching typeId (mingled-in-wave guarantee)', () => {
    const c = new GreenwardMissionController(
      rules([{ id: 'altar', col: 5, row: 5, mode: 'mercy' }]),
      100,
    );
    c.registerPendingWatcherBinding({
      kind: 'watcher_in_wave',
      typeId: 'inheritor_stone_bride',
      ruinId: 'altar',
    });

    // Two brides arrive on the same tick — sanity check the resolver
    // doesn't double-bind. (Shouldn't happen in real waves but is
    // worth pinning so the contract stays clear.)
    const a = { id: 1, creepTypeId: 'inheritor_stone_bride', hp: 100, col: 3, row: 5 };
    const b = { id: 2, creepTypeId: 'inheritor_stone_bride', hp: 100, col: 3, row: 6 };
    c.tick(0, 16, [], [a, b]);

    expect(c.mercyWatcher.getBindings()).toHaveLength(1);
  });

  it('does NOT bind a non-matching typeId — livery walkers stay regular creeps', () => {
    const c = new GreenwardMissionController(
      rules([{ id: 'altar', col: 5, row: 5, mode: 'mercy' }]),
      100,
    );
    c.registerPendingWatcherBinding({
      kind: 'watcher_in_wave',
      typeId: 'inheritor_stone_bride',
      ruinId: 'altar',
    });

    const livery = { id: 9, creepTypeId: 'inheritor_wedding_stone', hp: 50, col: 3, row: 5 };
    c.tick(0, 16, [], [livery]);
    expect(c.mercyWatcher.getBindings()).toHaveLength(0);
  });
});
