/**
 * Large Multi-Tile Structure Sprite Generator — Gauntlet Maps
 *
 * Generates 20 large structures across 11 factions:
 *   Military (5): HQ, Barracks, Motor Pool, Supply Depot, Comms Tower
 *   Psionic (3): Brain Vat, Thought Amplifier, Memory Bank
 *   Infernal (3): Throne, Spire, Altar
 *   Arcane (1): Wizard Tower
 *   Mechanical (2): Furnace, Press
 *   Nature (1): Ancient Tree
 *   Cypherpunk (1): Mainframe
 *   Celestial (2): Sanctum, Gate Pillar
 *   Aliens (1): Queen Chamber
 *   Harmonic (2): Grand Piano, Drum Kit
 *   Void (1): Slot Machine
 *
 * Each structure is rendered on its own canvas at exact pixel dimensions.
 * PX=2 pixels per grid unit, each tile = 28x28px (14x14 grid units).
 */
import React, { useRef, useEffect, useState } from 'react';

const T = 28;
const G = 14;
const PX = 2;

// --- Helpers ---

function p(ctx: CanvasRenderingContext2D, ox: number, oy: number, gx: number, gy: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(ox + gx * PX, oy + gy * PX, PX, PX);
}

function b(ctx: CanvasRenderingContext2D, ox: number, oy: number, gx: number, gy: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(ox + gx * PX, oy + gy * PX, w * PX, h * PX);
}

// --- Structure definitions ---

