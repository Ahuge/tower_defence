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

  // Sandbag perimeter — layered, lumpy, with shadow and highlight
  b(ctx, 0, 0, 0, H - 5, W, 5, '#7a7050');
  b(ctx, 0, 0, 1, H - 4, W - 2, 3, '#8a8060');
  b(ctx, 0, 0, 2, H - 3, W - 4, 2, '#9a9070');
  for (let x = 1; x < W - 1; x += 3) {
    p(ctx, 0, 0, x, H - 5, '#6a6040');
    p(ctx, 0, 0, x + 1, H - 3, '#aaa080');
    p(ctx, 0, 0, x + 2, H - 4, '#8a7a55');
  }
  for (let x = 3; x < W - 3; x += 6) {
    p(ctx, 0, 0, x, H - 2, '#777060'); p(ctx, 0, 0, x + 1, H - 2, '#777060');
  }

  // Main building body — two-story weathered concrete
  const bx = 4, by = 8, bw = W - 8, bh = H - 15;
  b(ctx, 0, 0, bx, by, bw, bh, '#707068');
  b(ctx, 0, 0, bx + 1, by + 1, bw - 2, bh - 2, '#808078');
  // Weathering streaks
  for (let x = bx + 2; x < bx + bw - 2; x += 5) {
    b(ctx, 0, 0, x, by + 3, 1, bh - 5, '#757568');
  }
  // Wall cracks
  p(ctx, 0, 0, bx + 8, by + 4, '#5a5a52'); p(ctx, 0, 0, bx + 9, by + 5, '#5a5a52');
  p(ctx, 0, 0, bx + bw - 10, by + bh - 6, '#5a5a52');
  // Outline
  b(ctx, 0, 0, bx, by, bw, 1, '#505048');
  b(ctx, 0, 0, bx, by + bh - 1, bw, 1, '#505048');
  b(ctx, 0, 0, bx, by, 1, bh, '#505048');
  b(ctx, 0, 0, bx + bw - 1, by, 1, bh, '#505048');

  // Floor separator — visible concrete seam between stories
  const floorY = by + Math.floor(bh / 2);
  b(ctx, 0, 0, bx + 1, floorY, bw - 2, 1, '#606058');
  b(ctx, 0, 0, bx + 1, floorY + 1, bw - 2, 1, '#6a6a62');

  // Roof section with parapet
  const rx = 3, ry = 2, rw = W - 6, rh = 6;
  b(ctx, 0, 0, rx, ry, rw, rh, '#606058');
  b(ctx, 0, 0, rx + 1, ry + 1, rw - 2, rh - 2, '#686860');
  b(ctx, 0, 0, rx, ry, rw, 1, '#484840');
  b(ctx, 0, 0, rx, ry + rh - 1, rw, 1, '#484840');
  p(ctx, 0, 0, rx + 2, ry + rh, '#555550'); // drainage stain

  // Satellite dish — detailed parabolic shape
  b(ctx, 0, 0, rx + 2, ry + 1, 6, 1, '#aaaaaa');
  b(ctx, 0, 0, rx + 3, ry + 2, 4, 1, '#999999');
  b(ctx, 0, 0, rx + 4, ry + 3, 2, 1, '#888888');
  p(ctx, 0, 0, rx + 4, ry + 1, '#cccccc'); p(ctx, 0, 0, rx + 5, ry + 1, '#bbbbbb');
  p(ctx, 0, 0, rx + 5, ry + 3, '#777777');
  p(ctx, 0, 0, rx + 6, ry + 4, '#777777');
  p(ctx, 0, 0, rx + 6, ry + 5, '#666666');

  // AC unit with fan grill
  const acx = rx + rw - 7;
  b(ctx, 0, 0, acx, ry + 1, 4, 3, '#555555');
  b(ctx, 0, 0, acx, ry + 1, 4, 1, '#666666');
  b(ctx, 0, 0, acx + 1, ry + 2, 2, 1, '#444444');
  p(ctx, 0, 0, acx + 1, ry + 3, '#3a3a3a');

  // Flag pole with bracket
  const fpx = rx + rw - 2;
  b(ctx, 0, 0, fpx, 0, 1, ry + 3, '#aaaaaa');
  p(ctx, 0, 0, fpx, ry + 2, '#888888'); p(ctx, 0, 0, fpx - 1, ry + 2, '#888888');
  // Flag — waves per frame
  if (frame === 0) {
    b(ctx, 0, 0, fpx + 1, 0, 4, 2, '#556633');
    p(ctx, 0, 0, fpx + 2, 0, '#667744'); p(ctx, 0, 0, fpx + 4, 1, '#4a5a2a');
  } else if (frame === 1) {
    b(ctx, 0, 0, fpx + 1, 1, 4, 2, '#556633');
    p(ctx, 0, 0, fpx + 3, 1, '#667744'); p(ctx, 0, 0, fpx + 1, 2, '#4a5a2a');
  } else {
    b(ctx, 0, 0, fpx + 1, 0, 5, 2, '#556633');
    p(ctx, 0, 0, fpx + 2, 1, '#667744'); p(ctx, 0, 0, fpx + 5, 0, '#4a5a2a');
  }

  // Windows — Floor 1 (upper) with frames
  for (let wx = bx + 3; wx < bx + bw - 4; wx += 5) {
    b(ctx, 0, 0, wx, by + 2, 3, 3, '#1a1a22');
    b(ctx, 0, 0, wx - 1, by + 2, 1, 3, '#555550');
    b(ctx, 0, 0, wx + 3, by + 2, 1, 3, '#555550');
    b(ctx, 0, 0, wx, by + 1, 3, 1, '#555550');
    p(ctx, 0, 0, wx, by + 2, '#334455');
    p(ctx, 0, 0, wx + 1, by + 3, '#222233');
  }
  // Windows — Floor 2 (some damaged with boards)
  for (let wx = bx + 3; wx < bx + bw - 4; wx += 5) {
    b(ctx, 0, 0, wx, floorY + 2, 3, 3, '#1a1a22');
    b(ctx, 0, 0, wx, floorY + 2, 3, 1, '#2a2a33');
    if (wx % 10 < 5) {
      p(ctx, 0, 0, wx, floorY + 3, '#556677');
      p(ctx, 0, 0, wx + 2, floorY + 2, '#445566');
      b(ctx, 0, 0, wx, floorY + 4, 3, 1, '#5a4a3a');
    } else {
      p(ctx, 0, 0, wx + 1, floorY + 2, '#334455');
    }
  }

  // Main entrance — reinforced double doors with overhang
  const dx = Math.floor(W / 2) - 4, dy = by + bh - 1;
  b(ctx, 0, 0, dx - 2, dy - 2, 12, 1, '#585850');
  b(ctx, 0, 0, dx - 2, dy - 1, 12, 1, '#525248');
  p(ctx, 0, 0, dx - 2, dy - 1, '#444440'); p(ctx, 0, 0, dx + 9, dy - 1, '#444440');
  b(ctx, 0, 0, dx, dy, 8, 4, '#3a3830');
  b(ctx, 0, 0, dx + 1, dy, 3, 4, '#4a4838');
  b(ctx, 0, 0, dx + 4, dy, 3, 4, '#4a4838');
  p(ctx, 0, 0, dx + 3, dy + 1, '#1a1a10'); p(ctx, 0, 0, dx + 4, dy + 1, '#1a1a10');
  p(ctx, 0, 0, dx + 3, dy + 2, '#aaaaaa'); p(ctx, 0, 0, dx + 4, dy + 2, '#aaaaaa');
  b(ctx, 0, 0, dx + 1, dy + 3, 3, 1, '#3a3828');
  b(ctx, 0, 0, dx + 4, dy + 3, 3, 1, '#3a3828');
  b(ctx, 0, 0, dx - 1, dy + 4, 10, 1, '#666660');

  // Ground rubble and razor wire
  for (let x = 1; x < W - 1; x += 2) {
    p(ctx, 0, 0, x, H - 6, '#555550');
    if (x % 5 === 0) p(ctx, 0, 0, x, H - 7, '#4a4a44');
  }
  for (let x = 1; x < 12; x += 2) {
    p(ctx, 0, 0, x, H - 5, '#888888');
    if (x % 4 === 1) p(ctx, 0, 0, x + 1, H - 6, '#999999');
  }
}

function drawMilitaryBarracks(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(5), H = gh(3);

  // Ground/path at base with puddle stain
  b(ctx, 0, 0, 0, H - 3, W, 3, '#3a3830');
  for (let x = 1; x < W; x += 4) p(ctx, 0, 0, x, H - 2, '#444438');
  b(ctx, 0, 0, 14, H - 2, 3, 1, '#333830');

  // Main building — long low concrete structure
  const bx = 2, by = 6, bw = W - 4, bh = H - 11;
  b(ctx, 0, 0, bx, by, bw, bh, '#6a6a62');
  b(ctx, 0, 0, bx + 1, by + 1, bw - 2, bh - 2, '#757568');
  b(ctx, 0, 0, bx, by, bw, 1, '#4a4a42');
  b(ctx, 0, 0, bx, by + bh - 1, bw, 1, '#4a4a42');
  b(ctx, 0, 0, bx, by, 1, bh, '#4a4a42');
  b(ctx, 0, 0, bx + bw - 1, by, 1, bh, '#4a4a42');
  // Weathered streaks down walls
  for (let x = bx + 4; x < bx + bw - 4; x += 7) {
    b(ctx, 0, 0, x, by + 2, 1, bh - 3, '#636357');
  }
  // Wall stain patches
  b(ctx, 0, 0, bx + 10, by + bh - 4, 3, 2, '#606058');
  p(ctx, 0, 0, bx + bw - 12, by + 3, '#5e5e56');

  // Flat roof — overhanging with gutter detail
  b(ctx, 0, 0, bx - 1, by - 3, bw + 2, 4, '#585850');
  b(ctx, 0, 0, bx, by - 2, bw, 2, '#626258');
  b(ctx, 0, 0, bx - 1, by - 1, bw + 2, 1, '#4e4e46');
  // Tar seams
  for (let x = bx + 3; x < bx + bw; x += 8) {
    b(ctx, 0, 0, x, by - 3, 1, 2, '#505048');
  }

  // Ventilation ducts on roof with slats
  for (let vx = bx + 6; vx < bx + bw - 8; vx += 14) {
    b(ctx, 0, 0, vx, by - 5, 6, 3, '#666660');
    b(ctx, 0, 0, vx, by - 5, 6, 1, '#777770');
    p(ctx, 0, 0, vx + 1, by - 4, '#444440');
    p(ctx, 0, 0, vx + 2, by - 4, '#444440');
    p(ctx, 0, 0, vx + 3, by - 4, '#444440');
    p(ctx, 0, 0, vx + 4, by - 4, '#444440');
    p(ctx, 0, 0, vx, by - 3, '#555550'); p(ctx, 0, 0, vx + 5, by - 3, '#555550');
  }

  // Row of small windows with sills
  for (let wx = bx + 4; wx < bx + bw - 4; wx += 5) {
    b(ctx, 0, 0, wx, by + 3, 2, 3, '#1a1a22');
    p(ctx, 0, 0, wx, by + 3, '#2a2a33');
    b(ctx, 0, 0, wx - 1, by + 6, 4, 1, '#5a5a52');
    if (wx % 10 < 5) p(ctx, 0, 0, wx, by + 4, '#333344');
    else p(ctx, 0, 0, wx + 1, by + 3, '#445566');
  }

  // Single door entrance (left side) with step and light
  const dx = bx + 3;
  b(ctx, 0, 0, dx, by + bh - 5, 4, 5, '#3a3830');
  b(ctx, 0, 0, dx + 1, by + bh - 4, 2, 4, '#4a4838');
  p(ctx, 0, 0, dx + 3, by + bh - 3, '#aaaaaa');
  b(ctx, 0, 0, dx, by + bh - 5, 4, 1, '#555550');
  b(ctx, 0, 0, dx - 1, by + bh, 6, 1, '#555550');
  p(ctx, 0, 0, dx + 1, by + bh - 6, '#ccaa44');

  // Unit number stencil on right wall
  b(ctx, 0, 0, bx + bw - 8, by + 2, 4, 3, '#808078');
  p(ctx, 0, 0, bx + bw - 7, by + 2, '#ddddcc'); p(ctx, 0, 0, bx + bw - 6, by + 3, '#ddddcc');

  // Drainpipe on right wall
  b(ctx, 0, 0, bx + bw - 2, by + 1, 1, bh - 1, '#555550');
  p(ctx, 0, 0, bx + bw - 2, by + bh - 1, '#444440');

  // Vent fan animation
  const vfx = bx + 6;
  if (frame === 0) { p(ctx, 0, 0, vfx + 2, by - 5, '#555550'); p(ctx, 0, 0, vfx + 3, by - 4, '#555550'); }
  if (frame === 1) { p(ctx, 0, 0, vfx + 1, by - 5, '#555550'); p(ctx, 0, 0, vfx + 4, by - 4, '#555550'); }
  if (frame === 2) { p(ctx, 0, 0, vfx + 3, by - 5, '#555550'); p(ctx, 0, 0, vfx + 2, by - 4, '#555550'); }
}

function drawMilitaryTents(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(2), H = gh(1);
  const flapOff = frame === 0 ? 0 : frame === 1 ? 1 : -1;
  // Left tent
  for (let row = 0; row < 5; row++) {
    const indent = row < 2 ? (2 - row) : 0;
    const width = row < 2 ? (3 + row * 2) : 7;
    b(ctx, 0, 0, 2 + indent, 2 + row, width, 1, row < 2 ? '#556633' : '#4a5a3a');
  }
  b(ctx, 0, 0, 4, 1, 3, 1, '#3a4a2a');
  p(ctx, 0, 0, 5 + flapOff, 5, '#556633');
  p(ctx, 0, 0, 1, 5, '#8a7a5a'); p(ctx, 0, 0, 9, 5, '#8a7a5a');
  p(ctx, 0, 0, 0, 6, '#665544'); p(ctx, 0, 0, 10, 6, '#665544');
  // Right tent
  for (let row = 0; row < 5; row++) {
    const indent = row < 2 ? (2 - row) : 0;
    const width = row < 2 ? (3 + row * 2) : 7;
    b(ctx, 0, 0, 16 + indent, 2 + row, width, 1, row < 2 ? '#556633' : '#4a5a3a');
  }
  b(ctx, 0, 0, 18, 1, 3, 1, '#3a4a2a');
  p(ctx, 0, 0, 19 - flapOff, 5, '#556633');
  p(ctx, 0, 0, 15, 5, '#8a7a5a'); p(ctx, 0, 0, 23, 5, '#8a7a5a');
  p(ctx, 0, 0, 14, 6, '#665544'); p(ctx, 0, 0, 24, 6, '#665544');
}

function drawMilitarySupplyDepot(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(5), H = gh(3);

  // Ground slab
  b(ctx, 0, 0, 0, H - 3, W, 3, '#3a3830');
  for (let x = 2; x < W; x += 6) p(ctx, 0, 0, x, H - 1, '#333028');

  // Main warehouse body
  const bx = 1, by = 5, bw = W - 2, bh = H - 8;
  b(ctx, 0, 0, bx, by, bw, bh, '#5a5852');
  b(ctx, 0, 0, bx, by, bw, 1, '#3a3832');
  b(ctx, 0, 0, bx, by + bh - 1, bw, 1, '#3a3832');
  b(ctx, 0, 0, bx, by, 1, bh, '#3a3832');
  b(ctx, 0, 0, bx + bw - 1, by, 1, bh, '#3a3832');

  // Corrugated wall ribbing — alternating tones
  for (let x = bx + 2; x < bx + bw - 1; x += 2) {
    b(ctx, 0, 0, x, by + 1, 1, bh - 2, x % 4 === 0 ? '#4a4842' : '#525048');
  }
  // Rust stains on lower walls
  b(ctx, 0, 0, bx + 4, by + bh - 5, 3, 3, '#5a4838');
  b(ctx, 0, 0, bx + bw - 10, by + bh - 4, 2, 2, '#584838');
  p(ctx, 0, 0, bx + 18, by + bh - 6, '#554438');

  // Peaked roof — layered with ridge cap
  b(ctx, 0, 0, bx - 1, by - 1, bw + 2, 2, '#484840');
  b(ctx, 0, 0, bx + 2, by - 2, bw - 4, 1, '#505048');
  b(ctx, 0, 0, bx + 5, by - 3, bw - 10, 1, '#555550');
  b(ctx, 0, 0, bx + 9, by - 4, bw - 18, 1, '#5a5a52');
  b(ctx, 0, 0, bx + 12, by - 5, bw - 24, 1, '#606058');
  for (let x = bx; x < bx + bw; x += 3) p(ctx, 0, 0, x, by, '#424240');

  // Loading dock (right side) — large open bay
  const ldx = bx + bw - 18, ldy = by + bh - 16;
  b(ctx, 0, 0, ldx, ldy, 16, 16, '#1a1a18');
  b(ctx, 0, 0, ldx, ldy, 16, 1, '#666660');
  b(ctx, 0, 0, ldx, ldy, 1, 16, '#555550');
  b(ctx, 0, 0, ldx + 15, ldy, 1, 16, '#555550');
  b(ctx, 0, 0, ldx + 1, ldy + 1, 14, 1, '#333330');

  // Crates inside — green military and brown
  b(ctx, 0, 0, ldx + 2, ldy + 6, 5, 5, '#556633');
  b(ctx, 0, 0, ldx + 2, ldy + 6, 5, 1, '#667744');
  p(ctx, 0, 0, ldx + 4, ldy + 8, '#445522');
  b(ctx, 0, 0, ldx + 8, ldy + 4, 4, 7, '#886644');
  b(ctx, 0, 0, ldx + 8, ldy + 4, 4, 1, '#997755');
  p(ctx, 0, 0, ldx + 9, ldy + 6, '#775533');
  b(ctx, 0, 0, ldx + 3, ldy + 2, 4, 4, '#445522');
  b(ctx, 0, 0, ldx + 3, ldy + 2, 4, 1, '#556633');
  b(ctx, 0, 0, ldx + 12, ldy + 8, 3, 3, '#5a6a3a');
  p(ctx, 0, 0, ldx + 13, ldy + 8, '#6a7a4a');

  // Dock platform with yellow hazard markings
  b(ctx, 0, 0, ldx - 2, by + bh, 20, 3, '#505048');
  b(ctx, 0, 0, ldx - 2, by + bh, 20, 1, '#5a5a52');
  for (let x = ldx - 1; x < ldx + 18; x += 3) {
    p(ctx, 0, 0, x, by + bh, '#ccaa00');
  }

  // Small personnel door (left side)
  b(ctx, 0, 0, bx + 4, by + bh - 8, 4, 8, '#3a3830');
  b(ctx, 0, 0, bx + 5, by + bh - 7, 2, 7, '#4a4838');
  p(ctx, 0, 0, bx + 6, by + bh - 4, '#aaaaaa');

  // Roof vent pipe
  b(ctx, 0, 0, bx + 8, by - 6, 2, 3, '#555555');
  b(ctx, 0, 0, bx + 7, by - 7, 4, 1, '#666666');

  // Exterior light fixture above dock
  b(ctx, 0, 0, ldx + 6, ldy - 3, 3, 2, '#555555');
  // Loading dock light blinks per frame
  const lightColor = frame === 0 ? '#ffaa00' : frame === 1 ? '#885500' : '#332200';
  p(ctx, 0, 0, ldx + 7, ldy - 3, lightColor);
  if (frame === 0) p(ctx, 0, 0, ldx + 7, ldy - 1, '#ffaa0033');
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
        const noise = ((x * 13 + y * 7) % 9);
        const color = noise < 3 ? '#2a3a15' : noise < 6 ? '#3a5020' : '#1e2c0e';
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
        if (noise < 4) p(ctx, 0, 0, x, y, '#0e160a');
        else if (noise < 7) p(ctx, 0, 0, x, y, '#111a0d');
        else if (noise < 10) p(ctx, 0, 0, x, y, '#141e10');
      }
    }
  }

  // Organic veins on floor (red)
  for (let angle = 0; angle < 360; angle += 30) {
    const rad = (angle * Math.PI) / 180;
    for (let d = 6; d < R - 5; d += 2) {
      const vx = Math.round(cx + Math.cos(rad) * d);
      const vy = Math.round(cy + Math.sin(rad) * d);
      p(ctx, 0, 0, vx, vy, d % 4 === 0 ? '#cc3322' : '#882218');
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
      b(ctx, 0, 0, ex, ey, 3, 4, '#bbbb66');
      b(ctx, 0, 0, ex, ey, 3, 1, '#ddddaa');
      p(ctx, 0, 0, ex + 1, ey + 1, '#998844');
      // Egg slime
      p(ctx, 0, 0, ex + 1, ey + 4, '#33aa11');
    }
  }

  // Queen silhouette (center) — large dark form
  // Body
  b(ctx, 0, 0, cx - 8, cy - 6, 16, 14, '#0b120a');
  b(ctx, 0, 0, cx - 7, cy - 5, 14, 12, '#0e160a');
  // Crown / crest
  b(ctx, 0, 0, cx - 6, cy - 10, 12, 5, '#0b120a');
  b(ctx, 0, 0, cx - 4, cy - 12, 8, 3, '#0e160a');
  b(ctx, 0, 0, cx - 2, cy - 13, 4, 2, '#141e10');
  // Crown spikes
  p(ctx, 0, 0, cx - 5, cy - 11, '#1e2c0e');
  p(ctx, 0, 0, cx + 4, cy - 11, '#1e2c0e');
  p(ctx, 0, 0, cx - 3, cy - 13, '#2a3a15');
  p(ctx, 0, 0, cx + 2, cy - 13, '#2a3a15');

  // Queen eyes (glowing bioluminescent green)
  p(ctx, 0, 0, cx - 3, cy - 6, '#44ff88');
  p(ctx, 0, 0, cx + 2, cy - 6, '#44ff88');
  // Inner eye glow
  p(ctx, 0, 0, cx - 2, cy - 6, '#88ffaa');
  p(ctx, 0, 0, cx + 1, cy - 6, '#88ffaa');

  // Mandibles — click per frame
  const mandOff = frame === 1 ? 1 : 0;
  b(ctx, 0, 0, cx - 4 - mandOff, cy - 3, 2, 3, '#2a3a15');
  b(ctx, 0, 0, cx + 2 + mandOff, cy - 3, 2, 3, '#2a3a15');
  p(ctx, 0, 0, cx - 5 - mandOff, cy - 1, '#3a5020');
  p(ctx, 0, 0, cx + 4 + mandOff, cy - 1, '#3a5020');

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
      p(ctx, 0, 0, lx, ly, '#0e160a');
      p(ctx, 0, 0, lx, ly + 1, '#0b120a');
    }
  }

  // Tail extending behind
  for (let d = 0; d < 10; d++) {
    const tx = cx + d;
    const ty = cy + 6 + Math.floor(d / 3);
    const dist = Math.sqrt((tx - cx) ** 2 + (ty - cy) ** 2);
    if (dist < R - 5) {
      p(ctx, 0, 0, tx, ty, '#0b120a');
      if (d < 8) p(ctx, 0, 0, tx, ty + 1, '#0e160a');
    }
  }

  // Bioluminescent glow spots on walls
  const glowSpots = [
    [cx - R + 3, cy - 6], [cx + R - 4, cy - 4],
    [cx - R + 4, cy + 8], [cx + R - 5, cy + 6],
    [cx - 4, cy - R + 4], [cx + 2, cy + R - 5],
  ];
  for (const [gx, gy] of glowSpots) {
    p(ctx, 0, 0, gx, gy, '#44ff88');
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
  const W = gw(3), H = gh(3); const cx = Math.floor(W / 2);
  b(ctx, 0, 0, cx-5, H-9, 10, 4, '#333333'); b(ctx, 0, 0, cx-4, H-9, 8, 1, '#444444');
  p(ctx, 0, 0, cx-4, H-5, '#555555'); p(ctx, 0, 0, cx+3, H-5, '#555555');
  b(ctx, 0, 0, cx-11, 10, 22, 18, '#884422'); b(ctx, 0, 0, cx-10, 11, 20, 16, '#993322');
  b(ctx, 0, 0, cx-8, 13, 16, 12, '#ccbbaa'); b(ctx, 0, 0, cx-7, 14, 14, 10, '#ddccbb');
  for (let x = cx-9; x <= cx+9; x++) { p(ctx, 0, 0, x, 12, '#888888'); p(ctx, 0, 0, x, 26, '#888888'); }
  b(ctx, 0, 0, cx-4, 15, 8, 6, '#ccbbaa'); b(ctx, 0, 0, cx-3, 16, 6, 4, '#bbaa99');
  b(ctx, 0, 0, cx-2, 17, 4, 1, '#998877');
  for (let x = cx-7; x <= cx+7; x += 3) { p(ctx, 0, 0, x, 13, '#666666'); p(ctx, 0, 0, x, 25, '#666666'); }
  b(ctx, 0, 0, 3, 18, 12, 9, '#996633'); b(ctx, 0, 0, 5, 20, 8, 5, '#ccbbaa');
  b(ctx, 0, 0, 3, 18, 12, 1, '#bbbbbb'); b(ctx, 0, 0, 3, 26, 12, 1, '#aaaaaa');
  for (let x = 5; x < 13; x += 2) p(ctx, 0, 0, x, 26, '#cccccc');
  b(ctx, 0, 0, 1, 3, 9, 2, '#ddbb55'); b(ctx, 0, 0, 2, 3, 7, 1, '#eedd66'); p(ctx, 0, 0, 5, 3, '#ffee77');
  b(ctx, 0, 0, 1, 6, 9, 2, '#ccaa44'); b(ctx, 0, 0, 2, 7, 7, 1, '#ddbb55');
  for (let y = 5; y <= 10; y++) p(ctx, 0, 0, 5, y, '#777777');
  b(ctx, 0, 0, W-15, 5, 9, 7, '#884422'); b(ctx, 0, 0, W-13, 7, 5, 3, '#ccbbaa'); b(ctx, 0, 0, W-15, 5, 9, 1, '#999999');
  b(ctx, 0, 0, W-13, 14, 10, 8, '#884422'); b(ctx, 0, 0, W-11, 16, 6, 4, '#ccbbaa'); b(ctx, 0, 0, W-13, 14, 10, 1, '#999999');
  b(ctx, 0, 0, W-11, 0, 11, 3, '#ccaa44'); p(ctx, 0, 0, W-6, 0, '#eedd66');
  for (let y = 3; y <= 6; y++) p(ctx, 0, 0, W-6, y, '#777777');
  b(ctx, 0, 0, cx-2, 0, 11, 3, '#bbaa44'); p(ctx, 0, 0, cx+3, 0, '#ddcc66');
  for (let y = 3; y <= 5; y++) p(ctx, 0, 0, cx+3, y, '#777777');
  b(ctx, 0, 0, W-13, 24, 11, 9, '#884422'); b(ctx, 0, 0, W-11, 26, 7, 5, '#ccbbaa'); b(ctx, 0, 0, W-13, 24, 11, 1, '#999999');
  p(ctx, 0, 0, W-13, 32, '#666666'); p(ctx, 0, 0, W-4, 32, '#666666');
  if (frame===0) { b(ctx, 0, 0, 6, 20, 2, 1, '#ffffff'); p(ctx, 0, 0, 7, 19, '#ddddcc'); }
  else if (frame===1) { p(ctx, 0, 0, cx, 17, '#ffffff'); p(ctx, 0, 0, W-8, 0, '#ffffee'); }
  else { b(ctx, 0, 0, W-11, 16, 2, 1, '#ffffff'); p(ctx, 0, 0, W-10, 15, '#ddddcc'); }
}

// ===================== VOID =====================

