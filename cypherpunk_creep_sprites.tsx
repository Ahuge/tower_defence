import { useRef, useEffect, useState, useCallback } from "react";

// ===== CYPHERPUNK CREEP PALETTE =====
const C = {
  BODY: '#112218',
  CIRCUIT: '#22ddaa',
  BRIGHT: '#44ffcc',
  DARK: '#081210',
  SCAN: '#33ffbb',
  PIXEL: '#00ff88',
  GLITCH: '#ff4444',
  CODE: '#22aa88',
  SCREEN: '#335544',
  DATA: '#88ffdd',
  DIM: '#1a332a',
  STATIC: '#667766',
  ERROR: '#ff2222',
  HACK: '#00ddaa',
  GRID: '#224433',
  WHITE: '#ffffff',
};

// ===== DRAWING HELPERS =====
const mk = (c: CanvasRenderingContext2D, o: number[], gw: number, gh: number, ps: number) => {
  const p = (x: number, y: number, cl: string) => {
    if (!cl || x < 0 || x >= gw || y < 0 || y >= gh) return;
    c.fillStyle = cl; c.fillRect(o[0] + x * ps, o[1] + y * ps, ps, ps);
  };
  const b = (x: number, y: number, w: number, h: number, cl: string) => {
    if (!cl) return; c.fillStyle = cl; c.fillRect(o[0] + x * ps, o[1] + y * ps, w * ps, h * ps);
  };
  return { p, b };
};

// ===== CONSTANTS =====
const PX = 2, GRID_SZ = 32, CELL = GRID_SZ * PX; // 64x64 pixel cells
const COLS = 16;
const ROWS = 7;
const SHEET_W = COLS * CELL; // 1024
const SHEET_H = ROWS * CELL; // 448

const CREEP_NAMES = [
  'Standard', 'Fast', 'Armored', 'Swarm', 'Healer', 'Boss',
  'Group', 'Splitter', 'Shielded', 'Evasive', 'Regenerator', 'Flying',
  'Mage Iron', 'Mage Haste', 'Mage Mist', 'Mage Heal'
];
const ROW_NAMES = ['Walk 0', 'Walk 1', 'Walk 2', 'Walk 3', 'Death 0', 'Death 1', 'Death 2'];

// ===== DEATH ANIMATION HELPER =====
function drawDeathGlitch(
  p: (x: number, y: number, cl: string) => void,
  b: (x: number, y: number, w: number, h: number, cl: string) => void,
  deathFrame: number, cx: number, cy: number
) {
  if (deathFrame === 0) {
    // Frame 0: Glitch distortion, scan lines break apart
    b(cx - 4, cy - 4, 10, 10, C.BODY);
    b(cx - 3, cy - 5, 8, 2, C.DIM);
    b(cx - 3, cy + 5, 7, 2, C.DARK);
    // Shading
    b(cx - 4, cy - 4, 2, 10, C.DIM);
    b(cx + 4, cy - 2, 2, 8, C.DARK);
    // Glitch lines (horizontal distortion)
    b(cx - 5, cy - 3, 3, 1, C.GLITCH); b(cx + 3, cy - 3, 3, 1, C.ERROR);
    b(cx - 3, cy - 1, 2, 1, C.CIRCUIT); b(cx + 2, cy - 1, 4, 1, C.GLITCH);
    b(cx - 4, cy + 1, 4, 1, C.ERROR); b(cx + 1, cy + 1, 2, 1, C.CIRCUIT);
    b(cx - 2, cy + 3, 3, 1, C.GLITCH); b(cx + 3, cy + 3, 2, 1, C.ERROR);
    // Scan line fragments
    p(cx, cy - 4, C.SCAN); p(cx + 2, cy - 2, C.BRIGHT);
    p(cx - 3, cy, C.SCAN); p(cx + 4, cy + 2, C.BRIGHT);
    // Center flash
    b(cx - 1, cy - 1, 3, 3, C.CIRCUIT);
    p(cx, cy, C.WHITE);
  } else if (deathFrame === 1) {
    // Frame 1: Pixel scatter in all directions
    b(cx - 6, cy - 6, 2, 1, C.CIRCUIT); p(cx - 6, cy - 6, C.BRIGHT);
    b(cx + 5, cy - 5, 1, 2, C.PIXEL);
    b(cx - 7, cy, 2, 1, C.CODE);
    b(cx + 6, cy - 1, 1, 2, C.HACK);
    b(cx - 5, cy + 5, 2, 1, C.SCAN);
    b(cx + 5, cy + 5, 1, 2, C.CIRCUIT);
    b(cx - 1, cy - 7, 1, 2, C.BRIGHT);
    b(cx, cy + 6, 2, 1, C.CODE);
    // Error pixels
    p(cx - 3, cy - 3, C.GLITCH); p(cx + 3, cy - 4, C.ERROR);
    p(cx - 4, cy + 3, C.GLITCH); p(cx + 4, cy + 4, C.ERROR);
    // Tiny fragments
    p(cx - 5, cy - 4, C.DIM); p(cx + 5, cy - 3, C.DIM);
    p(cx - 4, cy + 5, C.DARK); p(cx + 4, cy + 5, C.DARK);
    // Center flash
    b(cx - 1, cy - 1, 3, 3, C.WHITE);
    p(cx, cy, C.WHITE);
  } else {
    // Frame 2: Just a few dead pixels remaining
    p(cx - 2, cy, C.DIM); p(cx + 3, cy + 1, C.DARK);
    p(cx, cy - 1, C.GRID); p(cx + 1, cy, C.DIM);
    // Scattered far
    p(cx - 8, cy - 4, C.DARK); p(cx + 9, cy - 5, C.DIM);
    p(cx - 5, cy + 7, C.DARK); p(cx + 6, cy + 8, C.DIM);
    p(cx, cy - 9, C.DARK); p(cx + 2, cy + 9, C.DIM);
    p(cx - 9, cy + 2, C.DARK);
  }
}

// ===== CREEP DRAW FUNCTIONS =====

