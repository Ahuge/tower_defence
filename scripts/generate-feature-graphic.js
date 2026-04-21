/**
 * Generate feature graphics at every size Google expects.
 *
 *   1024 × 500  — Play Store main feature graphic (branded, with text)
 *    600 × 400  — Play Games on PC: small logo (branded, with text)
 *   1920 × 1080 — Play Games on PC: cover feature graphic
 *                 16:9, NO TEXT allowed, represents game cover
 *
 * All three share the same tower-icon + faction-stripe visual
 * language. The 16:9 cover drops the wordmark entirely (Google's
 * policy) and replaces it with a dramatic radial burst composition.
 *
 * Run: node scripts/generate-feature-graphic.js
 */
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const BG        = '#15101a';
const GOLD      = '#e8b76d';
const GOLD_HI   = '#f5d08a';
const PLUM      = 'rgba(139, 107, 199, 0.18)';
const WORDMARK_COLOR = '#f5d08a';
const TAGLINE   = '#d8c89e';

const FACTION_COLORS = [
  '#9b59b6', '#e67e22', '#2ecc71', '#5c3a78',
  '#8d6748', '#88cc44', '#ff00ff', '#c73e1d',
  '#e8e8e8', '#6666ff', '#00aaff', '#ffffff',
];

const VARIANTS = [
  {
    label: 'playstore',
    kind: 'branded',
    width: 1024, height: 500,
    tagLines: ['Maze-building Tower Defense', '12 factions · 8 modes · 1v1 & co-op'],
    outputs: [
      'store-listing/feature-graphic.png',
      'resources/feature-graphic.png',
    ],
  },
  {
    label: 'playgames-pc-logo',
    kind: 'branded',
    width: 600, height: 400,
    tagLines: ['Tower Defense'],
    outputs: [
      'store-listing/feature-graphic-pc-logo.png',
      'resources/feature-graphic-pc-logo.png',
    ],
  },
  {
    label: 'playgames-pc-cover',
    kind: 'cover',        // No text — Google's policy for this slot.
    width: 1920, height: 1080,
    outputs: [
      'store-listing/feature-graphic-pc-cover.png',
      'resources/feature-graphic-pc-cover.png',
    ],
  },
];

function paintBackground(ctx, W, H, towerCx, towerCy, intensity = 1) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  const grd = ctx.createRadialGradient(towerCx, towerCy, 0, towerCx, towerCy, H * 0.7);
  grd.addColorStop(0, `rgba(139, 107, 199, ${0.22 * intensity})`);
  grd.addColorStop(1, 'rgba(21, 16, 26, 0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);
}

function drawTower(ctx, cx, cy, scale, bg) {
  const s = scale / 512;
  ctx.strokeStyle = GOLD_HI;
  ctx.lineWidth = 4 * s;
  ctx.beginPath();
  ctx.arc(cx, cy, 220 * s, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = GOLD;
  ctx.fillRect(cx + (-96) * s, cy + 124 * s, 192 * s, 48 * s);
  ctx.fillRect(cx + (-64) * s, cy + (-76) * s, 128 * s, 200 * s);
  const merlonW = 32 * s, merlonH = 40 * s, gap = 16 * s;
  const startX = cx + (-64) * s;
  const topY   = cy + (-116) * s;
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(startX + i * (merlonW + gap), topY, merlonW, merlonH);
  }
  ctx.fillStyle = bg;
  ctx.fillRect(cx + (-16) * s, cy + (-16) * s, 32 * s, 64 * s);
  ctx.fillRect(cx + (-24) * s, cy + 84 * s, 48 * s, 40 * s);
}

function drawWordmark(ctx, W, H, textX, tagLines) {
  const rightMargin = Math.round(W * 0.04);
  const maxWidth = W - textX - rightMargin;
  ctx.textBaseline = 'middle';

  ctx.fillStyle = WORDMARK_COLOR;
  let titleSize = Math.round(H * 0.26);
  const minTitleSize = Math.round(H * 0.12);
  ctx.font = `bold ${titleSize}px "Arial Black", "Helvetica", sans-serif`;
  while (ctx.measureText('FACTIONS').width > maxWidth && titleSize > minTitleSize) {
    titleSize -= 2;
    ctx.font = `bold ${titleSize}px "Arial Black", "Helvetica", sans-serif`;
  }
  const titleW = ctx.measureText('FACTIONS').width;

  const titleY = Math.round(H * 0.41);
  ctx.fillText('FACTIONS', textX, titleY);

  ctx.fillStyle = GOLD;
  const underlineY = titleY + Math.round(titleSize * 0.55);
  ctx.fillRect(textX, underlineY, titleW, Math.max(3, Math.round(H * 0.008)));

  const lineHeight = Math.round(H * 0.08);
  let y = underlineY + Math.round(H * 0.08);
  const tagSize = Math.round(H * 0.056);
  const subSize = Math.round(H * 0.044);
  for (let i = 0; i < tagLines.length; i++) {
    ctx.fillStyle = i === 0 ? TAGLINE : '#b8a898';
    ctx.font = `${i === 0 ? tagSize : subSize}px "Helvetica", sans-serif`;
    ctx.fillText(tagLines[i], textX, y);
    y += lineHeight;
  }
}

