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

describe('Mech narrative-gameplay buildout', () => {
  // Pins that the narrative-promised creeps actually appear in the
  // wave scripts. Without these, a future refactor could silently
  // strip the flagship walkers from M5 and the mission would render
  // generic creeps again — the bug the buildout was fixing.

  it('M5 Iron Convoy wave script ships 5 flagship-walker waves', () => {
    const m5 = MECHANICAL_CAMPAIGN.missions[4];
    expect(m5.id).toBe('iron_convoy');
    expect(m5.overrides.waveScript, 'M5 should have a custom wave script').toBeDefined();
    const waves = m5.overrides.waveScript!;
    expect(waves.length).toBe(5);
    for (const w of waves) {
      const hasFlagship = w.groups.some(g => g.creepType === 'mech_flagship_walker');
      expect(hasFlagship, `wave ${w.wave} should contain a flagship`).toBe(true);
      expect(w.isBoss).toBe(true);
    }
  });

  it('M5 wave 1 is a cold-open — single flagship, no escort', () => {
    const m5 = MECHANICAL_CAMPAIGN.missions[4];
    const wave1 = m5.overrides.waveScript![0];
    expect(wave1.groups.length).toBe(1);
    expect(wave1.groups[0].creepType).toBe('mech_flagship_walker');
    expect(wave1.groups[0].count).toBe(1);
  });

  it('M5 final wave has the largest escort (escalation)', () => {
    const m5 = MECHANICAL_CAMPAIGN.missions[4];
    const waves = m5.overrides.waveScript!;
    const totalCreepsIn = (i: number) =>
      waves[i].groups.reduce((s, g) => s + g.count, 0);
    expect(totalCreepsIn(4)).toBeGreaterThan(totalCreepsIn(0));
    expect(totalCreepsIn(4)).toBeGreaterThanOrEqual(totalCreepsIn(3));
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