function drawVoidSlotMachine(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(3), H = gh(4);
  const cx = Math.floor(W / 2);

  // Cabinet legs (4 chrome legs)
  b(ctx, 0, 0, 6, H - 4, 2, 4, '#888888'); b(ctx, 0, 0, 6, H - 4, 2, 1, '#aaaaaa');
  b(ctx, 0, 0, W - 8, H - 4, 2, 4, '#888888'); b(ctx, 0, 0, W - 8, H - 4, 2, 1, '#aaaaaa');
  b(ctx, 0, 0, 8, H - 3, 1, 3, '#777777'); b(ctx, 0, 0, W - 9, H - 3, 1, 3, '#777777');

  // Main cabinet body — darker sides for depth, lighter front panel
  b(ctx, 0, 0, 5, 7, W - 10, H - 11, '#1a1028');
  b(ctx, 0, 0, 6, 8, W - 12, H - 13, '#221438');
  // Left side panel (transparent effect — show internals)
  b(ctx, 0, 0, 4, 8, 2, H - 14, '#18102844');
  for (let y = 10; y < H - 8; y += 3) { p(ctx, 0, 0, 4, y, '#332255'); p(ctx, 0, 0, 5, y + 1, '#2a1844'); }
  // Internal mechanism visible through left side
  for (let y = 14; y < H - 12; y += 4) {
    p(ctx, 0, 0, 5, y, '#555566'); p(ctx, 0, 0, 5, y + 1, '#444455'); // gears/springs
  }
  // Right side panel (transparent)
  b(ctx, 0, 0, W - 6, 8, 2, H - 14, '#18102844');
  for (let y = 10; y < H - 8; y += 3) { p(ctx, 0, 0, W - 6, y, '#332255'); }
  // Cabinet frame outline (chrome trim)
  b(ctx, 0, 0, 4, 7, W - 8, 1, '#666677');
  b(ctx, 0, 0, 4, H - 5, W - 8, 1, '#555566');
  b(ctx, 0, 0, 4, 7, 1, H - 12, '#555566');
  b(ctx, 0, 0, W - 5, 7, 1, H - 12, '#555566');

  // Top marquee — arched neon sign
  b(ctx, 0, 0, 2, 0, W - 4, 7, '#2a1444');
  b(ctx, 0, 0, 3, 1, W - 6, 5, '#331855');
  // Marquee arch top
  b(ctx, 0, 0, 4, 0, W - 8, 1, '#442266');
  // Neon border with chase lights
  b(ctx, 0, 0, 2, 0, W - 4, 1, '#ff44cc');
  b(ctx, 0, 0, 2, 6, W - 4, 1, '#ff44cc');
  b(ctx, 0, 0, 2, 0, 1, 7, '#cc22aa');
  b(ctx, 0, 0, W - 3, 0, 1, 7, '#cc22aa');
  // Chase lights along marquee top — animate per frame
  for (let lx = 4; lx < W - 4; lx += 3) {
    const on = ((lx + frame) % 3) === 0;
    p(ctx, 0, 0, lx, 1, on ? '#ffdd44' : '#442233');
    p(ctx, 0, 0, lx, 5, on ? '#ff88ee' : '#331122');
  }
  // "7 7 7" marquee text (larger, golden)
  b(ctx, 0, 0, cx - 7, 2, 3, 1, '#ffdd44'); p(ctx, 0, 0, cx - 6, 3, '#ffdd44'); p(ctx, 0, 0, cx - 7, 4, '#ffcc22');
  b(ctx, 0, 0, cx - 1, 2, 3, 1, '#ffdd44'); p(ctx, 0, 0, cx, 3, '#ffdd44'); p(ctx, 0, 0, cx - 1, 4, '#ffcc22');
  b(ctx, 0, 0, cx + 5, 2, 3, 1, '#ffdd44'); p(ctx, 0, 0, cx + 6, 3, '#ffdd44'); p(ctx, 0, 0, cx + 5, 4, '#ffcc22');

  // Three reel windows — recessed with chrome bezel
  const reelY = 12, reelH = 18;
  b(ctx, 0, 0, 7, reelY - 1, W - 14, reelH + 2, '#444466'); // bezel
  b(ctx, 0, 0, 8, reelY, W - 16, reelH, '#0a0818'); // dark recess
  const reelW = Math.floor((W - 18) / 3);
  // Reel divider strips (chrome)
  for (let i = 1; i < 3; i++) {
    b(ctx, 0, 0, 8 + i * reelW, reelY, 1, reelH, '#666688');
    b(ctx, 0, 0, 9 + i * reelW, reelY, 1, reelH, '#333355');
  }

  // Reel symbols — scroll per frame (cherry / seven / bar)
  const scroll = frame * 4;
  // Reel 1 — cherry
  const r1x = 9 + Math.floor(reelW / 2) - 2;
  const r1y = reelY + 3 + (scroll % 12);
  b(ctx, 0, 0, r1x, r1y, 3, 3, '#cc2244'); // cherry body
  p(ctx, 0, 0, r1x + 1, r1y - 1, '#22aa44'); p(ctx, 0, 0, r1x + 2, r1y - 1, '#22aa44'); // stem
  p(ctx, 0, 0, r1x + 1, r1y + 1, '#ff6688'); // highlight
  b(ctx, 0, 0, r1x - 1, r1y + 4, 5, 3, '#cc2244'); // second cherry below
  p(ctx, 0, 0, r1x, r1y + 5, '#ff6688');

  // Reel 2 — seven (gold, larger)
  const r2x = 9 + reelW + Math.floor(reelW / 2) - 2;
  const r2base = reelY + 2 + ((scroll + 2) % 10);
  b(ctx, 0, 0, r2x, r2base, 5, 1, '#ffdd44'); // top bar
  b(ctx, 0, 0, r2x + 3, r2base + 1, 2, 2, '#ffdd44'); // arm
  b(ctx, 0, 0, r2x + 1, r2base + 3, 3, 2, '#ffdd44'); // mid
  b(ctx, 0, 0, r2x, r2base + 5, 2, 2, '#ffcc22'); // base
  p(ctx, 0, 0, r2x + 2, r2base + 1, '#ffffaa'); // shine

  // Reel 3 — BAR
  const r3x = 9 + 2 * reelW + Math.floor(reelW / 2) - 3;
  const r3base = reelY + 4 + ((scroll + 4) % 8);
  b(ctx, 0, 0, r3x, r3base, 7, 4, '#8844cc');
  b(ctx, 0, 0, r3x + 1, r3base + 1, 5, 2, '#aa66ee');
  p(ctx, 0, 0, r3x + 2, r3base + 1, '#cc88ff'); p(ctx, 0, 0, r3x + 4, r3base + 1, '#cc88ff'); // "BAR" text dots

  // Payline arrows (red triangles)
  p(ctx, 0, 0, 7, reelY + 8, '#ff4444'); p(ctx, 0, 0, 7, reelY + 9, '#ff2222');
  p(ctx, 0, 0, W - 8, reelY + 8, '#ff4444'); p(ctx, 0, 0, W - 8, reelY + 9, '#ff2222');
  // Payline across reels
  b(ctx, 0, 0, 8, reelY + 9, W - 16, 1, '#ff444444');

  // Pull lever — right side with ball and shaft
  const leverPull = frame === 1 ? 4 : frame === 2 ? 2 : 0;
  b(ctx, 0, 0, W - 4, 14 + leverPull, 2, 22 - leverPull, '#999999'); // shaft
  b(ctx, 0, 0, W - 4, 14 + leverPull, 2, 1, '#bbbbbb'); // shaft highlight
  b(ctx, 0, 0, W - 5, 12 + leverPull, 4, 3, '#cc2222'); // ball
  p(ctx, 0, 0, W - 4, 12 + leverPull, '#ff6644'); // ball highlight
  // Lever pivot mount
  b(ctx, 0, 0, W - 5, 34, 4, 2, '#666666');

  // Coin slot with label
  b(ctx, 0, 0, cx - 3, H - 16, 6, 3, '#333344'); // slot housing
  b(ctx, 0, 0, cx - 1, H - 15, 2, 1, '#666677'); // slot opening
  p(ctx, 0, 0, cx - 3, H - 17, '#555566'); p(ctx, 0, 0, cx + 2, H - 17, '#555566'); // arrows

  // Button panel (BET / SPIN)
  b(ctx, 0, 0, cx - 6, H - 13, 5, 3, '#442266');
  b(ctx, 0, 0, cx - 5, H - 12, 3, 1, '#8844aa'); // BET button
  b(ctx, 0, 0, cx + 1, H - 13, 5, 3, '#442266');
  b(ctx, 0, 0, cx + 2, H - 12, 3, 1, '#cc4444'); // SPIN button (red)

  // Coin tray — wider, with lip
  b(ctx, 0, 0, 5, H - 9, W - 10, 5, '#2a1a3a');
  b(ctx, 0, 0, 6, H - 8, W - 12, 3, '#1a1028');
  b(ctx, 0, 0, 5, H - 9, W - 10, 1, '#444455'); // tray lip
  // Coins scattered in tray
  p(ctx, 0, 0, cx - 5, H - 7, '#ffdd44'); p(ctx, 0, 0, cx - 3, H - 8, '#ffcc22');
  p(ctx, 0, 0, cx, H - 7, '#ffdd44'); p(ctx, 0, 0, cx + 2, H - 7, '#ffcc22');
  p(ctx, 0, 0, cx + 4, H - 8, '#ffdd44'); p(ctx, 0, 0, cx - 1, H - 8, '#eebb22');

  // Void neon glow accents along sides
  const glowC = ['#8844cc', '#aa66ee', '#6622aa'][frame];
  p(ctx, 0, 0, 5, 10, glowC); p(ctx, 0, 0, 5, 16, glowC);
  p(ctx, 0, 0, W - 6, 10, glowC); p(ctx, 0, 0, W - 6, 16, glowC);
  p(ctx, 0, 0, 5, 22, glowC); p(ctx, 0, 0, W - 6, 22, glowC);
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
  const cx = Math.floor(W / 2), cy = Math.floor(H / 2);

  // Earth/dirt mound covering bunker — irregular top
  b(ctx, 0, 0, 0, cy - 2, W, H - cy + 2, '#4a4a3a');
  b(ctx, 0, 0, 2, cy - 4, W - 4, 4, '#555544');
  b(ctx, 0, 0, 4, cy - 6, W - 8, 3, '#5a5a48');
  b(ctx, 0, 0, 7, cy - 8, W - 14, 3, '#606050');
  // Dirt texture — pebbles and grass tufts
  for (let x = 2; x < W - 2; x += 3) {
    p(ctx, 0, 0, x, cy + 2, '#3a3a30');
    if (x % 6 === 0) p(ctx, 0, 0, x, cy - 3, '#556633');
  }
  p(ctx, 0, 0, 6, cy - 5, '#667744'); p(ctx, 0, 0, W - 8, cy - 4, '#556633');
  b(ctx, 0, 0, 3, cy, 2, 2, '#777770'); p(ctx, 0, 0, W - 6, cy + 1, '#6a6a64');

  // Concrete bunker face — reinforced
  const fx = 4, fy = cy - 4, fw = W - 8, fh = 10;
  b(ctx, 0, 0, fx, fy, fw, fh, '#6b6b63');
  b(ctx, 0, 0, fx + 1, fy + 1, fw - 2, fh - 2, '#7a7a72');
  b(ctx, 0, 0, fx, fy + 3, fw, 1, '#5a5a52');
  b(ctx, 0, 0, fx, fy + 7, fw, 1, '#5a5a52');
  b(ctx, 0, 0, fx, fy, 3, 3, '#5a5a52');
  b(ctx, 0, 0, fx + fw - 3, fy, 3, 3, '#5a5a52');

  // Reinforced blast door — heavy steel with rivets
  const dx = cx - 7, dy = fy + 1, dw = 14, dh = fh - 1;
  b(ctx, 0, 0, dx, dy, dw, dh, '#3a3a32');
  b(ctx, 0, 0, dx + 1, dy + 1, dw - 2, dh - 2, '#4a4a42');
  b(ctx, 0, 0, dx + 2, dy + 2, 5, dh - 4, '#444440');
  b(ctx, 0, 0, dx + dw - 7, dy + 2, 5, dh - 4, '#444440');
  p(ctx, 0, 0, dx + Math.floor(dw / 2) - 1, dy + 3, '#222220');
  p(ctx, 0, 0, dx + Math.floor(dw / 2) - 1, dy + 5, '#222220');
  // Rivets around door frame
  for (let ry = dy + 1; ry < dy + dh - 1; ry += 3) {
    p(ctx, 0, 0, dx + 1, ry, '#888877');
    p(ctx, 0, 0, dx + dw - 2, ry, '#888877');
  }
  // Door handle/wheel
  b(ctx, 0, 0, cx + 2, dy + 3, 3, 3, '#666655');
  p(ctx, 0, 0, cx + 3, dy + 4, '#888877');

  // Hazard stripes on door frame
  for (let sy = dy; sy < dy + dh; sy += 2) {
    p(ctx, 0, 0, dx, sy, '#ccaa00');
    p(ctx, 0, 0, dx + dw - 1, sy, '#ccaa00');
  }

  // Ventilation shaft on top
  b(ctx, 0, 0, cx - 2, cy - 10, 4, 4, '#444444');
  b(ctx, 0, 0, cx - 3, cy - 11, 6, 2, '#555555');
  p(ctx, 0, 0, cx - 1, cy - 9, '#333333');
  p(ctx, 0, 0, cx, cy - 9, '#333333');
  p(ctx, 0, 0, cx + 1, cy - 9, '#333333');

  // Warning light on vent shaft — blinks per frame
  if (frame === 0) { b(ctx, 0, 0, cx - 1, cy - 13, 3, 2, '#ff2200'); p(ctx, 0, 0, cx, cy - 14, '#ff6644'); }
  else if (frame === 1) { b(ctx, 0, 0, cx - 1, cy - 13, 3, 2, '#882200'); }
  else { b(ctx, 0, 0, cx - 1, cy - 13, 3, 2, '#331100'); }

  // Ammo crates near entrance
  b(ctx, 0, 0, 6, H - 7, 6, 4, '#5a6a3a');
  b(ctx, 0, 0, 6, H - 7, 6, 1, '#6a7a4a');
  p(ctx, 0, 0, 8, H - 5, '#4a5a2a');
  b(ctx, 0, 0, W - 13, H - 6, 5, 3, '#5a6a3a');
  b(ctx, 0, 0, W - 13, H - 6, 5, 1, '#6a7a4a');

  // Boot-scuffed ground in front of door
  b(ctx, 0, 0, dx, H - 4, dw, 1, '#3a3830');
  for (let x = dx + 1; x < dx + dw - 1; x += 3) p(ctx, 0, 0, x, H - 3, '#333028');

  // Drain grate at base
  b(ctx, 0, 0, cx - 2, H - 2, 4, 2, '#333333');
  p(ctx, 0, 0, cx - 1, H - 1, '#222222'); p(ctx, 0, 0, cx, H - 1, '#222222');
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
  const W = gw(4), H = gh(3);
  b(ctx, 0, 0, 0, 0, W, 2, '#6b6b6b');
  b(ctx, 0, 0, 0, 0, 2, H, '#6b6b6b'); b(ctx, 0, 0, W-2, 0, 2, H, '#6b6b6b');
  for (let i = 0; i < W; i += 4) b(ctx, 0, 0, i, 0, 2, H, '#78787833');
  const dx = Math.floor(W/2)-8, dy = H-8, dw = 16, dh = 8;
  b(ctx, 0, 0, dx-1, dy-1, dw+2, dh+1, '#4a4a4a');
  if (frame === 0) {
    b(ctx, 0, 0, dx, dy, dw, dh, '#7a8a6a');
    for (let y = 0; y < dh; y += 2) b(ctx, 0, 0, dx, dy+y, dw, 1, '#6a7a5a');
  } else if (frame === 1) {
    b(ctx, 0, 0, dx, dy, dw, dh/2, '#7a8a6a');
    b(ctx, 0, 0, dx, dy+dh/2, dw, dh/2, '#333333');
    b(ctx, 0, 0, dx+2, dy+dh-2, 4, 2, '#4a5a3a');
  } else {
    b(ctx, 0, 0, dx, dy, dw, dh, '#333333');
    b(ctx, 0, 0, dx+3, dy+2, 10, 4, '#5a6a4a');
    b(ctx, 0, 0, dx+5, dy+3, 5, 2, '#4a5a3a');
    b(ctx, 0, 0, dx+10, dy+3, 4, 1, '#3a3a3a');
  }
  p(ctx, 0, 0, dx-1, dy+1, '#ccaa00'); p(ctx, 0, 0, dx+dw, dy+1, '#ccaa00');
}

function drawMilitaryLandingPad(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(3), H = gh(3); const cx = Math.floor(W/2), cy = Math.floor(H/2);
  b(ctx, 0, 0, 0, 0, W, H, '#777777');
  b(ctx, 0, 0, 2, 2, W-4, H-4, '#999999');
  b(ctx, 0, 0, 2, 2, 3, 1, '#ccaa00'); b(ctx, 0, 0, 2, 2, 1, 3, '#ccaa00');
  b(ctx, 0, 0, W-5, 2, 3, 1, '#ccaa00'); b(ctx, 0, 0, W-3, 2, 1, 3, '#ccaa00');
  b(ctx, 0, 0, 2, H-4, 1, 3, '#ccaa00'); b(ctx, 0, 0, 2, H-3, 3, 1, '#ccaa00');
  b(ctx, 0, 0, W-3, H-4, 1, 3, '#ccaa00'); b(ctx, 0, 0, W-5, H-3, 3, 1, '#ccaa00');
  b(ctx, 0, 0, cx-4, cy-3, 1, 7, '#dddddd'); b(ctx, 0, 0, cx+3, cy-3, 1, 7, '#dddddd');
  b(ctx, 0, 0, cx-3, cy, 6, 1, '#dddddd');
  const lts: [number,number][] = [[1,0],[cx,0],[W-2,0],[0,cy],[W-1,cy],[1,H-1],[cx,H-1],[W-2,H-1]];
  lts.forEach((l,i) => p(ctx, 0, 0, l[0], l[1], (i%3)===frame ? '#ffff66' : '#665500'));
}

// ===================== PSIONIC NEW =====================

function drawPsionicNeuralLoom(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(4), H = gh(4);
  b(ctx, 0, 0, 0, 0, W, 2, '#3a1850'); b(ctx, 0, 0, 0, H - 2, W, 2, '#3a1850');
  b(ctx, 0, 0, 0, 0, 2, H, '#3a1850'); b(ctx, 0, 0, W - 2, 0, 2, H, '#3a1850');
  b(ctx, 0, 0, 2, 2, W - 4, 2, '#4a2860'); b(ctx, 0, 0, 2, H - 4, W - 4, 2, '#4a2860');
  b(ctx, 0, 0, 2, 2, 2, H - 4, '#4a2860'); b(ctx, 0, 0, W - 4, 2, 2, H - 4, '#4a2860');
  for (const [jx, jy] of [[2,2],[W-4,2],[2,H-4],[W-4,H-4]] as [number,number][]) p(ctx, 0, 0, jx, jy, '#aa66cc');
  for (let x = 6; x < W - 6; x += 4) { p(ctx, 0, 0, x, 1, '#6644aa'); p(ctx, 0, 0, x, H - 2, '#6644aa'); }
  for (let y = 6; y < H - 6; y += 4) { p(ctx, 0, 0, 1, y, '#6644aa'); p(ctx, 0, 0, W - 2, y, '#6644aa'); }
  b(ctx, 0, 0, 4, 4, W - 8, H - 8, '#0e0618'); b(ctx, 0, 0, 5, 5, W - 10, H - 10, '#1a0a24');
  const nodes = [{x:8,y:8},{x:W/2-6,y:6},{x:W/2,y:7},{x:W/2+6,y:6},{x:W-10,y:8},
    {x:6,y:H/2},{x:W/2-8,y:H/2-2},{x:W/2,y:H/2},{x:W/2+8,y:H/2+2},{x:W-8,y:H/2},
    {x:8,y:H-10},{x:W/2-6,y:H-8},{x:W/2,y:H-9},{x:W/2+6,y:H-8},{x:W-10,y:H-10}];
  const threads: [number,number][] = [[0,1],[1,2],[2,3],[3,4],[0,5],[4,9],[5,6],[6,7],[7,8],[8,9],[5,10],[9,14],[10,11],[11,12],[12,13],[13,14],[0,7],[4,7],[10,7],[14,7],[1,6],[3,8],[6,11],[8,13],[2,7],[7,12],[5,7],[7,9],[1,7],[3,7],[11,7],[13,7]];
  for (const [a, b_] of threads) {
    const na = nodes[a], nb = nodes[b_]; const steps = Math.max(Math.abs(nb.x-na.x), Math.abs(nb.y-na.y));
    for (let s = 0; s <= steps; s++) p(ctx, 0, 0, Math.round(na.x+(nb.x-na.x)*s/steps), Math.round(na.y+(nb.y-na.y)*s/steps), '#442266');
  }
  const paths: number[][] = [[0,1,2,7,12,13,14],[4,3,2,7,6,5,10],[0,5,6,7,8,9,4]];
  const path = paths[frame];
  for (let i = 0; i < path.length - 1; i++) {
    const na = nodes[path[i]], nb = nodes[path[i+1]]; const steps = Math.max(Math.abs(nb.x-na.x), Math.abs(nb.y-na.y));
    for (let s = 0; s <= steps; s++) p(ctx, 0, 0, Math.round(na.x+(nb.x-na.x)*s/steps), Math.round(na.y+(nb.y-na.y)*s/steps), '#cc88ff');
  }
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]; const act = path.includes(i);
    b(ctx, 0, 0, n.x-2, n.y-2, 5, 5, act ? '#7744bb' : '#553388');
    b(ctx, 0, 0, n.x-1, n.y-1, 3, 3, act ? '#bb88ee' : '#aa66cc');
    p(ctx, 0, 0, n.x, n.y, act ? '#eeddff' : '#dd99ff');
  }
  b(ctx, 0, 0, nodes[7].x-3, nodes[7].y-3, 7, 7, '#553388');
  b(ctx, 0, 0, nodes[7].x-2, nodes[7].y-2, 5, 5, '#aa66cc');
  p(ctx, 0, 0, nodes[7].x, nodes[7].y, '#ffffff');
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
  b(ctx, 0, 0, 0, H - 4, W, 4, '#2a1440'); b(ctx, 0, 0, 1, H - 3, W - 2, 2, '#3a2050');
  b(ctx, 0, 0, 2, H - 5, W - 4, 1, '#3a2050');
  for (let x = 4; x < W - 4; x += 3) p(ctx, 0, 0, x, H - 4, '#6644aa');
  const nds = [{x:8,y:6},{x:W/2,y:4},{x:W-10,y:6},{x:12,y:H-8},{x:W/2+2,y:H-10},{x:W-14,y:H-8}];
  for (const n of nds) { b(ctx, 0, 0, n.x-2, n.y+2, 5, 2, '#4a2860'); }
  const conns: [number,number][] = [[0,1],[1,2],[0,3],[1,4],[2,5],[3,4],[4,5],[0,4],[2,3],[0,5],[2,4]];
  for (const [a, b_] of conns) {
    const na = nds[a], nb = nds[b_]; const steps = Math.max(Math.abs(nb.x-na.x), Math.abs(nb.y-na.y));
    for (let s = 1; s < steps; s++) p(ctx, 0, 0, Math.round(na.x+(nb.x-na.x)*s/steps), Math.round(na.y+(nb.y-na.y)*s/steps), '#443366');
  }
  const arcPairs: [number,number][] = [[0,5],[1,3],[2,4]];
  const [aI, bI] = arcPairs[frame]; const na = nds[aI], nb = nds[bI];
  for (let s = 0; s <= 12; s++) {
    let tx = Math.round(na.x+(nb.x-na.x)*s/12); let ty = Math.round(na.y+(nb.y-na.y)*s/12);
    if (s > 0 && s < 12) tx += (s%3===0 ? 3 : s%3===1 ? -2 : 1);
    p(ctx, 0, 0, tx, ty, '#eeddff'); p(ctx, 0, 0, tx+1, ty, '#bb88ee');
  }
  const [aI2, bI2] = arcPairs[(frame+1)%3]; const na2 = nds[aI2], nb2 = nds[bI2];
  for (let s = 0; s <= 8; s++) { let tx = Math.round(na2.x+(nb2.x-na2.x)*s/8); let ty = Math.round(na2.y+(nb2.y-na2.y)*s/8); if (s>0&&s<8) tx+=(s%2===0?2:-1); p(ctx, 0, 0, tx, ty, '#8866aa'); }
  for (let i = 0; i < nds.length; i++) {
    const n = nds[i]; const act = i===aI||i===bI;
    b(ctx, 0, 0, n.x-3, n.y-3, 7, 7, act ? '#5a3870' : '#4a2860');
    b(ctx, 0, 0, n.x-2, n.y-2, 5, 5, act ? '#8a58b0' : '#6a3890');
    b(ctx, 0, 0, n.x-1, n.y-1, 3, 3, act ? '#cc99ee' : '#9977bb');
    p(ctx, 0, 0, n.x, n.y, act ? '#ffffff' : '#bb88dd');
  }
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
  b(ctx, 0, 0, 3, H-4, W-6, 4, '#1a0a24');
  b(ctx, 0, 0, 0, 0, 3, H, '#3a2050'); b(ctx, 0, 0, W-3, 0, 3, H, '#3a2050');
  b(ctx, 0, 0, 0, 0, W, 3, '#3a2050'); b(ctx, 0, 0, 3, 3, W-6, H-7, '#1a0a24');
  for (let y = 5; y < H-5; y += 4) { p(ctx, 0, 0, 1, y, '#6644aa'); p(ctx, 0, 0, W-2, y, '#6644aa'); }
  for (let x = 6; x < W-6; x += 5) { p(ctx, 0, 0, x, 1, '#6644aa'); }
  const slabX = Math.floor(W/2)-14, slabY = H-14;
  b(ctx, 0, 0, slabX, slabY+4, 28, 3, '#3a2850');
  b(ctx, 0, 0, slabX+2, slabY, 24, 4, '#5a4870');
  b(ctx, 0, 0, slabX+3, slabY+1, 22, 2, '#6a5880');
  for (let x = slabX+4; x < slabX+24; x += 3) p(ctx, 0, 0, x, slabY, '#7a6890');
  b(ctx, 0, 0, slabX+4, slabY-4, 6, 4, '#7a6890');
  b(ctx, 0, 0, slabX+8, slabY-3, 14, 3, '#5a4870');
  b(ctx, 0, 0, slabX+9, slabY-2, 12, 1, '#6a5880');
  const ac = ['#4488cc','#8844aa','#cc4488'][frame];
  b(ctx, 0, 0, slabX+2, slabY-6, 26, 1, ac);
  b(ctx, 0, 0, slabX, slabY-5, 1, 7, ac); b(ctx, 0, 0, slabX+26, slabY-5, 1, 7, ac);
  const pColors = ['#aa88ee','#88aaff','#ee88cc','#88eeff','#cc88ff'];
  for (let i = 0; i < 7; i++) {
    const px_ = slabX+6+i*3; const py_ = slabY-12-i*2;
    const yO = Math.round(Math.sin((i+frame)*1.8)*3); const xO = Math.round(Math.cos((i+frame)*1.2)*2);
    p(ctx, 0, 0, px_+xO, py_+yO, pColors[i%pColors.length]);
  }
  const runeX = [slabX+10,slabX+16,slabX+22];
  for (let i = 0; i < 3; i++) { const ry = slabY-20-frame*2+i*2; p(ctx, 0, 0, runeX[i], ry, ['#aa66cc','#6688cc','#cc66aa'][i]); }
  p(ctx, 0, 0, 4, 5, '#aa66cc'); p(ctx, 0, 0, 4, 4, ac);
  p(ctx, 0, 0, W-5, 5, '#aa66cc'); p(ctx, 0, 0, W-5, 4, ac);
}

// ===================== INFERNAL NEW =====================

