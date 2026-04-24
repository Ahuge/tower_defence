/**
 * HarnessRunner — runs the tournament sweep for a baseline + each
 * change in a catalog, returns per-cell deltas.
 *
 * Orchestration is simple: serial over changes (parallel lives in
 * Pool.ts). Inside each change we reuse `runBatch` + the 4-brain
 * tournament config the balance sweep already uses, so deltas are
 * directly comparable to the batch.test.ts output.
 *
 * Results are shaped as `{ baseline, changes[] }` where each
 * change entry carries both raw per-cell stats and the delta vs.
 * baseline. Report formatting happens in HarnessReport.
 */
import { expandMatrix, runBatch, aggregate, aggregateByFactionBest, CellStats, FactionBestStats } from '../Batch';
import { MatchResult } from '../types';
import { BalanceChange, CATALOG } from './ChangeCatalog';
import { PatchEngine } from './PatchEngine';

export interface HarnessMatrixSpec {
  factions: readonly string[];
  difficulties: readonly ('easy' | 'normal' | 'hard' | 'insane')[];
  maps: readonly string[];
  brains: readonly string[];
  matchModes: readonly ('standard' | 'endless')[];
  seedsPerCell: number;
  baseSeed: number;
  waveCount: number;
}

/** Default matrix used for BASELINE sweeps + GLOBAL changes.
 *  11 factions × 4 difficulties × 4 brains × 50 seeds = 8,800
 *  matches. Per-change sweeps (when the change targets a specific
 *  faction) narrow to just that faction — see `narrowToFaction`.
 *
 *  50 seeds gives ±6.5% CI on a binary win rate; balance deltas
 *  of ±10% land outside the noise floor reliably. */
export const DEFAULT_MATRIX: HarnessMatrixSpec = {
  factions: ['mechanical', 'arcane', 'nature', 'void', 'military', 'aliens', 'cypherpunk', 'infernal', 'celestial', 'psionic', 'harmonic'],
  difficulties: ['easy', 'normal', 'hard', 'insane'],
  maps: ['plains'],
  brains: ['balanced', 'rush', 'synergy', 'nature'],
  matchModes: ['standard'],
  seedsPerCell: 50,
  baseSeed: 1,
  waveCount: 20,
};

/** Restrict a matrix to a single faction. Used for faction-
 *  targeted changes — a Nature tweak can't affect Arcane's win
 *  rate (towers don't overlap) so sweeping all 11 factions is
 *  ~11× wasted compute. We still run the full matrix for
 *  `baseline` and `global`-scoped changes so cross-faction
 *  spillover (from difficulty ramp, kill-gold tweaks, etc.)
 *  can be measured. */
export function narrowToFaction(matrix: HarnessMatrixSpec, faction: string): HarnessMatrixSpec {
  return { ...matrix, factions: [faction] };
}

export interface ChangeResult {
  id: string;
  description: string;
  faction: string;
  /** Best-brain winrate per cell under this change. */
  best: FactionBestStats[];
  /** Delta vs. baseline — positive = change helps, negative = hurts.
   *  Keyed by `faction|difficulty`. */
  delta: Map<string, number>;
  /** Summary stats for the ranked report. */
  netDelta: number;        // sum of all cell deltas
  targetFactionDelta: number; // delta on the target faction only
  cellsHelped: number;     // cells with delta > +5%
  cellsHurt: number;       // cells with delta < -5%
}

export interface HarnessResults {
  matrix: HarnessMatrixSpec;
  baseline: FactionBestStats[];
  changes: ChangeResult[];
}

/** Run the full sweep for one configuration (applies `change` if
 *  provided, runs the tournament, reverts). Returns the best-brain
 *  aggregate per cell — the shape the report consumes. */
async function runOneSweep(
  matrix: HarnessMatrixSpec,
  change: BalanceChange | null,
  onProgress?: (done: number, total: number) => void,
): Promise<{ results: MatchResult[]; best: FactionBestStats[]; cells: CellStats[] }> {
  const patch = new PatchEngine();
  try {
    if (change) change.apply(patch);
    const configs = expandMatrix({
      factions: matrix.factions as any,
      difficulties: matrix.difficulties as any,
      maps: matrix.maps as any,
      brains: matrix.brains as any,
      matchModes: matrix.matchModes as any,
      seedsPerCell: matrix.seedsPerCell,
      baseSeed: matrix.baseSeed,
      waveCount: matrix.waveCount,
    });
    const results = await runBatch(configs, {
      onProgress: onProgress
        ? (done, total) => onProgress(done, total)
        : undefined,
      progressEvery: 100,
    });
    const cells = aggregate(results);
    const best = aggregateByFactionBest(cells);
    return { results, best, cells };
  } finally {
    patch.revert();
  }
}

