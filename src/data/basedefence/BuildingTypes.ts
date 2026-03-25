import { FactionId } from '../Factions';

/** Functional category of a building */
export type BuildingCategory = 'base' | 'miner' | 'extractor' | 'supply' | 'barracks' | 'wall' | 'bunker' | 'repair_bay' | 'mana_well';

export interface BuildingDef {
  id: string;
  name: string;
  category: BuildingCategory;
  faction: FactionId | 'neutral';
  /** Gold cost */
  costGold: number;
  /** Gas cost (0 for basic buildings) */
  costGas: number;
  /** Max hit points */
  hp: number;
  /** Build time in seconds (0 = instant/pre-placed) */
  buildTime: number;
  /** For miners/extractors: resource income per second */
  incomeRate: number;
  /** For miners/extractors: which resource ID this generates */
  incomeResource: string;
  /** For supply depots: how much supply this provides */
  supplyProvided: number;
  /** Tile footprint (1 = 1×1, 2 = 2×2, 3 = 3×3) */
  footprint: number;
  /** Display color */
  color: number;
  /** Description */
  desc: string;
  /** Does this building block pathing? (walls) */
  blocksPathing?: boolean;
  /** Heal rate for repair buildings (HP/sec to nearby units/buildings) */
  healRate?: number;
  /** Heal radius in tiles */
  healRadius?: number;
  /** Passive resource generation (mana wells) — resource per second */
  passiveRate?: number;
  /** Passive resource ID */
  passiveResource?: string;
  /** Max units that can garrison (bunkers) */
  garrisonCapacity?: number;
  /** Garrison attack damage bonus multiplier */
  garrisonDamageBonus?: number;
}

// ════════════════════════════════════════════════════════════
// MILITARY
// ════════════════════════════════════════════════════════════

const MIL_BASE: BuildingDef = {
  id: 'mil_base', name: 'Command Center', category: 'base',
  faction: 'military', costGold: 400, costGas: 0,
  hp: 2000, buildTime: 20, incomeRate: 0, incomeResource: '',
  supplyProvided: 10, footprint: 3, color: 0x4488ff,
  desc: 'Expansion base. Provides 10 supply + resource drop-off point.',
};

const MIL_MINER: BuildingDef = {
  id: 'mil_miner', name: 'Refinery', category: 'miner',
  faction: 'military', costGold: 75, costGas: 0,
  hp: 400, buildTime: 8, incomeRate: 5, incomeResource: 'gold',
  supplyProvided: 0, footprint: 1, color: 0xccaa22,
  desc: 'Place on gold deposit. Generates 5 gold/sec.',
};

const MIL_EXTRACTOR: BuildingDef = {
  id: 'mil_extractor', name: 'Gas Pump', category: 'extractor',
  faction: 'military', costGold: 100, costGas: 0,
  hp: 350, buildTime: 10, incomeRate: 2, incomeResource: 'gas',
  supplyProvided: 0, footprint: 1, color: 0x22cc88,
  desc: 'Place on geyser. Generates 2 gas/sec.',
};

const MIL_SUPPLY: BuildingDef = {
  id: 'mil_supply', name: 'Supply Depot', category: 'supply',
  faction: 'military', costGold: 50, costGas: 0,
  hp: 300, buildTime: 6, incomeRate: 0, incomeResource: '',
  supplyProvided: 8, footprint: 1, color: 0x6688aa,
  desc: 'Provides +8 supply capacity.',
};

const MIL_BARRACKS: BuildingDef = {
  id: 'mil_barracks', name: 'Barracks', category: 'barracks',
  faction: 'military', costGold: 150, costGas: 0,
  hp: 600, buildTime: 12, incomeRate: 0, incomeResource: '',
  supplyProvided: 0, footprint: 2, color: 0x5577cc,
  desc: 'Trains infantry and vehicles.',
};

const MIL_WALL: BuildingDef = {
  id: 'mil_wall', name: 'Sandbag Wall', category: 'wall',
  faction: 'military', costGold: 15, costGas: 0,
  hp: 150, buildTime: 3, incomeRate: 0, incomeResource: '',
  supplyProvided: 0, footprint: 1, color: 0x887755,
  desc: 'Cheap barrier. Blocks unit pathing.',
  blocksPathing: true,
};

