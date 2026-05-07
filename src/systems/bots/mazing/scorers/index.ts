/**
 * Default registration: maps v2 BeamOptions weights → ContributionScorer
 * instances + weights for the v3 ScorerRegistry.
 *
 * Each entry mirrors a v2 weight field exactly so a v2-style options
 * object produces identical scoring behaviour. New scorers added in
 * later milestones append here with their own weight + enable knobs.
 */
import { RegisteredScorer, ScorerRegistry } from './types';
import { PathExtensionScorer } from './PathExtensionScorer';
import { BFSWorkScorer } from './BFSWorkScorer';
import { DpsCoverageScorer } from './DpsCoverageScorer';
import { SlowValueScorer } from './SlowValueScorer';
import { AuraAmplificationScorer } from './AuraAmplificationScorer';

/** Weights config — one knob per registered scorer. v3's brain-search
 *  schema sweeps these. v2 → v3 migration:
 *    pathExtension ← α
 *    bfsWork       ← β + γ (BFSWorkScorer wraps both internally)
 *    dpsCoverage   ← δ
 *    slowValue     ← ε
 *    auraAmp       ← ζ
 *
 *  Each weight has an `enable` companion — toggling enable=false
 *  zeros the contribution without reshuffling the weight tuning.
 *  Useful for brain-search to disable a misleading scorer entirely. */
export interface ScorerWeights {
  pathExtension: number;
  bfsWork: number;
  dpsCoverage: number;
  slowValue: number;
  auraAmp: number;
}

export interface ScorerToggles {
  pathExtension: boolean;
  bfsWork: boolean;
  dpsCoverage: boolean;
  slowValue: boolean;
  auraAmp: boolean;
}

export const DEFAULT_SCORER_WEIGHTS: ScorerWeights = {
  pathExtension: 5.0,
  bfsWork: 1.5,    // sum of v2's beta=1.0 + gamma=0.5
  dpsCoverage: 0.05,
  slowValue: 0.05,
  auraAmp: 0.05,
};

export const DEFAULT_SCORER_TOGGLES: ScorerToggles = {
  pathExtension: true,
  bfsWork: true,
  dpsCoverage: true,
  slowValue: true,
  auraAmp: true,
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
    { scorer: new PathExtensionScorer(), weight: w.pathExtension, enabled: e.pathExtension },
    { scorer: new BFSWorkScorer(),        weight: w.bfsWork,       enabled: e.bfsWork },
    { scorer: new DpsCoverageScorer(),    weight: w.dpsCoverage,   enabled: e.dpsCoverage },
    { scorer: new SlowValueScorer(),      weight: w.slowValue,     enabled: e.slowValue },
    { scorer: new AuraAmplificationScorer(), weight: w.auraAmp,    enabled: e.auraAmp },
  ];
  return new ScorerRegistry(entries);
}

export { ScorerRegistry } from './types';
export type {
  ContributionScorer, RegisteredScorer, ScorerContext,
  ScorerState, BfsMetrics, PathGeometries, PlacedTower,
} from './types';
