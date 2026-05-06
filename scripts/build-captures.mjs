#!/usr/bin/env node
/**
 * Convert ml/captured/*.jsonl → src/systems/bots/learning/captures.json
 *
 * The committed JSON is what HumanReplayBrain loads at init. We
 * keep only the fields needed for replay:
 *   matchId, faction, wave, decisionRaw, stateFeatures
 *
 * Older captures (pre-decisionRaw) are reverse-engineered: we
 * decode the action's towerId from the action-features vector
 * (cost + damage + range + fireRate + role one-hot uniquely
 * identify a TowerType in 99% of cases). Cell coords are not
 * recoverable from features, so old 'upgrade' and 'sell' rows are
 * dropped (HumanReplayBrain can't propose them without a target
 * cell), and old 'place' rows get null col/row — the brain will
 * pick a best-coverage candidate cell at runtime.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = resolve(HERE, '..');
const CAPTURED_DIR = resolve(PROJECT_ROOT, 'ml/captured');
const OUT_PATH = resolve(PROJECT_ROOT, 'src/systems/bots/learning/captures.json');

await import('../src/headless/harness/jsdom-setup.ts');
const { TOWER_TYPES } = await import('../src/data/TowerTypes.ts');

// Build a (cost, damage, range, fireRate) → towerId reverse map
// for decoding old captures' action features. We index by a
// stringified key for exact match.
const towerByStats = new Map();
for (const id of Object.keys(TOWER_TYPES)) {
  const t = TOWER_TYPES[id];
  const k = `${t.cost}|${t.damage}|${t.range}|${t.fireRate}`;
  towerByStats.set(k, id);
}

function decodeTowerId(actionFeatures) {
  // Action layout (per FeatureExtractor): indices 6..9 are
  // tower_cost_norm, tower_damage_norm, tower_range_norm,
  // tower_firerate_norm. We invert the normalisation.
  const costNorm    = actionFeatures[6];
  const dmgNorm     = actionFeatures[7];
  const rangeNorm   = actionFeatures[8];
  const fireRateInv = actionFeatures[9];
  if (costNorm === 0 && dmgNorm === 0 && rangeNorm === 0 && fireRateInv === 0) {
    return null; // skip / non-tower decision
  }
  const cost = Math.round(costNorm * 200);
  const damage = Math.round(dmgNorm * 100);
  const range = +(rangeNorm * 10).toFixed(2);
  const fireRate = fireRateInv > 0 ? Math.round(1000 / fireRateInv) : 0;
  // Try exact match first.
  const exact = towerByStats.get(`${cost}|${damage}|${range}|${fireRate}`);
  if (exact) return exact;
  // Fallback: nearest by (cost, damage) — sometimes the encoding
  // rounds slightly off. Pick the closest.
  let bestId = null, bestDist = Infinity;
  for (const id of Object.keys(TOWER_TYPES)) {
    const t = TOWER_TYPES[id];
    const dc = Math.abs(t.cost - cost);
    const dd = Math.abs(t.damage - damage);
    const dr = Math.abs(t.range - range) * 10;
    const dist = dc + dd + dr;
    if (dist < bestDist) { bestDist = dist; bestId = id; }
  }
  return bestId;
}

const files = readdirSync(CAPTURED_DIR).filter(f => f.endsWith('.jsonl'));
console.log(`captures dir: ${CAPTURED_DIR}`);
console.log(`files: ${files.length}`);

const out = []; // each entry = one captured turn (replayable)
let kept = 0, dropped = 0;
const matchSummary = new Map();

for (const file of files) {
  const path = join(CAPTURED_DIR, file);
  const lines = readFileSync(path, 'utf8').split('\n').filter(l => l.trim());
  for (const line of lines) {
    let row;
    try { row = JSON.parse(line); } catch { dropped++; continue; }
    // Only keep rows from winning matches — the whole point of
    // human captures is to surface winning strategies.
    if (row.outcome !== 'win') { dropped++; continue; }

    let raw = row.decisionRaw;
    if (!raw) {
      // Backward compat: old captures don't have decisionRaw.
      // Best-effort reverse-engineering — towerId from features
      // for places, drop everything else.
      if (row.decisionKind !== 'place') { dropped++; continue; }
      const towerId = decodeTowerId(row.actionFeatures);
      if (!towerId) { dropped++; continue; }
      raw = { kind: 'place', towerId, col: null, row: null };
    }
    out.push({
      matchId: row.matchId,
      turnIdx: row.turnIdx,
      faction: row.faction,
      wave: row.wave,
      stateFeatures: row.stateFeatures,
      decisionRaw: raw,
    });
    kept++;
    const ms = matchSummary.get(row.matchId) ?? { faction: row.faction, count: 0, hasRaw: !!row.decisionRaw };
    ms.count++;
    matchSummary.set(row.matchId, ms);
  }
}

mkdirSync(resolve(OUT_PATH, '..'), { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(out));
console.log(`wrote: ${OUT_PATH}`);
console.log(`turns kept: ${kept}, dropped: ${dropped}`);
console.log('matches in captures:');
for (const [mid, s] of matchSummary) {
  console.log(`  ${mid} ${s.faction} : ${s.count} turns ${s.hasRaw ? '(decisionRaw ✓)' : '(legacy, lossy)'}`);
}
