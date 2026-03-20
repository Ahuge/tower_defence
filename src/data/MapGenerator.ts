import { GRID_COLS, GRID_ROWS } from '../config';
import { MapDefinition } from './Maps';
import { DifficultyLevel } from './Difficulty';
import { findPath } from '../systems/Pathfinding';
import { Grid } from '../systems/Grid';

// ── Seeded PRNG (mulberry32) ──────────────────────────────────
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Layout Templates ──────────────────────────────────────────
interface LayoutTemplate {
  name: string;
  entries: { col: number; row: number }[];
  exits: { col: number; row: number }[];
}

const MID_COL = Math.floor(GRID_COLS / 2);
const MID_ROW = Math.floor(GRID_ROWS / 2);

const LAYOUT_TEMPLATES: LayoutTemplate[] = [
  {
    name: 'classic',
    entries: [{ col: 0, row: MID_ROW }],
    exits: [{ col: GRID_COLS - 1, row: MID_ROW }],
  },
  {
    name: 'dual_entry',
    entries: [{ col: 0, row: 4 }, { col: 0, row: GRID_ROWS - 5 }],
    exits: [{ col: GRID_COLS - 1, row: MID_ROW }],
  },
  {
    name: 'siege',
    entries: [
      { col: 0, row: Math.floor(GRID_ROWS / 4) },
      { col: 0, row: Math.floor(GRID_ROWS * 3 / 4) },
    ],
    exits: [
      { col: GRID_COLS - 1, row: Math.floor(GRID_ROWS / 4) },
      { col: GRID_COLS - 1, row: Math.floor(GRID_ROWS * 3 / 4) },
    ],
  },
  {
    name: 'gauntlet',
    entries: [
      { col: 0, row: MID_ROW },
      { col: GRID_COLS - 1, row: MID_ROW },
      { col: MID_COL, row: 0 },
      { col: MID_COL, row: GRID_ROWS - 1 },
    ],
    exits: [{ col: MID_COL, row: MID_ROW }],
  },
  {
    name: 'diagonal',
    entries: [{ col: 0, row: 1 }],
    exits: [{ col: GRID_COLS - 1, row: GRID_ROWS - 2 }],
  },
  {
    name: 'corridor',
    entries: [{ col: 0, row: 2 }],
    exits: [{ col: GRID_COLS - 1, row: GRID_ROWS - 3 }],
  },
];

// ── Terrain Feature Library ───────────────────────────────────
type Pos = { col: number; row: number };

interface TerrainFeature {
  cells: Pos[];
}

function inBounds(c: number, r: number): boolean {
  return c >= 0 && c < GRID_COLS && r >= 0 && r < GRID_ROWS;
}

