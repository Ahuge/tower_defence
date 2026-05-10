/**
 * Smoke tests for the Mechanical campaign content. Mirrors the
 * arcane.test.ts structure — catches regressions where a mission
 * archetype gets renamed, an objective predicate stops compiling, or
 * the lineup drifts from the spec.
 */
import { describe, it, expect } from 'vitest';
import { MECHANICAL_CAMPAIGN } from './mechanical';
import { getCampaign, listCampaigns, isCampaignComplete } from './index';
import { getArchetype, isArchetypeStub } from './MissionArchetypes';
import type { MissionResult } from './CampaignDef';

const FRESH_RESULT: MissionResult = {
  won: true, wave: 30, durationMs: 5 * 60 * 1000,
  livesRemaining: 20, livesStart: 20,
  goldRemaining: 500, goldEarned: 2000,
  towerCount: 12, perfectRun: true, custom: {},
};

describe('Mechanical campaign — shape', () => {
  it('has exactly 10 missions', () => {
    expect(MECHANICAL_CAMPAIGN.missions.length).toBe(10);
  });

  it('mission idx values are 0..9 in order', () => {
    MECHANICAL_CAMPAIGN.missions.forEach((m, i) => expect(m.idx).toBe(i));
  });

  it('all mission ids are unique', () => {
    const ids = new Set(MECHANICAL_CAMPAIGN.missions.map(m => m.id));
    expect(ids.size).toBe(10);
  });

  it('uses no stub archetypes', () => {
    for (const m of MECHANICAL_CAMPAIGN.missions) {
      expect(isArchetypeStub(m.archetype)).toBe(false);
    }
  });

  it('every archetype referenced is registered', () => {
    for (const m of MECHANICAL_CAMPAIGN.missions) {
      expect(() => getArchetype(m.archetype)).not.toThrow();
    }
  });

  it('every mission has a story + name', () => {
    for (const m of MECHANICAL_CAMPAIGN.missions) {
      expect(m.name).toBeTruthy();
      expect(m.story.length).toBeGreaterThan(20);
    }
  });

  it('uses base_defense, attacker, and heist archetypes', () => {
    const archetypes = MECHANICAL_CAMPAIGN.missions.map(m => m.archetype);
    expect(archetypes).toContain('base_defense');
    expect(archetypes).toContain('attacker');
    expect(archetypes).toContain('heist');
  });
});

describe('Mechanical campaign — registered', () => {
  it('getCampaign returns the def by faction id', () => {
    expect(getCampaign('mechanical')?.factionId).toBe('mechanical');
  });

  it('listCampaigns includes the mechanical campaign', () => {
    const ids = listCampaigns().map(c => c.factionId);
    expect(ids).toContain('mechanical');
  });
});

describe('Mechanical mission predicates', () => {
  const saboteurVanguard = MECHANICAL_CAMPAIGN.missions[7];
  const theAce = MECHANICAL_CAMPAIGN.missions[8];

  it('saboteur_vanguard star2 fires when 8+ raiders broke through', () => {
    const r = { ...FRESH_RESULT, custom: { attackerLeaks: 8 } };
    expect(saboteurVanguard.objectives.star2!.predicate(r)).toBe(true);
  });

  it('saboteur_vanguard star2 fails when fewer than 8 broke through', () => {
    const r = { ...FRESH_RESULT, custom: { attackerLeaks: 7 } };
    expect(saboteurVanguard.objectives.star2!.predicate(r)).toBe(false);
  });

  it('the_ace star2 fires when heroHpMin >= 0.5 on a win', () => {
    const r = { ...FRESH_RESULT, custom: { heroHpMin: 0.6 } };
    expect(theAce.objectives.star2!.predicate(r)).toBe(true);
  });

  it('the_ace star2 fails on a loss even with full HP', () => {
    const r = { ...FRESH_RESULT, won: false, custom: { heroHpMin: 1 } };
    expect(theAce.objectives.star2!.predicate(r)).toBe(false);
  });
});

describe('isCampaignComplete — mechanical', () => {
  it('false when no missions are won', () => {
    expect(isCampaignComplete('mechanical', {})).toBe(false);
  });

  it('true when every mission has at least 1 star', () => {
    const stars: { [i: number]: number } = {};
    for (let i = 0; i < 10; i++) stars[i] = 1;
    expect(isCampaignComplete('mechanical', stars)).toBe(true);
  });
});
