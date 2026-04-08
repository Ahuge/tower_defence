/**
 * TerrainManager — computes terrain types for each cell and renders terrain sprites.
 *
 * Uses the theme system to assign terrain types to blocked cell clusters,
 * then renders auto-tiled sprites from the terrain spritesheet.
 * Water and lava tiles are animated via Phaser animations.
 * Ground doodads are scattered on walkable tiles from a separate sheet.
 */
import Phaser from 'phaser';
import { TILE_SIZE, gridLeftX, getGridCols } from '../config';
import { Grid, CellType } from './Grid';
import {
  BlockedTerrainType, GroundType,
  THEMES,
  findClusters, matchCluster, autoTileIndex,
} from './TerrainTheme';

const TILESET_KEY = 'terrain_tileset';
const DOODAD_KEY = 'terrain_doodads';
const COLS = 16; // auto-tile variants per row

/** Row index in the tileset for each terrain type */
const TERRAIN_ROW: Record<string, number> = {
  grass: 0,
  dirt: 1,
  mountain: 2,
  trees: 3,
  stone: 4,
  water: 5,  // frames 0,1,2 at rows 5,6,7
  lava: 8,   // frames 0,1,2 at rows 8,9,10
};

const DOODAD_COLS = 8;

export class TerrainManager {
  private scene: Phaser.Scene;
  private terrainMap = new Map<string, BlockedTerrainType>();
  private groundType: GroundType = 'grass';
  private terrainSprites: Phaser.GameObjects.Sprite[] = [];
  private doodadSprites: Phaser.GameObjects.Image[] = [];
  private groundGraphics: Phaser.GameObjects.Graphics | null = null;
  private useSpritesheet = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Preload terrain assets — call in scene.preload() */
  static preload(scene: Phaser.Scene): void {
    scene.load.spritesheet(TILESET_KEY, 'assets/terrain/terrain_tileset.png', {
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE,
    });
    scene.load.spritesheet(DOODAD_KEY, 'assets/terrain/terrain_doodads.png', {
      frameWidth: TILE_SIZE,
      frameHeight: TILE_SIZE,
    });
  }

  /** Create animations for water and lava — call in scene.create() */
  static createAnimations(scene: Phaser.Scene): void {
    // Water: rows 5,6,7 → 3 frames per auto-tile variant
    for (let v = 0; v < COLS; v++) {
      const key = `terrain_water_${v}`;
      if (scene.anims.exists(key)) continue;
      scene.anims.create({
        key,
        frames: [
          { key: TILESET_KEY, frame: 5 * COLS + v },
          { key: TILESET_KEY, frame: 6 * COLS + v },
          { key: TILESET_KEY, frame: 7 * COLS + v },
        ],
        frameRate: 2,
        repeat: -1,
      });
    }
    // Lava: rows 8,9,10
    for (let v = 0; v < COLS; v++) {
      const key = `terrain_lava_${v}`;
      if (scene.anims.exists(key)) continue;
      scene.anims.create({
        key,
        frames: [
          { key: TILESET_KEY, frame: 8 * COLS + v },
          { key: TILESET_KEY, frame: 9 * COLS + v },
          { key: TILESET_KEY, frame: 10 * COLS + v },
        ],
        frameRate: 1.7,
        repeat: -1,
      });
    }
  }

