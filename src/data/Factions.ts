export type FactionId = 'arcane' | 'mechanical' | 'nature' | 'void' | 'military' | 'aliens' | 'cypherpunk' | 'infernal' | 'celestial' | 'psionic' | 'harmonic' | 'random';

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
    description: 'High Fantasy precision magic. Crits, AoE, and spell amplification.',
    primaryColor: 0x6644ff,
    secondaryColor: 0x9988ff,
    towerIds: ['arcane_bolt', 'arcane_frost', 'arcane_storm', 'arcane_focus', 'arcane_drain', 'arcane_meteor', 'arcane_nova'],
  },
  mechanical: {
    id: 'mechanical',
    name: 'Mechanical',
    description: 'Steampunk engineering and firepower. Burn, pierce, and raw efficiency.',
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
    towerIds: ['nature_bramble', 'nature_root', 'nature_dartfrog', 'nature_blossom', 'nature_spore', 'nature_sunroot', 'nature_vine', 'nature_elder'],
  },
  void: {
    id: 'void',
    name: 'Void',
    description: 'Pure chaos. Gambling, gold gen, and teleportation.',
    primaryColor: 0x8822aa,
    secondaryColor: 0xbb55dd,
    towerIds: ['void_gambler', 'void_spike', 'void_siphon', 'void_rift', 'void_oblivion'],
  },
  military: {
    id: 'military',
    name: 'Military',
    description: 'Mobile units that move to engage. Walls, wire, and boots on the ground.',
    primaryColor: 0x556b2f,
    secondaryColor: 0x8fbc8f,
    towerIds: ['mil_sandbag', 'mil_wire', 'mil_rifleman', 'mil_brawler', 'mil_heavy', 'mil_commander'],
  },
  aliens: {
    id: 'aliens',
    name: 'Spawn Aliens',
    description: 'The hive hungers. Cheap, fast, overwhelming insectoid swarms.',
    primaryColor: 0x88ff44,
    secondaryColor: 0xaaff66,
    towerIds: ['alien_spitter', 'alien_stinger', 'alien_swarm_node', 'alien_acid', 'alien_hive_spire', 'alien_brood_mother', 'alien_swarmling', 'alien_overmind'],
  },
  cypherpunk: {
    id: 'cypherpunk',
    name: 'Cypherpunk',
    description: 'Everything is data. Hack, infect, and rewrite reality. Hack the planet',
    primaryColor: 0x00ffcc,
    secondaryColor: 0x44ffdd,
    towerIds: ['cyber_ping', 'cyber_firewall', 'cyber_virus', 'cyber_backdoor', 'cyber_ddos', 'cyber_rootkit', 'cyber_zeroday'],
  },
  infernal: {
    id: 'infernal',
    name: 'Infernal',
    description: 'Power at any price. Towers decay, expire, or sacrifice.',
    primaryColor: 0xff4422,
    secondaryColor: 0xff8844,
    towerIds: ['infernal_imp', 'infernal_hellfire', 'infernal_soul_drain', 'infernal_bomber', 'infernal_immolate', 'infernal_apocalypse'],
  },
  celestial: {
    id: 'celestial',
    name: 'Celestial',
    description: 'The light endures. Gain lives, block leaks, silence mages.',
    primaryColor: 0xffffaa,
    secondaryColor: 0xffffff,
    towerIds: ['celestial_acolyte', 'celestial_ward', 'celestial_smite', 'celestial_sanctuary', 'celestial_absolution'],
  },
  psionic: {
    id: 'psionic',
    name: 'Psionic',
    description: 'Your thoughts betray you. True damage ignoring all armor.',
    primaryColor: 0xdd88ff,
    secondaryColor: 0xee99ff,
    towerIds: ['psi_probe', 'psi_mesmer', 'psi_terror', 'psi_mind_spike', 'psi_overmind'],
  },
  harmonic: {
    id: 'harmonic',
    name: 'Harmonic',
    description: 'Alone, a whisper. Together, a symphony. Aura network.',
    primaryColor: 0xffcc44,
    secondaryColor: 0xffee88,
    towerIds: ['harmonic_resonator', 'harmonic_amplifier', 'harmonic_quickener', 'harmonic_reach', 'harmonic_critical_mass', 'harmonic_conduit', 'harmonic_crescendo'],
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

export const FACTION_ORDER: FactionId[] = ['arcane', 'mechanical', 'nature', 'void', 'military', 'aliens', 'cypherpunk', 'infernal', 'celestial', 'psionic', 'harmonic', 'random'];

export function getFaction(id: FactionId): Faction {
  return FACTIONS[id];
}
