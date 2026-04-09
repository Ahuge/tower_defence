/**
 * Terrain theme system — rules-based assignment of terrain types to blocked cell clusters.
 *
 * Each theme defines a ground type and a list of rules evaluated in order.
 * Clusters of blocked cells are flood-filled, then each cluster is matched
 * against the rules to determine its terrain type.
 */

export type GroundType = 'grass' | 'dirt' | 'sand';
export type BlockedTerrainType = 'water' | 'mountain' | 'trees' | 'stone' | 'lava';
export type TerrainType = GroundType | BlockedTerrainType | 'entry' | 'exit' | 'nobuild';

export interface TerrainRule {
  minSize?: number;
  maxSize?: number;
  /** If true, only matches clusters with bounding box aspect ratio > 2.5:1 */
  elongated?: boolean;
  /** Maximum aspect ratio — only match roughly circular/square clusters */
  maxAspect?: number;
  terrain: BlockedTerrainType;
}

export interface TerrainTheme {
  id: string;
  ground: GroundType;
  rules: TerrainRule[];
  /** Optional custom colors for programmatic rendering */
  colors?: {
    ground?: number;       // override ground fill color
    gridLine?: number;     // override grid line color
    noBuild?: number;      // override NoBuild fill
    noBuildLine?: number;  // override NoBuild cross lines
  };
}

// ===================== Theme Definitions =====================

export const THEMES: Record<string, TerrainTheme> = {
  forest: {
    id: 'forest',
    ground: 'grass',
    rules: [
      { minSize: 10, terrain: 'mountain' },
      { terrain: 'trees' }, // default
    ],
  },
  mountain: {
    id: 'mountain',
    ground: 'grass',
    rules: [
      { minSize: 4, terrain: 'mountain' },
      { terrain: 'trees' },
    ],
  },
  water: {
    id: 'water',
    ground: 'grass',
    rules: [
      { elongated: true, terrain: 'mountain' },         // ridges/walls → rock
      { minSize: 6, maxAspect: 2, terrain: 'water' },   // round-ish clusters → water
      { minSize: 4, terrain: 'mountain' },               // rectangular medium → rock
      { terrain: 'trees' },
    ],
  },
  stone: {
    id: 'stone',
    ground: 'dirt',
    rules: [
      { terrain: 'stone' },
    ],
  },
  volcanic: {
    id: 'volcanic',
    ground: 'dirt',
    rules: [
      { minSize: 6, terrain: 'lava' },
      { terrain: 'mountain' },
    ],
  },
  // Faction-specific themes (use custom terrain spritesheets when available)
  circuit: {
    id: 'circuit',
    ground: 'dirt', // dark circuit board floor
    rules: [
      { minSize: 6, maxAspect: 2, terrain: 'water' },  // data pits (animated)
      { terrain: 'stone' },  // processor blocks
    ],
  },
  ancient_grove: {
    id: 'ancient_grove',
    ground: 'grass',
    rules: [
      { minSize: 8, terrain: 'trees' },  // ancient tree clusters
      { minSize: 4, maxAspect: 2, terrain: 'water' }, // enchanted springs
      { terrain: 'trees' },
    ],
    colors: {
      ground: 0x1a2a12,
      gridLine: 0x2a3a22,
      noBuild: 0x223308,
      noBuildLine: 0xaa6644,
    },
  },
  factory: {
    id: 'factory',
    ground: 'dirt',
    rules: [
      { terrain: 'stone' },  // machine blocks
    ],
    colors: {
      ground: 0x1a1a18,       // dark steel floor
      gridLine: 0x2a2a28,     // riveted floor plates
      noBuild: 0x222218,      // conveyor belt
      noBuildLine: 0xaa8833,  // brass conveyor rail
    },
  },
  hellscape: {
    id: 'hellscape',
    ground: 'dirt', // brimstone floor
    rules: [
      { elongated: true, terrain: 'lava' },   // lava rivers
      { minSize: 6, maxAspect: 2, terrain: 'lava' },  // lava pools
      { terrain: 'mountain' },  // obsidian rocks/stalagmites
    ],
  },
  // Hybrid faction themes — custom colors make each map feel unique
  arcane_crystal: {
    id: 'arcane_crystal',
    ground: 'dirt',
    rules: [
      { minSize: 8, maxAspect: 2, terrain: 'water' },  // arcane pools
      { terrain: 'stone' },  // crystal walls / wizard towers
    ],
    colors: {
      ground: 0x1a1828,       // dark purple-tinted floor
      gridLine: 0x2a2838,     // subtle purple grid
      noBuild: 0x2a1848,      // arcane circle glow
      noBuildLine: 0x6644aa,  // purple rune lines
    },
  },
  void_rift: {
    id: 'void_rift',
    ground: 'dirt',
    rules: [
      { minSize: 8, maxAspect: 2, terrain: 'water' },  // void pools
      { terrain: 'mountain' },  // floating island edges
    ],
    colors: {
      ground: 0x0a0816,       // near-black void
      gridLine: 0x1a1428,     // very dark grid
      noBuild: 0x110822,      // rift shimmer
      noBuildLine: 0x22ccaa,  // teal rift energy
    },
  },
  urban: {
    id: 'urban',
    ground: 'dirt',
    rules: [
      { minSize: 6, terrain: 'stone' },  // buildings
      { terrain: 'mountain' },            // rubble piles
    ],
    colors: {
      ground: 0x2a2828,       // cracked concrete/asphalt
      gridLine: 0x3a3838,     // road markings
      noBuild: 0x1a1a18,      // trench dirt
      noBuildLine: 0x555544,  // sandbag outlines
    },
  },
  hive: {
    id: 'hive',
    ground: 'grass',
    rules: [
      { minSize: 10, terrain: 'trees' },  // thick hive walls
      { terrain: 'trees' },                // organic chitin
    ],
    colors: {
      ground: 0x1a2a12,       // dark organic floor
      gridLine: 0x2a3a22,     // chitin-textured grid
      noBuild: 0x223308,      // acid pool edge
      noBuildLine: 0x88ff22,  // acid green glow
    },
  },
  marble: {
    id: 'marble',
    ground: 'sand',
    rules: [
      { minSize: 4, terrain: 'stone' },  // marble pillars / walls
      { terrain: 'stone' },               // all structures are marble
    ],
    colors: {
      ground: 0x2a2a30,       // polished marble floor (slightly blue-gray)
      gridLine: 0x3a3a44,     // marble seam lines
      noBuild: 0x222230,      // cloud shadow
      noBuildLine: 0x8888aa,  // cloud wisps
    },
  },
  neural: {
    id: 'neural',
    ground: 'dirt',
    rules: [
      { minSize: 6, maxAspect: 2, terrain: 'water' },  // thought pools
      { terrain: 'stone' },  // brain tanks / spiral walls
    ],
    colors: {
      ground: 0x18102a,       // deep psychic purple floor
      gridLine: 0x281840,     // neural pathway hints
      noBuild: 0x221440,      // neural corridor
      noBuildLine: 0xaa44cc,  // pulsing psychic energy
    },
  },
  concert: {
    id: 'concert',
    ground: 'dirt',
    rules: [
      { minSize: 4, terrain: 'stone' },  // seating rows / instrument pedestals
      { terrain: 'stone' },               // theater walls
    ],
    colors: {
      ground: 0x2a2018,       // polished wood stage floor
      gridLine: 0x3a3028,     // wood grain lines
      noBuild: 0x1a1420,      // orchestra pit (dark, recessed)
      noBuildLine: 0x6688aa,  // metallic instrument hint
    },
  },
  generic: {
    id: 'generic',
    ground: 'grass',
    rules: [
      { elongated: true, terrain: 'mountain' },
      { minSize: 12, maxAspect: 2, terrain: 'water' },
      { minSize: 6, terrain: 'mountain' },
      { terrain: 'trees' },
    ],
  },
};

