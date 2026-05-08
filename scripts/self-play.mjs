#!/usr/bin/env node
/**
 * v4.4 self-play orchestrator.
 *
 * Runs the alternating defender ↔ director loop for a single
 * (faction, difficulty) cell. Per BRAIN_V4_LOOP.md:
 *   - K=3 defender brain-searches per director brain-search
 *   - Each phase warm-starts from the previous gen's winner
 *   - Frozen pool (last N gens) is persisted but round-robin sampling
 *     across the pool is deferred to v4.5 (this orchestrator uses
 *     latest-vs-latest only)
 *   - Convergence detected via fitness plateau or oscillation
 *
 * Usage:
 *   node --import tsx scripts/self-play.mjs --faction=aliens \
 *     --difficulty=normal --max-rounds=10 --workers=4
 *
 *   node --import tsx scripts/self-play.mjs --faction=aliens \
 *     --resume                # picks up where the last run left off
 *
 * Output layout (under brain-search/v4-{faction}-{difficulty}/):
 *   defender-gen-0.json       seed defender (v3.5 winner or empty)
 *   defender-gen-N.json       defender params after round N
 *   director-gen-0.json       seed director (default counter_pick)
 *   director-gen-N.json       director params after round N
 *   round-N-defender-search/  brain-search workdir for round N defender phase
 *   round-N-director-search/  same for director phase
 *   convergence.json          per-round fitness history
 *   self-play.log             orchestrator log
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
const factionFlag = getFlag('faction') ?? 'aliens';
const difficultyFlag = getFlag('difficulty') ?? 'normal';
const maxRoundsFlag = parseInt(getFlag('max-rounds') ?? '15', 10);
const workersFlag = getFlag('workers') ?? '4';
const defenderEvalsFlag = getFlag('defender-evals') ?? '200';
const directorEvalsFlag = getFlag('director-evals') ?? '120';
const KFlag = parseInt(getFlag('k') ?? '3', 10);  // defender gens per director gen
const resumeFlag = argv.includes('--resume');
const dryRunFlag = argv.includes('--dry-run');

// Convergence params (per BRAIN_V4_LOOP.md).
const PLATEAU_DELTA = 0.02;
const PLATEAU_WINDOW = 5;
const OSCILLATION_DELTA = 0.10;
const OSCILLATION_WINDOW = 3;

// ── Run dir ────────────────────────────────────────────────────────
const cellId = `${factionFlag}-${difficultyFlag}`;
const runDir = resolve(PROJECT_ROOT, 'brain-search', `v4-${cellId}`);
mkdirSync(runDir, { recursive: true });

const logPath = join(runDir, 'self-play.log');
const log = (msg) => {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.error(line);
  try { appendFileSync(logPath, line + '\n'); } catch {}
};

const convergencePath = join(runDir, 'convergence.json');
let convergence = { rounds: [] };
if (existsSync(convergencePath)) {
  try {
    convergence = JSON.parse(readFileSync(convergencePath, 'utf8'));
  } catch {
    log('convergence.json corrupt — starting fresh');
    convergence = { rounds: [] };
  }
}

const persistConvergence = () => {
  writeFileSync(convergencePath, JSON.stringify(convergence, null, 2));
};

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
const lastDefenderGen = maxGen('defender-gen-');
const lastDirectorGen = maxGen('director-gen-');
if (resumeFlag) {
  // Round N is defined by min(defender, director) since we always
  // produce defender first in a round.
  startRound = Math.max(0, Math.min(lastDefenderGen, lastDirectorGen));
  log(`resume: defender at gen ${lastDefenderGen}, director at gen ${lastDirectorGen} → starting round ${startRound + 1}`);
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
      } catch (err) {
        log(`failed to read ${v3SummaryPath}: ${err}`);
      }
    } else {
      log(`defender-gen-0: no v3 archive at ${v3SummaryPath}, using schema defaults`);
    }
    writeFileSync(defenderPath, JSON.stringify({ params: seedParams }, null, 2));
  }
  // Director: defaults from CounterPickWaveDirector schema (empty).
  const directorPath = join(runDir, 'director-gen-0.json');
  if (!existsSync(directorPath)) {
    writeFileSync(directorPath, JSON.stringify({ params: {} }, null, 2));
    log(`director-gen-0: schema defaults`);
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
      cwd: PROJECT_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', (b) => process.stdout.write(b));
    child.stderr.on('data', (b) => process.stderr.write(b));
    child.on('exit', (code) => code === 0 ? resolveP(0) : rejectP(new Error(`brain-search exited ${code}`)));
  });
}

/** Read summary.json from a brain-search run dir, return its winner
 *  params + score. */
function readSummary(dir) {
  const path = join(dir, 'summary.json');
  if (!existsSync(path)) return null;
  try {
    const s = JSON.parse(readFileSync(path, 'utf8'));
    const winner = s.bestSoFar ?? s.bestValidated ?? s.bestRaw;
    if (!winner) return null;
    return { params: winner.params, score: winner.score, avgWave: winner.avgWave };
  } catch (err) {
    log(`failed to read summary at ${path}: ${err}`);
    return null;
  }
}

// ── Phases ──────────────────────────────────────────────────────────

