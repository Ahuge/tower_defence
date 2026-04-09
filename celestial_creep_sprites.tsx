import { useRef, useEffect, useState, useCallback } from "react";

// ===== CELESTIAL CREEP PALETTE =====
const C = {
  ROBE: '#ddddcc',
  GOLD: '#ddaa44',
  BGOLD: '#ffcc66',
  DKGOLD: '#aa8833',
  ARMOR: '#ccccbb',
  PLATE: '#eeeecc',
  HALO: '#ffdd88',
  HOLY: '#ffffcc',
  SKIN: '#ffe0c0',
  DKROBE: '#aaaaaa',
  SHADOW: '#888888',
  BLUE: '#aaccff',
  DIVINE: '#ffffff',
  WING: '#dddddd',
  DKWING: '#aaaaaa',
  CROSS: '#ffcc44',
  // Extra shading
  MID: '#ccccaa',
  LROBE: '#eeeedd',
  DKPLATE: '#bbbb99',
  WHITE: '#ffffff',
  GREEN: '#88ff88', // heal color
  DKGREEN: '#44aa44',
  // Boss accent colors
  DIVFIRE: '#aaccff', // divine blue fire
  DKDIVFIRE: '#6699cc', // dark divine fire
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
const PX = 2, GRID = 32, CELL = GRID * PX; // 64x64 pixel cells
const COLS = 16; // 16 creep types
const ROWS = 7;  // walk0-3, death0-2
const SHEET_W = COLS * CELL; // 1024
const SHEET_H = ROWS * CELL; // 448

const CREEP_NAMES = [
  'Acolyte', 'Seraph Scout', 'Temple Guardian', 'Light Mote', 'Cleric', 'Archangel',
  'Choir', 'Twin Vessel', 'Faith Guard', 'Wisp Angel', 'Martyr', 'Cherub',
  'Wardkeeper', 'Herald', 'Veiled Saint', 'High Priest'
];
const ROW_NAMES = ['Walk 0', 'Walk 1', 'Walk 2', 'Walk 3', 'Death 0', 'Death 1', 'Death 2'];

// ===== CREEP DRAW FUNCTIONS =====

// 0: Acolyte (Standard) - robed figure with small halo, folded wings, golden light particles
function drawAcolyte(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 5 + bob;
    // Halo
    b(13, by - 2, 6, 1, C.HALO); b(14, by - 3, 4, 1, C.BGOLD);
    p(13, by - 2, C.BGOLD); p(18, by - 2, C.BGOLD);
    // Head
    b(12, by, 8, 5, C.SKIN); b(13, by, 6, 2, C.SKIN);
    p(12, by, C.SKIN); b(19, by + 3, 1, 2, C.DKROBE);
    // Eyes
    b(13, by + 2, 2, 2, C.BLUE); p(14, by + 2, C.WHITE);
    b(17, by + 2, 2, 2, C.BLUE); p(18, by + 2, C.WHITE);
    // Neck
    b(13, by + 5, 6, 1, C.DKROBE);
    // Small folded wings (2-3px bumps on back, behind shoulders)
    // Left wing bump
    p(8, by + 5, C.WING); p(7, by + 6, C.WING); p(8, by + 6, C.DIVINE);
    p(7, by + 7, C.DKWING); p(8, by + 7, C.WING);
    // Right wing bump
    p(23, by + 5, C.DKWING); p(24, by + 6, C.DKWING); p(23, by + 6, C.WING);
    p(24, by + 7, C.SHADOW); p(23, by + 7, C.DKWING);
    // Torso (robed)
    b(10, by + 6, 12, 8, C.ROBE);
    b(10, by + 6, 2, 8, C.LROBE); b(20, by + 6, 2, 8, C.DKROBE);
    b(11, by + 6, 10, 1, C.PLATE);
    // Golden trim
    b(12, by + 6, 8, 1, C.GOLD); b(13, by + 6, 6, 1, C.BGOLD);
    p(14, by + 9, C.GOLD); p(15, by + 10, C.GOLD);
    // Belt
    b(12, by + 12, 8, 1, C.GOLD);
    // Arms
    b(8, by + 7, 2, 5, C.ROBE); p(8, by + 7, C.LROBE);
    b(22, by + 7, 2, 5, C.DKROBE);
    // Hands
    b(7, by + 12, 2, 2, C.SKIN);
    b(23, by + 12, 2, 2, C.SKIN);
    // Lower robe
    b(10, by + 13, 12, 6, C.ROBE);
    b(10, by + 13, 2, 6, C.LROBE); b(20, by + 13, 2, 6, C.DKROBE);
    b(9, by + 17, 14, 2, C.DKROBE);
    // Robe hem
    b(9, by + 19, 14, 1, C.SHADOW);
    // Feet
    b(11 + lOff, by + 19, 3, 2, C.DKROBE);
    b(18 + rOff, by + 19, 3, 2, C.SHADOW);
    // Golden light particles (floating around the acolyte)
    const pOff = [0, 1, 2, 1][f];
    p(6, by + 2 + pOff, C.HOLY); p(25, by + 3 - pOff, C.HOLY);
    p(9, by + 14 + (f % 2), C.BGOLD); p(22, by + 15 - (f % 2), C.BGOLD);
    if (f % 2 === 0) { p(5, by + 8, C.HALO); p(26, by + 10, C.HALO); }
    else { p(6, by + 10, C.HALO); p(25, by + 8, C.HALO); }
  } else {
    drawDeathCelestial(p, b, f - 4, 16, 14);
  }
}

// 1: Seraph Scout (Fast) - lean angel with tucked wings
function drawSeraphScout(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -2, 2, 0][f];
    const by = 8 + bob;
    // Lean body shape
    b(14, by, 4, 2, C.SKIN); p(14, by, C.SKIN);
    b(13, by + 2, 6, 3, C.ARMOR);
    b(12, by + 5, 8, 4, C.ARMOR);
    b(13, by + 9, 6, 3, C.ROBE);
    p(15, by + 12, C.DKROBE);
    // Head
    b(14, by - 2, 4, 2, C.SKIN); p(14, by - 2, C.SKIN);
    // Halo (small)
    b(14, by - 4, 4, 1, C.HALO); p(13, by - 3, C.BGOLD); p(18, by - 3, C.BGOLD);
    // Eyes
    p(14, by - 1, C.BLUE); p(17, by - 1, C.BLUE);
    // Tucked wings (behind, small)
    b(8, by + 3, 4, 2, C.WING); b(8, by + 3, 2, 1, C.DIVINE);
    b(20, by + 3, 4, 2, C.DKWING); p(23, by + 4, C.SHADOW);
    // Gradient shading
    b(12, by + 5, 2, 4, C.PLATE); b(18, by + 5, 2, 4, C.DKROBE);
    // Speed trails
    const trail = [1, 3, 0, 2][f];
    b(7, by + 4 + trail, 3, 1, C.HOLY); p(5, by + 5, C.HALO);
    b(4, by + 4, 2, 1, C.BGOLD); p(3, by + 5 + trail, C.DKGOLD);
    b(1, by + 4, 2, 1, C.DKGOLD);
    if (f % 2 === 0) {
      p(2, by + 3, C.HALO); p(6, by + 6, C.BGOLD);
    } else {
      p(3, by + 6, C.HALO); p(5, by + 3, C.BGOLD);
    }
  } else {
    drawDeathCelestial(p, b, f - 4, 16, 14);
  }
}

