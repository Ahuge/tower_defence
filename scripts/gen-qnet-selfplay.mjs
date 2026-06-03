#!/usr/bin/env node
/**
 * Q-net self-play data generation.
 *
 * Uses ObsRecorderBrain to wrap the inner brain — it already
 * captures (obs, action_idx) per decision and filters illegal
 * actions via the legalMask. We just need to label rows with
 * the match outcome after.
 *
 * Output JSONL rows: {tick, faction, action, obs_b64, globals_b64,
 *                     mask_b64, outcome, map, brain, matchId}.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { Buffer } from 'node:buffer';

await import('../src/headless/harness/jsdom-setup.ts');
const { Match } = await import('../src/headless/Match.ts');
const { ObsRecorderBrain } = await import('../src/systems/bots/learning/ObsRecorderBrain.ts');
const { OnlineMazeOptimizerBrain } = await import('../src/systems/bots/brains/OnlineMazeOptimizerBrain.ts');
const { BeamSearchBrain } = await import('../src/systems/bots/brains/BeamSearchBrain.ts');
const { BalancedBrain } = await import('../src/systems/bots/brains/BalancedBrain.ts');

function parseArgs() {
  const out = {
    brains: ['online-opt', 'balanced', 'beam-d2-w5'],
    maps: ['plains', 'crossroads', 'fortress', 'serpentine'],
    matchesPerCell: 100,
    waves: 25,
    difficulty: 'normal',
    mode: 'standard',
    seedBase: 90000,
    out: null,
    faction: 'arcane',
  };
  for (const a of process.argv.slice(2)) {
    if (a.startsWith('--brains=')) out.brains = a.slice('--brains='.length).split(',');
    else if (a.startsWith('--maps=')) out.maps = a.slice('--maps='.length).split(',');
    else if (a.startsWith('--matches-per-cell=')) out.matchesPerCell = parseInt(a.slice('--matches-per-cell='.length), 10);
    else if (a.startsWith('--waves=')) out.waves = parseInt(a.slice('--waves='.length), 10);
    else if (a.startsWith('--seed-base=')) out.seedBase = parseInt(a.slice('--seed-base='.length), 10);
    else if (a.startsWith('--out=')) out.out = a.slice('--out='.length);
  }
  if (!out.out) out.out = `data/qnet-selfplay/${new Date().toISOString().slice(0,16).replace(/[:T]/g,'-')}`;
  return out;
}

const opts = parseArgs();
console.log('[gen-qnet-selfplay] opts:', opts);
mkdirSync(opts.out, { recursive: true });

function b64FromTyped(arr) {
  return Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength).toString('base64');
}

function makeBrain(name, config, matchRef) {
  if (name === 'online-opt') return new OnlineMazeOptimizerBrain();
  if (name === 'balanced') return new BalancedBrain();
  if (name.startsWith('beam-')) {
    const m = name.match(/beam-d(\d+)-w(\d+)/);
    if (!m) throw new Error(`bad brain name: ${name}`);
    return new BeamSearchBrain({
      depth: parseInt(m[1], 10),
      beamWidth: parseInt(m[2], 10),
      matchConfig: config,
      matchRef,
    });
  }
  throw new Error(`unknown brain: ${name}`);
}

const t0 = Date.now();
let totalMatches = 0;
let totalRows = 0;
let totalWins = 0;

const manifest = {
  runId: opts.out.split('/').pop(),
  startedAt: new Date().toISOString(),
  opts,
  cells: {},
};

for (const map of opts.maps) {
  for (const brainName of opts.brains) {
    const cellKey = `${brainName}@${map}`;
    const cellDir = join(opts.out, cellKey.replace('@', '_'));
    mkdirSync(cellDir, { recursive: true });
    manifest.cells[cellKey] = { matches: 0, rows: 0, wins: 0, errors: 0, wallSec: 0 };
    const cellT0 = Date.now();
    console.log(`\n[${cellKey}] starting ${opts.matchesPerCell} matches`);

    for (let i = 0; i < opts.matchesPerCell; i++) {
      const seed = (opts.seedBase * 31 + i * 7919) >>> 0;
      const matchId = `${cellKey}-s${seed}`;
      const config = {
        faction: opts.faction,
        difficulty: opts.difficulty,
        mapId: map,
        brainId: 'placeholder',
        matchMode: opts.mode,
        waveCount: opts.waves,
        seed,
      };
      const matchRef = { current: null };
      try {
        const inner = makeBrain(brainName, config, matchRef);
        const recorder = new ObsRecorderBrain(inner, matchId);
        const m = new Match(config, recorder);
        matchRef.current = m;
        while (!m.isDone()) m.step();
        const result = m.result();
        const outcome = result.outcome === 'win' ? 1 : -1;
        const lines = recorder.rows.map(r => JSON.stringify({
          tick: r.tick,
          action: r.action,
          obs_b64: b64FromTyped(r.obs.grid),
          globals_b64: b64FromTyped(r.obs.globals),
          mask_b64: b64FromTyped(r.obs.mask),
          outcome,
          waveReached: result.waveReached,
          livesRemaining: result.livesRemaining,
          map,
          brain: brainName,
          matchId,
        }));
        if (lines.length > 0) {
          const filename = join(cellDir, `match_${seed}.jsonl.gz`);
          writeFileSync(filename, gzipSync(Buffer.from(lines.join('\n') + '\n')));
        }
        manifest.cells[cellKey].matches++;
        manifest.cells[cellKey].rows += recorder.rows.length;
        if (result.outcome === 'win') manifest.cells[cellKey].wins++;
        totalMatches++;
        totalRows += recorder.rows.length;
        if (result.outcome === 'win') totalWins++;
      } catch (e) {
        manifest.cells[cellKey].errors++;
        if (manifest.cells[cellKey].errors < 3) console.error(`  ${matchId} err:`, e.message);
      }
      if ((i + 1) % 25 === 0 || i === opts.matchesPerCell - 1) {
        const cellDt = (Date.now() - cellT0) / 1000;
        console.log(`  [${cellKey}] ${i + 1}/${opts.matchesPerCell}  wins=${manifest.cells[cellKey].wins}  rows=${manifest.cells[cellKey].rows}  wall=${cellDt.toFixed(0)}s`);
      }
    }
    manifest.cells[cellKey].wallSec = (Date.now() - cellT0) / 1000;
  }
}

manifest.endedAt = new Date().toISOString();
manifest.totalMatches = totalMatches;
manifest.totalRows = totalRows;
manifest.totalWins = totalWins;
manifest.totalSec = (Date.now() - t0) / 1000;
writeFileSync(join(opts.out, 'manifest.json'), JSON.stringify(manifest, null, 2));

console.log(`\n[gen-qnet-selfplay] DONE`);
console.log(`  matches: ${totalMatches}  rows: ${totalRows}  wins: ${totalWins} (${(totalWins/Math.max(1,totalMatches)*100).toFixed(1)}%)`);
console.log(`  wall: ${manifest.totalSec.toFixed(0)}s  out: ${opts.out}`);
