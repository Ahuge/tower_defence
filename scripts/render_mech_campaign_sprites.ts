/**
 * Headless renderer for the Mech-campaign sprites.
 *
 * Usage: npx tsx scripts/render_mech_campaign_sprites.ts
 *
 * Imports the draw functions from `mech_campaign_sprites.tsx`,
 * runs each one against a node-canvas context, and writes the
 * resulting PNG into `public/assets/arena/`. Equivalent of
 * clicking each "Download PNG" button in the browser preview,
 * but no browser required.
 */
import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  drawWorkshopSheet, WORKSHOP_DIMS,
  drawSuppressionPylonSheet, SUPPRESSION_PYLON_DIMS,
  drawGeneratorSheet, GENERATOR_DIMS,
  drawRaiderSheet, RAIDER_DIMS,
  drawVossThroneSheet, VOSS_THRONE_DIMS,
} from '../mech_campaign_sprites';

const OUT_DIR = join(__dirname, '..', 'public', 'assets', 'arena');
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

interface SheetSpec {
  name: string;
  dims: { W: number; H: number; FRAMES: number };
  draw: (ctx: any) => void;
}

const SHEETS: SheetSpec[] = [
  { name: 'struct_workshop.png',         dims: WORKSHOP_DIMS,         draw: drawWorkshopSheet },
  { name: 'struct_suppression_pylon.png', dims: SUPPRESSION_PYLON_DIMS, draw: drawSuppressionPylonSheet },
  { name: 'struct_generator.png',        dims: GENERATOR_DIMS,        draw: drawGeneratorSheet },
  { name: 'raider.png',                  dims: RAIDER_DIMS,           draw: drawRaiderSheet },
  { name: 'struct_voss_throne.png',      dims: VOSS_THRONE_DIMS,      draw: drawVossThroneSheet },
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

console.log(`\n✓ Wrote ${SHEETS.length} sheets to ${OUT_DIR}`);