// 2: Temple Guardian (Armored) - paladin with heavy gold/white plate, light energy sword, heavier armor detail
function drawTempleGuardian(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, 0, -1, 0][f];
    const lOff = [0, 0, 1, 0][f];
    const rOff = [0, 0, 0, 1][f];
    const by = 4 + bob;
    // Wide hexagonal armored body (heavier plate detail)
    b(8, by, 16, 2, C.PLATE); b(9, by, 14, 1, C.DIVINE);
    b(7, by + 2, 18, 4, C.ARMOR);
    b(6, by + 6, 20, 6, C.PLATE);
    b(7, by + 12, 18, 3, C.ARMOR);
    b(9, by + 15, 14, 2, C.DKPLATE);
    // Shading
    b(6, by + 2, 2, 10, C.LROBE); b(7, by + 3, 1, 8, C.PLATE);
    b(24, by + 2, 2, 10, C.DKROBE); b(25, by + 4, 1, 8, C.SHADOW);
    b(8, by, 16, 2, C.LROBE);
    b(9, by + 15, 14, 2, C.DKROBE);
    // Gold trim lines (more ornate)
    b(10, by + 3, 12, 1, C.GOLD); b(11, by + 3, 10, 1, C.BGOLD);
    b(10, by + 8, 12, 1, C.DKGOLD);
    b(10, by + 11, 12, 1, C.DKGOLD);
    // Additional plate lines for heavier armor feel
    b(8, by + 5, 16, 1, C.DKPLATE); b(9, by + 5, 14, 1, C.ARMOR);
    b(8, by + 10, 16, 1, C.DKPLATE);
    // Gold rivets (more of them)
    p(8, by + 4, C.GOLD); p(23, by + 4, C.GOLD);
    p(8, by + 6, C.GOLD); p(23, by + 6, C.GOLD);
    p(8, by + 9, C.GOLD); p(23, by + 9, C.GOLD);
    p(10, by + 12, C.BGOLD); p(21, by + 12, C.BGOLD);
    // Face/visor
    b(11, by + 2, 2, 2, C.BLUE); p(12, by + 2, C.WHITE);
    b(19, by + 2, 2, 2, C.BLUE); p(20, by + 2, C.WHITE);
    b(12, by + 4, 8, 2, C.SHADOW); b(13, by + 4, 6, 1, C.DKROBE);
    // Halo
    b(12, by - 2, 8, 1, C.HALO); b(13, by - 3, 6, 1, C.BGOLD);
    // Cross emblem on chest (larger, more ornate)
    b(15, by + 6, 2, 4, C.CROSS); b(14, by + 7, 4, 2, C.CROSS);
    p(15, by + 7, C.BGOLD); p(16, by + 8, C.DKGOLD);
    p(14, by + 6, C.DIVINE); p(17, by + 9, C.DKGOLD);
    // Shield on left side (tower shield, bigger)
    b(2, by + 4, 4, 8, C.GOLD); b(2, by + 4, 1, 8, C.BGOLD);
    b(5, by + 5, 1, 6, C.DKGOLD);
    p(3, by + 6, C.CROSS); p(4, by + 7, C.CROSS);
    p(3, by + 8, C.CROSS); p(4, by + 9, C.CROSS);
    b(3, by + 5, 2, 1, C.DIVINE); // shield top highlight
    // === LIGHT ENERGY SWORD (held to the right side) ===
    // Blade (bright gold/white, glowing)
    b(26, by + 2, 2, 10, C.BGOLD); b(26, by + 2, 1, 10, C.DIVINE);
    p(27, by + 3, C.HOLY); p(26, by + 4, C.WHITE);
    p(27, by + 6, C.HOLY); p(26, by + 8, C.WHITE);
    // Blade glow aura
    p(25, by + 3, C.HALO); p(28, by + 5, C.HALO);
    p(25, by + 7, C.HALO); p(28, by + 9, C.HALO);
    // Blade tip
    p(26, by + 1, C.WHITE); p(27, by + 1, C.DIVINE);
    p(26, by, C.HOLY);
    // Hilt (ornate gold)
    b(25, by + 12, 4, 2, C.DKGOLD); b(26, by + 12, 2, 1, C.GOLD);
    p(25, by + 12, C.BGOLD); p(28, by + 12, C.BGOLD);
    // Legs
    b(10 + lOff, by + 17, 4, 4, C.PLATE);
    b(10 + lOff, by + 17, 1, 4, C.LROBE); b(13 + lOff, by + 17, 1, 4, C.DKROBE);
    b(18 + rOff, by + 17, 4, 4, C.PLATE);
    b(21 + rOff, by + 17, 1, 4, C.DKROBE);
    // Knee guards
    p(11 + lOff, by + 19, C.GOLD); p(19 + rOff, by + 19, C.GOLD);
    // Feet
    b(9 + lOff, by + 21, 6, 2, C.DKROBE); b(9 + lOff, by + 21, 2, 1, C.PLATE);
    b(17 + rOff, by + 21, 6, 2, C.DKROBE);
    // Light particles from sword
    const sOff = [0, 1, 0, -1][f];
    p(29, by + 4 + sOff, C.HOLY); p(24, by + 6 - sOff, C.HOLY);
  } else {
    drawDeathCelestial(p, b, f - 4, 16, 14);
  }
}

// 3: Light Mote (Swarm) - tiny floating golden spark
function drawLightMote(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const jx = [0, 2, -2, 0][f];
    const jy = [0, 0, 2, -2][f];
    const bx = 12 + jx, by = 11 + jy;
    // Golden spark body
    p(bx + 3, by, C.DIVINE);
    b(bx + 2, by + 1, 4, 1, C.BGOLD);
    b(bx + 1, by + 2, 6, 2, C.GOLD);
    b(bx, by + 4, 8, 2, C.HALO);
    b(bx + 1, by + 6, 6, 1, C.GOLD);
    b(bx + 2, by + 7, 4, 1, C.DKGOLD);
    p(bx + 3, by + 8, C.DKGOLD);
    // Shading
    b(bx, by + 4, 1, 2, C.BGOLD); b(bx + 7, by + 4, 1, 2, C.DKGOLD);
    p(bx + 2, by + 3, C.BGOLD); p(bx + 5, by + 5, C.DKGOLD);
    // Core
    b(bx + 3, by + 3, 2, 2, C.DIVINE); p(bx + 3, by + 3, C.WHITE);
    // Halo ring
    p(bx - 1, by + 3, C.HALO); p(bx + 7, by + 3, C.HALO);
    p(bx + 3, by - 1, C.HALO); p(bx + 3, by + 9, C.HALO);
    // Sparkle
    p(bx + 6, by, C.HOLY); p(bx - 1, by + 2, C.BGOLD);
    if (f % 2 === 0) p(bx + 1, by - 1, C.HOLY);
  } else {
    drawDeathCelestial(p, b, f - 4, 16, 15);
  }
}

