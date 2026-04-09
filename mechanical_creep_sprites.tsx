import { useRef, useEffect, useState, useCallback } from "react";

// ===== MECHANICAL CREEP PALETTE =====
const C = {
  BRASS: '#8a7a44',     // main body brass
  DK: '#5a4a22',        // dark shadow
  HI: '#bbaa66',        // highlight
  STEEL: '#888888',     // steel
  DKSTEEL: '#555555',   // dark steel
  LTSTEEL: '#aaaaaa',   // light steel
  AMBER: '#ffaa44',     // amber glow
  DKAMBER: '#cc8822',   // dark amber
  COPPER: '#aa6633',    // copper
  RIVET: '#666666',     // rivet color
  SMOKE: '#aaaaaa',     // smoke
  EXHAUST: '#888888',   // exhaust
  PIPE: '#777744',      // pipe color
  GLASS: '#aaccdd',     // glass/lens
  // Extra shading
  MID: '#7a6a34',       // mid-tone brass
  LBRASS: '#9a8a54',    // light brass
  VOID: '#3a2a12',      // deepest shadow
  WHITE: '#ffffff',
  RED: '#ff4444',       // warning/damage
  GREEN: '#66ff66',     // heal/repair
  DKGREEN: '#338833',   // dark green
  SPARK: '#ffdd88',     // spark color
  GEAR: '#777766',      // gear color
  DKGEAR: '#555544',    // dark gear
  ORANGE: '#ff8833',    // speed lines
  WARN: '#ff2222',      // boss warning lights
  DKWARN: '#aa1111',    // dark warning
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
  'Automaton', 'Dash Unit', 'Iron Hulk', 'Scrap Drone', 'Repair Bot', 'War Engine',
  'Assembly Line', 'Cluster Bot', 'Shield Walker', 'Flicker Drone', 'Nano Forge', 'Zeppelin Drone',
  'Plating Mech', 'Overclock Mech', 'Smokescreen Mech', 'Medic Mech'
];
const ROW_NAMES = ['Walk 0', 'Walk 1', 'Walk 2', 'Walk 3', 'Death 0', 'Death 1', 'Death 2'];

// ===== CREEP DRAW FUNCTIONS =====

// 0: Automaton (Standard) - Boxy brass robot, riveted, amber eye
function drawAutomaton(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 5 + bob;
    // Head - boxy
    b(12, by, 8, 5, C.BRASS); b(12, by, 8, 1, C.HI); b(13, by, 6, 1, C.LBRASS);
    b(12, by, 1, 5, C.HI); b(19, by + 1, 1, 4, C.DK);
    // Rivets on head
    p(13, by, C.RIVET); p(18, by, C.RIVET);
    p(12, by + 2, C.RIVET); p(19, by + 2, C.RIVET);
    // Amber eye visor
    b(14, by + 2, 4, 2, C.DKSTEEL); b(15, by + 2, 2, 2, C.AMBER);
    p(15, by + 2, C.WHITE); p(16, by + 3, C.DKAMBER);
    // Neck joint
    b(14, by + 5, 4, 1, C.STEEL); p(14, by + 5, C.LTSTEEL); p(17, by + 5, C.DKSTEEL);
    // Torso - boxy riveted
    b(10, by + 6, 12, 8, C.BRASS);
    b(10, by + 6, 2, 8, C.HI); b(11, by + 6, 1, 6, C.LBRASS);
    b(20, by + 6, 2, 8, C.DK); b(21, by + 8, 1, 4, C.VOID);
    b(11, by + 6, 10, 1, C.HI);
    b(11, by + 13, 10, 1, C.DK);
    // Chest plate
    b(13, by + 8, 6, 4, C.STEEL); b(13, by + 8, 6, 1, C.LTSTEEL);
    b(13, by + 11, 6, 1, C.DKSTEEL);
    // Rivets on torso
    p(11, by + 7, C.RIVET); p(20, by + 7, C.RIVET);
    p(11, by + 11, C.RIVET); p(20, by + 11, C.RIVET);
    p(13, by + 9, C.RIVET); p(18, by + 9, C.RIVET);
    // Amber core in chest
    b(15, by + 9, 2, 2, C.AMBER); p(15, by + 9, C.WHITE);
    p(16, by + 10, C.DKAMBER);
    // Arms - piston-like
    b(8, by + 7, 2, 6, C.BRASS); b(8, by + 7, 1, 6, C.HI);
    b(7, by + 9, 1, 3, C.STEEL); p(7, by + 9, C.LTSTEEL);
    b(22, by + 7, 2, 6, C.DK); b(23, by + 7, 1, 6, C.VOID);
    b(24, by + 9, 1, 3, C.DKSTEEL);
    // Fists
    b(7, by + 13, 2, 2, C.STEEL); p(7, by + 13, C.LTSTEEL);
    b(23, by + 13, 2, 2, C.DKSTEEL);
    // Legs
    b(11 + lOff, by + 14, 4, 6, C.BRASS);
    b(11 + lOff, by + 14, 1, 6, C.HI); b(14 + lOff, by + 14, 1, 6, C.DK);
    b(17 + rOff, by + 14, 4, 6, C.BRASS);
    b(20 + rOff, by + 14, 1, 6, C.DK);
    // Knee joints
    b(11 + lOff, by + 17, 4, 1, C.STEEL); p(12 + lOff, by + 17, C.RIVET);
    b(17 + rOff, by + 17, 4, 1, C.STEEL); p(19 + rOff, by + 17, C.RIVET);
    // Feet
    b(10 + lOff, by + 20, 5, 2, C.DKSTEEL); b(10 + lOff, by + 20, 2, 1, C.STEEL);
    b(17 + rOff, by + 20, 5, 2, C.DKSTEEL); b(21 + rOff, by + 20, 1, 1, C.VOID);
  } else {
    drawDeathMech(p, b, f - 4, 16, 14);
  }
}

// 1: Dash Unit (Fast) - Low-slung wheeled bot, streamlined
function drawDashUnit(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 1, 0][f];
    const by = 12 + bob;
    // Low body - streamlined wedge shape
    b(8, by, 16, 3, C.BRASS); b(8, by, 16, 1, C.HI); b(9, by, 14, 1, C.LBRASS);
    b(8, by + 3, 18, 3, C.BRASS); b(8, by + 3, 1, 3, C.HI); b(25, by + 3, 1, 3, C.DK);
    b(10, by + 6, 14, 2, C.DK);
    // Nose / front wedge
    b(24, by - 1, 3, 3, C.BRASS); b(24, by - 1, 3, 1, C.HI);
    b(26, by - 1, 1, 3, C.DK); p(27, by, C.STEEL);
    // Amber headlight
    b(26, by + 1, 2, 2, C.AMBER); p(27, by + 1, C.WHITE);
    // Cockpit glass
    b(18, by + 1, 5, 2, C.GLASS); b(18, by + 1, 5, 1, C.WHITE);
    p(22, by + 2, C.DKSTEEL);
    // Rivets
    p(10, by + 1, C.RIVET); p(16, by + 1, C.RIVET);
    p(10, by + 4, C.RIVET); p(24, by + 4, C.RIVET);
    // Plate seam
    b(8, by + 3, 18, 1, C.MID);
    // Wheels (spinning)
    const spin = [0, 1, 2, 3][f];
    // Front wheel
    b(21, by + 6, 4, 4, C.DKSTEEL); b(22, by + 7, 2, 2, C.STEEL);
    p(22 + (spin % 2), by + 7 + (spin > 1 ? 1 : 0), C.RIVET);
    // Rear wheel
    b(9, by + 6, 4, 4, C.DKSTEEL); b(10, by + 7, 2, 2, C.STEEL);
    p(10 + ((spin + 1) % 2), by + 7 + ((spin + 1) > 1 ? 1 : 0), C.RIVET);
    // Exhaust trail behind
    const trail = [1, 0, 2, 1][f];
    b(5, by + 2 + trail, 3, 1, C.EXHAUST); p(4, by + 3, C.SMOKE);
    b(2, by + 2, 2, 1, C.SMOKE); p(1, by + 3 + trail, C.SMOKE);
    if (f % 2 === 0) { p(3, by + 1, C.SMOKE); p(0, by + 2, C.EXHAUST); }
    // Speed lines
    b(3, by + 5, 4, 1, C.DKSTEEL); b(1, by + 4, 3, 1, C.RIVET);
  } else {
    drawDeathMech(p, b, f - 4, 16, 14);
  }
}

