import { Grid, CellType } from '../Grid';
import { findPath } from '../Pathfinding';
import {
  CHUNK_SIZE,
  ChunkTemplate,
  ChunkEdges,
  BASE_CHUNKS,
  OPEN_CHUNKS,
  RESOURCE_CHUNKS,
  parseChunkLayout,
  rotateChunk90,
  rotateEdges90,
} from '../../data/basedefence/Chunks';

export interface BaseDefenceMapResult {
  grid: Grid;
  /** Player base center in tile coords */
  playerBase: { col: number; row: number };
  /** CPU base center in tile coords */
  cpuBase: { col: number; row: number };
  /** Map dimensions in chunks */
  chunksX: number;
  chunksY: number;
}

/**
 * Generates a chunk-based map for Base Defence mode.
 *
 * Layout strategy:
 * - Player base chunk placed near one corner
 * - CPU base chunk placed near the opposite corner
 * - 1-2 resource chunks scattered in the middle
 * - Remaining slots filled with open chunks
 * - Edges between chunks are smoothed to ensure connectivity
 */
export function generateBaseDefenceMap(
  seed: number,
  chunksX: number = 5,
  chunksY: number = 4,
): BaseDefenceMapResult {
  const rng = seededRandom(seed);
  const totalCols = chunksX * CHUNK_SIZE;
  const totalRows = chunksY * CHUNK_SIZE;

  // Create the grid
  const grid = new Grid(undefined, totalRows, totalCols);
  grid.entries = [];
  grid.exits = [];

  // Determine chunk assignments
  const chunkMap: (ChunkTemplate | null)[][] = Array.from(
    { length: chunksY },
    () => Array(chunksX).fill(null)
  );
  // Track rotation per chunk (0, 1, 2, 3 = number of 90° CW rotations)
  const rotations: number[][] = Array.from(
    { length: chunksY },
    () => Array(chunksX).fill(0)
  );

  // Player base: bottom-left area (with some randomness)
  const playerChunkX = Math.floor(rng() * Math.min(2, chunksX - 1));
  const playerChunkY = chunksY - 1 - Math.floor(rng() * Math.min(2, chunksY - 1));

  // CPU base: top-right area (with some randomness)
  const cpuChunkX = chunksX - 1 - Math.floor(rng() * Math.min(2, chunksX - 1));
  const cpuChunkY = Math.floor(rng() * Math.min(2, chunksY - 1));

  // Assign base chunks with appropriate rotation
  const playerBaseTemplate = pickRandom(BASE_CHUNKS, rng);
  const cpuBaseTemplate = pickRandom(BASE_CHUNKS, rng);

  // Player base: open edges should face toward center (north+east for bottom-left)
  // Base chunks default to open south+east, so we need rotation based on position
  const playerRotation = getBaseRotation(playerChunkX, playerChunkY, chunksX, chunksY);
  chunkMap[playerChunkY][playerChunkX] = playerBaseTemplate;
  rotations[playerChunkY][playerChunkX] = playerRotation;

  // CPU base: open edges should face toward center
  const cpuRotation = getBaseRotation(cpuChunkX, cpuChunkY, chunksX, chunksY);
  chunkMap[cpuChunkY][cpuChunkX] = cpuBaseTemplate;
  rotations[cpuChunkY][cpuChunkX] = cpuRotation;

  // Place 1-3 resource chunks in the middle area
  const resourceCount = 1 + Math.floor(rng() * 3);
  let placed = 0;
  for (let attempt = 0; attempt < 30 && placed < resourceCount; attempt++) {
    const rx = 1 + Math.floor(rng() * (chunksX - 2));
    const ry = 1 + Math.floor(rng() * Math.max(1, chunksY - 2));
    if (!chunkMap[ry][rx]) {
      chunkMap[ry][rx] = pickRandom(RESOURCE_CHUNKS, rng);
      rotations[ry][rx] = Math.floor(rng() * 4);
      placed++;
    }
  }

  // Fill remaining with open chunks
  for (let cy = 0; cy < chunksY; cy++) {
    for (let cx = 0; cx < chunksX; cx++) {
      if (!chunkMap[cy][cx]) {
        chunkMap[cy][cx] = pickRandom(OPEN_CHUNKS, rng);
        rotations[cy][cx] = Math.floor(rng() * 4);
      }
    }
  }

  // Stamp chunks onto the grid
  for (let cy = 0; cy < chunksY; cy++) {
    for (let cx = 0; cx < chunksX; cx++) {
      const template = chunkMap[cy][cx]!;
      let cells = parseChunkLayout(template.layout);

      // Apply rotation
      const rot = template.rotatable ? rotations[cy][cx] : 0;
      for (let r = 0; r < rot; r++) {
        cells = rotateChunk90(cells);
      }

      // Stamp onto grid
      const startCol = cx * CHUNK_SIZE;
      const startRow = cy * CHUNK_SIZE;
      for (let r = 0; r < CHUNK_SIZE; r++) {
        for (let c = 0; c < CHUNK_SIZE; c++) {
          const gc = startCol + c;
          const gr = startRow + r;
          if (gc < totalCols && gr < totalRows) {
            grid.cells[gr][gc] = cells[r][c];
          }
        }
      }
    }
  }

  // Ensure connectivity between adjacent chunks by clearing border strips
  ensureChunkConnectivity(grid, chunksX, chunksY, rng);

  // Scatter resource clusters across the map (in addition to chunk-designed ones)
  // Gold: 8 clusters of 3-5 deposits each
  scatterResources(grid, rng, totalCols, totalRows, CellType.GoldDeposit, 8);
  // Gas: 4 clusters of 1-2 geysers each
  scatterResources(grid, rng, totalCols, totalRows, CellType.Geyser, 4);

  // Ensure outer edges of the map are blocked (world boundary walls)
  addMapBorder(grid, totalCols, totalRows);

  // Calculate base center positions (in tile coords)
  const playerBase = findBaseCenter(grid, playerChunkX, playerChunkY);
  const cpuBase = findBaseCenter(grid, cpuChunkX, cpuChunkY);

  // CRITICAL: Carve a guaranteed path between the two bases
  // This ensures the map is always connected regardless of chunk layout
  ensureBasePath(grid, playerBase, cpuBase);

  return { grid, playerBase, cpuBase, chunksX, chunksY };
}