// 4: Cleric (Healer) - robed with staff, cross symbol, green/gold
function drawCleric(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -2, 0, 2][f];
    const by = 4 + bob;
    // Head
    b(13, by + 2, 6, 4, C.SKIN); p(13, by + 2, C.SKIN);
    // Halo
    b(13, by, 6, 1, C.HALO); b(14, by - 1, 4, 1, C.BGOLD);
    // Eyes
    b(14, by + 4, 2, 1, C.BLUE); p(14, by + 4, C.WHITE);
    b(17, by + 4, 2, 1, C.BLUE); p(17, by + 4, C.WHITE);
    // Robe body
    b(12, by + 6, 8, 4, C.ROBE);
    b(12, by + 6, 2, 4, C.LROBE); b(19, by + 6, 1, 4, C.DKROBE);
    b(10, by + 10, 12, 4, C.ROBE);
    b(10, by + 10, 2, 4, C.LROBE); b(20, by + 10, 2, 4, C.DKROBE);
    b(9, by + 14, 14, 4, C.ROBE);
    b(9, by + 14, 2, 4, C.LROBE); b(21, by + 14, 2, 4, C.DKROBE);
    b(8, by + 18, 16, 2, C.DKROBE);
    b(8, by + 20, 16, 1, C.SHADOW);
    // Cross on chest
    b(15, by + 7, 2, 3, C.CROSS); b(14, by + 8, 4, 1, C.CROSS);
    p(15, by + 8, C.BGOLD);
    // Staff
    b(22, by + 2, 2, 16, C.DKGOLD);
    b(22, by + 2, 1, 16, C.GOLD);
    // Staff top cross
    b(21, by, 4, 2, C.CROSS); b(22, by - 1, 2, 4, C.CROSS);
    p(22, by, C.BGOLD); p(23, by + 1, C.DKGOLD);
    // Heal glow ring
    const pulse = [0, 1, 0, -1][f];
    for (let i = 0; i < 12; i++) {
      const a = (i + f * 2) * Math.PI / 6;
      const rx = 16 + Math.round(Math.cos(a) * 9);
      const ry = by + 10 + Math.round(Math.sin(a) * 7);
      p(rx, ry, i % 3 === 0 ? C.GREEN : C.DKGREEN);
    }
    // Cardinal heal points
    p(6, by + 9 + pulse, C.GREEN); p(25, by + 9 - pulse, C.GREEN);
    // Robe detail
    p(14, by + 10, C.GOLD); p(15, by + 11, C.GOLD);
    // Feet
    b(11, by + 20, 3, 2, C.DKROBE);
    b(18, by + 20, 3, 2, C.SHADOW);
  } else {
    drawDeathCelestial(p, b, f - 4, 16, 13);
  }
}

// 5: Archangel (Boss) - Massive winged warrior, multi-layered halo (3 rings), flaming golden sword, full plate with divine runes, extended wings reaching frame edges, blue divine fire
function drawArchangel(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, 0, -1, 0][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 1 + bob;
    const haloGlow = f % 2 === 0;

    // === MULTI-LAYERED HALO (3 concentric rings, glowing) ===
    // Outer ring
    b(8, by - 4, 16, 1, C.HALO); p(7, by - 3, C.DKGOLD); p(24, by - 3, C.DKGOLD);
    // Middle ring
    b(10, by - 5, 12, 1, C.BGOLD); p(9, by - 4, C.BGOLD); p(22, by - 4, C.BGOLD);
    // Inner ring (brightest)
    b(12, by - 6, 8, 1, haloGlow ? C.DIVINE : C.HOLY);
    p(11, by - 5, haloGlow ? C.DIVINE : C.BGOLD); p(20, by - 5, haloGlow ? C.DIVINE : C.BGOLD);
    // Halo top glow
    p(15, by - 7, haloGlow ? C.DIVINE : C.HOLY); p(16, by - 7, haloGlow ? C.DIVINE : C.HOLY);

    // === HEAD (noble, armored) ===
    b(10, by, 12, 5, C.SKIN);
    b(10, by, 12, 2, C.SKIN); b(10, by, 2, 5, C.SKIN);
    b(20, by + 3, 2, 2, C.DKROBE);
    // Eyes (glowing divine blue, prominent)
    b(12, by + 2, 4, 2, C.BLUE); b(13, by + 2, 2, 1, C.WHITE);
    p(12, by + 3, C.DIVINE); p(15, by + 2, C.DIVFIRE);
    b(18, by + 2, 4, 2, C.BLUE); b(19, by + 2, 2, 1, C.WHITE);
    p(18, by + 3, C.DIVINE); p(21, by + 2, C.DIVFIRE);
    // Brow
    b(11, by + 1, 10, 1, C.DKROBE);

    // === EXTENDED WINGS (tips reach frame edges, layered feathers) ===
    // Left wing (large, multi-layered)
    b(0, by + 3, 9, 11, C.WING); b(0, by + 3, 3, 11, C.DIVINE); b(1, by + 3, 2, 9, C.WING);
    b(7, by + 4, 2, 9, C.DKWING);
    p(0, by + 2, C.DIVINE); p(0, by + 1, C.WING);
    // Feather details (3 rows)
    p(1, by + 5, C.DKWING); p(1, by + 8, C.DKWING); p(1, by + 11, C.DKWING);
    p(3, by + 6, C.SHADOW); p(3, by + 9, C.SHADOW); p(3, by + 12, C.SHADOW);
    p(5, by + 7, C.DKWING); p(5, by + 10, C.DKWING);
    // Right wing
    b(23, by + 3, 9, 11, C.DKWING); b(29, by + 3, 3, 11, C.SHADOW);
    p(31, by + 2, C.DKWING); p(31, by + 1, C.WING);
    p(30, by + 5, C.SHADOW); p(30, by + 8, C.SHADOW); p(30, by + 11, C.SHADOW);
    p(28, by + 6, C.SHADOW); p(28, by + 9, C.SHADOW);
    p(26, by + 7, C.SHADOW); p(26, by + 10, C.SHADOW);

    // === NECK ===
    b(12, by + 5, 8, 2, C.DKROBE); b(13, by + 5, 6, 1, C.ARMOR);

    // === MASSIVE PLATE ARMOR TORSO ===
    b(7, by + 7, 18, 10, C.PLATE);
    b(7, by + 7, 3, 10, C.DIVINE); b(8, by + 7, 2, 8, C.PLATE);
    b(22, by + 7, 3, 10, C.DKROBE); b(23, by + 9, 2, 6, C.SHADOW);
    b(9, by + 7, 14, 2, C.BGOLD); b(10, by + 7, 12, 1, C.DIVINE);

    // Divine rune lines on armor
    p(10, by + 10, C.DIVFIRE); p(12, by + 11, C.DKDIVFIRE);
    p(19, by + 10, C.DIVFIRE); p(21, by + 11, C.DKDIVFIRE);

    // === CROSS EMBLEM (large, ornate) ===
    b(13, by + 10, 6, 6, C.CROSS); b(11, by + 12, 10, 2, C.CROSS);
    b(14, by + 11, 4, 4, C.BGOLD); p(15, by + 12, C.DIVINE); p(16, by + 13, C.DIVINE);
    p(14, by + 10, C.DIVINE); p(17, by + 10, C.DIVINE);
    p(13, by + 15, C.DKGOLD); p(18, by + 15, C.DKGOLD);

    // === FLAMING GOLDEN SWORD (right hand, divine fire) ===
    b(25, by + 1, 2, 14, C.GOLD); b(25, by + 1, 1, 14, C.BGOLD);
    // Sword blade glow
    p(24, by + 3, C.DIVFIRE); p(27, by + 5, C.DIVFIRE);
    // Divine fire on blade
    p(25, by, C.DIVFIRE); p(26, by - 1, C.CROSS); p(25, by - 1, C.HOLY);
    p(26, by - 2, C.DIVINE); p(25, by - 2, C.DIVFIRE);
    p(24, by, C.DKDIVFIRE); p(27, by, C.DKDIVFIRE);
    // Hilt (ornate)
    b(23, by + 15, 6, 2, C.DKGOLD); b(24, by + 15, 4, 1, C.BGOLD);
    p(23, by + 15, C.GOLD); p(28, by + 15, C.GOLD);

    // === BELT (ornate) ===
    b(9, by + 16, 14, 2, C.GOLD); b(10, by + 16, 12, 1, C.BGOLD);
    p(13, by + 16, C.CROSS); p(16, by + 16, C.DIVINE); p(19, by + 16, C.CROSS);

    // === LEGS (armored, divine runes) ===
    b(9 + lOff, by + 18, 6, 7, C.PLATE);
    b(9 + lOff, by + 18, 2, 7, C.DIVINE); b(14 + lOff, by + 18, 1, 7, C.DKROBE);
    p(11 + lOff, by + 20, C.DIVFIRE); p(12 + lOff, by + 21, C.DKDIVFIRE);
    b(17 + rOff, by + 18, 6, 7, C.PLATE);
    b(22 + rOff, by + 18, 1, 7, C.DKROBE);
    p(19 + rOff, by + 20, C.DIVFIRE); p(20 + rOff, by + 21, C.DKDIVFIRE);
    // Knee guards (golden)
    b(9 + lOff, by + 22, 6, 1, C.GOLD); p(10 + lOff, by + 22, C.BGOLD); p(13 + lOff, by + 22, C.BGOLD);
    b(17 + rOff, by + 22, 6, 1, C.GOLD); p(18 + rOff, by + 22, C.BGOLD);
    // Feet (armored, massive)
    b(7 + lOff, by + 25, 8, 3, C.DKROBE); b(8 + lOff, by + 25, 6, 2, C.PLATE);
    p(7 + lOff, by + 27, C.SHADOW);
    b(16 + rOff, by + 25, 8, 3, C.DKROBE); b(17 + rOff, by + 25, 6, 2, C.PLATE);
    p(23 + rOff, by + 27, C.SHADOW);

    // === DIVINE LIGHT PARTICLES ===
    p(4, by + 1, C.HOLY); p(27, by + 2, C.HOLY);
    p(2, by + 15, C.DIVFIRE); p(29, by + 16, C.DIVFIRE);
  } else {
    drawDeathCelestial(p, b, f - 4, 16, 14);
  }
}

