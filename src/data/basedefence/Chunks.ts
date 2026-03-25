import { CellType } from '../../systems/Grid';

/** Size of each map chunk in tiles */
export const CHUNK_SIZE = 24;

/** Chunk placement role */
export type ChunkRole = 'base' | 'open' | 'resource';

/**
 * Edges that must remain passable between adjacent chunks.
 * Each edge is a range of tile indices (0-23) along that side.
 * During assembly, adjacent chunks' edges are checked for compatibility.
 */
export interface ChunkEdges {
  north: boolean; // has open passage on north edge
  south: boolean;
  east: boolean;
  west: boolean;
}

/** A chunk template — 24×24 tile layout with metadata */
export interface ChunkTemplate {
  id: string;
  role: ChunkRole;
  /** 24×24 grid encoded as 24 strings of 24 chars each.
   *  Legend:
   *    . = Empty
   *    # = Blocked (mountain/wall)
   *    G = GoldDeposit
   *    V = Geyser (Vespene)
   *    ~ = NoBuild (decoration/rubble, walkable)
   */
  layout: string[];
  /** Which edges have open passages for connectivity */
  edges: ChunkEdges;
  /** Can this chunk be rotated 90°/180°/270° during placement? */
  rotatable: boolean;
}

/** Char → CellType mapping */
export function charToCellType(ch: string): CellType {
  switch (ch) {
    case '#': return CellType.Blocked;
    case 'G': return CellType.GoldDeposit;
    case 'V': return CellType.Geyser;
    case '~': return CellType.NoBuild;
    default: return CellType.Empty;
  }
}

/** Parse a chunk layout into a 2D CellType array [row][col] */
export function parseChunkLayout(layout: string[]): CellType[][] {
  const cells: CellType[][] = [];
  for (let r = 0; r < CHUNK_SIZE; r++) {
    const row: CellType[] = [];
    const line = layout[r] || '';
    for (let c = 0; c < CHUNK_SIZE; c++) {
      row.push(charToCellType(line[c] || '.'));
    }
    cells.push(row);
  }
  return cells;
}

/** Rotate a 24×24 cell array 90° clockwise */
export function rotateChunk90(cells: CellType[][]): CellType[][] {
  const size = cells.length;
  const rotated: CellType[][] = Array.from({ length: size }, () => Array(size).fill(CellType.Empty));
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      rotated[c][size - 1 - r] = cells[r][c];
    }
  }
  return rotated;
}

/** Rotate edges 90° clockwise */
export function rotateEdges90(edges: ChunkEdges): ChunkEdges {
  return {
    north: edges.west,
    east: edges.north,
    south: edges.east,
    west: edges.south,
  };
}

// ════════════════════════════════════════════════════════════════
// BASE CHUNKS — defensible positions with resources inside
// ════════════════════════════════════════════════════════════════

/** Base chunk 1: Mountain horseshoe, open to south+east. 6 gold, 1 geyser */
const BASE_HORSESHOE: ChunkTemplate = {
  id: 'base_horseshoe',
  role: 'base',
  rotatable: true,
  edges: { north: false, south: true, east: true, west: false },
  layout: [
    '########################',
    '########################',
    '##########..............',
    '#########..GG...........',
    '########...G............',
    '#######.................',
    '######..................',
    '######..G...............',
    '######..G...............',
    '######..........V.......',
    '######..................',
    '######..................',
    '######..G...............',
    '######..................',
    '#######.................',
    '#######.................',
    '########................',
    '########................',
    '#########...............',
    '##########..............',
    '###########.............',
    '############............',
    '########################',
    '########################',
  ],
};

