import { DamageType } from './CreepTypes';
import { FactionId } from './Factions';

export interface TowerType {
  id: string;
  name: string;
  cost: number;
  damage: number;
  damageType: DamageType;
  range: number; // in tiles
  fireRate: number; // ms between shots
  color: number;
  projectileSpeed: number;
  sellRefundRatio: number;
  splash: number; // splash radius in pixels, 0 = none
  slowDuration: number; // ms, 0 = none
  slowFactor: number; // 0-1, lower = slower
  upgrades: TowerUpgrade[];
  hotkey: string;
  description: string;
  faction?: FactionId;
  ability?: string; // special ability id
}

export interface TowerUpgrade {
  level: number;
  cost: number;
  damage: number;
  range: number;
  fireRate: number;
}

// Helper to create a tower def with defaults
function def(partial: Partial<TowerType> & Pick<TowerType, 'id' | 'name' | 'cost' | 'damage' | 'range' | 'fireRate' | 'color' | 'hotkey' | 'description'>): TowerType {
  return {
    damageType: 'physical',
    projectileSpeed: 300,
    sellRefundRatio: 0.5,
    splash: 0,
    slowDuration: 0,
    slowFactor: 1,
    upgrades: [],
    ...partial,
  };
}

export const TOWER_TYPES: Record<string, TowerType> = {
  // === Generic towers (no faction) ===
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
    color: 0xff8844, projectileSpeed: 200, splash: 48, hotkey: '2',
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
    color: 0x44dddd, projectileSpeed: 250, slowDuration: 2000, slowFactor: 0.4, hotkey: '4',
    upgrades: [
      { level: 2, cost: 40, damage: 0, range: 3.5, fireRate: 700 },
      { level: 3, cost: 70, damage: 0, range: 4, fireRate: 600 },
    ],
  }),

  // === Arcane faction ===
  arcane_bolt: def({
    id: 'arcane_bolt', name: 'Bolt', description: 'Focused magic bolt',
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
    color: 0x8866ff, projectileSpeed: 250, splash: 56, hotkey: '2',
    upgrades: [
      { level: 2, cost: 55, damage: 30, range: 3.5, fireRate: 1300 },
      { level: 3, cost: 100, damage: 48, range: 4, fireRate: 1100 },
    ],
  }),
  arcane_frost: def({
    id: 'arcane_frost', name: 'Frost', description: 'Slow + magic damage',
    faction: 'arcane', damageType: 'magic', cost: 30, damage: 6, range: 3, fireRate: 900,
    color: 0x88bbff, projectileSpeed: 280, slowDuration: 2500, slowFactor: 0.35, hotkey: '3',
    upgrades: [
      { level: 2, cost: 45, damage: 10, range: 3.5, fireRate: 800 },
      { level: 3, cost: 80, damage: 16, range: 4, fireRate: 700 },
    ],
  }),

  // === Mechanical faction ===
  mech_turret: def({
    id: 'mech_turret', name: 'Turret', description: 'Ramps up fire rate on same target',
    faction: 'mechanical', damageType: 'physical', cost: 25, damage: 10, range: 3.5, fireRate: 800,
    color: 0xcc8833, projectileSpeed: 350, hotkey: '1', ability: 'ramp_up',
    upgrades: [
      { level: 2, cost: 35, damage: 16, range: 3.5, fireRate: 700 },
      { level: 3, cost: 70, damage: 24, range: 4, fireRate: 600 },
    ],
  }),
  mech_tesla: def({
    id: 'mech_tesla', name: 'Tesla', description: 'Chain lightning, hits 3 targets',
    faction: 'mechanical', damageType: 'magic', cost: 45, damage: 15, range: 3, fireRate: 1400,
    color: 0xeebb44, projectileSpeed: 400, hotkey: '2', ability: 'chain',
    upgrades: [
      { level: 2, cost: 60, damage: 24, range: 3.5, fireRate: 1200 },
      { level: 3, cost: 100, damage: 36, range: 4, fireRate: 1000 },
    ],
  }),
  mech_wall: def({
    id: 'mech_wall', name: 'Wall', description: 'Cheap blocker, minimal damage',
    faction: 'mechanical', damageType: 'physical', cost: 8, damage: 2, range: 1.5, fireRate: 2000,
    color: 0x998866, projectileSpeed: 200, hotkey: '3',
    upgrades: [
      { level: 2, cost: 12, damage: 4, range: 2, fireRate: 1800 },
      { level: 3, cost: 20, damage: 8, range: 2, fireRate: 1500 },
    ],
  }),

  // === Nature faction ===
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
    color: 0x886633, projectileSpeed: 200, slowDuration: 3000, slowFactor: 0.3, hotkey: '2',
    upgrades: [
      { level: 2, cost: 45, damage: 5, range: 3.5, fireRate: 900 },
      { level: 3, cost: 80, damage: 8, range: 4, fireRate: 800 },
    ],
  }),
  nature_blossom: def({
    id: 'nature_blossom', name: 'Blossom', description: 'Buffs adjacent towers',
    faction: 'nature', damageType: 'magic', cost: 35, damage: 5, range: 2.5, fireRate: 1200,
    color: 0xff88aa, projectileSpeed: 250, hotkey: '3', ability: 'adjacency_buff',
    upgrades: [
      { level: 2, cost: 50, damage: 8, range: 3, fireRate: 1100 },
      { level: 3, cost: 90, damage: 12, range: 3, fireRate: 1000 },
    ],
  }),

  // === Void faction ===
  void_spike: def({
    id: 'void_spike', name: 'Spike', description: 'High variance damage (50-150%)',
    faction: 'void', damageType: 'magic', cost: 25, damage: 20, range: 3.5, fireRate: 1000,
    color: 0x8822aa, projectileSpeed: 350, hotkey: '1', ability: 'variance',
    upgrades: [
      { level: 2, cost: 40, damage: 35, range: 4, fireRate: 900 },
      { level: 3, cost: 75, damage: 55, range: 4.5, fireRate: 800 },
    ],
  }),
  void_siphon: def({
    id: 'void_siphon', name: 'Siphon', description: 'Low damage, earns gold on hit',
    faction: 'void', damageType: 'magic', cost: 30, damage: 5, range: 3, fireRate: 800,
    color: 0xbb55dd, projectileSpeed: 300, hotkey: '2', ability: 'gold_on_hit',
    upgrades: [
      { level: 2, cost: 45, damage: 8, range: 3.5, fireRate: 700 },
      { level: 3, cost: 80, damage: 12, range: 4, fireRate: 600 },
    ],
  }),
  void_rift: def({
    id: 'void_rift', name: 'Rift', description: 'Teleports creeps backward',
    faction: 'void', damageType: 'magic', cost: 50, damage: 0, range: 3, fireRate: 4000,
    color: 0x440066, projectileSpeed: 200, hotkey: '3', ability: 'teleport_back',
    upgrades: [
      { level: 2, cost: 70, damage: 0, range: 3.5, fireRate: 3500 },
      { level: 3, cost: 120, damage: 0, range: 4, fireRate: 3000 },
    ],
  }),
};

export const TOWER_ORDER = ['arrow', 'cannon', 'sniper', 'slow'];

export function getTowerType(id: string): TowerType {
  const t = TOWER_TYPES[id];
  if (!t) throw new Error(`Unknown tower type: ${id}`);
  return t;
}
