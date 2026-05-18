/**
 * Smoke tests for the Greenward campaign content. Mirrors the
 * mechanical.test.ts structure — catches regressions where a mission
 * archetype gets renamed, an objective predicate stops compiling, or
 * the lineup drifts from the plan.
 *
 * The campaign is still a skeleton at Phase 1 commit 2 of the
 * execution plan (docs/greenward-campaign-plan.md). The M10
 * final_greenward archetype is intentionally a stub here — its
 * controller lands in Phase 3 commit 19. The test asserts the *non-
 * M10* missions reference real archetypes, and M10 references the
 * stub by name so we catch accidental archetype-id drift.
 */
import { describe, it, expect } from 'vitest';
import { GREENWARD_CAMPAIGN } from './greenward';
import { getCampaign } from './index';
import { getArchetype, isArchetypeStub } from './MissionArchetypes';

describe('Greenward campaign — shape', () => {
  it('has exactly 10 missions', () => {
    expect(GREENWARD_CAMPAIGN.missions.length).toBe(10);
  });

  it('mission idx values are 0..9 in order', () => {
    GREENWARD_CAMPAIGN.missions.forEach((m, i) => expect(m.idx).toBe(i));
  });

  it('all mission ids are unique', () => {
    const ids = new Set(GREENWARD_CAMPAIGN.missions.map(m => m.id));
    expect(ids.size).toBe(10);
  });

  it('non-finale missions use real (non-stub) archetypes', () => {
    for (let i = 0; i < 9; i++) {
      const m = GREENWARD_CAMPAIGN.missions[i];
      expect(isArchetypeStub(m.archetype)).toBe(false);
    }
  });

  it('M10 references the final_greenward archetype', () => {
    const m10 = GREENWARD_CAMPAIGN.missions[9];
    expect(m10.archetype).toBe('final_greenward');
  });

  it('every archetype referenced is registered (real or stub)', () => {
    for (const m of GREENWARD_CAMPAIGN.missions) {
      expect(() => getArchetype(m.archetype)).not.toThrow();
    }
  });

  it('every mission has a story + name', () => {
    for (const m of GREENWARD_CAMPAIGN.missions) {
      expect(m.name).toBeTruthy();
      expect(m.story.length).toBeGreaterThan(20);
    }
  });

  it('uses the Nature faction kit (defaultPlayerFaction)', () => {
    expect(GREENWARD_CAMPAIGN.defaultPlayerFaction).toBe('nature');
  });

  it('uses restriction, speedrun, coop_with_bot, frugal, boss_rush, attacker, interrupt archetypes', () => {
    const archetypes = GREENWARD_CAMPAIGN.missions.map(m => m.archetype);
    expect(archetypes).toContain('restriction');
    expect(archetypes).toContain('speedrun');
    expect(archetypes).toContain('coop_with_bot');
    expect(archetypes).toContain('frugal');
    expect(archetypes).toContain('boss_rush');
    expect(archetypes).toContain('attacker');
    expect(archetypes).toContain('interrupt');
  });

  it('all missions point to greenward_* map ids', () => {
    for (const m of GREENWARD_CAMPAIGN.missions) {
      expect(m.overrides.mapId).toMatch(/^greenward_/);
    }
  });
});

describe('Campaign registry — Greenward', () => {
  it('getCampaign returns the Greenward def for the nature faction', () => {
    expect(getCampaign('nature')).toBe(GREENWARD_CAMPAIGN);
  });
});

describe('Greenward Act I missions — Consecration wiring', () => {
  it('M1 declares one Ceremony ruin', () => {
    const m = GREENWARD_CAMPAIGN.missions[0];
    expect(m.overrides.greenwardRules?.ruins).toHaveLength(1);
    expect(m.overrides.greenwardRules?.ruins[0].mode).toBe('ceremony');
  });

  it('M2 declares two Ceremony + one Siege', () => {
    const m = GREENWARD_CAMPAIGN.missions[1];
    const modes = m.overrides.greenwardRules?.ruins.map(r => r.mode) ?? [];
    expect(modes.filter(x => x === 'ceremony')).toHaveLength(2);
    expect(modes.filter(x => x === 'siege')).toHaveLength(1);
  });

  it('M3 declares one Siege + one Mercy (first Mercy of the campaign)', () => {
    const m = GREENWARD_CAMPAIGN.missions[2];
    const modes = m.overrides.greenwardRules?.ruins.map(r => r.mode) ?? [];
    expect(modes).toContain('siege');
    expect(modes).toContain('mercy');
    expect(modes).toHaveLength(2);
  });

  it('every Act I ruin has a unique id within its mission', () => {
    for (const idx of [0, 1, 2]) {
      const ruins = GREENWARD_CAMPAIGN.missions[idx].overrides.greenwardRules?.ruins ?? [];
      const ids = new Set(ruins.map(r => r.id));
      expect(ids.size).toBe(ruins.length);
    }
  });
});