interface StructureDef {
  key: string;
  label: string;
  faction: string;
  widthCells: number;
  heightCells: number;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

// Grid dimensions for each structure (in grid units, not pixels)
function gw(cells: number) { return cells * G; }
function gh(cells: number) { return cells * G; }

// ===================== MILITARY =====================

function drawMilitaryHQ(ctx: CanvasRenderingContext2D) {
  const W = gw(5), H = gh(4);
  // Sandbag perimeter at base (bottom 4 rows)
  b(ctx, 0, 0, 0, H - 4, W, 4, '#8a8060');
  b(ctx, 0, 0, 1, H - 3, W - 2, 2, '#9a9070');
  // Sandbag detail bumps
  for (let x = 2; x < W - 2; x += 4) {
    p(ctx, 0, 0, x, H - 4, '#7a7050');
    p(ctx, 0, 0, x + 1, H - 3, '#aaa080');
  }

  // Main building body
  const bx = 4, by = 8, bw = W - 8, bh = H - 14;
  b(ctx, 0, 0, bx, by, bw, bh, '#707068'); // concrete walls
  b(ctx, 0, 0, bx + 1, by + 1, bw - 2, bh - 2, '#808078'); // lighter inner wall
  // Outline
  b(ctx, 0, 0, bx, by, bw, 1, '#505048');
  b(ctx, 0, 0, bx, by + bh - 1, bw, 1, '#505048');
  b(ctx, 0, 0, bx, by, 1, bh, '#505048');
  b(ctx, 0, 0, bx + bw - 1, by, 1, bh, '#505048');

  // Roof (top section)
  const rx = 3, ry = 2, rw = W - 6, rh = 6;
  b(ctx, 0, 0, rx, ry, rw, rh, '#606058');
  b(ctx, 0, 0, rx + 1, ry + 1, rw - 2, rh - 2, '#686860');
  // Roof outline
  b(ctx, 0, 0, rx, ry, rw, 1, '#484840');
  b(ctx, 0, 0, rx, ry + rh - 1, rw, 1, '#484840');

  // Satellite dish on roof
  b(ctx, 0, 0, rx + 3, ry + 1, 4, 1, '#aaaaaa');
  b(ctx, 0, 0, rx + 4, ry + 2, 2, 1, '#999999');
  p(ctx, 0, 0, rx + 5, ry + 1, '#cccccc'); // dish highlight
  // Dish arm
  p(ctx, 0, 0, rx + 5, ry + 3, '#777777');
  p(ctx, 0, 0, rx + 6, ry + 3, '#777777');

  // AC unit on roof
  b(ctx, 0, 0, rx + rw - 6, ry + 1, 3, 2, '#555555');
  b(ctx, 0, 0, rx + rw - 6, ry + 1, 3, 1, '#666666');
  p(ctx, 0, 0, rx + rw - 5, ry + 2, '#444444'); // vent

  // Flag pole on roof (right side)
  const fpx = rx + rw - 2;
  b(ctx, 0, 0, fpx, 0, 1, ry + 2, '#aaaaaa'); // pole
  // Flag
  b(ctx, 0, 0, fpx + 1, 0, 3, 2, '#556633');
  p(ctx, 0, 0, fpx + 2, 0, '#667744');

  // Windows - Floor 1 (upper floor)
  for (let wx = bx + 3; wx < bx + bw - 4; wx += 6) {
    b(ctx, 0, 0, wx, by + 2, 3, 2, '#1a1a22'); // dark window
    b(ctx, 0, 0, wx, by + 2, 3, 1, '#2a2a33'); // top frame
    p(ctx, 0, 0, wx + 1, by + 2, '#334455'); // reflection
  }
  // Windows - Floor 2 (lower floor, some broken)
  for (let wx = bx + 3; wx < bx + bw - 4; wx += 6) {
    b(ctx, 0, 0, wx, by + bh - 5, 3, 2, '#1a1a22');
    b(ctx, 0, 0, wx, by + bh - 5, 3, 1, '#2a2a33');
    if (wx % 12 === 0) {
      // Broken window - jagged highlight
      p(ctx, 0, 0, wx, by + bh - 4, '#556677');
      p(ctx, 0, 0, wx + 2, by + bh - 5, '#445566');
    }
  }

  // Main entrance (double doors) centered at bottom of building
  const dx = Math.floor(W / 2) - 3;
  const dy = by + bh - 1;
  b(ctx, 0, 0, dx, dy, 6, 3, '#3a3830'); // door recess
  b(ctx, 0, 0, dx + 1, dy, 2, 3, '#4a4838'); // left door
  b(ctx, 0, 0, dx + 3, dy, 2, 3, '#4a4838'); // right door
  p(ctx, 0, 0, dx + 2, dy + 1, '#222218'); // door gap
  // Door handles
  p(ctx, 0, 0, dx + 2, dy + 2, '#aaaaaa');
  p(ctx, 0, 0, dx + 3, dy + 2, '#aaaaaa');
  // Overhang above doors
  b(ctx, 0, 0, dx - 1, dy - 1, 8, 1, '#585850');

  // Floor separator line
  b(ctx, 0, 0, bx + 1, by + Math.floor(bh / 2), bw - 2, 1, '#606058');

  // Ground level detail (between sandbags and building)
  for (let x = 1; x < W - 1; x += 3) {
    p(ctx, 0, 0, x, H - 5, '#555550');
  }
}

function drawMilitaryBarracks(ctx: CanvasRenderingContext2D) {
  const W = gw(5), H = gh(3);

  // Main building - long low structure
  const bx = 2, by = 4, bw = W - 4, bh = H - 8;
  b(ctx, 0, 0, bx, by, bw, bh, '#6a6a62'); // walls
  // Outline
  b(ctx, 0, 0, bx, by, bw, 1, '#4a4a42');
  b(ctx, 0, 0, bx, by + bh - 1, bw, 1, '#4a4a42');
  b(ctx, 0, 0, bx, by, 1, bh, '#4a4a42');
  b(ctx, 0, 0, bx + bw - 1, by, 1, bh, '#4a4a42');
  // Inner wall tone
  b(ctx, 0, 0, bx + 1, by + 1, bw - 2, bh - 2, '#757568');

  // Flat roof (slightly wider than walls)
  b(ctx, 0, 0, bx - 1, by - 2, bw + 2, 3, '#585850');
  b(ctx, 0, 0, bx, by - 1, bw, 1, '#626258');

  // Ventilation ducts on roof
  for (let vx = bx + 4; vx < bx + bw - 4; vx += 10) {
    b(ctx, 0, 0, vx, by - 3, 4, 2, '#666660');
    b(ctx, 0, 0, vx, by - 3, 4, 1, '#777770');
    // Vent slits
    p(ctx, 0, 0, vx + 1, by - 2, '#444440');
    p(ctx, 0, 0, vx + 2, by - 2, '#444440');
  }

  // Row of small windows
  for (let wx = bx + 3; wx < bx + bw - 3; wx += 4) {
    b(ctx, 0, 0, wx, by + 3, 2, 2, '#1a1a22');
    p(ctx, 0, 0, wx, by + 3, '#2a2a33'); // frame highlight
  }

  // Single door entrance (left side)
  const dx = bx + 2;
  b(ctx, 0, 0, dx, by + bh - 4, 3, 4, '#3a3830');
  b(ctx, 0, 0, dx + 1, by + bh - 3, 1, 3, '#4a4838');
  p(ctx, 0, 0, dx + 2, by + bh - 2, '#aaaaaa'); // handle

  // Ground/path at base
  b(ctx, 0, 0, 0, H - 3, W, 3, '#3a3830');
  for (let x = 1; x < W; x += 5) {
    p(ctx, 0, 0, x, H - 2, '#444438');
  }
}

function drawMilitaryMotorPool(ctx: CanvasRenderingContext2D) {
  const W = gw(5), H = gh(4);

  // Main garage structure
  const bx = 2, by = 3, bw = W - 4, bh = H - 6;
  b(ctx, 0, 0, bx, by, bw, bh, '#5a5a52'); // corrugated metal walls
  // Outline
  b(ctx, 0, 0, bx, by, bw, 1, '#3a3a32');
  b(ctx, 0, 0, bx, by + bh - 1, bw, 1, '#3a3a32');
  b(ctx, 0, 0, bx, by, 1, bh, '#3a3a32');
  b(ctx, 0, 0, bx + bw - 1, by, 1, bh, '#3a3a32');

  // Corrugated wall texture (horizontal lines)
  for (let y = by + 2; y < by + bh - 1; y += 2) {
    b(ctx, 0, 0, bx + 1, y, bw - 2, 1, '#525248');
  }

  // Roof
  b(ctx, 0, 0, bx - 1, by - 1, bw + 2, 2, '#484840');
  b(ctx, 0, 0, bx, by, bw, 1, '#505048');

  // Three bay doors (large openings at bottom)
  const bayW = 12, bayH = bh - 6;
  const baySpacing = Math.floor((bw - 3 * bayW) / 4);
  for (let i = 0; i < 3; i++) {
    const bxOff = bx + baySpacing + i * (bayW + baySpacing);
    const byOff = by + bh - bayH - 1;
    // Door opening
    b(ctx, 0, 0, bxOff, byOff, bayW, bayH, '#1a1a18');
    // Door frame
    b(ctx, 0, 0, bxOff, byOff, bayW, 1, '#666660');
    b(ctx, 0, 0, bxOff, byOff, 1, bayH, '#555550');
    b(ctx, 0, 0, bxOff + bayW - 1, byOff, 1, bayH, '#555550');
    // Rolled-up door at top
    b(ctx, 0, 0, bxOff + 1, byOff + 1, bayW - 2, 2, '#777770');
    b(ctx, 0, 0, bxOff + 1, byOff + 1, bayW - 2, 1, '#888880');

    // Tool rack visible inside (left wall of bay)
    if (i === 0) {
      b(ctx, 0, 0, bxOff + 2, byOff + 4, 1, 6, '#666660');
      p(ctx, 0, 0, bxOff + 2, byOff + 5, '#884422'); // tool
      p(ctx, 0, 0, bxOff + 2, byOff + 7, '#884422');
      p(ctx, 0, 0, bxOff + 2, byOff + 9, '#aaaaaa');
    }
    // Vehicle silhouette inside
    if (i === 1) {
      b(ctx, 0, 0, bxOff + 3, byOff + bayH - 5, 6, 3, '#333330');
      b(ctx, 0, 0, bxOff + 4, byOff + bayH - 7, 4, 2, '#2a2a28');
    }
  }

  // Oil stains on floor
  const floorY = by + bh;
  b(ctx, 0, 0, 0, floorY, W, H - floorY, '#3a3830');
  // Oil spots
  b(ctx, 0, 0, 15, floorY + 1, 3, 2, '#222218');
  p(ctx, 0, 0, 35, floorY + 1, '#222218');
  b(ctx, 0, 0, 50, floorY + 1, 2, 1, '#1a1a14');
}

function drawMilitarySupplyDepot(ctx: CanvasRenderingContext2D) {
  const W = gw(5), H = gh(3);

  // Main warehouse
  const bx = 1, by = 3, bw = W - 2, bh = H - 6;
  b(ctx, 0, 0, bx, by, bw, bh, '#5a5852'); // corrugated metal
  // Outline
  b(ctx, 0, 0, bx, by, bw, 1, '#3a3832');
  b(ctx, 0, 0, bx, by + bh - 1, bw, 1, '#3a3832');
  b(ctx, 0, 0, bx, by, 1, bh, '#3a3832');
  b(ctx, 0, 0, bx + bw - 1, by, 1, bh, '#3a3832');

  // Corrugated walls - vertical ribbing
  for (let x = bx + 2; x < bx + bw - 1; x += 3) {
    b(ctx, 0, 0, x, by + 1, 1, bh - 2, '#4a4842');
  }

  // Peaked roof
  b(ctx, 0, 0, bx - 1, by - 1, bw + 2, 2, '#484840');
  b(ctx, 0, 0, bx + 2, by - 2, bw - 4, 1, '#505048');
  b(ctx, 0, 0, bx + 5, by - 3, bw - 10, 1, '#555550');

  // Loading dock (right side, open bay)
  const ldx = bx + bw - 16, ldy = by + bh - 14;
  b(ctx, 0, 0, ldx, ldy, 14, 14, '#1a1a18'); // opening
  b(ctx, 0, 0, ldx, ldy, 14, 1, '#666660'); // top frame
  b(ctx, 0, 0, ldx, ldy, 1, 14, '#555550');
  b(ctx, 0, 0, ldx + 13, ldy, 1, 14, '#555550');

  // Crates visible inside
  b(ctx, 0, 0, ldx + 2, ldy + 5, 4, 4, '#556633'); // green crate
  b(ctx, 0, 0, ldx + 2, ldy + 5, 4, 1, '#667744');
  b(ctx, 0, 0, ldx + 7, ldy + 3, 3, 6, '#886644'); // brown crate
  b(ctx, 0, 0, ldx + 7, ldy + 3, 3, 1, '#997755');
  // Stacked crates behind
  b(ctx, 0, 0, ldx + 3, ldy + 2, 3, 3, '#445522');
  b(ctx, 0, 0, ldx + 3, ldy + 2, 3, 1, '#556633');

  // Ground
  b(ctx, 0, 0, 0, by + bh, W, H - by - bh, '#3a3830');
  // Dock platform
  b(ctx, 0, 0, ldx - 1, by + bh, 16, 2, '#505048');
}

function drawMilitaryCommsTower(ctx: CanvasRenderingContext2D) {
  const W = gw(2), H = gh(5);

  // Equipment shed at base
  const sx = 3, sy = H - 12, sw = W - 6, sh = 10;
  b(ctx, 0, 0, sx, sy, sw, sh, '#5a5a52');
  b(ctx, 0, 0, sx, sy, sw, 1, '#3a3a32');
  b(ctx, 0, 0, sx, sy + sh - 1, sw, 1, '#3a3a32');
  b(ctx, 0, 0, sx, sy, 1, sh, '#3a3a32');
  b(ctx, 0, 0, sx + sw - 1, sy, 1, sh, '#3a3a32');
  // Shed door
  b(ctx, 0, 0, sx + 4, sy + sh - 5, 4, 5, '#4a4838');
  p(ctx, 0, 0, sx + 7, sy + sh - 3, '#aaaaaa');
  // Shed roof
  b(ctx, 0, 0, sx - 1, sy - 1, sw + 2, 2, '#484840');

  // Lattice tower structure
  const tw = 8; // tower width at base
  const tcx = Math.floor(W / 2); // tower center x
  // Tower tapers from base to top
  for (let y = sy - 1; y > 6; y -= 2) {
    const progress = (sy - 1 - y) / (sy - 7);
    const halfW = Math.max(1, Math.floor((tw / 2) * (1 - progress * 0.6)));
    // Left leg
    p(ctx, 0, 0, tcx - halfW, y, '#888888');
    // Right leg
    p(ctx, 0, 0, tcx + halfW - 1, y, '#888888');
    // Cross braces every 4 rows
    if (y % 4 === 0) {
      for (let x = tcx - halfW + 1; x < tcx + halfW - 1; x++) {
        p(ctx, 0, 0, x, y, '#777777');
      }
    }
    // Diagonal lattice
    if (y % 2 === 0 && halfW > 2) {
      p(ctx, 0, 0, tcx - halfW + 1, y, '#666666');
      p(ctx, 0, 0, tcx + halfW - 2, y, '#666666');
    }
  }

  // Antenna array at top
  const ax = tcx - 1;
  // Main antenna mast
  b(ctx, 0, 0, tcx, 0, 1, 7, '#aaaaaa');
  // Cross bars
  b(ctx, 0, 0, ax - 2, 2, 6, 1, '#999999');
  b(ctx, 0, 0, ax - 1, 4, 4, 1, '#999999');
  // Dish elements
  p(ctx, 0, 0, ax - 2, 1, '#bbbbbb');
  p(ctx, 0, 0, ax + 3, 1, '#bbbbbb');
  p(ctx, 0, 0, ax - 1, 3, '#bbbbbb');
  p(ctx, 0, 0, ax + 2, 3, '#bbbbbb');

  // Red warning light at peak
  p(ctx, 0, 0, tcx, 0, '#ff2222');

  // Cable runs down sides
  for (let y = 6; y < sy; y += 3) {
    p(ctx, 0, 0, tcx + 2, y, '#444444');
  }

  // Ground
  b(ctx, 0, 0, 0, H - 2, W, 2, '#3a3830');
}

// ===================== PSIONIC =====================

function drawPsionicBrainVat(ctx: CanvasRenderingContext2D) {
  const W = gw(3), H = gh(5);
  const cx = Math.floor(W / 2); // center x

  // Control panel at base
  b(ctx, 0, 0, cx - 10, H - 8, 20, 6, '#2a2030');
  b(ctx, 0, 0, cx - 9, H - 7, 18, 4, '#3a3040');
  // LED indicators
  p(ctx, 0, 0, cx - 7, H - 6, '#00ff66');
  p(ctx, 0, 0, cx - 5, H - 6, '#00ff66');
  p(ctx, 0, 0, cx - 3, H - 6, '#ff4444');
  p(ctx, 0, 0, cx + 2, H - 6, '#00ff66');
  p(ctx, 0, 0, cx + 4, H - 6, '#ffaa00');
  // Screen on panel
  b(ctx, 0, 0, cx - 2, H - 7, 6, 2, '#113322');
  b(ctx, 0, 0, cx - 1, H - 7, 4, 1, '#22aa55');

  // Metal base platform
  b(ctx, 0, 0, cx - 12, H - 10, 24, 3, '#444450');
  b(ctx, 0, 0, cx - 11, H - 10, 22, 1, '#555560');
  // Base rim detail
  b(ctx, 0, 0, cx - 13, H - 9, 26, 1, '#333340');

  // Glass cylinder tank
  const tankTop = 6, tankBot = H - 11;
  const tankW = 16;
  const tankLeft = cx - Math.floor(tankW / 2);

  // Glass walls with cyan tint
  for (let y = tankTop; y <= tankBot; y++) {
    // Left glass edge
    p(ctx, 0, 0, tankLeft, y, '#446688');
    p(ctx, 0, 0, tankLeft + 1, y, '#335566');
    // Right glass edge
    p(ctx, 0, 0, tankLeft + tankW - 1, y, '#446688');
    p(ctx, 0, 0, tankLeft + tankW - 2, y, '#335566');
    // Inner fill (transparent-ish fluid)
    b(ctx, 0, 0, tankLeft + 2, y, tankW - 4, 1, '#1a2830');
  }

  // Fluid level line (greenish)
  b(ctx, 0, 0, tankLeft + 2, tankTop + 4, tankW - 4, 1, '#226644');

  // Shine highlights on glass
  for (let y = tankTop + 2; y < tankBot - 2; y += 5) {
    p(ctx, 0, 0, tankLeft + 2, y, '#5588aa');
    p(ctx, 0, 0, tankLeft + 2, y + 1, '#4477aa');
  }

  // Brain mass (pink/purple, centered)
  const brainCy = Math.floor((tankTop + tankBot) / 2);
  const brainLeft = cx - 5;
  // Main brain body
  b(ctx, 0, 0, brainLeft, brainCy - 3, 10, 7, '#884477');
  b(ctx, 0, 0, brainLeft + 1, brainCy - 4, 8, 1, '#773366');
  b(ctx, 0, 0, brainLeft + 1, brainCy + 4, 8, 1, '#773366');
  // Brain folds
  b(ctx, 0, 0, brainLeft + 2, brainCy - 2, 6, 1, '#995588');
  b(ctx, 0, 0, brainLeft + 1, brainCy, 8, 1, '#995588');
  b(ctx, 0, 0, brainLeft + 2, brainCy + 2, 6, 1, '#995588');
  // Lighter lobes
  b(ctx, 0, 0, brainLeft + 2, brainCy - 3, 3, 2, '#aa6699');
  b(ctx, 0, 0, brainLeft + 5, brainCy - 3, 3, 2, '#996688');
  // Stem
  b(ctx, 0, 0, cx - 1, brainCy + 4, 2, 4, '#664455');

  // Electrodes / wires from top cap to brain
  const topCapY = tankTop - 3;
  p(ctx, 0, 0, cx - 3, topCapY + 3, '#aaaacc');
  p(ctx, 0, 0, cx - 3, topCapY + 5, '#aaaacc');
  p(ctx, 0, 0, cx - 3, topCapY + 7, '#aaaacc');
  p(ctx, 0, 0, cx + 2, topCapY + 3, '#aaaacc');
  p(ctx, 0, 0, cx + 2, topCapY + 5, '#aaaacc');
  p(ctx, 0, 0, cx + 2, topCapY + 7, '#aaaacc');
  // Electrode tips touching brain
  p(ctx, 0, 0, cx - 3, brainCy - 3, '#ccccff');
  p(ctx, 0, 0, cx + 2, brainCy - 3, '#ccccff');

  // Bubbles in fluid
  p(ctx, 0, 0, cx - 4, brainCy - 8, '#4488aa');
  p(ctx, 0, 0, cx + 3, brainCy - 6, '#4488aa');
  p(ctx, 0, 0, cx - 2, brainCy + 7, '#3377aa');
  p(ctx, 0, 0, cx + 1, brainCy + 9, '#3377aa');
  p(ctx, 0, 0, cx + 4, brainCy + 5, '#4488aa');

  // Metal top cap
  b(ctx, 0, 0, cx - 9, topCapY, 18, 3, '#555560');
  b(ctx, 0, 0, cx - 8, topCapY, 16, 1, '#666670');
  b(ctx, 0, 0, cx - 10, topCapY + 2, 20, 1, '#444450');
  // Top cap bolts
  p(ctx, 0, 0, cx - 7, topCapY + 1, '#777780');
  p(ctx, 0, 0, cx + 6, topCapY + 1, '#777780');

  // Connector ports on top
  p(ctx, 0, 0, cx - 2, topCapY - 1, '#8866aa');
  p(ctx, 0, 0, cx + 1, topCapY - 1, '#8866aa');
  // Wires going up from top
  b(ctx, 0, 0, cx - 2, 0, 1, topCapY - 1, '#554466');
  b(ctx, 0, 0, cx + 1, 0, 1, topCapY - 1, '#554466');

  // Ground
  b(ctx, 0, 0, 0, H - 2, W, 2, '#1a1520');
}

function drawPsionicThoughtAmp(ctx: CanvasRenderingContext2D) {
  const W = gw(2), H = gh(3);
  const cx = Math.floor(W / 2);

  // Neural conduit cables at base
  b(ctx, 0, 0, 2, H - 4, 4, 4, '#332244');
  b(ctx, 0, 0, W - 6, H - 4, 4, 4, '#332244');
  // Cable runs to center
  for (let x = 6; x < W - 6; x++) {
    p(ctx, 0, 0, x, H - 3, '#443355');
  }

  // Base pedestal
  b(ctx, 0, 0, cx - 6, H - 6, 12, 3, '#3a3045');
  b(ctx, 0, 0, cx - 5, H - 6, 10, 1, '#4a4055');

  // Main column body
  const colW = 6, colLeft = cx - 3;
  b(ctx, 0, 0, colLeft, 8, colW, H - 14, '#443355');
  // Metal housing frame
  b(ctx, 0, 0, colLeft - 1, 8, 1, H - 14, '#555560');
  b(ctx, 0, 0, colLeft + colW, 8, 1, H - 14, '#555560');

  // Bright magenta core visible through housing
  b(ctx, 0, 0, colLeft + 1, 12, colW - 2, H - 22, '#cc44aa');
  b(ctx, 0, 0, colLeft + 2, 14, colW - 4, H - 26, '#ee66cc');
  // Core glow highlight
  p(ctx, 0, 0, cx, Math.floor(H / 2), '#ff88ee');
  p(ctx, 0, 0, cx - 1, Math.floor(H / 2) - 2, '#ffaaee');

  // Pulsing energy rings
  const ringYs = [12, 20, 28, 36];
  for (const ry of ringYs) {
    if (ry < H - 8) {
      b(ctx, 0, 0, colLeft - 3, ry, colW + 6, 1, '#aa44cc');
      p(ctx, 0, 0, colLeft - 4, ry, '#8833aa');
      p(ctx, 0, 0, colLeft + colW + 3, ry, '#8833aa');
      // Glow above/below ring
      p(ctx, 0, 0, colLeft - 2, ry - 1, '#662288');
      p(ctx, 0, 0, colLeft + colW + 1, ry - 1, '#662288');
    }
  }

  // Crystal cap on top
  b(ctx, 0, 0, cx - 4, 4, 8, 5, '#6644aa');
  b(ctx, 0, 0, cx - 3, 3, 6, 2, '#7755bb');
  b(ctx, 0, 0, cx - 2, 2, 4, 2, '#8866cc');
  b(ctx, 0, 0, cx - 1, 1, 2, 2, '#9977dd');
  // Tip
  p(ctx, 0, 0, cx, 0, '#bbaaee');
}

function drawPsionicMemoryBank(ctx: CanvasRenderingContext2D) {
  const W = gw(3), H = gh(3);

  // Metal shelving frame
  b(ctx, 0, 0, 2, 2, W - 4, H - 4, '#333340');
  // Frame edges
  b(ctx, 0, 0, 2, 2, W - 4, 1, '#444450');
  b(ctx, 0, 0, 2, H - 3, W - 4, 1, '#444450');
  b(ctx, 0, 0, 2, 2, 1, H - 4, '#444450');
  b(ctx, 0, 0, W - 3, 2, 1, H - 4, '#444450');

  // Shelf dividers (horizontal)
  const shelfYs = [8, 18, 28];
  for (const sy of shelfYs) {
    b(ctx, 0, 0, 3, sy, W - 6, 1, '#555560');
  }

  // Vertical dividers
  b(ctx, 0, 0, Math.floor(W / 3), 3, 1, H - 6, '#444450');
  b(ctx, 0, 0, Math.floor(2 * W / 3), 3, 1, H - 6, '#444450');

  // Memory crystals on shelves (different colors per row)
  const crystalColors = [
    ['#6644cc', '#7755dd', '#5533bb'], // purple
    ['#44aacc', '#55bbdd', '#3399bb'], // cyan
    ['#cc44aa', '#dd55bb', '#bb3399'], // pink
    ['#44cc66', '#55dd77', '#33bb55'], // green
  ];

  for (let row = 0; row < 4; row++) {
    const ry = 3 + row * 8;
    const colors = crystalColors[row % crystalColors.length];
    for (let col = 0; col < 6; col++) {
      const crx = 5 + col * 6;
      if (crx + 2 < W - 3) {
        const c = colors[col % colors.length];
        b(ctx, 0, 0, crx, ry + 1, 2, 5, c);
        p(ctx, 0, 0, crx, ry + 1, colors[1]); // highlight top
        // Pulsing connections between crystals
        if (col < 5 && crx + 6 < W - 3) {
          p(ctx, 0, 0, crx + 3, ry + 3, '#8866aa');
        }
      }
    }
  }

  // Terminal screen at front (bottom center)
  const tx = Math.floor(W / 2) - 5;
  b(ctx, 0, 0, tx, H - 8, 10, 5, '#1a1520');
  b(ctx, 0, 0, tx + 1, H - 7, 8, 3, '#113322');
  // Screen content (scrolling data)
  b(ctx, 0, 0, tx + 2, H - 7, 5, 1, '#22aa55');
  b(ctx, 0, 0, tx + 3, H - 6, 3, 1, '#22aa55');
  b(ctx, 0, 0, tx + 2, H - 5, 4, 1, '#22aa55');

  // Base
  b(ctx, 0, 0, 0, H - 2, W, 2, '#1a1520');
}

// ===================== INFERNAL =====================

function drawInfernalThrone(ctx: CanvasRenderingContext2D) {
  const W = gw(7), H = gh(4);
  const cx = Math.floor(W / 2);

  // Obsidian platform (raised)
  b(ctx, 0, 0, 4, H - 12, W - 8, 10, '#1a1014');
  b(ctx, 0, 0, 3, H - 11, W - 6, 9, '#221018');
  b(ctx, 0, 0, 2, H - 3, W - 4, 3, '#1a1014');
  // Platform steps
  b(ctx, 0, 0, 6, H - 14, W - 12, 2, '#2a1820');
  b(ctx, 0, 0, 10, H - 16, W - 20, 2, '#2a1820');

  // Runic inscriptions on platform
  for (let x = 8; x < W - 8; x += 6) {
    p(ctx, 0, 0, x, H - 10, '#661122');
    p(ctx, 0, 0, x + 1, H - 9, '#551122');
    p(ctx, 0, 0, x + 2, H - 10, '#661122');
  }
  // Rune glow
  for (let x = 12; x < W - 12; x += 8) {
    p(ctx, 0, 0, x, H - 8, '#882233');
  }

  // Throne base (seat platform)
  const throneLeft = cx - 10, throneW = 20;
  b(ctx, 0, 0, throneLeft, H - 20, throneW, 4, '#2a1818');

  // Throne seat
  b(ctx, 0, 0, throneLeft + 2, H - 28, throneW - 4, 8, '#1a0c10');
  // Dark red velvet cushion
  b(ctx, 0, 0, throneLeft + 4, H - 22, throneW - 8, 3, '#661122');
  b(ctx, 0, 0, throneLeft + 5, H - 22, throneW - 10, 1, '#882244');
  // Back cushion
  b(ctx, 0, 0, throneLeft + 4, H - 27, throneW - 8, 4, '#551020');
  b(ctx, 0, 0, throneLeft + 5, H - 26, throneW - 10, 2, '#661122');

  // Throne backrest (tall, horned)
  b(ctx, 0, 0, cx - 6, 10, 12, H - 30, '#1a0c10');
  b(ctx, 0, 0, cx - 5, 12, 10, H - 34, '#221016');
  // Skull motif on backrest
  b(ctx, 0, 0, cx - 3, 16, 6, 5, '#443838');
  b(ctx, 0, 0, cx - 2, 15, 4, 2, '#4a3e3e');
  // Eye sockets
  p(ctx, 0, 0, cx - 2, 17, '#ff2200');
  p(ctx, 0, 0, cx + 1, 17, '#ff2200');
  // Jaw
  b(ctx, 0, 0, cx - 2, 20, 4, 1, '#3a3030');

  // Horns rising from backrest
  // Left horn
  for (let i = 0; i < 8; i++) {
    p(ctx, 0, 0, cx - 6 - i, 10 - i, '#2a1818');
    if (i > 0) p(ctx, 0, 0, cx - 5 - i, 10 - i, '#331c1c');
  }
  p(ctx, 0, 0, cx - 13, 3, '#442020');
  // Right horn
  for (let i = 0; i < 8; i++) {
    p(ctx, 0, 0, cx + 5 + i, 10 - i, '#2a1818');
    if (i > 0) p(ctx, 0, 0, cx + 4 + i, 10 - i, '#331c1c');
  }
  p(ctx, 0, 0, cx + 12, 3, '#442020');

  // Skull armrests
  // Left armrest
  b(ctx, 0, 0, throneLeft, H - 24, 4, 4, '#443838');
  b(ctx, 0, 0, throneLeft, H - 25, 4, 2, '#4a3e3e');
  p(ctx, 0, 0, throneLeft, H - 24, '#cc8844'); // eye
  p(ctx, 0, 0, throneLeft + 2, H - 24, '#cc8844');
  // Right armrest
  b(ctx, 0, 0, throneLeft + throneW - 4, H - 24, 4, 4, '#443838');
  b(ctx, 0, 0, throneLeft + throneW - 4, H - 25, 4, 2, '#4a3e3e');
  p(ctx, 0, 0, throneLeft + throneW - 4, H - 24, '#cc8844');
  p(ctx, 0, 0, throneLeft + throneW - 2, H - 24, '#cc8844');

  // Braziers on either side (fire)
  const brazierPositions = [cx - 22, cx + 18];
  for (const bpx of brazierPositions) {
    // Brazier bowl
    b(ctx, 0, 0, bpx, H - 18, 6, 3, '#553322');
    b(ctx, 0, 0, bpx + 1, H - 18, 4, 1, '#664433');
    // Stand
    b(ctx, 0, 0, bpx + 2, H - 15, 2, 5, '#443322');
    // Fire
    b(ctx, 0, 0, bpx + 1, H - 21, 4, 3, '#ff6622');
    b(ctx, 0, 0, bpx + 2, H - 22, 2, 1, '#ffcc44');
    p(ctx, 0, 0, bpx + 2, H - 23, '#ffaa22');
    p(ctx, 0, 0, bpx + 3, H - 22, '#ff8811');
  }

  // Bone trophies scattered around base
  p(ctx, 0, 0, cx - 18, H - 6, '#887766');
  b(ctx, 0, 0, cx - 17, H - 5, 2, 1, '#887766');
  p(ctx, 0, 0, cx + 16, H - 7, '#887766');
  b(ctx, 0, 0, cx + 15, H - 6, 2, 1, '#887766');
  // Skull trophy
  b(ctx, 0, 0, cx + 20, H - 7, 2, 2, '#998877');
  p(ctx, 0, 0, cx + 20, H - 7, '#aa9988');

  // Ground (dark infernal stone)
  b(ctx, 0, 0, 0, H - 2, W, 2, '#110a0e');
}

function drawInfernalSpire(ctx: CanvasRenderingContext2D) {
  const W = gw(2), H = gh(5);
  const cx = Math.floor(W / 2);

  // Lava pool at base
  b(ctx, 0, 0, 2, H - 8, W - 4, 6, '#cc4400');
  b(ctx, 0, 0, 3, H - 7, W - 6, 4, '#ff6611');
  b(ctx, 0, 0, 4, H - 6, W - 8, 2, '#ffaa33');
  // Lava drips
  p(ctx, 0, 0, 5, H - 10, '#cc4400');
  p(ctx, 0, 0, W - 6, H - 9, '#cc4400');
  p(ctx, 0, 0, 4, H - 9, '#ff6611');

  // Obsidian spire body - faceted crystal shape
  // Base (widest)
  b(ctx, 0, 0, cx - 7, H - 14, 14, 4, '#1a1018');
  b(ctx, 0, 0, cx - 6, H - 14, 12, 1, '#2a1820');

  // Lower section
  b(ctx, 0, 0, cx - 6, H - 22, 12, 8, '#1a0c14');
  // Facet highlights (left face lighter)
  b(ctx, 0, 0, cx - 5, H - 20, 4, 6, '#221420');

  // Mid section (narrower)
  b(ctx, 0, 0, cx - 5, H - 34, 10, 12, '#180a12');
  b(ctx, 0, 0, cx - 4, H - 32, 3, 8, '#221420');

  // Upper section
  b(ctx, 0, 0, cx - 4, H - 46, 8, 12, '#160810');
  b(ctx, 0, 0, cx - 3, H - 44, 2, 8, '#201220');

  // Top section (narrow)
  b(ctx, 0, 0, cx - 3, H - 54, 6, 8, '#140810');
  b(ctx, 0, 0, cx - 2, H - 52, 1, 6, '#1e1018');

  // Jagged top
  b(ctx, 0, 0, cx - 2, H - 58, 4, 4, '#1a0c10');
  b(ctx, 0, 0, cx - 1, H - 62, 2, 4, '#160a0e');
  p(ctx, 0, 0, cx, H - 63, '#140a0e');

  // Orange glow from within (cracks)
  p(ctx, 0, 0, cx, H - 18, '#ff6622');
  p(ctx, 0, 0, cx - 1, H - 26, '#cc4411');
  p(ctx, 0, 0, cx + 1, H - 30, '#ff6622');
  p(ctx, 0, 0, cx, H - 38, '#cc4411');
  p(ctx, 0, 0, cx - 1, H - 42, '#ff4400');
  p(ctx, 0, 0, cx + 1, H - 48, '#cc4411');
  p(ctx, 0, 0, cx, H - 54, '#ff6622');
  // Deeper glow spots
  p(ctx, 0, 0, cx + 2, H - 20, '#883311');
  p(ctx, 0, 0, cx - 2, H - 34, '#883311');
  p(ctx, 0, 0, cx + 2, H - 44, '#883311');

  // Flames at peak
  p(ctx, 0, 0, cx, H - 64, '#ff6622');
  p(ctx, 0, 0, cx - 1, H - 65, '#ffaa44');
  p(ctx, 0, 0, cx + 1, H - 64, '#ff8833');
  p(ctx, 0, 0, cx, H - 66, '#ffcc44');

  // Ground (dark rock)
  b(ctx, 0, 0, 0, H - 2, W, 2, '#110a0a');
}

function drawInfernalAltar(ctx: CanvasRenderingContext2D) {
  const W = gw(5), H = gh(3);
  const cx = Math.floor(W / 2);

  // Dark rune circle on floor
  const circCx = cx, circCy = Math.floor(H / 2) + 4;
  const circR = 16;
  for (let angle = 0; angle < 360; angle += 8) {
    const rad = angle * Math.PI / 180;
    const rx = Math.round(circCx + Math.cos(rad) * circR);
    const ry = Math.round(circCy + Math.sin(rad) * (circR * 0.6));
    p(ctx, 0, 0, rx, ry, '#661122');
  }
  // Inner circle
  for (let angle = 0; angle < 360; angle += 12) {
    const rad = angle * Math.PI / 180;
    const rx = Math.round(circCx + Math.cos(rad) * (circR - 4));
    const ry = Math.round(circCy + Math.sin(rad) * ((circR - 4) * 0.6));
    p(ctx, 0, 0, rx, ry, '#882233');
  }

  // Raised platform (3 steps)
  b(ctx, 0, 0, cx - 18, H - 10, 36, 2, '#3a2828');
  b(ctx, 0, 0, cx - 16, H - 12, 32, 2, '#3a2828');
  b(ctx, 0, 0, cx - 14, H - 14, 28, 2, '#443030');

  // Stone slab on top
  b(ctx, 0, 0, cx - 12, H - 20, 24, 6, '#555048');
  b(ctx, 0, 0, cx - 11, H - 20, 22, 1, '#666058');
  b(ctx, 0, 0, cx - 12, H - 20, 24, 1, '#444038');
  // Blood channels carved into surface
  b(ctx, 0, 0, cx - 8, H - 18, 16, 1, '#661122');
  b(ctx, 0, 0, cx, H - 19, 1, 4, '#661122');
  b(ctx, 0, 0, cx - 6, H - 17, 1, 3, '#551020');
  b(ctx, 0, 0, cx + 5, H - 17, 1, 3, '#551020');
  // Blood pooling
  b(ctx, 0, 0, cx - 2, H - 17, 4, 2, '#441018');

  // Chains and iron rings on slab
  p(ctx, 0, 0, cx - 10, H - 18, '#888888');
  p(ctx, 0, 0, cx - 10, H - 17, '#777777');
  p(ctx, 0, 0, cx + 9, H - 18, '#888888');
  p(ctx, 0, 0, cx + 9, H - 17, '#777777');
  // Chain links hanging down
  p(ctx, 0, 0, cx - 11, H - 16, '#666666');
  p(ctx, 0, 0, cx - 11, H - 15, '#666666');
  p(ctx, 0, 0, cx + 10, H - 16, '#666666');
  p(ctx, 0, 0, cx + 10, H - 15, '#666666');

  // Ritual braziers at corners
  const brazierPos = [
    [cx - 22, H - 16],
    [cx + 18, H - 16],
    [cx - 22, H - 6],
    [cx + 18, H - 6],
  ];
  for (const [bpx, bpy] of brazierPos) {
    // Bowl
    b(ctx, 0, 0, bpx, bpy, 4, 2, '#553322');
    b(ctx, 0, 0, bpx + 1, bpy, 2, 1, '#664433');
    // Stand
    b(ctx, 0, 0, bpx + 1, bpy + 2, 2, 3, '#443322');
    // Fire/candle
    b(ctx, 0, 0, bpx + 1, bpy - 2, 2, 2, '#ff6622');
    p(ctx, 0, 0, bpx + 1, bpy - 3, '#ffcc44');
  }

  // Ground (dark stone)
  b(ctx, 0, 0, 0, H - 2, W, 2, '#1a1214');
  b(ctx, 0, 0, 0, 0, W, 2, '#1a1214');
}

// ===================== ARCANE =====================

function drawArcaneWizardTower(ctx: CanvasRenderingContext2D) {
  const W = gw(3), H = gh(5);
  const cx = Math.floor(W / 2);

  // Ground base — stone platform
  b(ctx, 0, 0, cx - 10, H - 6, 20, 4, '#443366');
  b(ctx, 0, 0, cx - 9, H - 6, 18, 1, '#554477');
  b(ctx, 0, 0, cx - 11, H - 3, 22, 3, '#332255');

  // Tower body — cylindrical purple stone
  const tw = 14, tLeft = cx - 7;
  b(ctx, 0, 0, tLeft, 16, tw, H - 22, '#3a2266');
  b(ctx, 0, 0, tLeft + 1, 16, tw - 2, H - 22, '#442877');
  // Left highlight
  b(ctx, 0, 0, tLeft + 1, 18, 2, H - 26, '#553388');
  // Right shadow
  b(ctx, 0, 0, tLeft + tw - 3, 18, 2, H - 26, '#2a1855');

  // Stone brick lines
  for (let y = 20; y < H - 8; y += 4) {
    b(ctx, 0, 0, tLeft + 1, y, tw - 2, 1, '#332060');
    // Offset bricks
    if (y % 8 === 0) {
      p(ctx, 0, 0, tLeft + 4, y, '#3a2266');
      p(ctx, 0, 0, tLeft + 8, y, '#3a2266');
    } else {
      p(ctx, 0, 0, tLeft + 2, y, '#3a2266');
      p(ctx, 0, 0, tLeft + 6, y, '#3a2266');
      p(ctx, 0, 0, tLeft + 10, y, '#3a2266');
    }
  }

  // Windows — glowing arcane energy
  const windowYs = [22, 34, 46];
  for (const wy of windowYs) {
    if (wy < H - 10) {
      b(ctx, 0, 0, cx - 3, wy, 6, 4, '#1a0a33');
      // Pointed arch top
      b(ctx, 0, 0, cx - 2, wy - 1, 4, 1, '#1a0a33');
      p(ctx, 0, 0, cx - 1, wy - 2, '#1a0a33');
      p(ctx, 0, 0, cx, wy - 2, '#1a0a33');
      // Inner glow
      b(ctx, 0, 0, cx - 2, wy + 1, 4, 2, '#6644cc');
      b(ctx, 0, 0, cx - 1, wy, 2, 1, '#8866ee');
      // Glow highlight
      p(ctx, 0, 0, cx, wy + 1, '#aa88ff');
    }
  }

  // Arcane runes on tower wall
  p(ctx, 0, 0, tLeft + 2, 28, '#7744bb');
  p(ctx, 0, 0, tLeft + 3, 29, '#7744bb');
  p(ctx, 0, 0, tLeft + 2, 30, '#7744bb');
  p(ctx, 0, 0, tLeft + tw - 4, 40, '#7744bb');
  p(ctx, 0, 0, tLeft + tw - 3, 41, '#7744bb');
  p(ctx, 0, 0, tLeft + tw - 4, 42, '#7744bb');

  // Battlement ring (top of tower body)
  b(ctx, 0, 0, tLeft - 2, 14, tw + 4, 3, '#443366');
  b(ctx, 0, 0, tLeft - 1, 14, tw + 2, 1, '#554477');
  // Crenellations
  for (let x = tLeft - 1; x < tLeft + tw + 2; x += 3) {
    b(ctx, 0, 0, x, 12, 2, 2, '#443366');
  }

  // Conical spire roof
  b(ctx, 0, 0, cx - 8, 10, 16, 3, '#552288');
  b(ctx, 0, 0, cx - 6, 7, 12, 3, '#6633aa');
  b(ctx, 0, 0, cx - 4, 5, 8, 3, '#7744bb');
  b(ctx, 0, 0, cx - 3, 3, 6, 3, '#8855cc');
  b(ctx, 0, 0, cx - 2, 1, 4, 3, '#9966dd');
  b(ctx, 0, 0, cx - 1, 0, 2, 2, '#aa77ee');
  // Spire highlight (left edge catches light)
  p(ctx, 0, 0, cx - 5, 8, '#8855cc');
  p(ctx, 0, 0, cx - 3, 5, '#9966dd');
  p(ctx, 0, 0, cx - 1, 2, '#bb88ff');

  // Crystal orb at peak
  p(ctx, 0, 0, cx, 0, '#ccaaff');

  // Door at base
  b(ctx, 0, 0, cx - 3, H - 10, 6, 4, '#1a0a33');
  b(ctx, 0, 0, cx - 2, H - 11, 4, 1, '#1a0a33');
  p(ctx, 0, 0, cx - 1, H - 12, '#1a0a33');
  p(ctx, 0, 0, cx, H - 12, '#1a0a33');
  // Door handle glow
  p(ctx, 0, 0, cx + 1, H - 8, '#aa88ff');
}

// ===================== MECHANICAL =====================

function drawMechFurnace(ctx: CanvasRenderingContext2D) {
  const W = gw(6), H = gh(6);
  const cx = Math.floor(W / 2);

  // Heavy concrete foundation
  b(ctx, 0, 0, 2, H - 6, W - 4, 6, '#3a3838');
  b(ctx, 0, 0, 1, H - 4, W - 2, 4, '#333030');

  // Main furnace body — massive rectangular structure
  const bx = 4, by = 14, bw = W - 8, bh = H - 20;
  b(ctx, 0, 0, bx, by, bw, bh, '#5a4a3a');
  b(ctx, 0, 0, bx + 1, by + 1, bw - 2, bh - 2, '#665540');
  // Outline
  b(ctx, 0, 0, bx, by, bw, 1, '#3a3028');
  b(ctx, 0, 0, bx, by + bh - 1, bw, 1, '#3a3028');
  b(ctx, 0, 0, bx, by, 1, bh, '#3a3028');
  b(ctx, 0, 0, bx + bw - 1, by, 1, bh, '#3a3028');

  // Riveted metal plates
  for (let y = by + 3; y < by + bh - 3; y += 6) {
    b(ctx, 0, 0, bx + 1, y, bw - 2, 1, '#4a3a2a');
    // Rivets
    for (let x = bx + 3; x < bx + bw - 3; x += 5) {
      p(ctx, 0, 0, x, y, '#888070');
      p(ctx, 0, 0, x, y + 5 < by + bh ? y + 3 : y, '#888070');
    }
  }

  // Glowing core opening (front)
  const gx = cx - 8, gy = by + bh - 18, gWidth = 16, gHeight = 12;
  b(ctx, 0, 0, gx, gy, gWidth, gHeight, '#1a0800');
  b(ctx, 0, 0, gx + 1, gy + 1, gWidth - 2, gHeight - 2, '#cc4400');
  b(ctx, 0, 0, gx + 2, gy + 2, gWidth - 4, gHeight - 4, '#ff6611');
  b(ctx, 0, 0, gx + 3, gy + 3, gWidth - 6, gHeight - 6, '#ffaa33');
  b(ctx, 0, 0, gx + 4, gy + 4, gWidth - 8, gHeight - 8, '#ffcc66');
  // Grate bars over opening
  for (let x = gx + 3; x < gx + gWidth - 3; x += 3) {
    b(ctx, 0, 0, x, gy, 1, gHeight, '#3a3028');
  }
  // Horizontal grate bar
  b(ctx, 0, 0, gx, gy + Math.floor(gHeight / 2), gWidth, 1, '#3a3028');

  // Smokestacks (two tall pipes)
  const stack1x = cx - 12, stack2x = cx + 8;
  for (const sx of [stack1x, stack2x]) {
    b(ctx, 0, 0, sx, 0, 5, by + 2, '#555555');
    b(ctx, 0, 0, sx + 1, 0, 3, by + 2, '#666666');
    // Cap
    b(ctx, 0, 0, sx - 1, 0, 7, 2, '#777777');
    b(ctx, 0, 0, sx, 0, 5, 1, '#888888');
    // Band rings
    b(ctx, 0, 0, sx - 1, 6, 7, 1, '#777777');
    b(ctx, 0, 0, sx - 1, by - 2, 7, 1, '#777777');
    // Smoke wisps
    p(ctx, 0, 0, sx + 2, 0, '#555550');
  }

  // Pipe networks on sides
  // Left side pipes
  b(ctx, 0, 0, 1, by + 4, 3, 1, '#888877');
  b(ctx, 0, 0, 1, by + 4, 1, 10, '#888877');
  b(ctx, 0, 0, 1, by + 13, 3, 1, '#888877');
  p(ctx, 0, 0, 1, by + 8, '#999988');
  // Right side pipes
  b(ctx, 0, 0, bx + bw, by + 6, 3, 1, '#888877');
  b(ctx, 0, 0, bx + bw + 2, by + 6, 1, 12, '#888877');
  b(ctx, 0, 0, bx + bw, by + 17, 3, 1, '#888877');

  // Molten metal glow at base
  b(ctx, 0, 0, cx - 10, H - 8, 20, 2, '#cc4400');
  b(ctx, 0, 0, cx - 8, H - 7, 16, 1, '#ff6611');
  // Drips
  p(ctx, 0, 0, cx - 6, H - 6, '#ff6611');
  p(ctx, 0, 0, cx + 4, H - 6, '#cc4400');

  // Control panel (left side)
  b(ctx, 0, 0, bx + 2, by + bh - 6, 8, 4, '#2a2828');
  b(ctx, 0, 0, bx + 3, by + bh - 5, 6, 2, '#333030');
  p(ctx, 0, 0, bx + 3, by + bh - 5, '#00ff44');
  p(ctx, 0, 0, bx + 5, by + bh - 5, '#ff4400');
  p(ctx, 0, 0, bx + 7, by + bh - 5, '#ffaa00');
}

function drawMechPress(ctx: CanvasRenderingContext2D) {
  const W = gw(8), H = gh(5);
  const cx = Math.floor(W / 2);

  // Floor / base plate
  b(ctx, 0, 0, 0, H - 4, W, 4, '#3a3838');
  b(ctx, 0, 0, 1, H - 3, W - 2, 2, '#444040');

  // Main press frame — heavy steel I-beams
  const fx = 6, fy = 4, fw = W - 12, fh = H - 10;
  // Left column
  b(ctx, 0, 0, fx, fy, 6, fh, '#606060');
  b(ctx, 0, 0, fx + 1, fy + 1, 4, fh - 2, '#6a6a6a');
  b(ctx, 0, 0, fx + 2, fy, 2, fh, '#555555');
  // Right column
  b(ctx, 0, 0, fx + fw - 6, fy, 6, fh, '#606060');
  b(ctx, 0, 0, fx + fw - 5, fy + 1, 4, fh - 2, '#6a6a6a');
  b(ctx, 0, 0, fx + fw - 4, fy, 2, fh, '#555555');
  // Top crossbeam
  b(ctx, 0, 0, fx, fy, fw, 4, '#555555');
  b(ctx, 0, 0, fx + 1, fy + 1, fw - 2, 2, '#666666');

  // Hydraulic ram (center, coming down from top)
  const ramW = 12, ramX = cx - 6;
  b(ctx, 0, 0, ramX, fy + 4, ramW, 2, '#777777'); // hydraulic cylinder top
  b(ctx, 0, 0, ramX + 2, fy + 6, ramW - 4, 14, '#888888'); // piston shaft
  b(ctx, 0, 0, ramX + 3, fy + 6, ramW - 6, 14, '#999999'); // highlight
  // Piston rod
  b(ctx, 0, 0, cx - 3, fy + 20, 6, 8, '#aaaaaa');
  b(ctx, 0, 0, cx - 2, fy + 20, 4, 8, '#bbbbbb');

  // Die / press head
  const dieY = fy + 28;
  b(ctx, 0, 0, cx - 10, dieY, 20, 6, '#505050');
  b(ctx, 0, 0, cx - 9, dieY + 1, 18, 4, '#5a5a5a');
  b(ctx, 0, 0, cx - 8, dieY + 5, 16, 2, '#444444');

  // Work surface / anvil bed
  const bedY = H - 16;
  b(ctx, 0, 0, cx - 14, bedY, 28, 4, '#555555');
  b(ctx, 0, 0, cx - 13, bedY, 26, 1, '#666666');
  b(ctx, 0, 0, cx - 14, bedY + 3, 28, 1, '#444444');

  // Workpiece on bed (glowing hot metal)
  b(ctx, 0, 0, cx - 6, bedY - 2, 12, 2, '#cc6622');
  b(ctx, 0, 0, cx - 5, bedY - 2, 10, 1, '#ff8833');
  p(ctx, 0, 0, cx, bedY - 2, '#ffaa44');

  // Conveyor feed (left side)
  b(ctx, 0, 0, 0, bedY, 6, 2, '#555550');
  b(ctx, 0, 0, 0, bedY + 1, 6, 1, '#444440');
  // Conveyor rollers
  for (let x = 1; x < 6; x += 2) {
    p(ctx, 0, 0, x, bedY, '#666660');
  }

  // Conveyor output (right side)
  b(ctx, 0, 0, W - 6, bedY, 6, 2, '#555550');
  b(ctx, 0, 0, W - 6, bedY + 1, 6, 1, '#444440');
  for (let x = W - 5; x < W; x += 2) {
    p(ctx, 0, 0, x, bedY, '#666660');
  }

  // Hydraulic lines
  b(ctx, 0, 0, fx + 7, fy + 2, 1, 20, '#993333');
  b(ctx, 0, 0, fx + fw - 8, fy + 2, 1, 20, '#993333');
  // Connectors
  p(ctx, 0, 0, fx + 7, fy + 10, '#bb4444');
  p(ctx, 0, 0, fx + fw - 8, fy + 10, '#bb4444');

  // Safety markings (yellow/black stripes)
  for (let x = fx + 8; x < fx + fw - 8; x += 4) {
    p(ctx, 0, 0, x, fy + 3, '#ccaa00');
    p(ctx, 0, 0, x + 1, fy + 3, '#222222');
  }

  // Control panel (right side)
  b(ctx, 0, 0, fx + fw - 4, fy + fh - 10, 6, 8, '#2a2828');
  b(ctx, 0, 0, fx + fw - 3, fy + fh - 9, 4, 6, '#333030');
  p(ctx, 0, 0, fx + fw - 3, fy + fh - 8, '#00ff44');
  p(ctx, 0, 0, fx + fw - 1, fy + fh - 8, '#ff0000');
  // Screen
  b(ctx, 0, 0, fx + fw - 3, fy + fh - 6, 4, 3, '#113322');
  b(ctx, 0, 0, fx + fw - 2, fy + fh - 5, 2, 1, '#22aa55');
}

// ===================== NATURE =====================

function drawNatureAncientTree(ctx: CanvasRenderingContext2D) {
  const W = gw(7), H = gh(7);
  const cx = Math.floor(W / 2), cy = Math.floor(H / 2);
  const R = Math.min(cx, cy) - 2;

  // Draw circular tree within bounds, leaving corners transparent

  // Massive root system at base (lower circle area)
  for (let angle = 150; angle <= 390; angle += 15) {
    const rad = (angle * Math.PI) / 180;
    const rootLen = 8 + (angle % 30 === 0 ? 4 : 0);
    for (let d = 0; d < rootLen; d++) {
      const rx = Math.round(cx + Math.cos(rad) * (R - 16 + d));
      const ry = Math.round(cy + Math.sin(rad) * (R - 16 + d));
      const dist = Math.sqrt((rx - cx) ** 2 + (ry - cy) ** 2);
      if (dist <= R) {
        p(ctx, 0, 0, rx, ry, d < 4 ? '#5a3a22' : '#4a3018');
      }
    }
  }

  // Ground / moss at base of tree (circular)
  for (let x = cx - R; x <= cx + R; x++) {
    for (let y = cy + R - 10; y <= cy + R; y++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist <= R && dist > R - 6) {
        const c = (x + y) % 3 === 0 ? '#2a4422' : '#1a3318';
        p(ctx, 0, 0, x, y, c);
      }
    }
  }

