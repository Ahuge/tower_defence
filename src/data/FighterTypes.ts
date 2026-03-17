import { FactionId } from './Factions';

export interface FighterType {
  id: string;
  name: string;
  faction: FactionId;
  cost: number;
  hp: number;
  damage: number;
  attackSpeed: number; // ms between attacks
  moveSpeed: number; // pixels per second
  color: number;
  count: number; // how many spawn per purchase
  description: string;
  ability?: string;
}

export const FIGHTER_TYPES: Record<string, FighterType> = {
  // Arcane
  arcane_mage: {
    id: 'arcane_mage', name: 'Glass Mage', faction: 'arcane',
    cost: 40, hp: 30, damage: 25, attackSpeed: 1200, moveSpeed: 60,
    color: 0x6644ff, count: 1,
    description: 'High damage, low HP. AoE on death.',
    ability: 'death_aoe',
  },

  // Mechanical
  mech_tank: {
    id: 'mech_tank', name: 'Tank Bot', faction: 'mechanical',
    cost: 50, hp: 120, damage: 8, attackSpeed: 1500, moveSpeed: 40,
    color: 0xcc8833, count: 1,
    description: 'High HP, taunts creeps to attack it.',
    ability: 'taunt',
  },

  // Nature
  nature_sprite: {
    id: 'nature_sprite', name: 'Swarm Sprite', faction: 'nature',
    cost: 30, hp: 20, damage: 6, attackSpeed: 800, moveSpeed: 80,
    color: 0x66dd77, count: 3,
    description: 'Cheap, spawns in groups of 3.',
  },

  // Void
  void_assassin: {
    id: 'void_assassin', name: 'Assassin', faction: 'void',
    cost: 45, hp: 25, damage: 35, attackSpeed: 1000, moveSpeed: 100,
    color: 0xbb55dd, count: 1,
    description: 'Targets weakest, very fast, glass cannon.',
    ability: 'target_weakest',
  },
};

export function getFighterTypesForFaction(faction: FactionId): FighterType[] {
  return Object.values(FIGHTER_TYPES).filter(f => f.faction === faction);
}
