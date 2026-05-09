/**
 * PlayerLevel — XP curve, level math, and per-game-end XP awards.
 *
 * Curve: `xpToNext(level) = 200 * level`.
 *   L2 needs 200 total, L3 needs 600 (200+400), L4 1200, L10 11000.
 *
 * The curve is intentionally simple and easy to retune. Soft cap at L50
 * (the modal at hit-cap encourages playing on; we'll add prestige loops
 * later).
 *
 * No state lives here — level + xp are read from `PlayerProfileStore`.
 * This module is pure computation + the XP-award table.
 */

import type { MatchMode } from '../../data/WaveDefinitions';
import type { DifficultyLevel } from '../../data/Difficulty';

export const SOFT_LEVEL_CAP = 50;

export function xpToNext(level: number): number {
  return Math.max(1, level) * 200;
}

/** Total XP required to *be at* `level`. L1=0, L2=200, L3=600, L4=1200…
 *  Closed form: sum_{i=1..L-1} 200·i = 100 · (L-1) · L. */
export function totalXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return 100 * (level - 1) * level;
}

/** Compute level from total XP. Level >= 1 always.
 *  Inverts `totalXpForLevel`: 100·(L-1)·L ≤ xp → L = ⌊(1 + √(1 + xp/25)) / 2⌋,
 *  then clamp to [1, SOFT_LEVEL_CAP]. Called per faction tile per
 *  FactionTreeScreen render, so closed form keeps it O(1). */
export function levelFromXp(xp: number): number {
  if (xp <= 0) return 1;
  const lvl = Math.floor((1 + Math.sqrt(1 + xp / 25)) / 2);
  if (lvl < 1) return 1;
  if (lvl > SOFT_LEVEL_CAP) return SOFT_LEVEL_CAP;
  return lvl;
}

/** XP within the current level (0..xpToNext(level)). */
export function xpProgressInLevel(xp: number): { current: number; required: number; level: number } {
  const level = levelFromXp(xp);
  const consumed = totalXpForLevel(level);
  return {
    current: Math.max(0, xp - consumed),
    required: xpToNext(level),
    level,
  };
}

// ---- XP awards by source -------------------------------------------------

export interface GameEndContext {
  mode: MatchMode;
  result: 'victory' | 'defeat';
  wave: number;
  difficulty: DifficultyLevel;
  faction: string | null;
  mapId: string;
  /** Wave count for Standard 15 vs 30 vs 100. Optional — falls back to mode default. */
  waveCount?: number;
  /** True when this is the player's first time picking this faction. */
  firstFactionPlay: boolean;
  /** True when this is the player's first win on this map. */
  firstMapWin: boolean;
}

/** XP base table per (mode, result, difficulty). Numbers from the
 *  Plan 2 doc — deliberately moderate so a Standard 30 win is ~150
 *  XP and L20 takes ~250-300 games. Tunable. */
export function xpForGameEnd(ctx: GameEndContext): { amount: number; reason: string } {
  if (ctx.result === 'defeat') {
    // Engagement reward only if they made it past the early waves.
    // Below w5 a defeat is "I quit immediately" — no reward.
    if (ctx.wave < 5) return { amount: 0, reason: 'too-early-quit' };
    return { amount: 10, reason: `defeat (${ctx.mode}, w${ctx.wave})` };
  }

  // Victory base by mode.
  let base = 100;
  switch (ctx.mode) {
    case 'standard': {
      // Standard 15 / 30 / 100 split.
      const wc = ctx.waveCount ?? 30;
      if (wc <= 15) base = 50;
      else if (wc <= 30) base = 150;
      else base = 400;
      break;
    }
    case 'endless':       base = 200; break;
    case 'battle':        base = 200; break;
    case 'hero_defense':  base = 200; break;
    case 'circle_coop':   base = 150; break;
    case 'gauntlet':      base = 800; break;
    case 'tutorial':      base = 50; break;
    default:              base = 100;
  }

  // Difficulty scaling: easy 1.0, normal 1.0, hard 1.5, insane 2.0.
  const diffMul: Record<DifficultyLevel, number> = {
    easy: 1.0, normal: 1.0, hard: 1.5, insane: 2.0,
  };
  base = Math.round(base * (diffMul[ctx.difficulty] ?? 1.0));

  // First-time bonuses.
  let bonus = 0;
  const reasonParts: string[] = [`win-${ctx.mode}`];
  if (ctx.firstFactionPlay) { bonus += 50; reasonParts.push('first-faction'); }
  if (ctx.firstMapWin)      { bonus += 25; reasonParts.push('first-map-win'); }

  return { amount: base + bonus, reason: reasonParts.join(' ') };
}
