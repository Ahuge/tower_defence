/**
 * Gauntlet Mode — 10 faction homeworld maps.
 * Each map has unique terrain, layout, and strategic identity.
 */
import { GRID_COLS, GRID_ROWS } from '../config';
import { MapDefinition } from './Maps';
import { FactionId } from './Factions';

type Pos = { col: number; row: number };
const MID_C = Math.floor(GRID_COLS / 2);
const MID_R = Math.floor(GRID_ROWS / 2);

function inB(c: number, r: number): boolean {
  return c >= 0 && c < GRID_COLS && r >= 0 && r < GRID_ROWS;
}
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
function notIn(positions: Pos[], exclude: Set<string>): Pos[] {
  return positions.filter(p => !exclude.has(posKey(p.col, p.row)));
}

// =====================================================================
// ARCANE — Crystal Caverns: winding corridors around crystal nexus + wizard towers
// =====================================================================
function buildArcane(): { blocked: Pos[]; noBuild: Pos[] } {
  const blocked: Pos[] = [];
  // Central crystal nexus (large blocked circle)
  blocked.push(...circ(MID_C, MID_R, 4));
  // Wizard towers (tall blocked pillars at corners)
  blocked.push(...rect(5, 3, 7, 7));     // NW tower
  blocked.push(...rect(29, 3, 31, 7));   // NE tower
  blocked.push(...rect(5, 19, 7, 23));   // SW tower
  blocked.push(...rect(29, 19, 31, 23)); // SE tower
  // Crystal wall corridors radiating from center
  for (let c = 10; c < MID_C - 5; c++) blocked.push({ col: c, row: 8 });
  for (let c = MID_C + 5; c < 27; c++) blocked.push({ col: c, row: 8 });
  for (let c = 10; c < MID_C - 5; c++) blocked.push({ col: c, row: 18 });
  for (let c = MID_C + 5; c < 27; c++) blocked.push({ col: c, row: 18 });
  // Vertical crystal walls
  for (let r = 3; r < 8; r++) blocked.push({ col: 14, row: r });
  for (let r = 3; r < 8; r++) blocked.push({ col: 22, row: r });
  for (let r = 18; r < 24; r++) blocked.push({ col: 14, row: r });
  for (let r = 18; r < 24; r++) blocked.push({ col: 22, row: r });
  // Small crystal clusters
  blocked.push(...circ(11, 13, 1));
  blocked.push(...circ(25, 13, 1));

  // NoBuild: arcane circles (glowing floor areas)
  const noBuild: Pos[] = [];
  noBuild.push(...circ(MID_C, 5, 2));
  noBuild.push(...circ(MID_C, 21, 2));

  return { blocked: blocked.filter(p => inB(p.col, p.row)), noBuild: noBuild.filter(p => inB(p.col, p.row)) };
}

// =====================================================================
// MECHANICAL — Iron Foundry: steampunk factory grid with conveyors
// =====================================================================
function buildMechanical(): { blocked: Pos[]; noBuild: Pos[] } {
  const blocked: Pos[] = [];
  // Factory machine blocks (large squares in a grid)
  blocked.push(...rect(4, 3, 8, 7));
  blocked.push(...rect(14, 3, 18, 7));
  blocked.push(...rect(24, 3, 28, 7));
  blocked.push(...rect(4, 11, 8, 15));
  blocked.push(...rect(14, 11, 18, 15));
  blocked.push(...rect(24, 11, 28, 15));
  blocked.push(...rect(9, 19, 13, 23));
  blocked.push(...rect(19, 19, 23, 23));
  // Smokestacks
  blocked.push(...rect(6, 1, 6, 3));
  blocked.push(...rect(16, 1, 16, 3));
  blocked.push(...rect(26, 1, 26, 3));

  // NoBuild: conveyor belt paths (can walk but not build)
  const noBuild: Pos[] = [];
  // Horizontal conveyors
  for (let c = 0; c < GRID_COLS; c++) {
    noBuild.push({ col: c, row: 9 });
    noBuild.push({ col: c, row: 17 });
  }

  return { blocked: blocked.filter(p => inB(p.col, p.row)), noBuild: noBuild.filter(p => inB(p.col, p.row)) };
}

