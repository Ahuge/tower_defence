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
const { buildDefaultRegistry } = await import('../src/systems/bots/mazing/scorers/index.ts');
const { findPathWithMetrics } = await import('../src/systems/bots/mazing/AdversarialBeam.ts').catch(() => ({ findPathWithMetrics: null }));

const showBreakdown = process.argv.includes('--breakdown');
const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const factionId = args[0] ?? 'infernal';
const mapId = args[1] ?? 'plains';
const wave = Number(args[2] ?? 1);
const seed = Number(args[3] ?? 42);

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

if (showBreakdown) {
  console.log('');
  console.log('Score breakdown — per-scorer contribution at final plan state:');
  console.log('  (positive = contributes to picking this layout; weights default-on at 1.0 unless --tune)');
  console.log('');
  // Reconstruct a ScorerContext for the final plan state and ask the
  // default registry to break down each scorer's contribution. Bypasses
  // the wave-cached path inside MazingScorer; matches the same scoring
  // function the planner uses internally.
  const lookup = new Map(towerPool.map(t => [t.id, t]));
  const planState = {
    placedTowers: plan.bestPlan.map(p => ({ col: p.col, row: p.row, towerId: p.towerId })),
    cost: plan.bestPlan.reduce((s, p) => s + (lookup.get(p.towerId)?.cost ?? 0), 0),
  };
  const breakdownCtx = {
    grid,
    paths: [{ start: path[0], end: path[path.length - 1] }],
    towerPool,
    state: planState,
    bfs: { pathLength: path.length, nodesExpanded: 0, maxQueue: 0, success: true },
    pathGeometries: [path],
    lookupTower: (id) => lookup.get(id) ?? null,
    lookupRole: (id) => {
      const t = lookup.get(id);
      return t ? getTowerRole(t) : 'utility';
    },
  };
  const registry = buildDefaultRegistry();
  const breakdown = registry.scoreBreakdown(breakdownCtx);
  const sorted = Object.entries(breakdown).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  for (const [id, val] of sorted) {
    console.log(`  ${id.padEnd(22)} ${val.toFixed(2).padStart(12)}`);
  }
  console.log('');
  console.log(`Plan state.cost = ${planState.cost} → goldOnHit urgency factor 100/(100+${planState.cost}) ≈ ${(100 / (100 + planState.cost)).toFixed(3)}`);
  void findPathWithMetrics;
}