/** Base chunk 2: Corner fortress, narrow entrance to south+east. 6 gold, 1 geyser */
const BASE_FORTRESS: ChunkTemplate = {
  id: 'base_fortress',
  role: 'base',
  rotatable: true,
  edges: { north: false, south: true, east: true, west: false },
  layout: [
    '########################',
    '########################',
    '##.GG...################',
    '##..G...################',
    '##......##..############',
    '##......##..############',
    '##..V...##..############',
    '##......##..############',
    '##.G....##..............',
    '##..G...##..............',
    '##......##..............',
    '##......##..............',
    '##..G...................',
    '##..................####',
    '##..................####',
    '####................####',
    '####..............######',
    '####............########',
    '######..........########',
    '######........##########',
    '########....############',
    '########....############',
    '########################',
    '########################',
  ],
};

/** Base chunk 3: Wide valley, mountains on north+west, wide opening south+east. 5 gold, 2 geyser */
const BASE_VALLEY: ChunkTemplate = {
  id: 'base_valley',
  role: 'base',
  rotatable: true,
  edges: { north: false, south: true, east: true, west: false },
  layout: [
    '########################',
    '###########.............',
    '#########...............',
    '########................',
    '#######..GG.............',
    '######...G..............',
    '#####...................',
    '#####..G......V.........',
    '####....................',
    '####....................',
    '####......V.............',
    '####....................',
    '####....................',
    '###.....................',
    '###..G..................',
    '###.....................',
    '##......................',
    '##......................',
    '##......................',
    '#.......................',
    '#.......................',
    '........................',
    '........................',
    '........................',
  ],
};

/** Base chunk 4: Dual chokepoint — two narrow passes through mountain wall. 6 gold, 1 geyser */
const BASE_DUAL_CHOKE: ChunkTemplate = {
  id: 'base_dual_choke',
  role: 'base',
  rotatable: true,
  edges: { north: false, south: true, east: true, west: false },
  layout: [
    '########################',
    '########################',
    '##..GG..................',
    '##..G...................',
    '##..G...................',
    '##......V...............',
    '##......................',
    '##..GG..................',
    '##......................',
    '########.####...........',
    '########.####...........',
    '########.####...........',
    '########.####...........',
    '########.####...........',
    '########.####...........',
    '##............##########',
    '##............##########',
    '##............##########',
    '##............##########',
    '##............##########',
    '##............##........',
    '##....................##',
    '########################',
    '########################',
  ],
};

// ════════════════════════════════════════════════════════════════
// OPEN CHUNKS — contested terrain between bases
// ════════════════════════════════════════════════════════════════

/** Open chunk 1: Mostly open with a few rock clusters */
const OPEN_SPARSE: ChunkTemplate = {
  id: 'open_sparse',
  role: 'open',
  rotatable: true,
  edges: { north: true, south: true, east: true, west: true },
  layout: [
    '........................',
    '........................',
    '........................',
    '.......##...............',
    '.......###..............',
    '.......##...............',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '..............##........',
    '.............####.......',
    '.............####.......',
    '..............##........',
    '........................',
    '........................',
    '...##...................',
    '...###..................',
    '...##...................',
    '........................',
    '........................',
    '........................',
    '........................',
  ],
};

/** Open chunk 2: Central mountain ridge with gaps */
const OPEN_RIDGE: ChunkTemplate = {
  id: 'open_ridge',
  role: 'open',
  rotatable: true,
  edges: { north: true, south: true, east: true, west: true },
  layout: [
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '....####..####..####....',
    '....####..####..####....',
    '....####..####..####....',
    '....####..####..####....',
    '....####..####..####....',
    '....####..####..####....',
    '....####..####..####....',
    '....####..####..####....',
    '....####..####..####....',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
  ],
};

/** Open chunk 3: Crossroads — four passages through central rock */
const OPEN_CROSSROADS: ChunkTemplate = {
  id: 'open_crossroads',
  role: 'open',
  rotatable: false,
  edges: { north: true, south: true, east: true, west: true },
  layout: [
    '........................',
    '........................',
    '........................',
    '........................',
    '.....#####....#####.....',
    '.....#####....#####.....',
    '.....#####....#####.....',
    '.....#####....#####.....',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '.....#####....#####.....',
    '.....#####....#####.....',
    '.....#####....#####.....',
    '.....#####....#####.....',
    '........................',
    '........................',
    '........................',
    '........................',
  ],
};

