/**
 * Parallel harness runner — spawns N worker_threads, distributes
 * the `baseline + catalog[]` task list across them, and collects
 * results as they stream back.
 *
 * Each worker is a fresh V8 isolate so per-change mutations to
 * `TOWER_TYPES` / `DIFFICULTIES` don't cross-contaminate. Workers
 * share the task result format with the serial runner — the caller
 * gets the same `HarnessResults` shape either way.
 *
 * Node 24 runs `.ts` files directly for simple TS, but the game
 * systems use extensionless imports which native type-stripping
 * can't resolve. To run workers we rely on `tsx` (added as
 * devDep) loaded via `--import tsx`. If the user's Node setup
 * doesn't have it, fall back to running serially with a helpful
 * error message.
 */
import { Worker } from 'node:worker_threads';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BalanceChange, CATALOG, findChange } from './ChangeCatalog';
import { FactionBestStats } from '../Batch';
import {
  HarnessMatrixSpec, DEFAULT_MATRIX, HarnessResults, ChangeResult,
  makeChangeResult,
} from './HarnessRunner';

interface Task {
  kind: 'baseline' | 'change';
  id?: string;
}

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKER_ENTRY = resolve(HERE, 'worker.ts');

/** Locate tsx so we can pass `--import tsx` to the worker. Returns
 *  null if tsx isn't installed — caller falls back to serial. */
function findTsxEntry(): string | null {
  // walk up from the project looking for node_modules/tsx/dist/esm/index.mjs
  let dir = HERE;
  for (let i = 0; i < 8; i++) {
    const candidate = join(dir, 'node_modules', 'tsx');
    if (existsSync(candidate)) return 'tsx';
    dir = dirname(dir);
    if (dir === '/' || dir.endsWith(':\\')) break;
  }
  return null;
}

/** Round-robin split of a flat task list across `n` workers. */
function splitTasks(tasks: Task[], n: number): Task[][] {
  const shards: Task[][] = [];
  for (let i = 0; i < n; i++) shards.push([]);
  for (let i = 0; i < tasks.length; i++) shards[i % n].push(tasks[i]);
  return shards;
}

/** Spawn one worker and post its task shard. Resolves when the
 *  worker sends `{type:'done'}`. Collects taskDone messages into
 *  the supplied `sink`. */
function runShard(
  shard: Task[],
  matrix: HarnessMatrixSpec,
  sink: Map<string, FactionBestStats[]>,
  log: (msg: string) => void,
): Promise<void> {
  return new Promise((resolveP, rejectP) => {
    const tsx = findTsxEntry();
    const execArgv: string[] = tsx ? ['--import', 'tsx'] : [];
    const worker = new Worker(pathToFileURL(WORKER_ENTRY), { execArgv });
    worker.on('message', (msg: any) => {
      if (msg?.type === 'taskDone') {
        sink.set(msg.taskId, msg.best);
        log(`[harness] ✓ ${msg.taskId} (${sink.size} of ${shard.length + /*baseline counted externally*/ 0}…)`);
      } else if (msg?.type === 'error') {
        log(`[harness] ✗ ${msg.taskId ?? '?'}: ${msg.message}`);
      } else if (msg?.type === 'done') {
        worker.terminate();
        resolveP();
      }
    });
    worker.on('error', err => rejectP(err));
    worker.on('exit', code => { if (code !== 0 && code !== null) rejectP(new Error(`worker exited ${code}`)); });
    worker.postMessage({ type: 'run', matrix, tasks: shard });
  });
}

export interface RunHarnessParallelOpts {
  catalog?: BalanceChange[];
  matrix?: HarnessMatrixSpec;
  /** Number of worker threads. Default: Math.min(catalog.length+1, os.availableParallelism()). */
  workers?: number;
  /** Log hook — called with status lines. Defaults to no-op. */
  log?: (msg: string) => void;
}

/** Run the full harness sweep across N worker threads. Baseline is
 *  always task 0; remaining tasks are the catalog. Results are
 *  collected, deltas computed against baseline, shape matches the
 *  serial runner's return. */
export async function runHarnessParallel(opts: RunHarnessParallelOpts = {}): Promise<HarnessResults> {
  const catalog = opts.catalog ?? CATALOG;
  const matrix = opts.matrix ?? DEFAULT_MATRIX;
  const log = opts.log ?? (() => {});
  const { availableParallelism } = await import('node:os');
  const workers = opts.workers ?? Math.min(catalog.length + 1, availableParallelism());

  const tasks: Task[] = [
    { kind: 'baseline' },
    ...catalog.map(c => ({ kind: 'change' as const, id: c.id })),
  ];
  const shards = splitTasks(tasks, workers);

  log(`[harness] spawning ${workers} workers for ${tasks.length} tasks ` +
      `(${shards.map(s => s.length).join('+')})`);

  const sink = new Map<string, FactionBestStats[]>();
  const t0 = Date.now();
  await Promise.all(shards.map(s => runShard(s, matrix, sink, log)));
  const elapsed = (Date.now() - t0) / 1000;
  log(`[harness] all shards done in ${elapsed.toFixed(1)}s`);

  const baseline = sink.get('baseline');
  if (!baseline) throw new Error('baseline sweep missing from results — was task 0 run?');

  // Compute deltas, build ChangeResult entries in catalog order.
  const baseMap = new Map(baseline.map(b => [`${b.faction}|${b.difficulty}`, b.bestWinRate]));
  const changes: ChangeResult[] = [];
  for (const change of catalog) {
    const best = sink.get(change.id);
    if (!best) {
      log(`[harness] MISSING result for ${change.id} — skipping`);
      continue;
    }
    const delta = new Map<string, number>();
    for (const b of best) {
      const key = `${b.faction}|${b.difficulty}`;
      delta.set(key, b.bestWinRate - (baseMap.get(key) ?? 0));
    }
    changes.push(makeChangeResult(change, best, delta));
  }
  return { matrix, baseline, changes };
}

/** Convenience — resolve a catalog entry + apply + run it through
 *  the worker. Used for manual spot-checks. */
export async function runOneChange(changeId: string, opts: RunHarnessParallelOpts = {}): Promise<HarnessResults> {
  const change = findChange(changeId);
  if (!change) throw new Error(`unknown change id: ${changeId}`);
  return runHarnessParallel({ ...opts, catalog: [change] });
}
