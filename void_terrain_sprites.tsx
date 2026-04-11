/**
 * Void Terrain Sprite Generator — Rift Dimension terrain.
 *
 * Layout:
 *   Columns: 16 (auto-tile bitmask variants, bits = NESW)
 *   Row order:
 *   0: cracked obsidian ground with purple void energy in cracks (ground)
 *   1: casino/gambling blocked structures — slot machines, dice, portals (blocked type 1)
 *   2: void rift vortex frame 0 (blocked type 2)
 *   3: void rift vortex frame 1 (blocked type 2, animated)
 *   4: void rift vortex frame 2 (blocked type 2, animated)
 *   5: reality tear patches — dimensional fissures (NoBuild terrain)
 *
 * Doodads row 0: 8 types
 *   0: casino chip stack, 1: floating d6 die, 2: portal fragment,
 *   3: void crystal, 4: slot machine lever, 5: probability sphere,
 *   6: dimensional rift scar, 7: lucky coin
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
    base: '#08061a',
    baseLt: '#0a081e',
    accent: '#0e0b22',
    accentDim: '#120e28',
  },
  rock: {
    base: '#0a0620',
    casinoDark: '#110830',
    casinoMid: '#1a1040',
    casinoLight: '#241850',
    gold: '#aa8822',
    goldDim: '#775511',
    goldBright: '#cc9933',
    magenta: '#cc2299',
    magentaDim: '#881166',
    magentaBright: '#cc55aa',
    cyan: '#188877',
    cyanDim: '#0d5544',
    purple: '#662288',
    purpleDim: '#441155',
    white: '#99aabb',
    black: '#040210',
    edge: '#1a1040',
    edgeBright: '#221050',
  },
  pool: {
    deep: '#020008',
    voidBlack: '#06001a',
    vortexCore: '#110033',
    purple: '#7722cc',
    purpleDim: '#551199',
    purpleBright: '#8844cc',
    magenta: '#cc2299',
    magentaDim: '#992266',
    cyan: '#1199aa',
    cyanDim: '#0d7766',
    starPulled: '#9977cc',
    starDim: '#554466',
    edgeDark: '#1a0055',
    edgeBright: '#330088',
    distortion: '#281066',
  },
  noBuild: {
    base: '#08061a',
    crack: '#551199',
    crackDeep: '#280055',
    crackBright: '#7733aa',
    voidBelow: '#020008',
    energyLeak: '#9933cc',
    energyDim: '#662288',
    sparkle: '#bb99dd',
    sparkleDim: '#886699',
    instability: '#150c2a',
    obsidian: '#0c0a1e',
    edgeFissure: '#331888',
  },
  doodad: {
    gold: '#aa8822',
    goldBright: '#cc9933',
    goldDim: '#775511',
    magenta: '#cc2299',
    magentaBright: '#cc55aa',
    magentaDim: '#881166',
    cyan: '#188877',
    cyanBright: '#2ebbaa',
    cyanDim: '#0d5544',
    purple: '#662288',
    purpleBright: '#8844aa',
    purpleDim: '#441155',
    white: '#99aabb',
    silver: '#889999',
    dark: '#0a0620',
    black: '#040210',
    red: '#aa2233',
    voidEnergy: '#9933cc',
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

/* Seeded random for consistent patterns per variant */
function seeded(seed: number) {
  let s = seed;
  return () => { s = (s * 16807 + 7) % 2147483647; return (s & 0xffff) / 0xffff; };
}

function drawGround(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  const c = PAL.ground;
  // Near-black obsidian base
  b(ctx, ox, oy, 0, 0, G, G, c.base);
  // A few barely-visible texture pixels (faint purple tint)
  p(ctx, ox, oy, 4, 3, c.baseLt);
  p(ctx, ox, oy, 10, 9, c.accent);
  p(ctx, ox, oy, 7, 6, c.baseLt);
  // One slightly lighter worn spot
  p(ctx, ox, oy, 1, 11, c.accentDim);
}

