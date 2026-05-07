#!/usr/bin/env node
/**
 * Run MazingScorer once on a given (faction, map, wave) and print the
 * resulting layout as ASCII art. Useful for "what does the planner
 * actually produce?" debugging.
 *
 * Usage:
 *   node --import tsx scripts/show-mazing-plan.mjs              # default infernal/plains/wave 1
 *   node --import tsx scripts/show-mazing-plan.mjs nature plains 5
 *
 * Cell glyphs:
 *   .   empty (walkable)
 *   #   pre-existing blocked terrain
 *   E   entry (creep spawn)
 *   X   exit (creep goal)
 *   N   noBuild (walkable but unbuildable)
 *   ─── brain-placed below ───
 *   W   wall placement
 *   D   single-target DPS
 *   S   splash DPS
 *   F   slow / frost
 *   A   aura
 *   U   utility (mobile / other)
 */
await import('../src/headless/harness/jsdom-setup.ts');
const { Grid, CellType } = await import('../src/systems/Grid.ts');
const { MAPS } = await import('../src/data/Maps.ts');
const { FACTIONS, FACTION_TOWER_TYPES } = await import('../src/data/Factions.ts').then(m => ({
  FACTIONS: m.FACTIONS,
  FACTION_TOWER_TYPES: m.FACTION_TOWER_TYPES ?? null,
}));
const { TOWER_TYPES } = await import('../src/data/TowerTypes.ts');
const { findPath } = await import('../src/systems/Pathfinding.ts');
const { getTowerRole } = await import('../src/data/TowerRoles.ts');
const { MazingScorer } = await import('../src/systems/bots/mazing/MazingScorer.ts');
const { seedRng } = await import('../src/systems/Rng.ts');

const factionId = process.argv[2] ?? 'infernal';
const mapId = process.argv[3] ?? 'plains';
const wave = Number(process.argv[4] ?? 1);
const seed = Number(process.argv[5] ?? 42);

const faction = FACTIONS[factionId];
if (!faction) { console.error(`unknown faction ${factionId}`); process.exit(1); }
const mapDef = MAPS[mapId];
if (!mapDef) { console.error(`unknown map ${mapId}`); process.exit(1); }

seedRng(seed);

// Build a grid from the map definition.
const grid = new Grid(mapDef);

// Tower pool from the faction's tower IDs.
const towerPool = faction.towerIds.map(id => TOWER_TYPES[id]).filter(Boolean);

// All empty cells = candidate placements (single-zone case = full grid).
const candidateCells = [];
for (let r = 0; r < grid.rows; r++) {
  for (let c = 0; c < grid.cols; c++) {
    if (grid.cells[r][c] === CellType.Empty) candidateCells.push({ col: c, row: r });
  }
}

// Path for BFS scoring.
const path = findPath(grid);
if (!path) { console.error('no path entry → exit on this map'); process.exit(1); }

// Build a minimal BotContext for MazingScorer.
const ctx = {
  playerIndex: 0,
  faction: factionId,
  candidateCells,
  towerPool,
  budget: 800,
  wave,
  lives: 20,
  grid,
  allPaths: [path],
  placedTowers: [],
  sendOptions: [],
  frontierOptions: [],
  betweenWaves: false,
};

const scorer = new MazingScorer();
scorer.bestCell(ctx, towerPool[0]); // triggers ensurePlan
const plan = scorer.getCachedPlan();

if (!plan || plan.bestPlan.length === 0) {
  console.log('Planner produced empty plan.');
  process.exit(0);
}

// Render.
const ROLE_GLYPH = {
  'wall': 'W',
  'dps-single': 'D',
  'dps-splash': 'S',
  'slow': 'F',
  'aura': 'A',
  'utility': 'U',
};

// Build a 2D char array from the grid.
const chars = [];
for (let r = 0; r < grid.rows; r++) {
  const row = [];
  for (let c = 0; c < grid.cols; c++) {
    const cell = grid.cells[r][c];
    if (cell === CellType.Entry) row.push('E');
    else if (cell === CellType.Exit) row.push('X');
    else if (cell === CellType.Blocked) row.push('#');
    else if (cell === CellType.NoBuild) row.push('N');
    else row.push('.');
  }
  chars.push(row);
}

// Overlay path with '·' so we can see where creeps walk through the maze.
for (const p of path) {
  if (chars[p.row][p.col] === '.') chars[p.row][p.col] = '·';
}

// Overlay plan placements with role glyphs (uppercase = brain choice).
const towerLookup = new Map(towerPool.map(t => [t.id, t]));
const roleCounts = new Map();
for (const placement of plan.bestPlan) {
  const t = towerLookup.get(placement.towerId);
  if (!t) continue;
  const role = getTowerRole(t);
  const glyph = ROLE_GLYPH[role] ?? '?';
  chars[placement.row][placement.col] = glyph;
  roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);
}

console.log(`MazingScorer plan · faction=${factionId} · map=${mapId} · wave=${wave} · seed=${seed}`);
console.log(`Pool: ${towerPool.map(t => `${t.id}(${getTowerRole(t)})`).join(', ')}`);
console.log('');
for (const row of chars) console.log(row.join(' '));
console.log('');
console.log(`Plan: ${plan.bestPlan.length} placements`);
for (const [role, count] of roleCounts) console.log(`  ${role}: ${count}`);
console.log('');
console.log('Score history (per beam wave):');
console.log('  ' + plan.scoreHistory.map(s => Math.round(s)).join(' → '));
console.log('');
console.log('Best role scores (peak across the run):');
for (const [role, score] of Object.entries(plan.bestRoleScore)) {
  if (score > 0) console.log(`  ${role}: ${Math.round(score)}`);
}
