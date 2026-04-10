/**
 * Arcane Terrain Sprite Generator — Crystal Caverns terrain.
 *
 * Generates a spritesheet with 16 auto-tile variants per terrain type,
 * plus animation frames for arcane pools (swirling runes).
 *
 * Layout:
 *   Columns: 16 (auto-tile bitmask variants, bits = NESW)
 *   Rows: one row per terrain type, animated types get extra rows
 *
 * Row order:
 *   0: dark purple stone (ground)
 *   1: crystal walls (blocked type 1)
 *   2: arcane pool frame 0 (blocked type 2)
 *   3: arcane pool frame 1 (blocked type 2, animated)
 *   4: arcane pool frame 2 (blocked type 2, animated)
 *   5: arcane circles (NoBuild terrain — walkable, unbuildable)
 *
 * Also generates a doodads sheet:
 *   Row 0: arcane doodads (8 types)
 */
import React, { useRef, useEffect, useState } from 'react';

const T = 28;
const G = 14;
const PX = 2;
const VARIANTS = 16;
const TERRAIN_ROWS = 6;
const DOODAD_COLS = 8;
const DOODAD_ROWS = 1;

const PAL = {
  ground: {
    base: '#141020',
    baseLt: '#181428',
    stone1: '#1c1830',
    stone2: '#201c38',
    stone3: '#151225',
    grout: '#100c1c',
    vein: '#2a1848',
    veinGlow: '#3d2068',
    veinBright: '#5530a0',
    crystalDust: '#2e2050',
    gemShard: '#6644aa',
    gemShardBright: '#8866dd',
    shimmer: '#4a3878',
  },
  crystal: {
    base: '#2a1848',
    bodyDark: '#3a2060',
    bodyMid: '#4c2e78',
    bodyLight: '#6040a0',
    facetDark: '#5a3890',
    facetMid: '#7050b8',
    facetLight: '#9070d8',
    highlight: '#b090f0',
    highlightBright: '#d0b8ff',
    shine: '#ffffff',
    shineSoft: '#e0d0ff',
    edge: '#201040',
    edgeInner: '#301858',
    shadow: '#180c30',
    refract: '#8068cc',
    refractCyan: '#70a0e8',
    refractMagenta: '#b060d0',
  },
  pool: {
    deep: '#0c0820',
    crackDark: '#1a1040',
    crackBase: '#2a1858',
    energyDim: '#4020a0',
    energyMid: '#6040d0',
    energyBright: '#8060ff',
    energyHot: '#a080ff',
    energyWhite: '#c8b0ff',
    runeDim: '#5030a0',
    runeMid: '#7050d0',
    runeBright: '#9070ff',
    runeWhite: '#b8a0ff',
    particleDim: '#4030b0',
    particleMid: '#6050d0',
    particleBright: '#8878ff',
    cyanGlow: '#5080e0',
    magentaGlow: '#a040c0',
    edge: '#201048',
  },
  noBuild: {
    base: '#141020',
    baseLt: '#181428',
    stone: '#1c1830',
    ringOuter: '#3a2070',
    ringMid: '#5535a0',
    ringInner: '#7050c8',
    ringBright: '#9070e0',
    runeDim: '#4028a0',
    runeMid: '#6548c8',
    runeBright: '#8868e8',
    runeGlow: '#a888ff',
    wardLine: '#3520a0',
    wardGlow: '#5040c8',
    nodeCore: '#b898ff',
    nodeGlow: '#9070e0',
    nodeDim: '#6048b8',
  },
  doodad: {
    purple: '#8060d0',
    purpleBright: '#a080f0',
    purpleDim: '#5040a0',
    pink: '#c060d0',
    pinkBright: '#e088f0',
    blue: '#5080e0',
    blueBright: '#70a0ff',
    blueDim: '#3060b0',
    cyan: '#50c0e8',
    cyanBright: '#80e0ff',
    white: '#e0d0ff',
    whiteBright: '#ffffff',
    dim: '#3a2860',
    dimDark: '#281840',
    magenta: '#b050c0',
    amber: '#c8a040',
    amberDim: '#a08030',
    warmGlow: '#d0a858',
  },
};

function p(ctx: CanvasRenderingContext2D, ox: number, oy: number, gx: number, gy: number, color: string) {
  if (gx < 0 || gx >= G || gy < 0 || gy >= G) return;
  ctx.fillStyle = color;
  ctx.fillRect(ox + gx * PX, oy + gy * PX, PX, PX);
}

function b(ctx: CanvasRenderingContext2D, ox: number, oy: number, gx: number, gy: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(ox + gx * PX, oy + gy * PX, w * PX, h * PX);
}

function hasN(idx: number) { return !!(idx & 8); }
function hasE(idx: number) { return !!(idx & 4); }
function hasS(idx: number) { return !!(idx & 2); }
function hasW(idx: number) { return !!(idx & 1); }

/* Simple seeded PRNG for deterministic tile variation */
function tileRng(seed: number) {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return (s >> 16) / 32768; };
}

