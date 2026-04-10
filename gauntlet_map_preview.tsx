/**
 * Gauntlet Map Preview — renders all 10 faction homeworld maps using actual terrain sprites.
 * Shows blocked cells, NoBuild zones, entries, exits with real tileset art.
 */
import { useEffect, useRef, useState, useCallback } from 'react';

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

// ===================== Terrain Sprite Modules =====================

const terrainModules: Record<string, () => Promise<{ default: React.ComponentType }>> = {
  arcane: () => import('../arcane_terrain_sprites'),
  mechanical: () => import('../mechanical_terrain_sprites'),
  nature: () => import('../nature_terrain_sprites'),
  void: () => import('../void_terrain_sprites'),
  military: () => import('../military_terrain_sprites'),
  aliens: () => import('../aliens_terrain_sprites'),
  cypherpunk: () => import('../cypherpunk_terrain_sprites'),
  infernal: () => import('../infernal_terrain_sprites'),
  celestial: () => import('../celestial_terrain_sprites'),
  psionic: () => import('../psionic_terrain_sprites'),
  harmonic: () => import('../harmonic_terrain_sprites'),
};

const TILE = 28; // sprite tile size
const TILE_COLS = 16; // auto-tile variants per row
// Row layout in each tileset: 0=ground, 1=blocked, 2-4=animated(3 frames), 5=nobuild

/** Compute 4-bit auto-tile index (N=8, E=4, S=2, W=1) */
function autoTile(c: number, r: number, set: Set<string>): number {
  let idx = 0;
  if (set.has(posKey(c, r - 1))) idx |= 8; // N
  if (set.has(posKey(c + 1, r))) idx |= 4; // E
  if (set.has(posKey(c, r + 1))) idx |= 2; // S
  if (set.has(posKey(c - 1, r))) idx |= 1; // W
  return idx;
}

// ===================== Map Configs =====================

interface MapConfig {
  faction: string;
  factionKey: string;   // key into terrainModules
  name: string;
  theme: string;
  color: string;
  entries: Pos[];
  exits: Pos[];
  builder: () => { blocked: Pos[]; noBuild: Pos[] };
}

const MAPS: MapConfig[] = [
  { faction: 'Arcane', factionKey: 'arcane', name: 'Crystal Caverns', theme: 'arcane_crystal', color: '#6644ff', entries: [{ col: 0, row: MID_R }], exits: [{ col: GRID_COLS - 1, row: MID_R }], builder: buildArcane },
  { faction: 'Mechanical', factionKey: 'mechanical', name: 'Iron Foundry', theme: 'factory', color: '#cc8833', entries: [{ col: 0, row: 0 }], exits: [{ col: GRID_COLS - 1, row: GRID_ROWS - 1 }], builder: buildMechanical },
  { faction: 'Nature', factionKey: 'nature', name: 'Ancient Grove', theme: 'ancient_grove', color: '#33aa44', entries: [{ col: MID_C, row: GRID_ROWS - 1 }], exits: [{ col: MID_C, row: 0 }], builder: buildNature },
  { faction: 'Void', factionKey: 'void', name: 'Rift Dimension', theme: 'void_rift', color: '#8822aa', entries: [{ col: 0, row: MID_R }, { col: MID_C, row: 0 }], exits: [{ col: GRID_COLS - 1, row: MID_R }], builder: buildVoid },
  { faction: 'Military', factionKey: 'military', name: 'Warzone Outpost', theme: 'urban', color: '#556b2f', entries: [{ col: GRID_COLS - 1, row: MID_R }], exits: [{ col: 0, row: MID_R }], builder: buildMilitary },
  { faction: 'Aliens', factionKey: 'aliens', name: 'Hive Tunnels', theme: 'hive', color: '#88ff44', entries: [{ col: 0, row: 5 }, { col: 0, row: MID_R }, { col: 0, row: 20 }], exits: [{ col: GRID_COLS - 1, row: MID_R }], builder: buildAliens },
  { faction: 'Cypherpunk', factionKey: 'cypherpunk', name: 'Data Grid', theme: 'circuit', color: '#00ffcc', entries: [{ col: 0, row: MID_R }], exits: [{ col: GRID_COLS - 1, row: MID_R }], builder: buildCypherpunk },
  { faction: 'Infernal', factionKey: 'infernal', name: 'Hellscape', theme: 'hellscape', color: '#ff4422', entries: [{ col: MID_C, row: 0 }], exits: [{ col: MID_C, row: GRID_ROWS - 1 }], builder: buildInfernal },
  { faction: 'Celestial', factionKey: 'celestial', name: 'Sky Citadel', theme: 'marble', color: '#ffffaa', entries: [{ col: MID_C, row: GRID_ROWS - 1 }], exits: [{ col: MID_C, row: 2 }], builder: buildCelestial },
  { faction: 'Psionic', factionKey: 'psionic', name: 'Mind Palace', theme: 'neural', color: '#dd88ff', entries: [{ col: 0, row: 0 }], exits: [{ col: MID_C, row: MID_R }], builder: buildPsionic },
  { faction: 'Harmonic', factionKey: 'harmonic', name: 'Concert Hall', theme: 'concert', color: '#ffcc44', entries: [{ col: MID_C, row: 0 }], exits: [{ col: MID_C, row: GRID_ROWS - 1 }], builder: buildHarmonic },
];