// 2: Iron Hulk (Armored) - Massive plated walker, thick steel
function drawIronHulk(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, 0, -1, 0][f];
    const lOff = [0, 0, 1, 0][f];
    const rOff = [0, 0, 0, 1][f];
    const by = 3 + bob;
    // Massive head
    b(10, by, 12, 5, C.STEEL); b(10, by, 12, 1, C.LTSTEEL); b(11, by, 10, 1, C.WHITE);
    b(10, by, 1, 5, C.LTSTEEL); b(21, by + 1, 1, 4, C.DKSTEEL);
    // Visor slit
    b(12, by + 2, 8, 2, C.VOID); b(13, by + 2, 6, 1, C.DKSTEEL);
    b(14, by + 2, 2, 1, C.AMBER); p(14, by + 2, C.WHITE);
    b(18, by + 2, 2, 1, C.AMBER); p(18, by + 2, C.WHITE);
    // Rivets on head
    p(11, by + 1, C.RIVET); p(20, by + 1, C.RIVET);
    // Heavy shoulder pauldrons
    b(5, by + 5, 6, 5, C.STEEL); b(5, by + 5, 6, 1, C.LTSTEEL); b(5, by + 5, 1, 5, C.LTSTEEL);
    b(10, by + 6, 1, 4, C.DKSTEEL); b(5, by + 9, 6, 1, C.DKSTEEL);
    p(6, by + 6, C.RIVET); p(9, by + 6, C.RIVET); p(6, by + 8, C.RIVET);
    b(21, by + 5, 6, 5, C.STEEL); b(26, by + 5, 1, 5, C.DKSTEEL);
    b(21, by + 5, 6, 1, C.LTSTEEL); b(21, by + 9, 6, 1, C.DKSTEEL);
    p(22, by + 6, C.RIVET); p(25, by + 6, C.RIVET); p(25, by + 8, C.RIVET);
    // Torso - heavy plates
    b(8, by + 6, 16, 10, C.BRASS);
    b(8, by + 6, 2, 10, C.HI); b(9, by + 6, 1, 8, C.LBRASS);
    b(22, by + 6, 2, 10, C.DK); b(23, by + 8, 1, 6, C.VOID);
    b(9, by + 6, 14, 1, C.HI);
    b(9, by + 15, 14, 1, C.DK);
    // Chest plate (steel overlay)
    b(11, by + 8, 10, 5, C.STEEL); b(11, by + 8, 10, 1, C.LTSTEEL);
    b(11, by + 12, 10, 1, C.DKSTEEL);
    b(11, by + 8, 1, 5, C.LTSTEEL); b(20, by + 9, 1, 4, C.DKSTEEL);
    // Rivets on chest
    p(12, by + 9, C.RIVET); p(19, by + 9, C.RIVET);
    p(12, by + 11, C.RIVET); p(19, by + 11, C.RIVET);
    // Amber power cell
    b(15, by + 10, 2, 2, C.AMBER); p(15, by + 10, C.WHITE); p(16, by + 11, C.DKAMBER);
    // Stubby legs (thick)
    b(9 + lOff, by + 16, 5, 6, C.STEEL);
    b(9 + lOff, by + 16, 1, 6, C.LTSTEEL); b(13 + lOff, by + 16, 1, 6, C.DKSTEEL);
    p(11 + lOff, by + 18, C.RIVET);
    b(18 + rOff, by + 16, 5, 6, C.STEEL);
    b(22 + rOff, by + 16, 1, 6, C.DKSTEEL);
    p(20 + rOff, by + 18, C.RIVET);
    // Feet
    b(8 + lOff, by + 22, 7, 2, C.DKSTEEL); b(8 + lOff, by + 22, 3, 1, C.STEEL);
    b(17 + rOff, by + 22, 7, 2, C.DKSTEEL); b(22 + rOff, by + 22, 2, 1, C.VOID);
  } else {
    drawDeathMech(p, b, f - 4, 16, 14);
  }
}

// 3: Scrap Drone (Swarm) - Tiny hovering metal ball, propeller
function drawScrapDrone(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const jx = [0, 1, -1, 0][f];
    const jy = [0, -1, 1, -1][f];
    const bx = 12 + jx, by = 10 + jy;
    // Propeller on top (spinning)
    const spin = f;
    if (spin === 0 || spin === 2) {
      b(bx + 1, by - 1, 6, 1, C.STEEL); p(bx, by - 1, C.LTSTEEL); p(bx + 7, by - 1, C.DKSTEEL);
    } else {
      b(bx + 3, by - 2, 2, 3, C.STEEL); p(bx + 3, by - 2, C.LTSTEEL);
    }
    // Propeller hub
    p(bx + 3, by, C.RIVET); p(bx + 4, by, C.RIVET);
    // Metal ball body
    b(bx + 1, by + 1, 6, 1, C.LTSTEEL);
    b(bx, by + 2, 8, 4, C.BRASS);
    b(bx + 1, by + 6, 6, 1, C.DK);
    b(bx + 2, by + 7, 4, 1, C.VOID);
    // Shading
    b(bx, by + 2, 2, 2, C.HI); b(bx + 1, by + 2, 1, 1, C.LBRASS);
    b(bx + 6, by + 4, 2, 2, C.DK); p(bx + 7, by + 5, C.VOID);
    // Eye
    b(bx + 4, by + 3, 2, 2, C.AMBER); p(bx + 4, by + 3, C.WHITE);
    // Rivets
    p(bx + 2, by + 2, C.RIVET); p(bx + 5, by + 5, C.RIVET);
    // Hover glow below
    p(bx + 3, by + 8, C.DKAMBER); p(bx + 4, by + 8, C.DKAMBER);
    if (f % 2 === 0) p(bx + 2, by + 9, C.DKAMBER);
  } else {
    drawDeathMech(p, b, f - 4, 16, 15);
  }
}

