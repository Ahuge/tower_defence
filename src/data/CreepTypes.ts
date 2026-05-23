import { Trait } from '../systems/traits/Trait';
import { DifficultyHints } from './Difficulty';

export type ArmorType = 'light' | 'medium' | 'heavy';
export type DamageType = 'physical' | 'magic';

export type SpawnBehavior = 'normal' | 'group' | 'flying';

/**
 * Resolved spawn parameters after difficulty is applied.
 * Each creep type produces this from base stats + difficulty hints.
 */
export interface ResolvedCreepParams {
  hpMult: number;
  speedMult: number;
  countMult: number; // multiplier on wave group count
  goldMult: number;
  extraTraits: Trait[]; // additional traits added by difficulty
}

export interface CreepType {
  id: string;
  name: string;
  description: string;
  hpMultiplier: number;
  speedMultiplier: number;
  armor: ArmorType;
  color: number;
  size: number;
  count: number; // per-unit spawn count (swarm = 3)
  traits: Trait[];
  spawnBehavior: SpawnBehavior;
  /** Spawn-order tier within a wave. 'last' creeps sort to the end of
   *  the wave's spawn queue regardless of group order. Used for
   *  caster creeps so the threat is the wave's finale, not a random
   *  mid-wave surprise. Default 'normal'. */
  spawnOrder?: 'normal' | 'last';
  /** How this creep interprets difficulty. Returns modified params. */
  applyDifficulty(hints: DifficultyHints): ResolvedCreepParams;
}

// Default difficulty application — most creeps use this
function defaultDifficulty(hints: DifficultyHints): ResolvedCreepParams {
  return {
    hpMult: hints.toughness,
    speedMult: hints.speed,
    countMult: hints.count,
    goldMult: hints.goldMult,
    extraTraits: [],
  };
}