function drawInfernalBoneCage(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(3), H = gh(4);
  const chainColor = '#666677', chainHi = '#8888aa', chainDk = '#444455';
  const boneColor = '#ccbb99', boneDk = '#aa9977', boneHi = '#ddd4bb';
  const sway = frame === 0 ? 0 : frame === 1 ? 2 : -2;
  const cageCx = W / 2 + sway, cageTop = 16, cageBot = 38, cageW = 20, cageH = cageBot - cageTop;
  // Chains from top - two chains
  const chain1x = cageCx - 6, chain2x = cageCx + 6;
  for (let y = 0; y < cageTop; y += 4) {
    // Chain link pattern alternating
    const linkSway = Math.round(Math.sin(y * 0.3 + frame) * 1);
    b(ctx, 0, 0, chain1x + linkSway - 1, y, 4, 2, chainColor);
    b(ctx, 0, 0, chain1x + linkSway, y + 2, 2, 2, chainHi);
    b(ctx, 0, 0, chain2x + linkSway - 1, y, 4, 2, chainColor);
    b(ctx, 0, 0, chain2x + linkSway, y + 2, 2, 2, chainHi);
  }
  // Chain attachment points at top
  b(ctx, 0, 0, chain1x - 2, 0, 6, 4, chainDk); b(ctx, 0, 0, chain2x - 2, 0, 6, 4, chainDk);
  // Cage frame - curved rib bones forming bars
  // Top ring
  b(ctx, 0, 0, cageCx - cageW / 2, cageTop, cageW, 2, boneColor);
  b(ctx, 0, 0, cageCx - cageW / 2 + 1, cageTop, cageW - 2, 2, boneHi);
  // Bottom ring
  b(ctx, 0, 0, cageCx - cageW / 2 + 2, cageBot, cageW - 4, 2, boneColor);
  b(ctx, 0, 0, cageCx - cageW / 2 + 3, cageBot, cageW - 6, 2, boneDk);
  // Vertical rib bone bars - curved outward in middle
  for (let bar = 0; bar < 5; bar++) {
    const bx = cageCx - cageW / 2 + 2 + bar * 4;
    for (let y = cageTop; y <= cageBot; y += 2) {
      const t = (y - cageTop) / cageH;
      const bulge = Math.round(Math.sin(t * Math.PI) * 2);
      const xOff = bar < 2 ? -bulge : bar > 2 ? bulge : 0;
      b(ctx, 0, 0, bx + xOff, y, 2, 2, boneColor);
      if (y % 4 === 0) p(ctx, 0, 0, bx + xOff, y, boneHi);
    }
  }
  // Middle ring (belt)
  const midY = cageTop + Math.round(cageH / 2);
  b(ctx, 0, 0, cageCx - cageW / 2 - 2, midY, cageW + 4, 2, boneDk);
  b(ctx, 0, 0, cageCx - cageW / 2 - 1, midY, cageW + 2, 2, boneColor);
  // Skull decorations at cage corners
  const skulls = [[cageCx - cageW / 2 - 2, cageTop - 1], [cageCx + cageW / 2, cageTop - 1], [cageCx - cageW / 2, cageBot], [cageCx + cageW / 2 - 2, cageBot]];
  for (const [sx, sy] of skulls) {
    b(ctx, 0, 0, sx, sy, 4, 4, boneColor); // skull
    b(ctx, 0, 0, sx, sy + 4, 4, 2, boneDk); // jaw
    p(ctx, 0, 0, sx, sy + 1, '#222'); p(ctx, 0, 0, sx + 2, sy + 1, '#222'); // eyes
    p(ctx, 0, 0, sx + 1, sy + 3, '#333'); // nose
  }
  // Dark prisoner silhouette inside cage
  const prisCx = cageCx, prisY = cageTop + 4;
  b(ctx, 0, 0, prisCx - 3, prisY, 6, 6, '#1a1111'); // head
  b(ctx, 0, 0, prisCx - 4, prisY + 6, 8, 10, '#110a0a'); // body
  b(ctx, 0, 0, prisCx - 6, prisY + 8, 4, 2, '#1a1111'); // left arm
  b(ctx, 0, 0, prisCx + 4, prisY + 8, 4, 2, '#1a1111'); // right arm reaching out
  // Glowing eyes that shift color per frame
  const eyeColors = ['#ff2200', '#ffaa00', '#ff00ff'];
  p(ctx, 0, 0, prisCx - 2, prisY + 2, eyeColors[frame]);
  p(ctx, 0, 0, prisCx + 2, prisY + 2, eyeColors[frame]);
  // Eye glow
  b(ctx, 0, 0, prisCx - 3, prisY + 1, 2, 2, eyeColors[frame] + '44');
  b(ctx, 0, 0, prisCx + 1, prisY + 1, 2, 2, eyeColors[frame] + '44');
  // Blood stain on ground below cage
  b(ctx, 0, 0, W / 2 - 6, H - 8, 12, 4, '#44110888');
  b(ctx, 0, 0, W / 2 - 4, H - 6, 8, 4, '#661a0c');
  b(ctx, 0, 0, W / 2 - 3, H - 5, 6, 2, '#881a0c');
  p(ctx, 0, 0, W / 2 - 8, H - 5, '#44110866'); // splatter
  p(ctx, 0, 0, W / 2 + 6, H - 7, '#44110866');
  // Drip from cage bottom
  const dripY = cageBot + 4 + frame * 2;
  p(ctx, 0, 0, cageCx, dripY, '#661a0c');
  p(ctx, 0, 0, cageCx, dripY + 2, '#44110888');
}

function drawInfernalPentagram(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(3), H = gh(3);
  const cx = Math.floor(W / 2), cy = Math.floor(H / 2);
  // Outer circle
  const r = Math.min(cx, cy) - 3;
  const circleColor = frame === 1 ? '#882244' : '#661122';
  for (let a = 0; a < 60; a++) {
    const angle = (a / 60) * Math.PI * 2;
    p(ctx, 0, 0, cx + Math.round(Math.cos(angle) * r), cy + Math.round(Math.sin(angle) * r), circleColor);
  }
  // Inner circle
  const ir = r - 4;
  for (let a = 0; a < 40; a++) {
    const angle = (a / 40) * Math.PI * 2;
    p(ctx, 0, 0, cx + Math.round(Math.cos(angle) * ir), cy + Math.round(Math.sin(angle) * ir), frame === 1 ? '#aa3344' : '#661122');
  }
  // Pentagram star
  const pts: [number, number][] = [];
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
    pts.push([cx + Math.round(Math.cos(angle) * r), cy + Math.round(Math.sin(angle) * r)]);
  }
  const order = [0, 2, 4, 1, 3, 0];
  for (let s = 0; s < 5; s++) {
    const [x1, y1] = pts[order[s]], [x2, y2] = pts[order[s + 1]];
    for (let t = 0; t <= 12; t++) p(ctx, 0, 0, Math.round(x1 + (x2 - x1) * t / 12), Math.round(y1 + (y2 - y1) * t / 12), '#cc2200');
  }
  // Runes at points
  for (const [px_, py_] of pts) b(ctx, 0, 0, px_ - 1, py_ - 1, 2, 2, frame === 0 ? '#ff4400' : '#cc2200');
  // Center eye (frame 2)
  if (frame === 2) { b(ctx, 0, 0, cx - 1, cy - 1, 3, 2, '#ff4400'); p(ctx, 0, 0, cx, cy, '#ffcc00'); }
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
  const W = gw(4), H = gh(4);
  const cx = Math.floor(W / 2), cy = Math.floor(H / 2);

  // Heavy steel platform base with drainage channels
  b(ctx, 0, 0, 1, H - 5, W - 2, 5, '#3a3838');
  b(ctx, 0, 0, 2, H - 4, W - 4, 3, '#434340');
  // Diamond plate texture on platform
  for (let x = 3; x < W - 3; x += 3) {
    p(ctx, 0, 0, x, H - 3, '#4a4a46');
    p(ctx, 0, 0, x + 1, H - 4, '#4a4a46');
  }
  b(ctx, 0, 0, 4, H - 2, W - 8, 1, '#2a2a28'); // drainage channel

  // Machine housing floor
  b(ctx, 0, 0, 3, 4, W - 6, H - 9, '#444440');
  b(ctx, 0, 0, 4, 5, W - 8, H - 11, '#4a4a46');
  b(ctx, 0, 0, 3, 4, W - 6, 1, '#333330');
  b(ctx, 0, 0, 3, H - 6, W - 6, 1, '#333330');
  b(ctx, 0, 0, 3, 4, 1, H - 9, '#333330');
  b(ctx, 0, 0, W - 4, 4, 1, H - 9, '#333330');

  // Oil stain puddles
  b(ctx, 0, 0, cx - 8, H - 7, 3, 1, '#222220');
  b(ctx, 0, 0, cx + 6, H - 8, 2, 2, '#282825');

  // === LARGE MAIN GEAR (center-left) ===
  const g1x = cx - 4, g1y = cy - 2, g1r = 12;
  b(ctx, 0, 0, g1x - g1r, g1y - g1r, g1r * 2, g1r * 2, '#666666');
  b(ctx, 0, 0, g1x - g1r + 2, g1y - g1r + 2, g1r * 2 - 4, g1r * 2 - 4, '#777777');
  b(ctx, 0, 0, g1x - g1r + 4, g1y - g1r + 4, g1r * 2 - 8, g1r * 2 - 8, '#727272');
  // Axle hub with highlight
  b(ctx, 0, 0, g1x - 3, g1y - 3, 6, 6, '#555555');
  b(ctx, 0, 0, g1x - 2, g1y - 2, 4, 4, '#4a4a4a');
  p(ctx, 0, 0, g1x, g1y, '#888888');
  // Spoke lines
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    for (let d = 4; d < g1r - 2; d += 2) {
      p(ctx, 0, 0, Math.round(g1x + Math.cos(a) * d), Math.round(g1y + Math.sin(a) * d), '#5e5e5e');
    }
  }
  // Gear teeth — rotate per frame
  for (let i = 0; i < 10; i++) {
    const a = ((i + frame * 0.25) / 10) * Math.PI * 2;
    const tx = Math.round(g1x + Math.cos(a) * (g1r + 1));
    const ty = Math.round(g1y + Math.sin(a) * (g1r + 1));
    b(ctx, 0, 0, tx - 1, ty - 1, 3, 3, '#888888');
    p(ctx, 0, 0, tx, ty, '#999999');
  }
  // Bolts on gear face
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    p(ctx, 0, 0, Math.round(g1x + Math.cos(a) * 6), Math.round(g1y + Math.sin(a) * 6), '#999990');
  }

  // === MEDIUM GEAR (upper right, meshing with main) ===
  const g2x = cx + 14, g2y = cy - 12, g2r = 7;
  b(ctx, 0, 0, g2x - g2r, g2y - g2r, g2r * 2, g2r * 2, '#777777');
  b(ctx, 0, 0, g2x - g2r + 2, g2y - g2r + 2, g2r * 2 - 4, g2r * 2 - 4, '#828282');
  b(ctx, 0, 0, g2x - 2, g2y - 2, 4, 4, '#5a5a5a');
  p(ctx, 0, 0, g2x, g2y, '#999999');
  // Teeth — counter-rotate
  for (let i = 0; i < 7; i++) {
    const a = ((i - frame * 0.35) / 7) * Math.PI * 2;
    const tx = Math.round(g2x + Math.cos(a) * (g2r + 1));
    const ty = Math.round(g2y + Math.sin(a) * (g2r + 1));
    b(ctx, 0, 0, tx - 1, ty - 1, 2, 2, '#999999');
  }

  // === SMALL GEAR (lower right) ===
  const g3x = cx + 16, g3y = cy + 8, g3r = 5;
  b(ctx, 0, 0, g3x - g3r, g3y - g3r, g3r * 2, g3r * 2, '#888888');
  b(ctx, 0, 0, g3x - g3r + 1, g3y - g3r + 1, g3r * 2 - 2, g3r * 2 - 2, '#8a8a8a');
  b(ctx, 0, 0, g3x - 2, g3y - 2, 4, 4, '#666666');
  p(ctx, 0, 0, g3x, g3y, '#aaaaaa');
  for (let i = 0; i < 5; i++) {
    const a = ((i + frame * 0.5) / 5) * Math.PI * 2;
    p(ctx, 0, 0, Math.round(g3x + Math.cos(a) * (g3r + 1)), Math.round(g3y + Math.sin(a) * (g3r + 1)), '#aaaaaa');
  }

  // Connecting rod from main gear to medium gear
  const rodSx = g1x + 8, rodSy = g1y - 8;
  const rodEx = g2x - 5, rodEy = g2y + 4;
  b(ctx, 0, 0, rodSx, rodSy, rodEx - rodSx, 2, '#777770');
  p(ctx, 0, 0, rodSx, rodSy, '#999990'); p(ctx, 0, 0, rodEx - 1, rodEy, '#999990');

  // Drive chain between medium and small gear
  for (let i = 0; i < 4; i++) {
    const t = i / 4;
    const dx = Math.round(g2x + (g3x - g2x) * t);
    const dy = Math.round(g2y + 5 + (g3y - g2y - 5) * t);
    p(ctx, 0, 0, dx, dy, '#666660');
  }

  // Oil drip from main gear axle
  p(ctx, 0, 0, g1x, g1y + g1r + 2, '#332200');
  if (frame >= 2) p(ctx, 0, 0, g1x, g1y + g1r + 3, '#332200');

  // Mounting bolts at corners
  p(ctx, 0, 0, 5, 6, '#999990'); p(ctx, 0, 0, W - 6, 6, '#999990');
  p(ctx, 0, 0, 5, H - 8, '#999990'); p(ctx, 0, 0, W - 6, H - 8, '#999990');

  // Grease fitting on left side
  b(ctx, 0, 0, 4, cy, 2, 2, '#ccaa44');
  p(ctx, 0, 0, 3, cy, '#aa8833');
}

function drawMechSteamBoiler(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(2), H = gh(3); const cx = Math.floor(W/2);
  b(ctx, 0, 0, 1, H-2, 3, 2, '#8a6a2a'); b(ctx, 0, 0, W-4, H-2, 3, 2, '#8a6a2a');
  b(ctx, 0, 0, 0, H-3, W, 1, '#996b33');
  const bt = 4, bh = H-7;
  b(ctx, 0, 0, 2, bt, W-4, bh, '#884422'); b(ctx, 0, 0, 3, bt, 2, bh, '#994433');
  b(ctx, 0, 0, 1, bt+2, W-2, 1, '#ccaa44'); b(ctx, 0, 0, 1, bt+bh-2, W-2, 1, '#ccaa44');
  p(ctx, 0, 0, 2, bt+2, '#ddbb55'); p(ctx, 0, 0, W-3, bt+2, '#ddbb55');
  b(ctx, 0, 0, 3, bt-1, W-6, 2, '#995533'); b(ctx, 0, 0, 4, bt-2, W-8, 1, '#aa6644');
  b(ctx, 0, 0, W-2, bt+3, 2, 2, '#555555'); p(ctx, 0, 0, W-2, bt+3, '#88ff88');
  b(ctx, 0, 0, 0, bt+1, 2, 1, '#777777'); b(ctx, 0, 0, 0, bt+4, 2, 1, '#777777');
  b(ctx, 0, 0, cx-2, H-5, 4, 2, '#553311'); p(ctx, 0, 0, cx-1, H-5, '#ff6622'); p(ctx, 0, 0, cx, H-5, '#ff4400');
  if (frame===1) b(ctx, 0, 0, cx-1, bt-4, 2, 2, '#cccccc66');
  if (frame===2) { b(ctx, 0, 0, cx-1, bt-4, 3, 2, '#dddddd77'); p(ctx, 0, 0, cx, bt-5, '#cccccc44'); }
}

function drawMechConveyorTerminal(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(4), H = gh(2);

  // Heavy steel base plate with oil stains
  b(ctx, 0, 0, 0, H - 3, W, 3, '#3a3838');
  b(ctx, 0, 0, 1, H - 2, W - 2, 1, '#333030');
  for (let x = 3; x < W - 3; x += 7) p(ctx, 0, 0, x, H - 1, '#2a2828');
  // Oil drip stains on base
  p(ctx, 0, 0, 12, H - 3, '#222220'); p(ctx, 0, 0, 13, H - 2, '#222220');
  p(ctx, 0, 0, W - 16, H - 3, '#282825');

  // Left side housing — heavy steel with drive gear
  b(ctx, 0, 0, 0, 2, 6, H - 5, '#444440');
  b(ctx, 0, 0, 1, 3, 4, H - 7, '#4e4e48');
  b(ctx, 0, 0, 0, 2, 6, 1, '#383834');
  b(ctx, 0, 0, 0, H - 4, 6, 1, '#383834');
  // Bolts on left frame
  p(ctx, 0, 0, 1, 4, '#888880'); p(ctx, 0, 0, 4, 4, '#888880');
  p(ctx, 0, 0, 1, H - 6, '#888880'); p(ctx, 0, 0, 4, H - 6, '#888880');
  // Drive gear — brass with visible teeth
  const gy = Math.floor(H / 2);
  b(ctx, 0, 0, 1, gy - 2, 4, 4, '#ccaa44');
  b(ctx, 0, 0, 2, gy - 1, 2, 2, '#aa8833');
  p(ctx, 0, 0, 3, gy - 3, '#ddbb55'); p(ctx, 0, 0, 0, gy, '#ddbb55');
  p(ctx, 0, 0, 3, gy + 2, '#ddbb55'); p(ctx, 0, 0, 5, gy, '#ddbb55');
  // Gear rotates per frame
  if (frame === 1) { p(ctx, 0, 0, 1, gy - 2, '#ddbb55'); p(ctx, 0, 0, 5, gy + 2, '#ddbb55'); }
  if (frame === 2) { p(ctx, 0, 0, 5, gy - 2, '#ddbb55'); p(ctx, 0, 0, 1, gy + 2, '#ddbb55'); }

  // Right side housing with gear
  b(ctx, 0, 0, W - 6, 2, 6, H - 5, '#444440');
  b(ctx, 0, 0, W - 5, 3, 4, H - 7, '#4e4e48');
  b(ctx, 0, 0, W - 6, 2, 6, 1, '#383834');
  b(ctx, 0, 0, W - 6, H - 4, 6, 1, '#383834');
  p(ctx, 0, 0, W - 5, 4, '#888880'); p(ctx, 0, 0, W - 2, 4, '#888880');
  p(ctx, 0, 0, W - 5, H - 6, '#888880'); p(ctx, 0, 0, W - 2, H - 6, '#888880');
  b(ctx, 0, 0, W - 5, gy - 2, 4, 4, '#ccaa44');
  b(ctx, 0, 0, W - 4, gy - 1, 2, 2, '#aa8833');
  p(ctx, 0, 0, W - 3, gy - 3, '#ddbb55'); p(ctx, 0, 0, W - 1, gy, '#ddbb55');

  // Belt bed — dark rubber surface with ridges
  const bx = 6, by = 4, bw = W - 12, bh = H - 8;
  b(ctx, 0, 0, bx, by, bw, bh, '#333330');
  b(ctx, 0, 0, bx, by, bw, 1, '#2a2a28');
  b(ctx, 0, 0, bx, by + bh - 1, bw, 1, '#2a2a28');
  for (let x = bx + 1; x < bx + bw - 1; x += 2) {
    b(ctx, 0, 0, x, by + 1, 1, bh - 2, '#3a3a36');
  }

  // Animated belt arrows — chevrons scrolling right
  const off = (frame * 4) % 12;
  for (let x = bx + 2 + off; x < bx + bw - 4; x += 12) {
    b(ctx, 0, 0, x, by + 2, 5, bh - 4, '#888877');
    b(ctx, 0, 0, x + 1, by + 3, 3, bh - 6, '#999988');
    // Arrow head chevron pointing right
    p(ctx, 0, 0, x + 5, by + Math.floor(bh / 2) - 1, '#aaa990');
    p(ctx, 0, 0, x + 5, by + Math.floor(bh / 2), '#aaa990');
    p(ctx, 0, 0, x + 6, by + Math.floor(bh / 2), '#999988');
  }

  // Rollers underneath belt — visible at bottom
  for (let x = bx + 2; x < bx + bw - 2; x += 6) {
    b(ctx, 0, 0, x, H - 5, 3, 2, '#777770');
    p(ctx, 0, 0, x + 1, H - 5, '#888880');
    p(ctx, 0, 0, x, H - 4, '#555550'); p(ctx, 0, 0, x + 2, H - 4, '#555550');
  }

  // Control panel on top right corner
  b(ctx, 0, 0, W - 5, 0, 4, 2, '#2a2828');
  b(ctx, 0, 0, W - 4, 0, 2, 1, '#333030');
  p(ctx, 0, 0, W - 4, 0, '#00ff44'); // green status LED
  p(ctx, 0, 0, W - 3, 0, frame === 1 ? '#ff4400' : '#882200'); // blinking LED

  // Safety rail along far edge
  b(ctx, 0, 0, 6, 1, W - 12, 1, '#666660');
  for (let x = 8; x < W - 8; x += 6) { b(ctx, 0, 0, x, 1, 1, 2, '#555550'); }
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

  // Dirty ground with oil stains
  b(ctx, 0, 0, 0, H - 3, W, 3, '#3a3838');
  b(ctx, 0, 0, 2, H - 2, 4, 1, '#2a2825');
  b(ctx, 0, 0, W - 8, H - 2, 3, 1, '#2a2825');
  for (let x = 1; x < W; x += 5) p(ctx, 0, 0, x, H - 1, '#333030');

  // Base layer of scrap — wide irregular mound
  b(ctx, 0, 0, 2, H - 8, W - 4, 5, '#555550');
  b(ctx, 0, 0, 1, H - 6, W - 2, 3, '#4e4e48');
  // Middle layer
  b(ctx, 0, 0, 4, H - 14, W - 8, 7, '#5a5a54');
  b(ctx, 0, 0, 5, H - 12, W - 10, 4, '#626260');
  // Top layer
  b(ctx, 0, 0, 8, H - 18, W - 16, 5, '#666660');
  b(ctx, 0, 0, 10, H - 20, W - 20, 3, '#707068');

  // Bent pipe — rust colored, sticking out left
  b(ctx, 0, 0, 3, H - 16, 1, 6, '#884422');
  b(ctx, 0, 0, 3, H - 16, 4, 1, '#884422');
  p(ctx, 0, 0, 6, H - 16, '#994433');
  p(ctx, 0, 0, 3, H - 11, '#773311');

  // Rusted plate — flat angled piece with rivet
  b(ctx, 0, 0, 8, H - 12, 8, 2, '#884422');
  b(ctx, 0, 0, 9, H - 12, 6, 1, '#994433');
  p(ctx, 0, 0, 12, H - 11, '#773311');

  // Broken gear — brass, partially visible
  b(ctx, 0, 0, W - 12, H - 17, 5, 5, '#ccaa44');
  b(ctx, 0, 0, W - 11, H - 16, 3, 3, '#aa8833');
  p(ctx, 0, 0, W - 10, H - 15, '#ddbb55');
  p(ctx, 0, 0, W - 13, H - 15, '#bbaa44'); // broken tooth
  p(ctx, 0, 0, W - 8, H - 18, '#bbaa44'); // broken tooth

  // Steel I-beam fragment
  b(ctx, 0, 0, 14, H - 20, 2, 8, '#888888');
  b(ctx, 0, 0, 13, H - 20, 4, 1, '#999999');
  b(ctx, 0, 0, 13, H - 13, 4, 1, '#999999');
  p(ctx, 0, 0, 15, H - 17, '#7a7a7a');

  // Coiled spring
  b(ctx, 0, 0, 6, H - 10, 2, 4, '#888888');
  p(ctx, 0, 0, 5, H - 10, '#999999'); p(ctx, 0, 0, 7, H - 9, '#777777');
  p(ctx, 0, 0, 5, H - 8, '#999999'); p(ctx, 0, 0, 7, H - 7, '#777777');

  // Copper pipe section
  b(ctx, 0, 0, W - 8, H - 10, 6, 1, '#cc6644');
  b(ctx, 0, 0, W - 7, H - 9, 4, 1, '#cc6644');
  p(ctx, 0, 0, W - 3, H - 10, '#dd7755');

  // Scattered nuts and bolts
  p(ctx, 0, 0, 12, H - 6, '#999988'); p(ctx, 0, 0, 20, H - 8, '#888877');
  p(ctx, 0, 0, 7, H - 5, '#aaa990'); p(ctx, 0, 0, W - 6, H - 6, '#999988');
  p(ctx, 0, 0, 16, H - 14, '#aaaaaa');

  // Steel sheet fragment — bluish
  b(ctx, 0, 0, 18, H - 16, 6, 3, '#666677');
  b(ctx, 0, 0, 19, H - 15, 4, 1, '#777788');

  // Corroded bracket
  b(ctx, 0, 0, W - 14, H - 9, 3, 4, '#887766');
  p(ctx, 0, 0, W - 14, H - 9, '#998877');
  p(ctx, 0, 0, W - 12, H - 6, '#776655');

  // Small crushed can
  b(ctx, 0, 0, 3, H - 7, 2, 2, '#555566');
  p(ctx, 0, 0, 3, H - 7, '#666677');

  // Metallic glint — shifts position per frame
  const glints: [number, number][] = [[10, H - 19], [W - 10, H - 15], [6, H - 11]];
  const [gx, gy] = glints[frame];
  p(ctx, 0, 0, gx, gy, '#ffffff');
  p(ctx, 0, 0, gx + 1, gy, '#dddddd');
  p(ctx, 0, 0, gx, gy + 1, '#bbbbbb');
  // Second subtle glint
  const g2 = glints[(frame + 1) % 3];
  p(ctx, 0, 0, g2[0] + 2, g2[1] + 1, '#cccccc');
}

function drawMechSmokestack(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(2), H = gh(4); const cx = Math.floor(W/2);
  b(ctx, 0, 0, 0, H-5, W, 5, '#664422'); b(ctx, 0, 0, 1, H-4, W-2, 3, '#553311');
  p(ctx, 0, 0, cx-1, H-3, '#ff5500'); p(ctx, 0, 0, cx, H-3, '#ff3300'); p(ctx, 0, 0, cx+1, H-3, '#ff5500');
  const sx = cx-2, st = 3, sb = H-5;
  b(ctx, 0, 0, sx, st, 5, sb-st, '#555555'); b(ctx, 0, 0, sx+1, st, 1, sb-st, '#666666'); b(ctx, 0, 0, sx+4, st, 1, sb-st, '#444444');
  for (let by = st+2; by < sb; by += 4) b(ctx, 0, 0, sx-1, by, 7, 1, '#777777');
  b(ctx, 0, 0, sx-1, st, 7, 2, '#666666'); b(ctx, 0, 0, sx, st-1, 5, 1, '#777777');
  for (let ly = st+3; ly < sb-1; ly += 3) p(ctx, 0, 0, sx+5, ly, '#887744');
  if (frame===0) { p(ctx, 0, 0, cx, st-2, '#aaaaaa66'); p(ctx, 0, 0, cx-1, st-3, '#99999944'); }
  if (frame===1) { b(ctx, 0, 0, cx-1, st-2, 2, 1, '#aaaaaa77'); b(ctx, 0, 0, cx-1, st-3, 3, 1, '#99999955'); }
  if (frame===2) { b(ctx, 0, 0, cx-1, st-2, 3, 1, '#bbbbbb88'); b(ctx, 0, 0, cx-2, st-3, 4, 1, '#aaaaaa66'); p(ctx, 0, 0, cx+1, st-4, '#99999944'); }
  b(ctx, 0, 0, 0, H-6, 2, 1, '#666666'); b(ctx, 0, 0, W-2, H-6, 2, 1, '#666666');
}

// ===================== NATURE NEW =====================