// 4: Repair Bot (Healer) - Welding arm robot, spark effects
function drawRepairBot(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const lOff = [0, 1, 0, -1][f];
    const by = 5 + bob;
    // Antenna dish on head
    b(13, by - 2, 6, 1, C.STEEL); b(14, by - 3, 4, 1, C.LTSTEEL);
    p(16, by - 4, C.LTSTEEL); p(15, by - 1, C.RIVET);
    // Head
    b(12, by, 8, 4, C.BRASS); b(12, by, 8, 1, C.HI);
    b(12, by, 1, 4, C.HI); b(19, by + 1, 1, 3, C.DK);
    // Eyes
    b(14, by + 1, 2, 2, C.GLASS); p(14, by + 1, C.WHITE);
    b(17, by + 1, 2, 2, C.GLASS); p(17, by + 1, C.WHITE);
    p(13, by + 1, C.RIVET); p(19, by + 1, C.RIVET);
    // Neck
    b(14, by + 4, 4, 1, C.STEEL);
    // Torso
    b(10, by + 5, 12, 7, C.BRASS);
    b(10, by + 5, 2, 7, C.HI); b(20, by + 5, 2, 7, C.DK);
    b(11, by + 5, 10, 1, C.HI); b(11, by + 11, 10, 1, C.DK);
    // Tool belt
    b(11, by + 9, 10, 2, C.STEEL); b(11, by + 9, 10, 1, C.LTSTEEL);
    p(13, by + 9, C.RIVET); p(18, by + 9, C.RIVET);
    // Green cross on chest
    b(15, by + 6, 2, 3, C.GREEN); b(14, by + 7, 4, 1, C.GREEN);
    p(15, by + 6, C.WHITE);
    // Welding arm (right, extended)
    b(22, by + 6, 3, 2, C.STEEL); b(22, by + 6, 3, 1, C.LTSTEEL);
    b(25, by + 6, 2, 2, C.COPPER); p(26, by + 6, C.DKAMBER);
    // Sparks from welding arm
    const sx = [27, 28, 26, 27][f];
    const sy = [by + 5, by + 4, by + 6, by + 4][f];
    p(sx, sy, C.SPARK); p(sx + 1, sy - 1, C.AMBER); p(sx - 1, sy + 1, C.DKAMBER);
    if (f % 2 === 0) { p(sx + 2, sy, C.SPARK); p(sx, sy - 2, C.AMBER); }
    // Left arm
    b(8, by + 6, 2, 5, C.BRASS); p(8, by + 6, C.HI);
    // Legs
    b(11 + lOff, by + 12, 4, 5, C.BRASS);
    b(11 + lOff, by + 12, 1, 5, C.HI); b(14 + lOff, by + 12, 1, 5, C.DK);
    b(17, by + 12, 4, 5, C.BRASS);
    b(20, by + 12, 1, 5, C.DK);
    // Knee joints
    p(12 + lOff, by + 14, C.RIVET); p(19, by + 14, C.RIVET);
    // Feet
    b(10 + lOff, by + 17, 5, 2, C.DKSTEEL);
    b(16, by + 17, 5, 2, C.DKSTEEL);
  } else {
    drawDeathMech(p, b, f - 4, 16, 13);
  }
}

// 5: War Engine (Boss) - Huge tank-treaded war machine, dual smokestacks, rotating turret, multiple weapons, riveted armor, warning lights
function drawWarEngine(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, 0, -1, 0][f];
    const by = 1 + bob;
    const smokeOff = [0, 2, 1, 3][f];
    const treadOff = f;
    const warnBlink = f % 2 === 0;

    // === DUAL SMOKESTACKS (tall, back) ===
    b(3, by + 1, 3, 9, C.PIPE); b(3, by + 1, 1, 9, C.HI); b(5, by + 3, 1, 7, C.DK);
    b(7, by, 3, 10, C.PIPE); b(7, by, 1, 10, C.HI); b(9, by + 2, 1, 8, C.DK);
    // Stack caps
    b(3, by + 1, 3, 1, C.STEEL); b(7, by, 3, 1, C.STEEL);
    // Smoke puffs (animated, billowing)
    b(2, by - 2 - smokeOff, 4, 2, C.SMOKE); p(3, by - 3 - smokeOff, C.EXHAUST);
    b(1, by - 4 - smokeOff, 3, 1, C.EXHAUST); p(2, by - 5 - smokeOff, C.SMOKE);
    b(6, by - 3 - smokeOff, 5, 2, C.SMOKE); p(8, by - 4 - smokeOff, C.EXHAUST);
    b(5, by - 5 - smokeOff, 4, 1, C.EXHAUST); p(7, by - 6 - smokeOff, C.SMOKE);
    if (warnBlink) { p(0, by - 3 - smokeOff, C.EXHAUST); p(11, by - 5 - smokeOff, C.SMOKE); }

    // === MAIN HULL (massive, fills width) ===
    b(4, by + 8, 26, 9, C.BRASS);
    b(4, by + 8, 3, 9, C.HI); b(5, by + 8, 2, 7, C.LBRASS);
    b(27, by + 8, 3, 9, C.DK); b(28, by + 10, 2, 5, C.VOID);
    b(6, by + 8, 22, 2, C.HI); b(7, by + 8, 20, 1, C.LBRASS);
    b(6, by + 16, 22, 1, C.DK);

    // === ROTATING TURRET (upper) ===
    b(10, by + 3, 16, 5, C.STEEL); b(10, by + 3, 16, 1, C.LTSTEEL);
    b(10, by + 3, 2, 5, C.LTSTEEL); b(24, by + 4, 2, 4, C.DKSTEEL);
    b(10, by + 7, 16, 1, C.DKSTEEL);
    // Turret viewing slit (eyes)
    b(14, by + 4, 8, 2, C.VOID); b(15, by + 4, 6, 1, C.DKSTEEL);
    b(16, by + 4, 2, 2, C.AMBER); p(16, by + 4, C.WHITE); p(17, by + 5, C.DKAMBER);
    b(20, by + 4, 2, 2, C.AMBER); p(20, by + 4, C.WHITE);
    // Main gun barrel (long)
    b(26, by + 4, 6, 3, C.DKSTEEL); b(26, by + 4, 6, 1, C.STEEL);
    p(31, by + 4, C.VOID); p(31, by + 5, C.VOID); p(31, by + 6, C.VOID);
    // Barrel muzzle detail
    b(30, by + 4, 1, 3, C.RIVET);
    // Secondary barrel
    b(26, by + 6, 4, 1, C.STEEL); p(29, by + 6, C.VOID);

    // === SIDE WEAPON PODS ===
    b(28, by + 9, 4, 2, C.STEEL); b(31, by + 9, 1, 2, C.VOID);
    p(28, by + 9, C.LTSTEEL);
    b(28, by + 12, 4, 2, C.STEEL); b(31, by + 12, 1, 2, C.VOID);
    p(28, by + 12, C.LTSTEEL);
    // Left side weapon pod
    b(0, by + 10, 3, 2, C.STEEL); b(0, by + 10, 1, 2, C.LTSTEEL);
    p(0, by + 10, C.DKSTEEL);

    // === ARMOR PLATES (riveted, damage marks) ===
    b(9, by + 10, 16, 5, C.STEEL); b(9, by + 10, 16, 1, C.LTSTEEL);
    b(9, by + 14, 16, 1, C.DKSTEEL);
    // Damage marks (scratches)
    p(12, by + 12, C.DKSTEEL); p(13, by + 11, C.DKSTEEL);
    p(20, by + 13, C.DKSTEEL); p(21, by + 12, C.DKSTEEL);

    // Rivets grid across hull
    for (let rx = 0; rx < 4; rx++) {
      p(7 + rx * 5, by + 9, C.RIVET); p(7 + rx * 5, by + 15, C.RIVET);
    }
    p(11, by + 12, C.RIVET); p(23, by + 12, C.RIVET);
    p(14, by + 11, C.RIVET); p(20, by + 11, C.RIVET);

    // === AMBER POWER CORE (glowing) ===
    b(15, by + 11, 4, 3, C.AMBER); b(16, by + 12, 2, 1, C.WHITE);
    p(16, by + 11, C.WHITE); p(17, by + 13, C.DKAMBER);
    p(15, by + 11, C.SPARK);

    // === RED WARNING LIGHTS (blinking) ===
    p(10, by + 3, warnBlink ? C.WARN : C.DKWARN);
    p(25, by + 3, warnBlink ? C.WARN : C.DKWARN);
    p(5, by + 9, warnBlink ? C.WARN : C.DKWARN);
    p(27, by + 15, warnBlink ? C.WARN : C.DKWARN);

    // === TREADS (wide, heavy, rolling) ===
    b(2, by + 17, 28, 5, C.DKSTEEL);
    b(3, by + 17, 26, 1, C.STEEL);
    b(3, by + 21, 26, 1, C.VOID);
    // Tread segments (rolling animation)
    for (let i = 0; i < 12; i++) {
      const tx = 3 + ((i * 2 + treadOff) % 26);
      if (tx < 29) { p(tx, by + 18, C.RIVET); p(tx, by + 19, C.STEEL); p(tx, by + 20, C.RIVET); }
    }
    // Front tread guard (reinforced)
    b(28, by + 17, 3, 5, C.STEEL); b(30, by + 17, 1, 5, C.DKSTEEL);
    p(29, by + 17, C.LTSTEEL);
    // Rear tread guard
    b(1, by + 17, 2, 5, C.STEEL); b(1, by + 17, 1, 5, C.LTSTEEL);

    // === FRONT PLOW / RAM ===
    b(29, by + 14, 3, 3, C.STEEL); b(31, by + 14, 1, 3, C.DKSTEEL);
    p(29, by + 14, C.LTSTEEL);

    // === EXHAUST SPARKS (animated) ===
    const sparkX = [4, 3, 5, 2][f];
    p(sparkX, by + 17, C.SPARK); p(sparkX + 1, by + 18, C.DKAMBER);
  } else {
    drawDeathMech(p, b, f - 4, 16, 14);
  }
}

