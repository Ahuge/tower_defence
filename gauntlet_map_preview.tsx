/**
 * Gauntlet Map Preview — renders all 10 faction homeworld maps as colored grid visualizations.
 * Shows blocked cells, NoBuild zones, entries, exits, and terrain theme for each map.
 */
import { useEffect, useRef } from 'react';

// Inline constants to avoid importing game code that depends on Phaser
const GRID_COLS = 36;
const GRID_ROWS = 26;
const CELL = 8; // pixels per cell in preview
const MAP_W = GRID_COLS * CELL;
const MAP_H = GRID_ROWS * CELL;

type Pos = { col: number; row: number };
const MID_C = Math.floor(GRID_COLS / 2);
const MID_R = Math.floor(GRID_ROWS / 2);

function inB(c: number, r: number): boolean { return c >= 0 && c < GRID_COLS && r >= 0 && r < GRID_ROWS; }
function rect(c1: number, r1: number, c2: number, r2: number): Pos[] {
  const ps: Pos[] = [];
  for (let c = c1; c <= c2; c++) for (let r = r1; r <= r2; r++) if (inB(c, r)) ps.push({ col: c, row: r });
  return ps;
}
function circ(cx: number, cy: number, rad: number): Pos[] {
  const ps: Pos[] = [];
  for (let c = cx - rad; c <= cx + rad; c++) for (let r = cy - rad; r <= cy + rad; r++) {
    if ((c - cx) ** 2 + (r - cy) ** 2 <= rad * rad && inB(c, r)) ps.push({ col: c, row: r });
  }
  return ps;
}
function posKey(c: number, r: number): string { return `${c},${r}`; }

// ===================== Map Builders (duplicated from GauntletMaps.ts to avoid Phaser deps) =====================

function buildArcane(): { blocked: Pos[]; noBuild: Pos[] } {
  const blocked: Pos[] = [];
  blocked.push(...circ(MID_C, MID_R, 4));
  blocked.push(...rect(5, 3, 7, 7)); blocked.push(...rect(29, 3, 31, 7));
  blocked.push(...rect(5, 19, 7, 23)); blocked.push(...rect(29, 19, 31, 23));
  for (let c = 10; c < MID_C - 5; c++) blocked.push({ col: c, row: 8 });
  for (let c = MID_C + 5; c < 27; c++) blocked.push({ col: c, row: 8 });
  for (let c = 10; c < MID_C - 5; c++) blocked.push({ col: c, row: 18 });
  for (let c = MID_C + 5; c < 27; c++) blocked.push({ col: c, row: 18 });
  for (let r = 3; r < 8; r++) blocked.push({ col: 14, row: r });
  for (let r = 3; r < 8; r++) blocked.push({ col: 22, row: r });
  for (let r = 18; r < 24; r++) blocked.push({ col: 14, row: r });
  for (let r = 18; r < 24; r++) blocked.push({ col: 22, row: r });
  blocked.push(...circ(11, 13, 1)); blocked.push(...circ(25, 13, 1));
  const noBuild: Pos[] = [];
  noBuild.push(...circ(MID_C, 5, 2)); noBuild.push(...circ(MID_C, 21, 2));
  return { blocked: blocked.filter(p => inB(p.col, p.row)), noBuild: noBuild.filter(p => inB(p.col, p.row)) };
}

