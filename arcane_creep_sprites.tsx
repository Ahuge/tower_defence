import { useRef, useEffect, useState, useCallback } from "react";

// ===== ARCANE CREEP PALETTE =====
const C = {
  BODY: '#4a3870',    // main body purple
  CRYST: '#8866ff',   // crystal bright
  ENERGY: '#aa88ff',  // energy glow
  HI: '#ccaaff',      // highlight
  DK: '#2a1848',      // dark shadow
  VOID: '#1a0e30',    // deepest shadow
  WHITE: '#ffffff',
  CYAN: '#66ccff',    // shield/barrier color
  DKCYN: '#3388bb',   // dark cyan
  GREEN: '#66ff88',   // heal accents
  DKGRN: '#338855',   // dark green
  GRAY: '#666688',    // iron mage
  DKGRAY: '#3a3a55',  // dark gray
  LTGRAY: '#8888aa',  // light gray
  BLUE: '#4488ff',    // haste accents
  LTBLUE: '#88bbff',  // light blue
  MIST: '#9999cc',    // mist color
  LTMIST: '#bbbbdd',  // light mist
  CRACK: '#ddbbff',   // crack lines
  FRAG: '#7755bb',    // fragment mid
  DUST: '#554488',    // fading dust
  EYE: '#ff6688',     // glowing eyes
  CORE: '#ffaadd',    // bright core
  // Extra shading colors for 64x64 detail
  MID: '#5e4890',     // mid-tone body
  LBODY: '#6a58a0',   // light body
  DKENERGY: '#7755cc', // dark energy
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
  'Standard', 'Fast', 'Armored', 'Swarm', 'Healer', 'Boss',
  'Group', 'Splitter', 'Shielded', 'Evasive', 'Regenerator', 'Flying',
  'Mage Iron', 'Mage Haste', 'Mage Mist', 'Mage Heal'
];
const ROW_NAMES = ['Walk 0', 'Walk 1', 'Walk 2', 'Walk 3', 'Death 0', 'Death 1', 'Death 2'];

// ===== CREEP DRAW FUNCTIONS =====
// Each function: (ctx, offset, frame) where frame 0-3=walk, 4-6=death

// 0: Standard - Stone Golem
function drawStandard(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 5 + bob;
    // Head
    b(12, by, 8, 5, C.BODY); b(13, by, 6, 2, C.MID);
    b(13, by, 6, 1, C.ENERGY); p(12, by, C.HI); p(13, by, C.HI);
    p(19, by + 4, C.DK); p(19, by + 3, C.DK);
    // Forehead crystal facets
    p(14, by, C.CRYST); p(15, by, C.HI); p(17, by, C.CRYST);
    // Eyes
    b(13, by + 2, 2, 2, C.EYE); b(17, by + 2, 2, 2, C.EYE);
    p(14, by + 2, C.WHITE); p(18, by + 2, C.WHITE);
    // Brow ridge
    b(12, by + 1, 8, 1, C.DK);
    // Neck
    b(13, by + 5, 6, 1, C.DK);
    // Torso
    b(10, by + 6, 12, 8, C.BODY);
    b(10, by + 6, 2, 8, C.HI); b(11, by + 6, 1, 6, C.MID);
    b(20, by + 6, 2, 8, C.DK); b(19, by + 8, 1, 4, C.VOID);
    b(11, by + 6, 10, 1, C.ENERGY); b(12, by + 6, 8, 1, C.HI);
    // Crystal core in chest
    b(14, by + 8, 4, 3, C.CRYST); b(15, by + 9, 2, 1, C.CORE);
    p(15, by + 8, C.WHITE); p(16, by + 10, C.ENERGY);
    // Chest detail lines
    p(12, by + 9, C.MID); p(19, by + 9, C.DK);
    b(11, by + 12, 10, 1, C.DK);
    // Arms (2-3px wide)
    b(8, by + 7, 2, 6, C.BODY); b(8, by + 7, 1, 6, C.HI); p(8, by + 7, C.MID);
    b(7, by + 9, 1, 3, C.BODY); p(7, by + 9, C.HI);
    b(22, by + 7, 2, 6, C.BODY); b(23, by + 7, 1, 6, C.DK);
    b(24, by + 9, 1, 3, C.DK);
    // Fists
    b(7, by + 12, 2, 2, C.BODY); p(7, by + 12, C.HI);
    b(23, by + 12, 2, 2, C.DK);
    // Legs
    b(11 + lOff, by + 14, 4, 6, C.BODY);
    b(11 + lOff, by + 14, 1, 6, C.HI); b(14 + lOff, by + 14, 1, 6, C.DK);
    p(12 + lOff, by + 14, C.MID);
    b(17 + rOff, by + 14, 4, 6, C.BODY);
    b(20 + rOff, by + 14, 1, 6, C.DK);
    p(18 + rOff, by + 14, C.MID);
    // Knees
    b(11 + lOff, by + 17, 4, 1, C.DK);
    b(17 + rOff, by + 17, 4, 1, C.DK);
    // Feet
    b(10 + lOff, by + 20, 5, 2, C.DK); b(10 + lOff, by + 20, 2, 1, C.BODY);
    b(17 + rOff, by + 20, 5, 2, C.DK); b(21 + rOff, by + 20, 1, 1, C.VOID);
    // Top highlight glow
    p(14, by - 1, C.ENERGY); p(15, by - 1, C.CRYST); p(16, by - 1, C.ENERGY);
  } else {
    drawDeathCrystal(p, b, f - 4, 16, 14);
  }
}

// 1: Fast - Spark Wisp
function drawFast(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -2, 2, 0][f];
    const by = 9 + bob;
    // Diamond/shard shape - larger with facets
    p(16, by - 1, C.WHITE);
    b(15, by, 3, 1, C.HI);
    b(14, by + 1, 5, 1, C.ENERGY);
    b(13, by + 2, 7, 2, C.CRYST);
    b(12, by + 4, 9, 2, C.BODY);
    b(13, by + 6, 7, 2, C.CRYST);
    b(14, by + 8, 5, 1, C.ENERGY);
    b(15, by + 9, 3, 1, C.HI);
    p(16, by + 10, C.ENERGY);
    // Bright core with inner glow
    b(15, by + 3, 3, 3, C.ENERGY);
    p(16, by + 4, C.WHITE); p(15, by + 4, C.CORE); p(17, by + 4, C.CORE);
    p(16, by + 3, C.CORE); p(16, by + 5, C.CORE);
    // Left facet highlight
    b(12, by + 4, 1, 2, C.HI); p(13, by + 3, C.HI);
    // Right facet shadow
    b(20, by + 4, 1, 2, C.DK); p(19, by + 6, C.DK);
    // Trailing energy particles
    const trail = [1, 3, 0, 2][f];
    b(10, by + 4 + trail, 2, 1, C.ENERGY); p(9, by + 5, C.CRYST);
    b(7, by + 4, 2, 1, C.DUST); p(6, by + 5 + trail, C.DUST);
    b(4, by + 4, 2, 1, C.FRAG); p(3, by + 5, C.FRAG);
    p(2, by + 4, C.DK);
    if (f % 2 === 0) {
      p(1, by + 5, C.VOID); p(5, by + 3, C.DUST);
      p(8, by + 6, C.FRAG);
    } else {
      p(5, by + 6, C.DUST); p(8, by + 3, C.FRAG);
    }
  } else {
    drawDeathCrystal(p, b, f - 4, 16, 14);
  }
}