// 0: Data Sprite (Standard) - humanoid of code lines
function drawStandard(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID_SZ, GRID_SZ, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 5 + bob;
    // Head
    b(12, by, 8, 5, C.BODY); b(13, by, 6, 2, C.DIM);
    b(13, by, 6, 1, C.CIRCUIT); p(12, by, C.DIM);
    p(19, by + 4, C.DARK); p(19, by + 3, C.DARK);
    // Code line pattern on head
    p(14, by, C.BRIGHT); p(16, by, C.SCAN); p(17, by, C.CIRCUIT);
    // Eyes (glowing scan lines)
    b(13, by + 2, 2, 2, C.SCAN); b(17, by + 2, 2, 2, C.SCAN);
    p(14, by + 2, C.WHITE); p(18, by + 2, C.WHITE);
    // Brow
    b(12, by + 1, 8, 1, C.DARK);
    // Neck
    b(13, by + 5, 6, 1, C.DARK);
    // Torso (code-line body)
    b(10, by + 6, 12, 8, C.BODY);
    b(10, by + 6, 2, 8, C.DIM); b(11, by + 6, 1, 6, C.GRID);
    b(20, by + 6, 2, 8, C.DARK);
    b(11, by + 6, 10, 1, C.CIRCUIT); b(12, by + 6, 8, 1, C.BRIGHT);
    // Code lines scrolling on body
    p(12, by + 8, C.CODE); p(14, by + 8, C.CIRCUIT); p(16, by + 8, C.CODE);
    p(18, by + 8, C.HACK);
    p(13, by + 10, C.HACK); p(15, by + 10, C.CODE); p(17, by + 10, C.CIRCUIT);
    p(11, by + 12, C.CODE); p(14, by + 12, C.CIRCUIT); p(19, by + 12, C.CODE);
    // Circuit core
    b(14, by + 8, 4, 3, C.CIRCUIT); b(15, by + 9, 2, 1, C.BRIGHT);
    p(15, by + 8, C.WHITE); p(16, by + 10, C.SCAN);
    // Belt
    b(11, by + 12, 10, 1, C.DARK);
    // Arms
    b(8, by + 7, 2, 6, C.BODY); b(8, by + 7, 1, 6, C.DIM);
    b(7, by + 9, 1, 3, C.BODY); p(7, by + 9, C.DIM);
    b(22, by + 7, 2, 6, C.BODY); b(23, by + 7, 1, 6, C.DARK);
    b(24, by + 9, 1, 3, C.DARK);
    // Fists
    b(7, by + 12, 2, 2, C.BODY); p(7, by + 12, C.DIM);
    b(23, by + 12, 2, 2, C.DARK);
    // Legs
    b(11 + lOff, by + 14, 4, 6, C.BODY);
    b(11 + lOff, by + 14, 1, 6, C.DIM); b(14 + lOff, by + 14, 1, 6, C.DARK);
    b(17 + rOff, by + 14, 4, 6, C.BODY);
    b(20 + rOff, by + 14, 1, 6, C.DARK);
    // Feet
    b(10 + lOff, by + 20, 5, 2, C.DARK); b(10 + lOff, by + 20, 2, 1, C.BODY);
    b(17 + rOff, by + 20, 5, 2, C.DARK);
    // Scan line glow above
    p(14, by - 1, C.CIRCUIT); p(15, by - 1, C.SCAN); p(16, by - 1, C.CIRCUIT);
  } else {
    drawDeathGlitch(p, b, f - 4, 16, 14);
  }
}

// 1: Packet Runner (Fast) - streamlined data stream
function drawFast(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID_SZ, GRID_SZ, PX);
  if (f <= 3) {
    const bob = [0, -2, 2, 0][f];
    const by = 9 + bob;
    // Arrow/chevron shape - data packet
    p(16, by - 1, C.WHITE);
    b(15, by, 3, 1, C.BRIGHT);
    b(14, by + 1, 5, 1, C.CIRCUIT);
    b(13, by + 2, 7, 2, C.SCAN);
    b(12, by + 4, 9, 2, C.BODY);
    b(13, by + 6, 7, 2, C.CODE);
    b(14, by + 8, 5, 1, C.CIRCUIT);
    b(15, by + 9, 3, 1, C.DIM);
    p(16, by + 10, C.DARK);
    // Data core
    b(15, by + 3, 3, 3, C.CIRCUIT);
    p(16, by + 4, C.WHITE); p(15, by + 4, C.BRIGHT); p(17, by + 4, C.BRIGHT);
    // Facet shading
    b(12, by + 4, 1, 2, C.DIM); p(13, by + 3, C.DIM);
    b(20, by + 4, 1, 2, C.DARK); p(19, by + 6, C.DARK);
    // Trailing data bits
    const trail = [1, 3, 0, 2][f];
    b(10, by + 4 + trail, 2, 1, C.CIRCUIT); p(9, by + 5, C.SCAN);
    b(7, by + 4, 2, 1, C.CODE); p(6, by + 5 + trail, C.HACK);
    b(4, by + 4, 2, 1, C.DIM); p(3, by + 5, C.GRID);
    p(2, by + 4, C.DARK);
    if (f % 2 === 0) {
      p(1, by + 5, C.DARK); p(5, by + 3, C.CODE);
      p(8, by + 6, C.HACK);
    } else {
      p(5, by + 6, C.CODE); p(8, by + 3, C.HACK);
    }
  } else {
    drawDeathGlitch(p, b, f - 4, 16, 14);
  }
}

// 2: Firewall Golem (Armored) - blocky defensive layers
function drawArmored(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID_SZ, GRID_SZ, PX);
  if (f <= 3) {
    const bob = [0, 0, -1, 0][f];
    const lOff = [0, 0, 1, 0][f];
    const rOff = [0, 0, 0, 1][f];
    const by = 4 + bob;
    // Massive blocky body (firewall layers)
    b(8, by, 16, 2, C.BODY); b(9, by, 14, 1, C.DIM);
    b(7, by + 2, 18, 4, C.BODY);
    b(6, by + 6, 20, 6, C.BODY);
    b(7, by + 12, 18, 3, C.BODY);
    b(9, by + 15, 14, 2, C.BODY);
    // Layer shading
    b(6, by + 2, 2, 10, C.DIM); b(7, by + 3, 1, 8, C.GRID);
    b(24, by + 2, 2, 10, C.DARK); b(25, by + 4, 1, 8, C.DARK);
    b(8, by, 16, 2, C.DIM);
    b(9, by + 15, 14, 2, C.DARK);
    // Firewall layer lines (horizontal)
    b(10, by + 3, 12, 1, C.CIRCUIT); b(11, by + 3, 10, 1, C.SCAN);
    b(10, by + 8, 12, 1, C.DARK);
    b(10, by + 11, 12, 1, C.DARK);
    // Lock/shield icons on plates
    p(8, by + 4, C.CIRCUIT); p(23, by + 4, C.CIRCUIT);
    p(8, by + 6, C.HACK); p(23, by + 6, C.HACK);
    // Screen face
    b(11, by + 2, 2, 2, C.SCAN); p(12, by + 2, C.WHITE);
    b(19, by + 2, 2, 2, C.SCAN); p(20, by + 2, C.WHITE);
    b(12, by + 4, 8, 2, C.DARK); b(13, by + 4, 6, 1, C.SCREEN);
    // Data core
    b(14, by + 7, 4, 3, C.CIRCUIT); b(15, by + 8, 2, 1, C.BRIGHT);
    p(15, by + 7, C.WHITE); p(16, by + 9, C.SCAN);
    // Inner status indicators
    b(10, by + 6, 3, 1, C.CODE); b(19, by + 6, 3, 1, C.CODE);
    b(10, by + 10, 12, 1, C.GRID);
    // Legs
    b(10 + lOff, by + 17, 4, 4, C.BODY);
    b(10 + lOff, by + 17, 1, 4, C.DIM); b(13 + lOff, by + 17, 1, 4, C.DARK);
    b(18 + rOff, by + 17, 4, 4, C.BODY);
    b(21 + rOff, by + 17, 1, 4, C.DARK);
    // Feet
    b(9 + lOff, by + 21, 6, 2, C.DARK);
    b(17 + rOff, by + 21, 6, 2, C.DARK);
  } else {
    drawDeathGlitch(p, b, f - 4, 16, 14);
  }
}

