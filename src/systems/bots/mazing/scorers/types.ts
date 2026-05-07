/**
 * ContributionScorer registry — the v3 way to score a beam state.
 *
 * v2 used a fixed-shape formula:
 *   score = α·path_length + β·BFS_work + γ·max_queue
 *         + δ·dpsCoverage + ε·slowValue + ζ·auraAmplification
 *
 * Adding a new mechanic meant editing the planner, the options
 * struct, and the schema. v3 splits each term into a registered
 * `ContributionScorer` so the planner just reduces over them:
 *
 *   total = registered.reduce((sum, s) => sum + s.contribute(ctx), 0)
 *
 * Adding a new mechanic = drop a new file in this directory + register
 * it. No planner edits, no fixed-shape coupling.
 */

import { Grid } from '../../../Grid';
import { PathPoint } from '../../../Pathfinding';
import { TowerType } from '../../../../data/TowerTypes';
import { TowerRole } from '../../../../data/TowerRoles';

/** Per-tower placement record on the planner's beam state. */
export interface PlacedTower {
  col: number;
  row: number;
  towerId: string;
}

/** Beam state as the scorers see it — minimal shape so scorers don't
 *  pull in the whole AdversarialBeam type tree. */
export interface ScorerState {
  placedTowers: PlacedTower[];
  /** Cumulative gold cost of every placement in this state. Used by
   *  scorers that want to model economic urgency — gold-generating
   *  towers placed early when budget is tight contribute more than
   *  the same towers placed late when the bot is rich. */
  cost: number;
}

/** BFS metrics — computed once per state-score by the planner and
 *  passed to every scorer so each one doesn't re-walk the path. */
export interface BfsMetrics {
  /** Sum of BFS path lengths across all spawner→exit segments. */
  pathLength: number;
  /** Sum of BFS nodes-expanded counters. */
  nodesExpanded: number;
  /** Peak BFS queue depth across segments. */
  maxQueue: number;
  /** True iff every spawner segment has a valid path through the
   *  current grid + placedTowers. False = invalid state, scorers
   *  should return 0 (planner will bail before scoring on false). */
  success: boolean;
}

/** Cached path geometries — coordinates each spawner→exit BFS visited.
 *  Scorers that need to test path-cell coverage iterate these instead
 *  of re-running BFS. */
export type PathGeometries = PathPoint[][];

/** What every scorer sees. Cached fields are precomputed once per
 *  state-score by the planner and reused across all registered
 *  scorers — performance optimization, since every scorer would
 *  otherwise re-walk the same BFS. */
export interface ScorerContext {
  grid: Grid;
  paths: { start: PathPoint; end: PathPoint }[];
  towerPool: TowerType[];
  state: ScorerState;
  bfs: BfsMetrics;
  pathGeometries: PathGeometries;
  /** O(1) tower-id → TowerType lookup for scorers that need to read
   *  per-tower properties (range, damage, role, traits). */
  lookupTower: (id: string) => TowerType | null;
  /** O(1) tower-id → TowerRole lookup. Same as
   *  `getTowerRole(lookupTower(id)!)` but cached. */
  lookupRole: (id: string) => TowerRole;
}

export interface ContributionScorer {
  /** Stable id for diagnostics + brain-search wiring (e.g.
   *  `weight_aura_chain`, `enable_aura_chain`). */
  readonly id: string;
  /** This scorer's contribution to the total score. The planner
   *  multiplies by the configured weight before summing. */
  contribute(c: ScorerContext): number;
  /** Optional diagnostic — return per-tower or per-component breakdown.
   *  Used by show-mazing-plan.mjs and tests, not the hot path. */
  breakdown?(c: ScorerContext): Record<string, number>;
}

/** Registered scorer + its weight + enable flag. The planner skips
 *  disabled scorers and multiplies the contribution by weight before
 *  summing into the total. */
export interface RegisteredScorer {
  scorer: ContributionScorer;
  weight: number;
  enabled: boolean;
}

/** A registry instance is a list of (scorer, weight, enabled) entries.
 *  Created from a config object at planner construction. */
export class ScorerRegistry {
  private readonly entries: RegisteredScorer[];

  constructor(entries: RegisteredScorer[]) {
    this.entries = entries;
  }

  /** Sum of every enabled scorer's weighted contribution. */
  totalScore(c: ScorerContext): number {
    let total = 0;
    for (const e of this.entries) {
      if (!e.enabled || e.weight === 0) continue;
      total += e.weight * e.scorer.contribute(c);
    }
    return total;
  }

  /** Diagnostic — per-scorer breakdown for show-mazing-plan etc. */
  scoreBreakdown(c: ScorerContext): Record<string, number> {
    const out: Record<string, number> = {};
    for (const e of this.entries) {
      if (!e.enabled) continue;
      out[e.scorer.id] = e.weight * e.scorer.contribute(c);
    }
    return out;
  }

  /** All registered scorer ids — used by the schema generator. */
  ids(): string[] {
    return this.entries.map(e => e.scorer.id);
  }
}
