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

  it('every mission uses a real (non-stub) archetype', () => {
    for (const m of GREENWARD_CAMPAIGN.missions) {
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

describe('Greenward Act II missions — Consecration wiring', () => {
  it('M4 declares one Mercy (Cethric) + one Ceremony', () => {
    const m = GREENWARD_CAMPAIGN.missions[3];
    const modes = m.overrides.greenwardRules?.ruins.map(r => r.mode) ?? [];
    expect(modes).toContain('mercy');
    expect(modes).toContain('ceremony');
    expect(modes).toHaveLength(2);
  });

  it('M5 declares one Ceremony (headwater) + two Siege', () => {
    const m = GREENWARD_CAMPAIGN.missions[4];
    const modes = m.overrides.greenwardRules?.ruins.map(r => r.mode) ?? [];
    expect(modes.filter(x => x === 'ceremony')).toHaveLength(1);
    expect(modes.filter(x => x === 'siege')).toHaveLength(2);
    expect(m.overrides.greenwardRules?.ruins.find(r => r.id === 'headwater')).toBeTruthy();
  });

  it('M6 declares three Ceremony ruins (the warm spot)', () => {
    const m = GREENWARD_CAMPAIGN.missions[5];
    const modes = m.overrides.greenwardRules?.ruins.map(r => r.mode) ?? [];
    expect(modes.every(x => x === 'ceremony')).toBe(true);
    expect(modes).toHaveLength(3);
  });

  it('M7 declares one Mercy (bride) + one Siege', () => {
    const m = GREENWARD_CAMPAIGN.missions[6];
    const modes = m.overrides.greenwardRules?.ruins.map(r => r.mode) ?? [];
    expect(modes).toContain('mercy');
    expect(modes).toContain('siege');
    expect(modes).toHaveLength(2);
  });

  it('every Act II ruin has a unique id within its mission', () => {
    for (const idx of [3, 4, 5, 6]) {
      const ruins = GREENWARD_CAMPAIGN.missions[idx].overrides.greenwardRules?.ruins ?? [];
      const ids = new Set(ruins.map(r => r.id));
      expect(ids.size).toBe(ruins.length);
    }
  });
});

describe('Greenward Act III pre-finale (M8-M9) — Consecration wiring', () => {
  it('M8 declares one Siege (court) + one Mercy (Child)', () => {
    const m = GREENWARD_CAMPAIGN.missions[7];
    const modes = m.overrides.greenwardRules?.ruins.map(r => r.mode) ?? [];
    expect(modes).toContain('siege');
    expect(modes).toContain('mercy');
    expect(modes).toHaveLength(2);
    expect(m.overrides.greenwardRules?.ruins.find(r => r.id === 'the_child')?.mode).toBe('mercy');
  });

  it('M9 declares a single Siege ruin (watchtower)', () => {
    const m = GREENWARD_CAMPAIGN.missions[8];
    const ruins = m.overrides.greenwardRules?.ruins ?? [];
    expect(ruins).toHaveLength(1);
    expect(ruins[0].mode).toBe('siege');
    expect(ruins[0].id).toBe('watchtower');
  });
});

describe('Greenward M10 finale (Caer Lythen) — three setpieces', () => {
  it('declares Courtyard / Nave / Throne ruins in that order', () => {
    const m = GREENWARD_CAMPAIGN.missions[9];
    const ids = m.overrides.greenwardRules?.ruins.map(r => r.id) ?? [];
    expect(ids).toEqual(['courtyard', 'nave', 'throne']);
  });

  it('Courtyard is always Siege', () => {
    const m = GREENWARD_CAMPAIGN.missions[9];
    const courtyard = m.overrides.greenwardRules?.ruins.find(r => r.id === 'courtyard');
    expect(courtyard?.mode).toBe('siege');
  });

  it('Throne is always Siege (consequence-defense after the Nave)', () => {
    const m = GREENWARD_CAMPAIGN.missions[9];
    const throne = m.overrides.greenwardRules?.ruins.find(r => r.id === 'throne');
    expect(throne?.mode).toBe('siege');
  });

  // Nave's mode is mutated at runtime by the GreenwardFinaleController
  // (lands in a follow-up commit). The data here is a placeholder; the
  // assertion below documents the intent.
  it('Nave initial-mode is a placeholder ("mercy" in data; runtime overrides)', () => {
    const m = GREENWARD_CAMPAIGN.missions[9];
    const nave = m.overrides.greenwardRules?.ruins.find(r => r.id === 'nave');
    expect(nave?.mode).toBe('mercy');
  });
});