// 6: Choir (Group) - acolytes in organized formation
function drawChoir(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 9 + bob;
    // Small robed figure
    b(13, by, 6, 4, C.SKIN); b(14, by, 4, 1, C.SKIN); p(13, by, C.SKIN);
    // Halo
    b(14, by - 2, 4, 1, C.HALO); p(13, by - 1, C.BGOLD); p(18, by - 1, C.BGOLD);
    // Eyes
    b(14, by + 2, 2, 1, C.BLUE); p(14, by + 2, C.WHITE);
    b(17, by + 2, 2, 1, C.BLUE); p(17, by + 2, C.WHITE);
    // Torso (robe)
    b(11, by + 4, 10, 6, C.ROBE);
    b(11, by + 4, 2, 6, C.LROBE); b(19, by + 4, 2, 6, C.DKROBE);
    b(12, by + 4, 8, 1, C.PLATE);
    // Gold trim
    b(13, by + 4, 6, 1, C.GOLD);
    // Core cross
    b(15, by + 6, 2, 2, C.CROSS); p(15, by + 6, C.BGOLD);
    // Arms
    b(9, by + 5, 2, 4, C.ROBE); p(9, by + 5, C.LROBE);
    b(21, by + 5, 2, 4, C.DKROBE);
    // Lower robe
    b(12 + lOff, by + 10, 3, 4, C.ROBE); b(12 + lOff, by + 10, 1, 4, C.LROBE);
    b(17 + rOff, by + 10, 3, 4, C.ROBE); b(19 + rOff, by + 10, 1, 4, C.DKROBE);
    // Feet
    b(11 + lOff, by + 14, 4, 2, C.DKROBE);
    b(17 + rOff, by + 14, 4, 2, C.SHADOW);
  } else {
    drawDeathCelestial(p, b, f - 4, 16, 15);
  }
}

// 7: Twin Vessel (Splitter) - two-bodied spirit, one halo, splits
function drawTwinVessel(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, 1][f];
    const wobX = [0, 1, 0, -1][f];
    const by = 5 + bob;
    const bx = wobX;
    // Shared halo above
    b(12 + bx, by - 2, 8, 1, C.HALO); b(13 + bx, by - 3, 6, 1, C.BGOLD);
    p(12 + bx, by - 2, C.BGOLD); p(19 + bx, by - 2, C.BGOLD);
    // Left spirit body
    b(10 + bx, by, 5, 4, C.ROBE); b(10 + bx, by, 2, 4, C.LROBE);
    b(14 + bx, by, 1, 4, C.DKROBE);
    // Right spirit body
    b(17 + bx, by, 5, 4, C.ROBE); b(17 + bx, by, 2, 4, C.LROBE);
    b(21 + bx, by, 1, 4, C.DKROBE);
    // Eyes
    p(11 + bx, by + 1, C.BLUE); p(13 + bx, by + 1, C.BLUE);
    p(18 + bx, by + 1, C.BLUE); p(20 + bx, by + 1, C.BLUE);
    // Merged lower body
    b(10 + bx, by + 4, 12, 8, C.ROBE);
    b(10 + bx, by + 4, 2, 8, C.LROBE); b(20 + bx, by + 4, 2, 8, C.DKROBE);
    b(11 + bx, by + 4, 10, 1, C.PLATE);
    // Crack / split line
    b(15 + bx, by, 2, 3, C.HOLY); p(15 + bx, by + 1, C.DIVINE);
    p(16 + bx, by + 2, C.DIVINE);
    b(15 + bx, by + 5, 1, 6, C.HOLY); p(15 + bx, by + 7, C.DIVINE);
    p(16 + bx, by + 9, C.HOLY);
    // Split glow
    p(14 + bx, by + 6, C.BGOLD); p(17 + bx, by + 6, C.BGOLD);
    // Core
    b(14 + bx, by + 8, 4, 2, C.GOLD); p(15 + bx, by + 8, C.BGOLD);
    // Lower robe
    b(11, by + 12, 10, 4, C.ROBE);
    b(11, by + 12, 2, 4, C.LROBE); b(19, by + 12, 2, 4, C.DKROBE);
    b(10, by + 16, 12, 2, C.DKROBE);
    b(10, by + 18, 12, 1, C.SHADOW);
    // Feet
    b(12, by + 18, 3, 2, C.DKROBE);
    b(17 + bx, by + 18, 3, 2, C.SHADOW);
  } else {
    drawDeathCelestial(p, b, f - 4, 16, 14);
  }
}

