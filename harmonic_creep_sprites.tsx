import { useRef, useEffect, useState, useCallback } from "react";

// ===== HARMONIC CREEP PALETTE =====
const C = {
  BODY: '#224466',      // main body
  DK: '#112244',        // dark shadow
  LIGHT: '#446688',     // light body
  WAVE: '#44aaff',      // wave blue
  BWAVE: '#88ddff',     // bright wave
  NOTE: '#ffcc44',      // note gold
  DKNOTE: '#cc9922',    // dark note
  GOLD: '#ddaa44',      // gold accent
  RESO: '#66bbff',      // resonance
  VIBR: '#3388cc',      // vibration
  HARM: '#55ccff',      // harmony
  DISC: '#ff6644',      // discord
  BASS: '#223355',      // bass deep
  TREBLE: '#88ccee',    // treble light
  RHYTHM: '#4499cc',    // rhythm
  GLOW: '#aaddff',      // glow
  WHITE: '#ffffff',
  MID: '#335577',       // mid-tone body
  LBODY: '#557799',     // light body variant
  VOID: '#0a1520',      // deepest shadow
  DUST: '#334466',      // fading dust
  FRAG: '#445588',      // fragment mid
  CRACK: '#88ddff',     // crack lines
  GREEN: '#66ff88',     // heal green
  DKGRN: '#338855',     // dark green
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

// ===== DEATH ANIMATION HELPER =====
function drawDeathHarmonic(
  p: (x: number, y: number, cl: string) => void,
  b: (x: number, y: number, w: number, h: number, cl: string) => void,
  deathFrame: number, cx: number, cy: number
) {
  if (deathFrame === 0) {
    // Frame 0: Discordant burst, notes distort
    b(cx - 4, cy - 4, 9, 8, C.BODY);
    b(cx - 3, cy - 5, 7, 2, C.LIGHT);
    b(cx - 2, cy - 6, 5, 1, C.MID);
    b(cx - 3, cy + 4, 7, 2, C.DK);
    // Shading
    b(cx - 4, cy - 4, 2, 8, C.LIGHT);
    b(cx + 3, cy - 2, 2, 6, C.DK);
    // Discordant wave cracks
    p(cx, cy - 5, C.WHITE); p(cx + 1, cy - 4, C.DISC);
    p(cx + 2, cy - 3, C.WHITE); p(cx - 2, cy - 3, C.WAVE);
    p(cx - 3, cy - 1, C.DISC); p(cx + 3, cy, C.BWAVE);
    p(cx - 1, cy + 1, C.WAVE); p(cx + 1, cy + 2, C.DISC);
    p(cx, cy + 3, C.WAVE); p(cx - 2, cy + 3, C.DISC);
    p(cx + 2, cy + 3, C.WAVE); p(cx + 4, cy + 1, C.DISC);
    p(cx - 4, cy + 1, C.WHITE);
    // Scattered note symbols
    p(cx - 3, cy - 4, C.NOTE); p(cx + 4, cy - 3, C.NOTE);
    p(cx - 2, cy + 4, C.DKNOTE);
    // Bright center
    b(cx - 1, cy - 1, 3, 3, C.BWAVE);
    p(cx, cy, C.WHITE); p(cx - 1, cy, C.GLOW); p(cx + 1, cy, C.GLOW);
  } else if (deathFrame === 1) {
    // Frame 1: Notes scatter, wave distortion
    b(cx - 6, cy - 6, 2, 2, C.WAVE); p(cx - 6, cy - 6, C.BWAVE);
    b(cx + 5, cy - 6, 2, 2, C.RESO); p(cx + 6, cy - 6, C.BWAVE);
    b(cx - 7, cy - 1, 2, 2, C.NOTE); p(cx - 7, cy - 1, C.GOLD);
    b(cx + 6, cy - 1, 2, 2, C.DKNOTE); p(cx + 7, cy, C.DK);
    b(cx - 6, cy + 5, 2, 2, C.VIBR);
    b(cx + 5, cy + 5, 2, 2, C.RHYTHM); p(cx + 6, cy + 6, C.DK);
    b(cx - 1, cy - 7, 2, 2, C.WAVE); p(cx, cy - 7, C.BWAVE);
    b(cx - 1, cy + 6, 2, 2, C.DK);
    // Scattered note fragments
    p(cx - 3, cy - 3, C.NOTE); p(cx + 3, cy - 3, C.DKNOTE);
    p(cx - 3, cy + 3, C.WAVE); p(cx + 3, cy + 3, C.RESO);
    p(cx - 2, cy - 1, C.HARM); p(cx + 2, cy + 1, C.HARM);
    // Dust
    p(cx - 4, cy - 4, C.DUST); p(cx + 4, cy - 4, C.DUST);
    p(cx - 4, cy + 4, C.DUST); p(cx + 4, cy + 4, C.DUST);
    // Center flash
    b(cx - 1, cy - 1, 3, 3, C.WHITE);
    p(cx, cy, C.WHITE);
  } else {
    // Frame 2: Fading echo dots
    p(cx - 8, cy - 4, C.DUST); p(cx + 9, cy - 5, C.DUST);
    p(cx - 5, cy + 7, C.FRAG); p(cx + 6, cy + 8, C.DK);
    p(cx, cy - 9, C.DUST); p(cx + 2, cy + 9, C.DUST);
    p(cx + 2, cy, C.DUST); p(cx - 9, cy + 2, C.FRAG);
    p(cx - 6, cy - 7, C.FRAG); p(cx + 7, cy - 7, C.FRAG);
    p(cx - 7, cy + 5, C.DUST); p(cx + 8, cy + 6, C.DUST);
    p(cx - 3, cy - 6, C.DUST); p(cx + 4, cy - 8, C.FRAG);
    p(cx - 1, cy + 6, C.DK);
  }
}

// ===== CREEP DRAW FUNCTIONS =====

// 0: Note Walker (Standard) - humanoid of sound waves, musical note head
function drawStandard(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 4 + bob;
    // Musical note head (round)
    b(12, by, 8, 5, C.NOTE); b(13, by, 6, 2, C.GOLD);
    b(12, by, 2, 5, C.GOLD); b(18, by + 2, 2, 3, C.DKNOTE);
    // Note stem on head
    b(19, by - 2, 2, 4, C.DKNOTE); p(19, by - 3, C.NOTE);
    p(20, by - 3, C.GOLD); p(21, by - 3, C.GOLD);
    // Eyes (wave-like)
    b(13, by + 2, 2, 2, C.WAVE); p(14, by + 2, C.WHITE);
    b(17, by + 2, 2, 2, C.WAVE); p(18, by + 2, C.WHITE);
    // Neck
    b(13, by + 5, 6, 1, C.DK);
    // Sound-wave body
    b(10, by + 6, 12, 8, C.BODY);
    b(10, by + 6, 2, 8, C.LIGHT); b(20, by + 6, 2, 8, C.DK);
    b(11, by + 6, 10, 1, C.WAVE); b(12, by + 6, 8, 1, C.BWAVE);
    // Sound wave lines on torso
    p(12, by + 8, C.WAVE); p(14, by + 9, C.RESO); p(16, by + 8, C.WAVE);
    p(18, by + 9, C.RESO); p(13, by + 11, C.VIBR); p(17, by + 11, C.VIBR);
    // Core resonance
    b(14, by + 9, 4, 2, C.WAVE); b(15, by + 10, 2, 1, C.BWAVE);
    p(15, by + 9, C.WHITE);
    // Arms
    b(8, by + 7, 2, 6, C.BODY); b(8, by + 7, 1, 6, C.LIGHT);
    b(22, by + 7, 2, 6, C.DK);
    // Fists
    b(7, by + 12, 2, 2, C.BODY); p(7, by + 12, C.LIGHT);
    b(23, by + 12, 2, 2, C.DK);
    // Legs
    b(11 + lOff, by + 14, 4, 6, C.BODY);
    b(11 + lOff, by + 14, 1, 6, C.LIGHT);
    b(17 + rOff, by + 14, 4, 6, C.BODY);
    b(20 + rOff, by + 14, 1, 6, C.DK);
    // Feet
    b(10 + lOff, by + 20, 5, 2, C.DK);
    b(17 + rOff, by + 20, 5, 2, C.DK);
    // Sound glow
    p(14, by - 1, C.WAVE); p(15, by - 1, C.BWAVE); p(16, by - 1, C.WAVE);
  } else {
    drawDeathHarmonic(p, b, f - 4, 16, 14);
  }
}

