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

  it('Plan 11 base_defense, Plan 12 attacker, and Plan 13 heist are no longer stubs (v1 ships)', () => {
    expect(isArchetypeStub('base_defense')).toBe(false);
    expect(isArchetypeStub('attacker')).toBe(false);
    expect(isArchetypeStub('heist')).toBe(false);
  });

  it('attacker default mapId is attacker_assault', () => {
    expect(getArchetype('attacker').defaults.mapId).toBe('attacker_assault');
  });

  it('base_defense default mapId is base_arena', () => {
    expect(getArchetype('base_defense').defaults.mapId).toBe('base_arena');
  });

  it('heist default mapId is heist_vault', () => {
    expect(getArchetype('heist').defaults.mapId).toBe('heist_vault');
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
