#!/usr/bin/env node
/**
 * v5.5 — diff generator.
 *
 * Reads a faction-gen JSON from a v5 self-balance run and produces a
 * human-readable diff against the current TOWER_TYPES values. Designed
 * to be the artifact a designer reviews before deciding whether to
 * apply the changes.
 *
 * Output is markdown so it's easy to read in a PR description or
 * review thread. Knobs are grouped by tower for readability.
 *
 * Usage:
 *   node --import tsx scripts/v5-diff.mjs \
 *     --faction-params=brain-search/v5-mechanical-normal/faction-gen-5.json \
 *     [--defender-params=...]
 *     [--output=path]
 */
import { readFileSync, writeFileSync } from 'node:fs';
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
const factionParamsFile = getFlag('faction-params');
const defenderParamsFile = getFlag('defender-params');
const outputFile = getFlag('output');

if (!factionParamsFile && !defenderParamsFile) {
  console.error('usage: v5-diff.mjs --faction-params=PATH [--defender-params=PATH] [--output=PATH]');
  process.exit(1);
}

await import(`${PROJECT_ROOT}/src/headless/harness/jsdom-setup.ts`);
const { TOWER_TYPES } = await import(`${PROJECT_ROOT}/src/data/TowerTypes.ts`);

function loadParams(path) {
  if (!path) return null;
  const doc = JSON.parse(readFileSync(path, 'utf8'));
  return doc.params ?? doc.bestSoFar?.params ?? doc;
}

const factionParams = loadParams(factionParamsFile);
const defenderParams = loadParams(defenderParamsFile);

const lines = [];
lines.push(`# v5.5 diff report`);
lines.push('');

// ── Faction-balance diff ──────────────────────────────────────────
if (factionParams) {
  lines.push(`## Faction-balance changes`);
  lines.push(`Source: \`${factionParamsFile}\``);
  lines.push('');

  // Group by tower id.
  const byTower = {};
  for (const [key, value] of Object.entries(factionParams)) {
    const parts = key.split('.');
    const towerId = parts[0];
    if (!byTower[towerId]) byTower[towerId] = [];
    byTower[towerId].push({ key, parts, value });
  }

  let totalChanges = 0;
  let hadAny = false;
  for (const [towerId, knobs] of Object.entries(byTower)) {
    const tower = TOWER_TYPES[towerId];
    if (!tower) continue;
    const changes = [];
    for (const k of knobs) {
      const current = resolveLive(tower, k.parts);
      if (current === undefined) continue;
      // Only show actual diffs (skip default-equal entries).
      const epsilon = 1e-6;
      if (typeof current === 'number' && Math.abs(current - k.value) < epsilon) continue;
      changes.push({ field: k.parts.slice(1).join('.'), from: current, to: k.value });
    }
    if (changes.length === 0) continue;
    hadAny = true;
    totalChanges += changes.length;
    lines.push(`### ${towerId}`);
    lines.push('');
    lines.push('| field | current | proposed | Δ |');
    lines.push('|---|---|---|---|');
    for (const c of changes) {
      const delta = (typeof c.from === 'number' && typeof c.to === 'number')
        ? formatDelta(c.from, c.to)
        : '—';
      lines.push(`| ${c.field} | ${formatVal(c.from)} | ${formatVal(c.to)} | ${delta} |`);
    }
    lines.push('');
  }

  if (!hadAny) {
    lines.push('No faction-balance changes vs current TOWER_TYPES (params equal current values).');
    lines.push('');
  } else {
    lines.push(`**Total faction-balance field changes: ${totalChanges}**`);
    lines.push('');
  }
}

// ── Defender-params diff ──────────────────────────────────────────
if (defenderParams) {
  lines.push(`## Defender-params changes (mazing brain)`);
  lines.push(`Source: \`${defenderParamsFile}\``);
  lines.push('');
  // We don't have a clean way to read the live MAZING_FACTION_CONFIGS
  // value without faction context, so just print the params verbatim.
  // The designer applying this diff knows which faction's config
  // entry to update.
  lines.push('| param | proposed value |');
  lines.push('|---|---|');
  for (const [key, value] of Object.entries(defenderParams)) {
    lines.push(`| ${key} | ${formatVal(value)} |`);
  }
  lines.push('');
  lines.push(`**Total defender param fields: ${Object.keys(defenderParams).length}**`);
  lines.push('');
  lines.push('Apply by adding/updating the matching faction entry in `MAZING_FACTION_CONFIGS` at `src/systems/bots/brains/MazingBrain.ts`.');
}

const output = lines.join('\n');
if (outputFile) {
  writeFileSync(outputFile, output);
  console.log(`diff written to ${outputFile}`);
} else {
  process.stdout.write(output);
}

// ── Helpers ────────────────────────────────────────────────────────
function resolveLive(tower, parts) {
  if (parts.length === 2) {
    return tower[parts[1]];
  }
  if (parts.length === 4 && parts[1] === 'traits') {
    const trait = tower.traits.find(t => t.id === parts[2]);
    return trait ? trait[parts[3]] : undefined;
  }
  return undefined;
}

function formatVal(v) {
  if (typeof v === 'number') {
    return Number.isInteger(v) ? String(v) : v.toFixed(3);
  }
  return String(v);
}

function formatDelta(from, to) {
  const d = to - from;
  const sign = d > 0 ? '+' : '';
  if (Math.abs(d) < 0.01) return `${sign}${d.toFixed(3)}`;
  if (from === 0) return `${sign}${formatVal(d)} (was 0)`;
  const pct = (d / Math.abs(from)) * 100;
  return `${sign}${formatVal(d)} (${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%)`;
}
