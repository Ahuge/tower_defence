/**
 * Terrain Sprite Generator — auto-tiled terrain for all terrain types.
 *
 * Generates a spritesheet with 16 auto-tile variants per terrain type,
 * plus animation frames for water and lava.
 *
 * Layout:
 *   Columns: 16 (auto-tile bitmask variants, bits = NESW)
 *   Rows: one row per terrain type, animated types get extra rows
 *
 * Row order:
 *   0: grass (ground)
 *   1: dirt (ground)
 *   2: mountain (blocked)
 *   3: trees (blocked)
 *   4: stone (blocked)
 *   5: water frame 0
 *   6: water frame 1
 *   7: water frame 2
 *   8: lava frame 0
 *   9: lava frame 1
 *  10: lava frame 2
 *
 * Also generates a doodads sheet:
 *   Row 0: grass doodads (8 types)
 *   Row 1: dirt doodads (8 types)
 */
import React, { useRef, useEffect, useState } from 'react';

// Tile size in pixels (matches TILE_SIZE in game)
const T = 28;
// Grid units per tile
const G = 14;
// Pixels per grid unit
const PX = 2;
// Auto-tile variants
const VARIANTS = 16;
// Terrain rows
const TERRAIN_ROWS = 11;
// Doodad types per ground
const DOODAD_COLS = 8;
const DOODAD_ROWS = 2;

// Color palettes
const PAL = {
  // Grass ground
  grass: { base: '#1a2a1a', light: '#1e321e', dark: '#162216', grid: '#253025' },
  // Dirt ground
  dirt: { base: '#2a2218', light: '#342a1e', dark: '#221a12', grid: '#302820' },
  // Mountain
  mountain: {
    fill: '#4a3828', edge: '#6b5040', dark: '#3a2818',
    highlight: '#8a7860', peak: '#9a8870',
  },
  // Trees
  trees: {
    fill: '#226622', edge: '#338833', canopy1: '#2a8a2a',
    canopy2: '#1e6e1e', trunk: '#553311', dark: '#114411',
  },
  // Stone
  stone: {
    fill: '#606068', edge: '#808088', mortar: '#484850',
    highlight: '#909098', dark: '#505058',
  },
  // Water
  water: {
    deep: '#1a3388', mid: '#2244aa', light: '#3366cc',
    foam: '#5588dd', highlight: '#77aaee',
  },
  // Lava
  lava: {
    rock: '#221100', dark: '#331500', glow1: '#ff4400',
    glow2: '#ff6622', glow3: '#ffaa44', crust: '#442200',
  },
};

// Helper: plot pixel at grid coords
function p(ctx: CanvasRenderingContext2D, ox: number, oy: number, gx: number, gy: number, color: string) {
  if (gx < 0 || gx >= G || gy < 0 || gy >= G) return;
  ctx.fillStyle = color;
  ctx.fillRect(ox + gx * PX, oy + gy * PX, PX, PX);
}

// Helper: plot rectangle at grid coords
function b(ctx: CanvasRenderingContext2D, ox: number, oy: number, gx: number, gy: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(ox + gx * PX, oy + gy * PX, w * PX, h * PX);
}

// Decode bitmask: N(8) E(4) S(2) W(1)
function hasN(idx: number) { return !!(idx & 8); }
function hasE(idx: number) { return !!(idx & 4); }
function hasS(idx: number) { return !!(idx & 2); }
function hasW(idx: number) { return !!(idx & 1); }

// ===================== TERRAIN DRAWERS =====================

function drawGrass(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  const c = PAL.grass;
  b(ctx, ox, oy, 0, 0, G, G, c.base);
  // Subtle variation
  for (let i = 0; i < 6; i++) {
    const gx = (i * 7 + 3) % G;
    const gy = (i * 5 + 2) % G;
    p(ctx, ox, oy, gx, gy, c.light);
  }
  // Grid hint
  ctx.strokeStyle = c.grid;
  ctx.globalAlpha = 0.15;
  ctx.strokeRect(ox, oy, T, T);
  ctx.globalAlpha = 1;
}

