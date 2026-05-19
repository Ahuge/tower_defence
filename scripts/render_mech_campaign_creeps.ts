/**
 * Headless renderer for the Mech-campaign creep sheet.
 *
 * Usage: npx tsx scripts/render_mech_campaign_creeps.ts
 *
 * Imports drawMechCampaignCreepSheet from mech_campaign_creeps.tsx
 * and bakes it to `public/assets/creeps/mech_campaign_creeps.png`.
 * Equivalent to clicking the "Download PNG" button in the browser
 * preview, but no browser required.
 */
import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  drawMechCampaignCreepSheet,
  SHEET_W,
  SHEET_H,
} from '../mech_campaign_creeps';

const OUT_DIR = join(__dirname, '..', 'public', 'assets', 'creeps');
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

const canvas = createCanvas(SHEET_W, SHEET_H);
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
drawMechCampaignCreepSheet(ctx as any);
const outPath = join(OUT_DIR, 'mech_campaign_creeps.png');
const buf = canvas.toBuffer('image/png');
writeFileSync(outPath, buf);
console.log(`  mech_campaign_creeps.png    ${SHEET_W}×${SHEET_H}  ${(buf.length / 1024).toFixed(1)}KB`);
console.log(`\n✓ Wrote 1 sheet to ${OUT_DIR}`);