function drawGround(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  const c = PAL.ground;
  const rng = tileRng(ox * 31 + oy * 17);

  // Base fill
  b(ctx, ox, oy, 0, 0, G, G, c.base);

  // Mosaic stone texture — irregular flagstone pattern
  // Stone blocks with grout lines
  const stoneColors = [c.base, c.baseLt, c.stone1, c.stone2, c.stone3];
  for (let gy = 0; gy < G; gy++) {
    for (let gx = 0; gx < G; gx++) {
      // Grout lines at irregular intervals
      const isGroutH = (gy === 0 || gy === 4 || gy === 7 || gy === 10 || gy === 13);
      const isGroutV = (gy < 4) ? (gx === 0 || gx === 5 || gx === 9 || gx === 13)
        : (gy < 7) ? (gx === 0 || gx === 3 || gx === 8 || gx === 12)
        : (gy < 10) ? (gx === 0 || gx === 6 || gx === 10 || gx === 13)
        : (gx === 0 || gx === 4 || gx === 9 || gx === 13);
      if (isGroutH || isGroutV) {
        p(ctx, ox, oy, gx, gy, c.grout);
      } else {
        // Each stone block gets a slightly different shade
        const blockId = Math.floor(gy / 4) * 4 + Math.floor(gx / 4);
        p(ctx, ox, oy, gx, gy, stoneColors[(blockId * 3 + 1) % stoneColors.length]);
      }
    }
  }

  // Magical vein cracks — glowing faint purple
  // Diagonal vein from top-left area toward center
  p(ctx, ox, oy, 2, 1, c.vein);
  p(ctx, ox, oy, 3, 2, c.vein);
  p(ctx, ox, oy, 4, 2, c.veinGlow);
  p(ctx, ox, oy, 5, 3, c.vein);
  p(ctx, ox, oy, 5, 4, c.veinGlow);
  p(ctx, ox, oy, 6, 5, c.veinBright);
  p(ctx, ox, oy, 6, 6, c.veinGlow);

  // Second vein from bottom-right
  p(ctx, ox, oy, 11, 12, c.vein);
  p(ctx, ox, oy, 10, 11, c.veinGlow);
  p(ctx, ox, oy, 9, 11, c.vein);
  p(ctx, ox, oy, 9, 10, c.veinGlow);
  p(ctx, ox, oy, 8, 9, c.veinBright);

  // Crystal dust specks scattered
  p(ctx, ox, oy, 1, 6, c.crystalDust);
  p(ctx, ox, oy, 8, 2, c.crystalDust);
  p(ctx, ox, oy, 12, 5, c.crystalDust);
  p(ctx, ox, oy, 3, 11, c.crystalDust);
  p(ctx, ox, oy, 10, 8, c.crystalDust);

  // Tiny embedded gem shards — bright sparkle pixels
  p(ctx, ox, oy, 3, 8, c.gemShard);
  p(ctx, ox, oy, 11, 3, c.gemShardBright);
  p(ctx, ox, oy, 7, 12, c.gemShard);

  // Shimmer highlights on stone edges
  p(ctx, ox, oy, 6, 1, c.shimmer);
  p(ctx, ox, oy, 10, 5, c.shimmer);
  p(ctx, ox, oy, 2, 9, c.shimmer);
  p(ctx, ox, oy, 12, 11, c.shimmer);

  // Subtle border
  ctx.strokeStyle = c.grout;
  ctx.globalAlpha = 0.3;
  ctx.strokeRect(ox, oy, T, T);
  ctx.globalAlpha = 1;
}

function drawCrystal(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.crystal;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  const rng = tileRng(idx * 73 + 41);

  // Dark cavern base
  b(ctx, ox, oy, 0, 0, G, G, c.shadow);

  // Rocky ground beneath crystals
  b(ctx, ox, oy, 0, 0, G, G, c.base);
  // Rough stone texture
  for (let gy = 0; gy < G; gy += 2) {
    for (let gx = 0; gx < G; gx += 2) {
      if (((gx + gy) * 7 + idx) % 5 === 0) p(ctx, ox, oy, gx, gy, c.bodyDark);
    }
  }

  // Main crystal cluster — draw 2-3 crystal spires based on variant
  const crystalCount = 2 + (idx % 2);
  const positions = [
    { x: 5, y: 2, h: 10, w: 4, variant: 0 },
    { x: 1, y: 5, h: 7, w: 3, variant: 1 },
    { x: 9, y: 4, h: 8, w: 4, variant: 2 },
  ];

  for (let ci = 0; ci < crystalCount; ci++) {
    const cp = positions[ci];
    const bx = cp.x + (idx % 3) - 1;
    const by = G - cp.h + (idx % 2);
    const ch = cp.h - (idx % 3);
    const cw = cp.w;

    if (cp.variant === 0) {
      // Tall central crystal spire — diamond/hexagonal shape
      // Shadow/dark side (left)
      for (let row = 0; row < ch; row++) {
        const narrowing = Math.floor(row * cw / (ch * 2));
        const lx = bx + narrowing;
        const rw = Math.max(1, Math.floor(cw / 2) - narrowing);
        for (let dx = 0; dx < rw; dx++) {
          p(ctx, ox, oy, lx + dx, by + row, row < 2 ? c.facetMid : c.bodyDark);
        }
      }
      // Light side (right)
      for (let row = 0; row < ch; row++) {
        const narrowing = Math.floor(row * cw / (ch * 2));
        const rx = bx + Math.floor(cw / 2);
        const rw = Math.max(1, Math.floor(cw / 2) - narrowing);
        for (let dx = 0; dx < rw; dx++) {
          p(ctx, ox, oy, rx + dx, by + row, row < 2 ? c.facetLight : c.bodyMid);
        }
      }
      // Bright facet line down center
      for (let row = 0; row < ch - 1; row++) {
        p(ctx, ox, oy, bx + Math.floor(cw / 2), by + row, row < 3 ? c.highlight : c.facetMid);
      }
      // Top point — bright highlight
      p(ctx, ox, oy, bx + Math.floor(cw / 2), by, c.highlightBright);
      if (by > 0) p(ctx, ox, oy, bx + Math.floor(cw / 2), by - 1, c.shine);
      // Light refraction spots
      p(ctx, ox, oy, bx + cw - 1, by + 2, c.refractCyan);
      p(ctx, ox, oy, bx + 1, by + Math.floor(ch / 2), c.refractMagenta);
    } else if (cp.variant === 1) {
      // Shorter angled crystal — leaning left
      const startX = bx + 2;
      for (let row = 0; row < ch; row++) {
        const lean = Math.floor(row / 3);
        const cx2 = startX - lean;
        p(ctx, ox, oy, cx2, by + row, c.bodyDark);
        p(ctx, ox, oy, cx2 + 1, by + row, c.bodyMid);
        if (row < ch - 2) p(ctx, ox, oy, cx2 + 2, by + row, c.facetDark);
      }
      // Highlight edge
      p(ctx, ox, oy, startX + 1, by, c.highlightBright);
      p(ctx, ox, oy, startX + 2, by + 1, c.highlight);
      p(ctx, ox, oy, startX, by + 2, c.refractCyan);
    } else {
      // Wide stubby crystal cluster
      for (let row = 0; row < ch; row++) {
        const taper = row < 2 ? 0 : Math.floor((row - 1) / 2);
        const lx2 = bx + taper;
        const w2 = Math.max(1, cw - taper * 2);
        for (let dx = 0; dx < w2; dx++) {
          const shade = dx === 0 ? c.bodyDark : dx === w2 - 1 ? c.facetLight : c.bodyMid;
          p(ctx, ox, oy, lx2 + dx, by + row, shade);
        }
      }
      // Facet highlight
      p(ctx, ox, oy, bx + Math.floor(cw / 2), by, c.shine);
      p(ctx, ox, oy, bx + Math.floor(cw / 2) + 1, by + 1, c.highlight);
      p(ctx, ox, oy, bx + 1, by + 3, c.refractMagenta);
    }
  }

  // Crystal base — rubble at bottom
  for (let gx = 1; gx < G - 1; gx++) {
    if ((gx + idx) % 3 === 0) {
      p(ctx, ox, oy, gx, G - 1, c.edgeInner);
      p(ctx, ox, oy, gx, G - 2, c.bodyDark);
    }
  }

  // Ambient glow pixels around crystals
  p(ctx, ox, oy, 3, 3, c.refract);
  p(ctx, ox, oy, 10, 2, c.refract);
  p(ctx, ox, oy, 7, 1, c.refract);

  // Edges — thick border for non-connected sides
  if (!n) {
    b(ctx, ox, oy, 0, 0, G, 1, c.edge);
    p(ctx, ox, oy, 3, 0, c.edgeInner); p(ctx, ox, oy, 7, 0, c.facetDark);
    p(ctx, ox, oy, 10, 0, c.edgeInner); p(ctx, ox, oy, 12, 0, c.facetDark);
  }
  if (!s) {
    b(ctx, ox, oy, 0, G - 1, G, 1, c.edge);
    p(ctx, ox, oy, 4, G - 1, c.edgeInner); p(ctx, ox, oy, 9, G - 1, c.facetDark);
  }
  if (!w) {
    b(ctx, ox, oy, 0, 0, 1, G, c.edge);
    p(ctx, ox, oy, 0, 3, c.facetDark); p(ctx, ox, oy, 0, 8, c.edgeInner);
  }
  if (!e) {
    b(ctx, ox, oy, G - 1, 0, 1, G, c.edge);
    p(ctx, ox, oy, G - 1, 4, c.edgeInner); p(ctx, ox, oy, G - 1, 10, c.facetDark);
  }

  // Connected edge decorations — small crystal fragments along seams
  if (n) { p(ctx, ox, oy, 4, 0, c.facetDark); p(ctx, ox, oy, 9, 0, c.bodyMid); }
  if (s) { p(ctx, ox, oy, 5, G - 1, c.facetDark); p(ctx, ox, oy, 11, G - 1, c.bodyMid); }
  if (w) { p(ctx, ox, oy, 0, 5, c.facetDark); p(ctx, ox, oy, 0, 10, c.bodyMid); }
  if (e) { p(ctx, ox, oy, G - 1, 3, c.bodyMid); p(ctx, ox, oy, G - 1, 8, c.facetDark); }
}

