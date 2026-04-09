import { useRef, useEffect, useState, useCallback } from "react";

// ===== PSIONIC CREEP PALETTE =====
const C = {
  BODY: '#3a1848',      // main body
  DK: '#220e30',        // dark shadow
  LIGHT: '#5a2868',     // light body
  ENERGY: '#ee44ff',    // energy pink
  BRIGHT: '#ff88ff',    // bright energy
  BRAIN: '#cc88dd',     // brain tissue
  DKBRAIN: '#8855aa',   // dark brain
  EYE: '#ff22aa',       // eye glow
  CORE: '#ffaaee',      // bright core
  MIND: '#aa44cc',      // mind purple
  PULSE: '#dd66ee',     // pulse effect
  TENDRIL: '#6633aa',   // tendril
  DKTENDRIL: '#442266', // dark tendril
  NEURON: '#ff66cc',    // neuron pink
  SYNAPSE: '#cc44aa',   // synapse
  GLOW: '#bb55dd',      // glow
  WHITE: '#ffffff',
  MID: '#4a2858',       // mid-tone body
  LBODY: '#6a3878',     // light body variant
  VOID: '#110820',      // deepest shadow
  DUST: '#553366',      // fading dust
  FRAG: '#7744aa',      // fragment mid
  CRACK: '#ee88ff',     // crack lines
  // Boss accent colors
  NEURAL: '#ffcc44',    // golden neural glow
  DKNEURAL: '#cc9922',  // dark neural
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
function drawDeathPsionic(
  p: (x: number, y: number, cl: string) => void,
  b: (x: number, y: number, w: number, h: number, cl: string) => void,
  deathFrame: number, cx: number, cy: number
) {
  if (deathFrame === 0) {
    // Frame 0: Brain pulses, overload glow
    b(cx - 4, cy - 4, 9, 8, C.BODY);
    b(cx - 3, cy - 5, 7, 2, C.BRAIN);
    b(cx - 2, cy - 6, 5, 1, C.DKBRAIN);
    b(cx - 3, cy + 4, 7, 2, C.DK);
    // Shading
    b(cx - 4, cy - 4, 2, 8, C.LIGHT);
    b(cx + 3, cy - 2, 2, 6, C.DK);
    // Psychic overload cracks
    p(cx, cy - 5, C.WHITE); p(cx + 1, cy - 4, C.BRIGHT);
    p(cx + 2, cy - 3, C.WHITE); p(cx - 2, cy - 3, C.ENERGY);
    p(cx - 3, cy - 1, C.WHITE); p(cx + 3, cy, C.BRIGHT);
    p(cx - 1, cy + 1, C.ENERGY); p(cx + 1, cy + 2, C.BRIGHT);
    p(cx, cy + 3, C.ENERGY); p(cx - 2, cy + 3, C.BRIGHT);
    p(cx + 2, cy + 3, C.ENERGY); p(cx + 4, cy + 1, C.BRIGHT);
    p(cx - 4, cy + 1, C.WHITE);
    // Bright core pulse
    b(cx - 1, cy - 1, 3, 3, C.CORE);
    p(cx, cy, C.WHITE); p(cx - 1, cy, C.BRIGHT); p(cx + 1, cy, C.BRIGHT);
  } else if (deathFrame === 1) {
    // Frame 1: Energy disperses outward, thought particles
    b(cx - 6, cy - 6, 2, 2, C.ENERGY); p(cx - 6, cy - 6, C.BRIGHT);
    b(cx + 5, cy - 6, 2, 2, C.PULSE); p(cx + 6, cy - 6, C.BRIGHT);
    b(cx - 7, cy - 1, 2, 2, C.BRAIN); p(cx - 7, cy - 1, C.GLOW);
    b(cx + 6, cy - 1, 2, 2, C.BRAIN); p(cx + 7, cy, C.DK);
    b(cx - 6, cy + 5, 2, 2, C.MIND);
    b(cx + 5, cy + 5, 2, 2, C.MIND); p(cx + 6, cy + 6, C.DK);
    b(cx - 1, cy - 7, 2, 2, C.ENERGY); p(cx, cy - 7, C.BRIGHT);
    b(cx - 1, cy + 6, 2, 2, C.DK);
    // Smaller thought fragments
    p(cx - 3, cy - 3, C.NEURON); p(cx + 3, cy - 3, C.NEURON);
    p(cx - 3, cy + 3, C.PULSE); p(cx + 3, cy + 3, C.PULSE);
    p(cx - 2, cy - 1, C.SYNAPSE); p(cx + 2, cy + 1, C.SYNAPSE);
    // Dust
    p(cx - 4, cy - 4, C.DUST); p(cx + 4, cy - 4, C.DUST);
    p(cx - 4, cy + 4, C.DUST); p(cx + 4, cy + 4, C.DUST);
    // Center flash
    b(cx - 1, cy - 1, 3, 3, C.WHITE);
    p(cx, cy, C.WHITE);
  } else {
    // Frame 2: Fading thought particles
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

// 0: Mind Drone (Standard) - floating humanoid, oversized head, small body
function drawStandard(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 4 + bob;
    // Oversized head (brain-like)
    b(10, by, 12, 3, C.BRAIN); b(11, by, 10, 1, C.GLOW);
    b(9, by + 3, 14, 4, C.BRAIN); b(9, by + 3, 2, 4, C.GLOW);
    b(21, by + 3, 2, 4, C.DKBRAIN);
    // Brain folds
    p(12, by + 1, C.DKBRAIN); p(15, by + 1, C.DKBRAIN); p(18, by + 1, C.DKBRAIN);
    p(11, by + 3, C.DKBRAIN); p(14, by + 4, C.DKBRAIN); p(17, by + 3, C.DKBRAIN);
    p(20, by + 5, C.DKBRAIN);
    // Eyes
    b(12, by + 5, 2, 2, C.EYE); p(13, by + 5, C.WHITE);
    b(18, by + 5, 2, 2, C.EYE); p(19, by + 5, C.WHITE);
    // Psychic energy crown
    p(13, by - 1, C.ENERGY); p(16, by - 2, C.BRIGHT); p(19, by - 1, C.ENERGY);
    p(15, by - 1, C.PULSE); p(17, by - 1, C.PULSE);
    // Small thin body
    b(13, by + 7, 6, 2, C.BODY); b(13, by + 7, 1, 2, C.LIGHT);
    b(12, by + 9, 8, 5, C.BODY);
    b(12, by + 9, 2, 5, C.LIGHT); b(18, by + 9, 2, 5, C.DK);
    // Core glow in chest
    b(15, by + 10, 2, 2, C.ENERGY); p(15, by + 10, C.CORE);
    // Small arms
    b(10, by + 9, 2, 4, C.BODY); p(10, by + 9, C.LIGHT);
    b(20, by + 9, 2, 4, C.DK);
    // Thin legs
    b(13 + lOff, by + 14, 3, 5, C.BODY); b(13 + lOff, by + 14, 1, 5, C.LIGHT);
    b(17 + rOff, by + 14, 3, 5, C.BODY); b(19 + rOff, by + 14, 1, 5, C.DK);
    // Feet
    b(12 + lOff, by + 19, 4, 2, C.DK);
    b(16 + rOff, by + 19, 4, 2, C.DK);
    // Floating psychic glow below
    b(14, by + 22, 4, 1, C.DUST); p(15, by + 23, C.FRAG);
  } else {
    drawDeathPsionic(p, b, f - 4, 16, 14);
  }
}

// 1: Thought Bolt (Fast) - streamlined psychic projectile
function drawFast(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -2, 2, 0][f];
    const by = 10 + bob;
    // Pointed projectile shape
    p(22, by + 3, C.WHITE);
    b(20, by + 2, 2, 4, C.BRIGHT);
    b(18, by + 1, 2, 6, C.ENERGY);
    b(14, by, 4, 8, C.BRAIN);
    b(10, by + 1, 4, 6, C.BODY);
    b(8, by + 2, 2, 4, C.BODY);
    // Bright core
    b(15, by + 3, 3, 2, C.ENERGY); p(16, by + 3, C.WHITE);
    p(17, by + 4, C.CORE);
    // Eye
    b(18, by + 3, 2, 2, C.EYE); p(19, by + 3, C.WHITE);
    // Shading
    b(14, by, 4, 1, C.GLOW); b(14, by + 7, 4, 1, C.DKBRAIN);
    b(10, by + 1, 1, 6, C.LIGHT); b(13, by + 6, 5, 1, C.DK);
    // Trailing psychic energy
    const trail = [1, 3, 0, 2][f];
    b(6, by + 3 + trail, 2, 1, C.PULSE); p(5, by + 4, C.ENERGY);
    b(3, by + 3, 2, 1, C.MIND); p(2, by + 4 + trail, C.DUST);
    p(1, by + 3, C.FRAG);
    if (f % 2 === 0) {
      p(4, by + 2, C.PULSE); p(7, by + 5, C.MIND);
    } else {
      p(4, by + 5, C.MIND); p(7, by + 2, C.PULSE);
    }
  } else {
    drawDeathPsionic(p, b, f - 4, 16, 14);
  }
}