// 3: Bit Fragment (Swarm) - tiny pixel cluster
function drawSwarm(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID_SZ, GRID_SZ, PX);
  if (f <= 3) {
    const jx = [0, 2, -2, 0][f];
    const jy = [0, 0, 2, -2][f];
    const bx = 12 + jx, by = 11 + jy;
    // Tiny pixel cluster
    b(bx + 1, by, 4, 1, C.CIRCUIT);
    b(bx, by + 1, 6, 3, C.BODY);
    b(bx + 1, by + 4, 4, 1, C.DARK);
    // Pixel shading
    b(bx, by + 1, 1, 3, C.DIM); b(bx + 5, by + 1, 1, 3, C.DARK);
    p(bx + 2, by + 1, C.SCAN); p(bx + 4, by + 2, C.CODE);
    // Eye
    b(bx + 3, by + 2, 2, 1, C.SCAN); p(bx + 3, by + 2, C.WHITE);
    // Data particles
    p(bx + 6, by, C.CIRCUIT); p(bx - 1, by + 2, C.CODE);
    p(bx + 7, by + 2, C.HACK);
    if (f % 2 === 0) p(bx + 1, by - 1, C.SCAN);
  } else {
    drawDeathGlitch(p, b, f - 4, 16, 15);
  }
}

// 4: Patch Daemon (Healer) - floating orb, green + icon
function drawHealer(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID_SZ, GRID_SZ, PX);
  if (f <= 3) {
    const bob = [0, -2, 0, 2][f];
    const by = 8 + bob;
    // Hovering data orb
    b(12, by, 8, 2, C.CIRCUIT); b(13, by, 6, 1, C.BRIGHT);
    b(10, by + 2, 12, 6, C.BODY);
    b(11, by + 2, 10, 1, C.CIRCUIT);
    b(12, by + 8, 8, 2, C.DARK);
    b(13, by + 9, 6, 1, C.DARK);
    // Inner glow
    b(12, by + 3, 8, 4, C.DIM);
    b(13, by + 4, 6, 2, C.SCREEN);
    // Green + symbol in center
    b(15, by + 3, 2, 5, C.PIXEL); b(13, by + 5, 6, 1, C.PIXEL);
    p(16, by + 5, C.WHITE); p(15, by + 5, C.BRIGHT);
    p(15, by + 3, C.BRIGHT); p(16, by + 7, C.BRIGHT);
    p(13, by + 5, C.SCAN); p(18, by + 5, C.SCAN);
    // Orb shading
    b(10, by + 2, 2, 3, C.DIM);
    b(20, by + 5, 2, 3, C.DARK);
    // Orbiting data ring
    const pulse = [0, 1, 0, -1][f];
    for (let i = 0; i < 16; i++) {
      const a = (i + f * 2) * Math.PI / 8;
      const rx = 16 + Math.round(Math.cos(a) * 9);
      const ry = by + 5 + Math.round(Math.sin(a) * (8));
      p(rx, ry, i % 4 === 0 ? C.WHITE : C.CIRCUIT);
    }
    // Cardinal heal points
    p(5, by + 4 + pulse, C.PIXEL); p(26, by + 4 - pulse, C.PIXEL);
    p(16, by - 3 + pulse, C.PIXEL); p(16, by + 12 - pulse, C.PIXEL);
    // Soft glow below
    b(14, by + 11, 4, 1, C.CODE); b(13, by + 12, 6, 1, C.DIM);
  } else {
    drawDeathGlitch(p, b, f - 4, 16, 13);
  }
}

