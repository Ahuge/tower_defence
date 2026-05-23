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
    const ctrl = new SnakeEyesMissionController(seqRng(0.1, 0.5, 0.9));
    expect(ctrl.getPactbook().getDrawn().length).toBe(3);
  });

  it('starts with isPactbookResolved() = false', () => {
    const ctrl = new SnakeEyesMissionController(seqRng(0.1));
    expect(ctrl.isPactbookResolved()).toBe(false);
  });

  it('starts with no active wager + leak count 0', () => {
    const ctrl = new SnakeEyesMissionController(seqRng(0.1));
    expect(ctrl.getActiveWager()).toBeNull();
    expect(ctrl.consumeLeakCount()).toBe(0);
  });
});

describe('SnakeEyesMissionController — leak counter', () => {
  it('recordLeak increments; consumeLeakCount returns + resets', () => {
    const ctrl = new SnakeEyesMissionController(seqRng(0.1));
    ctrl.recordLeak();
    ctrl.recordLeak();
    ctrl.recordLeak();
    expect(ctrl.consumeLeakCount()).toBe(3);
    expect(ctrl.consumeLeakCount()).toBe(0);
  });

  it('applyLeakSurcharge applies debt for accumulated leaks', () => {
    resetSnakeEyesState();
    const ctrl = new SnakeEyesMissionController(seqRng(0.1));
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
    const ctrl = new SnakeEyesMissionController(seqRng(0.1));
    expect(ctrl.resolveWagerAtMissionEnd(fakeResult())).toBeNull();
  });

  it('returns the accepted wager when one was picked', () => {
    const ctrl = new SnakeEyesMissionController(seqRng(0.1));
    const drawnId = ctrl.getPactbook().getDrawn()[0].id;
    ctrl.getPactbook().accept(drawnId);
    const resolved = ctrl.resolveWagerAtMissionEnd(fakeResult());
    expect(resolved?.id).toBe(drawnId);
  });

  it('applies win-paydown on victory with accepted wager', () => {
    const ctrl = new SnakeEyesMissionController(seqRng(0.1));
    ctrl.getPactbook().accept(ctrl.getPactbook().getDrawn()[0].id);
    const before = getSnakeEyesState().debt;
    ctrl.resolveWagerAtMissionEnd(fakeResult({ won: true }));
    expect(getSnakeEyesState().debt).toBeLessThan(before);
  });

  it('does NOT pay down on loss', () => {
    const ctrl = new SnakeEyesMissionController(seqRng(0.1));
    ctrl.getPactbook().accept(ctrl.getPactbook().getDrawn()[0].id);
    const before = getSnakeEyesState().debt;
    ctrl.resolveWagerAtMissionEnd(fakeResult({ won: false }));
    expect(getSnakeEyesState().debt).toBe(before);
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
    const ctrl = new SnakeEyesMissionController(seqRng(0.1));
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
