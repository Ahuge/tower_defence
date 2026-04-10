/**
 * Harmonic Terrain Sprite Generator — Concert Hall terrain.
 *
 * Layout:
 *   Columns: 16 (auto-tile bitmask variants, bits = NESW)
 *   Row order:
 *   0: polished wood floor (ground)
 *   1: seating/walls (blocked type 1)
 *   2: resonance frame 0 (blocked type 2)
 *   3: resonance frame 1 (blocked type 2, animated)
 *   4: resonance frame 2 (blocked type 2, animated)
 *   5: orchestra pit (NoBuild terrain)
 *
 * Doodads row 0: 8 types
 *   0: music note, 1: microphone, 2: vinyl record, 3: conductor's baton,
 *   4: trumpet, 5: sheet music, 6: spotlight, 7: acoustic speaker
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
    base: '#3a2a1a',
    baseDark: '#2e2214',
    plank1: '#42301c',
    plank2: '#3e2c18',
    plank3: '#362616',
    grain: '#4a3822',
    grainFine: '#3d2e1a',
    grainHighlight: '#523e28',
    knot: '#2a1e10',
    knotRing: '#332614',
    spotlight: '#5a4830',
    spotlightBright: '#6a5838',
    spotlightSoft: '#4e3e26',
    markingTape: '#887040',
    markingDim: '#6a5832',
    gap: '#1e1608',
    varnish: '#4e3c24',
  },
  seat: {
    velvetDeep: '#6a1818',
    velvetMid: '#882222',
    velvetLight: '#993030',
    velvetHighlight: '#aa3838',
    velvetShadow: '#4a1010',
    cushionCrease: '#7a1e1e',
    backrest: '#551414',
    backrestTop: '#601818',
    armrest: '#cc9933',
    armrestDark: '#aa7722',
    armrestHighlight: '#ddbb44',
    frame: '#332222',
    frameDark: '#221414',
    frameLight: '#442828',
    number: '#cc9944',
    numberDim: '#997733',
    seatBase: '#3a0e0e',
    edgeTrim: '#bb8833',
    edgeTrimDim: '#996622',
    hinge: '#887744',
  },
  resonance: {
    stage: '#1e1608',
    stagePlank: '#281e10',
    stageGrain: '#221a0c',
    waveOuter: '#ffcc44',
    waveMid: '#ddaa33',
    waveInner: '#ffdd66',
    waveDim: '#aa8822',
    waveFaint: '#665520',
    noteGold: '#ffcc44',
    noteDim: '#ddaa33',
    eqBar: '#ffbb22',
    eqBarMid: '#dd9922',
    eqBarDim: '#aa7718',
    glowSoft: '#3a2e10',
    glowBright: '#4a3a18',
    sparkle: '#ffeedd',
    edge: '#332810',
    edgeDark: '#1a1208',
  },
  noBuild: {
    base: '#0e0a14',
    baseMid: '#141020',
    floor: '#181228',
    floorTile: '#1a1430',
    spotlight: '#2a2244',
    spotlightBright: '#3a3060',
    spotlightCore: '#4a4070',
    piano: '#eeeeee',
    pianoBlack: '#222222',
    pianoDark: '#cccccc',
    violin: '#8a6633',
    violinDark: '#6a4e22',
    violinString: '#ccaa66',
    drum: '#aa6633',
    drumHead: '#ddbb88',
    drumRim: '#cc9955',
    mic: '#999999',
    micHead: '#bbbbbb',
    micStand: '#666666',
    rail: '#444466',
    railLight: '#555577',
    edgeShadow: '#0a0610',
    ledge: '#222244',
    ledgeLight: '#333355',
  },
  doodad: {
    gold: '#ddaa44',
    goldBright: '#ffcc55',
    goldDark: '#aa7722',
    white: '#eeddcc',
    cream: '#ddccbb',
    dark: '#221a10',
    darkest: '#110e08',
    blue: '#44aaff',
    blueDim: '#3388cc',
    red: '#cc3333',
    redDark: '#992222',
    wood: '#885533',
    woodLight: '#996644',
    woodDark: '#664422',
    brass: '#ccaa44',
    brassBright: '#ddbb55',
    brassDark: '#aa8833',
    black: '#1a1420',
    silver: '#aaaaaa',
    silverLight: '#cccccc',
    silverDark: '#777777',
    vinyl: '#222222',
    vinylGroove: '#333333',
    vinylLabel: '#cc4444',
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

/* --- hash for deterministic variation per tile column --- */
function hash(a: number, b2: number): number {
  return ((a * 2654435761 + b2 * 340573321) >>> 0) % 100;
}

