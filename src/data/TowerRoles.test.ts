/**
 * TowerRoles — spec for the auto-derivation heuristics.
 *
 * The Balanced bot brain relies on `getTowerRole()` returning a
 * sensible category for every tower in TOWER_TYPES without requiring
 * manual tagging. These tests lock in the heuristic's behaviour so
 * future trait changes don't silently break the brain's planning
 * (e.g., a wall tower that accidentally picks up a damage trait
 * and gets classified as dps-single would stop being placed during
 * the maze-building phase).
 */
import { describe, it, expect } from 'vitest';
import { getTowerRole, groupByRole } from './TowerRoles';
import { TOWER_TYPES } from './TowerTypes';

describe('getTowerRole', () => {
  it('classifies wall-like towers as "wall"', () => {
    // mech_wall has damage=0 and no attack traits — pure blocker.
    expect(getTowerRole(TOWER_TYPES.mech_wall)).toBe('wall');
    expect(getTowerRole(TOWER_TYPES.mil_sandbag)).toBe('wall');
  });

  it('classifies splash towers as "dps-splash"', () => {
    expect(getTowerRole(TOWER_TYPES.cannon)).toBe('dps-splash');
    expect(getTowerRole(TOWER_TYPES.mech_mortar)).toBe('dps-splash');
  });

  it('classifies slow towers as "slow"', () => {
    // Frost trap has damage=0 but applies slow_on_hit — that trumps
    // the "no-damage, no-fire-rate" wall heuristic.
    expect(getTowerRole(TOWER_TYPES.slow)).toBe('slow');
    expect(getTowerRole(TOWER_TYPES.arcane_frost)).toBe('slow');
  });

  it('classifies aura towers as "aura"', () => {
    // nature_spore has tower_aura_damage trait.
    expect(getTowerRole(TOWER_TYPES.nature_spore)).toBe('aura');
  });

  it('classifies mobile units as "utility" regardless of other traits', () => {
    // mil_heavy has both mobile_unit and splash_damage — mobile wins
    // because a moving tower can't anchor a maze or kill zone.
    expect(getTowerRole(TOWER_TYPES.mil_heavy)).toBe('utility');
  });

  it('defaults to "dps-single" for standard damage towers', () => {
    expect(getTowerRole(TOWER_TYPES.arrow)).toBe('dps-single');
    expect(getTowerRole(TOWER_TYPES.sniper)).toBe('dps-single');
  });

  it('respects the explicit `role` field when set', () => {
    // Simulate an authored override by spreading an existing tower
    // and forcing a different role.
    const override = { ...TOWER_TYPES.arrow, role: 'utility' as const };
    expect(getTowerRole(override)).toBe('utility');
  });

  it('classifies every registered tower without crashing', () => {
    for (const t of Object.values(TOWER_TYPES)) {
      const role = getTowerRole(t);
      // Each tower gets one of the six valid roles — if a new role
      // is added, this assertion needs extending.
      expect(['wall', 'dps-single', 'dps-splash', 'slow', 'aura', 'utility']).toContain(role);
    }
  });
});

describe('groupByRole', () => {
  it('partitions a faction pool into role buckets', () => {
    // Arcane has: bolt (dps-single), frost (slow), storm (dps-splash),
    // focus (dps-single?), drain (dps-single?), meteor (dps-splash),
    // nova (dps-splash — splash + slow, splash wins via priority).
    const arcane = ['arcane_bolt', 'arcane_frost', 'arcane_storm']
      .map(id => TOWER_TYPES[id]);
    const groups = groupByRole(arcane);
    expect(groups['dps-single']).toContain(TOWER_TYPES.arcane_bolt);
    expect(groups['slow']).toContain(TOWER_TYPES.arcane_frost);
    expect(groups['dps-splash']).toContain(TOWER_TYPES.arcane_storm);
    // Non-matching buckets stay empty.
    expect(groups['wall']).toEqual([]);
  });
});