const MIL_BUNKER: BuildingDef = {
  id: 'mil_bunker', name: 'Bunker', category: 'bunker',
  faction: 'military', costGold: 100, costGas: 0,
  hp: 500, buildTime: 10, incomeRate: 0, incomeResource: '',
  supplyProvided: 0, footprint: 2, color: 0x556644,
  desc: 'Garrison up to 4 units. Garrisoned units attack from safety with +50% damage.',
  garrisonCapacity: 4, garrisonDamageBonus: 1.5,
};

// ════════════════════════════════════════════════════════════
// MECHANICAL
// ════════════════════════════════════════════════════════════

const MECH_BASE: BuildingDef = {
  id: 'mech_base', name: 'Core Nexus', category: 'base',
  faction: 'mechanical', costGold: 400, costGas: 0,
  hp: 2200, buildTime: 22, incomeRate: 0, incomeResource: '',
  supplyProvided: 10, footprint: 3, color: 0xff8844,
  desc: 'Main structure. Provides 10 supply. Lose this and the game is over.',
};

const MECH_MINER: BuildingDef = {
  id: 'mech_miner', name: 'Auto-Drill', category: 'miner',
  faction: 'mechanical', costGold: 80, costGas: 0,
  hp: 500, buildTime: 10, incomeRate: 5.5, incomeResource: 'gold',
  supplyProvided: 0, footprint: 1, color: 0xccaa22,
  desc: 'Place on gold deposit. Generates 5.5 gold/sec. Tougher than average.',
};

const MECH_EXTRACTOR: BuildingDef = {
  id: 'mech_extractor', name: 'Vapor Condenser', category: 'extractor',
  faction: 'mechanical', costGold: 110, costGas: 0,
  hp: 450, buildTime: 12, incomeRate: 2.2, incomeResource: 'gas',
  supplyProvided: 0, footprint: 1, color: 0x22cc88,
  desc: 'Place on geyser. Generates 2.2 gas/sec.',
};

const MECH_SUPPLY: BuildingDef = {
  id: 'mech_supply', name: 'Power Pylon', category: 'supply',
  faction: 'mechanical', costGold: 55, costGas: 0,
  hp: 250, buildTime: 5, incomeRate: 0, incomeResource: '',
  supplyProvided: 8, footprint: 1, color: 0xaa6622,
  desc: 'Provides +8 supply capacity.',
};

const MECH_BARRACKS: BuildingDef = {
  id: 'mech_barracks', name: 'Factory', category: 'barracks',
  faction: 'mechanical', costGold: 160, costGas: 0,
  hp: 700, buildTime: 14, incomeRate: 0, incomeResource: '',
  supplyProvided: 0, footprint: 2, color: 0xcc7733,
  desc: 'Produces mechanical units.',
};

const MECH_REPAIR: BuildingDef = {
  id: 'mech_repair', name: 'Repair Bay', category: 'repair_bay',
  faction: 'mechanical', costGold: 120, costGas: 30,
  hp: 400, buildTime: 12, incomeRate: 0, incomeResource: '',
  supplyProvided: 0, footprint: 2, color: 0x88aa44,
  desc: 'Heals nearby friendly units and buildings. 5 HP/sec in 8-tile radius.',
  healRate: 5, healRadius: 8,
};

// ════════════════════════════════════════════════════════════
// ARCANE
// ════════════════════════════════════════════════════════════

const ARC_BASE: BuildingDef = {
  id: 'arc_base', name: 'Arcanum Spire', category: 'base',
  faction: 'arcane', costGold: 400, costGas: 0,
  hp: 1800, buildTime: 18, incomeRate: 0, incomeResource: '',
  supplyProvided: 10, footprint: 3, color: 0xaa44ff,
  desc: 'Expansion base. Provides 10 supply + resource drop-off point.',
};

const ARC_MINER: BuildingDef = {
  id: 'arc_miner', name: 'Gold Sigil', category: 'miner',
  faction: 'arcane', costGold: 70, costGas: 0,
  hp: 300, buildTime: 6, incomeRate: 4.5, incomeResource: 'gold',
  supplyProvided: 0, footprint: 1, color: 0xccaa22,
  desc: 'Place on gold deposit. Generates 4.5 gold/sec. Builds fast but fragile.',
};

