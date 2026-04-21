/**
 * Generate the Play Store feature graphic (1024 × 500).
 *
 * Tower icon left, "FACTIONS" wordmark right, dark plum background
 * with the faction primary colours arranged as a subtle stripe row
 * along the bottom — suggests variety without naming every faction.
 *
 * Run: node scripts/generate-feature-graphic.js
 * Output: store-listing/feature-graphic.png (also resources/feature-graphic.png for archival)
 */
const { createCanvas, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

const W = 1024;
const H = 500;

const BG        = '#15101a';
const GOLD      = '#e8b76d';
const GOLD_HI   = '#f5d08a';
const PLUM      = 'rgba(139, 107, 199, 0.18)';
const WORDMARK_COLOR = '#f5d08a';
const TAGLINE   = '#d8c89e';

// 12 faction primary colours for the bottom stripe.
const FACTION_COLORS = [
  '#9b59b6', // arcane
  '#e67e22', // mechanical
  '#2ecc71', // nature
  '#5c3a78', // void
  '#8d6748', // military
  '#88cc44', // spawn aliens
  '#ff00ff', // cypherpunk
  '#c73e1d', // infernal
  '#e8e8e8', // celestial
  '#6666ff', // psionic
  '#00aaff', // harmonic
  '#ffffff', // random
];

function paintBackground(ctx) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  // Radial glow behind the tower icon
  const grd = ctx.createRadialGradient(260, H / 2, 0, 260, H / 2, 320);
  grd.addColorStop(0, PLUM);
  grd.addColorStop(1, 'rgba(21, 16, 26, 0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);
}

function drawTower(ctx, cx, cy, scale) {
  const s = scale / 512;
  // Gold circle frame
  ctx.strokeStyle = GOLD_HI;
  ctx.lineWidth = 4 * s;
  ctx.beginPath();
  ctx.arc(cx, cy, 220 * s, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = GOLD;
  // Base
  ctx.fillRect(cx + (-96) * s, cy + 124 * s, 192 * s, 48 * s);
  // Body
  ctx.fillRect(cx + (-64) * s, cy + (-76) * s, 128 * s, 200 * s);
  // Battlements
  const merlonW = 32 * s, merlonH = 40 * s, gap = 16 * s;
  const startX = cx + (-64) * s;
  const topY   = cy + (-116) * s;
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(startX + i * (merlonW + gap), topY, merlonW, merlonH);
  }
  // Window slit
  ctx.fillStyle = BG;
  ctx.fillRect(cx + (-16) * s, cy + (-16) * s, 32 * s, 64 * s);
  // Door
  ctx.fillRect(cx + (-24) * s, cy + 84 * s, 48 * s, 40 * s);
}

function drawWordmark(ctx) {
  // Right-hand text block lives in the range [textX, W - 40].
  // Measure each line and shrink-to-fit so nothing clips off the
  // right edge (the 500-char tagline fits comfortably at 26, but
  // "FACTIONS" at a bold display weight grows wider than it looks
  // on paper — measure-first is more reliable than eyeballing).
  const textX = 500;
  const rightMargin = 40;
  const maxWidth = W - textX - rightMargin;

  ctx.textBaseline = 'middle';

  // Title — iterate the font size down until the title fits.
  ctx.fillStyle = WORDMARK_COLOR;
  let titleSize = 130;
  ctx.font = `bold ${titleSize}px "Arial Black", "Helvetica", sans-serif`;
  while (ctx.measureText('FACTIONS').width > maxWidth && titleSize > 40) {
    titleSize -= 2;
    ctx.font = `bold ${titleSize}px "Arial Black", "Helvetica", sans-serif`;
  }
  const titleW = ctx.measureText('FACTIONS').width;
  ctx.fillText('FACTIONS', textX, 205);

  // Gold underline bar sized to the rendered title width.
  ctx.fillStyle = GOLD;
  ctx.fillRect(textX, 275, titleW, 4);

  // Tagline
  ctx.fillStyle = TAGLINE;
  ctx.font = '28px "Helvetica", sans-serif';
  ctx.fillText('Maze-building Tower Defense', textX, 315);

  // Sub-tagline
  ctx.fillStyle = '#b8a898';
  ctx.font = '22px "Helvetica", sans-serif';
  ctx.fillText('12 factions · 8 modes · 1v1 & co-op', textX, 350);
}

function drawFactionStripes(ctx) {
  // 12 thin vertical stripes along the bottom, each one faction colour.
  const stripeH = 8;
  const y = H - stripeH - 24;
  const stripeW = W / FACTION_COLORS.length;
  for (let i = 0; i < FACTION_COLORS.length; i++) {
    ctx.fillStyle = FACTION_COLORS[i];
    ctx.fillRect(i * stripeW, y, stripeW, stripeH);
  }
  // Soft fade over the ends so they don't feel hard-edged.
  const fade = ctx.createLinearGradient(0, 0, W, 0);
  fade.addColorStop(0, BG);
  fade.addColorStop(0.08, 'rgba(21,16,26,0)');
  fade.addColorStop(0.92, 'rgba(21,16,26,0)');
  fade.addColorStop(1, BG);
  ctx.fillStyle = fade;
  ctx.fillRect(0, y - 2, W, stripeH + 4);
}

const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');
paintBackground(ctx);
drawFactionStripes(ctx);
drawTower(ctx, 260, H / 2, 360);
drawWordmark(ctx);

const outPaths = [
  path.resolve(__dirname, '..', 'store-listing', 'feature-graphic.png'),
  path.resolve(__dirname, '..', 'resources', 'feature-graphic.png'),
];
for (const out of outPaths) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, canvas.toBuffer('image/png'));
  console.log(`  wrote ${path.relative(process.cwd(), out)}`);
}
console.log('Done.');