function makeCircle(cx: number, cy: number, radius: number): Pos[] {
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

function makeRect(c1: number, r1: number, c2: number, r2: number): Pos[] {
  const ps: Pos[] = [];
  for (let c = c1; c <= c2; c++) {
    for (let r = r1; r <= r2; r++) {
      if (inBounds(c, r)) ps.push({ col: c, row: r });
    }
  }
  return ps;
}

type FeatureGenerator = (rng: () => number) => TerrainFeature;

/** Lake: circular blocked area */
function genLake(rng: () => number): TerrainFeature {
  const radius = 2 + Math.floor(rng() * 3); // 2-4
  const cx = 3 + Math.floor(rng() * (GRID_COLS - 6));
  const cy = 3 + Math.floor(rng() * (GRID_ROWS - 6));
  return { cells: makeCircle(cx, cy, radius) };
}

/** Ridge: vertical wall with gaps */
function genRidge(rng: () => number): TerrainFeature {
  const width = 1 + Math.floor(rng() * 2); // 1-2
  const height = 6 + Math.floor(rng() * 7); // 6-12
  const c = 4 + Math.floor(rng() * (GRID_COLS - 8));
  const r = 2 + Math.floor(rng() * (GRID_ROWS - height - 4));
  const cells: Pos[] = [];
  // Place wall with 2-3 gaps
  const gapCount = 2 + Math.floor(rng() * 2);
  const gapPositions = new Set<number>();
  for (let g = 0; g < gapCount; g++) {
    gapPositions.add(r + 1 + Math.floor(rng() * (height - 2)));
  }
  for (let row = r; row < r + height; row++) {
    if (gapPositions.has(row)) continue;
    for (let w = 0; w < width; w++) {
      if (inBounds(c + w, row)) cells.push({ col: c + w, row });
    }
  }
  return { cells };
}

/** Pillars: 3-5 small circles in a cluster */
function genPillars(rng: () => number): TerrainFeature {
  const count = 3 + Math.floor(rng() * 3); // 3-5
  const cx = 5 + Math.floor(rng() * (GRID_COLS - 10));
  const cy = 5 + Math.floor(rng() * (GRID_ROWS - 10));
  const cells: Pos[] = [];
  for (let i = 0; i < count; i++) {
    const ox = Math.floor(rng() * 8) - 4;
    const oy = Math.floor(rng() * 8) - 4;
    cells.push(...makeCircle(cx + ox, cy + oy, 1));
  }
  return { cells };
}

/** Wall: horizontal rect with gaps */
function genWall(rng: () => number): TerrainFeature {
  const width = 8 + Math.floor(rng() * 9); // 8-16
  const height = 1 + Math.floor(rng() * 2); // 1-2
  const c = 2 + Math.floor(rng() * (GRID_COLS - width - 4));
  const r = 3 + Math.floor(rng() * (GRID_ROWS - 6));
  const cells: Pos[] = [];
  const gapCount = 2 + Math.floor(rng() * 2);
  const gapCols = new Set<number>();
  for (let g = 0; g < gapCount; g++) {
    gapCols.add(c + 1 + Math.floor(rng() * (width - 2)));
  }
  for (let col = c; col < c + width; col++) {
    if (gapCols.has(col)) continue;
    for (let h = 0; h < height; h++) {
      if (inBounds(col, r + h)) cells.push({ col, row: r + h });
    }
  }
  return { cells };
}

/** Island: large circle with NoBuild ring */
function genIsland(rng: () => number): { blocked: Pos[]; noBuild: Pos[] } {
  const radius = 3 + Math.floor(rng() * 3); // 3-5
  const cx = radius + 2 + Math.floor(rng() * (GRID_COLS - 2 * radius - 4));
  const cy = radius + 2 + Math.floor(rng() * (GRID_ROWS - 2 * radius - 4));
  const blocked = makeCircle(cx, cy, radius);
  const blockedSet = new Set(blocked.map(p => `${p.col},${p.row}`));
  const ring = makeCircle(cx, cy, radius + 1).filter(
    p => !blockedSet.has(`${p.col},${p.row}`)
  );
  return { blocked, noBuild: ring };
}

/** Boulder cluster: 3-6 random adjacent blocked cells */
function genBoulders(rng: () => number): TerrainFeature {
  const count = 3 + Math.floor(rng() * 4); // 3-6
  const cx = 3 + Math.floor(rng() * (GRID_COLS - 6));
  const cy = 3 + Math.floor(rng() * (GRID_ROWS - 6));
  const cells: Pos[] = [];
  const placed = new Set<string>();
  let c = cx, r = cy;
  for (let i = 0; i < count; i++) {
    if (inBounds(c, r) && !placed.has(`${c},${r}`)) {
      cells.push({ col: c, row: r });
      placed.add(`${c},${r}`);
    }
    // Random walk
    const dir = Math.floor(rng() * 4);
    if (dir === 0) c++;
    else if (dir === 1) c--;
    else if (dir === 2) r++;
    else r--;
  }
  return { cells };
}

const FEATURE_GENERATORS: FeatureGenerator[] = [
  genLake, genRidge, genPillars, genWall, genBoulders,
];

// ── Difficulty-Linked Parameters ──────────────────────────────
interface TerrainParams {
  densityMin: number;
  densityMax: number;
  features: [number, number]; // [min, max] feature count
  noBuildPct: number;
  minPath: number;
}

const DIFFICULTY_TERRAIN: Record<DifficultyLevel, TerrainParams> = {
  easy:   { densityMin: 0.08, densityMax: 0.10, features: [2, 3], noBuildPct: 0,    minPath: 20 },
  normal: { densityMin: 0.12, densityMax: 0.15, features: [3, 5], noBuildPct: 0.02, minPath: 25 },
  hard:   { densityMin: 0.15, densityMax: 0.18, features: [4, 6], noBuildPct: 0.04, minPath: 30 },
  insane: { densityMin: 0.18, densityMax: 0.22, features: [5, 7], noBuildPct: 0.07, minPath: 35 },
};

// ── Main Generator ────────────────────────────────────────────

function posKey(p: Pos): string { return `${p.col},${p.row}`; }

/** Check that every entry can reach every exit using A* */
function validatePaths(entries: Pos[], exits: Pos[], blocked: Set<string>): boolean {
  // Build a temporary grid to check pathability
  const tempMap: MapDefinition = {
    id: 'random' as any,
    name: '', description: '',
    entries, exits,
    blocked: Array.from(blocked).map(k => {
      const [c, r] = k.split(',').map(Number);
      return { col: c, row: r };
    }),
    noBuild: [],
  };
  const grid = new Grid(tempMap);
  for (const entry of entries) {
    for (const exit of exits) {
      const path = findPath(grid, entry, exit);
      if (!path) return false;
    }
  }
  return true;
}

/** Get shortest path length across all entry→exit pairs */
function getShortestPathLength(entries: Pos[], exits: Pos[], blocked: Set<string>): number {
  const tempMap: MapDefinition = {
    id: 'random' as any,
    name: '', description: '',
    entries, exits,
    blocked: Array.from(blocked).map(k => {
      const [c, r] = k.split(',').map(Number);
      return { col: c, row: r };
    }),
    noBuild: [],
  };
  const grid = new Grid(tempMap);
  let shortest = Infinity;
  for (const entry of entries) {
    for (const exit of exits) {
      const path = findPath(grid, entry, exit);
      if (path) shortest = Math.min(shortest, path.length);
    }
  }
  return shortest;
}

export function generateRandomMap(seed: number, difficulty: DifficultyLevel): MapDefinition {
  const rng = mulberry32(seed);
  const params = DIFFICULTY_TERRAIN[difficulty];

  // 1. Pick a random layout template
  const templateIdx = Math.floor(rng() * LAYOUT_TEMPLATES.length);
  const template = LAYOUT_TEMPLATES[templateIdx];
  const entries = template.entries;
  const exits = template.exits;

  // Reserve cells around entries/exits (2-cell radius)
  const reserved = new Set<string>();
  for (const p of [...entries, ...exits]) {
    for (let dc = -2; dc <= 2; dc++) {
      for (let dr = -2; dr <= 2; dr++) {
        const c = p.col + dc, r = p.row + dr;
        if (inBounds(c, r)) reserved.add(posKey({ col: c, row: r }));
      }
    }
  }

  // 2. Place terrain features
  const blocked = new Set<string>();
  const noBuildCells: Pos[] = [];
  const totalCells = GRID_COLS * GRID_ROWS;
  const targetDensity = params.densityMin + rng() * (params.densityMax - params.densityMin);
  const maxBlocked = Math.floor(totalCells * targetDensity);
  const featureCount = params.features[0] + Math.floor(rng() * (params.features[1] - params.features[0] + 1));

  for (let f = 0; f < featureCount && blocked.size < maxBlocked; f++) {
    const genIdx = Math.floor(rng() * (FEATURE_GENERATORS.length + 1)); // +1 for island
    let newBlocked: Pos[];
    let newNoBuild: Pos[] = [];

    if (genIdx >= FEATURE_GENERATORS.length) {
      // Island feature (has NoBuild ring)
      const island = genIsland(rng);
      newBlocked = island.blocked;
      newNoBuild = island.noBuild;
    } else {
      const feature = FEATURE_GENERATORS[genIdx](rng);
      newBlocked = feature.cells;
    }

    // Filter out reserved cells and entry/exit cells
    const entryExitKeys = new Set([...entries, ...exits].map(posKey));
    newBlocked = newBlocked.filter(p => !reserved.has(posKey(p)) && !entryExitKeys.has(posKey(p)));
    newNoBuild = newNoBuild.filter(p => !reserved.has(posKey(p)) && !entryExitKeys.has(posKey(p)));

    // Would we exceed density?
    if (blocked.size + newBlocked.length > maxBlocked * 1.2) continue;

    // Tentatively add
    const snapshot = new Set(blocked);
    for (const p of newBlocked) blocked.add(posKey(p));

    // Validate paths
    if (!validatePaths(entries, exits, blocked)) {
      // Revert
      for (const key of blocked) {
        if (!snapshot.has(key)) blocked.delete(key);
      }
    } else {
      // Keep it
      for (const p of newNoBuild) {
        if (!blocked.has(posKey(p))) noBuildCells.push(p);
      }
    }
  }

  // 3. If path too short, add wall features to lengthen it
  let retries = 0;
  while (retries < 5) {
    const pathLen = getShortestPathLength(entries, exits, blocked);
    if (pathLen >= params.minPath || pathLen === Infinity) break;

    const wall = genWall(rng);
    const entryExitKeys = new Set([...entries, ...exits].map(posKey));
    const validCells = wall.cells.filter(p => !reserved.has(posKey(p)) && !entryExitKeys.has(posKey(p)));

    const snapshot = new Set(blocked);
    for (const p of validCells) blocked.add(posKey(p));

    if (!validatePaths(entries, exits, blocked)) {
      for (const key of blocked) {
        if (!snapshot.has(key)) blocked.delete(key);
      }
    }
    retries++;
  }

  // 4. Add NoBuild zones based on difficulty
  if (params.noBuildPct > 0) {
    const noBuildTarget = Math.floor(totalCells * params.noBuildPct);
    let placed = noBuildCells.length;
    let attempts = 0;
    while (placed < noBuildTarget && attempts < noBuildTarget * 3) {
      const c = Math.floor(rng() * GRID_COLS);
      const r = Math.floor(rng() * GRID_ROWS);
      const key = posKey({ col: c, row: r });
      if (!blocked.has(key) && !reserved.has(key)) {
        noBuildCells.push({ col: c, row: r });
        placed++;
      }
      attempts++;
    }
  }

  // 5. Convert to MapDefinition
  const blockedArr: Pos[] = Array.from(blocked).map(k => {
    const [c, r] = k.split(',').map(Number);
    return { col: c, row: r };
  });

  // Deduplicate noBuild cells that overlap blocked
  const noBuildFiltered = noBuildCells.filter(p => !blocked.has(posKey(p)));

  return {
    id: 'random' as any,
    name: `Random #${seed}`,
    description: `Seed: ${seed} — ${template.name} layout`,
    entries,
    exits,
    blocked: blockedArr,
    noBuild: noBuildFiltered,
  };
}

// ── Daily Seed ────────────────────────────────────────────────
export function getDailySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}