async function runDefenderPhase(round, currentDirectorGen) {
  const phaseDir = join(runDir, `round-${round}-defender-search`);
  const directorParamsPath = join(runDir, `director-gen-${currentDirectorGen}.json`);
  const seedPath = join(runDir, `defender-gen-${round - 1}.json`);

  log(`round ${round} defender phase: searching mazing vs counter_pick (gen-${currentDirectorGen})`);
  await spawnBrainSearch([
    '--brain=mazing',
    `--faction=${factionFlag}`,
    `--difficulty=${difficultyFlag}`,
    `--workers=${workersFlag}`,
    `--max-evals=${defenderEvalsFlag}`,
    `--vs-director=counter_pick`,
    `--vs-director-params=${directorParamsPath}`,
    `--seed-from=${seedPath}`,
    `--resume=${phaseDir}`,
  ]);
  if (dryRunFlag) return { params: {}, score: 0, avgWave: 0 };
  const summary = readSummary(phaseDir);
  if (!summary) throw new Error(`round ${round} defender phase produced no summary`);

  // Persist as defender-gen-{round}.
  const winnerPath = join(runDir, `defender-gen-${round}.json`);
  writeFileSync(winnerPath, JSON.stringify({ params: summary.params, score: summary.score }, null, 2));
  log(`  defender-gen-${round}: score=${(summary.score * 100).toFixed(1)}% avgWave=${summary.avgWave.toFixed(1)}`);
  return summary;
}

async function runDirectorPhase(round, currentDefenderGen) {
  const phaseDir = join(runDir, `round-${round}-director-search`);
  const defenderParamsPath = join(runDir, `defender-gen-${currentDefenderGen}.json`);
  const seedPath = join(runDir, `director-gen-${round - 1}.json`);

  log(`round ${round} director phase: searching counter_pick vs mazing (gen-${currentDefenderGen})`);
  await spawnBrainSearch([
    '--brain=counter_pick',
    `--faction=${factionFlag}`,
    `--difficulty=${difficultyFlag}`,
    `--workers=${workersFlag}`,
    `--max-evals=${directorEvalsFlag}`,
    `--vs-defender-brain=mazing`,
    `--vs-defender-params=${defenderParamsPath}`,
    `--seed-from=${seedPath}`,
    `--resume=${phaseDir}`,
  ]);
  if (dryRunFlag) return { params: {}, score: 0, avgWave: 0 };
  const summary = readSummary(phaseDir);
  if (!summary) throw new Error(`round ${round} director phase produced no summary`);

  const winnerPath = join(runDir, `director-gen-${round}.json`);
  writeFileSync(winnerPath, JSON.stringify({ params: summary.params, score: summary.score }, null, 2));
  log(`  director-gen-${round}: leak_rate=${(summary.score * 100).toFixed(1)}% avgWave=${summary.avgWave.toFixed(1)}`);
  return summary;
}

// ── Convergence detection ───────────────────────────────────────────
function detectConvergence() {
  const rounds = convergence.rounds;
  if (rounds.length < PLATEAU_WINDOW) return null;

  // Plateau: defender + director both move < PLATEAU_DELTA across last N rounds.
  const recent = rounds.slice(-PLATEAU_WINDOW);
  const defScores = recent.map(r => r.defenderScore);
  const dirScores = recent.map(r => r.directorScore);
  const defRange = Math.max(...defScores) - Math.min(...defScores);
  const dirRange = Math.max(...dirScores) - Math.min(...dirScores);
  if (defRange < PLATEAU_DELTA && dirRange < PLATEAU_DELTA) {
    return { kind: 'plateau', defRange, dirRange };
  }

  // Oscillation: defender's score swings > OSCILLATION_DELTA in the last
  // OSCILLATION_WINDOW rounds.
  if (rounds.length >= OSCILLATION_WINDOW + 1) {
    const oscWindow = rounds.slice(-OSCILLATION_WINDOW - 1);
    let oscDef = 0;
    for (let i = 1; i < oscWindow.length; i++) {
      oscDef += Math.abs(oscWindow[i].defenderScore - oscWindow[i - 1].defenderScore);
    }
    if (oscDef / OSCILLATION_WINDOW > OSCILLATION_DELTA) {
      return { kind: 'oscillation', avgSwing: oscDef / OSCILLATION_WINDOW };
    }
  }

  return null;
}

// ── Outer loop ──────────────────────────────────────────────────────
log(`self-play start: cell=${cellId} K=${KFlag} maxRounds=${maxRoundsFlag} defenderEvals=${defenderEvalsFlag} directorEvals=${directorEvalsFlag}`);

// In K-spaced loop semantics: every round runs K defender phases then 1
// director phase. Simpler model for v4.4 (defer K>1 to v4.5): 1 defender
// phase + 1 director phase per round. The K knob is recorded but not
// used yet — would require multi-defender-gen tracking.
if (KFlag !== 1) log(`note: --k=${KFlag} requested but v4.4 uses K=1; multi-gen K deferred to v4.5`);

let lastDirectorGenForDefender = lastDirectorGen >= 0 ? lastDirectorGen : 0;
let lastDefenderGenForDirector = lastDefenderGen >= 0 ? lastDefenderGen : 0;

for (let round = startRound + 1; round <= maxRoundsFlag; round++) {
  // Defender phase: searches against the latest director.
  const defSummary = await runDefenderPhase(round, lastDirectorGenForDefender);

  // Director phase: searches against the new defender.
  const dirSummary = await runDirectorPhase(round, round);
  lastDirectorGenForDefender = round;
  lastDefenderGenForDirector = round;

  convergence.rounds.push({
    round,
    defenderScore: defSummary.score,
    defenderAvgWave: defSummary.avgWave,
    directorScore: dirSummary.score,
    directorAvgWave: dirSummary.avgWave,
  });
  persistConvergence();

  const c = detectConvergence();
  if (c) {
    log(`converged at round ${round}: ${c.kind} (${JSON.stringify(c)})`);
    log(`final defender → ${join(runDir, `defender-gen-${round}.json`)}`);
    log(`final director → ${join(runDir, `director-gen-${round}.json`)}`);
    break;
  }
}

if (!detectConvergence()) {
  log(`reached max-rounds=${maxRoundsFlag} without convergence`);
}

log(`self-play complete. summary at ${convergencePath}`);