function drawNatureSacredPond(ctx: CanvasRenderingContext2D, frame: number) {
  const w = gw(5), h = gh(4); // 70x56
  // Ground around pond
  b(ctx, 0, 0, 0, 0, 70, 56, '#3a5a28');
  b(ctx, 0, 0, 2, 2, 66, 52, '#4a6a34');
  // Pond water — deep blue
  b(ctx, 0, 0, 10, 12, 50, 32, '#1a3366');
  b(ctx, 0, 0, 8, 16, 54, 24, '#1a3366');
  b(ctx, 0, 0, 12, 10, 46, 4, '#1a3366');
  b(ctx, 0, 0, 14, 42, 42, 4, '#1a3366');
  // Water depth layers
  b(ctx, 0, 0, 14, 16, 42, 24, '#223d77');
  b(ctx, 0, 0, 18, 20, 34, 16, '#2a4a88');
  // Sacred stones around edge
  const stones = [[6,14,6,4],[56,12,6,4],[4,36,6,4],[58,34,6,4],[26,6,8,4],[30,44,8,4],[2,24,4,6],[62,22,4,6]];
  for (const [sx, sy, sw, sh] of stones) {
    b(ctx, 0, 0, sx, sy, sw, sh, '#8888aa');
    b(ctx, 0, 0, sx + 1, sy, sw - 2, sh - 1, '#9999bb');
    p(ctx, 0, 0, sx + 1, sy, '#aaaacc'); // highlight
  }
  // Sacred glow aura on stones
  for (const [sx, sy, sw, sh] of stones) {
    p(ctx, 0, 0, sx + sw / 2, sy - 1, '#aaddff');
    p(ctx, 0, 0, sx + sw / 2, sy + sh, '#88bbee');
  }
  // Lily pads
  const pads = [[20,22],[38,18],[28,34],[44,28],[16,30]];
  for (let i = 0; i < pads.length; i++) {
    const [lx, ly] = pads[i];
    b(ctx, 0, 0, lx, ly, 6, 4, '#2a8a22');
    b(ctx, 0, 0, lx + 1, ly, 4, 3, '#3a9a2e');
    p(ctx, 0, 0, lx + 3, ly, '#1a3366'); // notch
    // Flowers on first two pads
    if (i < 2) {
      p(ctx, 0, 0, lx + 2, ly - 1, '#ff88aa');
      p(ctx, 0, 0, lx + 3, ly - 1, '#ff88aa');
      p(ctx, 0, 0, lx + 1, ly - 1, '#ff99bb');
      p(ctx, 0, 0, lx + 2, ly - 2, '#ffaacc');
      p(ctx, 0, 0, lx + 2, ly - 1, '#ffee44'); // center
    }
  }
  // Fish visible under water
  const fishX = 30 + frame * 4;
  b(ctx, 0, 0, fishX, 26, 6, 2, '#ee8844');
  p(ctx, 0, 0, fishX - 1, 27, '#ee8844'); // tail
  p(ctx, 0, 0, fishX + 5, 26, '#ee6622'); // nose
  p(ctx, 0, 0, fishX + 4, 26, '#111111'); // eye
  // Second fish
  const fish2X = 46 - frame * 3;
  b(ctx, 0, 0, fish2X, 32, 4, 2, '#ddaa55');
  p(ctx, 0, 0, fish2X + 4, 33, '#ddaa55');
  p(ctx, 0, 0, fish2X, 32, '#111111');
  // Golden shimmer particles on water — animate
  const shimmerPos = [[22,20],[36,16],[42,24],[18,28],[32,30],[48,20],[26,36],[40,32],[30,22],[50,26]];
  for (let i = 0; i < shimmerPos.length; i++) {
    const [sx, sy] = shimmerPos[i];
    const active = (i + frame) % 3 === 0;
    if (active) {
      p(ctx, 0, 0, sx, sy, '#ffd740');
      p(ctx, 0, 0, sx + 1, sy, '#ffee88');
    } else if ((i + frame) % 3 === 1) {
      p(ctx, 0, 0, sx, sy, '#ccaa30');
    }
  }
  // Water ripple rings
  const rOff = frame * 2;
  b(ctx, 0, 0, 24 + rOff, 24, 4, 1, '#3a5a99');
  b(ctx, 0, 0, 40 - rOff, 30, 4, 1, '#3a5a99');
  // Moss on ground edges
  for (let x = 6; x < 64; x += 8) {
    p(ctx, 0, 0, x, 10 + (x % 4), '#5a8a38');
    p(ctx, 0, 0, x + 2, 44 - (x % 3), '#5a8a38');
  }
}

function drawNatureMushroomRing(ctx: CanvasRenderingContext2D, frame: number) {
  const w = gw(2), h = gh(2); // 28x28
  // Mossy ground base
  b(ctx, 0, 0, 0, 20, 28, 8, '#3a5a28');
  b(ctx, 0, 0, 2, 18, 24, 4, '#4a6a34');
  b(ctx, 0, 0, 4, 22, 20, 4, '#325020');
  // Ground texture
  for (let i = 0; i < 12; i++) {
    p(ctx, 0, 0, 3 + (i * 7) % 22, 21 + (i * 3) % 6, '#5a7a40');
  }
  // Grass tufts
  p(ctx, 0, 0, 1, 19, '#5a8a38'); p(ctx, 0, 0, 14, 18, '#4a7a30');
  p(ctx, 0, 0, 25, 20, '#5a8a38'); p(ctx, 0, 0, 8, 24, '#4a7a30');
  // Ring of 8 mushrooms in a circle
  const mushPos = [
    [14, 6], [21, 8], [24, 14], [22, 20],
    [14, 22], [6, 20], [4, 14], [6, 8]
  ];
  const capColors = ['#cc3322', '#dd5522', '#cc4422', '#bb3318', '#dd4422', '#cc3828', '#dd5528', '#cc3322'];
  for (let i = 0; i < 8; i++) {
    const [mx, my] = mushPos[i];
    const isGlowing = (frame === 0 && i % 2 === 1) || (frame === 1 && i % 2 === 0);
    const isDim = frame === 2;
    // Stem
    p(ctx, 0, 0, mx, my + 2, '#e8dcc0');
    p(ctx, 0, 0, mx, my + 1, '#ddd0b0');
    // Cap
    b(ctx, 0, 0, mx - 1, my - 1, 4, 2, capColors[i]);
    p(ctx, 0, 0, mx, my - 2, capColors[i]);
    p(ctx, 0, 0, mx + 1, my - 2, capColors[i]);
    // White spots on cap
    p(ctx, 0, 0, mx, my - 1, '#ffffff');
    p(ctx, 0, 0, mx + 1, my, '#eeeeee');
    // Glow effect
    if (isGlowing && !isDim) {
      p(ctx, 0, 0, mx - 2, my, '#88ff8844');
      p(ctx, 0, 0, mx + 3, my, '#88ff8844');
      p(ctx, 0, 0, mx, my - 3, '#88ff8844');
      p(ctx, 0, 0, mx + 1, my + 3, '#88ff8844');
      // Brighter cap glow
      p(ctx, 0, 0, mx - 1, my - 1, '#ee5544');
      p(ctx, 0, 0, mx + 2, my - 1, '#ee5544');
    }
  }
  // Center of ring — darker moss patch
  b(ctx, 0, 0, 12, 12, 4, 4, '#2a4a1c');
  p(ctx, 0, 0, 13, 13, '#3a5a28');
  // Tiny fallen leaf
  p(ctx, 0, 0, 10, 16, '#8a6a22'); p(ctx, 0, 0, 11, 15, '#9a7a30');
}

function drawNatureHollowLog(ctx: CanvasRenderingContext2D, frame: number) {
  const w = gw(4), h = gh(2); // 56x28
  // Ground
  b(ctx, 0, 0, 0, 22, 56, 6, '#4a6a34');
  b(ctx, 0, 0, 2, 24, 52, 4, '#3a5a28');
  // Main log body
  b(ctx, 0, 0, 6, 8, 48, 14, '#6a4a28');
  b(ctx, 0, 0, 8, 6, 44, 4, '#7a5a34'); // top curve
  b(ctx, 0, 0, 8, 18, 44, 4, '#5a3a1e'); // bottom shadow
  // Bark texture — horizontal grain lines
  for (let x = 10; x < 52; x += 4) {
    b(ctx, 0, 0, x, 9, 3, 1, '#5a3a1e');
    b(ctx, 0, 0, x + 2, 13, 3, 1, '#5a3a1e');
    b(ctx, 0, 0, x, 17, 3, 1, '#4a2a14');
  }
  // Knots
  b(ctx, 0, 0, 22, 10, 4, 4, '#5a3a1e'); b(ctx, 0, 0, 23, 11, 2, 2, '#4a2a14');
  b(ctx, 0, 0, 38, 12, 3, 3, '#5a3a1e'); p(ctx, 0, 0, 39, 13, '#4a2a14');
  // Moss patches on top
  b(ctx, 0, 0, 12, 6, 6, 2, '#4a8a30'); b(ctx, 0, 0, 14, 5, 3, 2, '#5a9a38');
  b(ctx, 0, 0, 28, 5, 8, 3, '#4a8a30'); b(ctx, 0, 0, 30, 4, 4, 2, '#5a9a38');
  b(ctx, 0, 0, 44, 7, 6, 2, '#3a7a24'); p(ctx, 0, 0, 46, 6, '#5a9a38');
  // Broken branch stubs
  b(ctx, 0, 0, 18, 4, 2, 4, '#7a5a34'); p(ctx, 0, 0, 18, 3, '#8a6a40');
  b(ctx, 0, 0, 34, 5, 2, 3, '#6a4a28'); p(ctx, 0, 0, 34, 4, '#7a5a34');
  b(ctx, 0, 0, 48, 8, 3, 2, '#6a4a28'); // side stub
  // Mushrooms growing on top
  p(ctx, 0, 0, 24, 6, '#e8dcc0'); b(ctx, 0, 0, 23, 4, 4, 2, '#cc4422'); p(ctx, 0, 0, 24, 4, '#ffffff');
  p(ctx, 0, 0, 42, 7, '#e8dcc0'); b(ctx, 0, 0, 41, 5, 4, 2, '#dd5522'); p(ctx, 0, 0, 42, 5, '#ffffff');
  // Hollow opening on left end
  b(ctx, 0, 0, 2, 8, 8, 14, '#6a4a28'); // log end
  b(ctx, 0, 0, 3, 9, 6, 12, '#2a1a0a'); // dark hollow
  b(ctx, 0, 0, 4, 10, 4, 10, '#1a0e04'); // deeper dark
  // Bark rings inside hollow
  for (let r = 2; r <= 5; r++) {
    const rc = r < 4 ? '#3a2210' : '#4a3018';
    p(ctx, 0, 0, 3, 9 + r, rc); p(ctx, 0, 0, 8, 9 + r, rc);
    p(ctx, 0, 0, 3 + r, 9, rc); p(ctx, 0, 0, 3 + r, 20, rc);
  }
  // Creature eyes in hollow — blink per frame
  if (frame !== 2) { // frame 2 = blink (eyes closed)
    p(ctx, 0, 0, 5, 14, '#44ff44');
    p(ctx, 0, 0, 7, 14, '#44ff44');
    if (frame === 0) { // wide open
      p(ctx, 0, 0, 5, 13, '#226622');
      p(ctx, 0, 0, 7, 13, '#226622');
    }
  } else { // blink frame — thin line
    p(ctx, 0, 0, 5, 14, '#226622');
    p(ctx, 0, 0, 7, 14, '#226622');
  }
  // Right end cap
  b(ctx, 0, 0, 50, 8, 4, 14, '#7a5a34');
  b(ctx, 0, 0, 52, 10, 2, 10, '#6a4a28');
  // Shadow under log
  b(ctx, 0, 0, 8, 21, 44, 2, '#2a3a18');
  // Ground details
  p(ctx, 0, 0, 10, 23, '#5a8a38'); p(ctx, 0, 0, 30, 22, '#5a7a36');
  p(ctx, 0, 0, 46, 23, '#4a7a30'); p(ctx, 0, 0, 20, 25, '#3a5a24');
}

function drawNatureBerryBush(ctx: CanvasRenderingContext2D, frame: number) {
  const w = gw(2), h = gh(2); // 28x28
  // Shadow on ground
  b(ctx, 0, 0, 4, 24, 20, 4, '#2a4a18');
  // Bush base/trunk
  b(ctx, 0, 0, 12, 22, 4, 4, '#5a4020');
  p(ctx, 0, 0, 10, 22, '#5a4020'); p(ctx, 0, 0, 17, 22, '#5a4020');
  // Round bushy shape — layered circles of leaves
  // Bottom layer (darker, wider)
  b(ctx, 0, 0, 2, 14, 24, 10, '#2a6a1e');
  b(ctx, 0, 0, 4, 12, 20, 2, '#2a6a1e');
  // Middle layer
  b(ctx, 0, 0, 4, 8, 20, 10, '#3a8a28');
  b(ctx, 0, 0, 6, 6, 16, 4, '#3a8a28');
  // Top layer (lighter, rounder)
  b(ctx, 0, 0, 6, 4, 16, 8, '#4a9a34');
  b(ctx, 0, 0, 8, 2, 12, 4, '#4a9a34');
  b(ctx, 0, 0, 10, 0, 8, 4, '#4a9a34');
  // Leaf highlights
  p(ctx, 0, 0, 8, 4, '#5aaa40'); p(ctx, 0, 0, 18, 6, '#5aaa40');
  p(ctx, 0, 0, 12, 2, '#5aaa40'); p(ctx, 0, 0, 6, 10, '#5aaa40');
  p(ctx, 0, 0, 20, 8, '#5aaa40'); p(ctx, 0, 0, 14, 14, '#5aaa40');
  b(ctx, 0, 0, 10, 3, 2, 1, '#60b048');
  // Leaf shadows (depth)
  p(ctx, 0, 0, 4, 16, '#1e5a14'); p(ctx, 0, 0, 22, 18, '#1e5a14');
  p(ctx, 0, 0, 14, 20, '#1e5a14'); p(ctx, 0, 0, 8, 18, '#1e5a14');
  b(ctx, 0, 0, 16, 16, 4, 2, '#226618'); b(ctx, 0, 0, 6, 12, 2, 2, '#226618');
  // Berries — 10 bright red scattered
  const berries = [[8,6],[16,4],[20,10],[6,14],[18,14],[10,10],[24,12],[4,8],[14,8],[12,18]];
  for (const [bx, by] of berries) {
    b(ctx, 0, 0, bx, by, 2, 2, '#dd2222');
    p(ctx, 0, 0, bx, by, '#ee4444'); // highlight
  }
  // Butterfly — moves per frame
  const bfPositions = [[20, 2], [4, 6], [22, 14]];
  const [bfx, bfy] = bfPositions[frame % 3];
  // Wings
  p(ctx, 0, 0, bfx - 1, bfy - 1, '#eebb44');
  p(ctx, 0, 0, bfx + 1, bfy - 1, '#eebb44');
  p(ctx, 0, 0, bfx - 1, bfy, '#dd9922');
  p(ctx, 0, 0, bfx + 1, bfy, '#dd9922');
  // Body
  p(ctx, 0, 0, bfx, bfy, '#332200');
  p(ctx, 0, 0, bfx, bfy - 1, '#332200');
}

function drawNatureStoneShrine(ctx: CanvasRenderingContext2D, frame: number) {
  const w = gw(3), h = gh(3); // 42x42
  // Mossy base
  b(ctx, 0, 0, 4, 34, 34, 8, '#3a5a28');
  b(ctx, 0, 0, 6, 32, 30, 4, '#4a6a34');
  b(ctx, 0, 0, 8, 36, 26, 4, '#325020');
  // Base moss detail
  p(ctx, 0, 0, 10, 33, '#5a8a38'); p(ctx, 0, 0, 28, 34, '#5a8a38');
  p(ctx, 0, 0, 18, 35, '#4a7a30'); p(ctx, 0, 0, 32, 33, '#4a7a30');
  // Stone pedestal
  b(ctx, 0, 0, 12, 30, 18, 4, '#777788');
  b(ctx, 0, 0, 10, 32, 22, 2, '#666678');
  b(ctx, 0, 0, 14, 29, 14, 2, '#888899');
  // Dryad figure — torso
  b(ctx, 0, 0, 17, 14, 8, 16, '#777788');
  b(ctx, 0, 0, 18, 12, 6, 4, '#888899');
  b(ctx, 0, 0, 19, 16, 4, 12, '#6a6a7a');
  // Head
  b(ctx, 0, 0, 18, 4, 6, 8, '#888899');
  b(ctx, 0, 0, 19, 2, 4, 4, '#999aaa');
  b(ctx, 0, 0, 20, 0, 2, 3, '#8888aa'); // crown/top
  // Face features
  p(ctx, 0, 0, 19, 6, '#44cc44'); // left glowing eye
  p(ctx, 0, 0, 22, 6, '#44cc44'); // right glowing eye
  // Eye glow pulse per frame
  if (frame % 2 === 0) {
    p(ctx, 0, 0, 19, 5, '#33aa33'); p(ctx, 0, 0, 22, 5, '#33aa33');
    p(ctx, 0, 0, 18, 6, '#22882244'); p(ctx, 0, 0, 23, 6, '#22882244');
  }
  p(ctx, 0, 0, 20, 9, '#666678'); p(ctx, 0, 0, 21, 9, '#666678'); // mouth
  // Left arm outstretched
  b(ctx, 0, 0, 8, 14, 10, 3, '#777788');
  b(ctx, 0, 0, 4, 13, 6, 3, '#888899');
  b(ctx, 0, 0, 2, 12, 4, 3, '#888899'); // hand
  p(ctx, 0, 0, 2, 11, '#777788'); p(ctx, 0, 0, 4, 11, '#777788'); // fingers
  // Right arm outstretched
  b(ctx, 0, 0, 24, 14, 10, 3, '#777788');
  b(ctx, 0, 0, 32, 13, 6, 3, '#888899');
  b(ctx, 0, 0, 36, 12, 4, 3, '#888899'); // hand
  p(ctx, 0, 0, 38, 11, '#777788'); p(ctx, 0, 0, 36, 11, '#777788'); // fingers
  // Vine/moss growing on figure
  p(ctx, 0, 0, 17, 18, '#4a8a30'); p(ctx, 0, 0, 17, 20, '#3a7a24');
  p(ctx, 0, 0, 24, 16, '#4a8a30'); p(ctx, 0, 0, 24, 19, '#3a7a24');
  b(ctx, 0, 0, 16, 22, 2, 6, '#3a7a24'); // vine down left
  b(ctx, 0, 0, 24, 24, 2, 4, '#4a8a30'); // vine down right
  p(ctx, 0, 0, 6, 14, '#5a9a38'); p(ctx, 0, 0, 8, 16, '#4a8a30'); // arm moss
  p(ctx, 0, 0, 34, 14, '#5a9a38'); p(ctx, 0, 0, 32, 16, '#4a8a30');
  // Vine leaves
  p(ctx, 0, 0, 15, 22, '#5aaa40'); p(ctx, 0, 0, 25, 24, '#5aaa40');
  p(ctx, 0, 0, 17, 26, '#5aaa40');
  // Stone texture cracks
  p(ctx, 0, 0, 20, 18, '#5a5a6a'); p(ctx, 0, 0, 18, 22, '#5a5a6a');
  p(ctx, 0, 0, 21, 26, '#5a5a6a'); p(ctx, 0, 0, 19, 8, '#7777aa');
  // Firefly orbiting — position changes per frame
  const ffAngle = (frame * 90 + 45) * Math.PI / 180;
  const ffR = 18;
  const ffx = Math.round(21 + ffR * Math.cos(ffAngle));
  const ffy = Math.round(16 + ffR * Math.sin(ffAngle));
  if (ffx >= 0 && ffx < 42 && ffy >= 0 && ffy < 42) {
    p(ctx, 0, 0, ffx, ffy, '#ddff44');
    p(ctx, 0, 0, ffx + 1, ffy, '#aacc22');
    // Glow around firefly
    p(ctx, 0, 0, ffx - 1, ffy, '#88aa1144');
    p(ctx, 0, 0, ffx, ffy - 1, '#88aa1144');
  }
  // Small ground details
  p(ctx, 0, 0, 6, 38, '#5a8a38'); p(ctx, 0, 0, 34, 37, '#4a7a30');
  p(ctx, 0, 0, 14, 39, '#3a5a20');
}

function drawNatureWaterfall(ctx: CanvasRenderingContext2D, frame: number) {
  const w = gw(3), h = gh(5); // 42x70
  // Sky/background
  b(ctx, 0, 0, 0, 0, 42, 10, '#556648');
  // Left cliff rocks
  b(ctx, 0, 0, 0, 0, 14, 50, '#555548');
  b(ctx, 0, 0, 2, 2, 10, 46, '#666658');
  b(ctx, 0, 0, 0, 10, 16, 6, '#555548');
  b(ctx, 0, 0, 0, 28, 16, 6, '#5a5a4a');
  b(ctx, 0, 0, 0, 44, 18, 6, '#555548');
  // Right cliff rocks
  b(ctx, 0, 0, 28, 0, 14, 50, '#555548');
  b(ctx, 0, 0, 30, 2, 10, 46, '#666658');
  b(ctx, 0, 0, 26, 14, 16, 6, '#555548');
  b(ctx, 0, 0, 26, 32, 16, 6, '#5a5a4a');
  b(ctx, 0, 0, 24, 46, 18, 6, '#555548');
  // Rock shelves/ledges jutting in
  b(ctx, 0, 0, 12, 16, 6, 3, '#666658'); b(ctx, 0, 0, 12, 17, 4, 2, '#777768');
  b(ctx, 0, 0, 24, 22, 6, 3, '#666658'); b(ctx, 0, 0, 26, 23, 4, 2, '#777768');
  b(ctx, 0, 0, 10, 34, 6, 3, '#5a5a4a'); b(ctx, 0, 0, 10, 35, 4, 2, '#6a6a5a');
  b(ctx, 0, 0, 26, 40, 6, 3, '#666658');
  // Moss on rocks
  for (let y = 0; y < 48; y += 6) {
    p(ctx, 0, 0, 13, y, '#4a7a30'); p(ctx, 0, 0, 14, y + 2, '#5a8a38');
    p(ctx, 0, 0, 28, y + 1, '#4a7a30'); p(ctx, 0, 0, 27, y + 3, '#5a8a38');
  }
  p(ctx, 0, 0, 12, 16, '#3a6a22'); p(ctx, 0, 0, 26, 22, '#3a6a22');
  p(ctx, 0, 0, 10, 34, '#3a6a22'); p(ctx, 0, 0, 26, 40, '#3a6a22');
  // Water stream — scrolls per frame
  const woff = frame * 3;
  for (let y = 2; y < 50; y += 2) {
    const xjitter = ((y + woff) % 6 === 0) ? 1 : 0;
    b(ctx, 0, 0, 17 + xjitter, y, 8, 2, '#4488cc');
    b(ctx, 0, 0, 19, y, 4, 2, '#66aacc');
    // Highlight streaks
    if ((y + woff) % 8 < 3) {
      p(ctx, 0, 0, 20, y, '#88ccee');
      p(ctx, 0, 0, 21, y + 1, '#aaddee');
    }
  }
  // Water splits around shelves
  b(ctx, 0, 0, 15, 18, 4, 2, '#4488cc'); b(ctx, 0, 0, 24, 24, 4, 2, '#4488cc');
  // Bottom pool
  b(ctx, 0, 0, 4, 50, 34, 12, '#336699');
  b(ctx, 0, 0, 6, 52, 30, 8, '#3377aa');
  b(ctx, 0, 0, 8, 54, 26, 6, '#4488cc');
  // Pool ripples — animate
  const roff = frame * 4;
  b(ctx, 0, 0, 14 + (roff % 6), 54, 6, 2, '#66aacc');
  b(ctx, 0, 0, 10 + ((roff + 3) % 8), 56, 8, 2, '#5599bb');
  b(ctx, 0, 0, 18 + ((roff + 1) % 4), 52, 4, 2, '#66aacc');
  // Mist/spray at base of waterfall
  const soff = frame * 2;
  for (let i = 0; i < 6; i++) {
    const sx = 14 + ((i * 5 + soff) % 14);
    const sy = 48 + ((i * 3 + soff) % 4);
    p(ctx, 0, 0, sx, sy, '#88ccee');
    p(ctx, 0, 0, sx + 1, sy - 1, '#aaddee');
  }
  b(ctx, 0, 0, 16, 49, 10, 2, '#88ccee');
  // Rock texture details
  for (let i = 0; i < 8; i++) {
    p(ctx, 0, 0, 4 + (i * 3) % 10, 8 + (i * 7) % 38, '#777768');
    p(ctx, 0, 0, 30 + (i * 5) % 10, 6 + (i * 9) % 40, '#777768');
  }
  // Pool edge rocks
  b(ctx, 0, 0, 2, 48, 6, 4, '#555548'); b(ctx, 0, 0, 34, 48, 6, 4, '#555548');
  b(ctx, 0, 0, 0, 58, 42, 12, '#555548');
  b(ctx, 0, 0, 4, 60, 8, 4, '#666658'); b(ctx, 0, 0, 30, 60, 8, 4, '#666658');
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
  const W = gw(3), H = gh(2);
  b(ctx, 0, 0, 0, 0, W, H, '#1a1a2e');
  const rw = 4, rh = H-4, gap = Math.floor((W - 4*rw) / 5);
  for (let r = 0; r < 4; r++) {
    const rx = Math.floor(gap + r*(rw+gap));
    b(ctx, 0, 0, rx, 2, rw, rh, '#2a2a3e');
    b(ctx, 0, 0, rx, 2, 1, rh, '#3a3a5e'); b(ctx, 0, 0, rx+rw-1, 2, 1, rh, '#3a3a5e');
    for (let u = 0; u < rh-1; u += 2) b(ctx, 0, 0, rx+1, 2+u, rw-2, 1, '#1e1e30');
    for (let led = 0; led < rh-1; led += 2) {
      const on = ((led/2 + frame + r) % 3) !== 0;
      p(ctx, 0, 0, rx+1, 2+led, on ? (r%2===0 ? '#00ffcc' : '#44ff44') : '#113322');
    }
  }
  b(ctx, 0, 0, 1, 1, W-2, 1, '#444466');
}