// 5: Mainframe Entity (Boss) - massive, multiple screens
function drawBoss(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID_SZ, GRID_SZ, PX);
  if (f <= 3) {
    const bob = [0, 0, -1, 0][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 1 + bob;
    // Antenna array on top
    p(10, by - 2, C.CIRCUIT); b(10, by - 1, 1, 2, C.DIM);
    p(14, by - 3, C.SCAN); b(14, by - 2, 1, 2, C.CODE);
    p(18, by - 3, C.BRIGHT); b(18, by - 2, 1, 2, C.CODE);
    p(22, by - 2, C.CIRCUIT); b(22, by - 1, 1, 2, C.DIM);
    // Blinking lights
    p(11, by - 1, C.SCAN); p(15, by - 2, C.BRIGHT); p(19, by - 2, C.WHITE);
    // Massive head (server rack face)
    b(9, by, 14, 5, C.BODY);
    b(9, by, 14, 2, C.DIM); b(10, by, 12, 1, C.CIRCUIT);
    b(9, by, 2, 5, C.DIM);
    b(21, by + 2, 2, 3, C.DARK);
    // Multiple screen eyes
    b(11, by + 2, 3, 2, C.SCAN); b(12, by + 2, 1, 1, C.WHITE);
    p(11, by + 3, C.BRIGHT);
    b(18, by + 2, 3, 2, C.SCAN); b(19, by + 2, 1, 1, C.WHITE);
    p(18, by + 3, C.BRIGHT);
    // Status bar mouth
    b(13, by + 4, 6, 1, C.DARK);
    p(14, by + 4, C.CIRCUIT); p(16, by + 4, C.PIXEL); p(18, by + 4, C.ERROR);
    // Shoulder modules
    b(5, by + 4, 3, 3, C.BODY); b(5, by + 4, 1, 3, C.DIM); b(7, by + 5, 1, 2, C.DARK);
    p(5, by + 3, C.CIRCUIT); p(6, by + 3, C.SCAN);
    b(24, by + 4, 3, 3, C.BODY); b(26, by + 4, 1, 3, C.DARK);
    p(25, by + 3, C.CIRCUIT); p(26, by + 3, C.SCAN);
    // Neck
    b(12, by + 5, 8, 2, C.DARK);
    // Massive server torso
    b(6, by + 7, 20, 10, C.BODY);
    b(6, by + 7, 3, 10, C.DIM); b(7, by + 7, 2, 8, C.GRID);
    b(23, by + 7, 3, 10, C.DARK);
    b(8, by + 7, 16, 2, C.CIRCUIT); b(9, by + 7, 14, 1, C.SCAN);
    // Multiple data screens on torso
    b(10, by + 9, 3, 3, C.SCREEN); p(10, by + 9, C.SCAN); p(12, by + 11, C.CODE);
    p(11, by + 10, C.BRIGHT); p(11, by + 9, C.WHITE);
    b(19, by + 9, 3, 3, C.SCREEN); p(21, by + 9, C.DARK);
    p(20, by + 10, C.SCAN); p(20, by + 9, C.WHITE);
    b(14, by + 12, 4, 3, C.CIRCUIT); b(15, by + 13, 2, 1, C.BRIGHT);
    p(15, by + 12, C.WHITE); p(16, by + 14, C.SCAN);
    // Data flow lines
    b(10, by + 11, 12, 1, C.GRID); b(10, by + 14, 12, 1, C.DARK);
    // Power bar
    b(8, by + 16, 16, 2, C.DARK); b(9, by + 16, 14, 1, C.SCREEN);
    p(12, by + 16, C.CIRCUIT); p(19, by + 16, C.CIRCUIT);
    // Arms
    b(3, by + 8, 3, 8, C.BODY); b(3, by + 8, 1, 8, C.DIM);
    b(2, by + 10, 1, 5, C.BODY); p(2, by + 10, C.DIM);
    b(1, by + 12, 1, 3, C.BODY);
    b(26, by + 8, 3, 8, C.BODY); b(28, by + 8, 1, 8, C.DARK);
    b(29, by + 10, 1, 5, C.DARK);
    b(30, by + 12, 1, 3, C.DARK);
    // Fists
    b(1, by + 15, 3, 3, C.BODY); b(1, by + 15, 1, 3, C.DIM);
    b(28, by + 15, 3, 3, C.DARK);
    // Legs
    b(8 + lOff, by + 18, 6, 7, C.BODY);
    b(8 + lOff, by + 18, 2, 7, C.DIM); b(13 + lOff, by + 18, 1, 7, C.DARK);
    b(18 + rOff, by + 18, 6, 7, C.BODY);
    b(23 + rOff, by + 18, 1, 7, C.DARK);
    // Knee indicators
    b(8 + lOff, by + 21, 6, 1, C.DARK); p(9 + lOff, by + 21, C.CIRCUIT);
    b(18 + rOff, by + 21, 6, 1, C.DARK); p(22 + rOff, by + 21, C.CIRCUIT);
    // Feet
    b(6 + lOff, by + 25, 8, 3, C.DARK); b(7 + lOff, by + 25, 6, 2, C.BODY);
    b(17 + rOff, by + 25, 8, 3, C.DARK); b(18 + rOff, by + 25, 6, 2, C.BODY);
  } else {
    drawDeathGlitch(p, b, f - 4, 16, 14);
  }
}

// 6: Botnet (Group) - synchronized small data sprites
function drawGroup(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID_SZ, GRID_SZ, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 9 + bob;
    // Smaller humanoid data sprite
    b(13, by, 6, 4, C.BODY); b(14, by, 4, 1, C.CIRCUIT); p(13, by, C.DIM);
    // Eyes
    b(14, by + 2, 2, 1, C.SCAN); p(14, by + 2, C.WHITE);
    b(17, by + 2, 2, 1, C.SCAN); p(17, by + 2, C.WHITE);
    // Torso
    b(11, by + 4, 10, 6, C.BODY);
    b(11, by + 4, 2, 6, C.DIM); b(19, by + 4, 2, 6, C.DARK);
    b(12, by + 4, 8, 1, C.CIRCUIT);
    // Core
    b(15, by + 6, 2, 2, C.CIRCUIT); p(15, by + 6, C.BRIGHT);
    // Code lines
    p(13, by + 6, C.CODE); p(18, by + 7, C.HACK);
    b(12, by + 8, 8, 1, C.DARK);
    // Arms
    b(9, by + 5, 2, 4, C.BODY); p(9, by + 5, C.DIM);
    b(21, by + 5, 2, 4, C.DARK);
    // Legs
    b(12 + lOff, by + 10, 3, 4, C.BODY); b(12 + lOff, by + 10, 1, 4, C.DIM);
    b(17 + rOff, by + 10, 3, 4, C.BODY); b(19 + rOff, by + 10, 1, 4, C.DARK);
    // Feet
    b(11 + lOff, by + 14, 4, 2, C.DARK);
    b(17 + rOff, by + 14, 4, 2, C.DARK);
  } else {
    drawDeathGlitch(p, b, f - 4, 16, 15);
  }
}

// 7: Fork Process (Splitter) - two execution threads visible
function drawSplitter(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID_SZ, GRID_SZ, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, 1][f];
    const wobX = [0, 1, 0, -1][f];
    const by = 5 + bob;
    const bx = wobX;
    // Head
    b(12 + bx, by, 8, 5, C.BODY); b(13 + bx, by, 6, 2, C.DIM);
    b(13 + bx, by, 6, 1, C.CIRCUIT);
    // Eyes
    b(13 + bx, by + 2, 2, 2, C.SCAN); p(14 + bx, by + 2, C.WHITE);
    b(17 + bx, by + 2, 2, 2, C.SCAN); p(18 + bx, by + 2, C.WHITE);
    // Neck
    b(13 + bx, by + 5, 6, 1, C.DARK);
    // Torso
    b(10 + bx, by + 6, 12, 8, C.BODY);
    b(10 + bx, by + 6, 2, 8, C.DIM); b(20 + bx, by + 6, 2, 8, C.DARK);
    b(11 + bx, by + 6, 10, 1, C.CIRCUIT);
    // Fork split line (bright vertical crack)
    b(15 + bx, by + 1, 2, 5, C.GLITCH);
    b(15 + bx, by + 6, 2, 8, C.GLITCH);
    p(14 + bx, by + 7, C.ERROR); p(17 + bx, by + 8, C.ERROR);
    p(13 + bx, by + 9, C.GLITCH); p(18 + bx, by + 10, C.GLITCH);
    // Fork glow
    p(15 + bx, by + 8, C.WHITE); p(16 + bx, by + 10, C.WHITE);
    // Duplicate thread indicators
    b(11 + bx, by + 8, 3, 1, C.CIRCUIT); b(18 + bx, by + 8, 3, 1, C.CIRCUIT);
    // Core
    b(15 + bx, by + 8, 2, 2, C.BRIGHT); p(15 + bx, by + 8, C.WHITE);
    // Arms
    b(8 + bx, by + 7, 2, 5, C.BODY); p(8 + bx, by + 7, C.DIM);
    b(22 + bx, by + 7, 2, 5, C.DARK);
    // Legs
    b(11, by + 14, 4, 5, C.BODY); b(11, by + 14, 1, 5, C.DIM);
    b(17 + bx, by + 14, 4, 5, C.BODY); b(20 + bx, by + 14, 1, 5, C.DARK);
    // Feet
    b(10, by + 19, 5, 2, C.DARK);
    b(16 + bx, by + 19, 5, 2, C.DARK);
  } else {
    drawDeathGlitch(p, b, f - 4, 16, 14);
  }
}