// 2: Psi Fortress (Armored) - heavy-headed, thick psychic armor
function drawArmored(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, 0, -1, 0][f];
    const lOff = [0, 0, 1, 0][f];
    const rOff = [0, 0, 0, 1][f];
    const by = 3 + bob;
    // Massive armored head
    b(8, by, 16, 3, C.BRAIN); b(9, by, 14, 1, C.GLOW);
    b(7, by + 3, 18, 5, C.BRAIN);
    b(7, by + 3, 2, 5, C.GLOW); b(23, by + 3, 2, 5, C.DKBRAIN);
    // Brain folds
    p(11, by + 1, C.DKBRAIN); p(14, by + 2, C.DKBRAIN); p(17, by + 1, C.DKBRAIN);
    p(20, by + 2, C.DKBRAIN); p(10, by + 5, C.DKBRAIN); p(21, by + 5, C.DKBRAIN);
    // Psychic armor plates
    b(6, by + 8, 20, 6, C.BODY);
    b(6, by + 8, 2, 6, C.LIGHT); b(24, by + 8, 2, 6, C.DK);
    b(7, by + 14, 18, 4, C.BODY);
    b(7, by + 14, 2, 4, C.LIGHT); b(23, by + 14, 2, 4, C.DK);
    // Armor energy lines
    b(10, by + 8, 12, 1, C.ENERGY); b(11, by + 8, 10, 1, C.PULSE);
    b(10, by + 12, 12, 1, C.DK);
    // Eyes
    b(11, by + 5, 2, 2, C.EYE); p(12, by + 5, C.WHITE);
    b(19, by + 5, 2, 2, C.EYE); p(20, by + 5, C.WHITE);
    // Visor
    b(12, by + 7, 8, 1, C.VOID);
    // Core
    b(14, by + 10, 4, 3, C.ENERGY); b(15, by + 11, 2, 1, C.CORE);
    p(15, by + 10, C.WHITE);
    // Shoulder rivets
    p(8, by + 9, C.ENERGY); p(23, by + 9, C.ENERGY);
    p(8, by + 11, C.ENERGY); p(23, by + 11, C.ENERGY);
    // Stubby legs
    b(10 + lOff, by + 18, 4, 4, C.BODY);
    b(10 + lOff, by + 18, 1, 4, C.LIGHT); b(13 + lOff, by + 18, 1, 4, C.DK);
    b(18 + rOff, by + 18, 4, 4, C.BODY);
    b(21 + rOff, by + 18, 1, 4, C.DK);
    // Feet
    b(9 + lOff, by + 22, 6, 2, C.DK);
    b(17 + rOff, by + 22, 6, 2, C.DK);
  } else {
    drawDeathPsionic(p, b, f - 4, 16, 14);
  }
}