// 2: Armored - Obelisk Guardian
function drawArmored(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, 0, -1, 0][f];
    const lOff = [0, 0, 1, 0][f];
    const rOff = [0, 0, 0, 1][f];
    const by = 4 + bob;
    // Wide hexagonal armored body
    b(8, by, 16, 2, C.BODY); b(9, by, 14, 1, C.HI);
    b(7, by + 2, 18, 4, C.BODY);
    b(6, by + 6, 20, 6, C.BODY);
    b(7, by + 12, 18, 3, C.BODY);
    b(9, by + 15, 14, 2, C.BODY);
    // Layered plate shading
    b(6, by + 2, 2, 10, C.HI); b(7, by + 3, 1, 8, C.MID);
    b(24, by + 2, 2, 10, C.DK); b(25, by + 4, 1, 8, C.VOID);
    b(8, by, 16, 2, C.HI);
    b(9, by + 15, 14, 2, C.DK);
    // Plate detail lines
    b(10, by + 3, 12, 1, C.ENERGY); b(11, by + 3, 10, 1, C.HI);
    b(10, by + 8, 12, 1, C.DK);
    b(10, by + 11, 12, 1, C.DK);
    // Shoulder rivets
    p(8, by + 4, C.CRYST); p(23, by + 4, C.CRYST);
    p(8, by + 6, C.CRYST); p(23, by + 6, C.CRYST);
    // Face/visor
    b(11, by + 2, 2, 2, C.EYE); p(12, by + 2, C.WHITE);
    b(19, by + 2, 2, 2, C.EYE); p(20, by + 2, C.WHITE);
    b(12, by + 4, 8, 2, C.VOID); b(13, by + 4, 6, 1, C.DK);
    // Crystal core
    b(14, by + 7, 4, 3, C.CRYST); b(15, by + 8, 2, 1, C.CORE);
    p(15, by + 7, C.WHITE); p(16, by + 9, C.ENERGY);
    // Inner plate facets
    b(10, by + 6, 3, 1, C.MID); b(19, by + 6, 3, 1, C.MID);
    b(10, by + 10, 12, 1, C.MID);
    // Stubby legs
    b(10 + lOff, by + 17, 4, 4, C.BODY);
    b(10 + lOff, by + 17, 1, 4, C.HI); b(13 + lOff, by + 17, 1, 4, C.DK);
    b(18 + rOff, by + 17, 4, 4, C.BODY);
    b(21 + rOff, by + 17, 1, 4, C.DK);
    // Feet
    b(9 + lOff, by + 21, 6, 2, C.DK); b(9 + lOff, by + 21, 2, 1, C.BODY);
    b(17 + rOff, by + 21, 6, 2, C.DK); b(22 + rOff, by + 21, 1, 1, C.VOID);
  } else {
    drawDeathCrystal(p, b, f - 4, 16, 14);
  }
}

// 3: Swarm - Mana Mite
function drawSwarm(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const jx = [0, 2, -2, 0][f];
    const jy = [0, 0, 2, -2][f];
    const bx = 12 + jx, by = 11 + jy;
    // Tiny triangle crystal (~8-10 grid units)
    p(bx + 3, by, C.WHITE);
    b(bx + 2, by + 1, 4, 1, C.HI);
    b(bx + 1, by + 2, 6, 2, C.CRYST);
    b(bx, by + 4, 8, 2, C.BODY);
    b(bx + 1, by + 6, 6, 1, C.BODY);
    b(bx + 2, by + 7, 4, 1, C.DK);
    p(bx + 3, by + 8, C.DK);
    // Facet shading
    b(bx, by + 4, 1, 2, C.HI); b(bx + 7, by + 4, 1, 2, C.DK);
    p(bx + 2, by + 3, C.HI); p(bx + 5, by + 5, C.DK);
    // Eye
    b(bx + 3, by + 3, 2, 2, C.EYE); p(bx + 3, by + 3, C.WHITE);
    // Sparkle particles
    p(bx + 6, by, C.ENERGY); p(bx - 1, by + 2, C.DUST);
    p(bx + 7, by + 2, C.CRYST);
    if (f % 2 === 0) p(bx + 1, by - 1, C.ENERGY);
  } else {
    drawDeathCrystal(p, b, f - 4, 16, 15);
  }
}

// 4: Healer - Arcane Font
function drawHealer(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -2, 0, 2][f];
    const by = 8 + bob;
    // Hovering orb - larger with gradient shading
    b(12, by, 8, 2, C.ENERGY); b(13, by, 6, 1, C.HI);
    b(10, by + 2, 12, 6, C.CRYST);
    b(11, by + 2, 10, 1, C.ENERGY);
    b(12, by + 8, 8, 2, C.ENERGY);
    b(13, by + 9, 6, 1, C.DKENERGY);
    // Inner bright glow
    b(12, by + 3, 8, 4, C.ENERGY);
    b(13, by + 4, 6, 2, C.HI);
    b(14, by + 4, 4, 2, C.WHITE);
    p(15, by + 5, C.CORE); p(16, by + 5, C.CORE);
    p(15, by + 4, C.WHITE); p(16, by + 4, C.WHITE);
    // Highlight / shadow on orb
    b(10, by + 2, 2, 3, C.HI); p(10, by + 3, C.MID);
    b(20, by + 5, 2, 3, C.DK); p(21, by + 6, C.VOID);
    // Pulsing ring around orb
    const pulse = [0, 1, 0, -1][f];
    const ringR = 9;
    for (let i = 0; i < 16; i++) {
      const a = (i + f * 2) * Math.PI / 8;
      const rx = 16 + Math.round(Math.cos(a) * ringR);
      const ry = by + 5 + Math.round(Math.sin(a) * (ringR - 1));
      p(rx, ry, i % 4 === 0 ? C.WHITE : C.ENERGY);
    }
    // Cardinal barrier points
    p(5, by + 4 + pulse, C.CRYST); p(26, by + 4 - pulse, C.CRYST);
    p(16, by - 3 + pulse, C.CRYST); p(16, by + 12 - pulse, C.CRYST);
    // Soft glow below
    b(14, by + 11, 4, 1, C.DUST); b(13, by + 12, 6, 1, C.FRAG);
    p(15, by + 13, C.DUST); p(16, by + 13, C.DUST);
  } else {
    drawDeathCrystal(p, b, f - 4, 16, 13);
  }
}