/**
 * Determine rotation for a base chunk so its open edges face toward the map center.
 * Base chunks default to open on south+east edges.
 * Returns number of 90° CW rotations needed.
 */
function getBaseRotation(cx: number, cy: number, chunksX: number, chunksY: number): number {
  const midX = (chunksX - 1) / 2;
  const midY = (chunksY - 1) / 2;

  // Base template opens south+east by default
  // We want the opening to face toward center
  if (cx <= midX && cy >= midY) {
    // Bottom-left → open north+east → rotate 1 (90° CW)
    return 1;
  } else if (cx > midX && cy >= midY) {
    // Bottom-right → open north+west → rotate 2 (180°)
    return 2;
  } else if (cx > midX && cy < midY) {
    // Top-right → open south+west → rotate 3 (270°)
    return 3;
  } else {
    // Top-left → open south+east → no rotation
    return 0;
  }
}

/**
 * Clear 2-tile-wide corridors at chunk borders to ensure units can move between chunks.
 * We carve passages at the midpoint of each shared edge.
 */
function ensureChunkConnectivity(
  grid: Grid,
  chunksX: number,
  chunksY: number,
  rng: () => number,
): void {
  // Vertical borders (between horizontally adjacent chunks)
  for (let cy = 0; cy < chunksY; cy++) {
    for (let cx = 0; cx < chunksX - 1; cx++) {
      const borderCol = (cx + 1) * CHUNK_SIZE; // first col of right chunk
      // Carve 1-3 passages along this border
      const passageCount = 1 + Math.floor(rng() * 3);
      for (let p = 0; p < passageCount; p++) {
        const passageRow = cy * CHUNK_SIZE + 4 + Math.floor(rng() * (CHUNK_SIZE - 8));
        const passageWidth = 2 + Math.floor(rng() * 3);
        for (let dr = 0; dr < passageWidth; dr++) {
          const r = passageRow + dr;
          if (r >= 0 && r < grid.rows) {
            // Clear cells on both sides of the border
            for (let dc = -2; dc <= 2; dc++) {
              const c = borderCol + dc;
              if (c >= 0 && c < grid.cols) {
                const cell = grid.cells[r][c];
                if (cell === CellType.Blocked) {
                  grid.cells[r][c] = CellType.Empty;
                }
              }
            }
          }
        }
      }
    }
  }

  // Horizontal borders (between vertically adjacent chunks)
  for (let cy = 0; cy < chunksY - 1; cy++) {
    for (let cx = 0; cx < chunksX; cx++) {
      const borderRow = (cy + 1) * CHUNK_SIZE;
      const passageCount = 1 + Math.floor(rng() * 3);
      for (let p = 0; p < passageCount; p++) {
        const passageCol = cx * CHUNK_SIZE + 4 + Math.floor(rng() * (CHUNK_SIZE - 8));
        const passageWidth = 2 + Math.floor(rng() * 3);
        for (let dc = 0; dc < passageWidth; dc++) {
          const c = passageCol + dc;
          if (c >= 0 && c < grid.cols) {
            for (let dr = -2; dr <= 2; dr++) {
              const r = borderRow + dr;
              if (r >= 0 && r < grid.rows) {
                const cell = grid.cells[r][c];
                if (cell === CellType.Blocked) {
                  grid.cells[r][c] = CellType.Empty;
                }
              }
            }
          }
        }
      }
    }
  }
}