// 6: Assembly Line (Group) - Smaller automaton, marching
function drawAssemblyLine(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 9 + bob;
    // Smaller head
    b(13, by, 6, 4, C.BRASS); b(13, by, 6, 1, C.HI); p(13, by, C.LBRASS);
    b(18, by + 1, 1, 3, C.DK);
    // Eye
    b(15, by + 1, 2, 2, C.AMBER); p(15, by + 1, C.WHITE);
    // Rivets
    p(14, by, C.RIVET); p(17, by, C.RIVET);
    // Torso (compact)
    b(11, by + 4, 10, 6, C.BRASS);
    b(11, by + 4, 2, 6, C.HI); b(19, by + 4, 2, 6, C.DK);
    b(12, by + 4, 8, 1, C.HI);
    // Chest plate
    b(14, by + 5, 4, 3, C.STEEL); b(14, by + 5, 4, 1, C.LTSTEEL);
    p(15, by + 6, C.AMBER); p(16, by + 6, C.DKAMBER);
    // Rivets
    p(12, by + 5, C.RIVET); p(19, by + 5, C.RIVET);
    // Arms
    b(9, by + 5, 2, 4, C.BRASS); p(9, by + 5, C.HI);
    b(21, by + 5, 2, 4, C.DK);
    // Legs
    b(12 + lOff, by + 10, 3, 4, C.BRASS); b(12 + lOff, by + 10, 1, 4, C.HI);
    b(17 + rOff, by + 10, 3, 4, C.BRASS); b(19 + rOff, by + 10, 1, 4, C.DK);
    // Feet
    b(11 + lOff, by + 14, 4, 2, C.DKSTEEL);
    b(17 + rOff, by + 14, 4, 2, C.DKSTEEL);
  } else {
    drawDeathMech(p, b, f - 4, 16, 15);
  }
}

// 7: Cluster Bot (Splitter) - Two small bots welded together
function drawClusterBot(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, 1][f];
    const wobX = [0, 1, 0, -1][f];
    const by = 7 + bob;
    // Left bot body
    b(6 + wobX, by, 6, 5, C.BRASS); b(6 + wobX, by, 6, 1, C.HI);
    b(6 + wobX, by, 1, 5, C.HI); b(11 + wobX, by + 1, 1, 4, C.DK);
    // Left bot eye
    b(8 + wobX, by + 1, 2, 2, C.AMBER); p(8 + wobX, by + 1, C.WHITE);
    p(7 + wobX, by, C.RIVET); p(10 + wobX, by, C.RIVET);
    // Left bot legs
    b(7 + wobX, by + 5, 2, 4, C.BRASS); b(7 + wobX, by + 5, 1, 4, C.HI);
    b(10 + wobX, by + 5, 2, 4, C.DK);
    b(6 + wobX, by + 9, 3, 1, C.DKSTEEL); b(10 + wobX, by + 9, 3, 1, C.DKSTEEL);
    // Right bot body
    b(18 - wobX, by, 6, 5, C.BRASS); b(18 - wobX, by, 6, 1, C.HI);
    b(23 - wobX, by + 1, 1, 4, C.DK);
    // Right bot eye
    b(20 - wobX, by + 1, 2, 2, C.AMBER); p(20 - wobX, by + 1, C.WHITE);
    p(19 - wobX, by, C.RIVET); p(22 - wobX, by, C.RIVET);
    // Right bot legs
    b(19 - wobX, by + 5, 2, 4, C.BRASS); b(19 - wobX, by + 5, 1, 4, C.HI);
    b(22 - wobX, by + 5, 2, 4, C.DK);
    b(18 - wobX, by + 9, 3, 1, C.DKSTEEL); b(22 - wobX, by + 9, 3, 1, C.DKSTEEL);
    // Welded joint between them (visible seam)
    b(12, by + 1, 6, 3, C.COPPER); b(12, by + 1, 6, 1, C.DKAMBER);
    b(13, by + 2, 4, 1, C.STEEL); p(14, by + 2, C.RIVET); p(17, by + 2, C.RIVET);
    // Weld sparks at joint
    p(15, by, C.SPARK); p(16, by + 4, C.SPARK);
    if (f % 2 === 0) p(14, by + 4, C.AMBER);
  } else {
    drawDeathMech(p, b, f - 4, 16, 12);
  }
}

