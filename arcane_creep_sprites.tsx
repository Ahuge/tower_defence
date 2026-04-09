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
const PX = 2, GRID = 16, CELL = GRID * PX; // 32x32 pixel cells
const COLS = 16; // 16 creep types
const ROWS = 7;  // walk0-3, death0-2
const SHEET_W = COLS * CELL; // 512
const SHEET_H = ROWS * CELL; // 224

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
    // Walk cycle
    const bob = [0, -1, 0, -1][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 3 + bob;
    // Head
    b(6, by, 4, 3, C.BODY); b(7, by, 2, 1, C.ENERGY); p(6, by, C.HI);
    // Eyes
    p(7, by + 1, C.EYE); p(8, by + 1, C.EYE);
    // Torso
    b(5, by + 3, 6, 4, C.BODY); b(6, by + 3, 4, 1, C.ENERGY);
    b(5, by + 3, 1, 4, C.HI); b(10, by + 3, 1, 4, C.DK);
    // Crystal core in chest
    p(7, by + 4, C.CRYST); p(8, by + 5, C.CORE);
    // Arms
    b(4, by + 4, 1, 3, C.BODY); p(4, by + 4, C.HI);
    b(11, by + 4, 1, 3, C.DK);
    // Legs
    b(6 + lOff, by + 7, 2, 3, C.BODY); p(6 + lOff, by + 7, C.HI);
    b(8 + rOff, by + 7, 2, 3, C.BODY); p(9 + rOff, by + 9, C.DK);
    // Feet
    p(6 + lOff, by + 10, C.DK); p(9 + rOff, by + 10, C.DK);
    // Top highlight
    p(7, by - 1, C.ENERGY);
  } else {
    drawDeathCrystal(p, b, f - 4, 8, 7);
  }
}

// 1: Fast - Spark Wisp
function drawFast(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 1, 0][f];
    const by = 5 + bob;
    // Diamond/shard shape
    p(8, by, C.HI);
    b(7, by + 1, 3, 1, C.ENERGY);
    b(7, by + 2, 3, 1, C.CRYST);
    b(6, by + 3, 5, 1, C.BODY);
    b(7, by + 4, 3, 1, C.CRYST);
    p(8, by + 5, C.ENERGY);
    // Bright core
    p(8, by + 2, C.WHITE); p(8, by + 3, C.CORE);
    // Left highlight
    p(6, by + 3, C.HI);
    // Trail behind (left side since facing right)
    const trail = [1, 2, 0, 1][f];
    p(5, by + 3 + trail, C.ENERGY); p(4, by + 3, C.DUST);
    p(3, by + 4, C.DUST); p(2, by + 3, C.FRAG);
    if (f % 2 === 0) p(1, by + 3, C.DK);
  } else {
    drawDeathCrystal(p, b, f - 4, 8, 8);
  }
}

// 2: Armored - Obelisk Guardian
function drawArmored(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, 0, -1, 0][f];
    const lOff = [0, 0, 1, 0][f];
    const rOff = [0, 0, 0, 1][f];
    const by = 3 + bob;
    // Wide hexagonal body
    b(4, by, 8, 1, C.BODY);
    b(3, by + 1, 10, 2, C.BODY);
    b(3, by + 3, 10, 3, C.BODY);
    b(4, by + 6, 8, 2, C.BODY);
    b(5, by + 8, 6, 1, C.BODY);
    // Layered plate shading
    b(3, by + 1, 1, 5, C.HI);   // left highlight
    b(12, by + 1, 1, 5, C.DK);  // right shadow
    b(4, by, 8, 1, C.HI);       // top highlight
    b(5, by + 8, 6, 1, C.DK);   // bottom shadow
    // Plate details
    b(5, by + 2, 6, 1, C.ENERGY); b(5, by + 5, 6, 1, C.DK);
    // Face/visor
    p(6, by + 1, C.EYE); p(9, by + 1, C.EYE);
    b(6, by + 2, 4, 1, C.VOID);
    // Crystal core
    p(7, by + 4, C.CRYST); p(8, by + 4, C.CORE);
    // Stubby legs
    b(5 + lOff, by + 9, 2, 2, C.BODY); p(5 + lOff, by + 9, C.HI);
    b(9 + rOff, by + 9, 2, 2, C.DK);
    p(5 + lOff, by + 10, C.DK); p(10 + rOff, by + 10, C.VOID);
  } else {
    drawDeathCrystal(p, b, f - 4, 8, 7);
  }
}

