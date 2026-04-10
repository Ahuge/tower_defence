/**
 * Celestial Terrain Sprite Generator — Sky Citadel terrain.
 *
 * Classical Greek/Roman heaven aesthetic with polished marble,
 * temple pillars, divine light, and cloud platforms.
 *
 * Layout:
 *   Columns: 16 (auto-tile bitmask variants, bits = NESW)
 *   Rows: one row per terrain type, animated types get extra rows
 *
 * Row order:
 *   0: polished marble floor (ground)
 *   1: Greek/Roman pillars and temple walls (blocked type 1)
 *   2: divine light frame 0 (blocked type 2)
 *   3: divine light frame 1 (blocked type 2, animated)
 *   4: divine light frame 2 (blocked type 2, animated)
 *   5: cloud platforms (NoBuild terrain — walkable, unbuildable)
 *
 * Also generates a doodads sheet:
 *   Row 0: celestial doodads (8 types)
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
    base: '#f0ebe0',
    baseWarm: '#ede6d4',
    vein: '#d8d0c0',
    veinLight: '#e2dbd0',
    gold: '#c8a848',
    goldDim: '#b89838',
    goldBright: '#e0c868',
    mosaic: '#d0c8b8',
    mosaicDark: '#c0b8a8',
    gridLine: '#e0d8cc',
    shadow: '#cdc5b5',
    highlight: '#faf6ee',
  },
  pillar: {
    fill: '#ddd6c8',
    fillDark: '#c8c0b0',
    column: '#e8e2d4',
    columnLight: '#f0ebe0',
    columnDark: '#bab2a2',
    capital: '#c8a848',
    capitalBright: '#e0c868',
    capitalDim: '#a08838',
    flute: '#cfc8b8',
    fluteLight: '#e2dbd0',
    base: '#b8b0a0',
    frieze: '#d0c0a0',
    friezeDetail: '#a89878',
    edge: '#a8a090',
    edgeLight: '#c0b8a8',
  },
  divine: {
    deep: '#f8f0d8',
    beam: '#ffe888',
    beamBright: '#fff4b8',
    beamDim: '#e8d070',
    halo: '#ffd840',
    haloDim: '#d8b830',
    spark: '#ffffff',
    sparkDim: '#fff8d0',
    aura: '#fff0a0',
    auraDim: '#f0e090',
    angel: '#ffe0a0',
    angelDim: '#e8c880',
    warmGlow: '#f8e8b0',
    edge: '#e8d8a0',
  },
  cloud: {
    base: '#e8e4f0',
    white: '#f4f0f8',
    bright: '#ffffff',
    light: '#ece8f2',
    mid: '#d8d4e4',
    shadow: '#c8c4d8',
    shadowDeep: '#b8b4cc',
    goldLit: '#f0e8d0',
    goldHighlight: '#f8f0d8',
    wisp: '#dad6e8',
    wispLight: '#eae6f4',
    skyBlue: '#d0d8f0',
    skyLight: '#e0e4f8',
  },
  doodad: {
    gold: '#c8a848',
    goldBright: '#e0c868',
    goldDim: '#a08838',
    white: '#f4f0f8',
    cream: '#ede6d4',
    marble: '#ddd6c8',
    brown: '#8a7860',
    green: '#88a848',
    greenDark: '#688838',
    blue: '#88a8d8',
    blueDim: '#6888b8',
    shadow: '#b8b0a0',
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

function drawGround(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  const c = PAL.ground;
  // Base marble fill
  b(ctx, ox, oy, 0, 0, G, G, c.base);
  // Alternating warm/cool marble patches for depth
  for (let gy = 0; gy < G; gy += 2) {
    for (let gx = (gy % 4 === 0 ? 0 : 1); gx < G; gx += 3) {
      p(ctx, ox, oy, gx, gy, c.baseWarm);
    }
  }
  // Marble vein pattern — diagonal streaks
  p(ctx, ox, oy, 1, 2, c.vein); p(ctx, ox, oy, 2, 3, c.vein); p(ctx, ox, oy, 3, 4, c.veinLight);
  p(ctx, ox, oy, 4, 4, c.vein);
  p(ctx, ox, oy, 8, 1, c.veinLight); p(ctx, ox, oy, 9, 2, c.vein); p(ctx, ox, oy, 10, 3, c.vein);
  p(ctx, ox, oy, 11, 3, c.veinLight);
  p(ctx, ox, oy, 5, 8, c.vein); p(ctx, ox, oy, 6, 9, c.veinLight); p(ctx, ox, oy, 7, 10, c.vein);
  p(ctx, ox, oy, 2, 10, c.veinLight); p(ctx, ox, oy, 3, 11, c.vein);
  p(ctx, ox, oy, 10, 8, c.vein); p(ctx, ox, oy, 11, 9, c.veinLight); p(ctx, ox, oy, 12, 10, c.vein);
  // Mosaic tile grid lines — classical geometric pattern
  for (let i = 0; i < G; i += 7) {
    for (let gy = 0; gy < G; gy++) p(ctx, ox, oy, i, gy, c.gridLine);
    for (let gx = 0; gx < G; gx++) p(ctx, ox, oy, gx, i, c.gridLine);
  }
  // Gold inlay border around tile edges
  for (let i = 0; i < G; i++) {
    p(ctx, ox, oy, i, 0, c.goldDim);
    p(ctx, ox, oy, i, G - 1, c.goldDim);
    p(ctx, ox, oy, 0, i, c.goldDim);
    p(ctx, ox, oy, G - 1, i, c.goldDim);
  }
  // Gold corner accents
  p(ctx, ox, oy, 0, 0, c.gold); p(ctx, ox, oy, 1, 0, c.gold); p(ctx, ox, oy, 0, 1, c.gold);
  p(ctx, ox, oy, G - 1, 0, c.gold); p(ctx, ox, oy, G - 2, 0, c.gold); p(ctx, ox, oy, G - 1, 1, c.gold);
  p(ctx, ox, oy, 0, G - 1, c.gold); p(ctx, ox, oy, 1, G - 1, c.gold); p(ctx, ox, oy, 0, G - 2, c.gold);
  p(ctx, ox, oy, G - 1, G - 1, c.gold); p(ctx, ox, oy, G - 2, G - 1, c.gold); p(ctx, ox, oy, G - 1, G - 2, c.gold);
  // Gold inlay center diamond motif
  p(ctx, ox, oy, 7, 5, c.goldDim); p(ctx, ox, oy, 6, 6, c.goldDim);
  p(ctx, ox, oy, 8, 6, c.goldDim); p(ctx, ox, oy, 7, 7, c.goldDim);
  p(ctx, ox, oy, 7, 6, c.goldBright);
  // Subtle mosaic triangle in corner
  p(ctx, ox, oy, 2, 2, c.mosaic); p(ctx, ox, oy, 3, 2, c.mosaicDark);
  p(ctx, ox, oy, 2, 3, c.mosaicDark);
  p(ctx, ox, oy, 10, 10, c.mosaic); p(ctx, ox, oy, 11, 10, c.mosaicDark);
  p(ctx, ox, oy, 10, 11, c.mosaicDark);
  // Highlight reflections
  p(ctx, ox, oy, 5, 3, c.highlight); p(ctx, ox, oy, 9, 7, c.highlight);
  p(ctx, ox, oy, 3, 9, c.highlight); p(ctx, ox, oy, 11, 5, c.highlight);
  // Shadow specks
  p(ctx, ox, oy, 4, 6, c.shadow); p(ctx, ox, oy, 9, 11, c.shadow);
}

function drawPillar(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.pillar;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  // Base temple wall fill
  b(ctx, ox, oy, 0, 0, G, G, c.fill);
  // Darker stone texture
  for (let gy = 0; gy < G; gy += 3) {
    for (let gx = (gy % 6 === 0 ? 0 : 2); gx < G; gx += 5) {
      p(ctx, ox, oy, gx, gy, c.fillDark);
    }
  }
  // Central fluted column shaft (4 pixels wide, full height)
  b(ctx, ox, oy, 5, 0, 4, G, c.column);
  // Fluting lines (vertical grooves in column)
  for (let gy = 2; gy < G - 2; gy++) {
    p(ctx, ox, oy, 5, gy, c.flute);
    p(ctx, ox, oy, 6, gy, c.columnLight);
    p(ctx, ox, oy, 7, gy, c.fluteLight);
    p(ctx, ox, oy, 8, gy, c.flute);
  }
  // Capital (top of column) — Ionic/Corinthian style
  if (!n) {
    b(ctx, ox, oy, 4, 0, 6, 1, c.capital);
    b(ctx, ox, oy, 3, 1, 8, 1, c.capitalBright);
    b(ctx, ox, oy, 4, 2, 6, 1, c.capitalDim);
    // Volute scrolls
    p(ctx, ox, oy, 3, 0, c.capitalBright); p(ctx, ox, oy, 10, 0, c.capitalBright);
    p(ctx, ox, oy, 2, 1, c.capital); p(ctx, ox, oy, 11, 1, c.capital);
  }
  // Column base (bottom)
  if (!s) {
    b(ctx, ox, oy, 4, G - 1, 6, 1, c.base);
    b(ctx, ox, oy, 3, G - 2, 8, 1, c.edgeLight);
    b(ctx, ox, oy, 4, G - 3, 6, 1, c.fillDark);
  }
  // Frieze band (decorative strip across connected walls)
  if (n || s) {
    // Horizontal architrave connecting to adjacent pillars
    b(ctx, ox, oy, 0, 3, G, 1, c.frieze);
    b(ctx, ox, oy, 0, 4, G, 1, c.friezeDetail);
    // Triglyph pattern in frieze
    for (let gx = 1; gx < G; gx += 4) {
      p(ctx, ox, oy, gx, 3, c.friezeDetail);
      p(ctx, ox, oy, gx, 4, c.frieze);
      p(ctx, ox, oy, gx + 1, 3, c.friezeDetail);
    }
  }
  // Side wall texture when connected horizontally
  if (w) {
    b(ctx, ox, oy, 0, 5, 5, 1, c.edgeLight);
    for (let gx = 0; gx < 5; gx += 2) p(ctx, ox, oy, gx, 6, c.fillDark);
  }
  if (e) {
    b(ctx, ox, oy, 9, 5, 5, 1, c.edgeLight);
    for (let gx = 9; gx < G; gx += 2) p(ctx, ox, oy, gx, 6, c.fillDark);
  }
  // Carved meander (Greek key) pattern on wall faces
  if (!w) {
    for (let gy = 3; gy < G - 2; gy += 3) {
      p(ctx, ox, oy, 1, gy, c.friezeDetail);
      p(ctx, ox, oy, 2, gy, c.frieze);
      p(ctx, ox, oy, 2, gy + 1, c.friezeDetail);
    }
  }
  if (!e) {
    for (let gy = 3; gy < G - 2; gy += 3) {
      p(ctx, ox, oy, G - 2, gy, c.friezeDetail);
      p(ctx, ox, oy, G - 3, gy, c.frieze);
      p(ctx, ox, oy, G - 3, gy + 1, c.friezeDetail);
    }
  }
  // Edges — exposed borders get a chiseled stone edge
  if (!n) { b(ctx, ox, oy, 0, 0, G, 1, c.edge); p(ctx, ox, oy, 6, 0, c.edgeLight); p(ctx, ox, oy, 7, 0, c.edgeLight); }
  if (!s) { b(ctx, ox, oy, 0, G - 1, G, 1, c.edge); p(ctx, ox, oy, 6, G - 1, c.edgeLight); }
  if (!w) { b(ctx, ox, oy, 0, 0, 1, G, c.edge); p(ctx, ox, oy, 0, 5, c.edgeLight); p(ctx, ox, oy, 0, 6, c.edgeLight); }
  if (!e) { b(ctx, ox, oy, G - 1, 0, 1, G, c.edge); p(ctx, ox, oy, G - 1, 5, c.edgeLight); }
  // Stone block lines when connected
  if (n) { for (let gx = 3; gx < G; gx += 5) p(ctx, ox, oy, gx, 0, c.fillDark); }
  if (s) { for (let gx = 3; gx < G; gx += 5) p(ctx, ox, oy, gx, G - 1, c.fillDark); }
  if (w) { for (let gy = 3; gy < G; gy += 5) p(ctx, ox, oy, 0, gy, c.fillDark); }
  if (e) { for (let gy = 3; gy < G; gy += 5) p(ctx, ox, oy, G - 1, gy, c.fillDark); }
  // Highlight on column
  p(ctx, ox, oy, 6, 5, c.columnLight);
  p(ctx, ox, oy, 6, 8, c.columnLight);
  p(ctx, ox, oy, 7, 6, c.fluteLight);
}

function drawDivine(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number, frame: number) {
  const c = PAL.divine;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  // Warm glowing base
  b(ctx, ox, oy, 0, 0, G, G, c.deep);
  // Radial glow gradient from center
  b(ctx, ox, oy, 3, 3, 8, 8, c.warmGlow);
  b(ctx, ox, oy, 4, 4, 6, 6, c.aura);
  b(ctx, ox, oy, 5, 5, 4, 4, c.auraDim);
  // Light beam columns — vertical shafts that pulse per frame
  const beamIntensity = frame; // 0=dim, 1=mid, 2=bright
  const beamColors = [c.beamDim, c.beam, c.beamBright];
  const beamColor = beamColors[beamIntensity];
  const beamAccent = beamIntensity === 2 ? c.spark : beamIntensity === 1 ? c.beamBright : c.beam;
  // Central beam
  b(ctx, ox, oy, 6, 0, 2, G, beamColor);
  // Side beams
  for (let gy = 0; gy < G; gy += 2) {
    p(ctx, ox, oy, 5, gy, c.auraDim);
    p(ctx, ox, oy, 8, gy, c.auraDim);
  }
  // Horizontal glow bands
  b(ctx, ox, oy, 3, 6, 8, 2, c.auraDim);
  // Floating halo ring (position shifts with frame)
  const haloY = 3 + frame;
  for (let a = 0; a < 12; a++) {
    const hx = 7 + Math.round(3 * Math.cos(a * Math.PI / 6));
    const hy = haloY + Math.round(1.5 * Math.sin(a * Math.PI / 6));
    if (hy >= 0 && hy < G) p(ctx, ox, oy, hx, hy, c.halo);
  }
  // Halo bright points
  p(ctx, ox, oy, 4, haloY, c.haloDim);
  p(ctx, ox, oy, 10, haloY, c.haloDim);
  p(ctx, ox, oy, 7, haloY - 1, beamAccent);
  // Sparkle particles — shift position per frame
  const s1x = (3 + frame * 4) % (G - 2) + 1;
  const s1y = (2 + frame * 3) % (G - 2) + 1;
  const s2x = (9 + frame * 3) % (G - 2) + 1;
  const s2y = (8 + frame * 5) % (G - 2) + 1;
  const s3x = (1 + frame * 5) % (G - 2) + 1;
  const s3y = (11 + frame * 2) % (G - 2) + 1;
  // 4-point star sparkles
  p(ctx, ox, oy, s1x, s1y, c.spark); p(ctx, ox, oy, s1x - 1, s1y, c.sparkDim); p(ctx, ox, oy, s1x + 1, s1y, c.sparkDim);
  p(ctx, ox, oy, s1x, s1y - 1, c.sparkDim); p(ctx, ox, oy, s1x, s1y + 1, c.sparkDim);
  p(ctx, ox, oy, s2x, s2y, c.spark); p(ctx, ox, oy, s2x - 1, s2y, c.sparkDim); p(ctx, ox, oy, s2x + 1, s2y, c.sparkDim);
  p(ctx, ox, oy, s3x, s3y, beamAccent);
  // Tiny cherub silhouette (frame 1 and 2 only — subtle)
  if (frame >= 1) {
    const chX = frame === 1 ? 2 : 10;
    const chY = frame === 1 ? 9 : 2;
    // Head
    p(ctx, ox, oy, chX, chY, c.angel);
    p(ctx, ox, oy, chX + 1, chY, c.angel);
    // Body
    p(ctx, ox, oy, chX, chY + 1, c.angelDim);
    p(ctx, ox, oy, chX + 1, chY + 1, c.angelDim);
    // Wings
    p(ctx, ox, oy, chX - 1, chY + 1, c.sparkDim);
    p(ctx, ox, oy, chX + 2, chY + 1, c.sparkDim);
    // Tiny harp (frame 2)
    if (frame === 2) {
      p(ctx, ox, oy, chX + 2, chY, c.halo);
    }
  }
  // Pulsing divine radiance ring on brighter frames
  if (beamIntensity >= 1) {
    for (let a = 0; a < 16; a++) {
      const rx = 7 + Math.round(5 * Math.cos(a * Math.PI / 8));
      const ry = 7 + Math.round(5 * Math.sin(a * Math.PI / 8));
      p(ctx, ox, oy, rx, ry, beamIntensity === 2 ? c.halo : c.haloDim);
    }
  }
  // Edges
  if (!n) { b(ctx, ox, oy, 0, 0, G, 1, c.edge); p(ctx, ox, oy, 6, 0, c.halo); p(ctx, ox, oy, 7, 0, c.halo); }
  if (!s) { b(ctx, ox, oy, 0, G - 1, G, 1, c.edge); p(ctx, ox, oy, 6, G - 1, c.halo); p(ctx, ox, oy, 7, G - 1, c.halo); }
  if (!w) { b(ctx, ox, oy, 0, 0, 1, G, c.edge); p(ctx, ox, oy, 0, 6, c.haloDim); }
  if (!e) { b(ctx, ox, oy, G - 1, 0, 1, G, c.edge); p(ctx, ox, oy, G - 1, 6, c.haloDim); }
  // Connected edges: golden glow bleeds through
  if (n) { for (let gx = 5; gx < 9; gx++) p(ctx, ox, oy, gx, 0, c.auraDim); }
  if (s) { for (let gx = 5; gx < 9; gx++) p(ctx, ox, oy, gx, G - 1, c.auraDim); }
  if (w) { for (let gy = 5; gy < 9; gy++) p(ctx, ox, oy, 0, gy, c.auraDim); }
  if (e) { for (let gy = 5; gy < 9; gy++) p(ctx, ox, oy, G - 1, gy, c.auraDim); }
}

function drawCloud(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.cloud;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  // Sky blue background peeking through
  b(ctx, ox, oy, 0, 0, G, G, c.skyBlue);
  // Main cloud body — layered rounded masses
  // Bottom golden-lit layer
  b(ctx, ox, oy, 1, 8, 12, 4, c.goldLit);
  b(ctx, ox, oy, 2, 7, 10, 5, c.goldHighlight);
  // Mid layer
  b(ctx, ox, oy, 1, 4, 12, 6, c.light);
  b(ctx, ox, oy, 2, 3, 10, 7, c.white);
  // Top fluffy layer
  b(ctx, ox, oy, 3, 2, 8, 4, c.bright);
  b(ctx, ox, oy, 4, 1, 6, 3, c.white);
  // Cloud puffs — rounded bumps on top
  p(ctx, ox, oy, 2, 3, c.bright); p(ctx, ox, oy, 11, 3, c.bright);
  p(ctx, ox, oy, 5, 1, c.bright); p(ctx, ox, oy, 8, 1, c.bright);
  p(ctx, ox, oy, 4, 2, c.bright); p(ctx, ox, oy, 9, 2, c.bright);
  // Shadow underneath for volume
  b(ctx, ox, oy, 2, 10, 10, 2, c.shadow);
  b(ctx, ox, oy, 3, 11, 8, 2, c.shadowDeep);
  // Wispy curls at edges
  p(ctx, ox, oy, 0, 5, c.wisp); p(ctx, ox, oy, 0, 6, c.wispLight);
  p(ctx, ox, oy, G - 1, 5, c.wisp); p(ctx, ox, oy, G - 1, 6, c.wispLight);
  p(ctx, ox, oy, 1, 3, c.wispLight); p(ctx, ox, oy, 12, 3, c.wispLight);
  // Golden light from below — warm highlights on bottom
  for (let gx = 3; gx < 11; gx++) {
    p(ctx, ox, oy, gx, 9, c.goldLit);
  }
  p(ctx, ox, oy, 5, 10, c.goldHighlight); p(ctx, ox, oy, 8, 10, c.goldHighlight);
  // Bright top highlights
  p(ctx, ox, oy, 5, 2, c.bright); p(ctx, ox, oy, 6, 1, c.bright); p(ctx, ox, oy, 7, 1, c.bright);
  // Internal cloud texture — subtle variations
  p(ctx, ox, oy, 4, 5, c.light); p(ctx, ox, oy, 9, 4, c.light);
  p(ctx, ox, oy, 6, 6, c.bright); p(ctx, ox, oy, 7, 5, c.bright);
  p(ctx, ox, oy, 3, 7, c.mid); p(ctx, ox, oy, 10, 7, c.mid);
  // Sky showing at corners
  p(ctx, ox, oy, 0, 0, c.skyBlue); p(ctx, ox, oy, 1, 0, c.skyBlue); p(ctx, ox, oy, 0, 1, c.skyBlue);
  p(ctx, ox, oy, G - 1, 0, c.skyBlue); p(ctx, ox, oy, G - 2, 0, c.skyBlue); p(ctx, ox, oy, G - 1, 1, c.skyBlue);
  p(ctx, ox, oy, 0, G - 1, c.skyBlue); p(ctx, ox, oy, 1, G - 1, c.skyBlue); p(ctx, ox, oy, 0, G - 2, c.skyBlue);
  p(ctx, ox, oy, G - 1, G - 1, c.skyBlue); p(ctx, ox, oy, G - 2, G - 1, c.skyBlue); p(ctx, ox, oy, G - 1, G - 2, c.skyBlue);
  // Sky patches in bottom shadow area
  p(ctx, ox, oy, 1, 12, c.skyLight); p(ctx, ox, oy, 12, 12, c.skyLight);
  // Connectivity — cloud merges with neighbors
  if (n) {
    b(ctx, ox, oy, 3, 0, 8, 2, c.white);
    p(ctx, ox, oy, 2, 0, c.light); p(ctx, ox, oy, 11, 0, c.light);
  }
  if (s) {
    b(ctx, ox, oy, 3, G - 2, 8, 2, c.shadow);
    b(ctx, ox, oy, 4, G - 1, 6, 1, c.shadowDeep);
    p(ctx, ox, oy, 5, G - 2, c.goldLit); p(ctx, ox, oy, 8, G - 2, c.goldLit);
  }
  if (w) {
    b(ctx, ox, oy, 0, 4, 2, 6, c.light);
    p(ctx, ox, oy, 0, 3, c.wisp); p(ctx, ox, oy, 0, 10, c.shadow);
  }
  if (e) {
    b(ctx, ox, oy, G - 2, 4, 2, 6, c.light);
    p(ctx, ox, oy, G - 1, 3, c.wisp); p(ctx, ox, oy, G - 1, 10, c.shadow);
  }
  // Exposed edge wisps
  if (!n) { p(ctx, ox, oy, 5, 0, c.skyLight); p(ctx, ox, oy, 8, 0, c.skyLight); }
  if (!s) { p(ctx, ox, oy, 5, G - 1, c.skyLight); p(ctx, ox, oy, 8, G - 1, c.skyLight); }
  if (!w) { p(ctx, ox, oy, 0, 7, c.wispLight); p(ctx, ox, oy, 0, 8, c.wisp); }
  if (!e) { p(ctx, ox, oy, G - 1, 7, c.wispLight); p(ctx, ox, oy, G - 1, 8, c.wisp); }
}

function drawDoodad(ctx: CanvasRenderingContext2D, ox: number, oy: number, type: number) {
  ctx.clearRect(ox, oy, T, T);
  const d = PAL.doodad;
  switch (type) {
    case 0: // Golden chalice
      // Cup bowl
      p(ctx, ox, oy, 5, 3, d.gold); p(ctx, ox, oy, 6, 3, d.goldBright); p(ctx, ox, oy, 7, 3, d.goldBright); p(ctx, ox, oy, 8, 3, d.gold);
      p(ctx, ox, oy, 5, 4, d.goldBright); p(ctx, ox, oy, 6, 4, d.white); p(ctx, ox, oy, 7, 4, d.goldBright); p(ctx, ox, oy, 8, 4, d.gold);
      p(ctx, ox, oy, 5, 5, d.gold); p(ctx, ox, oy, 6, 5, d.goldBright); p(ctx, ox, oy, 7, 5, d.gold); p(ctx, ox, oy, 8, 5, d.goldDim);
      p(ctx, ox, oy, 6, 6, d.gold); p(ctx, ox, oy, 7, 6, d.goldDim);
      // Stem
      p(ctx, ox, oy, 6, 7, d.goldDim); p(ctx, ox, oy, 7, 7, d.goldDim);
      p(ctx, ox, oy, 6, 8, d.gold); p(ctx, ox, oy, 7, 8, d.goldDim);
      // Base
      p(ctx, ox, oy, 5, 9, d.gold); p(ctx, ox, oy, 6, 9, d.goldBright); p(ctx, ox, oy, 7, 9, d.gold); p(ctx, ox, oy, 8, 9, d.goldDim);
      // Gleam
      p(ctx, ox, oy, 6, 3, d.white);
      break;
    case 1: // Olive branch
      // Main branch
      p(ctx, ox, oy, 3, 8, d.brown); p(ctx, ox, oy, 4, 7, d.brown); p(ctx, ox, oy, 5, 6, d.brown);
      p(ctx, ox, oy, 6, 5, d.brown); p(ctx, ox, oy, 7, 5, d.brown); p(ctx, ox, oy, 8, 4, d.brown);
      p(ctx, ox, oy, 9, 4, d.brown); p(ctx, ox, oy, 10, 3, d.brown);
      // Leaves
      p(ctx, ox, oy, 4, 6, d.green); p(ctx, ox, oy, 3, 6, d.greenDark);
      p(ctx, ox, oy, 6, 4, d.green); p(ctx, ox, oy, 5, 4, d.greenDark);
      p(ctx, ox, oy, 8, 3, d.green); p(ctx, ox, oy, 9, 3, d.greenDark);
      p(ctx, ox, oy, 7, 6, d.green); p(ctx, ox, oy, 8, 6, d.greenDark);
      p(ctx, ox, oy, 5, 7, d.green); p(ctx, ox, oy, 5, 8, d.greenDark);
      p(ctx, ox, oy, 10, 4, d.green); p(ctx, ox, oy, 11, 3, d.greenDark);
      break;
    case 2: // Harp
      // Frame - left curve
      p(ctx, ox, oy, 5, 2, d.gold); p(ctx, ox, oy, 4, 3, d.gold); p(ctx, ox, oy, 4, 4, d.goldBright);
      p(ctx, ox, oy, 4, 5, d.gold); p(ctx, ox, oy, 4, 6, d.gold); p(ctx, ox, oy, 4, 7, d.goldDim);
      p(ctx, ox, oy, 5, 8, d.gold);
      // Frame - top
      p(ctx, ox, oy, 6, 2, d.goldBright); p(ctx, ox, oy, 7, 2, d.goldBright); p(ctx, ox, oy, 8, 2, d.gold);
      // Frame - right pillar
      p(ctx, ox, oy, 9, 3, d.gold); p(ctx, ox, oy, 9, 4, d.gold); p(ctx, ox, oy, 9, 5, d.goldDim);
      p(ctx, ox, oy, 9, 6, d.goldDim); p(ctx, ox, oy, 9, 7, d.goldDim);
      // Frame - bottom
      p(ctx, ox, oy, 6, 8, d.gold); p(ctx, ox, oy, 7, 8, d.goldDim); p(ctx, ox, oy, 8, 8, d.goldDim);
      p(ctx, ox, oy, 9, 8, d.goldDim);
      // Strings
      p(ctx, ox, oy, 5, 3, d.white); p(ctx, ox, oy, 5, 4, d.cream); p(ctx, ox, oy, 5, 5, d.cream); p(ctx, ox, oy, 5, 6, d.cream); p(ctx, ox, oy, 5, 7, d.cream);
      p(ctx, ox, oy, 6, 3, d.white); p(ctx, ox, oy, 6, 4, d.cream); p(ctx, ox, oy, 6, 5, d.cream); p(ctx, ox, oy, 6, 6, d.cream); p(ctx, ox, oy, 6, 7, d.cream);
      p(ctx, ox, oy, 7, 3, d.cream); p(ctx, ox, oy, 7, 4, d.cream); p(ctx, ox, oy, 7, 5, d.cream); p(ctx, ox, oy, 7, 6, d.cream); p(ctx, ox, oy, 7, 7, d.cream);
      p(ctx, ox, oy, 8, 3, d.cream); p(ctx, ox, oy, 8, 4, d.cream); p(ctx, ox, oy, 8, 5, d.cream); p(ctx, ox, oy, 8, 6, d.cream); p(ctx, ox, oy, 8, 7, d.cream);
      // Gleam on frame
      p(ctx, ox, oy, 6, 2, d.white);
      break;
    case 3: // Marble bust
      // Head
      p(ctx, ox, oy, 6, 2, d.cream); p(ctx, ox, oy, 7, 2, d.cream);
      p(ctx, ox, oy, 5, 3, d.marble); p(ctx, ox, oy, 6, 3, d.white); p(ctx, ox, oy, 7, 3, d.cream); p(ctx, ox, oy, 8, 3, d.marble);
      p(ctx, ox, oy, 6, 4, d.cream); p(ctx, ox, oy, 7, 4, d.marble);
      // Hair
      p(ctx, ox, oy, 5, 2, d.shadow); p(ctx, ox, oy, 8, 2, d.shadow);
      p(ctx, ox, oy, 5, 1, d.shadow); p(ctx, ox, oy, 6, 1, d.shadow); p(ctx, ox, oy, 7, 1, d.shadow); p(ctx, ox, oy, 8, 1, d.shadow);
      // Neck
      p(ctx, ox, oy, 6, 5, d.marble); p(ctx, ox, oy, 7, 5, d.marble);
      // Shoulders/pedestal
      p(ctx, ox, oy, 5, 6, d.shadow); p(ctx, ox, oy, 6, 6, d.marble); p(ctx, ox, oy, 7, 6, d.marble); p(ctx, ox, oy, 8, 6, d.shadow);
      p(ctx, ox, oy, 4, 7, d.shadow); p(ctx, ox, oy, 5, 7, d.marble); p(ctx, ox, oy, 6, 7, d.cream); p(ctx, ox, oy, 7, 7, d.marble); p(ctx, ox, oy, 8, 7, d.marble); p(ctx, ox, oy, 9, 7, d.shadow);
      // Pedestal base
      b(ctx, ox, oy, 4, 8, 6, 1, d.shadow);
      p(ctx, ox, oy, 5, 9, d.shadow); p(ctx, ox, oy, 6, 9, d.shadow); p(ctx, ox, oy, 7, 9, d.shadow); p(ctx, ox, oy, 8, 9, d.shadow);
      break;
    case 4: // Laurel wreath
      // Left branch
      p(ctx, ox, oy, 4, 6, d.green); p(ctx, ox, oy, 3, 5, d.green); p(ctx, ox, oy, 3, 4, d.greenDark);
      p(ctx, ox, oy, 4, 3, d.green); p(ctx, ox, oy, 5, 2, d.green); p(ctx, ox, oy, 6, 2, d.greenDark);
      // Right branch
      p(ctx, ox, oy, 9, 6, d.green); p(ctx, ox, oy, 10, 5, d.green); p(ctx, ox, oy, 10, 4, d.greenDark);
      p(ctx, ox, oy, 9, 3, d.green); p(ctx, ox, oy, 8, 2, d.green); p(ctx, ox, oy, 7, 2, d.greenDark);
      // Leaves
      p(ctx, ox, oy, 2, 5, d.green); p(ctx, ox, oy, 2, 4, d.greenDark);
      p(ctx, ox, oy, 11, 5, d.green); p(ctx, ox, oy, 11, 4, d.greenDark);
      p(ctx, ox, oy, 3, 7, d.greenDark); p(ctx, ox, oy, 10, 7, d.greenDark);
      p(ctx, ox, oy, 4, 7, d.green); p(ctx, ox, oy, 9, 7, d.green);
      p(ctx, ox, oy, 5, 8, d.greenDark); p(ctx, ox, oy, 8, 8, d.greenDark);
      // Gold ribbon at bottom
      p(ctx, ox, oy, 6, 8, d.gold); p(ctx, ox, oy, 7, 8, d.goldBright);
      p(ctx, ox, oy, 6, 9, d.goldDim); p(ctx, ox, oy, 7, 9, d.gold);
      break;
    case 5: // Dove feather
      // Quill shaft
      p(ctx, ox, oy, 7, 2, d.cream); p(ctx, ox, oy, 7, 3, d.white); p(ctx, ox, oy, 7, 4, d.white);
      p(ctx, ox, oy, 7, 5, d.white); p(ctx, ox, oy, 7, 6, d.cream); p(ctx, ox, oy, 7, 7, d.cream);
      p(ctx, ox, oy, 7, 8, d.cream); p(ctx, ox, oy, 7, 9, d.marble); p(ctx, ox, oy, 7, 10, d.shadow);
      // Left barbs
      p(ctx, ox, oy, 5, 3, d.white); p(ctx, ox, oy, 6, 3, d.white);
      p(ctx, ox, oy, 4, 4, d.cream); p(ctx, ox, oy, 5, 4, d.white); p(ctx, ox, oy, 6, 4, d.white);
      p(ctx, ox, oy, 5, 5, d.cream); p(ctx, ox, oy, 6, 5, d.white);
      p(ctx, ox, oy, 5, 6, d.cream); p(ctx, ox, oy, 6, 6, d.cream);
      p(ctx, ox, oy, 6, 7, d.cream);
      // Right barbs
      p(ctx, ox, oy, 8, 3, d.white); p(ctx, ox, oy, 9, 3, d.cream);
      p(ctx, ox, oy, 8, 4, d.white); p(ctx, ox, oy, 9, 4, d.cream); p(ctx, ox, oy, 10, 4, d.marble);
      p(ctx, ox, oy, 8, 5, d.white); p(ctx, ox, oy, 9, 5, d.cream);
      p(ctx, ox, oy, 8, 6, d.cream); p(ctx, ox, oy, 9, 6, d.marble);
      p(ctx, ox, oy, 8, 7, d.cream);
      // Quill tip highlight
      p(ctx, ox, oy, 7, 2, d.white);
      break;
    case 6: // Floating halo ring
      // Outer ring — elliptical
      p(ctx, ox, oy, 5, 4, d.goldBright); p(ctx, ox, oy, 6, 3, d.goldBright); p(ctx, ox, oy, 7, 3, d.goldBright); p(ctx, ox, oy, 8, 3, d.gold);
      p(ctx, ox, oy, 9, 4, d.gold); p(ctx, ox, oy, 10, 5, d.goldDim);
      p(ctx, ox, oy, 10, 6, d.goldDim); p(ctx, ox, oy, 9, 7, d.goldDim);
      p(ctx, ox, oy, 8, 8, d.gold); p(ctx, ox, oy, 7, 8, d.gold); p(ctx, ox, oy, 6, 8, d.goldBright); p(ctx, ox, oy, 5, 8, d.goldBright);
      p(ctx, ox, oy, 4, 7, d.goldBright); p(ctx, ox, oy, 3, 6, d.goldBright);
      p(ctx, ox, oy, 3, 5, d.goldBright); p(ctx, ox, oy, 4, 4, d.goldBright);
      // Inner glow
      p(ctx, ox, oy, 6, 5, d.white); p(ctx, ox, oy, 7, 5, d.white);
      p(ctx, ox, oy, 6, 6, d.cream); p(ctx, ox, oy, 7, 6, d.cream);
      // Gleam highlight
      p(ctx, ox, oy, 6, 3, d.white); p(ctx, ox, oy, 5, 4, d.white);
      // Floating sparkle above
      p(ctx, ox, oy, 7, 1, d.white);
      break;
    case 7: // Holy scroll
      // Scroll body
      b(ctx, ox, oy, 4, 3, 6, 7, d.cream);
      b(ctx, ox, oy, 5, 4, 4, 5, d.white);
      // Top roll
      p(ctx, ox, oy, 3, 3, d.marble); p(ctx, ox, oy, 4, 2, d.cream); p(ctx, ox, oy, 5, 2, d.white);
      p(ctx, ox, oy, 6, 2, d.white); p(ctx, ox, oy, 7, 2, d.cream); p(ctx, ox, oy, 8, 2, d.cream);
      p(ctx, ox, oy, 9, 2, d.marble); p(ctx, ox, oy, 10, 3, d.marble);
      p(ctx, ox, oy, 3, 4, d.shadow); p(ctx, ox, oy, 10, 4, d.shadow);
      // Bottom roll
      p(ctx, ox, oy, 3, 10, d.marble); p(ctx, ox, oy, 4, 10, d.cream); p(ctx, ox, oy, 5, 10, d.white);
      p(ctx, ox, oy, 6, 10, d.white); p(ctx, ox, oy, 7, 10, d.cream); p(ctx, ox, oy, 8, 10, d.cream);
      p(ctx, ox, oy, 9, 10, d.marble); p(ctx, ox, oy, 10, 10, d.marble);
      p(ctx, ox, oy, 3, 9, d.shadow); p(ctx, ox, oy, 10, 9, d.shadow);
      // Text lines (gold ink)
      b(ctx, ox, oy, 5, 5, 3, 1, d.goldDim);
      b(ctx, ox, oy, 5, 6, 4, 1, d.goldDim);
      b(ctx, ox, oy, 5, 7, 2, 1, d.goldDim);
      b(ctx, ox, oy, 5, 8, 3, 1, d.goldDim);
      // Gold seal
      p(ctx, ox, oy, 8, 7, d.gold); p(ctx, ox, oy, 8, 8, d.goldBright);
      break;
  }
}

export default function CelestialTerrainSprites() {
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
      drawPillar(tCtx, ox, 1 * T, v);
      for (let f = 0; f < 3; f++) {
        drawDivine(tCtx, ox, (2 + f) * T, v, f);
      }
      drawCloud(tCtx, ox, 5 * T, v);
    }

    const tp = terrainPreviewRef.current!;
    const scale = 3;
    tp.width = VARIANTS * T * scale + 140;
    tp.height = TERRAIN_ROWS * T * scale + 40;
    const tpCtx = tp.getContext('2d')!;
    tpCtx.imageSmoothingEnabled = false;
    tpCtx.fillStyle = '#88bbee';
    tpCtx.fillRect(0, 0, tp.width, tp.height);
    tpCtx.drawImage(tc, 140, 20, tc.width * scale, tc.height * scale);
    tpCtx.fillStyle = '#2a3050';
    tpCtx.font = '11px monospace';
    const rowLabels = ['Marble Floor', 'Temple Pillars', 'Divine Light 0', 'Divine Light 1', 'Divine Light 2', 'Cloud (NoBuild)'];
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
    dpCtx.fillStyle = '#88bbee';
    dpCtx.fillRect(0, 0, dp.width, dp.height);
    dpCtx.drawImage(dc, 80, 20, dc.width * dScale, dc.height * dScale);
    dpCtx.fillStyle = '#2a3050';
    dpCtx.font = '11px monospace';
    dpCtx.fillText('Celestial', 4, 20 + T * dScale / 2 + 4);

    setReady(true);
  }, []);

  const download = (ref: React.RefObject<HTMLCanvasElement | null>, name: string) => {
    const a = document.createElement('a');
    a.download = name;
    a.href = ref.current!.toDataURL('image/png');
    a.click();
  };

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', color: '#2a3050', background: '#d0e0f0' }}>
      <h2 data-label="Celestial Terrain">Celestial Terrain Sprites — Sky Citadel</h2>
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setView('preview')} style={{ marginRight: 8, background: view === 'preview' ? '#c8a848' : '#eee8d8', color: view === 'preview' ? '#fff' : '#2a3050', border: '1px solid #c8a848', padding: '4px 12px', cursor: 'pointer' }}>Preview (3x)</button>
        <button onClick={() => setView('actual')} style={{ marginRight: 8, background: view === 'actual' ? '#c8a848' : '#eee8d8', color: view === 'actual' ? '#fff' : '#2a3050', border: '1px solid #c8a848', padding: '4px 12px', cursor: 'pointer' }}>Actual Size</button>
        {ready && (
          <>
            <button onClick={() => download(terrainRef, 'celestial_terrain_tileset.png')} style={{ marginRight: 8, background: '#eee8d8', color: '#2a3050', border: '1px solid #c8a848', padding: '4px 12px', cursor: 'pointer' }}>Download Tileset</button>
            <button onClick={() => download(doodadRef, 'celestial_terrain_doodads.png')} style={{ background: '#eee8d8', color: '#2a3050', border: '1px solid #c8a848', padding: '4px 12px', cursor: 'pointer' }}>Download Doodads</button>
          </>
        )}
      </div>
      <p style={{ fontSize: '12px', color: '#667788' }} data-frame-size="28x28">Frame size: 28x28 | PX=2 | Grid=14x14 | 16 cols (NESW bitmask) x 6 rows</p>
      <h3 data-label="Celestial Terrain (Preview)">Terrain Tileset (16 auto-tile variants x 6 rows)</h3>
      <canvas ref={terrainPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #c8a84833' }} />
      <canvas ref={terrainRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #c8a84833' }} />
      <h3>Celestial Doodads (8 types)</h3>
      <canvas ref={doodadPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #c8a84833' }} />
      <canvas ref={doodadRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #c8a84833' }} />
    </div>
  );
}
