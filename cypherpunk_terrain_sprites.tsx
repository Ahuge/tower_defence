/**
 * Cypherpunk Terrain Sprite Generator — Data Grid / Underground Hacker Lair terrain.
 *
 * Generates a spritesheet with 16 auto-tile variants per terrain type,
 * plus animation frames for data matrix displays (cascading matrix code).
 *
 * Layout:
 *   Columns: 16 (auto-tile bitmask variants, bits = NESW)
 *   Rows: one row per terrain type, animated types get extra rows
 *
 * Row order:
 *   0: circuit board floor (ground) — dark floor with circuit traces, LED dots, hex patterns
 *   1: server mainframe (blocked type 1) — rack servers with LEDs, fans, cables
 *   2: data matrix frame 0 (blocked type 2)
 *   3: data matrix frame 1 (blocked type 2, animated)
 *   4: data matrix frame 2 (blocked type 2, animated)
 *   5: data cable runs (NoBuild terrain — walkable, unbuildable)
 *
 * Also generates a doodads sheet:
 *   Row 0: hacker lair doodads (8 types)
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
const TERRAIN_ROWS = 6;
// Doodad types
const DOODAD_COLS = 8;
const DOODAD_ROWS = 1;

// Cypherpunk color palette — Tron/Matrix aesthetic
const PAL = {
  // Ground — circuit board floor
  ground: {
    base: '#080e12',
    baseLt: '#0a1115',
    accent: '#0c1418',
    accentDk: '#060a0e',
  },
  // Server mainframe (blocked type 1)
  server: {
    rackDark: '#0a1014',
    rackMid: '#101820',
    rackLight: '#182028',
    rail: '#1a2830',
    railHi: '#243038',
    screen: '#001a10',
    screenGlow: '#00ff88',
    screenDim: '#008844',
    ledRed: '#ff2244',
    ledRedDim: '#661122',
    ledGreen: '#00ff66',
    ledGreenDim: '#006622',
    ledAmber: '#ffaa22',
    ledAmberDim: '#664400',
    cable: '#0088ff',
    cableDim: '#003366',
    fan: '#182830',
    fanBlade: '#2a3a44',
    fanCenter: '#00aacc',
    ventDark: '#060c10',
    edge: '#1a2a34',
  },
  // Data matrix (blocked type 2, animated)
  matrix: {
    deep: '#020806',
    bgDim: '#041208',
    charBright: '#33ff66',
    charMid: '#22aa44',
    charDim: '#116622',
    charFaint: '#0a3312',
    glow: '#0a2210',
    edgeBright: '#22cc44',
    edgeDim: '#0a4418',
    frameDark: '#081410',
    frameHi: '#0c1c14',
  },
  // NoBuild — data cable runs
  cable: {
    base: '#080e12',
    fiberCore: '#00ddff',
    fiberMid: '#0088aa',
    fiberDim: '#004466',
    fiberGlow: '#002233',
    jacket: '#141e24',
    jacketDark: '#0c1418',
    tie: '#888888',
    tieDark: '#555555',
    junction: '#00ffcc',
    junctionDim: '#008866',
    plug: '#cccccc',
    plugDark: '#666666',
  },
  // Accent colors
  neon: {
    cyan: '#00ccff',
    green: '#00ff88',
    magenta: '#ff00cc',
    magentaDim: '#660066',
    amber: '#ffaa22',
    red: '#ff2244',
    white: '#ccddee',
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

// Seeded pseudo-random for deterministic variation per tile variant
function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return (s >> 16) / 32768;
  };
}

// ===================== TERRAIN DRAWERS =====================

/** Row 0: Circuit board floor (ground) — dark floor with barely-visible circuit texture */
function drawGround(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.ground;
  // Very dark tech-floor base
  b(ctx, ox, oy, 0, 0, G, G, c.base);
  // A few subtle texture pixels (faint cyan-teal tint)
  p(ctx, ox, oy, 4, 7, c.baseLt);
  p(ctx, ox, oy, 11, 3, c.accent);
  p(ctx, ox, oy, 2, 12, c.baseLt);
  // One darker spot
  p(ctx, ox, oy, 9, 10, c.accentDk);
}

