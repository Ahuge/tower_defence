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
      meta: { percent: 0.30, summonCount: 3, summonType: 'standard' },
      // Damage alone won't cancel — Frost or Mana Drain required, same
      // as Sigil. Keeps the campaign's interrupt vocabulary consistent.
      interruptible: false,
      // Multi-channel: a Scribe casts up to N times across its path,
      // with a cooldown between casts. Forces the player to either
      // commit a Frost in range or eat the cumulative buff.
      castCount: 3,
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
};

export function getCreepType(id: string): CreepType {
  const c = CREEP_TYPES[id];
  if (!c) throw new Error(`Unknown creep type: ${id}`);
  return c;
}