  /** Compute terrain types for all cells based on grid and theme */
  compute(grid: Grid, themeId: string): void {
    const theme = THEMES[themeId] ?? THEMES.generic;
    this.groundType = theme.ground;
    this.terrainMap.clear();

    const rows = grid.rows;
    const cols = getGridCols();

    const blockedSet = new Set<string>();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid.cells[r][c] === CellType.Blocked) {
          blockedSet.add(`${c},${r}`);
        }
      }
    }

    const clusters = findClusters(blockedSet, rows, cols);
    for (const cluster of clusters) {
      const terrainType = matchCluster(cluster, theme);
      for (const cell of cluster.cells) {
        this.terrainMap.set(`${cell.col},${cell.row}`, terrainType);
      }
    }
  }

  /** Render terrain using spritesheet tiles */
  render(grid: Grid, gridOffsetY: number = 0): void {
    this.clear();

    const rows = grid.rows;
    const cols = getGridCols();
    const oY = gridOffsetY;
    this.useSpritesheet = this.scene.textures.exists(TILESET_KEY);

    // Ground layer (graphics for the base fill + grid lines)
    this.groundGraphics = this.scene.add.graphics().setDepth(0);
    const groundColor = this.groundType === 'dirt' ? 0x2a2218 : this.groundType === 'sand' ? 0x3a3520 : 0x1a2a1a;
    this.groundGraphics.fillStyle(groundColor, 1);
    this.groundGraphics.fillRect(gridLeftX(0), oY, cols * TILE_SIZE, rows * TILE_SIZE);

    // Grid lines
    this.groundGraphics.lineStyle(1, 0x333333, 0.15);
    for (let c = 0; c <= cols; c++) {
      this.groundGraphics.lineBetween(gridLeftX(c), oY, gridLeftX(c), oY + rows * TILE_SIZE);
    }
    for (let r = 0; r <= rows; r++) {
      this.groundGraphics.lineBetween(gridLeftX(0), oY + r * TILE_SIZE, gridLeftX(0) + cols * TILE_SIZE, oY + r * TILE_SIZE);
    }

    // Ground tiles (grass/dirt sprites on each walkable cell for texture)
    if (this.useSpritesheet) {
      const groundRow = TERRAIN_ROW[this.groundType] ?? 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid.cells[r][c] === CellType.Blocked) continue;
          const x = gridLeftX(c) + TILE_SIZE / 2;
          const y = oY + r * TILE_SIZE + TILE_SIZE / 2;
          // Use variant 15 (center/full) for ground tiles
          const frame = groundRow * COLS + 15;
          const spr = this.scene.add.image(x, y, TILESET_KEY, frame).setDepth(0);
          spr.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
          this.doodadSprites.push(spr); // reuse array for cleanup
        }
      }
    }

    // Terrain tiles (blocked cells)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const terrain = this.terrainMap.get(`${c},${r}`);
        if (!terrain) continue;

        const x = gridLeftX(c) + TILE_SIZE / 2;
        const y = oY + r * TILE_SIZE + TILE_SIZE / 2;
        const tileIdx = autoTileIndex(c, r, this.terrainMap, terrain);

        if (this.useSpritesheet && (terrain === 'water' || terrain === 'lava')) {
          // Animated sprite
          const spr = this.scene.add.sprite(x, y, TILESET_KEY).setDepth(1);
          spr.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
          spr.play(`terrain_${terrain}_${tileIdx}`);
          this.terrainSprites.push(spr);
        } else if (this.useSpritesheet) {
          // Static sprite
          const row = TERRAIN_ROW[terrain] ?? 2;
          const frame = row * COLS + tileIdx;
          const spr = this.scene.add.sprite(x, y, TILESET_KEY, frame).setDepth(1);
          spr.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
          this.terrainSprites.push(spr);
        } else {
          // Fallback: programmatic (if spritesheet not loaded)
          this.drawTerrainFallback(this.groundGraphics, gridLeftX(c), oY + r * TILE_SIZE, terrain, tileIdx);
        }
      }
    }

    // NoBuild cells
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid.cells[r][c] === CellType.NoBuild) {
          const x = gridLeftX(c);
          const y = oY + r * TILE_SIZE;
          this.groundGraphics.fillStyle(0x2a2222, 0.6);
          this.groundGraphics.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          this.groundGraphics.lineStyle(1, 0x442222, 0.3);
          this.groundGraphics.lineBetween(x + 4, y + 4, x + TILE_SIZE - 4, y + TILE_SIZE - 4);
          this.groundGraphics.lineBetween(x + TILE_SIZE - 4, y + 4, x + 4, y + TILE_SIZE - 4);
        }
      }
    }

    // Doodads on walkable ground
    this.renderDoodads(grid, oY, rows, cols);

    // Entry/exit markers — rendered above ground tiles and doodads
    const markers = this.scene.add.graphics().setDepth(3);
    this.terrainSprites.push(markers as any); // track for cleanup
    for (const entry of grid.entries) {
      markers.fillStyle(0x44ff44, 0.5);
      markers.fillRect(gridLeftX(entry.col), oY + entry.row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
    for (const exit of grid.exits) {
      markers.fillStyle(0xff4444, 0.5);
      markers.fillRect(gridLeftX(exit.col), oY + exit.row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  /** Scatter doodad sprites on walkable tiles */
  private renderDoodads(grid: Grid, oY: number, rows: number, cols: number): void {
    const hasDoodadSheet = this.scene.textures.exists(DOODAD_KEY);
    const doodadRow = this.groundType === 'dirt' || this.groundType === 'sand' ? 1 : 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = grid.cells[r][c];
        if (cell === CellType.Blocked || cell === CellType.NoBuild) continue;

        const rand = this.seededRand(c, r);
        const isGrass = this.groundType === 'grass';
        if (isGrass && rand > 0.70) continue;   // ~70% of grass tiles get a doodad
        if (!isGrass && rand > 0.18) continue;   // ~18% of dirt/sand tiles

        const doodadIdx = Math.floor(this.seededRand(c, r, 3) * DOODAD_COLS);
        const x = gridLeftX(c) + TILE_SIZE / 2;
        const y = oY + r * TILE_SIZE + TILE_SIZE / 2;

        if (hasDoodadSheet) {
          const frame = doodadRow * DOODAD_COLS + doodadIdx;
          const spr = this.scene.add.image(x, y, DOODAD_KEY, frame).setDepth(2);
          spr.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
          this.doodadSprites.push(spr);
        }
        // No programmatic fallback needed — ground doodads are optional polish
      }
    }
  }

  /** Simple seeded random for consistent decoration placement */
  private seededRand(x: number, y: number, seed: number = 0): number {
    let h = (x * 374761393 + y * 668265263 + seed * 1274126177) | 0;
    h = ((h ^ (h >> 13)) * 1103515245) | 0;
    return ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff;
  }

  /** Programmatic fallback for blocked terrain (when spritesheet not loaded) */
  private drawTerrainFallback(g: Phaser.GameObjects.Graphics, x: number, y: number, terrain: BlockedTerrainType, tileIdx: number): void {
    const s = TILE_SIZE;
    const hasN = !!(tileIdx & 8), hasE = !!(tileIdx & 4), hasS = !!(tileIdx & 2), hasW = !!(tileIdx & 1);
    const colors: Record<BlockedTerrainType, [number, number]> = {
      mountain: [0x4a3828, 0x6b5040], water: [0x2244aa, 0x3366cc],
      trees: [0x226622, 0x338833], stone: [0x606068, 0x808088], lava: [0x331100, 0x552200],
    };
    const [fill, edge] = colors[terrain];
    g.fillStyle(fill, 1);
    g.fillRect(x, y, s, s);
    g.fillStyle(edge, 0.6);
    if (!hasN) g.fillRect(x, y, s, 3);
    if (!hasS) g.fillRect(x, y + s - 3, s, 3);
    if (!hasW) g.fillRect(x, y, 3, s);
    if (!hasE) g.fillRect(x + s - 3, y, 3, s);
    g.lineStyle(1, 0x000000, 0.15);
    g.strokeRect(x, y, s, s);
  }

  getTerrainAt(col: number, row: number): BlockedTerrainType | null {
    return this.terrainMap.get(`${col},${row}`) ?? null;
  }

  clear(): void {
    for (const spr of this.terrainSprites) spr.destroy();
    this.terrainSprites = [];
    for (const spr of this.doodadSprites) spr.destroy();
    this.doodadSprites = [];
    this.groundGraphics?.destroy();
    this.groundGraphics = null;
  }

  destroy(): void {
    this.clear();
    this.terrainMap.clear();
  }
}