// 8: Faith Guard (Shielded) - golden bubble shield, prayer pose
function drawFaithGuard(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 5 + bob;
    // Standard robed body
    b(12, by, 8, 5, C.SKIN); b(13, by, 6, 2, C.SKIN);
    p(12, by, C.SKIN);
    // Halo
    b(13, by - 2, 6, 1, C.HALO); b(14, by - 3, 4, 1, C.BGOLD);
    // Eyes
    b(13, by + 2, 2, 2, C.BLUE); p(14, by + 2, C.WHITE);
    b(17, by + 2, 2, 2, C.BLUE); p(18, by + 2, C.WHITE);
    // Small wing detail behind the shield (visible behind shoulders)
    p(7, by + 5, C.WING); p(6, by + 6, C.WING); p(7, by + 6, C.DIVINE);
    p(6, by + 7, C.DKWING); p(7, by + 7, C.WING); p(6, by + 8, C.DKWING);
    p(24, by + 5, C.DKWING); p(25, by + 6, C.DKWING); p(24, by + 6, C.WING);
    p(25, by + 7, C.SHADOW); p(24, by + 7, C.DKWING); p(25, by + 8, C.SHADOW);
    // Robe
    b(10, by + 6, 12, 8, C.ROBE);
    b(10, by + 6, 2, 8, C.LROBE); b(20, by + 6, 2, 8, C.DKROBE);
    b(11, by + 6, 10, 1, C.PLATE);
    b(14, by + 8, 4, 3, C.CROSS); b(15, by + 9, 2, 1, C.BGOLD);
    p(15, by + 8, C.DIVINE);
    // Arms (prayer pose)
    b(8, by + 7, 2, 5, C.ROBE); p(8, by + 7, C.LROBE);
    b(22, by + 7, 2, 5, C.DKROBE);
    // Legs
    b(11 + lOff, by + 14, 4, 5, C.ROBE);
    b(17 + rOff, by + 14, 4, 5, C.ROBE);
    b(10 + lOff, by + 19, 5, 2, C.DKROBE);
    b(17 + rOff, by + 19, 5, 2, C.SHADOW);
    // Golden bubble shield (ring)
    const rot = f * 3;
    for (let i = 0; i < 24; i++) {
      const a = (i + rot) * Math.PI / 12;
      const rx = 16 + Math.round(Math.cos(a) * 12);
      const ry = by + 8 + Math.round(Math.sin(a) * 10);
      if (i % 6 === 0) {
        p(rx, ry, C.DIVINE); p(rx + 1, ry, C.BGOLD); p(rx - 1, ry, C.BGOLD);
      } else if (i % 3 === 0) {
        p(rx, ry, C.GOLD); p(rx, ry + 1, C.DKGOLD);
      } else {
        p(rx, ry, i % 2 === 0 ? C.GOLD : C.DKGOLD);
      }
    }
    // Cardinal prayer points
    b(3, by + 7, 2, 2, C.GOLD); p(3, by + 7, C.BGOLD);
    b(27, by + 7, 2, 2, C.GOLD); p(28, by + 8, C.BGOLD);
    b(15, by - 5, 2, 2, C.GOLD); p(15, by - 5, C.BGOLD);
    b(15, by + 20, 2, 2, C.DKGOLD); p(16, by + 21, C.GOLD);
  } else {
    drawDeathCelestial(p, b, f - 4, 16, 14);
  }
}

// 9: Wisp Angel (Evasive) - transparent angel, ethereal
function drawWispAngel(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const fx = [0, 4, -2, 2][f];
    const fy = [0, -2, 2, 0][f];
    const bx = 10 + fx, by = 7 + fy;
    // Ethereal angel form (semi-transparent)
    b(bx + 3, by, 4, 1, C.DIVINE);
    // Halo
    b(bx + 3, by - 2, 4, 1, C.HALO); p(bx + 2, by - 1, C.BGOLD); p(bx + 7, by - 1, C.BGOLD);
    if (f !== 1) b(bx + 2, by + 1, 6, 3, C.ROBE);
    else { p(bx + 2, by + 1, C.ROBE); p(bx + 5, by + 2, C.LROBE); p(bx + 7, by + 1, C.ROBE); }
    if (f !== 2) b(bx, by + 4, 10, 3, C.ROBE);
    else { b(bx, by + 4, 3, 3, C.ROBE); p(bx + 5, by + 5, C.LROBE); b(bx + 7, by + 4, 3, 3, C.ROBE); }
    b(bx + 1, by + 7, 8, 3, C.DKROBE);
    if (f !== 3) b(bx + 2, by + 10, 6, 2, C.DKROBE);
    else { p(bx + 2, by + 10, C.DKROBE); p(bx + 5, by + 10, C.DKROBE); p(bx + 7, by + 10, C.DKROBE); }
    // Shading
    b(bx, by + 4, 2, 3, C.LROBE); b(bx + 8, by + 5, 2, 2, C.SHADOW);
    // Eyes (glowing blue)
    b(bx + 3, by + 2, 2, 1, C.BLUE); p(bx + 3, by + 2, C.WHITE);
    b(bx + 6, by + 2, 2, 1, C.BLUE); p(bx + 6, by + 2, C.WHITE);
    // Core glow
    b(bx + 4, by + 5, 2, 2, C.HOLY);
    p(bx + 4, by + 5, C.DIVINE); p(bx + 5, by + 6, C.DIVINE);
    // Wing wisps
    p(bx - 1, by + 2, C.WING); p(bx + 10, by + 2, C.DKWING);
    // Ghost afterimages
    if (f === 1 || f === 3) {
      b(bx - 4, by + 4, 2, 2, C.DKROBE); p(bx - 5, by + 5, C.SHADOW);
    }
    if (f === 2) {
      b(bx + 12, by + 4, 2, 2, C.DKROBE); p(bx + 13, by + 5, C.SHADOW);
    }
    // Flicker particles
    if (f === 0) { p(bx - 2, by + 2, C.HOLY); p(bx + 11, by + 8, C.HOLY); }
    if (f === 3) { p(bx + 11, by + 2, C.HALO); p(bx - 2, by + 8, C.HALO); }
  } else {
    drawDeathCelestial(p, b, f - 4, 16, 13);
  }
}

// 10: Martyr (Regen) - gold warrior regenerating with light
function drawMartyr(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, 0, -1, 0][f];
    const by = 5 + bob;
    const bright = f === 0 || f === 2;
    const bodyC = bright ? C.PLATE : C.ARMOR;
    const hiC = bright ? C.DIVINE : C.LROBE;
    const coreC = bright ? C.DIVINE : C.BGOLD;
    const midC = bright ? C.BGOLD : C.DKGOLD;
    // Warrior body (armored)
    b(14, by, 4, 2, C.GOLD); p(14, by, hiC);
    b(12, by + 2, 8, 3, bodyC);
    b(10, by + 5, 12, 6, bodyC);
    b(11, by + 11, 10, 4, bodyC);
    b(13, by + 15, 6, 2, C.ARMOR);
    p(15, by + 17, C.DKROBE);
    // Gradient shading
    b(10, by + 5, 2, 6, hiC); b(11, by + 6, 1, 4, midC);
    b(20, by + 5, 2, 6, C.DKROBE); b(21, by + 7, 1, 4, C.SHADOW);
    b(11, by + 11, 2, 4, hiC); b(19, by + 11, 2, 4, C.DKROBE);
    // Halo (pulsing)
    b(13, by - 2, 6, 1, bright ? C.DIVINE : C.HALO);
    b(14, by - 3, 4, 1, bright ? C.HOLY : C.BGOLD);
    // Eyes
    b(13, by + 3, 2, 2, C.BLUE); p(13, by + 3, C.WHITE);
    b(17, by + 3, 2, 2, C.BLUE); p(17, by + 3, C.WHITE);
    // Pulsing light core
    b(14, by + 7, 4, 3, coreC); b(13, by + 8, 6, 1, bright ? C.BGOLD : C.GOLD);
    p(15, by + 7, C.DIVINE); p(16, by + 7, C.DIVINE);
    // Regenerating light tendrils
    b(10, by + 10, 2, 2, C.GOLD); p(9, by + 11, bright ? C.BGOLD : C.DKGOLD);
    b(20, by + 9, 2, 2, C.GOLD); p(21, by + 10, bright ? C.BGOLD : C.DKGOLD);
    p(12, by + 14, C.GOLD); p(19, by + 14, C.GOLD);
    // Light edge
    b(12, by + 2, 2, 3, hiC);
    // Bioluminescent spots
    p(11, by + 7, bright ? C.DIVINE : C.GOLD);
    p(19, by + 7, bright ? C.DIVINE : C.GOLD);
    p(15, by + 12, bright ? C.BGOLD : C.GOLD);
    // Bottom shadow
    b(13, by + 15, 6, 1, C.DKROBE); b(14, by + 16, 4, 1, C.SHADOW);
  } else {
    drawDeathCelestial(p, b, f - 4, 16, 11);
  }
}