function drawGround(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  const c = PAL.ground;

  // Base fill
  b(ctx, ox, oy, 0, 0, G, G, c.base);

  // Individual planks with alternating shades (horizontal boards)
  const plankColors = [c.plank1, c.plank2, c.plank3, c.plank1, c.plank2];
  const plankYs = [0, 3, 6, 9, 12];
  for (let pi = 0; pi < 5; pi++) {
    const py = plankYs[pi];
    const ph = pi < 4 ? 3 : 2;
    b(ctx, ox, oy, 0, py, G, ph, plankColors[pi]);
  }

  // Plank gaps (dark lines between boards)
  for (const gy of [2, 5, 8, 11]) {
    for (let gx = 0; gx < G; gx++) {
      p(ctx, ox, oy, gx, gy, c.gap);
    }
  }

  // Wood grain lines within each plank
  for (let gy = 0; gy < G; gy++) {
    if (gy === 2 || gy === 5 || gy === 8 || gy === 11) continue; // skip gaps
    for (let gx = 0; gx < G; gx++) {
      const h = hash(gx, gy);
      if (h < 15) p(ctx, ox, oy, gx, gy, c.grain);
      else if (h < 22) p(ctx, ox, oy, gx, gy, c.grainFine);
      else if (h < 26) p(ctx, ox, oy, gx, gy, c.grainHighlight);
    }
  }

  // Longer grain streaks (2-3px horizontal lines)
  p(ctx, ox, oy, 2, 1, c.grain); p(ctx, ox, oy, 3, 1, c.grain); p(ctx, ox, oy, 4, 1, c.grain);
  p(ctx, ox, oy, 8, 0, c.grainHighlight); p(ctx, ox, oy, 9, 0, c.grainHighlight);
  p(ctx, ox, oy, 1, 4, c.grain); p(ctx, ox, oy, 2, 4, c.grain);
  p(ctx, ox, oy, 10, 3, c.grainHighlight); p(ctx, ox, oy, 11, 3, c.grainHighlight); p(ctx, ox, oy, 12, 3, c.grainHighlight);
  p(ctx, ox, oy, 5, 7, c.grain); p(ctx, ox, oy, 6, 7, c.grain); p(ctx, ox, oy, 7, 7, c.grain);
  p(ctx, ox, oy, 0, 10, c.grainHighlight); p(ctx, ox, oy, 1, 10, c.grainHighlight);
  p(ctx, ox, oy, 9, 9, c.grain); p(ctx, ox, oy, 10, 9, c.grain);
  p(ctx, ox, oy, 3, 13, c.grain); p(ctx, ox, oy, 4, 13, c.grain); p(ctx, ox, oy, 5, 13, c.grain);
  p(ctx, ox, oy, 11, 12, c.grainHighlight); p(ctx, ox, oy, 12, 12, c.grainHighlight);

  // Wood knots
  p(ctx, ox, oy, 10, 4, c.knot);
  p(ctx, ox, oy, 9, 3, c.knotRing); p(ctx, ox, oy, 11, 3, c.knotRing);
  p(ctx, ox, oy, 9, 4, c.knotRing); p(ctx, ox, oy, 11, 4, c.knotRing);
  p(ctx, ox, oy, 4, 10, c.knot);
  p(ctx, ox, oy, 3, 10, c.knotRing); p(ctx, ox, oy, 5, 10, c.knotRing);

  // Spotlight reflection (soft warm glow, center-ish)
  p(ctx, ox, oy, 6, 6, c.spotlightSoft); p(ctx, ox, oy, 7, 6, c.spotlightSoft);
  p(ctx, ox, oy, 6, 7, c.spotlight); p(ctx, ox, oy, 7, 7, c.spotlightBright);
  p(ctx, ox, oy, 8, 7, c.spotlight); p(ctx, ox, oy, 5, 7, c.spotlightSoft);
  p(ctx, ox, oy, 7, 8, c.spotlightSoft);

  // Stage marking tape (subtle line near bottom)
  p(ctx, ox, oy, 2, 12, c.markingDim); p(ctx, ox, oy, 3, 12, c.markingTape);
  p(ctx, ox, oy, 4, 12, c.markingTape); p(ctx, ox, oy, 5, 12, c.markingDim);

  // Varnish sheen (top-left highlight)
  p(ctx, ox, oy, 0, 0, c.varnish); p(ctx, ox, oy, 1, 0, c.varnish);
  p(ctx, ox, oy, 0, 1, c.varnish);

  // Subtle tile border
  ctx.strokeStyle = c.gap;
  ctx.globalAlpha = 0.15;
  ctx.strokeRect(ox, oy, T, T);
  ctx.globalAlpha = 1;
}

function drawSeat(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.seat;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);

  // Floor beneath seats
  b(ctx, ox, oy, 0, 0, G, G, c.frameDark);

  // Seat frame / structure
  b(ctx, ox, oy, 0, 0, G, G, c.frame);
  b(ctx, ox, oy, 1, 1, G - 2, G - 2, c.frameLight);

  // Backrest (top portion of seat, viewed from above)
  b(ctx, ox, oy, 2, 1, 10, 3, c.backrest);
  b(ctx, ox, oy, 3, 1, 8, 2, c.backrestTop);
  // Backrest stitching line
  for (let gx = 3; gx <= 10; gx += 2) {
    p(ctx, ox, oy, gx, 2, c.velvetShadow);
  }

  // Seat cushion (main velvet area)
  b(ctx, ox, oy, 2, 4, 10, 7, c.velvetDeep);
  b(ctx, ox, oy, 3, 5, 8, 5, c.velvetMid);
  b(ctx, ox, oy, 4, 6, 6, 3, c.velvetLight);
  // Cushion highlight (center shine)
  p(ctx, ox, oy, 6, 6, c.velvetHighlight); p(ctx, ox, oy, 7, 6, c.velvetHighlight);
  p(ctx, ox, oy, 6, 7, c.velvetHighlight); p(ctx, ox, oy, 7, 7, c.velvetLight);
  // Cushion crease lines
  p(ctx, ox, oy, 3, 7, c.cushionCrease); p(ctx, ox, oy, 10, 7, c.cushionCrease);
  p(ctx, ox, oy, 4, 5, c.cushionCrease); p(ctx, ox, oy, 9, 5, c.cushionCrease);
  // Cushion shadow at bottom
  b(ctx, ox, oy, 2, 10, 10, 1, c.velvetShadow);
  b(ctx, ox, oy, 3, 9, 8, 1, c.velvetDeep);

  // Left armrest
  b(ctx, ox, oy, 1, 2, 1, 9, c.armrestDark);
  p(ctx, ox, oy, 1, 2, c.armrestHighlight);
  p(ctx, ox, oy, 1, 3, c.armrest);
  p(ctx, ox, oy, 1, 5, c.armrest);
  p(ctx, ox, oy, 1, 7, c.armrest);
  p(ctx, ox, oy, 1, 10, c.armrestHighlight);
  // Right armrest
  b(ctx, ox, oy, 12, 2, 1, 9, c.armrestDark);
  p(ctx, ox, oy, 12, 2, c.armrestHighlight);
  p(ctx, ox, oy, 12, 3, c.armrest);
  p(ctx, ox, oy, 12, 5, c.armrest);
  p(ctx, ox, oy, 12, 7, c.armrest);
  p(ctx, ox, oy, 12, 10, c.armrestHighlight);

  // Armrest caps (decorative ends)
  p(ctx, ox, oy, 1, 1, c.armrest); p(ctx, ox, oy, 12, 1, c.armrest);
  p(ctx, ox, oy, 1, 11, c.armrest); p(ctx, ox, oy, 12, 11, c.armrest);

  // Seat number (small gold detail in center of backrest)
  p(ctx, ox, oy, 6, 1, c.number); p(ctx, ox, oy, 7, 1, c.numberDim);

  // Hinge details at bottom
  p(ctx, ox, oy, 4, 11, c.hinge); p(ctx, ox, oy, 9, 11, c.hinge);

  // Seat base/foot
  b(ctx, ox, oy, 2, 11, 10, 2, c.seatBase);
  b(ctx, ox, oy, 3, 12, 8, 1, c.frameDark);

  // Auto-tile edges — when exposed, show ornate trim
  if (!n) {
    b(ctx, ox, oy, 0, 0, G, 1, c.edgeTrim);
    p(ctx, ox, oy, 3, 0, c.edgeTrimDim); p(ctx, ox, oy, 6, 0, c.armrestHighlight);
    p(ctx, ox, oy, 9, 0, c.edgeTrimDim); p(ctx, ox, oy, 12, 0, c.armrestHighlight);
  }
  if (!s) {
    b(ctx, ox, oy, 0, G - 1, G, 1, c.edgeTrim);
    p(ctx, ox, oy, 2, G - 1, c.armrestHighlight); p(ctx, ox, oy, 7, G - 1, c.edgeTrimDim);
    p(ctx, ox, oy, 11, G - 1, c.armrestHighlight);
  }
  if (!w) {
    b(ctx, ox, oy, 0, 0, 1, G, c.edgeTrim);
    p(ctx, ox, oy, 0, 3, c.armrestHighlight); p(ctx, ox, oy, 0, 7, c.edgeTrimDim);
    p(ctx, ox, oy, 0, 10, c.armrestHighlight);
  }
  if (!e) {
    b(ctx, ox, oy, G - 1, 0, 1, G, c.edgeTrim);
    p(ctx, ox, oy, G - 1, 2, c.armrestHighlight); p(ctx, ox, oy, G - 1, 6, c.edgeTrimDim);
    p(ctx, ox, oy, G - 1, 11, c.armrestHighlight);
  }

  // Continuous connection hints when neighbors exist
  if (n) {
    for (let px = 3; px < G - 2; px += 3) p(ctx, ox, oy, px, 0, c.armrestDark);
    p(ctx, ox, oy, 1, 0, c.armrestDark); p(ctx, ox, oy, 12, 0, c.armrestDark);
  }
  if (s) {
    for (let px = 3; px < G - 2; px += 3) p(ctx, ox, oy, px, G - 1, c.armrestDark);
    p(ctx, ox, oy, 1, G - 1, c.armrestDark); p(ctx, ox, oy, 12, G - 1, c.armrestDark);
  }
  if (w) {
    for (let py = 3; py < G - 2; py += 3) p(ctx, ox, oy, 0, py, c.armrestDark);
  }
  if (e) {
    for (let py = 3; py < G - 2; py += 3) p(ctx, ox, oy, G - 1, py, c.armrestDark);
  }
}