// 8: Shield Walker (Shielded) - Automaton with energy barrier
function drawShieldWalker(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const lOff = [0, 1, 0, -1][f];
    const rOff = [0, -1, 0, 1][f];
    const by = 5 + bob;
    // Standard automaton body
    b(12, by, 8, 5, C.BRASS); b(12, by, 8, 1, C.HI);
    b(12, by, 1, 5, C.HI); b(19, by + 1, 1, 4, C.DK);
    b(14, by + 2, 4, 2, C.DKSTEEL); b(15, by + 2, 2, 2, C.AMBER); p(15, by + 2, C.WHITE);
    p(13, by, C.RIVET); p(18, by, C.RIVET);
    b(14, by + 5, 4, 1, C.STEEL);
    b(10, by + 6, 12, 8, C.BRASS);
    b(10, by + 6, 2, 8, C.HI); b(20, by + 6, 2, 8, C.DK);
    b(11, by + 6, 10, 1, C.HI);
    b(15, by + 9, 2, 2, C.AMBER); p(15, by + 9, C.WHITE);
    p(11, by + 7, C.RIVET); p(20, by + 7, C.RIVET);
    // Arms
    b(8, by + 7, 2, 5, C.BRASS); p(8, by + 7, C.HI);
    b(22, by + 7, 2, 5, C.DK);
    // Legs
    b(11 + lOff, by + 14, 4, 5, C.BRASS);
    b(17 + rOff, by + 14, 4, 5, C.BRASS);
    b(10 + lOff, by + 19, 5, 2, C.DKSTEEL);
    b(17 + rOff, by + 19, 5, 2, C.DKSTEEL);
    // Energy barrier panel (front-right, glowing)
    const shieldPhase = f;
    const sx = 24;
    b(sx, by + 2, 3, 16, C.GLASS);
    b(sx, by + 2, 1, 16, C.WHITE);
    b(sx + 2, by + 4, 1, 12, C.DKSTEEL);
    // Shield glow varies
    for (let i = 0; i < 8; i++) {
      const sy = by + 3 + i * 2;
      const bright = (i + shieldPhase) % 3 === 0;
      p(sx + 1, sy, bright ? C.WHITE : C.GLASS);
    }
    // Shield edge particles
    p(sx + 3, by + 4, C.GLASS); p(sx + 3, by + 10, C.GLASS);
    p(sx + 3, by + 16, C.GLASS);
    if (f % 2 === 0) { p(sx + 4, by + 7, C.WHITE); p(sx + 4, by + 13, C.WHITE); }
  } else {
    drawDeathMech(p, b, f - 4, 16, 14);
  }
}

// 9: Flicker Drone (Evasive) - Quick hovering bot, jittery
function drawFlickerDrone(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const fx = [0, 3, -3, 2][f];
    const fy = [0, -2, 2, -1][f];
    const bx = 11 + fx, by = 9 + fy;
    // Small angular body
    b(bx + 2, by, 6, 1, C.LTSTEEL);
    b(bx + 1, by + 1, 8, 2, C.BRASS); b(bx + 1, by + 1, 2, 1, C.HI);
    b(bx, by + 3, 10, 3, C.BRASS);
    b(bx, by + 3, 1, 3, C.HI); b(bx + 9, by + 3, 1, 3, C.DK);
    b(bx + 1, by + 6, 8, 2, C.DK);
    b(bx + 2, by + 8, 6, 1, C.VOID);
    // Eye
    b(bx + 5, by + 3, 3, 2, C.AMBER); p(bx + 5, by + 3, C.WHITE); p(bx + 7, by + 4, C.DKAMBER);
    // Rivets
    p(bx + 2, by + 2, C.RIVET); p(bx + 7, by + 2, C.RIVET);
    // Hover jets (small)
    p(bx + 3, by + 8, C.AMBER); p(bx + 6, by + 8, C.AMBER);
    if (f % 2 === 0) { p(bx + 3, by + 9, C.DKAMBER); p(bx + 6, by + 9, C.DKAMBER); }
    // Afterimage / ghost trail
    if (f === 1 || f === 3) {
      b(bx - 4, by + 3, 3, 2, C.EXHAUST); p(bx - 5, by + 4, C.SMOKE);
    }
    if (f === 2) {
      b(bx + 11, by + 3, 3, 2, C.EXHAUST); p(bx + 13, by + 4, C.SMOKE);
    }
    // Jitter particles
    if (f === 0) { p(bx - 2, by + 1, C.SPARK); p(bx + 11, by + 5, C.SPARK); }
    if (f === 3) { p(bx + 11, by + 1, C.SPARK); p(bx - 2, by + 5, C.SPARK); }
  } else {
    drawDeathMech(p, b, f - 4, 16, 13);
  }
}

// 10: Nano Forge (Regen) - Bot with self-repair sparkles
function drawNanoForge(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const bob = [0, -1, 0, -1][f];
    const by = 5 + bob;
    const pulse = f === 0 || f === 2;
    const bodyC = pulse ? C.LBRASS : C.BRASS;
    const hiC = pulse ? C.WHITE : C.HI;
    // Head
    b(12, by, 8, 5, bodyC); b(12, by, 8, 1, hiC);
    b(12, by, 1, 5, hiC); b(19, by + 1, 1, 4, C.DK);
    // Eyes
    b(14, by + 2, 2, 2, C.AMBER); p(14, by + 2, C.WHITE);
    b(17, by + 2, 2, 2, C.AMBER); p(17, by + 2, C.WHITE);
    p(13, by, C.RIVET); p(18, by, C.RIVET);
    // Neck
    b(14, by + 5, 4, 1, C.STEEL);
    // Torso
    b(10, by + 6, 12, 8, bodyC);
    b(10, by + 6, 2, 8, hiC); b(20, by + 6, 2, 8, C.DK);
    b(11, by + 6, 10, 1, hiC);
    // Nano core (glowing, pulsing)
    b(14, by + 8, 4, 3, pulse ? C.AMBER : C.DKAMBER);
    b(15, by + 9, 2, 1, pulse ? C.WHITE : C.AMBER);
    p(15, by + 8, C.WHITE);
    // Repair sparkles floating around body
    const sparkPositions = [
      [9, by + 4], [22, by + 4], [7, by + 10], [24, by + 10],
      [12, by - 1], [19, by - 1], [8, by + 14], [23, by + 14]
    ];
    for (let i = 0; i < sparkPositions.length; i++) {
      const visible = ((i + f) % 3) !== 0;
      if (visible) {
        const [sx, sy] = sparkPositions[i];
        p(sx, sy, pulse ? C.SPARK : C.AMBER);
        if ((i + f) % 2 === 0) p(sx + 1, sy, C.DKAMBER);
      }
    }
    // Arms
    b(8, by + 7, 2, 5, bodyC); p(8, by + 7, hiC);
    b(22, by + 7, 2, 5, C.DK);
    // Legs
    b(11, by + 14, 4, 5, bodyC); b(11, by + 14, 1, 5, hiC);
    b(17, by + 14, 4, 5, bodyC); b(20, by + 14, 1, 5, C.DK);
    // Feet
    b(10, by + 19, 5, 2, C.DKSTEEL);
    b(17, by + 19, 5, 2, C.DKSTEEL);
    // Rivets
    p(11, by + 7, C.RIVET); p(20, by + 7, C.RIVET);
  } else {
    drawDeathMech(p, b, f - 4, 16, 11);
  }
}

