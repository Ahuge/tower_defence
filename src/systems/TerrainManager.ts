/**
 * TerrainManager — computes terrain types for each cell and renders terrain sprites.
 *
 * Uses the theme system to assign terrain types to blocked cell clusters,
 * then renders auto-tiled sprites using 4-bit bitmask neighbor lookup.
 */
import Phaser from 'phaser';
import { TILE_SIZE, GRID_COLS, GRID_ROWS, gridX, gridY, gridLeftX, getGridCols } from '../config';
import { Grid, CellType } from './Grid';
import {
  TerrainType, BlockedTerrainType, GroundType,
  TerrainTheme, THEMES,
  findClusters, matchCluster, autoTileIndex,
} from './TerrainTheme';

/** Colors for each terrain type (used for programmatic rendering) */
const TERRAIN_COLORS: Record<BlockedTerrainType, { fill: number; edge: number; accent?: number }> = {
  mountain: { fill: 0x4a3828, edge: 0x6b5040, accent: 0x3a2818 },
  water:    { fill: 0x2244aa, edge: 0x3366cc, accent: 0x1133aa },
  trees:    { fill: 0x226622, edge: 0x338833, accent: 0x114411 },
  stone:    { fill: 0x606068, edge: 0x808088, accent: 0x505058 },
  lava:     { fill: 0x331100, edge: 0x552200, accent: 0xff4400 },
};

const GROUND_COLORS: Record<GroundType, number> = {
  grass: 0x1a2a1a,
  dirt:  0x2a2218,
  sand:  0x3a3520,
};