// 5: Boss - Crystal Titan
function drawBoss(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, 0, -1, 0][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 1 + bob;
    // Crown of crystal shards (tall, imposing)
    p(9, by - 1, C.HI); b(10, by - 2, 2, 2, C.CRYST); p(10, by - 2, C.WHITE);
    p(13, by - 3, C.ENERGY); b(14, by - 2, 2, 2, C.CRYST); p(14, by - 3, C.HI);
    b(17, by - 2, 2, 2, C.CRYST); p(17, by - 3, C.ENERGY); p(18, by - 2, C.WHITE);
    p(21, by - 1, C.HI); b(21, by - 1, 2, 1, C.ENERGY);
    // Crystal facet highlights on crown
    p(11, by - 1, C.WHITE); p(15, by - 2, C.WHITE); p(18, by - 1, C.WHITE);
    // Head (wide, imposing)
    b(9, by, 14, 5, C.BODY);
    b(9, by, 14, 2, C.ENERGY); b(10, by, 12, 1, C.HI);
    b(9, by, 2, 5, C.HI); p(9, by, C.MID);
    b(21, by + 2, 2, 3, C.DK); p(22, by + 4, C.VOID);
    // Eyes (glowing, detailed)
    b(11, by + 2, 3, 2, C.EYE); b(12, by + 2, 1, 1, C.WHITE);
    p(11, by + 3, C.CORE);
    b(18, by + 2, 3, 2, C.EYE); b(19, by + 2, 1, 1, C.WHITE);
    p(18, by + 3, C.CORE);
    // Brow ridge
    b(10, by + 1, 12, 1, C.DK);
    // Mouth/chin
    b(13, by + 4, 6, 1, C.VOID);
    // Shoulder crystals (large, multi-faceted)
    b(5, by + 4, 3, 3, C.CRYST); b(5, by + 4, 1, 3, C.HI); b(7, by + 5, 1, 2, C.DK);
    p(5, by + 3, C.HI); p(6, by + 3, C.ENERGY); p(4, by + 5, C.WHITE);
    b(24, by + 4, 3, 3, C.CRYST); b(26, by + 4, 1, 3, C.DK);
    p(25, by + 3, C.ENERGY); p(26, by + 3, C.HI); p(27, by + 5, C.FRAG);
    // Neck
    b(12, by + 5, 8, 2, C.DK);
    // Massive torso
    b(6, by + 7, 20, 10, C.BODY);
    b(6, by + 7, 3, 10, C.HI); b(7, by + 7, 2, 8, C.MID);
    b(23, by + 7, 3, 10, C.DK); b(24, by + 9, 2, 6, C.VOID);
    b(8, by + 7, 16, 2, C.ENERGY); b(9, by + 7, 14, 1, C.HI);
    // Multiple crystal growths on body
    b(10, by + 9, 3, 3, C.CRYST); p(10, by + 9, C.HI); p(12, by + 11, C.DK);
    p(11, by + 10, C.CORE); p(11, by + 9, C.WHITE);
    b(19, by + 9, 3, 3, C.CRYST); p(21, by + 9, C.DK);
    p(20, by + 10, C.CORE); p(20, by + 9, C.WHITE);
    b(14, by + 12, 4, 3, C.CRYST); b(15, by + 13, 2, 1, C.CORE);
    p(15, by + 12, C.WHITE); p(16, by + 14, C.ENERGY);
    // Chest plate lines
    b(10, by + 11, 12, 1, C.MID); b(10, by + 14, 12, 1, C.DK);
    // Belt detail
    b(8, by + 16, 16, 2, C.DK); b(9, by + 16, 14, 1, C.VOID);
    p(12, by + 16, C.CRYST); p(19, by + 16, C.CRYST);
    // Arms (thick, 3px wide)
    b(3, by + 8, 3, 8, C.BODY); b(3, by + 8, 1, 8, C.HI); b(5, by + 8, 1, 8, C.MID);
    b(2, by + 10, 1, 5, C.BODY); p(2, by + 10, C.HI);
    b(1, by + 12, 1, 3, C.BODY); p(1, by + 12, C.HI);
    b(26, by + 8, 3, 8, C.BODY); b(28, by + 8, 1, 8, C.DK);
    b(29, by + 10, 1, 5, C.DK);
    b(30, by + 12, 1, 3, C.VOID);
    // Fists
    b(1, by + 15, 3, 3, C.BODY); b(1, by + 15, 1, 3, C.HI); p(3, by + 17, C.DK);
    b(28, by + 15, 3, 3, C.DK); p(30, by + 17, C.VOID);
    // Legs (thick, 4-5px wide)
    b(8 + lOff, by + 18, 6, 7, C.BODY);
    b(8 + lOff, by + 18, 2, 7, C.HI); b(13 + lOff, by + 18, 1, 7, C.DK);
    p(10 + lOff, by + 18, C.MID);
    b(18 + rOff, by + 18, 6, 7, C.BODY);
    b(23 + rOff, by + 18, 1, 7, C.DK);
    p(20 + rOff, by + 18, C.MID);
    // Knee guards
    b(8 + lOff, by + 21, 6, 1, C.DK); p(9 + lOff, by + 21, C.CRYST);
    b(18 + rOff, by + 21, 6, 1, C.DK); p(22 + rOff, by + 21, C.CRYST);
    // Feet (massive)
    b(6 + lOff, by + 25, 8, 3, C.DK); b(7 + lOff, by + 25, 6, 2, C.BODY);
    p(6 + lOff, by + 27, C.VOID);
    b(17 + rOff, by + 25, 8, 3, C.DK); b(18 + rOff, by + 25, 6, 2, C.BODY);
    p(24 + rOff, by + 27, C.VOID);
  } else {
    drawDeathCrystal(p, b, f - 4, 16, 14);
  }
}

