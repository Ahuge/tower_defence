/**
 * Tests for DivergenceTracker — the Snake Eyes campaign's per-mission
 * risk-tally counter.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  DivergenceTracker,
  MAX_DIVERGENCE,
  getLastMissionDivergence,
} from './DivergenceTracker';
import { resetSnakeEyesState, getSnakeEyesState } from './DebtTracker';

beforeEach(() => {
  resetSnakeEyesState();
});

describe('DivergenceTracker — construction', () => {
  it('starts at zero by default', () => {
    expect(new DivergenceTracker().getCurrent()).toBe(0);
  });

  it('accepts an explicit initial value', () => {
    expect(new DivergenceTracker(5).getCurrent()).toBe(5);
  });

  it('clamps initial below zero to zero', () => {
    expect(new DivergenceTracker(-3).getCurrent()).toBe(0);
  });

  it('clamps initial above max to max', () => {
    expect(new DivergenceTracker(99).getCurrent()).toBe(MAX_DIVERGENCE);
  });
});

describe('DivergenceTracker — add', () => {
  it('tier 1 adds 1', () => {
    const d = new DivergenceTracker();
    expect(d.add(1)).toBe(1);
    expect(d.getCurrent()).toBe(1);
  });

  it('tier 2 adds 2', () => {
    const d = new DivergenceTracker();
    expect(d.add(2)).toBe(2);
  });

  it('tier 3 adds 3', () => {
    const d = new DivergenceTracker();
    expect(d.add(3)).toBe(3);
  });

  it('accumulates across calls', () => {
    const d = new DivergenceTracker();
    d.add(1);
    d.add(2);
    d.add(3);
    expect(d.getCurrent()).toBe(6);
  });

  it('clamps at MAX_DIVERGENCE', () => {
    const d = new DivergenceTracker(8);
    expect(d.add(3)).toBe(MAX_DIVERGENCE);
    expect(d.add(3)).toBe(MAX_DIVERGENCE); // stays at max
  });

  it('MAX_DIVERGENCE is 10 (locked from plan doc)', () => {
    expect(MAX_DIVERGENCE).toBe(10);
  });
});

describe('DivergenceTracker — reset', () => {
  it('resets the counter to zero', () => {
    const d = new DivergenceTracker(7);
    d.reset();
    expect(d.getCurrent()).toBe(0);
  });
});

describe('DivergenceTracker — finalize', () => {
  it('persists current Divergence into SnakeEyesState.lastMissionDivergence', () => {
    const d = new DivergenceTracker();
    d.add(2);
    d.add(3); // current = 5
    d.finalize();
    expect(getSnakeEyesState().lastMissionDivergence).toBe(5);
    expect(getLastMissionDivergence()).toBe(5);
  });

  it('finalize at zero persists zero (a mission with no accepted Wagers)', () => {
    const d = new DivergenceTracker();
    d.finalize();
    expect(getLastMissionDivergence()).toBe(0);
  });

  it('finalize overwrites prior persisted value (per-mission snapshot)', () => {
    new DivergenceTracker(8).finalize();
    expect(getLastMissionDivergence()).toBe(8);
    new DivergenceTracker(2).finalize();
    expect(getLastMissionDivergence()).toBe(2);
  });
});

describe('DivergenceTracker — getLastMissionDivergence accessor', () => {
  it('returns 0 on a fresh install (no prior mission)', () => {
    expect(getLastMissionDivergence()).toBe(0);
  });
});