// 8: Encrypted Node (Shielded) - spinning encryption rings
function drawShielded(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID_SZ, GRID_SZ, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 5 + bob;
    // Standard data body
    b(12, by, 8, 5, C.BODY); b(13, by, 6, 2, C.DIM);
    b(13, by, 6, 1, C.CIRCUIT); p(12, by, C.DIM);
    b(13, by + 2, 2, 2, C.SCAN); p(14, by + 2, C.WHITE);
    b(17, by + 2, 2, 2, C.SCAN); p(18, by + 2, C.WHITE);
    b(10, by + 6, 12, 8, C.BODY);
    b(10, by + 6, 2, 8, C.DIM); b(20, by + 6, 2, 8, C.DARK);
    b(11, by + 6, 10, 1, C.CIRCUIT);
    b(14, by + 8, 4, 3, C.CIRCUIT); b(15, by + 9, 2, 1, C.BRIGHT);
    p(15, by + 8, C.WHITE);
    b(8, by + 7, 2, 5, C.BODY); p(8, by + 7, C.DIM);
    b(22, by + 7, 2, 5, C.DARK);
    b(11 + lOff, by + 14, 4, 5, C.BODY);
    b(17 + rOff, by + 14, 4, 5, C.BODY);
    b(10 + lOff, by + 19, 5, 2, C.DARK);
    b(17 + rOff, by + 19, 5, 2, C.DARK);
    // Spinning encryption rings
    const rot = f * 3;
    for (let i = 0; i < 24; i++) {
      const a = (i + rot) * Math.PI / 12;
      const rx = 16 + Math.round(Math.cos(a) * 12);
      const ry = by + 8 + Math.round(Math.sin(a) * 10);
      if (i % 6 === 0) {
        p(rx, ry, C.WHITE); p(rx + 1, ry, C.HACK); p(rx - 1, ry, C.HACK);
      } else if (i % 3 === 0) {
        p(rx, ry, C.HACK); p(rx, ry + 1, C.CODE);
      } else {
        p(rx, ry, i % 2 === 0 ? C.HACK : C.CODE);
      }
    }
    // Lock icons at cardinal points
    b(3, by + 7, 2, 2, C.CODE); p(3, by + 7, C.HACK);
    b(27, by + 7, 2, 2, C.CODE); p(28, by + 8, C.HACK);
    b(15, by - 3, 2, 2, C.CODE); p(15, by - 3, C.HACK);
    b(15, by + 20, 2, 2, C.CODE); p(16, by + 21, C.HACK);
  } else {
    drawDeathGlitch(p, b, f - 4, 16, 14);
  }
}

// 9: Glitch (Evasive) - heavily artifacted, teleporting
function drawEvasive(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID_SZ, GRID_SZ, PX);
  if (f <= 3) {
    const fx = [0, 5, -3, 3][f];
    const fy = [0, -3, 3, -1][f];
    const bx = 10 + fx, by = 7 + fy;
    // Glitchy rectangular shape with artifacts
    b(bx + 2, by, 6, 2, C.CIRCUIT);
    if (f !== 1) b(bx + 1, by + 2, 8, 2, C.BODY);
    else { p(bx + 1, by + 2, C.BODY); b(bx + 4, by + 2, 3, 2, C.BODY); p(bx + 8, by + 3, C.DIM); }
    if (f !== 2) b(bx, by + 4, 10, 3, C.BODY);
    else { b(bx, by + 4, 3, 3, C.BODY); p(bx + 5, by + 5, C.CIRCUIT); b(bx + 7, by + 4, 3, 3, C.BODY); }
    if (f !== 3) b(bx + 1, by + 7, 8, 2, C.BODY);
    else { p(bx + 1, by + 7, C.BODY); p(bx + 4, by + 7, C.DIM); b(bx + 6, by + 7, 3, 2, C.BODY); }
    b(bx + 2, by + 9, 6, 1, C.DARK);
    // Glitch color artifacts
    p(bx + 1, by + 3, C.GLITCH); p(bx + 8, by + 5, C.ERROR);
    p(bx + 3, by + 7, C.GLITCH); p(bx + 6, by + 2, C.ERROR);
    // Scan line eyes
    b(bx + 3, by + 3, 2, 2, C.SCAN); p(bx + 3, by + 3, C.WHITE);
    b(bx + 6, by + 3, 2, 2, C.SCAN); p(bx + 7, by + 3, C.WHITE);
    // Core
    b(bx + 4, by + 5, 2, 2, C.BRIGHT);
    p(bx + 4, by + 5, C.WHITE);
    // Ghost afterimages
    if (f === 1 || f === 3) {
      b(bx - 5, by + 3, 2, 2, C.DIM); b(bx - 5, by + 5, 2, 2, C.DARK);
      p(bx - 6, by + 4, C.GRID);
    }
    if (f === 2) {
      b(bx + 12, by + 3, 2, 2, C.DIM); b(bx + 12, by + 5, 2, 2, C.DARK);
    }
    // Static noise
    if (f === 0) { p(bx - 2, by + 2, C.STATIC); p(bx + 11, by + 7, C.STATIC); }
    if (f === 3) { p(bx + 11, by + 2, C.STATIC); p(bx - 2, by + 7, C.STATIC); }
  } else {
    drawDeathGlitch(p, b, f - 4, 16, 13);
  }
}

