/**
 * Search schema for MazingBrain — drives the (μ+λ) ES tuning loop.
 *
 * Spans BalancedBrain's existing knobs (so the search can co-tune
 * meta + spatial behaviour) plus the v2 mazing-specific terms
 * controlling the adversarial beam search, role-aware scoring, and
 * the wishlist veto.
 *
 * Defaults mirror DEFAULT_MAZING_BRAIN_PARAMS so a "no-op" config
 * matches the as-shipped behaviour.
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

  // ── BFS-workload score weights (v1 terms) ────────────────────
  alpha: {
    min: 0.5, max: 15.0, default: 5.0, step: 1.0,
  },
  beta: {
    min: 0.0, max: 5.0, default: 1.0, step: 0.3,
  },
  gamma: {
    min: 0.0, max: 3.0, default: 0.5, step: 0.2,
  },

  // ── Role-aware score weights (v2 terms) ──────────────────────
  // δ rewards DPS coverage (path cells × dps/sec), ε rewards slow
  // value (path cells × slow strength), ζ rewards aura
  // amplification (sum over Cheby≤1 dps of neighbours × aura).
  // High values prefer placing towers at coverage-optimal cells;
  // low values keep the plan maze-shaped.
  deltaDps: {
    min: 0.0, max: 1.0, default: 0.05, step: 0.1,
  },
  epsilonSlow: {
    min: 0.0, max: 1.0, default: 0.05, step: 0.1,
  },
  zetaAura: {
    min: 0.0, max: 1.0, default: 0.05, step: 0.1,
  },

  // ── Beam search shape ────────────────────────────────────────
  beamWidth: {
    min: 1, max: 12, default: 3, step: 1, integer: true,
  },
  mutationsPerState: {
    min: 5, max: 30, default: 12, step: 3, integer: true,
  },
  waves: {
    min: 3, max: 20, default: 8, step: 2, integer: true,
  },
  baseBudget: {
    min: 50, max: 500, default: 100, step: 50, integer: true,
  },
  budgetGrowth: {
    min: 20, max: 200, default: 80, step: 20, integer: true,
  },
  growBranchMaxLen: {
    min: 2, max: 15, default: 8, step: 2, integer: true,
  },
  // 0 = greedy (try every affordable tower per cell, keep best),
  // 1 = random with role-bias weights. Random is much cheaper.
  towerPickMode: {
    min: 0, max: 1, default: 1, step: 1, integer: true,
  },

  // ── Mutation operator probabilities ──────────────────────────
  // Sum-normalised at runtime so brain-search can sweep them as
  // independent floats. ES will tend to push these toward the
  // operators that produce the highest score on this cell.
  pAddTower: {
    min: 0.0, max: 1.0, default: 0.5, step: 0.15,
  },
  pGrowBranch: {
    min: 0.0, max: 1.0, default: 0.3, step: 0.15,
  },
  pRemoveTower: {
    min: 0.0, max: 1.0, default: 0.15, step: 0.1,
  },
  pSwapTower: {
    min: 0.0, max: 1.0, default: 0.05, step: 0.1,
  },

  // ── Per-role mutation bias (random-mode only) ────────────────
  // Multiplies a tower's chance of being picked under towerPickMode=1.
  // Higher addBiasWall = more wall placements in the plan, which
  // produces more visible mazing.
  addBiasWall: {
    min: 0.0, max: 4.0, default: 2.5, step: 0.5,
  },
  addBiasDps: {
    min: 0.0, max: 4.0, default: 1.0, step: 0.5,
  },
  addBiasSlow: {
    min: 0.0, max: 4.0, default: 0.6, step: 0.5,
  },
  addBiasAura: {
    min: 0.0, max: 4.0, default: 0.4, step: 0.5,
  },

  // ── Confidence floor for the wishlist veto ───────────────────
  // bestCell returns null when (1 - roleRank/bucketLen) <
  // confidenceFloor — higher floor = more aggressive veto = brain
  // falls down its wishlist sooner.
  confidenceFloor: {
    min: 0.0, max: 1.0, default: 0.4, step: 0.1,
  },

  // ── v3 NEW trait-aware scorer weights (0 = scorer contributes
  // nothing). Each captures a synergy v2 couldn't model:
  //   slow_overlap     = slow tower × DPS overlap (void/military)
  //   aura_chain       = harmonic multi-hop amp→amp→DPS chains
  //   cc_boost         = root/confuse/stun extending DPS time-in-range
  //   mobile_engagement = leashed mobile units (military/nature)
  //   dot_overlap      = burn/poison DOTs boosted by CC
  weight_slow_overlap:      { min: 0.0, max: 5.0, default: 0, step: 0.3 },
  weight_aura_chain:        { min: 0.0, max: 5.0, default: 0, step: 0.3 },
  weight_cc_boost:          { min: 0.0, max: 5.0, default: 0, step: 0.3 },
  weight_mobile_engagement: { min: 0.0, max: 5.0, default: 0, step: 0.3 },
  weight_dot_overlap:       { min: 0.0, max: 5.0, default: 0, step: 0.3 },

  // ── v3 NEW scorer enable flags (0/1). Lets brain-search disable
  // a misleading scorer entirely without nudging weights. Especially
  // useful when a scorer's contribution is monotone-bad on a cell
  // (e.g. mobile engagement on a faction with no mobile units).
  enable_slow_overlap:      { min: 0, max: 1, default: 0, step: 1, integer: true },
  enable_aura_chain:        { min: 0, max: 1, default: 0, step: 1, integer: true },
  enable_cc_boost:          { min: 0, max: 1, default: 0, step: 1, integer: true },
  enable_mobile_engagement: { min: 0, max: 1, default: 0, step: 1, integer: true },
  enable_dot_overlap:       { min: 0, max: 1, default: 0, step: 1, integer: true },
};
