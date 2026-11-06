/**
 * directed_search.mts — Find novel winning strategies via targeted search.
 * 
 * For factions at 0% win rate:
 *  1. Run eval seeds, find death wave
 *  2. Go back N waves before death (board might be unsalvageable at death)
 *  3. Try many placement variations from that earlier state
 *  4. Keep variations that survive longer / win
 *  5. Those become training data
 * 
 * This generates genuinely novel winning data for factions where
 * no bot can currently win.
 * 
 * Usage:
 *   node --import tsx ml/desktop/directed_search.mts \
 *     --factions void,celestial,mechanical \
 *     --variations 200 \
 *     --lookback 3 \
 *     --perturb 5 \
 *     --out ml/desktop/directed.jsonl
 */

await import('../../src/headless/harness/jsdom-setup.ts');

const { runMatch } = await import('../../src/headless/HeadlessMatch.ts');
const { StrategistBrain } = await import('../../playtest/StrategistBrain.ts');

import { appendFileSync } from 'node:fs';

const args = process.argv.slice(2);
const getArg = (name: string, def: string) => {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : def;
};

const FACTIONS = getArg('factions', 'void,celestial,mechanical,military,cypherpunk,psionic').split(',');
const VARIATIONS = parseInt(getArg('variations', '200'));
const LOOKBACK = parseInt(getArg('lookback', '3'));  // waves before death to branch from
const PERTURB = parseInt(getArg('perturb', '3'));  // ±tiles for placement perturbation
const OUT = getArg('out', 'ml/desktop/directed.jsonl');
const SEEDS = [100, 200, 300, 400, 500];  // subset for speed

const COLS = 36, ROWS = 26;

interface VariationPlacement {
  towerId: string;
  col: number;
  row: number;
  gold: number;  // economy.gold at decision time
  lives: number;  // lives remaining at decision time
  wave: number;  // actual wave at decision time (was approximated as i/10)
}

interface SearchResult {
  faction: string;
  seed: number;
  deathWave: number;
  branchWave: number;
  variation: number;
  survivedTo: number;
  won: boolean;
  placements: VariationPlacement[];
}

/**
 * Run a match and record the wave where it dies.
 * Returns death wave and the board state at (deathWave - lookback).
 */
async function findDeathPoint(
  faction: string,
  seed: number,
): Promise<{ deathWave: number; snapshot: any } | null> {
  const brain = new StrategistBrain();
  
  // We need to capture board state at each wave
  // For simplicity, we'll run the match and note the death wave,
  // then re-run with intervention at (deathWave - lookback)
  const result = await runMatch({
    faction: faction as any,
    difficulty: 'hard',
    mapId: 'plains',
    brainId: 'strategist',
    matchMode: 'standard',
    waveCount: 20,
    seed,
  }, brain);
  
  if (result.outcome === 'win') return null;  // already wins, skip
  
  return {
    deathWave: result.waveReached,
    snapshot: null,  // we'll re-run with intervention
  };
}

/**
 * Run a match with perturbed placements starting from branchWave.
 * The brain plays normally until branchWave, then we inject variations.
 */