function drawRock(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.rock;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  const rng = seeded(idx * 137 + 53);

  // Base dark casino-void structure
  b(ctx, ox, oy, 0, 0, G, G, c.base);
  b(ctx, ox, oy, 1, 1, 12, 12, c.casinoDark);

  // Choose structure type based on variant index for variety
  const structType = idx % 4;

  if (structType === 0) {
    // SLOT MACHINE — front view with 3 reels
    b(ctx, ox, oy, 2, 1, 10, 12, c.casinoMid);
    // Machine frame top
    b(ctx, ox, oy, 2, 1, 10, 2, c.casinoLight);
    // Top crown decoration
    p(ctx, ox, oy, 6, 1, c.gold); p(ctx, ox, oy, 7, 1, c.gold);
    p(ctx, ox, oy, 5, 1, c.goldDim); p(ctx, ox, oy, 8, 1, c.goldDim);
    // Three reel windows
    b(ctx, ox, oy, 3, 4, 2, 4, c.black);
    b(ctx, ox, oy, 6, 4, 2, 4, c.black);
    b(ctx, ox, oy, 9, 4, 2, 4, c.black);
    // Reel symbols — void-themed: star, 7, diamond
    p(ctx, ox, oy, 3, 5, c.magenta); p(ctx, ox, oy, 4, 6, c.magenta); // cherry
    p(ctx, ox, oy, 6, 5, c.cyan); p(ctx, ox, oy, 7, 5, c.cyan);       // seven
    p(ctx, ox, oy, 9, 5, c.gold); p(ctx, ox, oy, 10, 6, c.goldBright); // diamond
    // Reel dividers
    p(ctx, ox, oy, 5, 4, c.casinoLight); p(ctx, ox, oy, 5, 5, c.casinoLight);
    p(ctx, ox, oy, 5, 6, c.casinoLight); p(ctx, ox, oy, 5, 7, c.casinoLight);
    p(ctx, ox, oy, 8, 4, c.casinoLight); p(ctx, ox, oy, 8, 5, c.casinoLight);
    p(ctx, ox, oy, 8, 6, c.casinoLight); p(ctx, ox, oy, 8, 7, c.casinoLight);
    // Payout tray
    b(ctx, ox, oy, 3, 9, 8, 1, c.goldDim);
    p(ctx, ox, oy, 5, 9, c.gold); p(ctx, ox, oy, 8, 9, c.gold);
    // Base/pedestal
    b(ctx, ox, oy, 3, 10, 8, 2, c.casinoLight);
    b(ctx, ox, oy, 4, 11, 6, 1, c.purple);
    // Pull arm on right side
    p(ctx, ox, oy, 12, 3, c.goldDim);
    p(ctx, ox, oy, 12, 4, c.gold);
    p(ctx, ox, oy, 12, 5, c.gold);
    p(ctx, ox, oy, 12, 6, c.goldBright);
    // Void energy glow from machine
    p(ctx, ox, oy, 4, 8, c.magentaDim); p(ctx, ox, oy, 9, 8, c.magentaDim);

  } else if (structType === 1) {
    // PORTAL ARCHWAY — arched gateway with void energy
    b(ctx, ox, oy, 1, 1, 12, 12, c.casinoDark);
    // Left pillar
    b(ctx, ox, oy, 2, 3, 2, 10, c.casinoLight);
    b(ctx, ox, oy, 3, 3, 1, 10, c.purple);
    // Right pillar
    b(ctx, ox, oy, 10, 3, 2, 10, c.casinoLight);
    b(ctx, ox, oy, 10, 3, 1, 10, c.purple);
    // Arch top
    b(ctx, ox, oy, 2, 2, 10, 2, c.casinoLight);
    b(ctx, ox, oy, 4, 1, 6, 1, c.purple);
    p(ctx, ox, oy, 5, 1, c.magenta); p(ctx, ox, oy, 8, 1, c.magenta);
    // Keystone
    p(ctx, ox, oy, 6, 2, c.gold); p(ctx, ox, oy, 7, 2, c.goldBright);
    // Void portal interior — dark with swirling energy
    b(ctx, ox, oy, 4, 4, 6, 9, c.black);
    // Swirl pattern inside portal
    p(ctx, ox, oy, 5, 5, c.purple); p(ctx, ox, oy, 6, 5, c.magenta);
    p(ctx, ox, oy, 8, 6, c.purple); p(ctx, ox, oy, 7, 7, c.magentaBright);
    p(ctx, ox, oy, 5, 8, c.purpleDim); p(ctx, ox, oy, 6, 9, c.magenta);
    p(ctx, ox, oy, 8, 10, c.purpleDim); p(ctx, ox, oy, 7, 11, c.purple);
    // Stars visible through portal
    p(ctx, ox, oy, 5, 6, c.white); p(ctx, ox, oy, 8, 8, c.white);
    p(ctx, ox, oy, 6, 11, c.white);
    // Rune markings on pillars
    p(ctx, ox, oy, 2, 5, c.cyan); p(ctx, ox, oy, 2, 8, c.cyan);
    p(ctx, ox, oy, 11, 6, c.cyan); p(ctx, ox, oy, 11, 9, c.cyan);

  } else if (structType === 2) {
    // PROBABILITY DICE BLOCK — giant d6 faces with void markings
    b(ctx, ox, oy, 1, 1, 12, 12, c.casinoMid);
    // Die face outline — raised 3D look
    b(ctx, ox, oy, 2, 2, 10, 10, c.casinoLight);
    b(ctx, ox, oy, 3, 3, 8, 8, c.white);
    b(ctx, ox, oy, 3, 3, 8, 8, c.casinoMid); // overwrite to dark face
    // Die border highlight (3D bevel)
    b(ctx, ox, oy, 2, 2, 10, 1, c.edgeBright);
    b(ctx, ox, oy, 2, 2, 1, 10, c.edgeBright);
    b(ctx, ox, oy, 2, 11, 10, 1, c.base);
    b(ctx, ox, oy, 11, 2, 1, 10, c.base);
    // Pip dots — void-themed (glowing magenta pips)
    // Show different pip count based on variant for variety
    const pips = (idx % 6) + 1;
    const pipColor = c.magenta;
    const pipGlow = c.magentaDim;
    if (pips >= 1) { p(ctx, ox, oy, 7, 7, pipColor); p(ctx, ox, oy, 6, 6, pipGlow); } // center
    if (pips >= 2) { p(ctx, ox, oy, 4, 4, pipColor); p(ctx, ox, oy, 10, 10, pipColor); }
    if (pips >= 3) { p(ctx, ox, oy, 4, 10, pipColor); p(ctx, ox, oy, 10, 4, pipColor); }
    if (pips >= 4) { p(ctx, ox, oy, 4, 7, pipColor); p(ctx, ox, oy, 10, 7, pipColor); }
    if (pips >= 5) { p(ctx, ox, oy, 7, 4, pipColor); p(ctx, ox, oy, 7, 10, pipColor); }
    if (pips >= 6) { p(ctx, ox, oy, 4, 5, pipColor); p(ctx, ox, oy, 10, 5, pipColor); p(ctx, ox, oy, 4, 9, pipColor); p(ctx, ox, oy, 10, 9, pipColor); }
    // Void cracks on die surface
    p(ctx, ox, oy, 5, 6, c.purple); p(ctx, ox, oy, 8, 8, c.purpleDim);
    p(ctx, ox, oy, 9, 5, c.purpleDim);
    // Corner chips revealing void energy
    p(ctx, ox, oy, 3, 3, c.cyan); p(ctx, ox, oy, 10, 10, c.cyanDim);

  } else {
    // DIMENSIONAL ANCHOR — floating crystalline structure with chains
    b(ctx, ox, oy, 1, 1, 12, 12, c.casinoDark);
    // Central anchor crystal — diamond shape
    p(ctx, ox, oy, 7, 2, c.cyan);
    p(ctx, ox, oy, 6, 3, c.cyan); p(ctx, ox, oy, 7, 3, c.cyanDim); p(ctx, ox, oy, 8, 3, c.cyan);
    p(ctx, ox, oy, 5, 4, c.cyanDim); b(ctx, ox, oy, 6, 4, 3, 1, c.purple); p(ctx, ox, oy, 9, 4, c.cyanDim);
    p(ctx, ox, oy, 4, 5, c.cyan); b(ctx, ox, oy, 5, 5, 5, 1, c.casinoLight); p(ctx, ox, oy, 10, 5, c.cyan);
    p(ctx, ox, oy, 4, 6, c.cyanDim); b(ctx, ox, oy, 5, 6, 5, 1, c.purple); p(ctx, ox, oy, 10, 6, c.cyanDim);
    p(ctx, ox, oy, 4, 7, c.cyan); b(ctx, ox, oy, 5, 7, 5, 1, c.casinoLight); p(ctx, ox, oy, 10, 7, c.cyan);
    p(ctx, ox, oy, 5, 8, c.cyanDim); b(ctx, ox, oy, 6, 8, 3, 1, c.purple); p(ctx, ox, oy, 9, 8, c.cyanDim);
    p(ctx, ox, oy, 6, 9, c.cyan); p(ctx, ox, oy, 7, 9, c.cyanDim); p(ctx, ox, oy, 8, 9, c.cyan);
    p(ctx, ox, oy, 7, 10, c.cyan);
    // Glow core
    p(ctx, ox, oy, 7, 6, c.magentaBright);
    p(ctx, ox, oy, 6, 6, c.magenta); p(ctx, ox, oy, 8, 6, c.magenta);
    // Chain links extending to corners
    p(ctx, ox, oy, 3, 3, c.goldDim); p(ctx, ox, oy, 2, 2, c.gold);
    p(ctx, ox, oy, 11, 3, c.goldDim); p(ctx, ox, oy, 12, 2, c.gold);
    p(ctx, ox, oy, 3, 10, c.goldDim); p(ctx, ox, oy, 2, 11, c.gold);
    p(ctx, ox, oy, 11, 10, c.goldDim); p(ctx, ox, oy, 12, 11, c.gold);
    // Rune circles at chain ends
    p(ctx, ox, oy, 1, 1, c.magenta); p(ctx, ox, oy, 12, 1, c.magenta);
    p(ctx, ox, oy, 1, 12, c.magenta); p(ctx, ox, oy, 12, 12, c.magenta);
    // Energy sparks
    p(ctx, ox, oy, 3, 6, c.purple); p(ctx, ox, oy, 11, 7, c.purple);
  }

  // Edges — consistent for all structures
  if (!n) { b(ctx, ox, oy, 0, 0, G, 1, c.edge); p(ctx, ox, oy, 5, 0, c.magentaDim); p(ctx, ox, oy, 10, 0, c.cyan); }
  if (!s) { b(ctx, ox, oy, 0, G - 1, G, 1, c.edge); p(ctx, ox, oy, 4, G - 1, c.magentaDim); p(ctx, ox, oy, 9, G - 1, c.cyan); }
  if (!w) { b(ctx, ox, oy, 0, 0, 1, G, c.edge); p(ctx, ox, oy, 0, 5, c.magentaDim); p(ctx, ox, oy, 0, 10, c.cyan); }
  if (!e) { b(ctx, ox, oy, G - 1, 0, 1, G, c.edge); p(ctx, ox, oy, G - 1, 4, c.magentaDim); p(ctx, ox, oy, G - 1, 9, c.cyan); }
  // Connection indicators when neighbor present
  if (n) { for (let px = 4; px < 10; px += 3) p(ctx, ox, oy, px, 0, c.magentaDim); }
  if (s) { for (let px = 4; px < 10; px += 3) p(ctx, ox, oy, px, G - 1, c.magentaDim); }
  if (w) { for (let py = 4; py < 10; py += 3) p(ctx, ox, oy, 0, py, c.magentaDim); }
  if (e) { for (let py = 4; py < 10; py += 3) p(ctx, ox, oy, G - 1, py, c.magentaDim); }
}

