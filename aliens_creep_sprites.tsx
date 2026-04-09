import { useRef, useEffect, useState, useCallback } from "react";

// ===== ALIENS CREEP PALETTE =====
const C = {
  SHELL: '#446622',
  DKSHELL: '#2a4412',
  BRSHELL: '#66aa33',
  ACID: '#88ff22',
  DKACID: '#44aa00',
  CHITIN: '#334418',
  EYE: '#ffdd00',
  COMPEYE: '#aacc00',
  MANDIBLE: '#553300',
  LEG: '#445522',
  MEMBRANE: '#88cc44',
  GLOW: '#ccff66',
  INNARD: '#664422',
  EGG: '#aaaa66',
  LARVA: '#ccddaa',
  WHITE: '#ffffff',
  // Boss accent colors
  PINK: '#ff88aa',     // egg glow / bioluminescent
  DKPINK: '#cc5577',   // dark pink
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
function drawDeathInsect(
  p: (x: number, y: number, cl: string) => void,
  b: (x: number, y: number, w: number, h: number, cl: string) => void,
  deathFrame: number, cx: number, cy: number
) {
  if (deathFrame === 0) {
    // Frame 0: Chitin cracks, legs splay
    b(cx - 4, cy - 3, 9, 8, C.SHELL);
    b(cx - 3, cy - 4, 7, 2, C.DKSHELL);
    b(cx - 3, cy + 5, 7, 2, C.CHITIN);
    // Shading
    b(cx - 4, cy - 3, 2, 8, C.BRSHELL);
    b(cx + 3, cy - 1, 2, 6, C.DKSHELL);
    // Crack lines
    p(cx, cy - 3, C.ACID); p(cx + 1, cy - 2, C.GLOW);
    p(cx + 2, cy - 1, C.ACID); p(cx - 2, cy - 2, C.GLOW);
    p(cx - 1, cy, C.ACID); p(cx + 3, cy, C.GLOW);
    p(cx - 3, cy + 1, C.ACID); p(cx + 1, cy + 2, C.GLOW);
    p(cx, cy + 3, C.ACID); p(cx - 2, cy + 4, C.GLOW);
    p(cx + 2, cy + 4, C.ACID);
    // Scattered legs
    p(cx - 6, cy - 2, C.LEG); p(cx - 7, cy - 1, C.LEG);
    p(cx + 6, cy - 2, C.LEG); p(cx + 7, cy, C.LEG);
    p(cx - 5, cy + 4, C.LEG); p(cx + 5, cy + 5, C.LEG);
    // Goo center
    b(cx - 1, cy - 1, 3, 3, C.DKACID);
    p(cx, cy, C.ACID);
  } else if (deathFrame === 1) {
    // Frame 1: Pieces scatter, goo spreads
    b(cx - 6, cy - 5, 2, 2, C.SHELL); p(cx - 6, cy - 5, C.BRSHELL);
    b(cx + 5, cy - 5, 2, 2, C.DKSHELL);
    b(cx - 7, cy, 2, 2, C.CHITIN);
    b(cx + 6, cy, 2, 2, C.SHELL);
    b(cx - 5, cy + 5, 2, 2, C.DKSHELL);
    b(cx + 5, cy + 5, 2, 2, C.CHITIN);
    // Scattered legs
    p(cx - 8, cy - 3, C.LEG); p(cx + 8, cy - 3, C.LEG);
    p(cx - 4, cy - 6, C.LEG); p(cx + 4, cy + 6, C.LEG);
    // Goo puddle center
    b(cx - 2, cy - 1, 5, 3, C.DKACID);
    b(cx - 1, cy, 3, 1, C.ACID);
    p(cx, cy, C.GLOW);
    // Dust
    p(cx - 4, cy - 4, C.CHITIN); p(cx + 4, cy - 4, C.CHITIN);
  } else {
    // Frame 2: Goo puddle remains, few scattered bits
    b(cx - 3, cy, 7, 2, C.DKACID);
    b(cx - 2, cy - 1, 5, 1, C.DKACID);
    b(cx - 1, cy, 3, 1, C.ACID);
    p(cx, cy, C.GLOW);
    // Tiny shell fragments
    p(cx - 7, cy - 4, C.CHITIN); p(cx + 8, cy - 5, C.CHITIN);
    p(cx - 5, cy + 6, C.LEG); p(cx + 6, cy + 7, C.LEG);
    p(cx + 2, cy + 4, C.DKSHELL);
    p(cx - 8, cy + 2, C.LEG);
  }
}

// ===== CREEP DRAW FUNCTIONS =====

// 0: Drone (Standard) - four-legged insect
function drawStandard(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const legF = [0, 1, 0, -1][f];
    const legR = [0, -1, 0, 1][f];
    const by = 6 + bob;
    // Head
    b(13, by, 6, 4, C.SHELL); b(14, by, 4, 1, C.BRSHELL);
    p(13, by, C.BRSHELL); p(18, by + 3, C.DKSHELL);
    // Mandibles
    b(12, by + 3, 2, 2, C.MANDIBLE); b(18, by + 3, 2, 2, C.MANDIBLE);
    p(11, by + 4, C.MANDIBLE);
    // Compound eyes
    b(14, by + 1, 2, 2, C.EYE); p(14, by + 1, C.WHITE);
    b(17, by + 1, 2, 2, C.EYE); p(17, by + 1, C.WHITE);
    // Antennae
    p(14, by - 1, C.LEG); p(13, by - 2, C.LEG); p(12, by - 3, C.COMPEYE);
    p(18, by - 1, C.LEG); p(19, by - 2, C.LEG); p(20, by - 3, C.COMPEYE);
    // Thorax
    b(12, by + 4, 8, 4, C.SHELL);
    b(12, by + 4, 2, 4, C.BRSHELL); b(19, by + 5, 1, 3, C.DKSHELL);
    b(13, by + 4, 6, 1, C.MEMBRANE);
    // Abdomen
    b(11, by + 8, 10, 7, C.SHELL);
    b(11, by + 8, 2, 7, C.BRSHELL); b(20, by + 9, 1, 5, C.DKSHELL);
    b(13, by + 9, 6, 3, C.CHITIN);
    // Segment lines
    b(12, by + 10, 8, 1, C.DKSHELL); b(12, by + 13, 8, 1, C.DKSHELL);
    // Acid sac glow
    b(14, by + 11, 4, 2, C.DKACID); b(15, by + 11, 2, 1, C.ACID);
    // Front legs
    b(10 + legF, by + 5, 2, 5, C.LEG); p(9 + legF, by + 9, C.LEG);
    b(20 + legR, by + 5, 2, 5, C.LEG); p(21 + legR, by + 9, C.LEG);
    // Rear legs
    b(9 + legR, by + 10, 2, 6, C.LEG); p(8 + legR, by + 15, C.LEG);
    b(21 + legF, by + 10, 2, 6, C.LEG); p(22 + legF, by + 15, C.LEG);
    // Feet
    b(8 + legF, by + 10, 2, 1, C.CHITIN);
    b(22 + legR, by + 10, 2, 1, C.CHITIN);
    b(7 + legR, by + 16, 2, 1, C.CHITIN);
    b(23 + legF, by + 16, 2, 1, C.CHITIN);
  } else {
    drawDeathInsect(p, b, f - 4, 16, 14);
  }
}