function drawDirt(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  const c = PAL.dirt;
  b(ctx, ox, oy, 0, 0, G, G, c.base);
  for (let i = 0; i < 5; i++) {
    const gx = (i * 9 + 1) % G;
    const gy = (i * 6 + 3) % G;
    p(ctx, ox, oy, gx, gy, c.light);
    p(ctx, ox, oy, (gx + 5) % G, (gy + 4) % G, c.dark);
  }
  ctx.strokeStyle = c.grid;
  ctx.globalAlpha = 0.15;
  ctx.strokeRect(ox, oy, T, T);
  ctx.globalAlpha = 1;
}

function drawMountain(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.mountain;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);

  // Base fill
  b(ctx, ox, oy, 0, 0, G, G, c.fill);

  // Rocky crag texture
  b(ctx, ox, oy, 2, 3, 3, 3, c.dark);
  b(ctx, ox, oy, 8, 1, 4, 3, c.dark);
  b(ctx, ox, oy, 4, 8, 4, 3, c.dark);
  b(ctx, ox, oy, 10, 9, 3, 2, c.dark);

  // Lighter highlights
  b(ctx, ox, oy, 5, 4, 2, 2, c.highlight);
  b(ctx, ox, oy, 1, 10, 3, 2, c.highlight);
  b(ctx, ox, oy, 11, 5, 2, 2, c.highlight);

  // Edge highlights on exposed sides
  if (!n) { b(ctx, ox, oy, 0, 0, G, 1, c.edge); b(ctx, ox, oy, 3, 0, 4, 1, c.peak); }
  if (!s) b(ctx, ox, oy, 0, G - 1, G, 1, c.edge);
  if (!w) b(ctx, ox, oy, 0, 0, 1, G, c.edge);
  if (!e) b(ctx, ox, oy, G - 1, 0, 1, G, c.edge);

  // Peak on top edge
  if (!n) {
    p(ctx, ox, oy, 5, 0, c.peak);
    p(ctx, ox, oy, 6, 0, c.peak);
    p(ctx, ox, oy, 9, 0, c.peak);
  }
}

function drawTrees(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.trees;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);

  // Forest floor
  b(ctx, ox, oy, 0, 0, G, G, c.fill);

  // Canopy blobs (vary by position for natural look)
  const blobs = [
    { x: 3, y: 3, r: 3, c: c.canopy1 },
    { x: 10, y: 2, r: 2, c: c.canopy2 },
    { x: 7, y: 8, r: 3, c: c.canopy1 },
    { x: 2, y: 10, r: 2, c: c.canopy2 },
    { x: 11, y: 10, r: 2, c: c.canopy1 },
  ];
  for (const bl of blobs) {
    for (let dy = -bl.r; dy <= bl.r; dy++) {
      for (let dx = -bl.r; dx <= bl.r; dx++) {
        if (dx * dx + dy * dy <= bl.r * bl.r) {
          p(ctx, ox, oy, bl.x + dx, bl.y + dy, bl.c);
        }
      }
    }
  }

  // Trunk hints
  p(ctx, ox, oy, 3, 5, c.trunk); p(ctx, ox, oy, 3, 6, c.trunk);
  p(ctx, ox, oy, 10, 4, c.trunk); p(ctx, ox, oy, 10, 5, c.trunk);
  p(ctx, ox, oy, 7, 11, c.trunk);

  // Edge highlights
  if (!n) b(ctx, ox, oy, 0, 0, G, 1, c.edge);
  if (!s) b(ctx, ox, oy, 0, G - 1, G, 1, c.edge);
  if (!w) b(ctx, ox, oy, 0, 0, 1, G, c.edge);
  if (!e) b(ctx, ox, oy, G - 1, 0, 1, G, c.edge);
}

