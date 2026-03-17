/**
 * Difficulty hints passed to each creep type.
 * Each creep type interprets these based on its identity.
 */
export interface DifficultyHints {
  toughness: number;  // 1.0 = normal, 1.5 = 50% more HP
  count: number;      // 1.0 = normal, 1.5 = 50% more spawns
  speed: number;      // 1.0 = normal, 1.2 = 20% faster
  goldMult: number;   // 1.0 = normal, 0.8 = 20% less gold
}

export type DifficultyLevel = 'easy' | 'normal' | 'hard';

export const DIFFICULTIES: Record<DifficultyLevel, DifficultyHints> = {
  easy: {
    toughness: 0.8,
    count: 0.8,
    speed: 0.9,
    goldMult: 1.2,
  },
  normal: {
    toughness: 1.0,
    count: 1.0,
    speed: 1.0,
    goldMult: 1.0,
  },
  hard: {
    toughness: 1.5,
    count: 1.4,
    speed: 1.15,
    goldMult: 0.75,
  },
};