// =====================================================================
// NATURE — Ancient Grove: organic clearings connected by forest paths
// =====================================================================
function buildNature(): { blocked: Pos[]; noBuild: Pos[] } {
  const blocked: Pos[] = [];
  // Large tree clusters (organic shapes)
  blocked.push(...circ(8, 6, 3));
  blocked.push(...circ(28, 6, 3));
  blocked.push(...circ(18, 4, 2));
  blocked.push(...circ(6, 16, 3));
  blocked.push(...circ(16, 20, 3));
  blocked.push(...circ(30, 18, 3));
  blocked.push(...circ(22, 12, 2));
  blocked.push(...circ(12, 12, 2));
  // Small tree dots
  blocked.push(...circ(3, 22, 1));
  blocked.push(...circ(33, 4, 1));
  blocked.push(...circ(26, 23, 1));

  // NoBuild: mushroom rings
  const noBuild: Pos[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const c = MID_C + Math.round(Math.cos(a) * 5);
    const r = MID_R + Math.round(Math.sin(a) * 4);
    if (inB(c, r)) noBuild.push({ col: c, row: r });
  }

  return { blocked: blocked.filter(p => inB(p.col, p.row)), noBuild };
}

// =====================================================================
// VOID — Rift Dimension: floating islands connected by narrow bridges
// =====================================================================
function buildVoid(): { blocked: Pos[]; noBuild: Pos[] } {
  const blocked: Pos[] = [];
  // Void pools (large blocked areas representing nothingness)
  // Top-left void pool
  blocked.push(...rect(0, 0, 10, 5));
  blocked.push(...rect(0, 0, 4, 10));
  // Top-right void pool
  blocked.push(...rect(25, 0, GRID_COLS - 1, 5));
  blocked.push(...rect(31, 0, GRID_COLS - 1, 10));
  // Bottom-left
  blocked.push(...rect(0, 20, 10, GRID_ROWS - 1));
  blocked.push(...rect(0, 16, 4, GRID_ROWS - 1));
  // Bottom-right
  blocked.push(...rect(25, 20, GRID_COLS - 1, GRID_ROWS - 1));
  blocked.push(...rect(31, 16, GRID_COLS - 1, GRID_ROWS - 1));
  // Central void rift
  blocked.push(...circ(MID_C, MID_R, 3));

  // Carve out bridge gaps (2-wide)
  const bridgeSet = new Set<string>();
  // Horizontal bridges
  for (let c = 5; c <= 10; c++) { bridgeSet.add(posKey(c, MID_R)); bridgeSet.add(posKey(c, MID_R - 1)); }
  for (let c = 25; c <= 30; c++) { bridgeSet.add(posKey(c, MID_R)); bridgeSet.add(posKey(c, MID_R - 1)); }
  // Vertical bridges
  for (let r = 5; r <= 10; r++) { bridgeSet.add(posKey(MID_C, r)); bridgeSet.add(posKey(MID_C - 1, r)); }
  for (let r = 16; r <= 20; r++) { bridgeSet.add(posKey(MID_C, r)); bridgeSet.add(posKey(MID_C - 1, r)); }
  // Diagonal bridges
  for (let i = 0; i < 5; i++) {
    bridgeSet.add(posKey(11 + i, 6 + i)); bridgeSet.add(posKey(12 + i, 6 + i));
    bridgeSet.add(posKey(22 - i, 6 + i)); bridgeSet.add(posKey(23 - i, 6 + i));
    bridgeSet.add(posKey(11 + i, 20 - i)); bridgeSet.add(posKey(12 + i, 20 - i));
    bridgeSet.add(posKey(22 - i, 20 - i)); bridgeSet.add(posKey(23 - i, 20 - i));
  }

  return {
    blocked: blocked.filter(p => inB(p.col, p.row) && !bridgeSet.has(posKey(p.col, p.row))),
    noBuild: [],
  };
}