/** Row 1: Server mainframe (blocked type 1) — rack servers with LEDs, fans, cables */
function drawProcessor(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.server;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  const rng = seededRand(idx * 251 + 77);

  // Rack body
  b(ctx, ox, oy, 0, 0, G, G, c.rackDark);

  // Rack mount rails on sides (if exposed)
  if (!w) {
    b(ctx, ox, oy, 0, 0, 1, G, c.rail);
    for (let gy = 1; gy < G; gy += 3) {
      p(ctx, ox, oy, 0, gy, c.railHi);
    }
  }
  if (!e) {
    b(ctx, ox, oy, G - 1, 0, 1, G, c.rail);
    for (let gy = 1; gy < G; gy += 3) {
      p(ctx, ox, oy, G - 1, gy, c.railHi);
    }
  }

  // Top/bottom rack edges
  if (!n) b(ctx, ox, oy, 0, 0, G, 1, c.edge);
  if (!s) b(ctx, ox, oy, 0, G - 1, G, 1, c.edge);

  // Server unit divisions — horizontal dividers
  for (let gy = 0; gy < G; gy += 4) {
    b(ctx, ox, oy, 1, gy, G - 2, 1, c.rackMid);
  }

  // Each "server unit" has detail
  const unitType = idx % 4;
  for (let unit = 0; unit < 3; unit++) {
    const uy = unit * 4 + 1;
    if (uy + 3 > G) break;
    const uType = (unitType + unit) % 4;

    // Server faceplate
    b(ctx, ox, oy, 1, uy, G - 2, 3, c.rackMid);

    if (uType === 0) {
      // Screen-type server — small green monitor
      b(ctx, ox, oy, 2, uy, 5, 3, c.screen);
      // Screen text lines
      b(ctx, ox, oy, 3, uy, 3, 1, c.screenDim);
      b(ctx, ox, oy, 3, uy + 1, 2, 1, c.screenDim);
      b(ctx, ox, oy, 3, uy + 2, 4, 1, c.screenDim);
      // Screen glow pixel
      p(ctx, ox, oy, 4, uy + 1, c.screenGlow);
      // LED row on right
      p(ctx, ox, oy, 8, uy, c.ledGreen);
      p(ctx, ox, oy, 9, uy, c.ledAmberDim);
      p(ctx, ox, oy, 10, uy, rng() > 0.5 ? c.ledGreen : c.ledGreenDim);
      p(ctx, ox, oy, 11, uy, c.ledRedDim);
      // Drive bays
      b(ctx, ox, oy, 8, uy + 1, 4, 2, c.rackDark);
      p(ctx, ox, oy, 8, uy + 1, c.rackLight);
      p(ctx, ox, oy, 10, uy + 1, c.rackLight);
    } else if (uType === 1) {
      // Cooling fan unit
      // Two fans
      for (const fx of [2, 7]) {
        b(ctx, ox, oy, fx, uy, 4, 3, c.fan);
        // Fan blades (X pattern)
        p(ctx, ox, oy, fx + 1, uy, c.fanBlade);
        p(ctx, ox, oy, fx + 2, uy, c.fanBlade);
        p(ctx, ox, oy, fx, uy + 1, c.fanBlade);
        p(ctx, ox, oy, fx + 3, uy + 1, c.fanBlade);
        p(ctx, ox, oy, fx + 1, uy + 2, c.fanBlade);
        p(ctx, ox, oy, fx + 2, uy + 2, c.fanBlade);
        // Fan center hub
        p(ctx, ox, oy, fx + 1, uy + 1, c.fanCenter);
        p(ctx, ox, oy, fx + 2, uy + 1, c.fanCenter);
      }
      // Status LED
      p(ctx, ox, oy, 12, uy, c.ledGreen);
    } else if (uType === 2) {
      // Dense LED row — blinking lights server
      for (let lx = 2; lx < G - 2; lx++) {
        const ledChoice = rng();
        if (ledChoice < 0.3) {
          p(ctx, ox, oy, lx, uy, c.ledGreen);
        } else if (ledChoice < 0.5) {
          p(ctx, ox, oy, lx, uy, c.ledAmber);
        } else if (ledChoice < 0.6) {
          p(ctx, ox, oy, lx, uy, c.ledRed);
        } else {
          p(ctx, ox, oy, lx, uy, c.ledGreenDim);
        }
      }
      // Cable bundle below LEDs
      b(ctx, ox, oy, 2, uy + 1, G - 4, 1, c.cableDim);
      p(ctx, ox, oy, 3, uy + 1, c.cable);
      p(ctx, ox, oy, 7, uy + 1, c.cable);
      p(ctx, ox, oy, 10, uy + 1, c.cable);
      // Vent slots
      for (let vx = 2; vx < G - 2; vx += 2) {
        p(ctx, ox, oy, vx, uy + 2, c.ventDark);
      }
    } else {
      // Arcade-style screen / fighting ring barrier
      b(ctx, ox, oy, 2, uy, G - 4, 3, c.rackDark);
      // Neon border
      b(ctx, ox, oy, 2, uy, G - 4, 1, '#1a0028');
      b(ctx, ox, oy, 2, uy + 2, G - 4, 1, '#1a0028');
      // Magenta accent stripes
      p(ctx, ox, oy, 3, uy, PAL.neon.magentaDim);
      p(ctx, ox, oy, 5, uy, PAL.neon.magentaDim);
      p(ctx, ox, oy, 8, uy, PAL.neon.magentaDim);
      p(ctx, ox, oy, 10, uy, PAL.neon.magentaDim);
      // Center screen content
      p(ctx, ox, oy, 5, uy + 1, PAL.neon.magenta);
      p(ctx, ox, oy, 6, uy + 1, PAL.neon.cyan);
      p(ctx, ox, oy, 7, uy + 1, PAL.neon.cyan);
      p(ctx, ox, oy, 8, uy + 1, PAL.neon.magenta);
      // Corner bolts
      p(ctx, ox, oy, 2, uy, c.rackLight);
      p(ctx, ox, oy, 11, uy, c.rackLight);
      p(ctx, ox, oy, 2, uy + 2, c.rackLight);
      p(ctx, ox, oy, 11, uy + 2, c.rackLight);
    }
  }

  // Cable bundle running down the side (if connected to neighbors)
  if (n && s) {
    const cx = w ? 1 : G - 2;
    for (let gy = 0; gy < G; gy++) {
      p(ctx, ox, oy, cx, gy, c.cableDim);
      if (gy % 3 === 0) p(ctx, ox, oy, cx, gy, c.cable);
    }
  }

  // Connector strip on connected edges
  if (n) {
    for (let gx = 3; gx < G - 2; gx += 3) {
      p(ctx, ox, oy, gx, 0, c.rackLight);
    }
  }
  if (s) {
    for (let gx = 3; gx < G - 2; gx += 3) {
      p(ctx, ox, oy, gx, G - 1, c.rackLight);
    }
  }
}

