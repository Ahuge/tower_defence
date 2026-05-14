import { DamageType } from './CreepTypes';
import { FactionId, FACTIONS, FACTION_ORDER } from './Factions';
import { Trait } from '../systems/traits/Trait';
import type { TowerRole } from './TowerRoles';

/** Targeting priority for towers */
export type TargetingMode = 'first' | 'closest' | 'strongest' | 'weakest' | 'fastest';

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
  /** Targeting priority. Default: 'first' (closest to exit) */
  targeting?: TargetingMode;
  /** Optional explicit role for the Balanced bot brain and other
   *  AI consumers. When unset, `getTowerRole()` in TowerRoles.ts
   *  derives it from traits + stats. Set this only to override the
   *  derivation for a tower whose role is non-obvious. */
  role?: TowerRole;
}

export interface TowerUpgrade {
  level: number;
  cost: number;
  damage: number;
  range: number;
  fireRate: number;
  /** Label shown on the default (left-hand) upgrade button when
   *  branches exist. Only read when `branches` is non-empty. */
  branchLabel?: string;
  /** Alternative paths at this upgrade point. Picking a branch
   *  swaps the tower's `typeDef` to the target TowerType — the
   *  target owns all post-branch stats, art, and upgrades. */
  branches?: UpgradeBranch[];
}

