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

export const MAPS: Record<MapId, MapDefinition> = {
  plains: {
    id: 'plains',
    name: 'Plains',
    description: 'Open field. One entry, one exit.',
    entries: [{ col: 0, row: MID_ROW }],
    exits: [{ col: GRID_COLS - 1, row: MID_ROW }],
    blocked: [],
    noBuild: generatePlainsNoBuild(),
  },
  crossroads: {
    id: 'crossroads',
    name: 'Crossroads',
    description: 'Two entries converge on one exit.',
    entries: [
      { col: 0, row: 4 },
      { col: 0, row: GRID_ROWS - 5 },
    ],
    exits: [{ col: GRID_COLS - 1, row: MID_ROW }],
    blocked: generateCrossroadsBlocked(),
    noBuild: generateCrossroadsNoBuild(),
  },
  fortress: {
    id: 'fortress',
    name: 'Fortress',
    description: 'Three entries. Defend the center.',
    entries: [
      { col: 0, row: MID_ROW },
      { col: GRID_COLS - 1, row: MID_ROW },
      { col: MID_COL, row: 0 },
    ],
    exits: [{ col: MID_COL, row: MID_ROW }],
    blocked: generateFortressBlocked(),
    noBuild: generateFortressNoBuild(),
  },
  serpentine: {
    id: 'serpentine',
    name: 'Serpentine',
    description: 'Pre-built snake maze. Limited building space.',
    entries: [{ col: 0, row: 2 }],
    exits: [{ col: GRID_COLS - 1, row: GRID_ROWS - 3 }],
    blocked: generateSerpentineBlocked(),
    noBuild: generateSerpentineNoBuild(),
  },
  islands: {
    id: 'islands',
    name: 'Islands',
    description: 'Four build zones separated by no-build rivers.',
    entries: [{ col: 0, row: MID_ROW }],
    exits: [{ col: GRID_COLS - 1, row: MID_ROW }],
    blocked: [],
    noBuild: generateIslandsNoBuild(),
  },
  gauntlet: {
    id: 'gauntlet',
    name: 'Gauntlet',
    description: 'Four entries, one exit. Waves from all sides.',
    entries: [
      { col: 0, row: MID_ROW },
      { col: GRID_COLS - 1, row: MID_ROW },
      { col: MID_COL, row: 0 },
      { col: MID_COL, row: GRID_ROWS - 1 },
    ],
    exits: [{ col: MID_COL, row: MID_ROW }],
    blocked: generateGauntletBlocked(),
    noBuild: generateGauntletNoBuild(),
  },
  spiral: {
    id: 'spiral',
    name: 'Spiral',
    description: 'Entry at edge, exit at center. Tight spiral path.',
    entries: [{ col: 0, row: 0 }],
    exits: [{ col: MID_COL, row: MID_ROW }],
    blocked: generateSpiralBlocked(),
    noBuild: [],
  },
  siege: {
    id: 'siege',
    name: 'Siege',
    description: 'Two players mirrored. Two entries, two exits.',
    entries: [
      { col: 0, row: Math.floor(GRID_ROWS / 4) },
      { col: 0, row: Math.floor(GRID_ROWS * 3 / 4) },
    ],
    exits: [
      { col: GRID_COLS - 1, row: Math.floor(GRID_ROWS / 4) },
      { col: GRID_COLS - 1, row: Math.floor(GRID_ROWS * 3 / 4) },
    ],
    blocked: generateSiegeBlocked(),
    noBuild: generateSiegeNoBuild(),
  },
};

export const MAP_ORDER: MapId[] = ['plains', 'crossroads', 'fortress', 'serpentine', 'islands', 'gauntlet', 'spiral', 'siege'];

// === Plains ===
function generatePlainsNoBuild() {
  const nb: { col: number; row: number }[] = [];
  for (let col = 3; col < GRID_COLS - 3; col++) {
    if (col % 4 === 0) nb.push({ col, row: MID_ROW });
  }
  return nb;
}

