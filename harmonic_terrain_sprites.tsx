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
    base: '#181410',
    baseLt: '#1c1812',
    accent: '#201a14',
    accentDk: '#14100c',
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
  // Dark wood floor base
  b(ctx, ox, oy, 0, 0, G, G, c.base);
  // A few subtle texture pixels (faint warm brown tint)
  p(ctx, ox, oy, 4, 6, c.baseLt);
  p(ctx, ox, oy, 11, 3, c.accent);
  p(ctx, ox, oy, 2, 10, c.baseLt);
  // One darker spot
  p(ctx, ox, oy, 8, 8, c.accentDk);
}

function drawSeat(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.seat;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);

  // Dark aisle floor between seats
  b(ctx, ox, oy, 0, 0, G, G, c.frameDark);

  // We draw 2 rows of seats (top-down view), each row has 2 chairs side by side
  // Each chair: backrest (2px tall strip at top), seat cushion (3px), gap between rows
  // This tiles seamlessly when variant 15 (all neighbors present)

  // === ROW 1 (top half: y=0..6) ===
  // Aisle gap between rows
  b(ctx, ox, oy, 0, 6, G, 1, c.frameDark);

  // Chair A (left): x=0..6
  // Backrest - dark wood strip at top of chair
  b(ctx, ox, oy, 0, 0, 6, 2, c.backrest);
  b(ctx, ox, oy, 1, 0, 4, 1, c.backrestTop);
  // Backrest wood grain
  p(ctx, ox, oy, 1, 1, c.velvetShadow); p(ctx, ox, oy, 3, 1, c.velvetShadow); p(ctx, ox, oy, 5, 1, c.velvetShadow);
  // Seat cushion - red velvet from above
  b(ctx, ox, oy, 0, 2, 6, 4, c.velvetDeep);
  b(ctx, ox, oy, 1, 2, 4, 3, c.velvetMid);
  b(ctx, ox, oy, 1, 3, 4, 2, c.velvetLight);
  // Cushion highlight
  p(ctx, ox, oy, 2, 3, c.velvetHighlight); p(ctx, ox, oy, 3, 3, c.velvetHighlight);
  // Cushion crease (center dip)
  p(ctx, ox, oy, 2, 4, c.cushionCrease); p(ctx, ox, oy, 3, 4, c.cushionCrease);
  // Cushion shadow at front edge
  b(ctx, ox, oy, 0, 5, 6, 1, c.velvetShadow);
  // Armrest (right side of chair A) - gold accent
  b(ctx, ox, oy, 6, 0, 1, 6, c.armrestDark);
  p(ctx, ox, oy, 6, 1, c.armrest); p(ctx, ox, oy, 6, 3, c.armrestHighlight); p(ctx, ox, oy, 6, 5, c.armrest);
  // Seat number on backrest
  p(ctx, ox, oy, 2, 0, c.number);

  // Chair B (right): x=7..13
  // Backrest
  b(ctx, ox, oy, 7, 0, 7, 2, c.backrest);
  b(ctx, ox, oy, 8, 0, 5, 1, c.backrestTop);
  p(ctx, ox, oy, 8, 1, c.velvetShadow); p(ctx, ox, oy, 10, 1, c.velvetShadow); p(ctx, ox, oy, 12, 1, c.velvetShadow);
  // Seat cushion
  b(ctx, ox, oy, 7, 2, 7, 4, c.velvetDeep);
  b(ctx, ox, oy, 8, 2, 5, 3, c.velvetMid);
  b(ctx, ox, oy, 8, 3, 5, 2, c.velvetLight);
  p(ctx, ox, oy, 9, 3, c.velvetHighlight); p(ctx, ox, oy, 10, 3, c.velvetHighlight);
  p(ctx, ox, oy, 9, 4, c.cushionCrease); p(ctx, ox, oy, 10, 4, c.cushionCrease);
  b(ctx, ox, oy, 7, 5, 7, 1, c.velvetShadow);
  // Seat number
  p(ctx, ox, oy, 9, 0, c.numberDim);

  // === ROW 2 (bottom half: y=7..13) ===
  // Chair C (left): x=0..6
  b(ctx, ox, oy, 0, 7, 6, 2, c.backrest);
  b(ctx, ox, oy, 1, 7, 4, 1, c.backrestTop);
  p(ctx, ox, oy, 1, 8, c.velvetShadow); p(ctx, ox, oy, 3, 8, c.velvetShadow); p(ctx, ox, oy, 5, 8, c.velvetShadow);
  b(ctx, ox, oy, 0, 9, 6, 4, c.velvetDeep);
  b(ctx, ox, oy, 1, 9, 4, 3, c.velvetMid);
  b(ctx, ox, oy, 1, 10, 4, 2, c.velvetLight);
  p(ctx, ox, oy, 2, 10, c.velvetHighlight); p(ctx, ox, oy, 3, 10, c.velvetHighlight);
  p(ctx, ox, oy, 2, 11, c.cushionCrease); p(ctx, ox, oy, 3, 11, c.cushionCrease);
  b(ctx, ox, oy, 0, 12, 6, 1, c.velvetShadow);
  b(ctx, ox, oy, 6, 7, 1, 6, c.armrestDark);
  p(ctx, ox, oy, 6, 8, c.armrest); p(ctx, ox, oy, 6, 10, c.armrestHighlight); p(ctx, ox, oy, 6, 12, c.armrest);
  p(ctx, ox, oy, 2, 7, c.number);

  // Chair D (right): x=7..13
  b(ctx, ox, oy, 7, 7, 7, 2, c.backrest);
  b(ctx, ox, oy, 8, 7, 5, 1, c.backrestTop);
  p(ctx, ox, oy, 8, 8, c.velvetShadow); p(ctx, ox, oy, 10, 8, c.velvetShadow); p(ctx, ox, oy, 12, 8, c.velvetShadow);
  b(ctx, ox, oy, 7, 9, 7, 4, c.velvetDeep);
  b(ctx, ox, oy, 8, 9, 5, 3, c.velvetMid);
  b(ctx, ox, oy, 8, 10, 5, 2, c.velvetLight);
  p(ctx, ox, oy, 9, 10, c.velvetHighlight); p(ctx, ox, oy, 10, 10, c.velvetHighlight);
  p(ctx, ox, oy, 9, 11, c.cushionCrease); p(ctx, ox, oy, 10, 11, c.cushionCrease);
  b(ctx, ox, oy, 7, 12, 7, 1, c.velvetShadow);
  p(ctx, ox, oy, 9, 7, c.numberDim);

  // Bottom row foot space / hinge area
  b(ctx, ox, oy, 0, 13, G, 1, c.seatBase);
  p(ctx, ox, oy, 3, 13, c.hinge); p(ctx, ox, oy, 10, 13, c.hinge);

  // === AUTO-TILE EDGES — ornate trim where seating meets floor ===
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

  // Connection continuity when neighbors present (rows continue seamlessly)
  if (n) {
    // Row continues upward - show seat base continuing
    b(ctx, ox, oy, 0, 0, G, 1, c.seatBase);
    p(ctx, ox, oy, 3, 0, c.hinge); p(ctx, ox, oy, 10, 0, c.hinge);
  }
  if (s) {
    // Row continues downward - show backrest continuing
    b(ctx, ox, oy, 0, G - 1, G, 1, c.backrest);
    p(ctx, ox, oy, 1, G - 1, c.backrestTop); p(ctx, ox, oy, 8, G - 1, c.backrestTop);
  }
  if (w) {
    // Chairs continue left - armrest connects
    for (let py = 0; py < G; py++) {
      if (py === 6) continue; // aisle gap
      p(ctx, ox, oy, 0, py, c.armrestDark);
    }
  }
  if (e) {
    // Chairs continue right - armrest connects
    for (let py = 0; py < G; py++) {
      if (py === 6) continue; // aisle gap
      p(ctx, ox, oy, G - 1, py, c.armrestDark);
    }
  }
}

