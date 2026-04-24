/**
 * Parallel harness runner — spawns N node child processes (one
 * per CPU), distributes the `baseline + catalog[]` task list
 * across them, and collects results via stdin/stdout JSON.
 *
 * Each child is a separate Node process (spawned with `--import
 * tsx` so TypeScript loads natively). This gives:
 *   - true heap isolation — TOWER_TYPES mutations in one child
 *     don't leak into siblings
 *   - clean `--import tsx` + `--experimental-vm-modules` handling
 *     (worker_threads ignored these in testing)
 *   - same-process-per-shard so startup cost is amortised across
 *     the shard's tasks
 *
 * Protocol: parent writes JSON objects, one per line, to the child's
 * stdin; child writes one JSON object per line to stdout. No
 * explicit close — when the parent's writable end finishes, the
 * child's stdin EOFs and the child exits cleanly.
 */
import { spawn, ChildProcess } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline';
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

/** Walk up from the harness module looking for node_modules/tsx.
 *  Returns the bare specifier `tsx` if found — Node resolves it
 *  via NODE_PATH when the child is launched with cwd at the
 *  project root. */
function hasTsx(): boolean {
  let dir = HERE;
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, 'node_modules', 'tsx'))) return true;
    const next = dirname(dir);
    if (next === dir) break;
    dir = next;
  }
  return false;
}

/** Round-robin split — tasks[i] goes to shard[i % n]. */
function splitTasks(tasks: Task[], n: number): Task[][] {
  const shards: Task[][] = [];
  for (let i = 0; i < n; i++) shards.push([]);
  for (let i = 0; i < tasks.length; i++) shards[i % n].push(tasks[i]);
  return shards;
}

interface ShardResult {
  results: Map<string, FactionBestStats[]>;
  errors: { taskId: string; message: string }[];
}

/** Spawn one child process, pipe it the task shard, collect
 *  results. Returns the merged shard result when the child exits. */
function runShard(
  shard: Task[],
  matrix: HarnessMatrixSpec,
  sink: Map<string, FactionBestStats[]>,
  log: (msg: string) => void,
  total: number,
  progress: { done: number },
): Promise<void> {
  if (shard.length === 0) return Promise.resolve();
  return new Promise((resolveP, rejectP) => {
    const projectRoot = resolve(HERE, '..', '..', '..');
    const args: string[] = [];
    if (hasTsx()) args.push('--import', 'tsx');
    args.push(WORKER_ENTRY);
    const child: ChildProcess = spawn(process.execPath, args, {
      cwd: projectRoot,
      stdio: ['pipe', 'pipe', 'inherit'],
      env: process.env,
    });

    // Line-buffered JSON protocol.
    const rl = createInterface({ input: child.stdout!, crlfDelay: Infinity });
    rl.on('line', (line) => {
      if (!line.trim()) return;
      let msg: any;
      try { msg = JSON.parse(line); } catch { return; }
      if (msg.type === 'taskDone') {
        sink.set(msg.taskId, msg.best);
        progress.done++;
        log(`[harness] ✓ ${msg.taskId.padEnd(16)} (${progress.done}/${total})`);
      } else if (msg.type === 'error') {
        log(`[harness] ✗ ${msg.taskId ?? '?'}: ${msg.message}`);
      }
    });

    child.on('error', (err) => rejectP(err));
    child.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        rejectP(new Error(`worker exited with code ${code}`));
      } else {
        resolveP();
      }
    });

    // Send each task as a JSON line. Close stdin after — child
    // reads until EOF then processes each task in order.
    const payload = { matrix, tasks: shard };
    child.stdin!.write(JSON.stringify(payload) + '\n');
    child.stdin!.end();
  });
}

export interface RunHarnessParallelOpts {
  catalog?: BalanceChange[];
  matrix?: HarnessMatrixSpec;
  workers?: number;
  log?: (msg: string) => void;
}

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
  const nonEmptyShardCount = shards.filter(s => s.length > 0).length;

  log(`[harness] spawning ${nonEmptyShardCount} worker processes for ${tasks.length} tasks ` +
      `(shards: ${shards.map(s => s.length).filter(n => n > 0).join(',')})`);

  const sink = new Map<string, FactionBestStats[]>();
  const progress = { done: 0 };
  const t0 = Date.now();
  await Promise.all(shards.map(s => runShard(s, matrix, sink, log, tasks.length, progress)));
  const elapsed = (Date.now() - t0) / 1000;
  log(`[harness] all shards done in ${elapsed.toFixed(1)}s`);

  const baseline = sink.get('baseline');
  if (!baseline) throw new Error('baseline sweep missing from results');

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

export async function runOneChange(changeId: string, opts: RunHarnessParallelOpts = {}): Promise<HarnessResults> {
  const change = findChange(changeId);
  if (!change) throw new Error(`unknown change id: ${changeId}`);
  return runHarnessParallel({ ...opts, catalog: [change] });
}
