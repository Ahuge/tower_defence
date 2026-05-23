/**
 * Tests for snakeEyesMissionStateAspect — verifies the aspect actually
 * mutates Debt across missions. Pass 2.5 refactor: per-mission state
 * moved out of module globals into SnakeEyesMissionController. These
 * tests no longer poke a leak counter directly; they exercise the
 * aspect lifecycle (tickBetweenMissions for interest; applyMissionResult
 * for leak surcharge via the controller).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { snakeEyesMissionStateAspect } from './SnakeEyesMissionStateAspect';
import { SnakeEyesMissionController } from './SnakeEyesMissionController';
import {
  resetSnakeEyesState,
  getSnakeEyesState,
  INITIAL_DEBT,
  INTEREST_PER_MISSION,
  LEAK_SURCHARGE,
} from './DebtTracker';
import { MissionRunner } from '../missions/MissionRunner';
import type { MissionEntry, MissionResult } from '../campaign/types';

// Wager effect handlers register at module load. Tests need them so
// the Pactbook deck contains all 12 cards before any draw.
import './wagers';

function fakeEntry(idx: number): MissionEntry<unknown, unknown> {
  return {
    id: `m${idx}`,
    idx,
    archetypeId: 'standard',
    name: `M${idx}`,
    story: '',
    core: { mode: 'standard', mapId: 'plains', difficulty: 'normal', waveCount: 10 },
    campaign: { kind: 'plain' } as unknown,
    objectives: {},
  } as MissionEntry<unknown, unknown>;
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

/** Install a fake "active mission" on MissionRunner so
 *  getActiveSnakeEyesController() resolves to our test controller.
 *  Each call replaces any prior active session — we don't need to
 *  unwind via abort() because every test sets its own via beforeEach. */
function installController(controller: SnakeEyesMissionController): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (MissionRunner as any).active = {
    ext: { factionId: 'void' },
    mission: fakeEntry(0),
    archetypeId: 'standard',
    startedAt: Date.now(),
    runtime: { lifecycle: controller },
  };
}

function clearActive(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (MissionRunner as any).active = null;
}

describe('snakeEyesMissionStateAspect — interest tick (tickBetweenMissions)', () => {
  beforeEach(() => {
    resetSnakeEyesState();
    clearActive();
  });

  it('M1 (idx 0) start: no interest, flips firstMissionStarted', () => {
    snakeEyesMissionStateAspect.tickBetweenMissions!(
      snakeEyesMissionStateAspect.read(),
      fakeEntry(0),
    );
    const state = getSnakeEyesState();
    expect(state.debt).toBe(INITIAL_DEBT);
    expect(state.firstMissionStarted).toBe(true);
  });

  it('M2+ start: +50g interest applied per mission', () => {
    snakeEyesMissionStateAspect.tickBetweenMissions!(
      snakeEyesMissionStateAspect.read(),
      fakeEntry(0),
    );
    expect(getSnakeEyesState().debt).toBe(INITIAL_DEBT);

    snakeEyesMissionStateAspect.tickBetweenMissions!(
      snakeEyesMissionStateAspect.read(),
      fakeEntry(1),
    );
    expect(getSnakeEyesState().debt).toBe(INITIAL_DEBT + INTEREST_PER_MISSION);

    snakeEyesMissionStateAspect.tickBetweenMissions!(
      snakeEyesMissionStateAspect.read(),
      fakeEntry(2),
    );
    expect(getSnakeEyesState().debt).toBe(INITIAL_DEBT + 2 * INTEREST_PER_MISSION);
  });

  it('applyDynamicOverrides is now a pure pass-through (no side effects)', () => {
    const before = getSnakeEyesState();
    const entry = fakeEntry(2);
    const out = snakeEyesMissionStateAspect.applyDynamicOverrides(
      snakeEyesMissionStateAspect.read(),
      entry,
    );
    expect(out).toBe(entry);
    expect(getSnakeEyesState()).toEqual(before);
  });
});

describe('snakeEyesMissionStateAspect — leak surcharge via controller', () => {
  beforeEach(() => {
    resetSnakeEyesState();
    clearActive();
  });

  it('no leaks: debt unchanged at mission end', () => {
    const ctrl = new SnakeEyesMissionController();
    installController(ctrl);

    const before = getSnakeEyesState().debt;
    snakeEyesMissionStateAspect.applyMissionResult(
      snakeEyesMissionStateAspect.read(),
      fakeResult({ livesStart: 20, livesRemaining: 20 }),
    );
    expect(getSnakeEyesState().debt).toBe(before);
  });

  it('controller-recorded leaks: surcharge via applyLeaks', () => {
    const ctrl = new SnakeEyesMissionController();
    installController(ctrl);
    ctrl.recordLeak();
    ctrl.recordLeak();
    ctrl.recordLeak();

    const before = getSnakeEyesState().debt;
    snakeEyesMissionStateAspect.applyMissionResult(
      snakeEyesMissionStateAspect.read(),
      fakeResult({ livesStart: 20, livesRemaining: 17 }),
    );
    expect(getSnakeEyesState().debt).toBe(before + 3 * LEAK_SURCHARGE);
  });

  it('falls back to livesLost when no controller is active', () => {
    // No installController() — getActiveSnakeEyesController() returns null
    // and the aspect uses its defensive fallback.
    const before = getSnakeEyesState().debt;
    snakeEyesMissionStateAspect.applyMissionResult(
      snakeEyesMissionStateAspect.read(),
      fakeResult({ livesStart: 20, livesRemaining: 18 }),
    );
    expect(getSnakeEyesState().debt).toBe(before + 2 * LEAK_SURCHARGE);
  });

  it('controller leak count resets across missions (fresh controller each)', () => {
    const ctrlA = new SnakeEyesMissionController();
    installController(ctrlA);
    ctrlA.recordLeak();
    ctrlA.recordLeak();
    snakeEyesMissionStateAspect.applyMissionResult(
      snakeEyesMissionStateAspect.read(),
      fakeResult(),
    );
    const between = getSnakeEyesState().debt;

    // New mission — fresh controller, fresh counter.
    const ctrlB = new SnakeEyesMissionController();
    installController(ctrlB);
    snakeEyesMissionStateAspect.applyMissionResult(
      snakeEyesMissionStateAspect.read(),
      fakeResult({ livesStart: 20, livesRemaining: 20 }),
    );
    expect(getSnakeEyesState().debt).toBe(between);
  });
});

describe('snakeEyesMissionStateAspect — read/write', () => {
  beforeEach(() => {
    resetSnakeEyesState();
    clearActive();
  });

  it('read() returns DEFAULT_SNAKE_EYES_STATE before any mutation', () => {
    const state = snakeEyesMissionStateAspect.read();
    expect(state.debt).toBe(INITIAL_DEBT);
    expect(state.firstMissionStarted).toBe(false);
  });

  it('write() persists; read() returns the written state', () => {
    const next = { ...snakeEyesMissionStateAspect.read(), debt: 1234 };
    snakeEyesMissionStateAspect.write(next);
    expect(snakeEyesMissionStateAspect.read().debt).toBe(1234);
  });

  it('defaults match DEFAULT_SNAKE_EYES_STATE', () => {
    expect(snakeEyesMissionStateAspect.defaults.debt).toBe(INITIAL_DEBT);
  });
});
