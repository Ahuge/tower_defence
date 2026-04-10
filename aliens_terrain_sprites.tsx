/**
 * Aliens Terrain Sprite Generator — Hive Tunnels terrain.
 *
 * Layout:
 *   Columns: 16 (auto-tile bitmask variants, bits = NESW)
 *   Row order:
 *   0: organic floor (ground) — slimy membrane with bioluminescent spots, chitinous plates, veins
 *   1: hive walls (blocked type 1) — thick organic walls, embedded eggs, hexagonal structure
 *   2: acid pool frame 0 (blocked type 2) — toxic pools with bubbles
 *   3: acid pool frame 1 (blocked type 2, animated)
 *   4: acid pool frame 2 (blocked type 2, animated)
 *   5: spider webs (NoBuild terrain) — silky web strands, anchors, caught debris
 *
 * Doodads row 0: 8 types
 *   0: alien egg, 1: slime trail, 2: shed carapace, 3: bioluminescent fungus,
 *   4: web cocoon, 5: acid droplet, 6: bone fragment (prey), 7: larva
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
    base: '#0e160a',
    baseLt: '#111a0d',
    accent: '#141e10',
    accentDk: '#0b120a',
  },
  wall: {
    core: '#2a3a15',
    coreDark: '#1e2c0e',
    shell: '#3a5020',
    shellBright: '#4a6628',
    ridge: '#507530',
    ridgeBright: '#609838',
    edge: '#446628',
    edgeDark: '#2a4018',
    hex: '#354a1c',
    hexLine: '#405822',
    egg: '#bbbb66',
    eggDim: '#998844',
    eggGlow: '#ddddaa',
    vein: '#cc3322',
    veinDim: '#882218',
    bump: '#4a6628',
    highlight: '#77cc44',
    pore: '#1a2a0c',
  },
  acid: {
    deep: '#0a2205',
    mid: '#103808',
    surface: '#18500c',
    bubble: '#99ff33',
    bubbleBright: '#ccff66',
    bubbleMid: '#66dd18',
    bubbleDim: '#44aa10',
    bubblePop: '#eeffaa',
    edge: '#1a4008',
    edgeCorr: '#223a06',
    glow: '#33aa11',
    glowBright: '#55cc22',
    ground: '#151f0d',
    groundDark: '#0f170a',
  },
  noBuild: {
    base: '#151f0d',
    baseDark: '#0f170a',
    web: '#aabbaa',
    webBright: '#ccddcc',
    webDim: '#889988',
    webFaint: '#667766',
    anchor: '#ddeedd',
    anchorDim: '#aabbaa',
    sticky: '#99aa99',
    debris: '#887755',
    debrisDark: '#665533',
    vein: '#1e3015',
  },
  doodad: {
    green: '#88ff22',
    greenDim: '#55cc11',
    greenBright: '#bbff66',
    slime: '#66cc11',
    slimeDark: '#448808',
    chitin: '#446622',
    chitinDark: '#334418',
    chitinBright: '#558833',
    dark: '#1a2a0c',
    yellow: '#bbbb66',
    yellowDim: '#998844',
    pale: '#ddddaa',
    paleDim: '#bbbb88',
    red: '#cc3322',
    redDim: '#882218',
    purple: '#664488',
    cyan: '#33ffaa',
    cyanDim: '#22aa66',
    bone: '#ccccaa',
    boneDark: '#999977',
    boneLight: '#eeeedd',
    web: '#aabbaa',
    webBright: '#ccddcc',
  },
};

/* Seeded pseudo-random for deterministic tile noise */
function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return (s >> 16) / 32768;
  };
}

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
  // Dark organic floor base
  b(ctx, ox, oy, 0, 0, G, G, c.base);
  // A few subtle texture pixels (faint green-organic tint)
  p(ctx, ox, oy, 5, 4, c.baseLt);
  p(ctx, ox, oy, 10, 9, c.accent);
  p(ctx, ox, oy, 2, 11, c.baseLt);
  // One darker depression
  p(ctx, ox, oy, 8, 2, c.accentDk);
}