// 6: Group - Construct Troop (smaller standard)
function drawGroup(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 9 + bob;
    // Smaller head
    b(13, by, 6, 4, C.BODY); b(14, by, 4, 1, C.ENERGY); p(13, by, C.HI);
    b(14, by, 4, 1, C.MID);
    // Eyes
    b(14, by + 2, 2, 1, C.EYE); p(14, by + 2, C.WHITE);
    b(17, by + 2, 2, 1, C.EYE); p(17, by + 2, C.WHITE);
    // Torso (compact)
    b(11, by + 4, 10, 6, C.BODY);
    b(11, by + 4, 2, 6, C.HI); b(12, by + 4, 1, 4, C.MID);
    b(19, by + 4, 2, 6, C.DK);
    b(12, by + 4, 8, 1, C.ENERGY);
    // Core
    b(15, by + 6, 2, 2, C.CRYST); p(15, by + 6, C.CORE);
    // Chest line
    b(12, by + 8, 8, 1, C.DK);
    // Arms (small stubs)
    b(9, by + 5, 2, 4, C.BODY); p(9, by + 5, C.HI);
    b(21, by + 5, 2, 4, C.DK);
    // Legs
    b(12 + lOff, by + 10, 3, 4, C.BODY); b(12 + lOff, by + 10, 1, 4, C.HI);
    b(17 + rOff, by + 10, 3, 4, C.BODY); b(19 + rOff, by + 10, 1, 4, C.DK);
    // Feet
    b(11 + lOff, by + 14, 4, 2, C.DK); b(11 + lOff, by + 14, 2, 1, C.BODY);
    b(17 + rOff, by + 14, 4, 2, C.DK);
  } else {
    drawDeathCrystal(p, b, f - 4, 16, 15);
  }
}

// 7: Splitter - Fractured Golem
function drawSplitter(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, 1][f];
    const wobX = [0, 1, 0, -1][f];
    const by = 5 + bob;
    const bx = wobX;
    // Head
    b(12 + bx, by, 8, 5, C.BODY); b(13 + bx, by, 6, 2, C.ENERGY); p(12 + bx, by, C.HI);
    b(13 + bx, by, 6, 1, C.MID);
    // Eyes
    b(13 + bx, by + 2, 2, 2, C.EYE); p(14 + bx, by + 2, C.WHITE);
    b(17 + bx, by + 2, 2, 2, C.EYE); p(18 + bx, by + 2, C.WHITE);
    // Neck
    b(13 + bx, by + 5, 6, 1, C.DK);
    // Torso
    b(10 + bx, by + 6, 12, 8, C.BODY);
    b(10 + bx, by + 6, 2, 8, C.HI); b(20 + bx, by + 6, 2, 8, C.DK);
    b(11 + bx, by + 6, 10, 1, C.ENERGY);
    // Crack lines through body (bright, detailed)
    p(13 + bx, by + 1, C.CRACK); p(14 + bx, by + 2, C.CRACK);
    b(14 + bx, by + 6, 1, 2, C.CRACK); p(15 + bx, by + 7, C.CRACK);
    b(16 + bx, by + 8, 1, 2, C.CRACK); p(17 + bx, by + 9, C.CRACK);
    p(18 + bx, by + 10, C.CRACK); p(19 + bx, by + 11, C.CRACK);
    p(12 + bx, by + 8, C.CRACK); p(11 + bx, by + 9, C.CRACK);
    b(10 + bx, by + 10, 1, 2, C.CRACK); p(11 + bx, by + 12, C.CRACK);
    p(15 + bx, by + 10, C.CRACK); p(14 + bx, by + 12, C.CRACK);
    // Crack glow aura
    p(13 + bx, by + 7, C.CORE); p(17 + bx, by + 10, C.CORE);
    // Crystal core
    b(15 + bx, by + 8, 2, 2, C.CORE); p(15 + bx, by + 8, C.WHITE);
    // Arms
    b(8 + bx, by + 7, 2, 5, C.BODY); p(8 + bx, by + 7, C.HI);
    b(22 + bx, by + 7, 2, 5, C.DK);
    // Legs (wobbly offset)
    b(11, by + 14, 4, 5, C.BODY); b(11, by + 14, 1, 5, C.HI);
    b(17 + bx, by + 14, 4, 5, C.BODY); b(20 + bx, by + 14, 1, 5, C.DK);
    // Feet
    b(10, by + 19, 5, 2, C.DK);
    b(16 + bx, by + 19, 5, 2, C.DK);
    // Extra crack glow along edges
    p(20 + bx, by + 6, C.CRACK); p(10 + bx, by + 13, C.CRACK);
  } else {
    drawDeathCrystal(p, b, f - 4, 16, 14);
  }
}

// 8: Shielded - Warded Construct
function drawShielded(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 5 + bob;
    // Standard golem body (same proportions as standard, scaled)
    b(12, by, 8, 5, C.BODY); b(13, by, 6, 2, C.MID);
    b(13, by, 6, 1, C.ENERGY); p(12, by, C.HI);
    b(13, by + 2, 2, 2, C.EYE); p(14, by + 2, C.WHITE);
    b(17, by + 2, 2, 2, C.EYE); p(18, by + 2, C.WHITE);
    b(10, by + 6, 12, 8, C.BODY);
    b(10, by + 6, 2, 8, C.HI); b(20, by + 6, 2, 8, C.DK);
    b(11, by + 6, 10, 1, C.ENERGY);
    b(14, by + 8, 4, 3, C.CRYST); b(15, by + 9, 2, 1, C.CORE);
    p(15, by + 8, C.WHITE);
    b(8, by + 7, 2, 5, C.BODY); p(8, by + 7, C.HI);
    b(22, by + 7, 2, 5, C.DK);
    b(11 + lOff, by + 14, 4, 5, C.BODY);
    b(17 + rOff, by + 14, 4, 5, C.BODY);
    b(10 + lOff, by + 19, 5, 2, C.DK);
    b(17 + rOff, by + 19, 5, 2, C.DK);
    // Spinning rune barrier (cyan circle, rotates per frame)
    const rot = f * 3;
    // Draw barrier as ring outline with more points
    for (let i = 0; i < 24; i++) {
      const a = (i + rot) * Math.PI / 12;
      const rx = 16 + Math.round(Math.cos(a) * 12);
      const ry = by + 8 + Math.round(Math.sin(a) * 10);
      if (i % 6 === 0) {
        // Rune marks at cardinal points
        p(rx, ry, C.WHITE); p(rx + 1, ry, C.CYAN); p(rx - 1, ry, C.CYAN);
      } else if (i % 3 === 0) {
        p(rx, ry, C.CYAN); p(rx, ry + 1, C.DKCYN);
      } else {
        p(rx, ry, i % 2 === 0 ? C.CYAN : C.DKCYN);
      }
    }
    // Cardinal barrier points (larger)
    b(3, by + 7, 2, 2, C.DKCYN); p(3, by + 7, C.CYAN);
    b(27, by + 7, 2, 2, C.DKCYN); p(28, by + 8, C.CYAN);
    b(15, by - 3, 2, 2, C.DKCYN); p(15, by - 3, C.CYAN);
    b(15, by + 20, 2, 2, C.DKCYN); p(16, by + 21, C.CYAN);
  } else {
    drawDeathCrystal(p, b, f - 4, 16, 14);
  }
}

