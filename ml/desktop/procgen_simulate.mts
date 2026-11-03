/**
 * procgen_simulate.mts — Procedural placement generation with simulation labels.
 * 
 * Generates candidate tower placements using procedural patterns,
 * then runs them through the headless harness to get REAL win/loss labels.
 * This is genuinely new knowledge — strategies no bot would try.
 * 
 * Patterns:
 *  1. Random-valid: place towers at random valid cells (baseline exploration)
 *  2. Grid-fill: fill regions in grid patterns
 *  3. Cluster: place towers clustered around random centers
 *  4. Corridor: place along path-adjacent corridors
 *  5. Expert-perturb: take expert board states, try alternative placements
 * 
 * Usage:
 *   node --import tsx ml/desktop/procgen_simulate.mts --count 1000 --out ml/desktop/procgen.jsonl
 */

await import('../../src/headless/harness/jsdom-setup.ts');

const { runMatch } = await import('../../src/headless/HeadlessMatch.ts');
const { StrategistBrain } = await import('../../playtest/StrategistBrain.ts');

import { appendFileSync, existsSync } from 'node:fs';

const args = process.argv.slice(2);
const getArg = (name: string, def: string) => {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : def;
};

const COUNT = parseInt(getArg('count', '1000'));
const OUT = getArg('out', 'ml/desktop/procgen.jsonl');
const FACTIONS = ['void', 'cypherpunk', 'military', 'psionic', 'mechanical',
                  'harmonic', 'aliens', 'arcane', 'nature', 'infernal', 'celestial'];

const COLS = 36, ROWS = 26;

// Pattern generators: given (faction, towerPool, budget), return a placement strategy
type PatternFn = (ctx: any) => { col: number; row: number } | null;

function randomValid(ctx: any): { col: number; row: number } | null {
  const candidates = ctx.candidateCells;
  if (!candidates.length) return null;
  const c = candidates[Math.floor(Math.random() * candidates.length)];
  return { col: c.col, row: c.row };
}

function clusterAround(ctx: any, centerCol?: number, centerRow?: number): { col: number; row: number } | null {
  const cx = centerCol ?? Math.floor(Math.random() * COLS);
  const cy = centerRow ?? Math.floor(Math.random() * ROWS);
  
  // Find candidate closest to center
  let best = null;
  let bestDist = Infinity;
  for (const c of ctx.candidateCells) {
    const d = Math.hypot(c.col - cx, c.row - cy);
    if (d < bestDist) {
      bestDist = d;
      best = { col: c.col, row: c.row };
    }
  }
  return best;
}

function corridorCell(ctx: any): { col: number; row: number } | null {
  // Place near the path (path cells are in ctx.allPaths)
  // For simplicity, pick candidates in rows 10-16 (near plains path row 13)
  const near = ctx.candidateCells.filter((c: any) => c.row >= 10 && c.row <= 16);
  if (!near.length) return randomValid(ctx);
  const c = near[Math.floor(Math.random() * near.length)];
  return { col: c.col, row: c.row };
}

function gridFill(ctx: any): { col: number; row: number } | null {
  // Fill in a grid pattern: prefer cells where (col + row) % 3 === 0
  const grid = ctx.candidateCells.filter((c: any) => (c.col + c.row) % 3 === 0);
  if (!grid.length) return randomValid(ctx);
  const c = grid[Math.floor(Math.random() * grid.length)];
  return { col: c.col, row: c.row };
}

const PATTERNS: Record<string, PatternFn> = {
  'random': randomValid,
  'cluster': clusterAround,
  'corridor': corridorCell,
  'grid': gridFill,
  'perturb': randomValid,  // placeholder — perturb uses brain's choice, not this
};

/**
 * Smart perturbation: take the brain's chosen cell and add noise.
 * This explores around known-good strategies instead of pure random.
 * More likely to produce wins than naive patterns.
 */
