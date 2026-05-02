/**
 * Smoke tests for the Arcane campaign content. Catches regressions
 * where a mission archetype gets accidentally renamed, an objective
 * predicate stops compiling, or the mission lineup drifts from the
 * spec.
 */
import { describe, it, expect } from 'vitest';
import { ARCANE_CAMPAIGN } from './arcane';
import { getCampaign, listCampaigns, isCampaignComplete } from './index';
import { getArchetype, isArchetypeStub } from './MissionArchetypes';
import type { MissionResult } from './CampaignDef';

const FRESH_RESULT: MissionResult = {
  won: true, wave: 30, durationMs: 5 * 60 * 1000,
  livesRemaining: 20, livesStart: 20,
  goldRemaining: 500, goldEarned: 2000,
  towerCount: 12, perfectRun: true, custom: {},
};

describe('Arcane campaign — shape', () => {
  it('has exactly 10 missions', () => {
    expect(ARCANE_CAMPAIGN.missions.length).toBe(10);
  });

  it('mission idx values are 0..9 in order', () => {
    ARCANE_CAMPAIGN.missions.forEach((m, i) => expect(m.idx).toBe(i));
  });

  it('all mission ids are unique', () => {
    const ids = new Set(ARCANE_CAMPAIGN.missions.map(m => m.id));
    expect(ids.size).toBe(10);
  });

  it('uses no stub archetypes (Plan 14 v1 does not depend on Plans 11/12/13)', () => {
    for (const m of ARCANE_CAMPAIGN.missions) {
      expect(isArchetypeStub(m.archetype)).toBe(false);
    }
  });

  it('every archetype referenced is registered', () => {
    for (const m of ARCANE_CAMPAIGN.missions) {
      expect(() => getArchetype(m.archetype)).not.toThrow();
    }
  });

  it('every mission has a story + name', () => {
    for (const m of ARCANE_CAMPAIGN.missions) {
      expect(m.name).toBeTruthy();
      expect(m.story.length).toBeGreaterThan(20);
    }
  });

  it('every mission specifies a mapId', () => {
    for (const m of ARCANE_CAMPAIGN.missions) {
      expect(m.overrides.mapId).toBeTruthy();
    }
  });

  it('every star objective predicate is callable', () => {
    for (const m of ARCANE_CAMPAIGN.missions) {
      if (m.objectives.star2) {
        expect(typeof m.objectives.star2.predicate(FRESH_RESULT)).toBe('boolean');
      }
      if (m.objectives.star3) {
        expect(typeof m.objectives.star3.predicate(FRESH_RESULT)).toBe('boolean');
      }
    }
  });
});

describe('Campaign registry', () => {
  it('Arcane is registered', () => {
    expect(getCampaign('arcane')).toBe(ARCANE_CAMPAIGN);
  });

  it('Nature / Void return null until their content ships', () => {
    expect(getCampaign('nature')).toBeNull();
    expect(getCampaign('void')).toBeNull();
  });

  it('listCampaigns includes arcane and mechanical', () => {
    const ids = listCampaigns().map(c => c.factionId);
    expect(ids).toContain('arcane');
    expect(ids).toContain('mechanical');
  });
});

describe('Arcane mission predicates — counter-driven (Plan 14 v1.1)', () => {
  const ritualCircle = ARCANE_CAMPAIGN.missions[2];
  const breachRelay = ARCANE_CAMPAIGN.missions[7];

  it('ritual_circle star2 fires when channelsInterrupted >= 3 and the player won', () => {
    const r = { ...FRESH_RESULT, custom: { channelsInterrupted: 3 } };
    expect(ritualCircle.objectives.star2!.predicate(r)).toBe(true);
  });

  it('ritual_circle star2 fails when channelsInterrupted < 3', () => {
    const r = { ...FRESH_RESULT, custom: { channelsInterrupted: 2 } };
    expect(ritualCircle.objectives.star2!.predicate(r)).toBe(false);
  });

  it('ritual_circle star2 fails on a loss even with many interrupts', () => {
    const r = { ...FRESH_RESULT, won: false, custom: { channelsInterrupted: 10 } };
    expect(ritualCircle.objectives.star2!.predicate(r)).toBe(false);
  });

  it('ritual_circle star3 fires when no Archmage completed any channel', () => {
    const r = { ...FRESH_RESULT, custom: { channelsCompleted: 0 } };
    expect(ritualCircle.objectives.star3!.predicate(r)).toBe(true);
  });

  it('ritual_circle star3 fails when at least one channel completed', () => {
    const r = { ...FRESH_RESULT, custom: { channelsCompleted: 1 } };
    expect(ritualCircle.objectives.star3!.predicate(r)).toBe(false);
  });

  it('breach_relay star2 fires when 8+ raiders broke through', () => {
    const r = { ...FRESH_RESULT, custom: { attackerLeaks: 8 } };
    expect(breachRelay.objectives.star2!.predicate(r)).toBe(true);
  });

  it('breach_relay star2 fails when fewer than 8 broke through', () => {
    const r = { ...FRESH_RESULT, custom: { attackerLeaks: 7 } };
    expect(breachRelay.objectives.star2!.predicate(r)).toBe(false);
  });

  it('breach_relay star3 requires 12+ raiders', () => {
    const r12 = { ...FRESH_RESULT, custom: { attackerLeaks: 12 } };
    const r11 = { ...FRESH_RESULT, custom: { attackerLeaks: 11 } };
    expect(breachRelay.objectives.star3!.predicate(r12)).toBe(true);
    expect(breachRelay.objectives.star3!.predicate(r11)).toBe(false);
  });
});

describe('isCampaignComplete', () => {
  it('false when no missions are won', () => {
    expect(isCampaignComplete('arcane', {})).toBe(false);
  });

  it('false when only some missions are won', () => {
    expect(isCampaignComplete('arcane', { 0: 1, 1: 1, 2: 1 })).toBe(false);
  });

  it('true when every mission has at least 1 star', () => {
    const stars: { [i: number]: number } = {};
    for (let i = 0; i < 10; i++) stars[i] = 1;
    expect(isCampaignComplete('arcane', stars)).toBe(true);
  });

  it('false for a faction whose campaign does not exist yet', () => {
    expect(isCampaignComplete('nature', {})).toBe(false);
  });
});