// 1: Staccato (Fast) - sharp angular sound-burst
function drawFast(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -2, 2, 0][f];
    const by = 10 + bob;
    // Sharp angular sound burst shape
    p(22, by + 3, C.WHITE);
    b(20, by + 2, 2, 4, C.BWAVE);
    b(17, by + 1, 3, 6, C.WAVE);
    b(13, by, 4, 8, C.BODY);
    b(10, by + 1, 3, 6, C.BODY);
    b(8, by + 2, 2, 4, C.DK);
    // Bright core
    b(15, by + 3, 3, 2, C.WAVE); p(16, by + 3, C.WHITE);
    p(17, by + 4, C.BWAVE);
    // Eye
    b(18, by + 3, 2, 2, C.NOTE); p(19, by + 3, C.WHITE);
    // Shading
    b(13, by, 4, 1, C.LIGHT); b(13, by + 7, 4, 1, C.DK);
    b(10, by + 1, 1, 6, C.LIGHT);
    // Sharp angular spikes
    p(21, by + 1, C.BWAVE); p(22, by + 5, C.BWAVE);
    p(12, by - 1, C.WAVE); p(18, by - 1, C.WAVE);
    // Trailing sound particles
    const trail = [1, 3, 0, 2][f];
    b(6, by + 3 + trail, 2, 1, C.WAVE); p(5, by + 4, C.RESO);
    b(3, by + 3, 2, 1, C.VIBR); p(2, by + 4 + trail, C.DUST);
    p(1, by + 3, C.FRAG);
    if (f % 2 === 0) {
      p(4, by + 2, C.BWAVE); p(7, by + 5, C.RHYTHM);
    } else {
      p(4, by + 5, C.RHYTHM); p(7, by + 2, C.BWAVE);
    }
  } else {
    drawDeathHarmonic(p, b, f - 4, 16, 14);
  }
}