// 3: Synapse Spark (Swarm) - tiny neuron with dendrite trails
function drawSwarm(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const jx = [0, 2, -2, 0][f];
    const jy = [0, 0, 2, -2][f];
    const bx = 12 + jx, by = 11 + jy;
    // Tiny neuron body
    b(bx + 2, by, 4, 2, C.BRAIN);
    b(bx + 1, by + 2, 6, 3, C.BRAIN);
    b(bx + 2, by + 5, 4, 2, C.DKBRAIN);
    // Bright center
    b(bx + 3, by + 2, 2, 2, C.ENERGY); p(bx + 3, by + 2, C.WHITE);
    // Eye
    p(bx + 4, by + 3, C.EYE); p(bx + 4, by + 3, C.WHITE);
    // Dendrite trails
    p(bx - 1, by + 1, C.NEURON); p(bx - 2, by, C.PULSE);
    p(bx + 7, by + 2, C.NEURON); p(bx + 8, by + 1, C.PULSE);
    p(bx + 1, by + 7, C.SYNAPSE); p(bx + 5, by + 7, C.SYNAPSE);
    // Sparkle
    if (f % 2 === 0) p(bx + 6, by - 1, C.ENERGY);
    else p(bx - 1, by + 5, C.BRIGHT);
  } else {
    drawDeathPsionic(p, b, f - 4, 16, 15);
  }
}

// 4: Empathic Link (Healer) - visible psychic tethers
function drawHealer(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -2, 0, 2][f];
    const by = 7 + bob;
    // Hovering brain orb
    b(12, by, 8, 2, C.BRAIN); b(13, by, 6, 1, C.GLOW);
    b(10, by + 2, 12, 6, C.BRAIN);
    b(11, by + 2, 10, 1, C.GLOW);
    b(12, by + 8, 8, 2, C.DKBRAIN);
    // Inner glow
    b(12, by + 3, 8, 4, C.ENERGY);
    b(13, by + 4, 6, 2, C.BRIGHT);
    b(14, by + 4, 4, 2, C.WHITE);
    p(15, by + 5, C.CORE); p(16, by + 5, C.CORE);
    // Highlight / shadow
    b(10, by + 2, 2, 3, C.GLOW);
    b(20, by + 5, 2, 3, C.DKBRAIN);
    // Psychic tether lines radiating out
    const pulse = [0, 1, 0, -1][f];
    for (let i = 0; i < 12; i++) {
      const a = (i + f * 2) * Math.PI / 6;
      const rx = 16 + Math.round(Math.cos(a) * 10);
      const ry = by + 5 + Math.round(Math.sin(a) * 8);
      p(rx, ry, i % 3 === 0 ? C.WHITE : C.NEURON);
    }
    // Cardinal tether points
    p(4, by + 4 + pulse, C.ENERGY); p(27, by + 4 - pulse, C.ENERGY);
    p(16, by - 4 + pulse, C.PULSE); p(16, by + 13 - pulse, C.PULSE);
    // Soft glow below
    b(14, by + 11, 4, 1, C.DUST); b(13, by + 12, 6, 1, C.FRAG);
  } else {
    drawDeathPsionic(p, b, f - 4, 16, 13);
  }
}

