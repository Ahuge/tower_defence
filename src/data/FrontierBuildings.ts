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
    { id: 'breeding_pool', name: 'Breeding Pool', faction: 'aliens', cost: 30, baseIncome: 2,
      description: 'Grows +2 income/wave. The swarm expands.', mechanic: 'grow' },
    { id: 'hive_queen', name: 'Hive Queen', faction: 'aliens', cost: 85, baseIncome: 5,
      description: 'Faster growth. Harvest for large burst of biomass.', mechanic: 'grow' },
  ],
  cypherpunk: [
    { id: 'crypto_mine', name: 'Crypto Mine', faction: 'cypherpunk', cost: 35, baseIncome: 0,
      description: 'Mines volatile crypto: 0-25g per wave.', mechanic: 'gamble' },
    { id: 'data_broker', name: 'Data Broker', faction: 'cypherpunk', cost: 90, baseIncome: 6,
      description: 'Overcharge to sell data: 3x burst, 2 wave cooldown.', mechanic: 'overcharge' },
  ],
  infernal: [
    { id: 'soul_well', name: 'Soul Well', faction: 'infernal', cost: 25, baseIncome: 0,
      description: 'Chaotic souls: 0-30g per wave. High variance.', mechanic: 'gamble' },
    { id: 'blood_pact', name: 'Blood Pact', faction: 'infernal', cost: 70, baseIncome: 8,
      description: 'Dig deeper into damnation. +1/wave but 15% collapse risk.', mechanic: 'dig' },
  ],
  celestial: [
    { id: 'tithe', name: 'Tithe', faction: 'celestial', cost: 50, baseIncome: 5,
      description: 'Steady holy income. The faithful provide.', mechanic: 'steady' },
    { id: 'miracle', name: 'Miracle', faction: 'celestial', cost: 130, baseIncome: 3,
      description: 'Grows slowly. Harvest for a divine payout.', mechanic: 'grow' },
  ],
  psionic: [
    { id: 'dream_tap', name: 'Dream Tap', faction: 'psionic', cost: 40, baseIncome: 0,
      description: 'Harvest subconscious: 0-20g per wave.', mechanic: 'gamble' },
    { id: 'mind_prison', name: 'Mind Prison', faction: 'psionic', cost: 95, baseIncome: 7,
      description: 'Overcharge for 3x psychic burst, dormant 2 waves.', mechanic: 'overcharge' },
  ],
  harmonic: [
    { id: 'resonance_chamber', name: 'Resonance Chamber', faction: 'harmonic', cost: 45, baseIncome: 4,
      description: 'Grows +2 per wave. Harmonizes with your network.', mechanic: 'grow' },
    { id: 'symphony_hall', name: 'Symphony Hall', faction: 'harmonic', cost: 110, baseIncome: 7,
      description: 'Overcharge for 3x crescendo, dormant 2 waves.', mechanic: 'overcharge' },
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
