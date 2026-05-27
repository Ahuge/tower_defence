/**
 * MatchRenderer — draws a `Match`'s current state to a Canvas 2D
 * context. Used by `scripts/record-render.mjs` to produce per-tick
 * PNG frames, which ffmpeg then assembles into a webm for visual
 * inspection.
 *
 * Style is intentionally coarse — colored squares per tower, dots
 * per creep, faint path overlay, simple HUD strip. The goal is
 * VERIFICATION ("did PPO actually play legitimately?"), not pretty
 * gameplay capture. Anyone wanting real-game visuals should use
 * the live Phaser scene with a screen recorder.
 */
import type { CanvasRenderingContext2D as NodeCanvasContext } from 'canvas';
import { Match } from './Match';
import { CellType, Grid } from '../systems/Grid';
import { GRID_COLS, GRID_ROWS, TILE_SIZE, STARTING_LIVES } from '../config';
import { FACTIONS, FactionId } from '../data/Factions';
import { getFactionTowerIds } from '../systems/bots/learning/FactionVocab';

// We accept either a browser CanvasRenderingContext2D or the
// node-canvas one. Both expose the same drawing surface; the
// renderer doesn't care which.
type Ctx = NodeCanvasContext | CanvasRenderingContext2D;

const HUD_HEIGHT = 56;
const GAME_W = GRID_COLS * TILE_SIZE;   // 1008
const GAME_H = GRID_ROWS * TILE_SIZE;   // 728
export const CANVAS_W = GAME_W;
export const CANVAS_H = GAME_H + HUD_HEIGHT;

const PATH_COLOR = 'rgba(120, 120, 140, 0.18)';
const PATH_LINE_COLOR = 'rgba(220, 220, 100, 0.35)';
const BG_COLOR = '#10121a';
const GRID_LINE = 'rgba(255, 255, 255, 0.03)';
const ENTRY_COLOR = '#33ee66';
const EXIT_COLOR = '#ee4444';
const BLOCKED_COLOR = '#222630';
const NOBUILD_COLOR = '#3b2d28';
const HUD_BG = '#0a0c12';
const HUD_TEXT = '#dadce5';
const HUD_ACCENT = '#ffd166';

const CREEP_COLOR_BY_ARMOR: Record<string, string> = {
  light: '#f0e070',
  medium: '#f08c40',
  heavy: '#e84a4a',
};
const CREEP_FLYING_COLOR = '#aab0ff';

function colorIntToHex(n: number): string {
  return '#' + n.toString(16).padStart(6, '0');
}

function drawBackground(ctx: Ctx): void {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
}

function drawGrid(ctx: Ctx, grid: Grid): void {
  // Cells (terrain colors).
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const cell = grid.cells[r][c];
      const x = c * TILE_SIZE;
      const y = r * TILE_SIZE;
      if (cell === CellType.Blocked) {
        ctx.fillStyle = BLOCKED_COLOR;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      } else if (cell === CellType.NoBuild) {
        ctx.fillStyle = NOBUILD_COLOR;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      } else if (cell === CellType.Entry) {
        ctx.fillStyle = ENTRY_COLOR;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.globalAlpha = 1;
      } else if (cell === CellType.Exit) {
        ctx.fillStyle = EXIT_COLOR;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.globalAlpha = 1;
      }
    }
  }

  // Gridlines.
  ctx.strokeStyle = GRID_LINE;
  ctx.lineWidth = 1;
  for (let r = 0; r <= grid.rows; r++) {
    const y = r * TILE_SIZE + 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(grid.cols * TILE_SIZE, y);
    ctx.stroke();
  }
  for (let c = 0; c <= grid.cols; c++) {
    const x = c * TILE_SIZE + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, grid.rows * TILE_SIZE);
    ctx.stroke();
  }
}

function drawPaths(ctx: Ctx, paths: ({ col: number; row: number }[] | null)[]): void {
  ctx.strokeStyle = PATH_LINE_COLOR;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (const path of paths) {
    if (!path || path.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(path[0].col * TILE_SIZE + TILE_SIZE / 2, path[0].row * TILE_SIZE + TILE_SIZE / 2);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].col * TILE_SIZE + TILE_SIZE / 2, path[i].row * TILE_SIZE + TILE_SIZE / 2);
    }
    ctx.stroke();
  }
  // Cell-by-cell faint tint over path cells (extra readability).
  ctx.fillStyle = PATH_COLOR;
  for (const path of paths) {
    if (!path) continue;
    for (const p of path) {
      ctx.fillRect(p.col * TILE_SIZE, p.row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }
}

function drawTowers(ctx: Ctx, match: Match): void {
  // Read tower data via the brain-context (placedTowers list).
  // observe() returns a BotContext; we want the live tower list
  // so we go through the placedTowers field which Match builds
  // from TowerManager.
  const ctxData = match.observe();
  const faction = ctxData.faction;
  const factionDef = FACTIONS[faction];
  if (!factionDef) return;
  const baseColor = colorIntToHex(factionDef.primaryColor);
  const accentColor = colorIntToHex(factionDef.secondaryColor);

  const towerIds = getFactionTowerIds(faction);

  for (const t of ctxData.placedTowers) {
    const x = t.col * TILE_SIZE;
    const y = t.row * TILE_SIZE;
    const pad = 3;
    ctx.fillStyle = baseColor;
    ctx.fillRect(x + pad, y + pad, TILE_SIZE - 2 * pad, TILE_SIZE - 2 * pad);
    // Level indicator: a thin accent border per level (1..5).
    if (t.level > 1) {
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + pad - 1, y + pad - 1, TILE_SIZE - 2 * pad + 2, TILE_SIZE - 2 * pad + 2);
    }
    // Slot number text (small).
    const slot = towerIds.indexOf(t.towerId);
    if (slot >= 0) {
      ctx.fillStyle = '#15101a';
      ctx.font = 'bold 12px sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText(String(slot), x + TILE_SIZE / 2, y + TILE_SIZE / 2);
    }
  }
}