// 11: Zeppelin Drone (Flying) - Small blimp with propellers
function drawZeppelinDrone(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    const wingY = [0, 1, 2, 1][f];
    const by = 5;
    // Balloon envelope (large oval)
    b(8, by, 16, 2, C.HI); b(9, by, 14, 1, C.LBRASS);
    b(6, by + 2, 20, 6, C.BRASS);
    b(6, by + 2, 2, 3, C.HI); b(7, by + 2, 1, 2, C.LBRASS);
    b(24, by + 4, 2, 4, C.DK); b(25, by + 5, 1, 3, C.VOID);
    b(8, by + 8, 16, 2, C.DK); b(10, by + 9, 12, 1, C.VOID);
    // Panel seams on balloon
    b(16, by + 1, 1, 9, C.MID); b(12, by + 2, 1, 7, C.MID);
    b(20, by + 2, 1, 7, C.MID);
    // Rivets on seams
    p(16, by + 3, C.RIVET); p(12, by + 4, C.RIVET); p(20, by + 4, C.RIVET);
    p(16, by + 7, C.RIVET);
    // Gondola below (small box)
    b(12, by + 11, 8, 4, C.STEEL); b(12, by + 11, 8, 1, C.LTSTEEL);
    b(12, by + 14, 8, 1, C.DKSTEEL);
    b(12, by + 11, 1, 4, C.LTSTEEL); b(19, by + 12, 1, 3, C.DKSTEEL);
    // Gondola window
    b(14, by + 12, 2, 2, C.GLASS); p(14, by + 12, C.WHITE);
    // Cables connecting balloon to gondola
    p(13, by + 10, C.DKSTEEL); p(18, by + 10, C.DKSTEEL);
    // Propellers (on sides, spinning)
    const spin = f;
    // Left propeller
    if (spin === 0 || spin === 2) {
      b(4, by + 5 + wingY, 2, 1, C.STEEL); b(8, by + 5 + wingY, 2, 1, C.STEEL);
      p(6, by + 5 + wingY, C.RIVET); p(7, by + 5 + wingY, C.RIVET);
    } else {
      b(6, by + 3 + wingY, 1, 2, C.STEEL); b(6, by + 7 + wingY, 1, 2, C.STEEL);
      p(6, by + 5 + wingY, C.RIVET);
    }
    // Right propeller
    if (spin === 1 || spin === 3) {
      b(22, by + 5 + wingY, 2, 1, C.STEEL); b(26, by + 5 + wingY, 2, 1, C.STEEL);
      p(24, by + 5 + wingY, C.RIVET); p(25, by + 5 + wingY, C.RIVET);
    } else {
      b(24, by + 3 + wingY, 1, 2, C.STEEL); b(24, by + 7 + wingY, 1, 2, C.STEEL);
      p(24, by + 5 + wingY, C.RIVET);
    }
    // Rear fin
    b(5, by + 4, 2, 4, C.BRASS); b(5, by + 4, 1, 2, C.HI); b(6, by + 6, 1, 2, C.DK);
    // Amber lights on gondola
    p(13, by + 13, C.AMBER); p(18, by + 13, C.AMBER);
    // Shadow below
    b(12, by + 18, 6, 1, C.DKSTEEL); b(13, by + 19, 4, 1, C.VOID);
  } else {
    drawDeathMech(p, b, f - 4, 16, 12);
  }
}

// Helper: draw mech mage base (robed/armored bot with staff)
function drawMechMageBase(
  p: (x: number, y: number, cl: string) => void,
  b: (x: number, y: number, w: number, h: number, cl: string) => void,
  f: number, accentC: string, staffC: string, bodyMod?: string
) {
  const bob = [0, -1, 0, -1][f];
  const lOff = [0, 1, 0, -1][f];
  const rOff = [0, -1, 0, 1][f];
  const by = 4 + bob;
  const heavy = bodyMod === 'plating';
  const speed = bodyMod === 'overclock';
  const steam = bodyMod === 'smoke';
  const bodyC = heavy ? C.STEEL : steam ? C.EXHAUST : C.BRASS;
  const hiC = heavy ? C.LTSTEEL : steam ? C.SMOKE : C.HI;
  const midC = heavy ? C.RIVET : steam ? C.DKSTEEL : C.MID;
  const dkC = heavy ? C.DKSTEEL : steam ? C.DKSTEEL : C.DK;

  // Head (boxy, mechanical)
  b(13, by, 6, 4, bodyC); b(13, by, 6, 1, hiC);
  b(13, by, 1, 4, hiC); b(18, by + 1, 1, 3, dkC);
  // Visor
  b(14, by + 1, 4, 2, C.VOID); b(15, by + 1, 2, 1, C.DKSTEEL);
  // Eyes
  b(14, by + 2, 2, 1, accentC); p(14, by + 2, C.WHITE);
  b(17, by + 2, 1, 1, accentC);
  // Antenna
  p(16, by - 1, C.STEEL); p(16, by - 2, accentC);
  // Rivets on head
  p(14, by, C.RIVET); p(17, by, C.RIVET);
  // Torso (armored body)
  b(12, by + 4, 8, 5, bodyC);
  b(12, by + 4, 1, 5, hiC); b(19, by + 5, 1, 4, dkC);
  b(13, by + 4, 6, 1, hiC);
  // Waist
  b(10, by + 9, 12, 4, bodyC);
  b(10, by + 9, 2, 4, hiC); b(11, by + 9, 1, 3, midC);
  b(20, by + 9, 2, 4, dkC); b(21, by + 10, 1, 3, C.VOID);
  // Lower body / legs section
  b(9, by + 13, 14, 4, bodyC);
  b(9, by + 13, 2, 4, hiC);
  b(21, by + 13, 2, 4, dkC);
  // Feet/base
  b(8, by + 17, 16, 2, dkC);
  b(8, by + 17, 2, 2, midC);
  b(22, by + 17, 2, 2, C.VOID);
  b(8, by + 19, 16, 1, C.VOID);
  // Rivets on body
  p(11, by + 6, C.RIVET); p(20, by + 6, C.RIVET);
  p(11, by + 10, C.RIVET); p(20, by + 10, C.RIVET);
  p(10, by + 14, C.RIVET); p(21, by + 14, C.RIVET);
  // Plate seam lines
  p(14, by + 9, midC); p(15, by + 10, midC);
  p(16, by + 11, midC); p(16, by + 12, midC);
  // Staff in right hand
  b(22, by + 1, 2, 16, C.PIPE);
  b(22, by + 1, 1, 16, speed ? C.COPPER : C.GEAR);
  // Staff top (accent colored)
  b(21, by - 1, 4, 2, staffC); b(22, by - 1, 2, 1, C.WHITE);
  p(21, by - 2, accentC); p(24, by - 2, accentC);
  p(22, by - 3, accentC); p(23, by - 3, accentC);
  // Staff wrapping
  p(22, by + 5, staffC); p(22, by + 9, staffC); p(22, by + 13, staffC);
  // Left arm (holding out)
  b(9, by + 6 + lOff, 3, 2, bodyC); b(9, by + 6 + lOff, 1, 2, hiC);
  p(8, by + 7 + lOff, bodyC);
  // Feet
  b(11 + lOff, by + 19, 3, 2, bodyC); b(11 + lOff, by + 20, 3, 1, dkC);
  b(18 + rOff, by + 19, 3, 2, dkC); b(18 + rOff, by + 20, 3, 1, C.VOID);
}

// 12: Plating Mech (Iron Mage) - Heavy armor plates
function drawPlatingMech(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawMechMageBase(p, b, f, C.LTSTEEL, C.STEEL, 'plating');
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    // Extra: heavy armor overlay plates
    b(12, by + 6, 8, 2, C.DKSTEEL); b(13, by + 6, 6, 1, C.STEEL);
    // Shoulder plates
    b(10, by + 9, 3, 2, C.STEEL); b(10, by + 9, 1, 2, C.LTSTEEL);
    b(19, by + 9, 3, 2, C.DKSTEEL);
    // Belt buckle
    b(14, by + 12, 4, 2, C.STEEL); b(15, by + 12, 2, 1, C.LTSTEEL);
    // Extra rivets on plates
    p(11, by + 7, C.RIVET); p(18, by + 7, C.RIVET);
    p(10, by + 16, C.RIVET); p(21, by + 16, C.RIVET);
  } else {
    drawDeathMech(p, b, f - 4, 16, 14);
  }
}