async function runWithVariations(
  faction: string,
  seed: number,
  branchWave: number,
  variationSeed: number,
): Promise<{ survivedTo: number; won: boolean; placements: VariationPlacement[] }> {
  const brain = new StrategistBrain();
  const placements: VariationPlacement[] = [];
  
  // Use variationSeed to perturb RNG for placement decisions
  let rngState = variationSeed;
  const rand = () => {
    rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
    return rngState / 0x7fffffff;
  };
  
  const origDecide = brain.decide.bind(brain);
  brain.decide = (ctx: any) => {
    const d = origDecide(ctx);
    if (d.kind === 'place' && d.type) {
      let col = d.col, row = d.row;
      
      // After branchWave, perturb placements
      if (ctx.wave >= branchWave) {
        // Try random nearby cells
        for (let attempt = 0; attempt < 10; attempt++) {
          const dc = Math.floor(rand() * (PERTURB * 2 + 1)) - PERTURB;
          const dr = Math.floor(rand() * (PERTURB * 2 + 1)) - PERTURB;
          const nc = col + dc, nr = row + dr;
          if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS &&
              ctx.candidateCells.some((c: any) => c.col === nc && c.row === nr)) {
            col = nc; row = nr;
            break;
          }
        }
      }
      
      placements.push({ towerId: d.type.id, col, row, gold: ctx.budget, lives: ctx.lives, wave: ctx.wave });
      return { ...d, col, row };
    }
    return d;
  };
  
  const result = await runMatch({
    faction: faction as any,
    difficulty: 'hard',
    mapId: 'plains',
    brainId: 'strategist',
    matchMode: 'standard',
    waveCount: 20,
    seed,
  }, brain);
  
  return {
    survivedTo: result.waveReached,
    won: result.outcome === 'win',
    placements,
  };
}

async function main() {
  console.log(`Directed search: factions=${FACTIONS.join(',')}`);
  console.log(`Variations per death point: ${VARIATIONS}, lookback: ${LOOKBACK} waves`);
  console.log(`Output: ${OUT}`);
  
  let totalKept = 0;
  
  for (const faction of FACTIONS) {
    console.log(`\n=== ${faction} ===`);
    
    for (const seed of SEEDS) {
      // Step 1: find death point
      const death = await findDeathPoint(faction, seed);
      if (!death) {
        console.log(`  seed ${seed}: already wins, skipping`);
        continue;
      }
      
      const branchWave = Math.max(0, death.deathWave - LOOKBACK);
      console.log(`  seed ${seed}: dies at wave ${death.deathWave}, branching from wave ${branchWave}`);
      
      // Step 2: try variations
      let bestSurvived = death.deathWave;
      let bestVariations: SearchResult[] = [];
      
      for (let v = 0; v < VARIATIONS; v++) {
        if (v % 25 === 0) {
          console.log(`    variation ${v}/${VARIATIONS} (best so far: wave ${bestSurvived})`);
        }
        // Timeout each variation at 120s — a hanging match shouldn't block the whole run
        const result = await Promise.race([
          runWithVariations(faction, seed, branchWave, seed * 1000 + v),
          new Promise<null>((_, reject) => 
            setTimeout(() => reject(new Error('variation timeout')), 120000)
          ),
        ]).catch(err => {
          console.log(`    variation ${v}: ${err.message}, skipping`);
          return null;
        });
        if (!result) continue;
        
        if (result.survivedTo > bestSurvived) {
          bestSurvived = result.survivedTo;
          // Keep this variation if it's better than baseline
          const searchResult: SearchResult = {
            faction,
            seed,
            deathWave: death.deathWave,
            branchWave,
            variation: v,
            survivedTo: result.survivedTo,
            won: result.won,
            placements: result.placements,
          };
          bestVariations.push(searchResult);
          
          // Write placements as training data
          // Convert to the format expected by combine_data.py
          for (let i = 0; i < result.placements.length; i++) {
            const p = result.placements[i];
            const board: [string, number, number][] = result.placements.slice(0, i).map(
              (q) => [q.towerId, q.col, q.row] as [string, number, number]);
            appendFileSync(OUT, JSON.stringify({
              faction,
              towerId: p.towerId,
              chosen: [p.col, p.row],
              board,
              wave: p.wave,
              gold: p.gold,
              lives: p.lives,
              won: result.won,
              source: 'directed-search',
              seed,
              branchWave,
            }) + '\n');
          }
          // Free the placements array — it's on disk now, don't keep it in memory
          searchResult.placements = [];
          totalKept++;
        }
      }
      
      console.log(`    best: wave ${bestSurvived} (was ${death.deathWave}), kept ${bestVariations.length} variations`);
    }
  }
  
  console.log(`\nDone. Kept ${totalKept} improved variations.`);
  console.log(`Output: ${OUT}`);
}

main();
