/**
 * Integration test: Pactbook draw count under Dealer pressure.
 *
 * Pins the contract between DealerActions.wagerSlotsVoided and
 * Pactbook.draw(count, ...). When GameScene wiring lands, the call
 * site must consume `pactbookDrawCountAfterDealer(liveDealerActions())`
 * — this test asserts that the math works end-to-end so a future
 * refactor can't silently break the Dealer's threshold-3 / 4
 * pressure (the late-mission Wager-slot voiding).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Pactbook, MIRROR_WAGER_ID } from './Pactbook';
import {
  computeDealerActions,
  liveDealerActions,
  pactbookDrawCountAfterDealer,
} from './DealerActions';
import {
  resetSnakeEyesState,
  applyDebtDelta,
  INITIAL_DEBT,
} from './DebtTracker';

beforeEach(() => {
  resetSnakeEyesState();
});

describe('Pactbook × DealerActions — end-to-end draw count', () => {
  it('Debt at start (800g): full 3-card draw', () => {
    const actions = liveDealerActions();
    const count = pactbookDrawCountAfterDealer(actions);
    expect(count).toBe(3);
    const pb = new Pactbook({ rng: () => 0.5 });
    expect(pb.draw(count).length).toBe(3);
  });

  it('Debt 1500g (past 1300, below 1600): still 3-card draw, no slot voided', () => {
    applyDebtDelta(1500 - INITIAL_DEBT); // debt = 1500
    const actions = liveDealerActions();
    expect(actions.wagerSlotsVoided).toBe(0);
    expect(pactbookDrawCountAfterDealer(actions)).toBe(3);
  });

  it('Debt 1700g (past 1600, below 2000): 2-card draw', () => {
    applyDebtDelta(1700 - INITIAL_DEBT);
    const actions = liveDealerActions();
    expect(actions.wagerSlotsVoided).toBe(1);
    const count = pactbookDrawCountAfterDealer(actions);
    expect(count).toBe(2);
    const pb = new Pactbook({ rng: () => 0.5 });
    expect(pb.draw(count).length).toBe(2);
  });

  it('Debt 2500g (past 2000): 1-card draw — only one option left', () => {
    applyDebtDelta(2500 - INITIAL_DEBT);
    const actions = liveDealerActions();
    expect(actions.wagerSlotsVoided).toBe(2);
    const count = pactbookDrawCountAfterDealer(actions);
    expect(count).toBe(1);
    const pb = new Pactbook({ rng: () => 0.5 });
    expect(pb.draw(count).length).toBe(1);
  });

  it('clamps to ≥1 even at absurd Debt (player always sees one option)', () => {
    applyDebtDelta(10_000 - INITIAL_DEBT);
    const count = pactbookDrawCountAfterDealer(liveDealerActions());
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it('settled Debt (negative) restores full draw — Dealer goes quiet', () => {
    applyDebtDelta(-(INITIAL_DEBT + 500)); // debt = -500
    const actions = liveDealerActions();
    expect(actions.bountyWaves).toBe(0);
    expect(actions.wagerSlotsVoided).toBe(0);
    expect(pactbookDrawCountAfterDealer(actions)).toBe(3);
  });

  it('Mirror Wager exclusion on M10 composes with the draw count', () => {
    // M10's deck excludes the Mirror Wager card. Even under Dealer
    // pressure, the exclusion still applies + the count rule holds.
    applyDebtDelta(2500 - INITIAL_DEBT); // debt 2500
    const count = pactbookDrawCountAfterDealer(liveDealerActions());
    const pb = new Pactbook({ rng: () => 0.5 });
    const drawn = pb.draw(count, [0, 0, 1], [MIRROR_WAGER_ID]);
    expect(drawn.length).toBe(1);
    expect(drawn[0].id).not.toBe(MIRROR_WAGER_ID);
  });
});

describe('DealerActions — composability with computeDealerActions', () => {
  it('cumulative thresholds compose right', () => {
    // 2200g is past every threshold.
    expect(computeDealerActions(2200)).toEqual({
      bountyWaves: 2,
      repossesses: 1,
      wagerSlotsVoided: 2,
    });
  });
});