// 1: Skitter (Fast) - centipede, low flat
function drawFast(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const wave = [0, 1, 0, -1][f];
    const by = 12;
    // Long flat body segments
    b(4, by, 24, 4, C.SHELL);
    b(4, by, 24, 1, C.BRSHELL); b(4, by + 3, 24, 1, C.DKSHELL);
    // Segment dividers
    for (let i = 0; i < 6; i++) {
      p(6 + i * 4, by + 1, C.DKSHELL); p(6 + i * 4, by + 2, C.CHITIN);
    }
    // Head (right side)
    b(26, by - 1, 4, 6, C.SHELL); b(26, by - 1, 4, 1, C.BRSHELL);
    b(29, by, 2, 4, C.DKSHELL);
    // Mandibles
    b(30, by + 1, 1, 2, C.MANDIBLE); p(31, by + 2, C.MANDIBLE);
    // Eyes
    p(28, by, C.EYE); p(28, by + 1, C.EYE); p(28, by, C.WHITE);
    // Antennae
    p(30, by - 2, C.LEG); p(31, by - 3, C.COMPEYE);
    p(30, by + 5, C.LEG); p(31, by + 6, C.COMPEYE);
    // Many legs (wave pattern)
    for (let i = 0; i < 8; i++) {
      const lx = 5 + i * 3;
      const loff = (i + f) % 2 === 0 ? 1 : -1;
      p(lx, by - 1 + loff, C.LEG);
      p(lx, by + 4 - loff, C.LEG);
      if (i % 2 === 0) {
        p(lx, by - 2 + loff, C.CHITIN);
        p(lx, by + 5 - loff, C.CHITIN);
      }
    }
    // Underbelly glow
    b(10, by + 1, 14, 2, C.DKACID);
    b(12, by + 2, 10, 1, C.ACID);
    // Tail
    b(2, by + 1 + wave, 2, 2, C.DKSHELL); p(1, by + 2 + wave, C.CHITIN);
    // Speed trail
    p(0, by + 2, C.DKACID); p(1, by + 1, C.CHITIN);
  } else {
    drawDeathInsect(p, b, f - 4, 16, 14);
  }
}

// 2: Scarab (Armored) - huge beetle, thick shell
function drawArmored(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, 0, -1, 0][f];
    const legF = [0, 1, 0, -1][f];
    const legR = [0, -1, 0, 1][f];
    const by = 3 + bob;
    // Massive shell dome
    b(8, by + 2, 16, 3, C.SHELL); b(9, by + 2, 14, 1, C.BRSHELL);
    b(6, by + 5, 20, 8, C.SHELL);
    b(7, by + 13, 18, 4, C.SHELL);
    b(9, by + 17, 14, 2, C.DKSHELL);
    // Shell shading
    b(6, by + 5, 3, 8, C.BRSHELL); b(7, by + 6, 2, 6, C.MEMBRANE);
    b(23, by + 5, 3, 8, C.DKSHELL); b(24, by + 7, 2, 5, C.CHITIN);
    b(7, by + 13, 2, 4, C.BRSHELL); b(23, by + 13, 2, 4, C.DKSHELL);
    // Shell ridge lines
    b(10, by + 4, 12, 1, C.BRSHELL);
    b(16, by + 5, 1, 12, C.DKSHELL); // center line
    b(8, by + 9, 16, 1, C.DKSHELL);
    b(9, by + 14, 14, 1, C.DKSHELL);
    // Shell pattern bumps
    p(11, by + 6, C.BRSHELL); p(21, by + 6, C.CHITIN);
    p(11, by + 11, C.BRSHELL); p(21, by + 11, C.CHITIN);
    // Head peeking out
    b(12, by, 8, 3, C.DKSHELL); b(13, by, 6, 1, C.SHELL);
    // Eyes
    b(13, by + 1, 2, 1, C.EYE); p(13, by + 1, C.WHITE);
    b(17, by + 1, 2, 1, C.EYE); p(17, by + 1, C.WHITE);
    // Horn
    p(16, by - 1, C.MANDIBLE); p(15, by - 2, C.MANDIBLE); p(16, by - 2, C.INNARD);
    // Short thick legs
    b(7 + legF, by + 13, 3, 5, C.LEG); b(7 + legF, by + 17, 4, 2, C.CHITIN);
    b(22 + legR, by + 13, 3, 5, C.LEG); b(21 + legR, by + 17, 4, 2, C.CHITIN);
    // Middle legs
    b(5 + legR, by + 8, 2, 5, C.LEG); p(4 + legR, by + 12, C.CHITIN);
    b(25 + legF, by + 8, 2, 5, C.LEG); p(26 + legF, by + 12, C.CHITIN);
  } else {
    drawDeathInsect(p, b, f - 4, 16, 13);
  }
}

