#!/usr/bin/env node
/**
 * Record a single headless match into a deterministic action
 * trace, so the live Phaser game can replay it exactly for visual
 * inspection / recording.
 *
 * Output JSON shape:
 *   {
 *     config: { faction, difficulty, mapId, brainId, seed, waveCount, stepMs, ... },
 *     actions: [{ tick: N, kind: 'place'|'upgrade'|..., col?, row?, towerId?, branch?, ... }, ...],
 *     outcome: 'win'|'loss'|'timeout',
 *     waveReached: N,
 *     livesRemaining: N,
 *     metadata: { recorderVersion, sourceBrain, modelPath?, schemaVersion?, dt }
 *   }
 *
 * The live game replays this by:
 *   - using the same config (so SpawnManager + RNG produce same waves)
 *   - feeding the same action sequence (so all placement / upgrade
 *     / send choices match)
 *   - allowing rendering to happen normally
 *
 * Determinism prereq: headless and live game both flow through the
 * same systems layer (TowerManager, CreepManager, SpawnManager,
 * WaveController). Any drift between the two paths will cause the
 * replay to diverge — record-trace runs a tail-check via tick-by-tick
 * digest if --verify is passed (TODO; not implemented for the smoke
 * cut).
 *
 * CLI:
 *   --brain=ppo|balanced|...
 *   --faction=arcane|mechanical|...
 *   --difficulty=normal|hard|insane
 *   --waves=10
 *   --seed=14000
 *   --model=models/ppo-policy.onnx   (only used when brain=ppo)
 *   --meta=models/ppo-policy.meta.json
 *   --out=traces/<id>.json
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

await import('../src/headless/harness/jsdom-setup.ts');
const { Match } = await import('../src/headless/Match.ts');
const { BRAIN_REGISTRY } = await import('../src/systems/bots/BotBrain.ts');

// Brain side-effect imports.
await import('../src/systems/bots/brains/BalancedBrain.ts');
await import('../src/systems/bots/brains/GreedyBrain.ts');
await import('../src/systems/bots/brains/RushBrain.ts');
await import('../src/systems/bots/brains/EconBrain.ts');
await import('../src/systems/bots/brains/SynergyBrain.ts');
await import('../src/systems/bots/brains/UltimateBrain.ts');
await import('../src/systems/bots/brains/AOEFocusBrain.ts');
await import('../src/systems/bots/brains/NatureBrain.ts');
await import('../src/systems/bots/brains/HarmonicBrain.ts');
await import('../src/systems/bots/brains/PsionicBrain.ts');
await import('../src/systems/bots/brains/LearningBrain.ts');
await import('../src/systems/bots/brains/DumbBrain.ts');
const { PPOBrain, preloadPPOModel } = await import('../src/systems/bots/brains/PPOBrain.ts');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    brain: 'balanced',
    faction: 'arcane',
    difficulty: 'normal',
    mapId: 'plains',
    waves: 10,
    seed: 1001,
    model: 'models/ppo-policy.onnx',
    meta: 'models/ppo-policy.meta.json',
    temperature: 0.0,  // argmax for deterministic replay
    out: null,
  };
  for (const a of args) {
    if (a.startsWith('--brain=')) out.brain = a.slice('--brain='.length);
    else if (a.startsWith('--faction=')) out.faction = a.slice('--faction='.length);
    else if (a.startsWith('--difficulty=')) out.difficulty = a.slice('--difficulty='.length);
    else if (a.startsWith('--map=')) out.mapId = a.slice('--map='.length);
    else if (a.startsWith('--waves=')) out.waves = parseInt(a.slice('--waves='.length), 10);
    else if (a.startsWith('--seed=')) out.seed = parseInt(a.slice('--seed='.length), 10);
    else if (a.startsWith('--model=')) out.model = a.slice('--model='.length);
    else if (a.startsWith('--meta=')) out.meta = a.slice('--meta='.length);
    else if (a.startsWith('--temperature=')) out.temperature = parseFloat(a.slice('--temperature='.length));
    else if (a.startsWith('--out=')) out.out = a.slice('--out='.length);
  }
  if (!out.out) {
    out.out = `traces/${out.brain}-${out.faction}-${out.difficulty}-w${out.waves}-s${out.seed}.json`;
  }
  return out;
}

// ----- Wrap a brain in a tick-recording proxy -----
// Captures every decide() output with the current Match tick. The
// live replay reads this and applies the same action at the same
// tick.

class TraceRecorderBrain {
  constructor(inner) {
    this.inner = inner;
    this.name = `TraceRecord(${inner.name})`;
    this.match = null;
    this.records = [];  // {tick, kind, col?, row?, towerId?, ...}
  }

  attachMatch(match) {
    this.match = match;
    if (typeof this.inner.attachMatch === 'function') this.inner.attachMatch(match);
  }

  init(ctx) {
    if (typeof this.inner.init === 'function') this.inner.init(ctx);
  }

  decide(ctx) {
    const d = this.inner.decide(ctx);
    this._record(d);
    return d;
  }

  async decideAsync(ctx) {
    let d;
    if (typeof this.inner.decideAsync === 'function') {
      d = await this.inner.decideAsync(ctx);
    } else {
      d = this.inner.decide(ctx);
    }
    this._record(d);
    return d;
  }

  _record(d) {
    const tick = this.match ? this.match.getSimTimeMs() : -1;
    const entry = { tick, kind: d.kind };
    if (d.kind === 'place') {
      entry.col = d.col;
      entry.row = d.row;
      entry.towerId = d.type?.id ?? d.towerId ?? null;
    } else if (d.kind === 'upgrade') {
      entry.col = d.col;
      entry.row = d.row;
      entry.branch = d.branch ?? null;
    } else if (d.kind === 'sell') {
      entry.col = d.col;
      entry.row = d.row;
    } else if (d.kind === 'frontier') {
      entry.buildingId = d.buildingId;
    } else if (d.kind === 'frontierManage') {
      entry.action = d.action;
      entry.defId = d.defId ?? null;
      entry.idx = d.idx ?? null;
    } else if (d.kind === 'send') {
      entry.sendOptionId = d.sendOptionId;
    }
    // skip → no extra fields
    this.records.push(entry);
  }
}

const opts = parseArgs();
console.log('[record-trace] opts:', opts);

let innerBrain;
if (opts.brain === 'ppo') {
  if (!existsSync(opts.model)) {
    console.error(`[record-trace] PPO model not found: ${opts.model}`);
    process.exit(1);
  }
  console.log('[record-trace] preloading ONNX session...');
  const session = await preloadPPOModel(opts.model, opts.meta);
  if (!session) {
    console.error('[record-trace] failed to load ONNX session — fallback would be recorded');
    process.exit(2);
  }
  innerBrain = new PPOBrain({ modelPath: opts.model, metaPath: opts.meta, temperature: opts.temperature });
} else {
  const factory = BRAIN_REGISTRY[opts.brain];
  if (!factory) {
    console.error(`[record-trace] unknown brain: ${opts.brain}`);
    process.exit(3);
  }
  innerBrain = factory();
}

const recorder = new TraceRecorderBrain(innerBrain);

const cfg = {
  faction: opts.faction,
  difficulty: opts.difficulty,
  mapId: opts.mapId,
  brainId: opts.brain,  // unused since we pass brainOverride
  matchMode: 'standard',
  waveCount: opts.waves,
  seed: opts.seed,
};

const t0 = Date.now();
const match = new Match(cfg, recorder);
const result = opts.brain === 'ppo'
  ? await match.runToEndAsync()
  : await match.runToEnd();
const dt = (Date.now() - t0) / 1000;

console.log(`[record-trace] match outcome: ${result.outcome}  wave: ${result.waveReached}  lives: ${result.livesRemaining}  (${dt.toFixed(1)}s)`);
console.log(`[record-trace] recorded ${recorder.records.length} decisions`);

mkdirSync(dirname(opts.out), { recursive: true });
const trace = {
  config: { ...cfg, stepMs: cfg.stepMs ?? 32 },
  actions: recorder.records,
  outcome: result.outcome,
  waveReached: result.waveReached,
  livesRemaining: result.livesRemaining,
  goldEarned: result.goldEarned,
  creepsKilled: result.creepsKilled,
  towersBuilt: result.towersBuilt,
  buildHash: result.buildHash,
  metadata: {
    recorderVersion: 1,
    sourceBrain: opts.brain,
    modelPath: opts.brain === 'ppo' ? opts.model : null,
    temperature: opts.temperature,
    capturedAt: new Date().toISOString(),
    dtSec: dt,
  },
};
writeFileSync(opts.out, JSON.stringify(trace, null, 2));
console.log(`[record-trace] wrote ${opts.out}`);