// 10: Backup Daemon (Regen) - restoring from cached state
function drawRegenerator(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID_SZ, GRID_SZ, PX);
  if (f <= 3) {
    const bob = [0, 0, -1, 0][f];
    const by = 5 + bob;
    const bright = f === 0 || f === 2;
    const bodyC = bright ? C.DIM : C.BODY;
    const hiC = bright ? C.CIRCUIT : C.DIM;
    const coreC = bright ? C.WHITE : C.BRIGHT;
    // Body with restore progress bars
    b(14, by, 4, 2, C.CIRCUIT); p(14, by, hiC);
    b(12, by + 2, 8, 3, bodyC);
    b(10, by + 5, 12, 6, bodyC);
    b(11, by + 11, 10, 4, bodyC);
    b(13, by + 15, 6, 2, C.BODY);
    p(15, by + 17, C.DARK);
    // Gradient shading
    b(10, by + 5, 2, 6, hiC);
    b(20, by + 5, 2, 6, C.DARK);
    b(11, by + 11, 2, 4, hiC); b(19, by + 11, 2, 4, C.DARK);
    // Restore progress bars
    b(11, by + 6, 8, 1, bright ? C.SCAN : C.CODE);
    b(11, by + 9, 6, 1, bright ? C.HACK : C.CODE);
    b(12, by + 12, 4, 1, bright ? C.PIXEL : C.CODE);
    // Pulsing cache core
    b(14, by + 7, 4, 3, coreC); b(13, by + 8, 6, 1, bright ? C.BRIGHT : C.CIRCUIT);
    p(15, by + 7, C.WHITE); p(16, by + 7, C.WHITE);
    // Restore particles
    if (bright) {
      p(9, by + 6, C.SCAN); p(22, by + 7, C.SCAN);
      p(15, by + 13, C.BRIGHT);
    }
    // Eyes
    b(13, by + 3, 2, 2, C.SCAN); p(13, by + 3, C.WHITE);
    b(17, by + 3, 2, 2, C.SCAN); p(17, by + 3, C.WHITE);
    // Cached data fragments floating
    b(8, by + 8, 1, 2, C.CIRCUIT); p(8, by + 7, hiC);
    b(23, by + 9, 1, 2, C.CODE);
    // Bottom shadow
    b(13, by + 15, 6, 1, C.DARK);
    // Bioluminescent data spots
    p(11, by + 7, bright ? C.WHITE : C.CIRCUIT);
    p(19, by + 7, bright ? C.WHITE : C.CIRCUIT);
  } else {
    drawDeathGlitch(p, b, f - 4, 16, 11);
  }
}

// 11: Drone Signal (Flying) - antenna/satellite broadcasting
function drawFlying(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID_SZ, GRID_SZ, PX);
  if (f <= 3) {
    const wingY = [0, 2, 4, 2][f];
    const by = 8;
    // Satellite body (horizontal)
    b(10, by + 5, 12, 4, C.BODY);
    b(10, by + 5, 12, 1, C.DIM); b(10, by + 8, 12, 1, C.DARK);
    // Tail
    b(8, by + 7, 2, 2, C.BODY);
    b(6, by + 7, 2, 2, C.DARK);
    p(5, by + 7, C.CIRCUIT); p(5, by + 8, C.HACK);
    // Head
    b(20, by + 4, 4, 3, C.BODY); b(20, by + 4, 4, 1, C.DIM);
    // Antenna
    b(24, by + 3, 2, 2, C.CIRCUIT); p(26, by + 3, C.SCAN); p(26, by + 4, C.HACK);
    // Broadcast waves from antenna
    p(27, by + 2, C.SCAN); p(28, by + 1, C.CODE);
    p(27, by + 5, C.SCAN); p(28, by + 6, C.CODE);
    // Eye/sensor
    b(22, by + 4, 2, 1, C.SCAN); p(22, by + 4, C.WHITE);
    // Data pattern on body
    b(13, by + 5, 3, 2, C.CIRCUIT); b(14, by + 6, 2, 1, C.BRIGHT);
    p(14, by + 5, C.WHITE);
    b(10, by + 5, 2, 4, C.DIM);
    // Status LEDs
    p(12, by + 6, C.PIXEL); p(16, by + 6, C.SCAN); p(18, by + 6, C.HACK);
    // Top solar panel / wing
    b(10, by + 2 + wingY, 8, 2, C.SCREEN);
    b(10, by + 2 + wingY, 8, 1, C.CIRCUIT);
    b(8, by + 1 + wingY, 4, 1, C.DIM);
    b(6, by + wingY, 3, 1, C.CODE);
    p(11, by + 3 + wingY, C.HACK); p(14, by + 3 + wingY, C.HACK);
    // Bottom panel
    b(10, by + 10 - wingY, 8, 2, C.SCREEN);
    b(10, by + 11 - wingY, 8, 1, C.DARK);
    b(8, by + 11 - wingY, 4, 1, C.DIM);
    b(6, by + 12 - wingY, 3, 1, C.DARK);
    // Shadow
    b(12, by + 16, 6, 1, C.DARK); b(13, by + 17, 4, 1, C.DARK);
  } else {
    drawDeathGlitch(p, b, f - 4, 16, 12);
  }
}

// Helper: draw mage-type digital entity base
function drawMageBase(
  p: (x: number, y: number, cl: string) => void,
  b: (x: number, y: number, w: number, h: number, cl: string) => void,
  f: number, accentC: string, staffC: string, bodyMod?: string
) {
  const bob = [0, -1, 0, -1][f];
  const lOff = [0, 1, 0, -1][f];
  const rOff = [0, -1, 0, 1][f];
  const by = 4 + bob;
  const iron = bodyMod === 'iron';
  const mist = bodyMod === 'mist';
  const bodyC = iron ? C.SCREEN : mist ? C.STATIC : C.BODY;
  const hiC = iron ? C.STATIC : mist ? C.DATA : C.DIM;
  const dkC = iron ? C.DARK : mist ? C.GRID : C.DARK;
  const robeHi = iron ? C.STATIC : mist ? C.DATA : C.DIM;
  const robeMid = iron ? C.SCREEN : mist ? C.STATIC : C.GRID;

  // Hooded head (digital cloak)
  b(14, by, 4, 1, C.CIRCUIT);
  b(13, by + 1, 6, 1, dkC); b(14, by + 1, 4, 1, robeHi);
  b(12, by + 2, 8, 3, dkC);
  b(12, by + 2, 2, 3, robeHi); b(19, by + 3, 1, 2, C.DARK);
  // Hood detail
  p(14, by + 2, robeMid); p(17, by + 2, robeMid);
  // Face void
  b(13, by + 3, 6, 2, C.DARK); b(14, by + 3, 4, 1, C.SCREEN);
  // Scan line eyes
  b(14, by + 4, 2, 1, accentC); p(14, by + 4, C.WHITE);
  b(17, by + 4, 2, 1, accentC); p(17, by + 4, C.WHITE);
  // Robe body
  b(12, by + 5, 8, 4, bodyC);
  b(12, by + 5, 2, 4, robeHi); b(19, by + 5, 1, 4, dkC);
  b(10, by + 9, 12, 4, bodyC);
  b(10, by + 9, 2, 4, robeHi); b(11, by + 9, 1, 3, robeMid);
  b(20, by + 9, 2, 4, dkC);
  b(9, by + 13, 14, 4, bodyC);
  b(9, by + 13, 2, 4, robeHi);
  b(21, by + 13, 2, 4, dkC);
  b(8, by + 17, 16, 2, dkC);
  b(8, by + 17, 2, 2, robeMid);
  b(22, by + 17, 2, 2, C.DARK);
  // Robe hem
  b(8, by + 19, 16, 1, C.DARK);
  // Code lines on robe
  p(14, by + 9, accentC); p(15, by + 10, accentC);
  p(16, by + 11, accentC); p(16, by + 12, accentC);
  // Robe folds
  p(12, by + 12, robeMid); p(19, by + 12, dkC);
  p(11, by + 15, robeMid); p(20, by + 15, dkC);
  // Staff
  b(22, by + 1, 2, 16, iron ? C.STATIC : C.DIM);
  b(22, by + 1, 1, 16, iron ? C.SCREEN : C.GRID);
  // Staff top
  b(21, by - 1, 4, 2, staffC); b(22, by - 1, 2, 1, C.WHITE);
  p(21, by - 2, accentC); p(24, by - 2, accentC);
  p(22, by - 3, C.WHITE); p(23, by - 3, C.WHITE);
  // Staff bands
  p(22, by + 5, staffC); p(22, by + 9, staffC); p(22, by + 13, staffC);
  // Left arm
  b(9, by + 7 + lOff, 3, 2, bodyC); b(9, by + 7 + lOff, 1, 2, robeHi);
  p(8, by + 8 + lOff, bodyC);
  // Feet
  b(11 + lOff, by + 19, 3, 2, bodyC); b(11 + lOff, by + 20, 3, 1, dkC);
  b(18 + rOff, by + 19, 3, 2, dkC); b(18 + rOff, by + 20, 3, 1, C.DARK);
}