// === Crossroads ===
function generateCrossroadsBlocked() {
  const b: { col: number; row: number }[] = [];
  for (let col = 3; col < GRID_COLS - 3; col++) {
    if (col >= MID_COL - 1 && col <= MID_COL + 1) continue;
    b.push({ col, row: MID_ROW });
  }
  return b;
}

function generateCrossroadsNoBuild() {
  const nb: { col: number; row: number }[] = [];
  const cx = GRID_COLS - 4;
  for (let dr = -2; dr <= 2; dr++) {
    const r = MID_ROW + dr;
    if (r >= 0 && r < GRID_ROWS) {
      nb.push({ col: cx, row: r });
      nb.push({ col: cx + 1, row: r });
    }
  }
  return nb;
}

// === Fortress ===
function generateFortressBlocked() {
  const b: { col: number; row: number }[] = [];
  for (let dc = -3; dc <= 3; dc++) {
    for (let dr = -3; dr <= 3; dr++) {
      const c = MID_COL + dc, r = MID_ROW + dr;
      const isEdge = Math.abs(dc) === 3 || Math.abs(dr) === 3;
      const isGap = (dc === 0 && Math.abs(dr) === 3) || (dr === 0 && Math.abs(dc) === 3);
      if (isEdge && !isGap && c > 0 && c < GRID_COLS - 1 && r > 0 && r < GRID_ROWS - 1) {
        b.push({ col: c, row: r });
      }
    }
  }
  return b;
}

function generateFortressNoBuild() {
  const nb: { col: number; row: number }[] = [];
  for (let dc = -2; dc <= 2; dc++) {
    for (let dr = -2; dr <= 2; dr++) {
      if (dc === 0 && dr === 0) continue;
      const c = MID_COL + dc, r = MID_ROW + dr;
      if (c > 0 && c < GRID_COLS - 1 && r > 0 && r < GRID_ROWS - 1) {
        nb.push({ col: c, row: r });
      }
    }
  }
  return nb;
}

// === Serpentine: pre-built snake corridors ===
function generateSerpentineBlocked() {
  const b: { col: number; row: number }[] = [];
  // Horizontal walls creating a snake pattern
  const wallRows = [5, 10, 15, 20];
  for (let i = 0; i < wallRows.length; i++) {
    const r = wallRows[i];
    if (r >= GRID_ROWS) continue;
    const startCol = (i % 2 === 0) ? 4 : 0;
    const endCol = (i % 2 === 0) ? GRID_COLS : GRID_COLS - 4;
    for (let c = startCol; c < endCol; c++) {
      if (c >= 0 && c < GRID_COLS) b.push({ col: c, row: r });
    }
  }
  return b;
}

function generateSerpentineNoBuild() {
  const nb: { col: number; row: number }[] = [];
  // No-build zones at the turn points to prevent cheesing
  const wallRows = [5, 10, 15, 20];
  for (let i = 0; i < wallRows.length; i++) {
    const r = wallRows[i];
    if (r >= GRID_ROWS) continue;
    const turnCol = (i % 2 === 0) ? 2 : GRID_COLS - 3;
    for (let dr = -1; dr <= 1; dr++) {
      const nr = r + dr;
      if (nr >= 0 && nr < GRID_ROWS) {
        nb.push({ col: turnCol, row: nr });
        nb.push({ col: turnCol + 1, row: nr });
      }
    }
  }
  return nb;
}

