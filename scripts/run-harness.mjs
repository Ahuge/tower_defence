#!/usr/bin/env node
/**
 * CLI entry for the balance harness. Runs the full catalog across
 * N worker processes, writes persistent artifacts per run:
 *
 *   harness-runs/<timestamp>/results.json  — full per-change data (end of run)
 *   harness-runs/<timestamp>/report.md     — formatted markdown (end of run)
 *   harness-runs/<timestamp>/run.log       — full progress log
 *   harness-runs/<timestamp>/tasks.jsonl   — per-task incremental checkpoint
 *   harness-runs/<timestamp>/worker-stderr.log — captured worker stderr
 *
 * And updates the latest-copy symlinks at the project root:
 *
 *   harness-results.json  → runs/<timestamp>/results.json
 *   harness-report.md     → runs/<timestamp>/report.md
 *
 * Crash recovery:
 *   Each completed task is appended to tasks.jsonl *before* the
 *   parent acknowledges it. If the run dies, `--resume <dir>` reads
 *   those lines back and skips the completed tasks — a crash only
 *   costs the in-flight tasks.
 *
 * Usage:
 *   node --import tsx scripts/run-harness.mjs
 *   node --import tsx scripts/run-harness.mjs --workers=8
 *   node --import tsx scripts/run-harness.mjs --change=nature.4
 *   node --import tsx scripts/run-harness.mjs --seeds=100
 *   node --import tsx scripts/run-harness.mjs --resume=harness-runs/2026-04-24T07-16-57
 *   node --import tsx scripts/run-harness.mjs --resume=latest
 *   node --import tsx scripts/run-harness.mjs --no-dashboard
 */
import {
  writeFileSync, mkdirSync, existsSync, unlinkSync, symlinkSync,
  appendFileSync, readdirSync, statSync,
} from 'node:fs';
import { availableParallelism } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const getFlag = (name) => {
  const match = argv.find(a => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!match) return null;
  return match.includes('=') ? match.split('=').slice(1).join('=') : '';
};
const hasFlag = (name) => argv.includes(`--${name}`);

const workersFlag = getFlag('workers');
const changeFlag = getFlag('change');
const seedsFlag = getFlag('seeds');
const resumeFlag = getFlag('resume');
const noDashboard = hasFlag('no-dashboard');

// Default: ~2/3 of cores, leaving headroom for OS / other work.
// Override with --workers=N.
const defaultWorkers = Math.max(1, Math.floor(availableParallelism() * 2 / 3));
const workers = workersFlag !== null ? parseInt(workersFlag, 10) : defaultWorkers;
const singleChange = changeFlag;
const seedsOverride = seedsFlag !== null ? parseInt(seedsFlag, 10) : null;

