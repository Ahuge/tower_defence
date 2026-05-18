/**
 * Tests for EpilogueComposer — fragment selection + composition.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  debtBand,
  divergenceBand,
  dominantTier,
  pickAxes,
  composeEpilogue,
  composeFromAxes,
  EPILOGUE_FRAGMENTS,
  type EpilogueAxes,
} from './EpilogueComposer';
import {
  resetSnakeEyesState,
  getSnakeEyesState,
  setSnakeEyesState,
} from './DebtTracker';

beforeEach(() => {
  resetSnakeEyesState();
});

describe('EpilogueComposer — band logic', () => {
  it('debt band: settled (≤0), lingering (1..1500), crushing (>1500)', () => {
    expect(debtBand(-100)).toBe('settled');
    expect(debtBand(0)).toBe('settled');
    expect(debtBand(1)).toBe('lingering');
    expect(debtBand(800)).toBe('lingering');
    expect(debtBand(1500)).toBe('lingering');
    expect(debtBand(1501)).toBe('crushing');
    expect(debtBand(3000)).toBe('crushing');
  });

  it('divergence band: low (0-3), mid (4-7), high (8-10)', () => {
    expect(divergenceBand(0)).toBe('low');
    expect(divergenceBand(3)).toBe('low');
    expect(divergenceBand(4)).toBe('mid');
    expect(divergenceBand(7)).toBe('mid');
    expect(divergenceBand(8)).toBe('high');
    expect(divergenceBand(10)).toBe('high');
  });

  it('dominantTier picks the largest tier; ties fall back to mid (t2)', () => {
    expect(dominantTier({
      acceptedT1: 1, acceptedT2: 0, acceptedT3: 0,
      declined: 0, succeeded: 0, failed: 0,
    })).toBe('t1');
    expect(dominantTier({
      acceptedT1: 0, acceptedT2: 0, acceptedT3: 5,
      declined: 0, succeeded: 5, failed: 0,
    })).toBe('t3');
    expect(dominantTier({
      acceptedT1: 2, acceptedT2: 2, acceptedT3: 0,
      declined: 0, succeeded: 0, failed: 0,
    })).toBe('t2'); // tie → middle
    expect(dominantTier({
      acceptedT1: 0, acceptedT2: 0, acceptedT3: 0,
      declined: 10, succeeded: 0, failed: 0,
    })).toBe('t2'); // pure decline → middle (no clear lean)
  });
});

describe('EpilogueComposer — pickAxes from state', () => {
  it('reads all four axes from the current state', () => {
    setSnakeEyesState({
      ...getSnakeEyesState(),
      debt: 0,
      lastMissionDivergence: 9,
      theresStatus: 'cashed_out',
      pactbookTally: {
        acceptedT1: 0, acceptedT2: 0, acceptedT3: 4,
        declined: 0, succeeded: 4, failed: 0,
      },
    });
    const axes = pickAxes(getSnakeEyesState());
    expect(axes).toEqual({
      debt: 'settled',
      divergence: 'high',
      theris: 'cashed_out',
      tally: 't3',
    });
  });
});

describe('EpilogueComposer — fragment coverage', () => {
  it('has exactly 11 fragments (3 + 3 + 2 + 3)', () => {
    expect(Object.keys(EPILOGUE_FRAGMENTS.debt).length).toBe(3);
    expect(Object.keys(EPILOGUE_FRAGMENTS.divergence).length).toBe(3);
    expect(Object.keys(EPILOGUE_FRAGMENTS.theris).length).toBe(2);
    expect(Object.keys(EPILOGUE_FRAGMENTS.tally).length).toBe(3);
    expect(3 + 3 + 2 + 3).toBe(11);
  });

  it('every fragment is non-empty and ends with a period', () => {
    const all = [
      ...Object.values(EPILOGUE_FRAGMENTS.debt),
      ...Object.values(EPILOGUE_FRAGMENTS.divergence),
      ...Object.values(EPILOGUE_FRAGMENTS.theris),
      ...Object.values(EPILOGUE_FRAGMENTS.tally),
    ];
    expect(all.length).toBe(11);
    for (const f of all) {
      expect(f.length).toBeGreaterThan(20);
      expect(f.endsWith('.')).toBe(true);
    }
  });
});

describe('EpilogueComposer — composition', () => {
  it('concatenates the four fragments in fixed order', () => {
    const axes: EpilogueAxes = {
      debt: 'settled',
      divergence: 'low',
      theris: 'cashed_out',
      tally: 't1',
    };
    const out = composeFromAxes(axes);
    expect(out).toContain(EPILOGUE_FRAGMENTS.debt.settled);
    expect(out).toContain(EPILOGUE_FRAGMENTS.divergence.low);
    expect(out).toContain(EPILOGUE_FRAGMENTS.theris.cashed_out);
    expect(out).toContain(EPILOGUE_FRAGMENTS.tally.t1);
    // Order: debt before divergence before theris before tally.
    expect(out.indexOf(EPILOGUE_FRAGMENTS.debt.settled))
      .toBeLessThan(out.indexOf(EPILOGUE_FRAGMENTS.divergence.low));
    expect(out.indexOf(EPILOGUE_FRAGMENTS.divergence.low))
      .toBeLessThan(out.indexOf(EPILOGUE_FRAGMENTS.theris.cashed_out));
    expect(out.indexOf(EPILOGUE_FRAGMENTS.theris.cashed_out))
      .toBeLessThan(out.indexOf(EPILOGUE_FRAGMENTS.tally.t1));
  });

  it('reads from current state when called without args', () => {
    setSnakeEyesState({
      ...getSnakeEyesState(),
      debt: -50, // settled
      lastMissionDivergence: 0, // low
      theresStatus: 'with_ardax',
      pactbookTally: {
        acceptedT1: 5, acceptedT2: 0, acceptedT3: 0,
        declined: 0, succeeded: 5, failed: 0,
      },
    });
    const out = composeEpilogue();
    expect(out).toContain(EPILOGUE_FRAGMENTS.debt.settled);
    expect(out).toContain(EPILOGUE_FRAGMENTS.divergence.low);
    expect(out).toContain(EPILOGUE_FRAGMENTS.theris.with_ardax);
    expect(out).toContain(EPILOGUE_FRAGMENTS.tally.t1);
  });

  it('all 54 reachable combinations compose without error or empty output', () => {
    const debts = ['settled', 'lingering', 'crushing'] as const;
    const divs = ['low', 'mid', 'high'] as const;
    const therris = ['with_ardax', 'cashed_out'] as const;
    const tiers = ['t1', 't2', 't3'] as const;
    let count = 0;
    for (const d of debts) {
      for (const dv of divs) {
        for (const t of therris) {
          for (const ti of tiers) {
            const out = composeFromAxes({ debt: d, divergence: dv, theris: t, tally: ti });
            expect(out.length).toBeGreaterThan(80);
            count++;
          }
        }
      }
    }
    expect(count).toBe(54);
  });
});