function buildMechanical(): { blocked: Pos[]; noBuild: Pos[] } {
  const blocked: Pos[] = [];
  blocked.push(...rect(3, 4, 8, 9)); blocked.push(...rect(27, 4, 32, 8)); // Furnaces
  blocked.push(...rect(14, 10, 21, 14)); // Stamping press
  blocked.push(...rect(4, 16, 6, 18)); blocked.push(...rect(10, 19, 12, 21)); blocked.push(...rect(25, 17, 28, 19)); // Assembly
  blocked.push(...rect(1, 1, 2, 4)); blocked.push(...rect(33, 1, 34, 5)); // Smokestacks
  blocked.push(...circ(11, 5, 2)); blocked.push(...circ(24, 22, 2)); // Cooling tanks
  blocked.push(...rect(19, 2, 20, 3)); // Pipe junction
  blocked.push({ col: 30, row: 12 }); blocked.push({ col: 31, row: 12 }); blocked.push({ col: 30, row: 13 }); // Scrap
  const noBuild: Pos[] = [];
  for (let c = 9; c <= 13; c++) noBuild.push({ col: c, row: 12 });
  for (let c = 22; c <= 24; c++) noBuild.push({ col: c, row: 12 });
  for (let r = 15; r <= 18; r++) noBuild.push({ col: 17, row: r });
  noBuild.push(...circ(8, 22, 1)); noBuild.push(...circ(33, 15, 1));
  return { blocked: blocked.filter(p => inB(p.col, p.row)), noBuild: noBuild.filter(p => inB(p.col, p.row)) };
}

function buildNature(): { blocked: Pos[]; noBuild: Pos[] } {
  const blocked: Pos[] = [];
  blocked.push(...circ(8, 6, 3)); blocked.push(...circ(28, 6, 3)); blocked.push(...circ(18, 4, 2));
  blocked.push(...circ(6, 16, 3)); blocked.push(...circ(16, 20, 3)); blocked.push(...circ(30, 18, 3));
  blocked.push(...circ(22, 12, 2)); blocked.push(...circ(12, 12, 2));
  blocked.push(...circ(3, 22, 1)); blocked.push(...circ(33, 4, 1)); blocked.push(...circ(26, 23, 1));
  const noBuild: Pos[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const c = MID_C + Math.round(Math.cos(a) * 5);
    const r = MID_R + Math.round(Math.sin(a) * 4);
    if (inB(c, r)) noBuild.push({ col: c, row: r });
  }
  return { blocked: blocked.filter(p => inB(p.col, p.row)), noBuild };
}

function buildVoid(): { blocked: Pos[]; noBuild: Pos[] } {
  const blocked: Pos[] = [];
  blocked.push(...rect(0, 0, 10, 5)); blocked.push(...rect(0, 0, 4, 10));
  blocked.push(...rect(25, 0, GRID_COLS - 1, 5)); blocked.push(...rect(31, 0, GRID_COLS - 1, 10));
  blocked.push(...rect(0, 20, 10, GRID_ROWS - 1)); blocked.push(...rect(0, 16, 4, GRID_ROWS - 1));
  blocked.push(...rect(25, 20, GRID_COLS - 1, GRID_ROWS - 1)); blocked.push(...rect(31, 16, GRID_COLS - 1, GRID_ROWS - 1));
  blocked.push(...circ(MID_C, MID_R, 3));
  const bridgeSet = new Set<string>();
  for (let c = 5; c <= 10; c++) { bridgeSet.add(posKey(c, MID_R)); bridgeSet.add(posKey(c, MID_R - 1)); }
  for (let c = 25; c <= 30; c++) { bridgeSet.add(posKey(c, MID_R)); bridgeSet.add(posKey(c, MID_R - 1)); }
  for (let r = 5; r <= 10; r++) { bridgeSet.add(posKey(MID_C, r)); bridgeSet.add(posKey(MID_C - 1, r)); }
  for (let r = 16; r <= 20; r++) { bridgeSet.add(posKey(MID_C, r)); bridgeSet.add(posKey(MID_C - 1, r)); }
  for (let i = 0; i < 5; i++) {
    bridgeSet.add(posKey(11 + i, 6 + i)); bridgeSet.add(posKey(12 + i, 6 + i));
    bridgeSet.add(posKey(22 - i, 6 + i)); bridgeSet.add(posKey(23 - i, 6 + i));
    bridgeSet.add(posKey(11 + i, 20 - i)); bridgeSet.add(posKey(12 + i, 20 - i));
    bridgeSet.add(posKey(22 - i, 20 - i)); bridgeSet.add(posKey(23 - i, 20 - i));
  }
  return { blocked: blocked.filter(p => inB(p.col, p.row) && !bridgeSet.has(posKey(p.col, p.row))), noBuild: [] };
}