// 5: Overmind (Boss) - Giant floating brain, multiple psychic tendrils, pulsing neural pathways, central massive eye, floating debris (telekinesis), golden neural glow
function drawBoss(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, 0, -1, 0][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 1 + bob;
    const pulseShift = [0, 1, 0, -1][f];

    // === FLOATING DEBRIS (telekinesis - rocks hovering around) ===
    const debrisPos = [
      [[1, by + 2], [30, by + 4], [3, by + 18], [28, by + 20]],
      [[2, by + 4], [29, by + 2], [4, by + 20], [27, by + 18]],
      [[3, by + 3], [28, by + 3], [2, by + 19], [29, by + 19]],
      [[1, by + 5], [30, by + 3], [4, by + 17], [28, by + 21]],
    ][f];
    for (const [dx, dy] of debrisPos) {
      b(dx, dy, 2, 2, C.DKTENDRIL); p(dx, dy, C.TENDRIL);
    }

    // === MASSIVE BRAIN DOME (fills upper half) ===
    b(6, by, 20, 3, C.BRAIN); b(7, by, 18, 1, C.GLOW);
    b(4, by + 3, 24, 7, C.BRAIN);
    b(4, by + 3, 3, 7, C.GLOW); b(25, by + 3, 3, 7, C.DKBRAIN);
    b(6, by + 10, 20, 3, C.BRAIN);
    b(6, by + 10, 2, 3, C.GLOW); b(24, by + 10, 2, 3, C.DKBRAIN);

    // Elaborate brain fold detail
    p(8, by + 1, C.DKBRAIN); p(11, by + 2, C.DKBRAIN); p(14, by + 1, C.DKBRAIN);
    p(17, by + 2, C.DKBRAIN); p(20, by + 1, C.DKBRAIN); p(23, by + 2, C.DKBRAIN);
    p(6, by + 4, C.DKBRAIN); p(9, by + 5, C.DKBRAIN); p(12, by + 4, C.DKBRAIN);
    p(15, by + 6, C.DKBRAIN); p(18, by + 5, C.DKBRAIN); p(21, by + 4, C.DKBRAIN);
    p(24, by + 6, C.DKBRAIN); p(7, by + 7, C.DKBRAIN); p(10, by + 8, C.DKBRAIN);
    p(16, by + 8, C.DKBRAIN); p(22, by + 7, C.DKBRAIN);
    p(8, by + 10, C.DKBRAIN); p(14, by + 11, C.DKBRAIN); p(20, by + 10, C.DKBRAIN);

    // === PULSING GOLDEN NEURAL PATHWAYS (visible through brain) ===
    p(9, by + 3, C.NEURAL); p(11, by + 4, C.DKNEURAL); p(13, by + 3, C.NEURAL);
    p(19, by + 3, C.NEURAL); p(21, by + 4, C.DKNEURAL); p(23, by + 3, C.NEURAL);
    p(7, by + 6, C.NEURAL); p(10, by + 7, C.DKNEURAL);
    p(22, by + 6, C.NEURAL); p(25, by + 7, C.DKNEURAL);
    p(12, by + 9, C.NEURAL); p(19, by + 9, C.NEURAL);
    // Pulse animation (shift per frame)
    p(9 + pulseShift, by + 5, C.NEURAL); p(22 - pulseShift, by + 5, C.NEURAL);

    // === PSYCHIC ENERGY CROWN (spikes above brain) ===
    p(8, by - 2, C.ENERGY); b(9, by - 1, 2, 1, C.BRIGHT);
    p(13, by - 3, C.BRIGHT); b(13, by - 2, 2, 2, C.ENERGY);
    p(16, by - 4, C.NEURAL); b(16, by - 3, 2, 2, C.BRIGHT);
    p(19, by - 3, C.BRIGHT); b(19, by - 2, 2, 2, C.ENERGY);
    p(23, by - 2, C.ENERGY); b(22, by - 1, 2, 1, C.BRIGHT);
    p(11, by - 1, C.PULSE); p(15, by - 2, C.PULSE); p(20, by - 1, C.PULSE);

    // === CENTRAL MASSIVE EYE (forehead, dominant) ===
    b(13, by + 3, 6, 5, C.EYE); b(14, by + 3, 4, 2, C.WHITE);
    p(15, by + 3, C.WHITE); p(16, by + 4, C.WHITE);
    p(13, by + 7, C.CORE); p(18, by + 7, C.CORE);
    b(15, by + 5, 2, 2, C.BRIGHT); p(15, by + 5, C.WHITE);

    // === SIDE EYES (smaller) ===
    b(7, by + 6, 3, 3, C.EYE); b(8, by + 6, 1, 1, C.WHITE); p(7, by + 8, C.CORE);
    b(22, by + 6, 3, 3, C.EYE); b(23, by + 6, 1, 1, C.WHITE); p(22, by + 8, C.CORE);

    // === BODY MASS (below brain, transition to tendrils) ===
    b(7, by + 13, 18, 5, C.BODY);
    b(7, by + 13, 2, 5, C.LIGHT); b(23, by + 13, 2, 5, C.DK);
    b(9, by + 13, 14, 1, C.ENERGY);
    // Neural pathways on body
    p(10, by + 14, C.NEURAL); p(13, by + 15, C.DKNEURAL);
    p(18, by + 14, C.NEURAL); p(21, by + 15, C.DKNEURAL);

    // === PSYCHIC CORE (large, bright) ===
    b(13, by + 14, 6, 4, C.ENERGY); b(14, by + 15, 4, 2, C.BRIGHT);
    b(15, by + 15, 2, 2, C.CORE); p(15, by + 14, C.WHITE); p(16, by + 14, C.WHITE);

    // === PSYCHIC TENDRILS (4 arms, extending outward) ===
    // Left upper tendril
    b(2, by + 7, 3, 3, C.TENDRIL); b(2, by + 7, 1, 3, C.GLOW);
    b(0, by + 9, 2, 4, C.TENDRIL); p(0, by + 9, C.ENERGY);
    p(0, by + 12, C.BRIGHT);
    // Left lower tendril
    b(3, by + 11, 3, 3, C.TENDRIL); b(1, by + 13, 2, 4, C.TENDRIL);
    p(1, by + 16, C.ENERGY); p(0, by + 15, C.PULSE);
    // Right upper tendril
    b(27, by + 7, 3, 3, C.DKTENDRIL); b(29, by + 7, 1, 3, C.MIND);
    b(30, by + 9, 2, 4, C.DKTENDRIL); p(31, by + 9, C.PULSE);
    p(31, by + 12, C.ENERGY);
    // Right lower tendril
    b(26, by + 11, 3, 3, C.DKTENDRIL); b(29, by + 13, 2, 4, C.DKTENDRIL);
    p(30, by + 16, C.PULSE); p(31, by + 15, C.ENERGY);

    // === LOWER TENDRILS (legs, spreading) ===
    b(8 + lOff, by + 18, 6, 8, C.BODY);
    b(8 + lOff, by + 18, 2, 8, C.LIGHT); b(13 + lOff, by + 18, 1, 8, C.DK);
    b(18 + rOff, by + 18, 6, 8, C.BODY);
    b(23 + rOff, by + 18, 1, 8, C.DK);
    // Tendril tips (glowing)
    b(6 + lOff, by + 26, 8, 2, C.TENDRIL); p(7 + lOff, by + 27, C.ENERGY);
    p(13 + lOff, by + 27, C.BRIGHT);
    b(17 + rOff, by + 26, 8, 2, C.DKTENDRIL); p(18 + rOff, by + 27, C.PULSE);
    p(24 + rOff, by + 27, C.ENERGY);

    // === AMBIENT PSYCHIC PARTICLES ===
    p(5, by + 3, C.PULSE); p(26, by + 4, C.ENERGY);
    p(3, by + 16, C.MIND); p(28, by + 17, C.MIND);
    p(16, by - 5, C.NEURAL);
  } else {
    drawDeathPsionic(p, b, f - 4, 16, 14);
  }
}

// 6: Hive Link (Group) - connected by psychic web, smaller
function drawGroup(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 8 + bob;
    // Smaller brain head
    b(13, by, 6, 3, C.BRAIN); b(14, by, 4, 1, C.GLOW);
    p(14, by + 1, C.DKBRAIN); p(17, by + 1, C.DKBRAIN);
    // Eyes
    b(14, by + 2, 2, 1, C.EYE); p(14, by + 2, C.WHITE);
    b(17, by + 2, 2, 1, C.EYE); p(17, by + 2, C.WHITE);
    // Compact body
    b(12, by + 3, 8, 5, C.BODY);
    b(12, by + 3, 2, 5, C.LIGHT); b(18, by + 3, 2, 5, C.DK);
    b(13, by + 3, 6, 1, C.ENERGY);
    // Core
    b(15, by + 5, 2, 2, C.ENERGY); p(15, by + 5, C.CORE);
    // Arms
    b(10, by + 4, 2, 3, C.BODY); p(10, by + 4, C.LIGHT);
    b(20, by + 4, 2, 3, C.DK);
    // Psychic web connections (unique to group)
    p(8, by + 2, C.NEURON); p(6, by + 1, C.PULSE); p(4, by, C.MIND);
    p(23, by + 3, C.NEURON); p(25, by + 2, C.PULSE); p(27, by + 1, C.MIND);
    // Legs
    b(13 + lOff, by + 8, 3, 4, C.BODY); b(13 + lOff, by + 8, 1, 4, C.LIGHT);
    b(17 + rOff, by + 8, 3, 4, C.BODY); b(19 + rOff, by + 8, 1, 4, C.DK);
    // Feet
    b(12 + lOff, by + 12, 4, 2, C.DK);
    b(17 + rOff, by + 12, 4, 2, C.DK);
  } else {
    drawDeathPsionic(p, b, f - 4, 16, 15);
  }
}