// 3: Larva (Swarm) - tiny grub wriggling
function drawSwarm(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const jx = [0, 2, -1, 1][f];
    const jy = [0, -1, 2, -2][f];
    const bx = 12 + jx, by = 12 + jy;
    // Tiny grub body
    b(bx, by, 8, 4, C.LARVA);
    b(bx + 1, by, 6, 1, C.MEMBRANE);
    b(bx, by + 3, 8, 1, C.EGG);
    // Segments
    p(bx + 2, by + 1, C.EGG); p(bx + 5, by + 1, C.EGG);
    // Head
    b(bx + 6, by + 1, 3, 2, C.SHELL);
    p(bx + 8, by + 1, C.EYE);
    // Tiny mandibles
    p(bx + 9, by + 2, C.MANDIBLE);
    // Underbelly
    b(bx + 1, by + 2, 5, 1, C.DKACID);
    // Wriggle trail
    p(bx - 1, by + 2, C.LARVA);
    if (f % 2 === 0) p(bx - 2, by + 1, C.EGG);
  } else {
    drawDeathInsect(p, b, f - 4, 16, 15);
  }
}

// 4: Queen Attendant (Healer) - winged insect, pulsing abdomen
function drawHealer(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 1, -1][f];
    const wingY = [0, 2, 4, 2][f];
    const by = 7 + bob;
    // Head
    b(14, by, 4, 3, C.SHELL); b(15, by, 2, 1, C.BRSHELL);
    // Eyes
    p(14, by + 1, C.EYE); p(17, by + 1, C.EYE); p(14, by + 1, C.WHITE);
    // Antennae
    p(14, by - 1, C.LEG); p(13, by - 2, C.COMPEYE);
    p(17, by - 1, C.LEG); p(18, by - 2, C.COMPEYE);
    // Thorax
    b(13, by + 3, 6, 3, C.SHELL); b(13, by + 3, 2, 3, C.BRSHELL);
    b(18, by + 4, 1, 2, C.DKSHELL);
    // Pulsing abdomen
    const pulse = f === 0 || f === 2;
    const abdC = pulse ? C.ACID : C.DKACID;
    b(12, by + 6, 8, 6, C.SHELL);
    b(12, by + 6, 2, 6, C.BRSHELL); b(19, by + 7, 1, 4, C.DKSHELL);
    b(14, by + 7, 4, 4, abdC);
    b(15, by + 8, 2, 2, pulse ? C.GLOW : C.ACID);
    // Segment lines
    b(13, by + 8, 6, 1, C.DKSHELL);
    b(13, by + 10, 6, 1, C.DKSHELL);
    // Wings (translucent)
    b(8, by + 2 + wingY, 5, 2, C.MEMBRANE);
    b(7, by + 1 + wingY, 3, 1, C.GLOW);
    p(6, by + wingY, C.MEMBRANE);
    b(19, by + 2 + wingY, 5, 2, C.MEMBRANE);
    b(22, by + 1 + wingY, 3, 1, C.GLOW);
    p(25, by + wingY, C.MEMBRANE);
    // Wing veins
    p(9, by + 3 + wingY, C.LEG); p(21, by + 3 + wingY, C.LEG);
    // Legs
    b(12, by + 12, 2, 3, C.LEG); b(18, by + 12, 2, 3, C.LEG);
    p(11, by + 14, C.CHITIN); p(19, by + 14, C.CHITIN);
    // Heal glow particles
    if (pulse) {
      p(10, by + 9, C.GLOW); p(21, by + 9, C.GLOW);
      p(16, by + 13, C.ACID);
    }
  } else {
    drawDeathInsect(p, b, f - 4, 16, 13);
  }
}