function buildMilitary(): { blocked: Pos[]; noBuild: Pos[] } {
  const blocked: Pos[] = [];
  blocked.push(...rect(2, 2, 6, 5)); // HQ
  blocked.push(...rect(27, 2, 31, 4)); // Barracks
  blocked.push(...rect(1, 11, 5, 14)); // Motor pool
  blocked.push(...rect(14, 2, 15, 3)); blocked.push(...rect(21, 2, 22, 3)); // Guard towers
  blocked.push(...rect(10, 22, 11, 23)); blocked.push(...rect(25, 22, 26, 23));
  blocked.push(...rect(34, 9, 35, 13)); // Comms tower
  blocked.push(...rect(28, 12, 32, 14)); // Supply depot
  blocked.push(...rect(15, 18, 19, 21)); blocked.push(...rect(20, 19, 22, 21)); // Ruined L-shape
  blocked.push(...rect(9, 8, 10, 9)); blocked.push(...rect(18, 9, 19, 10)); // Bunkers
  blocked.push({ col: 12, row: 14 }); blocked.push({ col: 24, row: 8 }); blocked.push({ col: 7, row: 20 }); // Rubble
  const noBuild: Pos[] = [];
  noBuild.push(...circ(8, 5, 1)); noBuild.push(...circ(17, 13, 1)); // Craters
  noBuild.push({ col: 3, row: 18 }); noBuild.push({ col: 4, row: 18 }); noBuild.push({ col: 5, row: 18 }); // Barbed wire
  noBuild.push({ col: 30, row: 8 }); noBuild.push({ col: 31, row: 8 }); noBuild.push({ col: 30, row: 9 });
  noBuild.push(...circ(27, 19, 1)); // Crater SE
  return { blocked: blocked.filter(p => inB(p.col, p.row)), noBuild: noBuild.filter(p => inB(p.col, p.row)) };
}

function buildAliens(): { blocked: Pos[]; noBuild: Pos[] } {
  const blocked: Pos[] = [];
  for (let c = 0; c < GRID_COLS; c++) for (let r = 0; r < GRID_ROWS; r++) blocked.push({ col: c, row: r });
  const tunnelSet = new Set<string>();
  const carve = (c1: number, r1: number, c2: number, r2: number, w: number = 3) => {
    if (c1 === c2) { for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) for (let d = 0; d < w; d++) tunnelSet.add(posKey(c1 + d, r)); }
    else { for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) for (let d = 0; d < w; d++) tunnelSet.add(posKey(c, r1 + d)); }
  };
  carve(0, MID_R - 1, GRID_COLS - 1, MID_R - 1); carve(0, 5, GRID_COLS - 1, 5); carve(0, 20, GRID_COLS - 1, 20);
  carve(8, 0, 8, GRID_ROWS - 1); carve(18, 0, 18, GRID_ROWS - 1); carve(28, 0, 28, GRID_ROWS - 1);
  for (let c = MID_C - 3; c <= MID_C + 3; c++) for (let r = MID_R - 3; r <= MID_R + 3; r++) tunnelSet.add(posKey(c, r));
  const noBuild: Pos[] = [];
  noBuild.push(...circ(8, MID_R, 1)); noBuild.push(...circ(28, MID_R, 1));
  noBuild.push(...circ(18, 5, 1)); noBuild.push(...circ(18, 20, 1));
  return { blocked: blocked.filter(p => !tunnelSet.has(posKey(p.col, p.row))), noBuild: noBuild.filter(p => inB(p.col, p.row)) };
}