function drawResonance(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number, frame: number) {
  const c = PAL.resonance;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);

  // Dark stage floor base
  b(ctx, ox, oy, 0, 0, G, G, c.stage);

  // Stage floor planks
  for (let gy = 0; gy < G; gy += 3) {
    b(ctx, ox, oy, 0, gy, G, 1, c.stagePlank);
  }
  // Subtle grain
  for (let gy = 0; gy < G; gy++) {
    for (let gx = 0; gx < G; gx++) {
      if (hash(gx + frame, gy) < 8) p(ctx, ox, oy, gx, gy, c.stageGrain);
    }
  }

  // Warm glow on floor from music energy
  b(ctx, ox, oy, 4, 4, 6, 6, c.glowSoft);
  b(ctx, ox, oy, 5, 5, 4, 4, c.glowBright);

  const cx = 7, cy = 7;

  // === EQUALIZER BARS (bottom half, animated) ===
  const eqX = 1;
  const barHeights0 = [3, 5, 7, 4, 6, 8, 5, 3, 6, 4, 7, 2];
  const barHeights1 = [5, 7, 4, 6, 8, 5, 3, 6, 4, 7, 3, 5];
  const barHeights2 = [4, 3, 6, 8, 5, 3, 7, 4, 8, 5, 6, 4];
  const bars = frame === 0 ? barHeights0 : frame === 1 ? barHeights1 : barHeights2;
  for (let i = 0; i < 12; i++) {
    const bx = eqX + i;
    const bh = Math.min(bars[i], 8);
    const by = 13 - bh;
    for (let j = 0; j < bh; j++) {
      const ratio = j / bh;
      const col = ratio > 0.7 ? c.waveOuter : ratio > 0.4 ? c.eqBar : c.eqBarMid;
      p(ctx, ox, oy, bx, by + j, col);
    }
    // Bright cap on each bar
    p(ctx, ox, oy, bx, by, c.waveInner);
  }

  // === SOUND WAVE RINGS expanding from center ===
  const ringR = 2 + frame * 2;
  for (let a = 0; a < 24; a++) {
    const angle = a * Math.PI / 12;
    const rx = cx + Math.round(ringR * Math.cos(angle));
    const ry = cy + Math.round(ringR * Math.sin(angle));
    if (rx >= 0 && rx < G && ry >= 0 && ry < G) {
      p(ctx, ox, oy, rx, ry, c.waveMid);
    }
  }
  // Inner ring
  const innerR = Math.max(1, ringR - 2);
  for (let a = 0; a < 16; a++) {
    const angle = a * Math.PI / 8;
    const rx = cx + Math.round(innerR * Math.cos(angle));
    const ry = cy + Math.round(innerR * Math.sin(angle));
    if (rx >= 0 && rx < G && ry >= 0 && ry < G) {
      p(ctx, ox, oy, rx, ry, c.waveOuter);
    }
  }

  // Center source (glowing core)
  p(ctx, ox, oy, 6, 6, c.waveOuter); p(ctx, ox, oy, 7, 6, c.waveInner);
  p(ctx, ox, oy, 6, 7, c.waveInner); p(ctx, ox, oy, 7, 7, c.waveOuter);

  // === FLOATING MUSICAL NOTES ===
  // Note 1 (shifts position per frame)
  const n1x = (2 + frame * 3) % 12 + 1;
  const n1y = (1 + frame * 2) % 5 + 1;
  p(ctx, ox, oy, n1x, n1y, c.noteGold);
  p(ctx, ox, oy, n1x, n1y + 1, c.noteGold);
  p(ctx, ox, oy, n1x - 1, n1y + 1, c.noteDim);

  // Note 2 (opposite movement)
  const n2x = (11 - frame * 2) % 12 + 1;
  const n2y = (3 + frame * 3) % 6 + 1;
  p(ctx, ox, oy, n2x, n2y, c.noteDim);
  p(ctx, ox, oy, n2x, n2y + 1, c.noteGold);
  p(ctx, ox, oy, n2x + 1, n2y + 1, c.noteDim);

  // Sparkle accents (change position per frame)
  p(ctx, ox, oy, (3 + frame * 5) % G, (2 + frame * 3) % G, c.sparkle);
  p(ctx, ox, oy, (10 - frame * 2) % G, (11 - frame * 4) % G, c.sparkle);
  p(ctx, ox, oy, (1 + frame * 4) % G, (9 + frame) % G, c.sparkle);

  // === EDGES ===
  if (!n) {
    b(ctx, ox, oy, 0, 0, G, 1, c.edgeDark);
    for (let gx = 1; gx < G; gx += 2) p(ctx, ox, oy, gx, 0, c.waveDim);
  }
  if (!s) {
    b(ctx, ox, oy, 0, G - 1, G, 1, c.edgeDark);
    for (let gx = 0; gx < G; gx += 2) p(ctx, ox, oy, gx, G - 1, c.waveDim);
  }
  if (!w) {
    b(ctx, ox, oy, 0, 0, 1, G, c.edgeDark);
    for (let gy = 1; gy < G; gy += 2) p(ctx, ox, oy, 0, gy, c.waveDim);
  }
  if (!e) {
    b(ctx, ox, oy, G - 1, 0, 1, G, c.edgeDark);
    for (let gy = 0; gy < G; gy += 2) p(ctx, ox, oy, G - 1, gy, c.waveDim);
  }

  // Golden glow on edges when connected
  if (n) { p(ctx, ox, oy, 6, 0, c.waveFaint); p(ctx, ox, oy, 7, 0, c.waveFaint); }
  if (s) { p(ctx, ox, oy, 6, G - 1, c.waveFaint); p(ctx, ox, oy, 7, G - 1, c.waveFaint); }
  if (w) { p(ctx, ox, oy, 0, 6, c.waveFaint); p(ctx, ox, oy, 0, 7, c.waveFaint); }
  if (e) { p(ctx, ox, oy, G - 1, 6, c.waveFaint); p(ctx, ox, oy, G - 1, 7, c.waveFaint); }
}

