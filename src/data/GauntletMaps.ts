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
// MECHANICAL — Iron Foundry: asymmetric factory with assembly line + furnaces
// =====================================================================
function buildMechanical(): { blocked: Pos[]; noBuild: Pos[] } {
  const blocked: Pos[] = [];
  // Main furnace (large, center-left)
  blocked.push(...rect(3, 4, 8, 9));
  // Secondary furnace (center-right)
  blocked.push(...rect(27, 4, 32, 8));
  // Stamping press (mid, large rectangle)
  blocked.push(...rect(14, 10, 21, 14));
  // Gear assembly stations (small scattered)
  blocked.push(...rect(4, 16, 6, 18));
  blocked.push(...rect(10, 19, 12, 21));
  blocked.push(...rect(25, 17, 28, 19));
  // Smokestacks (narrow tall)
  blocked.push(...rect(1, 1, 2, 4));
  blocked.push(...rect(33, 1, 34, 5));
  // Cooling tanks (circles)
  blocked.push(...circ(11, 5, 2));
  blocked.push(...circ(24, 22, 2));
  // Pipe junction (small)
  blocked.push(...rect(19, 2, 20, 3));
  // Scrap pile
  blocked.push({ col: 30, row: 12 }); blocked.push({ col: 31, row: 12 }); blocked.push({ col: 30, row: 13 });

  // NoBuild: conveyor belt segments (short runs, not full-width)
  const noBuild: Pos[] = [];
  // Conveyor from furnace to press
  for (let c = 9; c <= 13; c++) noBuild.push({ col: c, row: 12 });
  // Conveyor from press to assembly
  for (let c = 22; c <= 24; c++) noBuild.push({ col: c, row: 12 });
  // Conveyor south run
  for (let r = 15; r <= 18; r++) noBuild.push({ col: 17, row: r });
  // Steam vent patches
  noBuild.push(...circ(8, 22, 1));
  noBuild.push(...circ(33, 15, 1));

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
// MILITARY — Warzone Outpost: ruined forward operating base with varied structures
// =====================================================================
function buildMilitary(): { blocked: Pos[]; noBuild: Pos[] } {
  const blocked: Pos[] = [];
  // HQ building (large, top-left)
  blocked.push(...rect(2, 2, 6, 5));
  // Barracks (medium, top-right)
  blocked.push(...rect(27, 2, 31, 4));
  // Motor pool / garage (wide, mid-left)
  blocked.push(...rect(1, 11, 5, 14));
  // Guard towers (small 2x2 pillboxes)
  blocked.push(...rect(14, 2, 15, 3));
  blocked.push(...rect(21, 2, 22, 3));
  blocked.push(...rect(10, 22, 11, 23));
  blocked.push(...rect(25, 22, 26, 23));
  // Comms tower (tall narrow)
  blocked.push(...rect(34, 9, 35, 13));
  // Supply depot (mid-right)
  blocked.push(...rect(28, 12, 32, 14));
  // Ruined building (L-shaped, south)
  blocked.push(...rect(15, 18, 19, 21));
  blocked.push(...rect(20, 19, 22, 21));
  // Sandbag bunkers (small scattered)
  blocked.push(...rect(9, 8, 10, 9));
  blocked.push(...rect(18, 9, 19, 10));
  // Rubble piles (single cells)
  blocked.push({ col: 12, row: 14 });
  blocked.push({ col: 24, row: 8 });
  blocked.push({ col: 7, row: 20 });

  // NoBuild: bomb craters + barbed wire clusters (small, scattered, maze-friendly)
  const noBuild: Pos[] = [];
  // Crater NW
  noBuild.push(...circ(8, 5, 1));
  // Crater center
  noBuild.push(...circ(17, 13, 1));
  // Barbed wire patch SW
  noBuild.push({ col: 3, row: 18 }); noBuild.push({ col: 4, row: 18 }); noBuild.push({ col: 5, row: 18 });
  // Barbed wire patch E
  noBuild.push({ col: 30, row: 8 }); noBuild.push({ col: 31, row: 8 }); noBuild.push({ col: 30, row: 9 });
  // Crater SE
  noBuild.push(...circ(27, 19, 1));

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
// CYPHERPUNK — Data Grid: underground hacker lair with mainframes + fighting pit
// =====================================================================
function buildCypherpunk(): { blocked: Pos[]; noBuild: Pos[] } {
  const blocked: Pos[] = [];
  // Server mainframes (tall narrow racks)
  blocked.push(...rect(4, 2, 6, 7));
  blocked.push(...rect(29, 2, 31, 7));
  blocked.push(...rect(4, 17, 6, 22));
  blocked.push(...rect(29, 17, 31, 22));
  // Central data pit / fighting ring (circular arena)
  blocked.push(...circ(MID_C, MID_R, 4));
  // Terminal stations (small blocks)
  blocked.push(...rect(12, 4, 14, 5));
  blocked.push(...rect(21, 4, 23, 5));
  blocked.push(...rect(12, 20, 14, 21));
  blocked.push(...rect(21, 20, 23, 21));
  // Network switches (tiny)
  blocked.push(...rect(10, 12, 11, 13));
  blocked.push(...rect(24, 12, 25, 13));
  // Power supply (corner)
  blocked.push(...rect(0, 0, 2, 2));
  blocked.push(...rect(33, 23, 35, 25));

  // NoBuild: data cable runs (short segments connecting mainframes to center)
  const noBuild: Pos[] = [];
  // Cable run left mainframes → center
  for (let c = 7; c <= 10; c++) { noBuild.push({ col: c, row: 10 }); noBuild.push({ col: c, row: 15 }); }
  // Cable run right mainframes → center
  for (let c = 25; c <= 28; c++) { noBuild.push({ col: c, row: 10 }); noBuild.push({ col: c, row: 15 }); }
  // Holographic display pads
  noBuild.push(...circ(MID_C, 3, 1));
  noBuild.push(...circ(MID_C, 22, 1));

  return { blocked: blocked.filter(p => inB(p.col, p.row)), noBuild: noBuild.filter(p => inB(p.col, p.row)) };
}

// =====================================================================
// INFERNAL — Hellscape: demon's throne room with lava pools + obsidian spires
// =====================================================================
function buildInfernal(): { blocked: Pos[]; noBuild: Pos[] } {
  const blocked: Pos[] = [];
  // Central lava lake (large animated pool)
  blocked.push(...circ(MID_C, MID_R, 4));
  // Demon throne (large blocked platform, north)
  blocked.push(...rect(MID_C - 3, 1, MID_C + 3, 4));
  // Obsidian spires (tall narrow pillars scattered around)
  blocked.push(...rect(4, 4, 5, 8));     // NW spire
  blocked.push(...rect(30, 4, 31, 8));    // NE spire
  blocked.push(...rect(4, 17, 5, 21));    // SW spire
  blocked.push(...rect(30, 17, 31, 21));   // SE spire
  // Bone piles / rubble
  blocked.push(...circ(10, 7, 2));
  blocked.push(...circ(25, 7, 2));
  blocked.push(...circ(10, 19, 2));
  blocked.push(...circ(25, 19, 2));
  // Imp cages (small structures)
  blocked.push(...rect(14, 8, 15, 9));
  blocked.push(...rect(20, 8, 21, 9));
  // Sacrifice altar (south)
  blocked.push(...rect(MID_C - 2, 21, MID_C + 2, 23));

  // NoBuild: lava seepage pools (small scattered, walkable but scorched)
  const noBuild: Pos[] = [];
  noBuild.push(...circ(8, 12, 1));    // lava seep W
  noBuild.push(...circ(27, 12, 1));   // lava seep E
  noBuild.push(...circ(MID_C, 7, 1)); // lava drip N
  noBuild.push(...circ(MID_C, 19, 1)); // lava drip S
  noBuild.push({ col: 15, row: 15 }); noBuild.push({ col: 20, row: 15 }); // ember patches

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
// PSIONIC — Mind Palace: brain vats, thought corridors, neural chambers
// =====================================================================
function buildPsionic(): { blocked: Pos[]; noBuild: Pos[] } {
  const blocked: Pos[] = [];
  // Brain vats — tall rectangular tanks (2-3 wide × 4-5 tall)
  blocked.push(...rect(4, 3, 6, 7));     // Vat NW
  blocked.push(...rect(29, 3, 31, 7));    // Vat NE
  blocked.push(...rect(4, 17, 6, 21));    // Vat SW
  blocked.push(...rect(29, 17, 31, 21));   // Vat SE
  // Central consciousness core (large circle)
  blocked.push(...circ(MID_C, MID_R, 3));
  // Thought amplifier pillars
  blocked.push(...rect(13, 5, 14, 7));
  blocked.push(...rect(21, 5, 22, 7));
  blocked.push(...rect(13, 18, 14, 20));
  blocked.push(...rect(21, 18, 22, 20));
  // Memory banks (small rectangles)
  blocked.push(...rect(10, 11, 12, 13));
  blocked.push(...rect(23, 11, 25, 13));
  // Synapse nodes (single cells)
  blocked.push({ col: 17, row: 3 }); blocked.push({ col: 18, row: 3 });
  blocked.push({ col: 17, row: 22 }); blocked.push({ col: 18, row: 22 });

  // NoBuild: neural pathway patches (small clusters, not full lines)
  const noBuild: Pos[] = [];
  // Thought conduits (short segments connecting vats to core)
  for (let c = 7; c <= 9; c++) noBuild.push({ col: c, row: MID_R });
  for (let c = 26; c <= 28; c++) noBuild.push({ col: c, row: MID_R });
  // Psionic field patches
  noBuild.push(...circ(9, 4, 1));
  noBuild.push(...circ(26, 4, 1));
  noBuild.push(...circ(9, 21, 1));
  noBuild.push(...circ(26, 21, 1));

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
    theme: 'arcane_crystal', entries: [{ col: 0, row: MID_R }], exits: [{ col: GRID_COLS - 1, row: MID_R }],
    builder: buildArcane,
  },
  {
    faction: 'mechanical', name: 'Iron Foundry',
    description: 'Factory floor grid. Conveyor belts and machine blocks.',
    theme: 'factory', entries: [{ col: 0, row: 0 }], exits: [{ col: GRID_COLS - 1, row: GRID_ROWS - 1 }],
    builder: buildMechanical,
  },
  {
    faction: 'nature', name: 'Ancient Grove',
    description: 'Organic clearings among ancient trees. Mushroom rings mark sacred ground.',
    theme: 'ancient_grove', entries: [{ col: MID_C, row: GRID_ROWS - 1 }], exits: [{ col: MID_C, row: 0 }],
    builder: buildNature,
  },
  {
    faction: 'void', name: 'Rift Dimension',
    description: 'Floating islands over the void. Narrow bridges are your only path.',
    theme: 'void_rift',
    entries: [{ col: 0, row: MID_R }, { col: MID_C, row: 0 }],
    exits: [{ col: GRID_COLS - 1, row: MID_R }],
    builder: buildVoid,
  },
  {
    faction: 'military', name: 'Warzone Outpost',
    description: 'Ruined city grid. Buildings and rubble create urban choke points.',
    theme: 'urban', entries: [{ col: GRID_COLS - 1, row: MID_R }], exits: [{ col: 0, row: MID_R }],
    builder: buildMilitary,
  },
  {
    faction: 'aliens', name: 'Hive Tunnels',
    description: 'Carved tunnel network through the hive. Acid pools at junctions.',
    theme: 'hive',
    entries: [{ col: 0, row: 5 }, { col: 0, row: MID_R }, { col: 0, row: 20 }],
    exits: [{ col: GRID_COLS - 1, row: MID_R }],
    builder: buildAliens,
  },
  {
    faction: 'cypherpunk', name: 'Data Grid',
    description: 'Symmetric circuit board. Processor blocks and data bus traces.',
    theme: 'circuit', entries: [{ col: 0, row: MID_R }], exits: [{ col: GRID_COLS - 1, row: MID_R }],
    builder: buildCypherpunk,
  },
  {
    faction: 'infernal', name: 'Hellscape',
    description: 'Lava rivers with bridge crossings. Stalagmites and brimstone.',
    theme: 'hellscape', entries: [{ col: MID_C, row: 0 }], exits: [{ col: MID_C, row: GRID_ROWS - 1 }],
    builder: buildInfernal,
  },
  {
    faction: 'celestial', name: 'Sky Citadel',
    description: 'Marble pillars and open courtyards above the clouds.',
    theme: 'marble', entries: [{ col: MID_C, row: GRID_ROWS - 1 }], exits: [{ col: MID_C, row: 2 }],
    builder: buildCelestial,
  },
  {
    faction: 'psionic', name: 'Mind Palace',
    description: 'Spiral corridors converging to the core thought. Brain tanks pulse.',
    theme: 'neural', entries: [{ col: 0, row: 0 }], exits: [{ col: MID_C, row: MID_R }],
    builder: buildPsionic,
  },
  {
    faction: 'harmonic', name: 'Concert Hall',
    description: 'Amphitheater with curved rows and orchestra pit. Center stage awaits.',
    theme: 'concert',
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