// Resolve run directory — either resume an existing one or create
// a new timestamped one.
function pickLatestRunDir() {
  if (!existsSync('harness-runs')) return null;
  const entries = readdirSync('harness-runs')
    .map(name => ({ name, path: join('harness-runs', name) }))
    .filter(e => {
      try { return statSync(e.path).isDirectory(); } catch { return false; }
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  return entries.length > 0 ? entries[entries.length - 1].path : null;
}

let runDir;
let resumed = false;
if (resumeFlag !== null) {
  if (resumeFlag === 'latest' || resumeFlag === '') {
    runDir = pickLatestRunDir();
    if (!runDir) {
      console.error('[harness] --resume=latest: no harness-runs/ dir found');
      process.exit(1);
    }
  } else {
    runDir = resumeFlag;
  }
  if (!existsSync(runDir)) {
    console.error(`[harness] --resume: ${runDir} does not exist`);
    process.exit(1);
  }
  resumed = true;
} else {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  runDir = join('harness-runs', timestamp);
  mkdirSync(runDir, { recursive: true });
}
const resultsPath = join(runDir, 'results.json');
const reportPath = join(runDir, 'report.md');
const logPath = join(runDir, 'run.log');

// Tee log: everything we log goes to disk AND, unless the dashboard
// is owning the terminal, to stderr. When the dashboard is active
// we skip stderr so the per-task chatter doesn't fight with the
// in-place redraw.
const useDashboard = !noDashboard && Boolean(process.stderr.isTTY);
const log = (msg) => {
  if (!useDashboard) console.error(msg);
  try { appendFileSync(logPath, msg + '\n'); } catch { /* fs race */ }
};

log(`[harness] ${resumed ? 'RESUMING' : 'run started'} at ${new Date().toISOString()}`);
log(`[harness] output dir: ${runDir}`);
log(`[harness] cores available: ${availableParallelism()}  ·  using ${workers} workers`);

// Install jsdom shim first — Phaser touches window/document at
// import time and explodes in plain Node.
await import('../src/headless/harness/jsdom-setup.ts');
const { runHarnessParallel, runOneChange } = await import('../src/headless/harness/Pool.ts');
const { formatFullReport } = await import('../src/headless/harness/HarnessReport.ts');
const { DEFAULT_MATRIX } = await import('../src/headless/harness/HarnessRunner.ts');
const { ProgressDashboard } = await import('../src/headless/harness/ProgressDashboard.ts');

const matrix = seedsOverride
  ? { ...DEFAULT_MATRIX, seedsPerCell: seedsOverride }
  : DEFAULT_MATRIX;

log(`[harness] matrix: ${matrix.factions.length} factions × ${matrix.difficulties.length} difficulties × ${matrix.brains.length} brains × ${matrix.seedsPerCell} seeds`);

const dashboard = useDashboard ? new ProgressDashboard() : null;
if (dashboard) dashboard.start();

// Shutdown handlers — preserve checkpoint state even on Ctrl-C.
// tasks.jsonl is flushed per-task, so there's nothing extra to do;
// we just need to turn off the dashboard so the terminal isn't
// left in hide-cursor mode.
const cleanup = () => { if (dashboard) dashboard.stop(); };
process.on('SIGINT', () => { cleanup(); log('[harness] interrupted (SIGINT) — run is resumable with --resume=latest'); process.exit(130); });
process.on('SIGTERM', () => { cleanup(); process.exit(143); });

const t0 = Date.now();
let results;
try {
  const runOpts = {
    workers,
    log,
    matrix,
    runDir,
    onProgress: dashboard ? dashboard.onProgress : undefined,
  };
  results = singleChange !== null && singleChange !== ''
    ? await runOneChange(singleChange, runOpts)
    : await runHarnessParallel(runOpts);
} catch (err) {
  cleanup();
  log(`[harness] FATAL: ${err.message}`);
  log(err.stack || '');
  log(`[harness] run is resumable: node --import tsx scripts/run-harness.mjs --resume=${runDir}`);
  process.exit(1);
}
cleanup();
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

// Persist results + report side by side in the timestamped dir.
writeFileSync(resultsPath, JSON.stringify(results, mapReplacer, 2));
const report = formatFullReport(results);
writeFileSync(reportPath, report);
log(`[harness] results written: ${resultsPath}`);
log(`[harness] report written:  ${reportPath}`);
log(`[harness] wall time:       ${elapsed}s`);

// Point "latest" symlinks at the run dir so review scripts can find
// the freshest run without hunting through timestamps. Best-effort —
// skipped on Windows where symlinks require admin.
for (const [linkName, target] of [['harness-results.json', resultsPath], ['harness-report.md', reportPath]]) {
  try {
    if (existsSync(linkName)) unlinkSync(linkName);
    symlinkSync(target, linkName);
  } catch {
    // Fall back to copy on platforms where symlinks fail.
    try { writeFileSync(linkName, readFileSyncSafe(target)); } catch { /* give up */ }
  }
}

// Also print to stdout so `node ... > out.md` captures the report.
process.stdout.write(report);

function mapReplacer(_key, value) {
  if (value instanceof Map) return Object.fromEntries(value);
  return value;
}

function readFileSyncSafe(path) {
  const { readFileSync } = require('node:fs');
  return readFileSync(path);
}
