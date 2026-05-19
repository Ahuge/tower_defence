/**
 * Headless renderer for the Snake Eyes campaign creep sheet.
 *
 * Usage: npx tsx scripts/render_snake_eyes_creep_sprites.ts
 *
 * Bakes drawSnakeEyesCampaignCreepSheet to
 * `public/assets/creeps/snake_eyes_creeps.png` (1 col × 7 rows = 64×448).
 */
import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  drawSnakeEyesCampaignCreepSheet,
  SHEET_W,
  SHEET_H,
} from '../snake_eyes_creep_sprites';

const OUT_DIR = join(__dirname, '..', 'public', 'assets', 'creeps');
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const canvas = createCanvas(SHEET_W, SHEET_H);
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
drawSnakeEyesCampaignCreepSheet(ctx as any);
const outPath = join(OUT_DIR, 'snake_eyes_creeps.png');
const buf = canvas.toBuffer('image/png');
writeFileSync(outPath, buf);
console.log(`  snake_eyes_creeps.png  ${SHEET_W}×${SHEET_H}  ${(buf.length / 1024).toFixed(1)}KB`);
console.log(`\n✓ Wrote 1 sheet to ${OUT_DIR}`);
