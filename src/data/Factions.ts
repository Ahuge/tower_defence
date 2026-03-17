export type FactionId = 'arcane' | 'mechanical' | 'nature' | 'void';

export interface Faction {
  id: FactionId;
  name: string;
  description: string;
  primaryColor: number;
  secondaryColor: number;
  towerIds: string[];
}

export const FACTIONS: Record<FactionId, Faction> = {
  arcane: {
    id: 'arcane',
    name: 'Arcane',
    description: 'Masters of magical energy. Balanced damage with CC.',
    primaryColor: 0x6644ff,
    secondaryColor: 0x9988ff,
    towerIds: ['arcane_bolt', 'arcane_storm', 'arcane_frost'],
  },
  mechanical: {
    id: 'mechanical',
    name: 'Mechanical',
    description: 'Precision engineering. Ramp-up DPS and utility.',
    primaryColor: 0xcc8833,
    secondaryColor: 0xeebb66,
    towerIds: ['mech_turret', 'mech_tesla', 'mech_wall'],
  },
  nature: {
    id: 'nature',
    name: 'Nature',
    description: 'Living defences. Buffs, CC, and adjacency synergies.',
    primaryColor: 0x33aa44,
    secondaryColor: 0x66dd77,
    towerIds: ['nature_thorn', 'nature_root', 'nature_blossom'],
  },
  void: {
    id: 'void',
    name: 'Void',
    description: 'Chaotic powers. High variance, gold generation, displacement.',
    primaryColor: 0x8822aa,
    secondaryColor: 0xbb55dd,
    towerIds: ['void_spike', 'void_siphon', 'void_rift'],
  },
};

export const FACTION_ORDER: FactionId[] = ['arcane', 'mechanical', 'nature', 'void'];

export function getFaction(id: FactionId): Faction {
  return FACTIONS[id];
}