// 2: Bass Drop (Armored) - heavy deep-frequency, thick resonance layers
function drawArmored(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, 0, -1, 0][f];
    const lOff = [0, 0, 1, 0][f];
    const rOff = [0, 0, 0, 1][f];
    const by = 3 + bob;
    // Wide heavy bass body
    b(8, by, 16, 2, C.BASS); b(9, by, 14, 1, C.LIGHT);
    b(7, by + 2, 18, 4, C.BASS);
    b(6, by + 6, 20, 6, C.BODY);
    b(7, by + 12, 18, 3, C.BODY);
    b(9, by + 15, 14, 2, C.BODY);
    // Resonance layer shading
    b(6, by + 2, 2, 10, C.LIGHT); b(7, by + 3, 1, 8, C.MID);
    b(24, by + 2, 2, 10, C.DK); b(25, by + 4, 1, 8, C.VOID);
    b(8, by, 16, 2, C.LIGHT);
    b(9, by + 15, 14, 2, C.DK);
    // Resonance wave lines
    b(10, by + 3, 12, 1, C.WAVE); b(11, by + 3, 10, 1, C.BWAVE);
    b(10, by + 8, 12, 1, C.VIBR);
    b(10, by + 11, 12, 1, C.VIBR);
    // Bass rivets
    p(8, by + 4, C.NOTE); p(23, by + 4, C.NOTE);
    p(8, by + 6, C.NOTE); p(23, by + 6, C.NOTE);
    // Eyes (deep frequency glow)
    b(11, by + 2, 2, 2, C.WAVE); p(12, by + 2, C.WHITE);
    b(19, by + 2, 2, 2, C.WAVE); p(20, by + 2, C.WHITE);
    b(12, by + 4, 8, 2, C.VOID);
    // Core
    b(14, by + 7, 4, 3, C.WAVE); b(15, by + 8, 2, 1, C.BWAVE);
    p(15, by + 7, C.WHITE);
    // Sub-bass vibration marks
    b(10, by + 6, 3, 1, C.RHYTHM); b(19, by + 6, 3, 1, C.RHYTHM);
    // Stubby legs
    b(10 + lOff, by + 17, 4, 4, C.BODY);
    b(10 + lOff, by + 17, 1, 4, C.LIGHT); b(13 + lOff, by + 17, 1, 4, C.DK);
    b(18 + rOff, by + 17, 4, 4, C.BODY);
    b(21 + rOff, by + 17, 1, 4, C.DK);
    // Feet
    b(9 + lOff, by + 21, 6, 2, C.DK);
    b(17 + rOff, by + 21, 6, 2, C.DK);
  } else {
    drawDeathHarmonic(p, b, f - 4, 16, 14);
  }
}

// 3: Harmonic Pip (Swarm) - tiny eighth-note wisp
function drawSwarm(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const jx = [0, 2, -2, 0][f];
    const jy = [0, 0, 2, -2][f];
    const bx = 12 + jx, by = 11 + jy;
    // Tiny eighth note shape
    b(bx + 2, by + 3, 4, 3, C.NOTE); // note head (oval)
    b(bx + 2, by + 3, 1, 3, C.GOLD); b(bx + 5, by + 4, 1, 2, C.DKNOTE);
    // Stem
    b(bx + 5, by, 1, 4, C.DKNOTE);
    // Flag
    b(bx + 6, by, 2, 1, C.NOTE); p(bx + 7, by + 1, C.GOLD);
    // Eye
    p(bx + 3, by + 4, C.WAVE); p(bx + 3, by + 4, C.WHITE);
    // Sparkle particles
    p(bx + 7, by + 2, C.WAVE); p(bx, by + 2, C.GLOW);
    p(bx + 4, by + 7, C.RESO);
    if (f % 2 === 0) p(bx + 1, by, C.BWAVE);
    else p(bx + 6, by + 5, C.BWAVE);
  } else {
    drawDeathHarmonic(p, b, f - 4, 16, 15);
  }
}

// 4: Chord Weaver (Healer) - playing invisible instrument, healing harmony
function drawHealer(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -2, 0, 2][f];
    const by = 7 + bob;
    // Hovering musical orb
    b(12, by, 8, 2, C.WAVE); b(13, by, 6, 1, C.BWAVE);
    b(10, by + 2, 12, 6, C.BODY);
    b(11, by + 2, 10, 1, C.WAVE);
    b(12, by + 8, 8, 2, C.DK);
    // Inner glow
    b(12, by + 3, 8, 4, C.WAVE);
    b(13, by + 4, 6, 2, C.BWAVE);
    b(14, by + 4, 4, 2, C.WHITE);
    p(15, by + 5, C.GLOW); p(16, by + 5, C.GLOW);
    // Highlight / shadow
    b(10, by + 2, 2, 3, C.LIGHT);
    b(20, by + 5, 2, 3, C.DK);
    // Healing harmony ring (musical notes orbiting)
    const pulse = [0, 1, 0, -1][f];
    for (let i = 0; i < 12; i++) {
      const a = (i + f * 2) * Math.PI / 6;
      const rx = 16 + Math.round(Math.cos(a) * 10);
      const ry = by + 5 + Math.round(Math.sin(a) * 8);
      p(rx, ry, i % 3 === 0 ? C.NOTE : C.HARM);
    }
    // Cardinal harmony points
    p(4, by + 4 + pulse, C.NOTE); p(27, by + 4 - pulse, C.NOTE);
    p(16, by - 4 + pulse, C.GOLD); p(16, by + 13 - pulse, C.GOLD);
    // Soft glow below
    b(14, by + 11, 4, 1, C.DUST); b(13, by + 12, 6, 1, C.FRAG);
  } else {
    drawDeathHarmonic(p, b, f - 4, 16, 13);
  }
}

