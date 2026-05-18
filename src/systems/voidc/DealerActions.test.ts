/**
 * Tests for DealerActions — Debt-threshold pressure plan computation.
 * Pins every threshold step + ensures the cumulative shape matches
 * the plan doc table exactly.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEALER_THRESHOLDS,
  computeDealerActions,
  liveDealerActions,
  pactbookDrawCountAfterDealer,
} from './DealerActions';
import { resetSnakeEyesState, applyDebtDelta, INITIAL_DEBT } from './DebtTracker';

beforeEach(() => {
  resetSnakeEyesState();
});

describe('DealerActions — threshold constants', () => {
  it('match the plan doc table', () => {
    expect(DEALER_THRESHOLDS.BOUNTY_WAVE).toBe(1000);
    expect(DEALER_THRESHOLDS.REPOSSESS).toBe(1300);
    expect(DEALER_THRESHOLDS.VOID_SLOT).toBe(1600);
    expect(DEALER_THRESHOLDS.EXTRA_BOUNTY_AND_VOID).toBe(2000);
  });
});

describe('DealerActions — computeDealerActions', () => {
  it('Debt at start (800g): no actions', () => {
    expect(computeDealerActions(800)).toEqual({
      bountyWaves: 0, repossesses: 0, wagerSlotsVoided: 0,
    });
  });

  it('Debt just below first threshold (999g): no actions', () => {
    expect(computeDealerActions(999)).toEqual({
      bountyWaves: 0, repossesses: 0, wagerSlotsVoided: 0,
    });
  });

  it('Debt at first threshold (1000g): one bounty wave', () => {
    expect(computeDealerActions(1000)).toEqual({
      bountyWaves: 1, repossesses: 0, wagerSlotsVoided: 0,
    });
  });

  it('Debt mid-tier (1200g): still just bounty', () => {
    expect(computeDealerActions(1200)).toEqual({
      bountyWaves: 1, repossesses: 0, wagerSlotsVoided: 0,
    });
  });

  it('Debt at second threshold (1300g): bounty + repossess', () => {
    expect(computeDealerActions(1300)).toEqual({
      bountyWaves: 1, repossesses: 1, wagerSlotsVoided: 0,
    });
  });

  it('Debt at third threshold (1600g): bounty + repossess + 1 slot voided', () => {
    expect(computeDealerActions(1600)).toEqual({
      bountyWaves: 1, repossesses: 1, wagerSlotsVoided: 1,
    });
  });

  it('Debt mid (1800g): same as 1600 step', () => {
    expect(computeDealerActions(1800)).toEqual({
      bountyWaves: 1, repossesses: 1, wagerSlotsVoided: 1,
    });
  });

  it('Debt at fourth threshold (2000g): 2 bounty + repossess + 2 voided', () => {
    expect(computeDealerActions(2000)).toEqual({
      bountyWaves: 2, repossesses: 1, wagerSlotsVoided: 2,
    });
  });

  it('Debt blown out (5000g): still 2 / 1 / 2 (no further escalation)', () => {
    expect(computeDealerActions(5000)).toEqual({
      bountyWaves: 2, repossesses: 1, wagerSlotsVoided: 2,
    });
  });

  it('negative Debt (settled with the House): no actions', () => {
    expect(computeDealerActions(-500)).toEqual({
      bountyWaves: 0, repossesses: 0, wagerSlotsVoided: 0,
    });
  });

  it('NaN debt: defensively no actions', () => {
    expect(computeDealerActions(NaN)).toEqual({
      bountyWaves: 0, repossesses: 0, wagerSlotsVoided: 0,
    });
  });
});

describe('DealerActions — liveDealerActions', () => {
  it('reads Debt from SnakeEyesState (default 800g → no actions)', () => {
    expect(liveDealerActions()).toEqual({
      bountyWaves: 0, repossesses: 0, wagerSlotsVoided: 0,
    });
  });

  it('reflects current Debt mutations', () => {
    applyDebtDelta(+500); // debt 1300
    expect(liveDealerActions()).toEqual({
      bountyWaves: 1, repossesses: 1, wagerSlotsVoided: 0,
    });
  });

  it('after large Debt accumulation (≥2000): full action plan', () => {
    applyDebtDelta(+1500); // debt 2300
    expect(liveDealerActions()).toEqual({
      bountyWaves: 2, repossesses: 1, wagerSlotsVoided: 2,
    });
  });
});

describe('DealerActions — pactbookDrawCountAfterDealer', () => {
  it('0 voided → 3 draws (default)', () => {
    expect(pactbookDrawCountAfterDealer({
      bountyWaves: 0, repossesses: 0, wagerSlotsVoided: 0,
    })).toBe(3);
  });

  it('1 voided → 2 draws', () => {
    expect(pactbookDrawCountAfterDealer({
      bountyWaves: 1, repossesses: 1, wagerSlotsVoided: 1,
    })).toBe(2);
  });

  it('2 voided → 1 draw', () => {
    expect(pactbookDrawCountAfterDealer({
      bountyWaves: 2, repossesses: 1, wagerSlotsVoided: 2,
    })).toBe(1);
  });

  it('voided ≥ baseCount → clamps to 1 draw (always show a card)', () => {
    expect(pactbookDrawCountAfterDealer({
      bountyWaves: 0, repossesses: 0, wagerSlotsVoided: 99,
    })).toBe(1);
  });

  it('custom baseCount honoured', () => {
    expect(pactbookDrawCountAfterDealer({
      bountyWaves: 0, repossesses: 0, wagerSlotsVoided: 1,
    }, 5)).toBe(4);
  });
});

describe('DealerActions — INITIAL_DEBT sanity check', () => {
  it('the campaign starts below the first threshold', () => {
    // If this fails, the campaign's M1 will boot with the Dealer
    // already breathing down the player's neck — a balance bug.
    expect(INITIAL_DEBT).toBeLessThan(DEALER_THRESHOLDS.BOUNTY_WAVE);
  });
});