// 9: Evasive - Phase Crystal
function drawEvasive(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    // Flickering position offset (more dramatic)
    const fx = [0, 4, -2, 2][f];
    const fy = [0, -2, 2, 0][f];
    const bx = 10 + fx, by = 7 + fy;
    // Diamond shape with gaps (semi-transparent look)
    b(bx + 4, by, 2, 1, C.WHITE);
    b(bx + 3, by + 1, 4, 1, C.HI);
    if (f !== 1) b(bx + 2, by + 2, 6, 2, C.ENERGY);
    else { p(bx + 2, by + 2, C.ENERGY); p(bx + 5, by + 2, C.HI); p(bx + 7, by + 2, C.ENERGY); }
    if (f !== 2) b(bx, by + 4, 10, 2, C.CRYST);
    else { b(bx, by + 4, 3, 2, C.CRYST); p(bx + 5, by + 4, C.HI); b(bx + 7, by + 4, 3, 2, C.CRYST); }
    b(bx, by + 6, 10, 2, C.BODY);
    if (f !== 3) b(bx + 2, by + 8, 6, 2, C.CRYST);
    else { p(bx + 2, by + 8, C.CRYST); p(bx + 5, by + 8, C.CRYST); p(bx + 7, by + 8, C.CRYST); }
    b(bx + 3, by + 10, 4, 1, C.ENERGY);
    b(bx + 4, by + 11, 2, 1, C.HI);
    // Facet highlight / shadow
    b(bx, by + 4, 2, 2, C.HI); b(bx + 8, by + 6, 2, 2, C.DK);
    // Core
    b(bx + 4, by + 4, 2, 3, C.WHITE);
    b(bx + 3, by + 5, 4, 2, C.CORE);
    p(bx + 4, by + 5, C.WHITE); p(bx + 5, by + 6, C.WHITE);
    // Ghost afterimages on alternate frames
    if (f === 1 || f === 3) {
      b(bx - 4, by + 4, 2, 2, C.DUST); b(bx - 4, by + 6, 2, 2, C.FRAG);
      p(bx - 5, by + 5, C.DUST);
    }
    if (f === 2) {
      b(bx + 12, by + 4, 2, 2, C.DUST); b(bx + 12, by + 6, 2, 2, C.FRAG);
      p(bx + 13, by + 5, C.DUST);
    }
    // Flicker particles
    if (f === 0) { p(bx - 2, by + 2, C.DUST); p(bx + 11, by + 8, C.DUST); }
    if (f === 3) { p(bx + 11, by + 2, C.FRAG); p(bx - 2, by + 8, C.FRAG); }
  } else {
    drawDeathCrystal(p, b, f - 4, 16, 13);
  }
}

// 10: Regenerator - Living Crystal
function drawRegenerator(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, 0, -1, 0][f];
    const by = 5 + bob;
    // Pulse brightness varies per frame
    const bright = f === 0 || f === 2;
    const bodyC = bright ? C.CRYST : C.BODY;
    const hiC = bright ? C.WHITE : C.HI;
    const coreC = bright ? C.WHITE : C.CORE;
    const midC = bright ? C.ENERGY : C.MID;
    // Organic crystal body (wider, irregular)
    b(14, by, 4, 2, C.ENERGY); p(14, by, hiC);
    b(12, by + 2, 8, 3, bodyC);
    b(10, by + 5, 12, 6, bodyC);
    b(11, by + 11, 10, 4, bodyC);
    b(13, by + 15, 6, 2, C.BODY);
    p(15, by + 17, C.DK);
    // Gradient shading
    b(10, by + 5, 2, 6, hiC); b(11, by + 6, 1, 4, midC);
    b(20, by + 5, 2, 6, C.DK); b(21, by + 7, 1, 4, C.VOID);
    b(11, by + 11, 2, 4, hiC); b(19, by + 11, 2, 4, C.DK);
    // Organic bumps / protrusions
    b(9, by + 6, 1, 3, C.ENERGY); p(9, by + 5, hiC);
    b(22, by + 7, 1, 3, C.FRAG); p(22, by + 9, C.DK);
    p(8, by + 8, C.ENERGY); p(23, by + 9, C.FRAG);
    // Pulsing core (larger)
    b(14, by + 7, 4, 3, coreC); b(13, by + 8, 6, 1, bright ? C.CORE : C.CRYST);
    p(15, by + 7, C.WHITE); p(16, by + 7, C.WHITE);
    p(15, by + 9, C.CRYST); p(16, by + 9, C.CRYST);
    // Growth tendrils
    b(10, by + 10, 2, 2, C.ENERGY); p(9, by + 11, C.CRYST);
    b(20, by + 9, 2, 2, C.ENERGY); p(21, by + 10, C.CRYST);
    p(12, by + 14, C.ENERGY); p(19, by + 14, C.ENERGY);
    // Eyes
    b(13, by + 3, 2, 2, C.EYE); p(13, by + 3, C.WHITE);
    b(17, by + 3, 2, 2, C.EYE); p(17, by + 3, C.WHITE);
    // Highlight edge
    b(12, by + 2, 2, 3, hiC);
    // Bottom shadow
    b(13, by + 15, 6, 1, C.DK); b(14, by + 16, 4, 1, C.VOID);
    // Bioluminescent spots
    p(11, by + 7, bright ? C.WHITE : C.ENERGY);
    p(19, by + 7, bright ? C.WHITE : C.ENERGY);
    p(15, by + 12, bright ? C.CORE : C.ENERGY);
  } else {
    drawDeathCrystal(p, b, f - 4, 16, 11);
  }
}

