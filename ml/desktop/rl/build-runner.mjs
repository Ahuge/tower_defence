#!/usr/bin/env node
/**
 * build-runner.mjs — bundle the RL episode runner with esbuild.
 *
 * The parallel sweep spawns one Node process per worker per iteration,
 * and each one pays tsx startup (transpiling the whole import graph)
 * before simulating a single episode. Bundling once up front cuts that
 * to a plain `node` launch (~0.2s).
 *
 * Usage:
 *   node ml/desktop/rl/build-runner.mjs
 *
 * Produces:
 *   ml/desktop/rl/run_episode.bundle.mjs — self-contained ESM bundle
 *   ml/desktop/rl/models/scorer-*.json  — copies of the placement
 *     scorer models (LearnedScorer resolves them via
 *     import.meta.url-relative paths, which point at the bundle's
 *     directory once bundled, so the models must live next to it)
 *
 * The bundle is written to a temp file and renamed into place, so a
 * sweep that spawns a worker mid-build can never read a half-written
 * bundle.
 *
 * jsdom is no longer imported by the runner (see jsdom-setup.ts — it
 * uses a tiny DOM shim). It stays in `external` only for the opt-in
 * TD_HEADLESS_DOM=jsdom path.
 */

import { build } from 'esbuild';
import { cpSync, mkdirSync, readdirSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const RL_DIR = join(ROOT, 'ml', 'desktop', 'rl');
const ENTRY = join(RL_DIR, 'run_episode.mts');
const OUTFILE = join(RL_DIR, 'run_episode.bundle.mjs');
// Build to a sibling temp file, then rename (atomic on one filesystem)
// so a worker spawned by a running sweep never reads a partial bundle.
const OUTFILE_TMP = join(RL_DIR, '.run_episode.bundle.mjs.tmp');
const MODELS_SRC = join(ROOT, 'playtest', 'models');
const MODELS_DST = join(RL_DIR, 'models');

const t0 = Date.now();
const result = await build({
  entryPoints: [ENTRY],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: OUTFILE_TMP,
  // jsdom is only loaded by the opt-in TD_HEADLESS_DOM=jsdom path (via
  // createRequire), so keep it external. `canvas` is jsdom's optional
  // native peer (a .node binary esbuild can't bundle) and must stay
  // external too — jsdom wraps the require in try/catch.
  external: ['jsdom', 'canvas'],
  // The game reads .json maps and tower data via static imports;
  // esbuild inlines those. Keep the log quiet unless something breaks.
  logLevel: 'warning',
  // Node builtins stay external (platform: 'node' does this).
  // Sourcemaps would double the artifact size; skip them.
  sourcemap: false,
  // tsx strips types without type-checking; esbuild matches that.
  // tsc --noEmit remains the type gate (run separately).
});
if (result.errors.length > 0) {
  console.error('esbuild failed:');
  for (const e of result.errors) console.error(e.text);
  process.exit(1);
}
renameSync(OUTFILE_TMP, OUTFILE);
console.log(`bundle: ${OUTFILE} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);

// LearnedScorer resolves scorer JSONs relative to its own file, which
// after bundling is the bundle's directory (ml/desktop/rl). Copy the
// models there so placement scoring works in the bundled runner.
mkdirSync(MODELS_DST, { recursive: true });
const copied = [];
for (const f of readdirSync(MODELS_SRC)) {
  if (!f.startsWith('scorer-') || !f.endsWith('.json')) continue;
  cpSync(join(MODELS_SRC, f), join(MODELS_DST, f));
  copied.push(f);
}
console.log(`models: copied ${copied.length} scorer JSONs -> ${MODELS_DST}`);