// =====================================================================
// MILITARY — Warzone Outpost: ruined city grid, buildings + streets
// =====================================================================
function buildMilitary(): { blocked: Pos[]; noBuild: Pos[] } {
  const blocked: Pos[] = [];
  // Building blocks (city grid, 3×3 blocks with 2-wide streets)
  const buildingPositions = [
    [2, 2], [7, 2], [12, 2], [17, 2], [22, 2], [27, 2],
    [2, 8], [7, 8], [17, 8], [22, 8], [27, 8],
    [2, 14], [7, 14], [12, 14], [22, 14], [27, 14],
    [2, 20], [7, 20], [12, 20], [17, 20], [27, 20],
  ];
  for (const [bc, br] of buildingPositions) {
    blocked.push(...rect(bc, br, bc + 3, br + 3));
  }
  // Rubble piles (small blocked dots for ruined feeling)
  blocked.push(...circ(15, 10, 1));
  blocked.push(...circ(20, 16, 1));
  blocked.push(...circ(25, 10, 1));

  // NoBuild: trenches
  const noBuild: Pos[] = [];
  for (let c = 0; c < GRID_COLS; c++) noBuild.push({ col: c, row: 6 });
  for (let c = 0; c < GRID_COLS; c++) noBuild.push({ col: c, row: 19 });

  return { blocked: blocked.filter(p => inB(p.col, p.row)), noBuild: noBuild.filter(p => inB(p.col, p.row)) };
}

// =====================================================================
// ALIENS — Hive Tunnels: narrow winding passages, acid pools
// =====================================================================
function buildAliens(): { blocked: Pos[]; noBuild: Pos[] } {
  const blocked: Pos[] = [];
  // Thick organic hive walls — fill most of the map, then carve tunnels
  for (let c = 0; c < GRID_COLS; c++) for (let r = 0; r < GRID_ROWS; r++) {
    blocked.push({ col: c, row: r });
  }
  // Carve tunnel network (3-wide corridors)
  const tunnelSet = new Set<string>();
  const carve = (c1: number, r1: number, c2: number, r2: number, w: number = 3) => {
    if (c1 === c2) { // vertical
      for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++)
        for (let d = 0; d < w; d++) tunnelSet.add(posKey(c1 + d, r));
    } else { // horizontal
      for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++)
        for (let d = 0; d < w; d++) tunnelSet.add(posKey(c, r1 + d));
    }
  };
  // Main horizontal tunnels
  carve(0, MID_R - 1, GRID_COLS - 1, MID_R - 1);
  carve(0, 5, GRID_COLS - 1, 5);
  carve(0, 20, GRID_COLS - 1, 20);
  // Vertical connectors
  carve(8, 0, 8, GRID_ROWS - 1);
  carve(18, 0, 18, GRID_ROWS - 1);
  carve(28, 0, 28, GRID_ROWS - 1);
  // Queen chamber (center clearing)
  for (let c = MID_C - 3; c <= MID_C + 3; c++)
    for (let r = MID_R - 3; r <= MID_R + 3; r++)
      tunnelSet.add(posKey(c, r));

  // Acid pools (NoBuild in tunnel junctions)
  const noBuild: Pos[] = [];
  noBuild.push(...circ(8, MID_R, 1));
  noBuild.push(...circ(28, MID_R, 1));
  noBuild.push(...circ(18, 5, 1));
  noBuild.push(...circ(18, 20, 1));

  return {
    blocked: blocked.filter(p => !tunnelSet.has(posKey(p.col, p.row))),
    noBuild: noBuild.filter(p => inB(p.col, p.row)),
  };
}

// =====================================================================
// CYPHERPUNK — Data Grid: symmetric circuit board, Tron-inspired
// =====================================================================
function buildCypherpunk(): { blocked: Pos[]; noBuild: Pos[] } {
  const blocked: Pos[] = [];
  // Processor blocks (perfectly symmetric large squares)
  blocked.push(...rect(6, 4, 10, 8));
  blocked.push(...rect(25, 4, 29, 8));
  blocked.push(...rect(6, 17, 10, 21));
  blocked.push(...rect(25, 17, 29, 21));
  // Central processing unit
  blocked.push(...rect(15, 10, 20, 15));
  // Data bus nodes (small blocks)
  blocked.push(...rect(2, 12, 3, 13));
  blocked.push(...rect(32, 12, 33, 13));
  blocked.push(...rect(MID_C - 1, 1, MID_C, 2));
  blocked.push(...rect(MID_C - 1, 23, MID_C, 24));

  // NoBuild: data bus traces (circuit paths)
  const noBuild: Pos[] = [];
  for (let c = 0; c < GRID_COLS; c++) noBuild.push({ col: c, row: 2 });
  for (let c = 0; c < GRID_COLS; c++) noBuild.push({ col: c, row: 23 });
  for (let r = 0; r < GRID_ROWS; r++) noBuild.push({ col: 13, row: r });
  for (let r = 0; r < GRID_ROWS; r++) noBuild.push({ col: 22, row: r });

  return { blocked: blocked.filter(p => inB(p.col, p.row)), noBuild: noBuild.filter(p => inB(p.col, p.row)) };
}

