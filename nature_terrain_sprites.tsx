/**
 * Nature Terrain Sprite Generator — Ancient Grove terrain.
 *
 * Layout:
 *   Columns: 16 (auto-tile bitmask variants, bits = NESW)
 *   Row order:
 *   0: forest floor (ground)
 *   1: ancient trees (blocked type 1)
 *   2: enchanted spring frame 0 (blocked type 2)
 *   3: enchanted spring frame 1 (blocked type 2, animated)
 *   4: enchanted spring frame 2 (blocked type 2, animated)
 *   5: mushroom rings (NoBuild terrain)
 *
 * Doodads row 0: 8 types
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
    base: '#1a2a12',
    baseMid: '#1e2e16',
    baseLt: '#222f1a',
    moss: '#2d4420',
    mossLt: '#3a5528',
    mossDk: '#1f3318',
    leaf: '#3a3018',
    leafRed: '#4a2a14',
    leafGold: '#5a4a1a',
    leafOrange: '#4f3516',
    grass: '#3a6628',
    grassLt: '#4a7a30',
    grassDk: '#2a5520',
    root: '#3a2a18',
    rootLt: '#4a3a22',
    earth: '#2a2018',
    earthLt: '#332a1c',
    pebble: '#3a3a2a',
    pebbleLt: '#4a4a36',
  },
  tree: {
    bark: '#553311',
    barkMid: '#4a2a0e',
    barkDk: '#3a1e08',
    barkLt: '#664422',
    barkPale: '#775533',
    ring: '#664422',
    ringDk: '#553318',
    ringLt: '#776633',
    moss: '#338833',
    mossDk: '#226622',
    mossLt: '#44aa44',
    knot: '#2a1a08',
    knotRim: '#553a18',
    highlight: '#556633',
    center: '#443a20',
    edge: '#665522',
    edgeDk: '#554418',
    rootBase: '#443018',
    rootTip: '#332210',
  },
  spring: {
    deep: '#1a3a40',
    deepMid: '#1e4448',
    mid: '#225550',
    shallow: '#2a6658',
    edge: '#2a5548',
    edgeLt: '#337766',
    sparkle: '#88ffdd',
    sparkleMid: '#55ccaa',
    sparkleDim: '#339977',
    glow: '#44bb99',
    glowDim: '#338877',
    ripple: '#55aa88',
    rippleLt: '#66ccaa',
    stone: '#3a4a44',
    stoneLt: '#4a5a50',
    lily: '#338844',
    lilyLt: '#44aa55',
    lilyFlower: '#ddaacc',
    cattail: '#554422',
    cattailTop: '#665533',
    foam: '#99ddcc',
  },
  noBuild: {
    base: '#1a2a14',
    baseLt: '#1e2e18',
    enchant: '#222e1e',
    enchantLt: '#2a3826',
    sparkle: '#88ccaa',
    sparkleDim: '#558866',
    sparkleBright: '#aaeedd',
    mushRed: '#cc3322',
    mushRedLt: '#dd5544',
    mushRedDk: '#aa2211',
    mushRedSpot: '#eeddcc',
    mushBlue: '#3366cc',
    mushBlueLt: '#5588dd',
    mushBlueDk: '#2244aa',
    mushBlueGlow: '#77aaee',
    mushSpotted: '#cc8833',
    mushSpottedLt: '#ddaa55',
    mushSpottedDk: '#aa6622',
    mushSpottedSpot: '#eedd88',
    stem: '#ccccaa',
    stemDk: '#aabb88',
    ring: '#334428',
    ringLt: '#3a5530',
  },
  doodad: {
    green: '#55aa44',
    greenLt: '#66cc55',
    greenDk: '#448833',
    brown: '#885533',
    brownLt: '#996644',
    brownDk: '#664422',
    red: '#cc4444',
    redLt: '#dd6655',
    yellow: '#ddcc44',
    yellowLt: '#eeee66',
    pink: '#cc88aa',
    pinkLt: '#ddaacc',
    blue: '#5588cc',
    blueLt: '#77aadd',
    dark: '#2a3a22',
    white: '#ccddbb',
    orange: '#cc8833',
    purple: '#8855aa',
    glow: '#ccffaa',
    glowDim: '#88cc66',
    barkDk: '#553311',
    barkLt: '#775544',
    moss: '#3a6628',
    nest: '#aa8855',
    nestDk: '#886633',
    eggBlue: '#aaccdd',
    eggWhite: '#ddeedd',
  },
};

/* Seeded pseudo-random for deterministic per-variant detail */
function seeded(seed: number) {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return (s >> 16) / 32768; };
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