function drawPool(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number, frame: number) {
  const c = PAL.pool;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);

  // Deep dark base — the cracked ground
  b(ctx, ox, oy, 0, 0, G, G, c.deep);

  // Cracked stone ground pattern
  for (let gy = 0; gy < G; gy++) {
    for (let gx = 0; gx < G; gx++) {
      if (((gx * 3 + gy * 7 + idx) % 11) < 3) {
        p(ctx, ox, oy, gx, gy, c.crackDark);
      }
    }
  }
  // Larger stone patches
  b(ctx, ox, oy, 2, 1, 3, 2, c.crackBase);
  b(ctx, ox, oy, 8, 3, 3, 2, c.crackDark);
  b(ctx, ox, oy, 1, 8, 2, 3, c.crackBase);
  b(ctx, ox, oy, 10, 9, 2, 2, c.crackDark);
  b(ctx, ox, oy, 5, 6, 3, 2, c.crackBase);

  // Energy cracks — bright glowing lines that shift per frame
  // Main diagonal crack
  const crackShift = frame;
  const crackPixels = [
    [1, 2 + crackShift], [2, 3 + crackShift], [3, 3 + crackShift],
    [4, 4 + crackShift], [5, 5 + crackShift], [6, 5 + crackShift],
    [7, 6 + crackShift], [8, 7 + crackShift], [9, 7 + crackShift],
    [10, 8 + crackShift], [11, 9 + crackShift], [12, 9 + crackShift],
  ];
  for (const [cx, cy] of crackPixels) {
    const wy = cy % G;
    p(ctx, ox, oy, cx, wy, c.energyBright);
    // Glow around crack
    p(ctx, ox, oy, cx - 1, wy, c.energyDim);
    p(ctx, ox, oy, cx + 1, wy, c.energyDim);
    p(ctx, ox, oy, cx, wy - 1, c.energyDim);
    p(ctx, ox, oy, cx, wy + 1, c.energyDim);
  }
  // Bright core of main crack at different points per frame
  const hotSpots = [
    [3 + frame * 3, (4 + crackShift) % G],
    [7 + frame * 2, (6 + crackShift) % G],
    [10 - frame, (8 + crackShift) % G],
  ];
  for (const [hx, hy] of hotSpots) {
    p(ctx, ox, oy, hx, hy, c.energyHot);
    p(ctx, ox, oy, hx + 1, hy, c.energyWhite);
  }

  // Secondary crack — horizontal
  const crack2Y = (3 + frame * 4) % (G - 4) + 2;
  p(ctx, ox, oy, 2, crack2Y, c.energyMid);
  p(ctx, ox, oy, 3, crack2Y, c.energyBright);
  p(ctx, ox, oy, 4, crack2Y, c.energyHot);
  p(ctx, ox, oy, 5, crack2Y, c.energyBright);
  p(ctx, ox, oy, 6, crack2Y, c.energyMid);

  // Rune symbols flickering in/out per frame
  // Rune 1 — angular sigil (visible frames 0,1)
  if (frame !== 2) {
    const r1x = 2 + (idx % 3);
    const r1y = 1 + (idx % 2);
    p(ctx, ox, oy, r1x, r1y, c.runeBright);
    p(ctx, ox, oy, r1x + 1, r1y, c.runeMid);
    p(ctx, ox, oy, r1x, r1y + 1, c.runeMid);
    p(ctx, ox, oy, r1x + 1, r1y + 1, c.runeDim);
    p(ctx, ox, oy, r1x + 2, r1y, c.runeDim);
    p(ctx, ox, oy, r1x, r1y + 2, c.runeDim);
  }

  // Rune 2 — cross shape (visible frames 1,2)
  if (frame !== 0) {
    const r2x = 9 + (idx % 2);
    const r2y = 1 + (idx % 3);
    p(ctx, ox, oy, r2x, r2y, c.runeMid);
    p(ctx, ox, oy, r2x + 1, r2y, c.runeBright);
    p(ctx, ox, oy, r2x - 1, r2y, c.runeDim);
    p(ctx, ox, oy, r2x, r2y - 1, c.runeDim);
    p(ctx, ox, oy, r2x, r2y + 1, c.runeMid);
  }

  // Rune 3 — arc shape (visible frames 0,2)
  if (frame !== 1) {
    const r3x = 5;
    const r3y = 9 + (idx % 2);
    p(ctx, ox, oy, r3x, r3y, c.runeWhite);
    p(ctx, ox, oy, r3x + 1, r3y + 1, c.runeBright);
    p(ctx, ox, oy, r3x + 2, r3y, c.runeMid);
    p(ctx, ox, oy, r3x + 3, r3y - 1, c.runeDim);
  }

  // Rising energy particles — shift upward per frame
  const particles = [
    [3, 10], [6, 8], [9, 11], [11, 7], [4, 5], [8, 3], [12, 6], [1, 9],
  ];
  for (let pi = 0; pi < particles.length; pi++) {
    const px2 = particles[pi][0];
    const py2 = (particles[pi][1] - frame * 2 + G) % G;
    const pColor = pi % 3 === 0 ? c.particleBright : pi % 3 === 1 ? c.particleMid : c.particleDim;
    p(ctx, ox, oy, px2, py2, pColor);
    // Trailing dim pixel below
    p(ctx, ox, oy, px2, (py2 + 1) % G, c.particleDim);
  }

  // Color variation — cyan and magenta tints per frame
  if (frame === 0) {
    p(ctx, ox, oy, 4, 7, c.cyanGlow);
    p(ctx, ox, oy, 10, 4, c.magentaGlow);
  } else if (frame === 1) {
    p(ctx, ox, oy, 7, 3, c.cyanGlow);
    p(ctx, ox, oy, 2, 10, c.magentaGlow);
    p(ctx, ox, oy, 11, 6, c.cyanGlow);
  } else {
    p(ctx, ox, oy, 5, 2, c.magentaGlow);
    p(ctx, ox, oy, 9, 9, c.cyanGlow);
    p(ctx, ox, oy, 1, 5, c.magentaGlow);
  }

  // Edges
  if (!n) {
    b(ctx, ox, oy, 0, 0, G, 1, c.edge);
    p(ctx, ox, oy, 3, 0, c.energyDim); p(ctx, ox, oy, 7, 0, c.energyMid);
    p(ctx, ox, oy, 11, 0, c.energyDim);
  }
  if (!s) {
    b(ctx, ox, oy, 0, G - 1, G, 1, c.edge);
    p(ctx, ox, oy, 4, G - 1, c.energyDim); p(ctx, ox, oy, 9, G - 1, c.energyMid);
  }
  if (!w) {
    b(ctx, ox, oy, 0, 0, 1, G, c.edge);
    p(ctx, ox, oy, 0, 4, c.energyDim); p(ctx, ox, oy, 0, 9, c.energyDim);
  }
  if (!e) {
    b(ctx, ox, oy, G - 1, 0, 1, G, c.edge);
    p(ctx, ox, oy, G - 1, 5, c.energyDim); p(ctx, ox, oy, G - 1, 10, c.energyDim);
  }
}

