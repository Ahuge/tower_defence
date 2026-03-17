import { FactionId } from './Factions';

export interface FrontierBuilding {
  id: string;
  name: string;
  faction: FactionId;
  cost: number;
  baseIncome: number; // gold per wave
  description: string;
  mechanic: 'steady' | 'overcharge' | 'dig' | 'grow' | 'gamble';
}

export const FRONTIER_BUILDINGS: Record<FactionId, FrontierBuilding[]> = {
  arcane: [
    {
      id: 'leyline_nexus_1', name: 'Leyline Nexus', faction: 'arcane',
      cost: 50, baseIncome: 5,
      description: 'Stable mana income. Can overcharge for 3x burst but goes dormant for 2 waves.',
      mechanic: 'overcharge',
    },
    {
      id: 'leyline_nexus_2', name: 'Greater Nexus', faction: 'arcane',
      cost: 120, baseIncome: 12,
      description: 'Powerful leyline tap. Same overcharge mechanic.',
      mechanic: 'overcharge',
    },
  ],
  mechanical: [
    {
      id: 'deep_mine_1', name: 'Deep Mine', faction: 'mechanical',
      cost: 40, baseIncome: 4,
      description: 'Dig deeper each wave for +1 income, but 10% cave-in risk per level.',
      mechanic: 'dig',
    },
    {
      id: 'deep_mine_2', name: 'Reinforced Mine', faction: 'mechanical',
      cost: 100, baseIncome: 8,
      description: 'Better base income, same dig mechanic with lower risk.',
      mechanic: 'dig',
    },
  ],
  nature: [
    {
      id: 'sacred_grove_1', name: 'Sacred Grove', faction: 'nature',
      cost: 45, baseIncome: 3,
      description: 'Grows +2 income/wave. Harvest resets growth but gives big payout.',
      mechanic: 'grow',
    },
    {
      id: 'sacred_grove_2', name: 'Ancient Grove', faction: 'nature',
      cost: 110, baseIncome: 6,
      description: 'Faster growth, bigger harvests.',
      mechanic: 'grow',
    },
  ],
  void: [
    {
      id: 'the_rift_1', name: 'The Rift', faction: 'void',
      cost: 35, baseIncome: 0,
      description: 'Random income: 0-15g per wave. High variance.',
      mechanic: 'gamble',
    },
    {
      id: 'the_rift_2', name: 'Abyssal Rift', faction: 'void',
      cost: 90, baseIncome: 0,
      description: 'Random income: 0-30g per wave. Maximum variance.',
      mechanic: 'gamble',
    },
  ],
  military: [
    {
      id: 'supply_depot_1', name: 'Supply Depot', faction: 'military',
      cost: 45, baseIncome: 4,
      description: 'Steady supply income. Reliable.',
      mechanic: 'steady',
    },
    {
      id: 'supply_depot_2', name: 'Forward Base', faction: 'military',
      cost: 100, baseIncome: 9,
      description: 'Upgraded supply chain. Higher returns.',
      mechanic: 'steady',
    },
  ],
  aliens: [
    { id: 'spawning_pool', name: 'Spawning Pool', faction: 'aliens', cost: 35, baseIncome: 3,
      description: 'Organic income. Grows +2 per wave.', mechanic: 'grow' },
    { id: 'hive_cluster', name: 'Hive Cluster', faction: 'aliens', cost: 90, baseIncome: 7,
      description: 'Larger hive. Faster growth.', mechanic: 'grow' },
  ],
  cypherpunk: [
    { id: 'crypto_mine', name: 'Crypto Mine', faction: 'cypherpunk', cost: 40, baseIncome: 0,
      description: 'Mines crypto: 0-20g per wave. Volatile.', mechanic: 'gamble' },
    { id: 'data_center', name: 'Data Center', faction: 'cypherpunk', cost: 100, baseIncome: 8,
      description: 'Steady data income.', mechanic: 'steady' },
  ],
  infernal: [
    { id: 'soul_well', name: 'Soul Well', faction: 'infernal', cost: 30, baseIncome: 0,
      description: 'Souls gamble: 0-25g per wave. Chaotic.', mechanic: 'gamble' },
    { id: 'demon_forge', name: 'Demon Forge', faction: 'infernal', cost: 80, baseIncome: 5,
      description: 'Overcharge for 3x burst, dormant 2 waves.', mechanic: 'overcharge' },
  ],
  celestial: [
    { id: 'temple', name: 'Temple', faction: 'celestial', cost: 50, baseIncome: 5,
      description: 'Steady holy income.', mechanic: 'steady' },
    { id: 'cathedral', name: 'Cathedral', faction: 'celestial', cost: 120, baseIncome: 11,
      description: 'Greater temple. Reliable.', mechanic: 'steady' },
  ],
  psionic: [
    { id: 'mind_nexus', name: 'Mind Nexus', faction: 'psionic', cost: 45, baseIncome: 4,
      description: 'Dig deeper into minds. +1/wave but 10% collapse risk.', mechanic: 'dig' },
    { id: 'psi_amplifier', name: 'Psi Amplifier', faction: 'psionic', cost: 100, baseIncome: 8,
      description: 'Lower risk dig. Better base.', mechanic: 'dig' },
  ],
  random: [],
};

/** Get all faction frontier buildings (for Random faction pool) */
export function getAllFactionFrontierBuildings(): FrontierBuilding[] {
  const all: FrontierBuilding[] = [];
  for (const [fid, buildings] of Object.entries(FRONTIER_BUILDINGS)) {
    if (fid === 'random' || fid === 'military') continue;
    all.push(...buildings);
  }
  return all;
}

// Generic outposts for non-faction play
export const GENERIC_OUTPOSTS: FrontierBuilding[] = [
  {
    id: 'outpost_1', name: 'Outpost', faction: 'arcane', // faction doesn't matter for generic
    cost: 40, baseIncome: 4,
    description: 'Basic income structure. +4g per wave.',
    mechanic: 'steady',
  },
  {
    id: 'outpost_2', name: 'Trading Post', faction: 'arcane',
    cost: 80, baseIncome: 9,
    description: 'Upgraded income structure. +9g per wave.',
    mechanic: 'steady',
  },
];