function drawCreeps(ctx: Ctx, match: Match): void {
  const creeps = match.getCreeps();
  for (const c of creeps) {
    if (!c.alive) continue;
    const cx = c.x;
    const cy = c.y;
    if (!isFinite(cx) || !isFinite(cy)) continue;

    // Color by armor type (or flying). Creep has `creepType` field
    // with `spawnBehavior` and `armor`; use those directly.
    const t = c.creepType;
    let color = '#cccccc';
    if (t) {
      if (t.spawnBehavior === 'flying') color = CREEP_FLYING_COLOR;
      else color = CREEP_COLOR_BY_ARMOR[c.armor] ?? color;
    }

    const radius = Math.max(3, (c.size ?? 1) * 5);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // HP bar above.
    if (c.maxHp > 0) {
      const hpFrac = Math.max(0, Math.min(1, c.hp / c.maxHp));
      const barW = TILE_SIZE * 0.6;
      const barH = 3;
      const barX = cx - barW / 2;
      const barY = cy - radius - 5;
      ctx.fillStyle = '#222';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = hpFrac > 0.5 ? '#33dd55' : hpFrac > 0.25 ? '#ffaa33' : '#ee3333';
      ctx.fillRect(barX, barY, barW * hpFrac, barH);
    }
  }
}

function drawHUD(ctx: Ctx, match: Match): void {
  const ctxData = match.observe();
  const simTime = match.getSimTimeMs();
  const lives = ctxData.lives;
  const gold = ctxData.budget;
  const wave = ctxData.wave;
  const between = ctxData.betweenWaves;
  const faction = ctxData.faction;

  ctx.fillStyle = HUD_BG;
  ctx.fillRect(0, GAME_H, CANVAS_W, HUD_HEIGHT);

  ctx.fillStyle = HUD_TEXT;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const y = GAME_H + HUD_HEIGHT / 2;

  const fontPrimary = 'bold 18px sans-serif';
  ctx.font = fontPrimary;
  ctx.fillStyle = HUD_ACCENT;
  ctx.fillText(`${faction.toUpperCase()}`, 12, y);

  ctx.font = '16px sans-serif';
  ctx.fillStyle = HUD_TEXT;
  let x = 160;
  ctx.fillText(`Gold: ${gold}`, x, y); x += 140;
  ctx.fillText(`Lives: ${Math.max(0, lives)} / ${STARTING_LIVES}`, x, y); x += 180;
  ctx.fillText(`Wave: ${wave}`, x, y); x += 120;
  ctx.fillText(`${between ? 'between' : 'in-wave'}`, x, y); x += 140;

  ctx.textAlign = 'right';
  ctx.fillStyle = '#7080a0';
  ctx.fillText(`t=${(simTime / 1000).toFixed(1)}s`, CANVAS_W - 12, y);
}

export function renderMatchFrame(ctx: Ctx, match: Match): void {
  drawBackground(ctx);
  drawGrid(ctx, match.getGrid());
  drawPaths(ctx, match.getAllPaths());
  drawTowers(ctx, match);
  drawCreeps(ctx, match);
  drawHUD(ctx, match);
}

/** Render a tiny color legend image (independent of any match) —
 *  useful to keep the renderer's color scheme legible across
 *  videos. Caller draws it once or as a watermark. Returns true
 *  on success; no-op overload for callers that don't care about
 *  legends. */
export function drawLegend(ctx: Ctx, faction: FactionId, x: number, y: number): void {
  const factionDef = FACTIONS[faction];
  if (!factionDef) return;
  const baseColor = colorIntToHex(factionDef.primaryColor);
  ctx.font = '11px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';

  ctx.fillStyle = baseColor;
  ctx.fillRect(x, y - 5, 10, 10);
  ctx.fillStyle = HUD_TEXT;
  ctx.fillText(`tower (slot # = cost rank)`, x + 14, y);
}
