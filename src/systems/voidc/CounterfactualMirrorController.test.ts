/**
 * Tests for CounterfactualMirrorController — M10 three-setpiece
 * state machine + boss-HP scaling.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  CounterfactualMirrorController,
  counterfactualBossHp,
} from './CounterfactualMirrorController';
import {
  resetSnakeEyesState,
  getSnakeEyesState,
  setSnakeEyesState,
} from './DebtTracker';

beforeEach(() => {
  resetSnakeEyesState();
});

describe('counterfactualBossHp — scaling formula', () => {
  it('base HP at zero tally is 5000', () => {
    expect(counterfactualBossHp({
      acceptedT1: 0, acceptedT2: 0, acceptedT3: 0,
      declined: 0, succeeded: 0, failed: 0,
    })).toBe(5000);
  });

  it('accepted-T3 contributes +400 each', () => {
    expect(counterfactualBossHp({
      acceptedT1: 0, acceptedT2: 0, acceptedT3: 5,
      declined: 0, succeeded: 0, failed: 0,
    })).toBe(5000 + 5 * 400);
  });

  it('declines starve him: -150 each', () => {
    expect(counterfactualBossHp({
      acceptedT1: 0, acceptedT2: 0, acceptedT3: 0,
      declined: 4, succeeded: 0, failed: 0,
    })).toBe(5000 - 4 * 150);
  });

  it('clamps to [2000, 12000]', () => {
    expect(counterfactualBossHp({
      acceptedT1: 0, acceptedT2: 0, acceptedT3: 0,
      declined: 100, succeeded: 0, failed: 0,
    })).toBe(2000);
    expect(counterfactualBossHp({
      acceptedT1: 0, acceptedT2: 0, acceptedT3: 100,
      declined: 0, succeeded: 0, failed: 0,
    })).toBe(12000);
  });

  it('mixed-tier run computes additively', () => {
    expect(counterfactualBossHp({
      acceptedT1: 3, acceptedT2: 2, acceptedT3: 1,
      declined: 1, succeeded: 0, failed: 0,
    })).toBe(5000 + 300 + 400 + 400 - 150);
  });
});

describe('CounterfactualMirrorController — initial state', () => {
  it('starts on the approach setpiece', () => {
    const c = new CounterfactualMirrorController();
    expect(c.getStage()).toBe('approach');
    expect(c.isWon()).toBe(false);
    expect(c.isLost()).toBe(false);
  });

  it('boss HP is read from current SnakeEyesState tally', () => {
    setSnakeEyesState({
      ...getSnakeEyesState(),
      pactbookTally: {
        acceptedT1: 0, acceptedT2: 0, acceptedT3: 4,
        declined: 0, succeeded: 4, failed: 0,
      },
    });
    const c = new CounterfactualMirrorController();
    const s = c.getSnapshot();
    expect(s.bossHpMax).toBe(5000 + 4 * 400);
    expect(s.bossHpRemaining).toBe(s.bossHpMax);
  });
});

describe('CounterfactualMirrorController — Approach setpiece', () => {
  it('advances waves; transitions to mirror_lane after total', () => {
    const c = new CounterfactualMirrorController({ approachWavesTotal: 3 });
    c.advanceApproachWave();
    expect(c.getStage()).toBe('approach');
    c.advanceApproachWave();
    expect(c.getStage()).toBe('approach');
    c.advanceApproachWave();
    expect(c.getStage()).toBe('mirror_lane');
  });

  it('failApproach moves to lost_approach', () => {
    const c = new CounterfactualMirrorController();
    c.failApproach();
    expect(c.getStage()).toBe('lost_approach');
    expect(c.isLost()).toBe(true);
  });

  it('failApproach is a no-op once past approach', () => {
    const c = new CounterfactualMirrorController({ approachWavesTotal: 1 });
    c.advanceApproachWave();
    expect(c.getStage()).toBe('mirror_lane');
    c.failApproach();
    expect(c.getStage()).toBe('mirror_lane');
  });
});

describe('CounterfactualMirrorController — Mirror Lane setpiece', () => {
  it('completeMirrorLane on player-win → table', () => {
    const c = new CounterfactualMirrorController({ approachWavesTotal: 1, mirrorLaneLength: 1 });
    c.advanceApproachWave();
    expect(c.getStage()).toBe('mirror_lane');
    c.getMirrorLaneController().recordPlayerClear(0);
    c.completeMirrorLane();
    expect(c.getStage()).toBe('table');
  });

  it('completeMirrorLane on cf-win → lost_mirror_lane', () => {
    const c = new CounterfactualMirrorController({ approachWavesTotal: 1, mirrorLaneLength: 1 });
    c.advanceApproachWave();
    c.getMirrorLaneController().recordCounterfactualClear(0);
    c.completeMirrorLane();
    expect(c.getStage()).toBe('lost_mirror_lane');
    expect(c.isLost()).toBe(true);
  });

  it('completeMirrorLane with no resolution yet is a no-op', () => {
    const c = new CounterfactualMirrorController({ approachWavesTotal: 1, mirrorLaneLength: 5 });
    c.advanceApproachWave();
    c.completeMirrorLane();
    expect(c.getStage()).toBe('mirror_lane');
  });

  it('Divergence-bias drawn from lastMissionDivergence', () => {
    setSnakeEyesState({ ...getSnakeEyesState(), lastMissionDivergence: 10 });
    const c = new CounterfactualMirrorController({ approachWavesTotal: 1 });
    c.advanceApproachWave();
    const p = c.getMirrorLaneController().getPressureCoefficients();
    // bias = 10 / 10 = 1.0 → player +50%, cf -50%
    expect(p.playerPressure).toBe(1.5);
    expect(p.counterfactualPressure).toBe(0.5);
  });

  it('applyDivergenceBias=false ignores lastMissionDivergence', () => {
    setSnakeEyesState({ ...getSnakeEyesState(), lastMissionDivergence: 10 });
    const c = new CounterfactualMirrorController({
      approachWavesTotal: 1,
      applyDivergenceBias: false,
    });
    c.advanceApproachWave();
    const p = c.getMirrorLaneController().getPressureCoefficients();
    expect(p.playerPressure).toBe(1.0);
    expect(p.counterfactualPressure).toBe(1.0);
  });
});

describe('CounterfactualMirrorController — mirrorLaneWonOutright', () => {
  it('true when player wins by ≥2 waves', () => {
    const c = new CounterfactualMirrorController({ approachWavesTotal: 1, mirrorLaneLength: 3 });
    c.advanceApproachWave();
    const ml = c.getMirrorLaneController();
    ml.recordPlayerClear(0);
    ml.recordPlayerClear(0);
    ml.recordPlayerClear(0);
    c.completeMirrorLane();
    // player 3 - cf 0 = gap 3 ≥ 2 → outright
    expect(c.mirrorLaneWonOutright()).toBe(true);
  });

  it('false when player wins by only 1 wave', () => {
    const c = new CounterfactualMirrorController({ approachWavesTotal: 1, mirrorLaneLength: 2 });
    c.advanceApproachWave();
    const ml = c.getMirrorLaneController();
    ml.recordPlayerClear(0);
    ml.recordCounterfactualClear(0);
    ml.recordPlayerClear(0);
    c.completeMirrorLane();
    // player 2, cf 1 = gap 1 < 2 → not outright
    expect(c.mirrorLaneWonOutright()).toBe(false);
  });

  it('false when counterfactual won', () => {
    const c = new CounterfactualMirrorController({ approachWavesTotal: 1, mirrorLaneLength: 1 });
    c.advanceApproachWave();
    c.getMirrorLaneController().recordCounterfactualClear(0);
    c.completeMirrorLane();
    expect(c.mirrorLaneWonOutright()).toBe(false);
  });
});

describe('CounterfactualMirrorController — Table setpiece', () => {
  it('damageBoss subtracts HP; killing transitions to complete', () => {
    const c = new CounterfactualMirrorController({ approachWavesTotal: 1, mirrorLaneLength: 1 });
    c.advanceApproachWave();
    c.getMirrorLaneController().recordPlayerClear(0);
    c.completeMirrorLane();
    expect(c.getStage()).toBe('table');
    const max = c.getSnapshot().bossHpMax;
    c.damageBoss(max - 1);
    expect(c.getSnapshot().bossHpRemaining).toBe(1);
    expect(c.getStage()).toBe('table');
    c.damageBoss(10);
    expect(c.getSnapshot().bossHpRemaining).toBe(0);
    expect(c.getStage()).toBe('complete');
    expect(c.isWon()).toBe(true);
  });

  it('negative / NaN damage is rejected', () => {
    const c = new CounterfactualMirrorController({ approachWavesTotal: 1, mirrorLaneLength: 1 });
    c.advanceApproachWave();
    c.getMirrorLaneController().recordPlayerClear(0);
    c.completeMirrorLane();
    const hp = c.getSnapshot().bossHpRemaining;
    c.damageBoss(-100);
    c.damageBoss(NaN);
    c.damageBoss(0);
    expect(c.getSnapshot().bossHpRemaining).toBe(hp);
  });

  it('damageBoss is no-op outside table stage', () => {
    const c = new CounterfactualMirrorController({ approachWavesTotal: 5 });
    const hp = c.getSnapshot().bossHpRemaining;
    c.damageBoss(100);
    expect(c.getSnapshot().bossHpRemaining).toBe(hp);
  });

  it('failTable → lost_table', () => {
    const c = new CounterfactualMirrorController({ approachWavesTotal: 1, mirrorLaneLength: 1 });
    c.advanceApproachWave();
    c.getMirrorLaneController().recordPlayerClear(0);
    c.completeMirrorLane();
    c.failTable();
    expect(c.getStage()).toBe('lost_table');
    expect(c.isLost()).toBe(true);
  });
});

describe('CounterfactualMirrorController — end-to-end happy path', () => {
  it('walks Approach → Mirror Lane → Table → complete', () => {
    const c = new CounterfactualMirrorController({ approachWavesTotal: 2, mirrorLaneLength: 2 });
    // Approach
    c.advanceApproachWave();
    c.advanceApproachWave();
    expect(c.getStage()).toBe('mirror_lane');
    // Mirror Lane
    c.getMirrorLaneController().recordPlayerClear(0);
    c.getMirrorLaneController().recordPlayerClear(0);
    c.completeMirrorLane();
    expect(c.getStage()).toBe('table');
    // Table
    const hp = c.getSnapshot().bossHpRemaining;
    c.damageBoss(hp);
    expect(c.getStage()).toBe('complete');
    expect(c.isWon()).toBe(true);
    expect(c.isLost()).toBe(false);
  });
});
