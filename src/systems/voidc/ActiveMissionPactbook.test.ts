/**
 * Tests for ActiveMissionPactbook — the bridge between PactbookPanel
 * (in DOM land) and the missionState aspect (in scene land).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  beginMissionPactbook,
  getMissionPactbook,
  getActiveWager,
  isMissionPactbookResolved,
  resolveActiveWagerAtMissionEnd,
  _clearMissionPactbook,
} from './ActiveMissionPactbook';
import {
  resetSnakeEyesState,
  getSnakeEyesState,
  INITIAL_DEBT,
} from './DebtTracker';
import type { MissionResult } from '../campaign/types';

// Wager effect handlers need to be registered before any draw because
// the Pactbook deck cross-references them. Side-effect import.
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

describe('ActiveMissionPactbook — lifecycle', () => {
  beforeEach(() => {
    resetSnakeEyesState();
    _clearMissionPactbook();
  });

  it('starts with no active Pactbook', () => {
    expect(getMissionPactbook()).toBeNull();
    expect(getActiveWager()).toBeNull();
    expect(isMissionPactbookResolved()).toBe(true); // no panel = vacuous resolved
  });

  it('beginMissionPactbook draws 3 cards and exposes the instance', () => {
    const pb = beginMissionPactbook(seqRng(0.1, 0.5, 0.9));
    expect(pb.getDrawn().length).toBe(3);
    expect(getMissionPactbook()).toBe(pb);
    expect(isMissionPactbookResolved()).toBe(false);
  });

  it('isMissionPactbookResolved flips when player accepts', () => {
    const pb = beginMissionPactbook(seqRng(0.1));
    expect(isMissionPactbookResolved()).toBe(false);
    pb.accept(pb.getDrawn()[0].id);
    expect(isMissionPactbookResolved()).toBe(true);
    expect(getActiveWager()).toEqual(pb.getDrawn()[0]);
  });

  it('isMissionPactbookResolved flips when player declines', () => {
    const pb = beginMissionPactbook(seqRng(0.1));
    pb.declineAll();
    expect(isMissionPactbookResolved()).toBe(true);
    expect(getActiveWager()).toBeNull();
  });

  it('beginMissionPactbook replaces the prior instance (retry / re-init)', () => {
    const a = beginMissionPactbook(seqRng(0.1));
    a.accept(a.getDrawn()[0].id);
    expect(getActiveWager()).not.toBeNull();

    // Retry — second beginMissionPactbook replaces the first.
    const b = beginMissionPactbook(seqRng(0.5));
    expect(getMissionPactbook()).toBe(b);
    expect(getMissionPactbook()).not.toBe(a);
    // The new Pactbook has its own un-resolved state.
    expect(b.isResolved()).toBe(false);
    expect(getActiveWager()).toBeNull();
  });
});

describe('ActiveMissionPactbook — resolveAtMissionEnd', () => {
  beforeEach(() => {
    resetSnakeEyesState();
    _clearMissionPactbook();
  });

  it('returns null when no Pactbook was active', () => {
    expect(resolveActiveWagerAtMissionEnd(fakeResult())).toBeNull();
  });

  it('returns null when player declined all', () => {
    const pb = beginMissionPactbook(seqRng(0.1));
    pb.declineAll();
    expect(resolveActiveWagerAtMissionEnd(fakeResult())).toBeNull();
  });

  it('returns the accepted Wager and clears state', () => {
    const pb = beginMissionPactbook(seqRng(0.1));
    const drawnId = pb.getDrawn()[0].id;
    pb.accept(drawnId);
    const resolved = resolveActiveWagerAtMissionEnd(fakeResult());
    expect(resolved?.id).toBe(drawnId);
    // State cleared after resolve.
    expect(getMissionPactbook()).toBeNull();
    expect(getActiveWager()).toBeNull();
  });

  it('applies win-paydown on a victory with accepted wager', () => {
    const pb = beginMissionPactbook(seqRng(0.1));
    const wager = pb.getDrawn()[0];
    pb.accept(wager.id);

    const before = getSnakeEyesState().debt;
    resolveActiveWagerAtMissionEnd(fakeResult({ won: true }));
    const after = getSnakeEyesState().debt;

    // Paydown is negative delta; debt should drop. Exact amount
    // depends on the wager's tier (divergence = tier).
    expect(after).toBeLessThan(before);
  });

  it('does NOT pay down on a loss', () => {
    const pb = beginMissionPactbook(seqRng(0.1));
    pb.accept(pb.getDrawn()[0].id);

    const before = getSnakeEyesState().debt;
    resolveActiveWagerAtMissionEnd(fakeResult({ won: false }));
    const after = getSnakeEyesState().debt;

    expect(after).toBe(before);
  });

  it('updates the pactbook tally success/fail counter', () => {
    resetSnakeEyesState();
    expect(getSnakeEyesState().pactbookTally.succeeded).toBe(0);

    const pb = beginMissionPactbook(seqRng(0.1));
    pb.accept(pb.getDrawn()[0].id);
    resolveActiveWagerAtMissionEnd(fakeResult({ won: true, perfectRun: true }));

    // At least one of succeeded/failed must have incremented (the
    // exact counter depends on the wager's successCriteria).
    const tally = getSnakeEyesState().pactbookTally;
    expect(tally.succeeded + tally.failed).toBe(1);
  });
});

describe('ActiveMissionPactbook — decline penalty (smoke)', () => {
  beforeEach(() => {
    resetSnakeEyesState();
    _clearMissionPactbook();
  });

  it('declining all three applies the decline penalty (+20 Debt)', () => {
    // Sanity: this confirms the Pactbook is genuinely calling
    // applyDeclinePenalty when the player declines. Not unique to
    // ActiveMissionPactbook but worth a regression pin here.
    expect(getSnakeEyesState().debt).toBe(INITIAL_DEBT);
    const pb = beginMissionPactbook(seqRng(0.1));
    pb.declineAll();
    expect(getSnakeEyesState().debt).toBe(INITIAL_DEBT + 20);
  });
});
