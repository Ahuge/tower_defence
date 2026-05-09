import { describe, it, expect } from 'vitest';
import { ATTACKER_PREPS, getPrep, prepHpMultiplier, M8_DEFAULT_PREP_ORDER } from './AttackerPreps';

describe('AttackerPreps lookup', () => {
  it('getPrep resolves known ids', () => {
    expect(getPrep('anti_heavy')?.id).toBe('anti_heavy');
  });

  it('getPrep returns null for unknown / null / undefined', () => {
    expect(getPrep('not_a_prep')).toBeNull();
    expect(getPrep(null)).toBeNull();
    expect(getPrep(undefined)).toBeNull();
  });
});

describe('prepHpMultiplier — armor-class lookup', () => {
  it('Anti-Heavy hits boss/armored/regenerator (heavy armor)', () => {
    const prep = getPrep('anti_heavy')!;
    expect(prepHpMultiplier(prep, 'boss')).toBeCloseTo(0.6);
    expect(prepHpMultiplier(prep, 'armored')).toBeCloseTo(0.6);
    expect(prepHpMultiplier(prep, 'regenerator')).toBeCloseTo(0.6);
  });

  it('Anti-Heavy leaves light/medium creeps alone', () => {
    const prep = getPrep('anti_heavy')!;
    expect(prepHpMultiplier(prep, 'fast')).toBe(1.0); // light
    expect(prepHpMultiplier(prep, 'standard')).toBe(1.0); // medium
  });

  it('Anti-Light hits skirmisher/wolfpack/smoker/glider', () => {
    const prep = getPrep('anti_light')!;
    expect(prepHpMultiplier(prep, 'fast')).toBeCloseTo(0.65);
    expect(prepHpMultiplier(prep, 'swarm')).toBeCloseTo(0.65);
    expect(prepHpMultiplier(prep, 'evasive')).toBeCloseTo(0.65);
  });
});

describe('prepHpMultiplier — creep-type override', () => {
  it('Anti-Air stacks armor + creep-type lookup for flying', () => {
    const prep = getPrep('anti_air')!;
    // No armor mult; only creep-type override (0.35).
    expect(prepHpMultiplier(prep, 'flying')).toBeCloseTo(0.35);
    // Other creeps unaffected (no armor mult).
    expect(prepHpMultiplier(prep, 'standard')).toBe(1.0);
  });
});

describe('Sustained Fire — broad penalty', () => {
  it('hits all armor classes equally', () => {
    const prep = getPrep('sustained_fire')!;
    expect(prepHpMultiplier(prep, 'fast')).toBeCloseTo(0.85);
    expect(prepHpMultiplier(prep, 'standard')).toBeCloseTo(0.85);
    expect(prepHpMultiplier(prep, 'boss')).toBeCloseTo(0.85);
  });
});

describe('M8 default prep order', () => {
  it('has 10 entries (one per wave)', () => {
    expect(M8_DEFAULT_PREP_ORDER.length).toBe(10);
  });

  it('every entry resolves to a registered prep', () => {
    for (const id of M8_DEFAULT_PREP_ORDER) {
      expect(ATTACKER_PREPS[id]).toBeDefined();
    }
  });

  it('no two adjacent waves share the same prep', () => {
    for (let i = 1; i < M8_DEFAULT_PREP_ORDER.length; i++) {
      expect(M8_DEFAULT_PREP_ORDER[i]).not.toBe(M8_DEFAULT_PREP_ORDER[i - 1]);
    }
  });
});