// 3: Swarm - Mana Mite
function drawSwarm(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const jx = [0, 1, -1, 0][f];
    const jy = [0, 0, 1, -1][f];
    const bx = 7 + jx, by = 6 + jy;
    // Tiny triangle crystal
    p(bx + 1, by, C.HI);
    b(bx, by + 1, 3, 1, C.CRYST);
    b(bx, by + 2, 3, 1, C.BODY);
    p(bx + 1, by + 3, C.DK);
    // Eye
    p(bx + 1, by + 1, C.EYE);
    // Sparkle
    p(bx + 2, by, C.ENERGY);
  } else {
    drawDeathCrystal(p, b, f - 4, 8, 8);
  }
}

// 4: Healer - Arcane Font
function drawHealer(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, 1][f];
    const by = 5 + bob;
    // Hovering orb
    b(6, by, 4, 1, C.ENERGY);
    b(5, by + 1, 6, 3, C.CRYST);
    b(6, by + 4, 4, 1, C.ENERGY);
    // Inner glow
    b(6, by + 1, 4, 3, C.ENERGY);
    p(7, by + 2, C.WHITE); p(8, by + 2, C.CORE);
    // Highlight / shadow
    p(5, by + 1, C.HI); p(10, by + 3, C.DK);
    p(6, by, C.HI);
    // Ring around orb (2px offset)
    const pulse = [0, 1, 0, -1][f];
    p(4, by + 2 + pulse, C.ENERGY); p(11, by + 2 - pulse, C.ENERGY);
    p(8, by - 1 + pulse, C.ENERGY); p(7, by + 5 - pulse, C.ENERGY);
    // Soft glow below
    p(7, by + 6, C.DUST); p(8, by + 6, C.DUST);
  } else {
    drawDeathCrystal(p, b, f - 4, 8, 7);
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
    // Crown of crystal shards
    p(5, by, C.HI); p(7, by - 1, C.ENERGY); p(8, by, C.CRYST);
    p(10, by - 1, C.HI); p(11, by, C.ENERGY);
    // Head (wide)
    b(5, by + 1, 7, 3, C.BODY);
    b(5, by + 1, 7, 1, C.ENERGY);
    p(5, by + 1, C.HI); p(11, by + 3, C.DK);
    // Eyes (glowing)
    p(6, by + 2, C.EYE); p(7, by + 2, C.WHITE);
    p(9, by + 2, C.EYE); p(10, by + 2, C.WHITE);
    // Shoulder crystals
    p(3, by + 3, C.CRYST); p(2, by + 2, C.HI);
    p(13, by + 3, C.CRYST); p(14, by + 2, C.ENERGY);
    // Massive torso
    b(3, by + 4, 11, 5, C.BODY);
    b(3, by + 4, 1, 5, C.HI); b(13, by + 4, 1, 5, C.DK);
    b(4, by + 4, 9, 1, C.ENERGY);
    // Multiple crystal growths on body
    p(5, by + 5, C.CRYST); p(6, by + 6, C.CORE);
    p(10, by + 5, C.CRYST); p(11, by + 6, C.CORE);
    p(8, by + 7, C.CRYST);
    // Belt detail
    b(4, by + 8, 9, 1, C.DK);
    // Arms (thick)
    b(2, by + 5, 1, 4, C.BODY); p(2, by + 5, C.HI);
    b(1, by + 6, 1, 2, C.BODY); p(1, by + 6, C.HI);
    b(14, by + 5, 1, 4, C.DK);
    b(15, by + 6, 1, 2, C.DK);
    // Legs (thick)
    b(4 + lOff, by + 9, 3, 4, C.BODY);
    p(4 + lOff, by + 9, C.HI); p(6 + lOff, by + 12, C.DK);
    b(9 + rOff, by + 9, 3, 4, C.BODY);
    p(11 + rOff, by + 12, C.DK);
    // Feet
    b(3 + lOff, by + 13, 4, 1, C.DK);
    b(9 + rOff, by + 13, 4, 1, C.DK);
  } else {
    drawDeathCrystal(p, b, f - 4, 8, 7);
  }
}

