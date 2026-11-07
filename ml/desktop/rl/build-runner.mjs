#!/usr/bin/env node
/**
 * build-runner.mjs — bundle the RL episode runner with esbuild.
 *
 * The parallel sweep spawns one Node process per worker per iteration,
 * and each one pays ~4s of tsx startup (transpiling the jsdom import
 * graph) before simulating a single episode. Bundling once up front
 * cuts that to a plain `node` launch (~0.2s).
 *
 * Usage:
 *   node ml/desktop/rl/build-runner.mjs [--no-jsdom-bundle]
 *
 * Produces:
 *   ml/desktop/rl/run_episode.bundle.mjs — self-contained ESM bundle
 *   ml/desktop/rl/models/scorer-*.json  — copies of the placement
 *     scorer models (LearnedScorer resolves them via
 *     import.meta.url-relative paths, which point at the bundle's
 *     directory once bundled, so the models must live next to it)
 *
 * jsdom is left external by default: bundling it breaks on its internal
 * dynamic require() calls (esbuild ESM bundles can't do dynamic require
 * of builtins). Node resolves it from node_modules at runtime. Pass
 * --bundle-jsdom to try bundling it anyway (currently broken — see
 * above).
 */

import { build } from 'esbuild';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const RL_DIR = join(ROOT, 'ml', 'desktop', 'rl');
const ENTRY = join(RL_DIR, 'run_episode.mts');
const OUTFILE = join(RL_DIR, 'run_episode.bundle.mjs');
const MODELS_SRC = join(ROOT, 'playtest', 'models');
const MODELS_DST = join(RL_DIR, 'models');

const bundleJsdom = process.argv.includes('--bundle-jsdom');

const t0 = Date.now();
const result = await build({
  entryPoints: [ENTRY],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: OUTFILE,
  // jsdom is external by default (bundling it breaks on its internal
  // dynamic require() calls). Node resolves it from node_modules at
  // runtime — the bundle lives in the repo, so module resolution walks
  // up to the root node_modules. --bundle-jsdom tries inlining it.
  // `canvas` is jsdom's optional native peer (a .node binary esbuild
  // can't bundle). It must stay external either way — jsdom wraps the
  // require in try/catch and runs fine without a real canvas.
  external: [...(bundleJsdom ? [] : ['jsdom']), 'canvas'],
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
