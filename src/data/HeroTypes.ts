export type HeroId = 'warden' | 'arcanist' | 'shadow';

export interface AbilityDef {
  name: string;
  key: string;        // Q, W, E
  description: string;
  cooldown: number;    // seconds
  type: 'stun' | 'self_buff' | 'aoe' | 'skillshot' | 'dash' | 'teleport' | 'execute';
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
}

export interface HeroTypeDef {
  id: HeroId;
  name: string;
  description: string;
  hp: number;
  damage: number;
  attackSpeed: number;  // attacks per second
  attackRange: number;  // pixels
  moveSpeed: number;    // pixels per second
  color: number;
  abilities: [AbilityDef, AbilityDef, AbilityDef]; // Q, W, E
}

export const HERO_TYPES: Record<HeroId, HeroTypeDef> = {
  warden: {
    id: 'warden',
    name: 'Warden',
    description: 'Tanky frontliner. Stuns, rallies allies, slams the ground.',
    hp: 500,
    damage: 25,
    attackSpeed: 1.0,
    attackRange: 36,
    moveSpeed: 140,
    color: 0x4488ff,
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
  },
  arcanist: {
    id: 'arcanist',
    name: 'Arcanist',
    description: 'Ranged caster. Fireballs, frost novas, and blink escapes.',
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
  },
  shadow: {
    id: 'shadow',
    name: 'Shadow',
    description: 'Fast assassin. Dashes, dodges, and executes low-HP targets.',
    hp: 320,
    damage: 55,
    attackSpeed: 1.5,
    attackRange: 36,
    moveSpeed: 180,
    color: 0xff4488,
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
  },
};

export const HERO_ORDER: HeroId[] = ['warden', 'arcanist', 'shadow'];
