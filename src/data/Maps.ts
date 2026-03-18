import { GRID_COLS, GRID_ROWS } from '../config';

export type MapId = 'plains' | 'crossroads' | 'fortress' | 'serpentine' | 'islands' | 'gauntlet' | 'spiral' | 'siege' | 'hero_plains' | 'circle_2p' | 'circle_3p' | 'circle_4p';

export interface MapDefinition {
  id: MapId;
  name: string;
  description: string;
  entries: { col: number; row: number }[];
  exits: { col: number; row: number }[];
  blocked: { col: number; row: number }[];
  noBuild: { col: number; row: number }[];
  /** Circle co-op: zone definitions. zones[i] = list of cells player i can build on. */
  zones?: { col: number; row: number }[][];
  /** Circle co-op: zone colors for rendering */
  zoneColors?: number[];
  /** Circle co-op: number of players this map supports */
  circlePlayers?: number;
}

const MID_COL = Math.floor(GRID_COLS / 2);
const MID_ROW = Math.floor(GRID_ROWS / 2);
type Pos = { col: number; row: number };

function inBounds(c: number, r: number): boolean {
  return c >= 0 && c < GRID_COLS && r >= 0 && r < GRID_ROWS;
}

/** Generate a filled rectangle of positions */
function rect(c1: number, r1: number, c2: number, r2: number): Pos[] {
  const ps: Pos[] = [];
  for (let c = c1; c <= c2; c++) {
    for (let r = r1; r <= r2; r++) {
      if (inBounds(c, r)) ps.push({ col: c, row: r });
    }
  }
  return ps;
}

/** Generate a filled circle of positions */
function circle(cx: number, cy: number, radius: number): Pos[] {
  const ps: Pos[] = [];
  for (let c = cx - radius; c <= cx + radius; c++) {
    for (let r = cy - radius; r <= cy + radius; r++) {
      const dx = c - cx, dy = r - cy;
      if (dx * dx + dy * dy <= radius * radius && inBounds(c, r)) {
        ps.push({ col: c, row: r });
      }
    }
  }
  return ps;
}

