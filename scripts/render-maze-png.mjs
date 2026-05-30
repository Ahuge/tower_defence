#!/usr/bin/env node
/**
 * Render a maze-optimizer W* JSON as a PNG.
 *
 *   node --import tsx scripts/render-maze-png.mjs <input.json> [output.png] [map=plains]
 *
 * What's drawn:
 *   - Grid background
 *   - Entries (green) / exits (red) from the map definition
 *   - Blocked / nobuild cells (dim) from the map definition
 *   - W* walls (blue squares)
 *   - The actual creep path AFTER placing W* (yellow line)
 *   - Stats overlay: wall count, baseline path length, optimum
 *     path length, "boxed" path-cell count (cells with walls on
 *     opposing sides — matches the new corridor reward).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { createCanvas } from 'canvas';

await import('../src/headless/harness/jsdom-setup.ts');
const { Grid, CellType } = await import('../src/systems/Grid.ts');
const { findPath } = await import('../src/systems/Pathfinding.ts');
const { MAPS } = await import('../src/data/Maps.ts');

const args = process.argv.slice(2);
const inputPath = args[0];
if (!inputPath) {
  console.error('usage: render-maze-png.mjs <walls.json> [out.png] [mapId=plains]');
  process.exit(2);
}
const outputPath = args[1] ?? inputPath.replace(/\.json$/, '.png');
const mapId = args[2] ?? 'plains';

const raw = JSON.parse(readFileSync(inputPath, 'utf8'));
const entry = Array.isArray(raw) ? raw[0] : raw;
if (!entry?.walls) throw new Error('JSON missing walls array');
const walls = entry.walls;
const wallSet = new Set(walls.map(w => `${w.col},${w.row}`));

const mapDef = MAPS[mapId];
if (!mapDef) throw new Error(`unknown map: ${mapId}`);
const grid = new Grid(mapDef);
for (const w of walls) {
  if (grid.canPlaceTower(w.col, w.row)) grid.placeTower(w.col, w.row);
}

const path = findPath(grid, grid.entry, grid.exit) ?? [];

// Box-in / corridor metrics so the PNG matches what the reward sees.
function isWall(c, r) {
  if (c < 0 || c >= grid.cols || r < 0 || r >= grid.rows) return true;
  return !grid.isWalkable(c, r);
}
let boxIn = 0, corridor = 0;
for (const cell of path) {
  const wL = isWall(cell.col - 1, cell.row);
  const wR = isWall(cell.col + 1, cell.row);
  const wU = isWall(cell.col, cell.row - 1);
  const wD = isWall(cell.col, cell.row + 1);
  boxIn += (wL ? 1 : 0) + (wR ? 1 : 0) + (wU ? 1 : 0) + (wD ? 1 : 0);
  if (wL && wR) corridor++;
  if (wU && wD) corridor++;
}

const TILE = 24;
const MARGIN = 20;
const FOOTER = 80;
const W = grid.cols * TILE + MARGIN * 2;
const H = grid.rows * TILE + MARGIN * 2 + FOOTER;
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');

ctx.fillStyle = '#0a0e18';
ctx.fillRect(0, 0, W, H);

function px(col, row) {
  return { x: MARGIN + col * TILE, y: MARGIN + row * TILE };
}

// Grid lines.
ctx.strokeStyle = '#1a2030';
ctx.lineWidth = 1;
for (let c = 0; c <= grid.cols; c++) {
  ctx.beginPath();
  ctx.moveTo(MARGIN + c * TILE, MARGIN);
  ctx.lineTo(MARGIN + c * TILE, MARGIN + grid.rows * TILE);
  ctx.stroke();
}
for (let r = 0; r <= grid.rows; r++) {
  ctx.beginPath();
  ctx.moveTo(MARGIN, MARGIN + r * TILE);
  ctx.lineTo(MARGIN + grid.cols * TILE, MARGIN + r * TILE);
  ctx.stroke();
}

// Map cells (blocked / nobuild / entry / exit). Walls last so they
// sit on top of nobuild markers.
for (let r = 0; r < grid.rows; r++) {
  for (let c = 0; c < grid.cols; c++) {
    const ct = grid.cells[r][c];
    const { x, y } = px(c, r);
    if (ct === CellType.Blocked) {
      ctx.fillStyle = '#2c2030';
      ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
    } else if (ct === CellType.NoBuild) {
      ctx.fillStyle = '#1f2333';
      ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
    } else if (ct === CellType.Entry) {
      ctx.fillStyle = '#1f5f2f';
      ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
    } else if (ct === CellType.Exit) {
      ctx.fillStyle = '#5f1f1f';
      ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2);
    }
  }
}

// W* walls (blue, with a brighter border for corridor cells).
for (const w of walls) {
  const { x, y } = px(w.col, w.row);
  ctx.fillStyle = '#3b7bff';
  ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
  ctx.strokeStyle = '#a4c4ff';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
}

// Creep path overlay — yellow line through cell centers, sized so
// it stands out against everything else.
if (path.length > 0) {
  ctx.strokeStyle = '#ffe066';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < path.length; i++) {
    const { x, y } = px(path[i].col, path[i].row);
    const cx = x + TILE / 2;
    const cy = y + TILE / 2;
    if (i === 0) ctx.moveTo(cx, cy);
    else ctx.lineTo(cx, cy);
  }
  ctx.stroke();

  // Mark corridor path cells with a small ring so they're visible.
  for (const cell of path) {
    const wL = isWall(cell.col - 1, cell.row);
    const wR = isWall(cell.col + 1, cell.row);
    const wU = isWall(cell.col, cell.row - 1);
    const wD = isWall(cell.col, cell.row + 1);
    const isCorridor = (wL && wR) || (wU && wD);
    if (isCorridor) {
      const { x, y } = px(cell.col, cell.row);
      ctx.strokeStyle = '#ff9c4a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + TILE / 2, y + TILE / 2, TILE * 0.32, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

// Footer stats.
ctx.fillStyle = '#dde3f2';
ctx.font = '13px monospace';
const footerY = MARGIN + grid.rows * TILE + 18;
const lines = [
  `${basename(inputPath)}   map=${mapId}   walls=${walls.length}   path=${path.length}`
    + (entry.baselinePathLength ? `   baseline=${entry.baselinePathLength}` : '')
    + (entry.pathLength ? `   optimum=${entry.pathLength}` : ''),
  `box-in sum=${boxIn}   corridor cells=${corridor}   (rings = corridor path cells)`,
  `legend: blue=W* wall  green=entry  red=exit  yellow=creep path  dark=blocked/nobuild`,
];
for (let i = 0; i < lines.length; i++) {
  ctx.fillText(lines[i], MARGIN, footerY + i * 18);
}

writeFileSync(outputPath, canvas.toBuffer('image/png'));
console.log(`wrote ${outputPath}  (${W}x${H})`);
console.log(`  walls=${walls.length}  path=${path.length}  box-in=${boxIn}  corridor=${corridor}`);