  // Fill circular ground area with earthy tones
  for (let x = cx - R; x <= cx + R; x++) {
    for (let y = cy; y <= cy + R; y++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist <= R - 2 && dist > 8) {
        if ((x + y) % 5 === 0) p(ctx, 0, 0, x, y, '#3a5533');
        else if ((x * y) % 7 === 0) p(ctx, 0, 0, x, y, '#2a4422');
      }
    }
  }

  // Main trunk — thick, gnarled
  const trunkW = 12;
  b(ctx, 0, 0, cx - 6, cy - 10, trunkW, 24, '#5a3a22');
  b(ctx, 0, 0, cx - 5, cy - 8, trunkW - 2, 20, '#6a4a2a');
  // Left highlight
  b(ctx, 0, 0, cx - 5, cy - 6, 2, 16, '#7a5a33');
  // Right shadow
  b(ctx, 0, 0, cx + 4, cy - 6, 2, 16, '#4a2a18');
  // Bark texture
  for (let y = cy - 8; y < cy + 12; y += 3) {
    p(ctx, 0, 0, cx - 3, y, '#5a3a22');
    p(ctx, 0, 0, cx + 1, y + 1, '#4a2a18');
    p(ctx, 0, 0, cx - 1, y + 2, '#6a4a2a');
  }

  // Knotholes
  b(ctx, 0, 0, cx - 3, cy - 2, 3, 2, '#3a2010');
  b(ctx, 0, 0, cx - 2, cy - 2, 1, 1, '#2a1808');
  b(ctx, 0, 0, cx + 2, cy + 4, 2, 3, '#3a2010');
  p(ctx, 0, 0, cx + 2, cy + 5, '#2a1808');

  // Major branches extending outward
  const branches = [
    { angle: -60, len: 18 }, { angle: -30, len: 22 },
    { angle: -120, len: 18 }, { angle: -150, len: 20 },
    { angle: -80, len: 15 }, { angle: -100, len: 16 },
  ];
  for (const br of branches) {
    const rad = (br.angle * Math.PI) / 180;
    for (let d = 0; d < br.len; d++) {
      const bx = Math.round(cx + Math.cos(rad) * (6 + d));
      const by = Math.round((cy - 6) + Math.sin(rad) * (6 + d));
      const dist = Math.sqrt((bx - cx) ** 2 + (by - cy) ** 2);
      if (dist <= R - 3) {
        const thick = Math.max(1, 3 - Math.floor(d / 6));
        for (let t = 0; t < thick; t++) {
          p(ctx, 0, 0, bx, by + t, '#5a3a22');
          if (t === 0) p(ctx, 0, 0, bx, by, '#6a4a2a');
        }
      }
    }
  }

  // Canopy — large circular leaf mass
  for (let x = cx - R; x <= cx + R; x++) {
    for (let y = cy - R; y <= cy - 2; y++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - (cy - 8)) ** 2);
      if (dist <= R - 2) {
        // Layered green tones
        const noise = ((x * 7 + y * 13) % 11);
        let color: string;
        if (noise < 3) color = '#1a5522';
        else if (noise < 5) color = '#227733';
        else if (noise < 7) color = '#2a8844';
        else if (noise < 9) color = '#338833';
        else color = '#1a6628';
        p(ctx, 0, 0, x, y, color);
      }
    }
  }

  // Canopy side leaves (fill the circle on sides)
  for (let x = cx - R; x <= cx + R; x++) {
    for (let y = cy - 2; y <= cy + 6; y++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - (cy - 8)) ** 2);
      if (dist <= R - 1 && Math.abs(x - cx) > 8) {
        const noise = ((x * 3 + y * 7) % 7);
        const color = noise < 3 ? '#1a5522' : noise < 5 ? '#227733' : '#1a6628';
        p(ctx, 0, 0, x, y, color);
      }
    }
  }

  // Light dapples on canopy
  for (let i = 0; i < 20; i++) {
    const dx = cx - R + 4 + ((i * 7) % (2 * R - 8));
    const dy = cy - R + 2 + ((i * 11) % (R - 4));
    const dist = Math.sqrt((dx - cx) ** 2 + (dy - (cy - 8)) ** 2);
    if (dist <= R - 4) {
      p(ctx, 0, 0, dx, dy, '#44aa55');
      p(ctx, 0, 0, dx + 1, dy, '#33bb44');
    }
  }

  // Moss patches on trunk
  p(ctx, 0, 0, cx - 5, cy + 2, '#336633');
  p(ctx, 0, 0, cx - 5, cy + 3, '#2a5528');
  p(ctx, 0, 0, cx + 5, cy - 1, '#336633');
}

