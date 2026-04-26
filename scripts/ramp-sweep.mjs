#!/usr/bin/env node
/**
 * Hard-ramp sweep — measures BalancedBrain win rate on arcane|hard
 * across a range of `toughnessPerWave` values, with two brain
 * configurations:
 *   - default brain (no env override)
 *   - warm-start (arcane|normal winner config)
 *
 * Output is a markdown table: which ramp value makes hard non-zero
 * for the brain, so we can pick a sane setting before re-running
 * the brain-search loop.
 */
await import('../src/headless/harness/jsdom-setup.ts');
const { runMatch } = await import('../src/headless/HeadlessMatch.ts');
const { PatchEngine } = await import('../src/headless/harness/PatchEngine.ts');

import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = resolve(HERE, '..');

// Ramp values to sweep. 0.13 = current; 0.010 = global.3 target;
// the rest are intermediate compromises.
const RAMPS = [0.13, 0.10, 0.07, 0.05, 0.03, 0.01];
const N = 100;
const FACTION = 'arcane';
const DIFFICULTY = 'hard';

// Load the arcane|normal winner config — also evaluated as a second
// brain configuration alongside the default brain.
const winner = JSON.parse(
  readFileSync(resolve(PROJECT_ROOT, 'brain-baselines/balanced-arcane-normal.json'), 'utf8'),
);
const winnerParams = winner.params;

async function runOne(seed) {
  return runMatch({
    faction: FACTION,
    difficulty: DIFFICULTY,
    mapId: 'plains',
    brainId: 'balanced',
    matchMode: 'standard',
    waveCount: 20,
    seed: (1 * 31 + seed * 7919) >>> 0,
  });
}

async function evalCell(rampValue, useWinnerParams, label) {
  const patch = new PatchEngine();
  patch.patchDifficulty(DIFFICULTY, 'toughnessPerWave', rampValue);
  if (useWinnerParams) process.env.BALANCED_BRAIN_PARAMS = JSON.stringify(winnerParams);
  else delete process.env.BALANCED_BRAIN_PARAMS;
  let wins = 0;
  let totalWave = 0;
  for (let i = 0; i < N; i++) {
    const r = await runOne(i);
    if (r.outcome === 'win') wins++;
    totalWave += r.waveReached;
  }
  patch.revert();
  return { label, ramp: rampValue, winRate: wins / N, avgWave: totalWave / N };
}

console.log(`Hard-ramp sweep · arcane · ${N} seeds per cell`);
console.log(`---`);
const rows = [];
for (const rampValue of RAMPS) {
  for (const variant of [
    { useWinner: false, label: 'default' },
    { useWinner: true,  label: 'normal-winner' },
  ]) {
    const r = await evalCell(rampValue, variant.useWinner, variant.label);
    rows.push(r);
    console.log(
      `ramp=${rampValue.toFixed(3)} · ${variant.label.padEnd(14)} → ` +
      `${(r.winRate * 100).toFixed(1)}% wins (avgWave ${r.avgWave.toFixed(1)})`,
    );
  }
}

console.log(`\nMarkdown table:`);
console.log(`| ramp | brain | win % | avg wave |`);
console.log(`|---|---|---|---|`);
for (const r of rows) {
  console.log(`| ${r.ramp.toFixed(3)} | ${r.label} | ${(r.winRate * 100).toFixed(1)}% | ${r.avgWave.toFixed(1)} |`);
}