// 7: Psychic Twin (Splitter) - two brain lobes, splits into minds
function drawSplitter(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, 1][f];
    const wobX = [0, 1, 0, -1][f];
    const by = 5 + bob;
    const bx = wobX;
    // Two brain lobes
    // Left lobe
    b(9 + bx, by, 6, 4, C.BRAIN); b(9 + bx, by, 2, 4, C.GLOW);
    p(10 + bx, by + 1, C.DKBRAIN); p(13 + bx, by + 2, C.DKBRAIN);
    // Right lobe
    b(17 + bx, by, 6, 4, C.BRAIN); b(21 + bx, by + 1, 2, 3, C.DKBRAIN);
    p(18 + bx, by + 1, C.DKBRAIN); p(20 + bx, by + 2, C.DKBRAIN);
    // Connection between lobes
    b(15 + bx, by + 1, 2, 2, C.ENERGY); p(15 + bx, by + 1, C.BRIGHT);
    // Split line crack
    p(16 + bx, by, C.CRACK); p(16 + bx, by + 3, C.CRACK);
    p(16 + bx, by + 6, C.CRACK); p(16 + bx, by + 9, C.CRACK);
    p(16 + bx, by + 12, C.CRACK);
    // Crack glow
    p(15 + bx, by + 5, C.CORE); p(17 + bx, by + 8, C.CORE);
    // Eyes (one per lobe)
    b(11 + bx, by + 2, 2, 1, C.EYE); p(12 + bx, by + 2, C.WHITE);
    b(19 + bx, by + 2, 2, 1, C.EYE); p(20 + bx, by + 2, C.WHITE);
    // Shared body
    b(10 + bx, by + 4, 12, 8, C.BODY);
    b(10 + bx, by + 4, 2, 8, C.LIGHT); b(20 + bx, by + 4, 2, 8, C.DK);
    b(11 + bx, by + 4, 10, 1, C.ENERGY);
    // Core
    b(15 + bx, by + 7, 2, 2, C.CORE); p(15 + bx, by + 7, C.WHITE);
    // Arms
    b(8 + bx, by + 5, 2, 5, C.BODY); p(8 + bx, by + 5, C.LIGHT);
    b(22 + bx, by + 5, 2, 5, C.DK);
    // Legs
    b(11, by + 12, 4, 5, C.BODY); b(11, by + 12, 1, 5, C.LIGHT);
    b(17 + bx, by + 12, 4, 5, C.BODY); b(20 + bx, by + 12, 1, 5, C.DK);
    // Feet
    b(10, by + 17, 5, 2, C.DK);
    b(16 + bx, by + 17, 5, 2, C.DK);
  } else {
    drawDeathPsionic(p, b, f - 4, 16, 14);
  }
}

// 8: Thought Shield (Shielded) - purple telekinetic barrier
function drawShielded(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 5 + bob;
    // Brain head
    b(12, by, 8, 5, C.BRAIN); b(13, by, 6, 2, C.GLOW);
    p(13, by + 1, C.DKBRAIN); p(16, by + 1, C.DKBRAIN);
    b(13, by + 3, 2, 2, C.EYE); p(14, by + 3, C.WHITE);
    b(17, by + 3, 2, 2, C.EYE); p(18, by + 3, C.WHITE);
    // Body
    b(10, by + 5, 12, 8, C.BODY);
    b(10, by + 5, 2, 8, C.LIGHT); b(20, by + 5, 2, 8, C.DK);
    b(11, by + 5, 10, 1, C.ENERGY);
    b(14, by + 7, 4, 3, C.ENERGY); b(15, by + 8, 2, 1, C.CORE);
    p(15, by + 7, C.WHITE);
    // Arms
    b(8, by + 6, 2, 5, C.BODY); p(8, by + 6, C.LIGHT);
    b(22, by + 6, 2, 5, C.DK);
    // Legs
    b(11 + lOff, by + 13, 4, 5, C.BODY);
    b(17 + rOff, by + 13, 4, 5, C.BODY);
    b(10 + lOff, by + 18, 5, 2, C.DK);
    b(17 + rOff, by + 18, 5, 2, C.DK);
    // Telekinetic barrier ring (purple)
    const rot = f * 3;
    for (let i = 0; i < 24; i++) {
      const a = (i + rot) * Math.PI / 12;
      const rx = 16 + Math.round(Math.cos(a) * 12);
      const ry = by + 8 + Math.round(Math.sin(a) * 10);
      if (i % 6 === 0) {
        p(rx, ry, C.WHITE); p(rx + 1, ry, C.BRIGHT); p(rx - 1, ry, C.BRIGHT);
      } else if (i % 3 === 0) {
        p(rx, ry, C.ENERGY); p(rx, ry + 1, C.PULSE);
      } else {
        p(rx, ry, i % 2 === 0 ? C.ENERGY : C.MIND);
      }
    }
    // Cardinal barrier points
    b(3, by + 7, 2, 2, C.MIND); p(3, by + 7, C.ENERGY);
    b(27, by + 7, 2, 2, C.MIND); p(28, by + 8, C.ENERGY);
    b(15, by - 3, 2, 2, C.MIND); p(15, by - 3, C.BRIGHT);
    b(15, by + 20, 2, 2, C.MIND); p(16, by + 21, C.ENERGY);
  } else {
    drawDeathPsionic(p, b, f - 4, 16, 14);
  }
}

