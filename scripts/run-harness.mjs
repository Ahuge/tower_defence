#!/usr/bin/env node
/**
 * CLI entry for the balance harness. Runs the full catalog across
 * N worker processes, writes three persistent artifacts per run:
 *
 *   harness-runs/<timestamp>/results.json  — full per-change data
 *   harness-runs/<timestamp>/report.md     — formatted markdown
 *   harness-runs/<timestamp>/run.log       — full progress log
 *
 * And also updates the latest-copy symlinks at the project root:
 *
 *   harness-results.json  → runs/<timestamp>/results.json
 *   harness-report.md     → runs/<timestamp>/report.md
 *
 * So you can `cat harness-report.md` after an overnight run or
 * browse the timestamped archive to compare runs.
 *
 * Usage:
 *   node --import tsx scripts/run-harness.mjs              # all cores, 1000 seeds
 *   node --import tsx scripts/run-harness.mjs --workers=8  # cap workers
 *   node --import tsx scripts/run-harness.mjs --change=nature.4  # one change
 *   node --import tsx scripts/run-harness.mjs --seeds=100  # lighter run (~40 min)
 *
 * Requires `tsx` (see package.json devDependencies).
 */
import { writeFileSync, mkdirSync, existsSync, unlinkSync, symlinkSync, appendFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const workersFlag = argv.find(a => a.startsWith('--workers='));
const changeFlag = argv.find(a => a.startsWith('--change='));
const seedsFlag = argv.find(a => a.startsWith('--seeds='));
const workers = workersFlag ? parseInt(workersFlag.split('=')[1], 10) : availableParallelism();
const singleChange = changeFlag ? changeFlag.split('=')[1] : null;
const seedsOverride = seedsFlag ? parseInt(seedsFlag.split('=')[1], 10) : null;

// Timestamped output dir — one per run, so multiple overnight runs
// don't overwrite each other.
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19); // 2026-04-24T19-42-13
const runDir = join('harness-runs', timestamp);
mkdirSync(runDir, { recursive: true });
const resultsPath = join(runDir, 'results.json');
const reportPath = join(runDir, 'report.md');
const logPath = join(runDir, 'run.log');

// Tee stderr — everything the harness logs also lands in run.log
// so a crash / timeout still leaves a forensic trail on disk.
const log = (msg) => {
  console.error(msg);
  try { appendFileSync(logPath, msg + '\n'); } catch { /* fs race — ignore */ }
};
log(`[harness] run started at ${new Date().toISOString()}`);
log(`[harness] output dir: ${runDir}`);

// Install jsdom shim first — Phaser touches window/document at
// import time and explodes in plain Node.
await import('../src/headless/harness/jsdom-setup.ts');
const { runHarnessParallel, runOneChange } = await import('../src/headless/harness/Pool.ts');
const { formatFullReport } = await import('../src/headless/harness/HarnessReport.ts');
const { DEFAULT_MATRIX } = await import('../src/headless/harness/HarnessRunner.ts');

const matrix = seedsOverride
  ? { ...DEFAULT_MATRIX, seedsPerCell: seedsOverride }
  : DEFAULT_MATRIX;

log(`[harness] matrix: ${matrix.factions.length} factions × ${matrix.difficulties.length} difficulties × ${matrix.brains.length} brains × ${matrix.seedsPerCell} seeds`);
log(`[harness] workers: ${workers}`);

const t0 = Date.now();
let results;
try {
  results = singleChange
    ? await runOneChange(singleChange, { workers, log, matrix })
    : await runHarnessParallel({ workers, log, matrix });
} catch (err) {
  log(`[harness] FATAL: ${err.message}`);
  log(err.stack || '');
  process.exit(1);
}
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

/** JSON.stringify replacer — Maps aren't serialisable by default.
 *  We emit them as plain objects so consumers can read them back
 *  without a custom parser. */
function mapReplacer(_key, value) {
  if (value instanceof Map) return Object.fromEntries(value);
  return value;
}

function readFileSyncSafe(path) {
  const { readFileSync } = require('node:fs');
  return readFileSync(path);
}
