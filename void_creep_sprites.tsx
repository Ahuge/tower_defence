import { useRef, useEffect, useState, useCallback } from "react";

// ===== VOID CREEP PALETTE =====
const C = {
  VOID_DK: '#110022',   // deepest void
  BODY: '#2a1848',       // main body purple
  MID: '#3a2860',        // mid-tone
  LIGHT: '#5a3880',      // light body
  ENERGY: '#dd44ff',     // void energy
  BRIGHT: '#ff88ff',     // bright energy
  EYE: '#ff4488',        // eye pink
  CORE: '#ffaadd',       // core glow
  TENT: '#4a2868',       // tentacle
  HI: '#8855aa',         // highlight
  SHADOW: '#1a0832',     // shadow
  PINK: '#ff66aa',       // pink accent
  MAGENTA: '#cc33cc',    // magenta
  RIFT: '#6622aa',       // rift color
  GLOW: '#aa55dd',       // glow
  WHITE: '#ffffff',
  // Extra shading
  DKBODY: '#1e1038',     // dark body
  DKRIFT: '#440088',     // dark rift
  FRAG: '#553388',       // fragment
  DUST: '#331155',       // fading dust
  DKENERGY: '#9933cc',   // dark energy
  GRAY: '#555566',       // iron mage gray
  DKGRAY: '#333344',     // dark gray
  LTGRAY: '#777788',     // light gray
  TEAL: '#4466aa',       // haste accents
  LTTEAL: '#6688cc',     // light teal
  MIST: '#443366',       // mist color
  LTMIST: '#665588',     // light mist
  GREEN: '#66dd88',      // heal accents (inverted glow)
  DKGRN: '#338855',      // dark green
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

// 0: Void Walker (Standard) - Humanoid with wrong proportions, too-long arms, single pink eye
function drawStandard(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 5 + bob;
    // Head (slightly misshapen)
    b(13, by, 6, 5, C.BODY); b(14, by, 4, 2, C.MID);
    b(12, by + 1, 1, 3, C.BODY); p(12, by + 1, C.LIGHT);
    b(19, by + 2, 1, 2, C.SHADOW);
    // Single large eye (center of head)
    b(14, by + 2, 4, 2, C.EYE); b(15, by + 2, 2, 1, C.PINK);
    p(16, by + 2, C.WHITE); p(15, by + 3, C.CORE);
    // Forehead void glow
    p(14, by, C.ENERGY); p(17, by, C.GLOW);
    // Neck
    b(14, by + 5, 4, 1, C.SHADOW);
    // Torso (narrow, wrong proportions)
    b(12, by + 6, 8, 7, C.BODY);
    b(12, by + 6, 2, 7, C.LIGHT); b(19, by + 6, 1, 7, C.SHADOW);
    b(13, by + 6, 6, 1, C.MID);
    // Void core in chest
    b(14, by + 8, 4, 3, C.RIFT); b(15, by + 9, 2, 1, C.ENERGY);
    p(15, by + 8, C.BRIGHT); p(16, by + 10, C.GLOW);
    // Arms (too long, reaching past knees)
    b(9, by + 7, 2, 8, C.BODY); b(9, by + 7, 1, 8, C.LIGHT);
    b(8, by + 10, 1, 5, C.BODY); p(8, by + 10, C.MID);
    b(7, by + 13, 1, 4, C.BODY); p(7, by + 13, C.LIGHT);
    b(22, by + 7, 2, 8, C.BODY); b(23, by + 7, 1, 8, C.SHADOW);
    b(24, by + 10, 1, 5, C.SHADOW);
    b(25, by + 13, 1, 4, C.SHADOW);
    // Clawed hands
    p(6, by + 17, C.TENT); p(7, by + 17, C.BODY);
    p(25, by + 17, C.SHADOW); p(26, by + 17, C.TENT);
    // Legs
    b(12 + lOff, by + 13, 3, 6, C.BODY);
    b(12 + lOff, by + 13, 1, 6, C.LIGHT);
    b(17 + rOff, by + 13, 3, 6, C.BODY);
    b(19 + rOff, by + 13, 1, 6, C.SHADOW);
    // Feet
    b(11 + lOff, by + 19, 4, 2, C.SHADOW); b(11 + lOff, by + 19, 2, 1, C.BODY);
    b(17 + rOff, by + 19, 4, 2, C.SHADOW);
    // Void wisps
    p(10, by + 5, C.GLOW); p(21, by + 9, C.RIFT);
  } else {
    drawDeathVoid(p, b, f - 4, 16, 14);
  }
}

// 1: Blink Stalker (Fast) - Elongated shadow, teleport-flash trail
function drawFast(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -2, 2, 0][f];
    const by = 8 + bob;
    // Elongated shadow body (vertical diamond-ish)
    p(16, by - 1, C.ENERGY);
    b(15, by, 3, 1, C.GLOW);
    b(14, by + 1, 5, 2, C.BODY);
    b(13, by + 3, 7, 3, C.BODY);
    b(14, by + 6, 5, 3, C.BODY);
    b(15, by + 9, 3, 2, C.SHADOW);
    p(16, by + 11, C.VOID_DK);
    // Barely solid shading
    b(13, by + 3, 1, 3, C.MID); b(19, by + 3, 1, 3, C.VOID_DK);
    b(14, by + 1, 1, 2, C.LIGHT); b(18, by + 2, 1, 1, C.SHADOW);
    // Core eye
    b(15, by + 3, 3, 2, C.EYE); p(16, by + 3, C.WHITE);
    p(16, by + 4, C.PINK); p(17, by + 3, C.CORE);
    // Teleport flash trail (behind)
    const trail = [1, 3, 0, 2][f];
    b(10, by + 3 + trail, 2, 1, C.BRIGHT); p(9, by + 4, C.ENERGY);
    b(7, by + 3, 2, 1, C.GLOW); p(6, by + 4 + trail, C.GLOW);
    b(4, by + 3, 2, 1, C.RIFT); p(3, by + 4, C.RIFT);
    p(2, by + 3, C.DUST);
    if (f % 2 === 0) {
      p(1, by + 4, C.VOID_DK); p(5, by + 2, C.DUST);
      p(8, by + 5, C.FRAG);
    } else {
      p(5, by + 5, C.DUST); p(8, by + 2, C.FRAG);
    }
    // Afterimage flicker
    if (f === 1) { b(19, by + 3, 2, 2, C.DUST); p(20, by + 4, C.FRAG); }
    if (f === 3) { b(11, by + 5, 2, 2, C.DUST); }
  } else {
    drawDeathVoid(p, b, f - 4, 16, 14);
  }
}

