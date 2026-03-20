export interface SendCreepOption {
  id: string;
  name: string;
  creepType: string; // references CreepTypes
  count: number;
  cost: number;
  incomeReward: number; // permanent income bonus per wave
  description: string;
  tier: number; // 1 = basic, 2 = unlocks later
  unlockWave: number; // available from this wave onward (0 = always)
}

/** Get scaled cost for a send based on current wave */
export function getSendCost(base: number, wave: number): number {
  // +10% per 5 waves, rounded to nearest 5
  const scale = 1 + Math.floor(wave / 5) * 0.1;
  return Math.round((base * scale) / 5) * 5;
}

/** Get scaled income reward for a send based on current wave */
export function getSendIncome(base: number, wave: number): number {
  // +0.5 per 10 waves (late sends are more rewarding to compensate for cost)
  return +(base + Math.floor(wave / 10) * 0.5).toFixed(1);
}

// === Tier 1 — always available ===
export const SEND_OPTIONS: SendCreepOption[] = [
  {
    id: 'send_standard',
    name: 'Standard Pack',
    creepType: 'standard',
    count: 4,
    cost: 20,
    incomeReward: 2,
    description: '+4 standard creeps',
    tier: 1,
    unlockWave: 0,
  },
  {
    id: 'send_fast',
    name: 'Fast Pack',
    creepType: 'fast',
    count: 3,
    cost: 30,
    incomeReward: 3,
    description: '+3 fast creeps',
    tier: 1,
    unlockWave: 0,
  },
  {
    id: 'send_armored',
    name: 'Armored Pack',
    creepType: 'armored',
    count: 2,
    cost: 50,
    incomeReward: 5,
    description: '+2 armored creeps',
    tier: 1,
    unlockWave: 0,
  },
  {
    id: 'send_swarm',
    name: 'Swarm Pack',
    creepType: 'swarm',
    count: 5,
    cost: 15,
    incomeReward: 1,
    description: '+15 tiny creeps',
    tier: 1,
    unlockWave: 0,
  },

  // === Tier 2 — unlock at wave 10+ ===
  {
    id: 'send_healer',
    name: 'Healer Pack',
    creepType: 'healer',
    count: 2,
    cost: 70,
    incomeReward: 6,
    description: '+2 healers (heal nearby)',
    tier: 2,
    unlockWave: 10,
  },
  {
    id: 'send_shielded',
    name: 'Shielded Pack',
    creepType: 'shielded',
    count: 2,
    cost: 80,
    incomeReward: 7,
    description: '+2 shielded (1 dmg/hit cap)',
    tier: 2,
    unlockWave: 10,
  },
  {
    id: 'send_flying',
    name: 'Flying Squad',
    creepType: 'flying',
    count: 3,
    cost: 90,
    incomeReward: 8,
    description: '+3 flying (bypass maze)',
    tier: 2,
    unlockWave: 15,
  },
  {
    id: 'send_regen',
    name: 'Regen Pack',
    creepType: 'regenerator',
    count: 2,
    cost: 100,
    incomeReward: 9,
    description: '+2 regenerators (2%hp/s)',
    tier: 2,
    unlockWave: 20,
  },
];