function drawWall(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.wall;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  const rng = seededRand(idx * 137 + 7);

  // Core fill
  b(ctx, ox, oy, 0, 0, G, G, c.coreDark);

  // Inner mass — slightly lighter
  b(ctx, ox, oy, 1, 1, G - 2, G - 2, c.core);

  // Hexagonal honeycomb structure in the wall interior
  // Hex pattern — offset rows of hexagonal cells
  const hexColor = [c.hex, c.hexLine];
  for (let row = 1; row < G - 1; row += 3) {
    const offset = (row % 6 === 1) ? 0 : 2;
    for (let col = offset; col < G - 1; col += 4) {
      // Each hex cell: draw outline
      if (col + 2 < G && row + 2 < G) {
        p(ctx, ox, oy, col + 1, row, hexColor[1]);
        p(ctx, ox, oy, col + 2, row, hexColor[1]);
        p(ctx, ox, oy, col, row + 1, hexColor[1]);
        p(ctx, ox, oy, col + 3, row + 1, hexColor[1]);
        p(ctx, ox, oy, col + 1, row + 2, hexColor[1]);
        p(ctx, ox, oy, col + 2, row + 2, hexColor[1]);
        // Interior
        p(ctx, ox, oy, col + 1, row + 1, hexColor[0]);
        p(ctx, ox, oy, col + 2, row + 1, hexColor[0]);
      }
    }
  }

  // Chitinous ridges — thick organic horizontal bands
  b(ctx, ox, oy, 2, 3, G - 4, 1, c.ridge);
  p(ctx, ox, oy, 3, 3, c.ridgeBright);
  p(ctx, ox, oy, 7, 3, c.ridgeBright);

  b(ctx, ox, oy, 2, 7, G - 4, 1, c.ridge);
  p(ctx, ox, oy, 5, 7, c.ridgeBright);
  p(ctx, ox, oy, 10, 7, c.ridgeBright);

  b(ctx, ox, oy, 2, 11, G - 4, 1, c.ridge);
  p(ctx, ox, oy, 4, 11, c.ridgeBright);
  p(ctx, ox, oy, 9, 11, c.ridgeBright);

  // Embedded egg (center-ish)
  p(ctx, ox, oy, 5, 4, c.eggDim);
  p(ctx, ox, oy, 6, 4, c.egg);
  p(ctx, ox, oy, 7, 4, c.eggDim);
  p(ctx, ox, oy, 5, 5, c.egg);
  p(ctx, ox, oy, 6, 5, c.eggGlow);
  p(ctx, ox, oy, 7, 5, c.egg);
  p(ctx, ox, oy, 5, 6, c.eggDim);
  p(ctx, ox, oy, 6, 6, c.egg);
  p(ctx, ox, oy, 7, 6, c.eggDim);

  // Pulsing red veins — blood vessels through the wall
  p(ctx, ox, oy, 3, 2, c.veinDim);
  p(ctx, ox, oy, 4, 2, c.vein);
  p(ctx, ox, oy, 4, 1, c.veinDim);

  p(ctx, ox, oy, 9, 8, c.veinDim);
  p(ctx, ox, oy, 10, 9, c.vein);
  p(ctx, ox, oy, 10, 10, c.veinDim);
  p(ctx, ox, oy, 11, 10, c.veinDim);

  // Small secondary vein
  p(ctx, ox, oy, 2, 9, c.veinDim);
  p(ctx, ox, oy, 3, 10, c.veinDim);

  // Organic pores — dark spots
  p(ctx, ox, oy, 8, 2, c.pore);
  p(ctx, ox, oy, 3, 6, c.pore);
  p(ctx, ox, oy, 11, 5, c.pore);
  p(ctx, ox, oy, 4, 12, c.pore);

  // Organic bumps / nodules
  p(ctx, ox, oy, 9, 1, c.bump); p(ctx, ox, oy, 10, 2, c.shellBright);
  p(ctx, ox, oy, 2, 5, c.bump); p(ctx, ox, oy, 11, 8, c.bump);
  p(ctx, ox, oy, 8, 12, c.shellBright);

  // Bioluminescent highlight — wall glow
  p(ctx, ox, oy, 6, 5, c.highlight);
  p(ctx, ox, oy, 12, 6, c.highlight);

  // Random texture noise
  for (let gy = 1; gy < G - 1; gy++) {
    for (let gx = 1; gx < G - 1; gx++) {
      const r = rng();
      if (r < 0.06) p(ctx, ox, oy, gx, gy, c.shell);
      else if (r < 0.10) p(ctx, ox, oy, gx, gy, c.coreDark);
    }
  }

  // Edge borders — exposed wall face
  if (!n) {
    b(ctx, ox, oy, 0, 0, G, 1, c.edge);
    b(ctx, ox, oy, 0, 1, G, 1, c.edgeDark);
    p(ctx, ox, oy, 3, 0, c.ridgeBright); p(ctx, ox, oy, 7, 0, c.shellBright);
    p(ctx, ox, oy, 11, 0, c.bump);
  }
  if (!s) {
    b(ctx, ox, oy, 0, G - 1, G, 1, c.edge);
    b(ctx, ox, oy, 0, G - 2, G, 1, c.edgeDark);
    p(ctx, ox, oy, 4, G - 1, c.bump); p(ctx, ox, oy, 9, G - 1, c.ridgeBright);
  }
  if (!w) {
    b(ctx, ox, oy, 0, 0, 1, G, c.edge);
    b(ctx, ox, oy, 1, 0, 1, G, c.edgeDark);
    p(ctx, ox, oy, 0, 3, c.ridgeBright); p(ctx, ox, oy, 0, 8, c.bump);
    p(ctx, ox, oy, 0, 12, c.shellBright);
  }
  if (!e) {
    b(ctx, ox, oy, G - 1, 0, 1, G, c.edge);
    b(ctx, ox, oy, G - 2, 0, 1, G, c.edgeDark);
    p(ctx, ox, oy, G - 1, 4, c.bump); p(ctx, ox, oy, G - 1, 10, c.ridgeBright);
  }

  // Continuation markers when wall connects to neighbor
  if (n) {
    for (let px = 2; px < G - 2; px += 3) p(ctx, ox, oy, px, 0, c.ridge);
    p(ctx, ox, oy, 6, 0, c.hexLine); p(ctx, ox, oy, 7, 0, c.hexLine);
  }
  if (s) {
    for (let px = 2; px < G - 2; px += 3) p(ctx, ox, oy, px, G - 1, c.ridge);
    p(ctx, ox, oy, 6, G - 1, c.hexLine); p(ctx, ox, oy, 7, G - 1, c.hexLine);
  }
  if (w) {
    for (let py = 2; py < G - 2; py += 3) p(ctx, ox, oy, 0, py, c.ridge);
    p(ctx, ox, oy, 0, 6, c.hexLine); p(ctx, ox, oy, 0, 7, c.hexLine);
  }
  if (e) {
    for (let py = 2; py < G - 2; py += 3) p(ctx, ox, oy, G - 1, py, c.ridge);
    p(ctx, ox, oy, G - 1, 6, c.hexLine); p(ctx, ox, oy, G - 1, 7, c.hexLine);
  }

  // Corner reinforcement when both neighbors present
  if (n && w) { p(ctx, ox, oy, 0, 0, c.core); p(ctx, ox, oy, 1, 1, c.hex); }
  if (n && e) { p(ctx, ox, oy, G - 1, 0, c.core); p(ctx, ox, oy, G - 2, 1, c.hex); }
  if (s && w) { p(ctx, ox, oy, 0, G - 1, c.core); p(ctx, ox, oy, 1, G - 2, c.hex); }
  if (s && e) { p(ctx, ox, oy, G - 1, G - 1, c.core); p(ctx, ox, oy, G - 2, G - 2, c.hex); }
}

