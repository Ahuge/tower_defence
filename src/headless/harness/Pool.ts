/**
 * Parallel harness runner — spawns N node child processes, dispatches
 * `baseline + catalog[]` tasks to them one-at-a-time (work-stealing),
 * and collects results via stdin/stdout JSON.
 *
 * Each child is a separate Node process (spawned with `--import
 * tsx` so TypeScript loads natively). This gives:
 *   - true heap isolation — TOWER_TYPES mutations in one child
 *     don't leak into siblings
 *   - clean `--import tsx` handling (worker_threads swallowed
 *     these in testing)
 *   - long-lived worker so startup cost (jsdom + Phaser import,
 *     ~2-3s) is amortised across many tasks
 *
 * Load balancing: work-stealing, not round-robin shards. The parent
 * holds the task queue; each worker, as it finishes, is fed the next
 * task. Prevents one slow shard (eg. the full-matrix baseline) from
 * becoming the critical path.
 *
 * Crash recovery: every completed task is appended to
 * `<runDir>/tasks.jsonl` as a single line before the parent
 * acknowledges it. On restart with --resume, the file is read
 * back and matching task IDs are skipped, so a crash only
 * costs the in-flight tasks.
 *
 * Protocol:
 *   parent → child stdin  (line-delimited JSON):
 *     { matrix }                  // first line, initialises worker
 *     { task: Task }              // subsequent lines, one per task
 *     (EOF)                       // worker exits cleanly
 *   child  → parent stdout:
 *     { type: 'ready' }           // after init, ready for first task
 *     { type: 'taskDone', taskId, best }
 *     { type: 'error',    taskId, message }
 */
import { spawn, ChildProcess } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, appendFileSync, mkdirSync } from 'node:fs';
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

/** Walk up from the harness module looking for node_modules/tsx. */
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

export interface WorkerStatus {
  index: number;
  state: 'starting' | 'idle' | 'busy' | 'exited';
  currentTask: string | null;
  taskStartMs: number | null;
  tasksCompleted: number;
}

export interface ProgressEvent {
  kind: 'taskStart' | 'taskDone' | 'taskError' | 'workerReady' | 'workerExit';
  taskId?: string;
  workerIndex: number;
  done: number;
  total: number;
  workers: WorkerStatus[];
  message?: string;
}

export type ProgressListener = (ev: ProgressEvent) => void;

export interface RunHarnessParallelOpts {
  catalog?: BalanceChange[];
  matrix?: HarnessMatrixSpec;
  workers?: number;
  log?: (msg: string) => void;
  /** Directory for persistent per-task state. When set, each taskDone
   *  is appended to `<runDir>/tasks.jsonl` so a crashed run can be
   *  resumed. When unset (tests), no persistence. */
  runDir?: string;
  /** Called on every state transition so a caller can render a
   *  live dashboard. */
  onProgress?: ProgressListener;
}

interface LoadedCheckpoint {
  completed: Map<string, FactionBestStats[]>;
}

/** Read `<runDir>/tasks.jsonl` if present and return the map of
 *  taskId → best. Skips malformed lines rather than failing — a
 *  crash mid-append could leave one partial line behind. */
function loadCheckpoint(runDir: string | undefined): LoadedCheckpoint {
  const completed = new Map<string, FactionBestStats[]>();
  if (!runDir) return { completed };
  const path = join(runDir, 'tasks.jsonl');
  if (!existsSync(path)) return { completed };
  const raw = readFileSync(path, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed) as { taskId: string; best: FactionBestStats[] };
      if (obj && obj.taskId && Array.isArray(obj.best)) {
        completed.set(obj.taskId, obj.best);
      }
    } catch {
      // Partial write from a crash — ignore.
    }
  }
  return { completed };
}

function appendCheckpoint(runDir: string | undefined, taskId: string, best: FactionBestStats[]): void {
  if (!runDir) return;
  try {
    mkdirSync(runDir, { recursive: true });
    appendFileSync(join(runDir, 'tasks.jsonl'), JSON.stringify({ taskId, best }) + '\n');
  } catch {
    // Disk full / permissions — don't kill the run. Log via caller.
  }
}

/** Spawn one worker process, keep it alive, feed it tasks one at a
 *  time from the shared queue. Resolves when the queue is empty
 *  AND the worker has exited cleanly. */