// 6: Group - Construct Troop (smaller standard)
function drawGroup(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 5 + bob;
    // Smaller head
    b(7, by, 3, 2, C.BODY); p(7, by, C.HI); b(8, by, 1, 1, C.ENERGY);
    // Eyes
    p(7, by + 1, C.EYE); p(8, by + 1, C.EYE);
    // Torso (compact)
    b(6, by + 2, 5, 3, C.BODY); b(6, by + 2, 1, 3, C.HI); b(10, by + 2, 1, 3, C.DK);
    // Core
    p(8, by + 3, C.CRYST);
    // Legs
    b(6 + lOff, by + 5, 2, 2, C.BODY); p(6 + lOff, by + 5, C.HI);
    b(9 + rOff, by + 5, 2, 2, C.BODY); p(10 + rOff, by + 6, C.DK);
    // Arms (small stubs)
    p(5, by + 3, C.BODY); p(11, by + 3, C.DK);
  } else {
    drawDeathCrystal(p, b, f - 4, 8, 8);
  }
}

// 7: Splitter - Fractured Golem
function drawSplitter(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, 1][f]; // wobble
    const wobX = [0, 1, 0, -1][f];
    const by = 3 + bob;
    const bx = wobX;
    // Head
    b(6 + bx, by, 4, 3, C.BODY); b(7 + bx, by, 2, 1, C.ENERGY); p(6 + bx, by, C.HI);
    // Eyes
    p(7 + bx, by + 1, C.EYE); p(8 + bx, by + 1, C.EYE);
    // Torso
    b(5 + bx, by + 3, 6, 4, C.BODY);
    b(5 + bx, by + 3, 1, 4, C.HI); b(10 + bx, by + 3, 1, 4, C.DK);
    // Crack lines through body (bright pixels)
    p(6 + bx, by + 1, C.CRACK); p(7 + bx, by + 3, C.CRACK);
    p(8 + bx, by + 4, C.CRACK); p(9 + bx, by + 5, C.CRACK);
    p(6 + bx, by + 5, C.CRACK); p(5 + bx, by + 6, C.CRACK);
    p(7 + bx, by + 6, C.CRACK);
    // Crystal core
    p(8 + bx, by + 4, C.CORE);
    // Legs (wobbly offset)
    b(6, by + 7, 2, 3, C.BODY);
    b(8 + bx, by + 7, 2, 3, C.BODY);
    p(6, by + 9, C.DK); p(9 + bx, by + 9, C.DK);
    // Crack glow
    p(10 + bx, by + 3, C.CRACK);
  } else {
    drawDeathCrystal(p, b, f - 4, 8, 7);
  }
}

// 8: Shielded - Warded Construct
function drawShielded(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 3 + bob;
    // Standard golem body (same as standard)
    b(6, by, 4, 3, C.BODY); b(7, by, 2, 1, C.ENERGY); p(6, by, C.HI);
    p(7, by + 1, C.EYE); p(8, by + 1, C.EYE);
    b(5, by + 3, 6, 4, C.BODY);
    b(5, by + 3, 1, 4, C.HI); b(10, by + 3, 1, 4, C.DK);
    p(7, by + 4, C.CRYST); p(8, by + 5, C.CORE);
    b(4, by + 4, 1, 3, C.BODY);
    b(11, by + 4, 1, 3, C.DK);
    b(6 + lOff, by + 7, 2, 3, C.BODY);
    b(8 + rOff, by + 7, 2, 3, C.BODY);
    // Spinning rune barrier (cyan circle, rotates per frame)
    const rot = f * 2;
    // Draw barrier as ring outline
    for (let i = 0; i < 12; i++) {
      const a = (i + rot) * Math.PI / 6;
      const rx = 8 + Math.round(Math.cos(a) * 6);
      const ry = by + 4 + Math.round(Math.sin(a) * 5);
      p(rx, ry, i % 3 === 0 ? C.WHITE : C.CYAN);
    }
    // Cardinal barrier points
    p(2, by + 4, C.DKCYN); p(14, by + 4, C.DKCYN);
    p(8, by - 2, C.DKCYN); p(8, by + 10, C.DKCYN);
  } else {
    drawDeathCrystal(p, b, f - 4, 8, 7);
  }
}

