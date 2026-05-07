/**
 * PathExtensionScorer — α·BFS path length.
 *
 * Rewards plans where the BFS path through the grid is long. This is
 * the primary mazing signal — towers that block the path force creeps
 * to detour, and longer detours mean more time in tower-fire range.
 *
 * Migrated from v2's `α·bfs.pathLength` term inside scoreState.
 * Behavior identical when registered with weight=alpha.
 */
import { ContributionScorer, ScorerContext } from './types';

export class PathExtensionScorer implements ContributionScorer {
  readonly id = 'path_extension';

  contribute(c: ScorerContext): number {
    return c.bfs.pathLength;
  }
}