// ===================== CYPHERPUNK =====================

function drawCyberMainframe(ctx: CanvasRenderingContext2D) {
  const W = gw(3), H = gh(6);
  const cx = Math.floor(W / 2);

  // Floor panel
  b(ctx, 0, 0, 0, H - 3, W, 3, '#1a1a22');
  b(ctx, 0, 0, 1, H - 2, W - 2, 1, '#222230');

  // Main server rack — tall metal cabinet
  const rackX = 4, rackY = 2, rackW = W - 8, rackH = H - 6;
  b(ctx, 0, 0, rackX, rackY, rackW, rackH, '#2a2a33');
  b(ctx, 0, 0, rackX + 1, rackY + 1, rackW - 2, rackH - 2, '#333340');
  // Rack frame
  b(ctx, 0, 0, rackX, rackY, rackW, 1, '#444455');
  b(ctx, 0, 0, rackX, rackY + rackH - 1, rackW, 1, '#444455');
  b(ctx, 0, 0, rackX, rackY, 1, rackH, '#444455');
  b(ctx, 0, 0, rackX + rackW - 1, rackY, 1, rackH, '#444455');

  // Server units (stacked horizontally, repeating pattern)
  const unitH = 5;
  for (let i = 0; i < Math.floor((rackH - 4) / (unitH + 1)); i++) {
    const uy = rackY + 2 + i * (unitH + 1);
    // Unit body
    b(ctx, 0, 0, rackX + 2, uy, rackW - 4, unitH, '#222230');
    b(ctx, 0, 0, rackX + 3, uy + 1, rackW - 6, unitH - 2, '#2a2a38');
    // Faceplate
    b(ctx, 0, 0, rackX + 2, uy, rackW - 4, 1, '#3a3a48');

    // LED indicators (blinking lights pattern)
    const ledColors = ['#00ff44', '#00ff44', '#ffaa00', '#00ff44', '#ff2222', '#00ff44'];
    for (let l = 0; l < 4; l++) {
      const lx = rackX + 4 + l * 3;
      if (lx < rackX + rackW - 4) {
        p(ctx, 0, 0, lx, uy + 1, ledColors[(i + l) % ledColors.length]);
      }
    }

    // Drive bays / ventilation slots
    for (let slot = 0; slot < 3; slot++) {
      const sx = rackX + 4 + slot * 4;
      if (sx + 2 < rackX + rackW - 3) {
        b(ctx, 0, 0, sx, uy + 3, 2, 1, '#1a1a22');
      }
    }

    // Power indicator on right
    p(ctx, 0, 0, rackX + rackW - 4, uy + 2, i % 3 === 0 ? '#0066ff' : '#004488');
  }

  // Cable bundles (sides)
  // Left cable run
  b(ctx, 0, 0, 1, rackY + 4, 2, rackH - 8, '#222244');
  p(ctx, 0, 0, 1, rackY + 6, '#444466');
  p(ctx, 0, 0, 1, rackY + 12, '#444466');
  p(ctx, 0, 0, 1, rackY + 18, '#444466');
  // Right cable run
  b(ctx, 0, 0, W - 3, rackY + 4, 2, rackH - 8, '#222244');
  p(ctx, 0, 0, W - 3, rackY + 8, '#444466');
  p(ctx, 0, 0, W - 3, rackY + 14, '#444466');

  // Cooling fans (top)
  b(ctx, 0, 0, rackX + 3, rackY + 1, 4, 2, '#1a1a22');
  p(ctx, 0, 0, rackX + 4, rackY + 1, '#333344');
  p(ctx, 0, 0, rackX + 5, rackY + 2, '#333344');
  b(ctx, 0, 0, rackX + rackW - 7, rackY + 1, 4, 2, '#1a1a22');
  p(ctx, 0, 0, rackX + rackW - 6, rackY + 1, '#333344');

  // Monitor screen on front (small status display)
  const monY = rackY + rackH - 8;
  b(ctx, 0, 0, cx - 5, monY, 10, 6, '#111118');
  b(ctx, 0, 0, cx - 4, monY + 1, 8, 4, '#002211');
  // Scrolling data lines
  b(ctx, 0, 0, cx - 3, monY + 1, 5, 1, '#00cc55');
  b(ctx, 0, 0, cx - 3, monY + 2, 3, 1, '#00aa44');
  b(ctx, 0, 0, cx - 3, monY + 3, 6, 1, '#00cc55');
  b(ctx, 0, 0, cx - 3, monY + 4, 4, 1, '#00aa44');

  // Blue power strip at bottom
  b(ctx, 0, 0, rackX + 2, rackY + rackH - 2, rackW - 4, 1, '#0044aa');
}

