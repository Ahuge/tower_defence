/**
 * eval_set.mts — Fixed evaluation benchmark for placement strategies.
 * 
 * A stable set of (faction, difficulty, seed) combos that we run
 * against to measure progress. Save results as JSON for comparison.
 * 
 * Usage:
 *   # Run eval with current StrategistBrain
 *   node --import tsx ml/desktop/eval_set.mts --out ml/desktop/eval-results.json
 * 
 *   # Run with learned scorer enabled
 *   node --import tsx ml/desktop/eval_set.mts --learned --out ml/desktop/eval-learned.json
 * 
 *   # Compare two eval runs
 *   node --import tsx ml/desktop/eval_set.mts --compare ml/desktop/eval-results.json ml/desktop/eval-learned.json
 */

await import('../../src/headless/harness/jsdom-setup.ts');

const { runMatch } = await import('../../src/headless/HeadlessMatch.ts');
const { StrategistBrain } = await import('../../playtest/StrategistBrain.ts');

import { writeFileSync, readFileSync } from 'node:fs';

// Fixed eval set: 11 factions x 2 difficulties x 25 seeds = 550 matches
// Seeds are fixed so results are comparable across runs
const FACTIONS = [
  'void', 'cypherpunk', 'military', 'psionic', 'mechanical',
  'harmonic', 'aliens', 'arcane', 'nature', 'infernal', 'celestial',
] as const;

const DIFFICULTIES = ['normal', 'hard'] as const;
const SEEDS = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000,
               1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000,
               2100, 2200, 2300, 2400, 2500];  // fixed

interface EvalResult {
  faction: string;
  difficulty: string;
  seed: number;
  won: boolean;
  waveReached: number;
}

interface EvalSummary {
  timestamp: string;
  config: { useLearnedScorer: boolean };
  results: EvalResult[];
  byFaction: Record<string, { wins: number; total: number; avgWave: number }>;
  overall: { wins: number; total: number; winRate: number; avgWave: number };
}

async function runEval(useLearnedScorer: boolean): Promise<EvalSummary> {
  const results: EvalResult[] = [];
  const total = FACTIONS.length * DIFFICULTIES.length * SEEDS.length;
  let done = 0;
  
  console.log(`Running eval: ${total} matches (learned=${useLearnedScorer})`);
  
  for (const faction of FACTIONS) {
    for (const difficulty of DIFFICULTIES) {
      for (const seed of SEEDS) {
        const brain = new StrategistBrain({ useLearnedScorer: useLearnedScorer ? 1 : 0 });
        try {
          const result = await runMatch({
            faction: faction as any,
            difficulty,
            mapId: 'plains',
            brainId: 'strategist',
            matchMode: 'standard',
            waveCount: 20,
            seed,
          }, brain);
          
          results.push({
            faction,
            difficulty,
            seed,
            won: result.outcome === 'win',
            waveReached: result.waveReached,
          });
        } catch (e) {
          console.error(`  Failed ${faction}/${difficulty}/${seed}: ${(e as Error).message}`);
          results.push({ faction, difficulty, seed, won: false, waveReached: 0 });
        }
        
        done++;
        if (done % 20 === 0) {
          console.log(`  ${done}/${total}`);
        }
      }
    }
  }
  
  // Summarize
  const byFaction: EvalSummary['byFaction'] = {};
  for (const faction of FACTIONS) {
    const fr = results.filter(r => r.faction === faction);
    const wins = fr.filter(r => r.won).length;
    const avgWave = fr.reduce((s, r) => s + r.waveReached, 0) / fr.length;
    byFaction[faction] = { wins, total: fr.length, avgWave };
  }
  
  const wins = results.filter(r => r.won).length;
  const avgWave = results.reduce((s, r) => s + r.waveReached, 0) / results.length;
  
  return {
    timestamp: new Date().toISOString(),
    config: { useLearnedScorer },
    results,
    byFaction,
    overall: {
      wins,
      total: results.length,
      winRate: wins / results.length,
      avgWave,
    },
  };
}

function printSummary(s: EvalSummary) {
  console.log(`\n=== Eval Summary (${s.timestamp}) ===`);
  console.log(`Config: learned=${s.config.useLearnedScorer}`);
  console.log(`Overall: ${s.overall.wins}/${s.overall.total} wins (${(s.overall.winRate * 100).toFixed(1)}%), avg wave ${s.overall.avgWave.toFixed(1)}`);
  console.log(`\nBy faction:`);
  for (const [faction, stats] of Object.entries(s.byFaction)) {
    console.log(`  ${faction}: ${stats.wins}/${stats.total} wins, avg wave ${stats.avgWave.toFixed(1)}`);
  }
}

function compare(a: EvalSummary, b: EvalSummary) {
  console.log(`\n=== Comparison ===`);
  console.log(`A (${a.timestamp}): ${(a.overall.winRate * 100).toFixed(1)}% wins, avg wave ${a.overall.avgWave.toFixed(1)}`);
  console.log(`B (${b.timestamp}): ${(b.overall.winRate * 100).toFixed(1)}% wins, avg wave ${b.overall.avgWave.toFixed(1)}`);
  
  const winDelta = b.overall.winRate - a.overall.winRate;
  const waveDelta = b.overall.avgWave - a.overall.avgWave;
  console.log(`\nDelta: ${(winDelta * 100).toFixed(1)}pp win rate, ${waveDelta.toFixed(1)} avg wave`);
  
  console.log(`\nPer-faction deltas:`);
  for (const faction of Object.keys(a.byFaction)) {
    const fa = a.byFaction[faction];
    const fb = b.byFaction[faction];
    const wDelta = fb.wins - fa.wins;
    const vDelta = fb.avgWave - fa.avgWave;
    const marker = wDelta > 0 ? '↑' : wDelta < 0 ? '↓' : '=';
    console.log(`  ${marker} ${faction}: ${fa.wins}→${fb.wins} wins, ${fa.avgWave.toFixed(1)}→${fb.avgWave.toFixed(1)} avg`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const getArg = (name: string) => {
    const idx = args.indexOf(`--${name}`);
    return idx >= 0 && args[idx + 1] ? args[idx + 1] : null;
  };
  
  if (args.includes('--compare')) {
    const fileA = getArg('compare') || args[args.indexOf('--compare') + 1];
    const fileB = args[args.indexOf('--compare') + 2];
    if (!fileA || !fileB) {
      console.error('Usage: --compare <fileA> <fileB>');
      process.exit(1);
    }
    const a = JSON.parse(readFileSync(fileA, 'utf-8')) as EvalSummary;
    const b = JSON.parse(readFileSync(fileB, 'utf-8')) as EvalSummary;
    compare(a, b);
    return;
  }
  
  const useLearned = args.includes('--learned');
  const out = getArg('out') || 'ml/desktop/eval-results.json';
  
  const summary = await runEval(useLearned);
  printSummary(summary);
  
  writeFileSync(out, JSON.stringify(summary, null, 2));
  console.log(`\nWrote ${out}`);
}

main();