function drawCyberHologramTable(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(4), H = gh(3);
  // Table legs
  const legColor = '#1a1a2a', legHi = '#2a2a3a';
  b(ctx, 0, 0, 4, H - 10, 4, 10, legColor); b(ctx, 0, 0, 5, H - 10, 2, 10, legHi);
  b(ctx, 0, 0, W - 8, H - 10, 4, 10, legColor); b(ctx, 0, 0, W - 7, H - 10, 2, 10, legHi);
  b(ctx, 0, 0, 4, H - 6, 2, 6, legColor); b(ctx, 0, 0, W - 6, H - 6, 2, 6, legColor);
  // Table surface - sleek dark
  b(ctx, 0, 0, 2, H - 14, W - 4, 6, '#111122');
  b(ctx, 0, 0, 2, H - 14, W - 4, 2, '#222244'); // top edge highlight
  b(ctx, 0, 0, 3, H - 13, W - 6, 2, '#1a1a33');
  // Control panel on front edge
  b(ctx, 0, 0, 8, H - 12, 20, 4, '#0a0a1a');
  b(ctx, 0, 0, 9, H - 11, 18, 2, '#111133');
  // Buttons
  p(ctx, 0, 0, 10, H - 11, '#ff4444'); p(ctx, 0, 0, 14, H - 11, '#44ff44');
  p(ctx, 0, 0, 18, H - 11, '#4488ff'); p(ctx, 0, 0, 22, H - 11, '#ffaa00');
  b(ctx, 0, 0, 12, H - 11, 2, 2, '#333366'); // slider track
  // Projector in center of table
  const cx = W / 2, projY = H - 16;
  b(ctx, 0, 0, cx - 4, projY - 2, 8, 4, '#222244');
  b(ctx, 0, 0, cx - 3, projY - 3, 6, 2, '#334466');
  b(ctx, 0, 0, cx - 2, projY - 4, 4, 2, '#44ccaa'); // lens glow
  // Projection beam
  b(ctx, 0, 0, cx - 1, projY - 8, 2, 4, '#44ccaa44');
  b(ctx, 0, 0, cx - 3, projY - 12, 6, 4, '#44ccaa22');
  // Hologram area
  const holoY = 2, holoH = projY - 14, holoCx = cx, holoCy = holoY + holoH / 2;
  // Scanlines over hologram area
  for (let sy = holoY; sy < holoY + holoH + 6; sy += 4) {
    b(ctx, 0, 0, cx - 16, sy, 32, 2, '#44ccaa11');
  }
  if (frame === 0) {
    // Rotating 3D cube wireframe
    const s = 10;
    const cubeX = holoCx - s, cubeY = holoCy - s;
    // Front face
    b(ctx, 0, 0, cubeX, cubeY, s * 2, 2, '#00ffcc'); b(ctx, 0, 0, cubeX, cubeY + s * 2 - 2, s * 2, 2, '#00ffcc');
    b(ctx, 0, 0, cubeX, cubeY, 2, s * 2, '#00ffcc'); b(ctx, 0, 0, cubeX + s * 2 - 2, cubeY, 2, s * 2, '#00ffcc');
    // Back face offset
    const off = 6;
    b(ctx, 0, 0, cubeX + off, cubeY - off, s * 2, 2, '#44ccaa88'); b(ctx, 0, 0, cubeX + off, cubeY - off + s * 2 - 2, s * 2, 2, '#44ccaa88');
    b(ctx, 0, 0, cubeX + off, cubeY - off, 2, s * 2, '#44ccaa88'); b(ctx, 0, 0, cubeX + off + s * 2 - 2, cubeY - off, 2, s * 2, '#44ccaa88');
    // Connecting edges
    b(ctx, 0, 0, cubeX, cubeY, 2, 2, '#00ffcc'); // corners to back
    for (let d = 0; d < off; d += 2) { p(ctx, 0, 0, cubeX + d, cubeY - d, '#44ccaa'); p(ctx, 0, 0, cubeX + s * 2 + d - 2, cubeY - d, '#44ccaa'); p(ctx, 0, 0, cubeX + d, cubeY + s * 2 - d - 2, '#44ccaa'); p(ctx, 0, 0, cubeX + s * 2 + d - 2, cubeY + s * 2 - d - 2, '#44ccaa'); }
  } else if (frame === 1) {
    // Sphere with lat/long lines
    const r = 11;
    // Longitude lines (vertical ellipses)
    for (let a = 0; a < 360; a += 12) { const rad = a * Math.PI / 180; const sx = holoCx + Math.round(Math.cos(rad) * r), sy = holoCy + Math.round(Math.sin(rad) * r); p(ctx, 0, 0, sx, sy, '#00ffcc'); }
    // Equator
    for (let i = -r; i <= r; i += 2) { p(ctx, 0, 0, holoCx + i, holoCy, '#00ffcc'); }
    // Latitude lines
    for (let lat = -6; lat <= 6; lat += 6) { const lr = Math.round(Math.sqrt(r * r - lat * lat)); for (let i = -lr; i <= lr; i += 2) { p(ctx, 0, 0, holoCx + i, holoCy + lat, '#44ccaa'); } }
    // Vertical meridians
    for (let j = -r; j <= r; j += 2) { p(ctx, 0, 0, holoCx, holoCy + j, '#00ffcc'); }
    for (let j = -r; j <= r; j += 2) { const off = Math.round(Math.sqrt(Math.max(0, r * r - j * j)) * 0.5); p(ctx, 0, 0, holoCx + off, holoCy + j, '#44ccaa88'); p(ctx, 0, 0, holoCx - off, holoCy + j, '#44ccaa88'); }
  } else {
    // Pyramid with glowing edges
    const baseY = holoCy + 10, topY = holoCy - 10;
    const left = holoCx - 12, right = holoCx + 12;
    // Base
    b(ctx, 0, 0, left, baseY, right - left, 2, '#00ffcc');
    // Left edge
    for (let i = 0; i <= 20; i++) { const t = i / 20; p(ctx, 0, 0, Math.round(left + (holoCx - left) * t), Math.round(baseY + (topY - baseY) * t), '#00ffcc'); }
    // Right edge
    for (let i = 0; i <= 20; i++) { const t = i / 20; p(ctx, 0, 0, Math.round(right + (holoCx - right) * t), Math.round(baseY + (topY - baseY) * t), '#00ffcc'); }
    // Glow at apex
    b(ctx, 0, 0, holoCx - 2, topY - 2, 4, 4, '#88ffdd44');
    p(ctx, 0, 0, holoCx, topY, '#ffffff');
    // Internal edge (depth)
    for (let i = 0; i <= 20; i++) { const t = i / 20; p(ctx, 0, 0, Math.round(holoCx + (holoCx - 4 - holoCx) * t), Math.round(baseY + (topY - baseY) * t), '#44ccaa66'); }
  }
  // Hologram flicker glow at base
  b(ctx, 0, 0, cx - 8, projY - 6, 16, 2, '#44ccaa66');
}

function drawCyberCableNest(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(3), H = gh(3);
  // Floor base - dark metallic
  b(ctx, 0, 0, 0, 0, W, H, '#1a1a22');
  b(ctx, 0, 0, 1, 1, W - 4, H - 4, '#222230');
  // Floor grating pattern
  for (let i = 0; i < W; i += 6) {
    b(ctx, 0, 0, i, 0, 2, H, '#2a2a38');
  }
  for (let j = 0; j < H; j += 6) {
    b(ctx, 0, 0, 0, j, W, 2, '#2a2a38');
  }
  // Junction boxes at edges
  b(ctx, 0, 0, 2, 2, 8, 6, '#333344'); b(ctx, 0, 0, 3, 3, 6, 4, '#444466');
  p(ctx, 0, 0, 4, 4, '#66ff66'); p(ctx, 0, 0, 6, 4, '#ff4444');
  b(ctx, 0, 0, W - 10, H - 8, 8, 6, '#333344'); b(ctx, 0, 0, W - 9, H - 7, 6, 4, '#444466');
  p(ctx, 0, 0, W - 8, H - 6, '#ffaa00'); p(ctx, 0, 0, W - 6, H - 6, '#66ff66');
  b(ctx, 0, 0, W - 10, 2, 8, 6, '#333344'); b(ctx, 0, 0, W - 9, 3, 6, 4, '#444466');
  p(ctx, 0, 0, W - 7, 4, '#ff4444');
  // Cable bundle 1 - blue, diagonal top-left to bottom-right
  const blue = '#224488', blueLt = '#3366aa';
  for (let i = 0; i < 18; i++) { const cx = 6 + i * 2, cy = 8 + i * 2 + Math.round(Math.sin(i * 0.8) * 3); b(ctx, 0, 0, cx, cy, 4, 4, blue); b(ctx, 0, 0, cx + 1, cy + 1, 2, 2, blueLt); }
  // Cable tie on blue
  b(ctx, 0, 0, 16, 18, 6, 2, '#888899'); b(ctx, 0, 0, 30, 30, 6, 2, '#888899');
  // Cable bundle 2 - green, horizontal across middle
  const green = '#228844', greenLt = '#33aa66';
  for (let i = 0; i < 20; i++) { const cx = 2 + i * 2, cy = 18 + Math.round(Math.sin(i * 0.6) * 4); b(ctx, 0, 0, cx, cy, 4, 4, green); b(ctx, 0, 0, cx + 1, cy + 1, 2, 2, greenLt); }
  b(ctx, 0, 0, 12, 17, 2, 6, '#888899'); b(ctx, 0, 0, 28, 15, 2, 6, '#888899');
  // Cable bundle 3 - copper, bottom-left to top-right
  const copper = '#884422', copperLt = '#aa6633';
  for (let i = 0; i < 16; i++) { const cx = 4 + i * 2, cy = H - 10 - i * 2 + Math.round(Math.cos(i * 0.7) * 3); b(ctx, 0, 0, cx, cy, 4, 4, copper); b(ctx, 0, 0, cx + 1, cy + 1, 2, 2, copperLt); }
  b(ctx, 0, 0, 14, H - 16, 6, 2, '#888899');
  // Cable bundle 4 - cyan, vertical left side curving right
  const cyan = '#44ccaa', cyanLt = '#66eebb';
  for (let i = 0; i < 18; i++) { const cx = 10 + Math.round(Math.sin(i * 0.5) * 6), cy = 4 + i * 2; b(ctx, 0, 0, cx, cy, 4, 4, cyan); b(ctx, 0, 0, cx + 1, cy + 1, 2, 2, cyanLt); }
  b(ctx, 0, 0, 9, 16, 6, 2, '#888899'); b(ctx, 0, 0, 12, 28, 6, 2, '#888899');
  // Animated spark along cable per frame
  const sparkPaths = [
    () => { const i = 6 + frame; return { x: 6 + i * 2, y: 8 + i * 2 + Math.round(Math.sin(i * 0.8) * 3) }; },
    () => { const i = 10 + frame; return { x: 2 + i * 2, y: 18 + Math.round(Math.sin(i * 0.6) * 4) }; },
    () => { const i = 5 + frame; return { x: 10 + Math.round(Math.sin(i * 0.5) * 6), y: 4 + i * 2 }; },
  ];
  const sp = sparkPaths[frame]();
  b(ctx, 0, 0, sp.x - 2, sp.y - 2, 8, 8, '#44ccff44'); // glow
  b(ctx, 0, 0, sp.x - 1, sp.y - 1, 6, 6, '#88eeff88');
  b(ctx, 0, 0, sp.x, sp.y, 4, 4, '#ffffff');
  p(ctx, 0, 0, sp.x + 1, sp.y + 1, '#ffffff');
  // Spark trail
  const trail = frame === 0 ? blue : frame === 1 ? green : cyan;
  b(ctx, 0, 0, sp.x - 4, sp.y, 2, 2, '#aaeeff'); b(ctx, 0, 0, sp.x - 6, sp.y + 1, 2, 2, trail);
}

function drawCyberCryptoMiner(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(3), H = gh(2); const cx = Math.floor(W / 2);

  // Open rack frame — metal server rack housing
  b(ctx, 0, 0, 1, 1, W - 2, H - 2, '#1a1a22');
  b(ctx, 0, 0, 2, 2, W - 4, H - 4, '#2a2a33');
  // Rack frame rails (left/right)
  b(ctx, 0, 0, 1, 1, 2, H - 2, '#333340'); b(ctx, 0, 0, W - 3, 1, 2, H - 2, '#333340');
  b(ctx, 0, 0, 1, 1, W - 2, 1, '#3a3a44'); // top rail

  // GPU card 1 — visible green PCB with heatsink
  b(ctx, 0, 0, 4, 3, W - 10, 4, '#224422'); // PCB
  b(ctx, 0, 0, 5, 4, 6, 2, '#444455'); // heatsink fins
  for (let fx = 5; fx < 11; fx += 2) p(ctx, 0, 0, fx, 4, '#555566'); // fin detail
  p(ctx, 0, 0, 12, 4, '#00ff44'); // power LED
  b(ctx, 0, 0, 14, 3, 4, 4, '#333340'); // power connector block

  // GPU card 2 — second card below
  b(ctx, 0, 0, 4, 8, W - 10, 4, '#224422');
  b(ctx, 0, 0, 5, 9, 6, 2, '#444455');
  for (let fx = 5; fx < 11; fx += 2) p(ctx, 0, 0, fx, 9, '#555566');
  p(ctx, 0, 0, 12, 9, '#00ff44');
  b(ctx, 0, 0, 14, 8, 4, 4, '#333340');

  // Small screen/display showing bitcoin symbol + hashrate
  b(ctx, 0, 0, W - 8, 3, 6, 5, '#111118'); // screen bezel
  b(ctx, 0, 0, W - 7, 4, 4, 3, '#001108'); // screen
  // Bitcoin symbol (orange B with lines)
  p(ctx, 0, 0, W - 6, 4, '#ff8800'); b(ctx, 0, 0, W - 6, 5, 2, 1, '#ff8800');
  p(ctx, 0, 0, W - 6, 6, '#ff8800'); p(ctx, 0, 0, W - 5, 4, '#ffaa22');
  // Hash counter — ticks per frame
  p(ctx, 0, 0, W - 4, 5 + (frame % 2), '#00ff66');

  // Fans (2 visible on side, spinning)
  const fanY = H - 8;
  b(ctx, 0, 0, 4, fanY, 5, 5, '#222230'); // fan housing 1
  // Fan blades rotate per frame
  if (frame === 0) { p(ctx, 0, 0, 5, fanY + 1, '#555566'); p(ctx, 0, 0, 7, fanY + 3, '#555566'); }
  else if (frame === 1) { p(ctx, 0, 0, 6, fanY + 1, '#555566'); p(ctx, 0, 0, 6, fanY + 3, '#555566'); }
  else { p(ctx, 0, 0, 7, fanY + 1, '#555566'); p(ctx, 0, 0, 5, fanY + 3, '#555566'); }
  p(ctx, 0, 0, 6, fanY + 2, '#444455'); // hub
  b(ctx, 0, 0, 11, fanY, 5, 5, '#222230'); // fan housing 2
  if (frame === 0) { p(ctx, 0, 0, 14, fanY + 1, '#555566'); p(ctx, 0, 0, 12, fanY + 3, '#555566'); }
  else if (frame === 1) { p(ctx, 0, 0, 13, fanY + 1, '#555566'); p(ctx, 0, 0, 13, fanY + 3, '#555566'); }
  else { p(ctx, 0, 0, 12, fanY + 1, '#555566'); p(ctx, 0, 0, 14, fanY + 3, '#555566'); }
  p(ctx, 0, 0, 13, fanY + 2, '#444455');

  // Heat shimmer above unit (wavy lines shift per frame)
  for (let hx = 6; hx < W - 6; hx += 3) {
    const hOff = (hx + frame) % 3;
    p(ctx, 0, 0, hx + hOff, 1, '#ff440022');
    p(ctx, 0, 0, hx + 1, 0, '#ff220011');
  }

  // Power cables trailing from back
  b(ctx, 0, 0, W - 3, 6, 2, 1, '#444455'); b(ctx, 0, 0, W - 2, 7, 1, 4, '#333340');
  b(ctx, 0, 0, W - 3, 12, 2, 1, '#444455'); b(ctx, 0, 0, W - 2, 13, 1, 3, '#333340');

  // Status LEDs on front panel
  p(ctx, 0, 0, 3, 4, frame === 0 ? '#00ff44' : '#003311');
  p(ctx, 0, 0, 3, 6, frame === 1 ? '#ff8800' : '#331100');
  p(ctx, 0, 0, 3, 8, '#00ff44'); // always on power LED
  p(ctx, 0, 0, 3, 10, frame === 2 ? '#44ccaa' : '#112222');
}

function drawCyberNeonSign(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(4), H = gh(2);

  // Dark wall background — brick texture
  b(ctx, 0, 0, 0, 0, W, H, '#1a1a22');
  for (let by_ = 2; by_ < H - 2; by_ += 3) {
    for (let bx = 1; bx < W - 1; bx += 5) {
      const off = (by_ % 6 < 3) ? 0 : 2;
      b(ctx, 0, 0, bx + off, by_, 4, 2, '#1e1e28');
      p(ctx, 0, 0, bx + off, by_, '#222230'); // mortar line
    }
  }

  // Mounting bracket/bar across top
  b(ctx, 0, 0, 4, 3, W - 8, 2, '#333340');
  // Mounting hooks
  p(ctx, 0, 0, 10, 3, '#444455'); p(ctx, 0, 0, 22, 3, '#444455');
  p(ctx, 0, 0, 34, 3, '#444455'); p(ctx, 0, 0, 46, 3, '#444455');

  // Letter H — neon tube shape
  const hOn = (frame === 0 || frame === 2);
  const hC = hOn ? '#ff44cc' : '#331122'; const hG = hOn ? '#ff88ee' : '#331122';
  b(ctx, 0, 0, 6, 6, 2, 12, hC); // left vertical
  b(ctx, 0, 0, 12, 6, 2, 12, hC); // right vertical
  b(ctx, 0, 0, 6, 11, 8, 2, hC); // crossbar
  if (hOn) { p(ctx, 0, 0, 7, 7, hG); p(ctx, 0, 0, 13, 7, hG); } // tube highlights
  // Glow halo around H
  if (hOn) { b(ctx, 0, 0, 5, 5, 10, 1, '#ff44cc22'); b(ctx, 0, 0, 5, 18, 10, 1, '#ff44cc22'); }

  // Letter A — neon tube
  const aOn = (frame === 0 || frame === 1);
  const aC = aOn ? '#ff44cc' : '#331122'; const aG = aOn ? '#ff88ee' : '#331122';
  p(ctx, 0, 0, 20, 6, aC); b(ctx, 0, 0, 19, 7, 4, 1, aC); // peak
  b(ctx, 0, 0, 18, 8, 2, 10, aC); // left leg
  b(ctx, 0, 0, 22, 8, 2, 10, aC); // right leg
  b(ctx, 0, 0, 18, 12, 6, 2, aC); // crossbar
  if (aOn) { p(ctx, 0, 0, 19, 9, aG); p(ctx, 0, 0, 23, 9, aG); p(ctx, 0, 0, 20, 6, '#ffaaee'); }
  if (aOn) { b(ctx, 0, 0, 17, 5, 8, 1, '#ff44cc22'); b(ctx, 0, 0, 17, 18, 8, 1, '#ff44cc22'); }

  // Letter C — neon tube
  const cOn = (frame === 1 || frame === 2);
  const cC = cOn ? '#ff44cc' : '#331122'; const cG = cOn ? '#ff88ee' : '#331122';
  b(ctx, 0, 0, 28, 6, 8, 2, cC); // top bar
  b(ctx, 0, 0, 28, 6, 2, 12, cC); // left vertical
  b(ctx, 0, 0, 28, 16, 8, 2, cC); // bottom bar
  if (cOn) { p(ctx, 0, 0, 29, 7, cG); p(ctx, 0, 0, 30, 6, '#ffaaee'); p(ctx, 0, 0, 29, 16, cG); }
  if (cOn) { b(ctx, 0, 0, 27, 5, 10, 1, '#ff44cc22'); b(ctx, 0, 0, 27, 18, 10, 1, '#ff44cc22'); }

  // Letter K — neon tube
  const kOn = (frame === 0 || frame === 2);
  const kC = kOn ? '#ff44cc' : '#331122'; const kG = kOn ? '#ff88ee' : '#331122';
  b(ctx, 0, 0, 40, 6, 2, 12, kC); // vertical
  b(ctx, 0, 0, 42, 10, 2, 2, kC); // junction
  // Upper diagonal
  p(ctx, 0, 0, 44, 8, kC); p(ctx, 0, 0, 45, 7, kC); p(ctx, 0, 0, 46, 6, kC);
  // Lower diagonal
  p(ctx, 0, 0, 44, 13, kC); p(ctx, 0, 0, 45, 14, kC); p(ctx, 0, 0, 46, 15, kC); p(ctx, 0, 0, 47, 16, kC);
  if (kOn) { p(ctx, 0, 0, 41, 7, kG); p(ctx, 0, 0, 46, 7, kG); p(ctx, 0, 0, 47, 16, kG); }
  if (kOn) { b(ctx, 0, 0, 39, 5, 10, 1, '#ff44cc22'); b(ctx, 0, 0, 39, 18, 10, 1, '#ff44cc22'); }

  // Overall glow wash on wall behind lit letters
  if (frame === 0) { b(ctx, 0, 0, 4, 4, W - 8, 1, '#ff44cc11'); b(ctx, 0, 0, 4, 19, W - 8, 1, '#ff44cc11'); }
  // Power cord dangling from right side
  p(ctx, 0, 0, W - 4, 4, '#333340'); p(ctx, 0, 0, W - 3, 5, '#333340');
  p(ctx, 0, 0, W - 4, 6, '#333340'); p(ctx, 0, 0, W - 3, 7, '#333340');
  b(ctx, 0, 0, W - 4, 8, 1, H - 10, '#2a2a33');
}

function drawCyberHackerStation(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(2), H = gh(2); const cx = Math.floor(W / 2);

  // Desk surface — dark composite with metal edge
  b(ctx, 0, 0, 1, H - 6, W - 2, 6, '#2a2a33');
  b(ctx, 0, 0, 2, H - 5, W - 4, 4, '#333340');
  b(ctx, 0, 0, 1, H - 6, W - 2, 1, '#3a3a44'); // front edge highlight
  // Desk legs
  b(ctx, 0, 0, 2, H - 2, 1, 2, '#222230'); b(ctx, 0, 0, W - 3, H - 2, 1, 2, '#222230');

  // Main monitor — large, with bezel
  b(ctx, 0, 0, 3, 1, W - 8, H - 9, '#1a1a22'); // outer bezel
  b(ctx, 0, 0, 4, 2, W - 10, H - 11, '#111118'); // inner bezel
  b(ctx, 0, 0, 5, 3, W - 12, H - 13, '#001108'); // screen
  // Monitor stand
  b(ctx, 0, 0, cx - 2, H - 8, 4, 2, '#333340');
  b(ctx, 0, 0, cx - 3, H - 7, 6, 1, '#2a2a33');
  // Power LED on bezel
  p(ctx, 0, 0, W - 7, H - 9, '#00ff44');

  // Screen content — code lines that change per frame
  if (frame === 0) {
    // Green terminal — typical hacker screen
    b(ctx, 0, 0, 6, 4, 8, 1, '#00cc55'); b(ctx, 0, 0, 6, 6, 5, 1, '#00aa44');
    b(ctx, 0, 0, 6, 8, 10, 1, '#00cc55'); b(ctx, 0, 0, 6, 10, 7, 1, '#008833');
    b(ctx, 0, 0, 6, 12, 4, 1, '#00cc55');
    p(ctx, 0, 0, 11, 12, '#ffffff'); // cursor
  } else if (frame === 1) {
    // Blue — network scan / matrix rain
    b(ctx, 0, 0, 6, 4, 6, 1, '#0088ff'); b(ctx, 0, 0, 8, 6, 8, 1, '#0066cc');
    b(ctx, 0, 0, 6, 8, 10, 1, '#0088ff'); b(ctx, 0, 0, 7, 10, 5, 1, '#0066cc');
    b(ctx, 0, 0, 6, 12, 9, 1, '#0088ff');
    // Matrix rain drops
    p(ctx, 0, 0, 13, 5, '#0088ff'); p(ctx, 0, 0, 10, 7, '#0066cc'); p(ctx, 0, 0, 15, 9, '#0044aa');
  } else {
    // Red alert — intrusion detected
    b(ctx, 0, 0, 6, 4, 10, 1, '#ff4488'); b(ctx, 0, 0, 6, 6, 7, 1, '#cc2266');
    b(ctx, 0, 0, 6, 8, 4, 1, '#ff4488'); b(ctx, 0, 0, 6, 10, 9, 1, '#cc2266');
    b(ctx, 0, 0, 6, 12, 6, 1, '#ff4488');
    // Warning indicator
    p(ctx, 0, 0, 14, 4, '#ff4488'); p(ctx, 0, 0, 14, 6, '#ff4488');
  }

  // Second smaller monitor (on left, angled)
  b(ctx, 0, 0, 1, 2, 3, 5, '#1a1a22');
  b(ctx, 0, 0, 1, 3, 2, 3, '#001108');
  p(ctx, 0, 0, 1, 3 + frame, '#00cc55');

  // Mechanical keyboard — visible keys
  b(ctx, 0, 0, 3, H - 4, W - 6, 3, '#222230'); // keyboard body
  b(ctx, 0, 0, 4, H - 3, W - 8, 1, '#333340'); // key surface
  // Individual key caps (visible)
  for (let kx = 4; kx < W - 4; kx += 2) {
    p(ctx, 0, 0, kx, H - 4, '#3a3a44');
    p(ctx, 0, 0, kx, H - 3, '#444455');
  }
  // Spacebar
  b(ctx, 0, 0, 7, H - 2, 6, 1, '#3a3a44');
  // RGB underglow
  const rgbC = ['#ff2244', '#22ff44', '#2244ff'][frame];
  b(ctx, 0, 0, 3, H - 2, W - 6, 1, rgbC + '44');

  // Energy drink can (right side of desk)
  b(ctx, 0, 0, W - 4, H - 9, 2, 3, '#228844'); // can body
  p(ctx, 0, 0, W - 4, H - 9, '#44cc66'); // can rim
  p(ctx, 0, 0, W - 3, H - 8, '#116633'); // logo stripe

  // Trailing cables from desk edge
  p(ctx, 0, 0, 1, H - 4, '#333340'); p(ctx, 0, 0, 0, H - 3, '#2a2a33');
  p(ctx, 0, 0, W - 2, H - 5, '#333340'); p(ctx, 0, 0, W - 1, H - 4, '#2a2a33');
  p(ctx, 0, 0, W - 1, H - 3, '#222230');
}

function drawCyberFirewallNode(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(5), H = gh(5); const cx = Math.floor(W / 2), cy = Math.floor(H / 2);

  // Dark arena floor
  b(ctx, 0, 0, 2, 2, W - 4, H - 4, '#1a1a22');
  // Floor grid pattern
  for (let gx = 6; gx < W - 6; gx += 6) b(ctx, 0, 0, gx, 4, 1, H - 8, '#222230');
  for (let gy = 6; gy < H - 6; gy += 6) b(ctx, 0, 0, 4, gy, W - 8, 1, '#222230');

  // Hexagonal cage structure — 6 vertical bars forming hex perimeter
  const hexR = 26;
  for (let a = 0; a < 6; a++) {
    const angle = (a / 6) * Math.PI * 2;
    const hx = Math.round(cx + Math.cos(angle) * hexR);
    const hy = Math.round(cy + Math.sin(angle) * hexR);
    // Vertical bar (node pillar)
    b(ctx, 0, 0, hx - 1, hy - 4, 3, 8, '#2a2a33');
    b(ctx, 0, 0, hx, hy - 3, 1, 6, '#3a3a44'); // highlight
    // Node cap (glowing)
    b(ctx, 0, 0, hx - 1, hy - 5, 3, 2, '#44ccaa');
    p(ctx, 0, 0, hx, hy - 5, '#88ffdd'); // bright top
    b(ctx, 0, 0, hx - 1, hy + 3, 3, 2, '#44ccaa');

    // Electrified bars connecting to adjacent nodes
    const na = ((a + 1) / 6) * Math.PI * 2;
    const nx = Math.round(cx + Math.cos(na) * hexR);
    const ny = Math.round(cy + Math.sin(na) * hexR);
    // Connection bar (horizontal cage bar)
    for (let s = 1; s <= 6; s++) {
      const bx = Math.round(hx + (nx - hx) * s / 7);
      const by = Math.round(hy + (ny - hy) * s / 7);
      p(ctx, 0, 0, bx, by - 3, '#333344'); // top bar
      p(ctx, 0, 0, bx, by + 3, '#333344'); // bottom bar
    }
    // Electricity arc between nodes — shifts per frame
    const arcMid = 3 + (a + frame) % 4;
    const arcBx = Math.round(hx + (nx - hx) * arcMid / 7);
    const arcBy = Math.round(hy + (ny - hy) * arcMid / 7);
    // Arc bolt (jagged lightning)
    p(ctx, 0, 0, arcBx, arcBy - 2, '#44ccaa');
    p(ctx, 0, 0, arcBx + 1, arcBy - 1, '#88ffdd');
    p(ctx, 0, 0, arcBx - 1, arcBy, '#ffffff');
    p(ctx, 0, 0, arcBx, arcBy + 1, '#88ffdd');
    p(ctx, 0, 0, arcBx + 1, arcBy + 2, '#44ccaa');
  }

  // Shield hex pattern — inner ring, semi-transparent
  const shieldR = 18;
  for (let a = 0; a < 6; a++) {
    const angle = (a / 6) * Math.PI * 2 + Math.PI / 6; // offset 30 degrees from cage
    const hx = Math.round(cx + Math.cos(angle) * shieldR);
    const hy = Math.round(cy + Math.sin(angle) * shieldR);
    // Small hex tile
    b(ctx, 0, 0, hx - 2, hy - 1, 4, 3, '#0044aa33');
    p(ctx, 0, 0, hx, hy, '#0066cc44');
  }

  // Central core — pulsing energy sphere
  const pulseR = 6 + frame;
  for (let r = pulseR; r >= 0; r--) {
    const intensity = Math.floor(40 + (pulseR - r) * 25);
    const ic = Math.min(intensity, 255).toString(16).padStart(2, '0');
    for (let a = 0; a < 360; a += 12) {
      const rad = a * Math.PI / 180;
      p(ctx, 0, 0, Math.round(cx + Math.cos(rad) * r), Math.round(cy + Math.sin(rad) * r), `#00${ic}aa`);
    }
  }
  // Core bright center
  b(ctx, 0, 0, cx - 2, cy - 2, 4, 4, '#0088cc');
  b(ctx, 0, 0, cx - 1, cy - 1, 2, 2, '#44ccee');
  p(ctx, 0, 0, cx, cy, '#ffffff');

  // Data streams flowing vertically through cage
  for (let i = 0; i < 6; i++) {
    const sx = 8 + i * 10;
    const streamOff = (frame * 4 + i * 3) % (H - 8);
    for (let d = 0; d < 6; d++) {
      const sy = 4 + (streamOff + d * 3) % (H - 8);
      p(ctx, 0, 0, sx, sy, d < 2 ? '#00ff4488' : '#00ff4433');
    }
  }
  // Horizontal data streams
  for (let i = 0; i < 4; i++) {
    const sy = 10 + i * 14;
    const sOff = (frame * 5 + i * 4) % (W - 8);
    for (let d = 0; d < 4; d++) {
      const sx = 4 + (sOff + d * 4) % (W - 8);
      p(ctx, 0, 0, sx, sy, '#44ccaa22');
    }
  }

  // Spark flashes at random cage nodes per frame
  const sparkNode = frame % 6;
  const sa = (sparkNode / 6) * Math.PI * 2;
  const spx = Math.round(cx + Math.cos(sa) * hexR);
  const spy = Math.round(cy + Math.sin(sa) * hexR);
  b(ctx, 0, 0, spx - 2, spy - 2, 5, 5, '#ffffff44');
  p(ctx, 0, 0, spx, spy, '#ffffff');
}

