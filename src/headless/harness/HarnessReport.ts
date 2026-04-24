/**
 * HarnessReport — format HarnessResults for human consumption.
 *
 * Two output views:
 *   - `formatPerChangeReport`: one markdown section per change.
 *     Shows which (faction, difficulty) cells moved and by how
 *     much. Good for dense review of a ~140-change run.
 *   - `formatRanking`: a single markdown table ranking changes by
 *     net delta / target-faction delta. Good for "what helped most"
 *     at a glance.
 *
 * Both emit markdown so results can be pasted straight into a
 * balance-notes doc without reformatting.
 */
import { HarnessResults, ChangeResult } from './HarnessRunner';
import { FactionBestStats } from '../Batch';

const TARGET_EASY = [0.75, 1.0];
const TARGET_NORMAL = [0.35, 0.65];
const TARGET_HARD = [0.0, 0.25];

/** Does this cell fit its target band? Used to colour deltas —
 *  moving from 100% → 80% on normal is GOOD (toward band) even
 *  though raw delta is negative. */
function inTargetBand(difficulty: string, winRate: number): boolean {
  if (difficulty === 'easy') return winRate >= TARGET_EASY[0] && winRate <= TARGET_EASY[1];
  if (difficulty === 'normal') return winRate >= TARGET_NORMAL[0] && winRate <= TARGET_NORMAL[1];
  if (difficulty === 'hard') return winRate >= TARGET_HARD[0] && winRate <= TARGET_HARD[1];
  return true; // insane has no strict band
}

function pct(x: number): string {
  const sign = x > 0 ? '+' : '';
  return `${sign}${(x * 100).toFixed(1)}%`;
}

/** Narrate a single ChangeResult as markdown. Shows cells with
 *  non-trivial movement + the summary. */
export function formatChange(change: ChangeResult, baseline: FactionBestStats[]): string {
  const lines: string[] = [];
  lines.push(`### ${change.id} — ${change.description}`);
  lines.push('');
  lines.push(`target faction: **${change.faction}** · netΔ=${change.netDelta.toFixed(2)} · ` +
    `cells helped=${change.cellsHelped} hurt=${change.cellsHurt}`);
  lines.push('');

  const baseMap = new Map(baseline.map(b => [`${b.faction}|${b.difficulty}`, b]));
  const moved = Array.from(change.delta.entries())
    .filter(([, d]) => Math.abs(d) > 0.05)
    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a));

  if (moved.length === 0) {
    lines.push('_no significant cell movement (±5%+)_');
    return lines.join('\n');
  }

  lines.push('| cell | baseline | new | Δ | in target? |');
  lines.push('|---|---|---|---|---|');
  for (const [key, delta] of moved) {
    const base = baseMap.get(key);
    if (!base) continue;
    const newRate = base.bestWinRate + delta;
    const [, difficulty] = key.split('|');
    const bandBefore = inTargetBand(difficulty, base.bestWinRate) ? '✅' : '❌';
    const bandAfter = inTargetBand(difficulty, newRate) ? '✅' : '❌';
    lines.push(`| ${key} | ${pct(base.bestWinRate).replace('+', '')} | ${pct(newRate).replace('+', '')} | ${pct(delta)} | ${bandBefore}→${bandAfter} |`);
  }
  return lines.join('\n');
}

/** Concise ranking table. Sorts changes by a weighted score:
 *    target-faction delta × 2 + net delta
 *  so a change that helps its faction more than it globally
 *  displaces other factions ranks highest. */
export function formatRanking(results: HarnessResults): string {
  const ranked = [...results.changes].map(c => ({
    ...c,
    score: c.targetFactionDelta * 2 + c.netDelta,
  })).sort((a, b) => b.score - a.score);

  const lines: string[] = [];
  lines.push('| rank | id | description | target | netΔ | targetΔ | helped | hurt | score |');
  lines.push('|---|---|---|---|---|---|---|---|---|');
  ranked.forEach((c, i) => {
    lines.push(
      `| ${i + 1} | \`${c.id}\` | ${c.description} | ${c.faction} | ` +
      `${c.netDelta.toFixed(2)} | ${pct(c.targetFactionDelta)} | ${c.cellsHelped} | ${c.cellsHurt} | ${c.score.toFixed(2)} |`,
    );
  });
  return lines.join('\n');
}

/** Full two-section report: ranking table, then a dense per-change
 *  breakdown sorted by score. Use for end-of-run dumps. */
export function formatFullReport(results: HarnessResults): string {
  const out: string[] = [];
  out.push('## Balance harness results\n');
  out.push(`Baseline tournament: ${results.baseline.length} (faction × difficulty) cells.  `);
  out.push(`Changes tested: ${results.changes.length}.\n`);
  out.push('### Ranking\n');
  out.push(formatRanking(results));
  out.push('\n### Per-change breakdown (top movers first)\n');
  const sorted = [...results.changes].sort((a, b) =>
    (b.targetFactionDelta * 2 + b.netDelta) - (a.targetFactionDelta * 2 + a.netDelta),
  );
  for (const c of sorted) {
    out.push(formatChange(c, results.baseline));
    out.push('');
  }
  return out.join('\n');
}