function drawNoBuild(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.noBuild;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);

  // Sunken dark floor
  b(ctx, ox, oy, 0, 0, G, G, c.base);
  b(ctx, ox, oy, 1, 1, G - 2, G - 2, c.baseMid);
  b(ctx, ox, oy, 2, 2, G - 4, G - 4, c.floor);

  // Floor tile pattern (subtle checkered)
  for (let gy = 2; gy < G - 2; gy++) {
    for (let gx = 2; gx < G - 2; gx++) {
      if ((gx + gy) % 3 === 0) p(ctx, ox, oy, gx, gy, c.floorTile);
    }
  }

  // Spotlight pool (warm light from above)
  p(ctx, ox, oy, 5, 5, c.spotlight); p(ctx, ox, oy, 6, 5, c.spotlightBright);
  p(ctx, ox, oy, 7, 5, c.spotlight); p(ctx, ox, oy, 8, 5, c.spotlight);
  p(ctx, ox, oy, 5, 6, c.spotlightBright); p(ctx, ox, oy, 6, 6, c.spotlightCore);
  p(ctx, ox, oy, 7, 6, c.spotlightCore); p(ctx, ox, oy, 8, 6, c.spotlightBright);
  p(ctx, ox, oy, 5, 7, c.spotlight); p(ctx, ox, oy, 6, 7, c.spotlightBright);
  p(ctx, ox, oy, 7, 7, c.spotlightBright); p(ctx, ox, oy, 8, 7, c.spotlight);
  p(ctx, ox, oy, 6, 8, c.spotlight); p(ctx, ox, oy, 7, 8, c.spotlight);

  // === PIANO KEYS (top-left area) ===
  // White keys
  b(ctx, ox, oy, 2, 2, 5, 2, c.piano);
  // Black keys
  p(ctx, ox, oy, 3, 2, c.pianoBlack);
  p(ctx, ox, oy, 5, 2, c.pianoBlack);
  // Key shadows
  p(ctx, ox, oy, 2, 3, c.pianoDark); p(ctx, ox, oy, 4, 3, c.pianoDark); p(ctx, ox, oy, 6, 3, c.pianoDark);

  // === VIOLIN (right side) ===
  // Body shape
  p(ctx, ox, oy, 10, 2, c.violin); p(ctx, ox, oy, 11, 2, c.violin);
  p(ctx, ox, oy, 9, 3, c.violin); p(ctx, ox, oy, 10, 3, c.violinDark); p(ctx, ox, oy, 11, 3, c.violin);
  p(ctx, ox, oy, 10, 4, c.violin); p(ctx, ox, oy, 11, 4, c.violin);
  p(ctx, ox, oy, 9, 5, c.violin); p(ctx, ox, oy, 10, 5, c.violinDark); p(ctx, ox, oy, 11, 5, c.violin);
  p(ctx, ox, oy, 10, 6, c.violin); p(ctx, ox, oy, 11, 6, c.violin);
  // Strings
  p(ctx, ox, oy, 10, 3, c.violinString); p(ctx, ox, oy, 10, 5, c.violinString);
  // Neck
  p(ctx, ox, oy, 10, 1, c.violinDark);

  // === DRUM (bottom-left) ===
  // Drum body (circular from above)
  p(ctx, ox, oy, 3, 9, c.drumRim); p(ctx, ox, oy, 4, 9, c.drumRim);
  p(ctx, ox, oy, 2, 10, c.drumRim); p(ctx, ox, oy, 3, 10, c.drumHead);
  p(ctx, ox, oy, 4, 10, c.drumHead); p(ctx, ox, oy, 5, 10, c.drumRim);
  p(ctx, ox, oy, 2, 11, c.drumRim); p(ctx, ox, oy, 3, 11, c.drumHead);
  p(ctx, ox, oy, 4, 11, c.drumHead); p(ctx, ox, oy, 5, 11, c.drumRim);
  p(ctx, ox, oy, 3, 12, c.drum); p(ctx, ox, oy, 4, 12, c.drum);
  // Drumstick crossing
  p(ctx, ox, oy, 2, 9, c.violinDark); p(ctx, ox, oy, 5, 12, c.violinDark);

  // === MICROPHONE STAND (bottom-right) ===
  // Stand base
  p(ctx, ox, oy, 9, 12, c.micStand); p(ctx, ox, oy, 10, 12, c.micStand); p(ctx, ox, oy, 11, 12, c.micStand);
  // Stand pole
  p(ctx, ox, oy, 10, 11, c.micStand); p(ctx, ox, oy, 10, 10, c.micStand); p(ctx, ox, oy, 10, 9, c.mic);
  // Mic head
  p(ctx, ox, oy, 9, 8, c.micHead); p(ctx, ox, oy, 10, 8, c.micHead); p(ctx, ox, oy, 11, 8, c.mic);
  p(ctx, ox, oy, 10, 7, c.mic);

  // === PIT EDGE / RAILING ===
  // Ledge around the pit
  if (!n) {
    b(ctx, ox, oy, 0, 0, G, 1, c.ledge);
    p(ctx, ox, oy, 3, 0, c.ledgeLight); p(ctx, ox, oy, 7, 0, c.ledgeLight); p(ctx, ox, oy, 11, 0, c.ledgeLight);
  }
  if (!s) {
    b(ctx, ox, oy, 0, G - 1, G, 1, c.ledge);
    p(ctx, ox, oy, 2, G - 1, c.ledgeLight); p(ctx, ox, oy, 6, G - 1, c.ledgeLight); p(ctx, ox, oy, 10, G - 1, c.ledgeLight);
  }
  if (!w) {
    b(ctx, ox, oy, 0, 0, 1, G, c.ledge);
    p(ctx, ox, oy, 0, 3, c.ledgeLight); p(ctx, ox, oy, 0, 7, c.ledgeLight); p(ctx, ox, oy, 0, 11, c.ledgeLight);
  }
  if (!e) {
    b(ctx, ox, oy, G - 1, 0, 1, G, c.ledge);
    p(ctx, ox, oy, G - 1, 2, c.ledgeLight); p(ctx, ox, oy, G - 1, 6, c.ledgeLight); p(ctx, ox, oy, G - 1, 10, c.ledgeLight);
  }

  // Shadow at edges (depth cue — pit is sunken)
  if (!n) b(ctx, ox, oy, 1, 1, G - 2, 1, c.edgeShadow);
  if (!s) b(ctx, ox, oy, 1, G - 2, G - 2, 1, c.edgeShadow);
  if (!w) b(ctx, ox, oy, 1, 1, 1, G - 2, c.edgeShadow);
  if (!e) b(ctx, ox, oy, G - 2, 1, 1, G - 2, c.edgeShadow);

  // Rail posts when connected to neighboring pit
  if (n) { p(ctx, ox, oy, 6, 0, c.rail); p(ctx, ox, oy, 7, 0, c.rail); }
  if (s) { p(ctx, ox, oy, 6, G - 1, c.rail); p(ctx, ox, oy, 7, G - 1, c.rail); }
  if (w) { p(ctx, ox, oy, 0, 6, c.rail); p(ctx, ox, oy, 0, 7, c.rail); }
  if (e) { p(ctx, ox, oy, G - 1, 6, c.rail); p(ctx, ox, oy, G - 1, 7, c.rail); }
}