// 2: Void Shell (Armored) - Thick spiral nautilus shell, dark carapace
function drawArmored(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, 0, -1, 0][f];
    const lOff = [0, 0, 1, 0][f];
    const rOff = [0, 0, 0, 1][f];
    const by = 3 + bob;
    // Large nautilus shell (spiral)
    b(9, by, 14, 2, C.SHADOW); b(10, by, 12, 1, C.BODY);
    b(7, by + 2, 18, 4, C.BODY);
    b(6, by + 6, 20, 6, C.BODY);
    b(7, by + 12, 18, 3, C.BODY);
    b(9, by + 15, 14, 2, C.BODY);
    // Carapace shading
    b(6, by + 2, 2, 10, C.LIGHT); b(7, by + 3, 1, 8, C.MID);
    b(24, by + 2, 2, 10, C.SHADOW); b(25, by + 4, 1, 8, C.VOID_DK);
    b(9, by, 14, 2, C.MID);
    b(9, by + 15, 14, 2, C.SHADOW);
    // Spiral groove lines
    b(10, by + 3, 12, 1, C.TENT); b(11, by + 3, 10, 1, C.RIFT);
    b(10, by + 7, 12, 1, C.SHADOW);
    b(10, by + 10, 12, 1, C.SHADOW);
    // Spiral center
    b(14, by + 5, 4, 4, C.RIFT); b(15, by + 6, 2, 2, C.ENERGY);
    p(15, by + 6, C.BRIGHT); p(16, by + 7, C.GLOW);
    // Ridge rivets
    p(8, by + 4, C.ENERGY); p(23, by + 4, C.GLOW);
    p(8, by + 8, C.ENERGY); p(23, by + 8, C.GLOW);
    // Face/opening with eyes
    b(11, by + 2, 2, 2, C.EYE); p(12, by + 2, C.WHITE);
    b(19, by + 2, 2, 2, C.EYE); p(20, by + 2, C.WHITE);
    b(12, by + 4, 8, 2, C.VOID_DK); b(13, by + 4, 6, 1, C.SHADOW);
    // Stubby legs/pseudopods
    b(10 + lOff, by + 17, 4, 4, C.BODY);
    b(10 + lOff, by + 17, 1, 4, C.LIGHT); b(13 + lOff, by + 17, 1, 4, C.SHADOW);
    b(18 + rOff, by + 17, 4, 4, C.BODY);
    b(21 + rOff, by + 17, 1, 4, C.SHADOW);
    // Feet
    b(9 + lOff, by + 21, 6, 2, C.SHADOW); b(9 + lOff, by + 21, 2, 1, C.BODY);
    b(17 + rOff, by + 21, 6, 2, C.SHADOW); b(22 + rOff, by + 21, 1, 1, C.VOID_DK);
  } else {
    drawDeathVoid(p, b, f - 4, 16, 14);
  }
}

// 3: Void Mote (Swarm) - Tiny floating eye with trailing tendril
function drawSwarm(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const jx = [0, 2, -2, 0][f];
    const jy = [0, 0, 2, -2][f];
    const bx = 12 + jx, by = 10 + jy;
    // Tiny floating eye
    b(bx + 2, by, 4, 1, C.BODY);
    b(bx + 1, by + 1, 6, 3, C.BODY);
    b(bx + 2, by + 4, 4, 1, C.BODY);
    // Eye pupil
    b(bx + 2, by + 1, 4, 3, C.EYE);
    b(bx + 3, by + 2, 2, 1, C.WHITE);
    p(bx + 3, by + 1, C.PINK); p(bx + 4, by + 3, C.CORE);
    // Shading
    p(bx + 1, by + 1, C.LIGHT); p(bx + 6, by + 2, C.SHADOW);
    // Trailing tendril
    p(bx, by + 5, C.TENT); p(bx - 1, by + 6, C.TENT);
    p(bx - 2, by + 7, C.BODY); p(bx - 2, by + 8, C.SHADOW);
    p(bx - 3, by + 9, C.DUST);
    // Void sparkle
    p(bx + 6, by - 1, C.ENERGY); p(bx - 1, by + 1, C.GLOW);
    p(bx + 7, by + 2, C.RIFT);
    if (f % 2 === 0) p(bx + 1, by - 1, C.BRIGHT);
  } else {
    drawDeathVoid(p, b, f - 4, 16, 15);
  }
}

// 4: Rift Beacon (Healer) - Floating inverted pyramid radiating void energy
function drawHealer(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -2, 0, 2][f];
    const by = 7 + bob;
    // Inverted pyramid (wide top, narrow bottom)
    b(8, by, 16, 2, C.BODY); b(9, by, 14, 1, C.MID);
    b(9, by + 2, 14, 2, C.BODY);
    b(10, by + 4, 12, 2, C.BODY);
    b(11, by + 6, 10, 2, C.BODY);
    b(12, by + 8, 8, 2, C.BODY);
    b(13, by + 10, 6, 1, C.BODY);
    b(14, by + 11, 4, 1, C.SHADOW);
    p(15, by + 12, C.SHADOW); p(16, by + 12, C.SHADOW);
    // Shading
    b(8, by, 2, 2, C.LIGHT); b(22, by, 2, 2, C.SHADOW);
    b(9, by + 2, 2, 2, C.LIGHT); b(21, by + 3, 2, 1, C.SHADOW);
    b(12, by + 8, 2, 2, C.MID); b(18, by + 8, 2, 2, C.SHADOW);
    // Central void rift (bright)
    b(14, by + 3, 4, 3, C.RIFT); b(15, by + 4, 2, 1, C.ENERGY);
    p(15, by + 3, C.BRIGHT); p(16, by + 5, C.GLOW);
    // Radiating energy lines
    const pulse = [0, 1, 0, -1][f];
    for (let i = 0; i < 12; i++) {
      const a = (i + f * 2) * Math.PI / 6;
      const rx = 16 + Math.round(Math.cos(a) * 10);
      const ry = by + 5 + Math.round(Math.sin(a) * 8);
      p(rx, ry, i % 3 === 0 ? C.BRIGHT : C.ENERGY);
    }
    // Cardinal rift points
    p(5, by + 4 + pulse, C.GLOW); p(26, by + 4 - pulse, C.GLOW);
    p(16, by - 3 + pulse, C.ENERGY); p(16, by + 14 - pulse, C.RIFT);
    // Shadow below
    b(14, by + 13, 4, 1, C.DUST); b(13, by + 14, 6, 1, C.FRAG);
  } else {
    drawDeathVoid(p, b, f - 4, 16, 13);
  }
}

