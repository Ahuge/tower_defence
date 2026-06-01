/**
 * Probe: simulate plains match step-by-step, capturing the actual
 * path + per-candidate gains after each tower placement. Helps
 * diagnose why OnlineMazeOptimizerBrain places once then stalls.
 */
await import('../src/headless/harness/jsdom-setup.ts');
const { Grid, CellType } = await import('../src/systems/Grid.ts');
const { findPath } = await import('../src/systems/Pathfinding.ts');
const { MAPS } = await import('../src/data/Maps.ts');
const { scoreMazeCells } = await import('../src/systems/bots/MazePlanner.ts');

const map = MAPS['plains'];
const grid = new Grid(map);
console.log(`plains entry: (${grid.entry.col},${grid.entry.row}) exit: (${grid.exit.col},${grid.exit.row})`);
const initial = findPath(grid, grid.entry, grid.exit);
console.log(`initial path length: ${initial.length}`);
console.log(`initial path first 10 cells:`, initial.slice(0, 10).map(p => `(${p.col},${p.row})`).join(' '));
console.log(`initial path last 10 cells:`, initial.slice(-10).map(p => `(${p.col},${p.row})`).join(' '));

// Manually place a wall at (7,13) — the first cell our brain chose.
console.log(`\nPlacing wall at (7,13)...`);
const placed = grid.placeTower(7, 13);
console.log(`placement OK: ${placed}`);
const path2 = findPath(grid, grid.entry, grid.exit);
console.log(`new path length: ${path2.length}`);
console.log(`new path first 10:`, path2.slice(0, 10).map(p => `(${p.col},${p.row})`).join(' '));
console.log(`new path around col 7:`, path2.filter(p => p.col >= 5 && p.col <= 10).map(p => `(${p.col},${p.row})`).join(' '));

// Now score a set of obvious candidates with the new path.
const candidates = [];
for (const p of path2) candidates.push({ col: p.col, row: p.row }); // ALL path cells
// also include cells around path
for (const p of path2) {
  for (const [dc, dr] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
    const c = p.col + dc;
    const r = p.row + dr;
    if (c >= 0 && c < grid.cols && r >= 0 && r < grid.rows && grid.canPlaceTower(c, r)) {
      candidates.push({ col: c, row: r });
    }
  }
}
const uniq = Array.from(new Set(candidates.map(c => `${c.col},${c.row}`))).map(s => {
  const [c, r] = s.split(',').map(Number);
  return { col: c, row: r };
});
console.log(`\nScoring ${uniq.length} candidates near new path...`);
const scored = scoreMazeCells(grid, uniq, uniq.length, [path2]);
const positive = scored.filter(s => s.gain > 0);
console.log(`scored: ${scored.length}, gain>0: ${positive.length}`);
console.log(`top 10 by gain:`);
for (const s of scored.sort((a, b) => b.gain - a.gain).slice(0, 10)) {
  console.log(`  (${s.col},${s.row}) gain=${s.gain}`);
}