/** Rows 2-4: Data matrix (blocked type 2, animated — Matrix-style cascading green characters) */
function drawDataPit(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number, frame: number) {
  const c = PAL.matrix;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);
  const rng = seededRand(idx * 199 + frame * 1000 + 31);

  // Deep dark base
  b(ctx, ox, oy, 0, 0, G, G, c.deep);

  // Subtle background glow columns
  for (let gx = 0; gx < G; gx += 2) {
    for (let gy = 0; gy < G; gy++) {
      if (rng() > 0.7) {
        p(ctx, ox, oy, gx, gy, c.bgDim);
      }
    }
  }

  // Matrix character columns — each column cascades at different speeds
  const numColumns = 7;
  for (let col = 0; col < numColumns; col++) {
    const gx = col * 2;
    if (gx >= G) break;

    // Column scroll offset varies per column and frame
    const colSeed = idx * 13 + col * 47;
    const speed = (colSeed % 3) + 1; // 1-3 cells per frame
    const offset = (frame * speed + colSeed) % (G + 4);
    const headY = offset;

    // Draw cascade trail (brightest at head, fading behind)
    for (let trail = 0; trail < 8; trail++) {
      const gy = headY - trail;
      if (gy < 0 || gy >= G) continue;

      let charColor: string;
      if (trail === 0) {
        charColor = c.charBright; // Leading character — bright white-green
      } else if (trail === 1) {
        charColor = c.charBright;
      } else if (trail < 4) {
        charColor = c.charMid;
      } else if (trail < 6) {
        charColor = c.charDim;
      } else {
        charColor = c.charFaint;
      }

      // Draw a "character" — a 2x1 pixel block with variation
      p(ctx, ox, oy, gx, gy, charColor);
      // Some chars are wider (2px)
      if (rng() > 0.3 && gx + 1 < G) {
        p(ctx, ox, oy, gx + 1, gy, trail < 3 ? c.charMid : c.charFaint);
      }
    }

    // Random static characters scattered in the column (persistence effect)
    for (let gy = 0; gy < G; gy++) {
      if (rng() > 0.85) {
        p(ctx, ox, oy, gx, gy, c.charFaint);
      }
    }
  }

  // Holographic scan line effect — a bright horizontal sweep
  const scanY = (frame * 5 + 1) % G;
  for (let gx = 0; gx < G; gx++) {
    p(ctx, ox, oy, gx, scanY, c.glow);
  }
  // Bright pixels on the scan line
  p(ctx, ox, oy, 2, scanY, c.charMid);
  p(ctx, ox, oy, 6, scanY, c.charMid);
  p(ctx, ox, oy, 10, scanY, c.charMid);

  // Secondary faint scan
  const scan2Y = (frame * 3 + 8) % G;
  for (let gx = 1; gx < G - 1; gx += 2) {
    p(ctx, ox, oy, gx, scan2Y, c.glow);
  }

  // Frame/border on exposed edges — data display frame
  if (!n) {
    b(ctx, ox, oy, 0, 0, G, 1, c.frameDark);
    p(ctx, ox, oy, 2, 0, c.edgeDim);
    p(ctx, ox, oy, 5, 0, c.edgeBright);
    p(ctx, ox, oy, 8, 0, c.edgeDim);
    p(ctx, ox, oy, 11, 0, c.edgeBright);
  }
  if (!s) {
    b(ctx, ox, oy, 0, G - 1, G, 1, c.frameDark);
    p(ctx, ox, oy, 3, G - 1, c.edgeDim);
    p(ctx, ox, oy, 6, G - 1, c.edgeBright);
    p(ctx, ox, oy, 9, G - 1, c.edgeDim);
    p(ctx, ox, oy, 12, G - 1, c.edgeBright);
  }
  if (!w) {
    b(ctx, ox, oy, 0, 0, 1, G, c.frameDark);
    for (let gy = 2; gy < G; gy += 3) {
      p(ctx, ox, oy, 0, gy, c.edgeDim);
    }
  }
  if (!e) {
    b(ctx, ox, oy, G - 1, 0, 1, G, c.frameDark);
    for (let gy = 2; gy < G; gy += 3) {
      p(ctx, ox, oy, G - 1, gy, c.edgeDim);
    }
  }

  // Corner glow accents on exposed corners
  if (!n && !w) p(ctx, ox, oy, 0, 0, c.edgeBright);
  if (!n && !e) p(ctx, ox, oy, G - 1, 0, c.edgeBright);
  if (!s && !w) p(ctx, ox, oy, 0, G - 1, c.edgeBright);
  if (!s && !e) p(ctx, ox, oy, G - 1, G - 1, c.edgeBright);
}