// ===================== CELESTIAL =====================

function drawCelestialSanctum(ctx: CanvasRenderingContext2D) {
  const W = gw(12), H = gh(2);
  const cx = Math.floor(W / 2);

  // Main architrave (horizontal beam)
  b(ctx, 0, 0, 0, 4, W, H - 8, '#d0c8b8');
  b(ctx, 0, 0, 1, 5, W - 2, H - 10, '#ddd5c5');
  // Top molding
  b(ctx, 0, 0, 0, 2, W, 3, '#c8c0b0');
  b(ctx, 0, 0, 0, 2, W, 1, '#b8b0a0');
  // Bottom molding
  b(ctx, 0, 0, 0, H - 4, W, 3, '#c8c0b0');
  b(ctx, 0, 0, 0, H - 2, W, 1, '#b8b0a0');

  // Columns — evenly spaced
  const colSpacing = Math.floor(W / 7);
  for (let i = 0; i <= 6; i++) {
    const colX = 4 + i * colSpacing;
    // Column shaft
    b(ctx, 0, 0, colX, 3, 4, H - 6, '#e0d8c8');
    b(ctx, 0, 0, colX + 1, 3, 2, H - 6, '#ece4d4');
    // Fluting (shadow lines)
    b(ctx, 0, 0, colX, 5, 1, H - 10, '#c8c0b0');
    b(ctx, 0, 0, colX + 3, 5, 1, H - 10, '#c8c0b0');
    // Capital (Ionic)
    b(ctx, 0, 0, colX - 1, 2, 6, 2, '#ece4d4');
    p(ctx, 0, 0, colX - 1, 2, '#f0e8d8');
    p(ctx, 0, 0, colX + 4, 2, '#f0e8d8');
    // Base
    b(ctx, 0, 0, colX - 1, H - 4, 6, 2, '#d8d0c0');
  }

  // Frieze (decorative band between columns, upper portion)
  const friezeY = 5;
  for (let x = 8; x < W - 8; x += 12) {
    // Meander / Greek key pattern
    b(ctx, 0, 0, x, friezeY, 4, 1, '#aa9966');
    b(ctx, 0, 0, x + 3, friezeY, 1, 3, '#aa9966');
    b(ctx, 0, 0, x + 1, friezeY + 2, 3, 1, '#aa9966');
    b(ctx, 0, 0, x + 1, friezeY + 2, 1, 2, '#aa9966');
    b(ctx, 0, 0, x + 1, friezeY + 3, 4, 1, '#aa9966');
  }

  // Central ornament (star / sunburst)
  p(ctx, 0, 0, cx, 6, '#ffdd88');
  p(ctx, 0, 0, cx - 1, 6, '#eebb66');
  p(ctx, 0, 0, cx + 1, 6, '#eebb66');
  p(ctx, 0, 0, cx, 5, '#eebb66');
  p(ctx, 0, 0, cx, 7, '#eebb66');
  // Diagonal rays
  p(ctx, 0, 0, cx - 1, 5, '#ccaa55');
  p(ctx, 0, 0, cx + 1, 5, '#ccaa55');
  p(ctx, 0, 0, cx - 1, 7, '#ccaa55');
  p(ctx, 0, 0, cx + 1, 7, '#ccaa55');

  // Pediment / triangular top
  for (let i = 0; i < 3; i++) {
    const pw = W - 4 - i * 16;
    if (pw > 0) {
      b(ctx, 0, 0, Math.floor((W - pw) / 2), 1 - i, pw, 1, i === 0 ? '#c8c0b0' : '#b8b0a0');
    }
  }
}