// ===================== CELESTIAL NEW =====================

function drawCelestialOracleFountain(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(4), H = gh(4); const cx = Math.floor(W / 2);
  b(ctx, 0, 0, 4, H - 4, W - 8, 4, '#a8a098');
  b(ctx, 0, 0, 2, H - 3, W - 4, 3, '#b8b0a0');
  b(ctx, 0, 0, 6, H - 5, W - 12, 1, '#c8c0b0');
  for (let x = 8; x < W - 8; x += 4) { p(ctx, 0, 0, x, H - 4, '#d0c8b8'); p(ctx, 0, 0, x + 1, H - 5, '#c0b8a8'); }
  b(ctx, 0, 0, 4, H - 12, W - 8, 8, '#d0c8b8');
  b(ctx, 0, 0, 6, H - 10, W - 12, 4, '#2a5577');
  b(ctx, 0, 0, 7, H - 9, W - 14, 2, '#3a6688');
  for (let x = 5; x < W - 5; x += 3) { p(ctx, 0, 0, x, H - 12, '#e0d8c8'); p(ctx, 0, 0, x + 1, H - 12, '#b8b0a0'); }
  b(ctx, 0, 0, 4, H - 12, W - 8, 1, '#ece4d4');
  b(ctx, 0, 0, cx - 3, H - 22, 6, 10, '#e0d8c8');
  b(ctx, 0, 0, cx - 2, H - 21, 4, 8, '#ece4d4');
  for (let x = cx - 2; x < cx + 2; x += 2) b(ctx, 0, 0, x, H - 20, 1, 6, '#c8c0b0');
  b(ctx, 0, 0, cx - 1, H - 20, 1, 6, '#f0e8d8');
  b(ctx, 0, 0, cx - 4, H - 22, 8, 1, '#d0c8b8');
  b(ctx, 0, 0, cx - 7, H - 26, 14, 4, '#d0c8b8');
  b(ctx, 0, 0, cx - 6, H - 25, 12, 2, '#2a5577');
  b(ctx, 0, 0, cx - 6, H - 25, 12, 1, '#3a7799');
  b(ctx, 0, 0, cx - 7, H - 26, 14, 1, '#ece4d4');
  const spouts = [cx - 8, cx - 4, cx + 3, cx + 7];
  for (const sx of spouts) { b(ctx, 0, 0, sx, H - 24, 2, 2, '#ccaa44'); p(ctx, 0, 0, sx, H - 24, '#ddbb55'); }
  b(ctx, 0, 0, cx - 2, H - 30, 4, 4, '#e0d8c8');
  b(ctx, 0, 0, cx - 1, H - 32, 2, 2, '#ffdd88');
  p(ctx, 0, 0, cx, H - 33, '#ffee99');
  const ah = [[6,4,8,5],[8,7,5,9],[4,9,6,3]][frame];
  for (let i = 0; i < 4; i++) {
    const sx = spouts[i];
    for (let d = 0; d < ah[i]; d++) {
      const wy = H - 24 + d;
      const wx = i < 2 ? sx - 1 - Math.floor(d / 2) : sx + 2 + Math.floor(d / 2);
      p(ctx, 0, 0, wx, wy, d % 2 === 0 ? '#88bbdd' : '#aaccee');
    }
  }
  const shimO = [[cx-4,cx+2,cx-1],[cx-2,cx+4,cx+1],[cx-5,cx,cx+3]][frame];
  for (const so of shimO) p(ctx, 0, 0, so, H - 9, '#ffdd88');
}

function drawCelestialMarbleColossus(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(2), H = gh(4);
  const marble1 = '#e0d8c8', marble2 = '#ece4d4', marble3 = '#f0ebe0', marbleDk = '#c8bfae', marbleVein = '#d4cbb8';
  const gold1 = '#ffdd88', gold2 = '#ccaa44', goldBr = '#ffeeaa';
  // Pedestal
  b(ctx, 0, 0, 2, H - 8, W - 4, 8, marbleDk);
  b(ctx, 0, 0, 1, H - 10, W - 2, 4, marble1);
  b(ctx, 0, 0, 3, H - 8, W - 6, 2, marble2); // pedestal top highlight
  // Pedestal decorative trim
  b(ctx, 0, 0, 2, H - 6, W - 4, 2, gold2);
  for (let i = 4; i < W - 4; i += 4) p(ctx, 0, 0, i, H - 6, gold1);
  // Feet/base of robe on pedestal
  const figBase = H - 12;
  b(ctx, 0, 0, 6, figBase, 16, 4, marble1);
  b(ctx, 0, 0, 4, figBase + 2, 4, 2, marble2); // left robe drape
  b(ctx, 0, 0, 20, figBase + 2, 4, 2, marble2); // right robe drape
  // Robe body - tapers upward
  const robeBot = figBase, robeTop = 16;
  for (let y = robeBot; y >= robeTop; y -= 2) {
    const t = (robeBot - y) / (robeBot - robeTop);
    const halfW = Math.round(9 - t * 4);
    const cx = W / 2;
    b(ctx, 0, 0, cx - halfW, y, halfW * 2, 2, y % 4 === 0 ? marble1 : marble2);
    // Drapery fold shadows
    if (y % 6 === 0 && t < 0.8) {
      p(ctx, 0, 0, cx - halfW + 2, y, marbleDk);
      p(ctx, 0, 0, cx + halfW - 4, y, marbleDk);
    }
  }
  // Marble veining texture
  for (let y = robeTop + 4; y < robeBot; y += 8) {
    const vx = W / 2 - 2 + (y % 3) * 2;
    b(ctx, 0, 0, vx, y, 4, 2, marbleVein);
  }
  // Belt/sash
  b(ctx, 0, 0, W / 2 - 5, 30, 10, 2, gold2);
  b(ctx, 0, 0, W / 2 - 4, 30, 8, 2, gold1);
  p(ctx, 0, 0, W / 2, 30, goldBr); // buckle
  // Left arm - at side
  b(ctx, 0, 0, 4, 22, 4, 12, marble1);
  b(ctx, 0, 0, 3, 22, 2, 10, marbleDk); // shadow
  b(ctx, 0, 0, 4, 34, 4, 2, marble2); // hand
  // Right arm - raised holding flame
  b(ctx, 0, 0, W - 8, 20, 4, 4, marble1);
  b(ctx, 0, 0, W - 6, 16, 4, 4, marble1); // upper arm raised
  b(ctx, 0, 0, W - 4, 12, 4, 4, marble2); // forearm up
  b(ctx, 0, 0, W - 4, 10, 4, 2, marble1); // hand
  // Golden flame in raised hand - flickers per frame
  const flameX = W - 3, flameBase = 8;
  const flameH = [8, 10, 7][frame];
  for (let fy = 0; fy < flameH; fy += 2) {
    const t = fy / flameH;
    const fw = Math.max(2, Math.round((1 - t) * 6));
    const color = t < 0.3 ? goldBr : t < 0.6 ? gold1 : gold2;
    b(ctx, 0, 0, flameX - fw / 2 + (frame === 1 ? 1 : frame === 2 ? -1 : 0), flameBase - fy, fw, 2, color);
  }
  p(ctx, 0, 0, flameX, flameBase - flameH, '#ffffff'); // flame tip
  // Glow around flame
  b(ctx, 0, 0, flameX - 4, flameBase - flameH + 2, 10, 6, '#ffdd8822');
  // Neck
  b(ctx, 0, 0, W / 2 - 2, 14, 4, 4, marble2);
  // Head
  b(ctx, 0, 0, W / 2 - 4, 6, 8, 8, marble1);
  b(ctx, 0, 0, W / 2 - 3, 7, 6, 6, marble2);
  // Face features
  p(ctx, 0, 0, W / 2 - 2, 9, marbleDk); p(ctx, 0, 0, W / 2 + 2, 9, marbleDk); // eyes carved
  b(ctx, 0, 0, W / 2 - 1, 11, 2, 2, marbleDk); // nose
  b(ctx, 0, 0, W / 2 - 2, 12, 4, 1, marbleDk); // mouth line
  // Glowing eyes - shift intensity per frame
  const eyeGlow = ['#aaddff', '#88bbee', '#cceeFF'][frame];
  p(ctx, 0, 0, W / 2 - 2, 9, eyeGlow); p(ctx, 0, 0, W / 2 + 2, 9, eyeGlow);
  // Crown/helm
  b(ctx, 0, 0, W / 2 - 5, 4, 10, 4, gold2);
  b(ctx, 0, 0, W / 2 - 4, 3, 8, 2, gold1);
  // Crown points
  b(ctx, 0, 0, W / 2 - 4, 1, 2, 4, gold1); b(ctx, 0, 0, W / 2, 0, 2, 4, goldBr); b(ctx, 0, 0, W / 2 + 4, 1, 2, 4, gold1);
  // Gem on crown center
  p(ctx, 0, 0, W / 2, 4, '#44aaff'); p(ctx, 0, 0, W / 2 + 1, 4, '#88ccff');
}

function drawCelestialCloudThrone(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(4), H = gh(3); const cx = Math.floor(W / 2);
  const cloudOff = frame * 2;
  for (let i = 0; i < 5; i++) {
    const cx2 = 4 + i * 10 + cloudOff; const cw = 8 + (i % 3) * 2;
    b(ctx, 0, 0, cx2 % W, H - 5 - (i % 2) * 2, cw, 3, '#dde8f0');
    b(ctx, 0, 0, (cx2 + 2) % W, H - 6 - (i % 2) * 2, cw - 4, 2, '#eef4f8');
  }
  b(ctx, 0, 0, 0, H - 4, W, 4, '#ccdde8');
  b(ctx, 0, 0, cx - 14, H - 10, 28, 4, '#d0c8b8');
  b(ctx, 0, 0, cx - 10, H - 16, 20, 6, '#e0d8c8');
  b(ctx, 0, 0, cx - 8, H - 14, 16, 3, '#7755aa');
  b(ctx, 0, 0, cx - 7, H - 14, 14, 1, '#8866bb');
  for (let x = cx - 6; x < cx + 6; x += 3) p(ctx, 0, 0, x, H - 13, '#9977cc');
  b(ctx, 0, 0, cx - 8, 4, 16, H - 20, '#d0c8b8');
  b(ctx, 0, 0, cx - 7, 5, 14, H - 22, '#e0d8c8');
  for (let x = cx - 5; x < cx + 5; x += 3) b(ctx, 0, 0, x, 7, 1, H - 26, '#d0c8b8');
  b(ctx, 0, 0, cx - 3, 2, 6, 3, '#ffdd88');
  b(ctx, 0, 0, cx - 2, 1, 4, 2, '#ffee99');
  p(ctx, 0, 0, cx, 1, '#ffffcc');
  const rl = 3 + (frame === 1 ? 1 : 0);
  p(ctx, 0, 0, cx - rl, 2, '#ffdd88'); p(ctx, 0, 0, cx + rl - 1, 2, '#ffdd88');
  b(ctx, 0, 0, cx - 12, H - 16, 4, 8, '#d0c8b8');
  b(ctx, 0, 0, cx - 14, H - 16, 4, 4, '#e0d8c8');
  p(ctx, 0, 0, cx - 13, H - 15, '#332211');
  b(ctx, 0, 0, cx + 8, H - 16, 4, 8, '#d0c8b8');
  b(ctx, 0, 0, cx + 10, H - 16, 4, 4, '#e0d8c8');
  p(ctx, 0, 0, cx + 11, H - 15, '#332211');
  b(ctx, 0, 0, cx - 8, 4, 16, 1, '#ccaa44');
  const wX = 2 + frame * 3;
  p(ctx, 0, 0, wX, H - 8, '#eef4f8'); p(ctx, 0, 0, W - wX - 2, H - 9, '#eef4f8');
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
  const W = gw(4), H = gh(2); const cx = Math.floor(W/2);
  b(ctx, 0, 0, 0, H-3, W, 3, '#c0b8a0'); b(ctx, 0, 0, 1, H-4, W-2, 1, '#b0a890');
  b(ctx, 0, 0, cx-2, 3, 4, H-7, '#e8e0d0'); b(ctx, 0, 0, cx-1, 4, 2, H-8, '#f0ebe0');
  b(ctx, 0, 0, 3, 1, W-6, 4, '#d4c8a0'); b(ctx, 0, 0, 4, 2, W-8, 2, '#e8d888');
  b(ctx, 0, 0, 2, 1, 2, 4, '#c0b490'); b(ctx, 0, 0, W-4, 1, 2, 4, '#c0b490');
  b(ctx, 0, 0, 3, 1, W-6, 1, '#ffdd66'); b(ctx, 0, 0, 3, 4, W-6, 1, '#ccaa44');
  b(ctx, 0, 0, cx-1, 2, 2, 2, '#ffffff'); p(ctx, 0, 0, cx, 2, '#ffffcc');
  const bw = frame===0 ? 2 : frame===1 ? 4 : 6;
  b(ctx, 0, 0, cx-Math.floor(bw/2), 0, bw, 2, '#ffffe844');
  p(ctx, 0, 0, 1, H-6, '#ff994488'); p(ctx, 0, 0, W-2, H-6, '#ff994488');
}

function drawCelestialAngelicStatue(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(2), H = gh(4); const cx = Math.floor(W / 2);
  b(ctx, 0, 0, 0, H - 3, W, 3, '#a8a098');
  b(ctx, 0, 0, 1, H - 6, W - 2, 3, '#b8b0a0');
  b(ctx, 0, 0, 2, H - 7, W - 4, 1, '#c8c0b0');
  for (let x = 3; x < W - 3; x += 3) { p(ctx, 0, 0, x, H - 5, '#d0c8b8'); }
  b(ctx, 0, 0, cx - 5, H - 10, 10, 3, '#e0d8c8');
  b(ctx, 0, 0, cx - 4, H - 22, 8, 12, '#e0d8c8');
  b(ctx, 0, 0, cx - 3, H - 21, 6, 10, '#ece4d4');
  b(ctx, 0, 0, cx - 3, H - 20, 1, 8, '#d0c8b8');
  b(ctx, 0, 0, cx, H - 21, 1, 10, '#f0e8d8');
  b(ctx, 0, 0, cx + 1, H - 20, 1, 8, '#d0c8b8');
  b(ctx, 0, 0, cx - 4, H - 17, 8, 1, '#ccaa44');
  b(ctx, 0, 0, cx - 2, H - 25, 4, 3, '#ece4d4');
  b(ctx, 0, 0, cx - 3, H - 30, 6, 5, '#f0ebe0');
  p(ctx, 0, 0, cx - 1, H - 28, '#b8b0a0'); p(ctx, 0, 0, cx + 1, H - 28, '#b8b0a0');
  p(ctx, 0, 0, cx, H - 27, '#c8c0b0');
  b(ctx, 0, 0, cx - 3, H - 31, 6, 2, '#d4c8a0');
  b(ctx, 0, 0, cx - 4, H - 33, 8, 2, '#ffdd88');
  b(ctx, 0, 0, cx - 5, H - 32, 10, 1, '#ffee99');
  const hg = ['#ffffcc', '#ffee99', '#ffffee'][frame];
  p(ctx, 0, 0, cx, H - 33, hg); p(ctx, 0, 0, cx - 5, H - 33, '#eebb66'); p(ctx, 0, 0, cx + 5, H - 33, '#eebb66');
  const wW = frame === 0 ? 2 : frame === 1 ? 5 : 8;
  const wH = frame === 0 ? 10 : frame === 1 ? 14 : 18;
  const wY = H - 24 - (frame === 2 ? 2 : 0);
  b(ctx, 0, 0, cx - 4 - wW, wY, wW, wH, '#ddd5c5');
  b(ctx, 0, 0, cx - 4 - wW + 1, wY + 1, wW - 1, wH - 2, '#e8e0d0');
  for (let fy = wY + 2; fy < wY + wH - 1; fy += 2) { p(ctx, 0, 0, cx - 4 - wW, fy, '#c8c0b0'); }
  b(ctx, 0, 0, cx + 4, wY, wW, wH, '#ddd5c5');
  b(ctx, 0, 0, cx + 4, wY + 1, wW - 1, wH - 2, '#e8e0d0');
  for (let fy = wY + 2; fy < wY + wH - 1; fy += 2) { p(ctx, 0, 0, cx + 3 + wW, fy, '#c8c0b0'); }
}

// ===================== ALIENS NEW =====================

function drawAlienEggCluster(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(4), H = gh(4);
  // Organic floor
  b(ctx, 0, 0, 0, 0, W, H, '#0e160a');
  // Floor texture
  for (let x = 0; x < W; x += 3) {
    for (let y = 0; y < H; y += 3) {
      if ((x + y) % 7 < 2) p(ctx, 0, 0, x, y, '#111a0d');
    }
  }
  // Eggs
  const eggs = [[10,10],[20,8],[30,12],[14,22],[26,20],[18,32],[28,30],[8,34]];
  for (let i = 0; i < eggs.length; i++) {
    const [ex, ey] = eggs[i];
    const pulse = (i + frame) % 3 === 0;
    // Egg body — yellowish-green
    b(ctx, 0, 0, ex, ey, 5, 7, pulse ? '#bbbb66' : '#998844');
    b(ctx, 0, 0, ex, ey, 5, 1, '#ddddaa');
    p(ctx, 0, 0, ex + 2, ey + 2, '#bbbb66');
    // Crack with acid glow on one egg
    if (i === 3 && frame >= 1) {
      p(ctx, 0, 0, ex + 1, ey + 3, '#4a6628');
      if (frame === 2) { p(ctx, 0, 0, ex + 2, ey + 3, '#99ff33'); }
    }
  }
  // Slime puddles
  for (const [ex, ey] of eggs) p(ctx, 0, 0, ex + 2, ey + 7, '#33aa11');
}

function drawAlienAcidPool(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(4), H = gh(3);
  const cx = Math.floor(W / 2), cy = Math.floor(H / 2);
  // Ground
  b(ctx, 0, 0, 0, 0, W, H, '#0e160a');
  // Chitin edge ring
  for (let x = 2; x < W - 2; x++) {
    for (let y = 2; y < H - 2; y++) {
      const d = Math.sqrt(((x - cx) / 1.4) ** 2 + ((y - cy) / 1) ** 2);
      if (d < 18 && d >= 12) {
        const noise = (x * 7 + y * 3) % 5;
        p(ctx, 0, 0, x, y, noise < 2 ? '#2a3a15' : noise < 4 ? '#354a1c' : '#1e2c0e');
      }
    }
  }
  // Acid pool interior
  for (let x = 4; x < W - 4; x++) {
    for (let y = 4; y < H - 4; y++) {
      const d = Math.sqrt(((x - cx) / 1.4) ** 2 + ((y - cy) / 1) ** 2);
      if (d < 12) p(ctx, 0, 0, x, y, d < 8 ? '#44aa10' : '#66dd18');
    }
  }
  // Surface sheen
  for (let x = cx - 6; x < cx + 6; x += 2) {
    p(ctx, 0, 0, x, cy - 2, '#99ff33');
  }
  // Bubbles per frame
  const bubSize = frame + 1;
  b(ctx, 0, 0, cx - bubSize, cy - 4 - frame * 2, bubSize * 2, bubSize, '#ccff66');
  if (frame === 2) {
    p(ctx, 0, 0, cx - 3, cy - 8, '#99ff33');
    p(ctx, 0, 0, cx + 2, cy - 9, '#99ff33');
  }
}

function drawAlienChitinWall(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(5), H = gh(2);
  // Base chitin
  b(ctx, 0, 0, 0, 0, W, H, '#2a3a15');
  b(ctx, 0, 0, 2, 2, W - 4, H - 4, '#3a5020');
  // Chitin plates
  for (let x = 4; x < W - 4; x += 8) {
    b(ctx, 0, 0, x, 4, 6, H - 8, '#4a6628');
    b(ctx, 0, 0, x + 1, 5, 4, H - 10, '#507530');
  }
  // Ridge highlights
  for (let x = 4; x < W - 4; x += 8) {
    p(ctx, 0, 0, x + 2, 4, '#77cc44');
  }
  // Resin glisten shifts per frame
  const glistenX = 6 + frame * Math.floor((W - 12) / 2);
  p(ctx, 0, 0, glistenX, 6, '#77cc44');
  p(ctx, 0, 0, glistenX + 2, 7, '#bbbb66');
  // Veins pulse red
  for (let x = 8; x < W - 8; x += 6) {
    p(ctx, 0, 0, x, H / 2, (x / 6 + frame) % 2 === 0 ? '#cc3322' : '#882218');
  }
}

function drawAlienSporeVent(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(2), H = gh(3);
  const cx = Math.floor(W / 2);
  // Ground
  b(ctx, 0, 0, 0, 0, W, H, '#0e160a');
  // Vent organic tube — chitin body
  b(ctx, 0, 0, cx - 5, H - 14, 10, 12, '#2a3a15');
  b(ctx, 0, 0, cx - 3, H - 12, 6, 8, '#3a5020');
  // Ridge detail
  p(ctx, 0, 0, cx - 4, H - 10, '#446628');
  p(ctx, 0, 0, cx + 3, H - 10, '#446628');
  // Opening
  b(ctx, 0, 0, cx - 4, H - 16, 8, 4, '#4a6628');
  b(ctx, 0, 0, cx - 2, H - 16, 4, 2, '#0e160a');
  // Spore puff rises per frame — acid green
  const sporeY = H - 18 - frame * 8;
  if (sporeY > 0) {
    b(ctx, 0, 0, cx - 2 - frame, sporeY, 4 + frame * 2, 3, '#66dd18');
    p(ctx, 0, 0, cx, sporeY, '#99ff33');
    if (frame > 0) p(ctx, 0, 0, cx - 2, sporeY - 2, '#66dd18');
  }
}

function drawAlienCocoonCluster(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(3), H = gh(3);
  // Organic floor
  b(ctx, 0, 0, 0, 0, W, H, '#0e160a');
  // Floor texture veins
  for (let x = 2; x < W - 2; x += 5) {
    for (let y = 2; y < H; y += 2) p(ctx, 0, 0, x, y, '#111a0d');
  }
  // Cocoons — chitin green
  const cocoons = [[8, 6, 10, 14], [22, 4, 8, 16], [14, 20, 10, 12]];
  for (let i = 0; i < cocoons.length; i++) {
    const [cx_, cy_, cw, ch] = cocoons[i];
    b(ctx, 0, 0, cx_, cy_, cw, ch, '#4a6628');
    b(ctx, 0, 0, cx_ + 1, cy_ + 1, cw - 2, ch - 2, '#507530');
    // Web strands — bright green
    p(ctx, 0, 0, cx_ - 1, cy_ + 2, '#77cc44');
    p(ctx, 0, 0, cx_ + cw, cy_ + ch - 3, '#77cc44');
    p(ctx, 0, 0, cx_ - 2, cy_ + 5, '#77cc44');
    p(ctx, 0, 0, cx_ + cw + 1, cy_ + ch - 6, '#77cc44');
    // Squirm bulge shifts per frame
    if (i === frame) {
      const bulgeY = cy_ + Math.floor(ch / 3) + frame;
      b(ctx, 0, 0, cx_ + cw - 2, bulgeY, 3, 3, '#609838');
    }
  }
}

function drawAlienFeedingPit(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(5), H = gh(5);
  const cx = Math.floor(W / 2), cy = Math.floor(H / 2);
  // Ground
  b(ctx, 0, 0, 0, 0, W, H, '#0e160a');
  // Pit — concentric chitin rings
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < H; y++) {
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (d < 24) {
        if (d < 16) p(ctx, 0, 0, x, y, '#0b120a');
        else if (d < 20) p(ctx, 0, 0, x, y, '#1e2c0e');
        else p(ctx, 0, 0, x, y, '#2a3a15');
      }
    }
  }
  // Chitin rim highlights
  for (let a = 0; a < 360; a += 20) {
    const rad = a * Math.PI / 180;
    const rx = Math.round(cx + Math.cos(rad) * 22);
    const ry = Math.round(cy + Math.sin(rad) * 22);
    p(ctx, 0, 0, rx, ry, '#446628');
  }
  // Acid at bottom
  b(ctx, 0, 0, cx - 8, cy - 4, 16, 8, '#44aa10');
  b(ctx, 0, 0, cx - 6, cy - 2, 12, 4, '#66dd18');
  // Surface bubbles
  p(ctx, 0, 0, cx - 3, cy - 1, '#99ff33');
  p(ctx, 0, 0, cx + 2, cy, '#99ff33');
  // Tentacles in different positions per frame — chitin green
  const tentAngles = [[30, 150, 270], [60, 180, 300], [0, 120, 240]];
  for (const a of tentAngles[frame]) {
    const rad = a * Math.PI / 180;
    for (let d = 8; d < 20; d += 2) {
      const color = d < 14 ? '#3a5020' : '#507530';
      p(ctx, 0, 0, Math.round(cx + Math.cos(rad) * d), Math.round(cy + Math.sin(rad) * d), color);
    }
  }
}

function drawAlienTunnelMouth(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(3), H = gh(2);
  const cx = Math.floor(W / 2);
  // Organic rim
  b(ctx, 0, 0, 0, 0, W, H, '#446628');
  // Opening — dark void
  b(ctx, 0, 0, cx - 10, 2, 20, H - 4, '#0b120a');
  b(ctx, 0, 0, cx - 8, 4, 16, H - 8, '#0e160a');
  // Mandible edges — chitin green, animate per frame
  const mandInset = frame === 0 ? 0 : frame === 1 ? 2 : 4;
  b(ctx, 0, 0, cx - 10, 2, 3, H - 4, '#507530');
  b(ctx, 0, 0, cx + 7, 2, 3, H - 4, '#507530');
  b(ctx, 0, 0, cx - 10 + mandInset, 4, 2, H - 8, '#609838');
  b(ctx, 0, 0, cx + 8 - mandInset, 4, 2, H - 8, '#609838');
  // Mandible tips — bright highlight
  p(ctx, 0, 0, cx - 10 + mandInset, 4, '#77cc44');
  p(ctx, 0, 0, cx + 9 - mandInset, 4, '#77cc44');
  p(ctx, 0, 0, cx - 10 + mandInset, H - 5, '#77cc44');
  p(ctx, 0, 0, cx + 9 - mandInset, H - 5, '#77cc44');
  // Slime drips
  p(ctx, 0, 0, cx - 6, H - 4, '#33aa11');
  p(ctx, 0, 0, cx + 4, H - 3, '#33aa11');
  p(ctx, 0, 0, cx - 2, H - 3, '#55cc22');
}

// ===================== HARMONIC NEW =====================

