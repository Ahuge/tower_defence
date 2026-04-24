import { FactionId } from './Factions';

export interface FrontierBuilding {
  id: string;
  name: string;
  faction: FactionId;
  cost: number;
  baseIncome: number; // gold per wave
  description: string;
  mechanic: 'steady' | 'overcharge' | 'dig' | 'grow' | 'gamble';
  /** For gamble-mechanic buildings, the upper bound on the per-wave
   *  random roll (roll ∈ [0, gambleMax]). Ignored for non-gamble
   *  mechanics. Falls back to 15 in FrontierManager if unset. */
  gambleMax?: number;
}

export const FRONTIER_BUILDINGS: Record<FactionId, FrontierBuilding[]> = {
  arcane: [
    {
      id: 'leyline_nexus_1', name: 'Leyline Nexus', faction: 'arcane',
      cost: 55, baseIncome: 5,
      description: 'Stable mana income. Can overcharge for 3x burst but goes dormant for 2 waves.',
      mechanic: 'overcharge',
    },
    {
      id: 'leyline_nexus_2', name: 'Greater Nexus', faction: 'arcane',
      cost: 250, baseIncome: 28,
      description: 'Powerful leyline tap. Same overcharge mechanic, far better returns.',
      mechanic: 'overcharge',
    },
  ],
  mechanical: [
    {
      id: 'deep_mine_1', name: 'Deep Mine', faction: 'mechanical',
      cost: 44, baseIncome: 4,
      description: 'Dig deeper each wave for +1 income, but 10% cave-in risk per level.',
      mechanic: 'dig',
    },
    {
      id: 'deep_mine_2', name: 'Reinforced Mine', faction: 'mechanical',
      cost: 225, baseIncome: 25,
      description: 'Industrial-scale dig. Higher base, same mechanic with lower risk.',
      mechanic: 'dig',
    },
  ],
  nature: [
    {
      id: 'sacred_grove_1', name: 'Sacred Grove', faction: 'nature',
      cost: 55, baseIncome: 3,
      description: 'Grows +2 income/wave. Harvest resets growth but gives big payout.',
      mechanic: 'grow',
    },
    {
      id: 'sacred_grove_2', name: 'Ancient Grove', faction: 'nature',
      cost: 225, baseIncome: 22,
      description: 'Ancient roots. Faster payoff, bigger harvests.',
      mechanic: 'grow',
    },
  ],
  void: [
    {
      id: 'the_rift_1', name: 'The Rift', faction: 'void',
      cost: 35, baseIncome: 0,
      description: 'Random income: 0-15g per wave. High variance.',
      mechanic: 'gamble',
      gambleMax: 15,
    },
    {
      id: 'the_rift_2', name: 'Abyssal Rift', faction: 'void',
      cost: 160, baseIncome: 0,
      description: 'Random income: 0-80g per wave. Maximum variance.',
      mechanic: 'gamble',
      gambleMax: 80,
    },
  ],
  military: [
    {
      id: 'supply_depot_1', name: 'Supply Depot', faction: 'military',
      cost: 44, baseIncome: 4,
      description: 'Steady supply income. Reliable.',
      mechanic: 'steady',
    },
    {
      id: 'supply_depot_2', name: 'Forward Base', faction: 'military',
      cost: 225, baseIncome: 25,
      description: 'Upgraded supply chain. Far higher returns.',
      mechanic: 'steady',
    },
  ],
  aliens: [
    { id: 'breeding_pool', name: 'Breeding Pool', faction: 'aliens', cost: 35, baseIncome: 2,
      description: 'Grows +2 income/wave. The swarm expands.', mechanic: 'grow' },
    { id: 'hive_queen', name: 'Hive Queen', faction: 'aliens', cost: 175, baseIncome: 18,
      description: 'Deeper broodmother. Faster growth, massive harvest payouts.', mechanic: 'grow' },
  ],
  cypherpunk: [
    { id: 'crypto_mine', name: 'Crypto Mine', faction: 'cypherpunk', cost: 35, baseIncome: 0,
      description: 'Mines volatile crypto: 0-25g per wave.', mechanic: 'gamble', gambleMax: 25 },
    { id: 'data_broker', name: 'Data Broker', faction: 'cypherpunk', cost: 225, baseIncome: 25,
      description: 'Overcharge to sell data: 3x burst, 2 wave cooldown.', mechanic: 'overcharge' },
  ],
  infernal: [
    { id: 'soul_well', name: 'Soul Well', faction: 'infernal', cost: 25, baseIncome: 0,
      description: 'Chaotic souls: 0-25g per wave. High variance.', mechanic: 'gamble', gambleMax: 25 },
    { id: 'blood_pact', name: 'Blood Pact', faction: 'infernal', cost: 175, baseIncome: 20,
      description: 'Dig deeper into damnation. +1/wave but 15% collapse risk.', mechanic: 'dig' },
  ],
  celestial: [
    { id: 'tithe', name: 'Tithe', faction: 'celestial', cost: 55, baseIncome: 5,
      description: 'Steady holy income. The faithful provide.', mechanic: 'steady' },
    { id: 'miracle', name: 'Miracle', faction: 'celestial', cost: 225, baseIncome: 20,
      description: 'Grows steadily. Harvest for a divine payout.', mechanic: 'grow' },
  ],
  psionic: [
    { id: 'dream_tap', name: 'Dream Tap', faction: 'psionic', cost: 40, baseIncome: 0,
      description: 'Harvest subconscious: 0-25g per wave.', mechanic: 'gamble', gambleMax: 25 },
    { id: 'mind_prison', name: 'Mind Prison', faction: 'psionic', cost: 225, baseIncome: 25,
      description: 'Overcharge for 3x psychic burst, dormant 2 waves.', mechanic: 'overcharge' },
  ],
  harmonic: [
    { id: 'resonance_chamber', name: 'Resonance Chamber', faction: 'harmonic', cost: 50, baseIncome: 4,
      description: 'Grows +2 per wave. Harmonizes with your network.', mechanic: 'grow' },
    { id: 'symphony_hall', name: 'Symphony Hall', faction: 'harmonic', cost: 225, baseIncome: 25,
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
    cost: 44, baseIncome: 4,
    description: 'Basic income structure. +4g per wave.',
    mechanic: 'steady',
  },
  {
    id: 'outpost_2', name: 'Trading Post', faction: 'arcane',
    cost: 225, baseIncome: 25,
    description: 'Upgraded income structure. +25g per wave.',
    mechanic: 'steady',
  },
];