/** Row 5: Data cable runs (NoBuild — walkable but unbuildable) */
function drawNoBuild(ctx: CanvasRenderingContext2D, ox: number, oy: number, idx: number) {
  const c = PAL.cable;
  const n = hasN(idx), e = hasE(idx), s = hasS(idx), w = hasW(idx);

  // Same dark ground as base
  b(ctx, ox, oy, 0, 0, G, G, c.base);

  // Subtle floor texture
  for (let gx = 0; gx < G; gx += 4) {
    for (let gy = 0; gy < G; gy++) {
      p(ctx, ox, oy, gx, gy, PAL.ground.accent);
    }
  }

  // Cable jacket (dark outer sheath) — main horizontal run
  b(ctx, ox, oy, 0, 5, G, 4, c.jacketDark);
  b(ctx, ox, oy, 0, 6, G, 2, c.jacket);

  // Cable jacket — main vertical run
  b(ctx, ox, oy, 5, 0, 4, G, c.jacketDark);
  b(ctx, ox, oy, 6, 0, 2, G, c.jacket);

  // Fiber optic cores — bright colored lines inside the cable
  // Horizontal fibers
  for (let gx = 0; gx < G; gx++) {
    p(ctx, ox, oy, gx, 6, c.fiberDim);
    p(ctx, ox, oy, gx, 7, c.fiberDim);
  }
  // Vertical fibers
  for (let gy = 0; gy < G; gy++) {
    p(ctx, ox, oy, 6, gy, c.fiberDim);
    p(ctx, ox, oy, 7, gy, c.fiberDim);
  }

  // Bright fiber core strands
  // Cyan fiber (horizontal)
  for (let gx = 0; gx < G; gx += 2) {
    p(ctx, ox, oy, gx, 6, c.fiberMid);
  }
  // Green fiber (horizontal)
  for (let gx = 1; gx < G; gx += 2) {
    p(ctx, ox, oy, gx, 7, c.fiberMid);
  }
  // Cyan fiber (vertical)
  for (let gy = 0; gy < G; gy += 2) {
    p(ctx, ox, oy, 6, gy, c.fiberMid);
  }
  for (let gy = 1; gy < G; gy += 2) {
    p(ctx, ox, oy, 7, gy, c.fiberMid);
  }

  // Junction box at center
  b(ctx, ox, oy, 5, 5, 4, 4, c.jacket);
  b(ctx, ox, oy, 6, 6, 2, 2, c.junction);
  // Junction highlight
  p(ctx, ox, oy, 6, 6, c.fiberCore);

  // Cable ties — periodic bands across the cable
  if (n || s) {
    p(ctx, ox, oy, 5, 3, c.tie);
    p(ctx, ox, oy, 8, 3, c.tie);
    p(ctx, ox, oy, 5, 10, c.tie);
    p(ctx, ox, oy, 8, 10, c.tie);
  }
  if (w || e) {
    p(ctx, ox, oy, 3, 5, c.tie);
    p(ctx, ox, oy, 3, 8, c.tie);
    p(ctx, ox, oy, 10, 5, c.tie);
    p(ctx, ox, oy, 10, 8, c.tie);
  }

  // Glow aura around fibers
  for (let gx = 0; gx < G; gx++) {
    p(ctx, ox, oy, gx, 5, c.fiberGlow);
    p(ctx, ox, oy, gx, 8, c.fiberGlow);
  }
  for (let gy = 0; gy < G; gy++) {
    p(ctx, ox, oy, 5, gy, c.fiberGlow);
    p(ctx, ox, oy, 8, gy, c.fiberGlow);
  }

  // Connector plugs on exposed ends
  if (!n) {
    b(ctx, ox, oy, 6, 0, 2, 1, c.plug);
    p(ctx, ox, oy, 5, 0, c.plugDark);
    p(ctx, ox, oy, 8, 0, c.plugDark);
  }
  if (!s) {
    b(ctx, ox, oy, 6, G - 1, 2, 1, c.plug);
    p(ctx, ox, oy, 5, G - 1, c.plugDark);
    p(ctx, ox, oy, 8, G - 1, c.plugDark);
  }
  if (!w) {
    b(ctx, ox, oy, 0, 6, 1, 2, c.plug);
    p(ctx, ox, oy, 0, 5, c.plugDark);
    p(ctx, ox, oy, 0, 8, c.plugDark);
  }
  if (!e) {
    b(ctx, ox, oy, G - 1, 6, 1, 2, c.plug);
    p(ctx, ox, oy, G - 1, 5, c.plugDark);
    p(ctx, ox, oy, G - 1, 8, c.plugDark);
  }

  // Branch glow on connected sides
  if (n) {
    p(ctx, ox, oy, 6, 1, c.fiberCore);
    p(ctx, ox, oy, 7, 2, c.fiberMid);
  }
  if (s) {
    p(ctx, ox, oy, 7, G - 2, c.fiberCore);
    p(ctx, ox, oy, 6, G - 3, c.fiberMid);
  }
  if (w) {
    p(ctx, ox, oy, 1, 7, c.fiberCore);
    p(ctx, ox, oy, 2, 6, c.fiberMid);
  }
  if (e) {
    p(ctx, ox, oy, G - 2, 6, c.fiberCore);
    p(ctx, ox, oy, G - 3, 7, c.fiberMid);
  }
}