// 12: Security Admin (Iron Mage) - firewall staff, locks
function drawMageIron(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID_SZ, GRID_SZ, PX);
  if (f <= 3) {
    drawMageBase(p, b, f, C.STATIC, C.SCREEN, 'iron');
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    // Firewall armor plates
    b(12, by + 7, 8, 2, C.SCREEN);
    b(13, by + 7, 6, 1, C.STATIC);
    // Shoulder firewalls
    b(10, by + 9, 3, 2, C.STATIC); b(10, by + 9, 1, 2, C.DATA);
    b(19, by + 9, 3, 2, C.SCREEN);
    // Lock belt
    b(14, by + 12, 4, 2, C.STATIC); b(15, by + 12, 2, 1, C.DATA);
    // Lock icon detail
    p(15, by + 12, C.HACK); p(16, by + 12, C.HACK);
    p(10, by + 16, C.SCREEN); p(21, by + 16, C.SCREEN);
  } else {
    drawDeathGlitch(p, b, f - 4, 16, 14);
  }
}

// 13: Overclocker (Haste) - speed gauges, clock symbols
function drawMageHaste(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID_SZ, GRID_SZ, PX);
  if (f <= 3) {
    drawMageBase(p, b, f, C.SCAN, C.HACK, undefined);
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    // Speed data streams trailing
    b(5, by + 5, 3, 1, C.SCAN); b(3, by + 5, 2, 1, C.HACK);
    b(4, by + 9, 4, 1, C.HACK); p(2, by + 9, C.SCAN);
    b(5, by + 13, 3, 1, C.SCAN); p(3, by + 13, C.HACK);
    b(6, by + 16, 2, 1, C.SCAN);
    // Clock symbol particles
    if (f % 2 === 0) {
      p(2, by + 3, C.HACK); p(1, by + 7, C.SCAN);
      b(3, by + 11, 2, 1, C.HACK);
    } else {
      p(3, by + 4, C.SCAN); p(2, by + 8, C.HACK);
      b(4, by + 12, 2, 1, C.SCAN);
    }
    // Motion blur
    p(1, by + 6, C.GRID); p(0, by + 10, C.DIM);
  } else {
    drawDeathGlitch(p, b, f - 4, 16, 14);
  }
}

// 14: Obfuscator (Mist) - scrambled data cloud
function drawMageMist(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID_SZ, GRID_SZ, PX);
  if (f <= 3) {
    drawMageBase(p, b, f, C.DATA, C.STATIC, 'mist');
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    const mx = [5, 7, 3, 8][f];
    const my = [7, 11, 5, 9][f];
    // Scrambled data clouds
    b(mx, by + my, 2, 1, C.DATA); p(mx + 2, by + my + 1, C.STATIC);
    b(mx + 16, by + my - 2, 2, 1, C.STATIC); p(mx + 18, by + my - 1, C.DATA);
    // Random character noise
    b(25, by + 3, 2, 1, C.DATA); p(26, by + 4, C.STATIC);
    b(4, by + 15, 3, 1, C.STATIC); p(3, by + 16, C.DATA);
    if (f === 1 || f === 3) {
      b(3, by + 14, 2, 1, C.STATIC); p(2, by + 15, C.DATA);
      p(27, by + 8, C.STATIC);
    }
    if (f === 0 || f === 2) {
      p(26, by + 6, C.DATA); p(5, by + 10, C.STATIC);
    }
  } else {
    drawDeathGlitch(p, b, f - 4, 16, 14);
  }
}

// 15: Sys Restore (Heal) - green restore-point aura
function drawMageHeal(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID_SZ, GRID_SZ, PX);
  if (f <= 3) {
    drawMageBase(p, b, f, C.PIXEL, C.HACK, undefined);
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    // Staff gem glow (green restore)
    p(22, by - 3, C.PIXEL); p(23, by - 3, C.PIXEL);
    b(21, by - 1, 4, 1, C.PIXEL); p(21, by - 2, C.HACK);
    p(24, by - 2, C.HACK);
    // Restore-point particles from left hand
    const px_ = [7, 5, 8, 6][f];
    b(px_, by + 5, 2, 1, C.PIXEL); p(px_ + 2, by + 4, C.HACK);
    p(px_ - 1, by + 6, C.PIXEL);
    // Restore cross symbol
    b(24, by + 5, 2, 1, C.PIXEL);
    b(25, by + 4, 1, 3, C.PIXEL);
    p(25, by + 3, C.HACK); p(25, by + 7, C.HACK);
    p(23, by + 5, C.HACK); p(26, by + 5, C.HACK);
    // Extra restore sparkles
    if (f % 2 === 0) {
      p(6, by + 3, C.PIXEL); p(8, by + 8, C.HACK);
    } else {
      p(7, by + 2, C.HACK); p(5, by + 7, C.PIXEL);
    }
  } else {
    drawDeathGlitch(p, b, f - 4, 16, 14);
  }
}

