/**
 * Essence Generators — buy with Gold, increase Essence/sec.
 * Used in Dual Economy (Battle) mode instead of Frontier buildings.
 */
export interface EssenceGenerator {
  id: string;
  name: string;
  cost: number; // gold cost
  essencePerSec: number; // essence generation rate
  description: string;
}

export const ESSENCE_GENERATORS: EssenceGenerator[] = [
  {
    id: 'gen_basic',
    name: 'Essence Tap',
    cost: 30,
    essencePerSec: 1,
    description: '+1 essence/sec. The foundation of your economy.',
  },
  {
    id: 'gen_improved',
    name: 'Essence Well',
    cost: 80,
    essencePerSec: 3,
    description: '+3 essence/sec. Deeper connection to the source.',
  },
  {
    id: 'gen_advanced',
    name: 'Essence Conduit',
    cost: 200,
    essencePerSec: 8,
    description: '+8 essence/sec. A torrent of raw power.',
  },
  {
    id: 'gen_ultimate',
    name: 'Essence Nexus',
    cost: 500,
    essencePerSec: 20,
    description: '+20 essence/sec. The compound engine.',
  },
];

/**
 * Essence send costs — in Dual Economy, sends cost Essence not Gold.
 * Each send still gives Gold income bonus per wave.
 */
export interface EssenceSendOption {
  id: string;
  name: string;
  essenceCost: number;
  incomeReward: number; // gold income per wave
  creepType: string;
  count: number;
  description: string;
}

export const ESSENCE_SENDS: EssenceSendOption[] = [
  {
    id: 'esend_standard',
    name: 'Standard Pack',
    essenceCost: 10,
    incomeReward: 3,
    creepType: 'standard',
    count: 4,
    description: '10 essence → +3g income/wave',
  },
  {
    id: 'esend_fast',
    name: 'Fast Pack',
    essenceCost: 15,
    incomeReward: 5,
    creepType: 'fast',
    count: 3,
    description: '15 essence → +5g income/wave',
  },
  {
    id: 'esend_armored',
    name: 'Armored Pack',
    essenceCost: 30,
    incomeReward: 8,
    creepType: 'armored',
    count: 2,
    description: '30 essence → +8g income/wave',
  },
  {
    id: 'esend_swarm',
    name: 'Swarm Pack',
    essenceCost: 8,
    incomeReward: 2,
    creepType: 'swarm',
    count: 5,
    description: '8 essence → +2g income/wave',
  },
];
