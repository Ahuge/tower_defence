#!/usr/bin/env node
/**
 * BC rollout generator — wraps an inner brain (default `learning`)
 * with `ObsRecorderBrain` and runs N matches per faction, dumping
 * one gzipped JSONL file per match.
 *
 * Per `notes/rl/bc-plan.md`:
 *   - D2 inner brain = LearningBrain (Step 0 decided)
 *   - D5 compute budget = 1000 matches/faction first run
 *   - D4 skip handling is data-driven via Step 3.5; this script
 *     records EVERY decision (no subsampling).
 *
 * CLI:
 *   --matches=N          matches per faction (default 50 for smoke,
 *                        bump to 1000 for the real first run)
 *   --factions=arcane,mechanical
 *   --inner-brain=learning
 *   --seed-base=5000
 *   --out=rollouts/bc/<run_id>
 *
 * Output:
 *   rollouts/bc/<run_id>/
 *     manifest.json
 *     {faction}/match_{seed}.jsonl.gz   (one row per decision)
 *
 * Row schema:
 *   { match_id, faction, tick, action,
 *     grid_b64, globals_b64, mask_b64,
 *     schema_version: "v1.1" }
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { Buffer } from 'node:buffer';

await import('../src/headless/harness/jsdom-setup.ts');
const { Match } = await import('../src/headless/Match.ts');
const { ObsRecorderBrain } = await import('../src/systems/bots/learning/ObsRecorderBrain.ts');
const { OBS_ACTION_SCHEMA_VERSION } = await import('../src/systems/bots/learning/ActionSpace.ts');
const { BRAIN_REGISTRY } = await import('../src/systems/bots/BotBrain.ts');

// Side-effect imports so all brains register themselves.
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
const { OptimizerBrain } = await import('../src/systems/bots/brains/OptimizerBrain.ts');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    matches: 50,
    factions: ['arcane', 'mechanical'],
    innerBrain: 'learning',
    seedBase: 5000,
    waveCount: 10,
    mode: 'standard',
    difficulty: 'normal',
    out: null,
    /** When set, wraps the inner brain in OptimizerBrain using the
     *  W* wall list loaded from this JSON file. Inner brain still
     *  runs (provides upgrade / sell / send decisions once W* is
     *  exhausted). */
    optimizerWalls: null,
    /** Comma-separated list of inner brain ids — rotates through
     *  them across matches for type-diversity. Overrides --inner-brain
     *  when set. Example: --inner-brains=balanced,aoefocus,greedy */
    innerBrains: null,
    /** Per-match W* transformations. Comma-separated, rotates
     *  alongside innerBrains. Each value is one of:
     *    identity         — W* used as-is
     *    flip-v           — reflect rows across MID_ROW (top-bottom
     *                       swap; entry/exit row stays fixed)
     *    shift-up-N       — shift all rows by -N (drops OOB cells)
     *    shift-down-N     — shift all rows by +N (drops OOB cells)
     *  Example: --w-transforms=identity,flip-v
     *  Default ['identity'] — no augmentation. */
    wTransforms: null,
    /** MID_ROW for vertical reflection. Default 13 (plains). */
    midRow: 13,
  };
  for (const a of args) {
    if (a.startsWith('--matches=')) out.matches = parseInt(a.slice('--matches='.length), 10);
    else if (a.startsWith('--factions=')) out.factions = a.slice('--factions='.length).split(',');
    else if (a.startsWith('--inner-brain=')) out.innerBrain = a.slice('--inner-brain='.length);
    else if (a.startsWith('--seed-base=')) out.seedBase = parseInt(a.slice('--seed-base='.length), 10);
    else if (a.startsWith('--out=')) out.out = a.slice('--out='.length);
    else if (a.startsWith('--waves=')) out.waveCount = parseInt(a.slice('--waves='.length), 10);
    else if (a.startsWith('--mode=')) out.mode = a.slice('--mode='.length);
    else if (a.startsWith('--difficulty=')) out.difficulty = a.slice('--difficulty='.length);
    else if (a.startsWith('--optimizer-walls=')) out.optimizerWalls = a.slice('--optimizer-walls='.length);
    else if (a.startsWith('--inner-brains=')) out.innerBrains = a.slice('--inner-brains='.length).split(',');
    else if (a.startsWith('--w-transforms=')) out.wTransforms = a.slice('--w-transforms='.length).split(',');
    else if (a.startsWith('--mid-row=')) out.midRow = parseInt(a.slice('--mid-row='.length), 10);
  }
  if (!out.out) {
    const runId = `${new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16)}-${Math.random().toString(36).slice(2, 6)}`;
    out.out = `rollouts/bc/${runId}`;
  }
  return out;
}

