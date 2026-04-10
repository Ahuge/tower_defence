/**
 * Psionic Terrain Sprite Generator — Mind Palace / Brain Vat Lab terrain.
 *
 * Layout:
 *   Columns: 16 (auto-tile bitmask variants, bits = NESW)
 *   Row order:
 *   0: psychic floor (ground) — dark cerebral floor with synapse patterns
 *   1: brain tanks/walls (blocked type 1) — glass vats with brains inside
 *   2: psionic energy frame 0 (blocked type 2)
 *   3: psionic energy frame 1 (blocked type 2, animated)
 *   4: psionic energy frame 2 (blocked type 2, animated)
 *   5: neural conduits (NoBuild terrain)
 *
 * Doodads row 0: 8 types
 *   0: floating thought bubble
 *   1: electrode cluster
 *   2: spilled neural fluid
 *   3: EEG readout screen
 *   4: brain fragment
 *   5: psionic crystal
 *   6: memory orb
 *   7: synapse spark
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
    base: '#0e081a',
    baseLt: '#110a1e',
    accent: '#140c22',
    accentDk: '#0a0616',
  },
  tank: {
    metalDark: '#1a1228',
    metalMid: '#2c2040',
    metalLight: '#3e3058',
    metalHighlight: '#504268',
    glassDark: '#1c2838',
    glassMid: '#283848',
    glassLight: '#345060',
    glassHighlight: '#4a7088',
    glassShine: '#6a9aaa',
    fluidDark: '#1a1040',
    fluidMid: '#2a1858',
    fluidLight: '#3a2870',
    brainDark: '#884488',
    brainMid: '#aa66bb',
    brainLight: '#cc88dd',
    brainHighlight: '#ddaaee',
    brainFold: '#996699',
    electrode: '#88aacc',
    electrodeBright: '#aaccee',
    wire: '#556688',
    wireDim: '#334466',
    bubble: '#5588aa',
    bubbleBright: '#77bbdd',
    pulse: '#ee44ff',
    pulseDim: '#aa33bb',
    capTop: '#3a2e50',
    capBot: '#2a2040',
  },
  energy: {
    void: '#0a0618',
    deep: '#100820',
    bg: '#140a28',
    bgLt: '#1a0e30',
    ring0: '#4422aa',
    ring1: '#6633cc',
    ring2: '#8844dd',
    ring3: '#aa55ee',
    ring4: '#cc66ff',
    ring5: '#ee88ff',
    center: '#ff99ff',
    centerBright: '#ffccff',
    particle: '#bb55ee',
    particleDim: '#7733aa',
    particleBright: '#dd88ff',
    edge: '#221444',
    edgeBright: '#331a55',
    shimmer: '#9955cc',
  },
  noBuild: {
    base: '#110a1e',
    baseLt: '#16102a',
    trace: '#6633aa',
    traceBright: '#8844cc',
    traceDim: '#4a2288',
    traceFaint: '#331a66',
    node: '#aa55dd',
    nodeBright: '#cc77ff',
    nodeCore: '#ee99ff',
    pulseOn: '#dd66ff',
    pulseOff: '#552288',
    circuit: '#3a1e70',
    circuitDim: '#2a1650',
    glow: '#7744bb',
    glowDim: '#553388',
  },
  doodad: {
    pink: '#cc88dd',
    pinkDark: '#995599',
    purple: '#aa44cc',
    purpleDark: '#772299',
    magenta: '#ee44ff',
    magentaDim: '#bb33cc',
    white: '#eeddff',
    whiteDim: '#ccbbdd',
    dark: '#1a1228',
    darkLt: '#2a1a44',
    dim: '#553388',
    dimBright: '#7744aa',
    blue: '#5588cc',
    blueBright: '#77aaee',
    blueDim: '#336699',
    teal: '#44aabb',
    tealDim: '#338899',
    green: '#44bb88',
    greenDim: '#339966',
    red: '#cc4466',
    redDim: '#993355',
    metal: '#607080',
    metalDark: '#404850',
    metalLight: '#889098',
    screen: '#112222',
    screenGlow: '#22aa88',
    screenLine: '#33cc99',
    screenDim: '#116644',
    crystal: '#bb66ff',
    crystalBright: '#dd99ff',
    crystalDark: '#8833cc',
    crystalCore: '#eeccff',
    orb: '#9955dd',
    orbBright: '#bb77ff',
    orbCore: '#ddbbff',
    orbDim: '#7733aa',
    spark: '#ffcc44',
    sparkBright: '#ffee88',
    sparkDim: '#cc9933',
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

/* Seeded pseudo-random for deterministic per-variant detail */
function seededRand(seed: number) {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return (s >> 16) / 32768; };
}

function drawGround(ctx: CanvasRenderingContext2D, ox: number, oy: number) {
  const c = PAL.ground;
  // Very dark cerebral floor base
  b(ctx, ox, oy, 0, 0, G, G, c.base);
  // A few subtle texture pixels (faint purple/psionic tint)
  p(ctx, ox, oy, 5, 4, c.baseLt);
  p(ctx, ox, oy, 11, 7, c.accent);
  p(ctx, ox, oy, 3, 10, c.baseLt);
  // One darker spot
  p(ctx, ox, oy, 9, 2, c.accentDk);
}