// 13: Overclock Mech (Haste Mage) - Spinning gears, orange speed lines
function drawOverclockMech(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawMechMageBase(p, b, f, C.ORANGE, C.AMBER, 'overclock');
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    // Spinning gears (shoulder area)
    const gearPhase = f;
    // Left gear
    const gx = 8, gy = by + 5;
    for (let i = 0; i < 8; i++) {
      const a = (i + gearPhase) * Math.PI / 4;
      const rx = gx + Math.round(Math.cos(a) * 2);
      const ry = gy + Math.round(Math.sin(a) * 2);
      p(rx, ry, i % 2 === 0 ? C.GEAR : C.DKGEAR);
    }
    p(gx, gy, C.RIVET);
    // Speed lines behind
    b(4, by + 5, 3, 1, C.ORANGE); b(2, by + 5, 2, 1, C.DKAMBER);
    b(3, by + 9, 4, 1, C.ORANGE); p(1, by + 9, C.DKAMBER);
    b(5, by + 13, 3, 1, C.ORANGE); p(3, by + 13, C.DKAMBER);
    b(5, by + 16, 2, 1, C.ORANGE);
    // Extra particles
    if (f % 2 === 0) {
      p(1, by + 3, C.ORANGE); p(0, by + 7, C.DKAMBER);
      b(2, by + 11, 2, 1, C.ORANGE);
    } else {
      p(2, by + 4, C.DKAMBER); p(1, by + 8, C.ORANGE);
      b(3, by + 12, 2, 1, C.DKAMBER);
    }
    // Motion blur
    p(0, by + 6, C.EXHAUST); p(1, by + 10, C.EXHAUST);
  } else {
    drawDeathMech(p, b, f - 4, 16, 14);
  }
}

// 14: Smokescreen Mech (Mist Mage) - Venting steam
function drawSmokescreenMech(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawMechMageBase(p, b, f, C.SMOKE, C.EXHAUST, 'smoke');
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    // Steam vents on body
    p(12, by + 7, C.PIPE); p(19, by + 7, C.PIPE);
    // Steam clouds
    const mx = [4, 6, 3, 7][f];
    const my = [7, 11, 5, 9][f];
    b(mx, by + my, 3, 2, C.SMOKE); p(mx + 3, by + my + 1, C.EXHAUST);
    b(mx + 16, by + my - 2, 3, 2, C.EXHAUST); p(mx + 19, by + my - 1, C.SMOKE);
    // Additional steam wisps
    b(25, by + 3, 2, 1, C.SMOKE); p(26, by + 4, C.EXHAUST);
    b(3, by + 15, 3, 1, C.EXHAUST); p(2, by + 16, C.SMOKE);
    if (f === 1 || f === 3) {
      b(2, by + 14, 2, 1, C.EXHAUST); p(1, by + 15, C.SMOKE);
      p(27, by + 8, C.EXHAUST);
    }
    if (f === 0 || f === 2) {
      p(26, by + 6, C.SMOKE); p(4, by + 10, C.EXHAUST);
    }
    // Pipe vents on shoulders
    b(9, by + 5, 2, 1, C.PIPE); b(20, by + 5, 2, 1, C.PIPE);
  } else {
    drawDeathMech(p, b, f - 4, 16, 14);
  }
}

// 15: Medic Mech (Heal Mage) - Medical cross, green beam
function drawMedicMech(c: CanvasRenderingContext2D, o: number[], f: number) {
  const { p, b } = mk(c, o, GRID, GRID, PX);
  if (f <= 3) {
    drawMechMageBase(p, b, f, C.GREEN, C.DKGREEN, undefined);
    const bob = [0, -1, 0, -1][f];
    const by = 4 + bob;
    // Staff gem glow (green)
    p(22, by - 3, C.GREEN); p(23, by - 3, C.GREEN);
    b(21, by - 1, 4, 1, C.GREEN); p(21, by - 2, C.DKGREEN);
    p(24, by - 2, C.DKGREEN);
    // Medical cross on chest
    b(15, by + 6, 2, 3, C.GREEN); b(14, by + 7, 4, 1, C.GREEN);
    p(15, by + 6, C.WHITE);
    // Green heal particles from left hand
    const px_ = [7, 5, 8, 6][f];
    b(px_, by + 5, 2, 1, C.GREEN); p(px_ + 2, by + 4, C.DKGREEN);
    p(px_ - 1, by + 6, C.GREEN);
    // Cross near staff
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
    drawDeathMech(p, b, f - 4, 16, 14);
  }
}

// ===== DEATH ANIMATION HELPER =====
function drawDeathMech(
  p: (x: number, y: number, cl: string) => void,
  b: (x: number, y: number, w: number, h: number, cl: string) => void,
  deathFrame: number, cx: number, cy: number
) {
  if (deathFrame === 0) {
    // Frame 0: Sparks fly, body breaking apart
    b(cx - 4, cy - 4, 10, 10, C.BRASS);
    b(cx - 3, cy - 5, 8, 2, C.BRASS);
    b(cx - 2, cy - 6, 6, 1, C.HI);
    b(cx - 3, cy + 6, 8, 2, C.DK);
    b(cx - 2, cy + 7, 4, 1, C.VOID);
    // Shading
    b(cx - 4, cy - 4, 2, 10, C.HI);
    b(cx + 4, cy - 2, 2, 8, C.DK);
    // Crack / break lines
    p(cx, cy - 5, C.SPARK); p(cx + 1, cy - 4, C.AMBER);
    p(cx + 2, cy - 3, C.SPARK); p(cx + 3, cy - 2, C.AMBER);
    p(cx - 2, cy - 3, C.AMBER); p(cx - 3, cy - 2, C.SPARK);
    p(cx - 1, cy, C.AMBER); p(cx + 3, cy, C.SPARK);
    p(cx - 3, cy + 1, C.SPARK); p(cx + 1, cy + 1, C.AMBER);
    p(cx, cy + 2, C.SPARK); p(cx - 2, cy + 3, C.AMBER);
    p(cx + 2, cy + 3, C.AMBER); p(cx + 4, cy + 2, C.AMBER);
    // Sparks flying outward
    p(cx - 6, cy - 3, C.SPARK); p(cx + 7, cy - 4, C.SPARK);
    p(cx - 5, cy + 5, C.AMBER); p(cx + 6, cy + 4, C.AMBER);
    // Glow at center
    b(cx - 1, cy - 1, 3, 3, C.AMBER);
    p(cx, cy, C.WHITE); p(cx - 1, cy, C.SPARK); p(cx + 1, cy, C.SPARK);
  } else if (deathFrame === 1) {
    // Frame 1: Parts flying apart, gears scattering
    // Large fragments
    b(cx - 6, cy - 6, 3, 2, C.BRASS); p(cx - 6, cy - 6, C.HI);
    b(cx + 5, cy - 6, 2, 2, C.STEEL); p(cx + 6, cy - 6, C.LTSTEEL);
    b(cx - 7, cy - 1, 2, 2, C.BRASS); p(cx - 7, cy - 1, C.HI);
    b(cx + 6, cy - 1, 2, 3, C.DK);
    b(cx - 6, cy + 5, 2, 2, C.DKSTEEL);
    b(cx + 5, cy + 5, 3, 2, C.BRASS); p(cx + 7, cy + 6, C.DK);
    b(cx - 1, cy - 7, 2, 2, C.STEEL); p(cx, cy - 7, C.LTSTEEL);
    b(cx - 1, cy + 6, 2, 2, C.DK);
    // Gears/screws
    p(cx - 3, cy - 3, C.GEAR); p(cx + 3, cy - 3, C.RIVET);
    p(cx - 3, cy + 3, C.RIVET); p(cx + 3, cy + 3, C.GEAR);
    p(cx - 2, cy - 1, C.COPPER); p(cx + 2, cy + 1, C.COPPER);
    // Sparks
    p(cx - 4, cy - 4, C.SPARK); p(cx + 4, cy - 4, C.SPARK);
    p(cx - 4, cy + 4, C.AMBER); p(cx + 4, cy + 4, C.AMBER);
    // Center flash
    b(cx - 1, cy - 1, 3, 3, C.WHITE);
    p(cx, cy, C.WHITE);
  } else {
    // Frame 2: Pile of gears/screws, fading
    // Scattered tiny debris
    p(cx - 2, cy + 2, C.GEAR); p(cx + 1, cy + 3, C.RIVET);
    p(cx - 1, cy + 3, C.DKSTEEL); p(cx + 2, cy + 2, C.GEAR);
    p(cx, cy + 4, C.RIVET); p(cx + 3, cy + 3, C.DKSTEEL);
    p(cx - 3, cy + 3, C.RIVET);
    // Small pile at center bottom
    b(cx - 2, cy + 1, 5, 2, C.DKSTEEL); b(cx - 1, cy + 1, 3, 1, C.STEEL);
    p(cx, cy + 1, C.RIVET); p(cx + 1, cy + 2, C.GEAR);
    // Fading dust
    p(cx - 8, cy - 4, C.EXHAUST); p(cx + 9, cy - 5, C.EXHAUST);
    p(cx - 5, cy + 7, C.SMOKE); p(cx + 6, cy + 8, C.SMOKE);
    p(cx, cy - 9, C.EXHAUST); p(cx + 2, cy + 9, C.EXHAUST);
    // Last spark
    p(cx - 6, cy - 7, C.SPARK); p(cx + 7, cy - 7, C.DKAMBER);
  }
}

