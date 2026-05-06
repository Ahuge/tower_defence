/**
 * Search schema for AOEFocusBrain. Mix of integer thresholds and
 * categorical strategy indexes for AOE-pick and upgrade-pick rules.
 */
import { ParamSchema } from './BrainSearchManager';

export const AOE_FOCUS_BRAIN_SCHEMA: ParamSchema = {
  maxOpeningWalls: {
    min: 0, max: 6, default: 2, step: 1, integer: true,
  },
  survivalFloorTowers: {
    min: 0, max: 5, default: 1, step: 1, integer: true,
  },
  panicLives: {
    min: 0, max: 20, default: 10, step: 2, integer: true,
  },
  aoePickStrategyIdx: {
    min: 0, max: 3, default: 0, step: 1, integer: true,
  },
  ultimateLivesThreshold: {
    min: 5, max: 20, default: 15, step: 2, integer: true,
  },
  ultimateMinTowers: {
    min: 1, max: 8, default: 3, step: 1, integer: true,
  },
  upgradeStrategyIdx: {
    min: 0, max: 1, default: 0, step: 1, integer: true,
  },
};