function drawGround(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.ground;
  const rng = seeded(idx * 997 + 31);

  // Base fill with subtle variation
  b(ctx, ox, oy, 0, 0, G, G, c.base);
  // Dappled earth patches
  for (let gy = 0; gy < G; gy++) {
    for (let gx = 0; gx < G; gx++) {
      const v = rng();
      if (v < 0.08) p(ctx, ox, oy, gx, gy, c.baseMid);
      else if (v < 0.14) p(ctx, ox, oy, gx, gy, c.baseLt);
      else if (v < 0.18) p(ctx, ox, oy, gx, gy, c.earth);
      else if (v < 0.21) p(ctx, ox, oy, gx, gy, c.earthLt);
    }
  }

  // Moss patches — 2-3 per tile, organic shapes
  const mossCount = 2 + (idx % 2);
  for (let m = 0; m < mossCount; m++) {
    const mx = Math.floor(rng() * 10) + 1;
    const my = Math.floor(rng() * 10) + 1;
    const mc = rng() > 0.5 ? c.moss : c.mossDk;
    const ml = rng() > 0.5 ? c.mossLt : c.moss;
    p(ctx, ox, oy, mx, my, mc);
    p(ctx, ox, oy, mx + 1, my, ml);
    p(ctx, ox, oy, mx, my + 1, mc);
    if (rng() > 0.4) p(ctx, ox, oy, mx + 1, my + 1, mc);
    if (rng() > 0.6) p(ctx, ox, oy, mx - 1, my, c.mossDk);
  }

  // Fallen leaves — scattered, varied colors
  const leafColors = [c.leaf, c.leafRed, c.leafGold, c.leafOrange];
  const leafCount = 3 + (idx % 3);
  for (let l = 0; l < leafCount; l++) {
    const lx = Math.floor(rng() * 12) + 1;
    const ly = Math.floor(rng() * 12) + 1;
    const lc = leafColors[Math.floor(rng() * leafColors.length)];
    p(ctx, ox, oy, lx, ly, lc);
    // Some leaves are 2px (L-shaped or line)
    if (rng() > 0.5) {
      p(ctx, ox, oy, lx + (rng() > 0.5 ? 1 : 0), ly + (rng() > 0.5 ? 1 : 0), lc);
    }
  }

  // Grass tufts — small V shapes along edges or scattered
  const grassCount = 2 + (idx % 3);
  for (let g = 0; g < grassCount; g++) {
    const gx = Math.floor(rng() * 12) + 1;
    const gy = Math.floor(rng() * 10) + 2;
    const gc = rng() > 0.4 ? c.grass : c.grassDk;
    const gl = c.grassLt;
    p(ctx, ox, oy, gx, gy, gc);
    p(ctx, ox, oy, gx - 1, gy - 1, gl);
    p(ctx, ox, oy, gx + 1, gy - 1, gc);
    if (rng() > 0.5) p(ctx, ox, oy, gx, gy - 1, gl);
  }

  // Root tendrils — thin brown lines
  if (idx % 4 < 2) {
    const rx = Math.floor(rng() * 8) + 2;
    const ry = Math.floor(rng() * 8) + 2;
    for (let i = 0; i < 3 + Math.floor(rng() * 3); i++) {
      p(ctx, ox, oy, rx + i, ry + Math.floor(rng() * 2), c.root);
    }
  }

  // Small pebbles
  if (rng() > 0.5) {
    const px2 = Math.floor(rng() * 12) + 1;
    const py2 = Math.floor(rng() * 12) + 1;
    p(ctx, ox, oy, px2, py2, c.pebble);
    if (rng() > 0.6) p(ctx, ox, oy, px2 + 1, py2, c.pebbleLt);
  }
}