function drawHarmonicPipeOrgan(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(5), H = gh(5); const cx = Math.floor(W / 2);
  b(ctx, 0, 0, 0, H-4, W, 4, '#3a2a1a');
  b(ctx, 0, 0, cx-8, H-10, 16, 3, '#553322'); b(ctx, 0, 0, cx-7, H-10, 14, 1, '#664433');
  b(ctx, 0, 0, cx-7, H-7, 2, 3, '#443322'); b(ctx, 0, 0, cx+5, H-7, 2, 3, '#443322');
  b(ctx, 0, 0, cx-16, H-24, 32, 14, '#664433'); b(ctx, 0, 0, cx-15, H-23, 30, 12, '#774d3a');
  b(ctx, 0, 0, cx-16, H-24, 3, 14, '#553322'); b(ctx, 0, 0, cx+13, H-24, 3, 14, '#553322');
  for (let row = 0; row < 3; row++) {
    const ky = H-22+row*3;
    b(ctx, 0, 0, cx-12, ky, 24, 2, '#eeeecc'); b(ctx, 0, 0, cx-12, ky, 24, 1, '#ffffdd');
    for (let k = 0; k < 10; k++) { if (k%3!==2) p(ctx, 0, 0, cx-11+k*2+(k>4?1:0), ky, '#222211'); }
  }
  for (let i = 0; i < 4; i++) { p(ctx, 0, 0, cx-14, H-21+i*2, '#ccaa44'); p(ctx, 0, 0, cx+13, H-21+i*2, '#ccaa44'); }
  b(ctx, 0, 0, cx-10, H-26, 20, 2, '#553322');
  b(ctx, 0, 0, cx-8, H-26, 16, 1, '#eeeecc');
  const pipes = [{x:4,h:22},{x:8,h:28},{x:12,h:34},{x:16,h:38},{x:20,h:42},{x:24,h:44},{x:28,h:46},{x:32,h:44},{x:36,h:42},{x:40,h:38},{x:44,h:34},{x:48,h:28},{x:52,h:22}];
  for (const pd of pipes) {
    const py = H-26-pd.h;
    b(ctx, 0, 0, pd.x, py, 3, pd.h, '#ccaa44'); b(ctx, 0, 0, pd.x+1, py, 1, pd.h, '#ddbb55');
    b(ctx, 0, 0, pd.x, py+pd.h-3, 3, 1, '#bb9933');
    b(ctx, 0, 0, pd.x-1, py-1, 5, 2, '#eedd66');
  }
  for (let x = 6; x < W-6; x += 8) { const sh = 12+(x%12); b(ctx, 0, 0, x+3, H-26-sh, 1, sh, '#bb9933'); }
  b(ctx, 0, 0, 2, H-26-48, W-4, 2, '#664433');
  for (let x = 6; x < W-6; x += 5) p(ctx, 0, 0, x, H-26-48, '#885533');
  if (frame===0) { for (let i = 0; i < 4; i++) p(ctx, 0, 0, 3+i, H-26-24-i*2, '#aa884466'); }
  if (frame===1) { b(ctx, 0, 0, cx-10, H-19, 20, 1, '#eeeeaa'); }
  if (frame===2) { for (let i = 0; i < 4; i++) p(ctx, 0, 0, W-5-i, H-26-24-i*2, '#aa884466'); }
}

function drawHarmonicConductorPodium(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(2), H = gh(2);
  // Podium base
  b(ctx, 0, 0, 2, H - 6, W - 4, 6, '#553322');
  b(ctx, 0, 0, 3, H - 7, W - 6, 1, '#664433');
  b(ctx, 0, 0, 4, H - 5, W - 8, 1, '#664433');
  // Music stand pole
  const cx = Math.floor(W / 2);
  b(ctx, 0, 0, cx, 3, 1, H - 9, '#443322');
  // Stand desk
  b(ctx, 0, 0, cx - 4, 1, 8, 3, '#553322');
  b(ctx, 0, 0, cx - 3, 1, 6, 2, '#eeeecc');
  p(ctx, 0, 0, cx - 2, 1, '#333333'); p(ctx, 0, 0, cx, 2, '#333333'); p(ctx, 0, 0, cx + 1, 1, '#333333');
  // Baton
  if (frame === 0) { b(ctx, 0, 0, cx + 4, 3, 1, 4, '#dddddd'); p(ctx, 0, 0, cx + 4, 3, '#ffffff'); }
  else if (frame === 1) { b(ctx, 0, 0, cx + 5, 0, 1, 4, '#dddddd'); p(ctx, 0, 0, cx + 5, 0, '#ffffff'); }
  else { p(ctx, 0, 0, cx + 5, 2, '#dddddd'); p(ctx, 0, 0, cx + 6, 3, '#dddddd'); p(ctx, 0, 0, cx + 7, 4, '#ffffff'); }
  // Steps
  b(ctx, 0, 0, 1, H - 4, 2, 2, '#443322'); b(ctx, 0, 0, 1, H - 5, 1, 1, '#443322');
}

function drawHarmonicSpeakerStack(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(1), H = gh(2); const cx = Math.floor(W/2);
  b(ctx, 0, 0, 0, 0, W, H, '#2a2a2a');
  b(ctx, 0, 0, 0, 0, 1, H, '#3a3a3a'); b(ctx, 0, 0, W-1, 0, 1, H, '#3a3a3a');
  b(ctx, 0, 0, 1, 1, W-2, H-2, '#1a1a1a');
  for (let my = 1; my < H-1; my += 2) b(ctx, 0, 0, 1, my, W-2, 1, '#222222');
  p(ctx, 0, 0, cx-1, 2, '#555555'); p(ctx, 0, 0, cx, 2, '#666666');
  const wy = Math.floor(H/2)+1; const cs = frame === 1 ? 1 : 0;
  b(ctx, 0, 0, cx-2-cs, wy-1-cs, 5+cs*2, 4+cs*2, '#444444');
  b(ctx, 0, 0, cx-1, wy, 3, 2, '#555555'); p(ctx, 0, 0, cx, wy, '#666666');
  b(ctx, 0, 0, cx-1, H-3, 3, 1, '#111111');
  p(ctx, 0, 0, 0, H-1, '#3a3a3a'); p(ctx, 0, 0, W-1, H-1, '#3a3a3a');
}

function drawHarmonicHarp(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(2), H = gh(3); const cx = Math.floor(W / 2);
  b(ctx, 0, 0, cx-5, H-4, 10, 4, '#884422'); b(ctx, 0, 0, cx-4, H-3, 8, 2, '#996633');
  b(ctx, 0, 0, cx-3, H-4, 6, 1, '#aa7744');
  p(ctx, 0, 0, cx-5, H-1, '#774411'); p(ctx, 0, 0, cx+4, H-1, '#774411');
  b(ctx, 0, 0, cx-9, 4, 3, H-8, '#ddbb55'); b(ctx, 0, 0, cx-8, 5, 1, H-10, '#eedd66');
  for (let y = 8; y < H-8; y += 4) p(ctx, 0, 0, cx-9, y, '#ccaa44');
  b(ctx, 0, 0, cx-10, 2, 5, 3, '#ddbb55');
  b(ctx, 0, 0, cx-11, 2, 2, 2, '#ccaa44'); p(ctx, 0, 0, cx-11, 2, '#eedd66');
  p(ctx, 0, 0, cx-10, 1, '#eedd66');
  b(ctx, 0, 0, cx-8, 1, 3, 2, '#ddbb55'); p(ctx, 0, 0, cx-7, 1, '#ffee77');
  b(ctx, 0, 0, cx-8, 3, 16, 2, '#ccaa44'); b(ctx, 0, 0, cx-6, 2, 14, 1, '#ddbb55');
  for (let x = cx-5; x <= cx+6; x += 2) p(ctx, 0, 0, x, 2, '#888877');
  b(ctx, 0, 0, cx+5, 5, 4, H-10, '#884422'); b(ctx, 0, 0, cx+6, 6, 2, H-12, '#996633');
  for (let y = 8; y < H-8; y += 3) { p(ctx, 0, 0, cx+6, y, '#774411'); p(ctx, 0, 0, cx+7, y+1, '#aa7744'); }
  b(ctx, 0, 0, cx+4, H-8, 5, 4, '#884422');
  p(ctx, 0, 0, cx+6, 12, '#553311'); p(ctx, 0, 0, cx+6, H-12, '#553311');
  for (let i = 0; i < 9; i++) {
    const sx = cx-5+i+Math.floor(i/2); const topY = 4; const botY = H-6-Math.floor(i/3);
    const sc = i%3===0 ? '#cc8833' : i%3===1 ? '#eedd66' : '#ddccaa';
    for (let y = topY; y <= botY; y++) p(ctx, 0, 0, sx, y, sc);
    if (Math.floor(i/3) === frame) { p(ctx, 0, 0, sx, topY+4+i, '#ffffff'); p(ctx, 0, 0, sx, topY+8+i, '#ffffcc'); }
  }
  b(ctx, 0, 0, cx+5, H-10, 3, 2, '#ccaa44'); p(ctx, 0, 0, cx+6, H-10, '#ddbb55');
}

function drawHarmonicMusicStand(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(1), H = gh(2); const cx = Math.floor(W/2);
  p(ctx, 0, 0, cx-2, H-1, '#444444'); p(ctx, 0, 0, cx+2, H-1, '#444444'); p(ctx, 0, 0, cx, H-1, '#555555');
  b(ctx, 0, 0, cx, 4, 1, H-5, '#555555');
  b(ctx, 0, 0, cx-3, 1, 7, 4, '#2a2a2a'); b(ctx, 0, 0, cx-3, 5, 7, 1, '#3a3a3a');
  if (frame === 0) { b(ctx, 0, 0, cx-2, 2, 5, 2, '#f0e8d0'); p(ctx, 0, 0, cx-1, 2, '#333333'); p(ctx, 0, 0, cx+1, 3, '#333333'); }
  else if (frame === 1) { b(ctx, 0, 0, cx-2, 2, 3, 2, '#f0e8d0'); b(ctx, 0, 0, cx+1, 1, 2, 2, '#e8dfc8'); }
  else { b(ctx, 0, 0, cx-2, 2, 5, 2, '#f0e8d0'); p(ctx, 0, 0, cx, 2, '#333333'); p(ctx, 0, 0, cx-1, 3, '#333333'); }
  p(ctx, 0, 0, cx, 4, '#777777');
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
  const W = gw(5), H = gh(5); const cx = Math.floor(W / 2), cy = Math.floor(H / 2);

  // Outer fade zone — dark edges blending into scene (no hard border)
  for (let r = 30; r >= 26; r--) {
    const alpha = Math.floor(((r - 26) / 4) * 80 + 20);
    const hex = alpha.toString(16).padStart(2, '0');
    for (let a = 0; a < 360; a += 4) {
      const rad = a * Math.PI / 180;
      p(ctx, 0, 0, Math.round(cx + Math.cos(rad) * r), Math.round(cy + Math.sin(rad) * r), '#0a0418' + hex);
    }
  }

  // Gravitational lensing effect — streaks being pulled inward
  for (let i = 0; i < 12; i++) {
    const baseA = (i / 12) * Math.PI * 2 + frame * 0.3;
    for (let d = 28; d > 20; d -= 2) {
      const drift = (28 - d) * 0.08;
      const ax = Math.round(cx + Math.cos(baseA + drift) * d);
      const ay = Math.round(cy + Math.sin(baseA + drift) * d);
      p(ctx, 0, 0, ax, ay, d > 24 ? '#221438' : '#332255');
    }
  }

  // Accretion ring — bright torus with color shift per frame
  const ringColors = [['#8844cc', '#aa66ee', '#cc88ff'], ['#4466cc', '#6688ee', '#88aaff'], ['#cc4466', '#ee6688', '#ff88aa']];
  const rc = ringColors[frame];
  for (let a = 0; a < 360; a += 3) {
    const rad = a * Math.PI / 180;
    // Outer ring edge
    p(ctx, 0, 0, Math.round(cx + Math.cos(rad) * 26), Math.round(cy + Math.sin(rad) * 26), rc[0]);
    // Ring body (bright)
    p(ctx, 0, 0, Math.round(cx + Math.cos(rad) * 24), Math.round(cy + Math.sin(rad) * 24), rc[1]);
    p(ctx, 0, 0, Math.round(cx + Math.cos(rad) * 22), Math.round(cy + Math.sin(rad) * 22), rc[2]);
    // Inner ring edge
    p(ctx, 0, 0, Math.round(cx + Math.cos(rad) * 20), Math.round(cy + Math.sin(rad) * 20), rc[0]);
  }
  // Accretion ring thickness variation (brighter top, darker bottom for 3D)
  for (let a = 150; a < 210; a += 4) {
    const rad = a * Math.PI / 180;
    p(ctx, 0, 0, Math.round(cx + Math.cos(rad) * 23), Math.round(cy + Math.sin(rad) * 23), '#ffffff44');
  }

  // Spiral vortex arms — two arms rotating per frame
  for (let arm = 0; arm < 2; arm++) {
    const armOff = arm * Math.PI + frame * 0.6;
    for (let d = 4; d < 20; d += 1) {
      const spin = armOff + d * 0.25;
      const intensity = Math.floor(180 - d * 6);
      const ic = intensity.toString(16).padStart(2, '0');
      const px = Math.round(cx + Math.cos(spin) * d);
      const py = Math.round(cy + Math.sin(spin) * d);
      p(ctx, 0, 0, px, py, frame === 0 ? `#88${ic}cc` : frame === 1 ? `#44${ic}cc` : `#cc${ic}66`);
      // Thicker arms
      if (d > 8 && d < 18) p(ctx, 0, 0, px + 1, py, frame === 0 ? '#6644aa' : frame === 1 ? '#334488' : '#884466');
    }
  }

  // Matter debris being pulled in — small chunks at various distances
  for (let i = 0; i < 8; i++) {
    const debrisA = (i / 8) * Math.PI * 2 + frame * 0.8 + i * 0.5;
    const debrisR = 14 + (i % 4) * 3;
    const dx = Math.round(cx + Math.cos(debrisA) * debrisR);
    const dy = Math.round(cy + Math.sin(debrisA) * debrisR);
    p(ctx, 0, 0, dx, dy, i % 2 === 0 ? '#aaaacc' : '#8888aa');
  }

  // Dark center void — pure black
  for (let r = 6; r >= 0; r--) {
    const col = r > 3 ? '#0a0418' : '#000000';
    for (let a = 0; a < 360; a += 8) {
      const rad = a * Math.PI / 180;
      p(ctx, 0, 0, Math.round(cx + Math.cos(rad) * r), Math.round(cy + Math.sin(rad) * r), col);
    }
  }
  // Singularity bright point at dead center
  p(ctx, 0, 0, cx, cy, '#ffffff');
  p(ctx, 0, 0, cx - 1, cy, '#ccccff'); p(ctx, 0, 0, cx + 1, cy, '#ccccff');
  p(ctx, 0, 0, cx, cy - 1, '#ccccff'); p(ctx, 0, 0, cx, cy + 1, '#ccccff');

  // Light jets — vertical axis jets from center
  for (let j = 1; j <= 4 + frame; j++) {
    const jc = j <= 2 ? '#8844cc88' : '#6622aa44';
    p(ctx, 0, 0, cx, cy - 6 - j * 2, jc); p(ctx, 0, 0, cx, cy + 6 + j * 2, jc);
  }
}

function drawVoidChaosObelisk(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(2), H = gh(5); const cx = Math.floor(W / 2);

  // Base platform — stone slab with inscriptions
  b(ctx, 0, 0, 1, H - 5, W - 2, 5, '#1a1028');
  b(ctx, 0, 0, 2, H - 4, W - 4, 3, '#221438');
  b(ctx, 0, 0, 0, H - 3, W, 3, '#151020');
  // Platform inscriptions
  for (let x = 3; x < W - 3; x += 3) { p(ctx, 0, 0, x, H - 4, '#332255'); p(ctx, 0, 0, x + 1, H - 3, '#2a1844'); }
  // Platform edge highlight
  b(ctx, 0, 0, 1, H - 5, W - 2, 1, '#332255');

  // Obelisk body — tapered shape, wider at base, pointed at top
  const baseW = 10, topW = 2;
  for (let y = H - 6; y >= 2; y--) {
    const t = (H - 6 - y) / (H - 8); // 0 at base, 1 at top
    const w = Math.round(baseW - (baseW - topW) * t);
    const ox = cx - Math.floor(w / 2);
    // Left face (lighter)
    b(ctx, 0, 0, ox, y, Math.floor(w / 2), 1, '#2a1844');
    // Right face (darker for depth)
    b(ctx, 0, 0, ox + Math.floor(w / 2), y, Math.ceil(w / 2), 1, '#221438');
    // Edge highlights
    p(ctx, 0, 0, ox, y, '#332255');
    p(ctx, 0, 0, ox + w - 1, y, '#1a1028');
  }
  // Pointed tip — pyramidion
  b(ctx, 0, 0, cx - 1, 1, 2, 2, '#332255');
  p(ctx, 0, 0, cx, 0, '#443366');
  // Tip glow
  const tipGlow = ['#8844cc', '#44ccaa', '#44cc44'][frame];
  p(ctx, 0, 0, cx, 0, tipGlow);
  p(ctx, 0, 0, cx - 1, 0, tipGlow + '88');
  p(ctx, 0, 0, cx + 1, 0, tipGlow + '88');

  // Rune carvings on front face — distinct symbols per row, cycling glow
  const runeColors = ['#8844cc', '#44ccaa', '#44cc44'];
  const rc = runeColors[frame];
  const rcDim = runeColors[(frame + 1) % 3] + '66';
  // Rune 1 — eye symbol (top section)
  p(ctx, 0, 0, cx - 2, 12, rc); b(ctx, 0, 0, cx - 1, 11, 2, 1, rc); p(ctx, 0, 0, cx + 1, 12, rc);
  p(ctx, 0, 0, cx, 12, '#ffffff'); // pupil
  p(ctx, 0, 0, cx - 2, 13, rcDim); p(ctx, 0, 0, cx + 1, 13, rcDim);
  // Rune 2 — spiral symbol (upper-mid)
  p(ctx, 0, 0, cx, 20, rc); p(ctx, 0, 0, cx + 1, 20, rc); p(ctx, 0, 0, cx + 1, 21, rc);
  p(ctx, 0, 0, cx, 22, rc); p(ctx, 0, 0, cx - 1, 21, rc); p(ctx, 0, 0, cx - 1, 20, rcDim);
  // Rune 3 — triangle/void symbol (mid)
  p(ctx, 0, 0, cx, 28, rc); p(ctx, 0, 0, cx - 1, 30, rc); p(ctx, 0, 0, cx + 1, 30, rc);
  b(ctx, 0, 0, cx - 2, 31, 5, 1, rc);
  p(ctx, 0, 0, cx, 30, rcDim); // hollow center
  // Rune 4 — infinity/chaos symbol (lower-mid)
  p(ctx, 0, 0, cx - 2, 38, rc); p(ctx, 0, 0, cx - 1, 37, rc); p(ctx, 0, 0, cx, 38, rc);
  p(ctx, 0, 0, cx + 1, 37, rc); p(ctx, 0, 0, cx + 2, 38, rc);
  p(ctx, 0, 0, cx - 1, 39, rc); p(ctx, 0, 0, cx + 1, 39, rc);
  // Rune 5 — star symbol (lower)
  p(ctx, 0, 0, cx, 46, rc); p(ctx, 0, 0, cx - 2, 47, rc); p(ctx, 0, 0, cx + 2, 47, rc);
  p(ctx, 0, 0, cx - 1, 49, rc); p(ctx, 0, 0, cx + 1, 49, rc);
  p(ctx, 0, 0, cx, 48, '#ffffff88'); // star center

  // Glow aura around runes — faint halo
  for (let y = 10; y < H - 8; y += 8) {
    p(ctx, 0, 0, cx - 4, y + 1, rc + '33');
    p(ctx, 0, 0, cx + 3, y + 1, rc + '33');
  }

  // Ambient void particles floating near obelisk
  const particleOff = frame * 5;
  p(ctx, 0, 0, cx - 5, 15 + particleOff, '#6622aa88');
  p(ctx, 0, 0, cx + 4, 25 + particleOff, '#8844cc66');
  p(ctx, 0, 0, cx - 6, 40 - particleOff, '#6622aa44');
}

function drawVoidDiceAltar(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(3), H = gh(3); const cx = Math.floor(W / 2);

  // Stone altar base — tiered platform with carved edges
  b(ctx, 0, 0, 2, H - 4, W - 4, 4, '#1a1028');
  b(ctx, 0, 0, 3, H - 3, W - 6, 2, '#221438');
  // Second tier
  b(ctx, 0, 0, 4, H - 8, W - 8, 4, '#221438');
  b(ctx, 0, 0, 5, H - 7, W - 10, 2, '#2a1844');
  // Top surface
  b(ctx, 0, 0, 6, H - 14, W - 12, 6, '#332255');
  b(ctx, 0, 0, 7, H - 13, W - 14, 4, '#3a2a66');
  // Carved edge details — grooves on each tier
  for (let x = 4; x < W - 4; x += 4) { p(ctx, 0, 0, x, H - 8, '#2a1844'); p(ctx, 0, 0, x + 1, H - 4, '#1a1028'); }
  b(ctx, 0, 0, 2, H - 4, W - 4, 1, '#332255'); // base lip highlight
  b(ctx, 0, 0, 4, H - 8, W - 8, 1, '#332255'); // tier lip

  // Corner candles (4 candles at altar corners)
  // Top-left candle
  b(ctx, 0, 0, 7, H - 18, 2, 4, '#d4c8a0'); p(ctx, 0, 0, 7, H - 18, '#e0d8b0');
  p(ctx, 0, 0, 7, H - 19, '#ffaa22'); p(ctx, 0, 0, 8, H - 19, frame === 0 ? '#ffdd44' : '#ff8811');
  // Top-right candle
  b(ctx, 0, 0, W - 9, H - 18, 2, 4, '#d4c8a0'); p(ctx, 0, 0, W - 9, H - 18, '#e0d8b0');
  p(ctx, 0, 0, W - 9, H - 19, '#ffaa22'); p(ctx, 0, 0, W - 8, H - 19, frame === 1 ? '#ffdd44' : '#ff8811');
  // Bottom-left candle
  b(ctx, 0, 0, 5, H - 11, 2, 3, '#d4c8a0');
  p(ctx, 0, 0, 5, H - 12, frame === 2 ? '#ffdd44' : '#ffaa22');
  // Bottom-right candle
  b(ctx, 0, 0, W - 7, H - 11, 2, 3, '#d4c8a0');
  p(ctx, 0, 0, W - 7, H - 12, frame === 0 ? '#ffdd44' : '#ffaa22');

  // Large die on top of altar — isometric-ish 3D cube
  const dieX = cx - 6, dieY = 2;
  // Top face (lightest)
  b(ctx, 0, 0, dieX, dieY, 12, 10, '#ece4d4');
  b(ctx, 0, 0, dieX + 1, dieY + 1, 10, 8, '#f5f0e5');
  // Right face (medium shadow)
  b(ctx, 0, 0, dieX + 10, dieY + 2, 3, 10, '#c8c0b0');
  // Bottom face visible (dark)
  b(ctx, 0, 0, dieX + 2, dieY + 10, 10, 2, '#b0a890');
  // Die border
  b(ctx, 0, 0, dieX, dieY, 12, 1, '#d4c8a0'); b(ctx, 0, 0, dieX, dieY + 11, 12, 1, '#a09880');
  b(ctx, 0, 0, dieX, dieY, 1, 12, '#c8c0b0'); b(ctx, 0, 0, dieX + 11, dieY, 1, 12, '#a09880');
  // Corner radius dots
  p(ctx, 0, 0, dieX, dieY, '#332255'); p(ctx, 0, 0, dieX + 11, dieY, '#332255');
  p(ctx, 0, 0, dieX, dieY + 11, '#332255'); p(ctx, 0, 0, dieX + 11, dieY + 11, '#332255');

  // Die face dots — change per frame: 1, 4, 6
  const dotC = '#1a1028';
  if (frame === 0) {
    // Face showing 1 — single center dot
    b(ctx, 0, 0, cx - 1, dieY + 5, 2, 2, dotC);
  } else if (frame === 1) {
    // Face showing 4 — four corner dots
    b(ctx, 0, 0, dieX + 3, dieY + 3, 2, 2, dotC);
    b(ctx, 0, 0, dieX + 8, dieY + 3, 2, 2, dotC);
    b(ctx, 0, 0, dieX + 3, dieY + 8, 2, 2, dotC);
    b(ctx, 0, 0, dieX + 8, dieY + 8, 2, 2, dotC);
  } else {
    // Face showing 6 — two columns of three
    for (let r = 0; r < 3; r++) {
      b(ctx, 0, 0, dieX + 3, dieY + 2 + r * 3, 2, 2, dotC);
      b(ctx, 0, 0, dieX + 8, dieY + 2 + r * 3, 2, 2, dotC);
    }
  }

  // Purple glow emanating from altar cracks
  const glowC = ['#6622aa', '#8844cc', '#aa66ee'][frame];
  p(ctx, 0, 0, 6, H - 13, glowC); p(ctx, 0, 0, W - 7, H - 13, glowC);
  b(ctx, 0, 0, cx - 4, H - 9, 8, 1, glowC + '66');
  // Glow particles rising from altar
  p(ctx, 0, 0, cx - 3, dieY + 14 - frame, glowC + '88');
  p(ctx, 0, 0, cx + 2, dieY + 13 - frame, glowC + '44');
}

