/**
 * Tests for the Mech-campaign creep variants added in the
 * Iron Cascade narrative-gameplay buildout.
 *
 * Pins the shape of each new creep type so a future balance pass
 * or rename surfaces explicitly. Cross-pins the M5 flagship's
 * forward-declared `mech_pylon_vent_armor` trait id with what the
 * commit-2 trait handler registers.
 */
import { describe, it, expect } from 'vitest';
import { getCreepType } from './CreepTypes';

const MECH_IDS = [
  'mech_scout',
  'mech_skiff',
  'mech_light_walker',
  'mech_armored_walker',
  'mech_flagship_walker',
  'mech_ace_pilot',
] as const;

describe('Mech creep variants — existence', () => {
  for (const id of MECH_IDS) {
    it(`getCreepType('${id}') resolves`, () => {
      expect(() => getCreepType(id)).not.toThrow();
      const c = getCreepType(id);
      expect(c.id).toBe(id);
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.description.length).toBeGreaterThan(0);
    });
  }
});

describe('Mech creep variants — narrative-faithful stats', () => {
  it('Scout is fast and fragile (narrative: "fast riders")', () => {
    const c = getCreepType('mech_scout');
    expect(c.speedMultiplier).toBeGreaterThan(1.5);
    expect(c.hpMultiplier).toBeLessThan(1);
    expect(c.armor).toBe('light');
  });

  it('Skiff is grouped (narrative: arrives in pairs)', () => {
    const c = getCreepType('mech_skiff');
    expect(c.count).toBeGreaterThanOrEqual(2);
  });

  it('Light Walker is medium-armored standard infantry', () => {
    const c = getCreepType('mech_light_walker');
    expect(c.armor).toBe('medium');
    expect(c.speedMultiplier).toBeLessThan(1);
  });

  it('Armored Walker is heavy + slow', () => {
    const c = getCreepType('mech_armored_walker');
    expect(c.armor).toBe('heavy');
    expect(c.speedMultiplier).toBeLessThan(0.9);
    expect(c.hpMultiplier).toBeGreaterThan(2);
  });

  it('Flagship Walker is boss-tier HP + heavy + carries vent-armor trait', () => {
    const c = getCreepType('mech_flagship_walker');
    expect(c.hpMultiplier).toBeGreaterThanOrEqual(8);
    expect(c.armor).toBe('heavy');
    const ventTrait = c.traits.find(t => t.id === 'mech_pylon_vent_armor');
    expect(ventTrait, 'flagship walker should carry the vent-armor trait').toBeDefined();
    expect(ventTrait?.bonusDamageMult).toBeGreaterThan(1);
  });

  it('Ace Pilot is shielded + fast for a boss', () => {
    const c = getCreepType('mech_ace_pilot');
    expect(c.traits.find(t => t.id === 'shield')).toBeDefined();
    expect(c.speedMultiplier).toBeGreaterThan(0.9);
  });
});

describe('Mech creep variants — difficulty scaling', () => {
  it('Boss-tier creeps pin countMult to 1', () => {
    for (const id of ['mech_flagship_walker', 'mech_ace_pilot'] as const) {
      const out = getCreepType(id).applyDifficulty({
        toughness: 1, speed: 1, count: 5, goldMult: 1, toughnessPerWave: 0,
      });
      expect(out.countMult, `${id} should not multi-spawn`).toBe(1);
    }
  });

  it('Heavy walkers grant higher gold than light infantry', () => {
    const light = getCreepType('mech_light_walker').applyDifficulty({
      toughness: 1, speed: 1, count: 1, goldMult: 1, toughnessPerWave: 0,
    });
    const heavy = getCreepType('mech_armored_walker').applyDifficulty({
      toughness: 1, speed: 1, count: 1, goldMult: 1, toughnessPerWave: 0,
    });
    expect(heavy.goldMult).toBeGreaterThan(light.goldMult);
  });

  it('Scout grants below-baseline gold (cheap kills)', () => {
    const out = getCreepType('mech_scout').applyDifficulty({
      toughness: 1, speed: 1, count: 1, goldMult: 1, toughnessPerWave: 0,
    });
    expect(out.goldMult).toBeLessThan(1);
  });
});
