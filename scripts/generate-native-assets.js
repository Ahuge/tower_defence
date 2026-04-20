/**
 * Generate source assets for @capacitor/assets.
 *
 * Writes the master icon + splash files into `resources/` at project
 * root; `npx capacitor-assets generate` then fans them out into every
 * Android mipmap / iOS AppIcon size. Re-run whenever the icon design
 * changes:
 *
 *   node scripts/generate-native-assets.js
 *   npx capacitor-assets generate --android --ios
 *   npx cap sync
 *
 * Outputs:
 *   resources/icon.png               — 1024² icon with background baked in
 *   resources/icon-foreground.png    — 1024² transparent-bg, logo in 66% safe zone
 *                                      (fed to Android adaptive icons)
 *   resources/icon-background.png    — 1024² solid plum (adaptive icon bg layer)
 *   resources/splash.png             — 2732² splash with logo centred
 *
 * The drawTower() helper is shared with `generate-pwa-icons.js` so
 * the Play Store / App Store icon matches the PWA icon and the
 * in-browser favicon.
 */
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const OUT_DIR       = path.resolve(__dirname, '..', 'resources');
const ELECTRON_DIR  = path.resolve(__dirname, '..', 'build');

const BG      = '#15101a'; // --bg-deep
const GOLD    = '#e8b76d'; // --gold
const GOLD_HI = '#f5d08a'; // --gold-bright
const GLOW    = 'rgba(139, 107, 199, 0.15)';

/** Fill a dark plum background with a subtle radial glow. */
function paintBackground(ctx, w, h) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);
  const grd = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.min(w, h) * 0.45);
  grd.addColorStop(0, GLOW);
  grd.addColorStop(1, 'rgba(21, 16, 26, 0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
}

/**
 * Draw the tower silhouette centred in a square of `size` px.
 * Geometry mirrors `drawIcon` in generate-pwa-icons.js but takes an
 * offset so we can position it inside a larger canvas (splash).
 * When `drawBackground` is false (adaptive-icon foreground) we skip
 * the plum fill and ring so only the tower + alpha remain.
 */
function drawTower(ctx, cx, cy, scaleBase, drawBackground) {
  const s = scaleBase / 512;

  if (drawBackground) {
    // Gold ring around the central square (same as PWA icon).
    ctx.strokeStyle = GOLD_HI;
    ctx.lineWidth = 4 * s;
    ctx.beginPath();
    ctx.arc(cx, cy, 220 * s, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = GOLD;

  // Base
  ctx.fillRect(cx + (-96) * s, cy + 124 * s, 192 * s, 48 * s);
  // Body
  ctx.fillRect(cx + (-64) * s, cy + (-76) * s, 128 * s, 200 * s);
  // Battlements — 3 merlons
  const merlonW = 32 * s, merlonH = 40 * s, gap = 16 * s;
  const startX = cx + (-64) * s;
  const topY   = cy + (-116) * s;
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(startX + i * (merlonW + gap), topY, merlonW, merlonH);
  }
  // Window slit
  ctx.fillStyle = drawBackground ? BG : 'rgba(0,0,0,0)';
  if (drawBackground) ctx.fillRect(cx + (-16) * s, cy + (-16) * s, 32 * s, 64 * s);
  // Door
  ctx.fillStyle = drawBackground ? BG : 'rgba(0,0,0,0)';
  if (drawBackground) ctx.fillRect(cx + (-24) * s, cy + 84 * s, 48 * s, 40 * s);

  // For the transparent-foreground variant, re-stamp the tower's gold
  // pixels without punching negative space (the store frames an
  // adaptive icon at various radii — negative cut-outs look like
  // transparent holes, which is broken).
  if (!drawBackground) {
    ctx.fillStyle = GOLD;
    ctx.fillRect(cx + (-96) * s, cy + 124 * s, 192 * s, 48 * s);
    ctx.fillRect(cx + (-64) * s, cy + (-76) * s, 128 * s, 200 * s);
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(startX + i * (merlonW + gap), topY, merlonW, merlonH);
    }
  }
}

function writeCanvas(canvas, name) {
  const outPath = path.join(OUT_DIR, name);
  fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
  console.log(`  wrote ${path.relative(process.cwd(), outPath)}`);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

// 1. Master icon — 1024² with background baked in.
{
  const size = 1024;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  paintBackground(ctx, size, size);
  drawTower(ctx, size / 2, size / 2, size, /*drawBackground*/ true);
  writeCanvas(canvas, 'icon.png');
}

// 2. Adaptive-icon foreground — 1024² transparent, tower only, sized
//    at ~66% so it lives inside the safe zone when Android crops to
//    various shapes (circle / rounded-square / squircle).
{
  const size = 1024;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  // keep transparent bg
  drawTower(ctx, size / 2, size / 2, size * 0.66, /*drawBackground*/ false);
  writeCanvas(canvas, 'icon-foreground.png');
}

// 3. Adaptive-icon background — 1024² solid plum (+ subtle glow) that
//    Android composites behind the foreground layer.
{
  const size = 1024;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  paintBackground(ctx, size, size);
  writeCanvas(canvas, 'icon-background.png');
}

// 4. Splash — 2732² with logo centred. @capacitor/assets crops the
//    square to each device's aspect ratio; the logo needs to fit in
//    the central 1/3 (≈ 900² safe zone). We render it at 720² which
//    leaves breathing room.
{
  const size = 2732;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  paintBackground(ctx, size, size);
  drawTower(ctx, size / 2, size / 2, 720, /*drawBackground*/ true);
  writeCanvas(canvas, 'splash.png');

  // Dark-mode splash — same output for us since the icon is already
  // a dark-background design. @capacitor/assets uses this when the
  // device is in dark mode on iOS / Android 12+.
  writeCanvas(canvas, 'splash-dark.png');
}

// 5. Electron icon — electron-builder looks for `build/icon.png` at
//    1024² and auto-generates .ico for Windows + .icns for macOS from
//    it. Linux uses the PNG directly in the AppImage. Writing the
//    same master 1024² we already produced for Capacitor.
{
  fs.mkdirSync(ELECTRON_DIR, { recursive: true });
  const size = 1024;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  paintBackground(ctx, size, size);
  drawTower(ctx, size / 2, size / 2, size, /*drawBackground*/ true);
  const outPath = path.join(ELECTRON_DIR, 'icon.png');
  fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
  console.log(`  wrote ${path.relative(process.cwd(), outPath)}`);
}

console.log('Done.');