function drawStone(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.stone;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);

  b(ctx, ox, oy, 0, 0, G, G, c.fill);

  // Brick pattern (3 rows of bricks, offset)
  const mortar = c.mortar;
  // Horizontal mortar lines
  for (const my of [4, 8, 12]) {
    b(ctx, ox, oy, 0, my, G, 1, mortar);
  }
  // Vertical mortar lines (offset per row)
  for (let gy = 0; gy < 4; gy++) b(ctx, ox, oy, 7, gy, 1, 1, mortar);
  for (let gy = 4; gy < 8; gy++) b(ctx, ox, oy, 4, gy, 1, 1, mortar);
  for (let gy = 4; gy < 8; gy++) b(ctx, ox, oy, 10, gy, 1, 1, mortar);
  for (let gy = 8; gy < 12; gy++) b(ctx, ox, oy, 7, gy, 1, 1, mortar);
  for (let gy = 12; gy < G; gy++) b(ctx, ox, oy, 4, gy, 1, 1, mortar);
  for (let gy = 12; gy < G; gy++) b(ctx, ox, oy, 10, gy, 1, 1, mortar);

  // Highlight on some bricks
  b(ctx, ox, oy, 2, 1, 3, 2, c.highlight);
  b(ctx, ox, oy, 8, 5, 2, 2, c.highlight);
  b(ctx, ox, oy, 1, 9, 2, 2, c.highlight);

  // Edge highlights
  if (!n) b(ctx, ox, oy, 0, 0, G, 1, c.highlight);
  if (!s) b(ctx, ox, oy, 0, G - 1, G, 1, c.dark);
  if (!w) b(ctx, ox, oy, 0, 0, 1, G, c.highlight);
  if (!e) b(ctx, ox, oy, G - 1, 0, 1, G, c.dark);
}

function drawWater(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number, frame: number) {
  const c = PAL.water;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);

  // Deep water base
  b(ctx, ox, oy, 0, 0, G, G, c.deep);

  // Mid-tone wave areas (shift with frame)
  const shift = frame * 2;
  for (let gy = 2; gy < G - 2; gy += 3) {
    const wx = (shift + gy * 3) % 8;
    b(ctx, ox, oy, wx, gy, 6, 1, c.mid);
    b(ctx, ox, oy, (wx + 7) % G, gy + 1, 4, 1, c.mid);
  }

  // Light ripple highlights (animated)
  const rippleY = 4 + frame * 3;
  b(ctx, ox, oy, 3 + frame, rippleY % G, 3, 1, c.light);
  b(ctx, ox, oy, 9 - frame, (rippleY + 5) % G, 2, 1, c.light);
  p(ctx, ox, oy, 6 + frame, (rippleY + 2) % G, c.highlight);

  // Foam on edges (where water meets land)
  if (!n) { b(ctx, ox, oy, 1, 0, G - 2, 1, c.foam); b(ctx, ox, oy, 3, 1, 3, 1, c.light); }
  if (!s) { b(ctx, ox, oy, 1, G - 1, G - 2, 1, c.foam); }
  if (!w) { b(ctx, ox, oy, 0, 1, 1, G - 2, c.foam); }
  if (!e) { b(ctx, ox, oy, G - 1, 1, 1, G - 2, c.foam); }
}

function drawLava(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number, frame: number) {
  const c = PAL.lava;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);

  // Dark rock base
  b(ctx, ox, oy, 0, 0, G, G, c.rock);

  // Crust patches
  b(ctx, ox, oy, 2, 2, 4, 3, c.crust);
  b(ctx, ox, oy, 8, 7, 5, 4, c.crust);
  b(ctx, ox, oy, 1, 10, 3, 2, c.crust);

  // Glowing cracks (pulse with frame)
  const glowColors = [c.glow1, c.glow2, c.glow3];
  const glow = glowColors[frame % 3];
  const glow2 = glowColors[(frame + 1) % 3];

  // Crack pattern
  p(ctx, ox, oy, 3, 1, glow); p(ctx, ox, oy, 4, 2, glow); p(ctx, ox, oy, 5, 3, glow2);
  p(ctx, ox, oy, 6, 4, glow); p(ctx, ox, oy, 7, 5, glow2);
  p(ctx, ox, oy, 10, 3, glow2); p(ctx, ox, oy, 11, 4, glow); p(ctx, ox, oy, 12, 5, glow2);
  p(ctx, ox, oy, 4, 8, glow); p(ctx, ox, oy, 5, 9, glow2); p(ctx, ox, oy, 6, 10, glow);
  p(ctx, ox, oy, 8, 11, glow2); p(ctx, ox, oy, 9, 12, glow);

  // Glow pools (animated position)
  const poolX = 6 + (frame % 2);
  const poolY = 6 + (frame % 2);
  b(ctx, ox, oy, poolX, poolY, 2, 2, glow);

  // Edge glow on exposed sides
  if (!n) b(ctx, ox, oy, 2, 0, G - 4, 1, c.glow1);
  if (!s) b(ctx, ox, oy, 2, G - 1, G - 4, 1, c.glow1);
  if (!w) b(ctx, ox, oy, 0, 2, 1, G - 4, c.glow1);
  if (!e) b(ctx, ox, oy, G - 1, 2, 1, G - 4, c.glow1);
}