// ===================== DOODAD DRAWERS =====================

function drawDoodad(ctx: CanvasRenderingContext2D, ox: number, oy: number, type: number) {
  ctx.clearRect(ox, oy, T, T);

  switch (type) {
    case 0: { // Keyboard
      // Keyboard base
      b(ctx, ox, oy, 2, 6, 10, 5, '#1a1a22');
      b(ctx, ox, oy, 2, 6, 10, 1, '#2a2a33'); // top edge
      // Key rows
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 8; col++) {
          const kx = 3 + col;
          const ky = 7 + row;
          p(ctx, ox, oy, kx, ky, '#333344');
        }
      }
      // Space bar
      b(ctx, ox, oy, 5, 10, 4, 1, '#333344');
      // Active key glow (WASD area)
      p(ctx, ox, oy, 4, 8, PAL.neon.cyan);
      p(ctx, ox, oy, 3, 9, '#006688');
      p(ctx, ox, oy, 5, 9, '#006688');
      // LED indicators
      p(ctx, ox, oy, 10, 7, PAL.neon.green);
      p(ctx, ox, oy, 11, 7, '#004422');
      // USB cable
      p(ctx, ox, oy, 7, 5, '#444444');
      p(ctx, ox, oy, 7, 4, '#444444');
      break;
    }

    case 1: { // Monitor screen with text
      // Monitor frame
      b(ctx, ox, oy, 2, 2, 10, 8, '#1a1a22');
      // Screen area
      b(ctx, ox, oy, 3, 3, 8, 6, '#001108');
      // Text lines on screen
      b(ctx, ox, oy, 4, 4, 5, 1, PAL.matrix.charDim);
      b(ctx, ox, oy, 4, 5, 3, 1, PAL.matrix.charMid);
      b(ctx, ox, oy, 4, 6, 6, 1, PAL.matrix.charDim);
      b(ctx, ox, oy, 4, 7, 2, 1, PAL.matrix.charBright); // cursor line
      p(ctx, ox, oy, 6, 7, PAL.neon.green); // blinking cursor
      // Screen glow
      p(ctx, ox, oy, 3, 3, '#003318');
      p(ctx, ox, oy, 10, 3, '#003318');
      // Monitor stand
      b(ctx, ox, oy, 6, 10, 2, 2, '#2a2a33');
      b(ctx, ox, oy, 5, 12, 4, 1, '#333344');
      // Power LED
      p(ctx, ox, oy, 10, 9, PAL.neon.green);
      break;
    }

    case 2: { // Cable spool
      // Spool body (circular)
      b(ctx, ox, oy, 4, 4, 6, 6, '#1a2228');
      b(ctx, ox, oy, 5, 3, 4, 1, '#1a2228');
      b(ctx, ox, oy, 5, 10, 4, 1, '#1a2228');
      b(ctx, ox, oy, 3, 5, 1, 4, '#1a2228');
      b(ctx, ox, oy, 10, 5, 1, 4, '#1a2228');
      // Center hub
      b(ctx, ox, oy, 6, 6, 2, 2, '#2a3844');
      p(ctx, ox, oy, 6, 6, PAL.neon.cyan);
      // Wound cable (colored rings)
      p(ctx, ox, oy, 5, 4, PAL.cable.fiberDim);
      p(ctx, ox, oy, 8, 4, PAL.cable.fiberDim);
      p(ctx, ox, oy, 4, 5, PAL.cable.fiberMid);
      p(ctx, ox, oy, 9, 5, PAL.cable.fiberMid);
      p(ctx, ox, oy, 4, 8, PAL.cable.fiberDim);
      p(ctx, ox, oy, 9, 8, PAL.cable.fiberDim);
      p(ctx, ox, oy, 5, 9, PAL.cable.fiberMid);
      p(ctx, ox, oy, 8, 9, PAL.cable.fiberMid);
      // Loose cable end
      p(ctx, ox, oy, 10, 9, PAL.cable.fiberCore);
      p(ctx, ox, oy, 11, 10, PAL.cable.fiberMid);
      p(ctx, ox, oy, 11, 11, PAL.cable.fiberDim);
      break;
    }

    case 3: { // Holographic projector
      // Base unit
      b(ctx, ox, oy, 4, 9, 6, 3, '#1a1a28');
      b(ctx, ox, oy, 5, 8, 4, 1, '#222238');
      // Lens
      b(ctx, ox, oy, 6, 9, 2, 1, PAL.neon.cyan);
      // Holographic projection beam (upward cone)
      p(ctx, ox, oy, 6, 7, '#004466');
      p(ctx, ox, oy, 7, 7, '#004466');
      p(ctx, ox, oy, 5, 6, '#003344');
      p(ctx, ox, oy, 8, 6, '#003344');
      p(ctx, ox, oy, 5, 5, '#002233');
      p(ctx, ox, oy, 6, 5, '#005588');
      p(ctx, ox, oy, 7, 5, '#005588');
      p(ctx, ox, oy, 8, 5, '#002233');
      // Holographic "image" — flickering shape
      p(ctx, ox, oy, 6, 3, PAL.neon.cyan);
      p(ctx, ox, oy, 7, 3, PAL.neon.cyan);
      p(ctx, ox, oy, 5, 4, '#0088aa');
      p(ctx, ox, oy, 8, 4, '#0088aa');
      p(ctx, ox, oy, 6, 2, '#0066aa');
      p(ctx, ox, oy, 7, 4, '#0066aa');
      // Power indicator
      p(ctx, ox, oy, 4, 11, PAL.neon.green);
      // Base detail
      p(ctx, ox, oy, 9, 10, '#333344');
      p(ctx, ox, oy, 5, 10, '#333344');
      break;
    }

    case 4: { // Circuit board fragment
      // PCB shape (irregular)
      b(ctx, ox, oy, 3, 4, 8, 7, '#0a2818');
      b(ctx, ox, oy, 4, 3, 6, 1, '#0a2818');
      // Broken edge (ragged)
      p(ctx, ox, oy, 3, 4, '#0e3320');
      p(ctx, ox, oy, 10, 10, '#0e3320');
      // Copper traces
      b(ctx, ox, oy, 4, 5, 5, 1, '#886622');
      b(ctx, ox, oy, 7, 5, 1, 4, '#886622');
      b(ctx, ox, oy, 5, 8, 3, 1, '#886622');
      // Via holes
      p(ctx, ox, oy, 5, 5, '#ccaa44');
      p(ctx, ox, oy, 7, 8, '#ccaa44');
      p(ctx, ox, oy, 9, 5, '#ccaa44');
      // SMD components
      b(ctx, ox, oy, 5, 6, 2, 1, '#1a1a1a');
      b(ctx, ox, oy, 8, 7, 2, 1, '#1a1a1a');
      // Chip on board
      b(ctx, ox, oy, 4, 9, 3, 2, '#111111');
      p(ctx, ox, oy, 5, 9, '#333333');
      // Solder points
      p(ctx, ox, oy, 4, 5, '#aaaaaa');
      p(ctx, ox, oy, 10, 7, '#aaaaaa');
      break;
    }

    case 5: { // Coffee mug (hacker lair essential!)
      // Mug body
      b(ctx, ox, oy, 4, 4, 5, 7, '#cccccc');
      b(ctx, ox, oy, 4, 4, 5, 1, '#eeeeee'); // rim highlight
      // Mug interior (dark coffee)
      b(ctx, ox, oy, 5, 5, 3, 2, '#221100');
      // Coffee surface
      b(ctx, ox, oy, 5, 5, 3, 1, '#442200');
      // Handle
      b(ctx, ox, oy, 9, 6, 1, 3, '#bbbbbb');
      p(ctx, ox, oy, 10, 6, '#aaaaaa');
      p(ctx, ox, oy, 10, 8, '#aaaaaa');
      p(ctx, ox, oy, 10, 7, '#999999');
      // Mug decoration — < / > symbols (coder mug)
      p(ctx, ox, oy, 5, 8, PAL.neon.cyan);
      p(ctx, ox, oy, 6, 9, PAL.neon.cyan);
      p(ctx, ox, oy, 7, 8, PAL.neon.cyan);
      // Steam wisps
      p(ctx, ox, oy, 5, 3, '#334444');
      p(ctx, ox, oy, 7, 2, '#334444');
      p(ctx, ox, oy, 6, 1, '#223333');
      // Shadow
      b(ctx, ox, oy, 4, 11, 6, 1, '#0a0a0a');
      break;
    }

    case 6: { // VR headset
      // Headband
      b(ctx, ox, oy, 2, 5, 10, 1, '#333344');
      // Main visor body
      b(ctx, ox, oy, 3, 6, 8, 4, '#1a1a28');
      b(ctx, ox, oy, 3, 6, 8, 1, '#222238'); // top edge
      // Visor lenses (two glowing circles)
      b(ctx, ox, oy, 4, 7, 2, 2, '#0a0a18');
      b(ctx, ox, oy, 8, 7, 2, 2, '#0a0a18');
      // Lens glow
      p(ctx, ox, oy, 4, 7, PAL.neon.cyan);
      p(ctx, ox, oy, 5, 8, '#004466');
      p(ctx, ox, oy, 8, 7, PAL.neon.cyan);
      p(ctx, ox, oy, 9, 8, '#004466');
      // Nose bridge
      p(ctx, ox, oy, 6, 8, '#222238');
      p(ctx, ox, oy, 7, 8, '#222238');
      // Side padding
      p(ctx, ox, oy, 2, 6, '#444444');
      p(ctx, ox, oy, 2, 7, '#444444');
      p(ctx, ox, oy, 11, 6, '#444444');
      p(ctx, ox, oy, 11, 7, '#444444');
      // Status LED
      p(ctx, ox, oy, 7, 6, PAL.neon.green);
      // Cable
      p(ctx, ox, oy, 3, 10, '#444444');
      p(ctx, ox, oy, 2, 11, '#444444');
      p(ctx, ox, oy, 1, 11, '#444444');
      break;
    }

    case 7: { // Cryptocurrency mining rig
      // Rig frame
      b(ctx, ox, oy, 1, 3, 12, 9, '#0c1014');
      b(ctx, ox, oy, 1, 3, 12, 1, '#1a2228'); // top rail
      b(ctx, ox, oy, 1, 11, 12, 1, '#1a2228'); // bottom rail
      // GPU cards (vertical rectangles)
      for (let i = 0; i < 5; i++) {
        const gx = 2 + i * 2;
        b(ctx, ox, oy, gx, 4, 1, 7, '#182028');
        // GPU heatsink lines
        p(ctx, ox, oy, gx, 5, '#2a3844');
        p(ctx, ox, oy, gx, 7, '#2a3844');
        p(ctx, ox, oy, gx, 9, '#2a3844');
        // Power LED on each card
        const ledColor = i % 2 === 0 ? PAL.neon.green : PAL.neon.amber;
        p(ctx, ox, oy, gx, 4, ledColor);
      }
      // Riser cables between cards
      for (let i = 0; i < 4; i++) {
        p(ctx, ox, oy, 3 + i * 2, 10, PAL.cable.fiberDim);
      }
      // Hash rate indicator (tiny screen)
      b(ctx, ox, oy, 10, 5, 2, 3, '#001108');
      p(ctx, ox, oy, 10, 5, PAL.matrix.charMid);
      p(ctx, ox, oy, 11, 6, PAL.matrix.charDim);
      // BTC symbol hint
      p(ctx, ox, oy, 10, 7, PAL.neon.amber);
      // Power cables
      p(ctx, ox, oy, 1, 8, '#666666');
      p(ctx, ox, oy, 0, 8, '#666666');
      p(ctx, ox, oy, 12, 8, '#666666');
      p(ctx, ox, oy, 13, 8, '#666666');
      // Fan exhaust
      p(ctx, ox, oy, 12, 5, '#334444');
      p(ctx, ox, oy, 12, 7, '#334444');
      break;
    }
  }
}

