import { DamageType } from './CreepTypes';
import { FactionId } from './Factions';
import { Trait } from '../systems/traits/Trait';

export interface TowerType {
  id: string;
  name: string;
  cost: number;
  damage: number;
  damageType: DamageType;
  range: number;
  fireRate: number;
  color: number;
  projectileSpeed: number;
  projectileColor?: number;
  sellRefundRatio: number;
  upgrades: TowerUpgrade[];
  hotkey: string;
  description: string;
  faction?: FactionId;
  traits: Trait[];
  ultimate?: boolean;
}

export interface TowerUpgrade {
  level: number;
  cost: number;
  damage: number;
  range: number;
  fireRate: number;
}

function def(p: Partial<TowerType> & Pick<TowerType, 'id' | 'name' | 'cost' | 'damage' | 'range' | 'fireRate' | 'color' | 'hotkey' | 'description'>): TowerType {
  return {
    damageType: 'physical',
    projectileSpeed: 300,
    sellRefundRatio: 0.5,
    upgrades: [],
    traits: [{ id: 'direct_damage' }],
    ...p,
  };
}

export const TOWER_TYPES: Record<string, TowerType> = {
  // ================================================================
  // GENERIC (used by Random faction pool)
  // ================================================================
  arrow: def({
    id: 'arrow', name: 'Arrow', description: 'Fast physical attacks',
    damageType: 'physical', cost: 20, damage: 8, range: 3.5, fireRate: 600,
    color: 0x4488ff, projectileSpeed: 350, hotkey: '1',
    upgrades: [
      { level: 2, cost: 25, damage: 13, range: 3.5, fireRate: 550 },
      { level: 3, cost: 50, damage: 20, range: 4, fireRate: 480 },
    ],
  }),
  cannon: def({
    id: 'cannon', name: 'Cannon', description: 'AoE splash, slow fire',
    damageType: 'physical', cost: 35, damage: 25, range: 3, fireRate: 1800,
    color: 0xff8844, projectileSpeed: 200, hotkey: '2',
    traits: [{ id: 'splash_damage', radius: 48 }],
    upgrades: [
      { level: 2, cost: 45, damage: 38, range: 3, fireRate: 1600 },
      { level: 3, cost: 80, damage: 55, range: 3.5, fireRate: 1400 },
    ],
  }),
  sniper: def({
    id: 'sniper', name: 'Sniper', description: 'Long range, high damage, very slow',
    damageType: 'magic', cost: 50, damage: 60, range: 6, fireRate: 3000,
    color: 0xaa44ff, projectileSpeed: 500, hotkey: '3',
    upgrades: [
      { level: 2, cost: 65, damage: 95, range: 6.5, fireRate: 2800 },
      { level: 3, cost: 110, damage: 150, range: 7, fireRate: 2500 },
    ],
  }),
  slow: def({
    id: 'slow', name: 'Frost Trap', description: 'No damage, slows enemies',
    damageType: 'magic', cost: 25, damage: 0, range: 3, fireRate: 800,
    color: 0x44dddd, projectileSpeed: 250, hotkey: '4',
    traits: [{ id: 'direct_damage' }, { id: 'slow_on_hit', duration: 2000, factor: 0.4 }],
    upgrades: [
      { level: 2, cost: 35, damage: 0, range: 3.5, fireRate: 700 },
    ],
  }),

  // ================================================================
  // ARCANE (7) — Precision magic, crits, elements
  // ================================================================
  arcane_bolt: def({
    id: 'arcane_bolt', name: 'Bolt', description: 'Reliable magic DPS. The workhorse.',
    faction: 'arcane', damageType: 'magic', cost: 25, damage: 12, range: 3.5, fireRate: 700,
    color: 0x6644ff, projectileSpeed: 400, hotkey: '1',
    upgrades: [
      { level: 2, cost: 30, damage: 18, range: 3.5, fireRate: 650 },
      { level: 3, cost: 55, damage: 26, range: 4, fireRate: 580 },
      { level: 4, cost: 90, damage: 38, range: 4.5, fireRate: 500 },
    ],
  }),
  arcane_frost: def({
    id: 'arcane_frost', name: 'Frost', description: 'Applies 65% slow for 2.5s. No upgrades needed.',
    faction: 'arcane', damageType: 'magic', cost: 35, damage: 4, range: 3, fireRate: 900,
    color: 0x88bbff, projectileSpeed: 280, hotkey: '2',
    traits: [{ id: 'direct_damage' }, { id: 'slow_on_hit', duration: 2500, factor: 0.35 }],
    // No upgrades — it's balanced as a pure utility tower
  }),
  arcane_storm: def({
    id: 'arcane_storm', name: 'Storm', description: 'AoE lightning. Good vs packs.',
    faction: 'arcane', damageType: 'magic', cost: 55, damage: 22, range: 3, fireRate: 1500,
    color: 0x8866ff, projectileSpeed: 250, hotkey: '3',
    traits: [{ id: 'splash_damage', radius: 56 }],
    upgrades: [
      { level: 2, cost: 65, damage: 35, range: 3.5, fireRate: 1300 },
      { level: 3, cost: 110, damage: 52, range: 4, fireRate: 1100 },
    ],
  }),
  arcane_focus: def({
    id: 'arcane_focus', name: 'Focus', description: 'Long range sniper. 25% chance for 3x crit.',
    faction: 'arcane', damageType: 'magic', cost: 90, damage: 55, range: 7, fireRate: 2800,
    color: 0xccaaff, projectileSpeed: 500, hotkey: '4',
    traits: [{ id: 'direct_damage' }, { id: 'crit_chance', chance: 0.25, multiplier: 3 }],
    upgrades: [
      { level: 2, cost: 100, damage: 85, range: 7.5, fireRate: 2600 },
      { level: 3, cost: 160, damage: 130, range: 8, fireRate: 2400 },
    ],
  }),
  arcane_drain: def({
    id: 'arcane_drain', name: 'Mana Drain', description: 'Strips boss shields on hit. Essential for wave 10+.',
    faction: 'arcane', damageType: 'magic', cost: 120, damage: 10, range: 4.5, fireRate: 1000,
    color: 0x44aaff, projectileSpeed: 350, hotkey: '5',
    traits: [{ id: 'direct_damage' }, { id: 'strip_shield' }],
    upgrades: [
      { level: 2, cost: 80, damage: 18, range: 5, fireRate: 900 },
    ],
  }),
  arcane_meteor: def({
    id: 'arcane_meteor', name: 'Meteor', description: 'Slow-falling star. Massive AoE on impact.',
    faction: 'arcane', damageType: 'magic', cost: 200, damage: 100, range: 5, fireRate: 4500,
    color: 0xff6644, projectileSpeed: 55, hotkey: '6',
    traits: [{ id: 'splash_damage', radius: 80 }],
    upgrades: [
      { level: 2, cost: 180, damage: 160, range: 5.5, fireRate: 4000 },
      { level: 3, cost: 280, damage: 250, range: 6, fireRate: 3500 },
    ],
  }),
  arcane_nova: def({
    id: 'arcane_nova', name: 'Arcane Nova', description: 'ULTIMATE. AoE crit with slow and damage amp.',
    faction: 'arcane', damageType: 'magic', cost: 700, damage: 200, range: 5.5, fireRate: 3000,
    color: 0xeeddff, projectileSpeed: 350, hotkey: '7', ultimate: true,
    traits: [
      { id: 'splash_damage', radius: 72 },
      { id: 'crit_chance', chance: 0.3, multiplier: 2.5 },
      { id: 'slow_on_hit', duration: 3000, factor: 0.3 },
      { id: 'damage_amp_on_hit', ampAmount: 0.2, duration: 4000 },
    ],
    // No upgrades — already the apex
  }),

  // ================================================================
  // MECHANICAL (8) — Engineering, burn, pierce, efficiency
  // ================================================================
  mech_wall: def({
    id: 'mech_wall', name: 'Wall', description: 'Dirt cheap maze filler. Barely attacks.',
    faction: 'mechanical', damageType: 'physical', cost: 10, damage: 2, range: 1.5, fireRate: 2000,
    color: 0x998866, projectileSpeed: 200, hotkey: '1',
    // No upgrades — it's a 10g blocker
  }),
  mech_turret: def({
    id: 'mech_turret', name: 'Turret', description: 'Ramps fire rate on same target. Patient DPS.',
    faction: 'mechanical', damageType: 'physical', cost: 30, damage: 10, range: 3.5, fireRate: 800,
    color: 0xcc8833, projectileSpeed: 350, hotkey: '2',
    traits: [{ id: 'direct_damage' }, { id: 'ramp_up', maxStacks: 5, reductionPerStack: 0.08 }],
    upgrades: [
      { level: 2, cost: 35, damage: 16, range: 3.5, fireRate: 750 },
      { level: 3, cost: 60, damage: 24, range: 4, fireRate: 680 },
      { level: 4, cost: 100, damage: 35, range: 4, fireRate: 600 },
    ],
  }),
  mech_flamethrower: def({
    id: 'mech_flamethrower', name: 'Flame', description: 'Short range AoE. Burns for 8 DPS over 3s.',
    faction: 'mechanical', damageType: 'physical', cost: 40, damage: 10, range: 2, fireRate: 500,
    color: 0xff4400, projectileSpeed: 200, projectileColor: 0xff6622, hotkey: '3',
    traits: [{ id: 'splash_damage', radius: 32 }, { id: 'burn_dot', dps: 8, duration: 3000 }],
    upgrades: [
      { level: 2, cost: 50, damage: 16, range: 2.5, fireRate: 450 },
      { level: 3, cost: 90, damage: 24, range: 3, fireRate: 380 },
    ],
  }),
  mech_tesla: def({
    id: 'mech_tesla', name: 'Tesla', description: 'Chain lightning. Jumps to nearby targets.',
    faction: 'mechanical', damageType: 'magic', cost: 80, damage: 18, range: 3, fireRate: 1400,
    color: 0xeebb44, projectileSpeed: 400, hotkey: '4',
    traits: [{ id: 'chain_damage', chainCount: 2, chainRange: 96, falloff: 0.7 }],
    upgrades: [
      { level: 2, cost: 75, damage: 28, range: 3.5, fireRate: 1200 },
      { level: 3, cost: 120, damage: 42, range: 4, fireRate: 1000 },
    ],
  }),
  mech_mortar: def({
    id: 'mech_mortar', name: 'Mortar', description: 'Extreme range artillery. Huge splash.',
    faction: 'mechanical', damageType: 'physical', cost: 120, damage: 50, range: 8, fireRate: 3500,
    color: 0x667788, projectileSpeed: 150, hotkey: '5',
    traits: [{ id: 'splash_damage', radius: 64 }],
    upgrades: [
      { level: 2, cost: 120, damage: 80, range: 9, fireRate: 3000 },
    ],
  }),
  mech_shredder: def({
    id: 'mech_shredder', name: 'Shredder', description: 'Very fast. Shreds armor tier for 4s per hit.',
    faction: 'mechanical', damageType: 'physical', cost: 150, damage: 6, range: 3, fireRate: 350,
    color: 0xbbaa88, projectileSpeed: 400, hotkey: '6',
    traits: [{ id: 'direct_damage' }, { id: 'armor_shred_on_hit', shredAmount: 1, duration: 4000 }],
    upgrades: [
      { level: 2, cost: 120, damage: 10, range: 3.5, fireRate: 300 },
      { level: 3, cost: 200, damage: 16, range: 4, fireRate: 250 },
    ],
  }),
  mech_railgun: def({
    id: 'mech_railgun', name: 'Railgun', description: 'Pierces ALL creeps in a line. Corridor destroyer.',
    faction: 'mechanical', damageType: 'physical', cost: 300, damage: 120, range: 10, fireRate: 4000,
    color: 0x88bbcc, projectileSpeed: 600, hotkey: '7',
    traits: [{ id: 'pierce_delivery', lineWidth: 24 }],
    upgrades: [
      { level: 2, cost: 250, damage: 200, range: 11, fireRate: 3500 },
      { level: 3, cost: 400, damage: 320, range: 12, fireRate: 3000 },
    ],
  }),
  mech_titan: def({
    id: 'mech_titan', name: 'Titan Cannon', description: 'ULTIMATE. Extreme damage, range, and splash.',
    faction: 'mechanical', damageType: 'physical', cost: 800, damage: 500, range: 12, fireRate: 5000,
    color: 0xffeedd, projectileSpeed: 250, hotkey: '8', ultimate: true,
    traits: [
      { id: 'splash_damage', radius: 96 },
      { id: 'burn_dot', dps: 25, duration: 4000 },
      { id: 'armor_shred_on_hit', shredAmount: 2, duration: 5000 },
    ],
    // No upgrades — the apex of engineering
  }),

  // ================================================================
  // NATURE (6) — Growth, poison, synergy, roots
  // ================================================================
  nature_thorn: def({
    id: 'nature_thorn', name: 'Thorn', description: 'Cheap physical DPS. Bread and butter.',
    faction: 'nature', damageType: 'physical', cost: 20, damage: 10, range: 3, fireRate: 700,
    color: 0x33aa44, projectileSpeed: 320, hotkey: '1',
    upgrades: [
      { level: 2, cost: 25, damage: 16, range: 3, fireRate: 650 },
      { level: 3, cost: 45, damage: 24, range: 3.5, fireRate: 580 },
      { level: 4, cost: 75, damage: 35, range: 3.5, fireRate: 500 },
      { level: 5, cost: 120, damage: 50, range: 4, fireRate: 420 },
    ],
  }),
  nature_root: def({
    id: 'nature_root', name: 'Root', description: 'Strongest slow in game: 70% for 3s.',
    faction: 'nature', damageType: 'magic', cost: 35, damage: 3, range: 3, fireRate: 1000,
    color: 0x886633, projectileSpeed: 200, hotkey: '2',
    traits: [{ id: 'direct_damage' }, { id: 'slow_on_hit', duration: 3000, factor: 0.3 }],
    upgrades: [
      { level: 2, cost: 40, damage: 5, range: 3.5, fireRate: 900 },
    ],
  }),
  nature_blossom: def({
    id: 'nature_blossom', name: 'Blossom', description: 'Buffs adjacent towers: +15% DMG, +50ms SPD per level.',
    faction: 'nature', damageType: 'magic', cost: 60, damage: 5, range: 2.5, fireRate: 1200,
    color: 0xff88aa, projectileSpeed: 250, hotkey: '3',
    traits: [{ id: 'direct_damage' }, { id: 'adjacency_buff', damagePercent: 0.15, ratePercent: 0.08 }],
    upgrades: [
      { level: 2, cost: 55, damage: 8, range: 3, fireRate: 1100 },
      { level: 3, cost: 90, damage: 12, range: 3, fireRate: 1000 },
    ],
  }),
  nature_spore: def({
    id: 'nature_spore', name: 'Spore', description: 'Poisons ALL creeps near tower. 2% HP/s. Area denial.',
    faction: 'nature', damageType: 'magic', cost: 100, damage: 5, range: 3, fireRate: 1500,
    color: 0x88cc22, projectileSpeed: 200, projectileColor: 0x66aa00, hotkey: '4',
    traits: [{ id: 'tower_aura_damage', radius: 96 }, { id: 'poison_dot', percentPerSec: 0.02, duration: 3000 }],
    upgrades: [
      { level: 2, cost: 90, damage: 8, range: 3.5, fireRate: 1300 },
      { level: 3, cost: 150, damage: 12, range: 4, fireRate: 1100 },
    ],
  }),
  nature_vine: def({
    id: 'nature_vine', name: 'Vine', description: '20% chance to fully root (stun) for 0.8s per hit.',
    faction: 'nature', damageType: 'physical', cost: 160, damage: 14, range: 3.5, fireRate: 1000,
    color: 0x228833, projectileSpeed: 280, hotkey: '5',
    traits: [{ id: 'direct_damage' }, { id: 'root_on_hit', chance: 0.2, duration: 800 }],
    upgrades: [
      { level: 2, cost: 130, damage: 22, range: 4, fireRate: 900 },
      { level: 3, cost: 200, damage: 32, range: 4, fireRate: 800 },
    ],
  }),
  nature_elder: def({
    id: 'nature_elder', name: 'Elder Treant', description: 'ULTIMATE. Grows +8% DMG permanently. Roots and buffs allies.',
    faction: 'nature', damageType: 'physical', cost: 600, damage: 40, range: 4, fireRate: 800,
    color: 0x225511, projectileSpeed: 280, hotkey: '6', ultimate: true,
    traits: [
      { id: 'direct_damage' },
      { id: 'growth_scaling', growthPercent: 0.08 },
      { id: 'root_on_hit', chance: 0.25, duration: 1000 },
      { id: 'adjacency_buff', damagePercent: 0.25, ratePercent: 0.12 },
    ],
    // No upgrades — it grows on its own
  }),

  // ================================================================
  // VOID (5) — Chaos, gambling, manipulation
  // ================================================================
  void_gambler: def({
    id: 'void_gambler', name: 'Gambler', description: 'Cheap chaos. 8% instant kill, 25% whiff.',
    faction: 'void', damageType: 'magic', cost: 15, damage: 25, range: 3, fireRate: 1000,
    color: 0xdd44ff, projectileSpeed: 300, hotkey: '1',
    traits: [{ id: 'direct_damage' }, { id: 'jackpot', killChance: 0.08, missChance: 0.25 }],
    upgrades: [
      { level: 2, cost: 30, damage: 45, range: 3.5, fireRate: 900 },
    ],
  }),
  void_spike: def({
    id: 'void_spike', name: 'Spike', description: 'Each shot deals 50-150% damage. Chaotic DPS.',
    faction: 'void', damageType: 'magic', cost: 30, damage: 22, range: 3.5, fireRate: 1000,
    color: 0x8822aa, projectileSpeed: 350, hotkey: '2',
    traits: [{ id: 'direct_damage' }, { id: 'damage_variance', min: 0.5, max: 1.5 }],
    upgrades: [
      { level: 2, cost: 40, damage: 38, range: 4, fireRate: 900 },
      { level: 3, cost: 75, damage: 60, range: 4.5, fireRate: 800 },
    ],
  }),
  void_siphon: def({
    id: 'void_siphon', name: 'Siphon', description: 'Earns +1g per hit. Economy engine.',
    faction: 'void', damageType: 'magic', cost: 50, damage: 5, range: 3, fireRate: 700,
    color: 0xbb55dd, projectileSpeed: 300, projectileColor: 0xffdd44, hotkey: '3',
    traits: [{ id: 'direct_damage' }, { id: 'gold_on_hit', amount: 1 }],
    upgrades: [
      { level: 2, cost: 55, damage: 8, range: 3.5, fireRate: 650 },
      { level: 3, cost: 90, damage: 12, range: 4, fireRate: 580 },
      { level: 4, cost: 140, damage: 18, range: 4, fireRate: 500 },
    ],
  }),
  void_rift: def({
    id: 'void_rift', name: 'Rift', description: 'Teleports creeps backward on their path.',
    faction: 'void', damageType: 'magic', cost: 120, damage: 0, range: 3.5, fireRate: 3500,
    color: 0x440066, projectileSpeed: 200, hotkey: '4',
    traits: [{ id: 'teleport_delivery', stepsBase: 4, stepsPerLevel: 2 }],
    upgrades: [
      { level: 2, cost: 100, damage: 0, range: 4, fireRate: 3000 },
      { level: 3, cost: 160, damage: 0, range: 4.5, fireRate: 2500 },
    ],
  }),
  void_oblivion: def({
    id: 'void_oblivion', name: 'Oblivion', description: 'ULTIMATE. 15% instakill, +3g/hit, extreme variance.',
    faction: 'void', damageType: 'magic', cost: 900, damage: 80, range: 5, fireRate: 600,
    color: 0x220044, projectileSpeed: 400, projectileColor: 0xff00ff, hotkey: '5', ultimate: true,
    traits: [
      { id: 'direct_damage' },
      { id: 'jackpot', killChance: 0.15, missChance: 0.1 },
      { id: 'damage_variance', min: 0.5, max: 2.5 },
      { id: 'gold_on_hit', amount: 3 },
      { id: 'damage_amp_on_hit', ampAmount: 0.2, duration: 3000 },
    ],
    // No upgrades — pure chaos incarnate
  }),

  // ================================================================
  // MILITARY (6) — Mobile units, area denial, tactical control
  // ================================================================
  mil_sandbag: def({
    id: 'mil_sandbag', name: 'Sandbag', description: 'Dirt cheap maze filler. No attack.',
    faction: 'military', damageType: 'physical', cost: 8, damage: 0, range: 0, fireRate: 99999,
    color: 0x998877, projectileSpeed: 0, hotkey: '1',
    traits: [],
    // No upgrades — it's an 8g blocker
  }),
  mil_wire: def({
    id: 'mil_wire', name: 'Barbed Wire', description: 'Slows adjacent creeps by 40%. No attack.',
    faction: 'military', damageType: 'physical', cost: 25, damage: 0, range: 1.5, fireRate: 99999,
    color: 0x777766, projectileSpeed: 0, hotkey: '2',
    traits: [{ id: 'barbed_wire', factor: 0.6 }],
    upgrades: [
      { level: 2, cost: 30, damage: 0, range: 2, fireRate: 99999 },
    ],
  }),
  mil_rifleman: def({
    id: 'mil_rifleman', name: 'Rifleman', description: 'Mobile ranged unit. Engages at medium range.',
    faction: 'military', damageType: 'physical', cost: 40, damage: 14, range: 3, fireRate: 700,
    color: 0x556b2f, projectileSpeed: 0, hotkey: '3',
    traits: [{ id: 'mobile_unit', moveSpeed: 100, engageRange: 2.5, leashRange: 5, attackCooldown: 700 }],
    upgrades: [
      { level: 2, cost: 45, damage: 22, range: 3.5, fireRate: 600 },
      { level: 3, cost: 80, damage: 34, range: 4, fireRate: 500 },
    ],
  }),
  mil_brawler: def({
    id: 'mil_brawler', name: 'Brawler', description: 'Mobile melee. High damage, gets up close.',
    faction: 'military', damageType: 'physical', cost: 55, damage: 30, range: 2, fireRate: 500,
    color: 0x8b4513, projectileSpeed: 0, hotkey: '4',
    traits: [{ id: 'mobile_unit', moveSpeed: 140, engageRange: 0.8, leashRange: 4, attackCooldown: 500 }],
    upgrades: [
      { level: 2, cost: 60, damage: 48, range: 2, fireRate: 450 },
      { level: 3, cost: 100, damage: 70, range: 2, fireRate: 400 },
    ],
  }),
  mil_heavy: def({
    id: 'mil_heavy', name: 'Heavy Gunner', description: 'Mobile AoE. Slower but hits everything nearby.',
    faction: 'military', damageType: 'physical', cost: 120, damage: 20, range: 3, fireRate: 1200,
    color: 0x4a6741, projectileSpeed: 0, hotkey: '5',
    traits: [{ id: 'mobile_unit', moveSpeed: 70, engageRange: 1, leashRange: 5, attackCooldown: 1200, attackSplash: 64 }],
    upgrades: [
      { level: 2, cost: 100, damage: 32, range: 3.5, fireRate: 1000 },
      { level: 3, cost: 160, damage: 48, range: 4, fireRate: 800 },
    ],
  }),
  mil_commander: def({
    id: 'mil_commander', name: 'Commander', description: 'ULTIMATE. Mobile. Buffs all units in range. Strong melee.',
    faction: 'military', damageType: 'physical', cost: 750, damage: 60, range: 5, fireRate: 800,
    color: 0xdaa520, projectileSpeed: 0, hotkey: '6', ultimate: true,
    traits: [
      { id: 'mobile_unit', moveSpeed: 90, engageRange: 1, leashRange: 6, attackCooldown: 800 },
      { id: 'adjacency_buff', damagePercent: 0.2, ratePercent: 0.1 },
    ],
    // No upgrades — the Commander leads by presence
  }),
};

export const TOWER_ORDER = ['arrow', 'cannon', 'sniper', 'slow'];

export function getTowerType(id: string): TowerType {
  const t = TOWER_TYPES[id];
  if (!t) throw new Error(`Unknown tower type: ${id}`);
  return t;
}

/** Get all faction tower IDs (excluding generic) */
export function getAllFactionTowerIds(): string[] {
  return Object.values(TOWER_TYPES)
    .filter(t => t.faction)
    .map(t => t.id);
}
