/**
 * Headless renderer for the Greenward-campaign sprites.
 *
 * Usage: npx tsx scripts/render_greenward_campaign_sprites.ts
 *
 * Imports the draw functions from `greenward_campaign_sprites.tsx`,
 * runs each one against a node-canvas context, and writes the
 * resulting PNG into `public/assets/arena/`. Equivalent of clicking
 * each "Download PNG" button in the browser preview, but no browser
 * required.
 *
 * Mirrors scripts/render_mech_campaign_sprites.ts.
 */
import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  drawHeronSheet, HERON_DIMS,
  drawInheritorSheet, INHERITOR_DIMS,
  drawEndingTableauxSheet, TABLEAU_SHEET_DIMS,
} from '../greenward_campaign_sprites';

const OUT_DIR = join(__dirname, '..', 'public', 'assets', 'arena');
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

interface SheetSpec {
  name: string;
  dims: { W: number; H: number; FRAMES: number };
  draw: (ctx: any) => void;
}

const SHEETS: SheetSpec[] = [
  { name: 'heron_of_eadwin.png',     dims: HERON_DIMS,         draw: drawHeronSheet },
  { name: 'inheritor_base.png',      dims: INHERITOR_DIMS,     draw: drawInheritorSheet },
  { name: 'greenward_endings.png',   dims: TABLEAU_SHEET_DIMS, draw: drawEndingTableauxSheet },
];

for (const sheet of SHEETS) {
  const canvas = createCanvas(sheet.dims.W, sheet.dims.H * sheet.dims.FRAMES);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  sheet.draw(ctx as any);
  const outPath = join(OUT_DIR, sheet.name);
  writeFileSync(outPath, canvas.toBuffer('image/png'));
  const bytes = canvas.toBuffer('image/png').length;
  console.log(`  ${sheet.name.padEnd(34)} ${sheet.dims.W}×${sheet.dims.H * sheet.dims.FRAMES}  ${(bytes / 1024).toFixed(1)}KB`);
}