function drawPool(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number, frame: number) {
  const c = PAL.pool;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);

  // Deep void background
  b(ctx, ox, oy, 0, 0, G, G, c.deep);

  // Vortex core background — darker in center
  for (let gy = 2; gy < 12; gy++) {
    for (let gx = 2; gx < 12; gx++) {
      const dx = gx - 7, dy = gy - 7;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 4) p(ctx, ox, oy, gx, gy, c.voidBlack);
      else if (dist < 6) p(ctx, ox, oy, gx, gy, c.vortexCore);
    }
  }

  // Swirling vortex arms — rotate across frames
  const angleOff = frame * (Math.PI * 2 / 3); // 120 degrees per frame
  for (let arm = 0; arm < 3; arm++) {
    const baseAngle = angleOff + arm * (Math.PI * 2 / 3);
    for (let r = 1; r < 6; r++) {
      const spiralAngle = baseAngle + r * 0.5; // spiral tightening
      const sx = Math.round(7 + r * Math.cos(spiralAngle));
      const sy = Math.round(7 + r * Math.sin(spiralAngle));
      if (sx >= 1 && sx < G - 1 && sy >= 1 && sy < G - 1) {
        const armColor = r < 3 ? c.purpleBright : (r < 5 ? c.purple : c.purpleDim);
        p(ctx, ox, oy, sx, sy, armColor);
        // Trail pixel
        const tx = Math.round(7 + (r - 0.5) * Math.cos(spiralAngle - 0.3));
        const ty = Math.round(7 + (r - 0.5) * Math.sin(spiralAngle - 0.3));
        if (tx >= 1 && tx < G - 1 && ty >= 1 && ty < G - 1) {
          p(ctx, ox, oy, tx, ty, c.purpleDim);
        }
      }
    }
  }

  // Magenta energy flares — shift position per frame
  const flareOffsets: [number, number][] = [
    [(3 + frame * 2) % 10 + 2, (2 + frame * 3) % 8 + 3],
    [(8 + frame * 3) % 10 + 2, (5 + frame * 4) % 8 + 3],
    [(5 + frame * 4) % 10 + 2, (9 + frame * 2) % 8 + 3],
  ];
  for (const [fx, fy] of flareOffsets) {
    p(ctx, ox, oy, fx, fy, c.magenta);
    if (fx + 1 < G) p(ctx, ox, oy, fx + 1, fy, c.magentaDim);
  }

  // Stars being pulled into the vortex — move closer to center per frame
  const starSeeds: [number, number, number][] = [
    [2, 2, 0], [11, 3, 1], [3, 10, 2], [10, 11, 0], [1, 6, 1],
    [12, 7, 2], [6, 1, 0], [8, 12, 1],
  ];
  for (const [bx, by, phase] of starSeeds) {
    const pull = ((frame + phase) % 3) * 0.8;
    const dx = 7 - bx, dy = 7 - by;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nx = Math.round(bx + (dx / dist) * pull);
    const ny = Math.round(by + (dy / dist) * pull);
    if (nx >= 0 && nx < G && ny >= 0 && ny < G) {
      p(ctx, ox, oy, nx, ny, (frame + phase) % 3 === 0 ? c.starPulled : c.starDim);
    }
  }

  // Reality distortion wave — concentric broken ring that pulses
  const waveRadius = 3 + frame;
  for (let a = 0; a < 12; a++) {
    const angle = a * (Math.PI * 2 / 12);
    const wx = Math.round(7 + waveRadius * Math.cos(angle));
    const wy = Math.round(7 + waveRadius * Math.sin(angle));
    if (wx >= 0 && wx < G && wy >= 0 && wy < G && a % 2 === frame % 2) {
      p(ctx, ox, oy, wx, wy, c.distortion);
    }
  }

  // Center eye — bright core
  p(ctx, ox, oy, 6, 6, c.purple);
  p(ctx, ox, oy, 7, 6, c.magenta);
  p(ctx, ox, oy, 6, 7, c.magenta);
  p(ctx, ox, oy, 7, 7, frame === 0 ? c.purpleBright : (frame === 1 ? c.magenta : c.cyan));

  // Edges
  if (!n) { b(ctx, ox, oy, 0, 0, G, 1, c.edgeDark); p(ctx, ox, oy, 6 + frame, 0, c.edgeBright); }
  if (!s) { b(ctx, ox, oy, 0, G - 1, G, 1, c.edgeDark); p(ctx, ox, oy, 7 - frame, G - 1, c.edgeBright); }
  if (!w) { b(ctx, ox, oy, 0, 0, 1, G, c.edgeDark); p(ctx, ox, oy, 0, 5 + frame, c.edgeBright); }
  if (!e) { b(ctx, ox, oy, G - 1, 0, 1, G, c.edgeDark); p(ctx, ox, oy, G - 1, 8 - frame, c.edgeBright); }
}

