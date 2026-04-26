/**
 * Difficulty hints passed to each creep type.
 * Each creep type interprets these based on its identity.
 */
export interface DifficultyHints {
  toughness: number;  // 1.0 = normal, 1.5 = 50% more HP
  count: number;      // 1.0 = normal, 1.5 = 50% more spawns
  speed: number;      // 1.0 = normal, 1.2 = 20% faster
  goldMult: number;   // 1.0 = normal, 0.8 = 20% less gold
  /** Per-wave additive toughness ramp. Effective HP multiplier
   *  is `toughness × (1 + wave × toughnessPerWave)`. Keeps the
   *  late game from collapsing under stacked player DPS — without
   *  it, wave 30 creeps died as fast as wave 10 creeps on every
   *  difficulty. 0 = no ramp (easy stays as-authored). */
  toughnessPerWave: number;
}

export type DifficultyLevel = 'easy' | 'normal' | 'hard' | 'insane';

export const DIFFICULTIES: Record<DifficultyLevel, DifficultyHints> = {
  easy: {
    toughness: 0.8,
    count: 0.8,
    speed: 0.9,
    goldMult: 1.2,
    toughnessPerWave: 0,
  },
  normal: {
    toughness: 0.95,
    count: 1.0,
    speed: 1.0,
    goldMult: 1.0,
    toughnessPerWave: 0.005, // +0.5%/wave — wave 20 = 1.10×, wave 40 = 1.20×
  },
  hard: {
    toughness: 1.0,
    count: 1.3,
    speed: 1.05,
    goldMult: 0.6,
    // +5%/wave — wave 10 = 1.50×, wave 20 = 2.00×, wave 30 = 2.50×.
    // Lowered from 0.13 (wave 10 = 2.30×) which the brain-search loop
    // showed produced 0% wins across every BalancedBrain config tested
    // — i.e. unwinnable, not "hard". Default brains still 0% at 0.05;
    // tuned brain reaches wave 14.8 of 20 (no wins), giving the
    // search a real optimisation target without trivialising the band.
    toughnessPerWave: 0.05,
  },
  insane: {
    toughness: 1.15,
    count: 1.5,
    speed: 1.1,
    goldMult: 0.4,
    toughnessPerWave: 0.24, // +24%/wave — wave 10 = 4.38× (matches old insane), wave 20 = 7.54×, wave 30 = 10.66×
  },
};
