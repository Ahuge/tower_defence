#!/usr/bin/env node
/**
 * Sweep BalancedBrain L1+L2 search across factions × difficulty.
 * Sequential — each search uses 8 workers; running them in parallel
 * would oversubscribe cores. After all complete, prints a summary
 * table and writes baseline JSONs for any cell that hit ≥0.8
 * validated win rate.
 */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = resolve(HERE, '..');

const FACTIONS = [
  'mechanical', 'nature', 'void', 'military', 'aliens',
  'cypherpunk', 'infernal', 'celestial', 'psionic', 'harmonic',
];
const DIFFICULTY = process.argv[2] ?? 'normal';
const MAX_EVALS = parseInt(process.argv[3] ?? '300', 10);
const SAVE_THRESHOLD = 0.8;

function runSearch(faction) {
  return new Promise((resolveP) => {
    const runId = `balanced-${faction}-${DIFFICULTY}`;
    const runDir = resolve(PROJECT_ROOT, 'brain-search', runId);
    if (existsSync(runDir)) {
      // Cleanest is to start fresh — resume would mix in prior runs
      // that may have used a different schema.
      const { rmSync } = require('node:fs');
      rmSync(runDir, { recursive: true });
    }
    const args = [
      '--import', 'tsx',
      resolve(PROJECT_ROOT, 'scripts/brain-search.mjs'),
      `--brain=balanced`,
      `--faction=${faction}`,
      `--difficulty=${DIFFICULTY}`,
      `--workers=8`,
      `--max-evals=${MAX_EVALS}`,
      `--search-seeds=20`,
      `--validate-seeds=100`,
    ];
    const t0 = Date.now();
    const child = spawn(process.execPath, args, {
      cwd: PROJECT_ROOT,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    // Stream stderr through but compact stdout summary appears later.
    child.stderr.on('data', () => { /* swallow per-eval chatter */ });
    child.on('exit', () => {
      const wallSec = ((Date.now() - t0) / 1000).toFixed(0);
      resolveP({ faction, runId, wallSec });
    });
  });
}

console.log(`sweep · ${FACTIONS.length} factions × ${DIFFICULTY} · max-evals=${MAX_EVALS} · ~${FACTIONS.length} min wall total`);
console.log('---');

const startedAt = Date.now();
const results = [];
for (const faction of FACTIONS) {
  process.stdout.write(`[${(results.length + 1).toString().padStart(2)}/${FACTIONS.length}] searching ${faction}|${DIFFICULTY}…  `);
  const r = await runSearch(faction);
  // Read the summary back and pull headline numbers.
  const summaryPath = resolve(PROJECT_ROOT, 'brain-search', r.runId, 'summary.json');
  let summary = null;
  if (existsSync(summaryPath)) summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
  const best = summary?.bestSoFar;
  const score = best ? `${(best.score * 100).toFixed(1)}% (n=${best.n}${best.tag === 'validate' ? ' ✓' : ''})` : '–';
  console.log(`${r.wallSec}s · best ${score}`);
  results.push({ faction, runId: r.runId, wallSec: r.wallSec, summary });
}

const totalSec = ((Date.now() - startedAt) / 1000).toFixed(0);
console.log('---');
console.log(`done · total ${totalSec}s`);

console.log('\nResults:');
console.log(`| faction | win rate | avgWave | n | tag |`);
console.log(`|---|---|---|---|---|`);
for (const r of results) {
  const b = r.summary?.bestSoFar;
  if (!b) { console.log(`| ${r.faction} | – | – | – | – |`); continue; }
  console.log(`| ${r.faction} | ${(b.score * 100).toFixed(1)}% | ${b.avgWave.toFixed(1)} | ${b.n} | ${b.tag} |`);
}

console.log('\nBaseline files (winners ≥80%):');
const baselineDir = resolve(PROJECT_ROOT, 'brain-baselines');
mkdirSync(baselineDir, { recursive: true });
for (const r of results) {
  const b = r.summary?.bestSoFar;
  if (!b || b.tag !== 'validate' || b.score < SAVE_THRESHOLD) continue;
  const path = resolve(baselineDir, `balanced-${r.faction}-${DIFFICULTY}.json`);
  const doc = {
    brain: 'balanced',
    faction: r.faction,
    difficulty: DIFFICULTY,
    discoveredAt: new Date().toISOString().slice(0, 10),
    method: 'L1+L2 hyperparameter search · μ+λ ES (μ=2, λ=8)',
    results: {
      winnerWinRate: b.score,
      avgWave: b.avgWave,
      n: b.n,
      totalEvaluations: r.summary.totalEvals,
    },
    params: b.params,
  };
  writeFileSync(path, JSON.stringify(doc, null, 2));
  console.log(`  ✓ ${path}`);
}

const winners = results.filter(r => {
  const b = r.summary?.bestSoFar;
  return b && b.tag === 'validate' && b.score >= SAVE_THRESHOLD;
});
console.log(`\nLanded ${winners.length}/${FACTIONS.length} faction winners at ≥${SAVE_THRESHOLD * 100}%.`);