function buildCypherpunk(): { blocked: Pos[]; noBuild: Pos[] } {
  const blocked: Pos[] = [];
  blocked.push(...rect(4, 2, 6, 7)); blocked.push(...rect(29, 2, 31, 7)); // Server mainframes
  blocked.push(...rect(4, 17, 6, 22)); blocked.push(...rect(29, 17, 31, 22));
  blocked.push(...circ(MID_C, MID_R, 4)); // Central data pit
  blocked.push(...rect(12, 4, 14, 5)); blocked.push(...rect(21, 4, 23, 5)); // Terminal stations
  blocked.push(...rect(12, 20, 14, 21)); blocked.push(...rect(21, 20, 23, 21));
  blocked.push(...rect(10, 12, 11, 13)); blocked.push(...rect(24, 12, 25, 13)); // Network switches
  blocked.push(...rect(0, 0, 2, 2)); blocked.push(...rect(33, 23, 35, 25)); // Power supply
  const noBuild: Pos[] = [];
  for (let c = 7; c <= 10; c++) { noBuild.push({ col: c, row: 10 }); noBuild.push({ col: c, row: 15 }); }
  for (let c = 25; c <= 28; c++) { noBuild.push({ col: c, row: 10 }); noBuild.push({ col: c, row: 15 }); }
  noBuild.push(...circ(MID_C, 3, 1)); noBuild.push(...circ(MID_C, 22, 1));
  return { blocked: blocked.filter(p => inB(p.col, p.row)), noBuild: noBuild.filter(p => inB(p.col, p.row)) };
}

function buildInfernal(): { blocked: Pos[]; noBuild: Pos[] } {
  const blocked: Pos[] = [];
  blocked.push(...circ(MID_C, MID_R, 4)); // Central lava lake
  blocked.push(...rect(MID_C - 3, 1, MID_C + 3, 4)); // Demon throne
  blocked.push(...rect(4, 4, 5, 8)); blocked.push(...rect(30, 4, 31, 8)); // Obsidian spires
  blocked.push(...rect(4, 17, 5, 21)); blocked.push(...rect(30, 17, 31, 21));
  blocked.push(...circ(10, 7, 2)); blocked.push(...circ(25, 7, 2)); // Bone piles
  blocked.push(...circ(10, 19, 2)); blocked.push(...circ(25, 19, 2));
  blocked.push(...rect(14, 8, 15, 9)); blocked.push(...rect(20, 8, 21, 9)); // Imp cages
  blocked.push(...rect(MID_C - 2, 21, MID_C + 2, 23)); // Sacrifice altar
  const noBuild: Pos[] = [];
  noBuild.push(...circ(8, 12, 1)); noBuild.push(...circ(27, 12, 1));
  noBuild.push(...circ(MID_C, 7, 1)); noBuild.push(...circ(MID_C, 19, 1));
  noBuild.push({ col: 15, row: 15 }); noBuild.push({ col: 20, row: 15 });
  return { blocked: blocked.filter(p => inB(p.col, p.row)), noBuild: noBuild.filter(p => inB(p.col, p.row)) };
}

function buildCelestial(): { blocked: Pos[]; noBuild: Pos[] } {
  const blocked: Pos[] = [];
  const pillarCols = [5, 11, 17, 23, 29];
  const pillarRows = [4, 12, 20];
  for (const pc of pillarCols) for (const pr of pillarRows) blocked.push(...rect(pc, pr, pc + 1, pr + 1));
  blocked.push(...rect(MID_C - 5, 0, MID_C - 4, 4)); blocked.push(...rect(MID_C + 4, 0, MID_C + 5, 4));
  blocked.push(...rect(MID_C - 5, 0, MID_C + 5, 1));
  blocked.push(...rect(MID_C - 6, GRID_ROWS - 3, MID_C - 5, GRID_ROWS - 1));
  blocked.push(...rect(MID_C + 5, GRID_ROWS - 3, MID_C + 6, GRID_ROWS - 1));
  const noBuild: Pos[] = [];
  noBuild.push(...circ(3, 8, 2)); noBuild.push(...circ(33, 8, 2));
  noBuild.push(...circ(3, 18, 2)); noBuild.push(...circ(33, 18, 2));
  noBuild.push(...circ(MID_C, MID_R, 2));
  return { blocked: blocked.filter(p => inB(p.col, p.row)), noBuild: noBuild.filter(p => inB(p.col, p.row)) };
}

