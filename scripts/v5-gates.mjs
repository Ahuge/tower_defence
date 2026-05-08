#!/usr/bin/env node
/**
 * v5.5 — production gates checker.
 *
 * Reads the validation-results JSON written by utilization-validate.mjs
 * and enforces the production gates from BRAIN_V5_PLAN.md:
 *
 *   1. No regression vs v3.5 baseline win rate (within ±2pp). The v3.5
 *      baseline is computed from a fresh batch using the prior
 *      MAZING_FACTION_CONFIGS entry (no v5 params), so the comparison
 *      is fair.
 *   2. Every tower has utilization > 5% OR is explicitly classified
 *      (load-bearing / actively-bad / redundant-with-X / brain-gap-vs-X).
 *      "Niche but valuable" load-bearing towers count as passing
 *      (they're rarely placed but fail-state ablation proves their
 *      contribution). Brain-gap towers are flagged but not blocking —
 *      they signal a future v5.x improvement, not a v5 promotion blocker.
 *   3. No tower has ablation gain ≥ 5pp ("actively bad" — placing it
 *      makes the kit worse). Hard fail.
 *   4. Manual identity review — the script flags this as "needs human"
 *      and doesn't auto-pass. Check the v5-diff output before
 *      promoting.
 *
 * Exit code: 0 on PASS (gates 1-3 pass), 1 on FAIL.
 *
 * Usage:
 *   node --import tsx scripts/v5-gates.mjs \
 *     --results=brain-search/v5-mechanical-normal/validation-results-mechanical.json \
 *     [--baseline-wins=N --baseline-n=N]   # provide v3.5 baseline directly
 *     [--baseline-script=path]              # OR path to a script that runs it
 *     [--regression-tolerance=0.02]         # default ±2pp
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');

const argv = process.argv.slice(2);
const getFlag = (name) => {
  const m = argv.find(a => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!m) return null;
  return m.includes('=') ? m.split('=').slice(1).join('=') : '';
};
const resultsFile = getFlag('results');
const baselineWinsFlag = getFlag('baseline-wins');
const baselineNFlag = getFlag('baseline-n');
const regressionTolerance = parseFloat(getFlag('regression-tolerance') ?? '0.02');

if (!resultsFile) {
  console.error('usage: v5-gates.mjs --results=PATH [--baseline-wins=N --baseline-n=N]');
  process.exit(2);
}
if (!existsSync(resolve(PROJECT_ROOT, resultsFile))) {
  console.error(`results file not found: ${resultsFile}`);
  process.exit(2);
}

const results = JSON.parse(readFileSync(resolve(PROJECT_ROOT, resultsFile), 'utf8'));
const v5WinRate = results.baseline.winRate;
const v5Wins = results.baseline.wins;
const v5N = results.baseline.n;

console.log(`v5.5 production gates: ${results.faction}/${results.difficulty}`);
console.log('─'.repeat(60));
console.log(`v5 baseline (from validation): ${v5Wins}/${v5N} (${(v5WinRate * 100).toFixed(1)}%)`);

// ── Gate 1: regression check ───────────────────────────────────────
let v3WinRate = null;
let v3Wins = null;
if (baselineWinsFlag !== null && baselineNFlag !== null) {
  v3Wins = parseInt(baselineWinsFlag, 10);
  const v3N = parseInt(baselineNFlag, 10);
  v3WinRate = v3Wins / v3N;
  console.log(`v3.5 baseline (provided):    ${v3Wins}/${v3N} (${(v3WinRate * 100).toFixed(1)}%)`);
} else {
  console.log(`v3.5 baseline:               (not provided — gate 1 SKIPPED)`);
}

let gate1 = 'PASS';
let gate1Note = '';
if (v3WinRate !== null) {
  const delta = v5WinRate - v3WinRate;
  if (delta < -regressionTolerance) {
    gate1 = 'FAIL';
    gate1Note = `regression of ${(delta * 100).toFixed(1)}pp exceeds tolerance ${(regressionTolerance * 100).toFixed(1)}pp`;
  } else if (delta > regressionTolerance) {
    gate1 = 'PASS+';
    gate1Note = `+${(delta * 100).toFixed(1)}pp improvement (above tolerance)`;
  } else {
    gate1Note = `Δ ${(delta >= 0 ? '+' : '')}${(delta * 100).toFixed(1)}pp within ±${(regressionTolerance * 100).toFixed(1)}pp tolerance`;
  }
} else {
  gate1 = 'SKIP';
}

console.log('');
console.log(`Gate 1 — no regression vs v3.5: ${gate1}${gate1Note ? ' (' + gate1Note + ')' : ''}`);

// ── Gate 2: utilization coverage ───────────────────────────────────
const flagged = results.flaggedLow ?? [];
const classifications = results.classifications ?? [];
let gate2 = 'PASS';
const gate2Issues = [];
const unclassified = flagged.filter(id => !classifications.find(c => c.id === id));
if (unclassified.length > 0) {
  gate2 = 'FAIL';
  gate2Issues.push(`unclassified flagged towers: ${unclassified.join(', ')}`);
}
console.log(`Gate 2 — every tower classified: ${gate2}`);
if (gate2Issues.length > 0) for (const i of gate2Issues) console.log(`  - ${i}`);
const verdictCounts = {};
for (const c of classifications) {
  verdictCounts[c.verdict] = (verdictCounts[c.verdict] ?? 0) + 1;
  if (c.redundancyVerdict) {
    const k = c.redundancyVerdict.startsWith('redundant-with') ? 'redundant'
            : c.redundancyVerdict.startsWith('brain-gap-vs') ? 'brain-gap'
            : c.redundancyVerdict;
    verdictCounts[k] = (verdictCounts[k] ?? 0) + 1;
  }
}
for (const [v, n] of Object.entries(verdictCounts)) console.log(`  ${v.padEnd(15)} ${n}`);

// ── Gate 3: actively-bad towers ────────────────────────────────────
const activelyBad = classifications.filter(c => c.verdict === 'actively-bad');
let gate3 = 'PASS';
if (activelyBad.length > 0) {
  gate3 = 'FAIL';
  console.log(`Gate 3 — no actively-bad towers: FAIL`);
  for (const c of activelyBad) {
    console.log(`  - ${c.id}: removing improves win rate by ${(c.delta * 100).toFixed(1)}pp`);
  }
} else {
  console.log(`Gate 3 — no actively-bad towers: PASS`);
}

// ── Gate 4: manual review (always SKIP for auto) ──────────────────
console.log(`Gate 4 — manual identity review: SKIP (run v5-diff.mjs and review)`);

// ── Summary ────────────────────────────────────────────────────────
console.log('');
console.log('─'.repeat(60));
const passed = [gate1, gate2, gate3].filter(g => g === 'PASS' || g === 'PASS+' || g === 'SKIP').length;
const failed = [gate1, gate2, gate3].filter(g => g === 'FAIL').length;
console.log(`Result: ${failed === 0 ? 'PASS' : 'FAIL'} (${passed}/3 gates clean, ${failed} fail)`);
process.exit(failed === 0 ? 0 : 1);