// 11: Flying - Arcane Hawk
function drawFlying(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    // Wing positions: up/mid/down/mid
    const wingY = [0, 2, 4, 2][f];
    const by = 8;
    // Body (horizontal, facing right) - longer, more detailed
    b(10, by + 5, 12, 4, C.BODY);
    b(10, by + 5, 12, 1, C.MID); b(10, by + 8, 12, 1, C.DK);
    b(8, by + 7, 2, 2, C.BODY); // tail base
    b(6, by + 7, 2, 2, C.DK); // tail tip
    p(5, by + 7, C.CRYST); p(5, by + 8, C.ENERGY); // tail crystal
    // Head
    b(20, by + 4, 4, 3, C.BODY); b(20, by + 4, 4, 1, C.MID); p(20, by + 4, C.HI);
    b(24, by + 5, 3, 2, C.ENERGY); // beak
    p(26, by + 5, C.HI); p(26, by + 6, C.DK);
    // Eye
    b(22, by + 4, 2, 1, C.EYE); p(22, by + 4, C.WHITE);
    // Crystal body highlights
    b(13, by + 5, 3, 2, C.CRYST); b(14, by + 6, 2, 1, C.CORE);
    p(14, by + 5, C.WHITE); p(15, by + 5, C.ENERGY);
    b(10, by + 5, 2, 4, C.HI);
    b(20, by + 7, 2, 2, C.DK);
    // Feather texture on body
    p(12, by + 6, C.MID); p(16, by + 6, C.MID); p(18, by + 6, C.MID);
    p(12, by + 8, C.DK); p(16, by + 8, C.DK);
    // Top wing
    b(10, by + 2 + wingY, 8, 2, C.CRYST);
    b(10, by + 2 + wingY, 8, 1, C.HI);
    b(8, by + 1 + wingY, 4, 1, C.ENERGY);
    b(6, by + wingY, 3, 1, C.HI);
    p(5, by + wingY - 1, C.MID);
    // Individual feather details on top wing
    p(11, by + 3 + wingY, C.ENERGY); p(14, by + 3 + wingY, C.ENERGY);
    p(17, by + 3 + wingY, C.ENERGY);
    // Bottom wing
    b(10, by + 10 - wingY, 8, 2, C.FRAG);
    b(10, by + 11 - wingY, 8, 1, C.DK);
    b(8, by + 11 - wingY, 4, 1, C.BODY);
    b(6, by + 12 - wingY, 3, 1, C.DK);
    // Feather details on bottom wing
    p(11, by + 10 - wingY, C.BODY); p(14, by + 10 - wingY, C.BODY);
    // Shadow below (elevated creature)
    b(12, by + 16, 6, 1, C.DK); b(13, by + 17, 4, 1, C.VOID);
    p(14, by + 18, C.VOID); p(15, by + 18, C.VOID);
  } else {
    drawDeathCrystal(p, b, f - 4, 16, 12);
  }
}

// Helper: draw mage base (robed figure with staff)
function drawMageBase(
  p: (x: number, y: number, cl: string) => void,
  b: (x: number, y: number, w: number, h: number, cl: string) => void,
  f: number, accentC: string, staffC: string, bodyMod?: string
) {
  const bob = [0, -1, 0, -1][f];
  const lOff = [0, 1, 0, -1][f];
  const rOff = [0, -1, 0, 1][f];
  const by = 4 + bob;
  const alpha = bodyMod === 'mist';
  const heavy = bodyMod === 'iron';
  const bodyC = alpha ? C.MIST : heavy ? C.DKGRAY : C.BODY;
  const robeC = alpha ? C.LTMIST : heavy ? C.GRAY : C.BODY;
  const hoodC = alpha ? C.MIST : heavy ? C.DKGRAY : C.DK;
  const robeHi = alpha ? C.LTMIST : heavy ? C.LTGRAY : C.HI;
  const robeMid = alpha ? C.MIST : heavy ? C.GRAY : C.MID;

  // Hooded head (triangle top, more detailed)
  b(14, by, 4, 1, C.HI);
  b(13, by + 1, 6, 1, hoodC); b(14, by + 1, 4, 1, robeHi);
  b(12, by + 2, 8, 3, hoodC);
  b(12, by + 2, 2, 3, robeHi); b(19, by + 3, 1, 2, C.DK);
  // Hood fold detail
  p(14, by + 2, robeMid); p(17, by + 2, robeMid);
  // Face shadow
  b(13, by + 3, 6, 2, C.VOID); b(14, by + 3, 4, 1, C.DK);
  // Eyes (glowing)
  b(14, by + 4, 2, 1, accentC); p(14, by + 4, C.WHITE);
  b(17, by + 4, 2, 1, accentC); p(17, by + 4, C.WHITE);
  // Robe body (wider at bottom, more detail)
  b(12, by + 5, 8, 4, robeC);
  b(12, by + 5, 2, 4, robeHi); b(19, by + 5, 1, 4, C.DK);
  b(10, by + 9, 12, 4, bodyC);
  b(10, by + 9, 2, 4, robeHi); b(11, by + 9, 1, 3, robeMid);
  b(20, by + 9, 2, 4, C.DK); b(21, by + 10, 1, 3, C.VOID);
  b(9, by + 13, 14, 4, bodyC);
  b(9, by + 13, 2, 4, robeHi);
  b(21, by + 13, 2, 4, C.DK); b(22, by + 14, 1, 3, C.VOID);
  b(8, by + 17, 16, 2, hoodC);
  b(8, by + 17, 2, 2, robeMid);
  b(22, by + 17, 2, 2, C.VOID);
  // Robe hem
  b(8, by + 19, 16, 1, C.VOID);
  // Robe detail lines
  p(14, by + 9, accentC); p(15, by + 10, accentC);
  p(16, by + 11, accentC); p(16, by + 12, accentC);
  // Robe folds
  p(12, by + 12, robeMid); p(19, by + 12, C.DK);
  p(11, by + 15, robeMid); p(20, by + 15, C.DK);
  // Staff in right hand (taller, more detailed)
  b(22, by + 1, 2, 16, heavy ? C.LTGRAY : C.FRAG);
  b(22, by + 1, 1, 16, heavy ? C.GRAY : C.DUST);
  // Staff top gem (larger)
  b(21, by - 1, 4, 2, staffC); b(22, by - 1, 2, 1, C.WHITE);
  p(21, by - 2, accentC); p(24, by - 2, accentC);
  p(22, by - 3, C.WHITE); p(23, by - 3, C.WHITE);
  // Staff wrapping detail
  p(22, by + 5, staffC); p(22, by + 9, staffC); p(22, by + 13, staffC);
  // Left arm (holding out)
  b(9, by + 7 + lOff, 3, 2, robeC); b(9, by + 7 + lOff, 1, 2, robeHi);
  p(8, by + 8 + lOff, bodyC);
  // Feet
  b(11 + lOff, by + 19, 3, 2, bodyC); b(11 + lOff, by + 20, 3, 1, hoodC);
  b(18 + rOff, by + 19, 3, 2, hoodC); b(18 + rOff, by + 20, 3, 1, C.VOID);
}