// 5: Symphony (Boss) - massive orchestral entity, conductor pose
function drawBoss(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, 0, -1, 0][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 1 + bob;
    // Conductor hat / crown of notes
    b(10, by - 2, 2, 2, C.NOTE); p(10, by - 2, C.GOLD);
    p(13, by - 3, C.GOLD); b(14, by - 2, 2, 2, C.NOTE);
    b(17, by - 2, 2, 2, C.NOTE); p(17, by - 3, C.GOLD);
    p(21, by - 1, C.NOTE); b(21, by - 1, 2, 1, C.DKNOTE);
    // Note facet highlights
    p(11, by - 1, C.WHITE); p(15, by - 2, C.WHITE); p(18, by - 1, C.WHITE);
    // Head (imposing conductor)
    b(9, by, 14, 5, C.BODY);
    b(9, by, 14, 2, C.WAVE); b(10, by, 12, 1, C.BWAVE);
    b(9, by, 2, 5, C.LIGHT);
    b(21, by + 2, 2, 3, C.DK);
    // Eyes (conducting intensity)
    b(11, by + 2, 3, 2, C.NOTE); b(12, by + 2, 1, 1, C.WHITE);
    p(11, by + 3, C.GOLD);
    b(18, by + 2, 3, 2, C.NOTE); b(19, by + 2, 1, 1, C.WHITE);
    p(18, by + 3, C.GOLD);
    // Brow
    b(10, by + 1, 12, 1, C.DK);
    // Mouth
    b(13, by + 4, 6, 1, C.VOID);
    // Shoulder epaulets (ornate)
    b(5, by + 4, 3, 3, C.NOTE); b(5, by + 4, 1, 3, C.GOLD); b(7, by + 5, 1, 2, C.DKNOTE);
    p(5, by + 3, C.GOLD); p(6, by + 3, C.WAVE);
    b(24, by + 4, 3, 3, C.NOTE); b(26, by + 4, 1, 3, C.DKNOTE);
    p(25, by + 3, C.WAVE);
    // Neck
    b(12, by + 5, 8, 2, C.DK);
    // Massive torso (formal coat)
    b(6, by + 7, 20, 10, C.BODY);
    b(6, by + 7, 3, 10, C.LIGHT); b(7, by + 7, 2, 8, C.MID);
    b(23, by + 7, 3, 10, C.DK); b(24, by + 9, 2, 6, C.VOID);
    b(8, by + 7, 16, 2, C.WAVE); b(9, by + 7, 14, 1, C.BWAVE);
    // Sound wave ornaments on body
    b(10, by + 9, 3, 2, C.WAVE); p(11, by + 10, C.BWAVE); p(11, by + 9, C.WHITE);
    b(19, by + 9, 3, 2, C.WAVE); p(20, by + 10, C.BWAVE); p(20, by + 9, C.WHITE);
    b(14, by + 12, 4, 3, C.NOTE); b(15, by + 13, 2, 1, C.GOLD);
    p(15, by + 12, C.WHITE);
    // Chest lines
    b(10, by + 11, 12, 1, C.MID); b(10, by + 14, 12, 1, C.DK);
    // Belt
    b(8, by + 16, 16, 2, C.DK); b(9, by + 16, 14, 1, C.VOID);
    p(12, by + 16, C.NOTE); p(19, by + 16, C.NOTE);
    // Conductor arms (one raised with baton)
    b(3, by + 8, 3, 8, C.BODY); b(3, by + 8, 1, 8, C.LIGHT);
    b(2, by + 10, 1, 5, C.BODY); p(2, by + 10, C.LIGHT);
    // Baton in right hand (raised)
    b(1, by + 5, 1, 8, C.DKNOTE); p(1, by + 4, C.NOTE); p(1, by + 3, C.GOLD);
    b(26, by + 8, 3, 8, C.BODY); b(28, by + 8, 1, 8, C.DK);
    b(29, by + 10, 1, 5, C.DK);
    // Fists
    b(1, by + 12, 3, 3, C.BODY); b(1, by + 12, 1, 3, C.LIGHT);
    b(28, by + 15, 3, 3, C.DK);
    // Legs
    b(8 + lOff, by + 18, 6, 7, C.BODY);
    b(8 + lOff, by + 18, 2, 7, C.LIGHT);
    b(18 + rOff, by + 18, 6, 7, C.BODY);
    b(23 + rOff, by + 18, 1, 7, C.DK);
    // Knee
    b(8 + lOff, by + 21, 6, 1, C.DK);
    b(18 + rOff, by + 21, 6, 1, C.DK);
    // Feet
    b(6 + lOff, by + 25, 8, 3, C.DK); b(7 + lOff, by + 25, 6, 2, C.BODY);
    b(17 + rOff, by + 25, 8, 3, C.DK); b(18 + rOff, by + 25, 6, 2, C.BODY);
    // Floating musical notes
    p(4, by + 2, C.NOTE); p(27, by + 3, C.GOLD);
    p(3, by + 17, C.WAVE); p(28, by + 18, C.WAVE);
  } else {
    drawDeathHarmonic(p, b, f - 4, 16, 14);
  }
}

// 6: Ensemble (Group) - note walkers in rhythm, like sheet music
function drawGroup(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 9 + bob;
    // Small note head
    b(13, by, 6, 3, C.NOTE); b(14, by, 4, 1, C.GOLD);
    p(13, by, C.GOLD); b(17, by + 1, 2, 2, C.DKNOTE);
    // Note stem
    b(18, by - 2, 1, 3, C.DKNOTE);
    // Eyes
    b(14, by + 1, 2, 1, C.WAVE); p(14, by + 1, C.WHITE);
    b(17, by + 1, 2, 1, C.WAVE);
    // Compact body
    b(11, by + 3, 10, 6, C.BODY);
    b(11, by + 3, 2, 6, C.LIGHT); b(19, by + 3, 2, 6, C.DK);
    b(12, by + 3, 8, 1, C.WAVE);
    // Core
    b(15, by + 5, 2, 2, C.WAVE); p(15, by + 5, C.BWAVE);
    // Staff line marks (sheet music reference)
    p(11, by + 5, C.VIBR); p(20, by + 5, C.VIBR);
    p(11, by + 7, C.VIBR); p(20, by + 7, C.VIBR);
    // Arms
    b(9, by + 4, 2, 4, C.BODY); p(9, by + 4, C.LIGHT);
    b(21, by + 4, 2, 4, C.DK);
    // Legs
    b(12 + lOff, by + 9, 3, 4, C.BODY); b(12 + lOff, by + 9, 1, 4, C.LIGHT);
    b(17 + rOff, by + 9, 3, 4, C.BODY); b(19 + rOff, by + 9, 1, 4, C.DK);
    // Feet
    b(11 + lOff, by + 13, 4, 2, C.DK);
    b(17 + rOff, by + 13, 4, 2, C.DK);
  } else {
    drawDeathHarmonic(p, b, f - 4, 16, 15);
  }
}