// ===================== MAIN COMPONENT =====================

export default function CypherpunkTerrainSprites() {
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
      // Row 0: circuit board floor (ground)
      drawGround(tCtx, ox, 0 * T, v);
      // Row 1: server mainframe (blocked type 1)
      drawProcessor(tCtx, ox, 1 * T, v);
      // Rows 2-4: data matrix (3 animation frames)
      for (let f = 0; f < 3; f++) {
        drawDataPit(tCtx, ox, (2 + f) * T, v, f);
      }
      // Row 5: data cable runs (NoBuild)
      drawNoBuild(tCtx, ox, 5 * T, v);
    }

    // Preview with labels (3x scale)
    const tp = terrainPreviewRef.current!;
    const scale = 3;
    tp.width = VARIANTS * T * scale + 140;
    tp.height = TERRAIN_ROWS * T * scale + 40;
    const tpCtx = tp.getContext('2d')!;
    tpCtx.imageSmoothingEnabled = false;
    tpCtx.fillStyle = '#050d0b';
    tpCtx.fillRect(0, 0, tp.width, tp.height);
    tpCtx.drawImage(tc, 140, 20, tc.width * scale, tc.height * scale);
    tpCtx.fillStyle = '#22ddaa';
    tpCtx.font = '11px monospace';
    const rowLabels = ['Ground', 'Mainframe', 'Matrix 0', 'Matrix 1', 'Matrix 2', 'Cables'];
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
      drawDoodad(dCtx, i * T, 0, i);
    }

    // Doodad preview (3x scale)
    const dp = doodadPreviewRef.current!;
    const dScale = 3;
    dp.width = DOODAD_COLS * T * dScale + 80;
    dp.height = DOODAD_ROWS * T * dScale + 40;
    const dpCtx = dp.getContext('2d')!;
    dpCtx.imageSmoothingEnabled = false;
    dpCtx.fillStyle = '#0a1a18';
    dpCtx.fillRect(0, 0, dp.width, dp.height);
    dpCtx.drawImage(dc, 80, 20, dc.width * dScale, dc.height * dScale);
    dpCtx.fillStyle = '#22ddaa';
    dpCtx.font = '11px monospace';
    dpCtx.fillText('Hacker', 4, 20 + T * dScale / 2 + 4);

    setReady(true);
  }, []);

  const download = (ref: React.RefObject<HTMLCanvasElement | null>, name: string) => {
    const a = document.createElement('a');
    a.download = name;
    a.href = ref.current!.toDataURL('image/png');
    a.click();
  };

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', color: '#22ddaa', background: '#050d0b' }}>
      <h2 data-label="Cypherpunk Terrain">Cypherpunk Terrain Sprites</h2>
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setView('preview')} style={{ marginRight: 8, background: view === 'preview' ? '#22ddaa' : '#1a2828', color: view === 'preview' ? '#050d0b' : '#22ddaa', border: '1px solid #22ddaa', padding: '4px 12px', cursor: 'pointer' }}>Preview (3x)</button>
        <button onClick={() => setView('actual')} style={{ marginRight: 8, background: view === 'actual' ? '#22ddaa' : '#1a2828', color: view === 'actual' ? '#050d0b' : '#22ddaa', border: '1px solid #22ddaa', padding: '4px 12px', cursor: 'pointer' }}>Actual Size</button>
        {ready && (
          <>
            <button onClick={() => download(terrainRef, 'cypherpunk_terrain_tileset.png')} style={{ marginRight: 8, background: '#1a2828', color: '#22ddaa', border: '1px solid #22ddaa', padding: '4px 12px', cursor: 'pointer' }}>Download Tileset</button>
            <button onClick={() => download(doodadRef, 'cypherpunk_terrain_doodads.png')} style={{ background: '#1a2828', color: '#22ddaa', border: '1px solid #22ddaa', padding: '4px 12px', cursor: 'pointer' }}>Download Doodads</button>
          </>
        )}
      </div>
      <p style={{ fontSize: '12px', color: '#116644' }} data-frame-size="28x28">Frame size: 28x28 | PX=2 | Grid=14x14 | 16 cols (NESW bitmask) x 6 rows</p>
      <h3 data-label="Cypherpunk Terrain (Preview)">Terrain Tileset (16 auto-tile variants x 6 rows)</h3>
      <canvas ref={terrainPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #22ddaa33' }} />
      <canvas ref={terrainRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #22ddaa33' }} />
      <h3>Hacker Lair Doodads (8 types)</h3>
      <canvas ref={doodadPreviewRef} style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #22ddaa33' }} />
      <canvas ref={doodadRef} style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #22ddaa33' }} />
    </div>
  );
}