// 9: Phase Thinker (Evasive) - blinks in/out, precognition
function drawEvasive(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const fx = [0, 4, -2, 2][f];
    const fy = [0, -2, 2, 0][f];
    const bx = 10 + fx, by = 7 + fy;
    // Brain-crystal shape that blinks
    b(bx + 3, by, 4, 2, C.BRAIN);
    if (f !== 1) b(bx + 1, by + 2, 8, 3, C.BRAIN);
    else { p(bx + 1, by + 2, C.BRAIN); p(bx + 5, by + 2, C.GLOW); p(bx + 8, by + 2, C.BRAIN); }
    if (f !== 2) b(bx, by + 5, 10, 3, C.BODY);
    else { b(bx, by + 5, 3, 3, C.BODY); p(bx + 5, by + 5, C.LIGHT); b(bx + 7, by + 5, 3, 3, C.BODY); }
    if (f !== 3) b(bx + 2, by + 8, 6, 2, C.DKBRAIN);
    else { p(bx + 2, by + 8, C.DKBRAIN); p(bx + 5, by + 8, C.DKBRAIN); }
    b(bx + 3, by + 10, 4, 1, C.DK);
    // Glow highlight / shadow
    b(bx, by + 5, 2, 2, C.LIGHT); b(bx + 8, by + 6, 2, 2, C.DK);
    p(bx + 3, by, C.GLOW);
    // Core eye
    b(bx + 4, by + 4, 2, 2, C.EYE);
    p(bx + 4, by + 4, C.WHITE); p(bx + 5, by + 5, C.CORE);
    // Ghost afterimages
    if (f === 1 || f === 3) {
      b(bx - 4, by + 4, 2, 2, C.DUST); b(bx - 4, by + 6, 2, 2, C.FRAG);
      p(bx - 5, by + 5, C.DUST);
    }
    if (f === 2) {
      b(bx + 12, by + 4, 2, 2, C.DUST); b(bx + 12, by + 6, 2, 2, C.FRAG);
    }
    // Precognition sparkles
    if (f === 0) { p(bx - 2, by + 2, C.PULSE); p(bx + 11, by + 8, C.MIND); }
    if (f === 3) { p(bx + 11, by + 2, C.MIND); p(bx - 2, by + 8, C.PULSE); }
  } else {
    drawDeathPsionic(p, b, f - 4, 16, 13);
  }
}

// 10: Bio-Psychic (Regenerator) - pulsing bioluminescent brain
function drawRegenerator(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, 0, -1, 0][f];
    const by = 5 + bob;
    const bright = f === 0 || f === 2;
    const bodyC = bright ? C.BRAIN : C.BODY;
    const hiC = bright ? C.WHITE : C.GLOW;
    const coreC = bright ? C.WHITE : C.CORE;
    const midC = bright ? C.ENERGY : C.MID;
    // Organic pulsing brain body
    b(14, by, 4, 2, C.GLOW); p(14, by, hiC);
    b(12, by + 2, 8, 3, bodyC);
    b(10, by + 5, 12, 6, bodyC);
    b(11, by + 11, 10, 4, bodyC);
    b(13, by + 15, 6, 2, C.BODY);
    // Gradient shading
    b(10, by + 5, 2, 6, hiC); b(11, by + 6, 1, 4, midC);
    b(20, by + 5, 2, 6, C.DK); b(21, by + 7, 1, 4, C.VOID);
    b(11, by + 11, 2, 4, hiC); b(19, by + 11, 2, 4, C.DK);
    // Brain folds
    p(12, by + 3, C.DKBRAIN); p(15, by + 4, C.DKBRAIN); p(18, by + 3, C.DKBRAIN);
    p(11, by + 7, C.DKBRAIN); p(14, by + 8, C.DKBRAIN); p(19, by + 7, C.DKBRAIN);
    // Organic bumps
    b(9, by + 6, 1, 3, C.ENERGY); p(9, by + 5, hiC);
    b(22, by + 7, 1, 3, C.FRAG);
    // Pulsing core
    b(14, by + 7, 4, 3, coreC); b(13, by + 8, 6, 1, bright ? C.CORE : C.ENERGY);
    p(15, by + 7, C.WHITE); p(16, by + 7, C.WHITE);
    // Eyes
    b(13, by + 3, 2, 2, C.EYE); p(13, by + 3, C.WHITE);
    b(17, by + 3, 2, 2, C.EYE); p(17, by + 3, C.WHITE);
    // Bioluminescent spots
    p(11, by + 7, bright ? C.WHITE : C.ENERGY);
    p(19, by + 7, bright ? C.WHITE : C.ENERGY);
    p(15, by + 12, bright ? C.CORE : C.PULSE);
    p(12, by + 10, bright ? C.BRIGHT : C.MIND);
    p(19, by + 10, bright ? C.BRIGHT : C.MIND);
    // Bottom
    b(13, by + 15, 6, 1, C.DK); b(14, by + 16, 4, 1, C.VOID);
  } else {
    drawDeathPsionic(p, b, f - 4, 16, 11);
  }
}