// 5: Hive Queen (Boss) - Enormous insectoid, crown of antennae, egg sac visible, dripping mandibles, compound eyes (multiple), chitinous armor plates, pulsing bioluminescent spots, pink egg glow
function drawBoss(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, 0, -1, 0][f];
    const legF = [0, 1, 0, -1][f];
    const legR = [0, -1, 0, 1][f];
    const by = 1 + bob;
    const pulse = f === 0 || f === 2;

    // === CROWN OF ANTENNAE (6 antennae, imposing) ===
    p(8, by - 3, C.COMPEYE); p(9, by - 2, C.LEG); p(10, by - 1, C.LEG);
    p(12, by - 4, C.COMPEYE); p(12, by - 3, C.LEG); p(13, by - 2, C.LEG); p(13, by - 1, C.LEG);
    p(16, by - 5, C.COMPEYE); p(16, by - 4, C.LEG); p(16, by - 3, C.LEG); p(16, by - 2, C.LEG);
    p(19, by - 4, C.COMPEYE); p(19, by - 3, C.LEG); p(19, by - 2, C.LEG);
    p(22, by - 3, C.COMPEYE); p(22, by - 2, C.LEG); p(21, by - 1, C.LEG);
    p(24, by - 2, C.COMPEYE); p(24, by - 1, C.LEG);

    // === LARGE ARMORED HEAD ===
    b(9, by, 14, 5, C.SHELL);
    b(9, by, 14, 2, C.BRSHELL); b(10, by, 12, 1, C.MEMBRANE);
    b(9, by, 2, 5, C.BRSHELL); b(21, by + 2, 2, 3, C.DKSHELL);
    // Chitinous armor ridges on head
    p(11, by + 1, C.DKSHELL); p(14, by, C.DKSHELL); p(17, by + 1, C.DKSHELL); p(20, by, C.DKSHELL);

    // === MULTIPLE COMPOUND EYES (4 eyes) ===
    b(10, by + 2, 4, 2, C.EYE); p(11, by + 2, C.WHITE); p(10, by + 3, C.COMPEYE); p(13, by + 2, C.COMPEYE);
    b(18, by + 2, 4, 2, C.EYE); p(19, by + 2, C.WHITE); p(18, by + 3, C.COMPEYE); p(21, by + 2, C.COMPEYE);
    // Small lower eyes
    b(13, by + 3, 2, 1, C.EYE); p(13, by + 3, C.WHITE);
    b(17, by + 3, 2, 1, C.EYE); p(17, by + 3, C.WHITE);

    // === MASSIVE DRIPPING MANDIBLES ===
    b(8, by + 4, 4, 3, C.MANDIBLE); p(7, by + 5, C.INNARD); p(7, by + 6, C.MANDIBLE);
    b(20, by + 4, 4, 3, C.MANDIBLE); p(23, by + 5, C.INNARD); p(24, by + 6, C.MANDIBLE);
    // Drip from mandibles
    p(8, by + 7, C.DKACID); p(9, by + 8, C.ACID);
    p(22, by + 7, C.DKACID); p(23, by + 8, C.ACID);

    // === THORAX (armored, wide) ===
    b(7, by + 5, 18, 5, C.SHELL);
    b(7, by + 5, 3, 5, C.BRSHELL); b(8, by + 5, 2, 3, C.MEMBRANE);
    b(22, by + 6, 3, 4, C.DKSHELL); b(23, by + 7, 2, 3, C.CHITIN);
    b(9, by + 5, 14, 1, C.BRSHELL);
    // Chitinous plate detail
    b(12, by + 7, 8, 1, C.DKSHELL);

    // === HUGE EGG-LADEN ABDOMEN (fills lower body) ===
    b(5, by + 10, 22, 11, C.SHELL);
    b(5, by + 10, 3, 11, C.BRSHELL); b(6, by + 11, 2, 9, C.MEMBRANE);
    b(24, by + 10, 3, 11, C.DKSHELL); b(25, by + 12, 2, 7, C.CHITIN);

    // Egg sac visible through translucent abdomen (pulsing pink glow)
    b(9, by + 12, 14, 7, C.DKACID);
    // Top row eggs
    b(10, by + 13, 4, 2, pulse ? C.PINK : C.EGG); b(11, by + 13, 2, 1, C.LARVA);
    b(18, by + 13, 4, 2, pulse ? C.PINK : C.EGG); b(19, by + 13, 2, 1, C.LARVA);
    // Middle egg (large, prominent)
    b(13, by + 14, 6, 3, pulse ? C.PINK : C.EGG); b(14, by + 15, 4, 1, C.LARVA);
    p(15, by + 14, pulse ? C.WHITE : C.LARVA); p(16, by + 15, pulse ? C.WHITE : C.LARVA);
    // Bottom eggs
    b(10, by + 16, 3, 2, C.EGG); p(11, by + 16, pulse ? C.PINK : C.LARVA);
    b(19, by + 16, 3, 2, C.EGG); p(20, by + 16, pulse ? C.PINK : C.LARVA);

    // Segment lines on abdomen
    b(7, by + 13, 18, 1, C.DKSHELL);
    b(7, by + 16, 18, 1, C.DKSHELL);
    b(8, by + 19, 16, 1, C.DKSHELL);

    // === PULSING BIOLUMINESCENT SPOTS on carapace ===
    p(8, by + 11, pulse ? C.ACID : C.DKACID);
    p(23, by + 11, pulse ? C.ACID : C.DKACID);
    p(7, by + 15, pulse ? C.GLOW : C.DKACID);
    p(24, by + 15, pulse ? C.GLOW : C.DKACID);
    p(10, by + 19, pulse ? C.PINK : C.DKPINK);
    p(21, by + 19, pulse ? C.PINK : C.DKPINK);

    // Acid drip from abdomen
    p(16, by + 21, C.ACID); p(15, by + 22, C.DKACID); p(17, by + 22, C.DKACID);

    // === SIX THICK LEGS (3 pairs) ===
    // Front pair
    b(3 + legF, by + 7, 3, 7, C.LEG); b(3 + legF, by + 7, 1, 7, C.BRSHELL);
    p(2 + legF, by + 13, C.CHITIN);
    b(26 + legR, by + 7, 3, 7, C.LEG); b(28 + legR, by + 7, 1, 7, C.DKSHELL);
    p(29 + legR, by + 13, C.CHITIN);
    // Middle pair
    b(4 + legR, by + 13, 3, 8, C.LEG); b(4 + legR, by + 13, 1, 8, C.BRSHELL);
    p(3 + legR, by + 20, C.CHITIN);
    b(25 + legF, by + 13, 3, 8, C.LEG); b(27 + legF, by + 13, 1, 8, C.DKSHELL);
    p(28 + legF, by + 20, C.CHITIN);
    // Rear pair
    b(6 + legF, by + 18, 3, 6, C.LEG); p(5 + legF, by + 23, C.CHITIN);
    b(23 + legR, by + 18, 3, 6, C.LEG); p(25 + legR, by + 23, C.CHITIN);

    // Front feelers/palps
    b(2 + legF, by + 5, 2, 4, C.LEG); p(1 + legF, by + 8, C.CHITIN);
    b(28 + legR, by + 5, 2, 4, C.LEG); p(29 + legR, by + 8, C.CHITIN);

    // Feet (clawed)
    b(2 + legF, by + 14, 4, 2, C.CHITIN); p(1 + legF, by + 14, C.MANDIBLE);
    b(26 + legR, by + 14, 4, 2, C.CHITIN); p(29 + legR, by + 14, C.MANDIBLE);
    b(3 + legR, by + 21, 3, 2, C.CHITIN);
    b(26 + legF, by + 21, 3, 2, C.CHITIN);
    b(5 + legF, by + 24, 3, 2, C.CHITIN);
    b(24 + legR, by + 24, 3, 2, C.CHITIN);
  } else {
    drawDeathInsect(p, b, f - 4, 16, 14);
  }
}

// 6: Swarm Cluster (Group) - blob of small insects
function drawGroup(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const jx = [0, 1, -1, 0][f];
    const jy = [0, 0, 1, -1][f];
    // Draw 5 tiny insects clustered
    const bugs: [number, number][] = [
      [14 + jx, 10 + jy], [10 - jx, 13 + jy], [18 + jx, 13 - jy],
      [12 + jy, 16 - jx], [17 - jy, 16 + jx],
    ];
    for (let i = 0; i < bugs.length; i++) {
      const [bx, by] = bugs[i];
      b(bx, by, 4, 3, C.SHELL);
      b(bx, by, 4, 1, C.BRSHELL);
      b(bx, by + 2, 4, 1, C.DKSHELL);
      p(bx + 3, by, C.EYE);
      // Tiny legs
      p(bx - 1, by + 1, C.LEG); p(bx + 4, by + 1, C.LEG);
      p(bx - 1, by + 2, C.LEG); p(bx + 4, by + 2, C.LEG);
      // Antennae
      p(bx + 3, by - 1, C.LEG);
    }
    // Connecting pheromone wisps
    p(13, 12 + jy, C.GLOW); p(16, 15 - jy, C.DKACID);
    p(15, 13, C.ACID);
  } else {
    drawDeathInsect(p, b, f - 4, 16, 15);
  }
}

