/**
 * CpuDefender — defender-side AI for attacker missions (Plan 12 v2
 * Phase 3).
 *
 * Three responsibilities:
 *  1. Pick which tower to upgrade with treasury gold (smart, biased
 *     against the player's incoming wave composition).
 *  2. Build new towers on map-declared expansion sockets when the
 *     treasury can afford them.
 *  3. Respect difficulty: easy = upgrades only, normal = upgrades + 2
 *     socket builds, hard = upgrades + 4 socket builds + larger
 *     treasury multiplier.
 *
 * GameScene hosts the treasury balance and calls tick() each frame
 * while in attacker mode. tick() is throttled internally.
 */

import type { Tower } from '../../entities/Tower';
import type { WaveDefinition } from '../../data/WaveDefinitions';

export type AttackerDifficulty = 'easy' | 'normal' | 'hard';

/** Expansion socket — a reserved cell where the CPU may build a new
 *  tower if the treasury can afford one of the allowed types. */
export interface ExpansionSocket {
  col: number;
  row: number;
  /** Tower ids the CPU may pick from when building here. The first
   *  affordable + counter-best one wins. */
  allowedTowerIds: string[];
}

/** Anti-counter table. Maps (defender tower id) → (creep type) →
 *  effectiveness multiplier. Higher = better counter. Default 1.0
 *  when an entry is missing.
 *
 *  Hand-tuned for the basic defender kit (arrow / cannon / slow /
 *  sniper) and the v2 Coalition palette (standard / fast / swarm /
 *  armored / regenerator / evasive / flying / boss). Future per-
 *  faction defender kits add their own rows; missing entries fall
 *  back to neutral. */
const COUNTER_TABLE: Record<string, Record<string, number>> = {
  arrow: {
    fast: 1.6,
    swarm: 1.5,
    evasive: 1.4,
    flying: 1.3,
    standard: 1.0,
    boss: 0.6,
    armored: 0.5,
  },
  cannon: {
    swarm: 1.8,
    standard: 1.3,
    armored: 1.2,
    regenerator: 1.2,
    boss: 0.9,
    fast: 0.8,
    evasive: 0.5,
    flying: 0.0, // can't hit air
  },
  slow: {
    fast: 1.6,
    swarm: 1.3,
    evasive: 1.2,
    standard: 1.0,
    boss: 0.7,
    armored: 0.6,
  },
  sniper: {
    boss: 2.0,
    regenerator: 1.8,
    armored: 1.6,
    flying: 1.4,
    standard: 1.0,
    evasive: 0.6,
    swarm: 0.4,
    fast: 0.5,
  },
};

/** Score how well `towerId` counters the prevalent creep types in the
 *  upcoming wave. Returns a multiplier ≥ 0; 1.0 = neutral, > 1 =
 *  prefers, < 1 = avoid. */
export function counterScore(towerId: string, wave: WaveDefinition | null): number {
  if (!wave || wave.groups.length === 0) return 1.0;
  const row = COUNTER_TABLE[towerId];
  if (!row) return 1.0;
  let totalCount = 0;
  let weightedSum = 0;
  for (const g of wave.groups) {
    totalCount += g.count;
    const mult = row[g.creepType] ?? 1.0;
    weightedSum += g.count * mult;
  }
  if (totalCount === 0) return 1.0;
  return weightedSum / totalCount;
}

/** Difficulty knobs. */
export interface DifficultyConfig {
  /** Multiplier on kill-gold flowing into the treasury. */
  treasuryMult: number;
  /** Max number of expansion-socket builds per mission. */
  maxExpansions: number;
}

export function getDifficultyConfig(diff: AttackerDifficulty): DifficultyConfig {
  switch (diff) {
    case 'easy':   return { treasuryMult: 0.5, maxExpansions: 0 };
    case 'normal': return { treasuryMult: 1.0, maxExpansions: 2 };
    case 'hard':   return { treasuryMult: 1.5, maxExpansions: 4 };
  }
}

/** Pick the best upgrade target. Combines a level-inverse base score
 *  (so low-level towers still get caught up) with the counter-score
 *  bias from the upcoming wave. Returns null when no tower can be
 *  upgraded with the available treasury. */
export function pickUpgradeTarget(
  towers: Tower[],
  treasury: number,
  upcomingWave: WaveDefinition | null,
): { tower: Tower; cost: number } | null {
  let best: { tower: Tower; cost: number; score: number } | null = null;
  for (const t of towers) {
    if ((t as { _expired?: boolean })._expired || t.isMobile) continue;
    if (!t.canUpgrade()) continue;
    const cost = t.getUpgradeCost();
    if (cost <= 0 || cost > treasury) continue;
    // Base score: prefer lower-level towers so the upgrade pass keeps
    // the lattice balanced. Then apply the counter multiplier.
    const base = 10 - Math.min(9, t.level);
    const counter = counterScore(t.typeDef.id, upcomingWave);
    const score = base * counter;
    if (!best || score > best.score) {
      best = { tower: t, cost, score };
    }
  }
  return best ? { tower: best.tower, cost: best.cost } : null;
}

/** Pick the best expansion-socket build. Walks the open sockets,
 *  considers each allowed tower id, and picks the one with the
 *  highest counter score that fits the treasury. Returns null when
 *  no socket build is affordable. */
export function pickExpansionBuild(
  openSockets: ExpansionSocket[],
  treasury: number,
  upcomingWave: WaveDefinition | null,
  /** Resolves a tower id to its build cost. Threading the lookup
   *  rather than importing TowerTypes here keeps this module pure. */
  costFor: (towerId: string) => number,
): { socket: ExpansionSocket; towerId: string; cost: number } | null {
  let best: { socket: ExpansionSocket; towerId: string; cost: number; score: number } | null = null;
  for (const s of openSockets) {
    for (const towerId of s.allowedTowerIds) {
      const cost = costFor(towerId);
      if (cost <= 0 || cost > treasury) continue;
      const score = counterScore(towerId, upcomingWave);
      if (!best || score > best.score) {
        best = { socket: s, towerId, cost, score };
      }
    }
  }
  return best ? { socket: best.socket, towerId: best.towerId, cost: best.cost } : null;
}