// =====================================================================
// INFERNAL — Hellscape: lava rivers, brimstone, stalagmites
// =====================================================================
function buildInfernal(): { blocked: Pos[]; noBuild: Pos[] } {
  const blocked: Pos[] = [];
  // Lava rivers (horizontal, 2-wide with bridge gaps)
  for (let c = 0; c < GRID_COLS; c++) {
    const isBridge = (c >= 8 && c <= 10) || (c >= MID_C - 1 && c <= MID_C + 1) || (c >= 26 && c <= 28);
    if (!isBridge) {
      blocked.push({ col: c, row: 8 });
      blocked.push({ col: c, row: 9 });
    }
  }
  for (let c = 0; c < GRID_COLS; c++) {
    const isBridge = (c >= 5 && c <= 7) || (c >= MID_C - 1 && c <= MID_C + 1) || (c >= 29 && c <= 31);
    if (!isBridge) {
      blocked.push({ col: c, row: 17 });
      blocked.push({ col: c, row: 18 });
    }
  }
  // Stalagmite pillars
  blocked.push(...circ(5, 4, 2));
  blocked.push(...circ(30, 4, 2));
  blocked.push(...circ(MID_C, 13, 2));
  blocked.push(...circ(10, 22, 2));
  blocked.push(...circ(25, 22, 2));
  // Stalactite formations (smaller)
  blocked.push(...circ(15, 2, 1));
  blocked.push(...circ(22, 2, 1));
  blocked.push(...circ(15, 24, 1));

  // NoBuild: brimstone patches
  const noBuild: Pos[] = [];
  noBuild.push(...circ(MID_C, 5, 1));
  noBuild.push(...circ(MID_C, 21, 1));
  noBuild.push(...circ(8, 13, 1));
  noBuild.push(...circ(28, 13, 1));

  return { blocked: blocked.filter(p => inB(p.col, p.row)), noBuild: noBuild.filter(p => inB(p.col, p.row)) };
}

// =====================================================================
// CELESTIAL — Sky Citadel: marble pillars, open courtyards, clouds
// =====================================================================
function buildCelestial(): { blocked: Pos[]; noBuild: Pos[] } {
  const blocked: Pos[] = [];
  // Grand pillars (evenly spaced in courtyard)
  const pillarCols = [5, 11, 17, 23, 29];
  const pillarRows = [4, 12, 20];
  for (const pc of pillarCols) for (const pr of pillarRows) {
    blocked.push(...rect(pc, pr, pc + 1, pr + 1));
  }
  // Inner sanctum walls (top center, the goal)
  blocked.push(...rect(MID_C - 5, 0, MID_C - 4, 4));
  blocked.push(...rect(MID_C + 4, 0, MID_C + 5, 4));
  blocked.push(...rect(MID_C - 5, 0, MID_C + 5, 1));
  // Gate pillars at bottom
  blocked.push(...rect(MID_C - 6, GRID_ROWS - 3, MID_C - 5, GRID_ROWS - 1));
  blocked.push(...rect(MID_C + 5, GRID_ROWS - 3, MID_C + 6, GRID_ROWS - 1));

  // NoBuild: cloud gaps (can't build on clouds)
  const noBuild: Pos[] = [];
  noBuild.push(...circ(3, 8, 2));
  noBuild.push(...circ(33, 8, 2));
  noBuild.push(...circ(3, 18, 2));
  noBuild.push(...circ(33, 18, 2));
  noBuild.push(...circ(MID_C, MID_R, 2));

  return { blocked: blocked.filter(p => inB(p.col, p.row)), noBuild: noBuild.filter(p => inB(p.col, p.row)) };
}