// ===================== Cluster Detection =====================

interface Cluster {
  cells: { col: number; row: number }[];
  minCol: number;
  maxCol: number;
  minRow: number;
  maxRow: number;
}

/** Flood-fill adjacent blocked cells into clusters */
export function findClusters(
  blocked: Set<string>,
  rows: number,
  cols: number,
): Cluster[] {
  const visited = new Set<string>();
  const clusters: Cluster[] = [];

  for (const key of blocked) {
    if (visited.has(key)) continue;

    // BFS flood fill
    const cluster: Cluster = {
      cells: [],
      minCol: Infinity, maxCol: -Infinity,
      minRow: Infinity, maxRow: -Infinity,
    };
    const queue = [key];
    visited.add(key);

    while (queue.length > 0) {
      const k = queue.shift()!;
      const [c, r] = k.split(',').map(Number);
      cluster.cells.push({ col: c, row: r });
      cluster.minCol = Math.min(cluster.minCol, c);
      cluster.maxCol = Math.max(cluster.maxCol, c);
      cluster.minRow = Math.min(cluster.minRow, r);
      cluster.maxRow = Math.max(cluster.maxRow, r);

      // Check 4 cardinal neighbors
      for (const [dc, dr] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const nc = c + dc, nr = r + dr;
        const nk = `${nc},${nr}`;
        if (nc >= 0 && nc < cols && nr >= 0 && nr < rows && blocked.has(nk) && !visited.has(nk)) {
          visited.add(nk);
          queue.push(nk);
        }
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}

/** Get the aspect ratio of a cluster's bounding box */
function getAspectRatio(cluster: Cluster): number {
  const w = cluster.maxCol - cluster.minCol + 1;
  const h = cluster.maxRow - cluster.minRow + 1;
  return Math.max(w, h) / Math.max(1, Math.min(w, h));
}

/** Check if a cluster is elongated (aspect ratio > 2.5:1) */
function isElongated(cluster: Cluster): boolean {
  return getAspectRatio(cluster) > 2.5;
}

/** Match a cluster against theme rules, return terrain type */
export function matchCluster(cluster: Cluster, theme: TerrainTheme): BlockedTerrainType {
  const size = cluster.cells.length;
  const elong = isElongated(cluster);
  const aspect = getAspectRatio(cluster);

  for (const rule of theme.rules) {
    if (rule.elongated !== undefined && rule.elongated !== elong) continue;
    if (rule.minSize !== undefined && size < rule.minSize) continue;
    if (rule.maxSize !== undefined && size > rule.maxSize) continue;
    if (rule.maxAspect !== undefined && aspect > rule.maxAspect) continue;
    return rule.terrain;
  }

  // Fallback (shouldn't happen if theme has a default rule)
  return 'mountain';
}

// ===================== Auto-Tile Bitmask =====================

/**
 * Compute the 4-bit auto-tile index for a cell.
 * Bit layout: N(8) E(4) S(2) W(1)
 * Same-type neighbor = 1, different = 0.
 */
export function autoTileIndex(
  col: number,
  row: number,
  terrainMap: Map<string, BlockedTerrainType>,
  myType: BlockedTerrainType,
): number {
  const n = terrainMap.get(`${col},${row - 1}`) === myType ? 8 : 0;
  const e = terrainMap.get(`${col + 1},${row}`) === myType ? 4 : 0;
  const s = terrainMap.get(`${col},${row + 1}`) === myType ? 2 : 0;
  const w = terrainMap.get(`${col - 1},${row}`) === myType ? 1 : 0;
  return n | e | s | w;
}
