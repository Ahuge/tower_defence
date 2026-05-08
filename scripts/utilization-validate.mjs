#!/usr/bin/env node
/**
 * v5.4 — utilization + ablation + redundancy validation harness.
 *
 * Runs the validation loop from BRAIN_V5_PLAN.md:
 *   1. Baseline: N matches with current defender + faction config.
 *      Aggregate per-tower utilization.
 *   2. Ablation: for each tower below the flag threshold, re-run N
 *      matches with that tower excluded. Δ winrate vs baseline.
 *   3. Redundancy: for each ambiguous tower (flagged + |Δ| < 2pp),
 *      probe by removing similar-role peers one at a time and seeing
 *      whether the flagged tower becomes load-bearing in their
 *      absence.
 *   4. Report: write BRAIN_V5_RESULTS_{faction}.md with per-tower
 *      classification.
 *
 * Usage:
 *   node --import tsx scripts/utilization-validate.mjs --faction=mechanical \
 *     --workers=4 --n=50
 *
 *   With v5.3 tuned params:
 *   node --import tsx scripts/utilization-validate.mjs --faction=mechanical \
 *     --vs-defender-params=brain-search/v5-mechanical-normal/defender-gen-N.json \
 *     --vs-faction-params=brain-search/v5-mechanical-normal/faction-gen-N.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');

// ── CLI ────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const getFlag = (name) => {
  const m = argv.find(a => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!m) return null;
  return m.includes('=') ? m.split('=').slice(1).join('=') : '';
};
const factionFlag = getFlag('faction') ?? 'mechanical';
const difficultyFlag = getFlag('difficulty') ?? 'normal';
const N = parseInt(getFlag('n') ?? '50', 10);
const workersFlag = parseInt(getFlag('workers') ?? '4', 10);
const flagThreshold = parseFloat(getFlag('flag-threshold') ?? '0.10');
const vsDefenderParamsFile = getFlag('vs-defender-params');
const vsFactionParamsFile = getFlag('vs-faction-params');
const outputDir = getFlag('output') ?? `brain-search/v5-${factionFlag}-${difficultyFlag}`;

// ── Imports (after CLI so we can fail fast) ────────────────────────
await import(`${PROJECT_ROOT}/src/headless/harness/jsdom-setup.ts`);
const { runMatch } = await import(`${PROJECT_ROOT}/src/headless/HeadlessMatch.ts`);
const { FACTIONS } = await import(`${PROJECT_ROOT}/src/data/Factions.ts`);
const { TOWER_TYPES } = await import(`${PROJECT_ROOT}/src/data/TowerTypes.ts`);
const { getTowerRole } = await import(`${PROJECT_ROOT}/src/data/TowerRoles.ts`);
const { summarizeUtilization, formatUtilization } = await import(`${PROJECT_ROOT}/src/data/balance/UtilizationSummary.ts`);
await import(`${PROJECT_ROOT}/src/systems/bots/brains/MazingBrain.ts`);

const factionDef = FACTIONS[factionFlag];
if (!factionDef) {
  console.error(`unknown faction: ${factionFlag}`);
  process.exit(1);
}

// Load fixed params (optional — defaults to vanilla TOWER_TYPES + default mazing).
function loadJsonParams(path) {
  if (!path) return null;
  try {
    const doc = JSON.parse(readFileSync(path, 'utf8'));
    return doc.params ?? doc.bestSoFar?.params ?? doc;
  } catch (err) {
    console.error(`failed to load ${path}: ${err}`);
    process.exit(1);
  }
}
const defenderParams = loadJsonParams(vsDefenderParamsFile);
const factionParams = loadJsonParams(vsFactionParamsFile);

// ── Eval helper ────────────────────────────────────────────────────
async function runBatch(label, excludes = [], n = N) {
  // Set env for this batch.
  if (defenderParams) process.env.MAZING_BRAIN_PARAMS = JSON.stringify(defenderParams);
  else delete process.env.MAZING_BRAIN_PARAMS;
  if (factionParams) process.env[`FACTION_BALANCE_${factionFlag.toUpperCase()}_PARAMS`] = JSON.stringify(factionParams);
  else delete process.env[`FACTION_BALANCE_${factionFlag.toUpperCase()}_PARAMS`];
  if (excludes.length > 0) process.env[`FACTION_ROSTER_${factionFlag.toUpperCase()}_EXCLUDE`] = excludes.join(',');
  else delete process.env[`FACTION_ROSTER_${factionFlag.toUpperCase()}_EXCLUDE`];

  const perMatchCounts = [];
  let wins = 0;
  for (let i = 0; i < n; i++) {
    const seed = (1 * 31 + i * 7919) >>> 0;
    const r = await runMatch({
      faction: factionFlag, difficulty: difficultyFlag, mapId: 'plains',
      brainId: 'mazing', matchMode: 'standard', waveCount: 20, seed,
    });
    if (r.outcome === 'win') wins++;
    perMatchCounts.push(r.towerIdCounts ?? {});
  }
  delete process.env[`FACTION_ROSTER_${factionFlag.toUpperCase()}_EXCLUDE`];
  return { label, wins, n, winRate: wins / n, perMatchCounts };
}

// ── Run validation ─────────────────────────────────────────────────
console.log(`v5.4 utilization validation: ${factionFlag}/${difficultyFlag} n=${N}`);
console.log(`  defender params: ${vsDefenderParamsFile ?? '(default)'}`);
console.log(`  faction params:  ${vsFactionParamsFile ?? '(vanilla)'}`);
console.log('');

void workersFlag;  // not currently used — runs sequentially. Future: parallel batches.

console.log('=== Baseline ===');
const baseline = await runBatch('baseline');
const utilReport = summarizeUtilization(baseline.perMatchCounts, flagThreshold, factionDef.towerIds);
console.log(`baseline: ${baseline.wins}/${baseline.n} wins (${(baseline.winRate * 100).toFixed(1)}%)`);
console.log(formatUtilization(utilReport));
console.log('');

if (utilReport.flaggedLow.length === 0) {
  console.log('No towers below flag threshold. Validation passed at baseline.');
  process.exit(0);
}

// ── Ablation pass ──────────────────────────────────────────────────
console.log('=== Ablation pass (each flagged tower removed individually) ===');
const ablations = [];
for (const flaggedId of utilReport.flaggedLow) {
  const result = await runBatch(`ablate ${flaggedId}`, [flaggedId]);
  const delta = result.winRate - baseline.winRate;
  console.log(`  remove ${flaggedId.padEnd(22)} → ${result.wins}/${result.n} (Δ ${delta >= 0 ? '+' : ''}${(delta * 100).toFixed(1)}pp)`);
  ablations.push({ id: flaggedId, ablatedWinRate: result.winRate, delta });
}
console.log('');

// ── Classify ───────────────────────────────────────────────────────
console.log('=== Classification ===');
const classifications = [];
for (const a of ablations) {
  let verdict;
  if (a.delta <= -0.05) {
    verdict = 'load-bearing';  // removing this tower hurts ≥ 5pp
  } else if (a.delta >= 0.05) {
    verdict = 'actively-bad';  // removing this tower helps ≥ 5pp (red flag)
  } else {
    verdict = 'ambiguous';     // |Δ| < 5pp; redundant or brain-gap
  }
  classifications.push({ ...a, verdict });
  console.log(`  ${a.id.padEnd(22)} ${verdict}`);
}
console.log('');

// ── Redundancy probe (ambiguous-only) ───────────────────────────────
const ambiguous = classifications.filter(c => c.verdict === 'ambiguous');
if (ambiguous.length > 0) {
  console.log('=== Redundancy probe (ambiguous towers) ===');
  for (const a of ambiguous) {
    const tower = TOWER_TYPES[a.id];
    if (!tower) continue;
    const targetRole = getTowerRole(tower);
    // Find peers — same role, different id.
    const peers = factionDef.towerIds
      .filter(id => id !== a.id && id !== tower.id)
      .map(id => TOWER_TYPES[id])
      .filter(Boolean)
      .filter(t => getTowerRole(t) === targetRole);
    if (peers.length === 0) {
      a.redundancyVerdict = 'no-peers';  // unique role within faction
      console.log(`  ${a.id.padEnd(22)} no-peers (unique ${targetRole})`);
      continue;
    }
    // Probe: remove the most-utilized peer and see if win rate is preserved
    // (meaning the flagged tower could substitute) or drops (meaning the
    // peer is the load-bearer and the flagged tower can't replace it).
    const topPeer = peers
      .map(p => ({ p, share: utilReport.byId.find(s => s.id === p.id)?.shareOfPlay ?? 0 }))
      .sort((a, b) => b.share - a.share)[0];
    if (!topPeer || topPeer.share === 0) {
      a.redundancyVerdict = 'no-active-peer';
      console.log(`  ${a.id.padEnd(22)} no-active-peer (peers exist but unused too)`);
      continue;
    }
    // Probe: remove the peer. Two signals:
    //   1. Δ winRate — does the kit still win without the peer?
    //   2. Did the flagged tower's utilization go UP after peer
    //      removal? Yes → brain CAN use the flagged tower, it just
    //      prefers the peer (redundancy). No → brain doesn't know how
    //      to use the flagged tower even when the peer is unavailable
    //      (genuine brain gap).
    const peerOnlyExcluded = await runBatch(`remove peer ${topPeer.p.id}`, [topPeer.p.id]);
    const peerDelta = peerOnlyExcluded.winRate - baseline.winRate;
    const probeUtil = summarizeUtilization(peerOnlyExcluded.perMatchCounts, 0, factionDef.towerIds);
    const flaggedUtilAfter = probeUtil.byId.find(s => s.id === a.id)?.utilization ?? 0;
    if (flaggedUtilAfter >= 0.50) {
      // Brain picks the flagged tower in ≥50% of matches when the
      // peer is gone → it CAN use it; the peer was just preferred.
      a.redundancyVerdict = 'redundant-with-' + topPeer.p.id;
      console.log(`  ${a.id.padEnd(22)} redundant-with-${topPeer.p.id} (utilization ${(flaggedUtilAfter * 100).toFixed(0)}% with peer removed, peer Δ ${(peerDelta * 100).toFixed(1)}pp)`);
    } else {
      // Brain still doesn't pick the flagged tower with the peer gone
      // → the planner doesn't model the flagged tower's value. Real
      // brain gap; file as missing scorer.
      a.redundancyVerdict = 'brain-gap-vs-' + topPeer.p.id;
      console.log(`  ${a.id.padEnd(22)} brain-gap (utilization stays ${(flaggedUtilAfter * 100).toFixed(0)}% even with peer ${topPeer.p.id} removed; planner doesn't model the trait)`);
    }
  }
  console.log('');
}

// ── Write report ───────────────────────────────────────────────────
mkdirSync(resolve(PROJECT_ROOT, outputDir), { recursive: true });
const reportPath = resolve(PROJECT_ROOT, outputDir, `BRAIN_V5_RESULTS_${factionFlag}.md`);
const reportLines = [
  `# v5.4 utilization report — ${factionFlag} / ${difficultyFlag}`,
  '',
  `n=${N}, baseline win rate ${(baseline.winRate * 100).toFixed(1)}% (${baseline.wins}/${baseline.n})`,
  '',
  '## Per-tower utilization (sorted by share of play)',
  '',
  '| tower | util% | share% | total | avg/match |',
  '|---|---|---|---|---|',
  ...utilReport.byId.map(s => `| ${s.id} | ${(s.utilization*100).toFixed(0)}% | ${(s.shareOfPlay*100).toFixed(1)}% | ${s.totalPlacements} | ${s.avgPlacements.toFixed(1)} |`),
  '',
  '## Flagged low-utilization towers (< ' + (flagThreshold*100) + '% of matches)',
  '',
];
if (utilReport.flaggedLow.length === 0) {
  reportLines.push('None — every tower in the faction has utilization above the threshold.');
} else {
  reportLines.push('| tower | ablation Δ | verdict | redundancy |');
  reportLines.push('|---|---|---|---|');
  for (const c of classifications) {
    const dRaw = c.delta >= 0 ? '+' : '';
    reportLines.push(`| ${c.id} | ${dRaw}${(c.delta*100).toFixed(1)}pp | ${c.verdict} | ${c.redundancyVerdict ?? '—'} |`);
  }
}
reportLines.push('');
reportLines.push('## Recommendations');
reportLines.push('');
const loadBearing = classifications.filter(c => c.verdict === 'load-bearing');
const activelyBad = classifications.filter(c => c.verdict === 'actively-bad');
const redundant = classifications.filter(c => c.redundancyVerdict?.startsWith('redundant-with-'));
const brainGap = classifications.filter(c => c.redundancyVerdict?.startsWith('brain-gap-vs-'));
if (loadBearing.length > 0) reportLines.push(`- **Niche but valuable** (low util, big ablation drop): ${loadBearing.map(c => c.id).join(', ')}. Keep as-is.`);
if (activelyBad.length > 0) reportLines.push(`- **Red flag** (removing improves win rate ≥5pp): ${activelyBad.map(c => c.id).join(', ')}. Re-tune or investigate.`);
if (redundant.length > 0) reportLines.push(`- **Redundant** with peers: ${redundant.map(c => `${c.id} → ${c.redundancyVerdict.replace('redundant-with-', '')}`).join(', ')}. Differentiate or merge.`);
if (brainGap.length > 0) reportLines.push(`- **Brain gap**: ${brainGap.map(c => c.id).join(', ')}. Trait isn't being modeled by the planner — file as missing scorer.`);
writeFileSync(reportPath, reportLines.join('\n'));
console.log(`report written to ${reportPath}`);

// v5.5: structured JSON output for the gates checker. Produced alongside
// the markdown so v5-gates.mjs can read it without parsing prose.
const jsonReport = {
  faction: factionFlag,
  difficulty: difficultyFlag,
  n: N,
  flagThreshold,
  defenderParamsFile: vsDefenderParamsFile ?? null,
  factionParamsFile: vsFactionParamsFile ?? null,
  baseline: { wins: baseline.wins, n: baseline.n, winRate: baseline.winRate },
  utilization: utilReport.byId.map(s => ({
    id: s.id,
    utilization: s.utilization,
    shareOfPlay: s.shareOfPlay,
    totalPlacements: s.totalPlacements,
    avgPlacements: s.avgPlacements,
  })),
  flaggedLow: utilReport.flaggedLow,
  classifications: classifications.map(c => ({
    id: c.id,
    ablatedWinRate: c.ablatedWinRate,
    delta: c.delta,
    verdict: c.verdict,
    redundancyVerdict: c.redundancyVerdict ?? null,
  })),
};
const jsonPath = resolve(PROJECT_ROOT, outputDir, `validation-results-${factionFlag}.json`);
writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
console.log(`json results written to ${jsonPath}`);
