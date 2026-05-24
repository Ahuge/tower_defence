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

describe('SnakeEyesMissionController — M10 finale', () => {
  beforeEach(() => {
    resetSnakeEyesState();
    clearActive();
  });

  it('M1-M9 controller has no m10 sub-controller', () => {
    const ctrl = new SnakeEyesMissionController({ rng: Math.random, missionIdx: 0 });
    expect(ctrl.getM10Controller()).toBeNull();
  });

  it('M10 controller (isM10) constructs the three-setpiece sub-controller', () => {
    const ctrl = new SnakeEyesMissionController({ rng: Math.random, missionIdx: 9, isM10: true });
    const m10 = ctrl.getM10Controller();
    expect(m10).not.toBeNull();
    expect(m10!.getStage()).toBe('approach');
  });

  it('m10OnWaveCleared advances Approach setpiece per wave', () => {
    const ctrl = new SnakeEyesMissionController({ rng: Math.random, missionIdx: 9, isM10: true });
    const m10 = ctrl.getM10Controller()!;
    for (let i = 1; i <= 4; i++) {
      ctrl.m10OnWaveCleared(i);
      expect(m10.getStage()).toBe('approach');
    }
    ctrl.m10OnWaveCleared(5);
    expect(m10.getStage()).toBe('mirror_lane');
  });

  it('m10OnWaveCleared records player clears on Mirror Lane', () => {
    const ctrl = new SnakeEyesMissionController({ rng: Math.random, missionIdx: 9, isM10: true });
    const m10 = ctrl.getM10Controller()!;
    // Walk through Approach.
    for (let i = 1; i <= 5; i++) ctrl.m10OnWaveCleared(i);
    expect(m10.getStage()).toBe('mirror_lane');
    // Player clears one Mirror Lane wave.
    ctrl.m10OnWaveCleared(6);
    expect(m10.getMirrorLaneController().getSnapshot().playerWave).toBe(1);
  });

  it('m10TickCounterfactualLaneClear advances the CF side', () => {
    const ctrl = new SnakeEyesMissionController({ rng: Math.random, missionIdx: 9, isM10: true });
    const m10 = ctrl.getM10Controller()!;
    for (let i = 1; i <= 5; i++) ctrl.m10OnWaveCleared(i);
    expect(m10.getStage()).toBe('mirror_lane');
    ctrl.m10TickCounterfactualLaneClear();
    expect(m10.getMirrorLaneController().getSnapshot().counterfactualWave).toBe(1);
  });

  it('player winning the Mirror Lane race flips stage to table', () => {
    const ctrl = new SnakeEyesMissionController({ rng: Math.random, missionIdx: 9, isM10: true });
    const m10 = ctrl.getM10Controller()!;
    for (let i = 1; i <= 5; i++) ctrl.m10OnWaveCleared(i);
    // Player clears 5 Mirror Lane waves before CF advances at all.
    for (let i = 6; i <= 10; i++) ctrl.m10OnWaveCleared(i);
    expect(m10.getStage()).toBe('table');
  });

  it('CF winning the Mirror Lane race flips stage to lost_mirror_lane', () => {
    const ctrl = new SnakeEyesMissionController({ rng: Math.random, missionIdx: 9, isM10: true });
    const m10 = ctrl.getM10Controller()!;
    for (let i = 1; i <= 5; i++) ctrl.m10OnWaveCleared(i);
    for (let i = 0; i < 5; i++) ctrl.m10TickCounterfactualLaneClear();
    expect(m10.getStage()).toBe('lost_mirror_lane');
  });

  it('m10MarkBossDefeated flips stage to complete', () => {
    const ctrl = new SnakeEyesMissionController({ rng: Math.random, missionIdx: 9, isM10: true });
    const m10 = ctrl.getM10Controller()!;
    // Fast-forward to table stage by walking through Approach + Mirror Lane.
    for (let i = 1; i <= 5; i++) ctrl.m10OnWaveCleared(i);
    for (let i = 6; i <= 10; i++) ctrl.m10OnWaveCleared(i);
    expect(m10.getStage()).toBe('table');
    ctrl.m10MarkBossDefeated();
    expect(m10.isWon()).toBe(true);
    expect(m10.getStage()).toBe('complete');
  });

  it('m10MarkLost in Approach flips stage to lost_approach', () => {
    const ctrl = new SnakeEyesMissionController({ rng: Math.random, missionIdx: 9, isM10: true });
    ctrl.m10MarkLost();
    expect(ctrl.getM10Controller()!.getStage()).toBe('lost_approach');
    expect(ctrl.getM10Controller()!.isLost()).toBe(true);
  });

  it('m10MarkLost in Mirror Lane force-resolves CF win + flips to lost_mirror_lane', () => {
    const ctrl = new SnakeEyesMissionController({ rng: Math.random, missionIdx: 9, isM10: true });
    const m10 = ctrl.getM10Controller()!;
    // Walk through Approach to land in mirror_lane.
    for (let i = 1; i <= 5; i++) ctrl.m10OnWaveCleared(i);
    expect(m10.getStage()).toBe('mirror_lane');
    // Lives-zero mid-lane: forceResolve('counterfactual') + completeMirrorLane.
    ctrl.m10MarkLost();
    expect(m10.getStage()).toBe('lost_mirror_lane');
    expect(m10.isLost()).toBe(true);
    expect(m10.getMirrorLaneController().getWinner()).toBe('counterfactual');
  });

  it('consumeM10WinTrigger returns true exactly once after isWon flips', () => {
    const ctrl = new SnakeEyesMissionController({ rng: Math.random, missionIdx: 9, isM10: true });
    // Before isWon flips: false.
    expect(ctrl.consumeM10WinTrigger()).toBe(false);
    // Fast-forward to table + boss kill.
    for (let i = 1; i <= 5; i++) ctrl.m10OnWaveCleared(i);
    for (let i = 6; i <= 10; i++) ctrl.m10OnWaveCleared(i);
    ctrl.m10MarkBossDefeated();
    expect(ctrl.getM10Controller()!.isWon()).toBe(true);
    // First call after win: true. Subsequent: false.
    expect(ctrl.consumeM10WinTrigger()).toBe(true);
    expect(ctrl.consumeM10WinTrigger()).toBe(false);
    expect(ctrl.consumeM10WinTrigger()).toBe(false);
  });

  it('update ticks the simulated Counterfactual lane clear after the interval', () => {
    const ctrl = new SnakeEyesMissionController({ rng: Math.random, missionIdx: 9, isM10: true });
    const m10 = ctrl.getM10Controller()!;
    for (let i = 1; i <= 5; i++) ctrl.m10OnWaveCleared(i);
    // Default interval 10s × 1.0 (no divergence bias here). Tick 11s.
    ctrl.update(11_000);
    expect(m10.getMirrorLaneController().getSnapshot().counterfactualWave).toBe(1);
  });

  it('m10ScaleCounterfactualHp overrides hp + maxHp on first call, no-ops on repeat', () => {
    setSnakeEyesState({
      ...getSnakeEyesState(),
      pactbookTally: {
        acceptedT1: 0, acceptedT2: 0, acceptedT3: 4,
        declined: 0, succeeded: 4, failed: 0,
      },
    });
    const ctrl = new SnakeEyesMissionController({ rng: Math.random, missionIdx: 9, isM10: true });
    const m10 = ctrl.getM10Controller()!;
    const expectedHp = m10.getSnapshot().bossHpMax;
    expect(expectedHp).toBe(5000 + 4 * 400); // 6600

    const fakeCreep = { id: 42, hp: 200, maxHp: 200 };
    ctrl.m10ScaleCounterfactualHp(fakeCreep);
    expect(fakeCreep.hp).toBe(expectedHp);
    expect(fakeCreep.maxHp).toBe(expectedHp);

    // Repeat call — already-scaled creep is left alone, even if its
    // hp was damaged in the interim (we don't want to re-heal it).
    fakeCreep.hp = 100;
    ctrl.m10ScaleCounterfactualHp(fakeCreep);
    expect(fakeCreep.hp).toBe(100); // unchanged
  });

  it('m10ScaleCounterfactualHp is a no-op on non-M10 controllers', () => {
    const ctrl = new SnakeEyesMissionController({ rng: Math.random, missionIdx: 0 });
    const fakeCreep = { id: 42, hp: 200, maxHp: 200 };
    ctrl.m10ScaleCounterfactualHp(fakeCreep);
    expect(fakeCreep.hp).toBe(200);
    expect(fakeCreep.maxHp).toBe(200);
  });

  it('update does NOT tick CF lane outside the mirror_lane stage', () => {
    const ctrl = new SnakeEyesMissionController({ rng: Math.random, missionIdx: 9, isM10: true });
    // Still in approach. 30s tick.
    ctrl.update(30_000);
    expect(ctrl.getM10Controller()!.getMirrorLaneController().getSnapshot().counterfactualWave).toBe(0);
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