function drawTank(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.tank;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);

  // Metal base fill
  b(ctx, ox, oy, 0, 0, G, G, c.metalDark);

  // Metal frame border (outer wall)
  if (!n) { b(ctx, ox, oy, 0, 0, G, 1, c.metalMid); p(ctx, ox, oy, 3, 0, c.metalLight); p(ctx, ox, oy, 10, 0, c.metalLight); }
  if (!s) { b(ctx, ox, oy, 0, G-1, G, 1, c.metalMid); p(ctx, ox, oy, 4, G-1, c.metalLight); p(ctx, ox, oy, 9, G-1, c.metalLight); }
  if (!w) { b(ctx, ox, oy, 0, 0, 1, G, c.metalMid); p(ctx, ox, oy, 0, 4, c.metalLight); p(ctx, ox, oy, 0, 10, c.metalLight); }
  if (!e) { b(ctx, ox, oy, G-1, 0, 1, G, c.metalMid); p(ctx, ox, oy, G-1, 3, c.metalLight); p(ctx, ox, oy, G-1, 9, c.metalLight); }

  // Corner rivets on exposed corners
  if (!n && !w) p(ctx, ox, oy, 0, 0, c.metalHighlight);
  if (!n && !e) p(ctx, ox, oy, G-1, 0, c.metalHighlight);
  if (!s && !w) p(ctx, ox, oy, 0, G-1, c.metalHighlight);
  if (!s && !e) p(ctx, ox, oy, G-1, G-1, c.metalHighlight);

  // Metal cap top (thin strip) — only if no northern neighbor
  if (!n) {
    b(ctx, ox, oy, 1, 1, G-2, 1, c.capTop);
    p(ctx, ox, oy, 5, 1, c.metalHighlight); p(ctx, ox, oy, 8, 1, c.metalHighlight);
  }

  // Metal cap bottom
  if (!s) {
    b(ctx, ox, oy, 1, G-2, G-2, 1, c.capBot);
    p(ctx, ox, oy, 6, G-2, c.metalLight); p(ctx, ox, oy, 7, G-2, c.metalLight);
  }

  // Glass tank interior area
  const glLeft = w ? 0 : 2;
  const glRight = e ? G : G - 2;
  const glTop = n ? 0 : 2;
  const glBot = s ? G : G - 2;
  b(ctx, ox, oy, glLeft, glTop, glRight - glLeft, glBot - glTop, c.fluidDark);

  // Glass wall edges (left/right vertical glass strips)
  if (!w) {
    for (let gy = glTop; gy < glBot; gy++) {
      p(ctx, ox, oy, 1, gy, c.glassDark);
      p(ctx, ox, oy, 2, gy, c.glassMid);
    }
    // Glass shine highlight
    p(ctx, ox, oy, 1, glTop + 1, c.glassLight);
    p(ctx, ox, oy, 1, glTop + 2, c.glassHighlight);
    p(ctx, ox, oy, 1, glTop + 3, c.glassLight);
  }
  if (!e) {
    for (let gy = glTop; gy < glBot; gy++) {
      p(ctx, ox, oy, G-2, gy, c.glassMid);
      p(ctx, ox, oy, G-3, gy, c.glassDark);
    }
    p(ctx, ox, oy, G-2, glTop + 2, c.glassLight);
  }

  // Fluid interior gradient
  for (let gy = glTop + 1; gy < glBot - 1; gy++) {
    const fluidC = gy < 6 ? c.fluidMid : c.fluidLight;
    for (let gx = glLeft + 2; gx < glRight - 2; gx++) {
      if ((gx + gy) % 3 === 0) p(ctx, ox, oy, gx, gy, fluidC);
    }
  }

  // Brain silhouette (central mass)
  // Top of brain — rounded top
  p(ctx, ox, oy, 6, 3, c.brainDark); p(ctx, ox, oy, 7, 3, c.brainDark);
  // Upper brain
  p(ctx, ox, oy, 5, 4, c.brainDark); p(ctx, ox, oy, 6, 4, c.brainMid);
  p(ctx, ox, oy, 7, 4, c.brainMid); p(ctx, ox, oy, 8, 4, c.brainDark);
  // Mid brain — widest part with folds
  p(ctx, ox, oy, 4, 5, c.brainDark); p(ctx, ox, oy, 5, 5, c.brainMid);
  p(ctx, ox, oy, 6, 5, c.brainLight); p(ctx, ox, oy, 7, 5, c.brainHighlight);
  p(ctx, ox, oy, 8, 5, c.brainMid); p(ctx, ox, oy, 9, 5, c.brainDark);
  // Brain fold line
  p(ctx, ox, oy, 5, 6, c.brainFold); p(ctx, ox, oy, 6, 6, c.brainMid);
  p(ctx, ox, oy, 7, 6, c.brainLight); p(ctx, ox, oy, 8, 6, c.brainFold);
  p(ctx, ox, oy, 4, 6, c.brainDark); p(ctx, ox, oy, 9, 6, c.brainDark);
  // Lower brain
  p(ctx, ox, oy, 5, 7, c.brainMid); p(ctx, ox, oy, 6, 7, c.brainFold);
  p(ctx, ox, oy, 7, 7, c.brainMid); p(ctx, ox, oy, 8, 7, c.brainMid);
  p(ctx, ox, oy, 4, 7, c.brainDark);
  // Brain stem
  p(ctx, ox, oy, 5, 8, c.brainDark); p(ctx, ox, oy, 6, 8, c.brainMid);
  p(ctx, ox, oy, 7, 8, c.brainDark); p(ctx, ox, oy, 8, 8, c.brainDark);
  p(ctx, ox, oy, 6, 9, c.brainDark); p(ctx, ox, oy, 7, 9, c.brainDark);

  // Electrodes attached to brain
  p(ctx, ox, oy, 3, 4, c.electrode); p(ctx, ox, oy, 3, 5, c.wire);
  p(ctx, ox, oy, 3, 6, c.wireDim);
  p(ctx, ox, oy, 10, 5, c.electrode); p(ctx, ox, oy, 10, 6, c.wire);
  p(ctx, ox, oy, 10, 7, c.wireDim);
  // Top electrode
  p(ctx, ox, oy, 7, 2, c.electrodeBright); p(ctx, ox, oy, 7, 1, c.wire);

  // Wires running to edges
  if (!w) { p(ctx, ox, oy, 2, 5, c.wireDim); p(ctx, ox, oy, 1, 5, c.wireDim); }
  if (!e) { p(ctx, ox, oy, 11, 6, c.wireDim); p(ctx, ox, oy, 12, 6, c.wireDim); }

  // Bubbles in fluid
  p(ctx, ox, oy, 4, 3, c.bubbleBright);
  p(ctx, ox, oy, 10, 4, c.bubble);
  p(ctx, ox, oy, 3, 8, c.bubble);
  p(ctx, ox, oy, 11, 9, c.bubbleBright);
  p(ctx, ox, oy, 5, 10, c.bubble);
  p(ctx, ox, oy, 9, 3, c.bubble);

  // Psionic pulse glow on brain highlight
  p(ctx, ox, oy, 7, 5, c.pulse);
  p(ctx, ox, oy, 6, 6, c.pulseDim);

  // When neighbors present — conduit markings for continuous wall
  if (n) {
    p(ctx, ox, oy, 5, 0, c.fluidMid); p(ctx, ox, oy, 6, 0, c.fluidLight);
    p(ctx, ox, oy, 7, 0, c.fluidLight); p(ctx, ox, oy, 8, 0, c.fluidMid);
    p(ctx, ox, oy, 6, 1, c.wire); p(ctx, ox, oy, 7, 1, c.wireDim);
  }
  if (s) {
    p(ctx, ox, oy, 5, G-1, c.fluidMid); p(ctx, ox, oy, 6, G-1, c.fluidLight);
    p(ctx, ox, oy, 7, G-1, c.fluidLight); p(ctx, ox, oy, 8, G-1, c.fluidMid);
    p(ctx, ox, oy, 6, G-2, c.wire); p(ctx, ox, oy, 7, G-2, c.wireDim);
  }
  if (w) {
    p(ctx, ox, oy, 0, 5, c.fluidMid); p(ctx, ox, oy, 0, 6, c.fluidLight);
    p(ctx, ox, oy, 0, 7, c.fluidLight); p(ctx, ox, oy, 0, 8, c.fluidMid);
    p(ctx, ox, oy, 1, 6, c.wire);
  }
  if (e) {
    p(ctx, ox, oy, G-1, 5, c.fluidMid); p(ctx, ox, oy, G-1, 6, c.fluidLight);
    p(ctx, ox, oy, G-1, 7, c.fluidLight); p(ctx, ox, oy, G-1, 8, c.fluidMid);
    p(ctx, ox, oy, G-2, 6, c.wire);
  }
}