export const MAPS: Record<MapId, MapDefinition> = {
  plains: {
    id: 'plains',
    name: 'Plains',
    description: 'Open field. Two lakes force creative pathing.',
    entries: [{ col: 0, row: MID_ROW }],
    exits: [{ col: GRID_COLS - 1, row: MID_ROW }],
    blocked: [
      // Lake in upper half
      ...circle(10, 5, 3),
      // Lake in lower half
      ...circle(GRID_COLS - 12, GRID_ROWS - 7, 3),
    ],
    noBuild: [],
  },
  crossroads: {
    id: 'crossroads',
    name: 'Crossroads',
    description: 'Two entries. Mountain range divides the map.',
    entries: [
      { col: 0, row: 4 },
      { col: 0, row: GRID_ROWS - 5 },
    ],
    exits: [{ col: GRID_COLS - 1, row: MID_ROW }],
    blocked: [
      // Mountain range across middle with 3-wide gaps
      ...Array.from({ length: GRID_COLS }, (_, c) => {
        if (c >= MID_COL - 1 && c <= MID_COL + 1) return null; // center gap
        if (c <= 2 || c >= GRID_COLS - 3) return null; // edge gaps
        return { col: c, row: MID_ROW };
      }).filter(Boolean) as Pos[],
      // Mountain pillars flanking the gaps
      ...rect(MID_COL - 3, MID_ROW - 2, MID_COL - 2, MID_ROW - 1),
      ...rect(MID_COL + 2, MID_ROW + 1, MID_COL + 3, MID_ROW + 2),
    ],
    noBuild: [
      // Small no-build near exit convergence
      ...rect(GRID_COLS - 4, MID_ROW - 1, GRID_COLS - 3, MID_ROW + 1),
    ],
  },
  fortress: {
    id: 'fortress',
    name: 'Fortress',
    description: 'Three entries. Stone walls around the center exit.',
    entries: [
      { col: 0, row: MID_ROW },
      { col: GRID_COLS - 1, row: MID_ROW },
      { col: MID_COL, row: 0 },
    ],
    exits: [{ col: MID_COL, row: MID_ROW }],
    blocked: (() => {
      const b: Pos[] = [];
      // Fortress wall ring with gaps at cardinal directions
      for (let dc = -4; dc <= 4; dc++) {
        for (let dr = -4; dr <= 4; dr++) {
          const c = MID_COL + dc, r = MID_ROW + dr;
          const isEdge = Math.abs(dc) >= 3 || Math.abs(dr) >= 3;
          const isCorner = Math.abs(dc) >= 3 && Math.abs(dr) >= 3;
          const isGap = (dc === 0 && Math.abs(dr) >= 3) || (dr === 0 && Math.abs(dc) >= 3);
          if (isEdge && !isCorner && !isGap && inBounds(c, r)) {
            b.push({ col: c, row: r });
          }
        }
      }
      // Corner towers
      b.push(...rect(MID_COL - 5, MID_ROW - 5, MID_COL - 4, MID_ROW - 4));
      b.push(...rect(MID_COL + 4, MID_ROW - 5, MID_COL + 5, MID_ROW - 4));
      b.push(...rect(MID_COL - 5, MID_ROW + 4, MID_COL - 4, MID_ROW + 5));
      b.push(...rect(MID_COL + 4, MID_ROW + 4, MID_COL + 5, MID_ROW + 5));
      return b.filter(p => inBounds(p.col, p.row));
    })(),
    noBuild: [],
  },
  serpentine: {
    id: 'serpentine',
    name: 'Serpentine',
    description: 'Canyon walls force a winding path.',
    entries: [{ col: 0, row: 2 }],
    exits: [{ col: GRID_COLS - 1, row: GRID_ROWS - 3 }],
    blocked: (() => {
      const b: Pos[] = [];
      // Horizontal canyon walls creating snake pattern
      const wallRows = [5, 10, 15, 20];
      for (let i = 0; i < wallRows.length; i++) {
        const r = wallRows[i];
        if (r >= GRID_ROWS) continue;
        const startCol = (i % 2 === 0) ? 5 : 0;
        const endCol = (i % 2 === 0) ? GRID_COLS : GRID_COLS - 5;
        for (let c = startCol; c < endCol; c++) {
          if (inBounds(c, r)) b.push({ col: c, row: r });
          // Thicker walls (2 high)
          if (inBounds(c, r + 1)) b.push({ col: c, row: r + 1 });
        }
      }
      return b;
    })(),
    noBuild: [],
  },
  islands: {
    id: 'islands',
    name: 'Islands',
    description: 'Build zones separated by mountain ridges and lakes.',
    entries: [{ col: 0, row: MID_ROW }],
    exits: [{ col: GRID_COLS - 1, row: MID_ROW }],
    blocked: (() => {
      const b: Pos[] = [];
      const r1 = Math.floor(GRID_COLS / 3);
      const r2 = Math.floor(GRID_COLS * 2 / 3);
      // Vertical mountain ridges with path gaps
      for (let r = 0; r < GRID_ROWS; r++) {
        if (r >= MID_ROW - 1 && r <= MID_ROW + 1) continue; // path gap
        if (r >= 3 && r <= 5) continue; // upper gap
        if (r >= GRID_ROWS - 6 && r <= GRID_ROWS - 4) continue; // lower gap
        b.push({ col: r1, row: r });
        b.push({ col: r1 + 1, row: r });
        b.push({ col: r2, row: r });
        b.push({ col: r2 - 1, row: r });
      }
      // Lakes in corners
      b.push(...circle(5, 4, 2));
      b.push(...circle(GRID_COLS - 6, 4, 2));
      b.push(...circle(5, GRID_ROWS - 5, 2));
      b.push(...circle(GRID_COLS - 6, GRID_ROWS - 5, 2));
      return b.filter(p => inBounds(p.col, p.row));
    })(),
    noBuild: [],
  },
  gauntlet: {
    id: 'gauntlet',
    name: 'Gauntlet',
    description: 'Four entries. Volcanic pillars block the field.',
    entries: [
      { col: 0, row: MID_ROW },
      { col: GRID_COLS - 1, row: MID_ROW },
      { col: MID_COL, row: 0 },
      { col: MID_COL, row: GRID_ROWS - 1 },
    ],
    exits: [{ col: MID_COL, row: MID_ROW }],
    blocked: (() => {
      const b: Pos[] = [];
      // Large volcanic pillars scattered around
      const pillars: [number, number, number][] = [
        [MID_COL - 7, MID_ROW - 5, 2],
        [MID_COL + 7, MID_ROW - 5, 2],
        [MID_COL - 7, MID_ROW + 5, 2],
        [MID_COL + 7, MID_ROW + 5, 2],
        [MID_COL - 4, MID_ROW - 8, 1],
        [MID_COL + 4, MID_ROW - 8, 1],
        [MID_COL - 4, MID_ROW + 8, 1],
        [MID_COL + 4, MID_ROW + 8, 1],
        [MID_COL - 12, MID_ROW, 2],
        [MID_COL + 12, MID_ROW, 2],
      ];
      for (const [pc, pr, rad] of pillars) {
        b.push(...circle(pc, pr, rad));
      }
      return b.filter(p => inBounds(p.col, p.row));
    })(),
    noBuild: [
      // Small no-build around exit
      ...circle(MID_COL, MID_ROW, 2).filter(p => !(p.col === MID_COL && p.row === MID_ROW)),
    ],
  },
  spiral: {
    id: 'spiral',
    name: 'Spiral',
    description: 'Concentric walls spiral to the center.',
    entries: [{ col: 0, row: 0 }],
    exits: [{ col: MID_COL, row: MID_ROW }],
    blocked: (() => {
      const b: Pos[] = [];
      const margin = 2;
      let top = margin, bottom = GRID_ROWS - 1 - margin;
      let left = margin, right = GRID_COLS - 1 - margin;
      let layer = 0;

      while (top < bottom - 2 && left < right - 2) {
        // Top wall
        for (let c = left; c <= right; c++) {
          if (layer % 2 === 0 && c >= right - 2) continue;
          if (layer % 2 === 1 && c <= left + 2) continue;
          b.push({ col: c, row: top });
        }
        // Right wall
        for (let r = top + 1; r <= bottom; r++) {
          if (layer % 2 === 0 && r >= bottom - 2) continue;
          if (layer % 2 === 1 && r <= top + 3) continue;
          b.push({ col: right, row: r });
        }
        // Bottom wall
        for (let c = left; c < right; c++) {
          if (layer % 2 === 0 && c <= left + 2) continue;
          if (layer % 2 === 1 && c >= right - 2) continue;
          b.push({ col: c, row: bottom });
        }
        // Left wall
        for (let r = top + 1; r < bottom; r++) {
          if (layer % 2 === 0 && r <= top + 3) continue;
          if (layer % 2 === 1 && r >= bottom - 2) continue;
          b.push({ col: left, row: r });
        }
        top += 4; bottom -= 4; left += 4; right -= 4;
        layer++;
      }
      return b.filter(p => inBounds(p.col, p.row));
    })(),
    noBuild: [],
  },
  siege: {
    id: 'siege',
    name: 'Siege',
    description: 'Mirrored halves. River divides with bridge gaps.',
    entries: [
      { col: 0, row: Math.floor(GRID_ROWS / 4) },
      { col: 0, row: Math.floor(GRID_ROWS * 3 / 4) },
    ],
    exits: [
      { col: GRID_COLS - 1, row: Math.floor(GRID_ROWS / 4) },
      { col: GRID_COLS - 1, row: Math.floor(GRID_ROWS * 3 / 4) },
    ],
    blocked: (() => {
      const b: Pos[] = [];
      // River across middle (2 tiles wide) with 3 bridge gaps
      const bridgeCols = [6, MID_COL, GRID_COLS - 7];
      for (let c = 0; c < GRID_COLS; c++) {
        const isBridge = bridgeCols.some(bc => Math.abs(c - bc) <= 1);
        if (!isBridge) {
          b.push({ col: c, row: MID_ROW });
          b.push({ col: c, row: MID_ROW - 1 });
        }
      }
      // Boulder clusters near bridges
      for (const bc of bridgeCols) {
        b.push(...circle(bc - 3, MID_ROW - 4, 1));
        b.push(...circle(bc + 3, MID_ROW + 3, 1));
      }
      return b.filter(p => inBounds(p.col, p.row));
    })(),
    noBuild: [],
  },
  hero_plains: {
    id: 'hero_plains',
    name: 'Hero Plains',
    description: 'Open field for Hero Defense. 12 rows.',
    entries: [{ col: 0, row: 6 }],
    exits: [{ col: GRID_COLS - 1, row: 6 }],
    blocked: [
      // Two small lakes
      ...circle(10, 3, 2),
      ...circle(GRID_COLS - 12, 9, 2),
    ],
    noBuild: [],
  },
  // === Circle Co-op Maps ===
  // Creeps enter from each player's spawn, loop through all zones, exit where they entered.
  // Each entry is also the exit for creeps completing the loop.
  // The pathfinding routes from each entry through the map and back to that same entry.

  circle_2p: (() => {
    // 2-player: left half (P0) and right half (P1)
    // Creeps enter left → travel right → loop back left, and vice versa
    // Central wall with gaps forces a long path through both halves
    const blocked: Pos[] = [];
    // Central dividing wall (column 17-18) with gaps at top and bottom
    for (let r = 3; r < GRID_ROWS - 3; r++) {
      if (r >= MID_ROW - 2 && r <= MID_ROW + 2) continue; // center gap
      blocked.push({ col: MID_COL, row: r });
      blocked.push({ col: MID_COL - 1, row: r });
    }
    // Obstacles in each half to create interesting pathing
    blocked.push(...circle(8, 6, 2));
    blocked.push(...circle(8, GRID_ROWS - 7, 2));
    blocked.push(...circle(GRID_COLS - 9, 6, 2));
    blocked.push(...circle(GRID_COLS - 9, GRID_ROWS - 7, 2));

    // Zones: left half = P0, right half = P1
    const zone0: Pos[] = [];
    const zone1: Pos[] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      for (let r = 0; r < GRID_ROWS; r++) {
        if (blocked.some(b => b.col === c && b.row === r)) continue;
        if (c < MID_COL - 1) zone0.push({ col: c, row: r });
        else if (c > MID_COL) zone1.push({ col: c, row: r });
      }
    }

    return {
      id: 'circle_2p' as MapId,
      name: 'Circle 2P',
      description: '2-player co-op. Creeps loop through both halves.',
      entries: [
        { col: 0, row: MID_ROW },           // P0 spawn (left)
        { col: GRID_COLS - 1, row: MID_ROW }, // P1 spawn (right)
      ],
      exits: [
        { col: 0, row: MID_ROW },           // P0 exit (same as entry)
        { col: GRID_COLS - 1, row: MID_ROW }, // P1 exit (same as entry)
      ],
      blocked,
      noBuild: [] as Pos[],
      zones: [zone0, zone1],
      zoneColors: [0xff4444, 0x4488ff],
      circlePlayers: 2,
    };
  })(),

  circle_3p: (() => {
    // 3-player: three zones arranged in a triangle-ish layout
    // P0 = top-left, P1 = top-right, P2 = bottom
    // Creeps enter from 3 edges and loop through all 3 zones
    const blocked: Pos[] = [];

    // Y-shaped walls creating 3 sectors with gaps for path flow
    // Vertical wall from center upward
    for (let r = 0; r < MID_ROW - 2; r++) {
      if (r <= 1) continue;
      blocked.push({ col: MID_COL, row: r });
    }
    // Diagonal walls from center to bottom-left and bottom-right
    for (let i = 1; i < 10; i++) {
      const r = MID_ROW + i;
      if (r >= GRID_ROWS - 1) break;
      const cL = MID_COL - i;
      const cR = MID_COL + i;
      if (i >= 3 && i <= 5) continue; // gaps in diagonals
      if (cL >= 2) blocked.push({ col: cL, row: r });
      if (cR < GRID_COLS - 2) blocked.push({ col: cR, row: r });
    }

    // Obstacles per zone
    blocked.push(...circle(7, 5, 2));
    blocked.push(...circle(GRID_COLS - 8, 5, 2));
    blocked.push(...circle(MID_COL, GRID_ROWS - 6, 2));

    // Zones: top-left (P0), top-right (P1), bottom (P2)
    // Use Y-wall diagonals to determine zone boundaries below MID_ROW
    const zone0: Pos[] = [];
    const zone1: Pos[] = [];
    const zone2: Pos[] = [];
    for (let c = 0; c < GRID_COLS; c++) {
      for (let r = 0; r < GRID_ROWS; r++) {
        if (blocked.some(b => b.col === c && b.row === r)) continue;
        if (r <= MID_ROW) {
          // Above or at center: split left/right
          if (c < MID_COL) zone0.push({ col: c, row: r });
          else zone1.push({ col: c, row: r });
        } else {
          // Below center: use diagonal lines from center
          // Left diagonal: col = MID_COL - (r - MID_ROW)
          // Right diagonal: col = MID_COL + (r - MID_ROW)
          const distFromCenter = r - MID_ROW;
          const leftBound = MID_COL - distFromCenter;
          const rightBound = MID_COL + distFromCenter;
          if (c < leftBound) zone0.push({ col: c, row: r });
          else if (c > rightBound) zone1.push({ col: c, row: r });
          else zone2.push({ col: c, row: r });
        }
      }
    }

    return {
      id: 'circle_3p' as MapId,
      name: 'Circle 3P',
      description: '3-player co-op. Y-shaped paths through 3 zones.',
      entries: [
        { col: 0, row: 4 },                    // P0 spawn (top-left)
        { col: GRID_COLS - 1, row: 4 },        // P1 spawn (top-right)
        { col: MID_COL, row: GRID_ROWS - 1 },  // P2 spawn (bottom)
      ],
      exits: [
        { col: 0, row: 4 },
        { col: GRID_COLS - 1, row: 4 },
        { col: MID_COL, row: GRID_ROWS - 1 },
      ],
      blocked,
      noBuild: [] as Pos[],
      zones: [zone0, zone1, zone2],
      zoneColors: [0xff4444, 0x44ff44, 0x4488ff],
      circlePlayers: 3,
    };
  })(),

  circle_4p: (() => {
    // 4-player: four quadrants (matching the user's image)
    // P0 = top-left, P1 = top-right, P2 = bottom-right, P3 = bottom-left
    // Central cross-shaped wall with gaps creates 4 connected quadrants
    // Creeps loop: P0→P1→P2→P3→P0
    const blocked: Pos[] = [];

    // Horizontal wall across middle with gaps
    for (let c = 3; c < GRID_COLS - 3; c++) {
      if (c >= MID_COL - 2 && c <= MID_COL + 1) continue; // center gap
      if (c >= 8 && c <= 10) continue; // left gap
      if (c >= GRID_COLS - 11 && c <= GRID_COLS - 9) continue; // right gap
      blocked.push({ col: c, row: MID_ROW });
    }
    // Vertical wall down middle with gaps
    for (let r = 3; r < GRID_ROWS - 3; r++) {
      if (r >= MID_ROW - 2 && r <= MID_ROW + 1) continue; // center gap
      if (r >= 5 && r <= 7) continue; // top gap
      if (r >= GRID_ROWS - 8 && r <= GRID_ROWS - 6) continue; // bottom gap
      blocked.push({ col: MID_COL, row: r });
    }

    // Central island (like in the user's image)
    blocked.push(...circle(MID_COL, MID_ROW, 3).filter(p =>
      // Leave the gap corridors open
      !(p.row >= MID_ROW - 1 && p.row <= MID_ROW + 1 && (p.col < MID_COL - 1 || p.col > MID_COL + 1)) &&
      !(p.col >= MID_COL - 1 && p.col <= MID_COL + 1 && (p.row < MID_ROW - 1 || p.row > MID_ROW + 1))
    ));

    // Corner obstacles per quadrant
    blocked.push(...circle(7, 5, 2));
    blocked.push(...circle(GRID_COLS - 8, 5, 2));
    blocked.push(...circle(7, GRID_ROWS - 6, 2));
    blocked.push(...circle(GRID_COLS - 8, GRID_ROWS - 6, 2));

    // Zones: 4 quadrants
    const zones: Pos[][] = [[], [], [], []];
    for (let c = 0; c < GRID_COLS; c++) {
      for (let r = 0; r < GRID_ROWS; r++) {
        if (blocked.some(b => b.col === c && b.row === r)) continue;
        const left = c < MID_COL;
        const top = r < MID_ROW;
        if (top && left) zones[0].push({ col: c, row: r });
        else if (top && !left) zones[1].push({ col: c, row: r });
        else if (!top && !left) zones[2].push({ col: c, row: r });
        else zones[3].push({ col: c, row: r });
      }
    }

    return {
      id: 'circle_4p' as MapId,
      name: 'Circle 4P',
      description: '4-player co-op. Four quadrants, one big circle.',
      entries: [
        { col: 0, row: 4 },                        // P0 spawn (top-left)
        { col: GRID_COLS - 1, row: 4 },             // P1 spawn (top-right)
        { col: GRID_COLS - 1, row: GRID_ROWS - 5 }, // P2 spawn (bottom-right)
        { col: 0, row: GRID_ROWS - 5 },             // P3 spawn (bottom-left)
      ],
      exits: [
        { col: 0, row: 4 },
        { col: GRID_COLS - 1, row: 4 },
        { col: GRID_COLS - 1, row: GRID_ROWS - 5 },
        { col: 0, row: GRID_ROWS - 5 },
      ],
      blocked,
      noBuild: [] as Pos[],
      zones,
      zoneColors: [0xff4444, 0x44ff44, 0x44aaff, 0xaa44ff],
      circlePlayers: 4,
    };
  })(),
};

export const MAP_ORDER: MapId[] = ['plains', 'crossroads', 'fortress', 'serpentine', 'islands', 'gauntlet', 'spiral', 'siege'];
export const CIRCLE_MAP_ORDER: MapId[] = ['circle_2p', 'circle_3p', 'circle_4p'];