// 9: Evasive - Phase Crystal
function drawEvasive(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    // Flickering position offset
    const fx = [0, 2, -1, 1][f];
    const fy = [0, -1, 1, 0][f];
    const bx = 6 + fx, by = 4 + fy;
    // Diamond shape with gaps (semi-transparent look)
    p(bx + 2, by, C.HI);
    if (f !== 1) p(bx + 1, by + 1, C.ENERGY);
    p(bx + 3, by + 1, C.ENERGY);
    if (f !== 2) b(bx, by + 2, 5, 1, C.CRYST);
    else { p(bx, by + 2, C.CRYST); p(bx + 2, by + 2, C.HI); p(bx + 4, by + 2, C.CRYST); }
    b(bx, by + 3, 5, 1, C.BODY);
    if (f !== 3) p(bx + 1, by + 4, C.CRYST);
    p(bx + 3, by + 4, C.CRYST);
    p(bx + 2, by + 5, C.ENERGY);
    // Core
    p(bx + 2, by + 2, C.WHITE); p(bx + 2, by + 3, C.CORE);
    // Ghost afterimage on alternate frames
    if (f === 1 || f === 3) {
      p(bx - 2, by + 2, C.DUST); p(bx - 2, by + 3, C.DUST);
    }
    if (f === 2) {
      p(bx + 6, by + 2, C.DUST); p(bx + 6, by + 3, C.DUST);
    }
  } else {
    drawDeathCrystal(p, b, f - 4, 8, 7);
  }
}

// 10: Regenerator - Living Crystal
function drawRegenerator(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, 0, -1, 0][f];
    const by = 3 + bob;
    // Pulse brightness varies per frame
    const bright = f === 0 || f === 2;
    const bodyC = bright ? C.CRYST : C.BODY;
    const hiC = bright ? C.WHITE : C.HI;
    const coreC = bright ? C.WHITE : C.CORE;
    // Organic crystal body (wider, irregular)
    p(7, by, C.ENERGY);
    b(6, by + 1, 4, 2, bodyC);
    b(5, by + 3, 6, 3, bodyC);
    b(6, by + 6, 5, 2, bodyC);
    p(7, by + 8, C.BODY);
    // Organic bumps
    p(5, by + 2, hiC); p(11, by + 4, C.DK);
    p(4, by + 4, C.ENERGY);
    p(11, by + 5, C.FRAG);
    // Pulsing core
    p(7, by + 4, coreC); p(8, by + 4, coreC);
    p(7, by + 5, C.CRYST);
    // Growth tendrils
    p(5, by + 6, C.ENERGY); p(10, by + 5, C.ENERGY);
    // Eyes
    p(6, by + 2, C.EYE); p(9, by + 2, C.EYE);
    // Highlight edge
    b(6, by + 1, 1, 2, hiC);
    // Bottom shadow
    b(6, by + 7, 4, 1, C.DK);
  } else {
    drawDeathCrystal(p, b, f - 4, 8, 6);
  }
}