// 11: Cherub (Flying) - small winged angel hovering
function drawCherub(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const wingY = [0, 2, 4, 2][f];
    const by = 8;
    // Body (horizontal, compact)
    b(11, by + 5, 10, 4, C.SKIN);
    b(11, by + 5, 10, 1, C.SKIN); b(11, by + 8, 10, 1, C.DKROBE);
    // Robe
    b(12, by + 7, 8, 3, C.ROBE); b(12, by + 7, 2, 3, C.LROBE);
    b(18, by + 8, 2, 2, C.DKROBE);
    // Head
    b(19, by + 3, 5, 4, C.SKIN); p(19, by + 3, C.SKIN);
    // Halo
    b(20, by + 1, 4, 1, C.HALO); b(21, by, 2, 1, C.BGOLD);
    // Eyes
    b(21, by + 4, 2, 1, C.BLUE); p(21, by + 4, C.WHITE);
    // Smile
    p(22, by + 6, C.DKROBE);
    // Top wing
    b(11, by + 2 + wingY, 7, 2, C.WING);
    b(11, by + 2 + wingY, 7, 1, C.DIVINE);
    b(9, by + 1 + wingY, 4, 1, C.WING);
    b(7, by + wingY, 3, 1, C.DIVINE);
    p(6, by + wingY - 1, C.WING);
    // Feather details
    p(12, by + 3 + wingY, C.DKWING); p(15, by + 3 + wingY, C.DKWING);
    // Bottom wing
    b(11, by + 10 - wingY, 7, 2, C.DKWING);
    b(11, by + 11 - wingY, 7, 1, C.SHADOW);
    b(9, by + 11 - wingY, 4, 1, C.DKWING);
    b(7, by + 12 - wingY, 3, 1, C.SHADOW);
    // Tail / feet
    b(9, by + 7, 2, 2, C.ROBE); p(8, by + 8, C.DKROBE);
    // Shadow below
    b(13, by + 16, 5, 1, C.DKROBE); b(14, by + 17, 3, 1, C.SHADOW);
  } else {
    drawDeathCelestial(p, b, f - 4, 16, 12);
  }
}

// Helper: draw celestial mage/priest base
function drawCelestialMageBase(
  p: (x: number, y: number, cl: string) => void,
  b: (x: number, y: number, w: number, h: number, cl: string) => void,
  f: number, accentC: string, staffC: string, bodyMod?: string
) {
  const bob = [0, -1, 0, -1][f];
  const lOff = [0, 1, 0, -1][f];
  const rOff = [0, -1, 0, 1][f];
  const by = 4 + bob;
  const isWard = bodyMod === 'ward';
  const isVeiled = bodyMod === 'veil';
  const bodyC = isWard ? C.ARMOR : isVeiled ? C.LROBE : C.ROBE;
  const robeC = isWard ? C.PLATE : isVeiled ? C.DIVINE : C.ROBE;
  const hoodC = isVeiled ? C.DIVINE : C.DKROBE;
  const robeHi = isWard ? C.DIVINE : isVeiled ? C.DIVINE : C.LROBE;
  const robeMid = isWard ? C.ARMOR : isVeiled ? C.LROBE : C.MID;

  // Hooded head
  b(14, by, 4, 1, C.LROBE);
  b(13, by + 1, 6, 1, hoodC); b(14, by + 1, 4, 1, robeHi);
  b(12, by + 2, 8, 3, hoodC);
  b(12, by + 2, 2, 3, robeHi); b(19, by + 3, 1, 2, C.SHADOW);
  // Hood fold
  p(14, by + 2, robeMid); p(17, by + 2, robeMid);
  // Face
  b(13, by + 3, 6, 2, C.SHADOW); b(14, by + 3, 4, 1, C.DKROBE);
  // Eyes
  b(14, by + 4, 2, 1, accentC); p(14, by + 4, C.WHITE);
  b(17, by + 4, 2, 1, accentC); p(17, by + 4, C.WHITE);
  // Halo
  b(13, by - 1, 6, 1, C.HALO); b(14, by - 2, 4, 1, C.BGOLD);
  // Robe body
  b(12, by + 5, 8, 4, robeC);
  b(12, by + 5, 2, 4, robeHi); b(19, by + 5, 1, 4, C.SHADOW);
  b(10, by + 9, 12, 4, bodyC);
  b(10, by + 9, 2, 4, robeHi); b(11, by + 9, 1, 3, robeMid);
  b(20, by + 9, 2, 4, C.DKROBE); b(21, by + 10, 1, 3, C.SHADOW);
  b(9, by + 13, 14, 4, bodyC);
  b(9, by + 13, 2, 4, robeHi);
  b(21, by + 13, 2, 4, C.DKROBE); b(22, by + 14, 1, 3, C.SHADOW);
  b(8, by + 17, 16, 2, hoodC);
  b(8, by + 17, 2, 2, robeMid);
  b(22, by + 17, 2, 2, C.SHADOW);
  // Robe hem
  b(8, by + 19, 16, 1, C.SHADOW);
  // Robe detail
  p(14, by + 9, accentC); p(15, by + 10, accentC);
  p(16, by + 11, accentC); p(16, by + 12, accentC);
  // Robe folds
  p(12, by + 12, robeMid); p(19, by + 12, C.DKROBE);
  p(11, by + 15, robeMid); p(20, by + 15, C.DKROBE);
  // Staff
  b(22, by + 1, 2, 16, isWard ? C.ARMOR : C.DKGOLD);
  b(22, by + 1, 1, 16, isWard ? C.DKROBE : C.GOLD);
  // Staff top
  b(21, by - 1, 4, 2, staffC); b(22, by - 1, 2, 1, accentC);
  p(21, by - 2, accentC); p(24, by - 2, accentC);
  p(22, by - 3, C.DIVINE); p(23, by - 3, C.DIVINE);
  // Staff wrapping
  p(22, by + 5, staffC); p(22, by + 9, staffC); p(22, by + 13, staffC);
  // Left arm
  b(9, by + 7 + lOff, 3, 2, robeC); b(9, by + 7 + lOff, 1, 2, robeHi);
  p(8, by + 8 + lOff, bodyC);
  // Feet
  b(11 + lOff, by + 19, 3, 2, bodyC); b(11 + lOff, by + 20, 3, 1, hoodC);
  b(18 + rOff, by + 19, 3, 2, hoodC); b(18 + rOff, by + 20, 3, 1, C.SHADOW);
}