function drawVoidRouletteWheel(ctx: CanvasRenderingContext2D, frame: number) {
  const w = gw(4), h = gh(4); // 56x56
  const cx = 28, cy = 26;
  // Felt table edge at bottom
  b(ctx, 0, 0, 0, 46, 56, 10, '#1a5c2a');
  b(ctx, 0, 0, 0, 48, 56, 8, '#147030');
  b(ctx, 0, 0, 2, 50, 52, 4, '#1a5c2a');
  // Gold outer rim
  for (let a = 0; a < 360; a += 2) {
    const r = 24; const rad = a * Math.PI / 180;
    const gx = Math.round(cx + r * Math.cos(rad));
    const gy = Math.round(cy + r * Math.sin(rad));
    if (gx >= 0 && gx < 56 && gy >= 0 && gy < 54) p(ctx, 0, 0, gx, gy, '#d4a830');
  }
  for (let a = 0; a < 360; a += 2) {
    const r = 25; const rad = a * Math.PI / 180;
    const gx = Math.round(cx + r * Math.cos(rad));
    const gy = Math.round(cy + r * Math.sin(rad));
    if (gx >= 0 && gx < 56 && gy >= 0 && gy < 54) p(ctx, 0, 0, gx, gy, '#c49520');
  }
  // Numbered segments — 18 segments alternating red/black with 1 green
  const segColors = ['#cc2222','#111111','#cc2222','#111111','#cc2222','#111111','#cc2222','#111111',
    '#cc2222','#111111','#00882a','#111111','#cc2222','#111111','#cc2222','#111111','#cc2222','#111111'];
  const offset = frame * 5; // rotation per frame (degrees)
  for (let i = 0; i < 18; i++) {
    const startA = i * 20 + offset;
    for (let a = startA; a < startA + 18; a += 2) {
      for (let r = 10; r < 23; r += 2) {
        const rad = a * Math.PI / 180;
        const gx = Math.round(cx + r * Math.cos(rad));
        const gy = Math.round(cy + r * Math.sin(rad));
        if (gx >= 0 && gx < 56 && gy >= 0 && gy < 54) p(ctx, 0, 0, gx, gy, segColors[i]);
      }
    }
    // Segment divider lines (gold)
    const drad = startA * Math.PI / 180;
    for (let r = 10; r < 24; r += 2) {
      const gx = Math.round(cx + r * Math.cos(drad));
      const gy = Math.round(cy + r * Math.sin(drad));
      if (gx >= 0 && gx < 56 && gy >= 0 && gy < 54) p(ctx, 0, 0, gx, gy, '#b8942a');
    }
  }
  // Inner track ring
  for (let a = 0; a < 360; a += 3) {
    const r = 9; const rad = a * Math.PI / 180;
    const gx = Math.round(cx + r * Math.cos(rad));
    const gy = Math.round(cy + r * Math.sin(rad));
    if (gx >= 0 && gx < 56 && gy >= 0 && gy < 54) p(ctx, 0, 0, gx, gy, '#aa8822');
  }
  // Gold center hub
  b(ctx, 0, 0, 25, 23, 6, 6, '#d4a830');
  b(ctx, 0, 0, 26, 24, 4, 4, '#e8c040');
  p(ctx, 0, 0, 27, 25, '#fff0a0'); // spindle highlight
  p(ctx, 0, 0, 28, 26, '#c49520');
  // White ball in track — orbits per frame
  const ballAngle = (frame * 90 + 30) * Math.PI / 180;
  const ballX = Math.round(cx + 21 * Math.cos(ballAngle));
  const ballY = Math.round(cy + 21 * Math.sin(ballAngle));
  b(ctx, 0, 0, ballX, ballY, 3, 3, '#ffffff');
  p(ctx, 0, 0, ballX, ballY, '#eeeedd');
  // Rim highlight
  for (let a = 200; a < 260; a += 3) {
    const r = 25; const rad = a * Math.PI / 180;
    const gx = Math.round(cx + r * Math.cos(rad));
    const gy = Math.round(cy + r * Math.sin(rad));
    if (gx >= 0 && gx < 56 && gy >= 0 && gy < 54) p(ctx, 0, 0, gx, gy, '#f0d060');
  }
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
  const W = gw(3), H = gh(2);
  const feltGreen = '#2a6e3f', feltDk = '#225533', feltLt = '#337a4a';
  const woodColor = '#5a3a1a', woodHi = '#7a5a3a', woodDk = '#3a2210';
  const railColor = '#6a2222', railHi = '#884444';
  // Table legs
  b(ctx, 0, 0, 4, H - 6, 4, 6, woodColor); b(ctx, 0, 0, 5, H - 6, 2, 6, woodHi);
  b(ctx, 0, 0, W - 8, H - 6, 4, 6, woodColor); b(ctx, 0, 0, W - 7, H - 6, 2, 6, woodHi);
  b(ctx, 0, 0, 14, H - 4, 4, 4, woodColor); b(ctx, 0, 0, 15, H - 4, 2, 4, woodHi);
  b(ctx, 0, 0, W - 18, H - 4, 4, 4, woodColor); b(ctx, 0, 0, W - 17, H - 4, 2, 4, woodHi);
  // Table apron (sides under top)
  const tableTop = H - 12;
  b(ctx, 0, 0, 2, tableTop + 4, W - 4, 4, woodDk);
  b(ctx, 0, 0, 3, tableTop + 5, W - 6, 2, woodColor);
  // Padded rail edge
  b(ctx, 0, 0, 1, tableTop, W - 2, 6, railColor);
  b(ctx, 0, 0, 2, tableTop, W - 4, 2, railHi); // highlight on rail top
  b(ctx, 0, 0, 2, tableTop + 4, W - 4, 2, '#551818'); // rail bottom shadow
  // Rounded corners of rail
  p(ctx, 0, 0, 1, tableTop, '#551818'); p(ctx, 0, 0, W - 2, tableTop, '#551818');
  // Felt surface with texture
  b(ctx, 0, 0, 3, tableTop - 10, W - 6, 12, feltGreen);
  b(ctx, 0, 0, 4, tableTop - 9, W - 8, 10, feltLt);
  // Felt texture dots
  for (let fx = 6; fx < W - 6; fx += 4) {
    for (let fy = tableTop - 8; fy < tableTop; fy += 4) {
      if ((fx + fy) % 8 === 0) p(ctx, 0, 0, fx, fy, feltDk);
    }
  }
  // Ace of spades (face up) - left side of table
  const cardW = 10, cardH = 14;
  const aceX = 8, aceY = tableTop - cardH + 1;
  b(ctx, 0, 0, aceX, aceY, cardW, cardH, '#ffffff');
  b(ctx, 0, 0, aceX, aceY, cardW, 2, '#eeeeee'); // top edge
  b(ctx, 0, 0, aceX + cardW - 2, aceY, 2, cardH, '#cccccc'); // right shadow
  // Spade symbol center
  const spCx = aceX + 5, spCy = aceY + 7;
  p(ctx, 0, 0, spCx, spCy - 2, '#000000'); // spade top
  b(ctx, 0, 0, spCx - 1, spCy - 1, 4, 2, '#000000'); // spade body
  b(ctx, 0, 0, spCx - 2, spCy + 1, 6, 2, '#000000');
  p(ctx, 0, 0, spCx, spCy + 3, '#000000'); // stem
  // A in corner
  p(ctx, 0, 0, aceX + 2, aceY + 2, '#000000');
  p(ctx, 0, 0, aceX + 1, aceY + 3, '#000000'); p(ctx, 0, 0, aceX + 3, aceY + 3, '#000000');
  b(ctx, 0, 0, aceX + 1, aceY + 4, 4, 2, '#000000');
  // Poker chips stacked - right side
  const chipX = W - 16;
  // Stack 1 - red
  for (let i = 0; i < 3; i++) { b(ctx, 0, 0, chipX, tableTop - 4 - i * 2, 6, 2, '#cc2222'); p(ctx, 0, 0, chipX + 2, tableTop - 4 - i * 2, '#ff4444'); }
  // Stack 2 - blue
  for (let i = 0; i < 2; i++) { b(ctx, 0, 0, chipX + 8, tableTop - 4 - i * 2, 6, 2, '#2244cc'); p(ctx, 0, 0, chipX + 10, tableTop - 4 - i * 2, '#4466ff'); }
  // Stack 3 - black
  b(ctx, 0, 0, chipX + 4, tableTop - 8, 6, 2, '#222222'); p(ctx, 0, 0, chipX + 6, tableTop - 8, '#555555');
  // Second card - animated
  const card2X = 22, card2Y = tableTop - cardH + 2;
  if (frame === 0) {
    // Face down - purple back with pattern
    b(ctx, 0, 0, card2X, card2Y, cardW, cardH, '#442266');
    b(ctx, 0, 0, card2X + 1, card2Y + 1, cardW - 2, cardH - 2, '#553388');
    // Diamond pattern on back
    for (let dy = card2Y + 2; dy < card2Y + cardH - 2; dy += 4) {
      for (let dx = card2X + 2; dx < card2X + cardW - 2; dx += 4) {
        p(ctx, 0, 0, dx, dy, '#664499');
      }
    }
    b(ctx, 0, 0, card2X + 2, card2Y + 4, cardW - 4, cardH - 8, '#6644aa');
  } else if (frame === 1) {
    // Tilting/flipping - narrower card (mid-flip)
    const flipW = 4;
    const flipX = card2X + (cardW - flipW) / 2;
    b(ctx, 0, 0, flipX, card2Y, flipW, cardH, '#997acc');
    b(ctx, 0, 0, flipX, card2Y, 2, cardH, '#ffffff'); // white edge showing
    b(ctx, 0, 0, flipX + 2, card2Y, 2, cardH, '#442266'); // purple back
    // Motion blur lines
    p(ctx, 0, 0, flipX - 2, card2Y + 2, '#ffffff44');
    p(ctx, 0, 0, flipX + flipW + 2, card2Y + 2, '#44226644');
  } else {
    // Face up - King
    b(ctx, 0, 0, card2X, card2Y, cardW, cardH, '#ffffff');
    b(ctx, 0, 0, card2X + cardW - 2, card2Y, 2, cardH, '#cccccc');
    // K in corner
    b(ctx, 0, 0, card2X + 1, card2Y + 2, 2, 4, '#000000');
    p(ctx, 0, 0, card2X + 3, card2Y + 2, '#000000');
    p(ctx, 0, 0, card2X + 3, card2Y + 4, '#000000');
    // King figure in center
    b(ctx, 0, 0, card2X + 3, card2Y + 4, 4, 2, '#ffdd44'); // crown
    b(ctx, 0, 0, card2X + 3, card2Y + 6, 4, 4, '#cc2222'); // robe
    b(ctx, 0, 0, card2X + 4, card2Y + 5, 2, 2, '#ffccaa'); // face
    p(ctx, 0, 0, card2X + 2, card2Y + 7, '#222222'); // scepter
    p(ctx, 0, 0, card2X + 2, card2Y + 8, '#222222');
    // Spade suit mark
    p(ctx, 0, 0, card2X + 7, card2Y + 10, '#000000');
    b(ctx, 0, 0, card2X + 6, card2Y + 11, 4, 2, '#000000');
  }
}

function drawVoidFortuneTeller(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(3), H = gh(4); const cx = Math.floor(W / 2);

  // Glass booth cabinet — dark frame with transparent glass panels
  b(ctx, 0, 0, 1, 0, W - 2, H, '#1a1028'); // back wall
  // Cabinet frame (wood/metal)
  b(ctx, 0, 0, 0, 0, W, 1, '#442266'); b(ctx, 0, 0, 0, H - 1, W, 1, '#332255');
  b(ctx, 0, 0, 0, 0, 1, H, '#442266'); b(ctx, 0, 0, W - 1, 0, 1, H, '#332255');
  // Glass panels — tinted, semi-transparent sides
  b(ctx, 0, 0, 1, 1, 2, H - 2, '#33225588'); b(ctx, 0, 0, W - 3, 1, 2, H - 2, '#33225588');
  // Glass reflections
  p(ctx, 0, 0, 1, 4, '#8866aa44'); p(ctx, 0, 0, 2, 8, '#8866aa44');
  p(ctx, 0, 0, W - 2, 6, '#8866aa44'); p(ctx, 0, 0, W - 3, 12, '#8866aa44');
  // Front glass panel (center, large)
  b(ctx, 0, 0, 3, 1, W - 6, H - 6, '#221438');

  // "ZOLTAR" style marquee at top
  b(ctx, 0, 0, 2, 0, W - 4, 5, '#442266');
  b(ctx, 0, 0, 3, 1, W - 6, 3, '#553388');
  // Marquee neon border
  b(ctx, 0, 0, 2, 0, W - 4, 1, '#ff44cc');
  b(ctx, 0, 0, 2, 4, W - 4, 1, '#cc22aa');
  // "ZOLTAR" letters (simplified pixel text)
  const letterOn = ['#ffdd44', '#ffcc22', '#ffee66'][frame];
  // Z
  b(ctx, 0, 0, 6, 1, 3, 1, letterOn); p(ctx, 0, 0, 7, 2, letterOn); b(ctx, 0, 0, 6, 3, 3, 1, letterOn);
  // O
  b(ctx, 0, 0, 10, 1, 3, 3, letterOn); p(ctx, 0, 0, 11, 2, '#553388');
  // L
  p(ctx, 0, 0, 14, 1, letterOn); p(ctx, 0, 0, 14, 2, letterOn); b(ctx, 0, 0, 14, 3, 3, 1, letterOn);
  // T
  b(ctx, 0, 0, 18, 1, 3, 1, letterOn); p(ctx, 0, 0, 19, 2, letterOn); p(ctx, 0, 0, 19, 3, letterOn);
  // A
  p(ctx, 0, 0, 23, 1, letterOn); b(ctx, 0, 0, 22, 2, 3, 1, letterOn); p(ctx, 0, 0, 22, 3, letterOn); p(ctx, 0, 0, 24, 3, letterOn);
  // R
  b(ctx, 0, 0, 26, 1, 2, 3, letterOn); p(ctx, 0, 0, 28, 1, letterOn); p(ctx, 0, 0, 28, 3, letterOn);
  // Chase lights under marquee
  for (let lx = 3; lx < W - 3; lx += 2) {
    p(ctx, 0, 0, lx, 4, ((lx + frame) % 3 === 0) ? '#ffdd44' : '#331122');
  }

  // Fortune teller figure inside booth
  // Turban
  b(ctx, 0, 0, cx - 4, 7, 8, 3, '#8844aa');
  b(ctx, 0, 0, cx - 3, 6, 6, 2, '#aa66cc');
  p(ctx, 0, 0, cx, 6, '#ffdd44'); // turban jewel
  // Face
  b(ctx, 0, 0, cx - 3, 10, 6, 4, '#c8a878');
  p(ctx, 0, 0, cx - 2, 11, '#221438'); p(ctx, 0, 0, cx + 1, 11, '#221438'); // eyes
  p(ctx, 0, 0, cx - 1, 12, '#aa8860'); p(ctx, 0, 0, cx, 12, '#aa8860'); // nose
  b(ctx, 0, 0, cx - 2, 13, 4, 1, '#884444'); // mouth
  // Beard
  p(ctx, 0, 0, cx - 3, 14, '#888888'); p(ctx, 0, 0, cx + 2, 14, '#888888');
  b(ctx, 0, 0, cx - 2, 14, 4, 2, '#999999'); p(ctx, 0, 0, cx - 1, 16, '#aaaaaa');
  // Robes
  b(ctx, 0, 0, cx - 5, 16, 10, 10, '#6622aa');
  b(ctx, 0, 0, cx - 4, 17, 8, 8, '#7733bb');
  // Robe collar/trim
  b(ctx, 0, 0, cx - 4, 16, 8, 1, '#aa66ee');
  // Arms extended over table
  b(ctx, 0, 0, cx - 6, 20, 3, 4, '#6622aa'); // left arm
  b(ctx, 0, 0, cx + 3, 20, 3, 4, '#6622aa'); // right arm
  // Hands
  p(ctx, 0, 0, cx - 6, 24, '#c8a878'); p(ctx, 0, 0, cx + 5, 24, '#c8a878');

  // Table inside booth
  b(ctx, 0, 0, 4, H - 14, W - 8, 3, '#332255');
  b(ctx, 0, 0, 5, H - 13, W - 10, 1, '#442266');
  // Table cloth fringe
  for (let x = 4; x < W - 4; x += 2) p(ctx, 0, 0, x, H - 11, '#553388');

  // Crystal ball on table — with swirling mist inside
  const ballY = H - 20;
  b(ctx, 0, 0, cx - 5, ballY, 10, 8, '#333355'); // outer sphere
  b(ctx, 0, 0, cx - 4, ballY + 1, 8, 6, '#444477'); // mid sphere
  b(ctx, 0, 0, cx - 3, ballY + 2, 6, 4, '#555599'); // inner sphere
  // Swirl color changes per frame
  const ballColors = ['#4488ff', '#8844cc', '#44cc66'];
  b(ctx, 0, 0, cx - 2, ballY + 2, 4, 4, ballColors[frame]);
  // Mist swirl pattern inside ball
  p(ctx, 0, 0, cx - 1 + (frame % 2), ballY + 3, '#ffffff88');
  p(ctx, 0, 0, cx + 1 - (frame % 2), ballY + 4, ballColors[(frame + 1) % 3] + '88');
  // Highlight/specular
  p(ctx, 0, 0, cx - 3, ballY + 1, '#ffffff'); p(ctx, 0, 0, cx - 2, ballY + 1, '#ccccff');
  // Ball stand (ornate pedestal)
  b(ctx, 0, 0, cx - 3, ballY + 8, 6, 2, '#666666');
  b(ctx, 0, 0, cx - 4, ballY + 9, 8, 1, '#555555');
  p(ctx, 0, 0, cx - 4, ballY + 8, '#777777'); p(ctx, 0, 0, cx + 3, ballY + 8, '#777777');

  // Card slot / ticket dispenser at bottom
  b(ctx, 0, 0, cx - 4, H - 5, 8, 3, '#221438');
  b(ctx, 0, 0, cx - 2, H - 4, 4, 1, '#444455'); // slot opening
  // Coin slot on right side
  b(ctx, 0, 0, W - 5, H - 10, 2, 3, '#333344');
  b(ctx, 0, 0, W - 4, H - 9, 1, 1, '#666677');
}


function drawInfernalSkullSmall(ctx: CanvasRenderingContext2D, frame: number) {
  // Skull cranium
  b(ctx, 0, 0, 1, 1, 5, 3, '#d4c8a0');
  p(ctx, 0, 0, 2, 0, '#d4c8a0'); p(ctx, 0, 0, 3, 0, '#d4c8a0'); p(ctx, 0, 0, 4, 0, '#d4c8a0');
  b(ctx, 0, 0, 1, 2, 5, 1, '#b0a478');
  // Eye sockets
  p(ctx, 0, 0, 2, 3, frame === 1 ? '#44ff44' : '#1a0a0a');
  p(ctx, 0, 0, 4, 3, frame === 2 ? '#44ff44' : '#1a0a0a');
  // Nose + jaw
  p(ctx, 0, 0, 3, 4, '#8a7a58');
  b(ctx, 0, 0, 1, 5, 5, 1, '#b0a478');
  p(ctx, 0, 0, 2, 5, '#d4c8a0'); p(ctx, 0, 0, 4, 5, '#d4c8a0');
  p(ctx, 0, 0, 0, 6, '#b0a478'); p(ctx, 0, 0, 6, 5, '#8a7a58');
}

function drawCyberCableH(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(3), H = gh(1);
  const midY = Math.floor(H / 2);
  b(ctx, 0, 0, 0, midY - 2, W, 5, '#111118');
  for (let x = 0; x < W; x++) { p(ctx, 0, 0, x, midY - 1, '#224488'); p(ctx, 0, 0, x, midY, '#228844'); p(ctx, 0, 0, x, midY + 1, '#884422'); }
  for (let cx_ = 3; cx_ < W; cx_ += 7) b(ctx, 0, 0, cx_, midY - 2, 1, 5, '#333344');
  const sparkX = frame === 0 ? 2 : frame === 1 ? Math.floor(W / 2) : W - 4;
  b(ctx, 0, 0, sparkX, midY - 1, 2, 3, '#44ccaa'); p(ctx, 0, 0, sparkX, midY, '#ffffff'); p(ctx, 0, 0, sparkX + 1, midY, '#ffffff');
}

function drawCyberCableV(ctx: CanvasRenderingContext2D, frame: number) {
  const W = gw(1), H = gh(3);
  const midX = Math.floor(W / 2);
  b(ctx, 0, 0, midX - 2, 0, 5, H, '#111118');
  for (let y = 0; y < H; y++) { p(ctx, 0, 0, midX - 1, y, '#224488'); p(ctx, 0, 0, midX, y, '#228844'); p(ctx, 0, 0, midX + 1, y, '#884422'); }
  for (let cy_ = 3; cy_ < H; cy_ += 7) b(ctx, 0, 0, midX - 2, cy_, 5, 1, '#333344');
  const sparkY = frame === 0 ? 2 : frame === 1 ? Math.floor(H / 2) : H - 4;
  b(ctx, 0, 0, midX - 1, sparkY, 3, 2, '#44ccaa'); p(ctx, 0, 0, midX, sparkY, '#ffffff'); p(ctx, 0, 0, midX, sparkY + 1, '#ffffff');
}

// ===================== Structure Registry =====================

export const structures: StructureDef[] = [
  // Military (10)
  { key: 'military_hq', label: 'Military HQ (5x4)', faction: 'Military', widthCells: 5, heightCells: 4, animFrames: 3, draw: drawMilitaryHQ },
  { key: 'military_barracks', label: 'Military Barracks (5x3)', faction: 'Military', widthCells: 5, heightCells: 3, animFrames: 3, draw: drawMilitaryBarracks },
  { key: 'military_tents', label: 'Military Tents (2x1)', faction: 'Military', widthCells: 2, heightCells: 1, animFrames: 3, draw: drawMilitaryTents },
  { key: 'military_supply_depot', label: 'Military Supply Depot (5x3)', faction: 'Military', widthCells: 5, heightCells: 3, animFrames: 3, draw: drawMilitarySupplyDepot },
  { key: 'military_comms_tower', label: 'Military Comms Tower (2x5)', faction: 'Military', widthCells: 2, heightCells: 5, animFrames: 3, draw: drawMilitaryCommsTower },
  { key: 'military_guard_tower', label: 'Military Guard Tower (2x3)', faction: 'Military', widthCells: 2, heightCells: 3, animFrames: 3, draw: drawMilitaryGuardTower },
  { key: 'military_ammo_bunker', label: 'Military Ammo Bunker (3x3)', faction: 'Military', widthCells: 3, heightCells: 3, animFrames: 3, draw: drawMilitaryAmmoBunker },
  { key: 'military_radar_dish', label: 'Military Radar Dish (3x4)', faction: 'Military', widthCells: 3, heightCells: 4, animFrames: 4, draw: drawMilitaryRadarDish },
  { key: 'military_tank_hangar', label: 'Military Tank Hangar (4x3)', faction: 'Military', widthCells: 4, heightCells: 3, animFrames: 3, draw: drawMilitaryTankHangar },
  { key: 'military_landing_pad', label: 'Military Landing Pad (3x3)', faction: 'Military', widthCells: 3, heightCells: 3, animFrames: 3, draw: drawMilitaryLandingPad },
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
  { key: 'infernal_pentagram', label: 'Infernal Pentagram (3x3)', faction: 'Infernal', widthCells: 3, heightCells: 3, animFrames: 3, draw: drawInfernalPentagram },
  { key: 'infernal_demon_gate', label: 'Infernal Demon Gate (5x5)', faction: 'Infernal', widthCells: 5, heightCells: 5, animFrames: 3, draw: drawInfernalDemonGate },
  { key: 'infernal_skull_pile', label: 'Infernal Skull Pile (3x2)', faction: 'Infernal', widthCells: 3, heightCells: 2, animFrames: 3, draw: drawInfernalSkullPile },
  { key: 'infernal_skull_small', label: 'Infernal Skull Small (1x1)', faction: 'Infernal', widthCells: 1, heightCells: 1, animFrames: 3, draw: drawInfernalSkullSmall },
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
  { key: 'mech_steam_boiler', label: 'Mech Steam Boiler (2x3)', faction: 'Mechanical', widthCells: 2, heightCells: 3, animFrames: 3, draw: drawMechSteamBoiler },
  { key: 'mech_conveyor_terminal', label: 'Mech Conveyor Terminal (4x2)', faction: 'Mechanical', widthCells: 4, heightCells: 2, animFrames: 3, draw: drawMechConveyorTerminal },
  { key: 'mech_crane_arm', label: 'Mech Crane Arm (2x5)', faction: 'Mechanical', widthCells: 2, heightCells: 5, animFrames: 3, draw: drawMechCraneArm },
  { key: 'mech_scrap_heap', label: 'Mech Scrap Heap (3x3)', faction: 'Mechanical', widthCells: 3, heightCells: 3, animFrames: 3, draw: drawMechScrapHeap },
  { key: 'mech_smokestack', label: 'Mech Smokestack (2x4)', faction: 'Mechanical', widthCells: 2, heightCells: 4, animFrames: 3, draw: drawMechSmokestack },
  // Nature (8)
  { key: 'nature_ancient_tree', label: 'Nature Ancient Tree (7x7)', faction: 'Nature', widthCells: 7, heightCells: 7, animFrames: 3, draw: drawNatureAncientTree },
  { key: 'nature_sacred_pond', label: 'Nature Sacred Pond (5x4)', faction: 'Nature', widthCells: 5, heightCells: 4, animFrames: 3, draw: drawNatureSacredPond },
  { key: 'nature_mushroom_ring', label: 'Nature Mushroom Ring (2x2)', faction: 'Nature', widthCells: 2, heightCells: 2, animFrames: 3, draw: drawNatureMushroomRing },
  { key: 'nature_hollow_log', label: 'Nature Hollow Log (4x2)', faction: 'Nature', widthCells: 4, heightCells: 2, animFrames: 3, draw: drawNatureHollowLog },
  { key: 'nature_berry_bush', label: 'Nature Berry Bush (2x2)', faction: 'Nature', widthCells: 2, heightCells: 2, animFrames: 3, draw: drawNatureBerryBush },
  { key: 'nature_stone_shrine', label: 'Nature Stone Shrine (3x3)', faction: 'Nature', widthCells: 3, heightCells: 3, animFrames: 3, draw: drawNatureStoneShrine },
  { key: 'nature_waterfall', label: 'Nature Waterfall (3x5)', faction: 'Nature', widthCells: 3, heightCells: 5, animFrames: 3, draw: drawNatureWaterfall },
  { key: 'nature_bee_hive', label: 'Nature Bee Hive (1x2)', faction: 'Nature', widthCells: 1, heightCells: 2, animFrames: 3, draw: drawNatureBeeHive },
  // Cypherpunk (8)
  { key: 'cyber_mainframe', label: 'Cyber Mainframe (3x6)', faction: 'Cypherpunk', widthCells: 3, heightCells: 6, animFrames: 3, draw: drawCyberMainframe },
  { key: 'cyber_server_farm', label: 'Cyber Server Farm (3x2)', faction: 'Cypherpunk', widthCells: 3, heightCells: 2, animFrames: 3, draw: drawCyberServerFarm },
  { key: 'cyber_hologram_table', label: 'Cyber Hologram Table (4x3)', faction: 'Cypherpunk', widthCells: 4, heightCells: 3, animFrames: 3, draw: drawCyberHologramTable },
  { key: 'cyber_cable_nest', label: 'Cyber Cable Nest (3x3)', faction: 'Cypherpunk', widthCells: 3, heightCells: 3, animFrames: 3, draw: drawCyberCableNest },
  { key: 'cyber_crypto_miner', label: 'Cyber Crypto Miner (3x2)', faction: 'Cypherpunk', widthCells: 3, heightCells: 2, animFrames: 3, draw: drawCyberCryptoMiner },
  { key: 'cyber_neon_sign', label: 'Cyber Neon Sign (4x2)', faction: 'Cypherpunk', widthCells: 4, heightCells: 2, animFrames: 3, draw: drawCyberNeonSign },
  { key: 'cyber_hacker_station', label: 'Cyber Hacker Station (2x2)', faction: 'Cypherpunk', widthCells: 2, heightCells: 2, animFrames: 3, draw: drawCyberHackerStation },
  { key: 'cyber_firewall_node', label: 'Cyber Firewall Node (5x5)', faction: 'Cypherpunk', widthCells: 5, heightCells: 5, animFrames: 3, draw: drawCyberFirewallNode },
  { key: 'cyber_cable_h', label: 'Cyber Cable Run H (3x1)', faction: 'Cypherpunk', widthCells: 3, heightCells: 1, animFrames: 3, draw: drawCyberCableH },
  { key: 'cyber_cable_v', label: 'Cyber Cable Run V (1x3)', faction: 'Cypherpunk', widthCells: 1, heightCells: 3, animFrames: 3, draw: drawCyberCableV },
  // Celestial (8)
  { key: 'celestial_sanctum', label: 'Celestial Sanctum (12x2)', faction: 'Celestial', widthCells: 12, heightCells: 2, animFrames: 3, draw: drawCelestialSanctum },
  { key: 'celestial_gate_pillar', label: 'Celestial Gate Pillar (2x3)', faction: 'Celestial', widthCells: 2, heightCells: 3, animFrames: 3, draw: drawCelestialGatePillar },
  { key: 'celestial_oracle_fountain', label: 'Celestial Oracle Fountain (4x4)', faction: 'Celestial', widthCells: 4, heightCells: 4, animFrames: 3, draw: drawCelestialOracleFountain },
  { key: 'celestial_marble_colossus', label: 'Celestial Marble Colossus (2x4)', faction: 'Celestial', widthCells: 2, heightCells: 4, animFrames: 3, draw: drawCelestialMarbleColossus },
  { key: 'celestial_cloud_throne', label: 'Celestial Cloud Throne (4x3)', faction: 'Celestial', widthCells: 4, heightCells: 3, animFrames: 3, draw: drawCelestialCloudThrone },
  { key: 'celestial_sun_dial', label: 'Celestial Sun Dial (2x2)', faction: 'Celestial', widthCells: 2, heightCells: 2, animFrames: 4, draw: drawCelestialSunDial },
  { key: 'celestial_altar_of_light', label: 'Celestial Altar of Light (4x2)', faction: 'Celestial', widthCells: 4, heightCells: 2, animFrames: 3, draw: drawCelestialAltarOfLight },
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
  { key: 'harmonic_conductor_podium', label: 'Harmonic Conductor Podium (2x2)', faction: 'Harmonic', widthCells: 2, heightCells: 2, animFrames: 3, draw: drawHarmonicConductorPodium },
  { key: 'harmonic_speaker_stack', label: 'Harmonic Speaker Stack (1x2)', faction: 'Harmonic', widthCells: 1, heightCells: 2, animFrames: 3, draw: drawHarmonicSpeakerStack },
  { key: 'harmonic_harp', label: 'Harmonic Harp (2x3)', faction: 'Harmonic', widthCells: 2, heightCells: 3, animFrames: 3, draw: drawHarmonicHarp },
  { key: 'harmonic_music_stand', label: 'Harmonic Music Stand (1x2)', faction: 'Harmonic', widthCells: 1, heightCells: 2, animFrames: 3, draw: drawHarmonicMusicStand },
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