// 12: Mage Iron
function drawMageIron(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawMageBase(p, b, f, C.LTGRAY, C.GRAY, 'iron');
    // Extra: heavy armor plates
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    b(12, by + 7, 8, 2, C.DKGRAY);
    b(13, by + 7, 6, 1, C.GRAY);
    // Shoulder plates
    b(10, by + 9, 3, 2, C.GRAY); b(10, by + 9, 1, 2, C.LTGRAY);
    b(19, by + 9, 3, 2, C.DKGRAY);
    // Belt buckle
    b(14, by + 12, 4, 2, C.GRAY); b(15, by + 12, 2, 1, C.LTGRAY);
    // Armored hem detail
    p(10, by + 16, C.GRAY); p(21, by + 16, C.DKGRAY);
  } else {
    drawDeathCrystal(p, b, f - 4, 16, 14);
  }
}

// 13: Mage Haste
function drawMageHaste(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawMageBase(p, b, f, C.BLUE, C.LTBLUE, undefined);
    // Speed lines / energy trails behind (more, longer)
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    // Speed streaks at multiple heights
    b(5, by + 5, 3, 1, C.BLUE); b(3, by + 5, 2, 1, C.LTBLUE);
    b(4, by + 9, 4, 1, C.LTBLUE); p(2, by + 9, C.BLUE);
    b(5, by + 13, 3, 1, C.BLUE); p(3, by + 13, C.LTBLUE);
    b(6, by + 16, 2, 1, C.BLUE);
    // Extra particles on even frames
    if (f % 2 === 0) {
      p(2, by + 3, C.LTBLUE); p(1, by + 7, C.BLUE);
      b(3, by + 11, 2, 1, C.LTBLUE);
    } else {
      p(3, by + 4, C.BLUE); p(2, by + 8, C.LTBLUE);
      b(4, by + 12, 2, 1, C.BLUE);
    }
    // Motion blur particles
    p(1, by + 6, C.DUST); p(0, by + 10, C.DUST);
  } else {
    drawDeathCrystal(p, b, f - 4, 16, 14);
  }
}

// 14: Mage Mist
function drawMageMist(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawMageBase(p, b, f, C.LTMIST, C.MIST, 'mist');
    // Misty particles around (more, scattered)
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    const mx = [5, 7, 3, 8][f];
    const my = [7, 11, 5, 9][f];
    // Mist clouds (multi-pixel)
    b(mx, by + my, 2, 1, C.LTMIST); p(mx + 2, by + my + 1, C.MIST);
    b(mx + 16, by + my - 2, 2, 1, C.MIST); p(mx + 18, by + my - 1, C.LTMIST);
    // Additional mist wisps
    b(25, by + 3, 2, 1, C.LTMIST); p(26, by + 4, C.MIST);
    b(4, by + 15, 3, 1, C.MIST); p(3, by + 16, C.LTMIST);
    if (f === 1 || f === 3) {
      b(3, by + 14, 2, 1, C.MIST); p(2, by + 15, C.LTMIST);
      p(27, by + 8, C.MIST);
    }
    if (f === 0 || f === 2) {
      p(26, by + 6, C.LTMIST); p(5, by + 10, C.MIST);
    }
  } else {
    drawDeathCrystal(p, b, f - 4, 16, 14);
  }
}

// 15: Mage Heal
function drawMageHeal(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawMageBase(p, b, f, C.GREEN, C.DKGRN, undefined);
    // Green accents on staff and hands (larger, more detailed)
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    // Staff gem glow
    p(22, by - 3, C.GREEN); p(23, by - 3, C.GREEN);
    b(21, by - 1, 4, 1, C.GREEN); p(21, by - 2, C.DKGRN);
    p(24, by - 2, C.DKGRN);
    // Green heal particles from left hand
    const px_ = [7, 5, 8, 6][f];
    b(px_, by + 5, 2, 1, C.GREEN); p(px_ + 2, by + 4, C.DKGRN);
    p(px_ - 1, by + 6, C.GREEN);
    // Cross symbol near staff (larger)
    b(24, by + 5, 2, 1, C.GREEN);
    b(25, by + 4, 1, 3, C.GREEN);
    p(25, by + 3, C.DKGRN); p(25, by + 7, C.DKGRN);
    p(23, by + 5, C.DKGRN); p(26, by + 5, C.DKGRN);
    // Extra heal sparkles
    if (f % 2 === 0) {
      p(6, by + 3, C.GREEN); p(8, by + 8, C.DKGRN);
    } else {
      p(7, by + 2, C.DKGRN); p(5, by + 7, C.GREEN);
    }
  } else {
    drawDeathCrystal(p, b, f - 4, 16, 14);
  }
}