function drawNoBuild(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.noBuild;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);

  // Stone floor base (same as ground but slightly different)
  b(ctx, ox, oy, 0, 0, G, G, c.base);
  for (let gy = 0; gy < G; gy++) {
    for (let gx = 0; gx < G; gx++) {
      if (((gx + gy * 5 + 3) % 7) < 2) p(ctx, ox, oy, gx, gy, c.baseLt);
      if (((gx * 3 + gy + 1) % 9) === 0) p(ctx, ox, oy, gx, gy, c.stone);
    }
  }

  const cx = 7, cy = 7;

  // Outer arcane circle — concentric ring
  for (let a = 0; a < 24; a++) {
    const angle = a * Math.PI * 2 / 24;
    const rx = cx + Math.round(5.5 * Math.cos(angle));
    const ry = cy + Math.round(5.5 * Math.sin(angle));
    p(ctx, ox, oy, rx, ry, c.ringOuter);
  }
  // Fill some gaps in outer ring
  for (let a = 0; a < 32; a++) {
    const angle = a * Math.PI * 2 / 32;
    const rx = cx + Math.round(5 * Math.cos(angle));
    const ry = cy + Math.round(5 * Math.sin(angle));
    p(ctx, ox, oy, rx, ry, c.ringMid);
  }

  // Middle ring
  for (let a = 0; a < 16; a++) {
    const angle = a * Math.PI * 2 / 16;
    const rx = cx + Math.round(3.5 * Math.cos(angle));
    const ry = cy + Math.round(3.5 * Math.sin(angle));
    p(ctx, ox, oy, rx, ry, c.ringInner);
  }

  // Inner ring — brightest
  for (let a = 0; a < 8; a++) {
    const angle = a * Math.PI * 2 / 8;
    const rx = cx + Math.round(1.8 * Math.cos(angle));
    const ry = cy + Math.round(1.8 * Math.sin(angle));
    p(ctx, ox, oy, rx, ry, c.ringBright);
  }

  // Ward lines — cross/star pattern connecting rings
  // Vertical ward line
  for (let dy = -5; dy <= 5; dy++) {
    if (dy === 0) continue;
    const wardColor = Math.abs(dy) > 3 ? c.wardLine : c.wardGlow;
    p(ctx, ox, oy, cx, cy + dy, wardColor);
  }
  // Horizontal ward line
  for (let dx = -5; dx <= 5; dx++) {
    if (dx === 0) continue;
    const wardColor = Math.abs(dx) > 3 ? c.wardLine : c.wardGlow;
    p(ctx, ox, oy, cx + dx, cy, wardColor);
  }
  // Diagonal ward lines (thinner)
  for (let d = -3; d <= 3; d++) {
    if (d === 0) continue;
    p(ctx, ox, oy, cx + d, cy + d, c.wardLine);
    p(ctx, ox, oy, cx + d, cy - d, c.wardLine);
  }

  // Runic symbols at cardinal points
  // North rune
  p(ctx, ox, oy, cx - 1, 1, c.runeDim); p(ctx, ox, oy, cx, 1, c.runeMid); p(ctx, ox, oy, cx + 1, 1, c.runeDim);
  p(ctx, ox, oy, cx, 2, c.runeBright);
  // South rune
  p(ctx, ox, oy, cx, G - 3, c.runeBright);
  p(ctx, ox, oy, cx - 1, G - 2, c.runeDim); p(ctx, ox, oy, cx, G - 2, c.runeMid); p(ctx, ox, oy, cx + 1, G - 2, c.runeDim);
  // West rune
  p(ctx, ox, oy, 1, cy, c.runeMid); p(ctx, ox, oy, 2, cy, c.runeBright);
  p(ctx, ox, oy, 1, cy - 1, c.runeDim); p(ctx, ox, oy, 1, cy + 1, c.runeDim);
  // East rune
  p(ctx, ox, oy, G - 2, cy, c.runeMid); p(ctx, ox, oy, G - 3, cy, c.runeBright);
  p(ctx, ox, oy, G - 2, cy - 1, c.runeDim); p(ctx, ox, oy, G - 2, cy + 1, c.runeDim);

  // Center node — bright core
  p(ctx, ox, oy, cx - 1, cy, c.nodeGlow);
  p(ctx, ox, oy, cx + 1, cy, c.nodeGlow);
  p(ctx, ox, oy, cx, cy - 1, c.nodeGlow);
  p(ctx, ox, oy, cx, cy + 1, c.nodeGlow);
  p(ctx, ox, oy, cx, cy, c.nodeCore);

  // Glow around center
  p(ctx, ox, oy, cx - 1, cy - 1, c.nodeDim);
  p(ctx, ox, oy, cx + 1, cy - 1, c.nodeDim);
  p(ctx, ox, oy, cx - 1, cy + 1, c.nodeDim);
  p(ctx, ox, oy, cx + 1, cy + 1, c.nodeDim);

  // Connectivity — ward lines extending to connected neighbors
  if (n) {
    b(ctx, ox, oy, cx - 1, 0, 3, 2, c.wardLine);
    p(ctx, ox, oy, cx, 0, c.ringMid); p(ctx, ox, oy, cx, 1, c.ringMid);
  }
  if (s) {
    b(ctx, ox, oy, cx - 1, G - 2, 3, 2, c.wardLine);
    p(ctx, ox, oy, cx, G - 1, c.ringMid); p(ctx, ox, oy, cx, G - 2, c.ringMid);
  }
  if (w) {
    b(ctx, ox, oy, 0, cy - 1, 2, 3, c.wardLine);
    p(ctx, ox, oy, 0, cy, c.ringMid); p(ctx, ox, oy, 1, cy, c.ringMid);
  }
  if (e) {
    b(ctx, ox, oy, G - 2, cy - 1, 2, 3, c.wardLine);
    p(ctx, ox, oy, G - 1, cy, c.ringMid); p(ctx, ox, oy, G - 2, cy, c.ringMid);
  }

  // Exposed edge markers
  if (!n) { p(ctx, ox, oy, cx - 1, 0, c.runeGlow); p(ctx, ox, oy, cx, 0, c.runeGlow); p(ctx, ox, oy, cx + 1, 0, c.runeGlow); }
  if (!s) { p(ctx, ox, oy, cx - 1, G - 1, c.runeGlow); p(ctx, ox, oy, cx, G - 1, c.runeGlow); p(ctx, ox, oy, cx + 1, G - 1, c.runeGlow); }
  if (!w) { p(ctx, ox, oy, 0, cy - 1, c.runeGlow); p(ctx, ox, oy, 0, cy, c.runeGlow); p(ctx, ox, oy, 0, cy + 1, c.runeGlow); }
  if (!e) { p(ctx, ox, oy, G - 1, cy - 1, c.runeGlow); p(ctx, ox, oy, G - 1, cy, c.runeGlow); p(ctx, ox, oy, G - 1, cy + 1, c.runeGlow); }
}

