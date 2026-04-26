#!/usr/bin/env node
/**
 * Generate training data for the learning brain.
 *
 * Runs N matches across (brain × faction × seed). Each match wraps
 * the brain in RecorderBrain to capture (stateFeatures,
 * actionFeatures, decisionKind, metadata) per decide() call. After
 * the match, the outcome is attached to all of that match's rows.
 *
 * Output:
 *   ml/training-data/turns.jsonl     — one JSON object per turn
 *   ml/training-data/manifest.json   — run metadata (counts, seeds)
 *
 * Usage:
 *   node --import tsx scripts/generate-training-data.mjs
 *     [--seeds=50] [--difficulty=normal] [--brains=balanced,greedy,...]
 *     [--out=ml/training-data]
 */
import { writeFileSync, appendFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = resolve(HERE, '..');

const argv = process.argv.slice(2);
const getFlag = (name) => {
  const m = argv.find(a => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!m) return null;
  return m.includes('=') ? m.split('=').slice(1).join('=') : '';
};

const SEEDS = parseInt(getFlag('seeds') ?? '50', 10);
const DIFFICULTY = getFlag('difficulty') ?? 'normal';
const BRAINS = (getFlag('brains') ?? 'balanced,greedy,rush,econ,synergy,ultimate,aoe_focus,nature,harmonic,psionic').split(',');
const OUT_DIR = resolve(PROJECT_ROOT, getFlag('out') ?? 'ml/training-data');
const FACTIONS = ['arcane', 'mechanical', 'nature', 'void', 'military', 'aliens', 'cypherpunk', 'infernal', 'celestial', 'psionic', 'harmonic'];

mkdirSync(OUT_DIR, { recursive: true });
const turnsPath = join(OUT_DIR, 'turns.jsonl');
const manifestPath = join(OUT_DIR, 'manifest.json');
if (existsSync(turnsPath)) unlinkSync(turnsPath);

await import('../src/headless/harness/jsdom-setup.ts');
const { runMatch } = await import('../src/headless/HeadlessMatch.ts');
const { createBrain } = await import('../src/systems/bots/BotBrain.ts');
const { RecorderBrain } = await import('../src/systems/bots/learning/RecorderBrain.ts');
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

const t0 = Date.now();
const totalMatches = BRAINS.length * FACTIONS.length * SEEDS;
console.log(`generating training data · ${BRAINS.length} brains × ${FACTIONS.length} factions × ${SEEDS} seeds = ${totalMatches} matches`);
console.log(`difficulty: ${DIFFICULTY} · output: ${turnsPath}`);
console.log('---');

let matchId = 0;
let totalTurns = 0;
let wins = 0, losses = 0, errors = 0;

for (const brainId of BRAINS) {
  for (const faction of FACTIONS) {
    let factionTurns = 0;
    let factionWins = 0;
    for (let s = 0; s < SEEDS; s++) {
      const buffer = [];
      const inner = createBrain(brainId);
      if (!inner) { console.error(`unknown brain: ${brainId}`); continue; }
      const recorder = new RecorderBrain(inner, buffer, matchId, {
        faction, brain: brainId, difficulty: DIFFICULTY,
      });
      let result;
      try {
        result = await runMatch({
          faction, difficulty: DIFFICULTY, mapId: 'plains',
          brainId, matchMode: 'standard', waveCount: 20,
          seed: (1 * 31 + s * 7919) >>> 0,
        }, recorder);
      } catch (err) {
        errors++;
        matchId++;
        continue;
      }
      // Attach outcome to all buffered rows from this match, then write.
      const outcome = result.outcome;
      const won = outcome === 'win' ? 1 : 0;
      const wave = result.waveReached;
      for (const turn of buffer) {
        const row = {
          ...turn,
          outcome,
          won,
          waveReached: wave,
        };
        appendFileSync(turnsPath, JSON.stringify(row) + '\n');
      }
      factionTurns += buffer.length;
      totalTurns += buffer.length;
      if (won) { wins++; factionWins++; } else if (outcome === 'loss') { losses++; }
      matchId++;
    }
    console.log(`  ${brainId.padEnd(10)} × ${faction.padEnd(11)} : ${factionWins}/${SEEDS} wins, ${factionTurns} turns`);
  }
}

const t1 = Date.now();
const manifest = {
  generatedAt: new Date().toISOString(),
  difficulty: DIFFICULTY,
  brains: BRAINS,
  factions: FACTIONS,
  seedsPerCell: SEEDS,
  totalMatches,
  totalTurns,
  wins,
  losses,
  errors,
  wallTimeSec: ((t1 - t0) / 1000).toFixed(1),
};
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log('---');
console.log(`done · ${(((t1 - t0) / 1000) | 0)}s · ${totalTurns} turns from ${totalMatches} matches`);
console.log(`wins ${wins} · losses ${losses} · errors ${errors}`);
console.log(`wrote: ${turnsPath} (and manifest.json)`);