// ===== DEATH ANIMATION HELPER =====
function drawDeathCrystal(
  p: (x: number, y: number, cl: string) => void,
  b: (x: number, y: number, w: number, h: number, cl: string) => void,
  deathFrame: number, cx: number, cy: number
) {
  if (deathFrame === 0) {
    // Frame 0: Creature cracks/shatters - detailed silhouette with bright cracks
    b(cx - 4, cy - 4, 10, 10, C.BODY);
    b(cx - 3, cy - 5, 8, 2, C.BODY);
    b(cx - 2, cy - 6, 6, 1, C.MID);
    b(cx - 3, cy + 6, 8, 2, C.DK);
    b(cx - 2, cy + 7, 4, 1, C.VOID);
    // Shading on silhouette
    b(cx - 4, cy - 4, 2, 10, C.HI);
    b(cx + 4, cy - 2, 2, 8, C.DK);
    // Bright crack lines (more detailed network)
    p(cx, cy - 5, C.WHITE); p(cx + 1, cy - 4, C.CRACK);
    p(cx + 2, cy - 3, C.WHITE); p(cx + 3, cy - 2, C.CRACK);
    p(cx - 2, cy - 3, C.CRACK); p(cx - 3, cy - 2, C.WHITE);
    p(cx - 1, cy, C.CRACK); p(cx + 3, cy, C.WHITE);
    p(cx - 3, cy + 1, C.WHITE); p(cx + 1, cy + 1, C.CRACK);
    p(cx, cy + 2, C.WHITE); p(cx - 2, cy + 3, C.CRACK);
    p(cx + 2, cy + 3, C.CRACK); p(cx + 4, cy + 2, C.CRACK);
    p(cx - 4, cy + 2, C.WHITE);
    p(cx + 1, cy + 4, C.CRACK); p(cx - 1, cy + 5, C.CRACK);
    // Glow at center
    b(cx - 1, cy - 1, 3, 3, C.CORE);
    p(cx, cy, C.WHITE); p(cx - 1, cy, C.CORE); p(cx + 1, cy, C.CORE);
  } else if (deathFrame === 1) {
    // Frame 1: Pieces separate outward (more fragments)
    // Large fragments in 8 directions
    b(cx - 6, cy - 6, 2, 2, C.CRYST); p(cx - 6, cy - 6, C.HI);
    b(cx + 5, cy - 6, 2, 2, C.ENERGY); p(cx + 6, cy - 6, C.HI);
    b(cx - 7, cy - 1, 2, 2, C.BODY); p(cx - 7, cy - 1, C.HI);
    b(cx + 6, cy - 1, 2, 2, C.BODY); p(cx + 7, cy, C.DK);
    b(cx - 6, cy + 5, 2, 2, C.FRAG);
    b(cx + 5, cy + 5, 2, 2, C.FRAG); p(cx + 6, cy + 6, C.DK);
    b(cx - 1, cy - 7, 2, 2, C.CRYST); p(cx, cy - 7, C.HI);
    b(cx - 1, cy + 6, 2, 2, C.DK);
    // Smaller inner fragments
    p(cx - 3, cy - 3, C.CRACK); p(cx + 3, cy - 3, C.CRACK);
    p(cx - 3, cy + 3, C.ENERGY); p(cx + 3, cy + 3, C.ENERGY);
    p(cx - 2, cy - 1, C.CRYST); p(cx + 2, cy + 1, C.CRYST);
    // Tiny dust particles
    p(cx - 4, cy - 4, C.DUST); p(cx + 4, cy - 4, C.DUST);
    p(cx - 4, cy + 4, C.DUST); p(cx + 4, cy + 4, C.DUST);
    // Center flash (larger)
    b(cx - 1, cy - 1, 3, 3, C.WHITE);
    p(cx, cy, C.WHITE);
  } else {
    // Frame 2: Fading particles/dust (spread further)
    p(cx - 8, cy - 4, C.DUST); p(cx + 9, cy - 5, C.DUST);
    p(cx - 5, cy + 7, C.FRAG); p(cx + 6, cy + 8, C.DK);
    p(cx, cy - 9, C.DUST); p(cx + 2, cy + 9, C.DUST);
    p(cx + 2, cy, C.DUST); p(cx - 9, cy + 2, C.FRAG);
    // Even smaller fading specks
    p(cx - 6, cy - 7, C.FRAG); p(cx + 7, cy - 7, C.FRAG);
    p(cx - 7, cy + 5, C.DUST); p(cx + 8, cy + 6, C.DUST);
    p(cx - 3, cy - 6, C.DUST); p(cx + 4, cy - 8, C.FRAG);
    p(cx - 1, cy + 6, C.DK);
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
      const frame = row; // 0-3 walk, 4-6 death
      DRAW_FNS[col](ctx, [col * CELL, row * CELL], frame);
    }
  }
}

// ===== COMPONENT =====
export default function ArcaneCreepSprites() {
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
    const LW = 72; // label width
    const LH = 14; // label height
    pv.width = LW + COLS * CELL * S;
    pv.height = ROWS * (CELL * S + LH) + 10;
    const pc = pv.getContext('2d')!;
    pc.imageSmoothingEnabled = false;
    pc.fillStyle = '#0a0818';
    pc.fillRect(0, 0, pv.width, pv.height);

    for (let r = 0; r < ROWS; r++) {
      const by = r * (CELL * S + LH) + 5;
      pc.fillStyle = '#8866ff';
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
          pc.fillStyle = '#9988bb';
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
    <div style={{ background: '#0a0818', minHeight: '100vh', padding: 12, fontFamily: 'monospace' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <h2 style={{ color: C.CRYST, margin: 0, fontSize: 15 }}>ARCANE FACTION — Creep Spritesheet</h2>
        {ready && (
          <button
            onClick={download(sheetRef, 'arcane_creeps.png')}
            style={{
              background: C.CRYST, color: '#fff', border: 'none', padding: '5px 14px',
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
              color: view === v ? C.ENERGY : '#445566',
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
          data-label="Arcane Creeps (Preview)"
          data-frame-size="64x64"
          data-direction="right"
          data-columns='["Stone Golem (Standard)","Spark Wisp (Fast)","Obelisk Guardian (Armored)","Mana Mite (Swarm)","Arcane Font (Healer)","Crystal Titan (Boss)","Construct Troop (Group)","Fractured Golem (Splitter)","Warded Construct (Shielded)","Phase Crystal (Evasive)","Living Crystal (Regen)","Arcane Hawk (Flying)","Stoneskin Mage (Iron)","Chrono Mage (Haste)","Illusionist (Mist)","Lifestone Mage (Heal)"]'
          data-rows='["Walk 1","Walk 2","Walk 3","Walk 4","Death 1","Death 2","Death 3"]'
          data-presets='[{"name":"Walk","startRow":0,"endRow":3},{"name":"Death","startRow":4,"endRow":6}]'
          style={{ display: view === 'preview' ? 'block' : 'none', maxWidth: '100%' }}
        />
        <canvas
          ref={sheetRef}
          data-label="Arcane Creeps"
          data-frame-size="64x64"
          data-direction="right"
          data-columns='["Stone Golem (Standard)","Spark Wisp (Fast)","Obelisk Guardian (Armored)","Mana Mite (Swarm)","Arcane Font (Healer)","Crystal Titan (Boss)","Construct Troop (Group)","Fractured Golem (Splitter)","Warded Construct (Shielded)","Phase Crystal (Evasive)","Living Crystal (Regen)","Arcane Hawk (Flying)","Stoneskin Mage (Iron)","Chrono Mage (Haste)","Illusionist (Mist)","Lifestone Mage (Heal)"]'
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
      <div style={{ color: '#554488', fontSize: 9, marginTop: 10, maxWidth: 700 }}>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#8866bb' }}>Sheet:</b> {SHEET_W}x{SHEET_H}px ({COLS} cols x {ROWS} rows) — {CELL}x{CELL} cells
        </p>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#8866bb' }}>Phaser:</b>{' '}
          <code style={{ color: C.ENERGY }}>
            {"this.load.spritesheet('arcane_creeps','arcane_creeps.png',{frameWidth:64,frameHeight:64})"}
          </code>
        </p>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#8866bb' }}>Layout:</b> 16 cols (creep types) x 7 rows (walk0-3, death0-2). Frame index = row * 16 + col.
        </p>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#8866bb' }}>Types:</b> {CREEP_NAMES.join(', ')}
        </p>
      </div>
    </div>
  );
}