function drawTree(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.tree;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  const rng = seeded(idx * 773 + 17);
  const treeType = idx % 4; // 0=massive, 1=gnarled, 2=straight, 3=hollow

  // Base bark fill
  b(ctx, ox, oy, 0, 0, G, G, c.bark);

  // Inner bark texture with variation
  b(ctx, ox, oy, 1, 1, 12, 12, c.barkMid);
  b(ctx, ox, oy, 2, 2, 10, 10, c.barkDk);

  // Bark texture — vertical grain lines
  for (let gy = 1; gy < G - 1; gy++) {
    for (let gx = 1; gx < G - 1; gx++) {
      const v = rng();
      if (v < 0.06) p(ctx, ox, oy, gx, gy, c.barkLt);
      else if (v < 0.10) p(ctx, ox, oy, gx, gy, c.barkPale);
      else if (v < 0.14) p(ctx, ox, oy, gx, gy, c.bark);
    }
  }

  if (treeType === 0) {
    // Massive trunk — large concentric rings
    for (let ring = 5; ring >= 1; ring--) {
      const rc = ring % 2 === 0 ? c.ring : c.ringDk;
      for (let a = 0; a < 24; a++) {
        const angle = (a / 24) * Math.PI * 2;
        const rx = 7 + Math.round(ring * Math.cos(angle));
        const ry = 7 + Math.round(ring * Math.sin(angle));
        p(ctx, ox, oy, rx, ry, rc);
      }
    }
    // Core
    p(ctx, ox, oy, 6, 6, c.center); p(ctx, ox, oy, 7, 6, c.center);
    p(ctx, ox, oy, 6, 7, c.center); p(ctx, ox, oy, 7, 7, c.highlight);
  } else if (treeType === 1) {
    // Gnarled — irregular rings, off-center core
    const cx = 6, cy = 6;
    for (let ring = 5; ring >= 1; ring--) {
      const rc = ring % 2 === 0 ? c.ring : c.ringDk;
      for (let a = 0; a < 16; a++) {
        const angle = (a / 16) * Math.PI * 2;
        const wobble = 0.7 + rng() * 0.6;
        const rx = cx + Math.round(ring * wobble * Math.cos(angle));
        const ry = cy + Math.round(ring * wobble * Math.sin(angle));
        p(ctx, ox, oy, rx, ry, rc);
      }
    }
    p(ctx, ox, oy, cx, cy, c.center);
    // Knothole
    p(ctx, ox, oy, 9, 4, c.knot); p(ctx, ox, oy, 10, 4, c.knot);
    p(ctx, ox, oy, 9, 5, c.knot); p(ctx, ox, oy, 10, 5, c.knotRim);
  } else if (treeType === 2) {
    // Straight — cleaner rings, tight grain
    for (let ring = 5; ring >= 1; ring--) {
      const rc = ring % 2 === 0 ? c.ringLt : c.ring;
      for (let a = 0; a < 20; a++) {
        const angle = (a / 20) * Math.PI * 2;
        const rx = 7 + Math.round(ring * 1.0 * Math.cos(angle));
        const ry = 7 + Math.round(ring * 1.0 * Math.sin(angle));
        p(ctx, ox, oy, rx, ry, rc);
      }
    }
    p(ctx, ox, oy, 7, 7, c.highlight);
    p(ctx, ox, oy, 6, 7, c.center); p(ctx, ox, oy, 7, 6, c.center);
  } else {
    // Hollow interior — dark center
    for (let ring = 5; ring >= 3; ring--) {
      const rc = ring % 2 === 0 ? c.ring : c.ringDk;
      for (let a = 0; a < 20; a++) {
        const angle = (a / 20) * Math.PI * 2;
        const rx = 7 + Math.round(ring * Math.cos(angle));
        const ry = 7 + Math.round(ring * Math.sin(angle));
        p(ctx, ox, oy, rx, ry, rc);
      }
    }
    // Dark hollow center
    b(ctx, ox, oy, 5, 5, 4, 4, c.knot);
    p(ctx, ox, oy, 6, 6, '#1a0e04'); p(ctx, ox, oy, 7, 7, '#1a0e04');
    p(ctx, ox, oy, 6, 7, '#1a0e04'); p(ctx, ox, oy, 7, 6, '#1a0e04');
    p(ctx, ox, oy, 5, 5, c.knotRim); p(ctx, ox, oy, 8, 8, c.knotRim);
  }

  // Moss patches on the trunk — varies per variant
  const mossPatches = 2 + (idx % 3);
  for (let m = 0; m < mossPatches; m++) {
    const mx = Math.floor(rng() * 10) + 2;
    const my = Math.floor(rng() * 10) + 2;
    const mc = rng() > 0.5 ? c.moss : c.mossDk;
    p(ctx, ox, oy, mx, my, mc);
    p(ctx, ox, oy, mx + 1, my, rng() > 0.4 ? c.mossLt : c.moss);
    if (rng() > 0.5) p(ctx, ox, oy, mx, my + 1, c.mossDk);
  }

  // Root system at base (visible on exposed south edge)
  if (!s) {
    p(ctx, ox, oy, 3, G - 2, c.rootBase); p(ctx, ox, oy, 4, G - 1, c.rootTip);
    p(ctx, ox, oy, 10, G - 2, c.rootBase); p(ctx, ox, oy, 9, G - 1, c.rootTip);
    p(ctx, ox, oy, 6, G - 2, c.rootBase); p(ctx, ox, oy, 7, G - 2, c.rootBase);
  }

  // Edges — bark border with exposed-edge highlights
  if (!n) {
    b(ctx, ox, oy, 0, 0, G, 1, c.edge);
    // Moss on north edge
    p(ctx, ox, oy, 3, 0, c.moss); p(ctx, ox, oy, 4, 0, c.mossLt);
    p(ctx, ox, oy, 9, 0, c.mossDk); p(ctx, ox, oy, 10, 0, c.moss);
  }
  if (!s) {
    b(ctx, ox, oy, 0, G - 1, G, 1, c.edge);
    p(ctx, ox, oy, 5, G - 1, c.rootBase); p(ctx, ox, oy, 8, G - 1, c.rootBase);
  }
  if (!w) {
    b(ctx, ox, oy, 0, 0, 1, G, c.edge);
    p(ctx, ox, oy, 0, 3, c.moss); p(ctx, ox, oy, 0, 4, c.mossDk);
    p(ctx, ox, oy, 0, 9, c.moss); p(ctx, ox, oy, 0, 10, c.mossLt);
  }
  if (!e) {
    b(ctx, ox, oy, G - 1, 0, 1, G, c.edge);
    p(ctx, ox, oy, G - 1, 4, c.mossDk); p(ctx, ox, oy, G - 1, 5, c.moss);
    p(ctx, ox, oy, G - 1, 8, c.moss); p(ctx, ox, oy, G - 1, 11, c.mossDk);
  }

  // Connected-edge continuity markers (bark grain continues)
  if (n) {
    for (let px2 = 3; px2 < G - 2; px2 += 3) {
      p(ctx, ox, oy, px2, 0, c.ring);
      p(ctx, ox, oy, px2 + 1, 0, c.ringDk);
    }
  }
  if (s) {
    for (let px2 = 3; px2 < G - 2; px2 += 3) {
      p(ctx, ox, oy, px2, G - 1, c.ring);
    }
  }
  if (w) {
    for (let py = 3; py < G - 2; py += 3) {
      p(ctx, ox, oy, 0, py, c.ring);
    }
  }
  if (e) {
    for (let py = 3; py < G - 2; py += 3) {
      p(ctx, ox, oy, G - 1, py, c.ring);
    }
  }

  // Outer corner darkening
  if (!n && !w) p(ctx, ox, oy, 0, 0, c.edgeDk);
  if (!n && !e) p(ctx, ox, oy, G - 1, 0, c.edgeDk);
  if (!s && !w) p(ctx, ox, oy, 0, G - 1, c.edgeDk);
  if (!s && !e) p(ctx, ox, oy, G - 1, G - 1, c.edgeDk);
}

