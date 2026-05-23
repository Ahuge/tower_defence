/**
 * Tests for SnakeEyesMissionController — the per-mission Lifecycle
 * aspect that owns the Pactbook + leak counter + wager resolution.
 * Pass 2.5 refactor: this object replaces both ActiveMissionPactbook
 * and the module-level _missionLeakCount that lived in the
 * missionState aspect.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  SnakeEyesMissionController,
  getActiveSnakeEyesController,
} from './SnakeEyesMissionController';
import {
  resetSnakeEyesState,
  getSnakeEyesState,
  setSnakeEyesState,
  INITIAL_DEBT,
} from './DebtTracker';
import { MissionRunner } from '../missions/MissionRunner';
import type { MissionResult } from '../campaign/types';

import './wagers';

function seqRng(...values: number[]): () => number {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i++;
    return v;
  };
}

function fakeResult(overrides: Partial<MissionResult> = {}): MissionResult {
  return {
    won: true,
    wave: 10,
    durationMs: 60_000,
    livesRemaining: 20,
    livesStart: 20,
    goldRemaining: 0,
    goldEarned: 0,
    towerCount: 5,
    perfectRun: true,
    custom: {},
    ...overrides,
  };
}

function installController(controller: SnakeEyesMissionController): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (MissionRunner as any).active = {
    ext: { factionId: 'void' },
    mission: { id: 'm0', idx: 0 },
    archetypeId: 'standard',
    startedAt: Date.now(),
    runtime: { lifecycle: controller },
  };
}

function clearActive(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (MissionRunner as any).active = null;
}

describe('SnakeEyesMissionController — construction', () => {
  beforeEach(() => {
    resetSnakeEyesState();
    clearActive();
  });

  it('draws 3 Pactbook cards on construction', () => {
    const ctrl = new SnakeEyesMissionController({ rng: seqRng(0.1, 0.5, 0.9) });
    expect(ctrl.getPactbook().getDrawn().length).toBe(3);
  });

  it('starts with isPactbookResolved() = false', () => {
    const ctrl = new SnakeEyesMissionController({ rng: seqRng(0.1) });
    expect(ctrl.isPactbookResolved()).toBe(false);
  });

  it('starts with no active wager + leak count 0', () => {
    const ctrl = new SnakeEyesMissionController({ rng: seqRng(0.1) });
    expect(ctrl.getActiveWager()).toBeNull();
    expect(ctrl.consumeLeakCount()).toBe(0);
  });
});

describe('SnakeEyesMissionController — leak counter', () => {
  it('recordLeak increments; consumeLeakCount returns + resets', () => {
    const ctrl = new SnakeEyesMissionController({ rng: seqRng(0.1) });
    ctrl.recordLeak();
    ctrl.recordLeak();
    ctrl.recordLeak();
    expect(ctrl.consumeLeakCount()).toBe(3);
    expect(ctrl.consumeLeakCount()).toBe(0);
  });

  it('applyLeakSurcharge applies debt for accumulated leaks', () => {
    resetSnakeEyesState();
    const ctrl = new SnakeEyesMissionController({ rng: seqRng(0.1) });
    ctrl.recordLeak();
    ctrl.recordLeak();
    const before = getSnakeEyesState().debt;
    ctrl.applyLeakSurcharge();
    expect(getSnakeEyesState().debt).toBeGreaterThan(before);
    // Counter consumed.
    expect(ctrl.consumeLeakCount()).toBe(0);
  });
});

describe('SnakeEyesMissionController — wager resolution', () => {
  beforeEach(() => {
    resetSnakeEyesState();
    clearActive();
  });

  it('resolveWagerAtMissionEnd returns null when nothing accepted', () => {
    const ctrl = new SnakeEyesMissionController({ rng: seqRng(0.1) });
    expect(ctrl.resolveWagerAtMissionEnd(fakeResult())).toBeNull();
  });

  it('returns the accepted wager when one was picked', () => {
    const ctrl = new SnakeEyesMissionController({ rng: seqRng(0.1) });
    const drawnId = ctrl.getPactbook().getDrawn()[0].id;
    ctrl.getPactbook().accept(drawnId);
    const resolved = ctrl.resolveWagerAtMissionEnd(fakeResult());
    expect(resolved?.id).toBe(drawnId);
  });

  it('applies win-paydown on victory with accepted wager', () => {
    const ctrl = new SnakeEyesMissionController({ rng: seqRng(0.1) });
    ctrl.getPactbook().accept(ctrl.getPactbook().getDrawn()[0].id);
    const before = getSnakeEyesState().debt;
    ctrl.resolveWagerAtMissionEnd(fakeResult({ won: true }));
    expect(getSnakeEyesState().debt).toBeLessThan(before);
  });

  it('does NOT pay down on loss', () => {
    const ctrl = new SnakeEyesMissionController({ rng: seqRng(0.1) });
    ctrl.getPactbook().accept(ctrl.getPactbook().getDrawn()[0].id);
    const before = getSnakeEyesState().debt;
    ctrl.resolveWagerAtMissionEnd(fakeResult({ won: false }));
    expect(getSnakeEyesState().debt).toBe(before);
  });
});

describe('SnakeEyesMissionController — Wager effect hooks (Phase 3)', () => {
  beforeEach(() => {
    resetSnakeEyesState();
    clearActive();
  });

  /** Accept a specific wager id by re-drawing the controller's
   *  Pactbook until the target appears. Uses Math.random for the
   *  retries (deterministic seeds collapse on repeated construction).
   *  500 attempts is overkill for a 12-card deck but cheap. */
  function controllerWith(wagerId: string): SnakeEyesMissionController {
    for (let i = 0; i < 500; i++) {
      const ctrl = new SnakeEyesMissionController({ rng: Math.random });
      const drawn = ctrl.getPactbook().getDrawn();
      const hit = drawn.find(w => w.id === wagerId);
      if (hit) {
        ctrl.getPactbook().accept(hit.id);
        return ctrl;
      }
    }
    throw new Error(`controllerWith: never drew ${wagerId} in 500 attempts`);
  }

  it('modifyCreepKillGold returns base when no wager accepted', () => {
    const ctrl = new SnakeEyesMissionController({ rng: seqRng(0.1) });
    expect(ctrl.modifyCreepKillGold(10)).toBe(10);
  });

  it('modifyCreepKillGold returns base when accepted wager has no handler hook', () => {
    // Coin Flip implements onMissionStart, NOT modifyCreepKillGold.
    const ctrl = controllerWith('coin_flip');
    expect(ctrl.modifyCreepKillGold(10)).toBe(10);
  });

  it('modifyCreepKillGold dispatches to handler when present (House Cut)', () => {
    // House Cut: floor(base * 0.9) + 1. 10 → floor(9) + 1 = 10. 100 → 91.
    const ctrl = controllerWith('house_cut');
    expect(ctrl.modifyCreepKillGold(10)).toBe(10);
    expect(ctrl.modifyCreepKillGold(100)).toBe(91);
  });

  it('getTraitsForTower returns empty when no wager accepted', () => {
    const ctrl = new SnakeEyesMissionController({ rng: seqRng(0.1) });
    expect(ctrl.getTraitsForTower('void_siphon')).toEqual([]);
  });

  it('getTraitsForTower dispatches to handler (Markers)', () => {
    const ctrl = controllerWith('markers');
    const traits = ctrl.getTraitsForTower('void_siphon');
    expect(traits.length).toBe(1);
    expect(traits[0].id).toBe('void_markers_siphon');
    // Other towers get nothing.
    expect(ctrl.getTraitsForTower('void_spike')).toEqual([]);
  });

  it('applyMissionStartEffects is idempotent', () => {
    const ctrl = controllerWith('coin_flip');
    let credits = 0;
    const economy = { addGold: (n: number) => { credits += n; } };
    ctrl.applyMissionStartEffects(economy);
    const after = credits;
    ctrl.applyMissionStartEffects(economy);
    expect(credits).toBe(after);
  });

  it('applyMissionStartEffects applies goldDelta from Coin Flip', () => {
    const ctrl = controllerWith('coin_flip');
    let credits = 0;
    const economy = { addGold: (n: number) => { credits += n; } };
    ctrl.applyMissionStartEffects(economy);
    // Coin Flip gives ±50g. Both outcomes are valid.
    expect([+50, -50]).toContain(credits);
  });

  it('applyMissionStartEffects merges flags from Sleeve Card', () => {
    const ctrl = controllerWith('sleeve_card');
    ctrl.applyMissionStartEffects({ addGold: () => {} });
    expect(ctrl.getFlag('sleeve_card_available')).toBe(true);
  });

  it('applyMissionStartEffects no-ops when no wager accepted', () => {
    const ctrl = new SnakeEyesMissionController({ rng: seqRng(0.1) });
    let credits = 0;
    ctrl.applyMissionStartEffects({ addGold: (n: number) => { credits += n; } });
    expect(credits).toBe(0);
    expect(ctrl.getFlags()).toEqual({});
  });

  it('onWaveStartedHook + onWaveClearedHook derive leaked flag from leak count delta', () => {
    // Hot Streak's handler updates flags based on the leaked param.
    // We don't peek inside that handler here — we just verify that
    // when leaks happen between start and clear, the hook fires
    // without throwing and the flag bag stays consistent.
    const ctrl = controllerWith('hot_streak');
    ctrl.applyMissionStartEffects({ addGold: () => {} });

    // Wave 1: no leaks.
    ctrl.onWaveStartedHook(1);
    ctrl.onWaveClearedHook(1);
    // Wave 2: 2 leaks recorded.
    ctrl.onWaveStartedHook(2);
    ctrl.recordLeak();
    ctrl.recordLeak();
    ctrl.onWaveClearedHook(2);
    // No throw = pass. Concrete flag values are Hot Streak handler
    // internals — covered by tier2.test.ts.
    expect(ctrl.getFlags()).toBeDefined();
  });

  it('resolveWagerAtMissionEnd applies paydown multiplier when handler implements it', () => {
    // Inverted Stakes returns 2 on perfect-run / 0 on any leak.
    // Base paydown for T3 = PAYDOWN_BASE(100) + PER_DIVERGENCE(50) * 3 = 250.
    // Perfect-run win: 250 * 2 = 500g paid down.
    const ctrl = controllerWith('inverted_stakes');
    const before = getSnakeEyesState().debt;
    ctrl.resolveWagerAtMissionEnd(fakeResult({ won: true, perfectRun: true }));
    const after = getSnakeEyesState().debt;
    expect(before - after).toBe(500);
  });

  it('resolveWagerAtMissionEnd skips paydown when multiplier is 0 (Inverted Stakes leaked)', () => {
    const ctrl = controllerWith('inverted_stakes');
    const before = getSnakeEyesState().debt;
    ctrl.resolveWagerAtMissionEnd(fakeResult({ won: true, perfectRun: false }));
    const after = getSnakeEyesState().debt;
    expect(after).toBe(before);
  });
});

