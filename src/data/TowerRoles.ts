/**
 * Tower roles — a structured vocabulary the AI uses to reason about
 * towers without hard-coding tower ids.
 *
 * Two-layer design:
 *   1. Every `TowerType` gets a `role` (field on TowerType is optional,
 *      authoring-time override). Most towers don't set one.
 *   2. `getTowerRole()` derives the role from traits + stats when the
 *      explicit field is missing. Keeps role assignments in sync with
 *      tower behaviour changes automatically — if someone slaps a
 *      `splash_damage` trait on a tower, it becomes 'dps-splash' the
 *      next frame without a manual tag update.
 *
 * The Balanced brain uses this to group its tower pool into buckets:
 * walls for mazing, damage towers for the kill zone, slows for
 * priority targets, etc. Categories are intentionally coarse — brains
 * that want finer shading (armor-piercing vs anti-swarm) can inspect
 * `traits` directly on top of the role.
 */
import { TowerType } from './TowerTypes';
import { hasTrait } from '../systems/traits/Trait';

export type TowerRole =
  /** Barely attacks; used purely for mazing. Examples: mech_wall,
   *  mil_sandbag, mil_wire, mech_spike. */
  | 'wall'
  /** Single-target damage. The bread and butter of most factions. */
  | 'dps-single'
  /** Area-of-effect damage via `splash_damage` trait. Mortars,
   *  cannons, meteors. */
  | 'dps-splash'
  /** Applies a slow debuff on hit. Low/no damage, high value in
   *  kill zones where it stacks with splash damage. */
  | 'slow'
  /** Passive radius effect. Aura damage, speed buffs, debuffs. */
  | 'aura'
  /** Catch-all for towers that don't fit cleanly — mobile units,
   *  portals, ultimates with unique mechanics. Treated cautiously
   *  by brains (place when affordable but don't build a strategy
   *  around them). */
  | 'utility';

/**
 * Resolve a tower's role. Returns the explicit `role` field if set;
 * otherwise infers from traits + stats. The priority of checks
 * matters — a tower with `mobile_unit` is utility even if it also
 * deals splash damage, because the mazing strategy can't rely on
 * it sitting in a fixed cell.
 */
export function getTowerRole(tower: TowerType): TowerRole {
  if (tower.role) return tower.role;

  // Mobile units move — they're not useful for mazing or fixed kill
  // zones. Classify as utility so the brain treats them as gravy.
  if (hasTrait(tower.traits, 'mobile_unit')) return 'utility';

  // Wall-like: the tower's value is its physical footprint, not its
  // damage output. Two patterns qualify:
  //   - Pure blocker (damage=0 and no-attack cadence). Examples:
  //     mil_sandbag, mil_wire.
  //   - Token attack for flavor but cost/DPS is so low it's clearly
  //     meant as a maze-filler, not a damage source. Example:
  //     mech_wall (cost 10, 2 damage, 2000ms fire rate = 1 DPS).
  // In both cases an active slow or aura takes precedence — those
  // towers earn their zone cell through utility, not their footprint.
  const dps = tower.damage * 1000 / Math.max(tower.fireRate, 1);
  const isNonAttacking = tower.damage === 0 && tower.fireRate >= 10000;
  const isFillerWall = tower.cost <= 15 && dps < 3;
  const isSpecialized = hasTrait(tower.traits, 'slow_on_hit') || hasAnyAura(tower);
  if ((isNonAttacking || isFillerWall) && !isSpecialized) {
    return 'wall';
  }

  // Slow takes priority over damage-type classification — a slow
  // tower with tiny splash is primarily valued for the debuff.
  if (hasTrait(tower.traits, 'slow_on_hit')) return 'slow';

  // Auras sit in the middle of clumps and apply effects to nearby
  // towers or creeps without direct fire.
  if (hasAnyAura(tower)) return 'aura';

  if (hasTrait(tower.traits, 'splash_damage')) return 'dps-splash';

  // Default: single-target damage dealer. Matches arrow, sniper,
  // most faction core towers.
  return 'dps-single';
}

/** Any trait whose id starts with 'tower_aura' or ends in '_aura'. */
function hasAnyAura(tower: TowerType): boolean {
  return tower.traits.some(t =>
    t.id.startsWith('tower_aura') || t.id.endsWith('_aura'),
  );
}

/**
 * Group a tower pool by role. Convenience for brains that want
 * "give me all the walls in this faction" without iterating and
 * classifying themselves.
 */
export function groupByRole(towers: TowerType[]): Record<TowerRole, TowerType[]> {
  const groups: Record<TowerRole, TowerType[]> = {
    'wall': [], 'dps-single': [], 'dps-splash': [],
    'slow': [], 'aura': [], 'utility': [],
  };
  for (const t of towers) groups[getTowerRole(t)].push(t);
  return groups;
}
