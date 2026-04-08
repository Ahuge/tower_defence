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
