/**
 * v5.4 — UtilizationSummary
 *
 * Aggregates per-match `MatchResult.towerIdCounts` over an eval batch
 * into per-tower utilization signals:
 *
 *   utilization[id]  = matchesContaining(id) / totalMatches
 *                      "% of matches where this tower was placed at
 *                       least once". Ignores how many times. A niche
 *                       tower placed in 30% of matches → 0.30.
 *
 *   density[id]      = avgPlacements(id | matchesContaining(id)) /
 *                      avgTotalPlacements
 *                      "share of total play". A tower placed in 30%
 *                      of matches at 5 placements per match has
 *                      density 5×0.30 / avgTotal — proportional to
 *                      its actual board presence.
 *
 *   shareOfPlay[id]  = totalPlacements(id) / sum(totalPlacements over all)
 *                      simpler version: just "what fraction of every
 *                      tower placed across the batch is this id". Most
 *                      directly comparable across runs.
 *
 * The plan calls for `utilization × density` as a "share of play"
 * metric; `shareOfPlay` above is the equivalent normalized form
 * computed directly from totals (mathematically identical when every
 * match has a similar number of placements).
 */

export interface UtilizationStats {
  /** Tower id (e.g. `void_gambler`). */
  id: string;
  /** Fraction of matches where this tower was placed at least once. 0..1. */
  utilization: number;
  /** Total placements of this tower across the batch. */
  totalPlacements: number;
  /** Mean placements per match (across ALL matches, not just those
   *  containing this tower). */
  avgPlacements: number;
  /** Share of total tower placements across the batch. 0..1. */
  shareOfPlay: number;
}

export interface UtilizationReport {
  totalMatches: number;
  totalPlacements: number;
  /** Per-tower stats sorted descending by shareOfPlay. */
  byId: UtilizationStats[];
  /** Tower ids whose utilization fell below the flag threshold
   *  (default 0.10 — placed in <10% of matches). */
  flaggedLow: string[];
}

/** Aggregate match-result tower counts into per-tower utilization
 *  signals. Pass the array of `MatchResult.towerIdCounts` from your
 *  eval batch (one entry per match), plus the faction's full roster
 *  so towers that were NEVER placed still appear in the report (with
 *  utilization=0, shareOfPlay=0). The "never placed" case is usually
 *  the most actionable — those are towers the brain ignores entirely.
 *
 *  rosterIds is optional for backward compat; when omitted, only
 *  placed-at-least-once towers appear in byId. */
export function summarizeUtilization(
  perMatchCounts: Record<string, number>[],
  flagThreshold: number = 0.10,
  rosterIds?: string[],
): UtilizationReport {
  const totalMatches = perMatchCounts.length;
  const totals: Record<string, number> = {};
  const matchesContaining: Record<string, number> = {};

  for (const m of perMatchCounts) {
    for (const [id, count] of Object.entries(m)) {
      if (count > 0) {
        totals[id] = (totals[id] ?? 0) + count;
        matchesContaining[id] = (matchesContaining[id] ?? 0) + 1;
      }
    }
  }

  const totalPlacements = Object.values(totals).reduce((s, c) => s + c, 0);

  // Build the union of (towers placed) + (faction roster ids). Towers
  // in the roster but never placed get an entry with all zeros — most
  // useful signal for "the brain ignores this tower entirely".
  const allIds = new Set<string>([...Object.keys(totals), ...(rosterIds ?? [])]);
  const byId: UtilizationStats[] = [...allIds].map(id => {
    const total = totals[id] ?? 0;
    return {
      id,
      utilization: totalMatches > 0 ? (matchesContaining[id] ?? 0) / totalMatches : 0,
      totalPlacements: total,
      avgPlacements: totalMatches > 0 ? total / totalMatches : 0,
      shareOfPlay: totalPlacements > 0 ? total / totalPlacements : 0,
    };
  }).sort((a, b) => b.shareOfPlay - a.shareOfPlay);

  const flaggedLow = byId.filter(s => s.utilization < flagThreshold).map(s => s.id);
  return { totalMatches, totalPlacements, byId, flaggedLow };
}

/** Format a UtilizationReport as a table for log output. */
export function formatUtilization(report: UtilizationReport): string {
  const lines: string[] = [];
  lines.push(`utilization across ${report.totalMatches} matches, ${report.totalPlacements} total placements`);
  lines.push('');
  lines.push('  tower id              util%   share%   total   avg/match');
  lines.push('  ────────────────────  ─────   ─────   ─────   ─────────');
  for (const s of report.byId) {
    lines.push(`  ${s.id.padEnd(20)}  ${(s.utilization * 100).toFixed(0).padStart(4)}%   ${(s.shareOfPlay * 100).toFixed(1).padStart(5)}%   ${String(s.totalPlacements).padStart(5)}   ${s.avgPlacements.toFixed(1).padStart(8)}`);
  }
  if (report.flaggedLow.length > 0) {
    lines.push('');
    lines.push(`flagged low-utilization (< 10% of matches): ${report.flaggedLow.join(', ')}`);
  }
  return lines.join('\n');
}
