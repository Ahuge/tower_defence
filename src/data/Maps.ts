import { GRID_COLS, GRID_ROWS } from '../config';

export type MapId = 'plains' | 'crossroads' | 'fortress';

export interface MapDefinition {
  id: MapId;
  name: string;
  description: string;
  entries: { col: number; row: number }[];
  exits: { col: number; row: number }[];
  blocked: { col: number; row: number }[]; // pre-placed terrain
}

export const MAPS: Record<MapId, MapDefinition> = {
  plains: {
    id: 'plains',
    name: 'Plains',
    description: 'Open field. Single entry left, single exit right.',
    entries: [{ col: 0, row: Math.floor(GRID_ROWS / 2) }],
    exits: [{ col: GRID_COLS - 1, row: Math.floor(GRID_ROWS / 2) }],
    blocked: [],
  },
  crossroads: {
    id: 'crossroads',
    name: 'Crossroads',
    description: 'Two entries converge on one exit.',
    entries: [
      { col: 0, row: 4 },
      { col: 0, row: GRID_ROWS - 5 },
    ],
    exits: [{ col: GRID_COLS - 1, row: Math.floor(GRID_ROWS / 2) }],
    blocked: generateCrossroadsBlocked(),
  },
  fortress: {
    id: 'fortress',
    name: 'Fortress',
    description: 'Defend the center from all sides.',
    entries: [
      { col: 0, row: Math.floor(GRID_ROWS / 2) },
      { col: GRID_COLS - 1, row: Math.floor(GRID_ROWS / 2) },
      { col: Math.floor(GRID_COLS / 2), row: 0 },
    ],
    exits: [{ col: Math.floor(GRID_COLS / 2), row: Math.floor(GRID_ROWS / 2) }],
    blocked: generateFortressBlocked(),
  },
};

export const MAP_ORDER: MapId[] = ['plains', 'crossroads', 'fortress'];

function generateCrossroadsBlocked(): { col: number; row: number }[] {
  const blocked: { col: number; row: number }[] = [];
  // Center divider with gaps
  const midRow = Math.floor(GRID_ROWS / 2);
  for (let col = 3; col < GRID_COLS - 3; col++) {
    if (col === Math.floor(GRID_COLS / 2) || col === Math.floor(GRID_COLS / 2) - 1 || col === Math.floor(GRID_COLS / 2) + 1) continue;
    blocked.push({ col, row: midRow });
  }
  return blocked;
}

function generateFortressBlocked(): { col: number; row: number }[] {
  const blocked: { col: number; row: number }[] = [];
  const cx = Math.floor(GRID_COLS / 2);
  const cy = Math.floor(GRID_ROWS / 2);

  // Ring of walls around center with gaps for paths
  for (let dc = -3; dc <= 3; dc++) {
    for (let dr = -3; dr <= 3; dr++) {
      const c = cx + dc;
      const r = cy + dr;
      const isEdge = Math.abs(dc) === 3 || Math.abs(dr) === 3;
      const isGap = (dc === 0 && Math.abs(dr) === 3) || (dr === 0 && Math.abs(dc) === 3);
      if (isEdge && !isGap && c > 0 && c < GRID_COLS - 1 && r > 0 && r < GRID_ROWS - 1) {
        blocked.push({ col: c, row: r });
      }
    }
  }
  return blocked;
}