function drawEnergy(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number, frame: number) {
  const c = PAL.energy;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);

  // Deep void background
  b(ctx, ox, oy, 0, 0, G, G, c.void);

  // Subtle background texture
  for (let gy = 0; gy < G; gy++) {
    for (let gx = 0; gx < G; gx++) {
      if ((gx + gy + frame) % 4 === 0) p(ctx, ox, oy, gx, gy, c.deep);
      if ((gx * 3 + gy * 7 + frame) % 11 === 0) p(ctx, ox, oy, gx, gy, c.bg);
    }
  }

  // Background energy haze
  for (let gy = 1; gy < G - 1; gy += 2) {
    for (let gx = 1; gx < G - 1; gx += 2) {
      if ((gx + gy) % 4 === 0) p(ctx, ox, oy, gx, gy, c.bgLt);
    }
  }

  const cx = 7, cy = 7;

  // Concentric rings expanding across frames
  // Frame 0: small tight ring, frame 1: medium, frame 2: large
  const ringColors = [c.ring0, c.ring1, c.ring2, c.ring3, c.ring4, c.ring5];

  // Outer ring
  const outerR = 3 + frame * 1.5;
  const outerColor = frame === 0 ? c.ring2 : frame === 1 ? c.ring4 : c.ring5;
  for (let a = 0; a < 24; a++) {
    const angle = a * Math.PI / 12;
    const rx = cx + Math.round(outerR * Math.cos(angle));
    const ry = cy + Math.round(outerR * Math.sin(angle));
    p(ctx, ox, oy, rx, ry, outerColor);
  }

  // Middle ring
  const midR = 1.5 + frame;
  const midColor = frame === 0 ? c.ring1 : frame === 1 ? c.ring3 : c.ring4;
  for (let a = 0; a < 16; a++) {
    const angle = a * Math.PI / 8;
    const rx = cx + Math.round(midR * Math.cos(angle));
    const ry = cy + Math.round(midR * Math.sin(angle));
    p(ctx, ox, oy, rx, ry, midColor);
  }

  // Inner ring (only visible in frames 0-1, consumed by expansion in 2)
  if (frame < 2) {
    const innerR = 1;
    const innerColor = frame === 0 ? c.ring0 : c.ring2;
    for (let a = 0; a < 8; a++) {
      const angle = a * Math.PI / 4;
      const rx = cx + Math.round(innerR * Math.cos(angle));
      const ry = cy + Math.round(innerR * Math.sin(angle));
      p(ctx, ox, oy, rx, ry, innerColor);
    }
  }

  // Center glow — brightens with frame
  const centerColor = frame === 0 ? c.center : frame === 1 ? c.centerBright : c.center;
  p(ctx, ox, oy, cx, cy, centerColor);
  p(ctx, ox, oy, cx - 1, cy, frame >= 1 ? c.ring5 : c.ring3);
  p(ctx, ox, oy, cx + 1, cy, frame >= 1 ? c.ring5 : c.ring3);
  p(ctx, ox, oy, cx, cy - 1, frame >= 2 ? c.ring5 : c.ring3);
  p(ctx, ox, oy, cx, cy + 1, frame >= 2 ? c.ring5 : c.ring3);

  // Thought-bubble particles floating outward per frame
  const particles = [
    { x: 2, y: 2 }, { x: 11, y: 3 }, { x: 3, y: 10 }, { x: 10, y: 11 },
    { x: 1, y: 6 }, { x: 12, y: 7 }, { x: 5, y: 1 }, { x: 8, y: 12 },
  ];
  for (let i = 0; i < particles.length; i++) {
    const pp = particles[i];
    // Particles drift outward each frame
    const drift = frame * 0.7;
    const dx = pp.x < cx ? -drift : drift;
    const dy = pp.y < cy ? -drift : drift;
    const px = Math.round(pp.x + dx);
    const py = Math.round(pp.y + dy);
    const pColor = i % 3 === 0 ? c.particleBright : i % 3 === 1 ? c.particle : c.particleDim;
    p(ctx, ox, oy, px, py, pColor);
  }

  // Color-shifting shimmer accents
  if (frame === 1) {
    p(ctx, ox, oy, 4, 4, c.shimmer); p(ctx, ox, oy, 9, 9, c.shimmer);
  }
  if (frame === 2) {
    p(ctx, ox, oy, 3, 3, c.shimmer); p(ctx, ox, oy, 10, 10, c.shimmer);
    p(ctx, ox, oy, 3, 10, c.shimmer); p(ctx, ox, oy, 10, 3, c.shimmer);
  }

  // Radial energy lines from center to edges
  const lineColor = frame === 0 ? c.ring0 : frame === 1 ? c.ring1 : c.ring2;
  // Diagonal energy traces
  p(ctx, ox, oy, cx - 3 - frame, cy - 3 - frame, lineColor);
  p(ctx, ox, oy, cx + 3 + frame, cy - 3 - frame, lineColor);
  p(ctx, ox, oy, cx - 3 - frame, cy + 3 + frame, lineColor);
  p(ctx, ox, oy, cx + 3 + frame, cy + 3 + frame, lineColor);

  // Edges — psionic energy border
  if (!n) {
    b(ctx, ox, oy, 0, 0, G, 1, c.edge);
    for (let gx = 2; gx < G; gx += 3) p(ctx, ox, oy, gx, 0, c.edgeBright);
  }
  if (!s) {
    b(ctx, ox, oy, 0, G-1, G, 1, c.edge);
    for (let gx = 1; gx < G; gx += 3) p(ctx, ox, oy, gx, G-1, c.edgeBright);
  }
  if (!w) {
    b(ctx, ox, oy, 0, 0, 1, G, c.edge);
    for (let gy = 2; gy < G; gy += 3) p(ctx, ox, oy, 0, gy, c.edgeBright);
  }
  if (!e) {
    b(ctx, ox, oy, G-1, 0, 1, G, c.edge);
    for (let gy = 1; gy < G; gy += 3) p(ctx, ox, oy, G-1, gy, c.edgeBright);
  }
}