// 7: Dissonance (Splitter) - jangling harmonic clash, splits to resolution
function drawSplitter(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, 1][f];
    const wobX = [0, 1, 0, -1][f];
    const by = 5 + bob;
    const bx = wobX;
    // Head
    b(12 + bx, by, 8, 5, C.BODY); b(13 + bx, by, 6, 2, C.WAVE);
    p(12 + bx, by, C.LIGHT);
    // Eyes
    b(13 + bx, by + 2, 2, 2, C.NOTE); p(14 + bx, by + 2, C.WHITE);
    b(17 + bx, by + 2, 2, 2, C.DISC); p(18 + bx, by + 2, C.WHITE);
    // Neck
    b(13 + bx, by + 5, 6, 1, C.DK);
    // Torso
    b(10 + bx, by + 6, 12, 8, C.BODY);
    b(10 + bx, by + 6, 2, 8, C.LIGHT); b(20 + bx, by + 6, 2, 8, C.DK);
    b(11 + bx, by + 6, 10, 1, C.WAVE);
    // Discord crack lines through body
    p(13 + bx, by + 1, C.DISC); p(14 + bx, by + 2, C.CRACK);
    b(14 + bx, by + 6, 1, 2, C.DISC); p(15 + bx, by + 7, C.CRACK);
    b(16 + bx, by + 8, 1, 2, C.DISC); p(17 + bx, by + 9, C.CRACK);
    p(18 + bx, by + 10, C.DISC); p(19 + bx, by + 11, C.CRACK);
    p(12 + bx, by + 8, C.DISC); p(11 + bx, by + 9, C.CRACK);
    b(10 + bx, by + 10, 1, 2, C.DISC);
    // Discord glow
    p(13 + bx, by + 7, C.BWAVE); p(17 + bx, by + 10, C.NOTE);
    // Core
    b(15 + bx, by + 8, 2, 2, C.BWAVE); p(15 + bx, by + 8, C.WHITE);
    // Arms
    b(8 + bx, by + 7, 2, 5, C.BODY); p(8 + bx, by + 7, C.LIGHT);
    b(22 + bx, by + 7, 2, 5, C.DK);
    // Legs
    b(11, by + 14, 4, 5, C.BODY); b(11, by + 14, 1, 5, C.LIGHT);
    b(17 + bx, by + 14, 4, 5, C.BODY); b(20 + bx, by + 14, 1, 5, C.DK);
    // Feet
    b(10, by + 19, 5, 2, C.DK);
    b(16 + bx, by + 19, 5, 2, C.DK);
    // Discord note sparks
    p(20 + bx, by + 6, C.DISC); p(10 + bx, by + 13, C.DISC);
  } else {
    drawDeathHarmonic(p, b, f - 4, 16, 14);
  }
}

// 8: Resonance Shell (Shielded) - spinning sound-wave barrier rings
function drawShielded(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 5 + bob;
    // Standard body
    b(12, by, 8, 5, C.BODY); b(13, by, 6, 2, C.MID);
    b(13, by, 6, 1, C.WAVE); p(12, by, C.LIGHT);
    b(13, by + 2, 2, 2, C.NOTE); p(14, by + 2, C.WHITE);
    b(17, by + 2, 2, 2, C.NOTE); p(18, by + 2, C.WHITE);
    b(10, by + 6, 12, 8, C.BODY);
    b(10, by + 6, 2, 8, C.LIGHT); b(20, by + 6, 2, 8, C.DK);
    b(11, by + 6, 10, 1, C.WAVE);
    b(14, by + 8, 4, 3, C.WAVE); b(15, by + 9, 2, 1, C.BWAVE);
    p(15, by + 8, C.WHITE);
    b(8, by + 7, 2, 5, C.BODY); p(8, by + 7, C.LIGHT);
    b(22, by + 7, 2, 5, C.DK);
    b(11 + lOff, by + 14, 4, 5, C.BODY);
    b(17 + rOff, by + 14, 4, 5, C.BODY);
    b(10 + lOff, by + 19, 5, 2, C.DK);
    b(17 + rOff, by + 19, 5, 2, C.DK);
    // Spinning sound-wave barrier ring
    const rot = f * 3;
    for (let i = 0; i < 24; i++) {
      const a = (i + rot) * Math.PI / 12;
      const rx = 16 + Math.round(Math.cos(a) * 12);
      const ry = by + 8 + Math.round(Math.sin(a) * 10);
      if (i % 6 === 0) {
        p(rx, ry, C.WHITE); p(rx + 1, ry, C.BWAVE); p(rx - 1, ry, C.BWAVE);
      } else if (i % 3 === 0) {
        p(rx, ry, C.WAVE); p(rx, ry + 1, C.RESO);
      } else {
        p(rx, ry, i % 2 === 0 ? C.WAVE : C.RHYTHM);
      }
    }
    // Cardinal barrier notes
    b(3, by + 7, 2, 2, C.RESO); p(3, by + 7, C.WAVE);
    b(27, by + 7, 2, 2, C.RESO); p(28, by + 8, C.WAVE);
    b(15, by - 3, 2, 2, C.RESO); p(15, by - 3, C.BWAVE);
    b(15, by + 20, 2, 2, C.RESO); p(16, by + 21, C.WAVE);
  } else {
    drawDeathHarmonic(p, b, f - 4, 16, 14);
  }
}

