/**
 * Default registration: maps weight knobs → ContributionScorer
 * instances + weights for the v3 ScorerRegistry.
 *
 * Each entry mirrors a v2 weight field exactly (or a new v3 trait-
 * aware scorer term). New scorers default to enabled=false / weight=0
 * so M2 ships behaviour-equivalent to v2 — M4's brain-search re-tunes
 * to find the new wins.
 */
import { RegisteredScorer, ScorerRegistry } from './types';
import { PathExtensionScorer } from './PathExtensionScorer';
import { BFSWorkScorer } from './BFSWorkScorer';
import { DpsCoverageScorer } from './DpsCoverageScorer';
import { SlowValueScorer } from './SlowValueScorer';
import { AuraAmplificationScorer } from './AuraAmplificationScorer';
import { SlowOverlapScorer } from './SlowOverlapScorer';
import { AuraChainScorer } from './AuraChainScorer';
import { CrowdControlBoostScorer } from './CrowdControlBoostScorer';
import { MobileEngagementScorer } from './MobileEngagementScorer';
import { DotOverlapScorer } from './DotOverlapScorer';

/** Weights config — one knob per registered scorer. v2 → v3 migration:
 *    pathExtension ← α
 *    bfsWork       ← β + γ (BFSWorkScorer wraps both internally)
 *    dpsCoverage   ← δ
 *    slowValue     ← ε
 *    auraAmp       ← ζ
 *
 *  v3 NEW (default 0 / disabled — M4 tunes them on):
 *    slowOverlap, auraChain, ccBoost, mobileEngagement, dotOverlap
 *
 *  Each weight has an `enable` companion — toggling enable=false
 *  zeros the contribution without reshuffling the weight tuning. */
export interface ScorerWeights {
  pathExtension: number;
  bfsWork: number;
  dpsCoverage: number;
  slowValue: number;
  auraAmp: number;
  slowOverlap: number;
  auraChain: number;
  ccBoost: number;
  mobileEngagement: number;
  dotOverlap: number;
}

export interface ScorerToggles {
  pathExtension: boolean;
  bfsWork: boolean;
  dpsCoverage: boolean;
  slowValue: boolean;
  auraAmp: boolean;
  slowOverlap: boolean;
  auraChain: boolean;
  ccBoost: boolean;
  mobileEngagement: boolean;
  dotOverlap: boolean;
}

export const DEFAULT_SCORER_WEIGHTS: ScorerWeights = {
  // v2 terms
  pathExtension: 5.0,
  bfsWork: 1.5,
  dpsCoverage: 0.05,
  slowValue: 0.05,
  auraAmp: 0.05,
  // v3 NEW — defaults disabled until brain-search tunes them on
  slowOverlap: 0,
  auraChain: 0,
  ccBoost: 0,
  mobileEngagement: 0,
  dotOverlap: 0,
};

export const DEFAULT_SCORER_TOGGLES: ScorerToggles = {
  pathExtension: true,
  bfsWork: true,
  dpsCoverage: true,
  slowValue: true,
  auraAmp: true,
  // v3 NEW — disabled by default. M4 brain-search per cell will
  // selectively enable + tune weights. Specifically the synergy-
  // heavy cells (harmonic, psionic, nature, military) should
  // benefit when the relevant scorer flips on with non-zero weight.
  slowOverlap: false,
  auraChain: false,
  ccBoost: false,
  mobileEngagement: false,
  dotOverlap: false,
};

/** Build a ScorerRegistry from the weight + toggle config. v3 planner
 *  calls this once at construction. */
export function buildDefaultRegistry(
  weights: Partial<ScorerWeights> = {},
  toggles: Partial<ScorerToggles> = {},
): ScorerRegistry {
  const w = { ...DEFAULT_SCORER_WEIGHTS, ...weights };
  const e = { ...DEFAULT_SCORER_TOGGLES, ...toggles };
  const entries: RegisteredScorer[] = [
    // v2 terms — always default on so legacy callers get v2 behaviour.
    { scorer: new PathExtensionScorer(),    weight: w.pathExtension, enabled: e.pathExtension },
    { scorer: new BFSWorkScorer(),          weight: w.bfsWork,        enabled: e.bfsWork },
    { scorer: new DpsCoverageScorer(),      weight: w.dpsCoverage,    enabled: e.dpsCoverage },
    { scorer: new SlowValueScorer(),        weight: w.slowValue,      enabled: e.slowValue },
    { scorer: new AuraAmplificationScorer(), weight: w.auraAmp,       enabled: e.auraAmp },
    // v3 NEW terms — default off + zero weight.
    { scorer: new SlowOverlapScorer(),       weight: w.slowOverlap,    enabled: e.slowOverlap },
    { scorer: new AuraChainScorer(),         weight: w.auraChain,      enabled: e.auraChain },
    { scorer: new CrowdControlBoostScorer(), weight: w.ccBoost,        enabled: e.ccBoost },
    { scorer: new MobileEngagementScorer(),  weight: w.mobileEngagement, enabled: e.mobileEngagement },
    { scorer: new DotOverlapScorer(),        weight: w.dotOverlap,     enabled: e.dotOverlap },
  ];
  return new ScorerRegistry(entries);
}

export { ScorerRegistry } from './types';
export type {
  ContributionScorer, RegisteredScorer, ScorerContext,
  ScorerState, BfsMetrics, PathGeometries, PlacedTower,
} from './types';