function drawNoBuild(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.noBuild;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  const rng = seeded(idx * 71 + 17);

  // Base obsidian ground (same as ground tile but more damaged)
  b(ctx, ox, oy, 0, 0, G, G, c.base);

  // Obsidian texture
  for (let gy = 0; gy < G; gy++) {
    for (let gx = 0; gx < G; gx++) {
      const r = rng();
      if (r < 0.2) p(ctx, ox, oy, gx, gy, c.obsidian);
      else if (r < 0.3) p(ctx, ox, oy, gx, gy, c.instability);
    }
  }

  // Major fissure — cracked open showing void beneath
  // Main fissure running roughly NW to SE
  const fissurePts: [number, number, number][] = [ // x, y, width
    [2, 1, 1], [3, 2, 2], [3, 3, 2], [4, 4, 3], [4, 5, 3],
    [5, 6, 4], [5, 7, 4], [5, 8, 3], [6, 9, 3], [7, 10, 2],
    [8, 11, 2], [9, 12, 1],
  ];
  for (const [fx, fy, fw] of fissurePts) {
    // Void beneath
    b(ctx, ox, oy, fx, fy, fw, 1, c.voidBelow);
    // Crack edges — bright energy leaking out
    if (fx > 0) p(ctx, ox, oy, fx - 1, fy, c.crack);
    if (fx + fw < G) p(ctx, ox, oy, fx + fw, fy, c.crack);
  }

  // Energy leaking up through the fissure — bright spots
  p(ctx, ox, oy, 5, 5, c.energyLeak);
  p(ctx, ox, oy, 6, 7, c.energyLeak);
  p(ctx, ox, oy, 4, 4, c.crackBright);
  p(ctx, ox, oy, 7, 8, c.energyDim);
  p(ctx, ox, oy, 8, 10, c.energyLeak);

  // Secondary smaller cracks branching off
  p(ctx, ox, oy, 2, 3, c.crackDeep); p(ctx, ox, oy, 1, 4, c.crack);
  p(ctx, ox, oy, 1, 5, c.crackDeep);
  p(ctx, ox, oy, 9, 9, c.crackDeep); p(ctx, ox, oy, 10, 9, c.crack);
  p(ctx, ox, oy, 11, 10, c.crackDeep); p(ctx, ox, oy, 12, 10, c.crack);

  // Sparkles — reality energy escaping
  p(ctx, ox, oy, 4, 3, c.sparkle);
  p(ctx, ox, oy, 8, 6, c.sparkleDim);
  p(ctx, ox, oy, 6, 10, c.sparkle);
  p(ctx, ox, oy, 10, 7, c.sparkleDim);
  p(ctx, ox, oy, 3, 8, c.sparkle);
  p(ctx, ox, oy, 11, 4, c.sparkleDim);

  // Dimensional instability — faint shimmering patches
  p(ctx, ox, oy, 0, 0, c.instability); p(ctx, ox, oy, 1, 1, c.instability);
  p(ctx, ox, oy, 12, 3, c.instability); p(ctx, ox, oy, 13, 13, c.instability);
  p(ctx, ox, oy, 1, 11, c.instability);

  // Edge fissures — indicate connectivity
  if (!n) { p(ctx, ox, oy, 3, 0, c.edgeFissure); p(ctx, ox, oy, 4, 0, c.edgeFissure); p(ctx, ox, oy, 10, 0, c.crack); }
  if (!s) { p(ctx, ox, oy, 8, G - 1, c.edgeFissure); p(ctx, ox, oy, 9, G - 1, c.edgeFissure); p(ctx, ox, oy, 4, G - 1, c.crack); }
  if (!w) { p(ctx, ox, oy, 0, 4, c.edgeFissure); p(ctx, ox, oy, 0, 5, c.edgeFissure); p(ctx, ox, oy, 0, 10, c.crack); }
  if (!e) { p(ctx, ox, oy, G - 1, 6, c.edgeFissure); p(ctx, ox, oy, G - 1, 7, c.edgeFissure); p(ctx, ox, oy, G - 1, 3, c.crack); }

  // Connection — fissure extends toward neighbors
  if (n) { p(ctx, ox, oy, 3, 0, c.voidBelow); p(ctx, ox, oy, 4, 0, c.voidBelow); p(ctx, ox, oy, 3, 1, c.crackDeep); }
  if (s) { p(ctx, ox, oy, 9, G - 1, c.voidBelow); p(ctx, ox, oy, 8, G - 1, c.voidBelow); p(ctx, ox, oy, 9, G - 2, c.crackDeep); }
  if (w) { p(ctx, ox, oy, 0, 4, c.voidBelow); p(ctx, ox, oy, 0, 5, c.voidBelow); p(ctx, ox, oy, 1, 4, c.crackDeep); }
  if (e) { p(ctx, ox, oy, G - 1, 7, c.voidBelow); p(ctx, ox, oy, G - 1, 6, c.voidBelow); p(ctx, ox, oy, G - 2, 7, c.crackDeep); }
}