function drawDoodad(ctx: CanvasRenderingContext2D, ox: number, oy: number, type: number) {
  ctx.clearRect(ox, oy, T, T);
  const d = PAL.doodad;
  switch (type) {
    case 0: { // Music note (eighth note)
      // Stem
      p(ctx, ox, oy, 8, 3, d.gold); p(ctx, ox, oy, 8, 4, d.gold);
      p(ctx, ox, oy, 8, 5, d.gold); p(ctx, ox, oy, 8, 6, d.gold);
      p(ctx, ox, oy, 8, 7, d.gold); p(ctx, ox, oy, 8, 8, d.gold);
      // Flag
      p(ctx, ox, oy, 9, 3, d.goldBright); p(ctx, ox, oy, 10, 4, d.goldBright);
      p(ctx, ox, oy, 10, 5, d.goldDark);
      // Note head (filled oval)
      p(ctx, ox, oy, 5, 8, d.goldDark); p(ctx, ox, oy, 6, 8, d.goldBright);
      p(ctx, ox, oy, 7, 8, d.goldBright); p(ctx, ox, oy, 8, 8, d.gold);
      p(ctx, ox, oy, 5, 9, d.gold); p(ctx, ox, oy, 6, 9, d.goldBright);
      p(ctx, ox, oy, 7, 9, d.gold); p(ctx, ox, oy, 8, 9, d.goldDark);
      // Shadow
      p(ctx, ox, oy, 6, 10, d.goldDark); p(ctx, ox, oy, 7, 10, d.goldDark);
      break;
    }
    case 1: { // Microphone
      // Mic head (rounded top)
      p(ctx, ox, oy, 6, 2, d.silverDark); p(ctx, ox, oy, 7, 2, d.silverDark);
      p(ctx, ox, oy, 5, 3, d.silver); p(ctx, ox, oy, 6, 3, d.silverLight);
      p(ctx, ox, oy, 7, 3, d.silverLight); p(ctx, ox, oy, 8, 3, d.silver);
      p(ctx, ox, oy, 5, 4, d.silver); p(ctx, ox, oy, 6, 4, d.silverLight);
      p(ctx, ox, oy, 7, 4, d.silverLight); p(ctx, ox, oy, 8, 4, d.silver);
      p(ctx, ox, oy, 6, 5, d.silverDark); p(ctx, ox, oy, 7, 5, d.silverDark);
      // Grille lines
      p(ctx, ox, oy, 6, 3, d.silver); p(ctx, ox, oy, 7, 4, d.silver);
      // Handle ring
      p(ctx, ox, oy, 6, 5, d.goldDark); p(ctx, ox, oy, 7, 5, d.goldDark);
      // Handle
      p(ctx, ox, oy, 6, 6, d.dark); p(ctx, ox, oy, 7, 6, d.dark);
      p(ctx, ox, oy, 6, 7, d.darkest); p(ctx, ox, oy, 7, 7, d.darkest);
      p(ctx, ox, oy, 6, 8, d.dark); p(ctx, ox, oy, 7, 8, d.dark);
      // Stand
      p(ctx, ox, oy, 6, 9, d.silverDark); p(ctx, ox, oy, 7, 9, d.silverDark);
      p(ctx, ox, oy, 5, 10, d.silverDark); p(ctx, ox, oy, 6, 10, d.silver);
      p(ctx, ox, oy, 7, 10, d.silver); p(ctx, ox, oy, 8, 10, d.silverDark);
      break;
    }
    case 2: { // Vinyl record
      // Outer ring
      p(ctx, ox, oy, 5, 2, d.vinyl); p(ctx, ox, oy, 6, 2, d.vinyl);
      p(ctx, ox, oy, 7, 2, d.vinyl); p(ctx, ox, oy, 8, 2, d.vinyl);
      p(ctx, ox, oy, 4, 3, d.vinyl); p(ctx, ox, oy, 9, 3, d.vinyl);
      p(ctx, ox, oy, 3, 4, d.vinyl); p(ctx, ox, oy, 10, 4, d.vinyl);
      p(ctx, ox, oy, 3, 5, d.vinyl); p(ctx, ox, oy, 10, 5, d.vinyl);
      p(ctx, ox, oy, 3, 6, d.vinyl); p(ctx, ox, oy, 10, 6, d.vinyl);
      p(ctx, ox, oy, 3, 7, d.vinyl); p(ctx, ox, oy, 10, 7, d.vinyl);
      p(ctx, ox, oy, 3, 8, d.vinyl); p(ctx, ox, oy, 10, 8, d.vinyl);
      p(ctx, ox, oy, 4, 9, d.vinyl); p(ctx, ox, oy, 9, 9, d.vinyl);
      p(ctx, ox, oy, 5, 10, d.vinyl); p(ctx, ox, oy, 6, 10, d.vinyl);
      p(ctx, ox, oy, 7, 10, d.vinyl); p(ctx, ox, oy, 8, 10, d.vinyl);
      // Filled interior
      b(ctx, ox, oy, 4, 4, 6, 5, d.vinyl);
      b(ctx, ox, oy, 5, 3, 4, 1, d.vinyl);
      b(ctx, ox, oy, 5, 9, 4, 1, d.vinyl);
      // Grooves (concentric rings)
      p(ctx, ox, oy, 5, 3, d.vinylGroove); p(ctx, ox, oy, 8, 3, d.vinylGroove);
      p(ctx, ox, oy, 4, 5, d.vinylGroove); p(ctx, ox, oy, 9, 5, d.vinylGroove);
      p(ctx, ox, oy, 4, 7, d.vinylGroove); p(ctx, ox, oy, 9, 7, d.vinylGroove);
      p(ctx, ox, oy, 5, 9, d.vinylGroove); p(ctx, ox, oy, 8, 9, d.vinylGroove);
      // Label (center circle)
      p(ctx, ox, oy, 6, 5, d.vinylLabel); p(ctx, ox, oy, 7, 5, d.vinylLabel);
      p(ctx, ox, oy, 6, 6, d.vinylLabel); p(ctx, ox, oy, 7, 6, d.vinylLabel);
      p(ctx, ox, oy, 6, 7, d.red); p(ctx, ox, oy, 7, 7, d.red);
      // Center hole
      p(ctx, ox, oy, 6, 6, d.darkest); p(ctx, ox, oy, 7, 6, d.darkest);
      // Shine highlight
      p(ctx, ox, oy, 5, 4, d.vinylGroove); p(ctx, ox, oy, 8, 8, d.vinylGroove);
      break;
    }
    case 3: { // Conductor's baton
      // Baton shaft (diagonal)
      p(ctx, ox, oy, 3, 10, d.dark); p(ctx, ox, oy, 4, 9, d.wood);
      p(ctx, ox, oy, 5, 8, d.wood); p(ctx, ox, oy, 6, 7, d.woodLight);
      p(ctx, ox, oy, 7, 6, d.woodLight); p(ctx, ox, oy, 8, 5, d.white);
      p(ctx, ox, oy, 9, 4, d.white); p(ctx, ox, oy, 10, 3, d.cream);
      p(ctx, ox, oy, 11, 2, d.cream);
      // Handle (cork/dark end)
      p(ctx, ox, oy, 2, 11, d.darkest); p(ctx, ox, oy, 3, 11, d.woodDark);
      p(ctx, ox, oy, 3, 10, d.woodDark);
      // Handle ring
      p(ctx, ox, oy, 4, 10, d.silver);
      // Tip highlight
      p(ctx, ox, oy, 11, 2, d.silverLight);
      // Shadow
      p(ctx, ox, oy, 4, 10, d.silverDark); p(ctx, ox, oy, 5, 9, d.woodDark);
      break;
    }
    case 4: { // Trumpet
      // Bell (flared end, left side)
      p(ctx, ox, oy, 2, 5, d.brass); p(ctx, ox, oy, 2, 6, d.brassBright);
      p(ctx, ox, oy, 2, 7, d.brass);
      p(ctx, ox, oy, 3, 4, d.brassDark); p(ctx, ox, oy, 3, 5, d.brassBright);
      p(ctx, ox, oy, 3, 6, d.goldBright); p(ctx, ox, oy, 3, 7, d.brassBright);
      p(ctx, ox, oy, 3, 8, d.brassDark);
      p(ctx, ox, oy, 4, 5, d.brass); p(ctx, ox, oy, 4, 6, d.brassBright);
      p(ctx, ox, oy, 4, 7, d.brass);
      // Tubing
      p(ctx, ox, oy, 5, 5, d.brass); p(ctx, ox, oy, 5, 6, d.gold); p(ctx, ox, oy, 5, 7, d.brass);
      p(ctx, ox, oy, 6, 6, d.brass); p(ctx, ox, oy, 7, 6, d.brassDark);
      p(ctx, ox, oy, 8, 6, d.brass);
      // Valves
      p(ctx, ox, oy, 7, 5, d.goldBright); p(ctx, ox, oy, 8, 5, d.goldBright);
      p(ctx, ox, oy, 9, 5, d.goldBright);
      p(ctx, ox, oy, 7, 4, d.silver); p(ctx, ox, oy, 8, 4, d.silver);
      p(ctx, ox, oy, 9, 4, d.silver);
      // Mouthpiece
      p(ctx, ox, oy, 9, 6, d.brassDark); p(ctx, ox, oy, 10, 6, d.brass);
      p(ctx, ox, oy, 11, 6, d.silver); p(ctx, ox, oy, 11, 7, d.silverDark);
      // Highlight
      p(ctx, ox, oy, 3, 6, d.goldBright); p(ctx, ox, oy, 4, 6, d.goldBright);
      break;
    }
    case 5: { // Sheet music
      // Paper
      b(ctx, ox, oy, 3, 2, 8, 10, d.cream);
      b(ctx, ox, oy, 4, 3, 6, 8, d.white);
      // Page curl (top-right corner)
      p(ctx, ox, oy, 10, 2, d.silver); p(ctx, ox, oy, 10, 3, d.cream);
      // Staff lines (5 lines)
      for (let ly = 4; ly <= 8; ly++) {
        b(ctx, ox, oy, 4, ly, 6, 1, d.dark);
        // Make lines thinner by drawing cream between
        if (ly < 8) {
          for (let lx = 4; lx < 10; lx++) {
            if (hash(lx, ly) > 40) p(ctx, ox, oy, lx, ly, d.cream);
          }
        }
      }
      // Actual staff lines
      b(ctx, ox, oy, 4, 4, 6, 1, d.dark);
      b(ctx, ox, oy, 4, 6, 6, 1, d.dark);
      b(ctx, ox, oy, 4, 8, 6, 1, d.dark);
      // Notes on staff
      p(ctx, ox, oy, 5, 4, d.darkest); p(ctx, ox, oy, 6, 4, d.darkest);
      p(ctx, ox, oy, 7, 6, d.darkest); p(ctx, ox, oy, 8, 6, d.darkest);
      p(ctx, ox, oy, 5, 8, d.darkest);
      // Note stems
      p(ctx, ox, oy, 6, 3, d.dark); p(ctx, ox, oy, 8, 5, d.dark);
      // Treble clef hint
      p(ctx, ox, oy, 4, 5, d.dark); p(ctx, ox, oy, 4, 6, d.dark); p(ctx, ox, oy, 4, 7, d.dark);
      // Page shadow
      b(ctx, ox, oy, 3, 2, 1, 10, d.silver);
      break;
    }
    case 6: { // Spotlight
      // Housing (top trapezoid)
      p(ctx, ox, oy, 5, 2, d.darkest); p(ctx, ox, oy, 6, 2, d.dark);
      p(ctx, ox, oy, 7, 2, d.dark); p(ctx, ox, oy, 8, 2, d.darkest);
      p(ctx, ox, oy, 5, 3, d.dark); p(ctx, ox, oy, 6, 3, d.silverDark);
      p(ctx, ox, oy, 7, 3, d.silverDark); p(ctx, ox, oy, 8, 3, d.dark);
      // Lens
      p(ctx, ox, oy, 5, 4, d.goldDark); p(ctx, ox, oy, 6, 4, d.goldBright);
      p(ctx, ox, oy, 7, 4, d.goldBright); p(ctx, ox, oy, 8, 4, d.goldDark);
      // Light beam (expanding cone downward)
      p(ctx, ox, oy, 5, 5, d.goldDark); p(ctx, ox, oy, 6, 5, d.gold);
      p(ctx, ox, oy, 7, 5, d.gold); p(ctx, ox, oy, 8, 5, d.goldDark);
      p(ctx, ox, oy, 4, 6, d.goldDark); p(ctx, ox, oy, 5, 6, d.gold);
      p(ctx, ox, oy, 6, 6, d.goldBright); p(ctx, ox, oy, 7, 6, d.goldBright);
      p(ctx, ox, oy, 8, 6, d.gold); p(ctx, ox, oy, 9, 6, d.goldDark);
      p(ctx, ox, oy, 3, 7, d.goldDark); p(ctx, ox, oy, 4, 7, d.gold);
      p(ctx, ox, oy, 5, 7, d.goldBright); p(ctx, ox, oy, 6, 7, d.white);
      p(ctx, ox, oy, 7, 7, d.white); p(ctx, ox, oy, 8, 7, d.goldBright);
      p(ctx, ox, oy, 9, 7, d.gold); p(ctx, ox, oy, 10, 7, d.goldDark);
      // Beam bottom glow
      p(ctx, ox, oy, 3, 8, d.goldDark); p(ctx, ox, oy, 10, 8, d.goldDark);
      p(ctx, ox, oy, 4, 8, d.goldDark); p(ctx, ox, oy, 9, 8, d.goldDark);
      p(ctx, ox, oy, 5, 8, d.gold); p(ctx, ox, oy, 8, 8, d.gold);
      p(ctx, ox, oy, 6, 8, d.goldBright); p(ctx, ox, oy, 7, 8, d.goldBright);
      // Mount
      p(ctx, ox, oy, 6, 1, d.silverDark); p(ctx, ox, oy, 7, 1, d.silverDark);
      break;
    }
    case 7: { // Acoustic speaker
      // Cabinet body
      b(ctx, ox, oy, 3, 2, 8, 10, d.dark);
      b(ctx, ox, oy, 4, 3, 6, 8, d.darkest);
      // Cabinet edges
      p(ctx, ox, oy, 3, 2, d.woodDark); p(ctx, ox, oy, 10, 2, d.woodDark);
      p(ctx, ox, oy, 3, 11, d.woodDark); p(ctx, ox, oy, 10, 11, d.woodDark);
      // Large woofer (bottom speaker cone)
      p(ctx, ox, oy, 5, 7, d.silverDark); p(ctx, ox, oy, 6, 7, d.silver);
      p(ctx, ox, oy, 7, 7, d.silver); p(ctx, ox, oy, 8, 7, d.silverDark);
      p(ctx, ox, oy, 5, 8, d.silver); p(ctx, ox, oy, 6, 8, d.silverLight);
      p(ctx, ox, oy, 7, 8, d.silverLight); p(ctx, ox, oy, 8, 8, d.silver);
      p(ctx, ox, oy, 5, 9, d.silverDark); p(ctx, ox, oy, 6, 9, d.silver);
      p(ctx, ox, oy, 7, 9, d.silver); p(ctx, ox, oy, 8, 9, d.silverDark);
      // Woofer center
      p(ctx, ox, oy, 6, 8, d.darkest); p(ctx, ox, oy, 7, 8, d.darkest);
      // Tweeter (top speaker, smaller)
      p(ctx, ox, oy, 6, 4, d.silver); p(ctx, ox, oy, 7, 4, d.silver);
      p(ctx, ox, oy, 6, 5, d.silverLight); p(ctx, ox, oy, 7, 5, d.silverLight);
      // Tweeter center
      p(ctx, ox, oy, 6, 4, d.darkest); p(ctx, ox, oy, 7, 5, d.darkest);
      // Port (bass reflex)
      b(ctx, ox, oy, 5, 10, 4, 1, d.darkest);
      // Logo/badge
      p(ctx, ox, oy, 6, 3, d.goldDark); p(ctx, ox, oy, 7, 3, d.goldDark);
      // Cabinet screws
      p(ctx, ox, oy, 4, 3, d.silverDark); p(ctx, ox, oy, 9, 3, d.silverDark);
      p(ctx, ox, oy, 4, 10, d.silverDark); p(ctx, ox, oy, 9, 10, d.silverDark);
      // Sound waves emanating (small accents)
      p(ctx, ox, oy, 11, 5, d.blueDim); p(ctx, ox, oy, 12, 6, d.blueDim);
      p(ctx, ox, oy, 11, 8, d.blueDim);
      break;
    }
  }
}

