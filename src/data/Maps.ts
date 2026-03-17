import { GRID_COLS, GRID_ROWS } from '../config';

export type MapId = 'plains' | 'crossroads' | 'fortress';

export interface MapDefinition {
  id: MapId;
  name: string;
  description: string;
  entries: { col: number; row: number }[];
  exits: { col: number; row: number }[];
  blocked: { col: number; row: number }[];
  noBuild: { col: number; row: number }[]; // walkable but can't build
}

export const MAPS: Record<MapId, MapDefinition> = {
  plains: {
    id: 'plains',
    name: 'Plains',
    description: 'Open field with no-build corridors.',
    entries: [{ col: 0, row: Math.floor(GRID_ROWS / 2) }],
    exits: [{ col: GRID_COLS - 1, row: Math.floor(GRID_ROWS / 2) }],
    blocked: [],
    noBuild: generatePlainsNoBuild(),
  },
  crossroads: {
    id: 'crossroads',
    name: 'Crossroads',
    description: 'Two entries. No-build zones at intersections.',
    entries: [
      { col: 0, row: 4 },
      { col: 0, row: GRID_ROWS - 5 },
    ],
    exits: [{ col: GRID_COLS - 1, row: Math.floor(GRID_ROWS / 2) }],
    blocked: generateCrossroadsBlocked(),
    noBuild: generateCrossroadsNoBuild(),
  },
  fortress: {
    id: 'fortress',
    name: 'Fortress',
    description: 'Defend the center. Narrow no-build paths.',
    entries: [
      { col: 0, row: Math.floor(GRID_ROWS / 2) },
      { col: GRID_COLS - 1, row: Math.floor(GRID_ROWS / 2) },
      { col: Math.floor(GRID_COLS / 2), row: 0 },
    ],
    exits: [{ col: Math.floor(GRID_COLS / 2), row: Math.floor(GRID_ROWS / 2) }],
    blocked: generateFortressBlocked(),
    noBuild: generateFortressNoBuild(),
  },
};

export const MAP_ORDER: MapId[] = ['plains', 'crossroads', 'fortress'];

function generatePlainsNoBuild(): { col: number; row: number }[] {
  const noBuild: { col: number; row: number }[] = [];
  const midRow = Math.floor(GRID_ROWS / 2);
  // A 3-wide no-build corridor across the middle — creeps walk through,
  // you can't wall it off completely
  for (let col = 3; col < GRID_COLS - 3; col++) {
    if (col % 4 === 0) { // gaps every 4 tiles so you CAN build some towers nearby
      noBuild.push({ col, row: midRow });
    }
  }
  return noBuild;
}

function generateCrossroadsBlocked(): { col: number; row: number }[] {
  const blocked: { col: number; row: number }[] = [];
  const midRow = Math.floor(GRID_ROWS / 2);
  for (let col = 3; col < GRID_COLS - 3; col++) {
    if (col === Math.floor(GRID_COLS / 2) || col === Math.floor(GRID_COLS / 2) - 1 || col === Math.floor(GRID_COLS / 2) + 1) continue;
    blocked.push({ col, row: midRow });
  }
  return blocked;
}

function generateCrossroadsNoBuild(): { col: number; row: number }[] {
  const noBuild: { col: number; row: number }[] = [];
  // No-build zone near the exit convergence point
  const cx = GRID_COLS - 4;
  for (let dr = -2; dr <= 2; dr++) {
    const r = Math.floor(GRID_ROWS / 2) + dr;
    if (r >= 0 && r < GRID_ROWS) {
      noBuild.push({ col: cx, row: r });
      noBuild.push({ col: cx + 1, row: r });
    }
  }
  return noBuild;
}

function generateFortressBlocked(): { col: number; row: number }[] {
  const blocked: { col: number; row: number }[] = [];
  const cx = Math.floor(GRID_COLS / 2);
  const cy = Math.floor(GRID_ROWS / 2);

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

function generateFortressNoBuild(): { col: number; row: number }[] {
  const noBuild: { col: number; row: number }[] = [];
  const cx = Math.floor(GRID_COLS / 2);
  const cy = Math.floor(GRID_ROWS / 2);
  // No-build ring just inside the fortress walls
  for (let dc = -2; dc <= 2; dc++) {
    for (let dr = -2; dr <= 2; dr++) {
      if (dc === 0 && dr === 0) continue; // exit cell
      const c = cx + dc;
      const r = cy + dr;
      if (c > 0 && c < GRID_COLS - 1 && r > 0 && r < GRID_ROWS - 1) {
        noBuild.push({ col: c, row: r });
      }
    }
  }
  return noBuild;
}