/** Open chunk 4: Wide open, almost no obstacles */
const OPEN_PLAINS: ChunkTemplate = {
  id: 'open_plains',
  role: 'open',
  rotatable: false,
  edges: { north: true, south: true, east: true, west: true },
  layout: [
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '..........##............',
    '..........##............',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
  ],
};

// ════════════════════════════════════════════════════════════════
// RESOURCE CHUNKS — contested resource deposits
// ════════════════════════════════════════════════════════════════

/** Resource chunk 1: Gold deposits with light cover */
const RESOURCE_GOLD: ChunkTemplate = {
  id: 'resource_gold',
  role: 'resource',
  rotatable: true,
  edges: { north: true, south: true, east: true, west: true },
  layout: [
    '........................',
    '........................',
    '........................',
    '........................',
    '......###.....###.......',
    '......###.....###.......',
    '........................',
    '.........G..G...........',
    '........................',
    '........................',
    '....###..........###....',
    '....###..........###....',
    '....###..........###....',
    '....###..........###....',
    '........................',
    '........................',
    '.........G..G...........',
    '........................',
    '......###.....###.......',
    '......###.....###.......',
    '........................',
    '........................',
    '........................',
    '........................',
  ],
};

/** Resource chunk 2: Geyser basin with mountain walls */
const RESOURCE_GEYSER: ChunkTemplate = {
  id: 'resource_geyser',
  role: 'resource',
  rotatable: true,
  edges: { north: true, south: true, east: true, west: true },
  layout: [
    '........................',
    '........................',
    '........................',
    '........######..........',
    '.......##....##.........',
    '......##......##........',
    '.....##........##.......',
    '.....#...V......#.......',
    '.....#..........#.......',
    '.....##........##.......',
    '......##......##........',
    '.......##....##.........',
    '........##..##..........',
    '.........#..#...........',
    '.........#..#...........',
    '........##..##..........',
    '.......##....##.........',
    '......##..V...##........',
    '.....##........##.......',
    '......##......##........',
    '.......########.........',
    '........................',
    '........................',
    '........................',
  ],
};

/** Resource chunk 3: Mixed resources in a valley */
const RESOURCE_MIXED: ChunkTemplate = {
  id: 'resource_mixed',
  role: 'resource',
  rotatable: true,
  edges: { north: true, south: true, east: true, west: true },
  layout: [
    '........................',
    '........................',
    '...###.............###..',
    '...####...........####..',
    '...####...........####..',
    '...###.............###..',
    '........................',
    '......G.....V...........',
    '........................',
    '........................',
    '........................',
    '............##..........',
    '...........####.........',
    '...........####.........',
    '............##..........',
    '........................',
    '........................',
    '..........G.....G.......',
    '........................',
    '...###.............###..',
    '...####...........####..',
    '...###.............###..',
    '........................',
    '........................',
  ],
};

// ════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════

export const BASE_CHUNKS: ChunkTemplate[] = [
  BASE_HORSESHOE,
  BASE_FORTRESS,
  BASE_VALLEY,
  BASE_DUAL_CHOKE,
];

export const OPEN_CHUNKS: ChunkTemplate[] = [
  OPEN_SPARSE,
  OPEN_RIDGE,
  OPEN_CROSSROADS,
  OPEN_PLAINS,
];

export const RESOURCE_CHUNKS: ChunkTemplate[] = [
  RESOURCE_GOLD,
  RESOURCE_GEYSER,
  RESOURCE_MIXED,
];

export const ALL_CHUNKS: ChunkTemplate[] = [
  ...BASE_CHUNKS,
  ...OPEN_CHUNKS,
  ...RESOURCE_CHUNKS,
];
