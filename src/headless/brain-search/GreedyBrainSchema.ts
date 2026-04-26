/**
 * Search schema for GreedyBrain. Two integer params controlling the
 * "what tower do I spam" decision and whether to upgrade once the
 * board is saturated.
 */
import { ParamSchema } from './BrainSearchManager';

export const GREEDY_BRAIN_SCHEMA: ParamSchema = {
  pickStrategyIdx: {
    min: 0, max: 3, default: 0, step: 1, integer: true,
  },
  allowUpgrade: {
    min: 0, max: 1, default: 0, step: 1, integer: true,
  },
};