// 9: Echo (Evasive) - fading afterimage, always where it was not
function drawEvasive(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const fx = [0, 4, -2, 2][f];
    const fy = [0, -2, 2, 0][f];
    const bx = 10 + fx, by = 7 + fy;
    // Sound-wave body that shifts
    b(bx + 3, by, 4, 2, C.LIGHT);
    if (f !== 1) b(bx + 1, by + 2, 8, 3, C.BODY);
    else { p(bx + 1, by + 2, C.BODY); p(bx + 5, by + 2, C.LIGHT); p(bx + 8, by + 2, C.BODY); }
    if (f !== 2) b(bx, by + 5, 10, 3, C.BODY);
    else { b(bx, by + 5, 3, 3, C.BODY); p(bx + 5, by + 5, C.LIGHT); b(bx + 7, by + 5, 3, 3, C.BODY); }
    if (f !== 3) b(bx + 2, by + 8, 6, 2, C.DK);
    else { p(bx + 2, by + 8, C.DK); p(bx + 5, by + 8, C.DK); }
    b(bx + 3, by + 10, 4, 1, C.VOID);
    // Shading
    b(bx, by + 5, 2, 2, C.LIGHT); b(bx + 8, by + 6, 2, 2, C.DK);
    // Core eye
    b(bx + 4, by + 4, 2, 2, C.NOTE);
    p(bx + 4, by + 4, C.WHITE); p(bx + 5, by + 5, C.GOLD);
    // Echo afterimages (fading copies)
    if (f === 1 || f === 3) {
      b(bx - 4, by + 4, 2, 2, C.DUST); b(bx - 4, by + 6, 2, 2, C.FRAG);
      p(bx - 5, by + 5, C.DUST);
    }
    if (f === 2) {
      b(bx + 12, by + 4, 2, 2, C.DUST); b(bx + 12, by + 6, 2, 2, C.FRAG);
    }
    // Echo ring particles
    if (f === 0) { p(bx - 2, by + 2, C.GLOW); p(bx + 11, by + 8, C.GLOW); }
    if (f === 3) { p(bx + 11, by + 2, C.RHYTHM); p(bx - 2, by + 8, C.RHYTHM); }
  } else {
    drawDeathHarmonic(p, b, f - 4, 16, 13);
  }
}

// 10: Sustain (Regenerator) - lingering note trail, rebuilding from sound
function drawRegenerator(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, 0, -1, 0][f];
    const by = 5 + bob;
    const bright = f === 0 || f === 2;
    const bodyC = bright ? C.WAVE : C.BODY;
    const hiC = bright ? C.WHITE : C.LIGHT;
    const coreC = bright ? C.WHITE : C.BWAVE;
    const midC = bright ? C.BWAVE : C.MID;
    // Organic sound body (sustaining note shape)
    b(14, by, 4, 2, C.WAVE); p(14, by, hiC);
    b(12, by + 2, 8, 3, bodyC);
    b(10, by + 5, 12, 6, bodyC);
    b(11, by + 11, 10, 4, bodyC);
    b(13, by + 15, 6, 2, C.BODY);
    // Gradient shading
    b(10, by + 5, 2, 6, hiC); b(11, by + 6, 1, 4, midC);
    b(20, by + 5, 2, 6, C.DK); b(21, by + 7, 1, 4, C.VOID);
    b(11, by + 11, 2, 4, hiC); b(19, by + 11, 2, 4, C.DK);
    // Sound wave lines on body
    p(12, by + 3, C.VIBR); p(15, by + 4, C.VIBR); p(18, by + 3, C.VIBR);
    p(11, by + 7, C.RESO); p(14, by + 8, C.RESO); p(19, by + 7, C.RESO);
    // Organic bumps
    b(9, by + 6, 1, 3, C.WAVE); p(9, by + 5, hiC);
    b(22, by + 7, 1, 3, C.FRAG);
    // Pulsing core
    b(14, by + 7, 4, 3, coreC); b(13, by + 8, 6, 1, bright ? C.BWAVE : C.WAVE);
    p(15, by + 7, C.WHITE); p(16, by + 7, C.WHITE);
    // Eyes
    b(13, by + 3, 2, 2, C.NOTE); p(13, by + 3, C.WHITE);
    b(17, by + 3, 2, 2, C.NOTE); p(17, by + 3, C.WHITE);
    // Sustain trail notes
    p(11, by + 7, bright ? C.WHITE : C.WAVE);
    p(19, by + 7, bright ? C.WHITE : C.WAVE);
    p(15, by + 12, bright ? C.BWAVE : C.RESO);
    // Bottom
    b(13, by + 15, 6, 1, C.DK); b(14, by + 16, 4, 1, C.VOID);
  } else {
    drawDeathHarmonic(p, b, f - 4, 16, 11);
  }
}

// 11: Treble Kite (Flying) - treble-clef shaped, musical wings
function drawFlying(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const wingY = [0, 2, 4, 2][f];
    const by = 7;
    // Treble-clef body (horizontal, facing right)
    b(10, by + 4, 12, 5, C.BODY);
    b(10, by + 4, 12, 1, C.MID); b(10, by + 8, 12, 1, C.DK);
    // Treble-clef curl at tail
    b(8, by + 6, 2, 2, C.NOTE); b(6, by + 5, 2, 3, C.DKNOTE);
    p(5, by + 5, C.GOLD); p(5, by + 7, C.DKNOTE);
    b(6, by + 4, 2, 1, C.NOTE); // curl top
    // Head
    b(20, by + 3, 4, 4, C.BODY); b(20, by + 3, 4, 1, C.MID);
    b(24, by + 4, 3, 2, C.NOTE); p(26, by + 4, C.GOLD); p(26, by + 5, C.DKNOTE);
    // Eye
    b(22, by + 4, 2, 1, C.WAVE); p(22, by + 4, C.WHITE);
    // Sound core
    b(13, by + 5, 3, 2, C.WAVE); b(14, by + 6, 2, 1, C.BWAVE);
    p(14, by + 5, C.WHITE);
    b(10, by + 4, 2, 5, C.LIGHT);
    b(20, by + 7, 2, 2, C.DK);
    // Musical wing (top) - note-shaped
    b(10, by + 1 + wingY, 8, 2, C.NOTE);
    b(10, by + 1 + wingY, 8, 1, C.GOLD);
    b(8, by + wingY, 4, 1, C.DKNOTE);
    b(6, by + wingY - 1, 3, 1, C.NOTE);
    // Wing details (note flags)
    p(11, by + 2 + wingY, C.WAVE); p(14, by + 2 + wingY, C.WAVE);
    p(17, by + 2 + wingY, C.WAVE);
    // Bottom wing
    b(10, by + 10 - wingY, 8, 2, C.DKNOTE);
    b(10, by + 11 - wingY, 8, 1, C.DK);
    b(8, by + 11 - wingY, 4, 1, C.BODY);
    b(6, by + 12 - wingY, 3, 1, C.DK);
    // Wing details
    p(11, by + 10 - wingY, C.BODY); p(14, by + 10 - wingY, C.BODY);
    // Shadow below
    b(12, by + 16, 6, 1, C.DK); b(13, by + 17, 4, 1, C.VOID);
    p(14, by + 18, C.VOID); p(15, by + 18, C.VOID);
  } else {
    drawDeathHarmonic(p, b, f - 4, 16, 12);
  }
}

