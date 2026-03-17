import { GRID_COLS, GRID_ROWS } from '../config';

export type MapId = 'plains' | 'crossroads' | 'fortress' | 'serpentine' | 'islands' | 'gauntlet' | 'spiral' | 'siege';

export interface MapDefinition {
  id: MapId;
  name: string;
  description: string;
  entries: { col: number; row: number }[];
  exits: { col: number; row: number }[];
  blocked: { col: number; row: number }[];
  noBuild: { col: number; row: number }[];
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
};

export const MAP_ORDER: MapId[] = ['plains', 'crossroads', 'fortress', 'serpentine', 'islands', 'gauntlet', 'spiral', 'siege'];