// === Islands: build zones separated by no-build rivers ===
function generateIslandsNoBuild() {
  const nb: { col: number; row: number }[] = [];
  // Vertical rivers at 1/3 and 2/3
  const river1 = Math.floor(GRID_COLS / 3);
  const river2 = Math.floor(GRID_COLS * 2 / 3);
  // Horizontal river at middle
  for (let r = 0; r < GRID_ROWS; r++) {
    // Vertical rivers with gaps for path
    if (r !== MID_ROW && r !== MID_ROW - 1 && r !== MID_ROW + 1) {
      nb.push({ col: river1, row: r });
      nb.push({ col: river2, row: r });
    }
  }
  for (let c = 0; c < GRID_COLS; c++) {
    // Horizontal river with gaps at the vertical rivers
    if (c !== river1 && c !== river2 && c !== 0 && c !== GRID_COLS - 1) {
      if (c % 6 !== 0) { // periodic gaps
        nb.push({ col: c, row: MID_ROW });
      }
    }
  }
  return nb;
}

// === Gauntlet: 4 entries, center exit, open with scattered obstacles ===
function generateGauntletBlocked() {
  const b: { col: number; row: number }[] = [];
  // Scattered pillars
  const pillars = [
    [MID_COL - 6, MID_ROW - 4], [MID_COL + 6, MID_ROW - 4],
    [MID_COL - 6, MID_ROW + 4], [MID_COL + 6, MID_ROW + 4],
    [MID_COL - 3, MID_ROW - 7], [MID_COL + 3, MID_ROW - 7],
    [MID_COL - 3, MID_ROW + 7], [MID_COL + 3, MID_ROW + 7],
  ];
  for (const [pc, pr] of pillars) {
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        const c = pc + dc, r = pr + dr;
        if (c > 0 && c < GRID_COLS - 1 && r > 0 && r < GRID_ROWS - 1) {
          b.push({ col: c, row: r });
        }
      }
    }
  }
  return b;
}

function generateGauntletNoBuild() {
  const nb: { col: number; row: number }[] = [];
  // No-build cross through center
  for (let c = MID_COL - 2; c <= MID_COL + 2; c++) {
    for (let r = 0; r < GRID_ROWS; r++) {
      if (c >= 0 && c < GRID_COLS) nb.push({ col: c, row: r });
    }
  }
  for (let r = MID_ROW - 2; r <= MID_ROW + 2; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (r >= 0 && r < GRID_ROWS) nb.push({ col: c, row: r });
    }
  }
  return nb;
}

// === Spiral: blocked walls creating a spiral path to center ===
function generateSpiralBlocked() {
  const b: { col: number; row: number }[] = [];
  const margin = 2;

  // Build concentric rectangles with alternating openings
  let top = margin, bottom = GRID_ROWS - 1 - margin;
  let left = margin, right = GRID_COLS - 1 - margin;
  let layer = 0;

  while (top < bottom && left < right) {
    // Top wall (gap on right for even layers, left for odd)
    for (let c = left; c <= right; c++) {
      if (layer % 2 === 0 && c >= right - 2) continue; // gap right
      if (layer % 2 === 1 && c <= left + 2) continue; // gap left
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

    top += 3; bottom -= 3; left += 3; right -= 3;
    layer++;
  }

  // Filter out of bounds and entry/exit
  return b.filter(p => p.col >= 0 && p.col < GRID_COLS && p.row >= 0 && p.row < GRID_ROWS);
}

// === Siege: mirrored top/bottom halves ===
function generateSiegeBlocked() {
  const b: { col: number; row: number }[] = [];
  // Horizontal divider wall with gaps
  for (let c = 0; c < GRID_COLS; c++) {
    if (c % 8 < 6) { // wall with periodic gaps
      b.push({ col: c, row: MID_ROW });
    }
  }
  return b;
}

function generateSiegeNoBuild() {
  const nb: { col: number; row: number }[] = [];
  // No-build zone around the divider
  for (let c = 0; c < GRID_COLS; c++) {
    if (MID_ROW - 1 >= 0) nb.push({ col: c, row: MID_ROW - 1 });
    if (MID_ROW + 1 < GRID_ROWS) nb.push({ col: c, row: MID_ROW + 1 });
  }
  return nb;
}
