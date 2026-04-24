#!/usr/bin/env node
/**
 * CLI entry for the balance harness. Runs the full catalog across
 * N worker threads, prints the markdown report to stdout, and
 * writes the full JSON results to `harness-results.json` so a
 * follow-up analysis script can re-rank without re-running matches.
 *
 * Usage:
 *   node --import tsx scripts/run-harness.mjs              # all cores
 *   node --import tsx scripts/run-harness.mjs --workers=8  # cap
 *   node --import tsx scripts/run-harness.mjs --change=nature.4  # one
 *
 * Requires `tsx` (see package.json devDependencies) — Node 24's
 * native TypeScript can't resolve the extensionless imports the
 * game systems use.
 */
import { writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';

const argv = process.argv.slice(2);
const workersFlag = argv.find(a => a.startsWith('--workers='));
const changeFlag = argv.find(a => a.startsWith('--change='));
const workers = workersFlag ? parseInt(workersFlag.split('=')[1], 10) : availableParallelism();
const singleChange = changeFlag ? changeFlag.split('=')[1] : null;

const { runHarnessParallel, runOneChange } = await import('../src/headless/harness/Pool.ts');
const { formatFullReport } = await import('../src/headless/harness/HarnessReport.ts');

const log = (msg) => console.error(msg);
const t0 = Date.now();
const results = singleChange
  ? await runOneChange(singleChange, { workers, log })
  : await runHarnessParallel({ workers, log });
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

writeFileSync('harness-results.json', JSON.stringify(results, mapReplacer, 2));
log(`[harness] results written to harness-results.json (${elapsed}s wall time)`);
process.stdout.write(formatFullReport(results));

/** JSON.stringify replacer — Maps aren't serialisable by default.
 *  We emit them as plain objects so consumers can read them back
 *  without a custom parser. */
function mapReplacer(_key, value) {
  if (value instanceof Map) return Object.fromEntries(value);
  return value;
}
