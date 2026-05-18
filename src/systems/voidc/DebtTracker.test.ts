/**
 * Tests for DebtTracker — the Snake Eyes campaign's persistent
 * primary pressure counter. Verifies starting Debt, the interest +
 * leak + decline penalty + win paydown math, and the Collector's
 * one-shot interest cancellation.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  INITIAL_DEBT,
  INTEREST_PER_MISSION,
  LEAK_SURCHARGE,
  DECLINE_PENALTY,
  PAYDOWN_BASE,
  PAYDOWN_PER_DIVERGENCE,
  DEFAULT_SNAKE_EYES_STATE,
  getSnakeEyesState,
  getDebt,
  applyMissionStart,
  applyLeaks,
  applyDeclinePenalty,
  applyWinPaydown,
  applyDebtDelta,
  markCollectorDefeated,
  resetSnakeEyesState,
} from './DebtTracker';

beforeEach(() => {
  resetSnakeEyesState();
});

describe('DebtTracker — defaults', () => {
  it('first read returns the canonical default state', () => {
    const s = getSnakeEyesState();
    expect(s).toEqual(DEFAULT_SNAKE_EYES_STATE);
  });

  it('starts Ardax at 800g Debt', () => {
    expect(getDebt()).toBe(INITIAL_DEBT);
    expect(INITIAL_DEBT).toBe(800);
  });

  it('starts firstMissionStarted = false', () => {
    expect(getSnakeEyesState().firstMissionStarted).toBe(false);
  });

  it('starts theresStatus = with_ardax', () => {
    expect(getSnakeEyesState().theresStatus).toBe('with_ardax');
  });

  it('starts collectorDefeatedAt = null', () => {
    expect(getSnakeEyesState().collectorDefeatedAt).toBeNull();
  });
});

describe('DebtTracker — applyMissionStart', () => {
  it('first mission: no interest applied, flips firstMissionStarted', () => {
    const delta = applyMissionStart(0);
    expect(delta).toBe(0);
    expect(getDebt()).toBe(INITIAL_DEBT);
    expect(getSnakeEyesState().firstMissionStarted).toBe(true);
  });

  it('subsequent missions: +50g interest', () => {
    applyMissionStart(0); // M1 — no interest
    const delta = applyMissionStart(1); // M2 — interest
    expect(delta).toBe(INTEREST_PER_MISSION);
    expect(getDebt()).toBe(INITIAL_DEBT + INTEREST_PER_MISSION);
  });

  it('multiple subsequent missions accumulate', () => {
    applyMissionStart(0);
    applyMissionStart(1);
    applyMissionStart(2);
    applyMissionStart(3);
    expect(getDebt()).toBe(INITIAL_DEBT + 3 * INTEREST_PER_MISSION);
  });

  it('Collector defeated in prior mission cancels next interest exactly once', () => {
    applyMissionStart(0); // M1 start
    markCollectorDefeated(0); // Collector defeated in M1
    const delta = applyMissionStart(1); // M2 should skip interest
    expect(delta).toBe(0);
    expect(getDebt()).toBe(INITIAL_DEBT); // unchanged

    // M3 should bring interest back (one-shot consumed).
    const next = applyMissionStart(2);
    expect(next).toBe(INTEREST_PER_MISSION);
    expect(getDebt()).toBe(INITIAL_DEBT + INTEREST_PER_MISSION);
  });

  it('Collector cancellation requires prior-mission match — not arbitrary historic', () => {
    applyMissionStart(0);
    markCollectorDefeated(0); // M1
    applyMissionStart(1); // M2 — cancellation applies, flag cleared
    expect(getSnakeEyesState().collectorDefeatedAt).toBeNull();
    const delta = applyMissionStart(2); // M3 — full interest
    expect(delta).toBe(INTEREST_PER_MISSION);
  });

  it('Collector defeated in NON-prior mission does not cancel (regression)', () => {
    applyMissionStart(0); // M1
    applyMissionStart(1); // M2 — interest applied
    markCollectorDefeated(0); // Collector at M1; player is now at M3
    const delta = applyMissionStart(2); // M3 — not cancelled (M1 ≠ M2)
    expect(delta).toBe(INTEREST_PER_MISSION);
  });
});

describe('DebtTracker — applyLeaks', () => {
  it('adds 5g per leaked creep', () => {
    const before = getDebt();
    const delta = applyLeaks(3);
    expect(delta).toBe(15);
    expect(getDebt()).toBe(before + 15);
    expect(LEAK_SURCHARGE).toBe(5);
  });

  it('0 leaks is a no-op', () => {
    const before = getDebt();
    expect(applyLeaks(0)).toBe(0);
    expect(getDebt()).toBe(before);
  });

  it('negative leak count is a no-op (defensive)', () => {
    const before = getDebt();
    expect(applyLeaks(-5)).toBe(0);
    expect(getDebt()).toBe(before);
  });

  it('accumulates across calls within a mission', () => {
    applyLeaks(2);
    applyLeaks(3);
    expect(getDebt()).toBe(INITIAL_DEBT + 5 * LEAK_SURCHARGE);
  });
});

describe('DebtTracker — applyDeclinePenalty', () => {
  it('adds 20g for declining all three Pact draws', () => {
    const before = getDebt();
    const delta = applyDeclinePenalty();
    expect(delta).toBe(DECLINE_PENALTY);
    expect(getDebt()).toBe(before + DECLINE_PENALTY);
  });
});

describe('DebtTracker — applyWinPaydown', () => {
  it('pays down 100g at Divergence 0', () => {
    const delta = applyWinPaydown(0);
    expect(delta).toBe(-PAYDOWN_BASE);
    expect(getDebt()).toBe(INITIAL_DEBT - PAYDOWN_BASE);
  });

  it('pays down 100 + 50×div at intermediate divergence', () => {
    const delta = applyWinPaydown(4);
    expect(delta).toBe(-(PAYDOWN_BASE + 4 * PAYDOWN_PER_DIVERGENCE));
  });

  it('pays down 600g at max Divergence (10)', () => {
    const delta = applyWinPaydown(10);
    expect(delta).toBe(-(PAYDOWN_BASE + 10 * PAYDOWN_PER_DIVERGENCE));
    expect(delta).toBe(-600);
  });

  it('clamps divergence above 10', () => {
    const delta = applyWinPaydown(99);
    expect(delta).toBe(-600); // same as div=10
  });

  it('clamps divergence below 0', () => {
    const delta = applyWinPaydown(-5);
    expect(delta).toBe(-PAYDOWN_BASE); // same as div=0
  });

  it('floors fractional divergence (no half-points)', () => {
    const delta = applyWinPaydown(3.7);
    expect(delta).toBe(-(PAYDOWN_BASE + 3 * PAYDOWN_PER_DIVERGENCE));
  });

  it('NaN divergence is treated as 0 (defensive guard)', () => {
    const delta = applyWinPaydown(NaN);
    expect(delta).toBe(-PAYDOWN_BASE);
  });

  it('Infinity divergence is treated as 0 (defensive guard)', () => {
    expect(applyWinPaydown(Infinity)).toBe(-PAYDOWN_BASE);
    expect(applyWinPaydown(-Infinity)).toBe(-PAYDOWN_BASE);
  });

  it('multiplier=2 doubles the paydown (Inverted Stakes perfect run)', () => {
    const delta = applyWinPaydown(0, 2);
    expect(delta).toBe(-2 * PAYDOWN_BASE);
  });

  it('multiplier=0 zeros the paydown (Inverted Stakes with a leak)', () => {
    const delta = applyWinPaydown(5, 0);
    expect(delta).toBe(0);
    expect(getDebt()).toBe(INITIAL_DEBT);
  });

  it('multiplier=3 triples paydown (Mirror Wager win)', () => {
    const delta = applyWinPaydown(10, 3);
    expect(delta).toBe(-3 * (PAYDOWN_BASE + 10 * PAYDOWN_PER_DIVERGENCE));
    expect(delta).toBe(-1800);
  });

  it('NaN multiplier falls back to 1 (defensive guard)', () => {
    expect(applyWinPaydown(0, NaN)).toBe(-PAYDOWN_BASE);
  });

  it('Debt can go negative ("settled with the House")', () => {
    // Start near zero, then pay down generously.
    applyWinPaydown(10); // -600 → debt 200
    applyWinPaydown(10); // -600 → debt -400
    expect(getDebt()).toBe(INITIAL_DEBT - 1200);
    expect(getDebt()).toBeLessThan(0);
  });
});

describe('DebtTracker — applyDebtDelta', () => {
  it("applies a negative delta (Counterfactual's Cut)", () => {
    expect(applyDebtDelta(-100)).toBe(-100);
    expect(getDebt()).toBe(INITIAL_DEBT - 100);
  });

  it("applies a positive delta (future Dealer's Eye)", () => {
    expect(applyDebtDelta(+200)).toBe(+200);
    expect(getDebt()).toBe(INITIAL_DEBT + 200);
  });

  it('0 delta is a no-op', () => {
    const before = getDebt();
    expect(applyDebtDelta(0)).toBe(0);
    expect(getDebt()).toBe(before);
  });

  it('NaN delta is a no-op (defensive guard)', () => {
    const before = getDebt();
    expect(applyDebtDelta(NaN)).toBe(0);
    expect(getDebt()).toBe(before);
  });
});

describe('DebtTracker — markCollectorDefeated', () => {
  it('records the mission idx in state', () => {
    markCollectorDefeated(7); // M8 (idx 7)
    expect(getSnakeEyesState().collectorDefeatedAt).toBe(7);
  });

  it('overwrites a prior mark (only the latest defeat matters)', () => {
    markCollectorDefeated(3);
    markCollectorDefeated(7);
    expect(getSnakeEyesState().collectorDefeatedAt).toBe(7);
  });
});

describe('DebtTracker — end-to-end scenarios', () => {
  it("aggressive accept run: stays solvent through 10 missions", () => {
    // Approximates a player who maxes Divergence every mission.
    applyMissionStart(0); // no interest
    applyWinPaydown(10);  // -600 → 200
    for (let i = 1; i <= 9; i++) {
      applyMissionStart(i); // +50 interest each mission
      applyWinPaydown(10);  // -600 paydown
    }
    // 800 + (9 × 50) - (10 × 600) = 800 + 450 - 6000 = -4750
    expect(getDebt()).toBeLessThan(0);
  });

  it("pure decline run: Debt grows uncontrollably", () => {
    // Approximates a player who declines every mission and loses
    // (no paydown). Models the "crushing Debt" failure-state.
    applyMissionStart(0);
    applyDeclinePenalty();
    for (let i = 1; i <= 9; i++) {
      applyMissionStart(i);
      applyDeclinePenalty();
    }
    // 800 + (9 × 50) + (10 × 20) = 800 + 450 + 200 = 1450
    expect(getDebt()).toBe(INITIAL_DEBT + 9 * INTEREST_PER_MISSION + 10 * DECLINE_PENALTY);
    expect(getDebt()).toBe(1450);
  });
});