function drawFactionStripes(ctx, W, H) {
  const stripeH = Math.max(6, Math.round(H * 0.018));
  const y = H - stripeH - Math.round(H * 0.06);
  const stripeW = W / FACTION_COLORS.length;
  for (let i = 0; i < FACTION_COLORS.length; i++) {
    ctx.fillStyle = FACTION_COLORS[i];
    ctx.fillRect(i * stripeW, y, stripeW, stripeH);
  }
  const fade = ctx.createLinearGradient(0, 0, W, 0);
  fade.addColorStop(0, BG);
  fade.addColorStop(0.08, 'rgba(21,16,26,0)');
  fade.addColorStop(0.92, 'rgba(21,16,26,0)');
  fade.addColorStop(1, BG);
  ctx.fillStyle = fade;
  ctx.fillRect(0, y - 2, W, stripeH + 4);
}

/**
 * Faction-colored rays fanning out from the tower centre. Used on
 * the cover variant to carry the "12 different factions" idea
 * visually — no wordmark means the art has to do the storytelling.
 */
function drawFactionRays(ctx, cx, cy, innerR, outerR) {
  // Soft radial bloom per faction — alpha deliberately low so the
  // rays read as atmospheric colour suggestion, not a flat colour
  // wheel. The tower and its gold ring need to dominate the frame.
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const count = FACTION_COLORS.length;
  const perSlice = (Math.PI * 2) / count;
  for (let i = 0; i < count; i++) {
    const a0 = i * perSlice - Math.PI / 2 + perSlice * 0.08;
    const a1 = (i + 1) * perSlice - Math.PI / 2 - perSlice * 0.08;

    const grd = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
    // Much lower opacity than the first pass — keeps the colours
    // present as mood lighting without swamping the tower.
    grd.addColorStop(0,    FACTION_COLORS[i] + '00');
    grd.addColorStop(0.15, FACTION_COLORS[i] + '44');
    grd.addColorStop(0.45, FACTION_COLORS[i] + '22');
    grd.addColorStop(1,    FACTION_COLORS[i] + '00');
    ctx.fillStyle = grd;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, outerR, a0, a1);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Edge vignette — pulls viewer attention to the tower. */
function drawVignette(ctx, W, H) {
  const grd = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.7);
  grd.addColorStop(0, 'rgba(21, 16, 26, 0)');
  grd.addColorStop(0.5, 'rgba(15, 10, 20, 0.35)');
  grd.addColorStop(1, 'rgba(0, 0, 0, 0.88)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);
}

function renderBranded(variant) {
  const { width: W, height: H, tagLines } = variant;
  const towerCx = Math.round(W * 0.25);
  const towerCy = H / 2;
  const towerScale = H * 0.82;
  const textX = Math.round(W * 0.48);

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  paintBackground(ctx, W, H, towerCx, towerCy);
  drawFactionStripes(ctx, W, H);
  drawTower(ctx, towerCx, towerCy, towerScale, BG);
  drawWordmark(ctx, W, H, textX, tagLines);
  return canvas;
}

/**
 * Cover variant — 16:9, NO TEXT. Centered tower on a starburst of
 * faction-coloured rays. All the branding work is visual; the
 * wordmark can live on the store listing page next to it. Google's
 * policy is strict on this: any text (including the game title)
 * gets the upload rejected.
 */
function renderCover(variant) {
  const { width: W, height: H } = variant;
  // Rule-of-thirds-ish composition — tower slightly left of centre
  // so the right side breathes. Vertical centre.
  const towerCx = Math.round(W * 0.5);
  const towerCy = Math.round(H * 0.5);
  const towerScale = H * 0.92;
  const iconDiameter = towerScale * (220 / 512) * 2;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  paintBackground(ctx, W, H, towerCx, towerCy, 1.2);

  // Rays emanating from well beyond the tower's ring so the icon
  // stays clean on dark. Inner radius pushed out to ~1.1× the
  // tower diameter — the rays are background atmosphere, not a
  // frame around the icon.
  drawFactionRays(ctx, towerCx, towerCy, iconDiameter * 1.1, Math.max(W, H) * 0.9);

  // Vignette BEFORE the tower so the tower sits on top, bright
  // and undarkened. Everything else fades toward the edges.
  drawVignette(ctx, W, H);

  // Subtle faction-colour stripe at the bottom, same as the
  // branded variants — common visual DNA across the asset set.
  drawFactionStripes(ctx, W, H);

  drawTower(ctx, towerCx, towerCy, towerScale, BG);

  return canvas;
}

function renderVariant(variant) {
  const canvas = variant.kind === 'cover' ? renderCover(variant) : renderBranded(variant);
  const buf = canvas.toBuffer('image/png');
  for (const rel of variant.outputs) {
    const out = path.resolve(__dirname, '..', rel);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, buf);
    console.log(`  [${variant.label}] ${rel} (${variant.width}×${variant.height})`);
  }
}

for (const variant of VARIANTS) {
  renderVariant(variant);
}
console.log('Done.');
