export type HeroId = 'warden' | 'arcanist' | 'shadow'
  | 'paladin' | 'ranger' | 'berserker' | 'necromancer' | 'monk'
  | 'engineer' | 'duelist' | 'druid';

export interface AbilityDef {
  name: string;
  key: string;        // Q, W, E, R
  description: string;
  cooldown: number;    // seconds
  type: 'stun' | 'self_buff' | 'aoe' | 'skillshot' | 'dash' | 'teleport' | 'execute'
    | 'taunt' | 'meteor_storm' | 'death_mark';
  damage?: number;
  splashRadius?: number;
  stunDuration?: number;
  buffStat?: string;
  buffAmount?: number;
  buffDuration?: number;
  slowAmount?: number;
  slowDuration?: number;
  range?: number;
  hpThreshold?: number; // for execute
  damageBelow?: number;
  damageAbove?: number;
  dashRange?: number;
  ampPercent?: number;
  dodgeChance?: number;
  dodgeDuration?: number;
  // Ultimate-specific
  invulnDuration?: number; // taunt
  meteorCount?: number;    // meteor_storm
  meteorInterval?: number; // ms between meteors
  meteorDamage?: number;
  meteorRadius?: number;
  markDuration?: number;   // death_mark
  markBonusPct?: number;   // death_mark bonus damage %
}

export interface HeroTypeDef {
  id: HeroId;
  name: string;
  faction: string;      // faction ID this hero belongs to
  description: string;
  hp: number;
  damage: number;
  attackSpeed: number;  // attacks per second
  attackRange: number;  // pixels
  moveSpeed: number;    // pixels per second
  color: number;
  baseArmor?: number;    // innate armor (flat damage reduction)
  abilities: [AbilityDef, AbilityDef, AbilityDef]; // Q, W, E
  ultimate?: AbilityDef; // R
}

