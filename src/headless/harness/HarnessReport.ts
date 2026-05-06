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
 *  non-trivial movement + the summary, plus a per-brain breakdown
 *  for each moved cell so brain-noise can be distinguished from
 *  real signal (a delta concentrated in one brain == roulette;
 *  a delta spread across all brains == real). */
export function formatChange(change: ChangeResult, baseline: FactionBestStats[]): string {
  const lines: string[] = [];
  lines.push(`### ${change.id} — ${change.description}`);
  lines.push('');
  lines.push(`target faction: **${change.faction}** · netΔ=${change.netDelta.toFixed(2)} · ` +
    `cells helped=${change.cellsHelped} hurt=${change.cellsHurt}`);
  lines.push('');

  const baseMap = new Map(baseline.map(b => [`${b.faction}|${b.difficulty}`, b]));
  const changeMap = new Map(change.best.map(b => [`${b.faction}|${b.difficulty}`, b]));
  const moved = Array.from(change.delta.entries())
    .filter(([, d]) => Math.abs(d) > 0.05)
    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a));

  if (moved.length === 0) {
    lines.push('_no significant cell movement (±5%+)_');
    return lines.join('\n');
  }

  lines.push('| cell | baseline | new | Δ | in target? | per-brain Δ (best-mover first) |');
  lines.push('|---|---|---|---|---|---|');
  for (const [key, delta] of moved) {
    const base = baseMap.get(key);
    if (!base) continue;
    const newRate = base.bestWinRate + delta;
    const [, difficulty] = key.split('|');
    const bandBefore = inTargetBand(difficulty, base.bestWinRate) ? '✅' : '❌';
    const bandAfter = inTargetBand(difficulty, newRate) ? '✅' : '❌';
    const brainDelta = formatPerBrainDelta(base, changeMap.get(key));
    lines.push(`| ${key} | ${pct(base.bestWinRate).replace('+', '')} | ${pct(newRate).replace('+', '')} | ${pct(delta)} | ${bandBefore}→${bandAfter} | ${brainDelta} |`);
  }
  return lines.join('\n');
}

/** Compute baseline → change winrate delta per brain for one cell.
 *  Used in formatChange to surface whether a change moved every
 *  brain or just one — a single-brain mover is brain-roulette. */
function formatPerBrainDelta(base: FactionBestStats, changed: FactionBestStats | undefined): string {
  if (!changed) return '_(no change data)_';
  const baseByBrain = new Map(base.perBrain.map(p => [p.brain, p.winRate]));
  const changedByBrain = new Map(changed.perBrain.map(p => [p.brain, p.winRate]));
  const allBrains = new Set([...baseByBrain.keys(), ...changedByBrain.keys()]);
  const deltas: { brain: string; d: number }[] = [];
  for (const b of allBrains) {
    const before = baseByBrain.get(b) ?? 0;
    const after = changedByBrain.get(b) ?? 0;
    deltas.push({ brain: b, d: after - before });
  }
  deltas.sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
  return deltas
    .filter(d => Math.abs(d.d) >= 0.02)
    .map(d => `${d.brain} ${pct(d.d)}`)
    .join(', ') || '_(all brains within ±2%)_';
}

/** Score a change with two penalty terms layered on the raw delta:
 *
 *   raw      = targetFactionDelta × 2 + netDelta
 *   cluster  = 1 / sqrt(clusterSize)                  // 19 siblings → 0.23×
 *   spread   = max(0, 1 − brainSpread × 2)            // 0.5 stdev → 0×
 *   score    = raw × cluster × spread
 *
 * **clusterSize** — within a faction, count how many other changes
 * produced the *same* cell-delta signature (cells rounded to 0.5%).
 * The previous report had 19 mech.* nerfs all reading "+86% mech easy"
 * because the brain matrix was rerolling identically — those siblings
 * shrink each other's score so a *single distinct* effect bubbles to
 * the top instead of 19 echo entries.
 *
 * **brainSpread** — stdev of per-brain mean deltas. A change that
 * moved one brain by 50% while three didn't budge is brain-roulette;
 * a change that moved all eight brains by ~5% is real signal. Spread
 * approaching ~0.5 zeros out the score; spread under 0.1 keeps ~80%.
 *
 * The two penalties are complementary: cluster catches "this is the
 * 19th echo of a brain reroll", spread catches "this single change
 * only moved one brain". A change has to pass both filters to top
 * the ranking. */
export interface ScoredChange extends ChangeResult {
  score: number;
  rawScore: number;
  clusterSize: number;
  brainSpread: number;
}