// 12: Wardkeeper (Iron) - robed silver armor, blessing runes
function drawWardkeeper(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawCelestialMageBase(p, b, f, C.ARMOR, C.DKROBE, 'ward');
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    // Heavy armor plates
    b(12, by + 7, 8, 2, C.ARMOR);
    b(13, by + 7, 6, 1, C.PLATE);
    // Shoulder plates
    b(10, by + 9, 3, 2, C.PLATE); b(10, by + 9, 1, 2, C.DIVINE);
    b(19, by + 9, 3, 2, C.DKROBE);
    // Belt with rune
    b(14, by + 12, 4, 2, C.PLATE); b(15, by + 12, 2, 1, C.DIVINE);
    // Rune marks on armor
    p(12, by + 9, C.GOLD); p(19, by + 10, C.GOLD);
    p(10, by + 16, C.PLATE); p(21, by + 16, C.DKROBE);
  } else {
    drawDeathCelestial(p, b, f - 4, 16, 14);
  }
}

// 13: Herald (Haste) - robed trumpet, speed-blessing waves
function drawHerald(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawCelestialMageBase(p, b, f, C.BGOLD, C.GOLD, undefined);
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    // Speed blessing waves behind
    b(5, by + 5, 3, 1, C.GOLD); b(3, by + 5, 2, 1, C.BGOLD);
    b(4, by + 9, 4, 1, C.BGOLD); p(2, by + 9, C.GOLD);
    b(5, by + 13, 3, 1, C.GOLD); p(3, by + 13, C.BGOLD);
    b(6, by + 16, 2, 1, C.DKGOLD);
    // Extra on even frames
    if (f % 2 === 0) {
      p(2, by + 3, C.BGOLD); p(1, by + 7, C.GOLD);
      b(3, by + 11, 2, 1, C.BGOLD);
    } else {
      p(3, by + 4, C.GOLD); p(2, by + 8, C.BGOLD);
      b(4, by + 12, 2, 1, C.DKGOLD);
    }
    // Golden particles
    p(1, by + 6, C.HALO); p(0, by + 10, C.HALO);
  } else {
    drawDeathCelestial(p, b, f - 4, 16, 14);
  }
}

// 14: Veiled Saint (Mist) - blinding light/mist surrounding
function drawVeiledSaint(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawCelestialMageBase(p, b, f, C.HOLY, C.DIVINE, 'veil');
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    const mx = [5, 7, 3, 8][f];
    const my = [7, 11, 5, 9][f];
    // Light mist clouds
    b(mx, by + my, 2, 1, C.HOLY); p(mx + 2, by + my + 1, C.DIVINE);
    b(mx + 16, by + my - 2, 2, 1, C.DIVINE); p(mx + 18, by + my - 1, C.HOLY);
    // Additional light wisps
    b(25, by + 3, 2, 1, C.HOLY); p(26, by + 4, C.DIVINE);
    b(4, by + 15, 3, 1, C.DIVINE); p(3, by + 16, C.HOLY);
    if (f === 1 || f === 3) {
      b(3, by + 14, 2, 1, C.DIVINE); p(2, by + 15, C.HOLY);
      p(27, by + 8, C.DIVINE);
    }
    if (f === 0 || f === 2) {
      p(26, by + 6, C.HOLY); p(5, by + 10, C.DIVINE);
    }
  } else {
    drawDeathCelestial(p, b, f - 4, 16, 14);
  }
}

// 15: High Priest (Heal) - radiant healing circle
function drawHighPriest(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawCelestialMageBase(p, b, f, C.GREEN, C.DKGREEN, undefined);
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    // Staff gem heal glow
    p(22, by - 3, C.GREEN); p(23, by - 3, C.GREEN);
    b(21, by - 1, 4, 1, C.GREEN); p(21, by - 2, C.DKGREEN);
    p(24, by - 2, C.DKGREEN);
    // Green heal particles from left hand
    const px_ = [7, 5, 8, 6][f];
    b(px_, by + 5, 2, 1, C.GREEN); p(px_ + 2, by + 4, C.DKGREEN);
    p(px_ - 1, by + 6, C.GREEN);
    // Cross/heal symbol near staff
    b(24, by + 5, 2, 1, C.GREEN);
    b(25, by + 4, 1, 3, C.GREEN);
    p(25, by + 3, C.DKGREEN); p(25, by + 7, C.DKGREEN);
    p(23, by + 5, C.DKGREEN); p(26, by + 5, C.DKGREEN);
    // Extra heal sparkles
    if (f % 2 === 0) {
      p(6, by + 3, C.GREEN); p(8, by + 8, C.DKGREEN);
    } else {
      p(7, by + 2, C.DKGREEN); p(5, by + 7, C.GREEN);
    }
  } else {
    drawDeathCelestial(p, b, f - 4, 16, 14);
  }
}

// ===== DEATH ANIMATION HELPER =====
function drawDeathCelestial(
  p: (x: number, y: number, cl: string) => void,
  b: (x: number, y: number, w: number, h: number, cl: string) => void,
  deathFrame: number, cx: number, cy: number
) {
  if (deathFrame === 0) {
    // Dissolves into golden light - silhouette with bright cracks
    b(cx - 4, cy - 4, 10, 10, C.ROBE);
    b(cx - 3, cy - 5, 8, 2, C.ROBE);
    b(cx - 2, cy - 6, 6, 1, C.LROBE);
    b(cx - 3, cy + 6, 8, 2, C.DKROBE);
    b(cx - 2, cy + 7, 4, 1, C.SHADOW);
    // Shading
    b(cx - 4, cy - 4, 2, 10, C.LROBE);
    b(cx + 4, cy - 2, 2, 8, C.DKROBE);
    // Golden light cracks
    p(cx, cy - 5, C.DIVINE); p(cx + 1, cy - 4, C.BGOLD);
    p(cx + 2, cy - 3, C.DIVINE); p(cx + 3, cy - 2, C.BGOLD);
    p(cx - 2, cy - 3, C.BGOLD); p(cx - 3, cy - 2, C.DIVINE);
    p(cx - 1, cy, C.BGOLD); p(cx + 3, cy, C.DIVINE);
    p(cx - 3, cy + 1, C.DIVINE); p(cx + 1, cy + 1, C.BGOLD);
    p(cx, cy + 2, C.DIVINE); p(cx - 2, cy + 3, C.BGOLD);
    p(cx + 2, cy + 3, C.BGOLD); p(cx + 4, cy + 2, C.BGOLD);
    p(cx - 4, cy + 2, C.DIVINE);
    p(cx + 1, cy + 4, C.BGOLD); p(cx - 1, cy + 5, C.BGOLD);
    // Halo glow center
    b(cx - 1, cy - 1, 3, 3, C.BGOLD);
    p(cx, cy, C.DIVINE); p(cx - 1, cy, C.BGOLD); p(cx + 1, cy, C.BGOLD);
  } else if (deathFrame === 1) {
    // Feathers scatter with golden light
    b(cx - 6, cy - 6, 2, 2, C.GOLD); p(cx - 6, cy - 6, C.BGOLD);
    b(cx + 5, cy - 6, 2, 2, C.WING); p(cx + 6, cy - 6, C.DIVINE);
    b(cx - 7, cy - 1, 2, 2, C.WING); p(cx - 7, cy - 1, C.DIVINE);
    b(cx + 6, cy - 1, 2, 2, C.DKWING); p(cx + 7, cy, C.SHADOW);
    b(cx - 6, cy + 5, 2, 2, C.HALO);
    b(cx + 5, cy + 5, 2, 2, C.DKGOLD); p(cx + 6, cy + 6, C.SHADOW);
    b(cx - 1, cy - 7, 2, 2, C.GOLD); p(cx, cy - 7, C.BGOLD);
    b(cx - 1, cy + 6, 2, 2, C.DKROBE);
    // Feather fragments
    p(cx - 3, cy - 3, C.WING); p(cx + 3, cy - 3, C.WING);
    p(cx - 3, cy + 3, C.DKWING); p(cx + 3, cy + 3, C.DKWING);
    p(cx - 2, cy - 1, C.GOLD); p(cx + 2, cy + 1, C.GOLD);
    // Golden dust
    p(cx - 4, cy - 4, C.HALO); p(cx + 4, cy - 4, C.HALO);
    p(cx - 4, cy + 4, C.DKGOLD); p(cx + 4, cy + 4, C.DKGOLD);
    // Center divine flash
    b(cx - 1, cy - 1, 3, 3, C.DIVINE);
    p(cx, cy, C.WHITE);
  } else {
    // Fading divine glow - scattered feathers and light
    p(cx - 8, cy - 4, C.HALO); p(cx + 9, cy - 5, C.HALO);
    p(cx - 5, cy + 7, C.DKGOLD); p(cx + 6, cy + 8, C.SHADOW);
    p(cx, cy - 9, C.HALO); p(cx + 2, cy + 9, C.DKGOLD);
    p(cx + 2, cy, C.HALO); p(cx - 9, cy + 2, C.DKGOLD);
    // Feather specks
    p(cx - 6, cy - 7, C.WING); p(cx + 7, cy - 7, C.DKWING);
    p(cx - 7, cy + 5, C.HALO); p(cx + 8, cy + 6, C.DKGOLD);
    p(cx - 3, cy - 6, C.WING); p(cx + 4, cy - 8, C.DKWING);
    p(cx - 1, cy + 6, C.SHADOW);
  }
}