// 11: Astral Form (Flying) - fully floating projection, no legs
function drawFlying(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const wingY = [0, 2, 4, 2][f];
    const by = 7;
    // Ethereal brain body (horizontal, facing right)
    b(10, by + 4, 12, 5, C.BRAIN);
    b(10, by + 4, 12, 1, C.GLOW); b(10, by + 8, 12, 1, C.DKBRAIN);
    // Brain folds on body
    p(12, by + 5, C.DKBRAIN); p(15, by + 6, C.DKBRAIN); p(18, by + 5, C.DKBRAIN);
    // Tail
    b(8, by + 6, 2, 2, C.BODY); b(6, by + 6, 2, 2, C.DK);
    p(5, by + 6, C.ENERGY); p(5, by + 7, C.PULSE);
    // Head
    b(20, by + 3, 4, 4, C.BRAIN); b(20, by + 3, 4, 1, C.GLOW);
    b(24, by + 4, 3, 2, C.ENERGY); p(26, by + 4, C.BRIGHT); p(26, by + 5, C.PULSE);
    // Eye
    b(22, by + 4, 2, 1, C.EYE); p(22, by + 4, C.WHITE);
    // Core glow
    b(13, by + 5, 3, 2, C.ENERGY); b(14, by + 6, 2, 1, C.CORE);
    p(14, by + 5, C.WHITE);
    // Psychic wings (energy projections)
    b(10, by + 1 + wingY, 8, 2, C.ENERGY);
    b(10, by + 1 + wingY, 8, 1, C.BRIGHT);
    b(8, by + wingY, 4, 1, C.PULSE);
    b(6, by + wingY - 1, 3, 1, C.MIND);
    // Wing details
    p(11, by + 2 + wingY, C.NEURON); p(14, by + 2 + wingY, C.NEURON);
    // Bottom wing
    b(10, by + 10 - wingY, 8, 2, C.MIND);
    b(10, by + 11 - wingY, 8, 1, C.DKTENDRIL);
    b(8, by + 11 - wingY, 4, 1, C.BODY);
    b(6, by + 12 - wingY, 3, 1, C.DK);
    // Shadow below
    b(12, by + 16, 6, 1, C.DK); b(13, by + 17, 4, 1, C.VOID);
    p(14, by + 18, C.VOID); p(15, by + 18, C.VOID);
  } else {
    drawDeathPsionic(p, b, f - 4, 16, 12);
  }
}

// Helper: draw psionic mage base (robed figure with psychic staff)
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
  const bodyC = alpha ? C.DUST : heavy ? C.DKBRAIN : C.BODY;
  const robeC = alpha ? C.FRAG : heavy ? C.BRAIN : C.BODY;
  const hoodC = alpha ? C.DUST : heavy ? C.DKBRAIN : C.DK;
  const robeHi = alpha ? C.FRAG : heavy ? C.GLOW : C.LIGHT;
  const robeMid = alpha ? C.DUST : heavy ? C.BRAIN : C.MID;

  // Hooded head
  b(14, by, 4, 1, C.GLOW);
  b(13, by + 1, 6, 1, hoodC); b(14, by + 1, 4, 1, robeHi);
  b(12, by + 2, 8, 3, hoodC);
  b(12, by + 2, 2, 3, robeHi); b(19, by + 3, 1, 2, C.DK);
  // Hood fold detail
  p(14, by + 2, robeMid); p(17, by + 2, robeMid);
  // Face shadow
  b(13, by + 3, 6, 2, C.VOID); b(14, by + 3, 4, 1, C.DK);
  // Eyes (psychic glow)
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
  // Staff (psychic crystal)
  b(22, by + 1, 2, 16, heavy ? C.GLOW : C.TENDRIL);
  b(22, by + 1, 1, 16, heavy ? C.BRAIN : C.DKTENDRIL);
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

// 12: Mind Cage (Mage Iron) - mental armor, rigid
function drawMageIron(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawMageBase(p, b, f, C.GLOW, C.BRAIN, 'iron');
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    // Heavy mental armor plates
    b(12, by + 7, 8, 2, C.DKBRAIN);
    b(13, by + 7, 6, 1, C.BRAIN);
    // Shoulder plates
    b(10, by + 9, 3, 2, C.BRAIN); b(10, by + 9, 1, 2, C.GLOW);
    b(19, by + 9, 3, 2, C.DKBRAIN);
    // Belt buckle
    b(14, by + 12, 4, 2, C.BRAIN); b(15, by + 12, 2, 1, C.GLOW);
    // Armored hem
    p(10, by + 16, C.BRAIN); p(21, by + 16, C.DKBRAIN);
  } else {
    drawDeathPsionic(p, b, f - 4, 16, 14);
  }
}

// 13: Time Bender (Mage Haste) - time-distortion, purple speed lines
function drawMageHaste(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawMageBase(p, b, f, C.ENERGY, C.BRIGHT, undefined);
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    // Purple speed/time lines
    b(5, by + 5, 3, 1, C.ENERGY); b(3, by + 5, 2, 1, C.BRIGHT);
    b(4, by + 9, 4, 1, C.PULSE); p(2, by + 9, C.ENERGY);
    b(5, by + 13, 3, 1, C.ENERGY); p(3, by + 13, C.BRIGHT);
    b(6, by + 16, 2, 1, C.MIND);
    if (f % 2 === 0) {
      p(2, by + 3, C.BRIGHT); p(1, by + 7, C.ENERGY);
      b(3, by + 11, 2, 1, C.PULSE);
    } else {
      p(3, by + 4, C.ENERGY); p(2, by + 8, C.BRIGHT);
      b(4, by + 12, 2, 1, C.MIND);
    }
    // Motion blur
    p(1, by + 6, C.DUST); p(0, by + 10, C.DUST);
  } else {
    drawDeathPsionic(p, b, f - 4, 16, 14);
  }
}

// 14: Confusion Lord (Mage Mist) - scrambled outline, confusion waves
function drawMageMist(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawMageBase(p, b, f, C.GLOW, C.MIND, 'mist');
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    const mx = [5, 7, 3, 8][f];
    const my = [7, 11, 5, 9][f];
    // Confusion wave particles
    b(mx, by + my, 2, 1, C.PULSE); p(mx + 2, by + my + 1, C.MIND);
    b(mx + 16, by + my - 2, 2, 1, C.GLOW); p(mx + 18, by + my - 1, C.PULSE);
    // Additional confusion wisps
    b(25, by + 3, 2, 1, C.PULSE); p(26, by + 4, C.MIND);
    b(4, by + 15, 3, 1, C.GLOW); p(3, by + 16, C.PULSE);
    if (f === 1 || f === 3) {
      b(3, by + 14, 2, 1, C.MIND); p(2, by + 15, C.PULSE);
      p(27, by + 8, C.GLOW);
    }
    if (f === 0 || f === 2) {
      p(26, by + 6, C.PULSE); p(5, by + 10, C.MIND);
    }
  } else {
    drawDeathPsionic(p, b, f - 4, 16, 14);
  }
}