function drawDoodad(ctx: CanvasRenderingContext2D, ox: number, oy: number, type: number) {
  ctx.clearRect(ox, oy, T, T);
  const d = PAL.doodad;
  switch (type) {
    case 0: {
      // Crystal shard cluster — 3 shards rising from base
      // Left shard (small, leaning left)
      p(ctx, ox, oy, 4, 5, d.purpleDim);
      p(ctx, ox, oy, 3, 6, d.purpleDim);
      p(ctx, ox, oy, 4, 6, d.purple);
      p(ctx, ox, oy, 4, 7, d.purple);
      p(ctx, ox, oy, 3, 7, d.purpleDim);
      p(ctx, ox, oy, 4, 8, d.purpleDim);
      p(ctx, ox, oy, 3, 5, d.purpleBright);

      // Center shard (tall, bright)
      p(ctx, ox, oy, 6, 3, d.white);
      p(ctx, ox, oy, 7, 3, d.whiteBright);
      p(ctx, ox, oy, 6, 4, d.purpleBright);
      p(ctx, ox, oy, 7, 4, d.blue);
      p(ctx, ox, oy, 6, 5, d.purple);
      p(ctx, ox, oy, 7, 5, d.purpleBright);
      p(ctx, ox, oy, 8, 5, d.blueDim);
      p(ctx, ox, oy, 6, 6, d.purpleDim);
      p(ctx, ox, oy, 7, 6, d.purple);
      p(ctx, ox, oy, 8, 6, d.purpleDim);
      p(ctx, ox, oy, 6, 7, d.purpleDim);
      p(ctx, ox, oy, 7, 7, d.purple);
      p(ctx, ox, oy, 8, 7, d.purpleDim);
      p(ctx, ox, oy, 7, 8, d.purpleDim);

      // Right shard (medium, leaning right)
      p(ctx, ox, oy, 9, 4, d.blueBright);
      p(ctx, ox, oy, 10, 5, d.blue);
      p(ctx, ox, oy, 9, 5, d.purple);
      p(ctx, ox, oy, 10, 6, d.purpleDim);
      p(ctx, ox, oy, 9, 6, d.purple);
      p(ctx, ox, oy, 10, 7, d.purpleDim);
      p(ctx, ox, oy, 9, 7, d.purpleDim);

      // Base rubble
      p(ctx, ox, oy, 5, 9, d.dim);
      p(ctx, ox, oy, 6, 9, d.dimDark);
      p(ctx, ox, oy, 7, 9, d.dim);
      p(ctx, ox, oy, 8, 9, d.dimDark);
      p(ctx, ox, oy, 9, 8, d.dim);
      break;
    }
    case 1: {
      // Floating rune glyph — glowing arcane symbol hovering
      // Glow halo
      p(ctx, ox, oy, 5, 4, d.purpleDim);
      p(ctx, ox, oy, 8, 4, d.purpleDim);
      p(ctx, ox, oy, 4, 6, d.purpleDim);
      p(ctx, ox, oy, 9, 6, d.purpleDim);
      p(ctx, ox, oy, 5, 8, d.purpleDim);
      p(ctx, ox, oy, 8, 8, d.purpleDim);

      // Rune shape — angular sigil
      p(ctx, ox, oy, 6, 4, d.purpleBright);
      p(ctx, ox, oy, 7, 4, d.purpleBright);
      p(ctx, ox, oy, 5, 5, d.purple);
      p(ctx, ox, oy, 8, 5, d.purple);
      p(ctx, ox, oy, 6, 5, d.white);
      p(ctx, ox, oy, 7, 5, d.white);
      p(ctx, ox, oy, 5, 6, d.purpleBright);
      p(ctx, ox, oy, 6, 6, d.whiteBright);
      p(ctx, ox, oy, 7, 6, d.white);
      p(ctx, ox, oy, 8, 6, d.purpleBright);
      p(ctx, ox, oy, 6, 7, d.purple);
      p(ctx, ox, oy, 7, 7, d.purple);
      p(ctx, ox, oy, 5, 7, d.purpleDim);
      p(ctx, ox, oy, 8, 7, d.purpleDim);

      // Floating shadow below
      p(ctx, ox, oy, 6, 10, d.dimDark);
      p(ctx, ox, oy, 7, 10, d.dimDark);
      break;
    }
    case 2: {
      // Mana puddle — glowing liquid pool on ground
      // Outer edge
      p(ctx, ox, oy, 4, 6, d.blueDim);
      p(ctx, ox, oy, 5, 5, d.blueDim);
      p(ctx, ox, oy, 6, 5, d.blue);
      p(ctx, ox, oy, 7, 5, d.blue);
      p(ctx, ox, oy, 8, 5, d.blueDim);
      p(ctx, ox, oy, 9, 6, d.blueDim);
      p(ctx, ox, oy, 10, 7, d.blueDim);
      p(ctx, ox, oy, 9, 8, d.blueDim);
      p(ctx, ox, oy, 8, 9, d.blueDim);
      p(ctx, ox, oy, 7, 9, d.blue);
      p(ctx, ox, oy, 6, 9, d.blue);
      p(ctx, ox, oy, 5, 9, d.blueDim);
      p(ctx, ox, oy, 4, 8, d.blueDim);
      p(ctx, ox, oy, 3, 7, d.blueDim);

      // Inner pool
      p(ctx, ox, oy, 5, 6, d.blue);
      p(ctx, ox, oy, 6, 6, d.blueBright);
      p(ctx, ox, oy, 7, 6, d.cyan);
      p(ctx, ox, oy, 8, 6, d.blue);
      p(ctx, ox, oy, 5, 7, d.blue);
      p(ctx, ox, oy, 6, 7, d.cyanBright);
      p(ctx, ox, oy, 7, 7, d.blueBright);
      p(ctx, ox, oy, 8, 7, d.blue);
      p(ctx, ox, oy, 9, 7, d.blueDim);
      p(ctx, ox, oy, 5, 8, d.blue);
      p(ctx, ox, oy, 6, 8, d.blueBright);
      p(ctx, ox, oy, 7, 8, d.blue);
      p(ctx, ox, oy, 8, 8, d.blueDim);

      // Highlight sparkle
      p(ctx, ox, oy, 6, 6, d.whiteBright);
      break;
    }
    case 3: {
      // Arcane book/scroll — open tome with glowing pages
      // Book cover
      b(ctx, ox, oy, 4, 6, 6, 5, d.dimDark);
      b(ctx, ox, oy, 5, 6, 4, 5, d.dim);

      // Pages (light)
      b(ctx, ox, oy, 5, 7, 4, 3, d.purpleDim);
      p(ctx, ox, oy, 6, 7, d.purple);
      p(ctx, ox, oy, 7, 7, d.purple);
      p(ctx, ox, oy, 6, 8, d.purple);
      p(ctx, ox, oy, 8, 8, d.purpleDim);

      // Spine
      p(ctx, ox, oy, 4, 7, d.dimDark);
      p(ctx, ox, oy, 4, 8, d.dimDark);
      p(ctx, ox, oy, 4, 9, d.dimDark);

      // Glowing text lines
      p(ctx, ox, oy, 6, 8, d.purpleBright);
      p(ctx, ox, oy, 7, 8, d.purpleBright);
      p(ctx, ox, oy, 6, 9, d.purple);
      p(ctx, ox, oy, 7, 9, d.purpleBright);

      // Magic emanating upward
      p(ctx, ox, oy, 6, 5, d.purpleDim);
      p(ctx, ox, oy, 7, 4, d.purpleBright);
      p(ctx, ox, oy, 8, 5, d.purpleDim);
      p(ctx, ox, oy, 7, 3, d.white);
      break;
    }
    case 4: {
      // Enchanted lantern — glowing crystal in a frame
      // Stand/pole
      p(ctx, ox, oy, 7, 10, d.dim);
      p(ctx, ox, oy, 7, 9, d.dim);
      p(ctx, ox, oy, 6, 11, d.dimDark);
      p(ctx, ox, oy, 7, 11, d.dimDark);
      p(ctx, ox, oy, 8, 11, d.dimDark);

      // Lantern frame
      p(ctx, ox, oy, 5, 5, d.dim);
      p(ctx, ox, oy, 9, 5, d.dim);
      p(ctx, ox, oy, 5, 8, d.dim);
      p(ctx, ox, oy, 9, 8, d.dim);
      p(ctx, ox, oy, 6, 4, d.dim);
      p(ctx, ox, oy, 7, 4, d.dim);
      p(ctx, ox, oy, 8, 4, d.dim);
      p(ctx, ox, oy, 7, 9, d.dim);

      // Glowing crystal inside
      p(ctx, ox, oy, 6, 5, d.purpleBright);
      p(ctx, ox, oy, 7, 5, d.white);
      p(ctx, ox, oy, 8, 5, d.purpleBright);
      p(ctx, ox, oy, 6, 6, d.cyan);
      p(ctx, ox, oy, 7, 6, d.whiteBright);
      p(ctx, ox, oy, 8, 6, d.cyanBright);
      p(ctx, ox, oy, 6, 7, d.purpleBright);
      p(ctx, ox, oy, 7, 7, d.white);
      p(ctx, ox, oy, 8, 7, d.purple);
      p(ctx, ox, oy, 7, 8, d.purpleDim);

      // Light rays
      p(ctx, ox, oy, 5, 6, d.purpleDim);
      p(ctx, ox, oy, 9, 6, d.purpleDim);
      p(ctx, ox, oy, 4, 7, d.dimDark);
      p(ctx, ox, oy, 10, 7, d.dimDark);
      p(ctx, ox, oy, 7, 3, d.purpleDim);
      break;
    }
    case 5: {
      // Spell circle fragment — partial arcane circle on ground
      // Outer arc (3/4 circle)
      for (let a = 0; a < 12; a++) {
        const angle = a * Math.PI * 2 / 16;
        const rx = 7 + Math.round(4.5 * Math.cos(angle));
        const ry = 7 + Math.round(4.5 * Math.sin(angle));
        p(ctx, ox, oy, rx, ry, d.purple);
      }
      // Inner arc
      for (let a = 2; a < 10; a++) {
        const angle = a * Math.PI * 2 / 16;
        const rx = 7 + Math.round(2.5 * Math.cos(angle));
        const ry = 7 + Math.round(2.5 * Math.sin(angle));
        p(ctx, ox, oy, rx, ry, d.purpleBright);
      }
      // Rune marks at intersections
      p(ctx, ox, oy, 7, 3, d.white);
      p(ctx, ox, oy, 11, 7, d.purpleBright);
      p(ctx, ox, oy, 7, 11, d.purple);
      p(ctx, ox, oy, 3, 7, d.purpleBright);
      // Cross lines
      p(ctx, ox, oy, 7, 5, d.purpleDim);
      p(ctx, ox, oy, 7, 9, d.purpleDim);
      p(ctx, ox, oy, 5, 7, d.purpleDim);
      p(ctx, ox, oy, 9, 7, d.purpleDim);
      // Center dot
      p(ctx, ox, oy, 7, 7, d.white);
      // Broken/faded section
      p(ctx, ox, oy, 10, 10, d.dimDark);
      p(ctx, ox, oy, 11, 9, d.dimDark);
      break;
    }
    case 6: {
      // Crystal dust pile — sparkling mound of ground crystal
      // Mound shape
      p(ctx, ox, oy, 5, 10, d.dim);
      p(ctx, ox, oy, 6, 10, d.dim);
      p(ctx, ox, oy, 7, 10, d.dim);
      p(ctx, ox, oy, 8, 10, d.dim);
      p(ctx, ox, oy, 9, 10, d.dimDark);
      p(ctx, ox, oy, 4, 9, d.dimDark);
      p(ctx, ox, oy, 5, 9, d.dim);
      p(ctx, ox, oy, 6, 9, d.purpleDim);
      p(ctx, ox, oy, 7, 9, d.purple);
      p(ctx, ox, oy, 8, 9, d.purpleDim);
      p(ctx, ox, oy, 9, 9, d.dim);
      p(ctx, ox, oy, 5, 8, d.dimDark);
      p(ctx, ox, oy, 6, 8, d.purpleDim);
      p(ctx, ox, oy, 7, 8, d.purple);
      p(ctx, ox, oy, 8, 8, d.purpleDim);
      p(ctx, ox, oy, 6, 7, d.dimDark);
      p(ctx, ox, oy, 7, 7, d.purpleDim);

      // Sparkle highlights
      p(ctx, ox, oy, 7, 8, d.purpleBright);
      p(ctx, ox, oy, 6, 9, d.blue);
      p(ctx, ox, oy, 8, 9, d.blueBright);

      // Floating dust particles above
      p(ctx, ox, oy, 5, 5, d.purpleDim);
      p(ctx, ox, oy, 8, 4, d.purple);
      p(ctx, ox, oy, 10, 6, d.purpleDim);
      p(ctx, ox, oy, 4, 7, d.dimDark);
      p(ctx, ox, oy, 9, 3, d.purpleDim);
      break;
    }
    case 7: {
      // Magical wisp — floating orb of light with trail
      // Trail (below and behind)
      p(ctx, ox, oy, 5, 10, d.dimDark);
      p(ctx, ox, oy, 6, 9, d.purpleDim);
      p(ctx, ox, oy, 5, 9, d.dimDark);
      p(ctx, ox, oy, 6, 8, d.purple);
      p(ctx, ox, oy, 5, 8, d.purpleDim);
      p(ctx, ox, oy, 7, 8, d.purpleDim);

      // Wisp glow halo
      p(ctx, ox, oy, 5, 5, d.purpleDim);
      p(ctx, ox, oy, 6, 4, d.purpleDim);
      p(ctx, ox, oy, 8, 4, d.purpleDim);
      p(ctx, ox, oy, 9, 5, d.purpleDim);
      p(ctx, ox, oy, 9, 7, d.purpleDim);
      p(ctx, ox, oy, 5, 7, d.purpleDim);

      // Wisp body
      p(ctx, ox, oy, 6, 5, d.cyan);
      p(ctx, ox, oy, 7, 5, d.cyanBright);
      p(ctx, ox, oy, 8, 5, d.blue);
      p(ctx, ox, oy, 6, 6, d.cyanBright);
      p(ctx, ox, oy, 7, 6, d.whiteBright);
      p(ctx, ox, oy, 8, 6, d.cyan);
      p(ctx, ox, oy, 6, 7, d.blue);
      p(ctx, ox, oy, 7, 7, d.cyan);
      p(ctx, ox, oy, 8, 7, d.blueDim);

      // Core
      p(ctx, ox, oy, 7, 6, d.whiteBright);

      // Sparkle particles around
      p(ctx, ox, oy, 4, 4, d.purpleDim);
      p(ctx, ox, oy, 10, 4, d.purpleDim);
      p(ctx, ox, oy, 3, 7, d.dimDark);
      p(ctx, ox, oy, 10, 6, d.dimDark);
      break;
    }
  }
}

