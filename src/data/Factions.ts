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
    description: 'Precision magic. Crits, AoE, shields, and spell amplification.',
    primaryColor: 0x6644ff,
    secondaryColor: 0x9988ff,
    towerIds: ['arcane_bolt', 'arcane_storm', 'arcane_frost', 'arcane_focus', 'arcane_meteor', 'arcane_spellweave', 'arcane_drain'],
  },
  mechanical: {
    id: 'mechanical',
    name: 'Mechanical',
    description: 'Efficiency engineering. Ramp-up DPS, burn, piercing, and overclocking.',
    primaryColor: 0xcc8833,
    secondaryColor: 0xeebb66,
    towerIds: ['mech_turret', 'mech_tesla', 'mech_wall', 'mech_flamethrower', 'mech_railgun', 'mech_overclocker', 'mech_mortar'],
  },
  nature: {
    id: 'nature',
    name: 'Nature',
    description: 'Living defences. Poison, roots, growth scaling, and adjacency synergy.',
    primaryColor: 0x33aa44,
    secondaryColor: 0x66dd77,
    towerIds: ['nature_thorn', 'nature_root', 'nature_blossom', 'nature_spore', 'nature_vine', 'nature_treant', 'nature_bramble'],
  },
  void: {
    id: 'void',
    name: 'Void',
    description: 'Chaotic powers. Variance, gold gen, teleport, armor shred, and gambling.',
    primaryColor: 0x8822aa,
    secondaryColor: 0xbb55dd,
    towerIds: ['void_spike', 'void_siphon', 'void_rift', 'void_beam', 'void_entropy', 'void_gambler', 'void_anchor'],
  },
};

export const FACTION_ORDER: FactionId[] = ['arcane', 'mechanical', 'nature', 'void'];

export function getFaction(id: FactionId): Faction {
  return FACTIONS[id];
}