/** Add a 1-tile blocked border around the entire map */
function addMapBorder(grid: Grid, cols: number, rows: number): void {
  for (let c = 0; c < cols; c++) {
    grid.cells[0][c] = CellType.Blocked;
    grid.cells[rows - 1][c] = CellType.Blocked;
  }
  for (let r = 0; r < rows; r++) {
    grid.cells[r][0] = CellType.Blocked;
    grid.cells[r][cols - 1] = CellType.Blocked;
  }
}

/**
 * Find a good center position within a base chunk.
 * Looks for the largest empty area near the chunk center.
 */
function findBaseCenter(grid: Grid, chunkX: number, chunkY: number): { col: number; row: number } {
  const startCol = chunkX * CHUNK_SIZE;
  const startRow = chunkY * CHUNK_SIZE;
  const centerCol = startCol + Math.floor(CHUNK_SIZE / 2);
  const centerRow = startRow + Math.floor(CHUNK_SIZE / 2);

  // Spiral search outward from chunk center for an empty cell
  for (let radius = 0; radius < CHUNK_SIZE; radius++) {
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (Math.abs(dr) !== radius && Math.abs(dc) !== radius) continue;
        const r = centerRow + dr;
        const c = centerCol + dc;
        if (r >= 0 && r < grid.rows && c >= 0 && c < grid.cols) {
          if (grid.cells[r][c] === CellType.Empty) {
            return { col: c, row: r };
          }
        }
      }
    }
  }

  // Fallback
  return { col: centerCol, row: centerRow };
}

/**
 * Scatter resource clusters across the map.
 * Places groups of 3-5 deposits clustered together (not randomly scattered single tiles).
 */
function scatterResources(
  grid: Grid, rng: () => number,
  cols: number, rows: number,
  cellType: CellType, clusterCount: number,
): void {
  for (let cluster = 0; cluster < clusterCount; cluster++) {
    // Pick a random center for this cluster
    let cx = 0, cy = 0;
    let found = false;
    for (let attempt = 0; attempt < 50; attempt++) {
      cx = 5 + Math.floor(rng() * (cols - 10));
      cy = 5 + Math.floor(rng() * (rows - 10));
      if (grid.cells[cy][cx] === CellType.Empty) { found = true; break; }
    }
    if (!found) continue;

    // Place 3-5 deposits in a tight cluster around the center
    const size = cellType === CellType.GoldDeposit ? 3 + Math.floor(rng() * 3) : 1 + Math.floor(rng() * 2);
    let placed = 0;
    for (let attempt = 0; attempt < size * 10 && placed < size; attempt++) {
      const dc = Math.floor(rng() * 5) - 2;
      const dr = Math.floor(rng() * 5) - 2;
      const c = cx + dc;
      const r = cy + dr;
      if (c >= 2 && c < cols - 2 && r >= 2 && r < rows - 2 && grid.cells[r][c] === CellType.Empty) {
        grid.cells[r][c] = cellType;
        placed++;
      }
    }
  }
}

/**
 * Ensure there's a walkable path between the two bases.
 * If A* can't find one, carve a 3-wide corridor along an L-shaped route.
 */
function ensureBasePath(
  grid: Grid,
  playerBase: { col: number; row: number },
  cpuBase: { col: number; row: number },
): void {
  // Always carve a wide corridor between bases to guarantee connectivity.
  // Even if A* finds a path now, buildings placed later could block it.
  const midCol = Math.round((playerBase.col + cpuBase.col) / 2);

  // Horizontal from player to midpoint
  const startRow = playerBase.row;
  const endRow = cpuBase.row;
  const colFrom = Math.min(playerBase.col, midCol);
  const colTo = Math.max(playerBase.col, midCol);
  const W = 5; // corridor width — wide enough that buildings won't block it
  for (let c = colFrom; c <= colTo; c++) {
    carveWidth(grid, c, startRow, W);
  }

  // Vertical from player row to CPU row at midpoint
  const rowFrom = Math.min(startRow, endRow);
  const rowTo = Math.max(startRow, endRow);
  for (let r = rowFrom; r <= rowTo; r++) {
    carveWidth(grid, midCol, r, W);
  }

  // Horizontal from midpoint to CPU
  const colFrom2 = Math.min(cpuBase.col, midCol);
  const colTo2 = Math.max(cpuBase.col, midCol);
  for (let c = colFrom2; c <= colTo2; c++) {
    carveWidth(grid, c, endRow, W);
  }
}

/** Carve a square of walkable tiles centered on (col, row) */
function carveWidth(grid: Grid, col: number, row: number, width: number): void {
  const half = Math.floor(width / 2);
  for (let dr = -half; dr <= half; dr++) {
    for (let dc = -half; dc <= half; dc++) {
      const r = row + dr;
      const c = col + dc;
      if (r >= 1 && r < grid.rows - 1 && c >= 1 && c < grid.cols - 1) {
        if (grid.cells[r][c] === CellType.Blocked) {
          grid.cells[r][c] = CellType.Empty;
        }
      }
    }
  }
}

function pickRandom<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}
