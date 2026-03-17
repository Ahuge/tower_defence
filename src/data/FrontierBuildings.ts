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
  random: [],
};

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
