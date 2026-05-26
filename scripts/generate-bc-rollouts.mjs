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
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
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

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    matches: 50,
    factions: ['arcane', 'mechanical'],
    innerBrain: 'learning',
    seedBase: 5000,
    waveCount: 10,
    out: null,
  };
  for (const a of args) {
    if (a.startsWith('--matches=')) out.matches = parseInt(a.slice('--matches='.length), 10);
    else if (a.startsWith('--factions=')) out.factions = a.slice('--factions='.length).split(',');
    else if (a.startsWith('--inner-brain=')) out.innerBrain = a.slice('--inner-brain='.length);
    else if (a.startsWith('--seed-base=')) out.seedBase = parseInt(a.slice('--seed-base='.length), 10);
    else if (a.startsWith('--out=')) out.out = a.slice('--out='.length);
    else if (a.startsWith('--waves=')) out.waveCount = parseInt(a.slice('--waves='.length), 10);
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

mkdirSync(opts.out, { recursive: true });
const manifest = {
  runId: opts.out.split('/').pop(),
  startedAt: new Date().toISOString(),
  schemaVersion: OBS_ACTION_SCHEMA_VERSION,
  innerBrain: opts.innerBrain,
  waveCount: opts.waveCount,
  factions: {},
};

const innerFactory = BRAIN_REGISTRY[opts.innerBrain];
if (!innerFactory) throw new Error(`unknown inner brain: ${opts.innerBrain}`);

const t0 = Date.now();
let totalRows = 0;
let totalDropped = 0;

for (const faction of opts.factions) {
  const factionDir = join(opts.out, faction);
  mkdirSync(factionDir, { recursive: true });
  manifest.factions[faction] = { matches: 0, decisions: 0, dropped: { send: 0, frontier: 0, frontierManage: 0 } };

  for (let i = 0; i < opts.matches; i++) {
    const seed = (opts.seedBase * 31 + i * 7919) >>> 0;
    const matchId = `${faction}-s${seed}-w${opts.waveCount}`;
    const inner = innerFactory();
    const recorder = new ObsRecorderBrain(inner, matchId);

    const match = new Match({
      faction,
      difficulty: 'normal',
      mapId: 'plains',
      brainId: opts.innerBrain,       // not used because brainOverride wins
      matchMode: 'standard',
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
    totalRows += recorder.rows.length;
    totalDropped += recorder.dropped.send + recorder.dropped.frontier + recorder.dropped.frontierManage;

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
