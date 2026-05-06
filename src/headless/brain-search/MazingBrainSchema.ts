/**
 * Search schema for MazingBrain — drives the (μ+λ) ES tuning loop.
 *
 * Spans BalancedBrain's existing knobs (so the search can co-tune
 * meta + spatial behaviour) plus the mazing-specific terms
 * controlling the adversarial beam search and the wishlist veto.
 *
 * The BalancedBrain schema would have been a natural base to extend
 * but TypeScript's ParamSchema is a flat record so we restate the
 * fields here. Defaults mirror DEFAULT_MAZING_BRAIN_PARAMS so a
 * "no-op" config matches the as-shipped behaviour.
 */
import { ParamSchema } from './BrainSearchManager';

export const MAZING_BRAIN_SCHEMA: ParamSchema = {
  // ── BalancedBrain inheritance ────────────────────────────────
  panicLives: {
    min: 0, max: 15, default: 5, step: 2, integer: true,
  },
  mazeSaturationThreshold: {
    min: 0, max: 5, default: 0, step: 1, integer: true,
  },
  maxWallPlacements: {
    min: 0, max: 20, default: 8, step: 2, integer: true,
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
  skipUltimateSave: {
    min: 0, max: 1, default: 0, step: 1, integer: true,
  },
  upgradeStrategyIdx: {
    min: 0, max: 3, default: 0, step: 1, integer: true,
  },
  towerPickStrategyIdx: {
    min: 0, max: 3, default: 0, step: 1, integer: true,
  },

  // ── Mazing-specific: BFS score weights ───────────────────────
  alpha: {
    min: 0.5, max: 15.0, default: 5.0, step: 1.0,
  },
  beta: {
    min: 0.0, max: 5.0, default: 1.0, step: 0.3,
  },
  gamma: {
    min: 0.0, max: 3.0, default: 0.5, step: 0.2,
  },

  // ── Mazing-specific: beam search shape ───────────────────────
  beamWidth: {
    min: 1, max: 12, default: 5, step: 1, integer: true,
  },
  mutationsPerState: {
    min: 5, max: 60, default: 25, step: 5, integer: true,
  },
  waves: {
    min: 3, max: 20, default: 15, step: 2, integer: true,
  },
  baseBudget: {
    min: 5, max: 50, default: 10, step: 5, integer: true,
  },
  budgetGrowth: {
    min: 1, max: 20, default: 8, step: 2, integer: true,
  },
  growBranchMaxLen: {
    min: 2, max: 15, default: 8, step: 2, integer: true,
  },

  // ── Mazing-specific: mutation operator probabilities ─────────
  // Sum-normalised at runtime so brain-search can sweep them as
  // independent floats. ES will tend to push these toward the
  // operators that produce the highest BFS score on this cell.
  pAddWall: {
    min: 0.0, max: 1.0, default: 0.5, step: 0.15,
  },
  pGrowBranch: {
    min: 0.0, max: 1.0, default: 0.3, step: 0.15,
  },
  pRemoveWall: {
    min: 0.0, max: 1.0, default: 0.2, step: 0.1,
  },

  // ── Mazing-specific: confidence floor for wishlist veto ──────
  // bestCell returns null when (1 - rank/planLen) < confidenceFloor —
  // higher floor = more aggressive veto = brain falls down its
  // wishlist sooner. v1 hardcodes the floor against plan-position;
  // v2 will compare against historical-best score.
  confidenceFloor: {
    min: 0.0, max: 1.0, default: 0.4, step: 0.1,
  },
};
