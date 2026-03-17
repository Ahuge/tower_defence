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
  // GENERIC TOWERS (no faction)
  // ================================================================
  arrow: def({
    id: 'arrow', name: 'Arrow', description: 'Fast attacks, low damage',
    damageType: 'physical', cost: 20, damage: 8, range: 3.5, fireRate: 600,
    color: 0x4488ff, projectileSpeed: 350, hotkey: '1',
    upgrades: [
      { level: 2, cost: 30, damage: 14, range: 3.5, fireRate: 500 },
      { level: 3, cost: 60, damage: 22, range: 4, fireRate: 400 },
    ],
  }),
  cannon: def({
    id: 'cannon', name: 'Cannon', description: 'AoE splash, slow fire',
    damageType: 'physical', cost: 35, damage: 25, range: 3, fireRate: 1800,
    color: 0xff8844, projectileSpeed: 200, hotkey: '2',
    traits: [{ id: 'splash_damage', radius: 48 }],
    upgrades: [
      { level: 2, cost: 50, damage: 40, range: 3, fireRate: 1600 },
      { level: 3, cost: 90, damage: 60, range: 3.5, fireRate: 1400 },
    ],
  }),
  sniper: def({
    id: 'sniper', name: 'Sniper', description: 'Long range, high damage, very slow',
    damageType: 'magic', cost: 50, damage: 60, range: 6, fireRate: 3000,
    color: 0xaa44ff, projectileSpeed: 500, hotkey: '3',
    upgrades: [
      { level: 2, cost: 70, damage: 100, range: 6.5, fireRate: 2800 },
      { level: 3, cost: 120, damage: 160, range: 7, fireRate: 2500 },
    ],
  }),
  slow: def({
    id: 'slow', name: 'Slow', description: 'No damage, slows enemies',
    damageType: 'magic', cost: 25, damage: 0, range: 3, fireRate: 800,
    color: 0x44dddd, projectileSpeed: 250, hotkey: '4',
    traits: [{ id: 'direct_damage' }, { id: 'slow_on_hit', duration: 2000, factor: 0.4 }],
    upgrades: [
      { level: 2, cost: 40, damage: 0, range: 3.5, fireRate: 700 },
      { level: 3, cost: 70, damage: 0, range: 4, fireRate: 600 },
    ],
  }),

  // ================================================================
  // ARCANE — Precision magic, elemental mastery
  // ================================================================
  arcane_bolt: def({
    id: 'arcane_bolt', name: 'Bolt', description: 'Focused magic bolt, reliable DPS',
    faction: 'arcane', damageType: 'magic', cost: 25, damage: 12, range: 3.5, fireRate: 700,
    color: 0x6644ff, projectileSpeed: 400, hotkey: '1',
    upgrades: [
      { level: 2, cost: 35, damage: 20, range: 4, fireRate: 600 },
      { level: 3, cost: 70, damage: 32, range: 4.5, fireRate: 500 },
    ],
  }),
  arcane_storm: def({
    id: 'arcane_storm', name: 'Storm', description: 'AoE lightning strikes',
    faction: 'arcane', damageType: 'magic', cost: 40, damage: 18, range: 3, fireRate: 1500,
    color: 0x8866ff, projectileSpeed: 250, hotkey: '2',
    traits: [{ id: 'splash_damage', radius: 56 }],
    upgrades: [
      { level: 2, cost: 55, damage: 30, range: 3.5, fireRate: 1300 },
      { level: 3, cost: 100, damage: 48, range: 4, fireRate: 1100 },
    ],
  }),
  arcane_frost: def({
    id: 'arcane_frost', name: 'Frost', description: 'Slow + magic damage',
    faction: 'arcane', damageType: 'magic', cost: 30, damage: 6, range: 3, fireRate: 900,
    color: 0x88bbff, projectileSpeed: 280, hotkey: '3',
    traits: [{ id: 'direct_damage' }, { id: 'slow_on_hit', duration: 2500, factor: 0.35 }],
    upgrades: [
      { level: 2, cost: 45, damage: 10, range: 3.5, fireRate: 800 },
      { level: 3, cost: 80, damage: 16, range: 4, fireRate: 700 },
    ],
  }),
  arcane_focus: def({
    id: 'arcane_focus', name: 'Focus', description: 'Long range sniper, 25% crit for 3x damage',
    faction: 'arcane', damageType: 'magic', cost: 55, damage: 50, range: 7, fireRate: 3000,
    color: 0xccaaff, projectileSpeed: 500, hotkey: '4',
    traits: [{ id: 'direct_damage' }, { id: 'crit_chance', chance: 0.25, multiplier: 3 }],
    upgrades: [
      { level: 2, cost: 75, damage: 80, range: 7.5, fireRate: 2700 },
      { level: 3, cost: 130, damage: 120, range: 8, fireRate: 2400 },
    ],
  }),
  arcane_meteor: def({
    id: 'arcane_meteor', name: 'Meteor', description: 'Slow projectile, massive AoE on impact',
    faction: 'arcane', damageType: 'magic', cost: 60, damage: 80, range: 5, fireRate: 4000,
    color: 0xff6644, projectileSpeed: 60, hotkey: '5',
    traits: [{ id: 'splash_damage', radius: 80 }],
    upgrades: [
      { level: 2, cost: 90, damage: 130, range: 5.5, fireRate: 3500 },
      { level: 3, cost: 150, damage: 200, range: 6, fireRate: 3000 },
    ],
  }),
  arcane_spellweave: def({
    id: 'arcane_spellweave', name: 'Spellweave', description: 'No attack. Adjacent towers deal +30% magic damage',
    faction: 'arcane', damageType: 'magic', cost: 40, damage: 0, range: 1.5, fireRate: 99999,
    color: 0xddbbff, projectileSpeed: 0, hotkey: '6',
    traits: [{ id: 'spell_amp', ampPercent: 0.3 }],
    upgrades: [
      { level: 2, cost: 60, damage: 0, range: 1.5, fireRate: 99999 },
      { level: 3, cost: 100, damage: 0, range: 1.5, fireRate: 99999 },
    ],
  }),
  arcane_drain: def({
    id: 'arcane_drain', name: 'Mana Drain', description: 'Low damage, instantly strips boss shields',
    faction: 'arcane', damageType: 'magic', cost: 35, damage: 8, range: 4, fireRate: 1200,
    color: 0x44aaff, projectileSpeed: 350, hotkey: '7',
    traits: [{ id: 'direct_damage' }, { id: 'strip_shield' }],
    upgrades: [
      { level: 2, cost: 50, damage: 14, range: 4.5, fireRate: 1000 },
      { level: 3, cost: 80, damage: 22, range: 5, fireRate: 800 },
    ],
  }),

  // ================================================================
  // MECHANICAL — Efficiency, scaling, area denial
  // ================================================================
  mech_turret: def({
    id: 'mech_turret', name: 'Turret', description: 'Ramps fire rate on same target',
    faction: 'mechanical', damageType: 'physical', cost: 25, damage: 10, range: 3.5, fireRate: 800,
    color: 0xcc8833, projectileSpeed: 350, hotkey: '1',
    traits: [{ id: 'direct_damage' }, { id: 'ramp_up', maxStacks: 5, reductionPerStack: 0.08 }],
    upgrades: [
      { level: 2, cost: 35, damage: 16, range: 3.5, fireRate: 700 },
      { level: 3, cost: 70, damage: 24, range: 4, fireRate: 600 },
    ],
  }),
  mech_tesla: def({
    id: 'mech_tesla', name: 'Tesla', description: 'Chain lightning, hits multiple targets',
    faction: 'mechanical', damageType: 'magic', cost: 45, damage: 15, range: 3, fireRate: 1400,
    color: 0xeebb44, projectileSpeed: 400, hotkey: '2',
    traits: [{ id: 'chain_damage', chainCount: 2, chainRange: 96, falloff: 0.7 }],
    upgrades: [
      { level: 2, cost: 60, damage: 24, range: 3.5, fireRate: 1200 },
      { level: 3, cost: 100, damage: 36, range: 4, fireRate: 1000 },
    ],
  }),
  mech_wall: def({
    id: 'mech_wall', name: 'Wall', description: 'Cheap maze filler, minimal damage',
    faction: 'mechanical', damageType: 'physical', cost: 8, damage: 2, range: 1.5, fireRate: 2000,
    color: 0x998866, projectileSpeed: 200, hotkey: '3',
    upgrades: [
      { level: 2, cost: 12, damage: 4, range: 2, fireRate: 1800 },
      { level: 3, cost: 20, damage: 8, range: 2, fireRate: 1500 },
    ],
  }),
  mech_flamethrower: def({
    id: 'mech_flamethrower', name: 'Flame', description: 'Short range AoE, applies burn DoT',
    faction: 'mechanical', damageType: 'physical', cost: 30, damage: 12, range: 2, fireRate: 400,
    color: 0xff4400, projectileSpeed: 200, projectileColor: 0xff6622, hotkey: '4',
    traits: [{ id: 'splash_damage', radius: 32 }, { id: 'burn_dot', dps: 8, duration: 3000 }],
    upgrades: [
      { level: 2, cost: 45, damage: 18, range: 2.5, fireRate: 350 },
      { level: 3, cost: 80, damage: 26, range: 3, fireRate: 300 },
    ],
  }),
  mech_railgun: def({
    id: 'mech_railgun', name: 'Railgun', description: 'Pierces all creeps in a line. Slow, devastating',
    faction: 'mechanical', damageType: 'physical', cost: 70, damage: 80, range: 8, fireRate: 4000,
    color: 0x88bbcc, projectileSpeed: 600, hotkey: '5',
    traits: [{ id: 'pierce_delivery', lineWidth: 24 }],
    upgrades: [
      { level: 2, cost: 100, damage: 130, range: 9, fireRate: 3500 },
      { level: 3, cost: 160, damage: 200, range: 10, fireRate: 3000 },
    ],
  }),
  mech_overclocker: def({
    id: 'mech_overclocker', name: 'Overclock', description: 'No attack. Best adjacent tower fires 40% faster',
    faction: 'mechanical', damageType: 'physical', cost: 45, damage: 0, range: 1.5, fireRate: 99999,
    color: 0xffdd00, projectileSpeed: 0, hotkey: '6',
    traits: [{ id: 'overclock_buff', rateReduction: 0.4 }],
    upgrades: [
      { level: 2, cost: 70, damage: 0, range: 1.5, fireRate: 99999 },
      { level: 3, cost: 110, damage: 0, range: 1.5, fireRate: 99999 },
    ],
  }),
  mech_mortar: def({
    id: 'mech_mortar', name: 'Mortar', description: 'Extreme range, huge splash, very slow',
    faction: 'mechanical', damageType: 'physical', cost: 55, damage: 45, range: 8, fireRate: 3500,
    color: 0x667788, projectileSpeed: 150, hotkey: '7',
    traits: [{ id: 'splash_damage', radius: 64 }],
    upgrades: [
      { level: 2, cost: 80, damage: 70, range: 9, fireRate: 3000 },
      { level: 3, cost: 130, damage: 100, range: 10, fireRate: 2500 },
    ],
  }),

  // ================================================================
  // NATURE — Growth, synergy, area control
  // ================================================================
  nature_thorn: def({
    id: 'nature_thorn', name: 'Thorn', description: 'Physical thorns, solid DPS',
    faction: 'nature', damageType: 'physical', cost: 20, damage: 10, range: 3, fireRate: 700,
    color: 0x33aa44, projectileSpeed: 320, hotkey: '1',
    upgrades: [
      { level: 2, cost: 30, damage: 18, range: 3.5, fireRate: 600 },
      { level: 3, cost: 60, damage: 28, range: 4, fireRate: 500 },
    ],
  }),
  nature_root: def({
    id: 'nature_root', name: 'Root', description: 'Strong slow, low damage',
    faction: 'nature', damageType: 'magic', cost: 30, damage: 3, range: 3, fireRate: 1000,
    color: 0x886633, projectileSpeed: 200, hotkey: '2',
    traits: [{ id: 'direct_damage' }, { id: 'slow_on_hit', duration: 3000, factor: 0.3 }],
    upgrades: [
      { level: 2, cost: 45, damage: 5, range: 3.5, fireRate: 900 },
      { level: 3, cost: 80, damage: 8, range: 4, fireRate: 800 },
    ],
  }),
  nature_blossom: def({
    id: 'nature_blossom', name: 'Blossom', description: 'Buffs adjacent towers (damage + fire rate)',
    faction: 'nature', damageType: 'magic', cost: 35, damage: 5, range: 2.5, fireRate: 1200,
    color: 0xff88aa, projectileSpeed: 250, hotkey: '3',
    traits: [{ id: 'direct_damage' }, { id: 'adjacency_buff', damagePercent: 0.15, rateBonus: 50 }],
    upgrades: [
      { level: 2, cost: 50, damage: 8, range: 3, fireRate: 1100 },
      { level: 3, cost: 90, damage: 12, range: 3, fireRate: 1000 },
    ],
  }),
  nature_spore: def({
    id: 'nature_spore', name: 'Spore', description: 'Poison AoE: 2% max HP/s, melts tanks',
    faction: 'nature', damageType: 'magic', cost: 35, damage: 5, range: 3, fireRate: 1500,
    color: 0x88cc22, projectileSpeed: 200, projectileColor: 0x66aa00, hotkey: '4',
    traits: [{ id: 'splash_damage', radius: 40 }, { id: 'poison_dot', percentPerSec: 0.02, duration: 3000 }],
    upgrades: [
      { level: 2, cost: 55, damage: 8, range: 3.5, fireRate: 1300 },
      { level: 3, cost: 90, damage: 12, range: 4, fireRate: 1100 },
    ],
  }),
  nature_vine: def({
    id: 'nature_vine', name: 'Vine', description: '20% chance to root (stun) creeps for 0.8s',
    faction: 'nature', damageType: 'physical', cost: 40, damage: 8, range: 3.5, fireRate: 1200,
    color: 0x228833, projectileSpeed: 280, hotkey: '5',
    traits: [{ id: 'direct_damage' }, { id: 'root_on_hit', chance: 0.2, duration: 800 }],
    upgrades: [
      { level: 2, cost: 60, damage: 12, range: 4, fireRate: 1000 },
      { level: 3, cost: 100, damage: 18, range: 4.5, fireRate: 800 },
    ],
  }),
  nature_treant: def({
    id: 'nature_treant', name: 'Treant', description: 'Grows +8% damage permanently over time',
    faction: 'nature', damageType: 'physical', cost: 30, damage: 8, range: 3, fireRate: 900,
    color: 0x446622, projectileSpeed: 250, hotkey: '6',
    traits: [{ id: 'direct_damage' }, { id: 'growth_scaling', growthPercent: 0.08 }],
    upgrades: [
      { level: 2, cost: 45, damage: 14, range: 3.5, fireRate: 800 },
      { level: 3, cost: 75, damage: 22, range: 4, fireRate: 700 },
    ],
  }),
  nature_bramble: def({
    id: 'nature_bramble', name: 'Bramble', description: 'No attack. Passive 30% slow aura in range',
    faction: 'nature', damageType: 'physical', cost: 30, damage: 0, range: 3, fireRate: 99999,
    color: 0x558844, projectileSpeed: 0, hotkey: '7',
    traits: [{ id: 'slow_aura', factor: 0.7 }],
    upgrades: [
      { level: 2, cost: 50, damage: 0, range: 3.5, fireRate: 99999 },
      { level: 3, cost: 80, damage: 0, range: 4, fireRate: 99999 },
    ],
  }),

  // ================================================================
  // VOID — Chaos, gambling, manipulation
  // ================================================================
  void_spike: def({
    id: 'void_spike', name: 'Spike', description: 'Damage varies 50-150% each shot',
    faction: 'void', damageType: 'magic', cost: 25, damage: 20, range: 3.5, fireRate: 1000,
    color: 0x8822aa, projectileSpeed: 350, hotkey: '1',
    traits: [{ id: 'direct_damage' }, { id: 'damage_variance', min: 0.5, max: 1.5 }],
    upgrades: [
      { level: 2, cost: 40, damage: 35, range: 4, fireRate: 900 },
      { level: 3, cost: 75, damage: 55, range: 4.5, fireRate: 800 },
    ],
  }),
  void_siphon: def({
    id: 'void_siphon', name: 'Siphon', description: 'Low damage, earns +1g per hit',
    faction: 'void', damageType: 'magic', cost: 30, damage: 5, range: 3, fireRate: 800,
    color: 0xbb55dd, projectileSpeed: 300, projectileColor: 0xffdd44, hotkey: '2',
    traits: [{ id: 'direct_damage' }, { id: 'gold_on_hit', amount: 1 }],
    upgrades: [
      { level: 2, cost: 45, damage: 8, range: 3.5, fireRate: 700 },
      { level: 3, cost: 80, damage: 12, range: 4, fireRate: 600 },
    ],
  }),
  void_rift: def({
    id: 'void_rift', name: 'Rift', description: 'Teleports creeps backward on path',
    faction: 'void', damageType: 'magic', cost: 50, damage: 0, range: 3, fireRate: 4000,
    color: 0x440066, projectileSpeed: 200, hotkey: '3',
    traits: [{ id: 'teleport_delivery', stepsBase: 3, stepsPerLevel: 1 }],
    upgrades: [
      { level: 2, cost: 70, damage: 0, range: 3.5, fireRate: 3500 },
      { level: 3, cost: 120, damage: 0, range: 4, fireRate: 3000 },
    ],
  }),
  void_beam: def({
    id: 'void_beam', name: 'Void Beam', description: 'Marks targets: +15% damage from all sources, stacks',
    faction: 'void', damageType: 'magic', cost: 40, damage: 10, range: 3.5, fireRate: 800,
    color: 0x660088, projectileSpeed: 350, hotkey: '4',
    traits: [{ id: 'direct_damage' }, { id: 'damage_amp_on_hit', ampAmount: 0.15, duration: 3000 }],
    upgrades: [
      { level: 2, cost: 60, damage: 16, range: 4, fireRate: 700 },
      { level: 3, cost: 100, damage: 24, range: 4.5, fireRate: 600 },
    ],
  }),
  void_entropy: def({
    id: 'void_entropy', name: 'Entropy', description: 'Shreds armor: heavy→medium→light for 4s',
    faction: 'void', damageType: 'magic', cost: 45, damage: 5, range: 4, fireRate: 1000,
    color: 0x993388, projectileSpeed: 300, hotkey: '5',
    traits: [{ id: 'direct_damage' }, { id: 'armor_shred_on_hit', shredAmount: 1, duration: 4000 }],
    upgrades: [
      { level: 2, cost: 65, damage: 8, range: 4.5, fireRate: 900 },
      { level: 3, cost: 100, damage: 12, range: 5, fireRate: 800 },
    ],
  }),
  void_gambler: def({
    id: 'void_gambler', name: 'Gambler', description: '8% instant kill, 25% zero damage. Pure chaos',
    faction: 'void', damageType: 'magic', cost: 20, damage: 30, range: 3, fireRate: 1000,
    color: 0xdd44ff, projectileSpeed: 300, hotkey: '6',
    traits: [{ id: 'direct_damage' }, { id: 'jackpot', killChance: 0.08, missChance: 0.25 }],
    upgrades: [
      { level: 2, cost: 35, damage: 50, range: 3.5, fireRate: 900 },
      { level: 3, cost: 65, damage: 80, range: 4, fireRate: 800 },
    ],
  }),
  void_anchor: def({
    id: 'void_anchor', name: 'Anchor', description: 'Long range, very strong slow. Locks down targets',
    faction: 'void', damageType: 'magic', cost: 50, damage: 8, range: 7, fireRate: 3000,
    color: 0x2200aa, projectileSpeed: 400, hotkey: '7',
    traits: [{ id: 'direct_damage' }, { id: 'slow_on_hit', duration: 4000, factor: 0.2 }],
    upgrades: [
      { level: 2, cost: 70, damage: 12, range: 8, fireRate: 2500 },
      { level: 3, cost: 110, damage: 18, range: 9, fireRate: 2000 },
    ],
  }),
};

export const TOWER_ORDER = ['arrow', 'cannon', 'sniper', 'slow'];

export function getTowerType(id: string): TowerType {
  const t = TOWER_TYPES[id];
  if (!t) throw new Error(`Unknown tower type: ${id}`);
  return t;
}