// 15: Psychic Surgeon (Mage Heal) - precise healing tendrils
function drawMageHeal(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawMageBase(p, b, f, C.NEURON, C.SYNAPSE, undefined);
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    // Staff gem glow (pink healing)
    p(22, by - 3, C.NEURON); p(23, by - 3, C.NEURON);
    b(21, by - 1, 4, 1, C.NEURON); p(21, by - 2, C.SYNAPSE);
    p(24, by - 2, C.SYNAPSE);
    // Healing tendril particles from left hand
    const px_ = [7, 5, 8, 6][f];
    b(px_, by + 5, 2, 1, C.NEURON); p(px_ + 2, by + 4, C.SYNAPSE);
    p(px_ - 1, by + 6, C.NEURON);
    // Cross healing symbol
    b(24, by + 5, 2, 1, C.NEURON);
    b(25, by + 4, 1, 3, C.NEURON);
    p(25, by + 3, C.SYNAPSE); p(25, by + 7, C.SYNAPSE);
    p(23, by + 5, C.SYNAPSE); p(26, by + 5, C.SYNAPSE);
    // Extra heal sparkles
    if (f % 2 === 0) {
      p(6, by + 3, C.NEURON); p(8, by + 8, C.SYNAPSE);
    } else {
      p(7, by + 2, C.SYNAPSE); p(5, by + 7, C.NEURON);
    }
  } else {
    drawDeathPsionic(p, b, f - 4, 16, 14);
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
export default function PsionicCreepSprites() {
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
    pc.fillStyle = '#0e0818';
    pc.fillRect(0, 0, pv.width, pv.height);

    for (let r = 0; r < ROWS; r++) {
      const by = r * (CELL * S + LH) + 5;
      pc.fillStyle = '#ee44ff';
      pc.font = 'bold 9px monospace';
      pc.fillText(ROW_NAMES[r], 3, by + CELL * S / 2 + 3);

      for (let cc = 0; cc < COLS; cc++) {
        const bx = LW + cc * CELL * S;
        pc.save();
        pc.translate(bx, by);
        pc.scale(S, S);
        pc.drawImage(sc, cc * CELL, r * CELL, CELL, CELL, 0, 0, CELL, CELL);
        pc.restore();
        pc.strokeStyle = '#1a0e2a';
        pc.strokeRect(bx, by, CELL * S, CELL * S);
        if (r === 0) {
          pc.fillStyle = '#bb88dd';
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
    <div style={{ background: '#0e0818', minHeight: '100vh', padding: 12, fontFamily: 'monospace' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <h2 style={{ color: C.ENERGY, margin: 0, fontSize: 15 }}>PSIONIC FACTION — Creep Spritesheet</h2>
        {ready && (
          <button
            onClick={download(sheetRef, 'psionic_creeps.png')}
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
              background: view === v ? '#1a0e2a' : '#111',
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
          data-label="Psionic Creeps (Preview)"
          data-frame-size="64x64"
          data-direction="right"
          data-columns='["Mind Drone (Standard)","Thought Bolt (Fast)","Psi Fortress (Armored)","Synapse Spark (Swarm)","Empathic Link (Healer)","Overmind (Boss)","Hive Link (Group)","Psychic Twin (Splitter)","Thought Shield (Shielded)","Phase Thinker (Evasive)","Bio-Psychic (Regen)","Astral Form (Flying)","Mind Cage (Iron)","Time Bender (Haste)","Confusion Lord (Mist)","Psychic Surgeon (Heal)"]'
          data-rows='["Walk 1","Walk 2","Walk 3","Walk 4","Death 1","Death 2","Death 3"]'
          data-presets='[{"name":"Walk","startRow":0,"endRow":3},{"name":"Death","startRow":4,"endRow":6}]'
          style={{ display: view === 'preview' ? 'block' : 'none', maxWidth: '100%' }}
        />
        <canvas
          ref={sheetRef}
          data-label="Psionic Creeps"
          data-frame-size="64x64"
          data-direction="right"
          data-columns='["Mind Drone (Standard)","Thought Bolt (Fast)","Psi Fortress (Armored)","Synapse Spark (Swarm)","Empathic Link (Healer)","Overmind (Boss)","Hive Link (Group)","Psychic Twin (Splitter)","Thought Shield (Shielded)","Phase Thinker (Evasive)","Bio-Psychic (Regen)","Astral Form (Flying)","Mind Cage (Iron)","Time Bender (Haste)","Confusion Lord (Mist)","Psychic Surgeon (Heal)"]'
          data-rows='["Walk 1","Walk 2","Walk 3","Walk 4","Death 1","Death 2","Death 3"]'
          data-presets='[{"name":"Walk","startRow":0,"endRow":3},{"name":"Death","startRow":4,"endRow":6}]'
          style={{
            display: view === 'actual' ? 'block' : 'none',
            imageRendering: 'pixelated',
            width: SHEET_W * 2,
            border: '1px solid #1a0e2a',
          }}
        />
      </div>
      <div style={{ color: '#554488', fontSize: 9, marginTop: 10, maxWidth: 700 }}>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#aa66dd' }}>Sheet:</b> {SHEET_W}x{SHEET_H}px ({COLS} cols x {ROWS} rows) — {CELL}x{CELL} cells
        </p>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#aa66dd' }}>Phaser:</b>{' '}
          <code style={{ color: C.BRIGHT }}>
            {"this.load.spritesheet('psionic_creeps','psionic_creeps.png',{frameWidth:64,frameHeight:64})"}
          </code>
        </p>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#aa66dd' }}>Layout:</b> 16 cols (creep types) x 7 rows (walk0-3, death0-2). Frame index = row * 16 + col.
        </p>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#aa66dd' }}>Types:</b> {CREEP_NAMES.join(', ')}
        </p>
      </div>
    </div>
  );
}
