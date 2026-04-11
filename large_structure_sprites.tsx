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

export interface StructureDef {
  key: string;
  label: string;
  faction: string;
  widthCells: number;
  heightCells: number;
  animFrames: number;
  draw: (ctx: CanvasRenderingContext2D, frame: number) => void;
}

// Grid dimensions for each structure (in grid units, not pixels)
function gw(cells: number) { return cells * G; }
function gh(cells: number) { return cells * G; }

// ===================== MILITARY =====================

function drawMilitaryHQ(ctx: CanvasRenderingContext2D, frame: number) {
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
  // Flag — waves per frame
  if (frame === 0) {
    b(ctx, 0, 0, fpx + 1, 0, 3, 2, '#556633');
    p(ctx, 0, 0, fpx + 2, 0, '#667744');
  } else if (frame === 1) {
    b(ctx, 0, 0, fpx + 1, 1, 3, 2, '#556633');
    p(ctx, 0, 0, fpx + 3, 1, '#667744');
  } else {
    b(ctx, 0, 0, fpx + 1, 0, 4, 2, '#556633');
    p(ctx, 0, 0, fpx + 2, 1, '#667744');
  }

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

function drawMilitaryBarracks(ctx: CanvasRenderingContext2D, frame: number) {
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
  // Vent fan animation
  const vfx = bx + 4;
  if (frame === 1) { p(ctx, 0, 0, vfx + 1, by - 3, '#555550'); p(ctx, 0, 0, vfx + 2, by - 2, '#555550'); }
  else if (frame === 2) { p(ctx, 0, 0, vfx + 2, by - 3, '#555550'); p(ctx, 0, 0, vfx + 1, by - 2, '#555550'); }
}

function drawMilitaryMotorPool(ctx: CanvasRenderingContext2D, frame: number) {
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
  // Exhaust puff from roof
  const puffY = by - 2 - frame * 3;
  if (puffY > 0) { p(ctx, 0, 0, bx + bw - 4, puffY, '#66665544'); p(ctx, 0, 0, bx + bw - 3, puffY - 1, '#55554433'); }
}

function drawMilitarySupplyDepot(ctx: CanvasRenderingContext2D, frame: number) {
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
  // Loading dock light blinks
  p(ctx, 0, 0, ldx + 6, ldy - 2, frame === 0 ? '#ffaa00' : frame === 1 ? '#885500' : '#332200');
}

function drawMilitaryCommsTower(ctx: CanvasRenderingContext2D, frame: number) {
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

  // Red warning light at peak — pulses per frame
  p(ctx, 0, 0, tcx, 0, frame === 0 ? '#ff2222' : frame === 1 ? '#aa1111' : '#551111');

  // Cable runs down sides
  for (let y = 6; y < sy; y += 3) {
    p(ctx, 0, 0, tcx + 2, y, '#444444');
  }

  // Ground
  b(ctx, 0, 0, 0, H - 2, W, 2, '#3a3830');
}

// ===================== PSIONIC =====================

function drawPsionicBrainVat(ctx: CanvasRenderingContext2D, frame: number) {
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

  // Bubbles in fluid — shift per frame
  const bubOff = frame;
  p(ctx, 0, 0, cx - 4, brainCy - 8 - bubOff, '#4488aa');
  p(ctx, 0, 0, cx + 3, brainCy - 6 - bubOff, '#4488aa');
  p(ctx, 0, 0, cx - 2, brainCy + 7 - bubOff, '#3377aa');
  p(ctx, 0, 0, cx + 1, brainCy + 9 - bubOff, '#3377aa');
  p(ctx, 0, 0, cx + 4, brainCy + 5 - bubOff, '#4488aa');

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

function drawPsionicThoughtAmp(ctx: CanvasRenderingContext2D, frame: number) {
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

  // Pulsing energy rings — shift per frame
  const ringYs = [12 + frame, 20 + frame, 28 + frame, 36 + frame];
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

function drawPsionicMemoryBank(ctx: CanvasRenderingContext2D, frame: number) {
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
  // Screen content (scrolling data) — shifts per frame
  b(ctx, 0, 0, tx + 2 + frame, H - 7, 5 - frame, 1, '#22aa55');
  b(ctx, 0, 0, tx + 3, H - 6, 3, 1, '#22aa55');
  b(ctx, 0, 0, tx + 2, H - 5 + frame, 4, 1, '#22aa55');
  // LED animation per frame
  for (let row = 0; row < 4; row++) {
    const ry = 3 + row * 8;
    const ledX = 5 + ((frame + row) % 3) * 6;
    if (ledX + 2 < W - 3) p(ctx, 0, 0, ledX, ry + 1, '#ffffff');
  }

  // Base
  b(ctx, 0, 0, 0, H - 2, W, 2, '#1a1520');
}

// ===================== INFERNAL =====================

function drawInfernalThrone(ctx: CanvasRenderingContext2D, frame: number) {
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
    // Fire — flickers per frame
    if (frame === 0) {
      b(ctx, 0, 0, bpx + 1, H - 21, 4, 3, '#ff6622');
      b(ctx, 0, 0, bpx + 2, H - 22, 2, 1, '#ffcc44');
      p(ctx, 0, 0, bpx + 2, H - 23, '#ffaa22');
    } else if (frame === 1) {
      b(ctx, 0, 0, bpx + 1, H - 22, 4, 4, '#ff6622');
      p(ctx, 0, 0, bpx + 1, H - 23, '#ffcc44');
      p(ctx, 0, 0, bpx + 3, H - 24, '#ffaa22');
    } else {
      b(ctx, 0, 0, bpx + 1, H - 20, 4, 2, '#ff6622');
      b(ctx, 0, 0, bpx + 2, H - 21, 2, 1, '#ff8811');
      p(ctx, 0, 0, bpx + 2, H - 22, '#ffcc44');
    }
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

function drawInfernalSpire(ctx: CanvasRenderingContext2D, frame: number) {
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

  // Orange glow from within (cracks) — pulses per frame
  const glowA = frame === 0 ? '#ff6622' : frame === 1 ? '#ff8844' : '#cc4411';
  const glowB = frame === 0 ? '#cc4411' : frame === 1 ? '#ff6622' : '#ff8844';
  p(ctx, 0, 0, cx, H - 18, glowA);
  p(ctx, 0, 0, cx - 1, H - 26, glowB);
  p(ctx, 0, 0, cx + 1, H - 30, glowA);
  p(ctx, 0, 0, cx, H - 38, glowB);
  p(ctx, 0, 0, cx - 1, H - 42, glowA);
  p(ctx, 0, 0, cx + 1, H - 48, glowB);
  p(ctx, 0, 0, cx, H - 54, glowA);
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

function drawInfernalAltar(ctx: CanvasRenderingContext2D, frame: number) {
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
    // Fire/candle — frame-dependent
    const fOff = (frame + brazierPos.indexOf(brazierPos.find(bp => bp[0] === bpx)!)) % 3;
    if (fOff === 0) { b(ctx, 0, 0, bpx + 1, bpy - 2, 2, 2, '#ff6622'); p(ctx, 0, 0, bpx + 1, bpy - 3, '#ffcc44'); }
    else if (fOff === 1) { b(ctx, 0, 0, bpx + 1, bpy - 3, 2, 3, '#ff6622'); p(ctx, 0, 0, bpx + 2, bpy - 4, '#ffcc44'); }
    else { b(ctx, 0, 0, bpx + 1, bpy - 2, 2, 2, '#ff8833'); p(ctx, 0, 0, bpx + 1, bpy - 3, '#ff6622'); }
  }

  // Ground (dark stone)
  b(ctx, 0, 0, 0, H - 2, W, 2, '#1a1214');
  b(ctx, 0, 0, 0, 0, W, 2, '#1a1214');
}

// ===================== ARCANE =====================

function drawArcaneWizardTower(ctx: CanvasRenderingContext2D, frame: number) {
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
      // Inner glow — color cycles per frame
      const wglow = frame === 0 ? '#6644cc' : frame === 1 ? '#4466cc' : '#44ccaa';
      const whi = frame === 0 ? '#aa88ff' : frame === 1 ? '#88aaff' : '#88ffcc';
      b(ctx, 0, 0, cx - 2, wy + 1, 4, 2, wglow);
      b(ctx, 0, 0, cx - 1, wy, 2, 1, '#8866ee');
      p(ctx, 0, 0, cx, wy + 1, whi);
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

  // Crystal orb at peak — twinkles
  p(ctx, 0, 0, cx, 0, frame === 1 ? '#ffffff' : '#ccaaff');

  // Door at base
  b(ctx, 0, 0, cx - 3, H - 10, 6, 4, '#1a0a33');
  b(ctx, 0, 0, cx - 2, H - 11, 4, 1, '#1a0a33');
  p(ctx, 0, 0, cx - 1, H - 12, '#1a0a33');
  p(ctx, 0, 0, cx, H - 12, '#1a0a33');
  // Door handle glow
  p(ctx, 0, 0, cx + 1, H - 8, '#aa88ff');
}

// ===================== MECHANICAL =====================

function drawMechFurnace(ctx: CanvasRenderingContext2D, frame: number) {
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
    // Smoke wisps — shift per frame
    p(ctx, 0, 0, sx + 2 + frame, 0 - frame, '#555550');
    if (frame > 0) p(ctx, 0, 0, sx + 1, 0, '#44444033');
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

function drawMechPress(ctx: CanvasRenderingContext2D, frame: number) {
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

  // Die / press head — moves per frame
  const dieY = fy + 28 + frame * 2;
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

function drawNatureAncientTree(ctx: CanvasRenderingContext2D, frame: number) {
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

  // Knotholes — bird peeks out per frame
  b(ctx, 0, 0, cx - 3, cy - 2, 3, 2, '#3a2010');
  b(ctx, 0, 0, cx - 2, cy - 2, 1, 1, '#2a1808');
  b(ctx, 0, 0, cx + 2, cy + 4, 2, 3, '#3a2010');
  p(ctx, 0, 0, cx + 2, cy + 5, '#2a1808');
  if (frame === 1) { p(ctx, 0, 0, cx - 3, cy - 2, '#222222'); p(ctx, 0, 0, cx - 2, cy - 2, '#222222'); } // eyes
  if (frame === 2) { p(ctx, 0, 0, cx - 3, cy - 2, '#222222'); p(ctx, 0, 0, cx - 2, cy - 2, '#222222'); p(ctx, 0, 0, cx - 2, cy - 1, '#ffaa22'); } // eyes + beak

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

function drawCyberMainframe(ctx: CanvasRenderingContext2D, frame: number) {
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

    // LED indicators (blinking lights pattern) — frame dependent
    const ledColors = ['#00ff44', '#00ff44', '#ffaa00', '#00ff44', '#ff2222', '#00ff44'];
    for (let l = 0; l < 4; l++) {
      const lx = rackX + 4 + l * 3;
      if (lx < rackX + rackW - 4) {
        p(ctx, 0, 0, lx, uy + 1, ledColors[(i + l + frame) % ledColors.length]);
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

function drawCelestialSanctum(ctx: CanvasRenderingContext2D, frame: number) {
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

  // Central ornament (star / sunburst) — pulses per frame
  const starBright = frame === 0 ? '#ffdd88' : frame === 1 ? '#ffffff' : '#eebb66';
  const starDim = frame === 0 ? '#eebb66' : frame === 1 ? '#ffdd88' : '#ccaa55';
  p(ctx, 0, 0, cx, 6, starBright);
  p(ctx, 0, 0, cx - 1, 6, starDim);
  p(ctx, 0, 0, cx + 1, 6, starDim);
  p(ctx, 0, 0, cx, 5, starDim);
  p(ctx, 0, 0, cx, 7, starDim);
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

function drawCelestialGatePillar(ctx: CanvasRenderingContext2D, frame: number) {
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

  // Ornamental top — flame flickers per frame
  if (frame === 0) {
    b(ctx, 0, 0, cx - 2, 1, 4, 3, '#ffdd88'); b(ctx, 0, 0, cx - 1, 0, 2, 2, '#ffee99'); p(ctx, 0, 0, cx, 0, '#ffffbb');
  } else if (frame === 1) {
    b(ctx, 0, 0, cx - 2, 0, 4, 4, '#ffdd88'); p(ctx, 0, 0, cx - 1, 0, '#ffffbb');
  } else {
    b(ctx, 0, 0, cx - 1, 1, 3, 3, '#ffdd88'); p(ctx, 0, 0, cx, 0, '#ffee99');
  }
  p(ctx, 0, 0, cx - 2, 2, '#eebb66');
  p(ctx, 0, 0, cx + 1, 2, '#eebb66');

  // Column base (torus molding)
  b(ctx, 0, 0, colX - 1, H - 8, colW + 2, 2, '#d8d0c0');
  b(ctx, 0, 0, colX - 1, H - 8, colW + 2, 1, '#e0d8c8');
}

// ===================== ALIENS =====================

function drawAlienQueenChamber(ctx: CanvasRenderingContext2D, frame: number) {
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

  // Mandibles — click per frame
  const mandOff = frame === 1 ? 1 : 0;
  b(ctx, 0, 0, cx - 4 - mandOff, cy - 3, 2, 3, '#331830');
  b(ctx, 0, 0, cx + 2 + mandOff, cy - 3, 2, 3, '#331830');
  p(ctx, 0, 0, cx - 5 - mandOff, cy - 1, '#442040');
  p(ctx, 0, 0, cx + 4 + mandOff, cy - 1, '#442040');

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

function drawHarmonicGrandPiano(ctx: CanvasRenderingContext2D, frame: number) {
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
  // Keys depress + floating notes per frame
  if (frame === 1) { b(ctx, 0, 0, keysX + 6, keysY + 1, 2, 3, '#c8c0b8'); }
  if (frame === 2) { b(ctx, 0, 0, keysX + 14, keysY + 1, 2, 3, '#c8c0b8'); }
  // Floating notes
  if (frame > 0) { p(ctx, 0, 0, cx - 4, keysY - 8 - frame * 3, '#aa8866'); p(ctx, 0, 0, cx + 2, keysY - 6 - frame * 2, '#aa8866'); }

  // Bench in front
  b(ctx, 0, 0, cx - 8, H - 4, 16, 3, '#3a2828');
  b(ctx, 0, 0, cx - 7, H - 4, 14, 1, '#4a3838');
  b(ctx, 0, 0, cx - 7, H - 3, 14, 1, '#553838');
}

function drawHarmonicDrumKit(ctx: CanvasRenderingContext2D, frame: number) {
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
  // Drumstick hits per frame
  if (frame === 0) { p(ctx, 0, 0, 7, 20, '#ffffff'); p(ctx, 0, 0, 8, 21, '#ddddcc'); } // snare hit
  if (frame === 1) { p(ctx, 0, 0, cx, 17, '#ffffff'); p(ctx, 0, 0, cx + 1, 18, '#ddddcc'); } // bass hit
  if (frame === 2) { p(ctx, 0, 0, W - 10, 16, '#ffffff'); p(ctx, 0, 0, W - 9, 17, '#ddddcc'); } // tom hit
}

// ===================== VOID =====================

function drawVoidSlotMachine(ctx: CanvasRenderingContext2D, frame: number) {
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

  // Symbols on reels (cherry, seven, bar) — scroll per frame
  const reelScroll = frame * 3;
  // Reel 1 — cherry (red)
  const r1x = 8 + Math.floor(reelW / 2) - 2;
  b(ctx, 0, 0, r1x, reelY + 5 + reelScroll, 4, 4, '#cc2244');
  p(ctx, 0, 0, r1x + 1, reelY + 4 + reelScroll, '#22aa44');
  p(ctx, 0, 0, r1x + 2, reelY + 4 + reelScroll, '#22aa44');
  p(ctx, 0, 0, r1x + 1, reelY + 6 + reelScroll, '#ff4466');

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


// ===================== MILITARY NEW =====================

function drawMilitaryGuardTower(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(2), H = gh(3);
  // Base foundation
  b(ctx, 0, 0, 2, H - 6, W - 4, 6, '#4a4a42');
  b(ctx, 0, 0, 4, H - 8, W - 8, 2, '#5a5a52');
  // Tower body
  b(ctx, 0, 0, 6, 12, W - 12, H - 20, '#5a5a52');
  b(ctx, 0, 0, 8, 14, W - 16, H - 24, '#636357');
  for (let yy = 16; yy < H - 10; yy += 4) b(ctx, 0, 0, 7, yy, W - 14, 1, '#4a4a42');
  b(ctx, 0, 0, 10, 20, 2, 4, '#1a1a14');
  b(ctx, 0, 0, W - 12, 20, 2, 4, '#1a1a14');
  for (let xx = 4; xx < W - 4; xx += 5) b(ctx, 0, 0, xx, 8, 3, 4, '#5a5a52');
  b(ctx, 0, 0, 3, 10, W - 6, 2, '#4a4a42');
  // Searchlight
  b(ctx, 0, 0, W / 2 - 3, 4, 6, 4, '#6b6b5f');
  b(ctx, 0, 0, W / 2 - 2, 5, 4, 2, '#aaaaaa');
  if (frame === 0) { b(ctx, 0, 0, 0, 0, 6, 3, '#ffff6633'); p(ctx, 0, 0, W / 2 - 5, 3, '#ffff66'); }
  else if (frame === 1) { b(ctx, 0, 0, W / 2 - 4, 0, 8, 4, '#ffff6633'); }
  else { b(ctx, 0, 0, W - 6, 0, 6, 3, '#ffff6633'); p(ctx, 0, 0, W / 2 + 5, 3, '#ffff66'); }
  b(ctx, 0, 0, W / 2 - 3, H - 8, 6, 8, '#3a3830');
  b(ctx, 0, 0, W / 2 - 2, H - 7, 4, 6, '#2a2820');
  p(ctx, 0, 0, W / 2 + 1, H - 4, '#888877');
}

function drawMilitaryAmmoBunker(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(3), H = gh(3);
  b(ctx, 0, 0, 0, H / 2, W, H / 2, '#4a4a3a');
  b(ctx, 0, 0, 0, H / 2 - 2, W, 4, '#5a5a42');
  b(ctx, 0, 0, 4, H / 2 - 6, W - 8, 8, '#6b6b63');
  b(ctx, 0, 0, 6, H / 2 - 8, W - 12, 4, '#7a7a72');
  b(ctx, 0, 0, 3, H / 2 - 6, 2, 8, '#5a5a52');
  b(ctx, 0, 0, W - 5, H / 2 - 6, 2, 8, '#5a5a52');
  b(ctx, 0, 0, W / 2 - 6, H / 2, 12, 10, '#3a3a32');
  b(ctx, 0, 0, W / 2 - 5, H / 2 + 1, 10, 8, '#4a4a42');
  p(ctx, 0, 0, W / 2 - 4, H / 2 + 2, '#888877');
  p(ctx, 0, 0, W / 2 + 4, H / 2 + 2, '#888877');
  b(ctx, 0, 0, W / 2 + 1, H / 2 + 4, 3, 2, '#666655');
  for (let yy = H / 2; yy < H / 2 + 10; yy += 3) { p(ctx, 0, 0, W / 2 - 6, yy, '#ccaa00'); p(ctx, 0, 0, W / 2 + 5, yy, '#ccaa00'); }
  b(ctx, 0, 0, W / 2 - 1, H / 2 - 10, 3, 3, '#444444');
  if (frame === 0) { b(ctx, 0, 0, W / 2 - 1, H / 2 - 12, 3, 3, '#ff2200'); p(ctx, 0, 0, W / 2, H / 2 - 13, '#ff6644'); }
  else if (frame === 1) { b(ctx, 0, 0, W / 2 - 1, H / 2 - 12, 3, 3, '#882200'); }
  else { b(ctx, 0, 0, W / 2 - 1, H / 2 - 12, 3, 3, '#331100'); }
  b(ctx, 0, 0, 8, H - 6, 5, 4, '#5a6a3a');
  b(ctx, 0, 0, W - 14, H - 5, 4, 3, '#5a6a3a');
  b(ctx, 0, 0, W - 10, H / 2 - 10, 4, 4, '#5a5a52');
}

function drawMilitaryRadarDish(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(3), H = gh(4);
  const cx = W / 2;
  b(ctx, 0, 0, 4, H - 8, W - 8, 8, '#5a5a52');
  b(ctx, 0, 0, 2, H - 6, W - 4, 6, '#4a4a42');
  b(ctx, 0, 0, 6, H - 12, 6, 4, '#5a6a52');
  const mastX = cx - 1;
  b(ctx, 0, 0, mastX, 14, 3, H - 22, '#6b6b63');
  b(ctx, 0, 0, mastX - 4, H - 14, 3, 2, '#5a5a52');
  b(ctx, 0, 0, mastX + 3, H - 14, 3, 2, '#5a5a52');
  const cy = 16;
  if (frame === 0) {
    b(ctx, 0, 0, cx - 12, cy - 6, 3, 12, '#7a7a72'); b(ctx, 0, 0, cx - 10, cy - 8, 3, 16, '#8a8a82');
    b(ctx, 0, 0, cx - 8, cy - 9, 3, 18, '#9a9a92'); b(ctx, 0, 0, cx - 2, cy - 1, 6, 2, '#5a5a52');
  } else if (frame === 1) {
    b(ctx, 0, 0, cx - 10, cy - 4, 20, 3, '#9a9a92'); b(ctx, 0, 0, cx - 12, cy - 2, 24, 2, '#8a8a82');
    b(ctx, 0, 0, cx - 1, cy - 8, 2, 5, '#5a5a52');
  } else if (frame === 2) {
    b(ctx, 0, 0, cx + 5, cy - 9, 3, 18, '#9a9a92'); b(ctx, 0, 0, cx + 7, cy - 8, 3, 16, '#8a8a82');
    b(ctx, 0, 0, cx + 9, cy - 6, 3, 12, '#7a7a72'); b(ctx, 0, 0, cx - 4, cy - 1, 6, 2, '#5a5a52');
  } else {
    b(ctx, 0, 0, cx - 10, cy, 20, 2, '#7a7a72'); b(ctx, 0, 0, cx - 12, cy + 2, 24, 2, '#8a8a82');
    b(ctx, 0, 0, cx - 10, cy + 4, 20, 3, '#9a9a92'); b(ctx, 0, 0, cx - 1, cy + 7, 2, 5, '#5a5a52');
  }
  p(ctx, 0, 0, mastX + 1, 13, frame % 2 === 0 ? '#00ff00' : '#006600');
}

function drawMilitaryTankHangar(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(6), H = gh(4);
  b(ctx, 0, 0, 0, H - 6, W, 6, '#4a4a42');
  b(ctx, 0, 0, 2, 6, W - 4, H - 12, '#5a5a52');
  b(ctx, 0, 0, 4, 4, W - 8, 4, '#636357');
  b(ctx, 0, 0, 8, 2, W - 16, 4, '#6b6b5f');
  b(ctx, 0, 0, 14, 0, W - 28, 4, '#737367');
  for (let xx = 6; xx < W - 6; xx += 4) b(ctx, 0, 0, xx, 4, 1, H - 16, '#4a4a42');
  b(ctx, 0, 0, 0, 6, 4, H - 12, '#4a4a42');
  b(ctx, 0, 0, W - 4, 6, 4, H - 12, '#4a4a42');
  const doorX = 8, doorY = 10, doorW = W - 16, doorH = H - 26;
  b(ctx, 0, 0, doorX - 2, doorY - 2, doorW + 4, doorH + 8, '#3a3a32');
  if (frame === 0) {
    b(ctx, 0, 0, doorX, doorY, doorW, doorH + 4, '#5a6a52');
    for (let yy = doorY + 2; yy < doorY + doorH + 2; yy += 4) b(ctx, 0, 0, doorX, yy, doorW, 1, '#4a5a42');
    b(ctx, 0, 0, doorX + doorW / 2 - 2, doorY + doorH / 2, 4, 2, '#888877');
  } else if (frame === 1) {
    b(ctx, 0, 0, doorX, doorY, doorW, doorH / 2, '#1a1a14');
    b(ctx, 0, 0, doorX + 8, doorY + doorH / 2 - 8, doorW - 16, 6, '#3a4a32');
    b(ctx, 0, 0, doorX, doorY + doorH / 2, doorW, doorH / 2 + 4, '#5a6a52');
  } else {
    b(ctx, 0, 0, doorX, doorY, doorW, doorH + 4, '#1a1a14');
    b(ctx, 0, 0, doorX + 6, doorY + 14, doorW - 12, 10, '#4a5a3a');
    b(ctx, 0, 0, doorX + 14, doorY + 8, 16, 8, '#5a6a4a');
    b(ctx, 0, 0, doorX + 30, doorY + 10, 14, 3, '#3a4a32');
    b(ctx, 0, 0, doorX, doorY - 2, doorW, 4, '#5a6a52');
  }
  for (let yy = doorY; yy < doorY + doorH; yy += 6) { p(ctx, 0, 0, doorX - 3, yy, '#ccaa00'); p(ctx, 0, 0, doorX + doorW + 1, yy, '#ccaa00'); }
}

function drawMilitaryLandingPad(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(5), H = gh(5);
  const cx = W / 2, cy = H / 2;
  b(ctx, 0, 0, 4, 4, W - 8, H - 8, '#6b6b63');
  b(ctx, 0, 0, 6, 6, W - 12, H - 12, '#7a7a72');
  b(ctx, 0, 0, 4, 4, W - 8, 2, '#ccaa00');
  b(ctx, 0, 0, 4, H - 6, W - 8, 2, '#ccaa00');
  b(ctx, 0, 0, 4, 4, 2, H - 8, '#ccaa00');
  b(ctx, 0, 0, W - 6, 4, 2, H - 8, '#ccaa00');
  // H marking
  b(ctx, 0, 0, cx - 8, cy - 10, 3, 20, '#ffffff');
  b(ctx, 0, 0, cx + 5, cy - 10, 3, 20, '#ffffff');
  b(ctx, 0, 0, cx - 8, cy - 1, 16, 3, '#ffffff');
  // Perimeter chase lights
  const lps = [
    { x: 10, y: 2 }, { x: W / 2, y: 2 }, { x: W - 12, y: 2 },
    { x: W - 4, y: 10 }, { x: W - 4, y: H / 2 }, { x: W - 4, y: H - 12 },
    { x: W - 12, y: H - 4 }, { x: W / 2, y: H - 4 }, { x: 10, y: H - 4 },
    { x: 2, y: H - 12 }, { x: 2, y: H / 2 }, { x: 2, y: 10 },
  ];
  for (let i = 0; i < lps.length; i++) {
    const on = Math.floor(i / 4) === frame % 3;
    p(ctx, 0, 0, lps[i].x, lps[i].y, on ? '#00ff44' : '#334433');
  }
}

// ===================== PSIONIC NEW =====================

function drawPsionicNeuralLoom(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(4), H = gh(4);
  b(ctx, 0, 0, 2, 2, W - 4, 3, '#4a2860');
  b(ctx, 0, 0, 2, H - 5, W - 4, 3, '#4a2860');
  b(ctx, 0, 0, 2, 2, 3, H - 4, '#4a2860');
  b(ctx, 0, 0, W - 5, 2, 3, H - 4, '#4a2860');
  b(ctx, 0, 0, 5, 5, W - 10, H - 10, '#1a0a24');
  const nodes = [
    { x: 8, y: 8 }, { x: W / 2, y: 6 }, { x: W - 10, y: 8 },
    { x: 6, y: H / 2 }, { x: W / 2, y: H / 2 }, { x: W - 8, y: H / 2 },
    { x: 8, y: H - 10 }, { x: W / 2, y: H - 8 }, { x: W - 10, y: H - 10 },
  ];
  const threads: [number, number][] = [[0,1],[1,2],[0,3],[2,5],[3,4],[4,5],[3,6],[5,8],[6,7],[7,8],[0,4],[4,8],[2,4],[4,6],[1,4],[4,7]];
  for (const [a, b_] of threads) {
    const na = nodes[a], nb = nodes[b_];
    for (let s = 0; s <= 6; s++) {
      const tx = Math.round(na.x + (nb.x - na.x) * s / 6);
      const ty = Math.round(na.y + (nb.y - na.y) * s / 6);
      p(ctx, 0, 0, tx, ty, '#6644aa');
    }
  }
  const pulseIdx = [[0,4,8],[2,4,6],[1,4,7]][frame];
  for (const tIdx of pulseIdx) {
    if (tIdx < threads.length) {
      const [a, b_] = threads[tIdx];
      const na = nodes[a], nb = nodes[b_];
      for (let s = 0; s <= 6; s++) { const tx = Math.round(na.x + (nb.x - na.x) * s / 6); const ty = Math.round(na.y + (nb.y - na.y) * s / 6); p(ctx, 0, 0, tx, ty, '#cc88ff'); }
    }
  }
  for (const n of nodes) { b(ctx, 0, 0, n.x - 1, n.y - 1, 3, 3, '#aa66cc'); p(ctx, 0, 0, n.x, n.y, '#dd99ff'); }
}

function drawPsionicStasisPod(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(2), H = gh(4);
  const cx = Math.floor(W / 2);
  b(ctx, 0, 0, 2, H - 8, W - 4, 8, '#4a2860');
  b(ctx, 0, 0, 4, H - 6, W - 8, 4, '#5a3870');
  b(ctx, 0, 0, 4, 8, W - 8, H - 16, '#5a3870');
  b(ctx, 0, 0, 6, 4, W - 12, 6, '#5a3870');
  b(ctx, 0, 0, 6, 10, W - 12, H - 22, '#224466');
  // Figure
  b(ctx, 0, 0, cx - 3, 16, 6, 4, '#445566');
  b(ctx, 0, 0, cx - 4, 20, 8, 16, '#3a4a5a');
  // Fluid level per frame
  const fluidTop = frame === 0 ? H - 20 : frame === 1 ? H - 30 : H - 38;
  b(ctx, 0, 0, 6, fluidTop, W - 12, H - 14 - fluidTop, '#2266aa44');
  // Frost per frame
  if (frame >= 1) { p(ctx, 0, 0, 7, 12, '#aaccee'); p(ctx, 0, 0, W - 8, 14, '#aaccee'); }
  if (frame === 2) { b(ctx, 0, 0, 6, 10, 3, 3, '#bbddff'); b(ctx, 0, 0, W - 9, 10, 3, 3, '#bbddff'); }
  p(ctx, 0, 0, 6, H - 4, '#00cc66');
  p(ctx, 0, 0, 8, H - 4, '#00cc66');
}

function drawPsionicSynapseHub(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(3), H = gh(2);
  b(ctx, 0, 0, 2, H - 4, W - 4, 4, '#3a2050');
  b(ctx, 0, 0, 0, H - 3, W, 3, '#2a1440');
  const nds = [{ x: 8, y: 6 },{ x: W / 2, y: 4 },{ x: W - 10, y: 6 },{ x: 12, y: H - 8 },{ x: W / 2 + 2, y: H - 10 },{ x: W - 14, y: H - 8 }];
  for (const n of nds) { b(ctx, 0, 0, n.x - 2, n.y - 2, 5, 5, '#6a3890'); p(ctx, 0, 0, n.x, n.y, '#bb88dd'); }
  const conns: [number,number][] = [[0,1],[1,2],[0,3],[1,4],[2,5],[3,4],[4,5]];
  for (const [a, b_] of conns) { const na = nds[a], nb = nds[b_]; for (let s = 1; s < 5; s++) { p(ctx, 0, 0, Math.round(na.x + (nb.x - na.x) * s / 5), Math.round(na.y + (nb.y - na.y) * s / 5), '#553377'); } }
  // Arc per frame
  const arcPairs: [number,number][] = [[0,5],[1,3],[2,4]];
  const [aI, bI] = arcPairs[frame];
  const na = nds[aI], nb = nds[bI];
  for (let s = 0; s <= 8; s++) { let tx = Math.round(na.x + (nb.x - na.x) * s / 8); let ty = Math.round(na.y + (nb.y - na.y) * s / 8); if (s > 0 && s < 8) { tx += (s % 2 === 0 ? 2 : -2); } p(ctx, 0, 0, tx, ty, '#eeddff'); }
  b(ctx, 0, 0, na.x - 1, na.y - 1, 3, 3, '#eeccff');
  b(ctx, 0, 0, nb.x - 1, nb.y - 1, 3, 3, '#eeccff');
}

function drawPsionicPsychicBeacon(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(2), H = gh(2);
  const cx = W / 2, cy = H / 2;
  b(ctx, 0, 0, cx - 6, H - 6, 12, 6, '#4a2860');
  b(ctx, 0, 0, cx - 3, 8, 6, H - 14, '#6a4890');
  b(ctx, 0, 0, cx - 2, 6, 4, H - 12, '#7a58a0');
  b(ctx, 0, 0, cx - 2, 4, 4, 4, '#aa66cc');
  p(ctx, 0, 0, cx, 4, '#dd99ff');
  // Psi waves per frame
  const r = 4 + frame * 3;
  b(ctx, 0, 0, cx - r, cy - 1, 1, 2, '#8855aa55');
  b(ctx, 0, 0, cx + r - 1, cy - 1, 1, 2, '#8855aa55');
  b(ctx, 0, 0, cx - 2, cy - r, 4, 1, '#8855aa55');
  b(ctx, 0, 0, cx - 2, cy + r - 1, 4, 1, '#8855aa55');
  p(ctx, 0, 0, cx - 1 + frame, 3, '#ffffff');
}

function drawPsionicDreamChamber(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(5), H = gh(4);
  b(ctx, 0, 0, 0, H - 4, W, 4, '#2a1440');
  b(ctx, 0, 0, 0, 0, 3, H, '#3a2050');
  b(ctx, 0, 0, W - 3, 0, 3, H, '#3a2050');
  b(ctx, 0, 0, 0, 0, W, 3, '#3a2050');
  b(ctx, 0, 0, 3, H - 6, W - 6, 2, '#2a1844');
  const slabX = W / 2 - 14, slabY = H - 14;
  b(ctx, 0, 0, slabX, slabY, 28, 4, '#5a4870');
  b(ctx, 0, 0, slabX + 2, slabY + 4, 24, 4, '#4a3860');
  b(ctx, 0, 0, slabX + 4, slabY - 4, 6, 4, '#7a6890');
  b(ctx, 0, 0, slabX + 8, slabY - 3, 16, 3, '#6a5880');
  const auraColors = ['#4488cc', '#8844aa', '#cc4488'];
  const ac = auraColors[frame];
  b(ctx, 0, 0, slabX + 2, slabY - 8, 26, 2, ac);
  b(ctx, 0, 0, slabX, slabY - 6, 2, 8, ac);
  b(ctx, 0, 0, slabX + 26, slabY - 6, 2, 8, ac);
  const pColors = ['#aa88ee', '#88aaff', '#ee88cc'];
  for (let i = 0; i < 3; i++) {
    const px_ = slabX + 8 + i * 6;
    const py_ = slabY - 16 - frame * 2 + Math.round(Math.sin((i + frame) * 1.5) * 2);
    p(ctx, 0, 0, px_, py_, pColors[i]);
  }
  p(ctx, 0, 0, 5, H / 2, '#aa66cc');
  p(ctx, 0, 0, W - 6, H / 2, '#aa66cc');
}

// ===================== INFERNAL NEW =====================

function drawInfernalBoneCage(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(3), H = gh(4);
  b(ctx, 0, 0, 2, H - 6, W - 4, 6, '#2a1a14');
  b(ctx, 0, 0, 4, H - 8, W - 8, 4, '#3a2a20');
  for (let i = 0; i < 6; i++) {
    const bx_ = 6 + i * Math.floor((W - 14) / 5);
    b(ctx, 0, 0, bx_, 6, 2, H - 14, '#d4c8a0');
    p(ctx, 0, 0, bx_, 12, '#b0a478');
    p(ctx, 0, 0, bx_, H / 2, '#b0a478');
  }
  b(ctx, 0, 0, 4, 4, W - 8, 3, '#d4c8a0');
  b(ctx, 0, 0, 4, H - 8, W - 8, 2, '#d4c8a0');
  const px_ = W / 2, py_ = H / 2;
  b(ctx, 0, 0, px_ - 3, py_ - 6, 6, 5, '#4a2a2a');
  b(ctx, 0, 0, px_ - 4, py_, 8, 10, '#3a1a1a');
  const eyeC = ['#22cc44', '#44ff66', '#114422'][frame];
  p(ctx, 0, 0, px_ - 2, py_ - 4, eyeC);
  p(ctx, 0, 0, px_ + 1, py_ - 4, eyeC);
  const chainOff = frame === 1 ? -2 : frame === 2 ? 2 : 0;
  b(ctx, 0, 0, px_ - 1 + chainOff, 6, 2, py_ - 8, '#666655');
  p(ctx, 0, 0, 10, H - 5, '#880022');
}

function drawInfernalLavaFont(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(3), H = gh(3);
  b(ctx, 0, 0, 0, H - 4, W, 4, '#2a1a14');
  b(ctx, 0, 0, 2, H / 2 - 2, W - 4, H / 2 + 2, '#3a2a20');
  b(ctx, 0, 0, 4, H / 2, W - 8, H / 2 - 6, '#1a0a04');
  b(ctx, 0, 0, W / 2 - 4, H - 6, 8, 2, '#4a3830');
  for (let xx = 6; xx < W - 6; xx += 5) p(ctx, 0, 0, xx, H / 2 - 2, '#5a4840');
  const lavaY = H / 2 + 2;
  if (frame === 0) {
    b(ctx, 0, 0, 5, lavaY, W - 10, 6, '#cc4400'); b(ctx, 0, 0, 6, lavaY + 1, W - 12, 4, '#ff6622');
  } else if (frame === 1) {
    b(ctx, 0, 0, 5, lavaY - 3, W - 10, 9, '#cc4400'); b(ctx, 0, 0, 6, lavaY - 2, W - 12, 7, '#ff6622');
    b(ctx, 0, 0, 2, H / 2 + 2, 2, 4, '#cc4400');
  } else {
    b(ctx, 0, 0, 5, lavaY + 2, W - 10, 4, '#cc4400'); b(ctx, 0, 0, 6, lavaY + 3, W - 12, 2, '#ff6622');
    b(ctx, 0, 0, W - 4, H / 2 + 3, 2, 3, '#cc4400');
  }
}

function drawInfernalDemonGate(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(5), H = gh(5);
  const cx = Math.floor(W / 2);
  b(ctx, 0, 0, 0, H - 6, W, 6, '#1a0a0a');
  b(ctx, 0, 0, 4, 8, 8, H - 14, '#2a1014');
  b(ctx, 0, 0, W - 12, 8, 8, H - 14, '#2a1014');
  b(ctx, 0, 0, 4, 6, W - 8, 6, '#2a1014');
  b(ctx, 0, 0, 8, 2, W - 16, 6, '#2a1014');
  b(ctx, 0, 0, 14, 0, W - 28, 4, '#3a1a20');
  b(ctx, 0, 0, 5, 12, 5, 4, '#d4c8a0'); p(ctx, 0, 0, 6, 13, '#1a0a0a'); p(ctx, 0, 0, 8, 13, '#1a0a0a');
  b(ctx, 0, 0, W - 10, 12, 5, 4, '#d4c8a0'); p(ctx, 0, 0, W - 9, 13, '#1a0a0a'); p(ctx, 0, 0, W - 7, 13, '#1a0a0a');
  const portalX = 12, portalY = 8, portalW = W - 24, portalH = H - 16;
  b(ctx, 0, 0, portalX, portalY, portalW, portalH, '#0a0004');
  const pcx = portalX + portalW / 2, pcy = portalY + portalH / 2;
  const offsets = [
    [[-8,-4],[6,-8],[8,4],[-6,8]],
    [[-6,-8],[8,-4],[6,8],[-8,4]],
    [[-8,6],[4,-8],[8,-2],[-4,8]],
  ];
  for (const [dx, dy] of offsets[frame]) {
    b(ctx, 0, 0, pcx + dx - 2, pcy + dy - 2, 5, 5, '#cc4400');
    b(ctx, 0, 0, pcx + dx - 1, pcy + dy - 1, 3, 3, '#ff6622');
    p(ctx, 0, 0, pcx + dx, pcy + dy, '#ffaa44');
  }
  b(ctx, 0, 0, pcx - 4, pcy - 3, 8, 6, '#cc2200');
  b(ctx, 0, 0, pcx - 3, pcy - 2, 6, 4, '#ff4400');
  b(ctx, 0, 0, pcx - 1, pcy - 1, 3, 2, '#ffcc44');
}

function drawInfernalSkullPile(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(3), H = gh(2);
  b(ctx, 0, 0, 0, H - 3, W, 3, '#1a0a0a');
  b(ctx, 0, 0, 2, H - 5, W - 4, 3, '#2a1a14');
  const sps = [
    { x: 4, y: H - 10 },{ x: 12, y: H - 10 },{ x: 20, y: H - 11 },{ x: 28, y: H - 10 },{ x: 36, y: H - 10 },
    { x: 8, y: H - 16 },{ x: 18, y: H - 17 },{ x: 28, y: H - 16 },
    { x: 14, y: H - 22 },{ x: 24, y: H - 21 },
  ];
  for (const sp of sps) {
    b(ctx, 0, 0, sp.x, sp.y, 6, 5, '#d4c8a0');
    b(ctx, 0, 0, sp.x + 1, sp.y + 5, 4, 2, '#b0a478');
    p(ctx, 0, 0, sp.x + 1, sp.y + 2, '#1a0a0a');
    p(ctx, 0, 0, sp.x + 4, sp.y + 2, '#1a0a0a');
  }
  const flickerIdx = [[0,1],[5,6],[3,4]][frame];
  for (const si of flickerIdx) {
    if (si < sps.length) { p(ctx, 0, 0, sps[si].x + 1, sps[si].y + 2, '#44ff44'); p(ctx, 0, 0, sps[si].x + 4, sps[si].y + 2, '#44ff44'); }
  }
}

function drawInfernalTortureRack(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(2), H = gh(3);
  b(ctx, 0, 0, 0, H - 4, W, 4, '#1a0a0a');
  b(ctx, 0, 0, 4, 4, 3, H - 10, '#5a3a1a');
  b(ctx, 0, 0, W - 7, 4, 3, H - 10, '#5a3a1a');
  b(ctx, 0, 0, 3, 2, W - 6, 4, '#5a3a1a');
  b(ctx, 0, 0, 3, H - 8, W - 6, 3, '#5a3a1a');
  const cx1 = 10, cx2 = W - 11;
  const swOff = frame === 1 ? -1 : frame === 2 ? 1 : 0;
  for (let yy = 6; yy < 28; yy += 3) {
    const off = Math.min(Math.floor((yy - 6) / 8), 1) * swOff;
    p(ctx, 0, 0, cx1 + off, yy, yy % 6 === 0 ? '#888877' : '#666655');
    p(ctx, 0, 0, cx2 + off, yy, yy % 6 === 0 ? '#888877' : '#666655');
  }
  b(ctx, 0, 0, cx1 - 2, 27, 4, 3, '#555544');
  b(ctx, 0, 0, cx2 - 2, 27, 4, 3, '#555544');
  if (frame > 0) { p(ctx, 0, 0, W / 2 + frame, H - 14 - frame * 2, '#ff6622'); }
  p(ctx, 0, 0, cx1, 30, '#660011');
  p(ctx, 0, 0, cx2, 30, '#660011');
}


// ===================== ARCANE NEW =====================

function drawArcaneCrystalNexus(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(5), H = gh(5); const cx = Math.floor(W/2), cy = Math.floor(H/2);
  b(ctx, 0, 0, 4, H-6, W-8, 6, '#332255');
  b(ctx, 0, 0, cx-12, cy-12, 24, 24, '#2a1855');
  // Central crystal rotates highlights per frame
  const angles = [0, 90, 180, 270]; const a = angles[frame % 4];
  b(ctx, 0, 0, cx-6, cy-6, 12, 12, '#6644cc');
  b(ctx, 0, 0, cx-4, cy-4, 8, 8, '#8866ee');
  b(ctx, 0, 0, cx-2, cy-2, 4, 4, '#aa88ff');
  // Refraction beams
  const bx = a === 0 ? -10 : a === 180 ? 10 : 0;
  const by = a === 90 ? -10 : a === 270 ? 10 : 0;
  if (bx !== 0) b(ctx, 0, 0, cx + (bx < 0 ? bx : 2), cy-1, Math.abs(bx)-2, 2, '#aa88ff44');
  if (by !== 0) b(ctx, 0, 0, cx-1, cy + (by < 0 ? by : 2), 2, Math.abs(by)-2, '#aa88ff44');
  // Corner crystals
  for (const [ox,oy] of [[-16,-16],[16,-16],[-16,16],[16,16]]) { b(ctx, 0, 0, cx+ox-2, cy+oy-3, 4, 6, '#7755bb'); p(ctx, 0, 0, cx+ox, cy+oy-2, '#aa88ff'); }
}

function drawArcaneRuneCircle(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(3), H = gh(3); const cx = Math.floor(W/2), cy = Math.floor(H/2);
  b(ctx, 0, 0, 2, 2, W-4, H-4, '#1a0a33');
  // Circle outline
  const rad = Math.min(cx,cy)-4;
  for (let a = 0; a < 360; a += 12) { const rx = Math.round(cx + Math.cos(a*Math.PI/180)*rad); const ry = Math.round(cy + Math.sin(a*Math.PI/180)*rad); p(ctx, 0, 0, rx, ry, '#553388'); }
  // 9 runes, 3 glow per frame
  for (let i = 0; i < 9; i++) {
    const a = (i/9)*Math.PI*2; const r2 = Math.min(cx,cy)-7;
    const rx = Math.round(cx + Math.cos(a)*r2); const ry = Math.round(cy + Math.sin(a)*r2);
    const active = Math.floor(i/3) === frame % 3;
    b(ctx, 0, 0, rx-1, ry-1, 2, 2, active ? '#aa88ff' : '#443366');
  }
  b(ctx, 0, 0, cx-2, cy-2, 4, 4, '#6644cc');
  p(ctx, 0, 0, cx, cy, '#8866ee');
}

function drawArcaneScryingPool(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(3), H = gh(3); const cx = Math.floor(W/2), cy = Math.floor(H/2);
  b(ctx, 0, 0, 4, 4, W-8, H-8, '#443366');
  b(ctx, 0, 0, 6, 6, W-12, H-12, '#1a1a44');
  b(ctx, 0, 0, 8, 8, W-16, H-16, '#222266');
  // Ripple rings expand per frame
  const r = 3 + frame * 4;
  for (let a = 0; a < 360; a += 30) { const rx = Math.round(cx + Math.cos(a*Math.PI/180)*r); const ry = Math.round(cy + Math.sin(a*Math.PI/180)*(r*0.7)); p(ctx, 0, 0, rx, ry, '#4466cc'); }
  // Vision spots
  const vx = cx - 4 + frame * 3; p(ctx, 0, 0, vx, cy, '#8866ee'); p(ctx, 0, 0, vx+2, cy-1, '#6644cc');
}

function drawArcaneSpellForge(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(4), H = gh(3); const cx = Math.floor(W/2);
  b(ctx, 0, 0, 0, H-4, W, 4, '#332255');
  // Anvil
  b(ctx, 0, 0, cx-8, H-14, 16, 6, '#555555'); b(ctx, 0, 0, cx-6, H-16, 12, 3, '#666666');
  b(ctx, 0, 0, cx-4, H-18, 8, 3, '#777777');
  // Hammer
  b(ctx, 0, 0, cx+6, H-24, 4, 6, '#664433'); b(ctx, 0, 0, cx+4, H-26, 8, 3, '#888888');
  // Sparks fly in direction per frame
  const dirs = [[-1,0],[0,-1],[1,0]];
  const [dx,dy] = dirs[frame];
  for (let i = 1; i <= 4; i++) { p(ctx, 0, 0, cx + dx*i*3, H-18 + dy*i*3, '#ffaa44'); p(ctx, 0, 0, cx + dx*i*3+1, H-18 + dy*i*3-1, '#ff6622'); }
  // Rune glow on hammer
  p(ctx, 0, 0, cx+7, H-25, frame === 1 ? '#aa88ff' : '#6644cc');
}

function drawArcaneCrystalCluster(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(2), H = gh(3); const cx = Math.floor(W/2);
  b(ctx, 0, 0, 2, H-4, W-4, 4, '#332255');
  // Three crystals
  const crystals = [{x:cx-5,h:18,c:'#6644cc'},{x:cx-1,h:24,c:'#7755dd'},{x:cx+3,h:16,c:'#5533bb'}];
  for (let i = 0; i < crystals.length; i++) {
    const cr = crystals[i]; const bright = i === frame;
    b(ctx, 0, 0, cr.x, H-4-cr.h, 4, cr.h, bright ? '#aa88ff' : cr.c);
    b(ctx, 0, 0, cr.x+1, H-4-cr.h-2, 2, 2, bright ? '#ccaaff' : cr.c);
    if (bright) p(ctx, 0, 0, cr.x+1, H-4-cr.h-1, '#ffffff');
  }
}

function drawArcaneEnchantingTable(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(3), H = gh(2); const cx = Math.floor(W/2);
  b(ctx, 0, 0, 4, H-6, W-8, 6, '#443366');
  b(ctx, 0, 0, 6, 4, W-12, H-10, '#554477');
  // Book on table
  if (frame === 0) { b(ctx, 0, 0, cx-6, 6, 12, 8, '#886644'); b(ctx, 0, 0, cx-5, 7, 5, 6, '#eeeecc'); p(ctx, 0, 0, cx-3, 8, '#6644cc'); }
  else if (frame === 1) { b(ctx, 0, 0, cx-4, 6, 8, 8, '#886644'); b(ctx, 0, 0, cx-2, 7, 4, 6, '#ddddbb'); }
  else { b(ctx, 0, 0, cx-6, 6, 12, 8, '#886644'); b(ctx, 0, 0, cx, 7, 5, 6, '#eeeecc'); p(ctx, 0, 0, cx+2, 9, '#8844cc'); }
  // Floating rune
  p(ctx, 0, 0, cx + frame*2, 2, '#aa88ff');
}

function drawArcaneManaWell(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(2), H = gh(2); const cx = Math.floor(W/2);
  b(ctx, 0, 0, 2, 4, W-4, H-6, '#443366');
  b(ctx, 0, 0, 4, 6, W-8, H-10, '#1a1a44');
  // Blue energy bubbles rise per frame
  const bubY = H - 8 - frame * 4;
  p(ctx, 0, 0, cx-2, bubY, '#4488ff'); p(ctx, 0, 0, cx+1, bubY+2, '#4488ff');
  if (frame === 2) { p(ctx, 0, 0, cx, bubY-2, '#88aaff44'); }
  b(ctx, 0, 0, 2, 2, W-4, 3, '#554477');
}

// ===================== MECHANICAL NEW =====================

function drawMechGearAssembly(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(4), H = gh(4); const cx = Math.floor(W/2), cy = Math.floor(H/2);
  b(ctx, 0, 0, 2, H-4, W-4, 4, '#3a3838');
  b(ctx, 0, 0, 4, 4, W-8, H-8, '#444440');
  // Large gear center
  b(ctx, 0, 0, cx-10, cy-10, 20, 20, '#666666');
  b(ctx, 0, 0, cx-8, cy-8, 16, 16, '#777777');
  b(ctx, 0, 0, cx-3, cy-3, 6, 6, '#555555');
  // Teeth rotate per frame
  for (let i = 0; i < 8; i++) {
    const a = ((i + frame) / 8) * Math.PI * 2;
    const tx = Math.round(cx + Math.cos(a) * 11);
    const ty = Math.round(cy + Math.sin(a) * 11);
    b(ctx, 0, 0, tx-1, ty-1, 3, 3, '#888888');
  }
  // Small gear
  const sx = cx + 14, sy = cy - 10;
  b(ctx, 0, 0, sx-4, sy-4, 8, 8, '#777777');
  for (let i = 0; i < 6; i++) {
    const a = ((i - frame*0.5) / 6) * Math.PI * 2;
    p(ctx, 0, 0, Math.round(sx + Math.cos(a)*5), Math.round(sy + Math.sin(a)*5), '#999999');
  }
}

function drawMechSteamBoiler(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(3), H = gh(4); const cx = Math.floor(W/2);
  b(ctx, 0, 0, 2, H-6, W-4, 6, '#3a3838');
  // Cylindrical body
  b(ctx, 0, 0, 6, 10, W-12, H-16, '#666660');
  b(ctx, 0, 0, 8, 12, W-16, H-20, '#777770');
  // Rivets
  for (let y = 14; y < H-8; y += 6) { p(ctx, 0, 0, 8, y, '#888880'); p(ctx, 0, 0, W-9, y, '#888880'); }
  // Pressure gauge
  b(ctx, 0, 0, cx-4, 6, 8, 6, '#555550');
  const gaugePos = frame; // 0=low, 1=mid, 2=high
  p(ctx, 0, 0, cx-2+gaugePos*2, 8, '#ff0000');
  // Steam puff
  if (frame >= 1) {
    const puffH = frame === 1 ? 3 : 6;
    for (let i = 0; i < puffH; i++) p(ctx, 0, 0, cx + 6 + (i%2), 8 - i, '#aaaaaa44');
  }
  // Pipe fittings
  b(ctx, 0, 0, 4, 14, 3, 2, '#888877'); b(ctx, 0, 0, W-7, 14, 3, 2, '#888877');
}

function drawMechConveyorTerminal(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(4), H = gh(2);
  b(ctx, 0, 0, 0, 4, W, H-8, '#555550');
  b(ctx, 0, 0, 2, 6, W-4, H-12, '#666660');
  // Belt arrows scroll per frame
  for (let x = 4 + (frame * 3) % 9; x < W - 4; x += 9) {
    b(ctx, 0, 0, x, 8, 4, 2, '#888877');
    p(ctx, 0, 0, x+4, 9, '#888877');
  }
  // Side frames
  b(ctx, 0, 0, 0, 2, 3, H-4, '#444440'); b(ctx, 0, 0, W-3, 2, 3, H-4, '#444440');
  // Rollers
  for (let x = 6; x < W-6; x += 8) { b(ctx, 0, 0, x, H-6, 2, 2, '#777770'); }
}

function drawMechCraneArm(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(2), H = gh(5); const cx = Math.floor(W/2);
  // Base
  b(ctx, 0, 0, 2, H-8, W-4, 8, '#555555');
  // Mast
  b(ctx, 0, 0, cx-2, 8, 4, H-16, '#777777');
  // Arm direction per frame
  const armDir = frame === 0 ? -1 : frame === 2 ? 1 : 0;
  b(ctx, 0, 0, cx-1+armDir*4, 6, 8, 3, '#888888');
  // Cable
  const cableX = cx + armDir * 7;
  for (let y = 9; y < 20; y += 2) p(ctx, 0, 0, cableX, y, '#666666');
  // Hook
  b(ctx, 0, 0, cableX-1, 20, 3, 2, '#aaaaaa');
  // Top cap
  b(ctx, 0, 0, cx-3, 4, 6, 4, '#666666');
  p(ctx, 0, 0, cx, 4, '#ff4400');
}

function drawMechScrapHeap(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(3), H = gh(3);
  b(ctx, 0, 0, 0, H-3, W, 3, '#3a3838');
  // Scrap pile shape
  b(ctx, 0, 0, 4, H-14, W-8, 11, '#555550');
  b(ctx, 0, 0, 6, H-18, W-12, 6, '#666660');
  b(ctx, 0, 0, 10, H-20, W-20, 4, '#777770');
  // Metal pieces
  b(ctx, 0, 0, 8, H-12, 6, 2, '#884422'); b(ctx, 0, 0, 20, H-16, 4, 3, '#666677');
  b(ctx, 0, 0, 14, H-10, 8, 2, '#555566'); b(ctx, 0, 0, W-14, H-14, 3, 4, '#887766');
  // Glint shifts per frame
  const glintPositions = [[10, H-18], [22, H-14], [W-12, H-10]];
  const [gx, gy] = glintPositions[frame];
  p(ctx, 0, 0, gx, gy, '#ffffff'); p(ctx, 0, 0, gx+1, gy, '#cccccc');
}

function drawMechSmokestack(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(2), H = gh(6); const cx = Math.floor(W/2);
  b(ctx, 0, 0, 2, H-6, W-4, 6, '#3a3838');
  // Stack body
  b(ctx, 0, 0, cx-4, 10, 8, H-16, '#666666');
  b(ctx, 0, 0, cx-3, 10, 6, H-16, '#777777');
  // Bands
  for (let y = 14; y < H-8; y += 10) b(ctx, 0, 0, cx-5, y, 10, 1, '#888888');
  // Cap
  b(ctx, 0, 0, cx-5, 8, 10, 3, '#888888');
  // Smoke puffs rise per frame
  const smokeY = 6 - frame * 3;
  const smokeW = 2 + frame;
  if (smokeY > 0) { b(ctx, 0, 0, cx-1, smokeY, smokeW, 2, '#66666644'); }
  if (smokeY - 3 > 0) { b(ctx, 0, 0, cx-2, smokeY-3, smokeW+1, 2, '#55555533'); }
}

// ===================== NATURE NEW =====================

function drawNatureSacredPond(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(5), H = gh(4); const cx = Math.floor(W/2), cy = Math.floor(H/2);
  // Earthy border
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
    const d = Math.sqrt(((x-cx)/1.4)**2 + ((y-cy)/1)**2);
    if (d < 22 && d > 18) p(ctx, 0, 0, x, y, (x+y)%3===0 ? '#5a3a22' : '#4a3018');
    else if (d <= 18) p(ctx, 0, 0, x, y, '#224466');
  }
  // Water surface
  b(ctx, 0, 0, cx-16, cy-8, 32, 16, '#2a5577');
  // Lily pads
  b(ctx, 0, 0, cx-10+frame, cy-4, 4, 3, '#228844');
  b(ctx, 0, 0, cx+6, cy+2-frame, 3, 2, '#228844');
  // Fish per frame
  if (frame === 1) { p(ctx, 0, 0, cx+2, cy+4, '#cc8844'); }
  if (frame === 2) { p(ctx, 0, 0, cx+2, cy+3, '#cc8844'); p(ctx, 0, 0, cx+3, cy+2, '#4477aa'); }
}

function drawNatureMushroomRing(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(4), H = gh(4); const cx = Math.floor(W/2), cy = Math.floor(H/2);
  b(ctx, 0, 0, 0, 0, W, H, '#2a4422');
  // 6 mushrooms in a ring
  for (let i = 0; i < 6; i++) {
    const a = (i/6)*Math.PI*2; const r = 16;
    const mx = Math.round(cx+Math.cos(a)*r); const my = Math.round(cy+Math.sin(a)*r);
    b(ctx, 0, 0, mx-1, my-1, 2, 4, '#ccbb99');
    const glowing = (frame === 0 && i%2===0) || (frame === 1 && i%2===1) || frame === 2;
    b(ctx, 0, 0, mx-3, my-4, 6, 3, glowing ? '#ff6644' : '#cc4433');
    if (glowing) p(ctx, 0, 0, mx, my-4, '#ffaa88');
  }
}

function drawNatureHollowLog(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(4), H = gh(2);
  b(ctx, 0, 0, 0, H-3, W, 3, '#2a4422');
  b(ctx, 0, 0, 2, 4, W-4, H-8, '#5a3a22');
  b(ctx, 0, 0, 4, 6, W-8, H-12, '#6a4a2a');
  // Hollow opening
  b(ctx, 0, 0, 4, 6, 8, H-12, '#2a1808');
  // Creature per frame
  if (frame === 1) { p(ctx, 0, 0, 6, 8, '#ffaa22'); p(ctx, 0, 0, 8, 8, '#ffaa22'); }
  if (frame === 2) { p(ctx, 0, 0, 6, 8, '#4a3018'); p(ctx, 0, 0, 8, 8, '#4a3018'); }
  // Bark texture
  for (let x = 14; x < W-4; x += 5) p(ctx, 0, 0, x, 5, '#4a2a18');
}

function drawNatureBerryBush(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(2), H = gh(2); const cx = Math.floor(W/2);
  b(ctx, 0, 0, 2, H-3, W-4, 3, '#2a4422');
  b(ctx, 0, 0, 4, 4, W-8, H-8, '#227733');
  b(ctx, 0, 0, 6, 6, W-12, H-12, '#2a8844');
  // Berries
  for (const [bx,by] of [[6,8],[10,6],[W-8,8],[W-10,10]]) p(ctx, 0, 0, bx, by, '#cc2244');
  // Butterfly per frame
  if (frame === 0) { p(ctx, 0, 0, cx, 4, '#ffaa44'); p(ctx, 0, 0, cx-1, 3, '#ffcc66'); p(ctx, 0, 0, cx+1, 3, '#ffcc66'); }
  if (frame === 1) { p(ctx, 0, 0, cx, 3, '#ffaa44'); p(ctx, 0, 0, cx-1, 2, '#ffcc66'); p(ctx, 0, 0, cx+1, 2, '#ffcc66'); }
  if (frame === 2) { p(ctx, 0, 0, cx, 1, '#ffaa44'); p(ctx, 0, 0, cx-2, 0, '#ffcc66'); p(ctx, 0, 0, cx+2, 0, '#ffcc66'); }
}

function drawNatureStoneShrine(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(3), H = gh(3); const cx = Math.floor(W/2);
  b(ctx, 0, 0, 0, H-3, W, 3, '#2a4422');
  b(ctx, 0, 0, cx-6, H-12, 12, 9, '#777770');
  b(ctx, 0, 0, cx-4, H-16, 8, 5, '#888880');
  b(ctx, 0, 0, cx-2, H-18, 4, 3, '#999990');
  // Firefly orbits per frame
  const a = (frame/3)*Math.PI*2; const r = 12;
  const fx = Math.round(cx + Math.cos(a)*r); const fy = Math.round(H/2 + Math.sin(a)*r);
  p(ctx, 0, 0, fx, fy, '#ffff44'); p(ctx, 0, 0, fx+1, fy, '#ffff4488');
}

function drawNatureWaterfall(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(3), H = gh(5); const cx = Math.floor(W/2);
  // Rock face
  b(ctx, 0, 0, 0, 0, W, H, '#555548');
  b(ctx, 0, 0, 2, 2, W-4, H-4, '#666658');
  // Water channel
  b(ctx, 0, 0, cx-6, 0, 12, H, '#2a5577');
  // Water texture scrolls per frame
  for (let y = frame*2; y < H; y += 6) {
    b(ctx, 0, 0, cx-4, y, 8, 2, '#4488aa');
    b(ctx, 0, 0, cx-2, y+1, 4, 1, '#66aacc');
  }
  // Spray at bottom
  const sprayOff = frame;
  p(ctx, 0, 0, cx-4-sprayOff, H-4, '#88ccee44');
  p(ctx, 0, 0, cx+4+sprayOff, H-4, '#88ccee44');
  // Pool at base
  b(ctx, 0, 0, cx-8, H-6, 16, 4, '#2a5577');
}

function drawNatureBeeHive(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(1), H = gh(2); const cx = Math.floor(W/2);
  // Branch
  b(ctx, 0, 0, 0, 1, W, 2, '#5a3a22');
  // Hive body — compact teardrop
  b(ctx, 0, 0, cx-4, 3, 8, 6, '#ccaa44');
  b(ctx, 0, 0, cx-5, 5, 10, 8, '#ddbb55');
  b(ctx, 0, 0, cx-4, 13, 8, 4, '#ccaa44');
  b(ctx, 0, 0, cx-3, 17, 6, 2, '#bbaa33');
  // Horizontal ridges
  b(ctx, 0, 0, cx-4, 7, 8, 1, '#bb9933');
  b(ctx, 0, 0, cx-5, 10, 10, 1, '#bb9933');
  b(ctx, 0, 0, cx-4, 14, 8, 1, '#bb9933');
  // Entrance hole
  b(ctx, 0, 0, cx-1, 12, 3, 3, '#3a2a10');
  // Bees circle per frame
  const beeAngle = (frame / 3) * Math.PI * 2;
  for (let i = 0; i < 2; i++) {
    const a = beeAngle + (i / 2) * Math.PI * 2;
    const bx_ = Math.round(cx + Math.cos(a) * 6);
    const by_ = Math.round(13 + Math.sin(a) * 4);
    p(ctx, 0, 0, bx_, by_, '#ffcc00');
  }
}

// ===================== CYPHERPUNK NEW =====================

function drawCyberServerFarm(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(5), H = gh(4);
  b(ctx, 0, 0, 0, H-3, W, 3, '#1a1a22');
  // Multiple racks
  for (let r = 0; r < 3; r++) {
    const rx = 4 + r * Math.floor((W-8)/3);
    b(ctx, 0, 0, rx, 4, Math.floor((W-16)/3), H-8, '#2a2a33');
    b(ctx, 0, 0, rx+1, 5, Math.floor((W-18)/3), H-10, '#333340');
    // LEDs scroll per frame
    for (let y = 6; y < H-6; y += 4) {
      const ledRow = Math.floor(y/4);
      const active = (ledRow + frame) % 3 === 0;
      p(ctx, 0, 0, rx+2, y, active ? '#00ff44' : '#003311');
      p(ctx, 0, 0, rx+4, y, active ? '#ffaa00' : '#332200');
    }
  }
}

function drawCyberHologramTable(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(4), H = gh(3); const cx = Math.floor(W/2);
  b(ctx, 0, 0, 4, H-8, W-8, 8, '#2a2a33');
  b(ctx, 0, 0, 6, H-6, W-12, 4, '#333340');
  // Hologram projector
  b(ctx, 0, 0, cx-2, H-10, 4, 2, '#444455');
  // Hologram shape per frame
  const hcolor = '#44ccaa66';
  if (frame === 0) { b(ctx, 0, 0, cx-6, 6, 12, 12, hcolor); } // cube
  else if (frame === 1) { for (let a = 0; a < 360; a += 30) { const r = 6; p(ctx, 0, 0, Math.round(cx+Math.cos(a*Math.PI/180)*r), Math.round(12+Math.sin(a*Math.PI/180)*r), '#44ccaa'); } }
  else { b(ctx, 0, 0, cx-6, 12, 12, 8, hcolor); b(ctx, 0, 0, cx-3, 8, 6, 4, hcolor); p(ctx, 0, 0, cx, 6, '#44ccaa'); }
  // Beam lines
  b(ctx, 0, 0, cx-1, H-12, 2, 2, '#44ccaa88');
}

function drawCyberCableNest(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(3), H = gh(3);
  b(ctx, 0, 0, 0, 0, W, H, '#1a1a22');
  // Cables
  const cables = [[4,4,W-4,H-4,'#224488'],[W-6,6,6,H-6,'#228844'],[W/2,2,W/2,H-2,'#884422'],[4,H/2,W-4,H/2,'#448822']];
  for (const [x1,y1,x2,y2,c] of cables) {
    for (let s = 0; s <= 8; s++) { p(ctx, 0, 0, Math.round(x1 as number + ((x2 as number)-(x1 as number))*s/8), Math.round(y1 as number + ((y2 as number)-(y1 as number))*s/8), c as string); }
  }
  // Spark per frame
  const sparkCable = frame % cables.length;
  const sc = cables[sparkCable];
  const st = 0.3 + frame*0.2;
  p(ctx, 0, 0, Math.round(sc[0] as number + ((sc[2] as number)-(sc[0] as number))*st), Math.round(sc[1] as number + ((sc[3] as number)-(sc[1] as number))*st), '#ffffff');
}

function drawCyberCryptoMiner(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(3), H = gh(2); const cx = Math.floor(W/2);
  b(ctx, 0, 0, 2, 2, W-4, H-4, '#2a2a33');
  b(ctx, 0, 0, 4, 4, W-8, H-8, '#333340');
  // Fans
  b(ctx, 0, 0, 6, 6, 6, 6, '#1a1a22');
  p(ctx, 0, 0, 8, 8, frame%2===0 ? '#444455' : '#555566');
  b(ctx, 0, 0, W-12, 6, 6, 6, '#1a1a22');
  p(ctx, 0, 0, W-10, 8, frame%2===1 ? '#444455' : '#555566');
  // Display
  b(ctx, 0, 0, cx-6, 4, 12, 6, '#001108');
  const hexChars = ['A','F','3','C','9','1','7','E','5'];
  const startIdx = frame * 3;
  b(ctx, 0, 0, cx-4, 5, 8, 4, '#00aa44');
  // Hash tick indicator
  p(ctx, 0, 0, cx - 2 + frame*2, 6, '#00ff66');
}

function drawCyberNeonSign(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(4), H = gh(2);
  b(ctx, 0, 0, 0, 0, W, H, '#1a1a22');
  b(ctx, 0, 0, 2, 2, W-4, H-4, '#222230');
  // Letters: H A C K
  const letters = [
    {x:8, on: frame !== 1}, {x:18, on: frame !== 1},
    {x:28, on: frame !== 2}, {x:38, on: frame !== 2},
  ];
  for (const l of letters) {
    const c = l.on ? '#ff44cc' : '#331122';
    b(ctx, 0, 0, l.x, 5, 6, 10, c);
    if (l.on) { p(ctx, 0, 0, l.x+1, 6, '#ff88ee'); p(ctx, 0, 0, l.x+4, 6, '#ff88ee'); }
  }
  // Glow haze
  if (frame === 0) b(ctx, 0, 0, 6, 3, W-12, 1, '#ff44cc22');
}

function drawCyberHackerStation(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(2), H = gh(2); const cx = Math.floor(W/2);
  b(ctx, 0, 0, 2, H-6, W-4, 6, '#2a2a33');
  // Monitor
  b(ctx, 0, 0, 4, 2, W-8, H-10, '#1a1a22');
  b(ctx, 0, 0, 6, 4, W-12, H-14, '#001108');
  // Screen content per frame
  const lines = [['#00cc55','#00aa44','#00cc55'],['#0088ff','#00cc55','#0088ff'],['#ff4488','#00cc55','#ff4488']];
  const screenLines = lines[frame];
  for (let i = 0; i < 3; i++) b(ctx, 0, 0, 8, 5+i*3, W-18+i*2, 1, screenLines[i]);
  // Cursor blink
  if (frame !== 1) p(ctx, 0, 0, 8, 5+(frame===0?0:6), '#ffffff');
  // Keyboard
  b(ctx, 0, 0, 4, H-4, W-8, 2, '#333340');
}

function drawCyberFirewallNode(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(5), H = gh(5); const cx = Math.floor(W/2), cy = Math.floor(H/2);
  b(ctx, 0, 0, 4, 4, W-8, H-8, '#1a1a22');
  // Central core
  b(ctx, 0, 0, cx-6, cy-6, 12, 12, '#333340');
  b(ctx, 0, 0, cx-4, cy-4, 8, 8, '#0044aa');
  b(ctx, 0, 0, cx-2, cy-2, 4, 4, '#0066cc');
  // Shield hex pattern pulses outward per frame
  const r = 10 + frame * 6;
  for (let a = 0; a < 6; a++) {
    const angle = (a/6)*Math.PI*2;
    const hx = Math.round(cx+Math.cos(angle)*r);
    const hy = Math.round(cy+Math.sin(angle)*r);
    b(ctx, 0, 0, hx-2, hy-2, 4, 4, '#0044aa44');
    // Connect to next hex
    const nx = Math.round(cx+Math.cos(((a+1)/6)*Math.PI*2)*r);
    const ny = Math.round(cy+Math.sin(((a+1)/6)*Math.PI*2)*r);
    for (let s = 1; s < 4; s++) p(ctx, 0, 0, Math.round(hx+(nx-hx)*s/4), Math.round(hy+(ny-hy)*s/4), '#0044aa33');
  }
  // Data streams
  for (let i = 0; i < 4; i++) {
    const dy = 8 + i*12 + frame*2;
    if (dy < H-8) { b(ctx, 0, 0, 6, dy, 4, 1, '#00ff4444'); b(ctx, 0, 0, W-10, dy+2, 4, 1, '#00ff4444'); }
  }
}

// ===================== CELESTIAL NEW =====================

function drawCelestialOracleFountain(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(4), H = gh(4); const cx = Math.floor(W/2);
  b(ctx, 0, 0, 2, H-6, W-4, 6, '#c8c0b0');
  // Basin
  b(ctx, 0, 0, 6, H-14, W-12, 8, '#d0c8b8');
  b(ctx, 0, 0, 8, H-12, W-16, 4, '#2a5577');
  // Central column
  b(ctx, 0, 0, cx-3, 8, 6, H-22, '#e0d8c8');
  b(ctx, 0, 0, cx-2, 6, 4, 4, '#ece4d4');
  // Water arcs per frame
  const arcH = frame === 0 ? 4 : frame === 1 ? 8 : 2;
  b(ctx, 0, 0, cx-8, 6-arcH, 2, arcH, '#88aacc');
  b(ctx, 0, 0, cx+6, 6-arcH, 2, arcH, '#88aacc');
  // Golden shimmer
  if (frame === 1) { p(ctx, 0, 0, cx-6, 4, '#ffdd88'); p(ctx, 0, 0, cx+4, 3, '#ffdd88'); }
  if (frame === 2) { p(ctx, 0, 0, cx-4, H-12, '#88aacc'); p(ctx, 0, 0, cx+3, H-11, '#88aacc'); }
}

function drawCelestialMarbleColossus(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(3), H = gh(5); const cx = Math.floor(W/2);
  b(ctx, 0, 0, 2, H-6, W-4, 6, '#c8c0b0');
  // Body
  b(ctx, 0, 0, cx-6, 16, 12, H-22, '#e0d8c8');
  b(ctx, 0, 0, cx-8, 20, 16, H-28, '#d0c8b8');
  // Head
  b(ctx, 0, 0, cx-4, 8, 8, 10, '#ece4d4');
  // Eyes glow per frame
  const eyeGlow = frame === 0 ? '#ffdd88' : frame === 1 ? '#ffffff' : '#eebb66';
  p(ctx, 0, 0, cx-2, 12, eyeGlow); p(ctx, 0, 0, cx+1, 12, eyeGlow);
  // Held flame
  b(ctx, 0, 0, cx+8, 18, 4, 3, frame===1 ? '#ffcc44' : '#ff8822');
  p(ctx, 0, 0, cx+9, 17, frame===2 ? '#ffcc44' : '#ff6622');
  // Arms
  b(ctx, 0, 0, cx-10, 22, 4, 14, '#d0c8b8');
  b(ctx, 0, 0, cx+6, 22, 4, 14, '#d0c8b8');
}

function drawCelestialCloudThrone(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(4), H = gh(3); const cx = Math.floor(W/2);
  // Cloud base shifts per frame
  const cloudOff = frame * 2;
  b(ctx, 0, 0, 2+cloudOff, H-8, W-4, 6, '#dde8f0');
  b(ctx, 0, 0, 4+cloudOff, H-10, W-8, 4, '#eef4f8');
  b(ctx, 0, 0, 0, H-6, 6, 4, '#ccdde8');
  // Throne
  b(ctx, 0, 0, cx-8, 4, 16, H-12, '#e0d8c8');
  b(ctx, 0, 0, cx-6, 2, 12, 4, '#ece4d4');
  b(ctx, 0, 0, cx-10, 6, 4, H-14, '#d0c8b8');
  b(ctx, 0, 0, cx+6, 6, 4, H-14, '#d0c8b8');
  // Cushion
  b(ctx, 0, 0, cx-6, H-14, 12, 4, '#8866aa');
  // Cloud wisps
  p(ctx, 0, 0, W-6-cloudOff, H-4, '#eef4f8');
}

function drawCelestialSunDial(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(2), H = gh(2); const cx = Math.floor(W/2), cy = Math.floor(H/2);
  b(ctx, 0, 0, 2, 2, W-4, H-4, '#c8c0b0');
  // Dial face (circle)
  for (let a = 0; a < 360; a += 20) { const r = 8; p(ctx, 0, 0, Math.round(cx+Math.cos(a*Math.PI/180)*r), Math.round(cy+Math.sin(a*Math.PI/180)*r), '#998866'); }
  // Gnomon
  p(ctx, 0, 0, cx, cy, '#666655');
  // Shadow direction per frame (N,E,S,W)
  const dirs = [[0,-1],[1,0],[0,1],[-1,0]];
  const [dx,dy] = dirs[frame];
  for (let i = 1; i <= 5; i++) p(ctx, 0, 0, cx+dx*i, cy+dy*i, '#44444488');
  // Hour marks
  for (let i = 0; i < 4; i++) { const a = (i/4)*Math.PI*2; p(ctx, 0, 0, Math.round(cx+Math.cos(a)*10), Math.round(cy+Math.sin(a)*10), '#aa9966'); }
}

function drawCelestialAltarOfLight(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(3), H = gh(2); const cx = Math.floor(W/2);
  b(ctx, 0, 0, 4, H-8, W-8, 8, '#d0c8b8');
  b(ctx, 0, 0, 6, H-10, W-12, 4, '#e0d8c8');
  b(ctx, 0, 0, cx-4, H-12, 8, 3, '#ece4d4');
  // Light beam per frame
  const beamW = frame === 0 ? 4 : frame === 1 ? 8 : 12;
  const beamAlpha = frame === 0 ? '#ffdd8888' : frame === 1 ? '#ffdd8866' : '#ffdd8844';
  b(ctx, 0, 0, cx-beamW/2, 0, beamW, H-12, beamAlpha);
  // Gem on altar
  b(ctx, 0, 0, cx-1, H-13, 2, 2, '#ffdd88');
  p(ctx, 0, 0, cx, H-13, frame === 0 ? '#ffffff' : '#ffee99');
}

function drawCelestialAngelicStatue(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(2), H = gh(4); const cx = Math.floor(W/2);
  b(ctx, 0, 0, 2, H-6, W-4, 6, '#c8c0b0');
  // Body
  b(ctx, 0, 0, cx-4, 14, 8, H-20, '#e0d8c8');
  // Head
  b(ctx, 0, 0, cx-3, 8, 6, 6, '#ece4d4');
  // Halo
  b(ctx, 0, 0, cx-4, 5, 8, 2, '#ffdd88');
  p(ctx, 0, 0, cx, 5, frame === 1 ? '#ffffff' : '#ffee99');
  // Wings per frame
  const wingSpread = frame === 0 ? 2 : frame === 1 ? 4 : 6;
  b(ctx, 0, 0, cx-4-wingSpread, 12, wingSpread, 16, '#ddd5c5');
  b(ctx, 0, 0, cx+4, 12, wingSpread, 16, '#ddd5c5');
  p(ctx, 0, 0, cx-4-wingSpread, 14, '#ece4d4');
  p(ctx, 0, 0, cx+3+wingSpread, 14, '#ece4d4');
}

// ===================== ALIENS NEW =====================

function drawAlienEggCluster(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(4), H = gh(4);
  b(ctx, 0, 0, 0, 0, W, H, '#1a1022');
  // Eggs
  const eggs = [[10,10],[20,8],[30,12],[14,22],[26,20],[18,32],[28,30],[8,34]];
  for (let i = 0; i < eggs.length; i++) {
    const [ex,ey] = eggs[i];
    const pulse = (i + frame) % 3 === 0;
    b(ctx, 0, 0, ex, ey, 5, 7, pulse ? '#778866' : '#556644');
    b(ctx, 0, 0, ex, ey, 5, 1, '#667755');
    p(ctx, 0, 0, ex+2, ey+2, '#889977');
    if (i === 3 && frame >= 1) { p(ctx, 0, 0, ex+1, ey+3, '#333322'); if (frame === 2) { p(ctx, 0, 0, ex+2, ey+3, '#44ff88'); } }
  }
  // Slime
  for (const [ex,ey] of eggs) p(ctx, 0, 0, ex+2, ey+7, '#44aa6644');
}

function drawAlienAcidPool(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(4), H = gh(3); const cx = Math.floor(W/2), cy = Math.floor(H/2);
  b(ctx, 0, 0, 0, 0, W, H, '#1a1022');
  // Pool edge
  for (let x = 4; x < W-4; x++) for (let y = 4; y < H-4; y++) {
    const d = Math.sqrt(((x-cx)/1.4)**2 + ((y-cy)/1)**2);
    if (d < 16) p(ctx, 0, 0, x, y, d < 12 ? '#44cc44' : '#2a4422');
  }
  // Bubble per frame
  const bubSize = frame + 1;
  b(ctx, 0, 0, cx-bubSize, cy-4-frame*2, bubSize*2, bubSize, '#66ee66');
  if (frame === 2) { p(ctx, 0, 0, cx-3, cy-8, '#44cc4444'); p(ctx, 0, 0, cx+2, cy-9, '#44cc4444'); }
}

function drawAlienChitinWall(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(5), H = gh(2);
  b(ctx, 0, 0, 0, 0, W, H, '#3a2244');
  b(ctx, 0, 0, 2, 2, W-4, H-4, '#442a55');
  // Chitin plates
  for (let x = 4; x < W-4; x += 8) { b(ctx, 0, 0, x, 4, 6, H-8, '#553366'); b(ctx, 0, 0, x+1, 5, 4, H-10, '#664477'); }
  // Resin glisten shifts per frame
  const glistenX = 6 + frame * Math.floor((W-12)/2);
  p(ctx, 0, 0, glistenX, 6, '#88aacc'); p(ctx, 0, 0, glistenX+2, 7, '#88aacc88');
  // Veins pulse
  for (let x = 8; x < W-8; x += 6) { p(ctx, 0, 0, x, H/2, (x/6 + frame) % 2 === 0 ? '#44cc88' : '#339966'); }
}

function drawAlienSporeVent(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(2), H = gh(3); const cx = Math.floor(W/2);
  b(ctx, 0, 0, 0, 0, W, H, '#1a1022');
  // Vent organic tube
  b(ctx, 0, 0, cx-5, H-14, 10, 12, '#3a2244');
  b(ctx, 0, 0, cx-3, H-12, 6, 8, '#442a55');
  // Opening
  b(ctx, 0, 0, cx-4, H-16, 8, 4, '#553366');
  b(ctx, 0, 0, cx-2, H-16, 4, 2, '#1a1022');
  // Spore puff rises per frame
  const sporeY = H - 18 - frame * 8;
  if (sporeY > 0) {
    b(ctx, 0, 0, cx-2-frame, sporeY, 4+frame*2, 3, '#44cc8844');
    p(ctx, 0, 0, cx, sporeY, '#66ee88');
    if (frame > 0) p(ctx, 0, 0, cx-2, sporeY-2, '#44cc8833');
  }
}

function drawAlienCocoonCluster(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(3), H = gh(3);
  b(ctx, 0, 0, 0, 0, W, H, '#1a1022');
  // Cocoons
  const cocoons = [[8,6,10,14],[22,4,8,16],[14,20,10,12]];
  for (let i = 0; i < cocoons.length; i++) {
    const [cx_,cy_,cw,ch] = cocoons[i];
    b(ctx, 0, 0, cx_, cy_, cw, ch, '#444466');
    b(ctx, 0, 0, cx_+1, cy_+1, cw-2, ch-2, '#555577');
    // Web strands
    p(ctx, 0, 0, cx_-1, cy_+2, '#666688'); p(ctx, 0, 0, cx_+cw, cy_+ch-3, '#666688');
    // Squirm bulge shifts per frame
    if (i === frame) {
      const bulgeY = cy_ + Math.floor(ch/3) + frame;
      b(ctx, 0, 0, cx_+cw-2, bulgeY, 3, 3, '#666688');
    }
  }
}

function drawAlienFeedingPit(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(5), H = gh(5); const cx = Math.floor(W/2), cy = Math.floor(H/2);
  b(ctx, 0, 0, 0, 0, W, H, '#1a1022');
  // Pit
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
    const d = Math.sqrt((x-cx)**2 + (y-cy)**2);
    if (d < 24) p(ctx, 0, 0, x, y, d < 16 ? '#110818' : d < 20 ? '#221428' : '#332040');
  }
  // Acid at bottom
  b(ctx, 0, 0, cx-8, cy-4, 16, 8, '#44cc44');
  b(ctx, 0, 0, cx-6, cy-2, 12, 4, '#66ee66');
  // Tentacles in different positions per frame
  const tentAngles = [[30,150,270],[60,180,300],[0,120,240]];
  for (const a of tentAngles[frame]) {
    const rad = a*Math.PI/180;
    for (let d = 8; d < 20; d += 2) {
      p(ctx, 0, 0, Math.round(cx+Math.cos(rad)*d), Math.round(cy+Math.sin(rad)*d), '#442266');
    }
  }
}

function drawAlienTunnelMouth(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(3), H = gh(2); const cx = Math.floor(W/2);
  b(ctx, 0, 0, 0, 0, W, H, '#3a2244');
  // Opening
  b(ctx, 0, 0, cx-10, 2, 20, H-4, '#110818');
  b(ctx, 0, 0, cx-8, 4, 16, H-8, '#0a0410');
  // Mandible edges per frame
  const mandInset = frame === 0 ? 0 : frame === 1 ? 2 : 4;
  b(ctx, 0, 0, cx-10, 2, 3, H-4, '#553366');
  b(ctx, 0, 0, cx+7, 2, 3, H-4, '#553366');
  b(ctx, 0, 0, cx-10+mandInset, 4, 2, H-8, '#664477');
  b(ctx, 0, 0, cx+8-mandInset, 4, 2, H-8, '#664477');
  // Slime drips
  p(ctx, 0, 0, cx-6, H-4, '#44aa66'); p(ctx, 0, 0, cx+4, H-3, '#44aa66');
}

// ===================== HARMONIC NEW =====================

function drawHarmonicPipeOrgan(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(5), H = gh(5); const cx = Math.floor(W/2);
  b(ctx, 0, 0, 0, H-6, W, 6, '#3a2a1a');
  // Console
  b(ctx, 0, 0, cx-12, H-16, 24, 10, '#664433');
  b(ctx, 0, 0, cx-10, H-14, 20, 6, '#eeeecc'); // keyboard
  // Pipes of varying heights
  for (let i = 0; i < 9; i++) {
    const px = 8 + i * 7; const ph = 20 + Math.abs(i-4)*6;
    b(ctx, 0, 0, px, H-16-ph, 4, ph, '#ccaa44');
    b(ctx, 0, 0, px+1, H-16-ph, 2, ph, '#ddbb55');
    b(ctx, 0, 0, px, H-16-ph-2, 4, 2, '#eedd66');
  }
  // Sound waves per frame
  if (frame === 0) { for (let i = 0; i < 3; i++) p(ctx, 0, 0, 6+i*2, H-20-20-i*3, '#aa884444'); }
  if (frame === 1) { b(ctx, 0, 0, cx-8, H-16, 16, 1, '#eeeeaa'); } // keys pressed
  if (frame === 2) { for (let i = 0; i < 3; i++) p(ctx, 0, 0, W-8-i*2, H-20-20-i*3, '#aa884444'); }
}

function drawHarmonicDjBooth(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(4), H = gh(3); const cx = Math.floor(W/2);
  b(ctx, 0, 0, 2, H-6, W-4, 6, '#222222');
  b(ctx, 0, 0, 4, 6, W-8, H-12, '#333333');
  // Turntable
  b(ctx, 0, 0, 6, 8, 16, 12, '#222222');
  const discAngle = frame * 30;
  b(ctx, 0, 0, 8, 10, 12, 8, '#111111');
  p(ctx, 0, 0, 12 + (frame%2), 13, '#cccccc'); // label dot rotates
  // EQ display
  const eqBars = [3,5,7,4,6,8,5,3];
  for (let i = 0; i < eqBars.length; i++) {
    const bh = frame === 1 ? eqBars[i]+2 : frame === 2 ? eqBars[i] : eqBars[i]-1;
    b(ctx, 0, 0, 28+i*3, H-12-Math.max(1,bh), 2, Math.max(1,bh), i<4 ? '#44aaff' : '#ff4488');
  }
  // Headphones
  b(ctx, 0, 0, W-10, 6, 6, 4, '#444444');
}

function drawHarmonicSpeakerStack(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(2), H = gh(4); const cx = Math.floor(W/2);
  b(ctx, 0, 0, 2, 2, W-4, H-4, '#333333');
  // Speakers (3 stacked)
  for (let i = 0; i < 3; i++) {
    const sy = 4 + i * Math.floor((H-8)/3);
    const sh = Math.floor((H-12)/3);
    b(ctx, 0, 0, 4, sy, W-8, sh, '#222222');
    // Cone
    const coneR = 4 + (i === 2 ? 2 : 0); // bass bigger
    const ccx = cx, ccy = sy + sh/2;
    b(ctx, 0, 0, ccx-coneR, ccy-coneR, coneR*2, coneR*2, '#444444');
    const pulse = frame === i ? 2 : 0;
    b(ctx, 0, 0, ccx-coneR+1+pulse, ccy-coneR+1+pulse, (coneR-1-pulse)*2, (coneR-1-pulse)*2, '#555555');
  }
  // Bass wave
  if (frame > 0) { b(ctx, 0, 0, 0, H/2-1, 2, 2, '#44444444'); b(ctx, 0, 0, W-2, H/2-1, 2, 2, '#44444444'); }
}

function drawHarmonicHarp(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(2), H = gh(3); const cx = Math.floor(W/2);
  b(ctx, 0, 0, cx-2, H-4, 4, 4, '#ccaa44');
  // Frame
  b(ctx, 0, 0, cx-8, 2, 3, H-6, '#ddbb55');
  b(ctx, 0, 0, cx-8, 2, 16, 3, '#ddbb55');
  b(ctx, 0, 0, cx+6, 4, 2, H-10, '#ccaa44');
  // Strings
  for (let i = 0; i < 7; i++) {
    const sx = cx - 5 + i * 2;
    b(ctx, 0, 0, sx, 5, 1, H-10, '#eedd66');
    // Shimmer per frame
    const shimmer = Math.floor(i/3) === frame;
    if (shimmer) p(ctx, 0, 0, sx, 10+i*2, '#ffffff');
  }
  // Sound ornament
  p(ctx, 0, 0, cx-8, 2, '#eedd66');
}

function drawHarmonicMusicStand(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(2), H = gh(2); const cx = Math.floor(W/2);
  // Stand pole
  b(ctx, 0, 0, cx-1, H/2, 2, H/2, '#444444');
  b(ctx, 0, 0, cx-4, H-3, 8, 2, '#555555');
  // Music holder
  b(ctx, 0, 0, cx-8, 2, 16, 2, '#444444');
  // Sheet music - page turns per frame
  if (frame === 0) { b(ctx, 0, 0, cx-7, 4, 14, 10, '#eeeecc'); b(ctx, 0, 0, cx-5, 5, 4, 1, '#222222'); b(ctx, 0, 0, cx-5, 7, 6, 1, '#222222'); }
  else if (frame === 1) { b(ctx, 0, 0, cx-4, 4, 8, 10, '#ddddbb'); b(ctx, 0, 0, cx+2, 4, 5, 10, '#eeeecc'); }
  else { b(ctx, 0, 0, cx-7, 4, 14, 10, '#eeeecc'); b(ctx, 0, 0, cx+1, 5, 4, 1, '#222222'); b(ctx, 0, 0, cx, 7, 5, 1, '#222222'); }
}

function drawHarmonicSpotlightRig(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(4), H = gh(2);
  // Metal rig
  b(ctx, 0, 0, 0, 2, W, 3, '#888888');
  b(ctx, 0, 0, 4, 0, 2, 4, '#777777');
  b(ctx, 0, 0, W-6, 0, 2, 4, '#777777');
  // Spotlights with colors per frame
  const spotColors = [['#ff4444','#4444ff'],['#44ff44','#ffff44'],['#aa44ff','#44ffff']];
  const [c1,c2] = spotColors[frame];
  // Left spotlight
  b(ctx, 0, 0, 8, 5, 4, 3, '#666666');
  b(ctx, 0, 0, 6, 8, 8, H-10, c1 + '44');
  p(ctx, 0, 0, 9, 5, c1);
  // Right spotlight
  b(ctx, 0, 0, W-12, 5, 4, 3, '#666666');
  b(ctx, 0, 0, W-14, 8, 8, H-10, c2 + '44');
  p(ctx, 0, 0, W-11, 5, c2);
  // Center spotlight
  const ccx = Math.floor(W/2);
  b(ctx, 0, 0, ccx-2, 5, 4, 3, '#666666');
  b(ctx, 0, 0, ccx-4, 8, 8, H-10, '#ffffff22');
  p(ctx, 0, 0, ccx, 5, '#ffffff');
}

// ===================== VOID NEW =====================

function drawVoidRiftPortal(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(5), H = gh(5); const cx = Math.floor(W/2), cy = Math.floor(H/2);
  b(ctx, 0, 0, 0, 0, W, H, '#0a0418');
  // Portal rim
  for (let a = 0; a < 360; a += 5) { const r = 26; const rx = Math.round(cx+Math.cos(a*Math.PI/180)*r); const ry = Math.round(cy+Math.sin(a*Math.PI/180)*r); p(ctx, 0, 0, rx, ry, '#6622aa'); }
  // Vortex spiral
  const colors = ['#8844cc','#4466cc','#cc4466'];
  const vc = colors[frame];
  for (let a = 0; a < 360; a += 15) {
    const angle = (a + frame*30) * Math.PI / 180;
    const r = 4 + (a/360) * 20;
    p(ctx, 0, 0, Math.round(cx+Math.cos(angle)*r), Math.round(cy+Math.sin(angle)*r), vc);
  }
  // Bright center
  b(ctx, 0, 0, cx-3, cy-3, 6, 6, '#ffffff44');
  b(ctx, 0, 0, cx-1, cy-1, 2, 2, '#ffffff');
}

function drawVoidChaosObelisk(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(2), H = gh(5); const cx = Math.floor(W/2);
  b(ctx, 0, 0, 2, H-4, W-4, 4, '#1a1028');
  // Obelisk body
  b(ctx, 0, 0, cx-4, 4, 8, H-8, '#221438');
  b(ctx, 0, 0, cx-3, 2, 6, H-6, '#2a1844');
  b(ctx, 0, 0, cx-2, 0, 4, 4, '#332255');
  // Runes cycle per frame
  const runeColors = ['#8844cc','#44ccaa','#44cc44'];
  const rc = runeColors[frame];
  for (let y = 10; y < H-8; y += 8) {
    p(ctx, 0, 0, cx-1, y, rc); p(ctx, 0, 0, cx+1, y+1, rc); p(ctx, 0, 0, cx-1, y+2, rc);
  }
  p(ctx, 0, 0, cx, 1, rc);
}

function drawVoidDiceAltar(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(3), H = gh(3); const cx = Math.floor(W/2);
  b(ctx, 0, 0, 4, H-8, W-8, 8, '#332255');
  b(ctx, 0, 0, 6, H-12, W-12, 5, '#443366');
  // Die on top
  b(ctx, 0, 0, cx-5, 6, 10, 10, '#e0d8c8');
  b(ctx, 0, 0, cx-4, 7, 8, 8, '#ece4d4');
  // Face per frame
  if (frame === 0) { p(ctx, 0, 0, cx, 11, '#1a1028'); } // 1
  else if (frame === 1) { p(ctx, 0, 0, cx-2, 9, '#1a1028'); p(ctx, 0, 0, cx+1, 9, '#1a1028'); p(ctx, 0, 0, cx-2, 12, '#1a1028'); p(ctx, 0, 0, cx+1, 12, '#1a1028'); } // 4
  else { for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) p(ctx, 0, 0, cx-2+c*3, 8+r*3, '#1a1028'); } // 6
  // Purple glow
  p(ctx, 0, 0, cx-6, H-10, '#6622aa');
  p(ctx, 0, 0, cx+5, H-10, '#6622aa');
}

function drawVoidRouletteWheel(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(4), H = gh(4); const cx = Math.floor(W/2), cy = Math.floor(H/2);
  b(ctx, 0, 0, 0, 0, W, H, '#1a1028');
  // Wheel rim (gold)
  for (let a = 0; a < 360; a += 8) { const r = 20; p(ctx, 0, 0, Math.round(cx+Math.cos(a*Math.PI/180)*r), Math.round(cy+Math.sin(a*Math.PI/180)*r), '#ccaa44'); }
  // Segments rotate per frame
  const segColors = ['#cc2222','#111111','#22cc22','#111111','#cc2222','#111111','#cc2222','#111111'];
  for (let i = 0; i < 8; i++) {
    const a = ((i + frame*2) / 8) * Math.PI * 2;
    for (let d = 4; d < 18; d += 2) {
      p(ctx, 0, 0, Math.round(cx+Math.cos(a)*d), Math.round(cy+Math.sin(a)*d), segColors[i]);
    }
  }
  // Center hub
  b(ctx, 0, 0, cx-2, cy-2, 4, 4, '#ccaa44');
  p(ctx, 0, 0, cx, cy, '#eedd66');
  // Ball
  const ballAngle = (frame / 4) * Math.PI * 2 + 0.5;
  p(ctx, 0, 0, Math.round(cx+Math.cos(ballAngle)*16), Math.round(cy+Math.sin(ballAngle)*16), '#ffffff');
}

function drawVoidCrystal(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(2), H = gh(3); const cx = Math.floor(W/2);
  b(ctx, 0, 0, 2, H-4, W-4, 4, '#1a1028');
  // Crystal body — opacity per frame
  const colors = ['#8844cc', '#aa88ee88', '#6644aa44'];
  const c = colors[frame];
  b(ctx, 0, 0, cx-4, 6, 8, H-10, c);
  b(ctx, 0, 0, cx-3, 4, 6, 4, c);
  b(ctx, 0, 0, cx-2, 2, 4, 4, c);
  p(ctx, 0, 0, cx, 1, c);
  // Outline always visible
  if (frame >= 1) {
    for (let y = 4; y < H-4; y += 3) { p(ctx, 0, 0, cx-4, y, '#6622aa'); p(ctx, 0, 0, cx+3, y, '#6622aa'); }
  }
}

function drawVoidCardTable(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(3), H = gh(2); const cx = Math.floor(W/2);
  b(ctx, 0, 0, 2, H-4, W-4, 4, '#1a1028');
  // Table
  b(ctx, 0, 0, 4, 4, W-8, H-8, '#224422');
  b(ctx, 0, 0, 6, 6, W-12, H-12, '#336633');
  // Card per frame
  if (frame === 0) { b(ctx, 0, 0, cx-3, 6, 6, 8, '#8844cc'); b(ctx, 0, 0, cx-2, 7, 4, 6, '#6622aa'); } // face down
  else if (frame === 1) { b(ctx, 0, 0, cx-2, 6, 4, 8, '#8844cc'); } // tilting
  else { b(ctx, 0, 0, cx-3, 6, 6, 8, '#e0d8c8'); p(ctx, 0, 0, cx-1, 8, '#1a1028'); b(ctx, 0, 0, cx-1, 10, 2, 2, '#cc2244'); } // face up with skull
}

function drawVoidFortuneTeller(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(3), H = gh(4); const cx = Math.floor(W/2);
  b(ctx, 0, 0, 0, 0, W, H, '#1a1028');
  // Booth frame
  b(ctx, 0, 0, 2, 2, W-4, H-4, '#442266');
  b(ctx, 0, 0, 4, 4, W-8, H-8, '#553388');
  // Drapes
  b(ctx, 0, 0, 2, 2, 3, H-4, '#331855');
  b(ctx, 0, 0, W-5, 2, 3, H-4, '#331855');
  // Table inside
  b(ctx, 0, 0, 6, H-14, W-12, 6, '#442266');
  // Crystal ball
  b(ctx, 0, 0, cx-4, H-22, 8, 8, '#333344');
  b(ctx, 0, 0, cx-3, H-21, 6, 6, '#444466');
  // Ball swirl color per frame
  const ballColors = ['#4488ff', '#8844cc', '#44cc66'];
  b(ctx, 0, 0, cx-2, H-20, 4, 4, ballColors[frame]);
  p(ctx, 0, 0, cx, H-19, '#ffffff');
  // Stand
  b(ctx, 0, 0, cx-2, H-14, 4, 2, '#555555');
}


// ===================== Structure Registry =====================

export const structures: StructureDef[] = [
  // Military (10)
  { key: 'military_hq', label: 'Military HQ (5x4)', faction: 'Military', widthCells: 5, heightCells: 4, animFrames: 3, draw: drawMilitaryHQ },
  { key: 'military_barracks', label: 'Military Barracks (5x3)', faction: 'Military', widthCells: 5, heightCells: 3, animFrames: 3, draw: drawMilitaryBarracks },
  { key: 'military_motor_pool', label: 'Military Motor Pool (5x4)', faction: 'Military', widthCells: 5, heightCells: 4, animFrames: 3, draw: drawMilitaryMotorPool },
  { key: 'military_supply_depot', label: 'Military Supply Depot (5x3)', faction: 'Military', widthCells: 5, heightCells: 3, animFrames: 3, draw: drawMilitarySupplyDepot },
  { key: 'military_comms_tower', label: 'Military Comms Tower (2x5)', faction: 'Military', widthCells: 2, heightCells: 5, animFrames: 3, draw: drawMilitaryCommsTower },
  { key: 'military_guard_tower', label: 'Military Guard Tower (2x3)', faction: 'Military', widthCells: 2, heightCells: 3, animFrames: 3, draw: drawMilitaryGuardTower },
  { key: 'military_ammo_bunker', label: 'Military Ammo Bunker (3x3)', faction: 'Military', widthCells: 3, heightCells: 3, animFrames: 3, draw: drawMilitaryAmmoBunker },
  { key: 'military_radar_dish', label: 'Military Radar Dish (3x4)', faction: 'Military', widthCells: 3, heightCells: 4, animFrames: 4, draw: drawMilitaryRadarDish },
  { key: 'military_tank_hangar', label: 'Military Tank Hangar (6x4)', faction: 'Military', widthCells: 6, heightCells: 4, animFrames: 3, draw: drawMilitaryTankHangar },
  { key: 'military_landing_pad', label: 'Military Landing Pad (5x5)', faction: 'Military', widthCells: 5, heightCells: 5, animFrames: 3, draw: drawMilitaryLandingPad },
  // Psionic (8)
  { key: 'psionic_brain_vat', label: 'Psionic Brain Vat (3x5)', faction: 'Psionic', widthCells: 3, heightCells: 5, animFrames: 3, draw: drawPsionicBrainVat },
  { key: 'psionic_thought_amp', label: 'Psionic Thought Amplifier (2x3)', faction: 'Psionic', widthCells: 2, heightCells: 3, animFrames: 3, draw: drawPsionicThoughtAmp },
  { key: 'psionic_memory_bank', label: 'Psionic Memory Bank (3x3)', faction: 'Psionic', widthCells: 3, heightCells: 3, animFrames: 3, draw: drawPsionicMemoryBank },
  { key: 'psionic_neural_loom', label: 'Psionic Neural Loom (4x4)', faction: 'Psionic', widthCells: 4, heightCells: 4, animFrames: 3, draw: drawPsionicNeuralLoom },
  { key: 'psionic_stasis_pod', label: 'Psionic Stasis Pod (2x4)', faction: 'Psionic', widthCells: 2, heightCells: 4, animFrames: 3, draw: drawPsionicStasisPod },
  { key: 'psionic_synapse_hub', label: 'Psionic Synapse Hub (3x2)', faction: 'Psionic', widthCells: 3, heightCells: 2, animFrames: 3, draw: drawPsionicSynapseHub },
  { key: 'psionic_psychic_beacon', label: 'Psionic Psychic Beacon (2x2)', faction: 'Psionic', widthCells: 2, heightCells: 2, animFrames: 3, draw: drawPsionicPsychicBeacon },
  { key: 'psionic_dream_chamber', label: 'Psionic Dream Chamber (5x4)', faction: 'Psionic', widthCells: 5, heightCells: 4, animFrames: 3, draw: drawPsionicDreamChamber },
  // Infernal (8)
  { key: 'infernal_throne', label: 'Infernal Throne (7x4)', faction: 'Infernal', widthCells: 7, heightCells: 4, animFrames: 3, draw: drawInfernalThrone },
  { key: 'infernal_spire', label: 'Infernal Spire (2x5)', faction: 'Infernal', widthCells: 2, heightCells: 5, animFrames: 3, draw: drawInfernalSpire },
  { key: 'infernal_altar', label: 'Infernal Altar (5x3)', faction: 'Infernal', widthCells: 5, heightCells: 3, animFrames: 3, draw: drawInfernalAltar },
  { key: 'infernal_bone_cage', label: 'Infernal Bone Cage (3x4)', faction: 'Infernal', widthCells: 3, heightCells: 4, animFrames: 3, draw: drawInfernalBoneCage },
  { key: 'infernal_lava_font', label: 'Infernal Lava Font (3x3)', faction: 'Infernal', widthCells: 3, heightCells: 3, animFrames: 3, draw: drawInfernalLavaFont },
  { key: 'infernal_demon_gate', label: 'Infernal Demon Gate (5x5)', faction: 'Infernal', widthCells: 5, heightCells: 5, animFrames: 3, draw: drawInfernalDemonGate },
  { key: 'infernal_skull_pile', label: 'Infernal Skull Pile (3x2)', faction: 'Infernal', widthCells: 3, heightCells: 2, animFrames: 3, draw: drawInfernalSkullPile },
  { key: 'infernal_torture_rack', label: 'Infernal Torture Rack (2x3)', faction: 'Infernal', widthCells: 2, heightCells: 3, animFrames: 3, draw: drawInfernalTortureRack },
  // Arcane (8)
  { key: 'arcane_wizard_tower', label: 'Arcane Wizard Tower (3x5)', faction: 'Arcane', widthCells: 3, heightCells: 5, animFrames: 3, draw: drawArcaneWizardTower },
  { key: 'arcane_crystal_nexus', label: 'Arcane Crystal Nexus (5x5)', faction: 'Arcane', widthCells: 5, heightCells: 5, animFrames: 4, draw: drawArcaneCrystalNexus },
  { key: 'arcane_rune_circle', label: 'Arcane Rune Circle (3x3)', faction: 'Arcane', widthCells: 3, heightCells: 3, animFrames: 3, draw: drawArcaneRuneCircle },
  { key: 'arcane_scrying_pool', label: 'Arcane Scrying Pool (3x3)', faction: 'Arcane', widthCells: 3, heightCells: 3, animFrames: 3, draw: drawArcaneScryingPool },
  { key: 'arcane_spell_forge', label: 'Arcane Spell Forge (4x3)', faction: 'Arcane', widthCells: 4, heightCells: 3, animFrames: 3, draw: drawArcaneSpellForge },
  { key: 'arcane_crystal_cluster', label: 'Arcane Crystal Cluster (2x3)', faction: 'Arcane', widthCells: 2, heightCells: 3, animFrames: 3, draw: drawArcaneCrystalCluster },
  { key: 'arcane_enchanting_table', label: 'Arcane Enchanting Table (3x2)', faction: 'Arcane', widthCells: 3, heightCells: 2, animFrames: 3, draw: drawArcaneEnchantingTable },
  { key: 'arcane_mana_well', label: 'Arcane Mana Well (2x2)', faction: 'Arcane', widthCells: 2, heightCells: 2, animFrames: 3, draw: drawArcaneManaWell },
  // Mechanical (8)
  { key: 'mech_furnace', label: 'Mech Furnace (6x6)', faction: 'Mechanical', widthCells: 6, heightCells: 6, animFrames: 3, draw: drawMechFurnace },
  { key: 'mech_press', label: 'Mech Press (8x5)', faction: 'Mechanical', widthCells: 8, heightCells: 5, animFrames: 3, draw: drawMechPress },
  { key: 'mech_gear_assembly', label: 'Mech Gear Assembly (4x4)', faction: 'Mechanical', widthCells: 4, heightCells: 4, animFrames: 4, draw: drawMechGearAssembly },
  { key: 'mech_steam_boiler', label: 'Mech Steam Boiler (3x4)', faction: 'Mechanical', widthCells: 3, heightCells: 4, animFrames: 3, draw: drawMechSteamBoiler },
  { key: 'mech_conveyor_terminal', label: 'Mech Conveyor Terminal (4x2)', faction: 'Mechanical', widthCells: 4, heightCells: 2, animFrames: 3, draw: drawMechConveyorTerminal },
  { key: 'mech_crane_arm', label: 'Mech Crane Arm (2x5)', faction: 'Mechanical', widthCells: 2, heightCells: 5, animFrames: 3, draw: drawMechCraneArm },
  { key: 'mech_scrap_heap', label: 'Mech Scrap Heap (3x3)', faction: 'Mechanical', widthCells: 3, heightCells: 3, animFrames: 3, draw: drawMechScrapHeap },
  { key: 'mech_smokestack', label: 'Mech Smokestack (2x6)', faction: 'Mechanical', widthCells: 2, heightCells: 6, animFrames: 3, draw: drawMechSmokestack },
  // Nature (8)
  { key: 'nature_ancient_tree', label: 'Nature Ancient Tree (7x7)', faction: 'Nature', widthCells: 7, heightCells: 7, animFrames: 3, draw: drawNatureAncientTree },
  { key: 'nature_sacred_pond', label: 'Nature Sacred Pond (5x4)', faction: 'Nature', widthCells: 5, heightCells: 4, animFrames: 3, draw: drawNatureSacredPond },
  { key: 'nature_mushroom_ring', label: 'Nature Mushroom Ring (4x4)', faction: 'Nature', widthCells: 4, heightCells: 4, animFrames: 3, draw: drawNatureMushroomRing },
  { key: 'nature_hollow_log', label: 'Nature Hollow Log (4x2)', faction: 'Nature', widthCells: 4, heightCells: 2, animFrames: 3, draw: drawNatureHollowLog },
  { key: 'nature_berry_bush', label: 'Nature Berry Bush (2x2)', faction: 'Nature', widthCells: 2, heightCells: 2, animFrames: 3, draw: drawNatureBerryBush },
  { key: 'nature_stone_shrine', label: 'Nature Stone Shrine (3x3)', faction: 'Nature', widthCells: 3, heightCells: 3, animFrames: 3, draw: drawNatureStoneShrine },
  { key: 'nature_waterfall', label: 'Nature Waterfall (3x5)', faction: 'Nature', widthCells: 3, heightCells: 5, animFrames: 3, draw: drawNatureWaterfall },
  { key: 'nature_bee_hive', label: 'Nature Bee Hive (1x2)', faction: 'Nature', widthCells: 1, heightCells: 2, animFrames: 3, draw: drawNatureBeeHive },
  // Cypherpunk (8)
  { key: 'cyber_mainframe', label: 'Cyber Mainframe (3x6)', faction: 'Cypherpunk', widthCells: 3, heightCells: 6, animFrames: 3, draw: drawCyberMainframe },
  { key: 'cyber_server_farm', label: 'Cyber Server Farm (5x4)', faction: 'Cypherpunk', widthCells: 5, heightCells: 4, animFrames: 3, draw: drawCyberServerFarm },
  { key: 'cyber_hologram_table', label: 'Cyber Hologram Table (4x3)', faction: 'Cypherpunk', widthCells: 4, heightCells: 3, animFrames: 3, draw: drawCyberHologramTable },
  { key: 'cyber_cable_nest', label: 'Cyber Cable Nest (3x3)', faction: 'Cypherpunk', widthCells: 3, heightCells: 3, animFrames: 3, draw: drawCyberCableNest },
  { key: 'cyber_crypto_miner', label: 'Cyber Crypto Miner (3x2)', faction: 'Cypherpunk', widthCells: 3, heightCells: 2, animFrames: 3, draw: drawCyberCryptoMiner },
  { key: 'cyber_neon_sign', label: 'Cyber Neon Sign (4x2)', faction: 'Cypherpunk', widthCells: 4, heightCells: 2, animFrames: 3, draw: drawCyberNeonSign },
  { key: 'cyber_hacker_station', label: 'Cyber Hacker Station (2x2)', faction: 'Cypherpunk', widthCells: 2, heightCells: 2, animFrames: 3, draw: drawCyberHackerStation },
  { key: 'cyber_firewall_node', label: 'Cyber Firewall Node (5x5)', faction: 'Cypherpunk', widthCells: 5, heightCells: 5, animFrames: 3, draw: drawCyberFirewallNode },
  // Celestial (8)
  { key: 'celestial_sanctum', label: 'Celestial Sanctum (12x2)', faction: 'Celestial', widthCells: 12, heightCells: 2, animFrames: 3, draw: drawCelestialSanctum },
  { key: 'celestial_gate_pillar', label: 'Celestial Gate Pillar (2x3)', faction: 'Celestial', widthCells: 2, heightCells: 3, animFrames: 3, draw: drawCelestialGatePillar },
  { key: 'celestial_oracle_fountain', label: 'Celestial Oracle Fountain (4x4)', faction: 'Celestial', widthCells: 4, heightCells: 4, animFrames: 3, draw: drawCelestialOracleFountain },
  { key: 'celestial_marble_colossus', label: 'Celestial Marble Colossus (3x5)', faction: 'Celestial', widthCells: 3, heightCells: 5, animFrames: 3, draw: drawCelestialMarbleColossus },
  { key: 'celestial_cloud_throne', label: 'Celestial Cloud Throne (4x3)', faction: 'Celestial', widthCells: 4, heightCells: 3, animFrames: 3, draw: drawCelestialCloudThrone },
  { key: 'celestial_sun_dial', label: 'Celestial Sun Dial (2x2)', faction: 'Celestial', widthCells: 2, heightCells: 2, animFrames: 4, draw: drawCelestialSunDial },
  { key: 'celestial_altar_of_light', label: 'Celestial Altar of Light (3x2)', faction: 'Celestial', widthCells: 3, heightCells: 2, animFrames: 3, draw: drawCelestialAltarOfLight },
  { key: 'celestial_angelic_statue', label: 'Celestial Angelic Statue (2x4)', faction: 'Celestial', widthCells: 2, heightCells: 4, animFrames: 3, draw: drawCelestialAngelicStatue },
  // Aliens (8)
  { key: 'alien_queen_chamber', label: 'Alien Queen Chamber (7x7)', faction: 'Aliens', widthCells: 7, heightCells: 7, animFrames: 3, draw: drawAlienQueenChamber },
  { key: 'alien_egg_cluster', label: 'Alien Egg Cluster (4x4)', faction: 'Aliens', widthCells: 4, heightCells: 4, animFrames: 3, draw: drawAlienEggCluster },
  { key: 'alien_acid_pool', label: 'Alien Acid Pool (4x3)', faction: 'Aliens', widthCells: 4, heightCells: 3, animFrames: 3, draw: drawAlienAcidPool },
  { key: 'alien_chitin_wall', label: 'Alien Chitin Wall (5x2)', faction: 'Aliens', widthCells: 5, heightCells: 2, animFrames: 3, draw: drawAlienChitinWall },
  { key: 'alien_spore_vent', label: 'Alien Spore Vent (2x3)', faction: 'Aliens', widthCells: 2, heightCells: 3, animFrames: 3, draw: drawAlienSporeVent },
  { key: 'alien_cocoon_cluster', label: 'Alien Cocoon Cluster (3x3)', faction: 'Aliens', widthCells: 3, heightCells: 3, animFrames: 3, draw: drawAlienCocoonCluster },
  { key: 'alien_feeding_pit', label: 'Alien Feeding Pit (5x5)', faction: 'Aliens', widthCells: 5, heightCells: 5, animFrames: 3, draw: drawAlienFeedingPit },
  { key: 'alien_tunnel_mouth', label: 'Alien Tunnel Mouth (3x2)', faction: 'Aliens', widthCells: 3, heightCells: 2, animFrames: 3, draw: drawAlienTunnelMouth },
  // Harmonic (8)
  { key: 'harmonic_grand_piano', label: 'Harmonic Grand Piano (3x3)', faction: 'Harmonic', widthCells: 3, heightCells: 3, animFrames: 3, draw: drawHarmonicGrandPiano },
  { key: 'harmonic_drum_kit', label: 'Harmonic Drum Kit (3x3)', faction: 'Harmonic', widthCells: 3, heightCells: 3, animFrames: 3, draw: drawHarmonicDrumKit },
  { key: 'harmonic_pipe_organ', label: 'Harmonic Pipe Organ (5x5)', faction: 'Harmonic', widthCells: 5, heightCells: 5, animFrames: 3, draw: drawHarmonicPipeOrgan },
  { key: 'harmonic_dj_booth', label: 'Harmonic DJ Booth (4x3)', faction: 'Harmonic', widthCells: 4, heightCells: 3, animFrames: 3, draw: drawHarmonicDjBooth },
  { key: 'harmonic_speaker_stack', label: 'Harmonic Speaker Stack (2x4)', faction: 'Harmonic', widthCells: 2, heightCells: 4, animFrames: 3, draw: drawHarmonicSpeakerStack },
  { key: 'harmonic_harp', label: 'Harmonic Harp (2x3)', faction: 'Harmonic', widthCells: 2, heightCells: 3, animFrames: 3, draw: drawHarmonicHarp },
  { key: 'harmonic_music_stand', label: 'Harmonic Music Stand (2x2)', faction: 'Harmonic', widthCells: 2, heightCells: 2, animFrames: 3, draw: drawHarmonicMusicStand },
  { key: 'harmonic_spotlight_rig', label: 'Harmonic Spotlight Rig (4x2)', faction: 'Harmonic', widthCells: 4, heightCells: 2, animFrames: 3, draw: drawHarmonicSpotlightRig },
  // Void (8)
  { key: 'void_slot_machine', label: 'Void Slot Machine (3x4)', faction: 'Void', widthCells: 3, heightCells: 4, animFrames: 3, draw: drawVoidSlotMachine },
  { key: 'void_rift_portal', label: 'Void Rift Portal (5x5)', faction: 'Void', widthCells: 5, heightCells: 5, animFrames: 3, draw: drawVoidRiftPortal },
  { key: 'void_chaos_obelisk', label: 'Void Chaos Obelisk (2x5)', faction: 'Void', widthCells: 2, heightCells: 5, animFrames: 3, draw: drawVoidChaosObelisk },
  { key: 'void_dice_altar', label: 'Void Dice Altar (3x3)', faction: 'Void', widthCells: 3, heightCells: 3, animFrames: 3, draw: drawVoidDiceAltar },
  { key: 'void_roulette_wheel', label: 'Void Roulette Wheel (4x4)', faction: 'Void', widthCells: 4, heightCells: 4, animFrames: 4, draw: drawVoidRouletteWheel },
  { key: 'void_crystal', label: 'Void Crystal (2x3)', faction: 'Void', widthCells: 2, heightCells: 3, animFrames: 3, draw: drawVoidCrystal },
  { key: 'void_card_table', label: 'Void Card Table (3x2)', faction: 'Void', widthCells: 3, heightCells: 2, animFrames: 3, draw: drawVoidCardTable },
  { key: 'void_fortune_teller', label: 'Void Fortune Teller (3x4)', faction: 'Void', widthCells: 3, heightCells: 4, animFrames: 3, draw: drawVoidFortuneTeller },
];

// Faction → tileset path mapping for ground tile baking
const FACTION_TILESET: Record<string, string> = {
  Military: 'assets/terrain/military_terrain_tileset.png',
  Psionic: 'assets/terrain/psionic_terrain_tileset.png',
  Infernal: 'assets/terrain/infernal_terrain_tileset.png',
  Arcane: 'assets/terrain/arcane_terrain_tileset.png',
  Mechanical: 'assets/terrain/mechanical_terrain_tileset.png',
  Nature: 'assets/terrain/nature_terrain_tileset.png',
  Cypherpunk: 'assets/terrain/cypherpunk_terrain_tileset.png',
  Celestial: 'assets/terrain/celestial_terrain_tileset.png',
  Aliens: 'assets/terrain/aliens_terrain_tileset.png',
  Harmonic: 'assets/terrain/harmonic_terrain_tileset.png',
  Void: 'assets/terrain/void_terrain_tileset.png',
};

/** Load a ground tile from a tileset image (row 0, col 15 = full center variant) */
function loadGroundTile(tilesetPath: string): Promise<HTMLCanvasElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = T; c.height = T;
      const ctx = c.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      // Ground tile is at row 0, column 15
      ctx.drawImage(img, 15 * T, 0, T, T, 0, 0, T, T);
      resolve(c);
    };
    img.onerror = () => resolve(null);
    img.src = tilesetPath;
  });
}

/** Tile a canvas with the ground tile pattern */
function fillWithGroundTile(ctx: CanvasRenderingContext2D, groundTile: HTMLCanvasElement, pw: number, ph: number) {
  for (let y = 0; y < ph; y += T) {
    for (let x = 0; x < pw; x += T) {
      ctx.drawImage(groundTile, x, y);
    }
  }
}

// ===================== Component =====================

export default function LargeStructureSprites() {
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const previewRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<'preview' | 'actual'>('preview');

  useEffect(() => {
    // Load all faction ground tiles, then render structures
    const factions = [...new Set(structures.map(s => s.faction))];
    const tilePromises = factions.map(async f => {
      const path = FACTION_TILESET[f];
      const tile = path ? await loadGroundTile(path) : null;
      return [f, tile] as [string, HTMLCanvasElement | null];
    });

    Promise.all(tilePromises).then(tiles => {
      const groundTiles = new Map(tiles);

      for (const s of structures) {
        const canvas = canvasRefs.current.get(s.key);
        if (!canvas) continue;

        const pw = s.widthCells * T;
        const ph = s.heightCells * T;
        const totalH = ph * s.animFrames;
        canvas.width = pw;
        canvas.height = totalH;
        const ctx = canvas.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;

        const groundTile = groundTiles.get(s.faction);

        for (let f = 0; f < s.animFrames; f++) {
          ctx.save();
          ctx.translate(0, f * ph);
          // Bake ground tile as background
          if (groundTile) {
            fillWithGroundTile(ctx, groundTile, pw, ph);
          } else {
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, pw, ph);
          }
          s.draw(ctx, f);
          ctx.restore();
        }

        // Preview at 3x (show first frame only)
        const preview = previewRefs.current.get(s.key);
        if (preview) {
          const scale = 3;
          preview.width = pw * scale;
          preview.height = ph * scale;
          const pCtx = preview.getContext('2d')!;
          pCtx.imageSmoothingEnabled = false;
          pCtx.fillStyle = '#111110';
          pCtx.fillRect(0, 0, preview.width, preview.height);
          pCtx.drawImage(canvas, 0, 0, pw, ph, 0, 0, pw * scale, ph * scale);
        }
      }
      setReady(true);
    });
  }, []);

  const download = (key: string) => {
    const canvas = canvasRefs.current.get(key);
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = `struct_${key}.png`;
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
        PX=2 | Tile=28x28 | Grid=14x14 per tile | {structures.length} structures across {factions.length} factions | Animated ({structures[0]?.animFrames || 3} frames stacked vertically)
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
                  {s.widthCells * T}x{s.heightCells * T * s.animFrames}px ({s.widthCells * G}x{s.heightCells * G} grid, {s.animFrames}f)
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
