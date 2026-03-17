export interface SendCreepOption {
  id: string;
  name: string;
  creepType: string; // references CreepTypes
  count: number;
  cost: number;
  incomeReward: number; // permanent income bonus per wave
  description: string;
}

export const SEND_OPTIONS: SendCreepOption[] = [
  {
    id: 'send_standard',
    name: 'Standard Pack',
    creepType: 'standard',
    count: 4,
    cost: 20,
    incomeReward: 2,
    description: '+4 standard creeps, +2 income/wave',
  },
  {
    id: 'send_fast',
    name: 'Fast Pack',
    creepType: 'fast',
    count: 3,
    cost: 30,
    incomeReward: 3,
    description: '+3 fast creeps, +3 income/wave',
  },
  {
    id: 'send_armored',
    name: 'Armored Pack',
    creepType: 'armored',
    count: 2,
    cost: 50,
    incomeReward: 5,
    description: '+2 armored creeps, +5 income/wave',
  },
  {
    id: 'send_swarm',
    name: 'Swarm Pack',
    creepType: 'swarm',
    count: 5,
    cost: 15,
    incomeReward: 1,
    description: '+15 tiny creeps, +1 income/wave',
  },
];
