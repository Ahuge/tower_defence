export type ArmorType = 'light' | 'medium' | 'heavy';
export type DamageType = 'physical' | 'magic';

export interface CreepType {
  id: string;
  name: string;
  hpMultiplier: number;
  speedMultiplier: number;
  armor: ArmorType;
  color: number;
  size: number; // multiplier on base size
  count: number; // how many spawn per "unit" in wave def
  abilities: string[];
}

export const CREEP_TYPES: Record<string, CreepType> = {
  standard: {
    id: 'standard',
    name: 'Standard',
    hpMultiplier: 1,
    speedMultiplier: 1,
    armor: 'medium',
    color: 0xff4444,
    size: 1,
    count: 1,
    abilities: [],
  },
  fast: {
    id: 'fast',
    name: 'Fast',
    hpMultiplier: 0.5,
    speedMultiplier: 2,
    armor: 'light',
    color: 0xffaa22,
    size: 0.8,
    count: 1,
    abilities: [],
  },
  armored: {
    id: 'armored',
    name: 'Armored',
    hpMultiplier: 2.5,
    speedMultiplier: 0.7,
    armor: 'heavy',
    color: 0x888888,
    size: 1.2,
    count: 1,
    abilities: [],
  },
  swarm: {
    id: 'swarm',
    name: 'Swarm',
    hpMultiplier: 0.3,
    speedMultiplier: 1.2,
    armor: 'light',
    color: 0xaaff44,
    size: 0.6,
    count: 3,
    abilities: [],
  },
  healer: {
    id: 'healer',
    name: 'Healer',
    hpMultiplier: 1.2,
    speedMultiplier: 0.9,
    armor: 'medium',
    color: 0x44ff88,
    size: 1,
    count: 1,
    abilities: ['heal_aura'],
  },
  boss: {
    id: 'boss',
    name: 'Boss',
    hpMultiplier: 10,
    speedMultiplier: 0.6,
    armor: 'heavy',
    color: 0xff2222,
    size: 1.5,
    count: 1,
    abilities: ['shield'],
  },
};

export function getCreepType(id: string): CreepType {
  const c = CREEP_TYPES[id];
  if (!c) throw new Error(`Unknown creep type: ${id}`);
  return c;
}