function buildPsionic(): { blocked: Pos[]; noBuild: Pos[] } {
  const blocked: Pos[] = [];
  blocked.push(...rect(4, 3, 6, 7)); blocked.push(...rect(29, 3, 31, 7)); // Brain vats
  blocked.push(...rect(4, 17, 6, 21)); blocked.push(...rect(29, 17, 31, 21));
  blocked.push(...circ(MID_C, MID_R, 3)); // Consciousness core
  blocked.push(...rect(13, 5, 14, 7)); blocked.push(...rect(21, 5, 22, 7)); // Thought amplifiers
  blocked.push(...rect(13, 18, 14, 20)); blocked.push(...rect(21, 18, 22, 20));
  blocked.push(...rect(10, 11, 12, 13)); blocked.push(...rect(23, 11, 25, 13)); // Memory banks
  blocked.push({ col: 17, row: 3 }); blocked.push({ col: 18, row: 3 });
  blocked.push({ col: 17, row: 22 }); blocked.push({ col: 18, row: 22 });
  const noBuild: Pos[] = [];
  for (let c = 7; c <= 9; c++) noBuild.push({ col: c, row: MID_R });
  for (let c = 26; c <= 28; c++) noBuild.push({ col: c, row: MID_R });
  noBuild.push(...circ(9, 4, 1)); noBuild.push(...circ(26, 4, 1));
  noBuild.push(...circ(9, 21, 1)); noBuild.push(...circ(26, 21, 1));
  return { blocked: blocked.filter(p => inB(p.col, p.row)), noBuild: noBuild.filter(p => inB(p.col, p.row)) };
}

function buildHarmonic(): { blocked: Pos[]; noBuild: Pos[] } {
  const blocked: Pos[] = [];
  for (let row = 0; row < 3; row++) {
    const y = 3 + row * 5;
    const width = 10 + row * 4;
    for (let c = MID_C - width; c <= MID_C + width; c++) {
      const dist = Math.abs(c - MID_C);
      if (dist >= width - 3 && dist <= width && inB(c, y)) {
        blocked.push({ col: c, row: y });
        if (inB(c, y + 1)) blocked.push({ col: c, row: y + 1 });
      }
    }
  }
  for (let r = 0; r < 16; r++) {
    if (inB(2, r)) blocked.push({ col: 2, row: r }); if (inB(3, r)) blocked.push({ col: 3, row: r });
    if (inB(GRID_COLS - 3, r)) blocked.push({ col: GRID_COLS - 3, row: r });
    if (inB(GRID_COLS - 4, r)) blocked.push({ col: GRID_COLS - 4, row: r });
  }
  blocked.push(...rect(MID_C - 8, 20, MID_C - 6, 22));
  blocked.push(...rect(MID_C + 6, 20, MID_C + 8, 22));
  blocked.push(...circ(MID_C, 22, 2));
  const noBuild: Pos[] = [];
  for (let c = MID_C - 12; c <= MID_C + 12; c++) {
    if (inB(c, 17)) noBuild.push({ col: c, row: 17 });
    if (inB(c, 18)) noBuild.push({ col: c, row: 18 });
  }
  return { blocked: blocked.filter(p => inB(p.col, p.row)), noBuild: noBuild.filter(p => inB(p.col, p.row)) };
}

// ===================== Map Configs =====================

interface MapConfig {
  faction: string;
  name: string;
  theme: string;
  color: string;       // faction primary color
  blockedColor: string; // darker shade for blocked
  noBuildColor: string; // tinted shade for noBuild
  groundColor: string;  // lighter ground
  entries: Pos[];
  exits: Pos[];
  builder: () => { blocked: Pos[]; noBuild: Pos[] };
}