// ===================== Single Map Renderer =====================

function drawTile(
  ctx: CanvasRenderingContext2D, tileset: HTMLCanvasElement,
  tileRow: number, tileCol: number, dx: number, dy: number, cellSize: number,
) {
  const sx = tileCol * TILE;
  const sy = tileRow * TILE;
  ctx.drawImage(tileset, sx, sy, TILE, TILE, dx, dy, cellSize, cellSize);
}

function MapCanvas({ config, tileset, doodadSheet }: { config: MapConfig; tileset: HTMLCanvasElement | null; doodadSheet: HTMLCanvasElement | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, MAP_W, MAP_H);

    const { blocked, noBuild } = config.builder();
    const blockedSet = new Set(blocked.map(p => posKey(p.col, p.row)));
    const noBuildSet = new Set(noBuild.map(p => posKey(p.col, p.row)));

    if (tileset) {
      // Draw ground tiles on every non-blocked cell
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          const key = posKey(c, r);
          if (blockedSet.has(key)) continue;
          drawTile(ctx, tileset, 0, 15, c * CELL, r * CELL, CELL); // row 0 (ground), variant 15 (center)
        }
      }

      // Draw grid lines on buildable cells only
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 0.5;
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          if (blockedSet.has(posKey(c, r)) || noBuildSet.has(posKey(c, r))) continue;
          const x = c * CELL, y = r * CELL;
          ctx.strokeRect(x, y, CELL, CELL);
        }
      }

      // Draw blocked tiles with auto-tiling
      for (const p of blocked) {
        const idx = autoTile(p.col, p.row, blockedSet);
        drawTile(ctx, tileset, 1, idx, p.col * CELL, p.row * CELL, CELL); // row 1 (static blocked)
      }

      // Draw NoBuild tiles with auto-tiling
      for (const p of noBuild) {
        const idx = autoTile(p.col, p.row, noBuildSet);
        drawTile(ctx, tileset, 5, idx, p.col * CELL, p.row * CELL, CELL); // row 5 (nobuild)
      }

      // Draw doodads on some ground cells
      if (doodadSheet) {
        for (let r = 0; r < GRID_ROWS; r++) {
          for (let c = 0; c < GRID_COLS; c++) {
            if (blockedSet.has(posKey(c, r)) || noBuildSet.has(posKey(c, r))) continue;
            // Seeded random for consistent placement
            let h = (c * 374761 + r * 668265) | 0;
            h = ((h ^ (h >> 13)) * 1103515) | 0;
            const rand = ((h ^ (h >> 16)) & 0x7fff) / 0x7fff;
            if (rand > 0.10) continue;
            const dIdx = Math.floor(((c * 127 + r * 311) & 0x7fff) / 0x7fff * 8) % 8;
            ctx.drawImage(doodadSheet, dIdx * TILE, 0, TILE, TILE, c * CELL, r * CELL, CELL, CELL);
          }
        }
      }
    } else {
      // Fallback: colored rectangles (while tilesets load)
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, MAP_W, MAP_H);
      for (const p of blocked) {
        ctx.fillStyle = '#444';
        ctx.fillRect(p.col * CELL, p.row * CELL, CELL, CELL);
      }
      for (const p of noBuild) {
        ctx.fillStyle = '#333';
        ctx.fillRect(p.col * CELL, p.row * CELL, CELL, CELL);
      }
    }

    // Draw entries (green)
    for (const e of config.entries) {
      const x = e.col * CELL, y = e.row * CELL;
      ctx.fillStyle = 'rgba(68,255,68,0.6)';
      ctx.fillRect(x, y, CELL, CELL);
    }

    // Draw exits (red)
    for (const e of config.exits) {
      const x = e.col * CELL, y = e.row * CELL;
      ctx.fillStyle = 'rgba(255,68,68,0.6)';
      ctx.fillRect(x, y, CELL, CELL);
    }

    // Border
    ctx.strokeStyle = config.color;
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, MAP_W, MAP_H);
  }, [config, tileset, doodadSheet]);

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
    { color: '#44ff44', label: 'Entry (spawn)' },
    { color: '#ff4444', label: 'Exit (goal)' },
  ];
  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 16, padding: 8, background: '#1a1a22', border: '1px solid #333', borderRadius: 4 }}>
      {items.map(item => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#aaa' }}>
          <div style={{ width: 14, height: 14, background: item.color, border: '1px solid #555', opacity: 0.6 }} />
          {item.label}
        </div>
      ))}
      <div style={{ fontSize: 11, color: '#666', marginLeft: 8 }}>
        Maps rendered with actual terrain sprites (auto-tiled)
      </div>
    </div>
  );
}