// =====================================================================
// PSIONIC — Mind Palace: spiral with brain tanks
// =====================================================================
function buildPsionic(): { blocked: Pos[]; noBuild: Pos[] } {
  const blocked: Pos[] = [];
  // Spiral walls converging to center (like Spiral map but with gaps)
  const margin = 2;
  let top = margin, bottom = GRID_ROWS - 1 - margin;
  let left = margin, right = GRID_COLS - 1 - margin;
  let layer = 0;
  while (top < bottom - 3 && left < right - 3) {
    // Top wall
    for (let c = left; c <= right; c++) {
      if (layer % 2 === 0 && c >= right - 3) continue;
      if (layer % 2 === 1 && c <= left + 3) continue;
      blocked.push({ col: c, row: top });
    }
    // Right wall
    for (let r = top + 1; r <= bottom; r++) {
      if (layer % 2 === 0 && r >= bottom - 3) continue;
      if (layer % 2 === 1 && r <= top + 4) continue;
      blocked.push({ col: right, row: r });
    }
    // Bottom wall
    for (let c = left; c < right; c++) {
      if (layer % 2 === 0 && c <= left + 3) continue;
      if (layer % 2 === 1 && c >= right - 3) continue;
      blocked.push({ col: c, row: bottom });
    }
    // Left wall
    for (let r = top + 1; r < bottom; r++) {
      if (layer % 2 === 0 && r <= top + 4) continue;
      if (layer % 2 === 1 && r >= bottom - 3) continue;
      blocked.push({ col: left, row: r });
    }
    top += 5; bottom -= 5; left += 5; right -= 5;
    layer++;
  }
  // Brain tanks (blocked circles representing glass tanks)
  blocked.push(...circ(7, 7, 2));
  blocked.push(...circ(29, 7, 2));
  blocked.push(...circ(7, 19, 2));
  blocked.push(...circ(29, 19, 2));

  // NoBuild: neural pathway corridors
  const noBuild: Pos[] = [];
  for (let r = 0; r < GRID_ROWS; r++) noBuild.push({ col: MID_C, row: r });

  return { blocked: blocked.filter(p => inB(p.col, p.row)), noBuild: noBuild.filter(p => inB(p.col, p.row)) };
}

// =====================================================================
// HARMONIC — Concert Hall: amphitheater shape, stage, orchestra pit
// =====================================================================
function buildHarmonic(): { blocked: Pos[]; noBuild: Pos[] } {
  const blocked: Pos[] = [];
  // Curved seating rows (blocked arcs)
  for (let row = 0; row < 3; row++) {
    const y = 3 + row * 5;
    const width = 10 + row * 4;
    for (let c = MID_C - width; c <= MID_C + width; c++) {
      // Arc shape: only block if within a curved band
      const dx = c - MID_C;
      const dist = Math.abs(dx);
      if (dist >= width - 3 && dist <= width && inB(c, y)) {
        blocked.push({ col: c, row: y });
        if (inB(c, y + 1)) blocked.push({ col: c, row: y + 1 });
      }
    }
  }
  // Side walls (theater walls)
  for (let r = 0; r < 16; r++) {
    if (inB(2, r)) blocked.push({ col: 2, row: r });
    if (inB(3, r)) blocked.push({ col: 3, row: r });
    if (inB(GRID_COLS - 3, r)) blocked.push({ col: GRID_COLS - 3, row: r });
    if (inB(GRID_COLS - 4, r)) blocked.push({ col: GRID_COLS - 4, row: r });
  }
  // Instrument pedestals on stage area
  blocked.push(...rect(MID_C - 8, 20, MID_C - 6, 22)); // left instrument
  blocked.push(...rect(MID_C + 6, 20, MID_C + 8, 22)); // right instrument
  blocked.push(...circ(MID_C, 22, 2)); // center drum

  // NoBuild: orchestra pit (wide curved strip)
  const noBuild: Pos[] = [];
  for (let c = MID_C - 12; c <= MID_C + 12; c++) {
    if (inB(c, 17)) noBuild.push({ col: c, row: 17 });
    if (inB(c, 18)) noBuild.push({ col: c, row: 18 });
  }

  return { blocked: blocked.filter(p => inB(p.col, p.row)), noBuild: noBuild.filter(p => inB(p.col, p.row)) };
}

// =====================================================================
// GAUNTLET MAP REGISTRY
// =====================================================================

interface GauntletMapConfig {
  faction: FactionId;
  name: string;
  description: string;
  theme: string;
  entries: Pos[];
  exits: Pos[];
  builder: () => { blocked: Pos[]; noBuild: Pos[] };
}

