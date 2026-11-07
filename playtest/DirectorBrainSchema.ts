/**
 * Search schema for DirectorBrain — the risk budgets, assessment
 * thresholds, and timing knobs that Alex's principles imply but
 * don't pin down. The ES finds the values; the principles provide
 * the structure.
 */
import type { ParamSchema } from '../src/headless/brain-search/BrainSearchManager.ts';

export const DIRECTOR_BRAIN_SCHEMA: ParamSchema = {
  // Principle 2: Risk budget — % of gold allocatable to future bets.
  cruisingRisk:   { min: 0.1, max: 0.8, default: 0.5, step: 0.1 },
  closeRisk:      { min: 0.0, max: 0.4, default: 0.2, step: 0.1 },

  // Principle 1: Assessment thresholds.
  historyNeeded:  { min: 3, max: 8, default: 5, step: 1, integer: true },
  cleanStreak:    { min: 2, max: 5, default: 3, step: 1, integer: true },
  strugglingLives:{ min: 3, max: 10, default: 5, step: 1, integer: true },
  strugglingAvg:  { min: 1.0, max: 3.0, default: 2.0, step: 0.5 },
  closeAvg:       { min: 0.2, max: 1.0, default: 0.5, step: 0.1 },
};