// 5: Eldritch Horror (Boss) - Massive tentacles and eyes, imposing mouth
function drawBoss(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, 0, -1, 0][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 1 + bob;
    // Tentacle crown (writhing)
    const tw = [0, 1, -1, 0][f];
    p(10 + tw, by - 2, C.TENT); b(10 + tw, by - 1, 2, 2, C.TENT); p(9 + tw, by, C.BODY);
    p(14 - tw, by - 3, C.TENT); b(14 - tw, by - 2, 2, 2, C.BODY); p(13 - tw, by - 1, C.TENT);
    p(18 + tw, by - 3, C.BODY); b(18 + tw, by - 2, 2, 2, C.TENT); p(19 + tw, by - 1, C.TENT);
    p(22 - tw, by - 2, C.TENT); b(22 - tw, by - 1, 2, 1, C.BODY);
    // Tentacle tips glow
    p(10 + tw, by - 2, C.ENERGY); p(14 - tw, by - 3, C.GLOW);
    p(18 + tw, by - 3, C.BRIGHT); p(22 - tw, by - 2, C.ENERGY);
    // Massive head
    b(8, by + 1, 16, 6, C.BODY);
    b(8, by + 1, 2, 6, C.LIGHT); b(22, by + 3, 2, 4, C.SHADOW);
    b(9, by + 1, 14, 2, C.MID);
    // Multiple eyes (3 across)
    b(10, by + 3, 3, 2, C.EYE); p(11, by + 3, C.WHITE); p(10, by + 4, C.CORE);
    b(15, by + 2, 3, 2, C.EYE); p(16, by + 2, C.WHITE); p(15, by + 3, C.PINK);
    b(20, by + 3, 3, 2, C.EYE); p(21, by + 3, C.WHITE); p(20, by + 4, C.CORE);
    // Maw (gaping mouth)
    b(11, by + 5, 10, 2, C.VOID_DK); b(12, by + 5, 8, 1, C.SHADOW);
    // Teeth
    p(12, by + 5, C.LIGHT); p(14, by + 5, C.LIGHT); p(17, by + 5, C.LIGHT); p(19, by + 5, C.LIGHT);
    // Massive body
    b(5, by + 7, 22, 10, C.BODY);
    b(5, by + 7, 3, 10, C.LIGHT); b(6, by + 7, 2, 8, C.MID);
    b(24, by + 7, 3, 10, C.SHADOW); b(25, by + 9, 2, 6, C.VOID_DK);
    b(7, by + 7, 18, 2, C.MID);
    // Void core (massive rift)
    b(12, by + 10, 8, 4, C.RIFT); b(13, by + 11, 6, 2, C.ENERGY);
    b(14, by + 11, 4, 2, C.BRIGHT); p(15, by + 12, C.WHITE); p(16, by + 11, C.WHITE);
    // Body eyes
    b(8, by + 10, 2, 2, C.EYE); p(8, by + 10, C.PINK);
    b(22, by + 11, 2, 2, C.EYE); p(22, by + 11, C.PINK);
    // Belt detail
    b(7, by + 16, 18, 2, C.SHADOW); b(8, by + 16, 16, 1, C.VOID_DK);
    // Tentacle arms (thick, writhing)
    b(2, by + 8, 3, 8, C.TENT); b(2, by + 8, 1, 8, C.BODY); b(4, by + 9, 1, 6, C.SHADOW);
    b(1, by + 10, 1, 5, C.TENT); p(1, by + 10, C.BODY);
    b(0, by + 13, 1, 4, C.TENT); p(0, by + 13, C.LIGHT);
    b(27, by + 8, 3, 8, C.TENT); b(29, by + 8, 1, 8, C.SHADOW);
    b(30, by + 10, 1, 5, C.SHADOW);
    b(31, by + 13, 1, 3, C.VOID_DK);
    // Tentacle tips (clawed)
    b(0, by + 17, 2, 2, C.TENT); p(0, by + 17, C.ENERGY);
    b(30, by + 16, 2, 2, C.TENT); p(31, by + 17, C.ENERGY);
    // Legs (thick pillars)
    b(7 + lOff, by + 18, 6, 7, C.BODY);
    b(7 + lOff, by + 18, 2, 7, C.LIGHT); b(12 + lOff, by + 18, 1, 7, C.SHADOW);
    b(19 + rOff, by + 18, 6, 7, C.BODY);
    b(24 + rOff, by + 18, 1, 7, C.SHADOW);
    // Knee growths
    b(7 + lOff, by + 21, 6, 1, C.SHADOW); p(8 + lOff, by + 21, C.ENERGY);
    b(19 + rOff, by + 21, 6, 1, C.SHADOW); p(23 + rOff, by + 21, C.ENERGY);
    // Feet
    b(5 + lOff, by + 25, 8, 3, C.SHADOW); b(6 + lOff, by + 25, 6, 2, C.BODY);
    p(5 + lOff, by + 27, C.VOID_DK);
    b(18 + rOff, by + 25, 8, 3, C.SHADOW); b(19 + rOff, by + 25, 6, 2, C.BODY);
    p(25 + rOff, by + 27, C.VOID_DK);
    // Ambient void particles
    p(4, by + 5, C.RIFT); p(27, by + 5, C.GLOW);
    p(16, by - 4, C.ENERGY);
  } else {
    drawDeathVoid(p, b, f - 4, 16, 14);
  }
}