const MAPS: MapConfig[] = [
  { faction: 'Arcane', name: 'Crystal Caverns', theme: 'arcane_crystal', color: '#6644ff', blockedColor: '#3322aa', noBuildColor: '#4433cc', groundColor: '#1a1533', entries: [{ col: 0, row: MID_R }], exits: [{ col: GRID_COLS - 1, row: MID_R }], builder: buildArcane },
  { faction: 'Mechanical', name: 'Iron Foundry', theme: 'factory', color: '#cc8833', blockedColor: '#885522', noBuildColor: '#aa7744', groundColor: '#2a2218', entries: [{ col: 0, row: 0 }], exits: [{ col: GRID_COLS - 1, row: GRID_ROWS - 1 }], builder: buildMechanical },
  { faction: 'Nature', name: 'Ancient Grove', theme: 'ancient_grove', color: '#33aa44', blockedColor: '#226633', noBuildColor: '#339944', groundColor: '#152218', entries: [{ col: MID_C, row: GRID_ROWS - 1 }], exits: [{ col: MID_C, row: 0 }], builder: buildNature },
  { faction: 'Void', name: 'Rift Dimension', theme: 'void_rift', color: '#8822aa', blockedColor: '#551177', noBuildColor: '#662299', groundColor: '#180a22', entries: [{ col: 0, row: MID_R }, { col: MID_C, row: 0 }], exits: [{ col: GRID_COLS - 1, row: MID_R }], builder: buildVoid },
  { faction: 'Military', name: 'Warzone Outpost', theme: 'urban', color: '#556b2f', blockedColor: '#3a4a20', noBuildColor: '#4a5a28', groundColor: '#1a1e14', entries: [{ col: GRID_COLS - 1, row: MID_R }], exits: [{ col: 0, row: MID_R }], builder: buildMilitary },
  { faction: 'Aliens', name: 'Hive Tunnels', theme: 'hive', color: '#88ff44', blockedColor: '#446622', noBuildColor: '#66cc33', groundColor: '#1a2a10', entries: [{ col: 0, row: 5 }, { col: 0, row: MID_R }, { col: 0, row: 20 }], exits: [{ col: GRID_COLS - 1, row: MID_R }], builder: buildAliens },
  { faction: 'Cypherpunk', name: 'Data Grid', theme: 'circuit', color: '#00ffcc', blockedColor: '#006655', noBuildColor: '#00aa88', groundColor: '#0a1a18', entries: [{ col: 0, row: MID_R }], exits: [{ col: GRID_COLS - 1, row: MID_R }], builder: buildCypherpunk },
  { faction: 'Infernal', name: 'Hellscape', theme: 'hellscape', color: '#ff4422', blockedColor: '#992211', noBuildColor: '#cc3318', groundColor: '#2a1008', entries: [{ col: MID_C, row: 0 }], exits: [{ col: MID_C, row: GRID_ROWS - 1 }], builder: buildInfernal },
  { faction: 'Celestial', name: 'Sky Citadel', theme: 'marble', color: '#ffffaa', blockedColor: '#aaaa66', noBuildColor: '#ddddaa', groundColor: '#1e1e18', entries: [{ col: MID_C, row: GRID_ROWS - 1 }], exits: [{ col: MID_C, row: 2 }], builder: buildCelestial },
  { faction: 'Psionic', name: 'Mind Palace', theme: 'neural', color: '#dd88ff', blockedColor: '#8844aa', noBuildColor: '#bb66dd', groundColor: '#1e0a22', entries: [{ col: 0, row: 0 }], exits: [{ col: MID_C, row: MID_R }], builder: buildPsionic },
  { faction: 'Harmonic', name: 'Concert Hall', theme: 'concert', color: '#ffcc44', blockedColor: '#aa8822', noBuildColor: '#ddaa33', groundColor: '#221e0a', entries: [{ col: MID_C, row: 0 }], exits: [{ col: MID_C, row: GRID_ROWS - 1 }], builder: buildHarmonic },
];

// ===================== Single Map Renderer =====================

