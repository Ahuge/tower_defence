#!/usr/bin/env node
/**
 * v5.3 — faction self-balance orchestrator.
 *
 * Two-stage alternating search per BRAIN_V5_PLAN.md:
 *   Stage A: faction tune — search faction-balance knobs vs frozen
 *            defender (mazing). Goal: find tower-stat / trait-param
 *            tunings that let the kit win against the standard wave
 *            generator (or against a frozen v4 director if given).
 *   Stage B: defender tune — search mazing knobs vs the new tuned
 *            faction. Standard v3.5 brain-search path with
 *            FactionBalanceLoader patching TOWER_TYPES per match.
 *   Iterate K rounds until both stages plateau.
 *
 * Usage:
 *   node --import tsx scripts/faction-balance.mjs --faction=mechanical \
 *     --max-rounds=5 --workers=4 \
 *     --faction-evals=150 --defender-evals=200
 *
 *   node --import tsx scripts/faction-balance.mjs --faction=mechanical \
 *     --resume   # continue from highest existing gen
 *
 * Output (under brain-search/v5-{faction}-{difficulty}/):
 *   faction-gen-N.json     # tuned faction-balance knobs after round N
 *   defender-gen-N.json    # tuned mazing-brain params after round N
 *   round-N-faction-search/, round-N-defender-search/
 *   convergence.json
 *   faction-balance.log
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');
const BRAIN_SEARCH_SCRIPT = resolve(PROJECT_ROOT, 'scripts/brain-search.mjs');

// ── CLI args ────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const getFlag = (name) => {
  const m = argv.find(a => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!m) return null;
  return m.includes('=') ? m.split('=').slice(1).join('=') : '';
};
const factionFlag = getFlag('faction') ?? 'mechanical';
const difficultyFlag = getFlag('difficulty') ?? 'normal';
const maxRoundsFlag = parseInt(getFlag('max-rounds') ?? '5', 10);
const workersFlag = getFlag('workers') ?? '4';
const factionEvalsFlag = getFlag('faction-evals') ?? '150';
const defenderEvalsFlag = getFlag('defender-evals') ?? '200';
const poolSizeFlag = parseInt(getFlag('pool-size') ?? '3', 10);
const vsDirectorFlag = getFlag('vs-director');             // optional adversarial director
const vsDirectorParams = getFlag('vs-director-params');    // optional director params path
const resumeFlag = argv.includes('--resume');
const dryRunFlag = argv.includes('--dry-run');

// Convergence thresholds (mirrors self-play.mjs).
const PLATEAU_DELTA = 0.02;
const PLATEAU_WINDOW = 5;

// ── Run dir ────────────────────────────────────────────────────────
const cellId = `${factionFlag}-${difficultyFlag}`;
const runDir = resolve(PROJECT_ROOT, 'brain-search', `v5-${cellId}`);
mkdirSync(runDir, { recursive: true });

const logPath = join(runDir, 'faction-balance.log');
const log = (msg) => {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.error(line);
  try { appendFileSync(logPath, line + '\n'); } catch {}
};

const convergencePath = join(runDir, 'convergence.json');
let convergence = { rounds: [] };
if (existsSync(convergencePath)) {
  try { convergence = JSON.parse(readFileSync(convergencePath, 'utf8')); }
  catch { convergence = { rounds: [] }; }
}
const persistConvergence = () => writeFileSync(convergencePath, JSON.stringify(convergence, null, 2));

// ── Resume detection ───────────────────────────────────────────────
function maxGen(prefix) {
  const files = readdirSync(runDir).filter(f => f.startsWith(prefix) && f.endsWith('.json'));
  let max = -1;
  for (const f of files) {
    const m = f.match(new RegExp(`^${prefix}(\\d+)\\.json$`));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max;
}

let startRound = 0;
const lastFactionGen = maxGen('faction-gen-');
const lastDefenderGen = maxGen('defender-gen-');
if (resumeFlag) {
  startRound = Math.max(0, Math.min(lastFactionGen, lastDefenderGen));
  log(`resume: faction at gen ${lastFactionGen}, defender at gen ${lastDefenderGen} → starting round ${startRound + 1}`);
}

// ── Initial seeds ───────────────────────────────────────────────────
function initSeeds() {
  // Defender: warm-start from v3 brain-search archive if available.
  const defenderPath = join(runDir, 'defender-gen-0.json');
  if (!existsSync(defenderPath)) {
    const v3SummaryPath = resolve(PROJECT_ROOT, 'brain-search', `mazing-${factionFlag}-${difficultyFlag}/summary.json`);
    let seedParams = {};
    if (existsSync(v3SummaryPath)) {
      try {
        const summary = JSON.parse(readFileSync(v3SummaryPath, 'utf8'));
        seedParams = summary.bestSoFar?.params ?? summary.params ?? {};
        log(`defender-gen-0: warm-started from ${v3SummaryPath}`);
      } catch { /* fall through */ }
    }
    writeFileSync(defenderPath, JSON.stringify({ params: seedParams }, null, 2));
  }
  // Faction: starts at vanilla TOWER_TYPES (empty params dict = no patches).
  const factionPath = join(runDir, 'faction-gen-0.json');
  if (!existsSync(factionPath)) {
    writeFileSync(factionPath, JSON.stringify({ params: {} }, null, 2));
    log(`faction-gen-0: vanilla TOWER_TYPES (no overrides)`);
  }
}
initSeeds();