// 6: Shadow Pack (Group) - Void walker that blurs at edges
function drawGroup(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 9 + bob;
    // Smaller head
    b(13, by, 6, 4, C.BODY); b(14, by, 4, 1, C.MID);
    p(13, by, C.LIGHT);
    // Single eye
    b(15, by + 2, 3, 1, C.EYE); p(16, by + 2, C.WHITE);
    // Torso (compact)
    b(11, by + 4, 10, 6, C.BODY);
    b(11, by + 4, 2, 6, C.LIGHT); b(19, by + 4, 2, 6, C.SHADOW);
    b(12, by + 4, 8, 1, C.MID);
    // Core
    b(15, by + 6, 2, 2, C.RIFT); p(15, by + 6, C.ENERGY);
    // Arms
    b(9, by + 5, 2, 4, C.BODY); p(9, by + 5, C.LIGHT);
    b(21, by + 5, 2, 4, C.SHADOW);
    // Legs
    b(12 + lOff, by + 10, 3, 4, C.BODY); b(12 + lOff, by + 10, 1, 4, C.LIGHT);
    b(17 + rOff, by + 10, 3, 4, C.BODY); b(19 + rOff, by + 10, 1, 4, C.SHADOW);
    // Feet
    b(11 + lOff, by + 14, 4, 2, C.SHADOW); b(11 + lOff, by + 14, 2, 1, C.BODY);
    b(17 + rOff, by + 14, 4, 2, C.SHADOW);
    // Blur at edges (void wisps around outline)
    p(11, by + 1, C.DUST); p(20, by + 1, C.DUST);
    p(8, by + 6, C.FRAG); p(23, by + 7, C.FRAG);
    p(10, by + 12, C.DUST); p(21, by + 11, C.DUST);
    if (f % 2 === 0) {
      p(12, by - 1, C.FRAG); p(22, by + 5, C.DUST);
    } else {
      p(10, by + 3, C.DUST); p(20, by + 13, C.FRAG);
    }
  } else {
    drawDeathVoid(p, b, f - 4, 16, 15);
  }
}

// 7: Mitosis Blob (Splitter) - Amorphous dark mass with division line, two nuclei
function drawSplitter(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, 1][f];
    const wobX = [0, 1, 0, -1][f];
    const by = 6 + bob;
    // Amorphous blob body
    b(10, by, 12, 2, C.BODY); b(11, by, 10, 1, C.MID);
    b(8, by + 2, 16, 4, C.BODY);
    b(7, by + 6, 18, 6, C.BODY);
    b(8, by + 12, 16, 3, C.BODY);
    b(10, by + 15, 12, 2, C.BODY);
    b(12, by + 17, 8, 1, C.SHADOW);
    // Amorphous edge shading
    b(7, by + 6, 2, 6, C.LIGHT); b(23, by + 6, 2, 6, C.SHADOW);
    b(8, by + 2, 2, 4, C.LIGHT); b(22, by + 3, 2, 3, C.SHADOW);
    b(10, by + 15, 2, 2, C.MID); b(20, by + 15, 2, 2, C.SHADOW);
    // Division line (vertical through center, bright)
    b(15 + wobX, by + 1, 2, 16, C.RIFT);
    b(15 + wobX, by + 3, 2, 12, C.ENERGY);
    p(15 + wobX, by + 7, C.BRIGHT); p(16 + wobX, by + 10, C.BRIGHT);
    // Left nucleus
    b(10, by + 6, 3, 3, C.RIFT); b(11, by + 7, 1, 1, C.ENERGY);
    p(11, by + 6, C.BRIGHT); p(10, by + 8, C.GLOW);
    // Right nucleus
    b(19, by + 7, 3, 3, C.RIFT); b(20, by + 8, 1, 1, C.ENERGY);
    p(20, by + 7, C.BRIGHT); p(21, by + 9, C.GLOW);
    // Small pseudopods
    p(6, by + 7, C.TENT); p(6, by + 8, C.BODY);
    p(25, by + 8, C.TENT); p(25, by + 9, C.SHADOW);
    // Texture blobs
    p(12, by + 4, C.TENT); p(19, by + 4, C.TENT);
    p(9, by + 10, C.MID); p(22, by + 11, C.SHADOW);
  } else {
    drawDeathVoid(p, b, f - 4, 16, 12);
  }
}

// 8: Phase Entity (Shielded) - Creature in dimensional rift barrier
function drawShielded(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 5 + bob;
    // Inner creature (void walker shape)
    b(13, by, 6, 4, C.BODY); b(14, by, 4, 1, C.MID);
    b(14, by + 2, 4, 1, C.EYE); p(15, by + 2, C.WHITE); p(17, by + 2, C.WHITE);
    b(11, by + 4, 10, 7, C.BODY);
    b(11, by + 4, 2, 7, C.LIGHT); b(19, by + 4, 2, 7, C.SHADOW);
    b(12, by + 4, 8, 1, C.MID);
    b(14, by + 6, 4, 3, C.RIFT); b(15, by + 7, 2, 1, C.ENERGY);
    p(15, by + 6, C.BRIGHT);
    b(9, by + 5, 2, 4, C.BODY); p(9, by + 5, C.LIGHT);
    b(21, by + 5, 2, 4, C.SHADOW);
    b(12 + lOff, by + 11, 3, 5, C.BODY);
    b(17 + rOff, by + 11, 3, 5, C.BODY);
    b(11 + lOff, by + 16, 4, 2, C.SHADOW);
    b(17 + rOff, by + 16, 4, 2, C.SHADOW);
    // Dimensional rift barrier (rotating void ring)
    const rot = f * 3;
    for (let i = 0; i < 24; i++) {
      const a = (i + rot) * Math.PI / 12;
      const rx = 16 + Math.round(Math.cos(a) * 12);
      const ry = by + 8 + Math.round(Math.sin(a) * 10);
      if (i % 6 === 0) {
        p(rx, ry, C.BRIGHT); p(rx + 1, ry, C.ENERGY); p(rx - 1, ry, C.ENERGY);
      } else if (i % 3 === 0) {
        p(rx, ry, C.ENERGY); p(rx, ry + 1, C.GLOW);
      } else {
        p(rx, ry, i % 2 === 0 ? C.ENERGY : C.GLOW);
      }
    }
    // Cardinal rift anchors
    b(3, by + 7, 2, 2, C.RIFT); p(3, by + 7, C.ENERGY);
    b(27, by + 7, 2, 2, C.RIFT); p(28, by + 8, C.ENERGY);
    b(15, by - 3, 2, 2, C.RIFT); p(15, by - 3, C.BRIGHT);
    b(15, by + 20, 2, 2, C.RIFT); p(16, by + 21, C.GLOW);
  } else {
    drawDeathVoid(p, b, f - 4, 16, 14);
  }
}

