/**
 * Procedural icons for every achievement Factions ships with.
 * Output: 512×512 PNGs under `store-listing/achievements/icons/`.
 *
 * Play Console requires an icon per achievement — square, PNG/JPG,
 * 512×512 recommended. Rather than hand-drawing 13 of them we
 * build them procedurally from the faction palette so they match
 * the store listing's visual language (tower icon + faction stripe
 * row). Rerun whenever a new achievement is added.
 *
 *   node scripts/generate-achievement-icons.js
 *
 * Which achievements are produced:
 *   first_win              — generic victory trophy (amber gold)
 *   first_win_<faction>    — one per playable faction, coloured
 *                            with that faction's primaryColor
 *   discover_creeps        — the incremental "catalogue all creep
 *                            types" achievement icon
 */
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZE = 512;
const OUT_DIR = path.resolve(__dirname, '..', 'store-listing', 'achievements', 'icons');

const BG        = '#15101a';
const GOLD      = '#e8b76d';
const GOLD_HI   = '#f5d08a';

// Faction id → primary colour (hex). Matches src/data/Factions.ts.
const FACTION_COLORS = {
  arcane:     '#6644ff',
  mechanical: '#cc8833',
  nature:     '#44cc44',
  void:       '#8833cc',
  military:   '#888844',
  aliens:     '#88ff44',
  cypherpunk: '#00ffcc',
  infernal:   '#cc3333',
  celestial:  '#ffeeaa',
  psionic:    '#ff44ff',
  harmonic:   '#44ccff',
};

function hexToRgba(hex, alpha = 1) {
  const h = hex.startsWith('#') ? hex.slice(1) : hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function roundedSquarePath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function paintBackground(ctx, accentHex) {
  // Dark rounded-square frame with a radial accent in the chosen
  // colour. Keeps every icon visually consistent while letting the
  // per-achievement colour carry the identity.
  ctx.fillStyle = BG;
  roundedSquarePath(ctx, 0, 0, SIZE, SIZE, 80);
  ctx.fill();

  const grd = ctx.createRadialGradient(SIZE / 2, SIZE / 2, 0, SIZE / 2, SIZE / 2, SIZE * 0.55);
  grd.addColorStop(0, hexToRgba(accentHex, 0.38));
  grd.addColorStop(1, hexToRgba(accentHex, 0));
  ctx.fillStyle = grd;
  roundedSquarePath(ctx, 0, 0, SIZE, SIZE, 80);
  ctx.fill();

  // Outer gold ring
  ctx.strokeStyle = GOLD_HI;
  ctx.lineWidth = 6;
  roundedSquarePath(ctx, 8, 8, SIZE - 16, SIZE - 16, 72);
  ctx.stroke();
}

function drawTrophy(ctx, accentHex) {
  // Simple cup silhouette — horizontal handles, tapered stem, base.
  const cx = SIZE / 2;
  const cy = SIZE / 2 + 10;
  const cupW = 220;
  const cupH = 180;
  const cupTop = cy - cupH / 2;
  const stemH = 50;
  const baseW = 220;
  const baseH = 36;

  ctx.fillStyle = GOLD;
  // Cup body
  ctx.beginPath();
  ctx.moveTo(cx - cupW / 2, cupTop);
  ctx.lineTo(cx + cupW / 2, cupTop);
  ctx.lineTo(cx + cupW / 2 - 40, cupTop + cupH);
  ctx.lineTo(cx - cupW / 2 + 40, cupTop + cupH);
  ctx.closePath();
  ctx.fill();

  // Handles (small ovals on each side)
  ctx.lineWidth = 16;
  ctx.strokeStyle = GOLD;
  ctx.beginPath();
  ctx.ellipse(cx - cupW / 2 - 8, cupTop + cupH * 0.35, 36, 48, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx + cupW / 2 + 8, cupTop + cupH * 0.35, 36, 48, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Stem
  ctx.fillRect(cx - 30, cupTop + cupH, 60, stemH);

  // Base
  ctx.fillRect(cx - baseW / 2, cupTop + cupH + stemH, baseW, baseH);

  // Accent band across the cup in the faction / achievement colour
  ctx.fillStyle = accentHex;
  ctx.fillRect(cx - cupW / 2 + 10, cupTop + cupH * 0.45, cupW - 20, 22);

  // Highlight top lip
  ctx.fillStyle = GOLD_HI;
  ctx.fillRect(cx - cupW / 2 + 6, cupTop - 6, cupW - 12, 14);
}

function drawEncyclopediaGlyph(ctx) {
  // Stylised book + magnifying glass overlay for the DISCOVER_CREEPS
  // achievement. Gold-on-plum silhouette so it reads as a single
  // "catalogue / identification" icon.
  const cx = SIZE / 2;
  const cy = SIZE / 2;

  // Book covers
  ctx.fillStyle = GOLD;
  ctx.fillRect(cx - 150, cy - 110, 300, 220);

  // Spine highlight + pages
  ctx.fillStyle = BG;
  ctx.fillRect(cx - 132, cy - 92, 264, 184);
  ctx.fillStyle = GOLD;
  ctx.fillRect(cx - 4, cy - 110, 8, 220);

  // Three short lines of "text" on the page
  ctx.fillStyle = GOLD_HI;
  for (let i = 0; i < 3; i++) {
    const y = cy - 50 + i * 32;
    ctx.fillRect(cx - 110, y, 100, 8);
    ctx.fillRect(cx + 10, y, 100, 8);
  }

  // Magnifying glass overlay (upper right)
  ctx.strokeStyle = GOLD_HI;
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(cx + 120, cy - 80, 70, 0, Math.PI * 2);
  ctx.stroke();
  // Handle
  ctx.beginPath();
  ctx.moveTo(cx + 166, cy - 34);
  ctx.lineTo(cx + 220, cy + 20);
  ctx.stroke();
  // Highlight inside the lens
  ctx.strokeStyle = hexToRgba('#ffffff', 0.35);
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx + 100, cy - 110, 40, -Math.PI / 4, Math.PI / 4);
  ctx.stroke();
}

function writeIcon(key, canvas) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `${key}.png`);
  fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
  console.log(`  ${path.relative(path.resolve(__dirname, '..'), outPath)}`);
}

function render(key, accentHex, glyph) {
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext('2d');
  paintBackground(ctx, accentHex);
  if (glyph === 'trophy') drawTrophy(ctx, accentHex);
  else if (glyph === 'encyclopedia') drawEncyclopediaGlyph(ctx);
  writeIcon(key, canvas);
}

// Generic first win (not faction-specific) — gold-on-gold.
render('first_win', GOLD_HI, 'trophy');

// 11 faction wins
for (const [faction, hex] of Object.entries(FACTION_COLORS)) {
  render(`first_win_${faction}`, hex, 'trophy');
}

// DISCOVER_CREEPS — incremental "catalogue" achievement.
render('discover_creeps', GOLD, 'encyclopedia');

console.log('Done.');
