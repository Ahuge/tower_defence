/**
 * CpuDefender — difficulty config for the attacker mode CPU defender.
 *
 * Originally hosted a hand-rolled upgrade/expansion picker (the
 * "v2 Phase 3" CPU), but the runtime has since migrated to a
 * BalancedBrain-driven `BotAI` instance owned by `GameScene`. The
 * picker, counter table, and expansion-socket scaffolding are gone;
 * what remains is the difficulty knob `addAttackerDefenderGold` reads
 * to scale kill-gold into the bot's treasury.
 */

export type AttackerDifficulty = 'easy' | 'normal' | 'hard';

/** Difficulty knobs. */
export interface DifficultyConfig {
  /** Multiplier on kill-gold flowing into the treasury. */
  treasuryMult: number;
}

export function getDifficultyConfig(diff: AttackerDifficulty): DifficultyConfig {
  switch (diff) {
    case 'easy':   return { treasuryMult: 0.5 };
    case 'normal': return { treasuryMult: 1.0 };
    case 'hard':   return { treasuryMult: 1.5 };
  }
}