function drawCelestialGatePillar(ctx: CanvasRenderingContext2D) {
  const W = gw(2), H = gh(3);
  const cx = Math.floor(W / 2);

  // Pedestal base
  b(ctx, 0, 0, 2, H - 6, W - 4, 6, '#c8c0b0');
  b(ctx, 0, 0, 3, H - 6, W - 6, 1, '#d8d0c0');
  b(ctx, 0, 0, 1, H - 4, W - 2, 4, '#b8b0a0');
  b(ctx, 0, 0, 0, H - 2, W, 2, '#a8a098');

  // Column shaft — fluted
  const colW = 10, colX = cx - 5;
  b(ctx, 0, 0, colX, 8, colW, H - 14, '#e0d8c8');
  b(ctx, 0, 0, colX + 1, 8, colW - 2, H - 14, '#ece4d4');
  // Fluting grooves
  for (let x = colX + 1; x < colX + colW - 1; x += 2) {
    b(ctx, 0, 0, x, 10, 1, H - 18, '#c8c0b0');
  }
  // Highlight strip
  b(ctx, 0, 0, colX + 3, 10, 2, H - 18, '#f0e8d8');

  // Ionic capital
  b(ctx, 0, 0, colX - 2, 6, colW + 4, 3, '#ece4d4');
  b(ctx, 0, 0, colX - 1, 6, colW + 2, 1, '#f0e8d8');
  // Volutes (scrolls)
  p(ctx, 0, 0, colX - 2, 6, '#ddd5c5');
  p(ctx, 0, 0, colX - 2, 7, '#c8c0b0');
  p(ctx, 0, 0, colX + colW + 1, 6, '#ddd5c5');
  p(ctx, 0, 0, colX + colW + 1, 7, '#c8c0b0');
  // Egg-and-dart detail
  for (let x = colX; x < colX + colW; x += 3) {
    p(ctx, 0, 0, x, 8, '#d8d0c0');
    p(ctx, 0, 0, x + 1, 8, '#b8b0a0');
  }

  // Abacus (flat top slab)
  b(ctx, 0, 0, colX - 3, 4, colW + 6, 2, '#d8d0c0');
  b(ctx, 0, 0, colX - 3, 4, colW + 6, 1, '#e0d8c8');

  // Ornamental top — small flame / orb
  b(ctx, 0, 0, cx - 2, 1, 4, 3, '#ffdd88');
  b(ctx, 0, 0, cx - 1, 0, 2, 2, '#ffee99');
  p(ctx, 0, 0, cx, 0, '#ffffbb');
  // Glow
  p(ctx, 0, 0, cx - 2, 2, '#eebb66');
  p(ctx, 0, 0, cx + 1, 2, '#eebb66');

  // Column base (torus molding)
  b(ctx, 0, 0, colX - 1, H - 8, colW + 2, 2, '#d8d0c0');
  b(ctx, 0, 0, colX - 1, H - 8, colW + 2, 1, '#e0d8c8');
}

// ===================== ALIENS =====================

function drawAlienQueenChamber(ctx: CanvasRenderingContext2D) {
  const W = gw(7), H = gh(7);
  const cx = Math.floor(W / 2), cy = Math.floor(H / 2);
  const R = Math.min(cx, cy) - 2;

  // Organic chamber walls — circular, chitin texture
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist <= R && dist > R - 5) {
        // Chitin wall ring
        const noise = ((x * 13 + y * 7) % 9);
        const color = noise < 3 ? '#3a2244' : noise < 6 ? '#442a55' : '#332040';
        p(ctx, 0, 0, x, y, color);
      }
    }
  }

  // Inner floor — dark organic material
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist <= R - 5) {
        const noise = ((x * 3 + y * 11) % 13);
        if (noise < 4) p(ctx, 0, 0, x, y, '#1a1022');
        else if (noise < 7) p(ctx, 0, 0, x, y, '#221428');
        else if (noise < 10) p(ctx, 0, 0, x, y, '#1e1225');
      }
    }
  }

  // Bioluminescent veins on floor
  for (let angle = 0; angle < 360; angle += 30) {
    const rad = (angle * Math.PI) / 180;
    for (let d = 6; d < R - 5; d += 2) {
      const vx = Math.round(cx + Math.cos(rad) * d);
      const vy = Math.round(cy + Math.sin(rad) * d);
      p(ctx, 0, 0, vx, vy, d % 4 === 0 ? '#44cc88' : '#339966');
    }
  }

  // Egg sacs — scattered around the chamber
  const eggPositions = [
    [cx - 14, cy - 8], [cx + 10, cy - 10], [cx - 16, cy + 4],
    [cx + 12, cy + 6], [cx - 8, cy + 14], [cx + 6, cy + 12],
    [cx - 10, cy - 14], [cx + 14, cy - 4],
  ];
  for (const [ex, ey] of eggPositions) {
    const dist = Math.sqrt((ex - cx) ** 2 + (ey - cy) ** 2);
    if (dist < R - 6) {
      // Egg body
      b(ctx, 0, 0, ex, ey, 3, 4, '#556644');
      b(ctx, 0, 0, ex, ey, 3, 1, '#667755');
      p(ctx, 0, 0, ex + 1, ey + 1, '#778866');
      // Egg slime
      p(ctx, 0, 0, ex + 1, ey + 4, '#44aa66');
    }
  }

  // Queen silhouette (center) — large dark form
  // Body
  b(ctx, 0, 0, cx - 8, cy - 6, 16, 14, '#1a0a18');
  b(ctx, 0, 0, cx - 7, cy - 5, 14, 12, '#221022');
  // Crown / crest
  b(ctx, 0, 0, cx - 6, cy - 10, 12, 5, '#1a0a18');
  b(ctx, 0, 0, cx - 4, cy - 12, 8, 3, '#221022');
  b(ctx, 0, 0, cx - 2, cy - 13, 4, 2, '#2a1428');
  // Crown spikes
  p(ctx, 0, 0, cx - 5, cy - 11, '#331830');
  p(ctx, 0, 0, cx + 4, cy - 11, '#331830');
  p(ctx, 0, 0, cx - 3, cy - 13, '#2a1428');
  p(ctx, 0, 0, cx + 2, cy - 13, '#2a1428');

  // Queen eyes (glowing green)
  p(ctx, 0, 0, cx - 3, cy - 6, '#44ff88');
  p(ctx, 0, 0, cx + 2, cy - 6, '#44ff88');
  // Inner eye glow
  p(ctx, 0, 0, cx - 2, cy - 6, '#88ffaa');
  p(ctx, 0, 0, cx + 1, cy - 6, '#88ffaa');

  // Mandibles
  b(ctx, 0, 0, cx - 4, cy - 3, 2, 3, '#331830');
  b(ctx, 0, 0, cx + 2, cy - 3, 2, 3, '#331830');
  p(ctx, 0, 0, cx - 5, cy - 1, '#442040');
  p(ctx, 0, 0, cx + 4, cy - 1, '#442040');

  // Leg/arm shapes extending from body
  const limbs = [
    { sx: -7, sy: -2, dx: -4, dy: 3 },
    { sx: 7, sy: -2, dx: 4, dy: 3 },
    { sx: -8, sy: 2, dx: -5, dy: 4 },
    { sx: 8, sy: 2, dx: 5, dy: 4 },
  ];
  for (const l of limbs) {
    for (let d = 0; d < 4; d++) {
      const lx = cx + l.sx + Math.round((l.dx / 4) * d);
      const ly = cy + l.sy + Math.round((l.dy / 4) * d);
      p(ctx, 0, 0, lx, ly, '#221022');
      p(ctx, 0, 0, lx, ly + 1, '#1a0a18');
    }
  }

  // Tail extending behind
  for (let d = 0; d < 10; d++) {
    const tx = cx + d;
    const ty = cy + 6 + Math.floor(d / 3);
    const dist = Math.sqrt((tx - cx) ** 2 + (ty - cy) ** 2);
    if (dist < R - 5) {
      p(ctx, 0, 0, tx, ty, '#1a0a18');
      if (d < 8) p(ctx, 0, 0, tx, ty + 1, '#221022');
    }
  }

  // Bioluminescent glow spots on walls
  const glowSpots = [
    [cx - R + 3, cy - 6], [cx + R - 4, cy - 4],
    [cx - R + 4, cy + 8], [cx + R - 5, cy + 6],
    [cx - 4, cy - R + 4], [cx + 2, cy + R - 5],
  ];
  for (const [gx, gy] of glowSpots) {
    p(ctx, 0, 0, gx, gy, '#44ffaa');
    p(ctx, 0, 0, gx + 1, gy, '#33cc88');
  }
}

