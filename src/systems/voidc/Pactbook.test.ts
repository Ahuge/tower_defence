/**
 * Tests for Pactbook — deck shape, weighted draws, accept/decline
 * lifecycle, tally writeback, success-criteria resolution.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  Pactbook,
  PACTBOOK_DECK,
  MIRROR_WAGER_ID,
  DEFAULT_WEIGHTS,
  getWager,
  deckOfTier,
  type TierWeights,
  type Wager,
} from './Pactbook';
import {
  resetSnakeEyesState,
  getSnakeEyesState,
  INITIAL_DEBT,
  DECLINE_PENALTY,
} from './DebtTracker';
import type { MissionResult } from '../../data/campaigns/CampaignDef';

beforeEach(() => {
  resetSnakeEyesState();
});

const FRESH_RESULT: MissionResult = {
  won: true,
  wave: 10,
  durationMs: 60_000,
  livesRemaining: 20,
  livesStart: 20,
  goldRemaining: 100,
  goldEarned: 500,
  towerCount: 5,
  perfectRun: false,
  custom: {},
};

// Deterministic RNG: cycles through a fixed sequence of [0, 1).
function seq(...values: number[]): () => number {
  let i = 0;
  return () => {
    const v = values[i % values.length];
    i++;
    return v;
  };
}

describe('Pactbook deck — shape', () => {
  it('has exactly 12 cards', () => {
    expect(PACTBOOK_DECK.length).toBe(12);
  });

  it('has 4 cards per tier', () => {
    expect(deckOfTier(1).length).toBe(4);
    expect(deckOfTier(2).length).toBe(4);
    expect(deckOfTier(3).length).toBe(4);
  });

  it('all card ids are unique', () => {
    const ids = new Set(PACTBOOK_DECK.map(w => w.id));
    expect(ids.size).toBe(PACTBOOK_DECK.length);
  });

  it('every card has a non-empty name and flavor', () => {
    for (const w of PACTBOOK_DECK) {
      expect(w.name.length).toBeGreaterThan(0);
      expect(w.flavor.length).toBeGreaterThan(0);
    }
  });

  it('Mirror Wager is registered (M10 excludes by this id)', () => {
    expect(() => getWager(MIRROR_WAGER_ID)).not.toThrow();
    expect(getWager(MIRROR_WAGER_ID).tier).toBe(3);
  });

  it('getWager throws for unknown id', () => {
    expect(() => getWager('not_a_card')).toThrow();
  });

  it('every effectId matches the card id (identity convention for shipped 12)', () => {
    for (const w of PACTBOOK_DECK) {
      expect(w.effectId).toBe(w.id);
    }
  });
});

describe('Pactbook — draw', () => {
  it('default draw returns 3 cards', () => {
    const drawn = new Pactbook({ rng: seq(0.1, 0.2, 0.3) }).draw();
    expect(drawn.length).toBe(3);
  });

  it('draw count is configurable', () => {
    expect(new Pactbook({ rng: seq(0.1, 0.5, 0.9, 0.05, 0.95) })
      .draw(5).length).toBe(5);
  });

  it('draw 0 returns an empty hand', () => {
    expect(new Pactbook({ rng: seq(0.1) }).draw(0).length).toBe(0);
  });

  it('uniform weights cover all tiers (sanity: not all-tier-3 by accident)', () => {
    // Roll a deterministic spread across the [0,1) range — should
    // touch all three tier-buckets at uniform weights.
    const tiers = new Set<number>();
    const pb = new Pactbook({ rng: seq(0.05, 0.4, 0.95, 0.5, 0.25) });
    const drawn = pb.draw(5, DEFAULT_WEIGHTS);
    drawn.forEach(w => tiers.add(w.tier));
    expect(tiers.size).toBeGreaterThanOrEqual(2);
  });

  it('forced-tier-3 weights only draw tier-3 cards', () => {
    const weights: TierWeights = [0, 0, 1];
    const pb = new Pactbook({ rng: seq(0.05, 0.5, 0.95) });
    const drawn = pb.draw(3, weights);
    for (const w of drawn) expect(w.tier).toBe(3);
  });

  it('forced-tier-1 weights only draw tier-1 cards', () => {
    const weights: TierWeights = [1, 0, 0];
    const pb = new Pactbook({ rng: seq(0.05, 0.5, 0.95) });
    const drawn = pb.draw(3, weights);
    for (const w of drawn) expect(w.tier).toBe(1);
  });

  it('excludeIds removes specified cards from the pool', () => {
    const weights: TierWeights = [0, 0, 1]; // only tier-3
    const pb = new Pactbook({ rng: seq(0.0001, 0.5, 0.9999) });
    const drawn = pb.draw(20, weights, [MIRROR_WAGER_ID]);
    for (const w of drawn) expect(w.id).not.toBe(MIRROR_WAGER_ID);
  });

  it('a fresh draw clears prior selection state (regression)', () => {
    const pb = new Pactbook({ rng: seq(0.5) });
    pb.draw(3);
    const first = pb.getDrawn()[0];
    pb.accept(first.id);
    pb.draw(3);
    expect(pb.getSelected()).toBeNull();
    expect(pb.isDeclined()).toBe(false);
  });
});

describe('Pactbook — accept', () => {
  it('records the selected Wager', () => {
    const pb = new Pactbook({ rng: seq(0.1) });
    pb.draw();
    const target = pb.getDrawn()[0];
    expect(pb.accept(target.id)).toBe(target);
    expect(pb.getSelected()).toBe(target);
  });

  it('bumps acceptedT1/T2/T3 by tier', () => {
    // Force tier-2 only.
    const pb = new Pactbook({ rng: seq(0.5) });
    pb.draw(3, [0, 1, 0]);
    pb.accept(pb.getDrawn()[0].id);
    expect(getSnakeEyesState().pactbookTally.acceptedT2).toBe(1);
    expect(getSnakeEyesState().pactbookTally.acceptedT1).toBe(0);
    expect(getSnakeEyesState().pactbookTally.acceptedT3).toBe(0);
  });

  it('throws if called before draw', () => {
    expect(() => new Pactbook().accept('coin_flip')).toThrow();
  });

  it('throws if the id is not in the drawn hand', () => {
    const pb = new Pactbook({ rng: seq(0.5) });
    pb.draw(3, [0, 1, 0]); // tier 2 cards only
    expect(() => pb.accept('pact_of_zeros')).toThrow(); // tier 3, won't be in hand
  });

  it('throws on double-resolve (accept after accept)', () => {
    const pb = new Pactbook({ rng: seq(0.5) });
    pb.draw();
    pb.accept(pb.getDrawn()[0].id);
    expect(() => pb.accept(pb.getDrawn()[1].id)).toThrow();
  });

  it('throws on accept after declineAll', () => {
    const pb = new Pactbook({ rng: seq(0.5) });
    pb.draw();
    pb.declineAll();
    expect(() => pb.accept(pb.getDrawn()[0].id)).toThrow();
  });
});

describe('Pactbook — declineAll', () => {
  it('applies the Debt decline penalty + bumps declined tally', () => {
    const pb = new Pactbook({ rng: seq(0.5) });
    pb.draw();
    pb.declineAll();
    expect(getSnakeEyesState().debt).toBe(INITIAL_DEBT + DECLINE_PENALTY);
    expect(getSnakeEyesState().pactbookTally.declined).toBe(1);
  });

  it('throws if called before draw', () => {
    expect(() => new Pactbook().declineAll()).toThrow();
  });

  it('throws on declineAll after accept', () => {
    const pb = new Pactbook({ rng: seq(0.5) });
    pb.draw();
    pb.accept(pb.getDrawn()[0].id);
    expect(() => pb.declineAll()).toThrow();
  });
});

describe('Pactbook — resolveOutcome', () => {
  it('default success criterion is r.won', () => {
    const pb = new Pactbook({ rng: seq(0.5) });
    pb.draw(3, [1, 0, 0]); // tier-1 only — default success
    pb.accept(pb.getDrawn()[0].id);
    const ok = pb.resolveOutcome(FRESH_RESULT);
    expect(ok).toBe(true);
    expect(getSnakeEyesState().pactbookTally.succeeded).toBe(1);
    expect(getSnakeEyesState().pactbookTally.failed).toBe(0);
  });

  it('default success criterion fails when mission lost', () => {
    const pb = new Pactbook({ rng: seq(0.5) });
    pb.draw(3, [1, 0, 0]);
    pb.accept(pb.getDrawn()[0].id);
    const ok = pb.resolveOutcome({ ...FRESH_RESULT, won: false });
    expect(ok).toBe(false);
    expect(getSnakeEyesState().pactbookTally.failed).toBe(1);
  });

  it('Hot Streak requires its custom flag', () => {
    // Force draws to be exactly Hot Streak.
    const pb = new Pactbook({ rng: () => 0 });
    // Filter to hot_streak only via forced pool — simulate by drawing
    // until we get one. With seq it's easier to find via the helper.
    const hot = getWager('hot_streak');
    // We can't force the draw to a specific card cleanly without
    // editing the deck; instead manually inject by walking the
    // accept-path: re-draw until we hit it, or skip the search by
    // testing the predicate directly.
    expect(hot.successCriteria!({ ...FRESH_RESULT, custom: {} })).toBe(false);
    expect(hot.successCriteria!({ ...FRESH_RESULT, custom: { hotStreakHit: true } })).toBe(true);
    expect(hot.successCriteria!({ ...FRESH_RESULT, won: false, custom: { hotStreakHit: true } })).toBe(false);
  });

  it('Inverted Stakes requires won + perfectRun', () => {
    const inv = getWager('inverted_stakes');
    expect(inv.successCriteria!({ ...FRESH_RESULT, perfectRun: false })).toBe(false);
    expect(inv.successCriteria!({ ...FRESH_RESULT, perfectRun: true })).toBe(true);
    expect(inv.successCriteria!({ ...FRESH_RESULT, won: false, perfectRun: true })).toBe(false);
  });

  it('Mirror Wager requires mirrorWagerWon custom flag', () => {
    const mw = getWager('mirror_wager');
    expect(mw.successCriteria!({ ...FRESH_RESULT, custom: {} })).toBe(false);
    expect(mw.successCriteria!({ ...FRESH_RESULT, custom: { mirrorWagerWon: true } })).toBe(true);
  });

  it('resolveOutcome is null + no tally bump when declined', () => {
    const pb = new Pactbook({ rng: seq(0.5) });
    pb.draw();
    pb.declineAll();
    const ok = pb.resolveOutcome(FRESH_RESULT);
    expect(ok).toBeNull();
    expect(getSnakeEyesState().pactbookTally.succeeded).toBe(0);
    expect(getSnakeEyesState().pactbookTally.failed).toBe(0);
  });

  it('resolveOutcome is null when nothing accepted yet', () => {
    const pb = new Pactbook({ rng: seq(0.5) });
    pb.draw();
    expect(pb.resolveOutcome(FRESH_RESULT)).toBeNull();
  });
});

describe('Pactbook — isResolved', () => {
  it('false on a fresh deck', () => {
    expect(new Pactbook().isResolved()).toBe(false);
  });

  it('true after accept', () => {
    const pb = new Pactbook({ rng: seq(0.5) });
    pb.draw();
    pb.accept(pb.getDrawn()[0].id);
    expect(pb.isResolved()).toBe(true);
  });

  it('true after declineAll', () => {
    const pb = new Pactbook({ rng: seq(0.5) });
    pb.draw();
    pb.declineAll();
    expect(pb.isResolved()).toBe(true);
  });
});

describe('Pactbook — end-to-end campaign tally', () => {
  it("counts an accept-and-succeed sequence", () => {
    const pb = new Pactbook({ rng: seq(0.5) });
    pb.draw(3, [1, 0, 0]); // tier 1
    pb.accept(pb.getDrawn()[0].id);
    pb.resolveOutcome(FRESH_RESULT); // won, no special criterion → success

    const tally = getSnakeEyesState().pactbookTally;
    expect(tally.acceptedT1).toBe(1);
    expect(tally.succeeded).toBe(1);
    expect(tally.failed).toBe(0);
    expect(tally.declined).toBe(0);
  });

  it("counts a decline sequence", () => {
    const pb = new Pactbook({ rng: seq(0.5) });
    pb.draw();
    pb.declineAll();
    pb.resolveOutcome(FRESH_RESULT);
    const tally = getSnakeEyesState().pactbookTally;
    expect(tally.declined).toBe(1);
    expect(tally.succeeded).toBe(0);
    expect(tally.acceptedT1 + tally.acceptedT2 + tally.acceptedT3).toBe(0);
  });
});