function drawSpring(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number, frame: number) {
  const c = PAL.spring;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  const rng = seeded(idx * 557 + frame * 131 + 7);

  // Deep water base
  b(ctx, ox, oy, 0, 0, G, G, c.deep);

  // Depth gradient — shallower at edges
  for (let gy = 0; gy < G; gy++) {
    for (let gx = 0; gx < G; gx++) {
      const dx = Math.abs(gx - 6.5);
      const dy = Math.abs(gy - 6.5);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 4.5) {
        p(ctx, ox, oy, gx, gy, c.mid);
      } else if (dist > 3) {
        if (rng() < 0.3) p(ctx, ox, oy, gx, gy, c.deepMid);
      }
    }
  }

  // Submerged stones (visible through clear water)
  const stoneCount = 2 + (idx % 3);
  for (let si = 0; si < stoneCount; si++) {
    const sx = Math.floor(rng() * 8) + 3;
    const sy = Math.floor(rng() * 8) + 3;
    p(ctx, ox, oy, sx, sy, c.stone);
    if (rng() > 0.5) p(ctx, ox, oy, sx + 1, sy, c.stoneLt);
  }

  // Animated ripple rings — concentric arcs that shift per frame
  const ripCx = 7, ripCy = 7;
  const ripRadius = 2 + frame;
  for (let a = 0; a < 16; a++) {
    const angle = (a / 16) * Math.PI * 2 + frame * 0.4;
    const rx = ripCx + Math.round(ripRadius * Math.cos(angle));
    const ry = ripCy + Math.round(ripRadius * Math.sin(angle));
    if (a % 3 === 0) {
      p(ctx, ox, oy, rx, ry, c.rippleLt);
    } else {
      p(ctx, ox, oy, rx, ry, c.ripple);
    }
  }

  // Secondary ripple (smaller, offset)
  const rip2Cx = 4 + frame, rip2Cy = 4;
  const rip2R = 1 + (frame + 1) % 3;
  for (let a = 0; a < 10; a++) {
    const angle = (a / 10) * Math.PI * 2 + frame * 0.7;
    const rx = rip2Cx + Math.round(rip2R * Math.cos(angle));
    const ry = rip2Cy + Math.round(rip2R * Math.sin(angle));
    p(ctx, ox, oy, rx, ry, c.glowDim);
  }

  // Sparkle/light reflection — shifts per frame
  const sparkles = [
    { x: (3 + frame * 3) % 10 + 2, y: (2 + frame * 2) % 10 + 2 },
    { x: (8 - frame * 2 + 14) % 10 + 2, y: (7 + frame) % 10 + 2 },
    { x: (5 + frame * 4) % 10 + 2, y: (10 - frame * 3 + 14) % 10 + 2 },
    { x: (11 - frame) % 10 + 2, y: (4 + frame * 2) % 10 + 2 },
  ];
  sparkles.forEach((sp, i) => {
    const sc = i === 0 || i === 2 ? c.sparkle : c.sparkleMid;
    p(ctx, ox, oy, sp.x, sp.y, sc);
    if (i % 2 === 0) p(ctx, ox, oy, sp.x + 1, sp.y, c.sparkleDim);
  });

  // Lily pads — 1-2 per tile, at edges
  if (idx % 3 !== 2) {
    const lpx = 2 + (idx % 5) * 2;
    const lpy = 2 + (idx % 4) * 2;
    if (lpx < G - 2 && lpy < G - 2) {
      p(ctx, ox, oy, lpx, lpy, c.lily);
      p(ctx, ox, oy, lpx + 1, lpy, c.lilyLt);
      p(ctx, ox, oy, lpx, lpy + 1, c.lily);
      p(ctx, ox, oy, lpx + 1, lpy + 1, c.lilyLt);
      // Small flower on some lily pads
      if (idx % 4 === 0) p(ctx, ox, oy, lpx + 1, lpy, c.lilyFlower);
    }
  }

  // Cattails / water plants at edges (if not connected that direction)
  if (!n && idx % 3 === 0) {
    p(ctx, ox, oy, 4, 1, c.cattail); p(ctx, ox, oy, 4, 0, c.cattailTop);
    p(ctx, ox, oy, 10, 1, c.cattail); p(ctx, ox, oy, 10, 0, c.cattailTop);
  }
  if (!w && idx % 4 === 1) {
    p(ctx, ox, oy, 1, 5, c.cattail); p(ctx, ox, oy, 0, 5, c.cattailTop);
  }

  // Foam at edges where water meets land
  if (!n) {
    for (let gx = 1; gx < G - 1; gx++) {
      const fc = rng() > 0.6 ? c.foam : c.edgeLt;
      p(ctx, ox, oy, gx, 0, fc);
    }
    b(ctx, ox, oy, 0, 0, G, 1, c.shallow);
    for (let gx = 2; gx < G - 2; gx += 2) p(ctx, ox, oy, gx, 0, c.foam);
  }
  if (!s) {
    b(ctx, ox, oy, 0, G - 1, G, 1, c.shallow);
    for (let gx = 1; gx < G - 1; gx += 3) p(ctx, ox, oy, gx, G - 1, c.foam);
  }
  if (!w) {
    b(ctx, ox, oy, 0, 0, 1, G, c.shallow);
    for (let gy = 2; gy < G - 2; gy += 3) p(ctx, ox, oy, 0, gy, c.foam);
  }
  if (!e) {
    b(ctx, ox, oy, G - 1, 0, 1, G, c.shallow);
    for (let gy = 1; gy < G - 1; gy += 3) p(ctx, ox, oy, G - 1, gy, c.foam);
  }

  // Connected-edge water continuity
  if (n) {
    for (let gx = 3; gx < G - 2; gx += 4) p(ctx, ox, oy, gx, 0, c.ripple);
  }
  if (s) {
    for (let gx = 2; gx < G - 2; gx += 4) p(ctx, ox, oy, gx, G - 1, c.ripple);
  }
  if (w) {
    for (let gy = 3; gy < G - 2; gy += 4) p(ctx, ox, oy, 0, gy, c.ripple);
  }
  if (e) {
    for (let gy = 2; gy < G - 2; gy += 4) p(ctx, ox, oy, G - 1, gy, c.ripple);
  }
}

