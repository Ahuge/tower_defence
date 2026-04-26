#!/usr/bin/env node
/**
 * Brain-search CLI — runs a (μ+λ) ES loop over BalancedBrain params,
 * scoring each candidate on a single (faction, difficulty) cell.
 *
 * Persistence:
 *   brain-search/<runId>/evaluations.jsonl   one line per eval (search + validate)
 *   brain-search/<runId>/summary.json        final winner + history
 *   brain-search/<runId>/run.log             progress log
 *
 * Crash recovery: per-eval append to evaluations.jsonl. Resume reads
 * the file back, replays into the manager, and continues from the
 * next eval id. In-flight (incomplete) evals are dropped — at most
 * one batch (~λ matches) of work is lost.
 *
 * Usage:
 *   node --import tsx scripts/brain-search.mjs --brain=balanced --faction=arcane --difficulty=normal
 *   node --import tsx scripts/brain-search.mjs --resume=brain-search/balanced-arcane-normal
 *   node --import tsx scripts/brain-search.mjs --probe=8       # one-shot 8-config sensitivity probe
 *   node --import tsx scripts/brain-search.mjs --workers=8
 *   node --import tsx scripts/brain-search.mjs --max-evals=300
 */
import {
  writeFileSync, mkdirSync, existsSync, appendFileSync, readFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { availableParallelism } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = resolve(HERE, '..');
const WORKER_ENTRY = resolve(PROJECT_ROOT, 'src/headless/brain-search/brain-search-worker.ts');

const argv = process.argv.slice(2);
const getFlag = (name) => {
  const m = argv.find(a => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!m) return null;
  return m.includes('=') ? m.split('=').slice(1).join('=') : '';
};
const hasFlag = (name) => argv.includes(`--${name}`);

const brainFlag = getFlag('brain') ?? 'balanced';
const factionFlag = getFlag('faction') ?? 'arcane';
const difficultyFlag = getFlag('difficulty') ?? 'normal';
const resumeFlag = getFlag('resume');
const workersFlag = getFlag('workers');
const maxEvalsFlag = getFlag('max-evals');
const probeFlag = getFlag('probe');
const seedsFlag = getFlag('search-seeds');
const validateSeedsFlag = getFlag('validate-seeds');
const seedFromFlag = getFlag('seed-from');

// ── jsdom + dynamic imports of TS sources ──────────────────────────
await import('../src/headless/harness/jsdom-setup.ts');
const { BrainSearchManager, DEFAULT_MANAGER_CONFIG } = await import('../src/headless/brain-search/BrainSearchManager.ts');

// Pick the right schema for the brain under test. Each brain's
// search schema lives next to its impl; the search loop is otherwise
// brain-agnostic.
let BRAIN_SCHEMA;
if (brainFlag === 'balanced') {
  ({ BALANCED_BRAIN_SCHEMA: BRAIN_SCHEMA } = await import('../src/headless/brain-search/BalancedBrainSchema.ts'));
} else if (brainFlag === 'greedy') {
  ({ GREEDY_BRAIN_SCHEMA: BRAIN_SCHEMA } = await import('../src/headless/brain-search/GreedyBrainSchema.ts'));
} else if (brainFlag === 'aoe_focus') {
  ({ AOE_FOCUS_BRAIN_SCHEMA: BRAIN_SCHEMA } = await import('../src/headless/brain-search/AOEFocusBrainSchema.ts'));
} else {
  console.error(`[brain-search] no schema for brain "${brainFlag}". Supported: balanced, greedy, aoe_focus`);
  process.exit(1);
}

// ── Run dir + persistence ──────────────────────────────────────────
const runId = `${brainFlag}-${factionFlag}-${difficultyFlag}`;
const runDir = resumeFlag ?? join('brain-search', runId);
mkdirSync(runDir, { recursive: true });

const evalLogPath = join(runDir, 'evaluations.jsonl');
const summaryPath = join(runDir, 'summary.json');
const logPath = join(runDir, 'run.log');

const log = (msg) => {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.error(line);
  try { appendFileSync(logPath, line + '\n'); } catch { /* ignore */ }
};

// ── Manager + history replay (for resume) ──────────────────────────
const cfg = { ...DEFAULT_MANAGER_CONFIG };
if (maxEvalsFlag !== null) cfg.maxEvals = parseInt(maxEvalsFlag, 10);
if (seedsFlag !== null) cfg.searchSeeds = parseInt(seedsFlag, 10);
if (validateSeedsFlag !== null) cfg.validateSeeds = parseInt(validateSeedsFlag, 10);

const manager = new BrainSearchManager(BRAIN_SCHEMA, cfg);

if (existsSync(evalLogPath)) {
  const lines = readFileSync(evalLogPath, 'utf8').split('\n').filter(l => l.trim());
  const history = [];
  for (const line of lines) {
    try { history.push(JSON.parse(line)); } catch { /* skip malformed */ }
  }
  manager.loadHistory(history);
  log(`resumed from ${evalLogPath} — ${history.length} prior evals (${manager.evalCount} search, ${manager.validationCount} validation)`);
} else {
  log(`new run: ${runId}`);
}

// ── Worker pool ────────────────────────────────────────────────────
const totalCores = availableParallelism();
const numWorkers = Math.max(1, parseInt(workersFlag ?? `${Math.max(1, Math.min(8, Math.floor(totalCores / 2)))}`, 10));
log(`spawning ${numWorkers} workers (${totalCores} cores available)`);

class WorkerPool {
  constructor(n) {
    this.workers = [];
    this.idle = [];
    this.pending = new Map(); // taskId → {resolve, reject}
    for (let i = 0; i < n; i++) this.spawn(i);
  }
  spawn(idx) {
    const child = spawn(process.execPath, ['--import', 'tsx', WORKER_ENTRY], {
      cwd: PROJECT_ROOT,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });
    const meta = { idx, child, ready: false };
    this.workers.push(meta);
    child.stderr.on('data', (b) => process.stderr.write(`[w${idx}] ${b}`));
    const rl = createInterface({ input: child.stdout, crlfDelay: Infinity });
    rl.on('line', (line) => {
      let msg;
      try { msg = JSON.parse(line); } catch { return; }
      if (msg.type === 'ready') {
        meta.ready = true;
        this.idle.push(meta);
        return;
      }
      if (msg.taskId !== undefined) {
        const p = this.pending.get(msg.taskId);
        if (p) {
          this.pending.delete(msg.taskId);
          p.resolve(msg);
          this.idle.push(meta);
        }
      }
    });
    child.on('exit', (code) => {
      if (code !== 0 && code !== null) log(`worker ${idx} exited ${code}`);
    });
  }
  async waitReady() {
    while (this.workers.some(w => !w.ready)) await new Promise(r => setTimeout(r, 20));
  }
  async dispatch(task) {
    while (this.idle.length === 0) await new Promise(r => setTimeout(r, 5));
    const w = this.idle.shift();
    return new Promise((resolve, reject) => {
      this.pending.set(task.taskId, { resolve, reject });
      w.child.stdin.write(JSON.stringify(task) + '\n');
    });
  }
  shutdown() {
    for (const w of this.workers) {
      try { w.child.stdin.end(); } catch {}
    }
  }
}

const pool = new WorkerPool(numWorkers);
await pool.waitReady();
log(`workers ready`);

// ── Helpers ────────────────────────────────────────────────────────
let nextTaskId = 1;
let nextEvalId = manager.history.length + 1;

function makeMatchConfig(seed) {
  // Same seed-mixing rule as Batch.ts so this is reproducible across
  // any other harness that uses (baseSeed, index) pairs.
  return {
    faction: factionFlag,
    difficulty: difficultyFlag,
    mapId: 'plains',
    brainId: brainFlag,
    matchMode: 'standard',
    waveCount: 20,
    seed: (1 * 31 + seed * 7919) >>> 0,
  };
}

async function evaluateConfig(params, n, tag) {
  const tasks = [];
  for (let i = 0; i < n; i++) {
    const config = makeMatchConfig(i);
    tasks.push(pool.dispatch({ taskId: nextTaskId++, config, params }));
  }
  const results = await Promise.all(tasks);
  let wins = 0, errors = 0, totalWave = 0;
  for (const r of results) {
    if (r.outcome === 'win') wins++;
    if (r.outcome === 'error') errors++;
    totalWave += r.waveReached || 0;
  }
  const evalRecord = {
    evalId: nextEvalId++,
    ts: Date.now(),
    params,
    score: wins / n,
    avgWave: totalWave / n,
    n,
    tag,
  };
  appendFileSync(evalLogPath, JSON.stringify(evalRecord) + '\n');
  manager.recordEval(evalRecord);
  return evalRecord;
}

function formatParams(p) {
  const keys = Object.keys(BRAIN_SCHEMA);
  return keys.map(k => `${k}=${typeof p[k] === 'number' ? p[k].toFixed(2) : p[k]}`).join(' ');
}

function statusLine() {
  const best = manager.bestSoFar;
  const bestStr = best ? `best=${(best.score * 100).toFixed(1)}% (n=${best.n}${best.tag === 'validate' ? ' ✓' : ''})` : 'best=–';
  const parents = manager.currentParents.map(p => `${(p.score * 100).toFixed(0)}%`).join(',');
  return `eval ${manager.evalCount}/${cfg.maxEvals} · ${bestStr} · parents=[${parents}]`;
}

// ── Probe mode (preflight sensitivity check) ───────────────────────
if (probeFlag !== null) {
  const k = probeFlag === '' ? 8 : parseInt(probeFlag, 10);
  log(`probe mode: ${k} configs, n=${cfg.searchSeeds} seeds each`);
  const defaults = manager.defaultsParams();
  const configs = [defaults];
  // Pick a handful of extreme one-param-at-a-time perturbations to
  // see if the parameter surface has any signal at all.
  const probeSpecs = [
    { expensiveBias: 0.0 },
    { expensiveBias: 0.5 },
    { maxWallPlacements: 0 },
    { maxWallPlacements: 14 },
    { panicLives: 0 },
    { highCoverageRatio: 3.5 },
    { frontierBuyChance: 0.0 },
  ];
  for (const overrides of probeSpecs.slice(0, k - 1)) {
    configs.push({ ...defaults, ...overrides });
  }
  for (let i = 0; i < configs.length; i++) {
    const r = await evaluateConfig(configs[i], cfg.searchSeeds, 'probe');
    log(`probe ${i + 1}/${configs.length}: ${(r.score * 100).toFixed(1)}% (avgWave ${r.avgWave.toFixed(1)})  ${formatParams(configs[i])}`);
  }
  pool.shutdown();
  log(`probe complete. spread = ${(Math.max(...manager.history.map(e => e.score)) * 100 - Math.min(...manager.history.map(e => e.score)) * 100).toFixed(1)}%`);
  process.exit(0);
}

// ── Warm start (optional) ──────────────────────────────────────────
// Load a previous winner config and seed it as the first parent.
// The manager treats whatever scores best in evaluations.jsonl as a
// parent for the next batch, so all we need to do is evaluate the
// warm-start config at searchSeeds before the main loop. The eval
// is also auto-validated at validateSeeds so we know if the config
// transferred to this cell at all.
if (seedFromFlag !== null && manager.evalCount === 0) {
  const seedPath = seedFromFlag;
  if (!existsSync(seedPath)) {
    log(`--seed-from: ${seedPath} not found`);
    process.exit(1);
  }
  const seedDoc = JSON.parse(readFileSync(seedPath, 'utf8'));
  const seedParams = seedDoc.params ?? seedDoc; // accept either wrapped or bare
  log(`warm-start: loading params from ${seedPath}`);
  const r = await evaluateConfig(seedParams, cfg.searchSeeds, 'warmstart');
  log(`  warm-start search-seeds: ${(r.score * 100).toFixed(1)}% (avgWave ${r.avgWave.toFixed(1)})`);
  if (r.score >= 0.05) {
    const v = await evaluateConfig(seedParams, cfg.validateSeeds, 'validate');
    log(`  warm-start validated:    ${(v.score * 100).toFixed(1)}% (n=${v.n}, avgWave ${v.avgWave.toFixed(1)})`);
  } else {
    log(`  warm-start score too low to validate — proceeding with mutation anyway`);
  }
}

// ── Main search loop ───────────────────────────────────────────────
log(`starting search · μ=${cfg.mu} λ=${cfg.lambda} maxEvals=${cfg.maxEvals} searchSeeds=${cfg.searchSeeds} validateSeeds=${cfg.validateSeeds}`);

let cleanShutdown = false;
const onSignal = (sig) => () => {
  log(`signal ${sig} — shutting down (${manager.evalCount} evals saved, resume with --resume=${runDir})`);
  cleanShutdown = true;
  pool.shutdown();
  process.exit(130);
};
process.on('SIGINT', onSignal('SIGINT'));
process.on('SIGTERM', onSignal('SIGTERM'));

while (true) {
  const cont = manager.shouldContinue();
  if (!cont.continue) {
    log(`stop: ${cont.reason}`);
    break;
  }

  const batch = manager.generateNextBatch();
  const batchT0 = Date.now();
  // Run batch in parallel — λ candidates each get n=searchSeeds matches.
  const results = await Promise.all(batch.map(p => evaluateConfig(p, cfg.searchSeeds, 'search')));

  // Auto-validate any candidate that beat the threshold — gives us
  // a tight-CI confirmation before we'd terminate on it as the winner.
  for (const r of results) {
    if (r.score >= cfg.autoValidateThreshold && r.tag !== 'validate') {
      log(`  auto-validating ${(r.score * 100).toFixed(1)}% candidate (n=${cfg.validateSeeds})...`);
      const v = await evaluateConfig(r.params, cfg.validateSeeds, 'validate');
      log(`    validated: ${(v.score * 100).toFixed(1)}% (n=${v.n})`);
    }
  }

  const dt = ((Date.now() - batchT0) / 1000).toFixed(1);
  log(`batch · ${dt}s · ${statusLine()}${manager.isInSoftPlateauWarning ? ' · ⚠ soft plateau' : ''}`);
}

// ── Final validation pass on top finalists ─────────────────────────
const allSearchEvals = manager.history.filter(e => e.tag !== 'validate');
const top5 = [...allSearchEvals].sort((a, b) => b.score - a.score).slice(0, 5);
log(`final validation: top 5 candidates at n=${cfg.validateSeeds} seeds`);
for (const c of top5) {
  // Skip if we already validated this exact param combo.
  const alreadyValidated = manager.history.some(
    e => e.tag === 'validate' && JSON.stringify(e.params) === JSON.stringify(c.params),
  );
  if (alreadyValidated) {
    log(`  skipping (already validated): ${(c.score * 100).toFixed(1)}% search → already ✓`);
    continue;
  }
  const v = await evaluateConfig(c.params, cfg.validateSeeds, 'validate');
  log(`  ${(c.score * 100).toFixed(1)}% search → ${(v.score * 100).toFixed(1)}% validated  ${formatParams(c.params)}`);
}

// ── Write summary ──────────────────────────────────────────────────
const winner = manager.bestSoFar;
const summary = {
  runId,
  finishedAt: new Date().toISOString(),
  brain: brainFlag,
  faction: factionFlag,
  difficulty: difficultyFlag,
  config: cfg,
  totalEvals: manager.history.length,
  searchEvals: manager.evalCount,
  validationEvals: manager.validationCount,
  bestSoFar: winner,
  bestUnvalidated: manager.bestUnvalidated,
  parents: manager.currentParents,
};
writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
log(`summary written: ${summaryPath}`);
log(`winner: ${winner ? `${(winner.score * 100).toFixed(1)}% (n=${winner.n})` : 'none'}`);
if (winner) log(`winner params: ${formatParams(winner.params)}`);

cleanShutdown = true;
pool.shutdown();
process.exit(0);