// 7: Egg Sac (Splitter) - bulging pod with embryos visible
function drawSplitter(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, 1, 0, -1][f];
    const pulse = f === 1 || f === 3;
    const by = 5 + bob;
    // Large translucent egg sac
    b(10, by, 12, 3, C.EGG); b(11, by, 10, 1, C.LARVA);
    b(8, by + 3, 16, 10, C.EGG);
    b(9, by + 13, 14, 3, C.EGG);
    b(11, by + 16, 10, 2, C.DKSHELL);
    // Shading
    b(8, by + 3, 3, 10, C.LARVA); b(9, by + 4, 2, 8, C.MEMBRANE);
    b(21, by + 3, 3, 10, C.INNARD); b(22, by + 5, 2, 6, C.DKSHELL);
    b(9, by + 13, 2, 3, C.LARVA); b(21, by + 13, 2, 3, C.DKSHELL);
    // Visible embryos inside
    b(12, by + 4, 3, 2, pulse ? C.ACID : C.DKACID);
    p(13, by + 4, pulse ? C.GLOW : C.ACID);
    b(17, by + 5, 3, 2, pulse ? C.ACID : C.DKACID);
    p(18, by + 5, pulse ? C.GLOW : C.ACID);
    b(14, by + 8, 4, 3, pulse ? C.ACID : C.DKACID);
    b(15, by + 9, 2, 1, pulse ? C.GLOW : C.ACID);
    b(11, by + 10, 3, 2, C.DKACID);
    b(18, by + 10, 3, 2, C.DKACID);
    // Veiny surface
    p(10, by + 5, C.DKACID); p(13, by + 7, C.DKACID);
    p(18, by + 3, C.DKACID); p(20, by + 8, C.DKACID);
    p(12, by + 12, C.DKACID); p(19, by + 12, C.DKACID);
    // Tiny legs (barely mobile)
    b(11, by + 18, 3, 2, C.LEG); b(18, by + 18, 3, 2, C.LEG);
    p(10, by + 19, C.CHITIN); p(20, by + 19, C.CHITIN);
    // Dripping goo
    if (pulse) {
      p(16, by + 18, C.ACID); p(15, by + 19, C.DKACID);
    }
  } else {
    drawDeathInsect(p, b, f - 4, 16, 14);
  }
}

// 8: Carapace Warrior (Shielded) - folded chitin shield
function drawShielded(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const legF = [0, 1, 0, -1][f];
    const legR = [0, -1, 0, 1][f];
    const by = 4 + bob;
    // Head peeking from behind shield
    b(13, by, 6, 3, C.SHELL); b(14, by, 4, 1, C.BRSHELL);
    p(14, by + 1, C.EYE); p(17, by + 1, C.EYE); p(14, by + 1, C.WHITE);
    // Massive folded shield plates (front)
    b(7, by + 3, 18, 14, C.SHELL);
    b(7, by + 3, 3, 14, C.BRSHELL); b(8, by + 4, 2, 12, C.MEMBRANE);
    b(22, by + 3, 3, 14, C.DKSHELL); b(23, by + 5, 2, 10, C.CHITIN);
    // Shield ridge lines (horizontal plates)
    b(9, by + 3, 14, 1, C.BRSHELL);
    b(9, by + 7, 14, 1, C.DKSHELL);
    b(9, by + 11, 14, 1, C.DKSHELL);
    b(9, by + 15, 14, 1, C.DKSHELL);
    // Shield plate detail (rivets/bumps)
    p(10, by + 5, C.BRSHELL); p(21, by + 5, C.CHITIN);
    p(10, by + 9, C.BRSHELL); p(21, by + 9, C.CHITIN);
    p(10, by + 13, C.BRSHELL); p(21, by + 13, C.CHITIN);
    // Center seam with acid glow
    b(15, by + 4, 2, 12, C.DKSHELL);
    b(15, by + 6, 2, 2, C.DKACID); p(15, by + 6, C.ACID);
    b(15, by + 10, 2, 2, C.DKACID); p(16, by + 10, C.ACID);
    // Legs below shield
    b(10 + legF, by + 17, 4, 5, C.LEG);
    b(10 + legF, by + 17, 1, 5, C.BRSHELL);
    b(18 + legR, by + 17, 4, 5, C.LEG);
    b(21 + legR, by + 17, 1, 5, C.DKSHELL);
    // Feet
    b(9 + legF, by + 22, 5, 2, C.CHITIN);
    b(18 + legR, by + 22, 5, 2, C.CHITIN);
    // Mandibles poking out sides
    p(6, by + 5, C.MANDIBLE); p(5, by + 6, C.MANDIBLE);
    p(25, by + 5, C.MANDIBLE); p(26, by + 6, C.MANDIBLE);
  } else {
    drawDeathInsect(p, b, f - 4, 16, 14);
  }
}

