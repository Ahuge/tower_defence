import { FactionId } from '../Factions';

export interface CombatUnitDef {
  id: string;
  name: string;
  faction: FactionId;
  /** Gold cost */
  costGold: number;
  /** Gas cost (0 for basic units) */
  costGas: number;
  /** Supply consumed */
  supply: number;
  /** Training time in seconds */
  trainTime: number;
  /** Hit points */
  hp: number;
  /** Damage per attack */
  damage: number;
  /** Attack cooldown in ms */
  attackSpeed: number;
  /** Attack range in pixels (melee ~TILE_SIZE, ranged ~TILE_SIZE*4+) */
  attackRange: number;
  /** Movement speed in pixels/sec */
  moveSpeed: number;
  /** Display color */
  color: number;
  /** Unit role hint */
  role: 'melee' | 'ranged' | 'heavy';
}

// ═══════════════════════════════════════════
// MILITARY
// ═══════════════════════════════════════════

const MIL_MARINE: CombatUnitDef = {
  id: 'mil_marine', name: 'Marine', faction: 'military',
  costGold: 50, costGas: 0, supply: 1, trainTime: 5,
  hp: 80, damage: 8, attackSpeed: 800, attackRange: 28 * 3,
  moveSpeed: 80, color: 0x4488ff, role: 'ranged',
};

const MIL_TROOPER: CombatUnitDef = {
  id: 'mil_trooper', name: 'Trooper', faction: 'military',
  costGold: 30, costGas: 0, supply: 1, trainTime: 3,
  hp: 100, damage: 12, attackSpeed: 1000, attackRange: 28,
  moveSpeed: 75, color: 0x3366cc, role: 'melee',
};

const MIL_TANK: CombatUnitDef = {
  id: 'mil_tank', name: 'Heavy Tank', faction: 'military',
  costGold: 120, costGas: 50, supply: 3, trainTime: 12,
  hp: 350, damage: 35, attackSpeed: 2000, attackRange: 28 * 4,
  moveSpeed: 50, color: 0x225599, role: 'heavy',
};

// ═══════════════════════════════════════════
// MECHANICAL
// ═══════════════════════════════════════════

const MECH_DRONE: CombatUnitDef = {
  id: 'mech_drone', name: 'Attack Drone', faction: 'mechanical',
  costGold: 35, costGas: 0, supply: 1, trainTime: 3,
  hp: 60, damage: 10, attackSpeed: 700, attackRange: 28 * 3,
  moveSpeed: 100, color: 0xff8844, role: 'ranged',
};

const MECH_WALKER: CombatUnitDef = {
  id: 'mech_walker', name: 'Mech Walker', faction: 'mechanical',
  costGold: 55, costGas: 0, supply: 1, trainTime: 5,
  hp: 140, damage: 15, attackSpeed: 1200, attackRange: 28,
  moveSpeed: 65, color: 0xcc6622, role: 'melee',
};

const MECH_SIEGE: CombatUnitDef = {
  id: 'mech_siege', name: 'Siege Engine', faction: 'mechanical',
  costGold: 150, costGas: 75, supply: 3, trainTime: 15,
  hp: 400, damage: 50, attackSpeed: 3000, attackRange: 28 * 6,
  moveSpeed: 40, color: 0x994411, role: 'heavy',
};

// ═══════════════════════════════════════════
// ARCANE
// ═══════════════════════════════════════════

const ARC_APPRENTICE: CombatUnitDef = {
  id: 'arc_apprentice', name: 'Apprentice', faction: 'arcane',
  costGold: 40, costGas: 0, supply: 1, trainTime: 4,
  hp: 50, damage: 14, attackSpeed: 900, attackRange: 28 * 4,
  moveSpeed: 85, color: 0xaa44ff, role: 'ranged',
};

const ARC_BLADE: CombatUnitDef = {
  id: 'arc_blade', name: 'Spell Blade', faction: 'arcane',
  costGold: 45, costGas: 0, supply: 1, trainTime: 4,
  hp: 90, damage: 18, attackSpeed: 1000, attackRange: 28,
  moveSpeed: 90, color: 0x8833dd, role: 'melee',
};

const ARC_GOLEM: CombatUnitDef = {
  id: 'arc_golem', name: 'Arcane Golem', faction: 'arcane',
  costGold: 100, costGas: 60, supply: 3, trainTime: 10,
  hp: 500, damage: 25, attackSpeed: 1500, attackRange: 28,
  moveSpeed: 45, color: 0x6622aa, role: 'heavy',
};

// ═══════════════════════════════════════════
// LOOKUP
// ═══════════════════════════════════════════

export const COMBAT_UNIT_TYPES: Record<string, CombatUnitDef> = {
  mil_marine: MIL_MARINE, mil_trooper: MIL_TROOPER, mil_tank: MIL_TANK,
  mech_drone: MECH_DRONE, mech_walker: MECH_WALKER, mech_siege: MECH_SIEGE,
  arc_apprentice: ARC_APPRENTICE, arc_blade: ARC_BLADE, arc_golem: ARC_GOLEM,
};

/** Get combat unit IDs for a faction, ordered: melee, ranged, heavy */
export function getFactionUnitIds(faction: FactionId): string[] {
  return Object.values(COMBAT_UNIT_TYPES)
    .filter(u => u.faction === faction)
    .sort((a, b) => a.supply - b.supply || a.costGold - b.costGold)
    .map(u => u.id);
}