export const CREEP_TYPES: Record<string, CreepType> = {
  // === Core types ===
  standard: {
    id: 'standard', name: 'Standard', description: 'Balanced. No surprises.',
    hpMultiplier: 1, speedMultiplier: 1, armor: 'medium',
    color: 0xff4444, size: 1, count: 1, traits: [],
    spawnBehavior: 'normal',
    applyDifficulty: defaultDifficulty,
  },

  fast: {
    id: 'fast', name: 'Fast', description: 'Double speed, half HP. Rushes through.',
    hpMultiplier: 0.5, speedMultiplier: 2, armor: 'light',
    color: 0xffaa22, size: 0.8, count: 1, traits: [],
    spawnBehavior: 'normal',
    applyDifficulty(hints) {
      return {
        hpMult: hints.toughness * 0.8, // fast creeps don't gain as much HP
        speedMult: hints.speed * 1.1, // but get even faster
        countMult: hints.count,
        goldMult: hints.goldMult,
        extraTraits: [],
      };
    },
  },

  armored: {
    id: 'armored', name: 'Armored', description: 'Heavy armor, slow, tanky. Resists physical.',
    hpMultiplier: 2.5, speedMultiplier: 0.7, armor: 'heavy',
    color: 0x888888, size: 1.2, count: 1, traits: [],
    spawnBehavior: 'normal',
    applyDifficulty(hints) {
      return {
        hpMult: hints.toughness * 1.3, // armored absorbs toughness modifier more
        speedMult: hints.speed * 0.9, // barely speeds up
        countMult: Math.max(1, hints.count * 0.6), // fewer extras — each one is a problem
        goldMult: hints.goldMult,
        extraTraits: hints.toughness >= 3.0
          ? [{ id: 'regeneration', regenPercent: 0.01 }] // insane: armored also regen
          : [],
      };
    },
  },

  swarm: {
    id: 'swarm', name: 'Swarm', description: 'Tiny but many. Spawns in groups of 3.',
    hpMultiplier: 0.3, speedMultiplier: 1.2, armor: 'light',
    color: 0xaaff44, size: 0.6, count: 3, traits: [],
    spawnBehavior: 'normal',
    applyDifficulty(hints) {
      return {
        hpMult: hints.toughness,
        speedMult: hints.speed,
        countMult: hints.count * 1.5, // swarms get proportionally more extras
        goldMult: hints.goldMult * 0.8, // less gold per unit in swarms
        extraTraits: [],
      };
    },
  },

  healer: {
    id: 'healer', name: 'Healer', description: 'Heals nearby creeps 3%/s. Priority target.',
    hpMultiplier: 1.2, speedMultiplier: 0.9, armor: 'medium',
    color: 0x44ff88, size: 1, count: 1,
    traits: [{ id: 'heal_aura', range: 3, healPercent: 0.03, cooldown: 1000 }],
    spawnBehavior: 'normal',
    applyDifficulty(hints) {
      return {
        hpMult: hints.toughness * 1.1,
        speedMult: hints.speed,
        countMult: Math.max(1, hints.count * 0.5), // healers are rare
        goldMult: hints.goldMult,
        extraTraits: [],
      };
    },
  },

  boss: {
    id: 'boss', name: 'Boss', description: 'Massive HP, shield, heavy armor.',
    hpMultiplier: 10, speedMultiplier: 0.6, armor: 'heavy',
    color: 0xff2222, size: 1.5, count: 1,
    traits: [{ id: 'shield', hpPercent: 0.3 }],
    spawnBehavior: 'normal',
    applyDifficulty(hints) {
      return {
        hpMult: hints.toughness * 1.5, // bosses scale extra hard
        speedMult: hints.speed * 0.95,
        countMult: 1, // always exactly 1 boss
        goldMult: hints.goldMult,
        extraTraits: [
          ...(hints.toughness >= 1.5 ? [{ id: 'shield', hpPercent: 0.5 }] : []),
          ...(hints.toughness >= 2.0 ? [{ id: 'regeneration', regenPercent: 0.01 }] : []),
          ...(hints.toughness >= 3.0 ? [{ id: 'damage_cap_shield', shieldHits: 40 }] : []),
        ],
      };
    },
  },

  // === New types ===

  group: {
    id: 'group', name: 'Group', description: 'Arrives in tight clusters. Hard to pick off individually.',
    hpMultiplier: 0.8, speedMultiplier: 1.0, armor: 'medium',
    color: 0xdd8844, size: 0.9, count: 1, traits: [],
    spawnBehavior: 'group', // SpawnManager handles burst spawning
    applyDifficulty: defaultDifficulty,
  },

  splitter: {
    id: 'splitter', name: 'Splitter', description: 'Splits into 2 smaller creeps on death.',
    hpMultiplier: 1.8, speedMultiplier: 0.8, armor: 'medium',
    color: 0xcc44cc, size: 1.3, count: 1,
    traits: [{ id: 'split_on_death', splitCount: 2, splitType: 'splitter_child' }],
    spawnBehavior: 'normal',
    applyDifficulty(hints) {
      return {
        hpMult: hints.toughness * 1.2,
        speedMult: hints.speed,
        countMult: Math.max(1, hints.count * 0.7), // fewer but each is a problem
        goldMult: hints.goldMult,
        extraTraits: hints.toughness >= 1.5
          ? [{ id: 'split_on_death', splitCount: 3, splitType: 'splitter_child' }]
          : [],
      };
    },
  },

  splitter_child: {
    id: 'splitter_child', name: 'Splitling', description: 'Fragment of a splitter.',
    hpMultiplier: 0.4, speedMultiplier: 1.3, armor: 'light',
    color: 0xee66ee, size: 0.6, count: 1, traits: [],
    spawnBehavior: 'normal',
    applyDifficulty: defaultDifficulty,
  },

  mage_armor: {
    id: 'mage_armor', name: 'Iron Mage', description: 'Aura: nearby creeps gain +1 armor tier.',
    hpMultiplier: 1.0, speedMultiplier: 0.85, armor: 'medium',
    color: 0x8888cc, size: 1.1, count: 1,
    traits: [{ id: 'armor_aura', range: 4 }],
    spawnBehavior: 'normal',
    applyDifficulty(hints) {
      return {
        hpMult: hints.toughness,
        speedMult: hints.speed,
        countMult: 1, // always exactly 1 per wave
        goldMult: hints.goldMult,
        extraTraits: [],
      };
    },
  },

  mage_speed: {
    id: 'mage_speed', name: 'Haste Mage', description: 'Aura: nearby creeps move 30% faster.',
    hpMultiplier: 0.9, speedMultiplier: 0.8, armor: 'light',
    color: 0xffcc44, size: 1.1, count: 1,
    traits: [{ id: 'speed_aura', range: 4, speedBonus: 0.3 }],
    spawnBehavior: 'normal',
    applyDifficulty(hints) {
      return {
        hpMult: hints.toughness,
        speedMult: hints.speed,
        countMult: 1,
        goldMult: hints.goldMult,
        extraTraits: [],
      };
    },
  },

  mage_evasion: {
    id: 'mage_evasion', name: 'Mist Mage', description: 'Aura: nearby creeps gain 15% evasion.',
    hpMultiplier: 0.8, speedMultiplier: 0.9, armor: 'light',
    color: 0xaabbdd, size: 1.1, count: 1,
    traits: [{ id: 'evasion_aura', range: 4, evasionBonus: 0.15 }],
    spawnBehavior: 'normal',
    applyDifficulty(hints) {
      return {
        hpMult: hints.toughness,
        speedMult: hints.speed,
        countMult: 1,
        goldMult: hints.goldMult,
        extraTraits: [],
      };
    },
  },

  mage_heal: {
    id: 'mage_heal', name: 'Heal Mage', description: 'Aura: heals nearby creeps for flat HP periodically.',
    hpMultiplier: 1.0, speedMultiplier: 0.85, armor: 'medium',
    color: 0x44ffaa, size: 1.1, count: 1,
    traits: [{ id: 'flat_heal_aura', range: 4, healAmount: 15, cooldown: 800 }],
    spawnBehavior: 'normal',
    applyDifficulty(hints) {
      return {
        hpMult: hints.toughness,
        speedMult: hints.speed,
        countMult: 1,
        goldMult: hints.goldMult,
        // Toughness increases the heal amount
        extraTraits: hints.toughness > 1
          ? [{ id: 'flat_heal_aura', range: 4, healAmount: Math.round(15 * hints.toughness), cooldown: 800 }]
          : [],
      };
    },
  },

  shielded: {
    id: 'shielded', name: 'Shielded', description: 'Energy shield: max 1 damage per hit until shield breaks.',
    hpMultiplier: 0.9, speedMultiplier: 1.0, armor: 'medium',
    color: 0x44aaff, size: 1.1, count: 1,
    traits: [{ id: 'damage_cap_shield', shieldHits: 15 }],
    spawnBehavior: 'normal',
    applyDifficulty(hints) {
      return {
        hpMult: hints.toughness,
        speedMult: hints.speed,
        countMult: Math.max(1, hints.count * 0.7),
        goldMult: hints.goldMult,
        extraTraits: hints.toughness >= 3.0
          ? [{ id: 'damage_cap_shield', shieldHits: 40 }] // insane: absurd shield
          : hints.toughness >= 1.5
            ? [{ id: 'damage_cap_shield', shieldHits: 25 }]
            : [],
      };
    },
  },

  evasive: {
    id: 'evasive', name: 'Evasive', description: '25% dodge chance. Attacks can miss entirely.',
    hpMultiplier: 0.7, speedMultiplier: 1.4, armor: 'light',
    color: 0x66ccff, size: 0.85, count: 1,
    traits: [{ id: 'evasion', chance: 0.25 }],
    spawnBehavior: 'normal',
    applyDifficulty(hints) {
      return {
        hpMult: hints.toughness * 0.9,
        speedMult: hints.speed * 1.1,
        countMult: hints.count,
        goldMult: hints.goldMult,
        extraTraits: hints.toughness >= 3.0
          ? [{ id: 'evasion', chance: 0.45 }] // insane: nearly half dodged
          : hints.toughness >= 1.5
            ? [{ id: 'evasion', chance: 0.35 }]
            : [],
      };
    },
  },

  regenerator: {
    id: 'regenerator', name: 'Regenerator', description: 'Heavy armor, regenerates 2% max HP/s. DPS check.',
    hpMultiplier: 1.8, speedMultiplier: 0.85, armor: 'heavy',
    color: 0x22cc44, size: 1.15, count: 1,
    traits: [{ id: 'regeneration', regenPercent: 0.02 }],
    spawnBehavior: 'normal',
    applyDifficulty(hints) {
      return {
        hpMult: hints.toughness * 1.2,
        speedMult: hints.speed * 0.95,
        countMult: Math.max(1, hints.count * 0.7),
        goldMult: hints.goldMult,
        extraTraits: hints.toughness >= 3.0
          ? [{ id: 'regeneration', regenPercent: 0.05 }] // insane = 5% regen
          : hints.toughness >= 2.0
            ? [{ id: 'regeneration', regenPercent: 0.03 }] // hard = 3% regen
            : [],
      };
    },
  },

  flying: {
    id: 'flying', name: 'Flying', description: 'Ignores maze. Flies direct to exit.',
    hpMultiplier: 0.6, speedMultiplier: 0.9, armor: 'light',
    color: 0xddddff, size: 0.9, count: 1, traits: [],
    spawnBehavior: 'flying', // Uses direct path, not A*
    applyDifficulty(hints) {
      return {
        hpMult: hints.toughness * 0.8, // fragile — the maze bypass is the threat
        speedMult: hints.speed,
        countMult: Math.max(1, hints.count * 0.7),
        goldMult: hints.goldMult * 1.2, // bonus gold for the threat
        extraTraits: [],
      };
    },
  },

  // ─── Plan A: Arcane Counterspell — caster creeps ───────────────
  // Channel a spell after a delay; any damage interrupts. Designed
  // to read clearly: a Sigil and a Scribe should look like distinct
  // threats in the wave so the player learns to prioritize them.

  arcane_sigil: {
    id: 'arcane_sigil', name: 'Sigil',
    description: 'Channels a tower-clearing pulse. Damage alone will not cancel the channel — bring Frost or Mana Drain.',
    hpMultiplier: 12.0, speedMultiplier: 0.5, armor: 'heavy',
    color: 0xaa44ff, size: 2.5, count: 1,
    traits: [{
      id: 'channel_caster',
      // 10s channel. Interruptible only by counter-magic towers (Frost,
      // Mana Drain) via the `interrupts_channels` tower trait. Standard
      // damage doesn't auto-cancel — the player has to BUILD the
      // counter, not just have damage on the field.
      channelStartAt: 1.5,
      channelDuration: 10.0,
      effectId: 'clear_towers_radius',
      meta: { radius: 140 }, // 5 tiles — large enough to bite even loose mazing
      interruptible: false,
    }],
    spawnBehavior: 'normal',
    spawnOrder: 'last',
    applyDifficulty(hints) {
      return {
        hpMult: hints.toughness * 0.9,
        speedMult: hints.speed * 0.8,
        countMult: 1,
        goldMult: hints.goldMult * 1.5,
        extraTraits: [],
      };
    },
  },

  // ─── M5 Crystal Warlords (rage timer on first hit) ─────────────
  // Boss-tier creeps with channel_caster trait set to triggerOn:
  // 'first_hit'. The rage clock doesn't start until the player
  // engages — once you start damaging a Warlord you have ~25s to
  // finish them before their rage fires (different effect per
  // Warlord). interruptible: false so Frost can't pause the rage —
  // only killing the Warlord stops it.

  warlord_stalwart: {
    id: 'warlord_stalwart', name: 'Stalwart Warlord',
    description: 'Tanky vanguard. Rage on first hit: summons 6 fast reinforcements.',
    hpMultiplier: 16.0, speedMultiplier: 0.40, armor: 'heavy',
    color: 0xff8844, size: 2.2, count: 1,
    traits: [{
      id: 'channel_caster',
      triggerOn: 'first_hit', channelStartAt: 0, channelDuration: 15,
      effectId: 'warlord_reinforcements',
      meta: {},
      interruptible: false, castCount: 1,
    }],
    spawnBehavior: 'normal',
    applyDifficulty(hints) {
      return { hpMult: hints.toughness * 0.95, speedMult: hints.speed * 0.7, countMult: 1, goldMult: hints.goldMult * 2.0, extraTraits: [] };
    },
  },

  warlord_healer: {
    id: 'warlord_healer', name: 'Healer Warlord',
    description: 'Battlefield medic. Rage on first hit: heals every alive creep to full.',
    hpMultiplier: 14.0, speedMultiplier: 0.65, armor: 'heavy',
    color: 0x44ff88, size: 2.2, count: 1,
    traits: [{
      id: 'channel_caster',
      triggerOn: 'first_hit', channelStartAt: 0, channelDuration: 15,
      effectId: 'warlord_heal_all',
      meta: {},
      interruptible: false, castCount: 1,
    }],
    spawnBehavior: 'normal',
    applyDifficulty(hints) {
      return { hpMult: hints.toughness * 0.95, speedMult: hints.speed * 0.7, countMult: 1, goldMult: hints.goldMult * 2.0, extraTraits: [] };
    },
  },

  warlord_champion: {
    id: 'warlord_champion', name: 'Champion Warlord',
    description: 'Heavily armored. Rage on first hit: every alive creep gains a shield.',
    hpMultiplier: 18.0, speedMultiplier: 0.40, armor: 'heavy',
    color: 0xeecc88, size: 2.4, count: 1,
    traits: [{
      id: 'channel_caster',
      triggerOn: 'first_hit', channelStartAt: 0, channelDuration: 18,
      effectId: 'warlord_shield_all',
      meta: {},
      interruptible: false, castCount: 1,
    }],
    spawnBehavior: 'normal',
    applyDifficulty(hints) {
      return { hpMult: hints.toughness * 0.95, speedMult: hints.speed * 0.7, countMult: 1, goldMult: hints.goldMult * 2.0, extraTraits: [] };
    },
  },

  warlord_tactician: {
    id: 'warlord_tactician', name: 'Tactician Warlord',
    description: 'Field commander. FAST mover. Rage on first hit: every alive creep moves 60% faster.',
    hpMultiplier: 14.0, speedMultiplier: 0.95, armor: 'heavy',
    color: 0x66ccff, size: 2.2, count: 1,
    traits: [{
      id: 'channel_caster',
      triggerOn: 'first_hit', channelStartAt: 0, channelDuration: 12,
      effectId: 'warlord_haste_all',
      meta: {},
      interruptible: false, castCount: 1,
    }],
    spawnBehavior: 'normal',
    applyDifficulty(hints) {
      return { hpMult: hints.toughness * 0.95, speedMult: hints.speed * 0.7, countMult: 1, goldMult: hints.goldMult * 2.0, extraTraits: [] };
    },
  },

  warlord_captain: {
    id: 'warlord_captain', name: 'Captain Warlord',
    description: 'The vanguard\'s capstone. Rage on first hit: massive swarm summon.',
    hpMultiplier: 22.0, speedMultiplier: 0.50, armor: 'heavy',
    color: 0xff44aa, size: 2.6, count: 1,
    traits: [{
      id: 'channel_caster',
      triggerOn: 'first_hit', channelStartAt: 0, channelDuration: 18,
      effectId: 'warlord_mass_summon',
      meta: {},
      interruptible: false, castCount: 1,
    }],
    spawnBehavior: 'normal',
    applyDifficulty(hints) {
      return { hpMult: hints.toughness, speedMult: hints.speed * 0.7, countMult: 1, goldMult: hints.goldMult * 2.5, extraTraits: [] };
    },
  },

  // ─── M3 Ritual Circle Archmages ──────────────────────────────
  // Boss-tier casters, each with a distinct named spell. interruptible:
  // false, large size, heavy armor, very slow. Castable by Frost or
  // Mana Drain. Designed to be the wave's centerpiece, not a swarm.

  arcane_archmage_meteor: {
    id: 'arcane_archmage_meteor', name: 'Meteora',
    description: 'Boss caster. Channels meteor strikes. Counter with Frost or Mana Drain.',
    hpMultiplier: 18.0, speedMultiplier: 0.4, armor: 'heavy',
    color: 0xff6622, size: 2.4, count: 1,
    traits: [{
      id: 'channel_caster',
      channelStartAt: 1.0,
      channelDuration: 11.0,
      effectId: 'meteor_drop',
      meta: { damage: 200, radius: 80 },
      interruptible: false,
      castCount: 2,
      castCooldown: 5.0,
    }],
    spawnBehavior: 'normal',
    applyDifficulty(hints) {
      return {
        hpMult: hints.toughness * 0.95,
        speedMult: hints.speed * 0.7,
        countMult: 1,
        goldMult: hints.goldMult * 2.5,
        extraTraits: [],
      };
    },
  },

  arcane_archmage_storm: {
    id: 'arcane_archmage_storm', name: 'Stormcaller',
    description: 'Boss caster. Disables towers with chain lightning. Counter with Frost or Mana Drain.',
    hpMultiplier: 18.0, speedMultiplier: 0.4, armor: 'heavy',
    color: 0x4488cc, size: 2.4, count: 1,
    traits: [{
      id: 'channel_caster',
      channelStartAt: 1.0,
      channelDuration: 10.0,
      effectId: 'chain_lightning_on_towers',
      meta: { count: 3, duration: 5 },
      interruptible: false,
      castCount: 2,
      castCooldown: 5.0,
    }],
    spawnBehavior: 'normal',
    applyDifficulty(hints) {
      return {
        hpMult: hints.toughness * 0.95,
        speedMult: hints.speed * 0.7,
        countMult: 1,
        goldMult: hints.goldMult * 2.5,
        extraTraits: [],
      };
    },
  },

  arcane_archmage_necro: {
    id: 'arcane_archmage_necro', name: 'Necromaster',
    description: 'Boss caster. Summons shades from beyond. Counter with Frost or Mana Drain.',
    hpMultiplier: 18.0, speedMultiplier: 0.4, armor: 'heavy',
    color: 0x8833aa, size: 2.4, count: 1,
    traits: [{
      id: 'channel_caster',
      channelStartAt: 1.0,
      channelDuration: 10.0,
      effectId: 'summon_creeps_at_position',
      meta: { count: 5, summonType: 'standard' },
      interruptible: false,
      castCount: 2,
      castCooldown: 5.0,
    }],
    spawnBehavior: 'normal',
    applyDifficulty(hints) {
      return {
        hpMult: hints.toughness * 0.95,
        speedMult: hints.speed * 0.7,
        countMult: 1,
        goldMult: hints.goldMult * 2.5,
        extraTraits: [],
      };
    },
  },

  arcane_scribe: {
    id: 'arcane_scribe', name: 'Scribe',
    description: 'Channels a wave-buff repeatedly while it walks. Counter with Frost or Mana Drain — early.',
    hpMultiplier: 3.0, speedMultiplier: 0.6, armor: 'medium',
    color: 0xffd966, size: 1.4, count: 1,
    traits: [{
      id: 'channel_caster',
      channelStartAt: 1.0,
      channelDuration: 8.0,
      effectId: 'buff_next_wave_hp',
      meta: { percent: 0.20, summonCount: 3, summonType: 'standard' },
      // Damage alone won't cancel — Frost or Mana Drain required, same
      // as Sigil. Keeps the campaign's interrupt vocabulary consistent.
      interruptible: false,
      // Multi-channel: a Scribe channels for the entire duration of
      // its walk — castCount 0 means unlimited. Combined with the
      // +75% global buff cap and the per-cast 20%, the player still
      // can't be infinitely punished, but every uninterrupted Scribe
      // also drops 3 summoned creeps per cast — those don't cap.
      castCount: 0,
      castCooldown: 4.0,
    }],
    spawnBehavior: 'normal',
    // No spawnOrder — Scribes interleave with the rest of the wave so
    // the player can't just hold DPS for the back half.
    applyDifficulty(hints) {
      return {
        hpMult: hints.toughness,
        speedMult: hints.speed * 0.85,
        countMult: 1,
        goldMult: hints.goldMult * 1.2,
        extraTraits: [],
      };
    },
  },
  // ─── Campaign #3 — The Greenward (Inheritors) ──────────────────
  // The Inheritors are what moved into the empty thrones after the
  // southern kingdoms fell. Recurring across all 10 Greenward
  // missions. Boss variants (Knight / Herald / Child / etc.) and
  // named Watchers (Old Woman / Cethric / Stone Bride / Heron) land
  // in their mission commits; the entries below are the common
  // wave-fodder variants used across multiple missions.
  //
  // Visual palette: pale/grey-faded, gold accents (faded kingdom
  // livery). Distinguishes them from typical creep colours.

  inheritor_road_walker: {
    id: 'inheritor_road_walker',
    name: 'Road-Walker',
    description: 'A ragged figure on the road. Slow and patient. The most common Inheritor.',
    hpMultiplier: 1, speedMultiplier: 0.9, armor: 'medium',
    color: 0xa8a094, size: 1, count: 1, traits: [],
    spawnBehavior: 'normal',
    applyDifficulty: defaultDifficulty,
  },

  inheritor_den_walker: {
    id: 'inheritor_den_walker',
    name: 'Den-Walker',
    description: 'Lurker who has made a den in a ruin. Slightly tougher than a Road-Walker.',
    hpMultiplier: 1.4, speedMultiplier: 0.8, armor: 'medium',
    color: 0x7a705a, size: 1.1, count: 1, traits: [],
    spawnBehavior: 'normal',
    applyDifficulty: defaultDifficulty,
  },

  inheritor_messenger: {
    id: 'inheritor_messenger',
    name: 'Messenger',
    description: 'Faster, fragile. They bring nothing and take nothing.',
    hpMultiplier: 0.6, speedMultiplier: 1.6, armor: 'light',
    color: 0xc8b888, size: 0.85, count: 1, traits: [],
    spawnBehavior: 'normal',
    applyDifficulty(hints) {
      return {
        hpMult: hints.toughness * 0.8,
        speedMult: hints.speed * 1.1,
        countMult: hints.count,
        goldMult: hints.goldMult,
        extraTraits: [],
      };
    },
  },

  inheritor_river_crawler: {
    id: 'inheritor_river_crawler',
    name: 'River-Crawler',
    description: 'Water-borne Inheritor. Only appears where rivers run salt.',
    hpMultiplier: 1.2, speedMultiplier: 1.1, armor: 'light',
    color: 0x88a098, size: 0.95, count: 1, traits: [],
    spawnBehavior: 'normal',
    applyDifficulty: defaultDifficulty,
  },

  inheritor_civilian: {
    id: 'inheritor_civilian',
    name: 'Civilian',
    description: 'Non-Inheritor friendly — a townsperson the grove was promised. Must not be killed.',
    hpMultiplier: 0.4, speedMultiplier: 1, armor: 'light',
    color: 0xddccaa, size: 0.9, count: 1, traits: [],
    spawnBehavior: 'normal',
    // Civilians give NO gold and don't apply difficulty scaling —
    // they're a constraint, not a reward target.
    applyDifficulty(hints) {
      return {
        hpMult: 1,
        speedMult: 1,
        countMult: hints.count,
        goldMult: 0,
        extraTraits: [],
      };
    },
  },

  inheritor_wedding_stone: {
    id: 'inheritor_wedding_stone',
    name: 'Wedding-Stone Walker',
    description: 'A wedding party turned to stone. Slow, heavy, mossed. The bride is among them.',
    hpMultiplier: 1.6, speedMultiplier: 0.65, armor: 'heavy',
    color: 0xa8a0a0, size: 1.1, count: 1, traits: [],
    spawnBehavior: 'normal',
    applyDifficulty(hints) {
      return {
        hpMult: hints.toughness * 1.1, // stone holds heavily
        speedMult: hints.speed * 0.95,
        countMult: hints.count,
        goldMult: hints.goldMult,
        extraTraits: [],
      };
    },
  },

  // ─── Greenward named Watchers + bosses ─────────────────────────
  // Each named Watcher pins its HP/speed regardless of difficulty —
  // the Mercy mechanic is "don't touch her at any difficulty," so
  // scaling her HP makes no sense. Gold mult is pinned to 0 for the
  // same reason civilians don't pay out: she isn't a target.

  inheritor_old_woman: {
    id: 'inheritor_old_woman',
    name: 'The Old Woman of Eadwin',
    description: 'The innkeeper at the hearth. She does not look up.',
    hpMultiplier: 0.8, speedMultiplier: 0, armor: 'light',
    color: 0xddccaa, size: 1, count: 1, traits: [],
    spawnBehavior: 'normal',
    applyDifficulty() {
      return {
        hpMult: 1, speedMult: 1, countMult: 1, goldMult: 0, extraTraits: [],
      };
    },
  },

  inheritor_cethric: {
    id: 'inheritor_cethric',
    name: 'Cethric the Crow-Priest',
    description: 'A hooded crow-priest, cross-legged at the marsh crossroads. He does not turn his head.',
    hpMultiplier: 1, speedMultiplier: 0, armor: 'light',
    color: 0x4a4a52, size: 1, count: 1, traits: [],
    spawnBehavior: 'normal',
    applyDifficulty() {
      return {
        hpMult: 1, speedMult: 1, countMult: 1, goldMult: 0, extraTraits: [],
      };
    },
  },

  inheritor_stone_bride: {
    id: 'inheritor_stone_bride',
    name: 'The Stone Bride',
    description: 'A bride turned to stone forty winters ago; her veil is moss now. Walks slower than the wedding-stone livery — the visual cue Marra reads to spare her.',
    hpMultiplier: 1.2, speedMultiplier: 0.55, armor: 'heavy',
    color: 0xc0bcb0, size: 1.1, count: 1, traits: [],
    spawnBehavior: 'normal',
    applyDifficulty() {
      return {
        hpMult: 1.2, speedMult: 0.55, countMult: 1, goldMult: 0, extraTraits: [],
      };
    },
  },

  inheritor_child: {
    id: 'inheritor_child',
    name: 'The Child',
    description: 'A small Inheritor with a banner of withered flowers. Walks with the host but never fights. Touching her fails the Mercy condition.',
    hpMultiplier: 2, speedMultiplier: 0.5, armor: 'medium',
    color: 0xb89878, size: 0.75, count: 1, traits: [],
    spawnBehavior: 'normal',
    applyDifficulty() {
      // High HP, slow speed pinned across difficulties — the AoE-
      // positioning puzzle is the same on every setting. Player
      // needs survivability margin since the Child threads through
      // boss waves where splash placement matters.
      return {
        hpMult: 2, speedMult: 0.5, countMult: 1, goldMult: 0, extraTraits: [],
      };
    },
  },

  inheritor_knight: {
    id: 'inheritor_knight',
    name: 'The Knight',
    description: 'A Knight in heavy armor who never blooded a sword. M8 boss-rush — high HP, heavy armor, slow.',
    hpMultiplier: 8, speedMultiplier: 0.8, armor: 'heavy',
    color: 0x6a6a78, size: 1.4, count: 1, traits: [],
    spawnBehavior: 'normal',
    applyDifficulty(hints) {
      return {
        hpMult: hints.toughness * 8,
        speedMult: hints.speed * 0.8,
        countMult: 1, // never multi-spawned; boss
        goldMult: hints.goldMult * 5, // boss bounty
        extraTraits: [],
      };
    },
  },

  inheritor_herald: {
    id: 'inheritor_herald',
    name: 'The Herald',
    description: 'A banner-bearer who never spoke an announcement. M8 boss-rush — medium HP, faster than the Knight, banner billowing silent.',
    hpMultiplier: 5, speedMultiplier: 1, armor: 'medium',
    color: 0x886878, size: 1.3, count: 1, traits: [],
    spawnBehavior: 'normal',
    applyDifficulty(hints) {
      return {
        hpMult: hints.toughness * 5,
        speedMult: hints.speed,
        countMult: 1,
        goldMult: hints.goldMult * 4,
        extraTraits: [],
      };
    },
  },

  // Snake Eyes M8 — the Dealer's enforcer. Lobs damage tokens at the
  // player's towers (disabling them temporarily, not destroying them
  // — see CollectorBehavior). Defeating the Collector marks
  // SnakeEyesState.collectorDefeatedAt and cancels next mission's
  // interest charge. Bossier than the M8 Inheritor cycle but slower;
  // the threat is to your board, not to your lives.
  void_collector: {
    id: 'void_collector',
    name: 'The Collector',
    description: "The Dealer's hand on the road. Doesn't take lives — takes towers. Kill him before he taxes you off the board.",
    hpMultiplier: 12, speedMultiplier: 0.55, armor: 'heavy',
    color: 0x3a2a3a, size: 1.5, count: 1,
    // Trait id `void_collector_disable` is forward-declared here +
    // implemented in src/systems/voidc/CollectorBehavior.ts. The
    // creep update handler picks a target tower + emits a
    // tower-disable event each tick the cooldown elapses.
    traits: [{ id: 'void_collector_disable', tokenIntervalMs: 4000, disableDurationMs: 6000, rangeCells: 6 }],
    spawnBehavior: 'normal',
    applyDifficulty(hints) {
      return {
        hpMult: hints.toughness * 12,
        speedMult: hints.speed * 0.55,
        countMult: 1, // never multi-spawned; boss
        goldMult: hints.goldMult * 5, // bounty on defeating him
        extraTraits: [],
      };
    },
  },

  // Snake Eyes M10 — The Counterfactual. Boss creep that resolves
  // the campaign's central conceit: the mirror-image gambler Ardax
  // could have been. Spawns on M10 wave 11 (the Table setpiece) after
  // Approach + Mirror Lane resolve. Death triggers
  // `m10MarkBossDefeated` → mission win → `SnakeEyesEndingPanel`.
  //
  // Boss-tier HP baseline. The actual on-creep HP is overridden at
  // spawn time by GameScene from `counterfactualBossHp(tally)` so
  // lifetime Pactbook acceptance/decline drives the difficulty. See
  // SnakeEyesMissionController.getM10Controller().getSnapshot().bossHpMax.
  // The wave-script `hpScale` is the v1 fallback baseline.
  //
  // Has its OWN typeId (not generic `boss`) so the GameScene boss-
  // kill detection can narrow on a Snake-Eyes-specific creep without
  // colliding with the generic `boss` creep that other waves spawn.
  void_counterfactual: {
    id: 'void_counterfactual',
    name: 'The Counterfactual',
    description: "The deal you didn't take. Wearing your coat. Waiting at your table.",
    hpMultiplier: 12, speedMultiplier: 0.6, armor: 'heavy',
    color: 0x2a1840, size: 1.6, count: 1,
    traits: [],
    spawnBehavior: 'normal',
    applyDifficulty(hints) {
      return {
        hpMult: hints.toughness * 12,
        speedMult: hints.speed * 0.6,
        countMult: 1, // never multi-spawned; boss
        goldMult: hints.goldMult * 5,
        extraTraits: [],
      };
    },
  },

  // ─── Iron Cascade (Mech campaign) creep variants ────────────────
  // Voss's industrial war-machine roster. The campaign narrative
  // references these by name across M1/M2/M4/M5/M6/M9 but they
  // didn't exist until this commit — every mission rendered generic
  // creeps. Adding them here unblocks per-mission wave scripts in
  // commits 3-5 of the Mech narrative-gameplay buildout.

  // Light, fast riders. Voss's frontline scouts (M1 "fast riders",
  // M6 "rail-yard" mobility). Burst-damage food.
  mech_scout: {
    id: 'mech_scout',
    name: 'Scout Rider',
    description: "Voss's outriders — single-pilot frames with no plating. Fast, fragile, sent ahead of every column.",
    hpMultiplier: 0.55, speedMultiplier: 1.8, armor: 'light',
    color: 0xc0c8d0, size: 0.85, count: 1, traits: [],
    spawnBehavior: 'normal',
    applyDifficulty(hints) {
      return {
        hpMult: hints.toughness * 0.55,
        speedMult: hints.speed * 1.8,
        countMult: hints.count,
        goldMult: hints.goldMult * 0.7, // cheap kills
        extraTraits: [],
      };
    },
  },

  // Light military skiffs — fast and arrive in groups. Pair with
  // scouts in early waves to overwhelm; alone they're not threatening.
  mech_skiff: {
    id: 'mech_skiff',
    name: 'Skiff',
    description: 'Two-pilot scouting frames with light brass plating. Arrives in pairs.',
    hpMultiplier: 0.4, speedMultiplier: 1.4, armor: 'light',
    color: 0xa08858, size: 0.8, count: 2, traits: [],
    spawnBehavior: 'normal',
    applyDifficulty(hints) {
      return {
        hpMult: hints.toughness * 0.4,
        speedMult: hints.speed * 1.4,
        countMult: hints.count,
        goldMult: hints.goldMult * 0.8,
        extraTraits: [],
      };
    },
  },

  // Standard Mech infantry walker. Backbone of mid waves. Medium
  // armor + moderate speed — the workhorse that the narrative
  // collectively calls "walkers."
  mech_light_walker: {
    id: 'mech_light_walker',
    name: 'Light Walker',
    description: "Voss's standard battlefield walker. Two-leg frame, plate over the boilers, slow but not slow enough.",
    hpMultiplier: 1.2, speedMultiplier: 0.9, armor: 'medium',
    color: 0x788090, size: 1.0, count: 1, traits: [],
    spawnBehavior: 'normal',
    applyDifficulty(hints) {
      return {
        hpMult: hints.toughness * 1.2,
        speedMult: hints.speed * 0.9,
        countMult: hints.count,
        goldMult: hints.goldMult,
        extraTraits: [],
      };
    },
  },

  // Heavy walker. Late-mid threat that requires sustained focus.
  // Heavy armor means physical-damage towers struggle without
  // armor-pen (Bolt's pierce, Storm's lightning). Voss's "armored
  // column" anchor.
  mech_armored_walker: {
    id: 'mech_armored_walker',
    name: 'Armored Walker',
    description: 'Four-leg siege walker plated over its mana-furnace. Slow, hard-armored, lethal if not stopped.',
    hpMultiplier: 2.5, speedMultiplier: 0.7, armor: 'heavy',
    color: 0x3a3e48, size: 1.15, count: 1, traits: [],
    spawnBehavior: 'normal',
    applyDifficulty(hints) {
      return {
        hpMult: hints.toughness * 2.5,
        speedMult: hints.speed * 0.7,
        countMult: hints.count,
        goldMult: hints.goldMult * 1.3,
        extraTraits: [],
      };
    },
  },

  // M5 marquee — Voss's flagship walker. Tank-class HP + heavy
  // armor + the `mech_pylon_vent_armor` trait that opens the
  // armor-vents when any Suppression Pylon is muted (channeled by
  // the player). Narrative: "armor vents briefly whenever the
  // Suppression Pylons cycle." The trait is registered in commit
  // 2 (the actual damage-vulnerability handler).
  mech_flagship_walker: {
    id: 'mech_flagship_walker',
    name: 'Flagship Walker',
    description: "Voss's flagship — a six-leg siege engine on its own rails. Heavily plated, but the engineer's schematics say the armor vents when the pylons are silenced.",
    hpMultiplier: 10, speedMultiplier: 0.5, armor: 'heavy',
    color: 0x2a1818, size: 1.45, count: 1,
    // Trait id is forward-declared here; the Trait.ts handler that
    // queries SuppressionManager + applies the bonus-damage
    // vulnerability lives in commit 2.
    traits: [{ id: 'mech_pylon_vent_armor', bonusDamageMult: 1.6 }],
    spawnBehavior: 'normal',
    applyDifficulty(hints) {
      return {
        hpMult: hints.toughness * 10,
        speedMult: hints.speed * 0.5,
        countMult: 1, // never multi-spawned; boss
        goldMult: hints.goldMult * 4,
        extraTraits: [],
      };
    },
  },

  // M9 marquee — Voss's named pilot. Faster than a walker, evasive,
  // shielded. The "Ace" the Engineer specifically asked to fight.
  // Single-instance per spawn; the M9 wave script chains him in
  // escalating phases.
  mech_ace_pilot: {
    id: 'mech_ace_pilot',
    name: 'The Ace',
    description: "Voss's voice in the field. A custom walker frame piloted by his ace — fast, evasive, and bulwarked behind a kinetic shield until pressed.",
    hpMultiplier: 6, speedMultiplier: 1.1, armor: 'medium',
    color: 0xd8b048, size: 1.25, count: 1,
    traits: [{ id: 'shield', hpPercent: 0.35 }],
    spawnBehavior: 'normal',
    applyDifficulty(hints) {
      return {
        hpMult: hints.toughness * 6,
        speedMult: hints.speed * 1.1,
        countMult: 1, // single Ace per wave
        goldMult: hints.goldMult * 3,
        extraTraits: [],
      };
    },
  },
};

export function getCreepType(id: string): CreepType {
  const c = CREEP_TYPES[id];
  if (!c) throw new Error(`Unknown creep type: ${id}`);
  return c;
}
