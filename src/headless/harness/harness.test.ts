/**
 * Harness integration smoke test — runs the catalog through the
 * worker pool. Skipped by default because it takes minutes; un-skip
 * for local balance work. Results are written to disk so the
 * markdown report can be inspected after the run.
 *
 * Can be invoked two ways:
 *   1. `npx vitest run src/headless/harness/harness.test.ts`
 *      (after un-skipping)
 *   2. `node --import tsx scripts/run-harness.mjs`
 *      (preferred for ad-hoc runs; uses all cores)
 */
import { test, expect } from 'vitest';
import { runHarnessParallel } from './Pool';
import { formatFullReport } from './HarnessReport';
import { writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { CATALOG } from './ChangeCatalog';

test.skip('full balance harness — 32 changes, ~30 min on 28 cores', async () => {
  const t0 = Date.now();
  const results = await runHarnessParallel({
    workers: availableParallelism(),
    log: (m) => console.log(m),
  });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[harness] ${results.changes.length} changes in ${elapsed}s`);
  writeFileSync('harness-results.md', formatFullReport(results));
  expect(results.baseline.length).toBeGreaterThan(0);
  expect(results.changes).toHaveLength(CATALOG.length);
}, 60 * 60_000);