// 9: Flicker Shade (Evasive) - Shadow that barely exists, phase-shifts
function drawEvasive(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    // Dramatic flickering position
    const fx = [0, 4, -2, 2][f];
    const fy = [0, -2, 2, 0][f];
    const bx = 10 + fx, by = 7 + fy;
    // Barely-there shadow form (gaps in body)
    if (f !== 1) b(bx + 2, by, 4, 2, C.BODY);
    else { p(bx + 2, by, C.BODY); p(bx + 5, by + 1, C.SHADOW); }
    if (f !== 2) b(bx + 1, by + 2, 6, 3, C.BODY);
    else { b(bx + 1, by + 2, 2, 3, C.BODY); p(bx + 4, by + 3, C.SHADOW); b(bx + 5, by + 2, 2, 3, C.BODY); }
    if (f !== 3) b(bx, by + 5, 8, 4, C.BODY);
    else { b(bx, by + 5, 3, 4, C.BODY); p(bx + 4, by + 6, C.SHADOW); b(bx + 5, by + 5, 3, 4, C.BODY); }
    b(bx + 1, by + 9, 6, 2, C.SHADOW);
    b(bx + 2, by + 11, 4, 1, C.DUST);
    // Shade outline shading
    p(bx, by + 5, C.LIGHT); p(bx + 7, by + 7, C.VOID_DK);
    p(bx + 1, by + 2, C.MID); p(bx + 6, by + 4, C.SHADOW);
    // Single glowing eye
    b(bx + 3, by + 3, 3, 2, C.EYE);
    p(bx + 4, by + 3, C.WHITE); p(bx + 3, by + 4, C.PINK);
    // Ghost afterimages
    if (f === 1 || f === 3) {
      b(bx - 4, by + 3, 2, 3, C.DUST); p(bx - 5, by + 4, C.FRAG);
    }
    if (f === 2) {
      b(bx + 10, by + 3, 2, 3, C.DUST); p(bx + 11, by + 4, C.FRAG);
    }
    // Phase particles
    if (f === 0) { p(bx - 2, by + 1, C.RIFT); p(bx + 9, by + 7, C.RIFT); }
    if (f === 3) { p(bx + 9, by + 1, C.GLOW); p(bx - 2, by + 7, C.GLOW); }
  } else {
    drawDeathVoid(p, b, f - 4, 16, 13);
  }
}

// 10: Void Amoeba (Regen) - Pulsing blob absorbing void energy
function drawRegenerator(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, 0, -1, 0][f];
    const by = 5 + bob;
    const bright = f === 0 || f === 2;
    const bodyC = bright ? C.MID : C.BODY;
    const hiC = bright ? C.LIGHT : C.MID;
    const coreC = bright ? C.BRIGHT : C.ENERGY;
    const edgeC = bright ? C.ENERGY : C.GLOW;
    // Organic amoeba blob
    b(14, by, 4, 2, C.BODY); p(14, by, hiC);
    b(12, by + 2, 8, 3, bodyC);
    b(10, by + 5, 12, 6, bodyC);
    b(11, by + 11, 10, 4, bodyC);
    b(13, by + 15, 6, 2, C.BODY);
    p(15, by + 17, C.SHADOW);
    // Gradient shading
    b(10, by + 5, 2, 6, hiC); b(11, by + 6, 1, 4, C.LIGHT);
    b(20, by + 5, 2, 6, C.SHADOW); b(21, by + 7, 1, 4, C.VOID_DK);
    b(11, by + 11, 2, 4, hiC); b(19, by + 11, 2, 4, C.SHADOW);
    // Pseudopods reaching out
    b(9, by + 6, 1, 3, edgeC); p(9, by + 5, hiC);
    b(22, by + 7, 1, 3, C.TENT); p(22, by + 9, C.SHADOW);
    p(8, by + 8, edgeC); p(23, by + 9, C.TENT);
    // Pulsing void core
    b(14, by + 7, 4, 3, coreC); b(13, by + 8, 6, 1, bright ? C.BRIGHT : C.ENERGY);
    p(15, by + 7, C.WHITE); p(16, by + 7, C.WHITE);
    p(15, by + 9, C.GLOW); p(16, by + 9, C.GLOW);
    // Absorption tendrils (incoming energy)
    p(8, by + 4, bright ? C.BRIGHT : C.GLOW);
    p(23, by + 5, bright ? C.BRIGHT : C.GLOW);
    p(6, by + 6, bright ? C.ENERGY : C.RIFT);
    p(25, by + 8, bright ? C.ENERGY : C.RIFT);
    // Eyes
    b(13, by + 3, 2, 2, C.EYE); p(13, by + 3, C.WHITE);
    b(17, by + 3, 2, 2, C.EYE); p(17, by + 3, C.WHITE);
    // Bioluminescent spots
    p(11, by + 7, bright ? C.WHITE : C.ENERGY);
    p(19, by + 7, bright ? C.WHITE : C.ENERGY);
    p(15, by + 12, bright ? C.BRIGHT : C.GLOW);
    // Bottom
    b(13, by + 15, 6, 1, C.SHADOW); b(14, by + 16, 4, 1, C.VOID_DK);
  } else {
    drawDeathVoid(p, b, f - 4, 16, 11);
  }
}

