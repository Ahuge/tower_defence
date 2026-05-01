import { describe, it, expect } from 'vitest';
import { getArchetype, isArchetypeStub, listArchetypes } from './MissionArchetypes';

describe('MissionArchetypes — registry shape', () => {
  it('every archetype has id, label, blurb, baseMode, defaults', () => {
    for (const a of listArchetypes()) {
      expect(a.id).toBeTruthy();
      expect(a.label).toBeTruthy();
      expect(a.blurb).toBeTruthy();
      expect(a.baseMode).toBeTruthy();
      expect(a.defaults).toBeDefined();
    }
  });

  it('Plan 10 v1 archetypes are not stubbed', () => {
    for (const id of ['standard', 'boss_rush', 'speedrun', 'frugal', 'hero_vs_boss', 'coop_with_bot', 'final_showdown', 'restriction'] as const) {
      expect(isArchetypeStub(id)).toBe(false);
    }
  });

  it('Plans 11/12/13 archetypes are stubbed', () => {
    expect(isArchetypeStub('base_defense')).toBe(true);
    expect(isArchetypeStub('attacker')).toBe(true);
    expect(isArchetypeStub('heist')).toBe(true);
  });

  it('frugal applies a goldStartMult of 0.5 + maxTowers cap', () => {
    const a = getArchetype('frugal');
    expect(a.defaults.goldStartMult).toBe(0.5);
    expect(a.defaults.restrictions?.maxTowers).toBe(6);
  });

  it('hero_vs_boss runs on hero_defense base mode', () => {
    expect(getArchetype('hero_vs_boss').baseMode).toBe('hero_defense');
  });

  it('final_showdown is 30 waves on hard', () => {
    const a = getArchetype('final_showdown');
    expect(a.defaults.waveCount).toBe(30);
    expect(a.defaults.difficulty).toBe('hard');
  });
});