// ===== DRAW ALL CREEPS =====
const DRAW_FNS = [
  drawAcolyte, drawSeraphScout, drawTempleGuardian, drawLightMote, drawCleric, drawArchangel,
  drawChoir, drawTwinVessel, drawFaithGuard, drawWispAngel, drawMartyr, drawCherub,
  drawWardkeeper, drawHerald, drawVeiledSaint, drawHighPriest,
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
export default function CelestialCreepSprites() {
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

    // Preview canvas (3x scale)
    const pv = previewRef.current!;
    const S = 3;
    const LW = 72;
    const LH = 14;
    pv.width = LW + COLS * CELL * S;
    pv.height = ROWS * (CELL * S + LH) + 10;
    const pc = pv.getContext('2d')!;
    pc.imageSmoothingEnabled = false;
    pc.fillStyle = '#0a0a12';
    pc.fillRect(0, 0, pv.width, pv.height);

    for (let r = 0; r < ROWS; r++) {
      const by = r * (CELL * S + LH) + 5;
      pc.fillStyle = '#ddaa44';
      pc.font = 'bold 9px monospace';
      pc.fillText(ROW_NAMES[r], 3, by + CELL * S / 2 + 3);

      for (let cc = 0; cc < COLS; cc++) {
        const bx = LW + cc * CELL * S;
        pc.save();
        pc.translate(bx, by);
        pc.scale(S, S);
        pc.drawImage(sc, cc * CELL, r * CELL, CELL, CELL, 0, 0, CELL, CELL);
        pc.restore();
        pc.strokeStyle = '#1a1a2a';
        pc.strokeRect(bx, by, CELL * S, CELL * S);
        if (r === 0) {
          pc.fillStyle = '#bbaa88';
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
    <div style={{ background: '#0a0a12', minHeight: '100vh', padding: 12, fontFamily: 'monospace' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <h2 style={{ color: C.GOLD, margin: 0, fontSize: 15 }}>CELESTIAL FACTION — Creep Spritesheet</h2>
        {ready && (
          <button
            onClick={download(sheetRef, 'celestial_creeps.png')}
            style={{
              background: C.GOLD, color: '#fff', border: 'none', padding: '5px 14px',
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
              background: view === v ? '#1a1a2a' : '#111',
              color: view === v ? C.BGOLD : '#445566',
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
          data-label="Celestial Creeps (Preview)"
          data-frame-size="64x64"
          data-direction="right"
          data-columns='["Acolyte (Standard)","Seraph Scout (Fast)","Temple Guardian (Armored)","Light Mote (Swarm)","Cleric (Healer)","Archangel (Boss)","Choir (Group)","Twin Vessel (Splitter)","Faith Guard (Shielded)","Wisp Angel (Evasive)","Martyr (Regen)","Cherub (Flying)","Wardkeeper (Iron)","Herald (Haste)","Veiled Saint (Mist)","High Priest (Heal)"]'
          data-rows='["Walk 1","Walk 2","Walk 3","Walk 4","Death 1","Death 2","Death 3"]'
          data-presets='[{"name":"Walk","startRow":0,"endRow":3},{"name":"Death","startRow":4,"endRow":6}]'
          style={{ display: view === 'preview' ? 'block' : 'none', maxWidth: '100%' }}
        />
        <canvas
          ref={sheetRef}
          data-label="Celestial Creeps"
          data-frame-size="64x64"
          data-direction="right"
          data-columns='["Acolyte (Standard)","Seraph Scout (Fast)","Temple Guardian (Armored)","Light Mote (Swarm)","Cleric (Healer)","Archangel (Boss)","Choir (Group)","Twin Vessel (Splitter)","Faith Guard (Shielded)","Wisp Angel (Evasive)","Martyr (Regen)","Cherub (Flying)","Wardkeeper (Iron)","Herald (Haste)","Veiled Saint (Mist)","High Priest (Heal)"]'
          data-rows='["Walk 1","Walk 2","Walk 3","Walk 4","Death 1","Death 2","Death 3"]'
          data-presets='[{"name":"Walk","startRow":0,"endRow":3},{"name":"Death","startRow":4,"endRow":6}]'
          style={{
            display: view === 'actual' ? 'block' : 'none',
            imageRendering: 'pixelated',
            width: SHEET_W * 2,
            border: '1px solid #1a1a2a',
          }}
        />
      </div>
      <div style={{ color: '#887744', fontSize: 9, marginTop: 10, maxWidth: 700 }}>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#bbaa66' }}>Sheet:</b> {SHEET_W}x{SHEET_H}px ({COLS} cols x {ROWS} rows) — {CELL}x{CELL} cells
        </p>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#bbaa66' }}>Phaser:</b>{' '}
          <code style={{ color: C.BGOLD }}>
            {"this.load.spritesheet('celestial_creeps','celestial_creeps.png',{frameWidth:64,frameHeight:64})"}
          </code>
        </p>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#bbaa66' }}>Layout:</b> 16 cols (creep types) x 7 rows (walk0-3, death0-2). Frame index = row * 16 + col.
        </p>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#bbaa66' }}>Types:</b> {CREEP_NAMES.join(', ')}
        </p>
      </div>
    </div>
  );
}
