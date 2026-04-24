/**
 * Worker thread entry. Runs one or more sweeps (baseline + a
 * subset of changes) and posts results back to the parent.
 *
 * Each worker has its own V8 heap + fresh module imports, so
 * `TOWER_TYPES` / `DIFFICULTIES` mutations by one worker don't
 * leak into siblings. That's the isolation that makes running
 * many A/B patches in parallel safe.
 *
 * Protocol (over parentPort):
 *   Parent → Worker: { type: 'run', matrix, tasks: [{ kind, id? }] }
 *   Worker → Parent: { type: 'progress', taskIdx, done, total }  (optional)
 *   Worker → Parent: { type: 'taskDone', taskIdx, best }
 *   Worker → Parent: { type: 'done' }
 *   Worker → Parent: { type: 'error', message }
 */
import { parentPort } from 'node:worker_threads';
import { runSingle, HarnessMatrixSpec } from './HarnessRunner';
import { FactionBestStats } from '../Batch';

interface Task {
  /** 'baseline' runs with no patch applied; 'change' applies the
   *  named change from the catalog. */
  kind: 'baseline' | 'change';
  id?: string; // required when kind === 'change'
}

interface RunMessage {
  type: 'run';
  matrix: HarnessMatrixSpec;
  tasks: Task[];
}

interface TaskDoneMessage {
  type: 'taskDone';
  taskIdx: number;
  taskId: string;             // 'baseline' or the change id
  best: FactionBestStats[];
}

async function handleRun(msg: RunMessage): Promise<void> {
  for (let i = 0; i < msg.tasks.length; i++) {
    const task = msg.tasks[i];
    try {
      const { best } = await runSingle(msg.matrix, task.kind === 'change' ? (task.id ?? null) : null);
      const reply: TaskDoneMessage = {
        type: 'taskDone',
        taskIdx: i,
        taskId: task.kind === 'change' ? (task.id ?? '?') : 'baseline',
        best,
      };
      parentPort?.postMessage(reply);
    } catch (err) {
      parentPort?.postMessage({
        type: 'error',
        taskIdx: i,
        taskId: task.kind === 'change' ? (task.id ?? '?') : 'baseline',
        message: (err as Error).message,
      });
    }
  }
  parentPort?.postMessage({ type: 'done' });
}

parentPort?.on('message', (msg: any) => {
  if (msg?.type === 'run') {
    handleRun(msg as RunMessage).catch(err => {
      parentPort?.postMessage({ type: 'error', message: (err as Error).message });
    });
  }
});
