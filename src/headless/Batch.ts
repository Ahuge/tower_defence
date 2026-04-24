/**
 * Batch runner + aggregator for headless balance testing.
 *
 * A "matrix" is a Cartesian expansion of configuration variants
 * (factions × difficulties × maps × brains × seeds). `expandMatrix`
 * turns a sparse spec into a full `MatchConfig[]`; `runBatch`
 * executes them serially (see note below); `aggregate` groups
 * results and computes balance statistics.
 *
 * Serial execution: with the sim running at ~1000× realtime, a
 * 1000-match sweep finishes in ~40s on a single thread — fast
 * enough for most balance-testing workflows. `worker_threads`
 * parallelism is a future Phase 4 win; today's bottleneck is
 * pathfinding + trait ticks, which don't benefit from threading
 * until the batch is 10k+ matches.
 */
import { FactionId } from '../data/Factions';
import { DifficultyLevel } from '../data/Difficulty';
import { MapId } from '../data/Maps';
import { MatchConfig, MatchResult } from './types';
import { runMatch } from './HeadlessMatch';

/** Sparse specification of a config sweep. Each array field
 *  becomes a dimension in the Cartesian product. `seedsPerCell`
 *  determines how many distinct seeds to run per unique (faction,
 *  difficulty, map, brain, mode) combination — higher values
 *  reduce variance in win-rate estimates at linear cost. */
export interface MatrixSpec {
  factions: FactionId[];
  difficulties: DifficultyLevel[];
  maps: MapId[];
  brains: string[];
  matchModes: ('standard' | 'endless')[];
  /** How many seeds to run per combination. Seeds are generated
   *  deterministically from a base seed so the full batch is
   *  reproducible. */
  seedsPerCell: number;
  /** Base seed — per-cell seeds derive from this via a simple
   *  hash. Change it to get a fresh batch with the same shape. */
  baseSeed: number;
  /** Waves per match. Standard uses this as the max wave cap;
   *  endless stops at whichever comes first (loss or cap). */
  waveCount?: number;
}

export function expandMatrix(spec: MatrixSpec): MatchConfig[] {
  const configs: MatchConfig[] = [];
  for (const faction of spec.factions) {
    for (const difficulty of spec.difficulties) {
      for (const mapId of spec.maps) {
        for (const brainId of spec.brains) {
          for (const matchMode of spec.matchModes) {
            for (let s = 0; s < spec.seedsPerCell; s++) {
              configs.push({
                faction, difficulty, mapId, brainId, matchMode,
                waveCount: spec.waveCount,
                // Mix the per-cell index into the base seed so each
                // seed is distinct across dimensions but globally
                // reproducible from `baseSeed`.
                seed: (spec.baseSeed * 31 + s * 7919) >>> 0,
              });
            }
          }
        }
      }
    }
  }
  return configs;
}

/** Run a batch of matches serially. Calls `onProgress` every
 *  `progressEvery` matches so callers can print a heartbeat for
 *  long sweeps. */
export async function runBatch(
  configs: MatchConfig[],
  opts: { onProgress?: (done: number, total: number, last: MatchResult) => void; progressEvery?: number } = {},
): Promise<MatchResult[]> {
  const results: MatchResult[] = [];
  const progressEvery = opts.progressEvery ?? 50;
  for (let i = 0; i < configs.length; i++) {
    const r = await runMatch(configs[i]);
    results.push(r);
    if ((i + 1) % progressEvery === 0 || i === configs.length - 1) {
      opts.onProgress?.(i + 1, configs.length, r);
    }
  }
  return results;
}

export interface CellStats {
  key: string;
  n: number;
  winRate: number;
  avgWaveReached: number;
  avgLivesRemaining: number;
  avgCreepsKilled: number;
  avgTowersBuilt: number;
  avgGoldEarned: number;
  errorRate: number;
}

/** Group results by (faction, difficulty, mapId, brainId, matchMode)
 *  and compute balance statistics for each cell. */
export function aggregate(results: MatchResult[]): CellStats[] {
  const buckets = new Map<string, MatchResult[]>();
  for (const r of results) {
    const key = `${r.config.faction}|${r.config.difficulty}|${r.config.mapId}|${r.config.brainId}|${r.config.matchMode}`;
    const arr = buckets.get(key);
    if (arr) arr.push(r); else buckets.set(key, [r]);
  }
  const stats: CellStats[] = [];
  for (const [key, rs] of buckets) {
    const wins = rs.filter(r => r.outcome === 'win').length;
    const errors = rs.filter(r => r.outcome === 'error').length;
    const n = rs.length;
    stats.push({
      key, n,
      winRate: wins / n,
      errorRate: errors / n,
      avgWaveReached: avg(rs.map(r => r.waveReached)),
      avgLivesRemaining: avg(rs.map(r => r.livesRemaining)),
      avgCreepsKilled: avg(rs.map(r => r.creepsKilled)),
      avgTowersBuilt: avg(rs.map(r => r.towersBuilt)),
      avgGoldEarned: avg(rs.map(r => r.goldEarned)),
    });
  }
  stats.sort((a, b) => a.key.localeCompare(b.key));
  return stats;
}

/** Format aggregated stats as a markdown table — copy-paste
 *  friendly for pasting into balance notes. */
export function formatReport(stats: CellStats[]): string {
  const lines: string[] = [];
  lines.push('| cell | N | win% | avg wave | avg lives | avg kills | avg towers | avg gold | err% |');
  lines.push('|------|---|------|----------|-----------|-----------|------------|----------|------|');
  for (const s of stats) {
    lines.push(
      `| ${s.key} | ${s.n} | ${pct(s.winRate)} | ${s.avgWaveReached.toFixed(1)} | ` +
      `${s.avgLivesRemaining.toFixed(1)} | ${s.avgCreepsKilled.toFixed(0)} | ` +
      `${s.avgTowersBuilt.toFixed(1)} | ${s.avgGoldEarned.toFixed(0)} | ${pct(s.errorRate)} |`,
    );
  }
  return lines.join('\n');
}

function avg(xs: number[]): number {
  if (xs.length === 0) return 0;
  let s = 0;
  for (const x of xs) s += x;
  return s / xs.length;
}

function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}