const ARC_EXTRACTOR: BuildingDef = {
  id: 'arc_extractor', name: 'Ether Well', category: 'extractor',
  faction: 'arcane', costGold: 90, costGas: 0,
  hp: 280, buildTime: 8, incomeRate: 1.8, incomeResource: 'gas',
  supplyProvided: 0, footprint: 1, color: 0x22cc88,
  desc: 'Place on geyser. Generates 1.8 gas/sec.',
};

const ARC_SUPPLY: BuildingDef = {
  id: 'arc_supply', name: 'Mana Crystal', category: 'supply',
  faction: 'arcane', costGold: 45, costGas: 0,
  hp: 200, buildTime: 4, incomeRate: 0, incomeResource: '',
  supplyProvided: 8, footprint: 1, color: 0x8844cc,
  desc: 'Provides +8 supply capacity.',
};

const ARC_BARRACKS: BuildingDef = {
  id: 'arc_barracks', name: 'Summoning Circle', category: 'barracks',
  faction: 'arcane', costGold: 140, costGas: 0,
  hp: 500, buildTime: 10, incomeRate: 0, incomeResource: '',
  supplyProvided: 0, footprint: 2, color: 0x9955dd,
  desc: 'Conjures arcane units.',
};

const ARC_MANA_WELL: BuildingDef = {
  id: 'arc_mana_well', name: 'Mana Well', category: 'mana_well',
  faction: 'arcane', costGold: 80, costGas: 0,
  hp: 200, buildTime: 8, incomeRate: 0, incomeResource: '',
  supplyProvided: 0, footprint: 1, color: 0x6644cc,
  desc: 'Generates 1 gas/sec passively. No geyser required.',
  passiveRate: 1, passiveResource: 'gas',
};

// ════════════════════════════════════════════════════════════
// LOOKUP
// ════════════════════════════════════════════════════════════

export const BUILDING_TYPES: Record<string, BuildingDef> = {
  // Military
  mil_base: MIL_BASE, mil_miner: MIL_MINER, mil_extractor: MIL_EXTRACTOR,
  mil_supply: MIL_SUPPLY, mil_barracks: MIL_BARRACKS,
  mil_wall: MIL_WALL, mil_bunker: MIL_BUNKER,
  // Mechanical
  mech_base: MECH_BASE, mech_miner: MECH_MINER, mech_extractor: MECH_EXTRACTOR,
  mech_supply: MECH_SUPPLY, mech_barracks: MECH_BARRACKS,
  mech_repair: MECH_REPAIR,
  // Arcane
  arc_base: ARC_BASE, arc_miner: ARC_MINER, arc_extractor: ARC_EXTRACTOR,
  arc_supply: ARC_SUPPLY, arc_barracks: ARC_BARRACKS,
  arc_mana_well: ARC_MANA_WELL,
};

/** Extra faction-specific building IDs (beyond the standard 5) */
const FACTION_EXTRAS: Record<string, string[]> = {
  mil: ['mil_wall', 'mil_bunker'],
  mech: ['mech_repair'],
  arc: ['arc_mana_well'],
};

/** Get building IDs for a faction — standard buildings + faction-specific extras */
export function getFactionBuildingIds(faction: FactionId): string[] {
  const prefix = factionPrefix(faction);
  if (!prefix) return [];
  const standard = [`${prefix}_base`, `${prefix}_miner`, `${prefix}_extractor`, `${prefix}_supply`, `${prefix}_barracks`];
  const extras = FACTION_EXTRAS[prefix] || [];
  return [...standard, ...extras];
}

/** Get the base building ID for a faction */
export function getFactionBaseId(faction: FactionId): string {
  const prefix = factionPrefix(faction);
  return prefix ? `${prefix}_base` : '';
}

function factionPrefix(faction: FactionId): string {
  switch (faction) {
    case 'military': return 'mil';
    case 'mechanical': return 'mech';
    case 'arcane': return 'arc';
    default: return '';
  }
}
