/**
 * Nature _autumn skin regeneration.
 *
 * Applies the pixel-by-pixel autumn palette swap to the currently-
 * baked Nature PNGs (towers, projectiles, spider mobile) to
 * produce the `_autumn` variants. Safe to re-run — it always reads
 * the base sheets and overwrites only the `_autumn.png` outputs.
 *
 * Unlike `regenerate-nature-sprites.mjs`, this script does NOT
 * touch the base sheets — just the skin variants. Run this any
 * time the base Nature sheets are re-baked.
 *
 * Usage: node scripts/regenerate-nature-autumn.mjs
 */
import { createCanvas, loadImage } from 'canvas';
import { writeFileSync, readFileSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NATURE_DIR = join(ROOT, 'public', 'assets', 'nature');

const AUTUMN_PALETTE = JSON.parse(
  readFileSync(join(ROOT, 'skin_sources', 'nature_skin_autumn_nature.json'), 'utf8'),
).towerPalettes['-1'];

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function applyAutumnPalette(sourceImage) {
  const W = sourceImage.width;
  const H = sourceImage.height;
  const out = createCanvas(W, H);
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sourceImage, 0, 0);
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;

  const swapMap = new Map();
  for (const [from, to] of Object.entries(AUTUMN_PALETTE)) {
    const fromRGB = hexToRgb(from);
    const toRGB = hexToRgb(to);
    const key = (fromRGB[0] << 16) | (fromRGB[1] << 8) | fromRGB[2];
    swapMap.set(key, toRGB);
  }

  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const key = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
    const swap = swapMap.get(key);
    if (swap) {
      d[i] = swap[0]; d[i + 1] = swap[1]; d[i + 2] = swap[2];
    }
  }

  ctx.putImageData(img, 0, 0);
  return out;
}

async function swapAndWrite(sourceFile, autumnFile) {
  const img = await loadImage(join(NATURE_DIR, sourceFile));
  const swapped = applyAutumnPalette(img);
  writeFileSync(join(NATURE_DIR, autumnFile), swapped.toBuffer('image/png'));
  console.log(`Wrote ${autumnFile} (${swapped.width}×${swapped.height})`);
}

async function main() {
  await swapAndWrite('nature_towers.png', 'nature_towers_autumn.png');
  await swapAndWrite('nature_projectiles.png', 'nature_projectiles_autumn.png');
  await swapAndWrite('dartfrog_mobile.png', 'dartfrog_mobile_autumn.png');
  console.log('\nDone — autumn variants synced to latest base sheets.');
}

main().catch(err => { console.error(err); process.exit(1); });