function drawAcid(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number, frame: number) {
  const c = PAL.acid;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  const rng = seededRand(idx * 53 + frame * 17 + 99);

  // Deep acid fill
  b(ctx, ox, oy, 0, 0, G, G, c.deep);

  // Layered depth — mid-tone inner area
  b(ctx, ox, oy, 1, 1, G - 2, G - 2, c.mid);
  b(ctx, ox, oy, 2, 2, G - 4, G - 4, c.surface);

  // Swirling acid surface pattern — shifts with frame
  for (let gy = 1; gy < G - 1; gy++) {
    for (let gx = 1; gx < G - 1; gx++) {
      const r = rng();
      if (r < 0.08) p(ctx, ox, oy, gx, gy, c.glow);
      else if (r < 0.14) p(ctx, ox, oy, gx, gy, c.mid);
    }
  }

  // Toxic glow streaks — horizontal surface reflections
  const streakY1 = 3 + frame;
  const streakY2 = 8 + ((frame + 1) % 3);
  b(ctx, ox, oy, 2, streakY1, 4, 1, c.glow);
  p(ctx, ox, oy, 4, streakY1, c.glowBright);
  b(ctx, ox, oy, 7, streakY2, 5, 1, c.glow);
  p(ctx, ox, oy, 9, streakY2, c.glowBright);

  // === Animated bubbles — 3 clusters with lifecycle across frames ===

  // Cluster 1: large bubble — forms, grows, pops
  if (frame === 0) {
    // Small forming bubble
    p(ctx, ox, oy, 4, 5, c.bubbleMid);
    p(ctx, ox, oy, 4, 6, c.bubbleDim);
  } else if (frame === 1) {
    // Grown bubble with highlight
    p(ctx, ox, oy, 3, 5, c.bubbleDim);
    p(ctx, ox, oy, 4, 5, c.bubble);
    p(ctx, ox, oy, 5, 5, c.bubbleDim);
    p(ctx, ox, oy, 4, 4, c.bubbleDim);
    p(ctx, ox, oy, 4, 6, c.bubbleMid);
    p(ctx, ox, oy, 4, 5, c.bubbleBright); // highlight center
  } else {
    // Popping — splash ring
    p(ctx, ox, oy, 3, 4, c.bubbleDim);
    p(ctx, ox, oy, 5, 4, c.bubbleDim);
    p(ctx, ox, oy, 3, 6, c.bubbleDim);
    p(ctx, ox, oy, 5, 6, c.bubbleDim);
    p(ctx, ox, oy, 4, 5, c.bubblePop);
    p(ctx, ox, oy, 4, 3, c.bubbleMid);
    p(ctx, ox, oy, 2, 5, c.bubbleDim);
  }

  // Cluster 2: medium bubble — offset timing
  const c2x = 9, c2y = 3;
  if (frame === 0) {
    // Grown
    p(ctx, ox, oy, c2x, c2y, c.bubble);
    p(ctx, ox, oy, c2x + 1, c2y, c.bubbleMid);
    p(ctx, ox, oy, c2x, c2y + 1, c.bubbleMid);
    p(ctx, ox, oy, c2x, c2y, c.bubbleBright);
  } else if (frame === 1) {
    // Popping
    p(ctx, ox, oy, c2x - 1, c2y - 1, c.bubbleDim);
    p(ctx, ox, oy, c2x + 1, c2y - 1, c.bubbleDim);
    p(ctx, ox, oy, c2x, c2y, c.bubblePop);
    p(ctx, ox, oy, c2x + 2, c2y, c.bubbleDim);
    p(ctx, ox, oy, c2x, c2y + 1, c.bubbleDim);
  } else {
    // Reforming — tiny
    p(ctx, ox, oy, c2x, c2y + 1, c.bubbleDim);
  }

  // Cluster 3: small rising bubbles
  const riseBase = 10 - frame;
  p(ctx, ox, oy, 7, riseBase, c.bubbleMid);
  p(ctx, ox, oy, 6, riseBase - 2, c.bubbleDim);
  p(ctx, ox, oy, 8, riseBase - 1, c.bubble);

  // Cluster 4: tiny scattered bubbles
  p(ctx, ox, oy, (2 + frame * 3) % (G - 2) + 1, (11 - frame * 2) % (G - 2) + 1, c.bubble);
  p(ctx, ox, oy, (10 + frame * 2) % (G - 2) + 1, (4 + frame * 3) % (G - 2) + 1, c.bubbleDim);
  p(ctx, ox, oy, (6 + frame) % (G - 2) + 1, (9 + frame * 2) % (G - 2) + 1, c.bubbleMid);

  // === Edge transitions — curved corners merging acid into ground ===
  // Non-connected edges get a corrosive ground-to-acid transition
  if (!n) {
    // Top edge: ground showing, acid eating in
    b(ctx, ox, oy, 0, 0, G, 2, c.ground);
    b(ctx, ox, oy, 0, 0, G, 1, c.groundDark);
    // Irregular corrosion line
    p(ctx, ox, oy, 1, 1, c.edgeCorr); p(ctx, ox, oy, 2, 1, c.edge);
    p(ctx, ox, oy, 4, 1, c.edgeCorr); p(ctx, ox, oy, 5, 1, c.deep);
    p(ctx, ox, oy, 6, 1, c.edgeCorr); p(ctx, ox, oy, 8, 1, c.edge);
    p(ctx, ox, oy, 10, 1, c.deep); p(ctx, ox, oy, 11, 1, c.edgeCorr);
    p(ctx, ox, oy, 3, 0, c.edge); p(ctx, ox, oy, 7, 0, c.edgeCorr);
    p(ctx, ox, oy, 12, 0, c.edge);
    // Glow at acid edge
    p(ctx, ox, oy, 5, 2, c.glowBright); p(ctx, ox, oy, 10, 2, c.glow);
  }
  if (!s) {
    b(ctx, ox, oy, 0, G - 2, G, 2, c.ground);
    b(ctx, ox, oy, 0, G - 1, G, 1, c.groundDark);
    p(ctx, ox, oy, 2, G - 2, c.edgeCorr); p(ctx, ox, oy, 3, G - 2, c.edge);
    p(ctx, ox, oy, 5, G - 2, c.deep); p(ctx, ox, oy, 7, G - 2, c.edgeCorr);
    p(ctx, ox, oy, 9, G - 2, c.edge); p(ctx, ox, oy, 11, G - 2, c.deep);
    p(ctx, ox, oy, 4, G - 1, c.edge); p(ctx, ox, oy, 9, G - 1, c.edgeCorr);
    p(ctx, ox, oy, 6, G - 3, c.glowBright); p(ctx, ox, oy, 11, G - 3, c.glow);
  }
  if (!w) {
    b(ctx, ox, oy, 0, 0, 2, G, c.ground);
    b(ctx, ox, oy, 0, 0, 1, G, c.groundDark);
    p(ctx, ox, oy, 1, 2, c.edgeCorr); p(ctx, ox, oy, 1, 4, c.deep);
    p(ctx, ox, oy, 1, 6, c.edge); p(ctx, ox, oy, 1, 8, c.edgeCorr);
    p(ctx, ox, oy, 1, 10, c.deep); p(ctx, ox, oy, 1, 12, c.edge);
    p(ctx, ox, oy, 0, 5, c.edge); p(ctx, ox, oy, 0, 9, c.edgeCorr);
    p(ctx, ox, oy, 2, 4, c.glowBright); p(ctx, ox, oy, 2, 10, c.glow);
  }
  if (!e) {
    b(ctx, ox, oy, G - 2, 0, 2, G, c.ground);
    b(ctx, ox, oy, G - 1, 0, 1, G, c.groundDark);
    p(ctx, ox, oy, G - 2, 3, c.edgeCorr); p(ctx, ox, oy, G - 2, 5, c.deep);
    p(ctx, ox, oy, G - 2, 7, c.edge); p(ctx, ox, oy, G - 2, 9, c.edgeCorr);
    p(ctx, ox, oy, G - 2, 11, c.deep);
    p(ctx, ox, oy, G - 1, 4, c.edge); p(ctx, ox, oy, G - 1, 8, c.edgeCorr);
    p(ctx, ox, oy, G - 3, 5, c.glowBright); p(ctx, ox, oy, G - 3, 9, c.glow);
  }

  // Curved corners — where two non-connected edges meet, add ground corner
  if (!n && !w) {
    b(ctx, ox, oy, 0, 0, 3, 3, c.ground);
    p(ctx, ox, oy, 2, 2, c.edgeCorr); p(ctx, ox, oy, 1, 2, c.edge);
    p(ctx, ox, oy, 2, 1, c.edge); p(ctx, ox, oy, 3, 2, c.glow);
    p(ctx, ox, oy, 2, 3, c.glow);
  }
  if (!n && !e) {
    b(ctx, ox, oy, G - 3, 0, 3, 3, c.ground);
    p(ctx, ox, oy, G - 3, 2, c.edgeCorr); p(ctx, ox, oy, G - 2, 2, c.edge);
    p(ctx, ox, oy, G - 3, 1, c.edge);
    p(ctx, ox, oy, G - 4, 2, c.glow); p(ctx, ox, oy, G - 3, 3, c.glow);
  }
  if (!s && !w) {
    b(ctx, ox, oy, 0, G - 3, 3, 3, c.ground);
    p(ctx, ox, oy, 2, G - 3, c.edgeCorr); p(ctx, ox, oy, 1, G - 3, c.edge);
    p(ctx, ox, oy, 2, G - 2, c.edge);
    p(ctx, ox, oy, 3, G - 3, c.glow); p(ctx, ox, oy, 2, G - 4, c.glow);
  }
  if (!s && !e) {
    b(ctx, ox, oy, G - 3, G - 3, 3, 3, c.ground);
    p(ctx, ox, oy, G - 3, G - 3, c.edgeCorr); p(ctx, ox, oy, G - 2, G - 3, c.edge);
    p(ctx, ox, oy, G - 3, G - 2, c.edge);
    p(ctx, ox, oy, G - 4, G - 3, c.glow); p(ctx, ox, oy, G - 3, G - 4, c.glow);
  }
}

