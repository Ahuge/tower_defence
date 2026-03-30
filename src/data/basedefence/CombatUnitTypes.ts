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
  /** Special mechanic tag */
  special?: 'spawn_on_death' | 'fiend_detonate' | 'doom_scaling' | 'hellfire_self_damage' | 'phase_shift' | 'rift_walk';
  /** For spawn_on_death: what unit ID to spawn */
  spawnOnDeathId?: string;
  /** For spawn_on_death: how many to spawn */
  spawnOnDeathCount?: number;
  /** For fiend_detonate: AoE damage on death */
  detonateDamage?: number;
  /** For fiend_detonate: AoE radius in pixels */
  detonateRadius?: number;
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
// NATURE
// ═══════════════════════════════════════════

const NAT_CRAWLER: CombatUnitDef = {
  id: 'nat_crawler', name: 'Thorn Crawler', faction: 'nature',
  costGold: 20, costGas: 0, supply: 1, trainTime: 2,
  hp: 45, damage: 8, attackSpeed: 900, attackRange: 28,
  moveSpeed: 95, color: 0x55aa22, role: 'melee',
};

const NAT_SPORE: CombatUnitDef = {
  id: 'nat_spore', name: 'Spore Walker', faction: 'nature',
  costGold: 35, costGas: 0, supply: 1, trainTime: 3,
  hp: 40, damage: 6, attackSpeed: 1000, attackRange: 28 * 3,
  moveSpeed: 80, color: 0x44bb33, role: 'ranged',
};

const NAT_BROOD: CombatUnitDef = {
  id: 'nat_brood', name: 'Brood Mother', faction: 'nature',
  costGold: 90, costGas: 40, supply: 3, trainTime: 8,
  hp: 280, damage: 20, attackSpeed: 1400, attackRange: 28,
  moveSpeed: 55, color: 0x227711, role: 'heavy',
  special: 'spawn_on_death', spawnOnDeathId: 'nat_crawler', spawnOnDeathCount: 2,
};

// ═══════════════════════════════════════════
// INFERNAL
// ═══════════════════════════════════════════

const INF_FIEND: CombatUnitDef = {
  id: 'inf_fiend', name: 'Fiend', faction: 'infernal',
  costGold: 25, costGas: 0, supply: 1, trainTime: 2,
  hp: 60, damage: 0, attackSpeed: 9999, attackRange: 28,
  moveSpeed: 100, color: 0xff6633, role: 'melee',
  special: 'fiend_detonate', detonateDamage: 40, detonateRadius: 28 * 3,
};

const INF_HELLFIRE: CombatUnitDef = {
  id: 'inf_hellfire', name: 'Hellfire Caster', faction: 'infernal',
  costGold: 45, costGas: 0, supply: 1, trainTime: 4,
  hp: 55, damage: 16, attackSpeed: 900, attackRange: 28 * 4,
  moveSpeed: 75, color: 0xff4411, role: 'ranged',
  special: 'hellfire_self_damage',
};

const INF_DOOM: CombatUnitDef = {
  id: 'inf_doom', name: 'Doom Guard', faction: 'infernal',
  costGold: 130, costGas: 60, supply: 3, trainTime: 12,
  hp: 320, damage: 22, attackSpeed: 1200, attackRange: 28,
  moveSpeed: 60, color: 0xaa1100, role: 'heavy',
  special: 'doom_scaling',
};

// ═══════════════════════════════════════════
// VOID
// ═══════════════════════════════════════════

const VOID_RIFT: CombatUnitDef = {
  id: 'void_rift', name: 'Rift Walker', faction: 'void',
  costGold: 50, costGas: 0, supply: 1, trainTime: 5,
  hp: 70, damage: 10, attackSpeed: 1000, attackRange: 28,
  moveSpeed: 85, color: 0x9933cc, role: 'melee',
  special: 'rift_walk',
};

const VOID_PHASE: CombatUnitDef = {
  id: 'void_phase', name: 'Phase Stalker', faction: 'void',
  costGold: 55, costGas: 0, supply: 1, trainTime: 5,
  hp: 65, damage: 12, attackSpeed: 900, attackRange: 28 * 3,
  moveSpeed: 75, color: 0x7744bb, role: 'ranged',
  special: 'phase_shift',
};

const VOID_TITAN: CombatUnitDef = {
  id: 'void_titan', name: 'Void Titan', faction: 'void',
  costGold: 160, costGas: 80, supply: 4, trainTime: 15,
  hp: 450, damage: 45, attackSpeed: 2500, attackRange: 28 * 8,
  moveSpeed: 0, color: 0x5511aa, role: 'heavy',
};

// ═══════════════════════════════════════════
// LOOKUP
// ═══════════════════════════════════════════

export const COMBAT_UNIT_TYPES: Record<string, CombatUnitDef> = {
  mil_marine: MIL_MARINE, mil_trooper: MIL_TROOPER, mil_tank: MIL_TANK,
  mech_drone: MECH_DRONE, mech_walker: MECH_WALKER, mech_siege: MECH_SIEGE,
  arc_apprentice: ARC_APPRENTICE, arc_blade: ARC_BLADE, arc_golem: ARC_GOLEM,
  nat_crawler: NAT_CRAWLER, nat_spore: NAT_SPORE, nat_brood: NAT_BROOD,
  inf_fiend: INF_FIEND, inf_hellfire: INF_HELLFIRE, inf_doom: INF_DOOM,
  void_rift: VOID_RIFT, void_phase: VOID_PHASE, void_titan: VOID_TITAN,
};

/** Get combat unit IDs for a faction, ordered: melee, ranged, heavy */
export function getFactionUnitIds(faction: FactionId): string[] {
  return Object.values(COMBAT_UNIT_TYPES)
    .filter(u => u.faction === faction)
    .sort((a, b) => a.supply - b.supply || a.costGold - b.costGold)
    .map(u => u.id);
}