// 11: Rift Manta (Flying) - Flat ray swimming through air with void trail
function drawFlying(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const wingY = [0, 2, 4, 2][f];
    const by = 8;
    // Body (horizontal ray, facing right)
    b(10, by + 5, 12, 4, C.BODY);
    b(10, by + 5, 12, 1, C.MID); b(10, by + 8, 12, 1, C.SHADOW);
    b(8, by + 7, 2, 2, C.BODY); // tail base
    b(5, by + 7, 3, 2, C.SHADOW); // tail
    p(4, by + 7, C.RIFT); p(4, by + 8, C.ENERGY); // tail rift glow
    p(3, by + 7, C.GLOW); p(2, by + 8, C.DUST); // trail
    // Head
    b(20, by + 4, 4, 3, C.BODY); b(20, by + 4, 4, 1, C.MID); p(20, by + 4, C.LIGHT);
    b(24, by + 5, 3, 2, C.TENT); // nose
    p(26, by + 5, C.LIGHT); p(26, by + 6, C.SHADOW);
    // Eye
    b(22, by + 4, 2, 1, C.EYE); p(22, by + 4, C.WHITE);
    // Void markings on body
    b(13, by + 5, 3, 2, C.RIFT); b(14, by + 6, 2, 1, C.ENERGY);
    p(14, by + 5, C.BRIGHT); p(15, by + 5, C.GLOW);
    b(10, by + 5, 2, 4, C.LIGHT);
    b(20, by + 7, 2, 2, C.SHADOW);
    // Top wing
    b(10, by + 2 + wingY, 8, 2, C.BODY);
    b(10, by + 2 + wingY, 8, 1, C.MID);
    b(8, by + 1 + wingY, 4, 1, C.TENT);
    b(6, by + wingY, 3, 1, C.SHADOW);
    p(5, by + wingY - 1, C.RIFT);
    // Wing markings
    p(11, by + 3 + wingY, C.ENERGY); p(14, by + 3 + wingY, C.GLOW);
    p(17, by + 3 + wingY, C.ENERGY);
    // Bottom wing
    b(10, by + 10 - wingY, 8, 2, C.BODY);
    b(10, by + 11 - wingY, 8, 1, C.SHADOW);
    b(8, by + 11 - wingY, 4, 1, C.TENT);
    b(6, by + 12 - wingY, 3, 1, C.SHADOW);
    // Void trail behind
    p(3, by + 6, C.RIFT); p(1, by + 7, C.DUST);
    if (f % 2 === 0) { p(2, by + 5, C.GLOW); p(0, by + 8, C.FRAG); }
    else { p(2, by + 9, C.GLOW); p(0, by + 6, C.FRAG); }
    // Shadow below
    b(12, by + 16, 6, 1, C.SHADOW); b(13, by + 17, 4, 1, C.VOID_DK);
  } else {
    drawDeathVoid(p, b, f - 4, 16, 12);
  }
}

// Helper: draw void mage base (robed figure with void staff)
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
  const bodyC = iron ? C.DKGRAY : mist ? C.MIST : C.BODY;
  const robeC = iron ? C.GRAY : mist ? C.LTMIST : C.BODY;
  const hoodC = iron ? C.DKGRAY : mist ? C.MIST : C.SHADOW;
  const robeHi = iron ? C.LTGRAY : mist ? C.LTMIST : C.LIGHT;
  const robeMid = iron ? C.GRAY : mist ? C.MIST : C.MID;

  // Hooded head
  b(14, by, 4, 1, C.MID);
  b(13, by + 1, 6, 1, hoodC); b(14, by + 1, 4, 1, robeHi);
  b(12, by + 2, 8, 3, hoodC);
  b(12, by + 2, 2, 3, robeHi); b(19, by + 3, 1, 2, C.SHADOW);
  // Hood fold
  p(14, by + 2, robeMid); p(17, by + 2, robeMid);
  // Face shadow
  b(13, by + 3, 6, 2, C.VOID_DK); b(14, by + 3, 4, 1, C.SHADOW);
  // Eyes
  b(14, by + 4, 2, 1, accentC); p(14, by + 4, C.WHITE);
  b(17, by + 4, 2, 1, accentC); p(17, by + 4, C.WHITE);
  // Robe body
  b(12, by + 5, 8, 4, robeC);
  b(12, by + 5, 2, 4, robeHi); b(19, by + 5, 1, 4, C.SHADOW);
  b(10, by + 9, 12, 4, bodyC);
  b(10, by + 9, 2, 4, robeHi); b(11, by + 9, 1, 3, robeMid);
  b(20, by + 9, 2, 4, C.SHADOW); b(21, by + 10, 1, 3, C.VOID_DK);
  b(9, by + 13, 14, 4, bodyC);
  b(9, by + 13, 2, 4, robeHi);
  b(21, by + 13, 2, 4, C.SHADOW); b(22, by + 14, 1, 3, C.VOID_DK);
  b(8, by + 17, 16, 2, hoodC);
  b(8, by + 17, 2, 2, robeMid);
  b(22, by + 17, 2, 2, C.VOID_DK);
  // Robe hem
  b(8, by + 19, 16, 1, C.VOID_DK);
  // Robe detail lines
  p(14, by + 9, accentC); p(15, by + 10, accentC);
  p(16, by + 11, accentC); p(16, by + 12, accentC);
  // Robe folds
  p(12, by + 12, robeMid); p(19, by + 12, C.SHADOW);
  p(11, by + 15, robeMid); p(20, by + 15, C.SHADOW);
  // Staff in right hand
  b(22, by + 1, 2, 16, iron ? C.LTGRAY : C.FRAG);
  b(22, by + 1, 1, 16, iron ? C.GRAY : C.DUST);
  // Staff top gem
  b(21, by - 1, 4, 2, staffC); b(22, by - 1, 2, 1, C.WHITE);
  p(21, by - 2, accentC); p(24, by - 2, accentC);
  p(22, by - 3, C.WHITE); p(23, by - 3, C.WHITE);
  // Staff wrapping
  p(22, by + 5, staffC); p(22, by + 9, staffC); p(22, by + 13, staffC);
  // Left arm
  b(9, by + 7 + lOff, 3, 2, robeC); b(9, by + 7 + lOff, 1, 2, robeHi);
  p(8, by + 8 + lOff, bodyC);
  // Feet
  b(11 + lOff, by + 19, 3, 2, bodyC); b(11 + lOff, by + 20, 3, 1, hoodC);
  b(18 + rOff, by + 19, 3, 2, hoodC); b(18 + rOff, by + 20, 3, 1, C.VOID_DK);
}

// 12: Nullifier (Iron Mage) - Robed figure, void-black staff, gray
function drawMageIron(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawMageBase(p, b, f, C.LTGRAY, C.GRAY, 'iron');
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    // Heavy armor plates
    b(12, by + 7, 8, 2, C.DKGRAY);
    b(13, by + 7, 6, 1, C.GRAY);
    // Shoulder plates
    b(10, by + 9, 3, 2, C.GRAY); b(10, by + 9, 1, 2, C.LTGRAY);
    b(19, by + 9, 3, 2, C.DKGRAY);
    // Belt buckle with void gem
    b(14, by + 12, 4, 2, C.GRAY); b(15, by + 12, 2, 1, C.ENERGY);
    // Armored hem
    p(10, by + 16, C.GRAY); p(21, by + 16, C.DKGRAY);
    // Void nullification aura
    p(25, by + 3, C.RIFT); p(26, by + 5, C.GLOW);
  } else {
    drawDeathVoid(p, b, f - 4, 16, 14);
  }
}

