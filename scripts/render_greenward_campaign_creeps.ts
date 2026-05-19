/**
 * Headless renderer for the Greenward-campaign creep sheet.
 *
 * Usage: npx tsx scripts/render_greenward_campaign_creeps.ts
 *
 * Imports drawGreenwardCampaignCreepSheet and bakes it to
 * `public/assets/creeps/greenward_campaign_creeps.png`.
 */
import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  drawGreenwardCampaignCreepSheet,
  SHEET_W,
  SHEET_H,
} from '../greenward_campaign_creeps';

const OUT_DIR = join(__dirname, '..', 'public', 'assets', 'creeps');
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const canvas = createCanvas(SHEET_W, SHEET_H);
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
drawGreenwardCampaignCreepSheet(ctx as any);
const outPath = join(OUT_DIR, 'greenward_campaign_creeps.png');
const buf = canvas.toBuffer('image/png');
writeFileSync(outPath, buf);
console.log(`  greenward_campaign_creeps.png  ${SHEET_W}×${SHEET_H}  ${(buf.length / 1024).toFixed(1)}KB`);
console.log(`\n✓ Wrote 1 sheet to ${OUT_DIR}`);
