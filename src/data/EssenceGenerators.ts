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
    essencePerSec: 0.1,
    description: '+0.1 essence/sec. The foundation of your economy.',
  },
  {
    id: 'gen_improved',
    name: 'Essence Well',
    cost: 80,
    essencePerSec: 0.3,
    description: '+0.3 essence/sec. Deeper connection to the source.',
  },
  {
    id: 'gen_advanced',
    name: 'Essence Conduit',
    cost: 200,
    essencePerSec: 0.8,
    description: '+0.8 essence/sec. A torrent of raw power.',
  },
  {
    id: 'gen_ultimate',
    name: 'Essence Nexus',
    cost: 500,
    essencePerSec: 2,
    description: '+2 essence/sec. The compound engine.',
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
  // Tier 1 — cheap early sends
  {
    id: 'esend_swarm',
    name: 'Swarm Pack',
    essenceCost: 20,
    incomeReward: 0.5,
    creepType: 'swarm',
    count: 6,
    description: '20e → +0.5g/w. Lots of tiny creeps.',
  },
  {
    id: 'esend_standard',
    name: 'Standard Pack',
    essenceCost: 25,
    incomeReward: 0.75,
    creepType: 'standard',
    count: 4,
    description: '25e → +0.75g/w. Balanced.',
  },
  // Tier 2 — mid-game pressure
  {
    id: 'esend_fast',
    name: 'Fast Pack',
    essenceCost: 38,
    incomeReward: 1.25,
    creepType: 'fast',
    count: 4,
    description: '38e → +1.25g/w. Speedy rush.',
  },
  {
    id: 'esend_armored',
    name: 'Armored Pack',
    essenceCost: 60,
    incomeReward: 1.5,
    creepType: 'armored',
    count: 2,
    description: '60e → +1.5g/w. Tanky and slow.',
  },
  {
    id: 'esend_healer',
    name: 'Healer Pack',
    essenceCost: 75,
    incomeReward: 2,
    creepType: 'healer',
    count: 2,
    description: '75e → +2g/w. Heals nearby creeps.',
  },
  // Tier 3 — expensive threats
  {
    id: 'esend_shielded',
    name: 'Shielded Pack',
    essenceCost: 100,
    incomeReward: 2.5,
    creepType: 'shielded',
    count: 2,
    description: '100e → +2.5g/w. Max 1 dmg per hit until shield breaks.',
  },
  {
    id: 'esend_iron_mage',
    name: 'Iron Mage',
    essenceCost: 120,
    incomeReward: 3,
    creepType: 'mage_armor',
    count: 1,
    description: '120e → +3g/w. Aura: +1 armor to nearby creeps.',
  },
  {
    id: 'esend_haste_mage',
    name: 'Haste Mage',
    essenceCost: 120,
    incomeReward: 3,
    creepType: 'mage_speed',
    count: 1,
    description: '120e → +3g/w. Aura: +30% speed to nearby creeps.',
  },
  // Tier 4 — flying + splitters
  {
    id: 'esend_flying',
    name: 'Flying Squad',
    essenceCost: 150,
    incomeReward: 3.5,
    creepType: 'flying',
    count: 3,
    description: '150e → +3.5g/w. Ignores maze, flies direct.',
  },
  {
    id: 'esend_splitter',
    name: 'Splitter Duo',
    essenceCost: 160,
    incomeReward: 4,
    creepType: 'splitter',
    count: 2,
    description: '160e → +4g/w. Splits into smaller creeps on death.',
  },
  // Tier 5 — boss
  {
    id: 'esend_boss',
    name: 'Boss Send',
    essenceCost: 300,
    incomeReward: 8,
    creepType: 'boss',
    count: 1,
    description: '300e → +8g/w. Massive HP, shielded, armored.',
  },
];