// Helper: draw harmonic mage base (robed figure with musical staff)
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
  const bodyC = alpha ? C.DUST : heavy ? C.BASS : C.BODY;
  const robeC = alpha ? C.FRAG : heavy ? C.BODY : C.BODY;
  const hoodC = alpha ? C.DUST : heavy ? C.BASS : C.DK;
  const robeHi = alpha ? C.GLOW : heavy ? C.LIGHT : C.LIGHT;
  const robeMid = alpha ? C.DUST : heavy ? C.MID : C.MID;

  // Hooded head
  b(14, by, 4, 1, C.LIGHT);
  b(13, by + 1, 6, 1, hoodC); b(14, by + 1, 4, 1, robeHi);
  b(12, by + 2, 8, 3, hoodC);
  b(12, by + 2, 2, 3, robeHi); b(19, by + 3, 1, 2, C.DK);
  // Hood fold
  p(14, by + 2, robeMid); p(17, by + 2, robeMid);
  // Face shadow
  b(13, by + 3, 6, 2, C.VOID); b(14, by + 3, 4, 1, C.DK);
  // Eyes
  b(14, by + 4, 2, 1, accentC); p(14, by + 4, C.WHITE);
  b(17, by + 4, 2, 1, accentC); p(17, by + 4, C.WHITE);
  // Robe body
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
  // Staff
  b(22, by + 1, 2, 16, heavy ? C.LIGHT : C.FRAG);
  b(22, by + 1, 1, 16, heavy ? C.MID : C.DUST);
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
  b(18 + rOff, by + 19, 3, 2, hoodC); b(18 + rOff, by + 20, 3, 1, C.VOID);
}

// 12: Fortissimo Mage (Mage Iron) - heavy bass staff, armor-boosting tones
function drawMageIron(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawMageBase(p, b, f, C.TREBLE, C.BASS, 'iron');
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    // Heavy bass armor plates
    b(12, by + 7, 8, 2, C.BASS);
    b(13, by + 7, 6, 1, C.BODY);
    // Shoulder plates
    b(10, by + 9, 3, 2, C.BODY); b(10, by + 9, 1, 2, C.LIGHT);
    b(19, by + 9, 3, 2, C.BASS);
    // Belt buckle (note symbol)
    b(14, by + 12, 4, 2, C.NOTE); b(15, by + 12, 2, 1, C.GOLD);
    // Armored hem
    p(10, by + 16, C.BODY); p(21, by + 16, C.BASS);
  } else {
    drawDeathHarmonic(p, b, f - 4, 16, 14);
  }
}

// 13: Allegro Mage (Mage Haste) - tempo marks, speed-boosting rhythm
function drawMageHaste(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawMageBase(p, b, f, C.WAVE, C.BWAVE, undefined);
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    // Tempo/speed lines (rhythm marks)
    b(5, by + 5, 3, 1, C.WAVE); b(3, by + 5, 2, 1, C.BWAVE);
    b(4, by + 9, 4, 1, C.RESO); p(2, by + 9, C.WAVE);
    b(5, by + 13, 3, 1, C.WAVE); p(3, by + 13, C.BWAVE);
    b(6, by + 16, 2, 1, C.RHYTHM);
    if (f % 2 === 0) {
      p(2, by + 3, C.BWAVE); p(1, by + 7, C.WAVE);
      b(3, by + 11, 2, 1, C.RESO);
    } else {
      p(3, by + 4, C.WAVE); p(2, by + 8, C.BWAVE);
      b(4, by + 12, 2, 1, C.RHYTHM);
    }
    // Motion blur
    p(1, by + 6, C.DUST); p(0, by + 10, C.DUST);
  } else {
    drawDeathHarmonic(p, b, f - 4, 16, 14);
  }
}

// 14: Pianissimo Mage (Mage Mist) - nearly silent/invisible, soft notes
function drawMageMist(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawMageBase(p, b, f, C.GLOW, C.TREBLE, 'mist');
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    const mx = [5, 7, 3, 8][f];
    const my = [7, 11, 5, 9][f];
    // Soft note wisps (pianissimo - quiet)
    b(mx, by + my, 2, 1, C.GLOW); p(mx + 2, by + my + 1, C.TREBLE);
    b(mx + 16, by + my - 2, 2, 1, C.TREBLE); p(mx + 18, by + my - 1, C.GLOW);
    // Additional soft wisps
    b(25, by + 3, 2, 1, C.GLOW); p(26, by + 4, C.TREBLE);
    b(4, by + 15, 3, 1, C.TREBLE); p(3, by + 16, C.GLOW);
    if (f === 1 || f === 3) {
      b(3, by + 14, 2, 1, C.TREBLE); p(2, by + 15, C.GLOW);
      p(27, by + 8, C.TREBLE);
    }
    if (f === 0 || f === 2) {
      p(26, by + 6, C.GLOW); p(5, by + 10, C.TREBLE);
    }
  } else {
    drawDeathHarmonic(p, b, f - 4, 16, 14);
  }
}