describe('SnakeEyesMissionController — M8 Collector', () => {
  beforeEach(() => {
    resetSnakeEyesState();
    clearActive();
  });

  function fakeTower(col: number, row: number): { col: number; row: number; alive: boolean } {
    return { col, row, alive: true };
  }
  function fakeCreep(id: number, typeId: string, col: number, row: number): { id: number; creepTypeId: string; col: number; row: number } {
    return { id, creepTypeId: typeId, col, row };
  }

  it('tickCollectors lazy-creates a behavior on first sighting', () => {
    const ctrl = new SnakeEyesMissionController({ rng: Math.random, missionIdx: 7 });
    expect(ctrl._getActiveCollectorCountForTest()).toBe(0);
    const towers = [fakeTower(5, 5)];
    const creeps = [fakeCreep(42, 'void_collector', 4, 5)];
    ctrl.tickCollectors(0, towers, creeps, () => {});
    expect(ctrl._getActiveCollectorCountForTest()).toBe(1);
  });

  it('tickCollectors ignores non-collector creeps', () => {
    const ctrl = new SnakeEyesMissionController({ rng: Math.random, missionIdx: 7 });
    ctrl.tickCollectors(0, [fakeTower(5, 5)], [fakeCreep(1, 'standard', 4, 5)], () => {});
    expect(ctrl._getActiveCollectorCountForTest()).toBe(0);
  });

  it('tickCollectors fires disable callback after the token cooldown elapses', () => {
    const ctrl = new SnakeEyesMissionController({ rng: Math.random, missionIdx: 7 });
    const towers = [fakeTower(5, 5)];
    const creeps = [fakeCreep(42, 'void_collector', 4, 5)];
    const calls: Array<{ col: number; durationMs: number }> = [];
    const disableFn = (tower: { col: number }, ms: number) => calls.push({ col: tower.col, durationMs: ms });

    // First tick — schedules next fire, no event yet (per CollectorBehavior).
    ctrl.tickCollectors(0, towers, creeps, disableFn);
    expect(calls.length).toBe(0);

    // After cooldown (4s default), behavior emits → disableFn called.
    ctrl.tickCollectors(5000, towers, creeps, disableFn);
    expect(calls.length).toBe(1);
    expect(calls[0].col).toBe(5);
    expect(calls[0].durationMs).toBe(6000);
  });

  it('onCollectorMaybeKilled marks state.collectorDefeatedAt = missionIdx', () => {
    const ctrl = new SnakeEyesMissionController({ rng: Math.random, missionIdx: 7 });
    // Spawn a Collector so the behavior is tracked.
    ctrl.tickCollectors(0, [fakeTower(5, 5)], [fakeCreep(42, 'void_collector', 4, 5)], () => {});
    expect(getSnakeEyesState().collectorDefeatedAt).toBeNull();
    ctrl.onCollectorMaybeKilled(42);
    expect(getSnakeEyesState().collectorDefeatedAt).toBe(7);
    expect(ctrl._getActiveCollectorCountForTest()).toBe(0);
  });

  it('onCollectorMaybeKilled is a no-op for non-Collector creep ids', () => {
    const ctrl = new SnakeEyesMissionController({ rng: Math.random, missionIdx: 7 });
    ctrl.onCollectorMaybeKilled(999);
    expect(getSnakeEyesState().collectorDefeatedAt).toBeNull();
  });

  it('onCollectorMaybeReached removes the Collector WITHOUT marking defeated', () => {
    const ctrl = new SnakeEyesMissionController({ rng: Math.random, missionIdx: 7 });
    ctrl.tickCollectors(0, [fakeTower(5, 5)], [fakeCreep(42, 'void_collector', 4, 5)], () => {});
    expect(ctrl._getActiveCollectorCountForTest()).toBe(1);
    ctrl.onCollectorMaybeReached(42);
    expect(ctrl._getActiveCollectorCountForTest()).toBe(0);
    expect(getSnakeEyesState().collectorDefeatedAt).toBeNull();
  });

  it('wasCollectorDefeatedThisMission reflects the kill', () => {
    const ctrl = new SnakeEyesMissionController({ rng: Math.random, missionIdx: 7 });
    ctrl.tickCollectors(0, [fakeTower(5, 5)], [fakeCreep(42, 'void_collector', 4, 5)], () => {});
    expect(ctrl.wasCollectorDefeatedThisMission()).toBe(false);
    ctrl.onCollectorMaybeKilled(42);
    expect(ctrl.wasCollectorDefeatedThisMission()).toBe(true);
  });

  it('getDebtAtStart captures the post-tickBetweenMissions debt', () => {
    // Simulate the missionState aspect having applied interest before
    // the controller was constructed: write 850 into state, then
    // construct the controller.
    setSnakeEyesState({ ...getSnakeEyesState(), debt: 850 });
    const ctrl = new SnakeEyesMissionController({ rng: Math.random, missionIdx: 7 });
    expect(ctrl.getDebtAtStart()).toBe(850);

    // Subsequent debt mutations don't shift the snapshot.
    setSnakeEyesState({ ...getSnakeEyesState(), debt: 900 });
    expect(ctrl.getDebtAtStart()).toBe(850);
  });
});

describe('getActiveSnakeEyesController — typed accessor', () => {
  beforeEach(() => {
    clearActive();
  });

  it('returns null when no mission is active', () => {
    expect(getActiveSnakeEyesController()).toBeNull();
  });

  it('returns the controller when the active lifecycle aspect is one', () => {
    const ctrl = new SnakeEyesMissionController({ rng: seqRng(0.1) });
    installController(ctrl);
    expect(getActiveSnakeEyesController()).toBe(ctrl);
  });

  it('returns null when the active lifecycle is a different class', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (MissionRunner as any).active = {
      ext: { factionId: 'nature' },
      mission: { id: 'm0', idx: 0 },
      archetypeId: 'standard',
      startedAt: Date.now(),
      runtime: { lifecycle: { update() {}, shutdown() {} } },
    };
    expect(getActiveSnakeEyesController()).toBeNull();
  });
});