// 13: Warp Mage (Haste Mage) - Robed figure with time-distortion echoes
function drawMageHaste(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawMageBase(p, b, f, C.ENERGY, C.GLOW, undefined);
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    // Time-distortion echo trails behind
    b(5, by + 5, 3, 1, C.ENERGY); b(3, by + 5, 2, 1, C.GLOW);
    b(4, by + 9, 4, 1, C.GLOW); p(2, by + 9, C.RIFT);
    b(5, by + 13, 3, 1, C.ENERGY); p(3, by + 13, C.GLOW);
    b(6, by + 16, 2, 1, C.RIFT);
    // Echo afterimages
    if (f % 2 === 0) {
      p(2, by + 3, C.GLOW); p(1, by + 7, C.RIFT);
      b(3, by + 11, 2, 1, C.ENERGY);
    } else {
      p(3, by + 4, C.RIFT); p(2, by + 8, C.GLOW);
      b(4, by + 12, 2, 1, C.ENERGY);
    }
    // Warp particles
    p(1, by + 6, C.DUST); p(0, by + 10, C.FRAG);
  } else {
    drawDeathVoid(p, b, f - 4, 16, 14);
  }
}

// 14: Veil Mage (Mist Mage) - Robed figure barely visible, reality rippling
function drawMageMist(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawMageBase(p, b, f, C.LTMIST, C.MIST, 'mist');
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    const mx = [5, 7, 3, 8][f];
    const my = [7, 11, 5, 9][f];
    // Reality ripple clouds
    b(mx, by + my, 2, 1, C.LTMIST); p(mx + 2, by + my + 1, C.MIST);
    b(mx + 16, by + my - 2, 2, 1, C.MIST); p(mx + 18, by + my - 1, C.LTMIST);
    // Additional void mist
    b(25, by + 3, 2, 1, C.LTMIST); p(26, by + 4, C.MIST);
    b(4, by + 15, 3, 1, C.MIST); p(3, by + 16, C.LTMIST);
    if (f === 1 || f === 3) {
      b(3, by + 14, 2, 1, C.MIST); p(2, by + 15, C.LTMIST);
      p(27, by + 8, C.RIFT);
    }
    if (f === 0 || f === 2) {
      p(26, by + 6, C.LTMIST); p(5, by + 10, C.MIST);
    }
    // Reality distortion spots
    p(7, by + 7, C.RIFT); p(24, by + 10, C.RIFT);
  } else {
    drawDeathVoid(p, b, f - 4, 16, 14);
  }
}

// 15: Void Priest (Heal Mage) - Robed figure with inverse-glow staff, dark pulses
function drawMageHeal(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawMageBase(p, b, f, C.ENERGY, C.MAGENTA, undefined);
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    // Staff inverse-glow
    p(22, by - 3, C.ENERGY); p(23, by - 3, C.BRIGHT);
    b(21, by - 1, 4, 1, C.MAGENTA); p(21, by - 2, C.GLOW);
    p(24, by - 2, C.GLOW);
    // Dark pulses from left hand
    const px_ = [7, 5, 8, 6][f];
    b(px_, by + 5, 2, 1, C.ENERGY); p(px_ + 2, by + 4, C.GLOW);
    p(px_ - 1, by + 6, C.BRIGHT);
    // Void cross symbol near staff
    b(24, by + 5, 2, 1, C.ENERGY);
    b(25, by + 4, 1, 3, C.ENERGY);
    p(25, by + 3, C.GLOW); p(25, by + 7, C.GLOW);
    p(23, by + 5, C.RIFT); p(26, by + 5, C.RIFT);
    // Dark healing particles
    if (f % 2 === 0) {
      p(6, by + 3, C.BRIGHT); p(8, by + 8, C.GLOW);
    } else {
      p(7, by + 2, C.GLOW); p(5, by + 7, C.BRIGHT);
    }
  } else {
    drawDeathVoid(p, b, f - 4, 16, 14);
  }
}

