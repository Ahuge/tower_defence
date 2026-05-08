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
  /** v4.3: optional director params injected via COUNTER_PICK_PARAMS
   *  env var. When the searched side is the director itself, these
   *  override the registered factory's default params. When the
   *  searched side is the defender (legacy v3 path), these freeze the
   *  director's behaviour at a known state across all evals so search
   *  noise is reduced. */
  directorParams?: Record<string, number>;
  /** v4.3: which env-var name to use for the director. Defaults to
   *  COUNTER_PICK_PARAMS. Future directors register their own env
   *  prefix; the runner picks the right name. */
  directorEnvVar?: string;
  /** v5.2: optional faction-balance params to inject. Keys are
   *  dot-paths from FactionBalanceSchema (`<towerId>.<field>` or
   *  `<towerId>.traits.<traitId>.<param>`). Forwarded to env var
   *  `FACTION_BALANCE_<FACTION>_PARAMS` before the match runs;
   *  HeadlessMatch's loader patches TOWER_TYPES from there. */
  factionBalanceParams?: Record<string, number>;
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
      // Inject params via env keyed off the brain id so each brain's
      // loadParamsFromEnv picks them up at construction time. Each
      // match reconstructs the brain (BRAIN_REGISTRY factory), so the
      // env mutation takes effect on the very next runMatch() call.
      const envVar = `${(t.config.brainId || 'balanced').toUpperCase()}_BRAIN_PARAMS`;
      process.env[envVar] = JSON.stringify(t.params);
      // v4.3: also inject director params when present.
      if (t.directorParams && t.directorEnvVar) {
        process.env[t.directorEnvVar] = JSON.stringify(t.directorParams);
      } else if (t.directorEnvVar) {
        // Explicit absence: clear the env var so the director uses
        // its registered defaults (not stale params from a prior task).
        delete process.env[t.directorEnvVar];
      }
      // v5.2: faction-balance params, scoped to the match's faction.
      // Always clear ALL FACTION_BALANCE_* vars first so a stale
      // patch from a prior task can't leak. Then set the one for
      // this task's faction if present.
      for (const k of Object.keys(process.env)) {
        if (k.startsWith('FACTION_BALANCE_')) delete process.env[k];
      }
      if (t.factionBalanceParams && t.config.faction) {
        const factionVar = `FACTION_BALANCE_${t.config.faction.toUpperCase()}_PARAMS`;
        process.env[factionVar] = JSON.stringify(t.factionBalanceParams);
      }
      try {
        const r = await runMatch(t.config);
        send({
          taskId: t.taskId,
          outcome: r.outcome,
          waveReached: r.waveReached,
          livesRemaining: r.livesRemaining,
          // v3.4 M3: forward tower-id distribution so the runner can
          // compute placement diversity (Shannon entropy) for the
          // diversity-weighted fitness term.
          towerIdCounts: r.towerIdCounts,
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