// ===================== DOODAD DRAWERS =====================

function drawGrassDoodad(ctx: CanvasRenderingContext2D, ox: number, oy: number, type: number) {
  // Clear background
  b(ctx, ox, oy, 0, 0, G, G, 'rgba(0,0,0,0)');
  ctx.clearRect(ox, oy, T, T);

  switch (type) {
    case 0: // Small bush
      b(ctx, ox, oy, 4, 6, 6, 4, '#2a5a2a');
      b(ctx, ox, oy, 5, 5, 4, 3, '#3a7a3a');
      b(ctx, ox, oy, 6, 4, 2, 2, '#4a8a4a');
      break;
    case 1: // Grass tuft
      p(ctx, ox, oy, 6, 10, '#3a6a3a'); p(ctx, ox, oy, 7, 10, '#3a6a3a');
      p(ctx, ox, oy, 5, 8, '#4a7a4a'); p(ctx, ox, oy, 6, 7, '#3a6a3a');
      p(ctx, ox, oy, 7, 6, '#4a8a4a'); p(ctx, ox, oy, 8, 8, '#3a6a3a');
      p(ctx, ox, oy, 9, 7, '#3a6a3a');
      break;
    case 2: // Yellow flower
      p(ctx, ox, oy, 7, 10, '#3a5a3a'); p(ctx, ox, oy, 7, 9, '#3a5a3a');
      p(ctx, ox, oy, 7, 8, '#4a6a4a');
      p(ctx, ox, oy, 7, 6, '#ffdd44'); p(ctx, ox, oy, 6, 7, '#ffdd44');
      p(ctx, ox, oy, 8, 7, '#ffdd44'); p(ctx, ox, oy, 7, 7, '#ffaa22');
      break;
    case 3: // Pink flower
      p(ctx, ox, oy, 7, 10, '#3a5a3a'); p(ctx, ox, oy, 7, 9, '#4a6a4a');
      p(ctx, ox, oy, 7, 7, '#ff6688'); p(ctx, ox, oy, 6, 8, '#ff6688');
      p(ctx, ox, oy, 8, 8, '#ff6688'); p(ctx, ox, oy, 7, 8, '#ff4466');
      break;
    case 4: // Pebbles
      p(ctx, ox, oy, 5, 8, '#555544'); p(ctx, ox, oy, 6, 9, '#666655');
      p(ctx, ox, oy, 9, 7, '#555544'); p(ctx, ox, oy, 8, 10, '#444433');
      break;
    case 5: // Tall grass
      p(ctx, ox, oy, 5, 11, '#2a5a2a'); p(ctx, ox, oy, 6, 10, '#3a6a3a');
      p(ctx, ox, oy, 7, 9, '#3a6a3a'); p(ctx, ox, oy, 5, 9, '#2a5a2a');
      p(ctx, ox, oy, 8, 8, '#4a7a4a'); p(ctx, ox, oy, 6, 7, '#3a6a3a');
      p(ctx, ox, oy, 7, 6, '#4a8a4a'); p(ctx, ox, oy, 9, 7, '#3a6a3a');
      p(ctx, ox, oy, 4, 8, '#2a5a2a');
      break;
    case 6: // Mushroom
      b(ctx, ox, oy, 6, 9, 2, 3, '#aa8866');
      b(ctx, ox, oy, 5, 7, 4, 2, '#cc4444');
      p(ctx, ox, oy, 6, 7, '#ff6666'); p(ctx, ox, oy, 5, 8, '#dd5555');
      break;
    case 7: // Small tree stump
      b(ctx, ox, oy, 5, 8, 4, 4, '#553311');
      b(ctx, ox, oy, 6, 7, 2, 1, '#664422');
      b(ctx, ox, oy, 5, 8, 4, 1, '#775533');
      break;
  }
}