function b64FromTyped(arr) {
  return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength).toString('base64');
}

const opts = parseArgs();
console.log('[generate-bc-rollouts] opts:', opts);

// Load optimizer W* once at startup. Reused across every match.
let targetWalls = null;
if (opts.optimizerWalls) {
  if (!existsSync(opts.optimizerWalls)) {
    console.error(`[generate-bc-rollouts] optimizer-walls file not found: ${opts.optimizerWalls}`);
    process.exit(1);
  }
  const raw = JSON.parse(readFileSync(opts.optimizerWalls, 'utf8'));
  const entry = Array.isArray(raw) ? raw[0] : raw;
  if (!entry?.walls || !Array.isArray(entry.walls)) {
    console.error(`[generate-bc-rollouts] optimizer-walls JSON missing 'walls' array`);
    process.exit(1);
  }
  targetWalls = entry.walls;
  console.log(`[generate-bc-rollouts] loaded W* ${targetWalls.length} walls; optimum path=${entry.pathLength}, baseline=${entry.baselinePathLength}`);
}

mkdirSync(opts.out, { recursive: true });
const manifest = {
  runId: opts.out.split('/').pop(),
  startedAt: new Date().toISOString(),
  schemaVersion: OBS_ACTION_SCHEMA_VERSION,
  innerBrain: opts.innerBrain,
  outerBrain: targetWalls ? 'optimizer' : null,
  optimizerWalls: opts.optimizerWalls,
  waveCount: opts.waveCount,
  factions: {},
};

// Inner brain rotation: when --inner-brains=A,B,C is set, rotate
// per-match through that list. Otherwise use --inner-brain.
const innerBrainIds = opts.innerBrains ?? [opts.innerBrain];
for (const id of innerBrainIds) {
  if (!BRAIN_REGISTRY[id]) throw new Error(`unknown inner brain: ${id}`);
}
const pickInnerFactory = (matchIdx) => BRAIN_REGISTRY[innerBrainIds[matchIdx % innerBrainIds.length]];
manifest.innerBrains = innerBrainIds;

// W* transformation rotation: per-match-deterministic. Same
// transform applies to all matches with the same idx % len.
const transformIds = opts.wTransforms ?? ['identity'];
manifest.wTransforms = transformIds;
const GRID_ROWS = 26; // matches src/config.ts
const GRID_COLS = 36;
function applyTransform(walls, id, midRow) {
  if (!walls) return walls;
  if (id === 'identity') return walls;
  if (id === 'flip-v') {
    // Reflect across midRow: row r → 2*midRow - r. Keeps cells in
    // midRow fixed. Cells that map out of bounds get dropped.
    return walls
      .map(w => ({ col: w.col, row: 2 * midRow - w.row }))
      .filter(w => w.row >= 0 && w.row < GRID_ROWS && w.col >= 0 && w.col < GRID_COLS);
  }
  if (id.startsWith('shift-up-')) {
    const n = parseInt(id.slice('shift-up-'.length), 10);
    return walls
      .map(w => ({ col: w.col, row: w.row - n }))
      .filter(w => w.row >= 0 && w.row < GRID_ROWS);
  }
  if (id.startsWith('shift-down-')) {
    const n = parseInt(id.slice('shift-down-'.length), 10);
    return walls
      .map(w => ({ col: w.col, row: w.row + n }))
      .filter(w => w.row >= 0 && w.row < GRID_ROWS);
  }
  throw new Error(`unknown w-transform: ${id}`);
}
const pickWalls = (matchIdx) => applyTransform(
  targetWalls,
  transformIds[matchIdx % transformIds.length],
  opts.midRow,
);

