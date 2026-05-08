#!/usr/bin/env node
/**
 * v5 batch runner — queues N cells through scripts/faction-balance.mjs
 * with bounded concurrency. Designed for overnight runs.
 *
 * Usage:
 *   node --import tsx scripts/v5-batch-queue.mjs \
 *     --concurrency=4 --max-rounds=5 \
 *     [--cells=mechanical,military,nature,...]   # default = all 11
 *
 * Output: each cell writes to brain-search/v5-{faction}-{difficulty}/
 * with self-play.log + convergence.json, plus a top-level
 * brain-search/v5-batch-queue.log tracking which cells started/finished.
 */
import { spawn } from 'node:child_process';
import { mkdirSync, appendFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');
const FACTION_BALANCE_SCRIPT = resolve(PROJECT_ROOT, 'scripts/faction-balance.mjs');

const argv = process.argv.slice(2);
const getFlag = (name) => {
  const m = argv.find(a => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!m) return null;
  return m.includes('=') ? m.split('=').slice(1).join('=') : '';
};
const CONCURRENCY = parseInt(getFlag('concurrency') ?? '4', 10);
const MAX_ROUNDS = getFlag('max-rounds') ?? '5';
const CELL_WORKERS = getFlag('cell-workers') ?? '4';
const FACTION_EVALS = getFlag('faction-evals') ?? '150';
const DEFENDER_EVALS = getFlag('defender-evals') ?? '200';

const DEFAULT_CELLS = [
  // Tier 1: structurally unwinnable in v3.5 — most actionable for v5
  ['mechanical', 'normal'],
  ['military', 'normal'],
  ['nature', 'normal'],
  ['celestial', 'normal'],
  // Tier 2: low single-digit win rates, lots of headroom
  ['harmonic', 'normal'],
  ['psionic', 'normal'],
  ['cypherpunk', 'normal'],
  ['arcane', 'normal'],   // mazing not picked here in production but worth checking
  // Tier 3: already winning at v3.5 — verify no regression
  ['void', 'normal'],
  ['aliens', 'normal'],
  ['infernal', 'normal'],
];

const cellsArg = getFlag('cells');
const cells = cellsArg
  ? cellsArg.split(',').map(s => {
      const parts = s.split(':');
      return [parts[0], parts[1] ?? 'normal'];
    })
  : DEFAULT_CELLS;

mkdirSync(resolve(PROJECT_ROOT, 'brain-search'), { recursive: true });
const logPath = resolve(PROJECT_ROOT, 'brain-search', 'v5-batch-queue.log');
const log = (msg) => {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.error(line);
  try { appendFileSync(logPath, line + '\n'); } catch {}
};

log(`v5 batch queue start: ${cells.length} cells, concurrency=${CONCURRENCY}`);
log(`config: max-rounds=${MAX_ROUNDS} cell-workers=${CELL_WORKERS} faction-evals=${FACTION_EVALS} defender-evals=${DEFENDER_EVALS}`);
log(`queue: ${cells.map(c => c.join('/')).join(', ')}`);

const queue = [...cells];
const startTimes = new Map();
const endTimes = new Map();
const exitCodes = new Map();

async function runCell(faction, difficulty, workerId) {
  const cellId = `${faction}/${difficulty}`;
  const cellDir = resolve(PROJECT_ROOT, 'brain-search', `v5-${faction}-${difficulty}`);
  const completedMarker = resolve(cellDir, '.batch-complete');
  if (existsSync(completedMarker)) {
    log(`[w${workerId}] skip ${cellId} (already completed in a prior batch run)`);
    exitCodes.set(cellId, 'skipped');
    return;
  }
  const args = [
    '--import', 'tsx', FACTION_BALANCE_SCRIPT,
    `--faction=${faction}`,
    `--difficulty=${difficulty}`,
    `--max-rounds=${MAX_ROUNDS}`,
    `--workers=${CELL_WORKERS}`,
    `--faction-evals=${FACTION_EVALS}`,
    `--defender-evals=${DEFENDER_EVALS}`,
    '--resume',  // safe to always resume — fresh dirs are no-ops
  ];
  log(`[w${workerId}] start ${cellId}`);
  startTimes.set(cellId, Date.now());
  return new Promise((resolveP) => {
    const child = spawn(process.execPath, args, {
      cwd: PROJECT_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    // Pipe stdout/stderr to per-cell file (already done by faction-balance.mjs
    // via its own log). Just discard here to avoid clutter in this script's output.
    child.stdout.on('data', () => {});
    child.stderr.on('data', () => {});
    child.on('exit', (code) => {
      endTimes.set(cellId, Date.now());
      exitCodes.set(cellId, code);
      const dur = ((endTimes.get(cellId) - startTimes.get(cellId)) / 1000).toFixed(0);
      log(`[w${workerId}] done  ${cellId} exit=${code} dur=${dur}s`);
      // Write a marker file so re-running the queue doesn't redo this cell.
      try {
        appendFileSync(resolve(cellDir, '.batch-complete'), `exit=${code} ts=${new Date().toISOString()}\n`);
      } catch {}
      resolveP();
    });
  });
}

async function workerLoop(workerId) {
  while (true) {
    const next = queue.shift();
    if (!next) return;
    await runCell(next[0], next[1], workerId);
  }
}

const startTime = Date.now();
await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => workerLoop(i)));
const totalDur = ((Date.now() - startTime) / 1000 / 60).toFixed(1);

log('');
log(`v5 batch queue complete in ${totalDur} min`);
log(`results:`);
for (const cell of cells) {
  const id = cell.join('/');
  const code = exitCodes.get(id);
  const dur = startTimes.get(id) && endTimes.get(id)
    ? ((endTimes.get(id) - startTimes.get(id)) / 1000).toFixed(0) + 's'
    : 'n/a';
  log(`  ${id.padEnd(22)} exit=${code} dur=${dur}`);
}
