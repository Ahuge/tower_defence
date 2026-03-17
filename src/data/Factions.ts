export type FactionId = 'arcane' | 'mechanical' | 'nature' | 'void' | 'random';

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
    description: 'Precision magic. Crits, AoE, and spell amplification.',
    primaryColor: 0x6644ff,
    secondaryColor: 0x9988ff,
    towerIds: ['arcane_bolt', 'arcane_frost', 'arcane_storm', 'arcane_focus', 'arcane_drain', 'arcane_meteor', 'arcane_nova'],
  },
  mechanical: {
    id: 'mechanical',
    name: 'Mechanical',
    description: 'Engineering and firepower. Burn, pierce, and raw efficiency.',
    primaryColor: 0xcc8833,
    secondaryColor: 0xeebb66,
    towerIds: ['mech_wall', 'mech_turret', 'mech_flamethrower', 'mech_tesla', 'mech_mortar', 'mech_shredder', 'mech_railgun', 'mech_titan'],
  },
  nature: {
    id: 'nature',
    name: 'Nature',
    description: 'Growth and synergy. Poison, roots, and adjacency buffs.',
    primaryColor: 0x33aa44,
    secondaryColor: 0x66dd77,
    towerIds: ['nature_thorn', 'nature_root', 'nature_blossom', 'nature_spore', 'nature_vine', 'nature_elder'],
  },
  void: {
    id: 'void',
    name: 'Void',
    description: 'Pure chaos. Gambling, gold gen, and teleportation.',
    primaryColor: 0x8822aa,
    secondaryColor: 0xbb55dd,
    towerIds: ['void_gambler', 'void_spike', 'void_siphon', 'void_rift', 'void_oblivion'],
  },
  random: {
    id: 'random',
    name: 'Random',
    description: '6 random towers each wave from all factions. Adapt or die.',
    primaryColor: 0xcccccc,
    secondaryColor: 0xffffff,
    towerIds: [], // Populated dynamically each wave
  },
};

export const FACTION_ORDER: FactionId[] = ['arcane', 'mechanical', 'nature', 'void', 'random'];

export function getFaction(id: FactionId): Faction {
  return FACTIONS[id];
}