const t0 = Date.now();
let totalRows = 0;
let totalDropped = 0;

for (const faction of opts.factions) {
  const factionDir = join(opts.out, faction);
  mkdirSync(factionDir, { recursive: true });
  manifest.factions[faction] = { matches: 0, decisions: 0, dropped: { send: 0, frontier: 0, frontierManage: 0, illegalUnderMask: 0 } };

  for (let i = 0; i < opts.matches; i++) {
    const seed = (opts.seedBase * 31 + i * 7919) >>> 0;
    const matchId = `${faction}-s${seed}-${opts.mode}-${opts.difficulty}-w${opts.waveCount}`;
    const inner = pickInnerFactory(i)();
    const matchWalls = pickWalls(i);
    const teacher = matchWalls
      ? new OptimizerBrain({ inner, targetWalls: matchWalls, seed, topK: 5 })
      : inner;
    const recorder = new ObsRecorderBrain(teacher, matchId);

    const match = new Match({
      faction,
      difficulty: opts.difficulty,
      mapId: 'plains',
      brainId: opts.innerBrain,       // not used because brainOverride wins
      matchMode: opts.mode,
      waveCount: opts.waveCount,
      seed,
    }, recorder);

    while (!match.isDone()) match.step();
    const result = match.result();

    // Serialize rows to gzipped JSONL.
    const lines = [];
    for (const row of recorder.rows) {
      lines.push(JSON.stringify({
        match_id: row.matchId,
        faction: row.faction,
        tick: row.tick,
        action: row.action,
        grid_b64: b64FromTyped(row.obs.grid),
        globals_b64: b64FromTyped(row.obs.globals),
        mask_b64: b64FromTyped(row.obs.mask),
        schema_version: OBS_ACTION_SCHEMA_VERSION,
      }));
    }
    const filename = join(factionDir, `match_${seed}.jsonl.gz`);
    writeFileSync(filename, gzipSync(Buffer.from(lines.join('\n') + '\n')));

    manifest.factions[faction].matches++;
    manifest.factions[faction].decisions += recorder.rows.length;
    manifest.factions[faction].dropped.send += recorder.dropped.send;
    manifest.factions[faction].dropped.frontier += recorder.dropped.frontier;
    manifest.factions[faction].dropped.frontierManage += recorder.dropped.frontierManage;
    manifest.factions[faction].dropped.illegalUnderMask += recorder.dropped.illegalUnderMask;
    totalRows += recorder.rows.length;
    totalDropped += recorder.dropped.send + recorder.dropped.frontier + recorder.dropped.frontierManage + recorder.dropped.illegalUnderMask;

    if ((i + 1) % 10 === 0 || i === opts.matches - 1) {
      const dt = (Date.now() - t0) / 1000;
      const rate = (manifest.factions[faction].matches + 1) / dt;
      console.log(`  [${faction}] ${i + 1}/${opts.matches}  outcome=${result.outcome}  decisions=${recorder.rows.length}  rate=${rate.toFixed(1)} m/s`);
    }
  }
}

manifest.endedAt = new Date().toISOString();
manifest.totalDecisions = totalRows;
manifest.totalDropped = totalDropped;
manifest.totalSec = (Date.now() - t0) / 1000;
writeFileSync(join(opts.out, 'manifest.json'), JSON.stringify(manifest, null, 2));

console.log(`\n[generate-bc-rollouts] DONE`);
console.log(`  out:       ${opts.out}`);
console.log(`  matches:   ${opts.factions.reduce((a, f) => a + manifest.factions[f].matches, 0)}`);
console.log(`  decisions: ${totalRows}`);
console.log(`  dropped:   ${totalDropped} (send/frontier/frontierManage out-of-scope)`);
console.log(`  wall:      ${manifest.totalSec.toFixed(1)}s`);
