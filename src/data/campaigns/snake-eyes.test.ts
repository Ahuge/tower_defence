/**
 * Smoke tests for the Snake Eyes campaign content. Mirrors the
 * greenward.test.ts / mechanical.test.ts structure — catches
 * regressions where a mission archetype gets renamed, an objective
 * predicate stops compiling, or the lineup drifts from the plan.
 *
 * The campaign is a skeleton at Phase 1 commit 2 of the execution
 * plan (docs/snake-eyes-campaign-plan.md). The M10 final_void
 * archetype is registered but its three-setpiece controller +
 * Mirror Lane paired-grid runtime land in commit 17. Mission stories
 * are plan-doc placeholders; writer-reviewed 3-versions prose lands
 * in commits 11/12.
 */
import { describe, it, expect } from 'vitest';
import { SNAKE_EYES_CAMPAIGN } from './snake-eyes';
import { getCampaign } from './index';
import { getArchetype, isArchetypeStub } from './MissionArchetypes';

describe('Snake Eyes campaign — shape', () => {
  it('has exactly 10 missions', () => {
    expect(SNAKE_EYES_CAMPAIGN.missions.length).toBe(10);
  });

  it('mission idx values are 0..9 in order', () => {
    SNAKE_EYES_CAMPAIGN.missions.forEach((m, i) => expect(m.idx).toBe(i));
  });

  it('all mission ids are unique', () => {
    const ids = new Set(SNAKE_EYES_CAMPAIGN.missions.map(m => m.id));
    expect(ids.size).toBe(10);
  });

  it('every mission uses a real (non-stub) archetype', () => {
    for (const m of SNAKE_EYES_CAMPAIGN.missions) {
      expect(isArchetypeStub(m.archetype)).toBe(false);
    }
  });

  it('M10 references the final_void archetype', () => {
    const m10 = SNAKE_EYES_CAMPAIGN.missions[9];
    expect(m10.archetype).toBe('final_void');
  });

  it('every archetype referenced is registered (real or stub)', () => {
    for (const m of SNAKE_EYES_CAMPAIGN.missions) {
      expect(() => getArchetype(m.archetype)).not.toThrow();
    }
  });

  it('every mission has a non-empty story + name', () => {
    for (const m of SNAKE_EYES_CAMPAIGN.missions) {
      expect(typeof m.name).toBe('string');
      expect(m.name.length).toBeGreaterThan(0);
      // story can be string or function; both should be present.
      expect(m.story).toBeTruthy();
    }
  });

  it('every mission has star2 + star3 objectives with labels + predicates', () => {
    for (const m of SNAKE_EYES_CAMPAIGN.missions) {
      expect(m.objectives.star2).toBeDefined();
      expect(typeof m.objectives.star2!.label).toBe('string');
      expect(typeof m.objectives.star2!.predicate).toBe('function');
      expect(m.objectives.star3).toBeDefined();
      expect(typeof m.objectives.star3!.label).toBe('string');
      expect(typeof m.objectives.star3!.predicate).toBe('function');
    }
  });

  it('every mission overrides specifies a mapId', () => {
    for (const m of SNAKE_EYES_CAMPAIGN.missions) {
      expect(m.overrides.mapId).toBeTruthy();
    }
  });

  it('locks defaultPlayerFaction to void', () => {
    expect(SNAKE_EYES_CAMPAIGN.defaultPlayerFaction).toBe('void');
  });

  it('targets the void faction', () => {
    expect(SNAKE_EYES_CAMPAIGN.factionId).toBe('void');
  });
});

describe('Snake Eyes campaign — registry', () => {
  it('is registered under getCampaign("void")', () => {
    expect(getCampaign('void')).toBe(SNAKE_EYES_CAMPAIGN);
  });
});

describe('Snake Eyes campaign — archetype lineup matches plan', () => {
  // Locks the M1-M10 archetype assignment from the plan doc so a
  // future edit to a mission's archetype must be deliberate (the
  // test fails loudly rather than silently shifting the run).
  const expected = [
    'interrupt',       // M1 Last Hand at Talavar
    'interrupt',       // M2 Road West
    'interrupt',       // M3 Silvermine Creek
    'interrupt',       // M4 Ferryman's Game
    'speedrun',        // M5 Wheel of Cipher
    'coop_with_bot',   // M6 Theris's Goodbye
    'restriction',     // M7 Mirror Walkers
    'frugal',          // M8 Snake Eyes (proper)
    'attacker',        // M9 Burning the Pactbook
    'final_void',      // M10 The Counterfactual's Mirror
  ];
  for (let i = 0; i < expected.length; i++) {
    it(`M${i + 1} archetype is ${expected[i]}`, () => {
      expect(SNAKE_EYES_CAMPAIGN.missions[i].archetype).toBe(expected[i]);
    });
  }
});