function drawNoBuild(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.noBuild;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  const rng = seeded(idx * 881 + 43);

  // Enchanted forest floor base
  b(ctx, ox, oy, 0, 0, G, G, c.base);

  // Slightly magical ground texture
  for (let gy = 0; gy < G; gy++) {
    for (let gx = 0; gx < G; gx++) {
      const v = rng();
      if (v < 0.08) p(ctx, ox, oy, gx, gy, c.baseLt);
      else if (v < 0.13) p(ctx, ox, oy, gx, gy, c.enchant);
      else if (v < 0.17) p(ctx, ox, oy, gx, gy, c.enchantLt);
    }
  }

  // Fairy ring on the ground — subtle circle of lighter earth
  const cx = 7, cy = 7;
  for (let a = 0; a < 20; a++) {
    const angle = (a / 20) * Math.PI * 2;
    const rx = cx + Math.round(5 * Math.cos(angle));
    const ry = cy + Math.round(5 * Math.sin(angle));
    p(ctx, ox, oy, rx, ry, c.ring);
    // Slightly lighter inner ring
    const irx = cx + Math.round(4 * Math.cos(angle));
    const iry = cy + Math.round(4 * Math.sin(angle));
    if (a % 3 === 0) p(ctx, ox, oy, irx, iry, c.ringLt);
  }

  // Mushrooms in ring formation — 4-6 colorful mushrooms per tile
  const mushTypes = [0, 1, 2]; // red, blue, spotted
  const mushCount = 4 + (idx % 3);
  for (let m = 0; m < mushCount; m++) {
    const angle = (m / mushCount) * Math.PI * 2 + (idx * 0.3);
    const mx = cx + Math.round(4.5 * Math.cos(angle));
    const my = cy + Math.round(4.5 * Math.sin(angle));
    const type = mushTypes[m % 3];

    if (type === 0) {
      // Red cap mushroom
      p(ctx, ox, oy, mx, my - 1, c.mushRed);
      if (rng() > 0.3) p(ctx, ox, oy, mx + 1, my - 1, c.mushRedLt);
      p(ctx, ox, oy, mx, my - 2, c.mushRedDk);
      // White spot on cap
      if (rng() > 0.4) p(ctx, ox, oy, mx, my - 1, c.mushRedSpot);
      // Stem
      p(ctx, ox, oy, mx, my, c.stem);
    } else if (type === 1) {
      // Glowing blue mushroom
      p(ctx, ox, oy, mx, my - 1, c.mushBlue);
      if (rng() > 0.3) p(ctx, ox, oy, mx - 1, my - 1, c.mushBlueLt);
      p(ctx, ox, oy, mx, my - 2, c.mushBlueDk);
      // Glow effect
      p(ctx, ox, oy, mx, my - 1, c.mushBlueGlow);
      // Stem
      p(ctx, ox, oy, mx, my, c.stem);
    } else {
      // Spotted/golden mushroom
      p(ctx, ox, oy, mx, my - 1, c.mushSpotted);
      p(ctx, ox, oy, mx + 1, my - 1, c.mushSpottedLt);
      p(ctx, ox, oy, mx, my - 2, c.mushSpottedDk);
      // Spot
      if (rng() > 0.5) p(ctx, ox, oy, mx, my - 1, c.mushSpottedSpot);
      // Stem
      p(ctx, ox, oy, mx, my, c.stemDk);
    }
  }

  // Center toadstool cluster — larger mushroom in the middle
  p(ctx, ox, oy, 6, 6, c.mushRed); p(ctx, ox, oy, 7, 6, c.mushRedLt);
  p(ctx, ox, oy, 6, 5, c.mushRedDk); p(ctx, ox, oy, 7, 5, c.mushRed);
  p(ctx, ox, oy, 8, 5, c.mushRedDk);
  p(ctx, ox, oy, 6, 4, c.mushRedSpot); p(ctx, ox, oy, 7, 4, c.mushRed);
  p(ctx, ox, oy, 6, 7, c.stem); p(ctx, ox, oy, 7, 7, c.stem);
  p(ctx, ox, oy, 7, 8, c.stemDk);

  // Sparkle particles — magical fairy dust
  const sparkleCount = 3 + (idx % 3);
  for (let sp = 0; sp < sparkleCount; sp++) {
    const sx = Math.floor(rng() * 10) + 2;
    const sy = Math.floor(rng() * 10) + 2;
    const sc = rng() > 0.6 ? c.sparkleBright : (rng() > 0.4 ? c.sparkle : c.sparkleDim);
    p(ctx, ox, oy, sx, sy, sc);
  }

  // Connection edges — enchanted border
  if (n) {
    b(ctx, ox, oy, 5, 0, 4, 2, c.enchantLt);
    p(ctx, ox, oy, 6, 0, c.sparkle); p(ctx, ox, oy, 7, 1, c.sparkleDim);
  }
  if (s) {
    b(ctx, ox, oy, 5, G - 2, 4, 2, c.enchantLt);
    p(ctx, ox, oy, 7, G - 1, c.sparkle);
  }
  if (w) {
    b(ctx, ox, oy, 0, 5, 2, 4, c.enchantLt);
    p(ctx, ox, oy, 0, 6, c.sparkle);
  }
  if (e) {
    b(ctx, ox, oy, G - 2, 5, 2, 4, c.enchantLt);
    p(ctx, ox, oy, G - 1, 7, c.sparkle);
  }

  // Exposed edge mushroom sentinels
  if (!n) {
    p(ctx, ox, oy, 4, 0, c.mushBlue); p(ctx, ox, oy, 10, 0, c.mushSpotted);
  }
  if (!s) {
    p(ctx, ox, oy, 5, G - 1, c.mushRed); p(ctx, ox, oy, 9, G - 1, c.mushBlue);
  }
  if (!w) {
    p(ctx, ox, oy, 0, 4, c.mushSpotted); p(ctx, ox, oy, 0, 9, c.mushRed);
  }
  if (!e) {
    p(ctx, ox, oy, G - 1, 5, c.mushBlue); p(ctx, ox, oy, G - 1, 10, c.mushSpotted);
  }
}