export function scoreChanges(results: HarnessResults): ScoredChange[] {
  const baseByCell = new Map(results.baseline.map(b => [`${b.faction}|${b.difficulty}`, b]));

  // First pass: signature each change so we can count cluster sizes.
  const sigs = new Map<string, string>();
  for (const c of results.changes) sigs.set(c.id, signatureOf(c));

  const clusterCount = new Map<string, number>();
  for (const c of results.changes) {
    const key = `${c.faction}|${sigs.get(c.id)}`;
    clusterCount.set(key, (clusterCount.get(key) ?? 0) + 1);
  }

  // Second pass: compute final scores.
  return results.changes.map(c => {
    const clusterSize = clusterCount.get(`${c.faction}|${sigs.get(c.id)}`) ?? 1;
    const brainSpread = computeBrainSpread(c, baseByCell);
    const raw = c.targetFactionDelta * 2 + c.netDelta;
    const clusterPenalty = 1 / Math.sqrt(clusterSize);
    const spreadPenalty = Math.max(0, 1 - brainSpread * 2);
    const score = raw * clusterPenalty * spreadPenalty;
    return { ...c, score, rawScore: raw, clusterSize, brainSpread };
  });
}

/** Round each moved cell's delta to 0.5% buckets and join — two
 *  changes that happen to land within 0.5% on every cell are
 *  almost certainly siblings (e.g., 19 mech.* nerfs that all hit
 *  the same brain-reroll cliff). */
function signatureOf(c: ChangeResult): string {
  const moved = Array.from(c.delta.entries())
    .filter(([, d]) => Math.abs(d) >= 0.05)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cell, d]) => `${cell}:${(Math.round(d * 200) / 200).toFixed(3)}`);
  return moved.join(';');
}

/** Stdev of per-brain mean deltas across all cells of this change.
 *  Captures whether a change moved every brain by similar amounts
 *  (low spread = real signal) or pushed exactly one brain into a
 *  different MCTS path (high spread = roulette). */
function computeBrainSpread(c: ChangeResult, baseByCell: Map<string, FactionBestStats>): number {
  const perBrainSamples: Map<string, number[]> = new Map();
  for (const cellStats of c.best) {
    const base = baseByCell.get(`${cellStats.faction}|${cellStats.difficulty}`);
    if (!base) continue;
    const baseByBrain = new Map(base.perBrain.map(p => [p.brain, p.winRate]));
    for (const p of cellStats.perBrain) {
      const before = baseByBrain.get(p.brain) ?? 0;
      const arr = perBrainSamples.get(p.brain) ?? [];
      arr.push(p.winRate - before);
      perBrainSamples.set(p.brain, arr);
    }
  }
  const perBrainMeans: number[] = [];
  for (const [, deltas] of perBrainSamples) {
    if (deltas.length === 0) continue;
    perBrainMeans.push(deltas.reduce((a, b) => a + b, 0) / deltas.length);
  }
  if (perBrainMeans.length < 2) return 0;
  const mean = perBrainMeans.reduce((a, b) => a + b, 0) / perBrainMeans.length;
  const variance = perBrainMeans.reduce((a, b) => a + (b - mean) ** 2, 0) / perBrainMeans.length;
  return Math.sqrt(variance);
}

/** Concise ranking table. Sorts by the dedup-aware score so single
 *  distinct effects out-rank 19-sibling echoes. Surfaces clusterSize
 *  and brainSpread inline so a low score on a high raw delta is
 *  diagnosable at a glance. */
export function formatRanking(results: HarnessResults): string {
  const ranked = scoreChanges(results).sort((a, b) => b.score - a.score);

  const lines: string[] = [];
  lines.push('| rank | id | description | target | netΔ | targetΔ | helped | hurt | raw | cluster | spread | score |');
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
  ranked.forEach((c, i) => {
    lines.push(
      `| ${i + 1} | \`${c.id}\` | ${c.description} | ${c.faction} | ` +
      `${c.netDelta.toFixed(2)} | ${pct(c.targetFactionDelta)} | ${c.cellsHelped} | ${c.cellsHurt} | ` +
      `${c.rawScore.toFixed(2)} | ${c.clusterSize > 1 ? `1/${c.clusterSize}` : '—'} | ` +
      `${(c.brainSpread * 100).toFixed(1)}% | ${c.score.toFixed(2)} |`,
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
  out.push('Score = (targetΔ × 2 + netΔ) × (1/√clusterSize) × max(0, 1 − brainSpread × 2). ');
  out.push('Cluster dedups N changes that produced the same per-cell delta signature within a faction; brainSpread shrinks single-brain wins.\n');
  out.push(formatRanking(results));
  out.push('\n### Per-change breakdown (top movers first)\n');
  const scored = scoreChanges(results).sort((a, b) => b.score - a.score);
  for (const c of scored) {
    out.push(formatChange(c, results.baseline));
    out.push('');
  }
  return out.join('\n');
}