export class TerrainManager {
  private scene: Phaser.Scene;
  private terrainMap = new Map<string, BlockedTerrainType>();
  private groundType: GroundType = 'grass';
  private graphics: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Compute terrain types for all cells based on grid and theme */
  compute(grid: Grid, themeId: string, gridOffsetY: number = 0): void {
    const theme = THEMES[themeId] ?? THEMES.generic;
    this.groundType = theme.ground;
    this.terrainMap.clear();

    const rows = grid.rows;
    const cols = getGridCols();

    // Collect blocked cells
    const blockedSet = new Set<string>();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid.cells[r][c] === CellType.Blocked) {
          blockedSet.add(`${c},${r}`);
        }
      }
    }

    // Find clusters and assign terrain types
    const clusters = findClusters(blockedSet, rows, cols);
    for (const cluster of clusters) {
      const terrainType = matchCluster(cluster, theme);
      for (const cell of cluster.cells) {
        this.terrainMap.set(`${cell.col},${cell.row}`, terrainType);
      }
    }
  }

  /** Get the terrain type at a cell, or null for non-blocked cells */
  getTerrainAt(col: number, row: number): BlockedTerrainType | null {
    return this.terrainMap.get(`${col},${row}`) ?? null;
  }

  /** Render all terrain using programmatic graphics (no sprites yet) */
  render(grid: Grid, gridOffsetY: number = 0): void {
    if (this.graphics) this.graphics.destroy();
    this.graphics = this.scene.add.graphics().setDepth(0);
    const g = this.graphics;

    const rows = grid.rows;
    const cols = getGridCols();
    const oX = gridLeftX(0);
    const oY = gridOffsetY;

    // Draw ground
    g.fillStyle(GROUND_COLORS[this.groundType], 1);
    g.fillRect(oX, oY, cols * TILE_SIZE, rows * TILE_SIZE);

    // Draw grid lines
    g.lineStyle(1, 0x333333, 0.2);
    for (let c = 0; c <= cols; c++) {
      g.lineBetween(gridLeftX(c), oY, gridLeftX(c), oY + rows * TILE_SIZE);
    }
    for (let r = 0; r <= rows; r++) {
      g.lineBetween(oX, oY + r * TILE_SIZE, oX + cols * TILE_SIZE, oY + r * TILE_SIZE);
    }

    // Draw terrain tiles with auto-tile shading
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const terrain = this.terrainMap.get(`${c},${r}`);
        if (!terrain) continue;

        const x = gridLeftX(c);
        const y = oY + r * TILE_SIZE;
        const colors = TERRAIN_COLORS[terrain];
        const tileIdx = autoTileIndex(c, r, this.terrainMap, terrain);

        this.drawTerrainTile(g, x, y, terrain, colors, tileIdx);
      }
    }

    // Draw NoBuild cells
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid.cells[r][c] === CellType.NoBuild) {
          const x = gridLeftX(c);
          const y = oY + r * TILE_SIZE;
          g.fillStyle(0x2a2222, 0.6);
          g.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          g.lineStyle(1, 0x442222, 0.3);
          g.lineBetween(x + 4, y + 4, x + TILE_SIZE - 4, y + TILE_SIZE - 4);
          g.lineBetween(x + TILE_SIZE - 4, y + 4, x + 4, y + TILE_SIZE - 4);
        }
      }
    }

    // Ground decorations — scattered doodads on walkable tiles
    this.drawGroundDoodads(g, grid, oY, rows, cols);

    // Entry/exit markers (kept as colored squares)
    for (const entry of grid.entries) {
      g.fillStyle(0x44ff44, 0.5);
      g.fillRect(gridLeftX(entry.col), oY + entry.row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
    for (const exit of grid.exits) {
      g.fillStyle(0xff4444, 0.5);
      g.fillRect(gridLeftX(exit.col), oY + exit.row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  /** Simple seeded random for consistent decoration placement */
  private seededRand(x: number, y: number, seed: number = 0): number {
    let h = (x * 374761393 + y * 668265263 + seed * 1274126177) | 0;
    h = ((h ^ (h >> 13)) * 1103515245) | 0;
    return ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff;
  }

  /** Draw scattered ground decorations on walkable tiles */
  private drawGroundDoodads(
    g: Phaser.GameObjects.Graphics,
    grid: Grid,
    oY: number,
    rows: number,
    cols: number,
  ): void {
    const isGrass = this.groundType === 'grass';

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = grid.cells[r][c];
        if (cell === CellType.Blocked || cell === CellType.NoBuild) continue;

        const x = gridLeftX(c);
        const y = oY + r * TILE_SIZE;
        const rand = this.seededRand(c, r);

        // ~20% of tiles get a decoration
        if (rand > 0.20) continue;

        const rand2 = this.seededRand(c, r, 1);
        const rand3 = this.seededRand(c, r, 2);
        const dx = 4 + Math.floor(rand2 * (TILE_SIZE - 8));
        const dy = 4 + Math.floor(rand3 * (TILE_SIZE - 8));

        if (isGrass) {
          const doodadType = Math.floor(this.seededRand(c, r, 3) * 4);
          if (doodadType === 0) {
            // Small bush
            g.fillStyle(0x2a5a2a, 0.4);
            g.fillCircle(x + dx, y + dy, 3);
            g.fillStyle(0x3a7a3a, 0.3);
            g.fillCircle(x + dx + 1, y + dy - 1, 2);
          } else if (doodadType === 1) {
            // Grass tuft
            g.lineStyle(1, 0x3a6a3a, 0.35);
            g.lineBetween(x + dx, y + dy, x + dx - 2, y + dy - 5);
            g.lineBetween(x + dx, y + dy, x + dx + 1, y + dy - 6);
            g.lineBetween(x + dx, y + dy, x + dx + 3, y + dy - 4);
          } else if (doodadType === 2) {
            // Small flower
            g.fillStyle(0x4a8a4a, 0.3);
            g.fillCircle(x + dx, y + dy, 2);
            const flowerColor = [0xffaa44, 0xff6688, 0xaabb55, 0xdddd44][Math.floor(this.seededRand(c, r, 4) * 4)];
            g.fillStyle(flowerColor, 0.4);
            g.fillCircle(x + dx, y + dy - 2, 1.5);
          } else {
            // Small pebble
            g.fillStyle(0x555544, 0.25);
            g.fillCircle(x + dx, y + dy, 1.5);
          }
        } else {
          // Dirt/sand ground: small rocks and cracks
          const doodadType = Math.floor(this.seededRand(c, r, 3) * 3);
          if (doodadType === 0) {
            // Small rock
            g.fillStyle(0x444438, 0.3);
            g.fillCircle(x + dx, y + dy, 2);
          } else if (doodadType === 1) {
            // Crack
            g.lineStyle(1, 0x1a1810, 0.25);
            g.lineBetween(x + dx, y + dy, x + dx + 4, y + dy + 3);
            g.lineBetween(x + dx + 4, y + dy + 3, x + dx + 6, y + dy + 1);
          } else {
            // Tiny pebbles
            g.fillStyle(0x3a3830, 0.2);
            g.fillCircle(x + dx, y + dy, 1);
            g.fillCircle(x + dx + 3, y + dy + 2, 1);
          }
        }
      }
    }
  }

  /** Draw a single terrain tile with edge/corner awareness */
  private drawTerrainTile(
    g: Phaser.GameObjects.Graphics,
    x: number, y: number,
    terrain: BlockedTerrainType,
    colors: { fill: number; edge: number; accent?: number },
    tileIdx: number,
  ): void {
    const s = TILE_SIZE;
    const hasN = !!(tileIdx & 8);
    const hasE = !!(tileIdx & 4);
    const hasS = !!(tileIdx & 2);
    const hasW = !!(tileIdx & 1);

    // Base fill
    g.fillStyle(colors.fill, 1);
    g.fillRect(x, y, s, s);

    // Edge highlights — lighter color on exposed edges (where no neighbor)
    const edgeW = 3;
    g.fillStyle(colors.edge, 0.6);
    if (!hasN) g.fillRect(x, y, s, edgeW);
    if (!hasS) g.fillRect(x, y + s - edgeW, s, edgeW);
    if (!hasW) g.fillRect(x, y, edgeW, s);
    if (!hasE) g.fillRect(x + s - edgeW, y, edgeW, s);

    // Terrain-specific detail
    if (terrain === 'mountain') {
      // Rocky crag texture
      g.fillStyle(colors.accent ?? 0x3a2818, 0.5);
      g.fillRect(x + 3, y + 5, 6, 5);
      g.fillRect(x + 16, y + 2, 7, 6);
      g.fillRect(x + 7, y + 15, 8, 5);
      // Lighter rock highlights
      g.fillStyle(0x7a6850, 0.35);
      g.fillRect(x + 10, y + 8, 4, 3);
      g.fillRect(x + 2, y + 18, 5, 3);
      // Peak/ridge highlight on exposed top edge
      if (!hasN) {
        g.fillStyle(0x8a7860, 0.5);
        const peakW = 8 + ((x * 7 + y * 3) % 6);
        const peakX = x + 4 + ((x * 3) % 5);
        g.beginPath();
        g.moveTo(peakX, y + 4);
        g.lineTo(peakX + peakW / 2, y);
        g.lineTo(peakX + peakW, y + 4);
        g.closePath();
        g.fillPath();
      }
    } else if (terrain === 'water') {
      // Wave lines
      g.lineStyle(1, 0x4488dd, 0.4);
      g.lineBetween(x + 4, y + 8, x + s - 4, y + 10);
      g.lineBetween(x + 6, y + 18, x + s - 6, y + 16);
    } else if (terrain === 'trees') {
      // Tree canopy circles
      g.fillStyle(0x33aa33, 0.5);
      g.fillCircle(x + 8, y + 10, 5);
      g.fillCircle(x + 20, y + 8, 4);
      g.fillCircle(x + 14, y + 18, 5);
      // Trunk hints
      g.fillStyle(0x553311, 0.4);
      g.fillRect(x + 7, y + 14, 2, 4);
      g.fillRect(x + 19, y + 11, 2, 4);
    } else if (terrain === 'stone') {
      // Brick pattern
      g.lineStyle(1, 0x555555, 0.5);
      g.lineBetween(x, y + 7, x + s, y + 7);
      g.lineBetween(x, y + 14, x + s, y + 14);
      g.lineBetween(x, y + 21, x + s, y + 21);
      g.lineBetween(x + 7, y, x + 7, y + 7);
      g.lineBetween(x + 21, y, x + 21, y + 7);
      g.lineBetween(x + 14, y + 7, x + 14, y + 14);
      g.lineBetween(x + 7, y + 14, x + 7, y + 21);
      g.lineBetween(x + 21, y + 14, x + 21, y + 21);
      g.lineBetween(x + 14, y + 21, x + 14, y + 28);
    } else if (terrain === 'lava') {
      // Dark rock with glowing cracks
      g.fillStyle(0x220000, 0.5);
      g.fillRect(x + 3, y + 5, 8, 6);
      g.fillRect(x + 15, y + 15, 9, 5);
      // Glow cracks
      g.lineStyle(1, colors.accent ?? 0xff4400, 0.6);
      g.lineBetween(x + 5, y + 3, x + 12, y + 12);
      g.lineBetween(x + 16, y + 8, x + 22, y + 20);
      g.lineBetween(x + 8, y + 20, x + 18, y + 24);
    }

    // Subtle border on all terrain
    g.lineStyle(1, 0x000000, 0.15);
    g.strokeRect(x, y, s, s);
  }

  destroy(): void {
    this.graphics?.destroy();
    this.terrainMap.clear();
  }
}