// 9: Phasewing (Evasive) - translucent-winged, darting
function drawEvasive(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const fx = [0, 4, -3, 2][f];
    const fy = [0, -2, 2, -1][f];
    const bx = 12 + fx, by = 9 + fy;
    // Slim darting insect body
    b(bx, by, 8, 3, C.SHELL);
    b(bx, by, 8, 1, C.BRSHELL);
    b(bx + 1, by + 3, 6, 4, C.SHELL);
    b(bx + 1, by + 3, 2, 4, C.BRSHELL);
    b(bx + 6, by + 4, 1, 3, C.DKSHELL);
    // Head
    b(bx + 6, by - 1, 3, 2, C.SHELL); p(bx + 8, by - 1, C.BRSHELL);
    p(bx + 8, by, C.EYE); p(bx + 8, by - 1, C.WHITE);
    // Translucent wings (gaps for phase effect)
    if (f !== 1) {
      b(bx - 3, by - 2, 4, 2, C.MEMBRANE);
      b(bx + 7, by - 2, 4, 2, C.MEMBRANE);
      p(bx - 2, by - 1, C.GLOW); p(bx + 9, by - 1, C.GLOW);
    } else {
      p(bx - 2, by - 1, C.MEMBRANE); p(bx + 8, by - 2, C.MEMBRANE);
      p(bx - 3, by - 2, C.GLOW); p(bx + 10, by - 2, C.GLOW);
    }
    if (f !== 2) {
      b(bx - 3, by + 5, 4, 2, C.MEMBRANE);
      b(bx + 7, by + 5, 4, 2, C.MEMBRANE);
    } else {
      p(bx - 1, by + 5, C.MEMBRANE); p(bx + 8, by + 6, C.MEMBRANE);
    }
    // Ghost afterimages
    if (f === 1 || f === 3) {
      b(bx - 5, by + 1, 2, 2, C.CHITIN);
      p(bx - 6, by + 2, C.DKSHELL);
    }
    if (f === 2) {
      b(bx + 10, by + 1, 2, 2, C.CHITIN);
      p(bx + 11, by + 2, C.DKSHELL);
    }
    // Acid trail
    p(bx - 1, by + 2, C.DKACID);
    if (f % 2 === 0) p(bx - 2, by + 3, C.CHITIN);
  } else {
    drawDeathInsect(p, b, f - 4, 16, 14);
  }
}

// 10: Molt Crawler (Regen) - shedding/regrowing shell
function drawRegenerator(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, 0, -1, 0][f];
    const by = 5 + bob;
    const bright = f === 0 || f === 2;
    const shellC = bright ? C.BRSHELL : C.SHELL;
    const innerC = bright ? C.ACID : C.DKACID;
    // Body with partial shell
    b(10, by + 2, 12, 10, shellC);
    b(10, by + 2, 2, 10, bright ? C.MEMBRANE : C.BRSHELL);
    b(20, by + 3, 2, 8, C.DKSHELL);
    // Head
    b(13, by, 6, 3, shellC); b(14, by, 4, 1, C.MEMBRANE);
    p(14, by + 1, C.EYE); p(17, by + 1, C.EYE); p(14, by + 1, C.WHITE);
    // Exposed inner areas (molt gaps)
    b(11, by + 4, 4, 3, innerC);
    b(12, by + 5, 2, 1, bright ? C.GLOW : C.ACID);
    b(17, by + 6, 4, 3, innerC);
    b(18, by + 7, 2, 1, bright ? C.GLOW : C.ACID);
    // Old shell fragments hanging off
    b(8, by + 3, 2, 4, C.DKSHELL); p(7, by + 4, C.CHITIN);
    b(22, by + 5, 2, 3, C.DKSHELL); p(23, by + 7, C.CHITIN);
    // New shell growing (bright patches)
    if (bright) {
      p(11, by + 3, C.GLOW); p(20, by + 5, C.GLOW);
      p(14, by + 8, C.GLOW); p(17, by + 4, C.GLOW);
    }
    // Segment lines
    b(11, by + 6, 10, 1, C.DKSHELL);
    b(11, by + 9, 10, 1, C.DKSHELL);
    // Abdomen
    b(11, by + 12, 10, 4, shellC);
    b(11, by + 12, 2, 4, bright ? C.MEMBRANE : C.BRSHELL);
    b(19, by + 12, 2, 4, C.DKSHELL);
    // Legs
    b(8, by + 6, 2, 5, C.LEG); p(7, by + 10, C.CHITIN);
    b(22, by + 6, 2, 5, C.LEG); p(23, by + 10, C.CHITIN);
    b(10, by + 16, 3, 3, C.LEG); p(9, by + 18, C.CHITIN);
    b(19, by + 16, 3, 3, C.LEG); p(21, by + 18, C.CHITIN);
    // Bioluminescent glow spots
    p(15, by + 5, bright ? C.WHITE : C.GLOW);
    p(16, by + 8, bright ? C.WHITE : C.GLOW);
  } else {
    drawDeathInsect(p, b, f - 4, 16, 12);
  }
}

// 11: Wasp Drone (Flying) - aggressive winged stinger
function drawFlying(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const wingY = [0, 2, 4, 2][f];
    const by = 9;
    // Horizontal wasp body
    b(10, by + 4, 12, 4, C.SHELL);
    b(10, by + 4, 12, 1, C.BRSHELL);
    b(10, by + 7, 12, 1, C.DKSHELL);
    // Yellow/acid stripe pattern
    b(12, by + 5, 2, 2, C.EYE); b(16, by + 5, 2, 2, C.EYE);
    // Head (right)
    b(20, by + 3, 4, 4, C.SHELL); b(20, by + 3, 4, 1, C.BRSHELL);
    p(23, by + 4, C.EYE); p(23, by + 3, C.WHITE);
    // Mandibles
    p(24, by + 5, C.MANDIBLE); p(25, by + 5, C.MANDIBLE);
    // Stinger (left/tail)
    b(7, by + 5, 3, 2, C.DKSHELL);
    b(5, by + 5, 2, 2, C.MANDIBLE); p(4, by + 6, C.INNARD);
    // Acid drip from stinger
    p(5, by + 7, C.ACID); p(6, by + 8, C.DKACID);
    // Top wing
    b(12, by + 1 + wingY, 6, 2, C.MEMBRANE);
    b(10, by + wingY, 4, 1, C.GLOW);
    b(8, by - 1 + wingY, 3, 1, C.MEMBRANE);
    p(11, by + 2 + wingY, C.LEG); p(15, by + 2 + wingY, C.LEG);
    // Bottom wing
    b(12, by + 9 - wingY, 6, 2, C.MEMBRANE);
    b(10, by + 10 - wingY, 4, 1, C.MEMBRANE);
    b(8, by + 11 - wingY, 3, 1, C.CHITIN);
    // Legs dangling
    p(14, by + 8, C.LEG); p(15, by + 9, C.LEG);
    p(18, by + 8, C.LEG); p(19, by + 9, C.LEG);
    // Shadow
    b(12, by + 16, 6, 1, C.CHITIN); b(13, by + 17, 4, 1, C.DKSHELL);
  } else {
    drawDeathInsect(p, b, f - 4, 16, 13);
  }
}