function drawDoodad(ctx: CanvasRenderingContext2D, ox: number, oy: number, type: number) {
  ctx.clearRect(ox, oy, T, T);
  const d = PAL.doodad;
  switch (type) {
    case 0: {
      // Fallen log — mossy, with bark texture and broken end
      // Main log body
      b(ctx, ox, oy, 2, 6, 10, 3, d.brown);
      b(ctx, ox, oy, 2, 6, 10, 1, d.brownLt); // top highlight
      b(ctx, ox, oy, 2, 8, 10, 1, d.brownDk); // bottom shadow
      // Bark texture
      p(ctx, ox, oy, 4, 7, d.barkDk); p(ctx, ox, oy, 7, 7, d.barkDk);
      p(ctx, ox, oy, 9, 7, d.barkDk);
      // Broken end (left) — circular cross-section
      p(ctx, ox, oy, 1, 6, d.brownLt); p(ctx, ox, oy, 1, 7, d.brownDk);
      p(ctx, ox, oy, 1, 8, d.barkDk);
      // Ring on broken end
      p(ctx, ox, oy, 2, 7, d.yellowLt);
      // Moss growing on top
      p(ctx, ox, oy, 5, 5, d.greenDk); p(ctx, ox, oy, 6, 5, d.green);
      p(ctx, ox, oy, 8, 5, d.moss); p(ctx, ox, oy, 9, 6, d.greenDk);
      // Small mushroom on log
      p(ctx, ox, oy, 4, 5, d.orange); p(ctx, ox, oy, 4, 6, d.white);
      break;
    }
    case 1: {
      // Flower cluster — multiple small flowers with stems
      // Stems
      p(ctx, ox, oy, 5, 9, d.greenDk); p(ctx, ox, oy, 5, 8, d.green);
      p(ctx, ox, oy, 7, 10, d.greenDk); p(ctx, ox, oy, 7, 9, d.green); p(ctx, ox, oy, 7, 8, d.green);
      p(ctx, ox, oy, 9, 9, d.greenDk); p(ctx, ox, oy, 9, 8, d.green);
      // Leaves
      p(ctx, ox, oy, 4, 8, d.greenLt); p(ctx, ox, oy, 6, 9, d.greenLt);
      p(ctx, ox, oy, 8, 9, d.green); p(ctx, ox, oy, 10, 8, d.greenLt);
      // Flower 1 — pink
      p(ctx, ox, oy, 5, 6, d.pink); p(ctx, ox, oy, 4, 7, d.pink);
      p(ctx, ox, oy, 6, 7, d.pinkLt); p(ctx, ox, oy, 5, 7, d.yellow);
      // Flower 2 — yellow
      p(ctx, ox, oy, 7, 6, d.yellow); p(ctx, ox, oy, 8, 7, d.yellowLt);
      p(ctx, ox, oy, 6, 6, d.yellow); p(ctx, ox, oy, 7, 7, d.orange);
      // Flower 3 — blue
      p(ctx, ox, oy, 9, 6, d.blue); p(ctx, ox, oy, 10, 7, d.blueLt);
      p(ctx, ox, oy, 9, 7, d.yellow);
      break;
    }
    case 2: {
      // Fern frond — detailed curving frond shape
      // Main stem
      p(ctx, ox, oy, 7, 10, d.greenDk); p(ctx, ox, oy, 7, 9, d.greenDk);
      p(ctx, ox, oy, 7, 8, d.green); p(ctx, ox, oy, 7, 7, d.green);
      p(ctx, ox, oy, 7, 6, d.green); p(ctx, ox, oy, 7, 5, d.greenLt);
      // Left fronds
      p(ctx, ox, oy, 6, 9, d.green); p(ctx, ox, oy, 5, 9, d.greenLt);
      p(ctx, ox, oy, 6, 7, d.green); p(ctx, ox, oy, 5, 7, d.greenLt);
      p(ctx, ox, oy, 4, 7, d.greenDk);
      p(ctx, ox, oy, 6, 5, d.greenLt); p(ctx, ox, oy, 5, 5, d.green);
      // Right fronds
      p(ctx, ox, oy, 8, 8, d.green); p(ctx, ox, oy, 9, 8, d.greenLt);
      p(ctx, ox, oy, 8, 6, d.green); p(ctx, ox, oy, 9, 6, d.greenLt);
      p(ctx, ox, oy, 10, 6, d.greenDk);
      p(ctx, ox, oy, 8, 4, d.greenLt);
      // Curling tip
      p(ctx, ox, oy, 7, 4, d.greenLt); p(ctx, ox, oy, 8, 3, d.greenLt);
      p(ctx, ox, oy, 9, 3, d.green);
      break;
    }
    case 3: {
      // Bird nest — woven twigs with eggs
      // Nest body — woven brown circle
      b(ctx, ox, oy, 4, 7, 6, 3, d.nestDk);
      p(ctx, ox, oy, 3, 7, d.brown); p(ctx, ox, oy, 10, 7, d.brown);
      p(ctx, ox, oy, 3, 8, d.nestDk); p(ctx, ox, oy, 10, 8, d.nestDk);
      // Rim
      p(ctx, ox, oy, 4, 6, d.nest); p(ctx, ox, oy, 5, 6, d.brownLt);
      p(ctx, ox, oy, 6, 6, d.nest); p(ctx, ox, oy, 7, 6, d.brownLt);
      p(ctx, ox, oy, 8, 6, d.nest); p(ctx, ox, oy, 9, 6, d.brownLt);
      // Twigs sticking out
      p(ctx, ox, oy, 2, 8, d.brown); p(ctx, ox, oy, 11, 7, d.brown);
      p(ctx, ox, oy, 5, 10, d.brownDk);
      // Eggs!
      p(ctx, ox, oy, 5, 7, d.eggBlue); p(ctx, ox, oy, 7, 7, d.eggWhite);
      p(ctx, ox, oy, 6, 8, d.eggBlue);
      // Egg highlight
      p(ctx, ox, oy, 5, 7, d.eggWhite);
      break;
    }
    case 4: {
      // Moss-covered rock — rounded stone with green moss
      // Rock body
      b(ctx, ox, oy, 4, 7, 6, 4, '#5a5a50');
      b(ctx, ox, oy, 5, 6, 4, 1, '#6a6a5a');
      p(ctx, ox, oy, 3, 8, '#4a4a42'); p(ctx, ox, oy, 10, 9, '#4a4a42');
      // Rock highlight
      p(ctx, ox, oy, 5, 6, '#7a7a6a'); p(ctx, ox, oy, 6, 6, '#7a7a6a');
      // Rock shadow
      b(ctx, ox, oy, 4, 10, 6, 1, '#3a3a32');
      // Moss patches on top
      p(ctx, ox, oy, 5, 6, d.green); p(ctx, ox, oy, 6, 5, d.greenDk);
      p(ctx, ox, oy, 7, 6, d.greenLt); p(ctx, ox, oy, 8, 7, d.moss);
      p(ctx, ox, oy, 4, 7, d.greenDk); p(ctx, ox, oy, 9, 8, d.green);
      // Lichen spot
      p(ctx, ox, oy, 7, 8, d.yellowLt);
      break;
    }
    case 5: {
      // Butterfly — detailed wings with patterns
      // Body
      p(ctx, ox, oy, 7, 5, d.dark); p(ctx, ox, oy, 7, 6, d.brownDk);
      p(ctx, ox, oy, 7, 7, d.brownDk); p(ctx, ox, oy, 7, 8, d.dark);
      // Antennae
      p(ctx, ox, oy, 6, 4, d.dark); p(ctx, ox, oy, 8, 4, d.dark);
      // Left upper wing
      p(ctx, ox, oy, 5, 5, d.blue); p(ctx, ox, oy, 4, 5, d.blueLt);
      p(ctx, ox, oy, 4, 6, d.blue); p(ctx, ox, oy, 3, 6, d.blueLt);
      p(ctx, ox, oy, 5, 6, d.pinkLt); // wing pattern
      // Right upper wing
      p(ctx, ox, oy, 9, 5, d.blue); p(ctx, ox, oy, 10, 5, d.blueLt);
      p(ctx, ox, oy, 10, 6, d.blue); p(ctx, ox, oy, 11, 6, d.blueLt);
      p(ctx, ox, oy, 9, 6, d.pinkLt); // wing pattern
      // Left lower wing
      p(ctx, ox, oy, 5, 7, d.purple); p(ctx, ox, oy, 4, 7, d.blue);
      p(ctx, ox, oy, 5, 8, d.blue);
      // Right lower wing
      p(ctx, ox, oy, 9, 7, d.purple); p(ctx, ox, oy, 10, 7, d.blue);
      p(ctx, ox, oy, 9, 8, d.blue);
      break;
    }
    case 6: {
      // Acorn / pinecone cluster
      // Pinecone (left)
      p(ctx, ox, oy, 3, 5, d.brownDk);
      p(ctx, ox, oy, 3, 6, d.brown); p(ctx, ox, oy, 4, 6, d.brownLt);
      p(ctx, ox, oy, 3, 7, d.brownDk); p(ctx, ox, oy, 4, 7, d.brown);
      p(ctx, ox, oy, 3, 8, d.brown);
      // Scale pattern
      p(ctx, ox, oy, 4, 6, d.brownLt); p(ctx, ox, oy, 3, 7, '#775533');
      // Acorn (right)
      p(ctx, ox, oy, 8, 5, d.brownDk); p(ctx, ox, oy, 9, 5, d.brownDk); // cap
      p(ctx, ox, oy, 10, 5, d.brownDk);
      p(ctx, ox, oy, 8, 6, '#aa7744'); p(ctx, ox, oy, 9, 6, '#bb8855'); // body
      p(ctx, ox, oy, 10, 6, '#aa7744');
      p(ctx, ox, oy, 9, 7, '#996633'); // bottom
      // Acorn cap texture
      p(ctx, ox, oy, 9, 5, '#664422');
      // Stem
      p(ctx, ox, oy, 9, 4, d.greenDk);
      // Small leaf
      p(ctx, ox, oy, 6, 8, d.greenDk); p(ctx, ox, oy, 7, 8, d.green);
      p(ctx, ox, oy, 6, 9, d.green);
      break;
    }
    case 7: {
      // Glowing firefly — with light aura
      // Body
      p(ctx, ox, oy, 7, 6, d.dark); p(ctx, ox, oy, 7, 7, d.brownDk);
      // Wings
      p(ctx, ox, oy, 6, 5, '#aabbaa'); p(ctx, ox, oy, 8, 5, '#aabbaa');
      p(ctx, ox, oy, 6, 6, '#99aa88'); p(ctx, ox, oy, 8, 6, '#99aa88');
      // Glowing abdomen
      p(ctx, ox, oy, 7, 8, d.glow); p(ctx, ox, oy, 7, 9, d.glowDim);
      // Light aura — soft glow around the firefly
      p(ctx, ox, oy, 6, 8, '#88cc6644');
      p(ctx, ox, oy, 8, 8, '#88cc6644');
      p(ctx, ox, oy, 7, 7, '#ccffaa44');
      // Glow particles
      p(ctx, ox, oy, 5, 9, d.glowDim); p(ctx, ox, oy, 9, 7, d.glowDim);
      p(ctx, ox, oy, 6, 10, d.glow); p(ctx, ox, oy, 10, 8, d.glowDim);
      // Trail dots
      p(ctx, ox, oy, 4, 10, '#88cc6633');
      p(ctx, ox, oy, 3, 11, '#88cc6622');
      break;
    }
  }
}