/** Compute per-cell delta: change.winRate - baseline.winRate,
 *  keyed by `faction|difficulty`. Positive = change is helpful. */
function computeDelta(baseline: FactionBestStats[], change: FactionBestStats[]): Map<string, number> {
  const baseMap = new Map(baseline.map(b => [`${b.faction}|${b.difficulty}`, b.bestWinRate]));
  const delta = new Map<string, number>();
  for (const c of change) {
    const key = `${c.faction}|${c.difficulty}`;
    const base = baseMap.get(key) ?? 0;
    delta.set(key, c.bestWinRate - base);
  }
  return delta;
}

/** Serial harness — runs baseline, then each change in sequence.
 *  Use `runHarnessParallel` (Pool.ts) for multi-worker speedup. */
export async function runHarness(
  catalog: BalanceChange[] = CATALOG,
  matrix: HarnessMatrixSpec = DEFAULT_MATRIX,
  log: (msg: string) => void = () => {},
): Promise<HarnessResults> {
  log(`[harness] baseline sweep (${matrix.factions.length * matrix.difficulties.length * matrix.brains.length * matrix.seedsPerCell} matches)…`);
  const baselineT0 = Date.now();
  const baseline = await runOneSweep(matrix, null);
  log(`[harness] baseline done in ${((Date.now() - baselineT0) / 1000).toFixed(1)}s`);

  const changes: ChangeResult[] = [];
  for (let i = 0; i < catalog.length; i++) {
    const change = catalog[i];
    log(`[harness] [${i + 1}/${catalog.length}] ${change.id} — ${change.description}`);
    const t0 = Date.now();
    // Faction-scoped changes run on their target faction only — a
    // Nature tweak can't affect Arcane, etc. Global changes +
    // baseline use the full matrix.
    const effectiveMatrix = change.faction !== 'global'
      ? narrowToFaction(matrix, change.faction)
      : matrix;
    const out = await runOneSweep(effectiveMatrix, change);
    const delta = computeDelta(baseline.best, out.best);
    changes.push(makeChangeResult(change, out.best, delta));
    log(`[harness]   ${((Date.now() - t0) / 1000).toFixed(1)}s · netΔ=${sumValues(delta).toFixed(2)}`);
  }

  return { matrix, baseline: baseline.best, changes };
}

/** Build a ChangeResult from raw sweep outputs. Extracted so
 *  Pool.ts can call it with results collected from worker threads. */
export function makeChangeResult(
  change: BalanceChange,
  best: FactionBestStats[],
  delta: Map<string, number>,
): ChangeResult {
  let cellsHelped = 0;
  let cellsHurt = 0;
  for (const d of delta.values()) {
    if (d > 0.05) cellsHelped++;
    else if (d < -0.05) cellsHurt++;
  }
  const targetKey = change.faction === 'global'
    ? null
    : `${change.faction}|normal`; // normal is the "target band" cell by default
  const targetFactionDelta = targetKey ? (delta.get(targetKey) ?? 0) : 0;
  return {
    id: change.id,
    description: change.description,
    faction: change.faction,
    best,
    delta,
    netDelta: sumValues(delta),
    targetFactionDelta,
    cellsHelped,
    cellsHurt,
  };
}

function sumValues(m: Map<string, number>): number {
  let s = 0;
  for (const v of m.values()) s += v;
  return s;
}

/** Entry for a worker — runs a single sweep (baseline or one
 *  change) and returns the best-brain table. Pool.ts calls this
 *  over the thread boundary.
 *
 *  Narrows the sweep matrix to `change.faction` when the change
 *  is faction-scoped — saves ~10× the compute since a Nature
 *  tweak can't affect Arcane's win rate. Global + baseline always
 *  use the full matrix. */
export async function runSingle(
  matrix: HarnessMatrixSpec,
  changeId: string | null,
): Promise<{ best: FactionBestStats[] }> {
  const change = changeId ? CATALOG.find(c => c.id === changeId) : null;
  if (changeId && !change) throw new Error(`runSingle: unknown change id "${changeId}"`);
  const effectiveMatrix = change && change.faction !== 'global'
    ? narrowToFaction(matrix, change.faction)
    : matrix;
  const out = await runOneSweep(effectiveMatrix, change ?? null);
  return { best: out.best };
}
