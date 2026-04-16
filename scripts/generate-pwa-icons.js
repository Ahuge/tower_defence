/**
 * Generate PWA icons — simple tower silhouette on warm plum background.
 * Uses the `canvas` package already in devDependencies.
 *
 * Run: node scripts/generate-pwa-icons.js
 */
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const SIZES = [192, 512];
const OUT_DIR = path.resolve(__dirname, '..', 'public', 'icons');

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const s = size / 512; // scale factor

  // Background — warm dark plum (matches design tokens --bg-deep)
  ctx.fillStyle = '#15101a';
  ctx.fillRect(0, 0, size, size);

  // Subtle radial glow
  const grd = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size * 0.45
  );
  grd.addColorStop(0, 'rgba(139, 107, 199, 0.15)');
  grd.addColorStop(1, 'rgba(21, 16, 26, 0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);

  // Tower silhouette — pixel-art style
  ctx.fillStyle = '#e8b76d'; // --gold

  // Base
  const bx = 160 * s, by = 380 * s, bw = 192 * s, bh = 48 * s;
  ctx.fillRect(bx, by, bw, bh);

  // Body
  const mx = 192 * s, my = 180 * s, mw = 128 * s, mh = 200 * s;
  ctx.fillRect(mx, my, mw, mh);

  // Battlements (3 merlons)
  const merlonW = 32 * s, merlonH = 40 * s, gap = 16 * s;
  const startX = 192 * s;
  const topY = 140 * s;
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(startX + i * (merlonW + gap), topY, merlonW, merlonH);
  }

  // Window slit
  ctx.fillStyle = '#15101a';
  ctx.fillRect(240 * s, 240 * s, 32 * s, 64 * s);

  // Door
  ctx.fillRect(232 * s, 340 * s, 48 * s, 40 * s);

  // Gold ring accent
  ctx.strokeStyle = '#f5d08a'; // --gold-bright
  ctx.lineWidth = 4 * s;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 220 * s, 0, Math.PI * 2);
  ctx.stroke();

  return canvas.toBuffer('image/png');
}

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const size of SIZES) {
  const buf = drawIcon(size);
  const outPath = path.join(OUT_DIR, `icon-${size}x${size}.png`);
  fs.writeFileSync(outPath, buf);
  console.log(`  wrote ${outPath} (${buf.length} bytes)`);
}

// Also generate a 180x180 apple-touch-icon
const appleBuf = drawIcon(180);
fs.writeFileSync(path.join(OUT_DIR, 'apple-touch-icon.png'), appleBuf);
console.log(`  wrote apple-touch-icon.png (${appleBuf.length} bytes)`);

console.log('Done.');