function drawNoBuild(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.noBuild;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);

  // Base floor
  b(ctx, ox, oy, 0, 0, G, G, c.base);
  // Subtle texture
  for (let gy = 0; gy < G; gy++) {
    for (let gx = 0; gx < G; gx++) {
      if ((gx + gy) % 2 === 0) p(ctx, ox, oy, gx, gy, c.baseLt);
    }
  }

  // Circuit board-style organic neural traces — main cross pathways
  // Horizontal main trace
  const hTraceY1 = 6, hTraceY2 = 7;
  for (let gx = 0; gx < G; gx++) {
    p(ctx, ox, oy, gx, hTraceY1, c.traceDim);
    p(ctx, ox, oy, gx, hTraceY2, c.traceDim);
  }
  // Vertical main trace
  const vTraceX1 = 6, vTraceX2 = 7;
  for (let gy = 0; gy < G; gy++) {
    p(ctx, ox, oy, vTraceX1, gy, c.traceDim);
    p(ctx, ox, oy, vTraceX2, gy, c.traceDim);
  }

  // Brighter inner traces
  for (let gx = 2; gx < G - 2; gx++) {
    p(ctx, ox, oy, gx, hTraceY1, c.trace);
    p(ctx, ox, oy, gx, hTraceY2, c.trace);
  }
  for (let gy = 2; gy < G - 2; gy++) {
    p(ctx, ox, oy, vTraceX1, gy, c.trace);
    p(ctx, ox, oy, vTraceX2, gy, c.trace);
  }

  // Organic branching off main horizontal — dendrite-like curves
  // Upper branches
  p(ctx, ox, oy, 3, 5, c.circuitDim); p(ctx, ox, oy, 2, 4, c.circuitDim); p(ctx, ox, oy, 1, 3, c.traceFaint);
  p(ctx, ox, oy, 10, 5, c.circuitDim); p(ctx, ox, oy, 11, 4, c.circuitDim); p(ctx, ox, oy, 12, 3, c.traceFaint);
  // Lower branches
  p(ctx, ox, oy, 3, 8, c.circuitDim); p(ctx, ox, oy, 2, 9, c.circuitDim); p(ctx, ox, oy, 1, 10, c.traceFaint);
  p(ctx, ox, oy, 10, 8, c.circuitDim); p(ctx, ox, oy, 11, 9, c.circuitDim); p(ctx, ox, oy, 12, 10, c.traceFaint);
  // Left branches
  p(ctx, ox, oy, 5, 3, c.circuitDim); p(ctx, ox, oy, 4, 2, c.traceFaint);
  p(ctx, ox, oy, 5, 10, c.circuitDim); p(ctx, ox, oy, 4, 11, c.traceFaint);
  // Right branches
  p(ctx, ox, oy, 8, 3, c.circuitDim); p(ctx, ox, oy, 9, 2, c.traceFaint);
  p(ctx, ox, oy, 8, 10, c.circuitDim); p(ctx, ox, oy, 9, 11, c.traceFaint);

  // Synapse junction node — central bright node
  b(ctx, ox, oy, 6, 6, 2, 2, c.nodeBright);
  p(ctx, ox, oy, 6, 6, c.nodeCore);

  // Secondary junction nodes
  p(ctx, ox, oy, 3, 6, c.node); p(ctx, ox, oy, 3, 7, c.node);
  p(ctx, ox, oy, 10, 6, c.node); p(ctx, ox, oy, 10, 7, c.node);
  p(ctx, ox, oy, 6, 3, c.node); p(ctx, ox, oy, 7, 3, c.node);
  p(ctx, ox, oy, 6, 10, c.node); p(ctx, ox, oy, 7, 10, c.node);

  // Pulse indicators along traces
  p(ctx, ox, oy, 5, 6, c.pulseOn); p(ctx, ox, oy, 8, 7, c.pulseOff);
  p(ctx, ox, oy, 6, 5, c.pulseOff); p(ctx, ox, oy, 7, 8, c.pulseOn);

  // Glow halos around junction
  p(ctx, ox, oy, 5, 5, c.glowDim); p(ctx, ox, oy, 8, 5, c.glowDim);
  p(ctx, ox, oy, 5, 8, c.glowDim); p(ctx, ox, oy, 8, 8, c.glowDim);

  // Edge connections when neighbors present
  if (n) {
    p(ctx, ox, oy, 6, 0, c.traceBright); p(ctx, ox, oy, 7, 0, c.traceBright);
    p(ctx, ox, oy, 6, 1, c.trace); p(ctx, ox, oy, 7, 1, c.trace);
  } else {
    // Terminal caps
    p(ctx, ox, oy, 6, 0, c.node); p(ctx, ox, oy, 7, 0, c.node);
    p(ctx, ox, oy, 5, 0, c.glowDim); p(ctx, ox, oy, 8, 0, c.glowDim);
  }
  if (s) {
    p(ctx, ox, oy, 6, G-1, c.traceBright); p(ctx, ox, oy, 7, G-1, c.traceBright);
    p(ctx, ox, oy, 6, G-2, c.trace); p(ctx, ox, oy, 7, G-2, c.trace);
  } else {
    p(ctx, ox, oy, 6, G-1, c.node); p(ctx, ox, oy, 7, G-1, c.node);
    p(ctx, ox, oy, 5, G-1, c.glowDim); p(ctx, ox, oy, 8, G-1, c.glowDim);
  }
  if (w) {
    p(ctx, ox, oy, 0, 6, c.traceBright); p(ctx, ox, oy, 0, 7, c.traceBright);
    p(ctx, ox, oy, 1, 6, c.trace); p(ctx, ox, oy, 1, 7, c.trace);
  } else {
    p(ctx, ox, oy, 0, 6, c.node); p(ctx, ox, oy, 0, 7, c.node);
    p(ctx, ox, oy, 0, 5, c.glowDim); p(ctx, ox, oy, 0, 8, c.glowDim);
  }
  if (e) {
    p(ctx, ox, oy, G-1, 6, c.traceBright); p(ctx, ox, oy, G-1, 7, c.traceBright);
    p(ctx, ox, oy, G-2, 6, c.trace); p(ctx, ox, oy, G-2, 7, c.trace);
  } else {
    p(ctx, ox, oy, G-1, 6, c.node); p(ctx, ox, oy, G-1, 7, c.node);
    p(ctx, ox, oy, G-1, 5, c.glowDim); p(ctx, ox, oy, G-1, 8, c.glowDim);
  }
}