// Helper: draw mage-type insect base (upright insect with staff)
function drawMageBase(
  p: (x: number, y: number, cl: string) => void,
  b: (x: number, y: number, w: number, h: number, cl: string) => void,
  f: number, accentC: string, staffC: string, bodyMod?: string
) {
  const bob = [0, -1, 0, -1][f];
  const lOff = [0, 1, 0, -1][f];
  const rOff = [0, -1, 0, 1][f];
  const by = 4 + bob;
  const dark = bodyMod === 'dark';
  const spore = bodyMod === 'spore';
  const bodyC = dark ? C.CHITIN : spore ? C.DKSHELL : C.SHELL;
  const hiC = dark ? C.SHELL : spore ? C.SHELL : C.BRSHELL;
  const dkC = dark ? C.DKSHELL : spore ? C.CHITIN : C.DKSHELL;

  // Insectoid head with hood-like carapace
  b(13, by, 6, 2, hiC);
  b(12, by + 2, 8, 4, bodyC);
  b(12, by + 2, 2, 4, hiC); b(19, by + 3, 1, 3, dkC);
  // Compound eyes
  b(13, by + 3, 2, 2, C.EYE); p(13, by + 3, C.WHITE);
  b(17, by + 3, 2, 2, C.EYE); p(17, by + 3, C.WHITE);
  // Antennae
  p(14, by - 1, C.LEG); p(13, by - 2, accentC);
  p(18, by - 1, C.LEG); p(19, by - 2, accentC);
  // Mandibles
  p(12, by + 5, C.MANDIBLE); p(19, by + 5, C.MANDIBLE);
  // Upright thorax/robe
  b(11, by + 6, 10, 5, bodyC);
  b(11, by + 6, 2, 5, hiC); b(20, by + 6, 1, 5, dkC);
  b(10, by + 11, 12, 5, bodyC);
  b(10, by + 11, 2, 5, hiC); b(21, by + 11, 1, 5, dkC);
  b(9, by + 16, 14, 3, bodyC);
  b(9, by + 16, 2, 3, hiC); b(22, by + 16, 1, 3, dkC);
  // Chitin plate lines
  b(12, by + 8, 8, 1, dkC);
  b(11, by + 13, 10, 1, dkC);
  // Segment detail
  p(13, by + 10, accentC); p(14, by + 11, accentC);
  p(15, by + 12, accentC);
  // Staff
  b(22, by + 1, 2, 16, C.LEG);
  b(22, by + 1, 1, 16, C.CHITIN);
  // Staff top
  b(21, by - 1, 4, 2, staffC); b(22, by - 1, 2, 1, accentC);
  p(22, by - 2, accentC); p(23, by - 2, accentC);
  // Staff wrapping
  p(22, by + 5, staffC); p(22, by + 9, staffC);
  // Left arm
  b(9, by + 8 + lOff, 2, 3, bodyC); p(8, by + 9 + lOff, hiC);
  // Legs
  b(11 + lOff, by + 19, 3, 2, bodyC); b(11 + lOff, by + 20, 3, 1, dkC);
  b(18 + rOff, by + 19, 3, 2, bodyC); b(18 + rOff, by + 20, 3, 1, dkC);
}

// 12: Chitin Mage (Iron) - upright insect, dark staff
function drawMageIron(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawMageBase(p, b, f, C.COMPEYE, C.DKSHELL, 'dark');
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    // Extra chitin armor plates
    b(12, by + 7, 8, 2, C.CHITIN);
    b(13, by + 7, 6, 1, C.DKSHELL);
    // Shoulder plates
    b(10, by + 9, 3, 2, C.CHITIN); b(10, by + 9, 1, 2, C.SHELL);
    b(19, by + 9, 3, 2, C.DKSHELL);
    // Belt
    b(13, by + 14, 6, 2, C.CHITIN); b(14, by + 14, 4, 1, C.SHELL);
    // Armored detail
    p(10, by + 16, C.DKSHELL); p(21, by + 16, C.CHITIN);
  } else {
    drawDeathInsect(p, b, f - 4, 16, 14);
  }
}

// 13: Pheromone Mage (Haste) - spraying yellow trails
function drawMageHaste(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawMageBase(p, b, f, C.EYE, C.COMPEYE, undefined);
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    // Pheromone yellow trails
    b(5, by + 5, 3, 1, C.EYE); b(3, by + 5, 2, 1, C.COMPEYE);
    b(4, by + 9, 4, 1, C.COMPEYE); p(2, by + 9, C.EYE);
    b(5, by + 13, 3, 1, C.EYE); p(3, by + 13, C.COMPEYE);
    b(6, by + 16, 2, 1, C.EYE);
    // Extra particles
    if (f % 2 === 0) {
      p(2, by + 3, C.COMPEYE); p(1, by + 7, C.EYE);
      b(3, by + 11, 2, 1, C.COMPEYE);
    } else {
      p(3, by + 4, C.EYE); p(2, by + 8, C.COMPEYE);
      b(4, by + 12, 2, 1, C.EYE);
    }
    // Motion particles
    p(1, by + 6, C.CHITIN); p(0, by + 10, C.CHITIN);
  } else {
    drawDeathInsect(p, b, f - 4, 16, 14);
  }
}

// 14: Spore Mage (Mist) - releasing spore clouds
function drawMageMist(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawMageBase(p, b, f, C.GLOW, C.MEMBRANE, 'spore');
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    const mx = [5, 7, 3, 8][f];
    const my = [7, 11, 5, 9][f];
    // Spore clouds
    b(mx, by + my, 2, 1, C.GLOW); p(mx + 2, by + my + 1, C.MEMBRANE);
    b(mx + 16, by + my - 2, 2, 1, C.MEMBRANE); p(mx + 18, by + my - 1, C.GLOW);
    // More spore wisps
    b(25, by + 3, 2, 1, C.GLOW); p(26, by + 4, C.MEMBRANE);
    b(4, by + 15, 3, 1, C.MEMBRANE); p(3, by + 16, C.GLOW);
    if (f === 1 || f === 3) {
      b(3, by + 14, 2, 1, C.MEMBRANE); p(2, by + 15, C.GLOW);
      p(27, by + 8, C.MEMBRANE);
    }
    if (f === 0 || f === 2) {
      p(26, by + 6, C.GLOW); p(5, by + 10, C.MEMBRANE);
    }
  } else {
    drawDeathInsect(p, b, f - 4, 16, 14);
  }
}