function drawNoBuild(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.noBuild;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  const rng = seededRand(idx * 71 + 333);

  // Base ground (walkable)
  b(ctx, ox, oy, 0, 0, G, G, c.base);

  // Subtle ground texture
  for (let gy = 0; gy < G; gy++) {
    for (let gx = 0; gx < G; gx++) {
      const r = rng();
      if (r < 0.08) p(ctx, ox, oy, gx, gy, c.baseDark);
      else if (r < 0.14) p(ctx, ox, oy, gx, gy, c.vein);
    }
  }

  // === Spider web pattern ===
  // Web anchor points at corners/edges
  const anchors: [number, number][] = [
    [0, 0], [G - 1, 0], [0, G - 1], [G - 1, G - 1], // corners
    [7, 0], [7, G - 1], [0, 7], [G - 1, 7],           // edge midpoints
  ];

  // Center hub of the web
  const cx = 7, cy = 7;
  p(ctx, ox, oy, cx, cy, c.anchor);
  p(ctx, ox, oy, cx - 1, cy, c.webBright);
  p(ctx, ox, oy, cx + 1, cy, c.webBright);
  p(ctx, ox, oy, cx, cy - 1, c.webBright);
  p(ctx, ox, oy, cx, cy + 1, c.webBright);

  // Radial strands from center to anchors
  // Top-left strand
  p(ctx, ox, oy, 6, 6, c.web); p(ctx, ox, oy, 5, 5, c.webDim);
  p(ctx, ox, oy, 4, 4, c.web); p(ctx, ox, oy, 3, 3, c.webFaint);
  p(ctx, ox, oy, 2, 2, c.webDim); p(ctx, ox, oy, 1, 1, c.webFaint);

  // Top-right strand
  p(ctx, ox, oy, 8, 6, c.web); p(ctx, ox, oy, 9, 5, c.webDim);
  p(ctx, ox, oy, 10, 4, c.web); p(ctx, ox, oy, 11, 3, c.webFaint);
  p(ctx, ox, oy, 12, 2, c.webDim);

  // Bottom-left strand
  p(ctx, ox, oy, 6, 8, c.web); p(ctx, ox, oy, 5, 9, c.webDim);
  p(ctx, ox, oy, 4, 10, c.web); p(ctx, ox, oy, 3, 11, c.webFaint);
  p(ctx, ox, oy, 2, 12, c.webDim);

  // Bottom-right strand
  p(ctx, ox, oy, 8, 8, c.web); p(ctx, ox, oy, 9, 9, c.webDim);
  p(ctx, ox, oy, 10, 10, c.web); p(ctx, ox, oy, 11, 11, c.webFaint);
  p(ctx, ox, oy, 12, 12, c.webDim);

  // Top-center strand
  p(ctx, ox, oy, 7, 6, c.web); p(ctx, ox, oy, 7, 5, c.webDim);
  p(ctx, ox, oy, 7, 4, c.web); p(ctx, ox, oy, 7, 3, c.webFaint);
  p(ctx, ox, oy, 7, 2, c.webDim); p(ctx, ox, oy, 7, 1, c.webFaint);

  // Bottom-center strand
  p(ctx, ox, oy, 7, 8, c.web); p(ctx, ox, oy, 7, 9, c.webDim);
  p(ctx, ox, oy, 7, 10, c.web); p(ctx, ox, oy, 7, 11, c.webFaint);
  p(ctx, ox, oy, 7, 12, c.webDim);

  // Left-center strand
  p(ctx, ox, oy, 6, 7, c.web); p(ctx, ox, oy, 5, 7, c.webDim);
  p(ctx, ox, oy, 4, 7, c.web); p(ctx, ox, oy, 3, 7, c.webFaint);
  p(ctx, ox, oy, 2, 7, c.webDim); p(ctx, ox, oy, 1, 7, c.webFaint);

  // Right-center strand
  p(ctx, ox, oy, 8, 7, c.web); p(ctx, ox, oy, 9, 7, c.webDim);
  p(ctx, ox, oy, 10, 7, c.web); p(ctx, ox, oy, 11, 7, c.webFaint);
  p(ctx, ox, oy, 12, 7, c.webDim);

  // Concentric web rings connecting the radials
  // Inner ring (radius ~3)
  p(ctx, ox, oy, 5, 6, c.webFaint); p(ctx, ox, oy, 6, 5, c.webFaint);
  p(ctx, ox, oy, 8, 5, c.webFaint); p(ctx, ox, oy, 9, 6, c.webFaint);
  p(ctx, ox, oy, 9, 8, c.webFaint); p(ctx, ox, oy, 8, 9, c.webFaint);
  p(ctx, ox, oy, 6, 9, c.webFaint); p(ctx, ox, oy, 5, 8, c.webFaint);

  // Outer ring (radius ~5)
  p(ctx, ox, oy, 3, 5, c.webFaint); p(ctx, ox, oy, 4, 3, c.webFaint);
  p(ctx, ox, oy, 5, 3, c.webFaint); p(ctx, ox, oy, 9, 3, c.webFaint);
  p(ctx, ox, oy, 10, 3, c.webFaint); p(ctx, ox, oy, 11, 5, c.webFaint);
  p(ctx, ox, oy, 11, 9, c.webFaint); p(ctx, ox, oy, 10, 11, c.webFaint);
  p(ctx, ox, oy, 9, 11, c.webFaint); p(ctx, ox, oy, 5, 11, c.webFaint);
  p(ctx, ox, oy, 4, 11, c.webFaint); p(ctx, ox, oy, 3, 9, c.webFaint);

  // Sticky glistening spots
  p(ctx, ox, oy, 5, 4, c.sticky); p(ctx, ox, oy, 10, 6, c.sticky);
  p(ctx, ox, oy, 4, 9, c.sticky); p(ctx, ox, oy, 9, 10, c.sticky);

  // Caught debris / small prey bits
  p(ctx, ox, oy, 3, 4, c.debris); p(ctx, ox, oy, 3, 5, c.debrisDark);
  p(ctx, ox, oy, 10, 8, c.debris); p(ctx, ox, oy, 11, 8, c.debrisDark);

  // Edge connections — web extends to neighbor tiles
  if (n) {
    p(ctx, ox, oy, 4, 0, c.webDim); p(ctx, ox, oy, 7, 0, c.web);
    p(ctx, ox, oy, 10, 0, c.webDim); p(ctx, ox, oy, 1, 0, c.webFaint);
    p(ctx, ox, oy, 13, 0, c.webFaint);
  } else {
    // Anchor points at top edge
    p(ctx, ox, oy, 0, 0, c.anchorDim); p(ctx, ox, oy, 7, 0, c.anchor);
    p(ctx, ox, oy, G - 1, 0, c.anchorDim);
  }
  if (s) {
    p(ctx, ox, oy, 4, G - 1, c.webDim); p(ctx, ox, oy, 7, G - 1, c.web);
    p(ctx, ox, oy, 10, G - 1, c.webDim); p(ctx, ox, oy, 1, G - 1, c.webFaint);
    p(ctx, ox, oy, 13, G - 1, c.webFaint);
  } else {
    p(ctx, ox, oy, 0, G - 1, c.anchorDim); p(ctx, ox, oy, 7, G - 1, c.anchor);
    p(ctx, ox, oy, G - 1, G - 1, c.anchorDim);
  }
  if (w) {
    p(ctx, ox, oy, 0, 4, c.webDim); p(ctx, ox, oy, 0, 7, c.web);
    p(ctx, ox, oy, 0, 10, c.webDim); p(ctx, ox, oy, 0, 1, c.webFaint);
    p(ctx, ox, oy, 0, 13, c.webFaint);
  } else {
    p(ctx, ox, oy, 0, 0, c.anchorDim); p(ctx, ox, oy, 0, 7, c.anchor);
    p(ctx, ox, oy, 0, G - 1, c.anchorDim);
  }
  if (e) {
    p(ctx, ox, oy, G - 1, 4, c.webDim); p(ctx, ox, oy, G - 1, 7, c.web);
    p(ctx, ox, oy, G - 1, 10, c.webDim); p(ctx, ox, oy, G - 1, 1, c.webFaint);
    p(ctx, ox, oy, G - 1, 13, c.webFaint);
  } else {
    p(ctx, ox, oy, G - 1, 0, c.anchorDim); p(ctx, ox, oy, G - 1, 7, c.anchor);
    p(ctx, ox, oy, G - 1, G - 1, c.anchorDim);
  }
}