function drawDoodad(ctx: CanvasRenderingContext2D, ox: number, oy: number, type: number) {
  ctx.clearRect(ox, oy, T, T);
  const d = PAL.doodad;
  switch (type) {
    case 0: {
      // Floating thought bubble — cloud-like shape with trail dots
      // Main bubble body
      p(ctx, ox, oy, 6, 2, d.purple); p(ctx, ox, oy, 7, 2, d.purple); p(ctx, ox, oy, 8, 2, d.purple);
      p(ctx, ox, oy, 5, 3, d.purple); p(ctx, ox, oy, 6, 3, d.white);
      p(ctx, ox, oy, 7, 3, d.whiteDim); p(ctx, ox, oy, 8, 3, d.white); p(ctx, ox, oy, 9, 3, d.purple);
      p(ctx, ox, oy, 4, 4, d.purple); p(ctx, ox, oy, 5, 4, d.whiteDim);
      p(ctx, ox, oy, 6, 4, d.white); p(ctx, ox, oy, 7, 4, d.white);
      p(ctx, ox, oy, 8, 4, d.whiteDim); p(ctx, ox, oy, 9, 4, d.purple);
      p(ctx, ox, oy, 5, 5, d.purple); p(ctx, ox, oy, 6, 5, d.whiteDim);
      p(ctx, ox, oy, 7, 5, d.white); p(ctx, ox, oy, 8, 5, d.purple);
      p(ctx, ox, oy, 6, 6, d.purple); p(ctx, ox, oy, 7, 6, d.purple);
      // Trail dots
      p(ctx, ox, oy, 7, 8, d.dim); p(ctx, ox, oy, 8, 9, d.dimBright);
      p(ctx, ox, oy, 8, 11, d.dim);
      // Inner thought symbol (~)
      p(ctx, ox, oy, 6, 4, d.magenta);
      break;
    }
    case 1: {
      // Electrode cluster — vertical rods with sparks
      // Central tall rod
      p(ctx, ox, oy, 7, 1, d.metalLight); p(ctx, ox, oy, 7, 2, d.metal);
      p(ctx, ox, oy, 7, 3, d.metal); p(ctx, ox, oy, 7, 4, d.metal);
      p(ctx, ox, oy, 7, 5, d.metal); p(ctx, ox, oy, 7, 6, d.metal);
      p(ctx, ox, oy, 7, 7, d.metalDark); p(ctx, ox, oy, 7, 8, d.metalDark);
      // Left rod (shorter)
      p(ctx, ox, oy, 4, 3, d.metalLight); p(ctx, ox, oy, 4, 4, d.metal);
      p(ctx, ox, oy, 4, 5, d.metal); p(ctx, ox, oy, 4, 6, d.metal);
      p(ctx, ox, oy, 4, 7, d.metalDark); p(ctx, ox, oy, 4, 8, d.metalDark);
      // Right rod (shorter)
      p(ctx, ox, oy, 10, 4, d.metalLight); p(ctx, ox, oy, 10, 5, d.metal);
      p(ctx, ox, oy, 10, 6, d.metal); p(ctx, ox, oy, 10, 7, d.metalDark);
      p(ctx, ox, oy, 10, 8, d.metalDark);
      // Base plate
      b(ctx, ox, oy, 3, 9, 9, 1, d.metalDark);
      b(ctx, ox, oy, 4, 10, 7, 1, d.metalDark);
      // Electric sparks between rods
      p(ctx, ox, oy, 5, 3, d.magenta); p(ctx, ox, oy, 6, 4, d.magentaDim);
      p(ctx, ox, oy, 8, 3, d.magenta); p(ctx, ox, oy, 9, 5, d.magentaDim);
      // Spark tips
      p(ctx, ox, oy, 7, 1, d.blueBright); p(ctx, ox, oy, 4, 3, d.blueBright);
      p(ctx, ox, oy, 10, 4, d.blueBright);
      break;
    }
    case 2: {
      // Spilled neural fluid — puddle on floor
      // Main puddle body (irregular shape)
      p(ctx, ox, oy, 5, 7, d.purpleDark); p(ctx, ox, oy, 6, 7, d.purple);
      p(ctx, ox, oy, 7, 7, d.purple); p(ctx, ox, oy, 8, 7, d.purpleDark);
      p(ctx, ox, oy, 4, 8, d.purpleDark); p(ctx, ox, oy, 5, 8, d.purple);
      p(ctx, ox, oy, 6, 8, d.magentaDim); p(ctx, ox, oy, 7, 8, d.purple);
      p(ctx, ox, oy, 8, 8, d.purple); p(ctx, ox, oy, 9, 8, d.purpleDark);
      p(ctx, ox, oy, 4, 9, d.purpleDark); p(ctx, ox, oy, 5, 9, d.purple);
      p(ctx, ox, oy, 6, 9, d.purple); p(ctx, ox, oy, 7, 9, d.magentaDim);
      p(ctx, ox, oy, 8, 9, d.purpleDark); p(ctx, ox, oy, 9, 9, d.purpleDark);
      p(ctx, ox, oy, 5, 10, d.purpleDark); p(ctx, ox, oy, 6, 10, d.purpleDark);
      p(ctx, ox, oy, 7, 10, d.purpleDark);
      // Surface sheen
      p(ctx, ox, oy, 6, 8, d.pink); p(ctx, ox, oy, 7, 9, d.pink);
      // Drip trail leading to puddle
      p(ctx, ox, oy, 7, 5, d.dim); p(ctx, ox, oy, 7, 6, d.purpleDark);
      // Tiny splatter
      p(ctx, ox, oy, 3, 8, d.dim); p(ctx, ox, oy, 10, 9, d.dim);
      break;
    }
    case 3: {
      // EEG readout screen — small monitor with waveform
      // Screen housing (dark metal frame)
      b(ctx, ox, oy, 3, 3, 8, 7, d.metalDark);
      b(ctx, ox, oy, 4, 4, 6, 5, d.screen);
      // Waveform line (EEG peaks)
      p(ctx, ox, oy, 4, 7, d.screenDim);
      p(ctx, ox, oy, 5, 6, d.screenGlow);
      p(ctx, ox, oy, 6, 5, d.screenLine);
      p(ctx, ox, oy, 7, 7, d.screenGlow);
      p(ctx, ox, oy, 8, 4, d.screenLine);
      p(ctx, ox, oy, 9, 6, d.screenGlow);
      // Status LED
      p(ctx, ox, oy, 10, 3, d.green);
      // Stand
      p(ctx, ox, oy, 6, 10, d.metalDark); p(ctx, ox, oy, 7, 10, d.metalDark);
      b(ctx, ox, oy, 5, 11, 4, 1, d.metalDark);
      // Screen glow effect
      p(ctx, ox, oy, 5, 5, d.screenDim); p(ctx, ox, oy, 8, 6, d.screenDim);
      // Frame highlight
      p(ctx, ox, oy, 3, 3, d.metal); p(ctx, ox, oy, 10, 3, d.metal);
      break;
    }
    case 4: {
      // Brain fragment — partial brain chunk
      // Irregular brain tissue mass
      p(ctx, ox, oy, 6, 4, d.pinkDark); p(ctx, ox, oy, 7, 4, d.pinkDark);
      p(ctx, ox, oy, 5, 5, d.pinkDark); p(ctx, ox, oy, 6, 5, d.pink);
      p(ctx, ox, oy, 7, 5, d.pink); p(ctx, ox, oy, 8, 5, d.pinkDark);
      p(ctx, ox, oy, 5, 6, d.pink); p(ctx, ox, oy, 6, 6, d.white);
      p(ctx, ox, oy, 7, 6, d.pink); p(ctx, ox, oy, 8, 6, d.pink);
      p(ctx, ox, oy, 9, 6, d.pinkDark);
      p(ctx, ox, oy, 5, 7, d.pinkDark); p(ctx, ox, oy, 6, 7, d.pink);
      p(ctx, ox, oy, 7, 7, d.pinkDark); p(ctx, ox, oy, 8, 7, d.pinkDark);
      p(ctx, ox, oy, 6, 8, d.pinkDark); p(ctx, ox, oy, 7, 8, d.pinkDark);
      // Brain fold lines
      p(ctx, ox, oy, 6, 5, d.purpleDark); p(ctx, ox, oy, 7, 7, d.purpleDark);
      // Trailing nerve fibers
      p(ctx, ox, oy, 5, 9, d.dim); p(ctx, ox, oy, 4, 10, d.dim);
      p(ctx, ox, oy, 8, 9, d.dim); p(ctx, ox, oy, 9, 10, d.dim);
      // Glow around fragment
      p(ctx, ox, oy, 4, 5, d.dim); p(ctx, ox, oy, 9, 7, d.dim);
      break;
    }
    case 5: {
      // Psionic crystal — faceted gem shape
      // Top point
      p(ctx, ox, oy, 7, 2, d.crystalBright);
      // Upper facet
      p(ctx, ox, oy, 6, 3, d.crystalBright); p(ctx, ox, oy, 7, 3, d.crystalCore);
      p(ctx, ox, oy, 8, 3, d.crystalBright);
      // Middle widest
      p(ctx, ox, oy, 5, 4, d.crystal); p(ctx, ox, oy, 6, 4, d.crystalBright);
      p(ctx, ox, oy, 7, 4, d.crystalCore); p(ctx, ox, oy, 8, 4, d.crystalBright);
      p(ctx, ox, oy, 9, 4, d.crystal);
      // Middle body
      p(ctx, ox, oy, 5, 5, d.crystalDark); p(ctx, ox, oy, 6, 5, d.crystal);
      p(ctx, ox, oy, 7, 5, d.crystalBright); p(ctx, ox, oy, 8, 5, d.crystal);
      p(ctx, ox, oy, 9, 5, d.crystalDark);
      // Lower facet
      p(ctx, ox, oy, 5, 6, d.crystalDark); p(ctx, ox, oy, 6, 6, d.crystalDark);
      p(ctx, ox, oy, 7, 6, d.crystal); p(ctx, ox, oy, 8, 6, d.crystalDark);
      p(ctx, ox, oy, 9, 6, d.crystalDark);
      // Lower narrow
      p(ctx, ox, oy, 6, 7, d.crystalDark); p(ctx, ox, oy, 7, 7, d.crystalDark);
      p(ctx, ox, oy, 8, 7, d.crystalDark);
      // Bottom point
      p(ctx, ox, oy, 7, 8, d.crystalDark);
      // Ground glow
      p(ctx, ox, oy, 6, 9, d.dim); p(ctx, ox, oy, 7, 9, d.dimBright); p(ctx, ox, oy, 8, 9, d.dim);
      // Sparkle highlights
      p(ctx, ox, oy, 7, 3, d.white); p(ctx, ox, oy, 6, 4, d.whiteDim);
      break;
    }
    case 6: {
      // Memory orb — floating sphere with swirling interior
      // Outer ring
      p(ctx, ox, oy, 6, 3, d.orbDim); p(ctx, ox, oy, 7, 3, d.orbDim); p(ctx, ox, oy, 8, 3, d.orbDim);
      p(ctx, ox, oy, 5, 4, d.orbDim); p(ctx, ox, oy, 9, 4, d.orbDim);
      p(ctx, ox, oy, 4, 5, d.orbDim); p(ctx, ox, oy, 10, 5, d.orbDim);
      p(ctx, ox, oy, 4, 6, d.orbDim); p(ctx, ox, oy, 10, 6, d.orbDim);
      p(ctx, ox, oy, 4, 7, d.orbDim); p(ctx, ox, oy, 10, 7, d.orbDim);
      p(ctx, ox, oy, 5, 8, d.orbDim); p(ctx, ox, oy, 9, 8, d.orbDim);
      p(ctx, ox, oy, 6, 9, d.orbDim); p(ctx, ox, oy, 7, 9, d.orbDim); p(ctx, ox, oy, 8, 9, d.orbDim);
      // Inner fill
      p(ctx, ox, oy, 6, 4, d.orb); p(ctx, ox, oy, 7, 4, d.orb); p(ctx, ox, oy, 8, 4, d.orb);
      p(ctx, ox, oy, 5, 5, d.orb); p(ctx, ox, oy, 6, 5, d.orbBright);
      p(ctx, ox, oy, 7, 5, d.orbBright); p(ctx, ox, oy, 8, 5, d.orb); p(ctx, ox, oy, 9, 5, d.orb);
      p(ctx, ox, oy, 5, 6, d.orb); p(ctx, ox, oy, 6, 6, d.orbCore);
      p(ctx, ox, oy, 7, 6, d.orbBright); p(ctx, ox, oy, 8, 6, d.orbBright); p(ctx, ox, oy, 9, 6, d.orb);
      p(ctx, ox, oy, 5, 7, d.orb); p(ctx, ox, oy, 6, 7, d.orbBright);
      p(ctx, ox, oy, 7, 7, d.orb); p(ctx, ox, oy, 8, 7, d.orb); p(ctx, ox, oy, 9, 7, d.orb);
      p(ctx, ox, oy, 6, 8, d.orb); p(ctx, ox, oy, 7, 8, d.orb); p(ctx, ox, oy, 8, 8, d.orb);
      // Swirl pattern inside
      p(ctx, ox, oy, 6, 5, d.white); p(ctx, ox, oy, 8, 7, d.whiteDim);
      // Shadow underneath
      p(ctx, ox, oy, 6, 10, d.dim); p(ctx, ox, oy, 7, 10, d.dim); p(ctx, ox, oy, 8, 10, d.dim);
      break;
    }
    case 7: {
      // Synapse spark — electrical discharge
      // Central spark point
      p(ctx, ox, oy, 7, 6, d.sparkBright); p(ctx, ox, oy, 6, 6, d.spark);
      // Radiating arcs
      // Upper-left arc
      p(ctx, ox, oy, 6, 5, d.magenta); p(ctx, ox, oy, 5, 4, d.magentaDim);
      p(ctx, ox, oy, 4, 3, d.purple); p(ctx, ox, oy, 3, 2, d.dim);
      // Upper-right arc
      p(ctx, ox, oy, 8, 5, d.magenta); p(ctx, ox, oy, 9, 4, d.magentaDim);
      p(ctx, ox, oy, 10, 4, d.purple);
      // Lower-left arc
      p(ctx, ox, oy, 5, 7, d.magenta); p(ctx, ox, oy, 4, 8, d.magentaDim);
      p(ctx, ox, oy, 3, 9, d.purple);
      // Lower-right arc
      p(ctx, ox, oy, 8, 7, d.magenta); p(ctx, ox, oy, 9, 8, d.magentaDim);
      p(ctx, ox, oy, 10, 9, d.purple); p(ctx, ox, oy, 11, 10, d.dim);
      // Side sparks
      p(ctx, ox, oy, 5, 6, d.spark); p(ctx, ox, oy, 8, 6, d.sparkDim);
      p(ctx, ox, oy, 7, 5, d.sparkDim); p(ctx, ox, oy, 7, 7, d.spark);
      // Tiny scattered spark dots
      p(ctx, ox, oy, 2, 5, d.dim); p(ctx, ox, oy, 11, 7, d.dim);
      p(ctx, ox, oy, 6, 2, d.dim); p(ctx, ox, oy, 8, 10, d.dim);
      break;
    }
  }
}