// ===================== HARMONIC =====================

function drawHarmonicGrandPiano(ctx: CanvasRenderingContext2D) {
  const W = gw(3), H = gh(3);
  const cx = Math.floor(W / 2);

  // Piano body — curved grand piano shape (top view)
  // Main body (roughly teardrop/wing shape)
  b(ctx, 0, 0, 6, 4, W - 12, H - 10, '#1a1018');
  b(ctx, 0, 0, 7, 5, W - 14, H - 12, '#221420');
  // Curved right side (wider)
  b(ctx, 0, 0, W - 14, 6, 8, H - 16, '#1a1018');
  b(ctx, 0, 0, W - 12, 8, 6, H - 20, '#221420');
  // Curved left side (narrower tail)
  b(ctx, 0, 0, 4, 8, 4, H - 20, '#1a1018');
  b(ctx, 0, 0, 5, 10, 2, H - 24, '#221420');

  // Glossy black finish — highlights
  b(ctx, 0, 0, 8, 6, W - 18, 2, '#332838');
  b(ctx, 0, 0, 10, 8, 4, H - 22, '#2a1e2e');

  // Keyboard (white keys at the front/bottom)
  const keysY = H - 8, keysX = 8, keysW = W - 16;
  b(ctx, 0, 0, keysX, keysY, keysW, 4, '#e8e0d8');
  b(ctx, 0, 0, keysX, keysY, keysW, 1, '#f0e8e0');
  // Key separators
  for (let x = keysX + 2; x < keysX + keysW; x += 2) {
    b(ctx, 0, 0, x, keysY, 1, 4, '#c8c0b8');
  }
  // Black keys
  for (let x = keysX + 3; x < keysX + keysW - 2; x += 4) {
    b(ctx, 0, 0, x, keysY, 1, 2, '#111111');
    if (x + 2 < keysX + keysW - 2) {
      b(ctx, 0, 0, x + 2, keysY, 1, 2, '#111111');
    }
  }

  // Music stand / sheet music
  b(ctx, 0, 0, cx - 6, keysY - 4, 12, 3, '#443322');
  b(ctx, 0, 0, cx - 5, keysY - 4, 10, 1, '#eeeecc'); // sheet music
  b(ctx, 0, 0, cx - 4, keysY - 3, 8, 1, '#ddddbb');
  // Notes on sheet
  p(ctx, 0, 0, cx - 3, keysY - 4, '#222222');
  p(ctx, 0, 0, cx, keysY - 4, '#222222');
  p(ctx, 0, 0, cx + 2, keysY - 4, '#222222');

  // Lid prop
  b(ctx, 0, 0, W - 10, 10, 1, H - 24, '#443838');
  p(ctx, 0, 0, W - 10, 10, '#555548');

  // Piano legs (visible at base corners)
  b(ctx, 0, 0, 8, H - 4, 2, 4, '#332830');
  b(ctx, 0, 0, W - 10, H - 4, 2, 4, '#332830');
  b(ctx, 0, 0, cx - 1, H - 4, 2, 4, '#332830');

  // Pedals (bottom center)
  p(ctx, 0, 0, cx - 2, H - 2, '#aa9944');
  p(ctx, 0, 0, cx, H - 2, '#aa9944');
  p(ctx, 0, 0, cx + 2, H - 2, '#aa9944');

  // Bench in front
  b(ctx, 0, 0, cx - 8, H - 4, 16, 3, '#3a2828');
  b(ctx, 0, 0, cx - 7, H - 4, 14, 1, '#4a3838');
  b(ctx, 0, 0, cx - 7, H - 3, 14, 1, '#553838');
}

function drawHarmonicDrumKit(ctx: CanvasRenderingContext2D) {
  const W = gw(3), H = gh(3);
  const cx = Math.floor(W / 2);

  // Drum throne (seat) at bottom
  b(ctx, 0, 0, cx - 4, H - 8, 8, 4, '#333333');
  b(ctx, 0, 0, cx - 3, H - 8, 6, 1, '#444444');
  // Throne legs
  p(ctx, 0, 0, cx - 3, H - 4, '#555555');
  p(ctx, 0, 0, cx + 2, H - 4, '#555555');
  b(ctx, 0, 0, cx - 4, H - 3, 8, 1, '#444444');

  // Bass drum (large circle, center) — top view, so oval
  b(ctx, 0, 0, cx - 10, 10, 20, 16, '#884422');
  b(ctx, 0, 0, cx - 9, 11, 18, 14, '#993322');
  b(ctx, 0, 0, cx - 8, 12, 16, 12, '#aa4433');
  // Drum head
  b(ctx, 0, 0, cx - 7, 13, 14, 10, '#ccbbaa');
  b(ctx, 0, 0, cx - 6, 14, 12, 8, '#ddccbb');
  // Bass drum ring
  for (let x = cx - 8; x <= cx + 8; x++) {
    p(ctx, 0, 0, x, 12, '#777777');
    p(ctx, 0, 0, x, 24, '#777777');
  }
  // Logo / brand circle on bass drum
  b(ctx, 0, 0, cx - 3, 16, 6, 4, '#bbaa99');
  b(ctx, 0, 0, cx - 2, 17, 4, 2, '#aa9988');

  // Snare drum (left front)
  b(ctx, 0, 0, 4, 18, 10, 8, '#996633');
  b(ctx, 0, 0, 5, 19, 8, 6, '#ccbbaa');
  b(ctx, 0, 0, 6, 20, 6, 4, '#ddccbb');
  // Snare rim
  b(ctx, 0, 0, 4, 18, 10, 1, '#aaaaaa');
  b(ctx, 0, 0, 4, 25, 10, 1, '#999999');

  // Tom-toms (right side, two small drums)
  // High tom
  b(ctx, 0, 0, W - 14, 6, 8, 6, '#884422');
  b(ctx, 0, 0, W - 13, 7, 6, 4, '#ccbbaa');
  b(ctx, 0, 0, W - 12, 8, 4, 2, '#ddccbb');
  b(ctx, 0, 0, W - 14, 6, 8, 1, '#999999');
  // Mid tom
  b(ctx, 0, 0, W - 12, 14, 8, 7, '#884422');
  b(ctx, 0, 0, W - 11, 15, 6, 5, '#ccbbaa');
  b(ctx, 0, 0, W - 10, 16, 4, 3, '#ddccbb');
  b(ctx, 0, 0, W - 12, 14, 8, 1, '#999999');

  // Hi-hat (far left, small)
  b(ctx, 0, 0, 2, 6, 8, 2, '#ccaa44');
  b(ctx, 0, 0, 3, 7, 6, 1, '#ddbb55');
  // Hi-hat stand
  p(ctx, 0, 0, 5, 8, '#777777');
  p(ctx, 0, 0, 5, 9, '#777777');
  p(ctx, 0, 0, 5, 10, '#777777');
  // Top cymbal
  b(ctx, 0, 0, 2, 4, 8, 2, '#ddbb55');
  b(ctx, 0, 0, 3, 4, 6, 1, '#eedd66');
  p(ctx, 0, 0, 5, 4, '#ffee77');

  // Crash cymbal (upper right)
  b(ctx, 0, 0, W - 10, 0, 10, 3, '#ccaa44');
  b(ctx, 0, 0, W - 9, 1, 8, 1, '#ddbb55');
  p(ctx, 0, 0, W - 6, 0, '#eedd66');
  // Cymbal stand
  p(ctx, 0, 0, W - 6, 3, '#777777');
  p(ctx, 0, 0, W - 6, 4, '#777777');
  p(ctx, 0, 0, W - 6, 5, '#777777');

  // Ride cymbal (upper left-center)
  b(ctx, 0, 0, cx - 2, 0, 10, 3, '#bbaa44');
  b(ctx, 0, 0, cx - 1, 1, 8, 1, '#ccbb55');
  p(ctx, 0, 0, cx + 2, 0, '#ddcc66');
  // Stand
  p(ctx, 0, 0, cx + 2, 3, '#777777');
  p(ctx, 0, 0, cx + 2, 4, '#777777');

  // Floor tom (bottom right)
  b(ctx, 0, 0, W - 12, 24, 10, 8, '#884422');
  b(ctx, 0, 0, W - 11, 25, 8, 6, '#ccbbaa');
  b(ctx, 0, 0, W - 10, 26, 6, 4, '#ddccbb');
  b(ctx, 0, 0, W - 12, 24, 10, 1, '#999999');
  // Legs
  p(ctx, 0, 0, W - 12, 31, '#666666');
  p(ctx, 0, 0, W - 4, 31, '#666666');

  // Hardware / stands visible
  p(ctx, 0, 0, cx, 28, '#666666');
  p(ctx, 0, 0, cx, 29, '#666666');
}

// ===================== VOID =====================

