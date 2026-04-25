/**
 * Search schema for BalancedBrain — bounds, defaults, and step
 * sizes for every numeric param the ES is allowed to tune. Defaults
 * mirror DEFAULT_BALANCED_PARAMS so a "no-op" config matches the
 * historical baseline.
 *
 * Steps are tuned per-param to roughly equal one "noticeable
 * change" — e.g. a 0.1 σ on `expensiveBias` shifts tower selection
 * by one rank in a 5-tower pool, which is meaningful.
 */
import { ParamSchema } from './BrainSearchManager';

export const BALANCED_BRAIN_SCHEMA: ParamSchema = {
  panicLives: {
    min: 0, max: 15, default: 5, step: 2, integer: true,
  },
  mazeSaturationThreshold: {
    min: 0, max: 5, default: 0, step: 1, integer: true,
  },
  maxWallPlacements: {
    min: 0, max: 15, default: 8, step: 2, integer: true,
  },
  highCoverageRatio: {
    min: 0.5, max: 4.0, default: 1.5, step: 0.3,
  },
  minDpsTowersForUlt: {
    min: 1, max: 10, default: 4, step: 1, integer: true,
  },
  stableLivesForUlt: {
    min: 5, max: 20, default: 15, step: 2, integer: true,
  },
  expensiveBias: {
    min: 0.0, max: 1.0, default: 1.0, step: 0.15,
  },
  frontierBuyChance: {
    min: 0.0, max: 1.0, default: 0.4, step: 0.1,
  },
  sendBuyChance: {
    min: 0.0, max: 1.0, default: 0.3, step: 0.1,
  },
  auraAdjacencyBonus: {
    min: 0.0, max: 1.0, default: 0.25, step: 0.1,
  },
  waveLookaheadWindow: {
    min: 1, max: 5, default: 3, step: 1, integer: true,
  },
  upgradeCoverageRange: {
    min: 2, max: 8, default: 4, step: 1, integer: true,
  },
};