// 11: Flying - Arcane Hawk
function drawFlying(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    // Wing positions: up/mid/down/mid
    const wingY = [0, 1, 2, 1][f];
    const by = 4;
    // Body (horizontal, facing right)
    b(6, by + 3, 5, 2, C.BODY);
    b(5, by + 4, 1, 1, C.BODY); // tail
    p(11, by + 3, C.ENERGY); // beak
    p(11, by + 4, C.BODY);
    // Head
    b(9, by + 2, 2, 1, C.BODY); p(9, by + 2, C.HI);
    p(10, by + 2, C.EYE);
    // Crystal body highlight
    p(7, by + 3, C.CRYST); p(8, by + 3, C.CORE);
    b(6, by + 3, 1, 2, C.HI);
    b(10, by + 4, 1, 1, C.DK);
    // Wings
    // Left wing (top)
    b(6, by + 1 + wingY, 3, 1, C.CRYST);
    p(5, by + wingY, C.ENERGY);
    p(4, by + wingY - 1, C.HI);
    // Right wing (bottom mirror isn't needed since we only show right-facing top-down-ish)
    // Actually let's do both wings visible from side
    b(6, by + 5 - wingY, 3, 1, C.FRAG);
    p(5, by + 6 - wingY, C.BODY);
    // Tail crystal
    p(4, by + 4, C.CRYST); p(3, by + 4, C.ENERGY);
    // Shadow below (elevated creature)
    p(7, by + 8, C.DK); p(8, by + 8, C.DK); p(9, by + 8, C.VOID);
  } else {
    drawDeathCrystal(p, b, f - 4, 8, 6);
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
  const by = 3 + bob;
  const alpha = bodyMod === 'mist'; // lighter colors for mist
  const heavy = bodyMod === 'iron'; // darker for iron
  const bodyC = alpha ? C.MIST : heavy ? C.DKGRAY : C.BODY;
  const robeC = alpha ? C.LTMIST : heavy ? C.GRAY : C.BODY;
  const hoodC = alpha ? C.MIST : heavy ? C.DKGRAY : C.DK;

  // Hooded head (triangle top)
  p(7, by, C.HI);
  b(6, by + 1, 4, 2, hoodC);
  p(6, by + 1, alpha ? C.LTMIST : C.HI);
  // Face shadow
  p(7, by + 2, C.VOID); p(8, by + 2, C.VOID);
  // Eyes
  p(7, by + 2, accentC); p(8, by + 2, accentC);
  // Robe body (wider at bottom)
  b(6, by + 3, 4, 2, robeC);
  b(5, by + 5, 6, 2, bodyC);
  b(5, by + 7, 7, 2, bodyC);
  b(4, by + 9, 8, 1, hoodC);
  // Highlight left, shadow right
  p(5, by + 5, alpha ? C.LTMIST : C.HI);
  p(11, by + 7, C.DK);
  // Robe detail line
  p(7, by + 5, accentC); p(8, by + 6, accentC);
  // Staff in right hand
  b(11, by + 1, 1, 8, heavy ? C.LTGRAY : C.FRAG);
  p(11, by, staffC); p(11, by + 1, staffC);
  // Staff top gem
  p(11, by - 1, C.WHITE);
  // Left arm
  p(5, by + 4 + lOff, robeC);
  // Feet
  p(6 + lOff, by + 10, bodyC); p(9 + rOff, by + 10, hoodC);
}

// 12: Mage Iron
function drawMageIron(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawMageBase(p, b, f, C.LTGRAY, C.GRAY, 'iron');
    // Extra: heavy armor lines
    const bob = [0, -1, 0, -1][f];
    const by = 3 + bob;
    b(6, by + 4, 4, 1, C.DKGRAY);
    p(5, by + 6, C.GRAY); p(10, by + 6, C.DKGRAY);
  } else {
    drawDeathCrystal(p, b, f - 4, 8, 7);
  }
}

// 13: Mage Haste
function drawMageHaste(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawMageBase(p, b, f, C.BLUE, C.LTBLUE, undefined);
    // Speed lines / energy trails behind
    const bob = [0, -1, 0, -1][f];
    const by = 3 + bob;
    p(3, by + 3, C.BLUE); p(2, by + 5, C.LTBLUE);
    p(3, by + 7, C.BLUE); p(1, by + 4, C.DUST);
    if (f % 2 === 0) { p(2, by + 2, C.LTBLUE); p(1, by + 6, C.BLUE); }
  } else {
    drawDeathCrystal(p, b, f - 4, 8, 7);
  }
}