function drawDirtDoodad(ctx: CanvasRenderingContext2D, ox: number, oy: number, type: number) {
  ctx.clearRect(ox, oy, T, T);

  switch (type) {
    case 0: // Rock
      b(ctx, ox, oy, 5, 8, 4, 3, '#555548'); b(ctx, ox, oy, 6, 7, 2, 1, '#666658');
      break;
    case 1: // Crack
      p(ctx, ox, oy, 4, 7, '#1a1810'); p(ctx, ox, oy, 5, 8, '#1a1810');
      p(ctx, ox, oy, 6, 8, '#1a1810'); p(ctx, ox, oy, 7, 9, '#1a1810');
      p(ctx, ox, oy, 8, 9, '#221e14'); p(ctx, ox, oy, 9, 10, '#1a1810');
      break;
    case 2: // Small pebbles
      p(ctx, ox, oy, 5, 8, '#444438'); p(ctx, ox, oy, 8, 9, '#444438');
      p(ctx, ox, oy, 6, 10, '#3a3830'); p(ctx, ox, oy, 10, 8, '#3a3830');
      break;
    case 3: // Bone fragment
      p(ctx, ox, oy, 6, 8, '#ccccaa'); p(ctx, ox, oy, 7, 8, '#ccccaa');
      p(ctx, ox, oy, 8, 9, '#bbbbaa'); p(ctx, ox, oy, 5, 8, '#bbbbaa');
      break;
    case 4: // Scorched mark
      b(ctx, ox, oy, 5, 7, 4, 4, '#181410');
      b(ctx, ox, oy, 6, 8, 2, 2, '#100c08');
      break;
    case 5: // Large rock
      b(ctx, ox, oy, 4, 7, 6, 5, '#4a4a40');
      b(ctx, ox, oy, 5, 6, 4, 2, '#555548');
      b(ctx, ox, oy, 5, 7, 3, 1, '#606058');
      break;
    case 6: // Dry grass tuft
      p(ctx, ox, oy, 6, 10, '#6a6a3a'); p(ctx, ox, oy, 7, 9, '#6a6a3a');
      p(ctx, ox, oy, 5, 9, '#5a5a2a'); p(ctx, ox, oy, 8, 8, '#6a6a3a');
      break;
    case 7: // Gravel patch
      for (let i = 0; i < 6; i++) {
        const gx = 4 + (i * 3) % 6;
        const gy = 7 + (i * 2) % 4;
        p(ctx, ox, oy, gx, gy, i % 2 ? '#444438' : '#3a3830');
      }
      break;
  }
}

// ===================== MAIN COMPONENT =====================

