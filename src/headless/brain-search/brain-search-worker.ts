/**
 * Worker entry for the brain-search loop. Reads tasks from stdin,
 * each task is one match with explicit brain params (overrides the
 * brain's env-var fallback for that match only).
 *
 * Protocol:
 *   stdin (per line):  { taskId: number, config: MatchConfig, params: BrainParams }
 *   stdout (per line): { taskId, outcome: 'win'|'loss'|'error', waveReached, livesRemaining }
 *
 * Spawned as a subprocess (not worker_thread) so jsdom/Phaser
 * globals stay isolated per worker.
 */
import './../harness/jsdom-setup';
import { runMatch } from '../HeadlessMatch';
import { MatchConfig } from '../types';
import { createInterface } from 'node:readline';

interface Task {
  taskId: number;
  config: MatchConfig;
  params: Record<string, number>;
}

function send(obj: unknown): void {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

async function main(): Promise<void> {
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  const queue: Task[] = [];
  let running = false;

  const drain = async () => {
    if (running) return;
    running = true;
    while (queue.length > 0) {
      const t = queue.shift()!;
      // Inject params via env so BalancedBrain's loadParamsFromEnv
      // picks them up at construction time. Each match reconstructs
      // the brain (BRAIN_REGISTRY factory), so the env mutation
      // takes effect on the very next runMatch() call.
      process.env.BALANCED_BRAIN_PARAMS = JSON.stringify(t.params);
      try {
        const r = await runMatch(t.config);
        send({
          taskId: t.taskId,
          outcome: r.outcome,
          waveReached: r.waveReached,
          livesRemaining: r.livesRemaining,
        });
      } catch (err) {
        send({ taskId: t.taskId, outcome: 'error', waveReached: 0, livesRemaining: 0, error: (err as Error).message });
      }
    }
    running = false;
  };

  send({ type: 'ready' });

  rl.on('line', (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let obj: any;
    try { obj = JSON.parse(trimmed); } catch { return; }
    if (obj.taskId !== undefined && obj.config && obj.params) {
      queue.push(obj as Task);
      drain();
    }
  });

  await new Promise<void>(r => rl.on('close', r));
  while (running) await new Promise(r => setTimeout(r, 50));
}

main().catch(err => {
  send({ taskId: -1, outcome: 'error', waveReached: 0, livesRemaining: 0, error: (err as Error).message });
  process.exit(1);
});
