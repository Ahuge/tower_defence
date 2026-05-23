/**
 * Tests for snakeEyesMissionStateAspect — verifies the aspect actually
 * mutates Debt across missions. The point of this file is to lock down
 * the fix for the bug where Snake Eyes shipped a `buildRuntime` that
 * returned `{}` and so the 800g starting Debt never moved.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  snakeEyesMissionStateAspect,
  recordMissionLeak,
  consumeMissionLeakCount,
  _resetMissionLeakCounter,
} from './SnakeEyesMissionStateAspect';
import {
  resetSnakeEyesState,
  getSnakeEyesState,
  INITIAL_DEBT,
  INTEREST_PER_MISSION,
  LEAK_SURCHARGE,
} from './DebtTracker';
import type { MissionEntry, MissionResult } from '../campaign/types';

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

describe('snakeEyesMissionStateAspect — interest application', () => {
  beforeEach(() => {
    resetSnakeEyesState();
    _resetMissionLeakCounter();
  });

  it('M1 (idx 0) start: no interest, flips firstMissionStarted', () => {
    snakeEyesMissionStateAspect.applyDynamicOverrides(
      snakeEyesMissionStateAspect.read(),
      fakeEntry(0),
    );
    const state = getSnakeEyesState();
    expect(state.debt).toBe(INITIAL_DEBT);
    expect(state.firstMissionStarted).toBe(true);
  });

  it('M2+ start: +50g interest applied per mission', () => {
    // M1 — primes firstMissionStarted.
    snakeEyesMissionStateAspect.applyDynamicOverrides(
      snakeEyesMissionStateAspect.read(),
      fakeEntry(0),
    );
    expect(getSnakeEyesState().debt).toBe(INITIAL_DEBT);

    // M2 — first interest tick.
    snakeEyesMissionStateAspect.applyDynamicOverrides(
      snakeEyesMissionStateAspect.read(),
      fakeEntry(1),
    );
    expect(getSnakeEyesState().debt).toBe(INITIAL_DEBT + INTEREST_PER_MISSION);

    // M3 — second tick.
    snakeEyesMissionStateAspect.applyDynamicOverrides(
      snakeEyesMissionStateAspect.read(),
      fakeEntry(2),
    );
    expect(getSnakeEyesState().debt).toBe(INITIAL_DEBT + 2 * INTEREST_PER_MISSION);
  });
});

describe('snakeEyesMissionStateAspect — leak surcharge', () => {
  beforeEach(() => {
    resetSnakeEyesState();
    _resetMissionLeakCounter();
  });

  it('no leaks: debt unchanged at mission end', () => {
    const before = getSnakeEyesState().debt;
    snakeEyesMissionStateAspect.applyMissionResult(
      snakeEyesMissionStateAspect.read(),
      fakeResult({ livesStart: 20, livesRemaining: 20 }),
    );
    expect(getSnakeEyesState().debt).toBe(before);
  });

  it('counter leaks: applyLeaks with LEAK_SURCHARGE per leak', () => {
    recordMissionLeak();
    recordMissionLeak();
    recordMissionLeak();
    const before = getSnakeEyesState().debt;
    snakeEyesMissionStateAspect.applyMissionResult(
      snakeEyesMissionStateAspect.read(),
      fakeResult({ livesStart: 20, livesRemaining: 17 }),
    );
    expect(getSnakeEyesState().debt).toBe(before + 3 * LEAK_SURCHARGE);
    // Counter is consumed.
    expect(consumeMissionLeakCount()).toBe(0);
  });

  it('falls back to livesLost if gameplay aspect did not record', () => {
    // No recordMissionLeak() calls — simulates a mission run that
    // didn't install the gameplay aspect for some reason.
    const before = getSnakeEyesState().debt;
    snakeEyesMissionStateAspect.applyMissionResult(
      snakeEyesMissionStateAspect.read(),
      fakeResult({ livesStart: 20, livesRemaining: 18 }),
    );
    // livesLost = 2 → 2 × LEAK_SURCHARGE
    expect(getSnakeEyesState().debt).toBe(before + 2 * LEAK_SURCHARGE);
  });

  it('counter wins over livesLost when both present', () => {
    // Counter records 3 leaks but livesLost shows 7 (boss leak: 1 leak,
    // 5 lives + 2 normal leaks = 7 lives lost, 3 actual leaks). Use
    // the counter — it's the accurate source.
    recordMissionLeak();
    recordMissionLeak();
    recordMissionLeak();
    const before = getSnakeEyesState().debt;
    snakeEyesMissionStateAspect.applyMissionResult(
      snakeEyesMissionStateAspect.read(),
      fakeResult({ livesStart: 20, livesRemaining: 13 }),
    );
    expect(getSnakeEyesState().debt).toBe(before + 3 * LEAK_SURCHARGE);
  });

  it('counter resets between missions', () => {
    recordMissionLeak();
    recordMissionLeak();
    snakeEyesMissionStateAspect.applyMissionResult(
      snakeEyesMissionStateAspect.read(),
      fakeResult(),
    );

    // Next mission: counter should be 0; no additional surcharge.
    const between = getSnakeEyesState().debt;
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
    _resetMissionLeakCounter();
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