function perturbBrainChoice(brainCell: { col: number; row: number }, ctx: any, maxDist = 3): { col: number; row: number } | null {
  for (let attempt = 0; attempt < 10; attempt++) {
    const dc = Math.floor(Math.random() * (maxDist * 2 + 1)) - maxDist;
    const dr = Math.floor(Math.random() * (maxDist * 2 + 1)) - maxDist;
    const nc = brainCell.col + dc;
    const nr = brainCell.row + dr;
    if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
    if (ctx.candidateCells.some((c: any) => c.col === nc && c.row === nr)) {
      return { col: nc, row: nr };
    }
  }
  return { col: brainCell.col, row: brainCell.row };  // fallback to original
}

interface ProcGenPlacement {
  faction: string;
  pattern: string;
  matchId: number;
  wave: number;
  towerId: string;
  chosen: [number, number];
  board: [string, number, number][];
  won: boolean;
}

async function runProcGenMatch(
  faction: string,
  patternName: string,
  seed: number,
  matchId: number,
): Promise<ProcGenPlacement[]> {
  const pattern = PATTERNS[patternName];
  const brain = new StrategistBrain();
  
  const placements: ProcGenPlacement[] = [];
  const board: [string, number, number][] = [];
  
  // Override placement decisions with proc gen pattern
  // But keep the brain's tower selection (WHAT to place)
  const origDecide = brain.decide.bind(brain);
  brain.decide = (ctx: any) => {
    const d = origDecide(ctx);
    if (d.kind === 'place' && d.type) {
      let cell: { col: number; row: number } | null = null;
      
      if (patternName === 'perturb') {
        // Smart: perturb around brain's choice
        cell = perturbBrainChoice({ col: d.col, row: d.row }, ctx);
      } else {
        // Naive patterns: use proc gen for WHERE, brain for WHAT
        cell = pattern(ctx);
      }
      
      if (cell) {
        placements.push({
          faction,
          pattern: patternName,
          matchId,
          wave: ctx.wave,
          towerId: d.type.id,
          chosen: [cell.col, cell.row],
          board: [...board],
          won: false,
        });
        board.push([d.type.id, cell.col, cell.row]);
        return { ...d, col: cell.col, row: cell.row };
      }
    }
    return d;
  };
  
  const result = await runMatch({
    faction: faction as any,
    difficulty: 'normal',
    mapId: 'plains',
    brainId: 'strategist',
    matchMode: 'standard',
    waveCount: 20,
    seed,
  }, brain);
  
  const won = result.outcome === 'win';
  for (const p of placements) p.won = won;
  
  return placements;
}

async function main() {
  console.log(`Proc gen simulation: ${COUNT} matches`);
  console.log(`Patterns: ${Object.keys(PATTERNS).join(', ')}`);
  console.log(`Output: ${OUT}`);
  
  const patternNames = Object.keys(PATTERNS);
  let totalPlacements = 0;
  let totalWins = 0;
  
  for (let i = 0; i < COUNT; i++) {
    const faction = FACTIONS[i % FACTIONS.length];
    const pattern = patternNames[i % patternNames.length];
    const seed = 50000 + i;
    const matchId = Date.now() + i;
    
    try {
      const placements = await runProcGenMatch(faction, pattern, seed, matchId);
      const wins = placements.filter(p => p.won);
      totalWins += wins.length > 0 ? 1 : 0;
      
      // Keep ALL placements (wins and losses) — losses are useful negatives
      for (const p of placements) {
        appendFileSync(OUT, JSON.stringify(p) + '\n');
      }
      totalPlacements += placements.length;
      
      if ((i + 1) % 100 === 0) {
        console.log(`  ${i + 1}/${COUNT} matches, ${totalPlacements} placements, ${totalWins} wins`);
      }
    } catch (e) {
      console.error(`Match ${i} failed:`, (e as Error).message);
    }
  }
  
  console.log(`\nDone: ${totalPlacements} placements from ${COUNT} matches (${totalWins} wins)`);
  console.log(`Output: ${OUT}`);
  console.log(`\nNote: includes LOSSES as negative examples — useful for training.`);
}

main();
