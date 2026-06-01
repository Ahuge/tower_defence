#!/usr/bin/env node
/**
 * PPO rollout generator — wraps PPOBrain with PPORecorderBrain and
 * runs N matches per faction, dumping one gzipped JSONL per match.
 *
 * Schema extends BC's rollout schema with PPO-specific fields:
 *   { match_id, faction, tick, action, log_prob, value, reward,
 *     done, grid_b64, globals_b64, mask_b64, schema_version,
 *     outcome }
 *
 * Per G3 plan (D2=mirrored deferred; smoke first):
 *   - Single-side defense for the smoke. Mirrored adds RNG-
 *     divergence handling; defer until the loop runs end-to-end.
 *
 * CLI:
 *   --matches=N
 *   --factions=arcane,mechanical
 *   --difficulty=hard
 *   --waves=15
 *   --seed-base=12000
 *   --model=models/ppo-policy.onnx
 *   --meta=models/ppo-policy.meta.json
 *   --temperature=1.0
 *   --out=rollouts/ppo/<run_id>
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { Buffer } from 'node:buffer';

await import('../src/headless/harness/jsdom-setup.ts');
const { Match } = await import('../src/headless/Match.ts');
const { PPOBrain, preloadPPOModel } = await import('../src/systems/bots/brains/PPOBrain.ts');
const { PPORecorderBrain } = await import('../src/systems/bots/learning/PPORecorderBrain.ts');
const { OBS_ACTION_SCHEMA_VERSION } = await import('../src/systems/bots/learning/ActionSpace.ts');

// Brain registry side-effect imports so PPOBrain's fallback path
// (BalancedBrain) is available.
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
await import('../src/systems/bots/brains/PPOBrain.ts');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    matches: 16,
    factions: ['arcane', 'mechanical'],
    difficulty: 'hard',
    waves: 15,
    mode: 'standard',
    seedBase: 12000,
    temperature: 1.0,
    model: 'models/ppo-policy.onnx',
    meta: 'models/ppo-policy.meta.json',
    out: null,
    optimizerWalls: null,
    boxInK: 0,
    corridorK: 0,
    // Multi-map support: rotate maps per match. When --maps=A,B,C
    // is set, cycle through; when --map=X is set, use that single
    // map (default plains).
    maps: null,
    map: 'plains',
  };
  for (const a of args) {
    if (a.startsWith('--matches=')) out.matches = parseInt(a.slice('--matches='.length), 10);
    else if (a.startsWith('--factions=')) out.factions = a.slice('--factions='.length).split(',');
    else if (a.startsWith('--difficulty=')) out.difficulty = a.slice('--difficulty='.length);
    else if (a.startsWith('--waves=')) out.waves = parseInt(a.slice('--waves='.length), 10);
    else if (a.startsWith('--mode=')) out.mode = a.slice('--mode='.length);
    else if (a.startsWith('--seed-base=')) out.seedBase = parseInt(a.slice('--seed-base='.length), 10);
    else if (a.startsWith('--temperature=')) out.temperature = parseFloat(a.slice('--temperature='.length));
    else if (a.startsWith('--model=')) out.model = a.slice('--model='.length);
    else if (a.startsWith('--meta=')) out.meta = a.slice('--meta='.length);
    else if (a.startsWith('--out=')) out.out = a.slice('--out='.length);
    else if (a.startsWith('--optimizer-walls=')) out.optimizerWalls = a.slice('--optimizer-walls='.length);
    else if (a.startsWith('--box-in-k=')) out.boxInK = parseFloat(a.slice('--box-in-k='.length));
    else if (a.startsWith('--corridor-k=')) out.corridorK = parseFloat(a.slice('--corridor-k='.length));
    else if (a.startsWith('--maps=')) out.maps = a.slice('--maps='.length).split(',');
    else if (a.startsWith('--map=')) out.map = a.slice('--map='.length);
  }
  if (!out.out) {
    const runId = `${new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16)}-${Math.random().toString(36).slice(2, 6)}`;
    out.out = `rollouts/ppo/${runId}`;
  }
  return out;
}

function b64FromTyped(arr) {
  return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength).toString('base64');
}

const opts = parseArgs();
console.log('[generate-ppo-rollouts] opts:', opts);

// Load optimizer's W* if specified. Single load at startup; same
// W* passed to every match's PPORecorderBrain so the optimizer-
// overlap bonus can fire.
let targetMazeWalls = null;
let rewardOverride = null;
if (opts.optimizerWalls) {
  if (!existsSync(opts.optimizerWalls)) {
    console.error(`[generate-ppo-rollouts] optimizer-walls file not found: ${opts.optimizerWalls}`);
    process.exit(1);
  }
  const raw = JSON.parse(readFileSync(opts.optimizerWalls, 'utf8'));
  const entry = Array.isArray(raw) ? raw[0] : raw;
  if (!entry?.walls || !Array.isArray(entry.walls)) {
    console.error(`[generate-ppo-rollouts] optimizer-walls JSON missing 'walls' array`);
    process.exit(1);
  }
  targetMazeWalls = entry.walls;
  const { DEFAULT_REWARD } = await import('../src/systems/bots/learning/PPORecorderBrain.ts');
  rewardOverride = { ...DEFAULT_REWARD, optimizerOverlapK: 0.05 };
  console.log(`[generate-ppo-rollouts] loaded W* with ${targetMazeWalls.length} walls (optimum path=${entry.pathLength}); optimizerOverlapK=${rewardOverride.optimizerOverlapK}`);
}
// Box-in reward override (independent of optimizer-walls).
if (opts.boxInK !== 0) {
  const { DEFAULT_REWARD } = await import('../src/systems/bots/learning/PPORecorderBrain.ts');
  rewardOverride = { ...(rewardOverride ?? DEFAULT_REWARD), boxInRewardK: opts.boxInK };
  console.log(`[generate-ppo-rollouts] boxInRewardK=${opts.boxInK}`);
}
if (opts.corridorK !== 0) {
  const { DEFAULT_REWARD } = await import('../src/systems/bots/learning/PPORecorderBrain.ts');
  rewardOverride = { ...(rewardOverride ?? DEFAULT_REWARD), corridorRewardK: opts.corridorK };
  console.log(`[generate-ppo-rollouts] corridorRewardK=${opts.corridorK}`);
}

if (!existsSync(opts.model)) {
  console.error(`[generate-ppo-rollouts] model not found: ${opts.model}`);
  process.exit(1);
}

console.log('[generate-ppo-rollouts] preloading ONNX session...');
const t_load = Date.now();
const session = await preloadPPOModel(opts.model, opts.meta);
console.log(`  loaded in ${Date.now() - t_load}ms  session=${session ? 'OK' : 'FAILED'}`);
if (!session) {
  console.error('  fallback path would dominate — exiting');
  process.exit(2);
}

mkdirSync(opts.out, { recursive: true });
const manifest = {
  runId: opts.out.split('/').pop(),
  startedAt: new Date().toISOString(),
  schemaVersion: OBS_ACTION_SCHEMA_VERSION,
  modelPath: opts.model,
  difficulty: opts.difficulty,
  waves: opts.waves,
  temperature: opts.temperature,
  factions: {},
};

const t0 = Date.now();
let totalRows = 0;
let totalDropped = 0;
let totalWins = 0;
let totalLosses = 0;

for (const faction of opts.factions) {
  const factionDir = join(opts.out, faction);
  mkdirSync(factionDir, { recursive: true });
  manifest.factions[faction] = {
    matches: 0,
    decisions: 0,
    wins: 0,
    losses: 0,
    timeouts: 0,
    errors: 0,
    dropped: { fallback: 0, send: 0, frontier: 0, frontierManage: 0, illegalUnderMask: 0 },
  };

  const mapList = opts.maps ?? [opts.map];
  for (let i = 0; i < opts.matches; i++) {
    const seed = (opts.seedBase * 31 + i * 7919) >>> 0;
    const matchMap = mapList[i % mapList.length];
    const matchId = `${faction}-${matchMap}-s${seed}-d${opts.difficulty}-w${opts.waves}`;
    const ppo = new PPOBrain({ modelPath: opts.model, metaPath: opts.meta, temperature: opts.temperature });
    const recorder = new PPORecorderBrain(ppo, matchId, rewardOverride ?? undefined, targetMazeWalls ?? undefined);

    const match = new Match({
      faction,
      difficulty: opts.difficulty,
      mapId: matchMap,
      brainId: 'ppo',  // unused because brainOverride wins
      matchMode: opts.mode,
      waveCount: opts.waves,
      seed,
    }, recorder);

    const result = await match.runToEndAsync();
    const rows = recorder.finalize(result.outcome);

    const lines = rows.map(row => JSON.stringify({
      match_id: row.matchId,
      faction: row.faction,
      tick: row.tick,
      action: row.action,
      log_prob: row.logProb,
      value: row.value,
      reward: row.reward,
      done: row.done,
      grid_b64: b64FromTyped(row.obs.grid),
      globals_b64: b64FromTyped(row.obs.globals),
      mask_b64: b64FromTyped(row.obs.mask),
      schema_version: OBS_ACTION_SCHEMA_VERSION,
    }));
    const filename = join(factionDir, `match_${seed}.jsonl.gz`);
    writeFileSync(filename, gzipSync(Buffer.from(lines.join('\n') + '\n')));

    manifest.factions[faction].matches++;
    manifest.factions[faction].decisions += rows.length;
    if (result.outcome === 'win') { manifest.factions[faction].wins++; totalWins++; }
    else if (result.outcome === 'loss') { manifest.factions[faction].losses++; totalLosses++; }
    else if (result.outcome === 'timeout') manifest.factions[faction].timeouts++;
    else if (result.outcome === 'error') manifest.factions[faction].errors++;
    for (const k of Object.keys(recorder.dropped)) {
      manifest.factions[faction].dropped[k] += recorder.dropped[k];
    }
    if (manifest.factions[faction].totalMazeReward === undefined) {
      manifest.factions[faction].totalMazeReward = 0;
      manifest.factions[faction].totalCoverageReward = 0;
      manifest.factions[faction].totalProductReward = 0;
      manifest.factions[faction].totalTurnsReward = 0;
      manifest.factions[faction].totalOptimizerReward = 0;
      manifest.factions[faction].totalBoxInReward = 0;
      manifest.factions[faction].totalCorridorReward = 0;
    }
    manifest.factions[faction].totalMazeReward += recorder.totalMazeReward;
    manifest.factions[faction].totalCoverageReward += recorder.totalCoverageReward;
    manifest.factions[faction].totalProductReward += recorder.totalProductReward;
    manifest.factions[faction].totalTurnsReward += recorder.totalTurnsReward;
    manifest.factions[faction].totalOptimizerReward += recorder.totalOptimizerReward;
    manifest.factions[faction].totalBoxInReward += recorder.totalBoxInReward;
    manifest.factions[faction].totalCorridorReward += recorder.totalCorridorReward;
    totalRows += rows.length;
    totalDropped += Object.values(recorder.dropped).reduce((a, b) => a + b, 0);

    if ((i + 1) % 4 === 0 || i === opts.matches - 1) {
      const dt = (Date.now() - t0) / 1000;
      const rate = (manifest.factions[faction].matches + 1) / dt;
      console.log(`  [${faction}] ${i + 1}/${opts.matches}  outcome=${result.outcome}  decisions=${rows.length}  rate=${rate.toFixed(2)} m/s  wall=${dt.toFixed(0)}s`);
    }
  }
}

manifest.endedAt = new Date().toISOString();
manifest.totalDecisions = totalRows;
manifest.totalDropped = totalDropped;
manifest.totalWins = totalWins;
manifest.totalLosses = totalLosses;
manifest.totalSec = (Date.now() - t0) / 1000;
writeFileSync(join(opts.out, 'manifest.json'), JSON.stringify(manifest, null, 2));

console.log(`\n[generate-ppo-rollouts] DONE`);
console.log(`  out:       ${opts.out}`);
console.log(`  matches:   ${opts.factions.reduce((a, f) => a + manifest.factions[f].matches, 0)}`);
console.log(`  decisions: ${totalRows}`);
console.log(`  wins:      ${totalWins}    losses: ${totalLosses}`);
console.log(`  dropped:   ${totalDropped}`);
console.log(`  wall:      ${manifest.totalSec.toFixed(1)}s`);
