/**
 * Large Multi-Tile Structure Sprite Generator — Gauntlet Maps
 *
 * Generates 11 large structures across 3 factions:
 *   Military (5): HQ, Barracks, Motor Pool, Supply Depot, Comms Tower
 *   Psionic (3): Brain Vat, Thought Amplifier, Memory Bank
 *   Infernal (3): Throne, Spire, Altar
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
  const factions = ['Military', 'Psionic', 'Infernal'];
  const factionColors: Record<string, string> = {
    Military: '#8a9a60',
    Psionic: '#aa66cc',
    Infernal: '#cc4422',
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