export const HERO_TYPES: Record<HeroId, HeroTypeDef> = {
  warden: {
    id: 'warden',
    name: 'Warden',
    faction: 'military',
    description: 'Military commander. Stuns, rallies troops, slams the ground.',
    hp: 650,
    damage: 25,
    attackSpeed: 1.0,
    attackRange: 36,
    moveSpeed: 140,
    color: 0x4488ff,
    baseArmor: 8,
    abilities: [
      {
        name: 'Shield Bash',
        key: 'Q',
        description: 'Stun target for 1.5s',
        cooldown: 8,
        type: 'stun',
        damage: 40,
        stunDuration: 1.5,
      },
      {
        name: 'War Cry',
        key: 'W',
        description: '+40% attack speed for 6s',
        cooldown: 20,
        type: 'self_buff',
        buffStat: 'attackSpeed',
        buffAmount: 0.4,
        buffDuration: 6,
      },
      {
        name: 'Ground Slam',
        key: 'E',
        description: 'AoE 15 dmg + slow in radius',
        cooldown: 30,
        type: 'aoe',
        damage: 15,
        splashRadius: 70,
        slowAmount: 0.3,
        slowDuration: 1.5,
      },
    ],
    ultimate: {
      name: 'Fortress',
      key: 'R',
      description: 'Invulnerable 5s + taunt all creeps',
      cooldown: 90,
      type: 'taunt',
      invulnDuration: 5,
    },
  },
  arcanist: {
    id: 'arcanist',
    name: 'Arcanist',
    faction: 'arcane',
    description: 'Arcane spellweaver. Fireballs, frost novas, and blink escapes.',
    hp: 280,
    damage: 40,
    attackSpeed: 0.8,
    attackRange: 200,
    moveSpeed: 120,
    color: 0xaa44ff,
    abilities: [
      {
        name: 'Fireball',
        key: 'Q',
        description: 'Skillshot: 100 dmg + 60 splash',
        cooldown: 6,
        type: 'skillshot',
        damage: 100,
        splashRadius: 80,
      },
      {
        name: 'Frost Nova',
        key: 'W',
        description: 'AoE slow all nearby for 4s',
        cooldown: 15,
        type: 'aoe',
        damage: 30,
        splashRadius: 120,
        slowAmount: 0.6,
        slowDuration: 4,
      },
      {
        name: 'Blink',
        key: 'E',
        description: 'Teleport to target location',
        cooldown: 25,
        type: 'teleport',
        range: 300,
      },
    ],
    ultimate: {
      name: 'Meteor Storm',
      key: 'R',
      description: '3 meteors over 3s, 150 dmg each, 100px AoE',
      cooldown: 120,
      type: 'meteor_storm',
      meteorCount: 3,
      meteorInterval: 1000,
      meteorDamage: 150,
      meteorRadius: 100,
    },
  },
  shadow: {
    id: 'shadow',
    name: 'Shadow',
    faction: 'void',
    description: 'Void assassin. Dashes through shadows, dodges, and executes the weak.',
    hp: 420,
    damage: 55,
    attackSpeed: 1.5,
    attackRange: 36,
    moveSpeed: 180,
    color: 0xff4488,
    baseArmor: 3,
    abilities: [
      {
        name: 'Shadow Strike',
        key: 'Q',
        description: 'Dash to target + mark (+25% amp)',
        cooldown: 5,
        type: 'dash',
        damage: 60,
        dashRange: 200,
        ampPercent: 25,
      },
      {
        name: 'Evasion',
        key: 'W',
        description: '100% dodge for 2s',
        cooldown: 12,
        type: 'self_buff',
        dodgeChance: 1.0,
        dodgeDuration: 2,
      },
      {
        name: 'Execute',
        key: 'E',
        description: '200 dmg if <30% HP, else 50',
        cooldown: 20,
        type: 'execute',
        hpThreshold: 0.3,
        damageBelow: 200,
        damageAbove: 50,
      },
    ],
    ultimate: {
      name: 'Death Mark',
      key: 'R',
      description: 'Mark all creeps; after 3s deal 30% of damage dealt as bonus',
      cooldown: 100,
      type: 'death_mark',
      markDuration: 3,
      markBonusPct: 30,
    },
  },
  paladin: {
    id: 'paladin',
    name: 'Paladin',
    faction: 'celestial',
    description: 'Celestial champion. Channels divine light to shield and smite.',
    hp: 600,
    damage: 30,
    attackSpeed: 0.9,
    attackRange: 36,
    moveSpeed: 130,
    color: 0xffdd44,
    baseArmor: 6,
    abilities: [
      {
        name: 'Smite',
        key: 'Q',
        description: 'Stun target 1s + 60 holy dmg',
        cooldown: 7,
        type: 'stun',
        damage: 60,
        stunDuration: 1,
      },
      {
        name: 'Holy Shield',
        key: 'W',
        description: '+50% dodge for 3s',
        cooldown: 18,
        type: 'self_buff',
        dodgeChance: 0.5,
        dodgeDuration: 3,
      },
      {
        name: 'Consecration',
        key: 'E',
        description: 'AoE 40 dmg + slow in 90px',
        cooldown: 22,
        type: 'aoe',
        damage: 40,
        splashRadius: 90,
        slowAmount: 0.25,
        slowDuration: 2,
      },
    ],
    ultimate: {
      name: 'Divine Judgment',
      key: 'R',
      description: 'Invulnerable 4s + taunt all creeps',
      cooldown: 100,
      type: 'taunt',
      invulnDuration: 4,
    },
  },
  ranger: {
    id: 'ranger',
    name: 'Ranger',
    faction: 'harmonic',
    description: 'Harmonic marksman. Balances precision and rhythm to pick off targets.',
    hp: 250,
    damage: 45,
    attackSpeed: 1.2,
    attackRange: 240,
    moveSpeed: 150,
    color: 0x44cc44,
    abilities: [
      {
        name: 'Power Shot',
        key: 'Q',
        description: 'Skillshot: 120 dmg + pierce splash',
        cooldown: 5,
        type: 'skillshot',
        damage: 120,
        splashRadius: 60,
      },
      {
        name: 'Frost Arrow',
        key: 'W',
        description: 'AoE 20 dmg + 50% slow 3s',
        cooldown: 12,
        type: 'aoe',
        damage: 20,
        splashRadius: 100,
        slowAmount: 0.5,
        slowDuration: 3,
      },
      {
        name: 'Disengage',
        key: 'E',
        description: 'Teleport backward 200px',
        cooldown: 15,
        type: 'teleport',
        range: 200,
      },
    ],
    ultimate: {
      name: 'Arrow Storm',
      key: 'R',
      description: '5 volleys over 3s, 80 dmg each, 120px AoE',
      cooldown: 90,
      type: 'meteor_storm',
      meteorCount: 5,
      meteorInterval: 600,
      meteorDamage: 80,
      meteorRadius: 120,
    },
  },
  berserker: {
    id: 'berserker',
    name: 'Berserker',
    faction: 'infernal',
    description: 'Infernal fiend. Burns hotter as health drops. High risk, high reward.',
    hp: 550,
    damage: 45,
    attackSpeed: 1.3,
    attackRange: 36,
    moveSpeed: 160,
    color: 0xff4444,
    baseArmor: 2,
    abilities: [
      {
        name: 'Cleave',
        key: 'Q',
        description: 'AoE 50 dmg in 60px radius',
        cooldown: 5,
        type: 'aoe',
        damage: 50,
        splashRadius: 60,
      },
      {
        name: 'Blood Rage',
        key: 'W',
        description: '+60% attack speed for 5s',
        cooldown: 16,
        type: 'self_buff',
        buffStat: 'attackSpeed',
        buffAmount: 0.6,
        buffDuration: 5,
      },
      {
        name: 'Leap',
        key: 'E',
        description: 'Dash to target + 80 dmg',
        cooldown: 10,
        type: 'dash',
        damage: 80,
        dashRange: 250,
      },
    ],
    ultimate: {
      name: 'Rampage',
      key: 'R',
      description: 'Invulnerable 3s + taunt all (short but fierce)',
      cooldown: 80,
      type: 'taunt',
      invulnDuration: 3,
    },
  },
  necromancer: {
    id: 'necromancer',
    name: 'Necromancer',
    faction: 'aliens',
    description: 'Spawn host. Drains life force, curses prey, and marks for harvest.',
    hp: 260,
    damage: 35,
    attackSpeed: 0.9,
    attackRange: 180,
    moveSpeed: 110,
    color: 0x66ff66,
    abilities: [
      {
        name: 'Soul Siphon',
        key: 'Q',
        description: 'Skillshot: 90 dmg to target + splash',
        cooldown: 6,
        type: 'skillshot',
        damage: 90,
        splashRadius: 70,
      },
      {
        name: 'Curse',
        key: 'W',
        description: 'AoE 25 dmg + 40% slow 3s in 110px',
        cooldown: 14,
        type: 'aoe',
        damage: 25,
        splashRadius: 110,
        slowAmount: 0.4,
        slowDuration: 3,
      },
      {
        name: 'Drain Life',
        key: 'E',
        description: '150 dmg if <40% HP, else 40',
        cooldown: 18,
        type: 'execute',
        hpThreshold: 0.4,
        damageBelow: 150,
        damageAbove: 40,
      },
    ],
    ultimate: {
      name: 'Soul Harvest',
      key: 'R',
      description: 'Mark all creeps; after 3s deal 35% bonus dmg',
      cooldown: 95,
      type: 'death_mark',
      markDuration: 3,
      markBonusPct: 35,
    },
  },
  monk: {
    id: 'monk',
    name: 'Monk',
    faction: 'psionic',
    description: 'Psionic adept. Channels inner focus into devastating combos.',
    hp: 480,
    damage: 40,
    attackSpeed: 1.8,
    attackRange: 36,
    moveSpeed: 190,
    color: 0xff8844,
    baseArmor: 4,
    abilities: [
      {
        name: 'Palm Strike',
        key: 'Q',
        description: 'Stun target 0.8s + 50 dmg',
        cooldown: 4,
        type: 'stun',
        damage: 50,
        stunDuration: 0.8,
      },
      {
        name: 'Inner Focus',
        key: 'W',
        description: '100% dodge for 1.5s',
        cooldown: 10,
        type: 'self_buff',
        dodgeChance: 1.0,
        dodgeDuration: 1.5,
      },
      {
        name: 'Flying Kick',
        key: 'E',
        description: 'Dash to target + 70 dmg + amp 20%',
        cooldown: 7,
        type: 'dash',
        damage: 70,
        dashRange: 180,
        ampPercent: 20,
      },
    ],
    ultimate: {
      name: 'Thousand Fists',
      key: 'R',
      description: '4 rapid strikes over 2s, 100 dmg each, 80px AoE',
      cooldown: 75,
      type: 'meteor_storm',
      meteorCount: 4,
      meteorInterval: 500,
      meteorDamage: 100,
      meteorRadius: 80,
    },
  },
  engineer: {
    id: 'engineer',
    name: 'Engineer',
    faction: 'mechanical',
    description: 'Mechanical genius. Bombards with gadgets and controls the battlefield.',
    hp: 300,
    damage: 50,
    attackSpeed: 0.7,
    attackRange: 220,
    moveSpeed: 115,
    color: 0xccaa44,
    abilities: [
      {
        name: 'Frag Grenade',
        key: 'Q',
        description: 'Skillshot: 110 dmg + wide splash',
        cooldown: 7,
        type: 'skillshot',
        damage: 110,
        splashRadius: 100,
      },
      {
        name: 'Tar Bomb',
        key: 'W',
        description: 'AoE 15 dmg + 70% slow 4s in 130px',
        cooldown: 18,
        type: 'aoe',
        damage: 15,
        splashRadius: 130,
        slowAmount: 0.7,
        slowDuration: 4,
      },
      {
        name: 'Grapple',
        key: 'E',
        description: 'Teleport to location (250px)',
        cooldown: 20,
        type: 'teleport',
        range: 250,
      },
    ],
    ultimate: {
      name: 'Carpet Bomb',
      key: 'R',
      description: '6 bombs over 3s, 90 dmg each, 110px AoE',
      cooldown: 110,
      type: 'meteor_storm',
      meteorCount: 6,
      meteorInterval: 500,
      meteorDamage: 90,
      meteorRadius: 110,
    },
  },
  duelist: {
    id: 'duelist',
    name: 'Duelist',
    faction: 'cypherpunk',
    description: 'Cypherpunk blade dancer. Parries, ripostes, and dismantles targets with precision.',
    hp: 440,
    damage: 50,
    attackSpeed: 1.6,
    attackRange: 36,
    moveSpeed: 170,
    color: 0xcc44cc,
    baseArmor: 5,
    abilities: [
      {
        name: 'Riposte',
        key: 'Q',
        description: 'Stun target 1.2s + 55 dmg',
        cooldown: 6,
        type: 'stun',
        damage: 55,
        stunDuration: 1.2,
      },
      {
        name: 'Parry',
        key: 'W',
        description: '100% dodge for 1.5s + 30% AS for 4s',
        cooldown: 14,
        type: 'self_buff',
        dodgeChance: 1.0,
        dodgeDuration: 1.5,
        buffStat: 'attackSpeed',
        buffAmount: 0.3,
        buffDuration: 4,
      },
      {
        name: 'Lunge',
        key: 'E',
        description: 'Dash to target + 90 dmg + amp 30%',
        cooldown: 8,
        type: 'dash',
        damage: 90,
        dashRange: 160,
        ampPercent: 30,
      },
    ],
    ultimate: {
      name: 'Perfect Storm',
      key: 'R',
      description: 'Mark all creeps; after 3s deal 40% bonus dmg',
      cooldown: 85,
      type: 'death_mark',
      markDuration: 3,
      markBonusPct: 40,
    },
  },
  druid: {
    id: 'druid',
    name: 'Druid',
    faction: 'nature',
    description: 'Nature guardian. Entangles with roots, bursts thorns, and shifts form.',
    hp: 380,
    damage: 30,
    attackSpeed: 1.0,
    attackRange: 160,
    moveSpeed: 135,
    color: 0x44aa88,
    abilities: [
      {
        name: 'Entangle',
        key: 'Q',
        description: 'Stun target 2s + 30 dmg',
        cooldown: 9,
        type: 'stun',
        damage: 30,
        stunDuration: 2,
      },
      {
        name: 'Thornburst',
        key: 'W',
        description: 'AoE 45 dmg + 30% slow 2s in 100px',
        cooldown: 13,
        type: 'aoe',
        damage: 45,
        splashRadius: 100,
        slowAmount: 0.3,
        slowDuration: 2,
      },
      {
        name: 'Wild Shift',
        key: 'E',
        description: '+80% attack speed for 6s',
        cooldown: 24,
        type: 'self_buff',
        buffStat: 'attackSpeed',
        buffAmount: 0.8,
        buffDuration: 6,
      },
    ],
    ultimate: {
      name: 'Wrath of Nature',
      key: 'R',
      description: '3 nature strikes over 3s, 130 dmg each, 130px AoE',
      cooldown: 100,
      type: 'meteor_storm',
      meteorCount: 3,
      meteorInterval: 1000,
      meteorDamage: 130,
      meteorRadius: 130,
    },
  },
};

export const HERO_ORDER: HeroId[] = [
  'warden', 'arcanist', 'shadow', 'paladin', 'ranger',
  'berserker', 'necromancer', 'monk', 'engineer', 'duelist', 'druid',
];

/** Get the hero belonging to a faction, if any */
export function getHeroForFaction(factionId: string): HeroId | null {
  for (const id of HERO_ORDER) {
    if (HERO_TYPES[id].faction === factionId) return id;
  }
  return null;
}