export default function TerrainSprites() {
  const terrainRef = useRef<HTMLCanvasElement>(null);
  const terrainPreviewRef = useRef<HTMLCanvasElement>(null);
  const doodadRef = useRef<HTMLCanvasElement>(null);
  const doodadPreviewRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<'preview' | 'actual'>('preview');

  useEffect(() => {
    // Render terrain tileset
    const tc = terrainRef.current!;
    tc.width = VARIANTS * T;
    tc.height = TERRAIN_ROWS * T;
    const tCtx = tc.getContext('2d')!;
    tCtx.imageSmoothingEnabled = false;

    for (let v = 0; v < VARIANTS; v++) {
      const ox = v * T;
      // Row 0: grass (just one variant, repeated)
      drawGrass(tCtx, ox, 0 * T);
      // Row 1: dirt
      drawDirt(tCtx, ox, 1 * T);
      // Row 2: mountain
      drawMountain(tCtx, ox, 2 * T, v);
      // Row 3: trees
      drawTrees(tCtx, ox, 3 * T, v);
      // Row 4: stone
      drawStone(tCtx, ox, 4 * T, v);
      // Rows 5-7: water (3 animation frames)
      for (let f = 0; f < 3; f++) {
        drawWater(tCtx, ox, (5 + f) * T, v, f);
      }
      // Rows 8-10: lava (3 animation frames)
      for (let f = 0; f < 3; f++) {
        drawLava(tCtx, ox, (8 + f) * T, v, f);
      }
    }

    // Preview with labels
    const tp = terrainPreviewRef.current!;
    const scale = 2;
    tp.width = VARIANTS * T * scale + 120;
    tp.height = TERRAIN_ROWS * T * scale + 40;
    const tpCtx = tp.getContext('2d')!;
    tpCtx.imageSmoothingEnabled = false;
    tpCtx.fillStyle = '#07050c';
    tpCtx.fillRect(0, 0, tp.width, tp.height);
    tpCtx.drawImage(tc, 120, 20, tc.width * scale, tc.height * scale);
    tpCtx.fillStyle = '#ffffff';
    tpCtx.font = '11px monospace';
    const rowLabels = ['Grass', 'Dirt', 'Mountain', 'Trees', 'Stone', 'Water 0', 'Water 1', 'Water 2', 'Lava 0', 'Lava 1', 'Lava 2'];
    for (let r = 0; r < TERRAIN_ROWS; r++) {
      tpCtx.fillText(rowLabels[r], 4, 20 + r * T * scale + T * scale / 2 + 4);
    }

    // Render doodads
    const dc = doodadRef.current!;
    dc.width = DOODAD_COLS * T;
    dc.height = DOODAD_ROWS * T;
    const dCtx = dc.getContext('2d')!;
    dCtx.imageSmoothingEnabled = false;

    for (let i = 0; i < DOODAD_COLS; i++) {
      drawGrassDoodad(dCtx, i * T, 0, i);
      drawDirtDoodad(dCtx, i * T, T, i);
    }

    // Doodad preview
    const dp = doodadPreviewRef.current!;
    const dScale = 3;
    dp.width = DOODAD_COLS * T * dScale + 80;
    dp.height = DOODAD_ROWS * T * dScale + 40;
    const dpCtx = dp.getContext('2d')!;
    dpCtx.imageSmoothingEnabled = false;
    dpCtx.fillStyle = '#1a2a1a';
    dpCtx.fillRect(0, 0, dp.width, dp.height);
    dpCtx.drawImage(dc, 80, 20, dc.width * dScale, dc.height * dScale);
    dpCtx.fillStyle = '#ffffff';
    dpCtx.font = '11px monospace';
    dpCtx.fillText('Grass', 4, 20 + T * dScale / 2 + 4);
    dpCtx.fillText('Dirt', 4, 20 + T * dScale + T * dScale / 2 + 4);

    setReady(true);
  }, []);

  const download = (ref: React.RefObject<HTMLCanvasElement>, name: string) => {
    const a = document.createElement('a');
    a.download = name;
    a.href = ref.current!.toDataURL('image/png');
    a.click();
  };

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', color: '#ccc', background: '#111' }}>
      <h2>Terrain Sprites</h2>
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setView('preview')} style={{ marginRight: 8 }}>Preview</button>
        <button onClick={() => setView('actual')} style={{ marginRight: 8 }}>Actual Size</button>
        {ready && (
          <>
            <button onClick={() => download(terrainRef, 'terrain_tileset.png')} style={{ marginRight: 8 }}>Download Terrain</button>
            <button onClick={() => download(doodadRef, 'terrain_doodads.png')}>Download Doodads</button>
          </>
        )}
      </div>
      <h3>Terrain Tileset (16 auto-tile variants × 11 rows)</h3>
      <canvas ref={terrainPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #333' }} />
      <canvas ref={terrainRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #333' }} />
      <h3>Ground Doodads (8 types × 2 ground types)</h3>
      <canvas ref={doodadPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #333' }} />
      <canvas ref={doodadRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #333' }} />
    </div>
  );
}