function drawVoidSlotMachine(ctx: CanvasRenderingContext2D) {
  const W = gw(3), H = gh(4);
  const cx = Math.floor(W / 2);

  // Machine body — dark cabinet
  b(ctx, 0, 0, 4, 6, W - 8, H - 10, '#1a1028');
  b(ctx, 0, 0, 5, 7, W - 10, H - 12, '#221438');
  // Frame
  b(ctx, 0, 0, 4, 6, W - 8, 1, '#332244');
  b(ctx, 0, 0, 4, H - 5, W - 8, 1, '#332244');
  b(ctx, 0, 0, 4, 6, 1, H - 10, '#332244');
  b(ctx, 0, 0, W - 5, 6, 1, H - 10, '#332244');

  // Top marquee with neon lights
  b(ctx, 0, 0, 2, 0, W - 4, 6, '#2a1444');
  b(ctx, 0, 0, 3, 1, W - 6, 4, '#331855');
  // Neon border
  b(ctx, 0, 0, 2, 0, W - 4, 1, '#ff44cc');
  b(ctx, 0, 0, 2, 5, W - 4, 1, '#ff44cc');
  b(ctx, 0, 0, 2, 0, 1, 6, '#cc22aa');
  b(ctx, 0, 0, W - 3, 0, 1, 6, '#cc22aa');
  // "777" text
  p(ctx, 0, 0, cx - 4, 2, '#ffdd44');
  p(ctx, 0, 0, cx - 3, 1, '#ffdd44');
  p(ctx, 0, 0, cx - 2, 2, '#ffdd44');
  p(ctx, 0, 0, cx, 2, '#ffdd44');
  p(ctx, 0, 0, cx + 1, 1, '#ffdd44');
  p(ctx, 0, 0, cx + 2, 2, '#ffdd44');

  // Three reels display window
  const reelY = 14, reelH = 16;
  b(ctx, 0, 0, 7, reelY, W - 14, reelH, '#0a0818');
  // Reel dividers
  const reelW = Math.floor((W - 16) / 3);
  for (let i = 1; i < 3; i++) {
    b(ctx, 0, 0, 7 + i * reelW, reelY, 1, reelH, '#444466');
  }

  // Symbols on reels (cherry, seven, bar)
  // Reel 1 — cherry (red)
  const r1x = 8 + Math.floor(reelW / 2) - 2;
  b(ctx, 0, 0, r1x, reelY + 5, 4, 4, '#cc2244');
  p(ctx, 0, 0, r1x + 1, reelY + 4, '#22aa44'); // stem
  p(ctx, 0, 0, r1x + 2, reelY + 4, '#22aa44');
  p(ctx, 0, 0, r1x + 1, reelY + 6, '#ff4466'); // highlight

  // Reel 2 — seven (gold)
  const r2x = 8 + reelW + Math.floor(reelW / 2) - 2;
  b(ctx, 0, 0, r2x, reelY + 4, 4, 1, '#ffdd44');
  b(ctx, 0, 0, r2x + 2, reelY + 5, 2, 2, '#ffdd44');
  b(ctx, 0, 0, r2x + 1, reelY + 7, 2, 2, '#ffdd44');
  p(ctx, 0, 0, r2x + 1, reelY + 8, '#ffcc22');

  // Reel 3 — bar (purple void energy)
  const r3x = 8 + 2 * reelW + Math.floor(reelW / 2) - 3;
  b(ctx, 0, 0, r3x, reelY + 5, 6, 3, '#8844cc');
  b(ctx, 0, 0, r3x + 1, reelY + 6, 4, 1, '#aa66ee');

  // Payline arrow
  p(ctx, 0, 0, 6, reelY + 7, '#ff4444');
  p(ctx, 0, 0, W - 7, reelY + 7, '#ff4444');

  // Pull lever (right side)
  b(ctx, 0, 0, W - 4, 12, 2, 20, '#888888');
  b(ctx, 0, 0, W - 4, 12, 2, 1, '#aaaaaa');
  // Lever ball
  b(ctx, 0, 0, W - 5, 10, 4, 3, '#cc2222');
  b(ctx, 0, 0, W - 4, 10, 2, 1, '#ff4444');

  // Coin slot
  b(ctx, 0, 0, cx - 2, H - 12, 4, 2, '#444444');
  b(ctx, 0, 0, cx - 1, H - 12, 2, 1, '#666666');

  // Coin tray at bottom
  b(ctx, 0, 0, 6, H - 8, W - 12, 4, '#2a1a3a');
  b(ctx, 0, 0, 7, H - 7, W - 14, 2, '#1a1028');
  // Coins
  p(ctx, 0, 0, cx - 4, H - 7, '#ffdd44');
  p(ctx, 0, 0, cx + 1, H - 6, '#ffdd44');
  p(ctx, 0, 0, cx - 1, H - 7, '#ffcc22');

  // Base
  b(ctx, 0, 0, 2, H - 4, W - 4, 4, '#1a1028');
  b(ctx, 0, 0, 3, H - 3, W - 6, 2, '#221438');

  // Neon glow spots (void theme)
  p(ctx, 0, 0, 5, 10, '#8844cc');
  p(ctx, 0, 0, W - 6, 10, '#8844cc');
  p(ctx, 0, 0, 5, H - 10, '#6622aa');
  p(ctx, 0, 0, W - 6, H - 10, '#6622aa');
}

// ===================== Structure Registry =====================

const structures: StructureDef[] = [
  // Military
  { key: 'military_hq', label: 'Military HQ (5x4)', faction: 'Military', widthCells: 5, heightCells: 4, draw: drawMilitaryHQ },
  { key: 'military_barracks', label: 'Military Barracks (5x3)', faction: 'Military', widthCells: 5, heightCells: 3, draw: drawMilitaryBarracks },
  { key: 'military_motor_pool', label: 'Military Motor Pool (5x4)', faction: 'Military', widthCells: 5, heightCells: 4, draw: drawMilitaryMotorPool },
  { key: 'military_supply_depot', label: 'Military Supply Depot (5x3)', faction: 'Military', widthCells: 5, heightCells: 3, draw: drawMilitarySupplyDepot },
  { key: 'military_comms_tower', label: 'Military Comms Tower (2x5)', faction: 'Military', widthCells: 2, heightCells: 5, draw: drawMilitaryCommsTower },
  // Psionic
  { key: 'psionic_brain_vat', label: 'Psionic Brain Vat (3x5)', faction: 'Psionic', widthCells: 3, heightCells: 5, draw: drawPsionicBrainVat },
  { key: 'psionic_thought_amp', label: 'Psionic Thought Amplifier (2x3)', faction: 'Psionic', widthCells: 2, heightCells: 3, draw: drawPsionicThoughtAmp },
  { key: 'psionic_memory_bank', label: 'Psionic Memory Bank (3x3)', faction: 'Psionic', widthCells: 3, heightCells: 3, draw: drawPsionicMemoryBank },
  // Infernal
  { key: 'infernal_throne', label: 'Infernal Throne (7x4)', faction: 'Infernal', widthCells: 7, heightCells: 4, draw: drawInfernalThrone },
  { key: 'infernal_spire', label: 'Infernal Spire (2x5)', faction: 'Infernal', widthCells: 2, heightCells: 5, draw: drawInfernalSpire },
  { key: 'infernal_altar', label: 'Infernal Altar (5x3)', faction: 'Infernal', widthCells: 5, heightCells: 3, draw: drawInfernalAltar },
  // Arcane
  { key: 'arcane_wizard_tower', label: 'Arcane Wizard Tower (3x5)', faction: 'Arcane', widthCells: 3, heightCells: 5, draw: drawArcaneWizardTower },
  // Mechanical
  { key: 'mech_furnace', label: 'Mech Furnace (6x6)', faction: 'Mechanical', widthCells: 6, heightCells: 6, draw: drawMechFurnace },
  { key: 'mech_press', label: 'Mech Press (8x5)', faction: 'Mechanical', widthCells: 8, heightCells: 5, draw: drawMechPress },
  // Nature
  { key: 'nature_ancient_tree', label: 'Nature Ancient Tree (7x7)', faction: 'Nature', widthCells: 7, heightCells: 7, draw: drawNatureAncientTree },
  // Cypherpunk
  { key: 'cyber_mainframe', label: 'Cyber Mainframe (3x6)', faction: 'Cypherpunk', widthCells: 3, heightCells: 6, draw: drawCyberMainframe },
  // Celestial
  { key: 'celestial_sanctum', label: 'Celestial Sanctum (12x2)', faction: 'Celestial', widthCells: 12, heightCells: 2, draw: drawCelestialSanctum },
  { key: 'celestial_gate_pillar', label: 'Celestial Gate Pillar (2x3)', faction: 'Celestial', widthCells: 2, heightCells: 3, draw: drawCelestialGatePillar },
  // Aliens
  { key: 'alien_queen_chamber', label: 'Alien Queen Chamber (7x7)', faction: 'Aliens', widthCells: 7, heightCells: 7, draw: drawAlienQueenChamber },
  // Harmonic
  { key: 'harmonic_grand_piano', label: 'Harmonic Grand Piano (3x3)', faction: 'Harmonic', widthCells: 3, heightCells: 3, draw: drawHarmonicGrandPiano },
  { key: 'harmonic_drum_kit', label: 'Harmonic Drum Kit (3x3)', faction: 'Harmonic', widthCells: 3, heightCells: 3, draw: drawHarmonicDrumKit },
  // Void
  { key: 'void_slot_machine', label: 'Void Slot Machine (3x4)', faction: 'Void', widthCells: 3, heightCells: 4, draw: drawVoidSlotMachine },
];

// ===================== Component =====================

export default function LargeStructureSprites() {
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const previewRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<'preview' | 'actual'>('preview');

  useEffect(() => {
    for (const s of structures) {
      const canvas = canvasRefs.current.get(s.key);
      if (!canvas) continue;

      const pw = s.widthCells * T;
      const ph = s.heightCells * T;
      canvas.width = pw;
      canvas.height = ph;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, pw, ph);
      s.draw(ctx);

      // Preview at 3x
      const preview = previewRefs.current.get(s.key);
      if (preview) {
        const scale = 3;
        preview.width = pw * scale;
        preview.height = ph * scale;
        const pCtx = preview.getContext('2d')!;
        pCtx.imageSmoothingEnabled = false;
        pCtx.fillStyle = '#111110';
        pCtx.fillRect(0, 0, preview.width, preview.height);
        pCtx.drawImage(canvas, 0, 0, pw * scale, ph * scale);
      }
    }
    setReady(true);
  }, []);

  const download = (key: string) => {
    const canvas = canvasRefs.current.get(key);
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = `${key}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  };

  const downloadAll = () => {
    for (const s of structures) {
      download(s.key);
    }
  };

  const setCanvasRef = (key: string) => (el: HTMLCanvasElement | null) => {
    if (el) canvasRefs.current.set(key, el);
  };
  const setPreviewRef = (key: string) => (el: HTMLCanvasElement | null) => {
    if (el) previewRefs.current.set(key, el);
  };

  const btnStyle: React.CSSProperties = {
    marginRight: 8,
    background: '#2a2828',
    color: '#aa8844',
    border: '1px solid #aa8844',
    padding: '4px 12px',
    cursor: 'pointer',
    fontFamily: 'monospace',
  };
  const activeBtnStyle: React.CSSProperties = { ...btnStyle, background: '#aa8844', color: '#111110' };

  // Group by faction
  const factions = ['Military', 'Psionic', 'Infernal', 'Arcane', 'Mechanical', 'Nature', 'Cypherpunk', 'Celestial', 'Aliens', 'Harmonic', 'Void'];
  const factionColors: Record<string, string> = {
    Military: '#8a9a60',
    Psionic: '#aa66cc',
    Infernal: '#cc4422',
    Arcane: '#8844cc',
    Mechanical: '#aa8844',
    Nature: '#44aa44',
    Cypherpunk: '#44ccaa',
    Celestial: '#ddcc88',
    Aliens: '#44cc88',
    Harmonic: '#cc8844',
    Void: '#8844aa',
  };

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', color: '#aa8844', background: '#111110' }}>
      <h2>Large Multi-Tile Structure Sprites — Gauntlet Maps</h2>
      <div style={{ marginBottom: 10 }}>
        <button onClick={() => setView('preview')} style={view === 'preview' ? activeBtnStyle : btnStyle}>Preview (3x)</button>
        <button onClick={() => setView('actual')} style={view === 'actual' ? activeBtnStyle : btnStyle}>Actual Size</button>
        {ready && (
          <button onClick={downloadAll} style={btnStyle}>Download All</button>
        )}
      </div>
      <p style={{ fontSize: '12px', color: '#665533' }}>
        PX=2 | Tile=28x28 | Grid=14x14 per tile | {structures.length} structures across {factions.length} factions
      </p>

      {factions.map(faction => (
        <div key={faction} style={{ marginTop: 20 }}>
          <h3 style={{ color: factionColors[faction], borderBottom: `1px solid ${factionColors[faction]}44`, paddingBottom: 4 }}>
            {faction} Structures
          </h3>
          {structures.filter(s => s.faction === faction).map(s => (
            <div key={s.key} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: '13px', color: '#888' }}>{s.label}</span>
                <span style={{ fontSize: '10px', color: '#555', marginLeft: 8 }}>
                  {s.widthCells * T}x{s.heightCells * T}px ({s.widthCells * G}x{s.heightCells * G} grid)
                </span>
                {ready && (
                  <button onClick={() => download(s.key)} style={{ ...btnStyle, marginLeft: 12, padding: '2px 8px', fontSize: '11px' }}>
                    Download
                  </button>
                )}
              </div>
              <canvas
                ref={setPreviewRef(s.key)}
                style={{ display: view === 'preview' ? 'block' : 'none', border: '1px solid #aa884433' }}
              />
              <canvas
                ref={setCanvasRef(s.key)}
                data-label={s.key}
                style={{ display: view === 'actual' ? 'block' : 'none', imageRendering: 'pixelated', border: '1px solid #aa884433' }}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