// ── Brain-search subprocess wrapper ────────────────────────────────
function spawnBrainSearch(args) {
  if (dryRunFlag) {
    log(`[dry-run] would run: brain-search ${args.join(' ')}`);
    return Promise.resolve(0);
  }
  return new Promise((resolveP, rejectP) => {
    const child = spawn(process.execPath, ['--import', 'tsx', BRAIN_SEARCH_SCRIPT, ...args], {
      cwd: PROJECT_ROOT, stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', (b) => process.stdout.write(b));
    child.stderr.on('data', (b) => process.stderr.write(b));
    child.on('exit', (code) => code === 0 ? resolveP(0) : rejectP(new Error(`brain-search exited ${code}`)));
  });
}

function readSummary(dir) {
  const path = join(dir, 'summary.json');
  if (!existsSync(path)) return null;
  try {
    const s = JSON.parse(readFileSync(path, 'utf8'));
    const winner = s.bestSoFar ?? s.bestValidated ?? s.bestRaw;
    if (!winner) return null;
    return { params: winner.params, score: winner.score, avgWave: winner.avgWave };
  } catch (err) { log(`failed to read summary at ${path}: ${err}`); return null; }
}

/** v4.6-style frozen pool: last N existing gens of `kind`, latest first. */
function frozenPool(kind, latestGen, size) {
  const paths = [];
  for (let i = latestGen; i >= 0 && paths.length < size; i--) {
    const path = join(runDir, `${kind}-gen-${i}.json`);
    if (existsSync(path)) paths.push(path);
  }
  return paths;
}

// ── Phases ──────────────────────────────────────────────────────────

async function runFactionPhase(round, currentDefenderGen) {
  const phaseDir = join(runDir, `round-${round}-faction-search`);
  const defenderPool = frozenPool('defender', currentDefenderGen, poolSizeFlag);
  const seedPath = join(runDir, `faction-gen-${round - 1}.json`);

  log(`round ${round} faction phase: tuning faction-balance vs mazing pool [${defenderPool.map(p => p.match(/defender-gen-(\d+)/)?.[1]).join(',')}]`);
  const args = [
    '--brain=faction_balance',
    `--faction=${factionFlag}`,
    `--difficulty=${difficultyFlag}`,
    `--workers=${workersFlag}`,
    `--max-evals=${factionEvalsFlag}`,
    `--vs-defender-brain=mazing`,
    `--vs-defender-params=${defenderPool.join(',')}`,
    `--seed-from=${seedPath}`,
    `--resume=${phaseDir}`,
  ];
  if (vsDirectorFlag) args.push(`--vs-director=${vsDirectorFlag}`);
  if (vsDirectorParams) args.push(`--vs-director-params=${vsDirectorParams}`);
  await spawnBrainSearch(args);
  if (dryRunFlag) return { params: {}, score: 0, avgWave: 0 };
  const summary = readSummary(phaseDir);
  if (!summary) throw new Error(`round ${round} faction phase produced no summary`);
  const winnerPath = join(runDir, `faction-gen-${round}.json`);
  writeFileSync(winnerPath, JSON.stringify({ params: summary.params, score: summary.score }, null, 2));
  log(`  faction-gen-${round}: defender_winrate=${(summary.score * 100).toFixed(1)}% avgWave=${summary.avgWave.toFixed(1)}`);
  return summary;
}

async function runDefenderPhase(round, currentFactionGen) {
  const phaseDir = join(runDir, `round-${round}-defender-search`);
  const factionPool = frozenPool('faction', currentFactionGen, poolSizeFlag);
  const seedPath = join(runDir, `defender-gen-${round - 1}.json`);

  log(`round ${round} defender phase: tuning mazing vs faction pool [${factionPool.map(p => p.match(/faction-gen-(\d+)/)?.[1]).join(',')}]`);
  const args = [
    '--brain=mazing',
    `--faction=${factionFlag}`,
    `--difficulty=${difficultyFlag}`,
    `--workers=${workersFlag}`,
    `--max-evals=${defenderEvalsFlag}`,
    `--vs-faction-params=${factionPool.join(',')}`,
    `--seed-from=${seedPath}`,
    `--resume=${phaseDir}`,
  ];
  if (vsDirectorFlag) args.push(`--vs-director=${vsDirectorFlag}`);
  if (vsDirectorParams) args.push(`--vs-director-params=${vsDirectorParams}`);
  await spawnBrainSearch(args);
  if (dryRunFlag) return { params: {}, score: 0, avgWave: 0 };
  const summary = readSummary(phaseDir);
  if (!summary) throw new Error(`round ${round} defender phase produced no summary`);
  const winnerPath = join(runDir, `defender-gen-${round}.json`);
  writeFileSync(winnerPath, JSON.stringify({ params: summary.params, score: summary.score }, null, 2));
  log(`  defender-gen-${round}: winrate=${(summary.score * 100).toFixed(1)}% avgWave=${summary.avgWave.toFixed(1)}`);
  return summary;
}

// ── Convergence ────────────────────────────────────────────────────
function detectConvergence() {
  const rounds = convergence.rounds;
  if (rounds.length < PLATEAU_WINDOW) return null;
  const recent = rounds.slice(-PLATEAU_WINDOW);
  const factionScores = recent.map(r => r.factionScore);
  const defenderScores = recent.map(r => r.defenderScore);
  const fRange = Math.max(...factionScores) - Math.min(...factionScores);
  const dRange = Math.max(...defenderScores) - Math.min(...defenderScores);
  if (fRange < PLATEAU_DELTA && dRange < PLATEAU_DELTA) {
    return { kind: 'plateau', fRange, dRange };
  }
  return null;
}

// ── Outer loop ──────────────────────────────────────────────────────
log(`v5.3 self-balance start: cell=${cellId} maxRounds=${maxRoundsFlag} factionEvals=${factionEvalsFlag} defenderEvals=${defenderEvalsFlag} poolSize=${poolSizeFlag}`);

let lastFactionGenForDefender = lastFactionGen >= 0 ? lastFactionGen : 0;
let lastDefenderGenForFaction = lastDefenderGen >= 0 ? lastDefenderGen : 0;

for (let round = startRound + 1; round <= maxRoundsFlag; round++) {
  const fSummary = await runFactionPhase(round, lastDefenderGenForFaction);
  lastFactionGenForDefender = round;

  const dSummary = await runDefenderPhase(round, lastFactionGenForDefender);
  lastDefenderGenForFaction = round;

  convergence.rounds.push({
    round,
    factionScore: fSummary.score,
    factionAvgWave: fSummary.avgWave,
    defenderScore: dSummary.score,
    defenderAvgWave: dSummary.avgWave,
  });
  persistConvergence();

  const c = detectConvergence();
  if (c) {
    log(`converged at round ${round}: ${c.kind} (${JSON.stringify(c)})`);
    log(`final faction → ${join(runDir, `faction-gen-${round}.json`)}`);
    log(`final defender → ${join(runDir, `defender-gen-${round}.json`)}`);
    break;
  }
}

if (!detectConvergence()) {
  log(`reached max-rounds=${maxRoundsFlag} without convergence`);
}
log(`v5.3 self-balance complete. summary at ${convergencePath}`);
