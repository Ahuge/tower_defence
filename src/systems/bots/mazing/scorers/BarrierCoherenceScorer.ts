/**
 * BarrierCoherenceScorer — rewards layouts where placed walls/towers
 * form complete row/column barriers with a single gap.
 *
 * Why: the v2/v3 score function rewards `path_length` (alpha=5.0,
 * dominant term), which IS the right signal in principle — but two
 * layouts with the same path length score identically even when one
 * is a clean serpentine (every row a complete barrier with gap on
 * alternating sides) and the other is a chaotic blob. The serpentine
 * is structurally better:
 *   - more stable when individual towers die (the barrier still
 *     redirects creeps even with one tower removed)
 *   - more tower coverage per cell (towers in a barrier row see
 *     creeps in the rows above + below)
 *   - easier for brain-search to find via mutation operators
 *
 * The scorer measures how many rows/cols have ≥ MIN_BARRIER_FILL of
 * their candidate cells filled, and adds a bonus proportional to the
 * number of fully-formed barriers. Layouts that scatter walls across
 * many partial rows score lower than layouts that form 3-4 complete
 * barriers.
 *
 * Active for any faction with wall-class towers. Default 0 — opt-in
 * via brain-search tuning since the existing path_extension term
 * already partially rewards what this scorer measures.
 */
import { ContributionScorer, ScorerContext } from './types';

/** Minimum fraction of a row/col that must be walls/towers for it to
 *  count as a "coherent barrier". 0.7 = at least 70% filled. Lower
 *  thresholds reward partial walls (defeats the purpose); higher
 *  thresholds make the bonus too sparse to guide search. */
const MIN_BARRIER_FILL = 0.7;

/** Minimum length of a row/col before it can count as a barrier. A
 *  3-cell row that's "fully filled" doesn't extend the path enough to
 *  be a real maze segment; 4+ cells is the threshold matching the
 *  growBarrier operator's eligibility check. */
const MIN_BARRIER_LENGTH = 4;

export class BarrierCoherenceScorer implements ContributionScorer {
  readonly id = 'barrier_coherence';

  contribute(c: ScorerContext): number {
    if (c.state.placedTowers.length < MIN_BARRIER_LENGTH) return 0;

    // Index placed-tower cells by row + col.
    const placedByRow = new Map<number, Set<number>>();
    const placedByCol = new Map<number, Set<number>>();
    for (const p of c.state.placedTowers) {
      let r = placedByRow.get(p.row);
      if (!r) { r = new Set(); placedByRow.set(p.row, r); }
      r.add(p.col);
      let cc = placedByCol.get(p.col);
      if (!cc) { cc = new Set(); placedByCol.set(p.col, cc); }
      cc.add(p.row);
    }

    // Count empty cells per row/col on the baseline grid (the
    // candidate space — cells that *could* be walled). A cell is
    // wallable if it's CellType.Empty or CellType.NoBuild.
    const grid = c.grid;
    const rowCandidates = new Map<number, number>();
    const colCandidates = new Map<number, number>();
    for (let r = 0; r < grid.rows; r++) {
      for (let cc = 0; cc < grid.cols; cc++) {
        const cell = grid.cells[r][cc];
        // Tower-class cells (already placed by THIS state) count as
        // candidate too — the baseline grid hasn't been re-walked
        // since scoreState restores it before returning, but the
        // scorer sees the post-placement state in
        // `c.state.placedTowers`. So count baseline-empty + already-
        // placed cells from this state.
        const isBaselineCandidate = cell === 0 || cell === 4;
        const isAlreadyPlaced = placedByRow.get(r)?.has(cc) ?? false;
        if (isBaselineCandidate || isAlreadyPlaced) {
          rowCandidates.set(r, (rowCandidates.get(r) ?? 0) + 1);
          colCandidates.set(cc, (colCandidates.get(cc) ?? 0) + 1);
        }
      }
    }

    let bonus = 0;
    // Reward each row that meets the fill threshold.
    for (const [row, walls] of placedByRow) {
      const cap = rowCandidates.get(row) ?? 0;
      if (cap < MIN_BARRIER_LENGTH) continue;
      const fillRatio = walls.size / cap;
      if (fillRatio < MIN_BARRIER_FILL) continue;
      // Bonus = number of walls in the barrier (so longer barriers
      // score higher, matching the path-extension benefit) + a flat
      // 5-point "this is a barrier" reward for being a complete row.
      bonus += walls.size + 5;
      // Single-gap bonus — the cleanest mazes have exactly ONE gap
      // per barrier. fillRatio in [MIN, 1) means 1+ gaps; ratio close
      // to (cap-1)/cap means exactly one gap. Reward that explicitly.
      const oneGapRatio = (cap - 1) / cap;
      if (fillRatio >= oneGapRatio - 0.01) bonus += 10;
    }
    // Same for columns.
    for (const [col, walls] of placedByCol) {
      const cap = colCandidates.get(col) ?? 0;
      if (cap < MIN_BARRIER_LENGTH) continue;
      const fillRatio = walls.size / cap;
      if (fillRatio < MIN_BARRIER_FILL) continue;
      bonus += walls.size + 5;
      const oneGapRatio = (cap - 1) / cap;
      if (fillRatio >= oneGapRatio - 0.01) bonus += 10;
    }

    return bonus;
  }

  breakdown(c: ScorerContext): Record<string, number> {
    const bonus = this.contribute(c);
    return bonus !== 0 ? { 'total_barrier_bonus': bonus } : {};
  }
}
