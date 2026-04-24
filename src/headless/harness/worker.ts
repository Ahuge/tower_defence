/**
 * Worker process entry. Reads one JSON payload from stdin,
 * runs the listed tasks (baseline + subset of changes), prints
 * one JSON result per line to stdout, exits cleanly.
 *
 * Spawned as a separate Node process (not worker_thread) so
 * `--import tsx` works normally and TOWER_TYPES mutations stay
 * isolated per shard.
 *
 * Protocol:
 *   stdin  (single line, then EOF): { matrix, tasks: Task[] }
 *   stdout (one JSON per line):     {type:'taskDone', taskId, best}
 *                                   {type:'error',    taskId, message}
 */
// Side-effect import — installs the jsdom shim so Phaser's
// browser-globals don't explode at module load time. Must run
// BEFORE any game import.
import './jsdom-setup';
import { runSingle, HarnessMatrixSpec } from './HarnessRunner';
import { FactionBestStats } from '../Batch';

interface Task {
  kind: 'baseline' | 'change';
  id?: string;
}

interface Payload {
  matrix: HarnessMatrixSpec;
  tasks: Task[];
}

function send(obj: unknown): void {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

async function readStdin(): Promise<string> {
  return new Promise((resolvePromise, rejectPromise) => {
    const chunks: Buffer[] = [];
    process.stdin.on('data', c => chunks.push(c));
    process.stdin.on('end', () => resolvePromise(Buffer.concat(chunks).toString('utf8')));
    process.stdin.on('error', rejectPromise);
  });
}

async function main(): Promise<void> {
  const raw = await readStdin();
  const payload = JSON.parse(raw.trim()) as Payload;
  for (const task of payload.tasks) {
    const taskId = task.kind === 'change' ? (task.id ?? '?') : 'baseline';
    try {
      const { best } = await runSingle(payload.matrix, task.kind === 'change' ? (task.id ?? null) : null);
      send({ type: 'taskDone', taskId, best });
    } catch (err) {
      send({ type: 'error', taskId, message: (err as Error).message });
    }
  }
}

main().catch(err => {
  send({ type: 'error', taskId: '?', message: (err as Error).message });
  process.exit(1);
});