// ===================== Main Component =====================

/** Render a terrain sprite component off-screen and extract its canvases */
async function renderTerrainModule(key: string): Promise<{ tileset: HTMLCanvasElement; doodads: HTMLCanvasElement } | null> {
  try {
    const mod = await terrainModules[key]();
    const Comp = mod.default;
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);
    const { createRoot } = await import('react-dom/client');
    const root = createRoot(container);
    root.render(<Comp />);
    await new Promise(r => setTimeout(r, 600));
    const allCanvases = Array.from(container.querySelectorAll('canvas'));
    // Find the actual-size tileset canvas (not the scaled preview)
    // Tileset: 16*28 = 448 wide, 6*28 = 168 tall
    // Doodad: 8*28 = 224 wide, 1*28 = 28 tall
    let tileset: HTMLCanvasElement | null = null;
    let doodads: HTMLCanvasElement | null = null;
    for (const c of allCanvases) {
      if (c.width === TILE_COLS * TILE && c.height === 6 * TILE) tileset = c;
      if (c.width === 8 * TILE && c.height === TILE) doodads = c;
    }
    root.unmount();
    document.body.removeChild(container);
    if (tileset && doodads) return { tileset, doodads };
    return null;
  } catch (e) {
    console.error(`Failed to render terrain for ${key}:`, e);
    return null;
  }
}

export default function GauntletMapPreview() {
  const [tilesets, setTilesets] = useState<Record<string, { tileset: HTMLCanvasElement; doodads: HTMLCanvasElement }>>({});
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    const result: Record<string, { tileset: HTMLCanvasElement; doodads: HTMLCanvasElement }> = {};
    const keys = Object.keys(terrainModules);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      setLoadProgress(`Loading ${key} (${i + 1}/${keys.length})...`);
      const sheets = await renderTerrainModule(key);
      if (sheets) result[key] = sheets;
    }
    setTilesets(result);
    setLoading(false);
    setLoadProgress('');
  }, []);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ color: '#ff4444', marginBottom: 4 }}>Faction Gauntlet Maps</h2>
      <p style={{ color: '#888', fontSize: 12, marginBottom: 12 }}>
        All 10 faction homeworld maps ({GRID_COLS}x{GRID_ROWS} grid) rendered with faction terrain sprites.
      </p>

      <div style={{ marginBottom: 12 }}>
        <button
          onClick={loadAll}
          disabled={loading && !!loadProgress}
          style={{
            padding: '8px 16px', background: '#335533', color: '#aaffaa', border: '1px solid #55aa55',
            fontFamily: 'monospace', cursor: 'pointer', fontSize: 12,
          }}
        >
          {loading && loadProgress ? loadProgress : 'Load Terrain Sprites'}
        </button>
        {!loading && Object.keys(tilesets).length > 0 && (
          <span style={{ marginLeft: 12, color: '#55aa55', fontSize: 11 }}>
            {Object.keys(tilesets).length} tilesets loaded
          </span>
        )}
      </div>

      <Legend />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {MAPS.map(m => (
          <MapCanvas
            key={m.faction}
            config={m}
            tileset={tilesets[m.factionKey]?.tileset ?? null}
            doodadSheet={tilesets[m.factionKey]?.doodads ?? null}
          />
        ))}
      </div>
    </div>
  );
}