export interface UpgradeBranch {
  /** Stable per-tower branch id, e.g. 'razor'. Sent over the wire
   *  with `tower_upgraded` so peers pick the matching path. */
  id: string;
  /** UI label for the branch button (the resulting tower's name). */
  label: string;
  /** TowerType id to swap into. The target's `cost` is charged as
   *  the branch-switch cost; subsequent upgrades pull from the
   *  target's `upgrades` array. */
  transformsTo: string;
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
    id: 'cannon', name: 'Cannon', description: 'Area of effect splash, slow fire',
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
    targeting: 'strongest',
    upgrades: [
      { level: 2, cost: 65, damage: 95, range: 6.5, fireRate: 2800 },
      { level: 3, cost: 110, damage: 150, range: 7, fireRate: 2500 },
    ],
  }),
  slow: def({
    id: 'slow', name: 'Frost Trap', description: 'No damage, slows enemies',
    damageType: 'magic', cost: 25, damage: 0, range: 3, fireRate: 800,
    color: 0x44dddd, projectileSpeed: 250, hotkey: '4',
    targeting: 'fastest',
    traits: [{ id: 'direct_damage' }, { id: 'slow_on_hit', duration: 2000, factor: 0.4 }],
    upgrades: [
      { level: 2, cost: 35, damage: 0, range: 3.5, fireRate: 700 },
    ],
  }),

  // ================================================================
  // COALITION (Arcane-campaign first-time default kit)
  // ================================================================
  // Used only as the Coalition faction's tower set during the Arcane
  // campaign. Reuses generic arrow/cannon/sniper above; adds a
  // Coalition-specific wall (visually neutral steel — distinct from
  // mech_wall's faction palette) and Runebreaker (the AOE-root with
  // `interrupts_channels` that serves as Mana Drain's narrative
  // precursor). Stats for Runebreaker roughly 70% of arcane_drain so
  // the eventual swap feels like a real upgrade.
  coalition_wall: def({
    id: 'coalition_wall', name: 'Stone Wall', description: 'Quarried stone, mortared in haste. It will hold a wave or two. Pile them well.',
    faction: 'coalition', damageType: 'physical', cost: 10, damage: 2, range: 1.5, fireRate: 2000,
    color: 0x9aa3ad, projectileSpeed: 200, hotkey: '3',
  }),
  coalition_root: def({
    id: 'coalition_root', name: 'Runebreaker', description: 'Buried launchers fire hooked arcane chains that bind spellcasters mid-channel — words break on the barbs before the cast lands.',
    faction: 'coalition', damageType: 'magic', cost: 100, damage: 6, range: 4, fireRate: 1100,
    color: 0x668844, projectileSpeed: 320, hotkey: '5',
    targeting: 'strongest',
    traits: [
      { id: 'direct_damage' },
      { id: 'splash_damage', radius: 40 },
      { id: 'slow_on_hit', duration: 1800, factor: 0.45 },
      { id: 'interrupts_channels' },
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
    id: 'arcane_frost', name: 'Frost', description: 'Applies 65% slow for 2.5s. Interrupts caster channels. No upgrades needed.',
    faction: 'arcane', damageType: 'magic', cost: 35, damage: 4, range: 3, fireRate: 900,
    color: 0x88bbff, projectileSpeed: 280, hotkey: '2',
    targeting: 'fastest',
    traits: [{ id: 'direct_damage' }, { id: 'slow_on_hit', duration: 2500, factor: 0.35 }, { id: 'interrupts_channels' }],
    // No upgrades — it's balanced as a pure utility tower
  }),
  arcane_storm: def({
    id: 'arcane_storm', name: 'Storm', description: 'Area of effect lightning. Good vs packs.',
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
    targeting: 'strongest',
    traits: [{ id: 'direct_damage' }, { id: 'crit_chance', chance: 0.25, multiplier: 3 }],
    upgrades: [
      { level: 2, cost: 100, damage: 85, range: 7.5, fireRate: 2600 },
      { level: 3, cost: 160, damage: 130, range: 8, fireRate: 2400 },
    ],
  }),
  arcane_drain: def({
    id: 'arcane_drain', name: 'Mana Drain', description: 'Strips creep shields and interrupts caster channels on hit.',
    faction: 'arcane', damageType: 'magic', cost: 120, damage: 10, range: 4.5, fireRate: 1000,
    color: 0x44aaff, projectileSpeed: 350, hotkey: '5',
    targeting: 'strongest',
    traits: [{ id: 'direct_damage' }, { id: 'strip_shield' }, { id: 'interrupts_channels' }, { id: 'siphons_pylons' }],
    upgrades: [
      { level: 2, cost: 80, damage: 18, range: 5, fireRate: 900 },
    ],
  }),
  arcane_meteor: def({
    id: 'arcane_meteor', name: 'Meteor', description: 'Slow-falling star. Massive area of effect on impact. Location target.',
    faction: 'arcane', damageType: 'magic', cost: 200, damage: 100, range: 5, fireRate: 4500,
    color: 0xff6644, projectileSpeed: 55, hotkey: '6',
    traits: [{ id: 'splash_damage', radius: 80 }],
    upgrades: [
      { level: 2, cost: 180, damage: 160, range: 5.5, fireRate: 4000 },
      { level: 3, cost: 280, damage: 250, range: 6, fireRate: 3500 },
    ],
  }),
  arcane_nova: def({
    id: 'arcane_nova', name: 'Arcane Nova', description: 'ULTIMATE. Area of effect crit with slow and damage amp.',
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
  // ─── M10 Finale Ult Tower ──────────────────────────────────────
  // The throne's firing module — embedded inside the
  // `arcane_archmage_throne` DestructibleStructure (PRD 06) as the
  // attack-capable component at the structure's center cell. Player
  // towers can never reach this kit. The structure handles HP /
  // damage frames / phase hooks; this tower handles the actual
  // shoots-at-hero logic via the standard Tower fire pipeline.
  // Phase mechanics (heal / summon / rage) are dispatched by
  // FinaleEffects, which can mutate this tower's fireRate for "rage".
  arcane_ult_throne: def({
    id: 'arcane_ult_throne', name: 'The Archmage Throne',
    description: 'CPU ult. Massive HP, devastating cast. Win-target of the M10 finale.',
    faction: 'arcane', damageType: 'magic', cost: 0, damage: 80, range: 6, fireRate: 2200,
    color: 0xffdd44, projectileSpeed: 320, hotkey: '0', ultimate: true,
    traits: [
      { id: 'splash_damage', radius: 64 },
      { id: 'crit_chance', chance: 0.2, multiplier: 2.0 },
    ],
  }),
  // ─── M10 Finale Mana Conduit ───────────────────────────────────
  // A dedicated summoning-feeder. Does NOT attack — its only purpose
  // is to sit adjacent to a Summoning Circle and contribute to the
  // shared charge meter. Lets the player keep their full Arcane kit
  // for actual defense + spend on conduits to summon the hero faster.
  // Strategic axis: every g spent on a conduit is g not spent on
  // damage towers, and the conduit MUST be in a magenta zone.
  arcane_conduit: def({
    id: 'arcane_conduit', name: 'Mana Conduit',
    description: 'Channels arcane energy into a Summoning Circle. No attack — sit adjacent to a Circle to charge the summon.',
    faction: 'arcane', damageType: 'magic', cost: 40, damage: 0, range: 0, fireRate: 999999,
    color: 0xcc88ff, projectileSpeed: 0, hotkey: '8',
    traits: [],
  }),

  // ================================================================
  // MECHANICAL (8) — Engineering, burn, pierce, efficiency
  // ================================================================
  mech_wall: def({
    id: 'mech_wall', name: 'Wall', description: 'Dirt spike cheap maze filler. Barely attacks.',
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
    id: 'mech_flamethrower', name: 'Flame', description: 'Short range area of effect. Burns for 8 DPS over 3s.',
    faction: 'mechanical', damageType: 'physical', cost: 40, damage: 10, range: 2, fireRate: 500,
    color: 0xff4400, projectileSpeed: 200, projectileColor: 0xff6622, hotkey: '3',
    targeting: 'closest',
    traits: [{ id: 'splash_damage', radius: 32 }, { id: 'burn_dot', dps: 8, duration: 3000 }],
    upgrades: [
      { level: 2, cost: 50, damage: 16, range: 2.5, fireRate: 450 },
      { level: 3, cost: 90, damage: 24, range: 3, fireRate: 380 },
    ],
  }),
  mech_tesla: def({
    id: 'mech_tesla', name: 'Tesla', description: 'Chain lightning. Jumps to nearby targets.',
    faction: 'mechanical', damageType: 'magic', cost: 80, damage: 18, range: 3.5, fireRate: 1400,
    color: 0xeebb44, projectileSpeed: 400, hotkey: '4',
    targeting: 'closest',
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
    id: 'mech_shredder', name: 'Shredder', description: 'Very fast. Shreds one armor tier for 4s per hit.',
    faction: 'mechanical', damageType: 'physical', cost: 150, damage: 6, range: 3, fireRate: 350,
    color: 0xbbaa88, projectileSpeed: 400, hotkey: '6',
    targeting: 'strongest',
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
  // NATURE (8) — Growth, poison, synergy, roots
  // ================================================================
  // Note: `nature_thorn` (the classic cheap scaling DPS) was removed
  // in favour of `nature_bramble` — a faster-firing, shorter-range
  // thornbrush that doubles as a maze filler. Bramble carries
  // Thorn's 5-level scaling slot so Nature's early-DPS curve is
  // preserved.
  nature_root: def({
    id: 'nature_root', name: 'Root', description: 'Strongest slow in game: 70% for 3s.',
    faction: 'nature', damageType: 'magic', cost: 25, damage: 3, range: 3, fireRate: 1000,
    color: 0x886633, projectileSpeed: 200, hotkey: '2',
    targeting: 'fastest',
    traits: [{ id: 'direct_damage' }, { id: 'slow_on_hit', duration: 3000, factor: 0.3 }],
    upgrades: [
      { level: 2, cost: 40, damage: 5, range: 3.5, fireRate: 900 },
    ],
  }),
  nature_blossom: def({
    id: 'nature_blossom', name: 'Blossom', description: 'No attack. Buffs adjacent towers: +25% DMG, +15% SPD/level.',
    faction: 'nature', damageType: 'magic', cost: 60, damage: 0, range: 1.5, fireRate: 99999,
    color: 0xff88aa, projectileSpeed: 0, hotkey: '4',
    traits: [{ id: 'adjacency_buff', damagePercent: 0.25, ratePercent: 0.15 }],
    upgrades: [
      { level: 2, cost: 55, damage: 0, range: 1.5, fireRate: 99999 },
      { level: 3, cost: 90, damage: 0, range: 1.5, fireRate: 99999 },
    ],
  }),
  nature_spore: def({
    id: 'nature_spore', name: 'Spore',
    description: 'Pulses 8 dmg AoE every 1.5s + 2% HP/s poison. Hits ALL creeps in range. Upgrades scale poison to 2.5% / 3% HP/s.',
    faction: 'nature', damageType: 'magic', cost: 100, damage: 8, range: 3, fireRate: 1500,
    color: 0x88cc22, projectileSpeed: 200, projectileColor: 0x66aa00, hotkey: '5',
    // scalePerLevel 0.25 makes poison_dot read 2%/2.5%/3% across L1/L2/L3
    // (vs the default 0.15 which would land at 2%/2.3%/2.6%). Other
    // poison-dot towers keep the default scaling.
    traits: [
      { id: 'tower_aura_damage', radius: 96 },
      { id: 'poison_dot', percentPerSec: 0.02, duration: 3000, scalePerLevel: 0.25 },
    ],
    upgrades: [
      { level: 2, cost: 90, damage: 14, range: 3.5, fireRate: 1300 },
      { level: 3, cost: 150, damage: 22, range: 4, fireRate: 1100 },
    ],
  }),
  nature_vine: def({
    id: 'nature_vine', name: 'Vine', description: '20% chance to fully root (stun) for 0.8s per hit.',
    faction: 'nature', damageType: 'physical', cost: 160, damage: 14, range: 3.5, fireRate: 1000,
    color: 0x228833, projectileSpeed: 280, hotkey: '7',
    traits: [{ id: 'direct_damage' }, { id: 'root_on_hit', chance: 0.2, duration: 800 }],
    upgrades: [
      { level: 2, cost: 130, damage: 22, range: 4, fireRate: 900 },
      { level: 3, cost: 200, damage: 32, range: 4, fireRate: 800 },
    ],
  }),
  nature_elder: def({
    id: 'nature_elder', name: 'Elder Treant', description: 'ULTIMATE. Grows +8% DMG permanently. Roots and buffs allies.',
    faction: 'nature', damageType: 'physical', cost: 450, damage: 40, range: 4, fireRate: 800,
    color: 0x225511, projectileSpeed: 280, hotkey: '8', ultimate: true,
    traits: [
      { id: 'direct_damage' },
      { id: 'growth_scaling', growthPercent: 0.08 },
      { id: 'root_on_hit', chance: 0.25, duration: 1000 },
      { id: 'adjacency_buff', damagePercent: 0.25, ratePercent: 0.12 },
    ],
    // No upgrades — it grows on its own
  }),
  nature_bramble: def({
    id: 'nature_bramble', name: 'Bramble Hedge',
    description: 'Dense thornbrush. Pricks constantly. At Lv2, choose Hedge (wider maze) or Razor Bramble (vicious DPS).',
    role: 'wall',
    faction: 'nature', damageType: 'physical', cost: 12, damage: 3, range: 1.2, fireRate: 400,
    color: 0x447733, projectileSpeed: 260, hotkey: '1',
    traits: [{ id: 'direct_damage' }],
    upgrades: [
      // L2 is the branch point. Default = Hedge (keeps the wall
      // identity and cheap-maze scaling). Branch = Razor Bramble,
      // which swaps the tower's typeDef to nature_razor_bramble
      // (see the sibling definition below for Razor's stats).
      {
        level: 2, cost: 15, damage: 2, range: 1.2, fireRate: 350,
        branchLabel: 'Hedge',
        branches: [{ id: 'razor', label: 'Razor Bramble', transformsTo: 'nature_razor_bramble' }],
      },
      { level: 3, cost: 25, damage: 3, range: 1.5, fireRate: 300 },
    ],
  }),
  // Razor Bramble — not in `Factions.nature.towerIds`, so it can't
  // be placed directly from the tower dock. Only reachable via
  // Bramble Hedge's L2 branch. Its `cost` is charged as the one-
  // time branch-switch fee. `upgrades` contains L3 and L4 stats,
  // continuing the engine's level counter from where Bramble left
  // off (L2 on swap → typeDef.upgrades[0].level === 3).
  nature_razor_bramble: def({
    id: 'nature_razor_bramble', name: 'Razor Bramble',
    description: 'Bramble sharpened into blades. Short range, vicious bite.',
    role: 'dps-single',
    faction: 'nature', damageType: 'physical',
    cost: 15, damage: 5, range: 1.5, fireRate: 300,
    color: 0x884433, projectileSpeed: 300, projectileColor: 0xcc4422, hotkey: '',
    traits: [{ id: 'direct_damage' }],
    upgrades: [
      { level: 3, cost: 40, damage: 9,  range: 1.8, fireRate: 260 },
      { level: 4, cost: 70, damage: 15, range: 2.2, fireRate: 220 },
    ],
  }),
  nature_viper: def({
    id: 'nature_viper', name: 'Grove Viper',
    description: 'Mobile. Slithers along hidden paths; strikes with a fanged lunge and sinks venom deep.',
    faction: 'nature', damageType: 'physical', cost: 30, damage: 12, range: 2.5, fireRate: 750,
    color: 0x2a5a2a, projectileSpeed: 200, hotkey: '3',
    traits: [
      // Slithers along the ground — underlying mobile_unit pathing
      // is standard (smooth-slide); the undulation is sprite-only
      // (4-frame S-curve cycle). engageRange tuned so the strike
      // reaches past the snake's own body length.
      { id: 'mobile_unit', moveSpeed: 100, engageRange: 1.8, leashRange: 4, attackCooldown: 750 },
      { id: 'direct_damage' },
      { id: 'poison_dot', percentPerSec: 0.06, duration: 4500 },
    ],
    upgrades: [
      { level: 2, cost: 40, damage: 13, range: 2.8, fireRate: 700 },
      { level: 3, cost: 65, damage: 20, range: 3.2, fireRate: 650 },
    ],
  }),
  nature_sunroot: def({
    id: 'nature_sunroot', name: 'Sunroot',
    description: 'Splash DPS. A bloom that learned to burn — fire-flowers arc wide.',
    faction: 'nature', damageType: 'magic', cost: 140, damage: 22, range: 4, fireRate: 900,
    color: 0xddaa22, projectileSpeed: 260, projectileColor: 0xffcc44, hotkey: '6',
    traits: [{ id: 'splash_damage', radius: 72 }],
    upgrades: [
      { level: 2, cost: 120, damage: 34, range: 3.5, fireRate: 850 },
      { level: 3, cost: 200, damage: 50, range: 4, fireRate: 800 },
    ],
  }),

  // ================================================================
  // VOID (5) — Chaos, gambling, manipulation
  // ================================================================
  void_gambler: def({
    id: 'void_gambler', name: 'Gambler', description: 'Cheap chaos. 4% instant kill (1% vs bosses), 25% whiff.',
    faction: 'void', damageType: 'magic', cost: 15, damage: 20, range: 3, fireRate: 1000,
    color: 0xdd44ff, projectileSpeed: 300, hotkey: '1',
    targeting: 'weakest',
    traits: [{ id: 'direct_damage' }, { id: 'jackpot', killChance: 0.04, missChance: 0.25 }],
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
    id: 'void_siphon', name: 'Siphon', description: '40% chance of +2g per hit. Gambler\'s economy engine.',
    faction: 'void', damageType: 'magic', cost: 50, damage: 5, range: 3, fireRate: 700,
    color: 0xbb55dd, projectileSpeed: 300, projectileColor: 0xffdd44, hotkey: '3',
    traits: [{ id: 'direct_damage' }, { id: 'gold_on_hit', amount: 2, chance: 0.4 }],
    upgrades: [
      { level: 2, cost: 55, damage: 8, range: 3.5, fireRate: 650 },
      { level: 3, cost: 90, damage: 12, range: 4, fireRate: 580 },
      { level: 4, cost: 140, damage: 18, range: 4, fireRate: 500 },
    ],
  }),
  void_rift: def({
    id: 'void_rift', name: 'Rift', description: 'Teleports creeps backward on their path. Bites a little on the way through.',
    faction: 'void', damageType: 'magic', cost: 120, damage: 2, range: 3.5, fireRate: 3500,
    color: 0x440066, projectileSpeed: 200, hotkey: '4',
    traits: [{ id: 'teleport_delivery', stepsBase: 4, stepsPerLevel: 2 }],
    upgrades: [
      { level: 2, cost: 100, damage: 3, range: 4, fireRate: 3000 },
      { level: 3, cost: 160, damage: 4, range: 4.5, fireRate: 2500 },
    ],
  }),
  void_oblivion: def({
    id: 'void_oblivion', name: 'Oblivion', description: 'ULTIMATE. 15% instakill, 30% chance of +8 gold per hit, extreme variance.',
    faction: 'void', damageType: 'magic', cost: 900, damage: 80, range: 5, fireRate: 600,
    color: 0x220044, projectileSpeed: 400, projectileColor: 0xff00ff, hotkey: '5', ultimate: true,
    targeting: 'weakest',
    traits: [
      { id: 'direct_damage' },
      { id: 'jackpot', killChance: 0.15, missChance: 0.1 },
      { id: 'damage_variance', min: 0.5, max: 2.5 },
      { id: 'gold_on_hit', amount: 8, chance: 0.3 },
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
    traits: [{ id: 'mobile_unit', moveSpeed: 110, engageRange: 2.5, leashRange: 8, attackCooldown: 700 }],
    upgrades: [
      { level: 2, cost: 45, damage: 22, range: 3.5, fireRate: 600 },
      { level: 3, cost: 80, damage: 34, range: 4, fireRate: 500 },
    ],
  }),
  mil_brawler: def({
    id: 'mil_brawler', name: 'Brawler', description: 'Mobile melee. High damage, gets up close.',
    faction: 'military', damageType: 'physical', cost: 55, damage: 22, range: 2, fireRate: 500,
    color: 0x8b4513, projectileSpeed: 0, hotkey: '4',
    traits: [{ id: 'mobile_unit', moveSpeed: 140, engageRange: 0.8, leashRange: 4, attackCooldown: 500 }],
    upgrades: [
      { level: 2, cost: 60, damage: 35, range: 2, fireRate: 450 },
      { level: 3, cost: 100, damage: 50, range: 2, fireRate: 400 },
    ],
  }),
  mil_heavy: def({
    id: 'mil_heavy', name: 'Tank', description: 'Mobile area of effect. Slow but long range. Fires explosive shells.',
    faction: 'military', damageType: 'physical', cost: 120, damage: 30, range: 5, fireRate: 2000,
    color: 0x4a6741, projectileSpeed: 180, hotkey: '5',
    traits: [{ id: 'mobile_unit', moveSpeed: 60, engageRange: 4.5, leashRange: 7, attackCooldown: 2000 }, { id: 'splash_damage', radius: 48 }],
    upgrades: [
      { level: 2, cost: 100, damage: 45, range: 5.5, fireRate: 1800 },
      { level: 3, cost: 160, damage: 65, range: 6, fireRate: 1500 },
    ],
  }),
  mil_commander: def({
    id: 'mil_commander', name: 'Commander', description: 'ULTIMATE. Mobile. Buffs all units in range. Strong melee.',
    faction: 'military', damageType: 'physical', cost: 750, damage: 40, range: 5, fireRate: 800,
    color: 0xdaa520, projectileSpeed: 0, hotkey: '6', ultimate: true,
    traits: [
      { id: 'mobile_unit', moveSpeed: 110, engageRange: 1, leashRange: 6, attackCooldown: 800 },
      { id: 'adjacency_buff', damagePercent: 0.2, ratePercent: 0.1 },
    ],
    // No upgrades — the Commander leads by presence
  }),

  // ================================================================
  // SPAWN ALIENS (7) — Cheap, fast, swarm. Overwhelm through quantity.
  // ================================================================
  alien_spitter: def({
    id: 'alien_spitter', name: 'Spitter', description: 'Dirt cheap. Extremely fast fire, tiny damage.',
    faction: 'aliens', damageType: 'physical', cost: 12, damage: 3, range: 3, fireRate: 250,
    color: 0x88ff44, projectileSpeed: 400, hotkey: '1',
    upgrades: [
      { level: 2, cost: 15, damage: 5, range: 3, fireRate: 220 },
      { level: 3, cost: 25, damage: 8, range: 3.5, fireRate: 200 },
    ],
  }),
  alien_stinger: def({
    id: 'alien_stinger', name: 'Stinger', description: 'Fast fire. Applies weak poison (1% HP/s).',
    faction: 'aliens', damageType: 'physical', cost: 25, damage: 4, range: 3, fireRate: 350,
    color: 0x66dd22, projectileSpeed: 350, hotkey: '2',
    traits: [{ id: 'direct_damage' }, { id: 'poison_dot', percentPerSec: 0.01, duration: 2000 }],
    upgrades: [
      { level: 2, cost: 30, damage: 6, range: 3.5, fireRate: 300 },
    ],
  }),
  alien_swarm_node: def({
    id: 'alien_swarm_node', name: 'Swarm Node', description: 'No attack. All Alien towers in range fire 20% faster.',
    faction: 'aliens', damageType: 'physical', cost: 60, damage: 0, range: 4, fireRate: 99999,
    color: 0xaaff66, projectileSpeed: 0, hotkey: '3',
    traits: [{ id: 'faction_speed_aura', ratePercent: 0.2 }],
    upgrades: [
      { level: 2, cost: 55, damage: 0, range: 5, fireRate: 99999 },
    ],
  }),
  alien_acid: def({
    id: 'alien_acid', name: 'Acid Sprayer', description: 'Short range area of effect + armor shred + poison.',
    faction: 'aliens', damageType: 'physical', cost: 100, damage: 8, range: 2.5, fireRate: 500,
    color: 0x44bb00, projectileSpeed: 250, projectileColor: 0x66ff00, hotkey: '4',
    targeting: 'closest',
    traits: [{ id: 'splash_damage', radius: 40 }, { id: 'armor_shred_on_hit', shredAmount: 1, duration: 3000 }, { id: 'poison_dot', percentPerSec: 0.015, duration: 2500 }],
    upgrades: [
      { level: 2, cost: 90, damage: 12, range: 3, fireRate: 450 },
    ],
  }),
  alien_hive_spire: def({
    id: 'alien_hive_spire', name: 'Hive Spire', description: 'Very fast chain. Chains to 5 targets.',
    faction: 'aliens', damageType: 'physical', cost: 180, damage: 12, range: 4, fireRate: 400,
    color: 0x77ee33, projectileSpeed: 450, hotkey: '5',
    targeting: 'closest',
    traits: [{ id: 'chain_damage', chainCount: 4, chainRange: 80, falloff: 0.8 }],
    upgrades: [
      { level: 2, cost: 150, damage: 18, range: 4.5, fireRate: 350 },
      { level: 3, cost: 250, damage: 26, range: 5, fireRate: 300 },
    ],
  }),
  alien_brood_mother: def({
    id: 'alien_brood_mother', name: 'Brood Mother', description: 'Spawns 2 Swarmlings/wave. Buffs nearby Swarmlings +20% damage, +15% speed.',
    faction: 'aliens', damageType: 'physical', cost: 80, damage: 6, range: 3, fireRate: 600,
    color: 0x55aa22, projectileSpeed: 300, hotkey: '6',
    traits: [{ id: 'direct_damage' }, { id: 'spawn_swarmlings_per_wave', count: 2 }, { id: 'commander_aura', buffRange: 6, damagePercent: 0.20, ratePercent: 0.15, targetIds: ['alien_swarmling'] }],
    upgrades: [
      { level: 2, cost: 70, damage: 10, range: 3.5, fireRate: 550 },
    ],
  }),
  alien_swarmling: def({
    id: 'alien_swarmling', name: 'Swarmling', description: 'Mobile melee. Cheap, fast, disposable.',
    faction: 'aliens', damageType: 'physical', cost: 15, damage: 4, range: 2, fireRate: 400,
    color: 0x99ee55, projectileSpeed: 0, hotkey: '7',
    traits: [{ id: 'mobile_unit', moveSpeed: 160, engageRange: 0.6, leashRange: 5, attackCooldown: 400 }],
    upgrades: [
      { level: 2, cost: 15, damage: 10, range: 2, fireRate: 350 },
    ],
  }),
  alien_overmind: def({
    id: 'alien_overmind', name: 'Overmind', description: 'ULTIMATE. Extreme fire rate. Buffs all aliens nearby.',
    faction: 'aliens', damageType: 'physical', cost: 700, damage: 15, range: 5, fireRate: 150,
    color: 0xccff88, projectileSpeed: 500, hotkey: '8', ultimate: true,
    traits: [{ id: 'direct_damage' }, { id: 'faction_speed_aura', ratePercent: 0.3 }],
  }),

  // ================================================================
  // CYPHERPUNK (7) — Digital warfare. Hacking, viruses, firewalls.
  // ================================================================
  cyber_ping: def({
    id: 'cyber_ping', name: 'Ping', description: 'Cheap. Very long range, low damage.',
    faction: 'cypherpunk', damageType: 'magic', cost: 15, damage: 5, range: 8, fireRate: 700,
    color: 0x00ffcc, projectileSpeed: 500, hotkey: '1',
    upgrades: [
      { level: 2, cost: 20, damage: 8, range: 9, fireRate: 800 },
      { level: 3, cost: 40, damage: 13, range: 10, fireRate: 700 },
    ],
  }),
  cyber_firewall: def({
    id: 'cyber_firewall', name: 'Firewall', description: 'Links to another Firewall within range. Beam damages + heavily slows creeps crossing.',
    faction: 'cypherpunk', damageType: 'magic', cost: 35, damage: 0, range: 8, fireRate: 99999,
    color: 0x0088aa, projectileSpeed: 0, hotkey: '2',
    traits: [{ id: 'firewall_link', linkRange: 8, dps: 35, slowFactor: 0.50 }],
    upgrades: [
      { level: 2, cost: 40, damage: 0, range: 10, fireRate: 99999 },
    ],
  }),
  cyber_virus: def({
    id: 'cyber_virus', name: 'Virus', description: 'Infects target. Spreads to nearby creeps as Damage over Time.',
    faction: 'cypherpunk', damageType: 'magic', cost: 55, damage: 8, range: 4, fireRate: 1200,
    color: 0x00dd88, projectileSpeed: 350, projectileColor: 0x00ff88, hotkey: '3',
    traits: [{ id: 'direct_damage' }, { id: 'virus_spread', dps: 10, duration: 4000, spreadRange: 2 }],
    upgrades: [
      { level: 2, cost: 60, damage: 12, range: 4.5, fireRate: 1000 },
      { level: 3, cost: 100, damage: 18, range: 5, fireRate: 800 },
    ],
  }),
  cyber_backdoor: def({
    id: 'cyber_backdoor', name: 'Backdoor', description: 'Hacks target — creep walks backward for 1.5s.',
    faction: 'cypherpunk', damageType: 'magic', cost: 90, damage: 10, range: 5, fireRate: 3000,
    color: 0x00aaff, projectileSpeed: 400, hotkey: '4',
    traits: [{ id: 'direct_damage' }, { id: 'hack_reverse', duration: 1500 }],
    upgrades: [
      { level: 2, cost: 80, damage: 15, range: 5.5, fireRate: 2700 },
      { level: 3, cost: 130, damage: 22, range: 6, fireRate: 2400 },
    ],
  }),
  cyber_ddos: def({
    id: 'cyber_ddos', name: 'DDoS', description: 'Area of effect. Roots all creeps in range for 0.5s periodically.',
    faction: 'cypherpunk', damageType: 'magic', cost: 150, damage: 15, range: 3.5, fireRate: 2000,
    color: 0x4488ee, projectileSpeed: 300, hotkey: '5',
    traits: [{ id: 'splash_damage', radius: 56 }, { id: 'root_on_hit', chance: 1.0, duration: 500 }],
    upgrades: [
      { level: 2, cost: 120, damage: 22, range: 4, fireRate: 1800 },
    ],
  }),
  cyber_rootkit: def({
    id: 'cyber_rootkit', name: 'Rootkit', description: 'Mutes creep abilities in range. Strong armor shred per hit.',
    faction: 'cypherpunk', damageType: 'magic', cost: 300, damage: 12, range: 5, fireRate: 1000,
    color: 0x2266aa, projectileSpeed: 350, hotkey: '6',
    targeting: 'strongest',
    traits: [{ id: 'direct_damage' }, { id: 'mute_mage_aura' }, { id: 'armor_shred_on_hit', shredAmount: 2, duration: 6000 }],
    upgrades: [
      { level: 2, cost: 250, damage: 18, range: 5.5, fireRate: 900 },
    ],
  }),
  cyber_zeroday: def({
    id: 'cyber_zeroday', name: 'Zero Day', description: 'ULTIMATE. Hacks + virus + mutes in massive range.',
    faction: 'cypherpunk', damageType: 'magic', cost: 800, damage: 30, range: 6, fireRate: 1500,
    color: 0x00ffff, projectileSpeed: 450, hotkey: '7', ultimate: true,
    traits: [
      { id: 'direct_damage' },
      { id: 'hack_reverse', duration: 2000 },
      { id: 'virus_spread', dps: 15, duration: 5000, spreadRange: 3 },
      { id: 'mute_mage_aura' },
      { id: 'armor_shred_on_hit', shredAmount: 2, duration: 5000 },
    ],
  }),

  // ================================================================
  // INFERNAL (6) — Sacrifice and decay. Power at any price.
  // ================================================================
  infernal_imp: def({
    id: 'infernal_imp', name: 'Imp', description: 'Cheap. Decent damage. Expires after 4 waves.',
    faction: 'infernal', damageType: 'magic', cost: 12, damage: 12, range: 3, fireRate: 700,
    color: 0xff4422, projectileSpeed: 350, hotkey: '1',
    traits: [{ id: 'direct_damage' }, { id: 'expires_after_waves', waves: 4 }],
  }),
  infernal_hellfire: def({
    id: 'infernal_hellfire', name: 'Hellfire', description: 'Strong area of effect + burn. Loses 15% damage each wave.',
    faction: 'infernal', damageType: 'magic', cost: 45, damage: 35, range: 3, fireRate: 1500,
    color: 0xff6600, projectileSpeed: 250, hotkey: '2',
    targeting: 'closest',
    traits: [{ id: 'splash_damage', radius: 48 }, { id: 'burn_dot', dps: 12, duration: 3000 }, { id: 'decay_per_wave', decayPercent: 0.15 }],
    upgrades: [
      { level: 2, cost: 50, damage: 55, range: 3.5, fireRate: 1300 },
    ],
  }),
  infernal_soul_drain: def({
    id: 'infernal_soul_drain', name: 'Soul Drain', description: 'Earns +2g per kill within range.',
    faction: 'infernal', damageType: 'magic', cost: 90, damage: 18, range: 4, fireRate: 900,
    color: 0xcc3366, projectileSpeed: 300, hotkey: '3',
    traits: [{ id: 'direct_damage' }, { id: 'gold_per_kill_range', goldPerKill: 2 }],
    upgrades: [
      { level: 2, cost: 65, damage: 28, range: 4.5, fireRate: 800 },
      { level: 3, cost: 100, damage: 42, range: 5, fireRate: 700 },
    ],
  }),
  infernal_bomber: def({
    id: 'infernal_bomber', name: 'Fiend', description: 'Kamikaze. Runs to nearest creep and explodes for area of effect damage. Single use.',
    faction: 'infernal', damageType: 'magic', cost: 20, damage: 60, range: 10, fireRate: 99999,
    color: 0xdd3300, projectileSpeed: 0, hotkey: '4',
    traits: [{ id: 'mobile_unit', moveSpeed: 180, engageRange: 0.5, attackCooldown: 100, attackSplash: 56, selfDestruct: true }],
  }),
  infernal_immolate: def({
    id: 'infernal_immolate', name: 'Immolate', description: 'Strong DPS. Right-click to sacrifice for 2000 area of effect damage.',
    faction: 'infernal', damageType: 'magic', cost: 200, damage: 40, range: 4, fireRate: 800,
    color: 0xff8800, projectileSpeed: 300, hotkey: '5',
    traits: [{ id: 'direct_damage' }, { id: 'burn_dot', dps: 15, duration: 3000 }],
    upgrades: [
      { level: 2, cost: 160, damage: 65, range: 4.5, fireRate: 700 },
    ],
  }),
  infernal_apocalypse: def({
    id: 'infernal_apocalypse', name: 'Apocalypse', description: 'ULTIMATE. Massive burn area of effect. Sacrifice for 8000 damage.',
    faction: 'infernal', damageType: 'magic', cost: 900, damage: 80, range: 5, fireRate: 1000,
    color: 0xff2200, projectileSpeed: 300, hotkey: '5', ultimate: true,
    traits: [
      { id: 'splash_damage', radius: 80 },
      { id: 'burn_dot', dps: 30, duration: 5000 },
      { id: 'damage_amp_on_hit', ampAmount: 0.25, duration: 4000 },
    ],
  }),

  // ================================================================
  // CELESTIAL (5) — Holy protection. Gain lives, block leaks, mute mages.
  // ================================================================
  celestial_acolyte: def({
    id: 'celestial_acolyte', name: 'Acolyte', description: 'Light damage. 5% chance on nearby kill to gain +1 life.',
    faction: 'celestial', damageType: 'magic', cost: 25, damage: 14, range: 4.5, fireRate: 800,
    color: 0xffffaa, projectileSpeed: 350, hotkey: '1',
    traits: [{ id: 'direct_damage' }, { id: 'life_on_kill', chance: 0.05 }],
    upgrades: [
      { level: 2, cost: 30, damage: 16, range: 4, fireRate: 700 },
      { level: 3, cost: 55, damage: 24, range: 4.5, fireRate: 600 },
    ],
  }),
  celestial_ward: def({
    id: 'celestial_ward', name: 'Ward', description: 'No attack. Mutes all creep mage abilities in range.',
    faction: 'celestial', damageType: 'magic', cost: 40, damage: 0, range: 4, fireRate: 99999,
    color: 0xffddaa, projectileSpeed: 0, hotkey: '2',
    traits: [{ id: 'mute_mage_aura' }],
    upgrades: [
      { level: 2, cost: 45, damage: 0, range: 5, fireRate: 99999 },
      { level: 3, cost: 80, damage: 0, range: 6, fireRate: 99999 },
    ],
  }),
  celestial_smite: def({
    id: 'celestial_smite', name: 'Smite', description: 'High damage. +50% vs bosses and shielded creeps.',
    faction: 'celestial', damageType: 'magic', cost: 80, damage: 45, range: 5, fireRate: 1800,
    color: 0xffeecc, projectileSpeed: 400, hotkey: '3',
    targeting: 'strongest',
    traits: [{ id: 'direct_damage' }, { id: 'bonus_vs_boss', bonus: 0.5 }],
    upgrades: [
      { level: 2, cost: 90, damage: 70, range: 5.5, fireRate: 1600 },
      { level: 3, cost: 150, damage: 110, range: 6, fireRate: 1400 },
    ],
  }),
  celestial_sanctuary: def({
    id: 'celestial_sanctuary', name: 'Sanctuary', description: 'Absorbs 1 leaked creep. Recharges every 10 waves.',
    faction: 'celestial', damageType: 'magic', cost: 150, damage: 15, range: 4, fireRate: 1000,
    color: 0xffffff, projectileSpeed: 350, hotkey: '4',
    traits: [{ id: 'direct_damage' }, { id: 'leak_absorb', maxCharges: 1, rechargeWaves: 10 }],
    upgrades: [
      { level: 2, cost: 120, damage: 25, range: 4.5, fireRate: 900 },
    ],
  }),
  celestial_absolution: def({
    id: 'celestial_absolution', name: 'Absolution', description: 'ULTIMATE. Huge holy area of effect. 10% life gain on kill. Mutes mages.',
    faction: 'celestial', damageType: 'magic', cost: 600, damage: 60, range: 5, fireRate: 1200,
    color: 0xfff8e0, projectileSpeed: 350, hotkey: '5', ultimate: true,
    traits: [
      { id: 'splash_damage', radius: 72 },
      { id: 'life_on_kill', chance: 0.10 },
      { id: 'mute_mage_aura' },
      { id: 'bonus_vs_boss', bonus: 0.3 },
    ],
  }),

  // ================================================================
  // PSIONIC (5) — True damage. Confusion. Mind over matter.
  // ================================================================
  psi_probe: def({
    id: 'psi_probe', name: 'Probe', description: 'Cheap true damage. Ignores all armor.',
    faction: 'psionic', damageType: 'magic', cost: 20, damage: 8, range: 4, fireRate: 700,
    color: 0xdd88ff, projectileSpeed: 350, hotkey: '1',
    traits: [{ id: 'true_damage' }],
    upgrades: [
      { level: 2, cost: 25, damage: 14, range: 3.5, fireRate: 650 },
      { level: 3, cost: 50, damage: 22, range: 4, fireRate: 580 },
    ],
  }),
  psi_mesmer: def({
    id: 'psi_mesmer', name: 'Mesmer', description: 'Confuses target — walks backward for 1.2s.',
    faction: 'psionic', damageType: 'magic', cost: 45, damage: 6, range: 4, fireRate: 2500,
    color: 0xcc66ff, projectileSpeed: 300, hotkey: '2',
    traits: [{ id: 'true_damage' }, { id: 'confuse_on_hit', duration: 1200 }],
    upgrades: [
      { level: 2, cost: 50, damage: 10, range: 4.5, fireRate: 2200 },
      { level: 3, cost: 90, damage: 16, range: 5, fireRate: 1900 },
    ],
  }),
  psi_terror: def({
    id: 'psi_terror', name: 'Terror', description: 'Fear aura: 50% slow field. Plus true damage.',
    faction: 'psionic', damageType: 'magic', cost: 80, damage: 12, range: 3.5, fireRate: 900,
    color: 0xbb44ee, projectileSpeed: 300, hotkey: '3',
    targeting: 'closest',
    traits: [{ id: 'true_damage' }, { id: 'slow_aura', factor: 0.5 }],
    upgrades: [
      { level: 2, cost: 75, damage: 20, range: 4, fireRate: 800 },
    ],
  }),
  psi_mind_spike: def({
    id: 'psi_mind_spike', name: 'Mind Spike', description: 'Long range true damage. +50% vs mage creeps.',
    faction: 'psionic', damageType: 'magic', cost: 150, damage: 55, range: 7, fireRate: 2500,
    color: 0xaa22dd, projectileSpeed: 500, hotkey: '4',
    targeting: 'strongest',
    traits: [{ id: 'true_damage' }, { id: 'bonus_vs_mage', bonus: 0.5 }],
    upgrades: [
      { level: 2, cost: 130, damage: 85, range: 8, fireRate: 2200 },
      { level: 3, cost: 200, damage: 130, range: 9, fireRate: 1900 },
    ],
  }),
  psi_overmind: def({
    id: 'psi_overmind', name: 'Overmind', description: 'ULTIMATE. Mass confusion + massive true damage pulse.',
    faction: 'psionic', damageType: 'magic', cost: 750, damage: 100, range: 5, fireRate: 2000,
    color: 0x9900ff, projectileSpeed: 400, hotkey: '5', ultimate: true,
    traits: [
      { id: 'splash_damage', radius: 80 },
      { id: 'confuse_on_hit', duration: 2000 },
      { id: 'bonus_vs_mage', bonus: 1.0 },
    ],
  }),
  // ================================================================
  // HARMONIC (7) — Aura network. Sharing, connection, synergy.
  // ================================================================
  harmonic_resonator: def({
    id: 'harmonic_resonator', name: 'Resonator', description: 'Basic DPS. Weak alone, powerful with auras.',
    faction: 'harmonic', damageType: 'magic', cost: 20, damage: 8, range: 3.5, fireRate: 700,
    color: 0xffcc44, projectileSpeed: 350, hotkey: '1',
    upgrades: [
      { level: 2, cost: 25, damage: 14, range: 3.5, fireRate: 650 },
      { level: 3, cost: 50, damage: 22, range: 4, fireRate: 580 },
      { level: 4, cost: 85, damage: 32, range: 4, fireRate: 500 },
    ],
  }),
  harmonic_amplifier: def({
    id: 'harmonic_amplifier', name: 'Amplifier', description: 'No attack. +15% damage to towers in range — stacks multiplicatively, no cap.',
    faction: 'harmonic', damageType: 'magic', cost: 30, damage: 0, range: 4, fireRate: 99999,
    color: 0xff6644, projectileSpeed: 0, hotkey: '2',
    traits: [{ id: 'damage_aura', percent: 0.15 }],
    upgrades: [
      { level: 2, cost: 35, damage: 0, range: 4.5, fireRate: 99999 },
      { level: 3, cost: 60, damage: 0, range: 5, fireRate: 99999 },
    ],
  }),
  harmonic_quickener: def({
    id: 'harmonic_quickener', name: 'Quickener', description: 'No attack. +10% fire rate to towers in range — stacks multiplicatively, no cap.',
    faction: 'harmonic', damageType: 'magic', cost: 40, damage: 0, range: 4, fireRate: 99999,
    color: 0x44ee44, projectileSpeed: 0, hotkey: '3',
    traits: [{ id: 'rate_aura', percent: 0.10 }],
    upgrades: [
      { level: 2, cost: 45, damage: 0, range: 4.5, fireRate: 99999 },
    ],
  }),
  harmonic_reach: def({
    id: 'harmonic_reach', name: 'Reach', description: 'No attack. +10% range to towers in range — stacks multiplicatively, no cap.',
    faction: 'harmonic', damageType: 'magic', cost: 50, damage: 0, range: 4, fireRate: 99999,
    color: 0x4488ff, projectileSpeed: 0, hotkey: '4',
    traits: [{ id: 'range_aura', percent: 0.10 }],
    upgrades: [
      { level: 2, cost: 55, damage: 0, range: 5, fireRate: 99999 },
    ],
  }),
  harmonic_critical_mass: def({
    id: 'harmonic_critical_mass', name: 'Critical Mass', description: 'No attack. Grants 20%/stack crit chance (2x) to towers in range — chance compounds (asymptotic to 100%), no cap.',
    faction: 'harmonic', damageType: 'magic', cost: 80, damage: 0, range: 4, fireRate: 99999,
    color: 0xff44ff, projectileSpeed: 0, hotkey: '5',
    traits: [{ id: 'crit_aura', chance: 0.20, multiplier: 2 }],
    upgrades: [
      { level: 2, cost: 75, damage: 0, range: 5, fireRate: 99999 },
    ],
  }),
  harmonic_conduit: def({
    id: 'harmonic_conduit', name: 'Conduit', description: 'Links 2 nearest aura towers. Shares their auras between them.',
    faction: 'harmonic', damageType: 'magic', cost: 100, damage: 0, range: 6, fireRate: 99999,
    color: 0xbb9922, projectileSpeed: 0, hotkey: '6',
    traits: [{ id: 'conduit_link', maxLinks: 2, linkRange: 6 }],
    upgrades: [
      { level: 2, cost: 90, damage: 0, range: 7, fireRate: 99999 },
      { level: 3, cost: 150, damage: 0, range: 8, fireRate: 99999 },
    ],
  }),
  harmonic_crescendo: def({
    id: 'harmonic_crescendo', name: 'Crescendo', description: 'ULTIMATE. Moderate DPS. All aura effects on this tower are doubled.',
    faction: 'harmonic', damageType: 'magic', cost: 650, damage: 30, range: 5, fireRate: 800,
    color: 0xffee88, projectileSpeed: 400, hotkey: '7', ultimate: true,
    traits: [{ id: 'direct_damage' }],
    // Aura doubling handled by checking for this tower type in aura handlers
  }),
};

export const TOWER_ORDER = ['arrow', 'cannon', 'sniper', 'slow'];

export function getTowerType(id: string): TowerType {
  const t = TOWER_TYPES[id];
  if (!t) throw new Error(`Unknown tower type: ${id}`);
  return t;
}

/** Get all faction-selectable tower IDs.
 *
 *  Pulls from each faction's explicit `towerIds` list rather than
 *  iterating `TOWER_TYPES`, so branch-only towers (e.g.
 *  `nature_razor_bramble`, reached only via Bramble Hedge's L2
 *  branch) are NOT included. This is the pool the Chaos faction
 *  and other "all towers" UIs roll from. */
export function getAllFactionTowerIds(): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const fid of FACTION_ORDER) {
    if (fid === 'chaos' || fid === 'random') continue;
    for (const id of FACTIONS[fid].towerIds) {
      if (!seen.has(id)) { seen.add(id); ids.push(id); }
    }
  }
  return ids;
}