// ===== DEATH ANIMATION — VOID IMPLOSION =====
function drawDeathVoid(
  p: (x: number, y: number, cl: string) => void,
  b: (x: number, y: number, w: number, h: number, cl: string) => void,
  deathFrame: number, cx: number, cy: number
) {
  if (deathFrame === 0) {
    // Frame 0: Reality tears — creature distorts, rift lines appear
    b(cx - 4, cy - 4, 10, 10, C.BODY);
    b(cx - 3, cy - 5, 8, 2, C.BODY);
    b(cx - 2, cy - 6, 6, 1, C.MID);
    b(cx - 3, cy + 6, 8, 2, C.SHADOW);
    b(cx - 2, cy + 7, 4, 1, C.VOID_DK);
    // Shading
    b(cx - 4, cy - 4, 2, 10, C.LIGHT);
    b(cx + 4, cy - 2, 2, 8, C.SHADOW);
    // Rift tear lines (bright void energy)
    p(cx, cy - 5, C.BRIGHT); p(cx + 1, cy - 4, C.ENERGY);
    p(cx + 2, cy - 3, C.BRIGHT); p(cx + 3, cy - 2, C.ENERGY);
    p(cx - 2, cy - 3, C.ENERGY); p(cx - 3, cy - 2, C.BRIGHT);
    p(cx - 1, cy, C.ENERGY); p(cx + 3, cy, C.BRIGHT);
    p(cx - 3, cy + 1, C.BRIGHT); p(cx + 1, cy + 1, C.ENERGY);
    p(cx, cy + 2, C.BRIGHT); p(cx - 2, cy + 3, C.ENERGY);
    p(cx + 2, cy + 3, C.ENERGY); p(cx + 4, cy + 2, C.GLOW);
    p(cx - 4, cy + 2, C.BRIGHT);
    p(cx + 1, cy + 4, C.ENERGY); p(cx - 1, cy + 5, C.GLOW);
    // Implosion center (void singularity)
    b(cx - 1, cy - 1, 3, 3, C.RIFT);
    p(cx, cy, C.BRIGHT); p(cx - 1, cy, C.ENERGY); p(cx + 1, cy, C.ENERGY);
  } else if (deathFrame === 1) {
    // Frame 1: Collapses to a point — everything sucked inward
    // Inward-streaking fragments
    p(cx - 4, cy - 3, C.BODY); p(cx + 4, cy - 3, C.BODY);
    p(cx - 3, cy - 1, C.TENT); p(cx + 3, cy - 1, C.TENT);
    p(cx - 4, cy + 2, C.SHADOW); p(cx + 4, cy + 2, C.SHADOW);
    p(cx - 3, cy + 3, C.FRAG); p(cx + 3, cy + 3, C.FRAG);
    p(cx, cy - 4, C.BODY); p(cx, cy + 4, C.SHADOW);
    p(cx - 2, cy, C.MID); p(cx + 2, cy, C.MID);
    // Converging void lines
    p(cx - 5, cy - 4, C.GLOW); p(cx + 5, cy - 4, C.GLOW);
    p(cx - 5, cy + 3, C.RIFT); p(cx + 5, cy + 3, C.RIFT);
    p(cx, cy - 5, C.ENERGY); p(cx, cy + 5, C.ENERGY);
    // Central singularity (bright point)
    b(cx - 1, cy - 1, 3, 3, C.VOID_DK);
    p(cx, cy, C.WHITE); p(cx - 1, cy, C.BRIGHT); p(cx + 1, cy, C.BRIGHT);
    p(cx, cy - 1, C.ENERGY); p(cx, cy + 1, C.ENERGY);
  } else {
    // Frame 2: Scattered void particles — aftermath
    p(cx - 7, cy - 5, C.RIFT); p(cx + 8, cy - 4, C.RIFT);
    p(cx - 5, cy + 6, C.GLOW); p(cx + 6, cy + 7, C.GLOW);
    p(cx, cy - 8, C.DUST); p(cx + 2, cy + 8, C.DUST);
    p(cx + 3, cy, C.FRAG); p(cx - 8, cy + 2, C.FRAG);
    // Fading void specks
    p(cx - 6, cy - 6, C.DUST); p(cx + 7, cy - 6, C.DUST);
    p(cx - 7, cy + 4, C.FRAG); p(cx + 8, cy + 5, C.FRAG);
    p(cx - 3, cy - 5, C.DUST); p(cx + 4, cy - 7, C.DUST);
    p(cx - 1, cy + 5, C.VOID_DK);
    // Tiny singularity remnant
    p(cx, cy, C.RIFT);
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
export default function VoidCreepSprites() {
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
    pc.fillStyle = '#0a0012';
    pc.fillRect(0, 0, pv.width, pv.height);

    for (let r = 0; r < ROWS; r++) {
      const by = r * (CELL * S + LH) + 5;
      pc.fillStyle = '#dd44ff';
      pc.font = 'bold 9px monospace';
      pc.fillText(ROW_NAMES[r], 3, by + CELL * S / 2 + 3);

      for (let cc = 0; cc < COLS; cc++) {
        const bx = LW + cc * CELL * S;
        pc.save();
        pc.translate(bx, by);
        pc.scale(S, S);
        pc.drawImage(sc, cc * CELL, r * CELL, CELL, CELL, 0, 0, CELL, CELL);
        pc.restore();
        pc.strokeStyle = '#1a0a2a';
        pc.strokeRect(bx, by, CELL * S, CELL * S);
        if (r === 0) {
          pc.fillStyle = '#8855aa';
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
    <div style={{ background: '#0a0012', minHeight: '100vh', padding: 12, fontFamily: 'monospace' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <h2 style={{ color: C.ENERGY, margin: 0, fontSize: 15 }}>VOID FACTION — Creep Spritesheet</h2>
        {ready && (
          <button
            onClick={download(sheetRef, 'void_creeps.png')}
            style={{
              background: C.ENERGY, color: '#fff', border: 'none', padding: '5px 14px',
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
              background: view === v ? '#1a0a2a' : '#110011',
              color: view === v ? C.BRIGHT : '#445566',
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
          data-label="Void Creeps (Preview)"
          data-frame-size="64x64"
          data-direction="right"
          data-columns='["Void Walker (Standard)","Blink Stalker (Fast)","Void Shell (Armored)","Void Mote (Swarm)","Rift Beacon (Healer)","Eldritch Horror (Boss)","Shadow Pack (Group)","Mitosis Blob (Splitter)","Phase Entity (Shielded)","Flicker Shade (Evasive)","Void Amoeba (Regen)","Rift Manta (Flying)","Nullifier (Iron)","Warp Mage (Haste)","Veil Mage (Mist)","Void Priest (Heal)"]'
          data-rows='["Walk 1","Walk 2","Walk 3","Walk 4","Death 1","Death 2","Death 3"]'
          data-presets='[{"name":"Walk","startRow":0,"endRow":3},{"name":"Death","startRow":4,"endRow":6}]'
          style={{ display: view === 'preview' ? 'block' : 'none', maxWidth: '100%' }}
        />
        <canvas
          ref={sheetRef}
          data-label="Void Creeps"
          data-frame-size="64x64"
          data-direction="right"
          data-columns='["Void Walker (Standard)","Blink Stalker (Fast)","Void Shell (Armored)","Void Mote (Swarm)","Rift Beacon (Healer)","Eldritch Horror (Boss)","Shadow Pack (Group)","Mitosis Blob (Splitter)","Phase Entity (Shielded)","Flicker Shade (Evasive)","Void Amoeba (Regen)","Rift Manta (Flying)","Nullifier (Iron)","Warp Mage (Haste)","Veil Mage (Mist)","Void Priest (Heal)"]'
          data-rows='["Walk 1","Walk 2","Walk 3","Walk 4","Death 1","Death 2","Death 3"]'
          data-presets='[{"name":"Walk","startRow":0,"endRow":3},{"name":"Death","startRow":4,"endRow":6}]'
          style={{
            display: view === 'actual' ? 'block' : 'none',
            imageRendering: 'pixelated',
            width: SHEET_W * 2,
            border: '1px solid #1a0a2a',
          }}
        />
      </div>
      <div style={{ color: '#553388', fontSize: 9, marginTop: 10, maxWidth: 700 }}>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#8855aa' }}>Sheet:</b> {SHEET_W}x{SHEET_H}px ({COLS} cols x {ROWS} rows) — {CELL}x{CELL} cells
        </p>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#8855aa' }}>Phaser:</b>{' '}
          <code style={{ color: C.ENERGY }}>
            {"this.load.spritesheet('void_creeps','void_creeps.png',{frameWidth:64,frameHeight:64})"}
          </code>
        </p>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#8855aa' }}>Layout:</b> 16 cols (creep types) x 7 rows (walk0-3, death0-2). Frame index = row * 16 + col.
        </p>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#8855aa' }}>Types:</b> {CREEP_NAMES.join(', ')}
        </p>
      </div>
    </div>
  );
}