// ===== DRAW ALL CREEPS =====
const DRAW_FNS = [
  drawAutomaton, drawDashUnit, drawIronHulk, drawScrapDrone, drawRepairBot, drawWarEngine,
  drawAssemblyLine, drawClusterBot, drawShieldWalker, drawFlickerDrone, drawNanoForge, drawZeppelinDrone,
  drawPlatingMech, drawOverclockMech, drawSmokescreenMech, drawMedicMech,
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
export default function MechanicalCreepSprites() {
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
    pc.fillStyle = '#1a1408';
    pc.fillRect(0, 0, pv.width, pv.height);

    for (let r = 0; r < ROWS; r++) {
      const by = r * (CELL * S + LH) + 5;
      pc.fillStyle = C.AMBER;
      pc.font = 'bold 9px monospace';
      pc.fillText(ROW_NAMES[r], 3, by + CELL * S / 2 + 3);

      for (let cc = 0; cc < COLS; cc++) {
        const bx = LW + cc * CELL * S;
        pc.save();
        pc.translate(bx, by);
        pc.scale(S, S);
        pc.drawImage(sc, cc * CELL, r * CELL, CELL, CELL, 0, 0, CELL, CELL);
        pc.restore();
        pc.strokeStyle = '#2a2a1a';
        pc.strokeRect(bx, by, CELL * S, CELL * S);
        if (r === 0) {
          pc.fillStyle = '#aa9944';
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
    <div style={{ background: '#1a1408', minHeight: '100vh', padding: 12, fontFamily: 'monospace' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <h2 style={{ color: C.AMBER, margin: 0, fontSize: 15 }}>MECHANICAL FACTION — Creep Spritesheet</h2>
        {ready && (
          <button
            onClick={download(sheetRef, 'mechanical_creeps.png')}
            style={{
              background: C.AMBER, color: '#fff', border: 'none', padding: '5px 14px',
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
              background: view === v ? '#2a2a1a' : '#111',
              color: view === v ? C.AMBER : '#556644',
              border: `1px solid ${view === v ? '#443' : '#222'}`,
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
          data-label="Mechanical Creeps (Preview)"
          data-frame-size="64x64"
          data-direction="right"
          data-columns='["Automaton (Standard)","Dash Unit (Fast)","Iron Hulk (Armored)","Scrap Drone (Swarm)","Repair Bot (Healer)","War Engine (Boss)","Assembly Line (Group)","Cluster Bot (Splitter)","Shield Walker (Shielded)","Flicker Drone (Evasive)","Nano Forge (Regen)","Zeppelin Drone (Flying)","Plating Mech (Iron Mage)","Overclock Mech (Haste Mage)","Smokescreen Mech (Mist Mage)","Medic Mech (Heal Mage)"]'
          data-rows='["Walk 1","Walk 2","Walk 3","Walk 4","Death 1","Death 2","Death 3"]'
          data-presets='[{"name":"Walk","startRow":0,"endRow":3},{"name":"Death","startRow":4,"endRow":6}]'
          style={{ display: view === 'preview' ? 'block' : 'none', maxWidth: '100%' }}
        />
        <canvas
          ref={sheetRef}
          data-label="Mechanical Creeps"
          data-frame-size="64x64"
          data-direction="right"
          data-columns='["Automaton (Standard)","Dash Unit (Fast)","Iron Hulk (Armored)","Scrap Drone (Swarm)","Repair Bot (Healer)","War Engine (Boss)","Assembly Line (Group)","Cluster Bot (Splitter)","Shield Walker (Shielded)","Flicker Drone (Evasive)","Nano Forge (Regen)","Zeppelin Drone (Flying)","Plating Mech (Iron Mage)","Overclock Mech (Haste Mage)","Smokescreen Mech (Mist Mage)","Medic Mech (Heal Mage)"]'
          data-rows='["Walk 1","Walk 2","Walk 3","Walk 4","Death 1","Death 2","Death 3"]'
          data-presets='[{"name":"Walk","startRow":0,"endRow":3},{"name":"Death","startRow":4,"endRow":6}]'
          style={{
            display: view === 'actual' ? 'block' : 'none',
            imageRendering: 'pixelated',
            width: SHEET_W * 2,
            border: '1px solid #2a2a1a',
          }}
        />
      </div>
      <div style={{ color: '#665522', fontSize: 9, marginTop: 10, maxWidth: 700 }}>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#aa8833' }}>Sheet:</b> {SHEET_W}x{SHEET_H}px ({COLS} cols x {ROWS} rows) — {CELL}x{CELL} cells
        </p>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#aa8833' }}>Phaser:</b>{' '}
          <code style={{ color: C.AMBER }}>
            {"this.load.spritesheet('mechanical_creeps','mechanical_creeps.png',{frameWidth:64,frameHeight:64})"}
          </code>
        </p>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#aa8833' }}>Layout:</b> 16 cols (creep types) x 7 rows (walk0-3, death0-2). Frame index = row * 16 + col.
        </p>
        <p style={{ margin: '2px 0' }}>
          <b style={{ color: '#aa8833' }}>Types:</b> {CREEP_NAMES.join(', ')}
        </p>
      </div>
    </div>
  );
}