export default function ArcaneTerrainSprites() {
  const terrainRef = useRef<HTMLCanvasElement>(null);
  const terrainPreviewRef = useRef<HTMLCanvasElement>(null);
  const doodadRef = useRef<HTMLCanvasElement>(null);
  const doodadPreviewRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<'preview' | 'actual'>('preview');

  useEffect(() => {
    const tc = terrainRef.current!;
    tc.width = VARIANTS * T;
    tc.height = TERRAIN_ROWS * T;
    const tCtx = tc.getContext('2d')!;
    tCtx.imageSmoothingEnabled = false;

    for (let v = 0; v < VARIANTS; v++) {
      const ox = v * T;
      drawGround(tCtx, ox, 0 * T);
      drawCrystal(tCtx, ox, 1 * T, v);
      for (let f = 0; f < 3; f++) {
        drawPool(tCtx, ox, (2 + f) * T, v, f);
      }
      drawNoBuild(tCtx, ox, 5 * T, v);
    }

    const tp = terrainPreviewRef.current!;
    const scale = 3;
    tp.width = VARIANTS * T * scale + 140;
    tp.height = TERRAIN_ROWS * T * scale + 40;
    const tpCtx = tp.getContext('2d')!;
    tpCtx.imageSmoothingEnabled = false;
    tpCtx.fillStyle = '#0a0818';
    tpCtx.fillRect(0, 0, tp.width, tp.height);
    tpCtx.drawImage(tc, 140, 20, tc.width * scale, tc.height * scale);
    tpCtx.fillStyle = '#8866ff';
    tpCtx.font = '11px monospace';
    const rowLabels = ['Ground', 'Crystal Wall', 'Arcane Pool 0', 'Arcane Pool 1', 'Arcane Pool 2', 'NoBuild'];
    for (let r = 0; r < TERRAIN_ROWS; r++) {
      tpCtx.fillText(rowLabels[r], 4, 20 + r * T * scale + T * scale / 2 + 4);
    }

    const dc = doodadRef.current!;
    dc.width = DOODAD_COLS * T;
    dc.height = DOODAD_ROWS * T;
    const dCtx = dc.getContext('2d')!;
    dCtx.imageSmoothingEnabled = false;
    for (let i = 0; i < DOODAD_COLS; i++) {
      drawDoodad(dCtx, i * T, 0, i);
    }

    const dp = doodadPreviewRef.current!;
    const dScale = 3;
    dp.width = DOODAD_COLS * T * dScale + 80;
    dp.height = DOODAD_ROWS * T * dScale + 40;
    const dpCtx = dp.getContext('2d')!;
    dpCtx.imageSmoothingEnabled = false;
    dpCtx.fillStyle = '#0a0818';
    dpCtx.fillRect(0, 0, dp.width, dp.height);
    dpCtx.drawImage(dc, 80, 20, dc.width * dScale, dc.height * dScale);
    dpCtx.fillStyle = '#8866ff';
    dpCtx.font = '11px monospace';
    dpCtx.fillText('Arcane', 4, 20 + T * dScale / 2 + 4);

    setReady(true);
  }, []);

  const download = (ref: React.RefObject<HTMLCanvasElement | null>, name: string) => {
    const a = document.createElement('a');
    a.download = name;
    a.href = ref.current!.toDataURL('image/png');
    a.click();
  };

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', color: '#8866ff', background: '#0a0818' }}>
      <h2 data-label="Arcane Terrain">Arcane Terrain Sprites — Crystal Caverns</h2>
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setView('preview')} style={{ marginRight: 8, background: view === 'preview' ? '#8866ff' : '#1a1828', color: view === 'preview' ? '#0a0818' : '#8866ff', border: '1px solid #8866ff', padding: '4px 12px', cursor: 'pointer' }}>Preview (3x)</button>
        <button onClick={() => setView('actual')} style={{ marginRight: 8, background: view === 'actual' ? '#8866ff' : '#1a1828', color: view === 'actual' ? '#0a0818' : '#8866ff', border: '1px solid #8866ff', padding: '4px 12px', cursor: 'pointer' }}>Actual Size</button>
        {ready && (
          <>
            <button onClick={() => download(terrainRef, 'arcane_terrain_tileset.png')} style={{ marginRight: 8, background: '#1a1828', color: '#8866ff', border: '1px solid #8866ff', padding: '4px 12px', cursor: 'pointer' }}>Download Tileset</button>
            <button onClick={() => download(doodadRef, 'arcane_terrain_doodads.png')} style={{ background: '#1a1828', color: '#8866ff', border: '1px solid #8866ff', padding: '4px 12px', cursor: 'pointer' }}>Download Doodads</button>
          </>
        )}
      </div>
      <p style={{ fontSize: '12px', color: '#553399' }} data-frame-size="28x28">Frame size: 28x28 | PX=2 | Grid=14x14 | 16 cols (NESW bitmask) x 6 rows</p>
      <h3 data-label="Arcane Terrain (Preview)">Terrain Tileset (16 auto-tile variants x 6 rows)</h3>
      <canvas ref={terrainPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #8866ff33' }} />
      <canvas ref={terrainRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #8866ff33' }} />
      <h3>Arcane Doodads (8 types)</h3>
      <canvas ref={doodadPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #8866ff33' }} />
      <canvas ref={doodadRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #8866ff33' }} />
    </div>
  );
}
