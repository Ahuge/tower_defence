/**
 * AttackerPreps — defender preparation types (Plan 12 v2 Phase 2.5).
 *
 * Each wave the defender announces a prep — a category they're
 * countering this wave. Creeps matching that category take an HP
 * penalty, baked in at wave-build time. Player sees the prep in the
 * composer header BEFORE picking, and is rewarded for adapting their
 * composition each wave instead of dumping the same heavy combo.
 *
 * Adds the second strategic axis the v2 mode was missing: it isn't
 * "find the right creeps for this defender layout" anymore, it's
 * "find the right creeps for THIS WAVE'S prep against this layout."
 *
 * Preps are pure data — multipliers applied in AttackerWaveBuilder.
 * No engine state needed beyond per-mission prep order + per-wave lookup.
 */

import type { CreepType } from './CreepTypes';
import { CREEP_TYPES } from './CreepTypes';

export interface AttackerPrepDef {
  id: string;
  label: string;
  /** One-line description shown in composer header. Concrete: e.g.
   *  "Heavy creeps -40% HP this wave" — not "the defender adapts." */
  description: string;
  /** Per-armor-class HP multiplier. 1.0 = no penalty. Default 1.0
   *  for armors not listed. */
  hpMultByArmor?: { light?: number; medium?: number; heavy?: number };
  /** Per-creep-type HP multiplier overlay. Applied AFTER armor mult.
   *  Used for hard counters (Anti-Air on flying). */
  hpMultByCreepType?: Record<string, number>;
}

/** v2 prep set — 5 preps cycled across the 10-wave attacker mission.
 *  Tuned so each prep makes 1-3 palette entries painful and the
 *  others neutral. No prep makes ALL creeps painful — the player
 *  always has options. */
export const ATTACKER_PREPS: Record<string, AttackerPrepDef> = {
  anti_light: {
    id: 'anti_light',
    label: 'Anti-Light',
    description: 'Light creeps -35% HP this wave',
    hpMultByArmor: { light: 0.65 },
  },
  anti_medium: {
    id: 'anti_medium',
    label: 'Anti-Medium',
    description: 'Medium creeps -35% HP this wave',
    hpMultByArmor: { medium: 0.65 },
  },
  anti_heavy: {
    id: 'anti_heavy',
    label: 'Anti-Heavy',
    description: 'Heavy creeps -40% HP this wave',
    hpMultByArmor: { heavy: 0.6 },
  },
  anti_air: {
    id: 'anti_air',
    label: 'Anti-Air',
    description: 'Flying creeps -65% HP this wave',
    hpMultByCreepType: { flying: 0.35 },
  },
  sustained_fire: {
    id: 'sustained_fire',
    label: 'Sustained Fire',
    description: 'All creeps -15% HP this wave',
    hpMultByArmor: { light: 0.85, medium: 0.85, heavy: 0.85 },
  },
};

/** Resolve a prep id to its def, or null if not registered. */
export function getPrep(id: string | null | undefined): AttackerPrepDef | null {
  if (!id) return null;
  return ATTACKER_PREPS[id] ?? null;
}

/** Compute the HP multiplier this prep applies to a given creep type.
 *  Returns 1.0 when the prep doesn't affect this creep. Pulled into
 *  a helper so AttackerWaveBuilder + the composer UI can both call it
 *  without duplicating the lookup logic. */
export function prepHpMultiplier(prep: AttackerPrepDef | null, creepTypeId: string): number {
  if (!prep) return 1.0;
  const ct: CreepType | undefined = CREEP_TYPES[creepTypeId];
  let mult = 1.0;
  if (prep.hpMultByArmor && ct) {
    const armorMult = prep.hpMultByArmor[ct.armor];
    if (armorMult !== undefined) mult *= armorMult;
  }
  if (prep.hpMultByCreepType) {
    const typeMult = prep.hpMultByCreepType[creepTypeId];
    if (typeMult !== undefined) mult *= typeMult;
  }
  return mult;
}

/** Default 10-wave prep order for the M8 first-encounter mission.
 *  Cycles all 5 preps with no two adjacent waves the same; gives the
 *  player a fresh constraint every wave without overwhelming them. */
export const M8_DEFAULT_PREP_ORDER: string[] = [
  'sustained_fire', // W1: gentle intro
  'anti_heavy',     // W2
  'anti_light',     // W3
  'anti_medium',    // W4
  'anti_air',       // W5
  'anti_heavy',     // W6
  'sustained_fire', // W7
  'anti_light',     // W8
  'anti_heavy',     // W9
  'sustained_fire', // W10
];