function startWorker(
  index: number,
  queue: Task[],
  matrix: HarnessMatrixSpec,
  sink: Map<string, FactionBestStats[]>,
  runDir: string | undefined,
  log: (msg: string) => void,
  total: number,
  progress: { done: number },
  statuses: WorkerStatus[],
  onProgress: ProgressListener | undefined,
): Promise<void> {
  return new Promise((resolveP, rejectP) => {
    const projectRoot = resolve(HERE, '..', '..', '..');
    const args: string[] = [];
    if (hasTsx()) args.push('--import', 'tsx');
    args.push(WORKER_ENTRY);

    // Pipe stderr into the log file (if runDir) rather than the
    // terminal, so the live dashboard isn't clobbered by worker
    // stack traces. Still captured for post-mortem.
    const child: ChildProcess = spawn(process.execPath, args, {
      cwd: projectRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });

    // Fold worker stderr into run.log if we have one.
    if (runDir) {
      const logFile = join(runDir, 'worker-stderr.log');
      child.stderr!.on('data', (chunk: Buffer) => {
        try { appendFileSync(logFile, `[w${index}] ${chunk.toString('utf8')}`); } catch { /* ignore */ }
      });
    } else {
      child.stderr!.on('data', (chunk: Buffer) => {
        process.stderr.write(`[w${index}] ${chunk.toString('utf8')}`);
      });
    }

    const status = statuses[index];

    const emit = (ev: Partial<ProgressEvent>) => {
      if (!onProgress) return;
      onProgress({
        kind: ev.kind ?? 'taskDone',
        taskId: ev.taskId,
        workerIndex: index,
        done: progress.done,
        total,
        workers: statuses,
        message: ev.message,
      });
    };

    const sendTaskOrFinish = () => {
      const next = queue.shift();
      if (!next) {
        // Nothing left — tell the worker to exit.
        status.state = 'idle';
        child.stdin!.end();
        return;
      }
      const taskId = next.kind === 'change' ? (next.id ?? '?') : 'baseline';
      status.state = 'busy';
      status.currentTask = taskId;
      status.taskStartMs = Date.now();
      emit({ kind: 'taskStart', taskId });
      child.stdin!.write(JSON.stringify({ task: next }) + '\n');
    };

    const rl = createInterface({ input: child.stdout!, crlfDelay: Infinity });
    rl.on('line', (line) => {
      if (!line.trim()) return;
      let msg: any;
      try { msg = JSON.parse(line); } catch { return; }

      if (msg.type === 'ready') {
        status.state = 'idle';
        emit({ kind: 'workerReady' });
        sendTaskOrFinish();
      } else if (msg.type === 'taskDone') {
        sink.set(msg.taskId, msg.best);
        appendCheckpoint(runDir, msg.taskId, msg.best);
        progress.done++;
        status.tasksCompleted++;
        const elapsed = status.taskStartMs ? ((Date.now() - status.taskStartMs) / 1000).toFixed(1) : '?';
        log(`[harness] ✓ ${msg.taskId.padEnd(16)} (${progress.done}/${total}) [w${index} ${elapsed}s]`);
        status.currentTask = null;
        status.taskStartMs = null;
        emit({ kind: 'taskDone', taskId: msg.taskId });
        sendTaskOrFinish();
      } else if (msg.type === 'error') {
        log(`[harness] ✗ ${msg.taskId ?? '?'}: ${msg.message}`);
        emit({ kind: 'taskError', taskId: msg.taskId, message: msg.message });
        // Worker state is tainted — we can't trust it to continue
        // since TOWER_TYPES patches revert by throw. Let it die and
        // the surviving workers will pick up remaining work.
        child.stdin!.end();
      }
    });

    // Kick things off: send matrix, wait for 'ready'.
    child.stdin!.write(JSON.stringify({ matrix }) + '\n');
    status.state = 'starting';

    child.on('error', (err) => rejectP(err));
    child.on('exit', (code) => {
      status.state = 'exited';
      emit({ kind: 'workerExit', message: `code=${code}` });
      if (code !== 0 && code !== null) {
        // Don't fail the whole run — one crashed worker just means
        // its in-flight task is lost; the parent's queue still has
        // unclaimed tasks, and surviving workers drain them.
        log(`[harness] worker ${index} exited with code ${code}`);
      }
      resolveP();
    });
  });
}

export async function runHarnessParallel(opts: RunHarnessParallelOpts = {}): Promise<HarnessResults> {
  const catalog = opts.catalog ?? CATALOG;
  const matrix = opts.matrix ?? DEFAULT_MATRIX;
  const log = opts.log ?? (() => {});
  const { availableParallelism } = await import('node:os');
  const workers = opts.workers ?? Math.min(catalog.length + 1, availableParallelism());
  const runDir = opts.runDir;

  const allTasks: Task[] = [
    { kind: 'baseline' },
    ...catalog.map(c => ({ kind: 'change' as const, id: c.id })),
  ];

  // Resume support — load any previously-completed tasks from the
  // checkpoint file and drop them from the queue.
  const { completed } = loadCheckpoint(runDir);
  const sink = new Map<string, FactionBestStats[]>(completed);
  const remaining = allTasks.filter(t => {
    const id = t.kind === 'change' ? (t.id ?? '') : 'baseline';
    return !completed.has(id);
  });

  if (completed.size > 0) {
    log(`[harness] resumed ${completed.size}/${allTasks.length} from ${runDir}/tasks.jsonl — ${remaining.length} remaining`);
  }

  if (remaining.length === 0) {
    log(`[harness] all ${allTasks.length} tasks already in checkpoint — nothing to run`);
  } else {
    const actualWorkers = Math.min(workers, remaining.length);
    log(`[harness] dispatching ${remaining.length} tasks to ${actualWorkers} workers (work-stealing)`);

    const statuses: WorkerStatus[] = Array.from({ length: actualWorkers }, (_, i) => ({
      index: i,
      state: 'starting',
      currentTask: null,
      taskStartMs: null,
      tasksCompleted: 0,
    }));
    const progress = { done: completed.size };
    const queue = remaining.slice();

    const t0 = Date.now();
    await Promise.all(
      Array.from({ length: actualWorkers }, (_, i) =>
        startWorker(i, queue, matrix, sink, runDir, log, allTasks.length, progress, statuses, opts.onProgress),
      ),
    );
    const elapsed = (Date.now() - t0) / 1000;
    log(`[harness] all workers done in ${elapsed.toFixed(1)}s`);
  }

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
