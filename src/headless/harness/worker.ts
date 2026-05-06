/**
 * Worker process entry. Reads JSON lines from stdin one at a time,
 * runs each task, prints JSON results to stdout, exits on EOF.
 *
 * Spawned as a separate Node process (not worker_thread) so
 * `--import tsx` works normally and TOWER_TYPES mutations stay
 * isolated per worker — any lingering state from a task dies with
 * the process.
 *
 * Protocol:
 *   stdin line 1:      { matrix: HarnessMatrixSpec }
 *   stdin line 2..N:   { task: Task }      (one per line)
 *   stdin EOF:         exit cleanly
 *   stdout lines:      {type:'ready'}               (after init)
 *                      {type:'taskDone', taskId, best}
 *                      {type:'error',    taskId, message}
 *
 * The parent drives dispatch — worker just pulls the next line,
 * runs it, reports, repeats. This is what enables work-stealing:
 * the parent can hand the next task to whichever worker finished
 * first, instead of splitting the work up-front.
 */
// Side-effect import — installs the jsdom shim so Phaser's
// browser-globals don't explode at module load time. Must run
// BEFORE any game import.
import './jsdom-setup';
import { runSingle, HarnessMatrixSpec } from './HarnessRunner';
import { createInterface } from 'node:readline';

interface Task {
  kind: 'baseline' | 'change';
  id?: string;
}

function send(obj: unknown): void {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

async function main(): Promise<void> {
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  let matrix: HarnessMatrixSpec | null = null;

  // Queue incoming lines — we can't process a task until init is
  // done, and we don't want to drop lines that arrive during a
  // long-running task.
  const pending: { task: Task }[] = [];
  let processing = false;

  const processQueue = async () => {
    if (processing) return;
    processing = true;
    while (pending.length > 0) {
      const { task } = pending.shift()!;
      const taskId = task.kind === 'change' ? (task.id ?? '?') : 'baseline';
      try {
        const { best } = await runSingle(matrix!, task.kind === 'change' ? (task.id ?? null) : null);
        send({ type: 'taskDone', taskId, best });
      } catch (err) {
        send({ type: 'error', taskId, message: (err as Error).message });
      }
    }
    processing = false;
  };

  rl.on('line', (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let obj: any;
    try { obj = JSON.parse(trimmed); } catch { return; }

    if (obj.matrix) {
      matrix = obj.matrix as HarnessMatrixSpec;
      send({ type: 'ready' });
      return;
    }
    if (obj.task) {
      if (!matrix) {
        send({ type: 'error', taskId: obj.task.id, message: 'task received before matrix init' });
        return;
      }
      pending.push({ task: obj.task });
      processQueue();
    }
  });

  // EOF — parent closed stdin. Wait for any in-flight task to
  // finish, then exit.
  await new Promise<void>(resolveP => rl.on('close', resolveP));
  while (processing) await new Promise(r => setTimeout(r, 50));
}

main().catch(err => {
  send({ type: 'error', taskId: '?', message: (err as Error).message });
  process.exit(1);
});