function drawDoodad(ctx: CanvasRenderingContext2D, ox: number, oy: number, type: number) {
  ctx.clearRect(ox, oy, T, T);
  const d = PAL.doodad;
  switch (type) {
    case 0: {
      // Casino chip stack — 3 stacked chips with void markings
      // Bottom chip
      b(ctx, ox, oy, 4, 10, 6, 2, d.magentaDim);
      p(ctx, ox, oy, 3, 10, d.magentaDim); p(ctx, ox, oy, 10, 10, d.magentaDim);
      p(ctx, ox, oy, 5, 11, d.gold); p(ctx, ox, oy, 8, 11, d.gold);
      // Middle chip
      b(ctx, ox, oy, 4, 8, 6, 2, d.purple);
      p(ctx, ox, oy, 3, 8, d.purpleDim); p(ctx, ox, oy, 10, 8, d.purpleDim);
      p(ctx, ox, oy, 5, 9, d.goldDim); p(ctx, ox, oy, 8, 9, d.goldDim);
      // Top chip
      b(ctx, ox, oy, 4, 6, 6, 2, d.magenta);
      p(ctx, ox, oy, 3, 6, d.magentaDim); p(ctx, ox, oy, 10, 6, d.magentaDim);
      p(ctx, ox, oy, 5, 6, d.gold); p(ctx, ox, oy, 8, 6, d.gold);
      p(ctx, ox, oy, 6, 6, d.goldBright); p(ctx, ox, oy, 7, 6, d.goldBright);
      // Top face detail — void symbol
      p(ctx, ox, oy, 6, 7, d.dark); p(ctx, ox, oy, 7, 7, d.dark);
      // Gleam
      p(ctx, ox, oy, 4, 6, d.magentaBright);
      // Shadow
      p(ctx, ox, oy, 5, 12, d.dark); p(ctx, ox, oy, 6, 12, d.dark);
      p(ctx, ox, oy, 7, 12, d.dark); p(ctx, ox, oy, 8, 12, d.dark);
      break;
    }
    case 1: {
      // Floating d6 die — tilted, with void pips
      // Die body (slightly rotated look)
      b(ctx, ox, oy, 4, 3, 6, 6, d.silver);
      b(ctx, ox, oy, 5, 4, 4, 4, d.white);
      // 3D bevel
      b(ctx, ox, oy, 4, 3, 6, 1, d.white);
      b(ctx, ox, oy, 4, 3, 1, 6, d.white);
      b(ctx, ox, oy, 4, 8, 6, 1, d.dark);
      b(ctx, ox, oy, 9, 3, 1, 6, d.dark);
      // Pips (showing 5) — magenta glowing dots
      p(ctx, ox, oy, 5, 4, d.magenta); p(ctx, ox, oy, 8, 4, d.magenta);
      p(ctx, ox, oy, 5, 7, d.magenta); p(ctx, ox, oy, 8, 7, d.magenta);
      p(ctx, ox, oy, 6, 5, d.magentaBright); p(ctx, ox, oy, 7, 6, d.magentaBright);
      // Floating effect — shadow below
      p(ctx, ox, oy, 5, 10, d.purpleDim); p(ctx, ox, oy, 6, 10, d.purpleDim);
      p(ctx, ox, oy, 7, 10, d.purpleDim); p(ctx, ox, oy, 8, 10, d.purpleDim);
      p(ctx, ox, oy, 6, 11, d.dark); p(ctx, ox, oy, 7, 11, d.dark);
      // Void energy wisps underneath
      p(ctx, ox, oy, 5, 9, d.purple); p(ctx, ox, oy, 8, 9, d.purple);
      // Sparkle on corner
      p(ctx, ox, oy, 4, 3, d.cyanBright);
      break;
    }
    case 2: {
      // Portal fragment — broken arc piece with residual energy
      // Arc shape (partial ring)
      p(ctx, ox, oy, 4, 2, d.purple); p(ctx, ox, oy, 5, 2, d.purpleBright);
      p(ctx, ox, oy, 6, 2, d.purple);
      p(ctx, ox, oy, 3, 3, d.purple); p(ctx, ox, oy, 7, 3, d.purpleDim);
      p(ctx, ox, oy, 2, 4, d.purpleBright); p(ctx, ox, oy, 8, 4, d.purpleDim);
      p(ctx, ox, oy, 2, 5, d.purple); p(ctx, ox, oy, 9, 5, d.purpleDim);
      p(ctx, ox, oy, 2, 6, d.purpleBright); p(ctx, ox, oy, 9, 6, d.purple);
      p(ctx, ox, oy, 3, 7, d.purple); p(ctx, ox, oy, 10, 7, d.purpleDim);
      p(ctx, ox, oy, 4, 8, d.purpleDim);
      // Residual energy inside fragment
      p(ctx, ox, oy, 5, 4, d.voidEnergy); p(ctx, ox, oy, 6, 5, d.magenta);
      p(ctx, ox, oy, 4, 5, d.magentaDim); p(ctx, ox, oy, 7, 6, d.magentaDim);
      p(ctx, ox, oy, 5, 6, d.voidEnergy);
      // Broken edge particles
      p(ctx, ox, oy, 8, 3, d.purple); p(ctx, ox, oy, 10, 5, d.purpleDim);
      p(ctx, ox, oy, 5, 9, d.purpleDim);
      // Energy sparks
      p(ctx, ox, oy, 3, 4, d.cyanBright);
      p(ctx, ox, oy, 6, 7, d.cyan);
      break;
    }
    case 3: {
      // Void crystal — tall hexagonal crystal with inner glow
      // Crystal body — tall diamond
      p(ctx, ox, oy, 7, 1, d.cyanBright);
      p(ctx, ox, oy, 6, 2, d.cyan); p(ctx, ox, oy, 7, 2, d.cyanBright); p(ctx, ox, oy, 8, 2, d.cyan);
      p(ctx, ox, oy, 5, 3, d.cyanDim); p(ctx, ox, oy, 6, 3, d.purple); p(ctx, ox, oy, 7, 3, d.cyan); p(ctx, ox, oy, 8, 3, d.purple); p(ctx, ox, oy, 9, 3, d.cyanDim);
      p(ctx, ox, oy, 5, 4, d.cyanDim); p(ctx, ox, oy, 6, 4, d.purple); p(ctx, ox, oy, 7, 4, d.voidEnergy); p(ctx, ox, oy, 8, 4, d.purple); p(ctx, ox, oy, 9, 4, d.cyanDim);
      p(ctx, ox, oy, 5, 5, d.cyanDim); p(ctx, ox, oy, 6, 5, d.purpleBright); p(ctx, ox, oy, 7, 5, d.magenta); p(ctx, ox, oy, 8, 5, d.purpleBright); p(ctx, ox, oy, 9, 5, d.cyanDim);
      p(ctx, ox, oy, 5, 6, d.purple); p(ctx, ox, oy, 6, 6, d.purple); p(ctx, ox, oy, 7, 6, d.voidEnergy); p(ctx, ox, oy, 8, 6, d.purple); p(ctx, ox, oy, 9, 6, d.purple);
      p(ctx, ox, oy, 5, 7, d.purpleDim); p(ctx, ox, oy, 6, 7, d.purple); p(ctx, ox, oy, 7, 7, d.magentaDim); p(ctx, ox, oy, 8, 7, d.purple); p(ctx, ox, oy, 9, 7, d.purpleDim);
      p(ctx, ox, oy, 6, 8, d.purpleDim); p(ctx, ox, oy, 7, 8, d.purple); p(ctx, ox, oy, 8, 8, d.purpleDim);
      p(ctx, ox, oy, 7, 9, d.purpleDim);
      // Base
      p(ctx, ox, oy, 6, 10, d.dark); p(ctx, ox, oy, 7, 10, d.dark); p(ctx, ox, oy, 8, 10, d.dark);
      // Glow beneath
      p(ctx, ox, oy, 6, 11, d.purpleDim); p(ctx, ox, oy, 7, 11, d.purpleDim); p(ctx, ox, oy, 8, 11, d.purpleDim);
      // Highlight facets
      p(ctx, ox, oy, 6, 2, d.white);
      break;
    }
    case 4: {
      // Slot machine lever — arm with orb handle
      // Base mount
      b(ctx, ox, oy, 6, 10, 3, 2, d.dark);
      b(ctx, ox, oy, 6, 9, 3, 1, d.silver);
      // Lever arm (angled)
      p(ctx, ox, oy, 7, 8, d.silver); p(ctx, ox, oy, 7, 7, d.silver);
      p(ctx, ox, oy, 8, 6, d.silver); p(ctx, ox, oy, 8, 5, d.silver);
      p(ctx, ox, oy, 9, 4, d.silver);
      // Orb handle at top
      p(ctx, ox, oy, 8, 3, d.magenta); p(ctx, ox, oy, 9, 3, d.magentaBright);
      p(ctx, ox, oy, 10, 3, d.magenta);
      p(ctx, ox, oy, 9, 2, d.magentaBright);
      p(ctx, ox, oy, 9, 4, d.magentaDim);
      // Gleam on orb
      p(ctx, ox, oy, 9, 2, d.white);
      // Hinge detail
      p(ctx, ox, oy, 7, 9, d.goldDim);
      // Energy glow from orb
      p(ctx, ox, oy, 10, 2, d.purpleDim);
      p(ctx, ox, oy, 8, 2, d.purpleDim);
      // Shadow
      p(ctx, ox, oy, 5, 11, d.dark); p(ctx, ox, oy, 9, 11, d.dark);
      break;
    }
    case 5: {
      // Probability sphere — glowing orb with probability wave patterns
      // Outer shell
      p(ctx, ox, oy, 6, 3, d.cyan); p(ctx, ox, oy, 7, 3, d.cyan);
      p(ctx, ox, oy, 5, 4, d.cyan); p(ctx, ox, oy, 8, 4, d.cyan);
      p(ctx, ox, oy, 4, 5, d.cyanDim); p(ctx, ox, oy, 9, 5, d.cyanDim);
      p(ctx, ox, oy, 4, 6, d.cyanDim); p(ctx, ox, oy, 9, 6, d.cyanDim);
      p(ctx, ox, oy, 4, 7, d.cyan); p(ctx, ox, oy, 9, 7, d.cyan);
      p(ctx, ox, oy, 5, 8, d.cyan); p(ctx, ox, oy, 8, 8, d.cyan);
      p(ctx, ox, oy, 6, 9, d.cyanDim); p(ctx, ox, oy, 7, 9, d.cyanDim);
      // Inner fill — dark with probability wave
      b(ctx, ox, oy, 5, 5, 4, 3, d.dark);
      p(ctx, ox, oy, 6, 4, d.dark); p(ctx, ox, oy, 7, 4, d.dark);
      p(ctx, ox, oy, 6, 8, d.dark); p(ctx, ox, oy, 7, 8, d.dark);
      // Probability wave pattern inside (sine wave)
      p(ctx, ox, oy, 5, 6, d.voidEnergy); p(ctx, ox, oy, 6, 5, d.magenta);
      p(ctx, ox, oy, 7, 6, d.voidEnergy); p(ctx, ox, oy, 8, 7, d.magenta);
      // Question mark / uncertainty symbol inside
      p(ctx, ox, oy, 6, 5, d.white); p(ctx, ox, oy, 7, 5, d.white);
      p(ctx, ox, oy, 7, 6, d.white); p(ctx, ox, oy, 6, 7, d.white);
      // Glow
      p(ctx, ox, oy, 5, 3, d.cyanBright); // top highlight
      // Floating shadow
      p(ctx, ox, oy, 6, 11, d.purpleDim); p(ctx, ox, oy, 7, 11, d.purpleDim);
      p(ctx, ox, oy, 5, 10, d.dark); p(ctx, ox, oy, 8, 10, d.dark);
      break;
    }
    case 6: {
      // Dimensional rift scar — jagged tear in space
      // Rift line — jagged vertical tear
      p(ctx, ox, oy, 7, 1, d.voidEnergy);
      p(ctx, ox, oy, 6, 2, d.magentaBright); p(ctx, ox, oy, 7, 2, d.white);
      p(ctx, ox, oy, 8, 3, d.magentaBright); p(ctx, ox, oy, 7, 3, d.white);
      p(ctx, ox, oy, 6, 4, d.voidEnergy); p(ctx, ox, oy, 7, 4, d.white); p(ctx, ox, oy, 8, 4, d.magenta);
      p(ctx, ox, oy, 5, 5, d.magentaDim); p(ctx, ox, oy, 6, 5, d.magentaBright); p(ctx, ox, oy, 7, 5, d.white); p(ctx, ox, oy, 8, 5, d.magentaDim);
      p(ctx, ox, oy, 6, 6, d.voidEnergy); p(ctx, ox, oy, 7, 6, d.white); p(ctx, ox, oy, 8, 6, d.magenta);
      p(ctx, ox, oy, 7, 7, d.white); p(ctx, ox, oy, 8, 7, d.magentaBright);
      p(ctx, ox, oy, 6, 8, d.magenta); p(ctx, ox, oy, 7, 8, d.white);
      p(ctx, ox, oy, 7, 9, d.magentaBright);
      p(ctx, ox, oy, 6, 10, d.voidEnergy);
      p(ctx, ox, oy, 7, 11, d.magentaDim);
      // Void showing through the tear — black center
      p(ctx, ox, oy, 7, 4, d.black); p(ctx, ox, oy, 7, 5, d.black); p(ctx, ox, oy, 7, 6, d.black);
      // Energy dissipating outward
      p(ctx, ox, oy, 4, 5, d.purpleDim); p(ctx, ox, oy, 10, 6, d.purpleDim);
      p(ctx, ox, oy, 3, 4, d.purpleDim); p(ctx, ox, oy, 10, 7, d.purpleDim);
      p(ctx, ox, oy, 9, 4, d.purple); p(ctx, ox, oy, 5, 7, d.purple);
      break;
    }
    case 7: {
      // Lucky coin — spinning void coin with arcane symbol
      // Coin body (circular)
      p(ctx, ox, oy, 6, 3, d.gold); p(ctx, ox, oy, 7, 3, d.gold);
      p(ctx, ox, oy, 5, 4, d.gold); p(ctx, ox, oy, 6, 4, d.goldBright); p(ctx, ox, oy, 7, 4, d.goldBright); p(ctx, ox, oy, 8, 4, d.gold);
      p(ctx, ox, oy, 4, 5, d.goldDim); p(ctx, ox, oy, 5, 5, d.goldBright); p(ctx, ox, oy, 6, 5, d.gold); p(ctx, ox, oy, 7, 5, d.gold); p(ctx, ox, oy, 8, 5, d.goldBright); p(ctx, ox, oy, 9, 5, d.goldDim);
      p(ctx, ox, oy, 4, 6, d.goldDim); p(ctx, ox, oy, 5, 6, d.gold); p(ctx, ox, oy, 6, 6, d.goldBright); p(ctx, ox, oy, 7, 6, d.goldBright); p(ctx, ox, oy, 8, 6, d.gold); p(ctx, ox, oy, 9, 6, d.goldDim);
      p(ctx, ox, oy, 4, 7, d.goldDim); p(ctx, ox, oy, 5, 7, d.gold); p(ctx, ox, oy, 6, 7, d.gold); p(ctx, ox, oy, 7, 7, d.gold); p(ctx, ox, oy, 8, 7, d.gold); p(ctx, ox, oy, 9, 7, d.goldDim);
      p(ctx, ox, oy, 5, 8, d.goldDim); p(ctx, ox, oy, 6, 8, d.goldDim); p(ctx, ox, oy, 7, 8, d.goldDim); p(ctx, ox, oy, 8, 8, d.goldDim);
      p(ctx, ox, oy, 6, 9, d.goldDim); p(ctx, ox, oy, 7, 9, d.goldDim);
      // Void symbol on coin — stylized eye/portal
      p(ctx, ox, oy, 6, 5, d.magenta); p(ctx, ox, oy, 7, 5, d.magenta);
      p(ctx, ox, oy, 6, 7, d.magenta); p(ctx, ox, oy, 7, 7, d.magenta);
      p(ctx, ox, oy, 6, 6, d.voidEnergy); p(ctx, ox, oy, 7, 6, d.voidEnergy);
      // Coin gleam
      p(ctx, ox, oy, 5, 4, d.white);
      // Floating sparkles around coin
      p(ctx, ox, oy, 3, 3, d.cyanBright);
      p(ctx, ox, oy, 10, 4, d.cyan);
      p(ctx, ox, oy, 3, 8, d.purpleDim);
      p(ctx, ox, oy, 10, 8, d.purpleDim);
      // Shadow
      p(ctx, ox, oy, 6, 11, d.dark); p(ctx, ox, oy, 7, 11, d.dark);
      break;
    }
  }
}

