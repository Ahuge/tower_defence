/**
 * MechPylonsRuntime — aspect-level tests.
 *
 * Verifies the Setup + Intercept aspects in isolation. Integration
 * through `MissionRunner.startV2` + GameScene's WorldHost is C4.
 *
 *   Setup contract: passes pylon specs through to
 *     `WorldMutator.installSuppressionPylons`. Tested with a fake
 *     mutator that records every call.
 *
 *   Intercept contract: routes pylon-cell clicks into
 *     `SuppressionManager.startChannelAt`, consumes them (returns true);
 *     forwards non-pylon clicks (returns false). Tested with a real
 *     `SuppressionManager` registered via the existing
 *     `setActiveSuppressionManager` singleton — the same path the
 *     `mech_pylon_vent_armor` creep trait uses, so this exercises the
 *     production code shape rather than a pure mock.
 *
 *   buildRuntime dispatch: pylon-kind missions return setup + intercept;
 *     plain + sabotage missions don't get pylons aspects (sabotage gets
 *     its own runtime in C3).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mechPylonsRuntime } from './MechPylonsRuntime';
import { SuppressionManager } from '../suppression/SuppressionManager';
import {
  setActiveSuppressionManager,
  _resetActiveSuppressionManagerForTest,
} from '../suppression/ActiveSuppressionManager';
import { MECHANICAL_EXTENSION } from '../../data/campaigns/mechanical-v2';
import type { SuppressionPylonSpec } from '../../data/Maps';
import type { WorldMutator } from '../campaign/types';

// Minimal fake — records every method call. Each unused method is a
// no-op so the test only asserts on what the runtime under test
// actually uses (`installSuppressionPylons`).
function makeFakeMutator(): WorldMutator & { calls: string[]; pylonsArg: SuppressionPylonSpec[] | null } {
  const state = {
    calls: [] as string[],
    pylonsArg: null as SuppressionPylonSpec[] | null,
  };
  return {
    installPrePlacedTowers: () => { state.calls.push('installPrePlacedTowers'); },
    installSuppressionPylons: (pylons) => { state.calls.push('installSuppressionPylons'); state.pylonsArg = pylons; },
    installSummoningCircles: () => { state.calls.push('installSummoningCircles'); },
    installDestructibleTowers: () => { state.calls.push('installDestructibleTowers'); },
    installWorkshop: () => { state.calls.push('installWorkshop'); },
    applyRuinCells: () => { state.calls.push('applyRuinCells'); },
    registerActionIntercept: () => ({ release: () => undefined }),
    setSendPathOverride: () => { state.calls.push('setSendPathOverride'); },
    get calls() { return state.calls; },
    get pylonsArg() { return state.pylonsArg; },
  };
}

const TEST_PYLONS: SuppressionPylonSpec[] = [
  { col: 12, row: 3, radius: 4 },
  { col: 18, row: 12, radius: 5 },
];

describe('mechPylonsRuntime — Setup aspect', () => {
  it('passes the pylon specs through to WorldMutator.installSuppressionPylons', () => {
    const world = makeFakeMutator();
    const { setup } = mechPylonsRuntime(TEST_PYLONS);
    expect(setup).toBeDefined();
    setup!.install(world);
    expect(world.calls).toContain('installSuppressionPylons');
    expect(world.pylonsArg).toEqual(TEST_PYLONS);
  });

  it('does not call any other install helper', () => {
    const world = makeFakeMutator();
    const { setup } = mechPylonsRuntime(TEST_PYLONS);
    setup!.install(world);
    // Exactly one host method touched.
    expect(world.calls).toEqual(['installSuppressionPylons']);
  });
});

describe('mechPylonsRuntime — Intercept aspect', () => {
  beforeEach(() => {
    // Each test gets a fresh active manager so a leak from a prior
    // test can't change the answer here.
    _resetActiveSuppressionManagerForTest();
  });
  afterEach(() => {
    _resetActiveSuppressionManagerForTest();
  });

  it('returns false when no SuppressionManager is active (non-Mech scene)', () => {
    const { intercept } = mechPylonsRuntime(TEST_PYLONS);
    expect(intercept).toBeDefined();
    expect(intercept!.onCellClick!(12, 3)).toBe(false);
  });

  it('returns true and starts a channel when clicking a pylon cell', () => {
    const mgr = new SuppressionManager(TEST_PYLONS);
    setActiveSuppressionManager(mgr);
    const logged: string[] = [];
    const { intercept } = mechPylonsRuntime(TEST_PYLONS, {
      now: () => 1000,
      log: (msg) => logged.push(msg),
    });
    const consumed = intercept!.onCellClick!(12, 3);
    expect(consumed).toBe(true);
    expect(logged).toContain('Channeling suppression pylon…');
  });

  it('returns false on non-pylon cells (delegates to default tower-place flow)', () => {
    const mgr = new SuppressionManager(TEST_PYLONS);
    setActiveSuppressionManager(mgr);
    const { intercept } = mechPylonsRuntime(TEST_PYLONS);
    // Cell that isn't any pylon — should pass through.
    expect(intercept!.onCellClick!(20, 20)).toBe(false);
  });

  it('returns true on a second-click of an already-muted pylon, with the appropriate log', () => {
    const mgr = new SuppressionManager(TEST_PYLONS);
    setActiveSuppressionManager(mgr);
    const logged: string[] = [];
    const { intercept } = mechPylonsRuntime(TEST_PYLONS, {
      now: () => 1000,
      log: (msg) => logged.push(msg),
    });
    // First click starts the channel.
    intercept!.onCellClick!(12, 3);
    // Advance the manager's internal `_lastUpdateNow` past the
    // channel duration so the pylon ends up MUTED; the next click
    // should be reported as already_muted, not started again.
    // SuppressionPylon.CHANNEL_MS default ≈ 2500ms; jump well past it.
    // `update(now, towers)` — no suppressible towers in this fixture so []
    // is fine; we're only here to advance the manager's `_lastUpdateNow`.
    mgr.update(20000, []);
    logged.length = 0;
    const consumed = intercept!.onCellClick!(12, 3);
    expect(consumed).toBe(true);
    expect(logged).toEqual(['Pylon already muted.']);
  });
});

describe('MECHANICAL_EXTENSION.buildRuntime — Phase C2 dispatch', () => {
  const ctx = { factionId: 'mechanical' as const, missionIdx: 0, state: {} };

  it('M2 the_pass: returns a runtime with setup + intercept aspects', () => {
    const aspects = MECHANICAL_EXTENSION.buildRuntime(ctx, MECHANICAL_EXTENSION.missions[1]);
    expect(aspects.setup).toBeDefined();
    expect(aspects.intercept).toBeDefined();
    expect(aspects.lifecycle).toBeUndefined();
    expect(aspects.gameplay).toBeUndefined();
  });

  it.each([
    [4, 'iron_convoy'],
    [5, 'first_light'],
    [7, 'saboteur_vanguard'],
  ] as const)('M%i %s: pylon mission returns setup + intercept', (i, _id) => {
    const aspects = MECHANICAL_EXTENSION.buildRuntime(ctx, MECHANICAL_EXTENSION.missions[i]);
    expect(aspects.setup).toBeDefined();
    expect(aspects.intercept).toBeDefined();
  });

  it.each([
    [0, 'perimeter_breach'],
    [2, 'the_cipher'],
    [3, 'spire_falls'],
    [6, 'rationed_mana'],
    [8, 'the_ace'],
  ] as const)('M%i %s: plain mission returns empty aspect bundle', (i, _id) => {
    const aspects = MECHANICAL_EXTENSION.buildRuntime(ctx, MECHANICAL_EXTENSION.missions[i]);
    expect(aspects).toEqual({});
  });

  it('M10 the_overthrow: sabotage mission returns empty bundle in C2 (sabotage aspects land in C3)', () => {
    const aspects = MECHANICAL_EXTENSION.buildRuntime(ctx, MECHANICAL_EXTENSION.missions[9]);
    expect(aspects).toEqual({});
  });
});