const GAUNTLET_MAP_CONFIGS: GauntletMapConfig[] = [
  {
    faction: 'arcane', name: 'Crystal Caverns',
    description: 'Winding corridors around a crystal nexus. Wizard towers guard the corners.',
    theme: 'stone', entries: [{ col: 0, row: MID_R }], exits: [{ col: GRID_COLS - 1, row: MID_R }],
    builder: buildArcane,
  },
  {
    faction: 'mechanical', name: 'Iron Foundry',
    description: 'Factory floor grid. Conveyor belts and machine blocks.',
    theme: 'volcanic', entries: [{ col: 0, row: 0 }], exits: [{ col: GRID_COLS - 1, row: GRID_ROWS - 1 }],
    builder: buildMechanical,
  },
  {
    faction: 'nature', name: 'Ancient Grove',
    description: 'Organic clearings among ancient trees. Mushroom rings mark sacred ground.',
    theme: 'forest', entries: [{ col: MID_C, row: GRID_ROWS - 1 }], exits: [{ col: MID_C, row: 0 }],
    builder: buildNature,
  },
  {
    faction: 'void', name: 'Rift Dimension',
    description: 'Floating islands over the void. Narrow bridges are your only path.',
    theme: 'water',
    entries: [{ col: 0, row: MID_R }, { col: MID_C, row: 0 }],
    exits: [{ col: GRID_COLS - 1, row: MID_R }],
    builder: buildVoid,
  },
  {
    faction: 'military', name: 'Warzone Outpost',
    description: 'Ruined city grid. Buildings and rubble create urban choke points.',
    theme: 'mountain', entries: [{ col: GRID_COLS - 1, row: MID_R }], exits: [{ col: 0, row: MID_R }],
    builder: buildMilitary,
  },
  {
    faction: 'aliens', name: 'Hive Tunnels',
    description: 'Carved tunnel network through the hive. Acid pools at junctions.',
    theme: 'forest',
    entries: [{ col: 0, row: 5 }, { col: 0, row: MID_R }, { col: 0, row: 20 }],
    exits: [{ col: GRID_COLS - 1, row: MID_R }],
    builder: buildAliens,
  },
  {
    faction: 'cypherpunk', name: 'Data Grid',
    description: 'Symmetric circuit board. Processor blocks and data bus traces.',
    theme: 'stone', entries: [{ col: 0, row: MID_R }], exits: [{ col: GRID_COLS - 1, row: MID_R }],
    builder: buildCypherpunk,
  },
  {
    faction: 'infernal', name: 'Hellscape',
    description: 'Lava rivers with bridge crossings. Stalagmites and brimstone.',
    theme: 'volcanic', entries: [{ col: MID_C, row: 0 }], exits: [{ col: MID_C, row: GRID_ROWS - 1 }],
    builder: buildInfernal,
  },
  {
    faction: 'celestial', name: 'Sky Citadel',
    description: 'Marble pillars and open courtyards above the clouds.',
    theme: 'stone', entries: [{ col: MID_C, row: GRID_ROWS - 1 }], exits: [{ col: MID_C, row: 2 }],
    builder: buildCelestial,
  },
  {
    faction: 'psionic', name: 'Mind Palace',
    description: 'Spiral corridors converging to the core thought. Brain tanks pulse.',
    theme: 'water', entries: [{ col: 0, row: 0 }], exits: [{ col: MID_C, row: MID_R }],
    builder: buildPsionic,
  },
  {
    faction: 'harmonic', name: 'Concert Hall',
    description: 'Amphitheater with curved rows and orchestra pit. Center stage awaits.',
    theme: 'stone',
    entries: [{ col: MID_C, row: 0 }],
    exits: [{ col: MID_C, row: GRID_ROWS - 1 }],
    builder: buildHarmonic,
  },
];

/** Get the gauntlet map for a given faction */
export function getGauntletMap(faction: FactionId): MapDefinition {
  const config = GAUNTLET_MAP_CONFIGS.find(m => m.faction === faction);
  if (!config) throw new Error(`No gauntlet map for faction: ${faction}`);
  const { blocked, noBuild } = config.builder();
  const mapId = `gauntlet_${config.faction}` as any;
  return {
    id: mapId,
    name: config.name,
    description: config.description,
    theme: config.theme,
    entries: config.entries,
    exits: config.exits,
    blocked,
    noBuild,
  };
}

/** Get all gauntlet faction IDs (excluding a given player faction) */
export function getGauntletFactions(excludeFaction: FactionId): FactionId[] {
  return GAUNTLET_MAP_CONFIGS
    .map(m => m.faction)
    .filter(f => f !== excludeFaction);
}

/** Shuffle an array (Fisher-Yates) */
export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
