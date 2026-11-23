/**
 * generate_data.mts — Generate synthetic placement training data.
 * 
 * Runs headless matches with the hand-coded brains and records
 * every tower placement as (board_state, tower, chosen_cell).
 * 
 * Usage:
 *   node --import tsx ml/desktop/generate_data.mts --count 10000 --out ml/desktop/synthetic.jsonl
 * 
 * This is CPU-bound (game simulation). Run it overnight.
 */

await import('../../src/headless/harness/jsdom-setup.ts');

const { runMatch } = await import('../../src/headless/HeadlessMatch.ts');
const { StrategistBrain } = await import('../../playtest/StrategistBrain.ts');
const { BalancedBrain } = await import('../../src/systems/bots/brains/BalancedBrain.ts');
const { GreedyBrain } = await import('../../src/systems/bots/brains/GreedyBrain.ts');

import { writeFileSync, appendFileSync, existsSync } from 'node:fs';

// Parse args
const args = process.argv.slice(2);
const getArg = (name: string, def: string) => {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : def;
};

const COUNT = parseInt(getArg('count', '10000'));
const OUT = getArg('out', 'ml/desktop/synthetic.jsonl');
const FACTIONS = ['void', 'cypherpunk', 'military', 'psionic', 'mechanical', 
                  'harmonic', 'aliens', 'arcane', 'nature', 'infernal', 'celestial'];
const DIFFICULTIES = ['normal', 'hard'] as const;

interface Placement {
  faction: string;
  difficulty: string;
  brain: string;
  matchId: number;
  wave: number;
  towerId: string;
  chosen: [number, number];
  board: [string, number, number][];  // [towerId, col, row] for all previous
  gold: number;  // economy.gold at decision time
  lives: number;  // lives remaining at decision time
  won: boolean;
}

async function generateOne(
  faction: string,
  difficulty: 'normal' | 'hard',
  brainType: string,
  seed: number,
  matchId: number,
): Promise<Placement[]> {
  let brain: any;
  if (brainType === 'strategist') brain = new StrategistBrain();
  else if (brainType === 'balanced') brain = new BalancedBrain();
  else brain = new GreedyBrain();
  
  const placements: Placement[] = [];
  const board: [string, number, number][] = [];
  
  // Monkey-patch decide to capture placements
  const origDecide = brain.decide.bind(brain);
  brain.decide = (ctx: any) => {
    const d = origDecide(ctx);
    if (d.kind === 'place' && d.type) {
      placements.push({
        faction,
        difficulty,
        brain: brainType,
        matchId,
        wave: ctx.wave,
        towerId: d.type.id,
        chosen: [d.col, d.row],
        board: [...board],
        gold: ctx.budget,
        lives: ctx.lives,
        won: false,  // filled in after match
      });
      board.push([d.type.id, d.col, d.row]);
    }
    return d;
  };
  
  const result = await runMatch({
    faction: faction as any,
    difficulty,
    mapId: 'plains',
    brainId: brainType as any,
    matchMode: 'standard',
    waveCount: 20,
    seed,
  }, brain);
  
  // Mark won/lost
  const won = result.outcome === 'win';
  for (const p of placements) p.won = won;
  
  return placements;
}

async function main() {
  console.log(`Generating ${COUNT} matches...`);
  console.log(`Output: ${OUT}`);
  
  // Clear output file
  if (existsSync(OUT)) {
    console.log(`Warning: ${OUT} exists, appending`);
  }
  
  let totalPlacements = 0;
  const brains = ['strategist', 'balanced', 'greedy'];
  
  for (let i = 0; i < COUNT; i++) {
    const faction = FACTIONS[i % FACTIONS.length];
    const difficulty = DIFFICULTIES[i % DIFFICULTIES.length];
    const brainType = brains[i % brains.length];
    const seed = 10000 + i;
    const matchId = Date.now() + i;
    
    try {
      const placements = await generateOne(faction, difficulty, brainType, seed, matchId);
      // Only keep placements from wins (higher quality)
      // Or keep all? For now, keep wins only to match expert data quality
      const wins = placements.filter(p => p.won);
      for (const p of wins) {
        appendFileSync(OUT, JSON.stringify(p) + '\n');
      }
      totalPlacements += wins.length;
      
      if ((i + 1) % 100 === 0) {
        console.log(`  ${i + 1}/${COUNT} matches, ${totalPlacements} placements`);
      }
    } catch (e) {
      console.error(`Match ${i} failed:`, (e as Error).message);
    }
  }
  
  console.log(`\nDone: ${totalPlacements} placements from ${COUNT} matches`);
  console.log(`Output: ${OUT}`);
}

main();