export default function VoidTerrainSprites() {
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
      drawRock(tCtx, ox, 1 * T, v);
      for (let f = 0; f < 3; f++) drawPool(tCtx, ox, (2 + f) * T, v, f);
      drawNoBuild(tCtx, ox, 5 * T, v);
    }
    const tp = terrainPreviewRef.current!;
    const scale = 3;
    tp.width = VARIANTS * T * scale + 140;
    tp.height = TERRAIN_ROWS * T * scale + 40;
    const tpCtx = tp.getContext('2d')!;
    tpCtx.imageSmoothingEnabled = false;
    tpCtx.fillStyle = '#030006';
    tpCtx.fillRect(0, 0, tp.width, tp.height);
    tpCtx.drawImage(tc, 140, 20, tc.width * scale, tc.height * scale);
    tpCtx.fillStyle = '#22ccaa';
    tpCtx.font = '11px monospace';
    const rowLabels = ['Ground', 'Casino Block', 'Void Pool 0', 'Void Pool 1', 'Void Pool 2', 'NoBuild'];
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
    dpCtx.fillStyle = '#030006';
    dpCtx.fillRect(0, 0, dp.width, dp.height);
    dpCtx.drawImage(dc, 80, 20, dc.width * dScale, dc.height * dScale);
    dpCtx.fillStyle = '#22ccaa';
    dpCtx.font = '11px monospace';
    dpCtx.fillText('Void', 4, 20 + T * dScale / 2 + 4);
    setReady(true);
  }, []);

  const download = (ref: React.RefObject<HTMLCanvasElement | null>, name: string) => {
    const a = document.createElement('a');
    a.download = name;
    a.href = ref.current!.toDataURL('image/png');
    a.click();
  };

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', color: '#22ccaa', background: '#030006' }}>
      <h2 data-label="Void Terrain">Void Terrain Sprites — Rift Dimension</h2>
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setView('preview')} style={{ marginRight: 8, background: view === 'preview' ? '#22ccaa' : '#0a0816', color: view === 'preview' ? '#030006' : '#22ccaa', border: '1px solid #22ccaa', padding: '4px 12px', cursor: 'pointer' }}>Preview (3x)</button>
        <button onClick={() => setView('actual')} style={{ marginRight: 8, background: view === 'actual' ? '#22ccaa' : '#0a0816', color: view === 'actual' ? '#030006' : '#22ccaa', border: '1px solid #22ccaa', padding: '4px 12px', cursor: 'pointer' }}>Actual Size</button>
        {ready && (
          <>
            <button onClick={() => download(terrainRef, 'void_terrain_tileset.png')} style={{ marginRight: 8, background: '#0a0816', color: '#22ccaa', border: '1px solid #22ccaa', padding: '4px 12px', cursor: 'pointer' }}>Download Tileset</button>
            <button onClick={() => download(doodadRef, 'void_terrain_doodads.png')} style={{ background: '#0a0816', color: '#22ccaa', border: '1px solid #22ccaa', padding: '4px 12px', cursor: 'pointer' }}>Download Doodads</button>
          </>
        )}
      </div>
      <p style={{ fontSize: '12px', color: '#0e5544' }} data-frame-size="28x28">Frame size: 28x28 | PX=2 | Grid=14x14 | 16 cols (NESW bitmask) x 6 rows</p>
      <h3 data-label="Void Terrain (Preview)">Terrain Tileset (16 auto-tile variants x 6 rows)</h3>
      <canvas ref={terrainPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #22ccaa33' }} />
      <canvas ref={terrainRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #22ccaa33' }} />
      <h3>Rift Dimension Doodads (8 types)</h3>
      <canvas ref={doodadPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #22ccaa33' }} />
      <canvas ref={doodadRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #22ccaa33' }} />
    </div>
  );
}