export default function HarmonicTerrainSprites() {
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
      drawSeat(tCtx, ox, 1 * T, v);
      for (let f = 0; f < 3; f++) drawResonance(tCtx, ox, (2 + f) * T, v, f);
      drawNoBuild(tCtx, ox, 5 * T, v);
    }
    const tp = terrainPreviewRef.current!;
    const scale = 3;
    tp.width = VARIANTS * T * scale + 140;
    tp.height = TERRAIN_ROWS * T * scale + 40;
    const tpCtx = tp.getContext('2d')!;
    tpCtx.imageSmoothingEnabled = false;
    tpCtx.fillStyle = '#0e0a06';
    tpCtx.fillRect(0, 0, tp.width, tp.height);
    tpCtx.drawImage(tc, 140, 20, tc.width * scale, tc.height * scale);
    tpCtx.fillStyle = '#ddaa44';
    tpCtx.font = '11px monospace';
    const rowLabels = ['Ground', 'Seating', 'Resonance 0', 'Resonance 1', 'Resonance 2', 'NoBuild'];
    for (let r = 0; r < TERRAIN_ROWS; r++) {
      tpCtx.fillText(rowLabels[r], 4, 20 + r * T * scale + T * scale / 2 + 4);
    }
    const dc = doodadRef.current!;
    dc.width = DOODAD_COLS * T;
    dc.height = DOODAD_ROWS * T;
    const dCtx = dc.getContext('2d')!;
    dCtx.imageSmoothingEnabled = false;
    for (let i = 0; i < DOODAD_COLS; i++) drawDoodad(dCtx, i * T, 0, i);
    const dp = doodadPreviewRef.current!;
    const dScale = 3;
    dp.width = DOODAD_COLS * T * dScale + 80;
    dp.height = DOODAD_ROWS * T * dScale + 40;
    const dpCtx = dp.getContext('2d')!;
    dpCtx.imageSmoothingEnabled = false;
    dpCtx.fillStyle = '#0e0a06';
    dpCtx.fillRect(0, 0, dp.width, dp.height);
    dpCtx.drawImage(dc, 80, 20, dc.width * dScale, dc.height * dScale);
    dpCtx.fillStyle = '#ddaa44';
    dpCtx.font = '11px monospace';
    dpCtx.fillText('Concert', 4, 20 + T * dScale / 2 + 4);
    setReady(true);
  }, []);

  const download = (ref: React.RefObject<HTMLCanvasElement | null>, name: string) => {
    const a = document.createElement('a');
    a.download = name;
    a.href = ref.current!.toDataURL('image/png');
    a.click();
  };

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', color: '#ddaa44', background: '#0e0a06' }}>
      <h2 data-label="Harmonic Terrain">Harmonic Terrain Sprites — Concert Hall</h2>
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setView('preview')} style={{ marginRight: 8, background: view === 'preview' ? '#ddaa44' : '#2a2018', color: view === 'preview' ? '#0e0a06' : '#ddaa44', border: '1px solid #ddaa44', padding: '4px 12px', cursor: 'pointer' }}>Preview (3x)</button>
        <button onClick={() => setView('actual')} style={{ marginRight: 8, background: view === 'actual' ? '#ddaa44' : '#2a2018', color: view === 'actual' ? '#0e0a06' : '#ddaa44', border: '1px solid #ddaa44', padding: '4px 12px', cursor: 'pointer' }}>Actual Size</button>
        {ready && (
          <>
            <button onClick={() => download(terrainRef, 'harmonic_terrain_tileset.png')} style={{ marginRight: 8, background: '#2a2018', color: '#ddaa44', border: '1px solid #ddaa44', padding: '4px 12px', cursor: 'pointer' }}>Download Tileset</button>
            <button onClick={() => download(doodadRef, 'harmonic_terrain_doodads.png')} style={{ background: '#2a2018', color: '#ddaa44', border: '1px solid #ddaa44', padding: '4px 12px', cursor: 'pointer' }}>Download Doodads</button>
          </>
        )}
      </div>
      <p style={{ fontSize: '12px', color: '#886622' }} data-frame-size="28x28">Frame size: 28x28 | PX=2 | Grid=14x14 | 16 cols (NESW bitmask) x 6 rows</p>
      <h3 data-label="Harmonic Terrain (Preview)">Terrain Tileset (16 auto-tile variants x 6 rows)</h3>
      <canvas ref={terrainPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #ddaa4433' }} />
      <canvas ref={terrainRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #ddaa4433' }} />
      <h3>Concert Hall Doodads (8 types)</h3>
      <canvas ref={doodadPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #ddaa4433' }} />
      <canvas ref={doodadRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #ddaa4433' }} />
    </div>
  );
}