// 15: Nurse Drone (Heal) - green glow healing glands
function drawMageHeal(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawMageBase(p, b, f, C.ACID, C.DKACID, undefined);
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    // Staff gem glow (acid green)
    p(22, by - 3, C.ACID); p(23, by - 3, C.ACID);
    b(21, by - 1, 4, 1, C.ACID); p(21, by - 2, C.DKACID);
    p(24, by - 2, C.DKACID);
    // Healing gland particles from left hand
    const px_ = [7, 5, 8, 6][f];
    b(px_, by + 5, 2, 1, C.ACID); p(px_ + 2, by + 4, C.DKACID);
    p(px_ - 1, by + 6, C.ACID);
    // Cross heal symbol
    b(24, by + 5, 2, 1, C.ACID);
    b(25, by + 4, 1, 3, C.ACID);
    p(25, by + 3, C.DKACID); p(25, by + 7, C.DKACID);
    p(23, by + 5, C.DKACID); p(26, by + 5, C.DKACID);
    // Extra heal sparkles
    if (f % 2 === 0) {
      p(6, by + 3, C.ACID); p(8, by + 8, C.DKACID);
    } else {
      p(7, by + 2, C.DKACID); p(5, by + 7, C.ACID);
    }
  } else {
    drawDeathInsect(p, b, f - 4, 16, 14);
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
export default function AliensCreepSprites() {
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
    pc.fillStyle = '#0a1808';
    pc.fillRect(0, 0, pv.width, pv.height);

    for (let r = 0; r < ROWS; r++) {
      const by = r * (CELL * S + LH) + 5;
      pc.fillStyle = '#66aa33';
      pc.font = 'bold 9px monospace';
      pc.fillText(ROW_NAMES[r], 3, by + CELL * S / 2 + 3);

      for (let cc = 0; cc < COLS; cc++) {
        const bx = LW + cc * CELL * S;
        pc.save();
        pc.translate(bx, by);
        pc.scale(S, S);
        pc.drawImage(sc, cc * CELL, r * CELL, CELL, CELL, 0, 0, CELL, CELL);
        pc.restore();
        pc.strokeStyle = '#1a2a1a';
        pc.strokeRect(bx, by, CELL * S, CELL * S);
        if (r === 0) {
          pc.fillStyle = '#88aa66';
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
    <div style={{ background: '#0a1808', minHeight: '100vh', padding: 12, fontFamily: 'monospace' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <h2 style={{ color: C.ACID, margin: 0, fontSize: 15 }}>ALIENS FACTION — Creep Spritesheet</h2>
        {ready && (
          <button
            onClick={download(sheetRef, 'aliens_creeps.png')}
            style={{
              background: C.BRSHELL, color: '#fff', border: 'none', padding: '5px 14px',
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
              background: view === v ? '#1a2a1a' : '#111',
              color: view === v ? C.ACID : '#445566',
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
          data-label="Aliens Creeps (Preview)"
          data-frame-size="64x64"
          data-direction="right"
          data-columns='["Drone (Standard)","Skitter (Fast)","Scarab (Armored)","Larva (Swarm)","Queen Attendant (Healer)","Hive Queen (Boss)","Swarm Cluster (Group)","Egg Sac (Splitter)","Carapace Warrior (Shielded)","Phasewing (Evasive)","Molt Crawler (Regen)","Wasp Drone (Flying)","Chitin Mage (Iron)","Pheromone Mage (Haste)","Spore Mage (Mist)","Nurse Drone (Heal)"]'
          data-rows='["Walk 1","Walk 2","Walk 3","Walk 4","Death 1","Death 2","Death 3"]'
          data-presets='[{"name":"Walk","startRow":0,"endRow":3},{"name":"Death","startRow":4,"endRow":6}]'
          style={{ display: view === 'preview' ? 'block' : 'none', maxWidth: '100%' }}
        />
        <canvas
          ref={sheetRef}
          data-label="Aliens Creeps"
          data-frame-size="64x64"
          data-direction="right"
          data-columns='["Drone (Standard)","Skitter (Fast)","Scarab (Armored)","Larva (Swarm)","Queen Attendant (Healer)","Hive Queen (Boss)","Swarm Cluster (Group)","Egg Sac (Splitter)","Carapace Warrior (Shielded)","Phasewing (Evasive)","Molt Crawler (Regen)","Wasp Drone (Flying)","Chitin Mage (Iron)","Pheromone Mage (Haste)","Spore Mage (Mist)","Nurse Drone (Heal)"]'
          data-rows='["Walk 1","Walk 2","Walk 3","Walk 4","Death 1","Death 2","Death 3"]'
          data-presets='[{"name":"Walk","startRow":0,"endRow":3},{"name":"Death","startRow":4,"endRow":6}]'
          style={{
            display: view === 'actual' ? 'block' : 'none',
            imageRendering: 'pixelated',
            width: SHEET_W * 2,
            border: '1px solid #1a2a1a',
          }}
        />
      </div>
      <div style={{ color: '#445522', fontSize: 9, marginTop: 10, maxWidth: 700 }}>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#66aa33' }}>Sheet:</b> {SHEET_W}x{SHEET_H}px ({COLS} cols x {ROWS} rows) — {CELL}x{CELL} cells
        </p>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#66aa33' }}>Phaser:</b>{' '}
          <code style={{ color: C.ACID }}>
            {"this.load.spritesheet('aliens_creeps','aliens_creeps.png',{frameWidth:64,frameHeight:64})"}
          </code>
        </p>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#66aa33' }}>Layout:</b> 16 cols (creep types) x 7 rows (walk0-3, death0-2). Frame index = row * 16 + col.
        </p>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#66aa33' }}>Types:</b> {CREEP_NAMES.join(', ')}
        </p>
      </div>
    </div>
  );
}