function MapCanvas({ config }: { config: MapConfig }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const { blocked, noBuild } = config.builder();
    const blockedSet = new Set(blocked.map(p => posKey(p.col, p.row)));
    const noBuildSet = new Set(noBuild.map(p => posKey(p.col, p.row)));
    const entrySet = new Set(config.entries.map(p => posKey(p.col, p.row)));
    const exitSet = new Set(config.exits.map(p => posKey(p.col, p.row)));

    // Draw ground
    ctx.fillStyle = config.groundColor;
    ctx.fillRect(0, 0, MAP_W, MAP_H);

    // Draw grid lines (very subtle)
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 0.5;
    for (let c = 0; c <= GRID_COLS; c++) {
      ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, MAP_H); ctx.stroke();
    }
    for (let r = 0; r <= GRID_ROWS; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(MAP_W, r * CELL); ctx.stroke();
    }

    // Draw cells
    for (let c = 0; c < GRID_COLS; c++) {
      for (let r = 0; r < GRID_ROWS; r++) {
        const key = posKey(c, r);
        const x = c * CELL, y = r * CELL;
        if (blockedSet.has(key)) {
          ctx.fillStyle = config.blockedColor;
          ctx.fillRect(x, y, CELL, CELL);
        } else if (noBuildSet.has(key)) {
          ctx.fillStyle = config.noBuildColor;
          ctx.fillRect(x, y, CELL, CELL);
          // Diagonal stripe pattern
          ctx.strokeStyle = 'rgba(255,255,255,0.15)';
          ctx.lineWidth = 0.5;
          ctx.beginPath(); ctx.moveTo(x, y + CELL); ctx.lineTo(x + CELL, y); ctx.stroke();
        }
      }
    }

    // Draw entries (green arrows)
    for (const e of config.entries) {
      const x = e.col * CELL, y = e.row * CELL;
      ctx.fillStyle = '#44ff44';
      ctx.fillRect(x, y, CELL, CELL);
      // Arrow indicator
      ctx.fillStyle = '#000';
      ctx.font = `${CELL - 1}px monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('>', x + CELL / 2, y + CELL / 2);
    }

    // Draw exits (red squares)
    for (const e of config.exits) {
      const x = e.col * CELL, y = e.row * CELL;
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(x, y, CELL, CELL);
      ctx.fillStyle = '#000';
      ctx.font = `${CELL - 1}px monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('X', x + CELL / 2, y + CELL / 2);
    }

    // Border
    ctx.strokeStyle = config.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, MAP_W, MAP_H);
  }, [config]);

  return (
    <div style={{ display: 'inline-block', margin: 8 }}>
      <div style={{ marginBottom: 4 }}>
        <span style={{ color: config.color, fontWeight: 'bold', fontSize: 14 }}>{config.faction}</span>
        <span style={{ color: '#888', fontSize: 12, marginLeft: 8 }}>{config.name}</span>
      </div>
      <canvas
        ref={canvasRef}
        width={MAP_W}
        height={MAP_H}
        style={{ imageRendering: 'pixelated', display: 'block', cursor: 'crosshair' }}
      />
      <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>
        Theme: <span style={{ color: '#aaa' }}>{config.theme}</span>
        {' | '}Entries: <span style={{ color: '#44ff44' }}>{config.entries.length}</span>
        {' | '}Exits: <span style={{ color: '#ff4444' }}>{config.exits.length}</span>
      </div>
    </div>
  );
}

// ===================== Legend =====================

function Legend() {
  const items = [
    { color: '#333', label: 'Ground (buildable)' },
    { color: '#555', label: 'Blocked (impassable)' },
    { color: '#777', label: 'NoBuild (walkable, unbuildable)', stripe: true },
    { color: '#44ff44', label: 'Entry (spawn)' },
    { color: '#ff4444', label: 'Exit (goal)' },
  ];
  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 16, padding: 8, background: '#1a1a22', border: '1px solid #333', borderRadius: 4 }}>
      {items.map(item => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#aaa' }}>
          <div style={{ width: 14, height: 14, background: item.color, border: '1px solid #555' }} />
          {item.label}
        </div>
      ))}
    </div>
  );
}

// ===================== Main Component =====================

export default function GauntletMapPreview() {
  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color: '#ff4444', marginBottom: 4 }}>Faction Gauntlet Maps</h2>
      <p style={{ color: '#888', fontSize: 12, marginBottom: 12 }}>
        All 10 faction homeworld maps ({GRID_COLS}x{GRID_ROWS} grid, {CELL}px/cell preview).
        Green = entry, Red = exit, Striped = NoBuild zone.
      </p>
      <Legend />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {MAPS.map(m => <MapCanvas key={m.faction} config={m} />)}
      </div>
    </div>
  );
}