// 14: Mage Mist
function drawMageMist(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawMageBase(p, b, f, C.LTMIST, C.MIST, 'mist');
    // Misty particles around
    const bob = [0, -1, 0, -1][f];
    const by = 3 + bob;
    const mx = [3, 4, 2, 5][f];
    const my = [4, 6, 3, 5][f];
    p(mx, by + my, C.LTMIST); p(mx + 8, by + my - 1, C.MIST);
    p(13, by + 2, C.LTMIST);
    if (f === 1 || f === 3) p(2, by + 8, C.MIST);
  } else {
    drawDeathCrystal(p, b, f - 4, 8, 7);
  }
}

// 15: Mage Heal
function drawMageHeal(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawMageBase(p, b, f, C.GREEN, C.DKGRN, undefined);
    // Green accents on staff and hands
    const bob = [0, -1, 0, -1][f];
    const by = 3 + bob;
    p(11, by - 1, C.GREEN); p(11, by, C.GREEN);
    p(12, by, C.DKGRN);
    // Heal particles
    const px_ = [4, 3, 5, 4][f];
    p(px_, by + 3, C.GREEN); p(px_ + 1, by + 2, C.DKGRN);
    // Cross symbol near staff
    p(12, by + 3, C.GREEN);
    p(11, by + 4, C.GREEN); p(13, by + 4, C.GREEN);
    p(12, by + 5, C.GREEN);
  } else {
    drawDeathCrystal(p, b, f - 4, 8, 7);
  }
}

// ===== DEATH ANIMATION HELPER =====
function drawDeathCrystal(
  p: (x: number, y: number, cl: string) => void,
  b: (x: number, y: number, w: number, h: number, cl: string) => void,
  deathFrame: number, cx: number, cy: number
) {
  if (deathFrame === 0) {
    // Frame 0: Creature cracks/shatters - bright crack lines appear on a silhouette
    b(cx - 2, cy - 2, 5, 5, C.BODY);
    b(cx - 1, cy - 3, 3, 1, C.BODY);
    b(cx - 1, cy + 3, 3, 1, C.DK);
    // Bright crack lines
    p(cx, cy - 2, C.WHITE); p(cx + 1, cy - 1, C.CRACK);
    p(cx - 1, cy, C.CRACK); p(cx + 2, cy, C.WHITE);
    p(cx, cy + 1, C.CRACK); p(cx - 2, cy + 1, C.WHITE);
    p(cx + 1, cy + 2, C.CRACK);
    // Glow at center
    p(cx, cy, C.CORE);
  } else if (deathFrame === 1) {
    // Frame 1: Pieces separate outward (fragments flying)
    // Fragments in 8 directions
    p(cx - 3, cy - 3, C.CRYST); p(cx + 3, cy - 3, C.ENERGY);
    p(cx - 4, cy, C.BODY); p(cx + 4, cy, C.BODY);
    p(cx - 3, cy + 3, C.FRAG); p(cx + 3, cy + 3, C.FRAG);
    p(cx, cy - 4, C.CRYST); p(cx, cy + 4, C.DK);
    // Smaller inner fragments
    p(cx - 1, cy - 1, C.CRACK); p(cx + 1, cy - 1, C.CRACK);
    p(cx - 1, cy + 1, C.ENERGY); p(cx + 1, cy + 1, C.ENERGY);
    // Center flash
    p(cx, cy, C.WHITE);
  } else {
    // Frame 2: Fading particles/dust
    p(cx - 4, cy - 2, C.DUST); p(cx + 5, cy - 3, C.DUST);
    p(cx - 2, cy + 4, C.FRAG); p(cx + 3, cy + 5, C.DK);
    p(cx, cy - 5, C.DUST);
    p(cx + 1, cy, C.DUST); p(cx - 5, cy + 1, C.FRAG);
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
          style={{ display: view === 'preview' ? 'block' : 'none', maxWidth: '100%' }}
        />
        <canvas
          ref={sheetRef}
          data-label="Arcane Creeps"
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
            {"this.load.spritesheet('arcane_creeps','arcane_creeps.png',{frameWidth:32,frameHeight:32})"}
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