function drawResonance(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number, frame: number) {
  const c = PAL.resonance;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);

  // Dark base — represents vibrating air / sound field
  b(ctx, ox, oy, 0, 0, G, G, c.stage);

  // Subtle warm ambient glow across entire tile
  for (let gy = 0; gy < G; gy++) {
    for (let gx = 0; gx < G; gx++) {
      if (hash(gx, gy) < 12) p(ctx, ox, oy, gx, gy, c.stageGrain);
    }
  }

  // Center of the ripple pattern (tiles seamlessly — center is at 7,7 so
  // adjacent tiles' rings connect at edges)
  const cx = 7, cy = 7;

  // === CONCENTRIC SOUND WAVE RIPPLES ===
  // Draw multiple rings expanding outward. Each frame shifts rings outward
  // to create the animation of sound waves propagating.
  // Ring radii shift by 1 pixel per frame for smooth expansion.
  const baseRadii = [1.5, 3.5, 5.5, 7.5, 9.5, 11.5];
  // Colors from bright center to dim edge
  const ringColors = [c.waveInner, c.waveOuter, c.waveMid, c.waveDim, c.waveFaint, c.waveFaint];
  const ringAlphaColors = [c.waveInner, c.waveOuter, c.eqBar, c.eqBarMid, c.waveDim, c.waveFaint];

  for (let ri = 0; ri < baseRadii.length; ri++) {
    // Each frame shifts rings outward by ~0.7 pixels, wrapping around
    const r = ((baseRadii[ri] + frame * 0.8) % 12.0);
    if (r < 0.5) continue;

    // Determine color: inner rings are brighter
    const col = r < 3 ? ringAlphaColors[0] : r < 5 ? ringAlphaColors[1] :
                r < 7 ? ringAlphaColors[2] : r < 9 ? ringAlphaColors[3] :
                r < 11 ? ringAlphaColors[4] : ringAlphaColors[5];

    // Draw ring as circle of pixels (higher resolution for smoothness)
    const steps = Math.max(24, Math.floor(r * 8));
    for (let a = 0; a < steps; a++) {
      const angle = (a / steps) * Math.PI * 2;
      const rx = Math.round(cx + r * Math.cos(angle));
      const ry = Math.round(cy + r * Math.sin(angle));
      if (rx >= 0 && rx < G && ry >= 0 && ry < G) {
        p(ctx, ox, oy, rx, ry, col);
      }
    }
  }

  // === SECONDARY RIPPLE SET (offset, creates interference pattern) ===
  // Fainter secondary rings between the primary ones
  const secRadii = [2.5, 4.5, 6.5, 8.5, 10.5];
  for (let ri = 0; ri < secRadii.length; ri++) {
    const r = ((secRadii[ri] + frame * 0.8) % 12.0);
    if (r < 0.5) continue;
    const col = r < 4 ? c.glowBright : r < 7 ? c.glowSoft : c.stageGrain;
    const steps = Math.max(16, Math.floor(r * 6));
    for (let a = 0; a < steps; a++) {
      const angle = (a / steps) * Math.PI * 2;
      const rx = Math.round(cx + r * Math.cos(angle));
      const ry = Math.round(cy + r * Math.sin(angle));
      if (rx >= 0 && rx < G && ry >= 0 && ry < G) {
        p(ctx, ox, oy, rx, ry, col);
      }
    }
  }

  // === GLOWING CENTER SOURCE ===
  // Warm amber/gold pulsing core — the "speaker" or vibration source
  // Core brightness shifts slightly per frame
  const coreColors = [c.waveInner, c.waveOuter, c.waveMid];
  const coreBright = coreColors[frame];
  const coreGlow = frame === 0 ? c.waveOuter : frame === 1 ? c.waveInner : c.waveOuter;

  // 2x2 bright core
  p(ctx, ox, oy, 6, 6, coreGlow); p(ctx, ox, oy, 7, 6, coreBright);
  p(ctx, ox, oy, 6, 7, coreBright); p(ctx, ox, oy, 7, 7, coreGlow);
  // 4x4 warm glow around core
  p(ctx, ox, oy, 5, 6, c.eqBar); p(ctx, ox, oy, 8, 6, c.eqBar);
  p(ctx, ox, oy, 5, 7, c.eqBar); p(ctx, ox, oy, 8, 7, c.eqBar);
  p(ctx, ox, oy, 6, 5, c.eqBarMid); p(ctx, ox, oy, 7, 5, c.eqBarMid);
  p(ctx, ox, oy, 6, 8, c.eqBarMid); p(ctx, ox, oy, 7, 8, c.eqBarMid);
  // Diagonal glow
  p(ctx, ox, oy, 5, 5, c.eqBarDim); p(ctx, ox, oy, 8, 5, c.eqBarDim);
  p(ctx, ox, oy, 5, 8, c.eqBarDim); p(ctx, ox, oy, 8, 8, c.eqBarDim);

  // === EDGES ===
  if (!n) {
    b(ctx, ox, oy, 0, 0, G, 1, c.edgeDark);
    for (let gx = 1; gx < G; gx += 3) p(ctx, ox, oy, gx, 0, c.waveDim);
  }
  if (!s) {
    b(ctx, ox, oy, 0, G - 1, G, 1, c.edgeDark);
    for (let gx = 0; gx < G; gx += 3) p(ctx, ox, oy, gx, G - 1, c.waveDim);
  }
  if (!w) {
    b(ctx, ox, oy, 0, 0, 1, G, c.edgeDark);
    for (let gy = 1; gy < G; gy += 3) p(ctx, ox, oy, 0, gy, c.waveDim);
  }
  if (!e) {
    b(ctx, ox, oy, G - 1, 0, 1, G, c.edgeDark);
    for (let gy = 0; gy < G; gy += 3) p(ctx, ox, oy, G - 1, gy, c.waveDim);
  }

  // Warm glow bleeds at connected edges (ripples continue into neighbor)
  if (n) { p(ctx, ox, oy, 6, 0, c.waveFaint); p(ctx, ox, oy, 7, 0, c.waveFaint); p(ctx, ox, oy, 5, 0, c.glowSoft); p(ctx, ox, oy, 8, 0, c.glowSoft); }
  if (s) { p(ctx, ox, oy, 6, G - 1, c.waveFaint); p(ctx, ox, oy, 7, G - 1, c.waveFaint); p(ctx, ox, oy, 5, G - 1, c.glowSoft); p(ctx, ox, oy, 8, G - 1, c.glowSoft); }
  if (w) { p(ctx, ox, oy, 0, 6, c.waveFaint); p(ctx, ox, oy, 0, 7, c.waveFaint); p(ctx, ox, oy, 0, 5, c.glowSoft); p(ctx, ox, oy, 0, 8, c.glowSoft); }
  if (e) { p(ctx, ox, oy, G - 1, 6, c.waveFaint); p(ctx, ox, oy, G - 1, 7, c.waveFaint); p(ctx, ox, oy, G - 1, 5, c.glowSoft); p(ctx, ox, oy, G - 1, 8, c.glowSoft); }
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