export default function PsionicTerrainSprites() {
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
      drawTank(tCtx, ox, 1 * T, v);
      for (let f = 0; f < 3; f++) drawEnergy(tCtx, ox, (2 + f) * T, v, f);
      drawNoBuild(tCtx, ox, 5 * T, v);
    }
    const tp = terrainPreviewRef.current!;
    const scale = 3;
    tp.width = VARIANTS * T * scale + 140;
    tp.height = TERRAIN_ROWS * T * scale + 40;
    const tpCtx = tp.getContext('2d')!;
    tpCtx.imageSmoothingEnabled = false;
    tpCtx.fillStyle = '#08060e';
    tpCtx.fillRect(0, 0, tp.width, tp.height);
    tpCtx.drawImage(tc, 140, 20, tc.width * scale, tc.height * scale);
    tpCtx.fillStyle = '#aa44cc';
    tpCtx.font = '11px monospace';
    const rowLabels = ['Ground', 'Brain Tank', 'Energy 0', 'Energy 1', 'Energy 2', 'NoBuild'];
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
    dpCtx.fillStyle = '#08060e';
    dpCtx.fillRect(0, 0, dp.width, dp.height);
    dpCtx.drawImage(dc, 80, 20, dc.width * dScale, dc.height * dScale);
    dpCtx.fillStyle = '#aa44cc';
    dpCtx.font = '11px monospace';
    dpCtx.fillText('Psionic', 4, 20 + T * dScale / 2 + 4);
    setReady(true);
  }, []);

  const download = (ref: React.RefObject<HTMLCanvasElement | null>, name: string) => {
    const a = document.createElement('a');
    a.download = name;
    a.href = ref.current!.toDataURL('image/png');
    a.click();
  };

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', color: '#aa44cc', background: '#08060e' }}>
      <h2 data-label="Psionic Terrain">Psionic Terrain Sprites — Mind Palace</h2>
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setView('preview')} style={{ marginRight: 8, background: view === 'preview' ? '#aa44cc' : '#18102a', color: view === 'preview' ? '#08060e' : '#aa44cc', border: '1px solid #aa44cc', padding: '4px 12px', cursor: 'pointer' }}>Preview (3x)</button>
        <button onClick={() => setView('actual')} style={{ marginRight: 8, background: view === 'actual' ? '#aa44cc' : '#18102a', color: view === 'actual' ? '#08060e' : '#aa44cc', border: '1px solid #aa44cc', padding: '4px 12px', cursor: 'pointer' }}>Actual Size</button>
        {ready && (
          <>
            <button onClick={() => download(terrainRef, 'psionic_terrain_tileset.png')} style={{ marginRight: 8, background: '#18102a', color: '#aa44cc', border: '1px solid #aa44cc', padding: '4px 12px', cursor: 'pointer' }}>Download Tileset</button>
            <button onClick={() => download(doodadRef, 'psionic_terrain_doodads.png')} style={{ background: '#18102a', color: '#aa44cc', border: '1px solid #aa44cc', padding: '4px 12px', cursor: 'pointer' }}>Download Doodads</button>
          </>
        )}
      </div>
      <p style={{ fontSize: '12px', color: '#662288' }} data-frame-size="28x28">Frame size: 28x28 | PX=2 | Grid=14x14 | 16 cols (NESW bitmask) x 6 rows</p>
      <h3 data-label="Psionic Terrain (Preview)">Terrain Tileset (16 auto-tile variants x 6 rows)</h3>
      <canvas ref={terrainPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #aa44cc33' }} />
      <canvas ref={terrainRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #aa44cc33' }} />
      <h3>Mind Palace Doodads (8 types)</h3>
      <canvas ref={doodadPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #aa44cc33' }} />
      <canvas ref={doodadRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #aa44cc33' }} />
    </div>
  );
}