// ===== DRAW ALL CREEPS =====
const DRAW_FNS = [
  drawStandard, drawFast, drawArmored, drawSwarm, drawHealer, drawBoss,
  drawGroup, drawSplitter, drawShielded, drawEvasive, drawRegenerator, drawFlying,
  drawMageIron, drawMageHaste, drawMageMist, drawMageHeal,
];

function drawAllCreeps(ctx: CanvasRenderingContext2D) {
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const frame = row;
      DRAW_FNS[col](ctx, [col * CELL, row * CELL], frame);
    }
  }
}

// ===== COMPONENT =====
export default function CypherpunkCreepSprites() {
  const sheetRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sc = sheetRef.current!;
    sc.width = SHEET_W;
    sc.height = SHEET_H;
    const sctx = sc.getContext('2d')!;
    sctx.imageSmoothingEnabled = false;
    drawAllCreeps(sctx);

    const pv = previewRef.current!;
    const S = 3;
    const LW = 72;
    const LH = 14;
    pv.width = LW + COLS * CELL * S;
    pv.height = ROWS * (CELL * S + LH) + 10;
    const pc = pv.getContext('2d')!;
    pc.imageSmoothingEnabled = false;
    pc.fillStyle = '#081210';
    pc.fillRect(0, 0, pv.width, pv.height);

    for (let r = 0; r < ROWS; r++) {
      const by = r * (CELL * S + LH) + 5;
      pc.fillStyle = '#22ddaa';
      pc.font = 'bold 9px monospace';
      pc.fillText(ROW_NAMES[r], 3, by + CELL * S / 2 + 3);

      for (let cc = 0; cc < COLS; cc++) {
        const bx = LW + cc * CELL * S;
        pc.save();
        pc.translate(bx, by);
        pc.scale(S, S);
        pc.drawImage(sc, cc * CELL, r * CELL, CELL, CELL, 0, 0, CELL, CELL);
        pc.restore();
        pc.strokeStyle = '#1a2a2a';
        pc.strokeRect(bx, by, CELL * S, CELL * S);
        if (r === 0) {
          pc.fillStyle = '#66aa99';
          pc.font = '7px monospace';
          pc.fillText(CREEP_NAMES[cc], bx + 1, by - 2);
        }
      }
    }

    setReady(true);
  }, []);

  const download = useCallback((ref: React.RefObject<HTMLCanvasElement>, name: string) => () => {
    const a = document.createElement('a');
    a.download = name;
    a.href = ref.current!.toDataURL('image/png');
    a.click();
  }, []);

  const [view, setView] = useState<'preview' | 'actual'>('preview');

  return (
    <div style={{ background: '#081210', minHeight: '100vh', padding: 12, fontFamily: 'monospace' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <h2 style={{ color: C.CIRCUIT, margin: 0, fontSize: 15 }}>CYPHERPUNK FACTION — Creep Spritesheet</h2>
        {ready && (
          <button
            onClick={download(sheetRef, 'cypherpunk_creeps.png')}
            style={{
              background: C.CIRCUIT, color: '#000', border: 'none', padding: '5px 14px',
              borderRadius: 3, cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold', fontSize: 11,
            }}
          >
            Download PNG
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
        {(['preview', 'actual'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              background: view === v ? '#1a2a2a' : '#111',
              color: view === v ? C.CIRCUIT : '#445566',
              border: `1px solid ${view === v ? '#334' : '#222'}`,
              padding: '4px 8px', borderRadius: 3, cursor: 'pointer',
              fontFamily: 'monospace', fontSize: 10, textTransform: 'capitalize',
            }}
          >
            {v === 'actual' ? 'Actual Size' : 'Preview (3x)'}
          </button>
        ))}
      </div>
      <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '75vh' }}>
        <canvas
          ref={previewRef}
          data-label="Cypherpunk Creeps (Preview)"
          data-frame-size="64x64"
          data-direction="right"
          data-columns='["Data Sprite (Standard)","Packet Runner (Fast)","Firewall Golem (Armored)","Bit Fragment (Swarm)","Patch Daemon (Healer)","Mainframe Entity (Boss)","Botnet (Group)","Fork Process (Splitter)","Encrypted Node (Shielded)","Glitch (Evasive)","Backup Daemon (Regen)","Drone Signal (Flying)","Security Admin (Iron)","Overclocker (Haste)","Obfuscator (Mist)","Sys Restore (Heal)"]'
          data-rows='["Walk 1","Walk 2","Walk 3","Walk 4","Death 1","Death 2","Death 3"]'
          data-presets='[{"name":"Walk","startRow":0,"endRow":3},{"name":"Death","startRow":4,"endRow":6}]'
          style={{ display: view === 'preview' ? 'block' : 'none', maxWidth: '100%' }}
        />
        <canvas
          ref={sheetRef}
          data-label="Cypherpunk Creeps"
          data-frame-size="64x64"
          data-direction="right"
          data-columns='["Data Sprite (Standard)","Packet Runner (Fast)","Firewall Golem (Armored)","Bit Fragment (Swarm)","Patch Daemon (Healer)","Mainframe Entity (Boss)","Botnet (Group)","Fork Process (Splitter)","Encrypted Node (Shielded)","Glitch (Evasive)","Backup Daemon (Regen)","Drone Signal (Flying)","Security Admin (Iron)","Overclocker (Haste)","Obfuscator (Mist)","Sys Restore (Heal)"]'
          data-rows='["Walk 1","Walk 2","Walk 3","Walk 4","Death 1","Death 2","Death 3"]'
          data-presets='[{"name":"Walk","startRow":0,"endRow":3},{"name":"Death","startRow":4,"endRow":6}]'
          style={{
            display: view === 'actual' ? 'block' : 'none',
            imageRendering: 'pixelated',
            width: SHEET_W * 2,
            border: '1px solid #1a2a2a',
          }}
        />
      </div>
      <div style={{ color: '#335544', fontSize: 9, marginTop: 10, maxWidth: 700 }}>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#22ddaa' }}>Sheet:</b> {SHEET_W}x{SHEET_H}px ({COLS} cols x {ROWS} rows) — {CELL}x{CELL} cells
        </p>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#22ddaa' }}>Phaser:</b>{' '}
          <code style={{ color: C.BRIGHT }}>
            {"this.load.spritesheet('cypherpunk_creeps','cypherpunk_creeps.png',{frameWidth:64,frameHeight:64})"}
          </code>
        </p>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#22ddaa' }}>Layout:</b> 16 cols (creep types) x 7 rows (walk0-3, death0-2). Frame index = row * 16 + col.
        </p>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#22ddaa' }}>Types:</b> {CREEP_NAMES.join(', ')}
        </p>
      </div>
    </div>
  );
}