function drawDoodad(ctx: CanvasRenderingContext2D, ox: number, oy: number, type: number) {
  ctx.clearRect(ox, oy, T, T);
  const d = PAL.doodad;
  switch (type) {
    case 0: // Alien egg — large ovoid with translucent membrane
      // Shadow base
      p(ctx, ox, oy, 6, 11, d.dark); p(ctx, ox, oy, 7, 11, d.dark);
      p(ctx, ox, oy, 8, 11, d.dark);
      // Egg body
      p(ctx, ox, oy, 6, 4, d.yellowDim); p(ctx, ox, oy, 7, 4, d.yellowDim);
      p(ctx, ox, oy, 5, 5, d.yellowDim); p(ctx, ox, oy, 6, 5, d.yellow);
      p(ctx, ox, oy, 7, 5, d.yellow); p(ctx, ox, oy, 8, 5, d.yellowDim);
      p(ctx, ox, oy, 5, 6, d.yellow); p(ctx, ox, oy, 6, 6, d.pale);
      p(ctx, ox, oy, 7, 6, d.pale); p(ctx, ox, oy, 8, 6, d.yellow);
      p(ctx, ox, oy, 5, 7, d.yellow); p(ctx, ox, oy, 6, 7, d.paleDim);
      p(ctx, ox, oy, 7, 7, d.pale); p(ctx, ox, oy, 8, 7, d.yellow);
      p(ctx, ox, oy, 5, 8, d.yellowDim); p(ctx, ox, oy, 6, 8, d.yellow);
      p(ctx, ox, oy, 7, 8, d.yellow); p(ctx, ox, oy, 8, 8, d.yellowDim);
      p(ctx, ox, oy, 6, 9, d.yellowDim); p(ctx, ox, oy, 7, 9, d.yellowDim);
      // Internal embryo shadow
      p(ctx, ox, oy, 6, 7, d.chitin); p(ctx, ox, oy, 7, 7, d.chitinDark);
      // Membrane highlight
      p(ctx, ox, oy, 6, 5, d.pale);
      // Veins on surface
      p(ctx, ox, oy, 5, 6, d.greenDim); p(ctx, ox, oy, 8, 7, d.greenDim);
      // Base
      p(ctx, ox, oy, 5, 10, d.chitin); p(ctx, ox, oy, 6, 10, d.chitinDark);
      p(ctx, ox, oy, 7, 10, d.chitinDark); p(ctx, ox, oy, 8, 10, d.chitin);
      break;

    case 1: // Slime trail — winding wet trail across tile
      // Main trail body
      p(ctx, ox, oy, 2, 3, d.slimeDark); p(ctx, ox, oy, 3, 3, d.slime);
      p(ctx, ox, oy, 3, 4, d.slime); p(ctx, ox, oy, 4, 4, d.green);
      p(ctx, ox, oy, 4, 5, d.slime); p(ctx, ox, oy, 5, 5, d.slime);
      p(ctx, ox, oy, 5, 6, d.green); p(ctx, ox, oy, 6, 6, d.slime);
      p(ctx, ox, oy, 6, 7, d.slimeDark); p(ctx, ox, oy, 7, 7, d.slime);
      p(ctx, ox, oy, 7, 8, d.slime); p(ctx, ox, oy, 8, 8, d.green);
      p(ctx, ox, oy, 8, 9, d.slime); p(ctx, ox, oy, 9, 9, d.slimeDark);
      p(ctx, ox, oy, 9, 10, d.slime); p(ctx, ox, oy, 10, 10, d.slimeDark);
      p(ctx, ox, oy, 10, 11, d.slimeDark);
      // Sheen highlights
      p(ctx, ox, oy, 4, 5, d.greenBright); p(ctx, ox, oy, 7, 8, d.greenBright);
      // Side drips
      p(ctx, ox, oy, 3, 5, d.slimeDark); p(ctx, ox, oy, 8, 7, d.slimeDark);
      break;

    case 2: // Shed carapace — discarded exoskeleton piece
      // Main shell piece
      p(ctx, ox, oy, 4, 4, d.chitinBright); p(ctx, ox, oy, 5, 4, d.chitin);
      p(ctx, ox, oy, 6, 4, d.chitin);
      p(ctx, ox, oy, 3, 5, d.chitinBright); p(ctx, ox, oy, 4, 5, d.chitinBright);
      p(ctx, ox, oy, 5, 5, d.chitin); p(ctx, ox, oy, 6, 5, d.chitinDark);
      p(ctx, ox, oy, 7, 5, d.chitin);
      p(ctx, ox, oy, 4, 6, d.chitin); p(ctx, ox, oy, 5, 6, d.chitinDark);
      p(ctx, ox, oy, 6, 6, d.chitinDark); p(ctx, ox, oy, 7, 6, d.chitin);
      p(ctx, ox, oy, 8, 6, d.chitinBright);
      p(ctx, ox, oy, 5, 7, d.chitin); p(ctx, ox, oy, 6, 7, d.chitin);
      p(ctx, ox, oy, 7, 7, d.chitinBright); p(ctx, ox, oy, 8, 7, d.chitin);
      p(ctx, ox, oy, 9, 7, d.chitinDark);
      p(ctx, ox, oy, 6, 8, d.chitinDark); p(ctx, ox, oy, 7, 8, d.chitin);
      p(ctx, ox, oy, 8, 8, d.chitinDark);
      // Ridge lines
      p(ctx, ox, oy, 4, 5, d.yellowDim); p(ctx, ox, oy, 6, 5, d.yellowDim);
      // Crack
      p(ctx, ox, oy, 5, 6, d.dark);
      break;

    case 3: // Bioluminescent fungus — glowing alien mushroom cluster
      // Stalks
      p(ctx, ox, oy, 5, 10, d.chitinDark); p(ctx, ox, oy, 5, 9, d.chitin);
      p(ctx, ox, oy, 5, 8, d.chitin);
      p(ctx, ox, oy, 8, 10, d.chitinDark); p(ctx, ox, oy, 8, 9, d.chitin);
      p(ctx, ox, oy, 8, 8, d.chitin); p(ctx, ox, oy, 8, 7, d.chitin);
      p(ctx, ox, oy, 10, 10, d.chitinDark); p(ctx, ox, oy, 10, 9, d.chitin);
      // Caps — glowing
      // Large cap
      p(ctx, ox, oy, 7, 5, d.cyanDim); p(ctx, ox, oy, 8, 5, d.cyanDim);
      p(ctx, ox, oy, 9, 5, d.cyanDim);
      p(ctx, ox, oy, 7, 6, d.cyan); p(ctx, ox, oy, 8, 6, d.cyan);
      p(ctx, ox, oy, 9, 6, d.cyanDim);
      p(ctx, ox, oy, 8, 5, d.greenBright); // highlight
      // Medium cap
      p(ctx, ox, oy, 4, 7, d.cyanDim);
      p(ctx, ox, oy, 4, 6, d.cyan); p(ctx, ox, oy, 5, 6, d.cyan);
      p(ctx, ox, oy, 5, 7, d.cyanDim);
      p(ctx, ox, oy, 5, 6, d.greenBright); // highlight
      // Small cap
      p(ctx, ox, oy, 9, 8, d.cyan); p(ctx, ox, oy, 10, 8, d.cyanDim);
      // Glow aura
      p(ctx, ox, oy, 6, 5, d.greenDim); p(ctx, ox, oy, 10, 5, d.greenDim);
      p(ctx, ox, oy, 3, 7, d.greenDim); p(ctx, ox, oy, 11, 8, d.greenDim);
      // Spores
      p(ctx, ox, oy, 6, 3, d.cyanDim); p(ctx, ox, oy, 9, 4, d.cyanDim);
      p(ctx, ox, oy, 3, 5, d.cyanDim);
      break;

    case 4: // Web cocoon — wrapped prey in silk
      // Cocoon body — tapered oval
      p(ctx, ox, oy, 7, 3, d.web);
      p(ctx, ox, oy, 6, 4, d.web); p(ctx, ox, oy, 7, 4, d.webBright);
      p(ctx, ox, oy, 8, 4, d.web);
      p(ctx, ox, oy, 5, 5, d.web); p(ctx, ox, oy, 6, 5, d.webBright);
      p(ctx, ox, oy, 7, 5, d.webBright); p(ctx, ox, oy, 8, 5, d.webBright);
      p(ctx, ox, oy, 9, 5, d.web);
      p(ctx, ox, oy, 5, 6, d.web); p(ctx, ox, oy, 6, 6, d.webBright);
      p(ctx, ox, oy, 7, 6, d.webBright); p(ctx, ox, oy, 8, 6, d.webBright);
      p(ctx, ox, oy, 9, 6, d.web);
      p(ctx, ox, oy, 5, 7, d.web); p(ctx, ox, oy, 6, 7, d.webBright);
      p(ctx, ox, oy, 7, 7, d.webBright); p(ctx, ox, oy, 8, 7, d.web);
      p(ctx, ox, oy, 9, 7, d.web);
      p(ctx, ox, oy, 6, 8, d.web); p(ctx, ox, oy, 7, 8, d.web);
      p(ctx, ox, oy, 8, 8, d.web);
      p(ctx, ox, oy, 7, 9, d.web);
      // Wrapping bands
      p(ctx, ox, oy, 5, 5, d.paleDim); p(ctx, ox, oy, 9, 5, d.paleDim);
      p(ctx, ox, oy, 5, 7, d.paleDim); p(ctx, ox, oy, 9, 7, d.paleDim);
      // Something inside — dark shape visible
      p(ctx, ox, oy, 6, 6, d.chitinDark); p(ctx, ox, oy, 7, 6, d.chitinDark);
      // Suspension threads
      p(ctx, ox, oy, 4, 3, d.web); p(ctx, ox, oy, 3, 2, d.web);
      p(ctx, ox, oy, 10, 4, d.web); p(ctx, ox, oy, 11, 3, d.web);
      p(ctx, ox, oy, 4, 9, d.web); p(ctx, ox, oy, 10, 9, d.web);
      break;

    case 5: // Acid droplet — small corrosive puddle
      // Puddle shape
      p(ctx, ox, oy, 6, 6, d.green); p(ctx, ox, oy, 7, 6, d.green);
      p(ctx, ox, oy, 8, 6, d.greenDim);
      p(ctx, ox, oy, 5, 7, d.greenDim); p(ctx, ox, oy, 6, 7, d.greenBright);
      p(ctx, ox, oy, 7, 7, d.green); p(ctx, ox, oy, 8, 7, d.green);
      p(ctx, ox, oy, 9, 7, d.greenDim);
      p(ctx, ox, oy, 6, 8, d.green); p(ctx, ox, oy, 7, 8, d.greenDim);
      p(ctx, ox, oy, 8, 8, d.greenDim);
      // Drip from above
      p(ctx, ox, oy, 7, 3, d.green); p(ctx, ox, oy, 7, 4, d.greenBright);
      p(ctx, ox, oy, 7, 5, d.green);
      // Splash droplets
      p(ctx, ox, oy, 4, 6, d.greenDim); p(ctx, ox, oy, 10, 8, d.greenDim);
      p(ctx, ox, oy, 5, 5, d.greenDim);
      // Corrosion stain around puddle
      p(ctx, ox, oy, 5, 6, d.slimeDark); p(ctx, ox, oy, 9, 8, d.slimeDark);
      p(ctx, ox, oy, 5, 8, d.slimeDark);
      // Glow
      p(ctx, ox, oy, 6, 7, d.greenBright);
      break;

    case 6: // Bone fragment — prey remains
      // Large bone piece
      p(ctx, ox, oy, 4, 5, d.bone); p(ctx, ox, oy, 5, 5, d.boneLight);
      p(ctx, ox, oy, 6, 5, d.bone); p(ctx, ox, oy, 7, 5, d.bone);
      p(ctx, ox, oy, 8, 5, d.boneDark);
      p(ctx, ox, oy, 4, 6, d.boneDark); p(ctx, ox, oy, 5, 6, d.bone);
      p(ctx, ox, oy, 6, 6, d.boneLight); p(ctx, ox, oy, 7, 6, d.bone);
      // Joint knob
      p(ctx, ox, oy, 3, 5, d.boneDark); p(ctx, ox, oy, 3, 6, d.bone);
      p(ctx, ox, oy, 3, 7, d.boneDark);
      p(ctx, ox, oy, 9, 5, d.boneDark); p(ctx, ox, oy, 9, 6, d.bone);
      // Small fragment
      p(ctx, ox, oy, 7, 8, d.boneDark); p(ctx, ox, oy, 8, 8, d.bone);
      p(ctx, ox, oy, 9, 8, d.boneDark);
      // Scattered small bits
      p(ctx, ox, oy, 5, 9, d.boneDark); p(ctx, ox, oy, 10, 7, d.boneDark);
      // Slime stain on bone
      p(ctx, ox, oy, 6, 5, d.slimeDark); p(ctx, ox, oy, 7, 6, d.slimeDark);
      break;

    case 7: // Larva — small wriggling alien grub
      // Body segments
      p(ctx, ox, oy, 4, 7, d.yellowDim); // tail
      p(ctx, ox, oy, 5, 7, d.yellow); p(ctx, ox, oy, 5, 6, d.yellowDim);
      p(ctx, ox, oy, 6, 6, d.yellow); p(ctx, ox, oy, 6, 7, d.pale);
      p(ctx, ox, oy, 7, 6, d.pale); p(ctx, ox, oy, 7, 7, d.yellow);
      p(ctx, ox, oy, 8, 6, d.yellow); p(ctx, ox, oy, 8, 7, d.paleDim);
      p(ctx, ox, oy, 9, 7, d.yellow); // head area
      p(ctx, ox, oy, 10, 7, d.yellowDim);
      // Head details
      p(ctx, ox, oy, 10, 6, d.dark); // eye
      p(ctx, ox, oy, 11, 7, d.yellowDim); // mandible
      // Segment lines
      p(ctx, ox, oy, 5, 7, d.chitinDark); p(ctx, ox, oy, 7, 7, d.chitinDark);
      p(ctx, ox, oy, 9, 7, d.chitinDark);
      // Underbelly
      p(ctx, ox, oy, 6, 8, d.yellowDim); p(ctx, ox, oy, 7, 8, d.yellowDim);
      p(ctx, ox, oy, 8, 8, d.yellowDim);
      // Tiny legs
      p(ctx, ox, oy, 5, 8, d.chitin); p(ctx, ox, oy, 7, 8, d.chitin);
      p(ctx, ox, oy, 9, 8, d.chitin);
      // Slime trail behind
      p(ctx, ox, oy, 3, 8, d.slimeDark); p(ctx, ox, oy, 2, 8, d.slimeDark);
      break;
  }
}

