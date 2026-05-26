#!/usr/bin/env node
/**
 * BC step 3.5 — rollout distribution probe.
 *
 * Reads back rollout JSONL.gz files written by
 * `generate-bc-rollouts.mjs` and reports the action-class
 * distribution + mask sparsity histogram. Output drives the D4
 * decision (skip-handling strategy) per `notes/rl/bc-plan.md`
 * Step 3.5.
 *
 * Usage:
 *   node scripts/inspect-rollout-distribution.mjs <rollouts/bc/run_id>
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { Buffer } from 'node:buffer';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';

const ACTION_SPACE_SIZE = 9361;
const PLACE_BASE = 0;
const UPGRADE_BASE = 7488;
const SELL_BASE = 8424;
const SKIP_INDEX = 9360;
const NUM_TOWER_SLOTS = 8;
const NUM_CELLS = 936;

function classify(actionIdx) {
  if (actionIdx === SKIP_INDEX) return { kind: 'skip', slot: null };
  if (actionIdx >= SELL_BASE) return { kind: 'sell', slot: null };
  if (actionIdx >= UPGRADE_BASE) return { kind: 'upgrade', slot: null };
  const slot = Math.floor(actionIdx / NUM_CELLS);
  return { kind: 'place', slot };
}

function popcount(uint8) {
  let c = 0;
  for (let i = 0; i < uint8.length; i++) if (uint8[i]) c++;
  return c;
}

function readJsonlGz(filepath) {
  const buf = gunzipSync(readFileSync(filepath));
  return buf.toString('utf8').split('\n').filter(l => l.length > 0).map(l => JSON.parse(l));
}

const runDir = process.argv[2];
if (!runDir) {
  console.error('Usage: node scripts/inspect-rollout-distribution.mjs <rollouts/bc/run_id>');
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(join(runDir, 'manifest.json'), 'utf8'));
console.log(`Manifest: ${manifest.runId}  schema=${manifest.schemaVersion}  inner=${manifest.innerBrain}`);

const stats = {
  perFaction: {},
  global: { skip: 0, upgrade: 0, sell: 0, placeBySlot: new Array(NUM_TOWER_SLOTS).fill(0), total: 0, maskSparsityHist: new Array(20).fill(0) },
};

for (const faction of Object.keys(manifest.factions)) {
  const facStats = { skip: 0, upgrade: 0, sell: 0, placeBySlot: new Array(NUM_TOWER_SLOTS).fill(0), total: 0 };
  const factionDir = join(runDir, faction);
  const files = readdirSync(factionDir).filter(f => f.endsWith('.jsonl.gz'));
  for (const f of files) {
    const rows = readJsonlGz(join(factionDir, f));
    for (const row of rows) {
      const cls = classify(row.action);
      if (cls.kind === 'skip') { facStats.skip++; stats.global.skip++; }
      else if (cls.kind === 'upgrade') { facStats.upgrade++; stats.global.upgrade++; }
      else if (cls.kind === 'sell') { facStats.sell++; stats.global.sell++; }
      else if (cls.kind === 'place' && cls.slot !== null) {
        facStats.placeBySlot[cls.slot]++;
        stats.global.placeBySlot[cls.slot]++;
      }
      facStats.total++;
      stats.global.total++;

      // Mask sparsity bucket — fraction of action space that's legal.
      const mask = new Uint8Array(Buffer.from(row.mask_b64, 'base64'));
      const legal = popcount(mask);
      const frac = legal / ACTION_SPACE_SIZE;
      const bucket = Math.min(19, Math.floor(frac * 20));
      stats.global.maskSparsityHist[bucket]++;
    }
  }
  stats.perFaction[faction] = facStats;
}

function pct(n, total) {
  return total === 0 ? '0.0%' : `${(100 * n / total).toFixed(1)}%`;
}

console.log('\n=== Per-faction action distribution ===');
for (const [faction, s] of Object.entries(stats.perFaction)) {
  const placeTotal = s.placeBySlot.reduce((a, b) => a + b, 0);
  console.log(`\n${faction.toUpperCase()}  (${s.total} decisions)`);
  console.log(`  skip:    ${s.skip} (${pct(s.skip, s.total)})`);
  console.log(`  place:   ${placeTotal} (${pct(placeTotal, s.total)})`);
  for (let slot = 0; slot < NUM_TOWER_SLOTS; slot++) {
    if (s.placeBySlot[slot] > 0) {
      console.log(`    slot ${slot}: ${s.placeBySlot[slot]} (${pct(s.placeBySlot[slot], s.total)})`);
    }
  }
  console.log(`  upgrade: ${s.upgrade} (${pct(s.upgrade, s.total)})`);
  console.log(`  sell:    ${s.sell} (${pct(s.sell, s.total)})`);
}

console.log('\n=== Global action distribution ===');
const placeTotalGlobal = stats.global.placeBySlot.reduce((a, b) => a + b, 0);
console.log(`  skip:    ${stats.global.skip} (${pct(stats.global.skip, stats.global.total)})`);
console.log(`  place:   ${placeTotalGlobal} (${pct(placeTotalGlobal, stats.global.total)})`);
console.log(`  upgrade: ${stats.global.upgrade} (${pct(stats.global.upgrade, stats.global.total)})`);
console.log(`  sell:    ${stats.global.sell} (${pct(stats.global.sell, stats.global.total)})`);
console.log(`  total:   ${stats.global.total}`);

const skipPct = stats.global.skip / stats.global.total;
console.log('\n=== D4 recommendation (skip handling) ===');
if (skipPct > 0.6) {
  console.log(`  skip is ${(skipPct * 100).toFixed(0)}% of dataset → use inverse-frequency weighting (D4 option a)`);
  console.log(`  Reasoning: raw cross-entropy collapses to always-skip when one class dominates.`);
  console.log(`  Per-class weight: 1/freq, optionally bounded so skip's weight doesn't underflow.`);
} else if (skipPct > 0.3) {
  console.log(`  skip is ${(skipPct * 100).toFixed(0)}% of dataset → moderate imbalance.`);
  console.log(`  Use inverse-frequency weighting (D4 a) OR uniform CE; either should work.`);
} else {
  console.log(`  skip is ${(skipPct * 100).toFixed(0)}% of dataset → mild imbalance.`);
  console.log(`  Plain uniform cross-entropy is probably fine.`);
}

console.log('\n=== Mask sparsity histogram (% of mask that is legal) ===');
for (let b = 0; b < 20; b++) {
  const low = (b * 5).toFixed(0);
  const high = ((b + 1) * 5).toFixed(0);
  const count = stats.global.maskSparsityHist[b];
  if (count === 0) continue;
  const bar = '█'.repeat(Math.round(count / Math.max(1, Math.max(...stats.global.maskSparsityHist)) * 40));
  console.log(`  [${low.padStart(2)}-${high.padStart(2)}%]  ${String(count).padStart(6)}  ${bar}`);
}

console.log('\n=== Drop rates (manifest) ===');
for (const [faction, fs] of Object.entries(manifest.factions)) {
  const dropTotal = fs.dropped.send + fs.dropped.frontier + fs.dropped.frontierManage;
  console.log(`  ${faction}: send=${fs.dropped.send}  frontier=${fs.dropped.frontier}  frontierManage=${fs.dropped.frontierManage}  total_drop=${dropTotal}`);
}