export default function NatureTerrainSprites() {
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
      drawGround(tCtx, ox, 0 * T, v);
      drawTree(tCtx, ox, 1 * T, v);
      for (let f = 0; f < 3; f++) drawSpring(tCtx, ox, (2 + f) * T, v, f);
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
    tpCtx.fillStyle = '#55aa44';
    tpCtx.font = '11px monospace';
    const rowLabels = ['Ground', 'Ancient Tree', 'Spring 0', 'Spring 1', 'Spring 2', 'NoBuild'];
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
    dpCtx.fillStyle = '#55aa44';
    dpCtx.font = '11px monospace';
    dpCtx.fillText('Grove', 4, 20 + T * dScale / 2 + 4);
    setReady(true);
  }, []);

  const download = (ref: React.RefObject<HTMLCanvasElement | null>, name: string) => {
    const a = document.createElement('a');
    a.download = name;
    a.href = ref.current!.toDataURL('image/png');
    a.click();
  };

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', color: '#55aa44', background: '#0a1408' }}>
      <h2 data-label="Nature Terrain">Nature Terrain Sprites — Ancient Grove</h2>
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setView('preview')} style={{ marginRight: 8, background: view === 'preview' ? '#55aa44' : '#1a2a12', color: view === 'preview' ? '#0a1408' : '#55aa44', border: '1px solid #55aa44', padding: '4px 12px', cursor: 'pointer' }}>Preview (3x)</button>
        <button onClick={() => setView('actual')} style={{ marginRight: 8, background: view === 'actual' ? '#55aa44' : '#1a2a12', color: view === 'actual' ? '#0a1408' : '#55aa44', border: '1px solid #55aa44', padding: '4px 12px', cursor: 'pointer' }}>Actual Size</button>
        {ready && (
          <>
            <button onClick={() => download(terrainRef, 'nature_terrain_tileset.png')} style={{ marginRight: 8, background: '#1a2a12', color: '#55aa44', border: '1px solid #55aa44', padding: '4px 12px', cursor: 'pointer' }}>Download Tileset</button>
            <button onClick={() => download(doodadRef, 'nature_terrain_doodads.png')} style={{ background: '#1a2a12', color: '#55aa44', border: '1px solid #55aa44', padding: '4px 12px', cursor: 'pointer' }}>Download Doodads</button>
          </>
        )}
      </div>
      <p style={{ fontSize: '12px', color: '#338822' }} data-frame-size="28x28">Frame size: 28x28 | PX=2 | Grid=14x14 | 16 cols (NESW bitmask) x 6 rows</p>
      <h3 data-label="Nature Terrain (Preview)">Terrain Tileset (16 auto-tile variants x 6 rows)</h3>
      <canvas ref={terrainPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #55aa4433' }} />
      <canvas ref={terrainRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #55aa4433' }} />
      <h3>Ancient Grove Doodads (8 types)</h3>
      <canvas ref={doodadPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #55aa4433' }} />
      <canvas ref={doodadRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #55aa4433' }} />
    </div>
  );
}