export default function AliensTerrainSprites() {
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
      drawWall(tCtx, ox, 1 * T, v);
      for (let f = 0; f < 3; f++) drawAcid(tCtx, ox, (2 + f) * T, v, f);
      drawNoBuild(tCtx, ox, 5 * T, v);
    }
    const tp = terrainPreviewRef.current!;
    const scale = 3;
    tp.width = VARIANTS * T * scale + 140;
    tp.height = TERRAIN_ROWS * T * scale + 40;
    const tpCtx = tp.getContext('2d')!;
    tpCtx.imageSmoothingEnabled = false;
    tpCtx.fillStyle = '#0a1408';
    tpCtx.fillRect(0, 0, tp.width, tp.height);
    tpCtx.drawImage(tc, 140, 20, tc.width * scale, tc.height * scale);
    tpCtx.fillStyle = '#88ff22';
    tpCtx.font = '11px monospace';
    const rowLabels = ['Ground', 'Hive Wall', 'Acid Pool 0', 'Acid Pool 1', 'Acid Pool 2', 'NoBuild'];
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
    dpCtx.fillStyle = '#0a1408';
    dpCtx.fillRect(0, 0, dp.width, dp.height);
    dpCtx.drawImage(dc, 80, 20, dc.width * dScale, dc.height * dScale);
    dpCtx.fillStyle = '#88ff22';
    dpCtx.font = '11px monospace';
    dpCtx.fillText('Hive', 4, 20 + T * dScale / 2 + 4);
    setReady(true);
  }, []);

  const download = (ref: React.RefObject<HTMLCanvasElement | null>, name: string) => {
    const a = document.createElement('a');
    a.download = name;
    a.href = ref.current!.toDataURL('image/png');
    a.click();
  };

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', color: '#88ff22', background: '#0a1408' }}>
      <h2 data-label="Aliens Terrain">Aliens Terrain Sprites — Hive Tunnels</h2>
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setView('preview')} style={{ marginRight: 8, background: view === 'preview' ? '#88ff22' : '#1a2a12', color: view === 'preview' ? '#0a1408' : '#88ff22', border: '1px solid #88ff22', padding: '4px 12px', cursor: 'pointer' }}>Preview (3x)</button>
        <button onClick={() => setView('actual')} style={{ marginRight: 8, background: view === 'actual' ? '#88ff22' : '#1a2a12', color: view === 'actual' ? '#0a1408' : '#88ff22', border: '1px solid #88ff22', padding: '4px 12px', cursor: 'pointer' }}>Actual Size</button>
        {ready && (
          <>
            <button onClick={() => download(terrainRef, 'aliens_terrain_tileset.png')} style={{ marginRight: 8, background: '#1a2a12', color: '#88ff22', border: '1px solid #88ff22', padding: '4px 12px', cursor: 'pointer' }}>Download Tileset</button>
            <button onClick={() => download(doodadRef, 'aliens_terrain_doodads.png')} style={{ background: '#1a2a12', color: '#88ff22', border: '1px solid #88ff22', padding: '4px 12px', cursor: 'pointer' }}>Download Doodads</button>
          </>
        )}
      </div>
      <p style={{ fontSize: '12px', color: '#338808' }} data-frame-size="28x28">Frame size: 28x28 | PX=2 | Grid=14x14 | 16 cols (NESW bitmask) x 6 rows</p>
      <h3 data-label="Aliens Terrain (Preview)">Terrain Tileset (16 auto-tile variants x 6 rows)</h3>
      <canvas ref={terrainPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #88ff2233' }} />
      <canvas ref={terrainRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #88ff2233' }} />
      <h3>Hive Tunnel Doodads (8 types)</h3>
      <canvas ref={doodadPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #88ff2233' }} />
      <canvas ref={doodadRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #88ff2233' }} />
    </div>
  );
}
