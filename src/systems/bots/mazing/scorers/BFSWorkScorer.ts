/**
 * BFSWorkScorer — β·nodes_expanded + γ·max_queue.
 *
 * Rewards plans that create complex BFS exploration patterns —
 * dead-ends, branching corridors, anything that makes BFS visit more
 * cells before finding the goal. Higher BFS workload correlates with
 * harder-to-traverse mazes for creeps.
 *
 * v2 had separate β and γ weights; v3 wraps them into one scorer with
 * a single registered weight. Internally we expose the per-component
 * breakdown for diagnostics and split-weight tuning if needed.
 *
 * The combined weight is the sum of v2's β and γ (when migrated 1:1
 * with the current v2 ratio of beta=1.51, gamma=0.5 = ~2.01 total).
 * brain-search will retune.
 */
import { ContributionScorer, ScorerContext } from './types';

export interface BFSWorkOptions {
  /** Sub-weight for nodes_expanded relative to max_queue. 1.0 = pure
   *  nodes; 0.0 = pure queue. Default 0.66 mirrors v2's 1.0/(1.0+0.5)
   *  ratio so the migrated weight gives the same balance. */
  nodesShare: number;
}

export const DEFAULT_BFS_WORK_OPTIONS: BFSWorkOptions = {
  nodesShare: 0.66,
};

export class BFSWorkScorer implements ContributionScorer {
  readonly id = 'bfs_work';
  private readonly opts: BFSWorkOptions;

  constructor(opts: Partial<BFSWorkOptions> = {}) {
    this.opts = { ...DEFAULT_BFS_WORK_OPTIONS, ...opts };
  }

  contribute(c: ScorerContext): number {
    const ns = this.opts.nodesShare;
    return ns * c.bfs.nodesExpanded + (1 - ns) * c.bfs.maxQueue;
  }

  breakdown(c: ScorerContext): Record<string, number> {
    return {
      nodes_expanded: this.opts.nodesShare * c.bfs.nodesExpanded,
      max_queue: (1 - this.opts.nodesShare) * c.bfs.maxQueue,
    };
  }
}
