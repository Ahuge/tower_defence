/**
 * Diagnostic: at one specific between-wave decision, score 10
 * candidates with V and print the actual values. Are they
 * discriminable, or is V picking near-randomly?
 */
import * as ort from 'onnxruntime-node';
await import('../src/headless/harness/jsdom-setup.ts');
const { Match } = await import('../src/headless/Match.ts');
const { OnlineMazeOptimizerBrain } = await import('../src/systems/bots/brains/OnlineMazeOptimizerBrain.ts');
const { fromMatch } = await import('../src/systems/bots/learning/ObsTensor.ts');

const session = await ort.InferenceSession.create('models/vnet-v1.onnx');

const config = {
  faction: 'arcane',
  difficulty: 'normal',
  mapId: 'plains',
  brainId: 'placeholder',
  matchMode: 'standard',
  waveCount: 25,
  seed: 80000,
};
const m = new Match(config, new OnlineMazeOptimizerBrain());

// Play a few waves to get to a between-wave state.
let safety = 0;
while (!m.isDone() && safety++ < 5000) {
  m.step();
  const ctx = m.observe();
  if (ctx.wave >= 2 && ctx.betweenWaves) break;
}

const ctx = m.observe();
console.log(`At wave=${ctx.wave} betweenWaves=${ctx.betweenWaves} gold=${ctx.budget} lives=${ctx.lives}`);

// Score baseline (no placement) with V.
async function vOf(match) {
  const obs = fromMatch(match);
  const gridT = new ort.Tensor('float32', obs.grid, [1, 14, 26, 36]);
  const glbT = new ort.Tensor('float32', obs.globals, [1, 25]);
  const out = await session.run({ grid: gridT, globals: glbT });
  return out.value.data[0];
}

const baselineV = await vOf(m);
console.log(`baseline V = ${baselineV.toFixed(4)}`);

// Try 10 different placement candidates and score each.
const snap = m.snapshot();
const affordable = ctx.towerPool.filter(t => t.cost <= ctx.budget);
const cheapest = affordable[0];
console.log(`Using ${cheapest.id} (cost=${cheapest.cost})`);

// Path-adjacent candidate cells.
const cells = [];
for (const p of ctx.allPaths) {
  if (!p) continue;
  for (const cell of p) {
    cells.push({col: cell.col, row: cell.row});
    cells.push({col: cell.col+1, row: cell.row});
    cells.push({col: cell.col-1, row: cell.row});
    cells.push({col: cell.col, row: cell.row+1});
    cells.push({col: cell.col, row: cell.row-1});
  }
}
const uniq = Array.from(new Set(cells.map(c => `${c.col},${c.row}`)))
  .map(s => { const [c,r] = s.split(',').map(Number); return {col:c,row:r}; })
  .filter(c => ctx.grid.canPlaceTower(c.col, c.row));

const scores = [];
for (const cell of uniq.slice(0, 15)) {
  const m2 = Match.restoreFromSnapshot(config, snap, new OnlineMazeOptimizerBrain());
  const grid = m2.getGrid();
  const towerMgr = m2.towerMgr;
  if (grid.canPlaceTower(cell.col, cell.row)) {
    towerMgr.placeTower(cell.col, cell.row, cheapest, m2.getAllPaths(), () => m2.recalcPaths(), true);
    m2.recalcPaths();
    m2.economy.gold = Math.max(0, m2.economy.gold - cheapest.cost);
  }
  const v = await vOf(m2);
  scores.push({cell: `(${cell.col},${cell.row})`, v});
}

scores.sort((a, b) => b.v - a.v);
console.log('Top 10 cells by V:');
for (const s of scores.slice(0, 10)) {
  console.log(`  ${s.cell.padEnd(10)} V=${s.v.toFixed(4)} (diff vs baseline=${(s.v - baselineV).toFixed(4)})`);
}
console.log(`\nBottom 5 cells by V:`);
for (const s of scores.slice(-5)) {
  console.log(`  ${s.cell.padEnd(10)} V=${s.v.toFixed(4)} (diff vs baseline=${(s.v - baselineV).toFixed(4)})`);
}

const vRange = scores[0].v - scores[scores.length-1].v;
console.log(`\nV range across candidates: ${vRange.toFixed(4)}`);
console.log(`V mean: ${(scores.reduce((a,s)=>a+s.v,0)/scores.length).toFixed(4)}`);