// 15: Lullaby Mage (Mage Heal) - soothing melody, green musical notes
function drawMageHeal(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawMageBase(p, b, f, C.GREEN, C.DKGRN, undefined);
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    // Staff gem glow (green healing)
    p(22, by - 3, C.GREEN); p(23, by - 3, C.GREEN);
    b(21, by - 1, 4, 1, C.GREEN); p(21, by - 2, C.DKGRN);
    p(24, by - 2, C.DKGRN);
    // Green musical note particles from left hand
    const px_ = [7, 5, 8, 6][f];
    b(px_, by + 5, 2, 1, C.GREEN); p(px_ + 2, by + 4, C.DKGRN);
    p(px_ - 1, by + 6, C.GREEN);
    // Musical note heal symbol near staff
    b(24, by + 5, 2, 1, C.GREEN);
    b(25, by + 4, 1, 3, C.GREEN);
    p(25, by + 3, C.DKGRN); p(25, by + 7, C.DKGRN);
    p(23, by + 5, C.DKGRN); p(26, by + 5, C.DKGRN);
    // Extra green note sparkles
    if (f % 2 === 0) {
      p(6, by + 3, C.GREEN); p(8, by + 8, C.DKGRN);
    } else {
      p(7, by + 2, C.DKGRN); p(5, by + 7, C.GREEN);
    }
  } else {
    drawDeathHarmonic(p, b, f - 4, 16, 14);
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
export default function HarmonicCreepSprites() {
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
    pc.fillStyle = '#081018';
    pc.fillRect(0, 0, pv.width, pv.height);

    for (let r = 0; r < ROWS; r++) {
      const by = r * (CELL * S + LH) + 5;
      pc.fillStyle = '#44aaff';
      pc.font = 'bold 9px monospace';
      pc.fillText(ROW_NAMES[r], 3, by + CELL * S / 2 + 3);

      for (let cc = 0; cc < COLS; cc++) {
        const bx = LW + cc * CELL * S;
        pc.save();
        pc.translate(bx, by);
        pc.scale(S, S);
        pc.drawImage(sc, cc * CELL, r * CELL, CELL, CELL, 0, 0, CELL, CELL);
        pc.restore();
        pc.strokeStyle = '#0a1a2a';
        pc.strokeRect(bx, by, CELL * S, CELL * S);
        if (r === 0) {
          pc.fillStyle = '#88bbdd';
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
    <div style={{ background: '#081018', minHeight: '100vh', padding: 12, fontFamily: 'monospace' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <h2 style={{ color: C.WAVE, margin: 0, fontSize: 15 }}>HARMONIC FACTION — Creep Spritesheet</h2>
        {ready && (
          <button
            onClick={download(sheetRef, 'harmonic_creeps.png')}
            style={{
              background: C.WAVE, color: '#fff', border: 'none', padding: '5px 14px',
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
              background: view === v ? '#0a1a2a' : '#111',
              color: view === v ? C.BWAVE : '#445566',
              border: `1px solid ${view === v ? '#224' : '#222'}`,
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
          data-label="Harmonic Creeps (Preview)"
          data-frame-size="64x64"
          data-direction="right"
          data-columns='["Note Walker (Standard)","Staccato (Fast)","Bass Drop (Armored)","Harmonic Pip (Swarm)","Chord Weaver (Healer)","Symphony (Boss)","Ensemble (Group)","Dissonance (Splitter)","Resonance Shell (Shielded)","Echo (Evasive)","Sustain (Regen)","Treble Kite (Flying)","Fortissimo Mage (Iron)","Allegro Mage (Haste)","Pianissimo Mage (Mist)","Lullaby Mage (Heal)"]'
          data-rows='["Walk 1","Walk 2","Walk 3","Walk 4","Death 1","Death 2","Death 3"]'
          data-presets='[{"name":"Walk","startRow":0,"endRow":3},{"name":"Death","startRow":4,"endRow":6}]'
          style={{ display: view === 'preview' ? 'block' : 'none', maxWidth: '100%' }}
        />
        <canvas
          ref={sheetRef}
          data-label="Harmonic Creeps"
          data-frame-size="64x64"
          data-direction="right"
          data-columns='["Note Walker (Standard)","Staccato (Fast)","Bass Drop (Armored)","Harmonic Pip (Swarm)","Chord Weaver (Healer)","Symphony (Boss)","Ensemble (Group)","Dissonance (Splitter)","Resonance Shell (Shielded)","Echo (Evasive)","Sustain (Regen)","Treble Kite (Flying)","Fortissimo Mage (Iron)","Allegro Mage (Haste)","Pianissimo Mage (Mist)","Lullaby Mage (Heal)"]'
          data-rows='["Walk 1","Walk 2","Walk 3","Walk 4","Death 1","Death 2","Death 3"]'
          data-presets='[{"name":"Walk","startRow":0,"endRow":3},{"name":"Death","startRow":4,"endRow":6}]'
          style={{
            display: view === 'actual' ? 'block' : 'none',
            imageRendering: 'pixelated',
            width: SHEET_W * 2,
            border: '1px solid #0a1a2a',
          }}
        />
      </div>
      <div style={{ color: '#446688', fontSize: 9, marginTop: 10, maxWidth: 700 }}>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#66aacc' }}>Sheet:</b> {SHEET_W}x{SHEET_H}px ({COLS} cols x {ROWS} rows) — {CELL}x{CELL} cells
        </p>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#66aacc' }}>Phaser:</b>{' '}
          <code style={{ color: C.BWAVE }}>
            {"this.load.spritesheet('harmonic_creeps','harmonic_creeps.png',{frameWidth:64,frameHeight:64})"}
          </code>
        </p>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#66aacc' }}>Layout:</b> 16 cols (creep types) x 7 rows (walk0-3, death0-2). Frame index = row * 16 + col.
        </p>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#66aacc' }}>Types:</b> {CREEP_NAMES.join(', ')}
        </p>
      </div>
    </div>
  );
}
