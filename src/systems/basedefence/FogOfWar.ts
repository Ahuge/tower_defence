import { TILE_SIZE } from '../../config';
import { Grid } from '../Grid';
import { RtsUnit } from '../../entities/RtsUnit';
import { Building } from '../../entities/Building';
import { RtsTower } from './TowerDefence';

/**
 * Tile visibility state:
 *  0 = unexplored (never seen — render black)
 *  1 = explored but not visible (seen before — render dim)
 *  2 = visible (currently in sight — render full)
 */
export type FogState = 0 | 1 | 2;

/** Vision radius in tiles for different entity types */
const UNIT_VISION = 8;
const BUILDER_VISION = 6;
const BUILDING_VISION = 10;
const TOWER_VISION = 8;

/**
 * Fog of War system for Base Defence mode.
 *
 * Maintains a per-tile visibility grid for the player.
 * CPU always has full vision (cheats).
 *
 * Three states:
 * - Unexplored (0): never seen, rendered as opaque black
 * - Explored (1): seen before but not currently visible, rendered as semi-transparent
 * - Visible (2): currently in line of sight, fully visible
 *
 * Updated each frame: all tiles reset to explored (if previously visible),
 * then vision sources light up tiles around them.
 */
export class FogOfWar {
  /** Visibility state per tile [row][col] */
  readonly fog: FogState[][];
  readonly rows: number;
  readonly cols: number;

  /** Pre-computed circle offsets for each vision radius */
  private circleCache: Map<number, { dc: number; dr: number }[]> = new Map();

  constructor(rows: number, cols: number) {
    this.rows = rows;
    this.cols = cols;
    this.fog = Array.from({ length: rows }, () =>
      new Array<FogState>(cols).fill(0)
    );

    // Pre-compute vision circles
    for (const r of [BUILDER_VISION, UNIT_VISION, BUILDING_VISION, TOWER_VISION]) {
      this.precomputeCircle(r);
    }
  }

  private precomputeCircle(radius: number): void {
    if (this.circleCache.has(radius)) return;
    const offsets: { dc: number; dr: number }[] = [];
    const r2 = radius * radius;
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (dr * dr + dc * dc <= r2) {
          offsets.push({ dc, dr });
        }
      }
    }
    this.circleCache.set(radius, offsets);
  }

  /**
   * Update fog state for the current frame.
   * Call once per frame with all player vision sources.
   */
  update(
    playerUnits: RtsUnit[],
    playerBuildings: Building[],
    playerTowers: RtsTower[],
  ): void {
    // Step 1: Downgrade all visible tiles to explored
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.fog[r][c] === 2) {
          this.fog[r][c] = 1;
        }
      }
    }

    // Step 2: Light up tiles around each vision source
    for (const unit of playerUnits) {
      if (!unit.alive) continue;
      const col = Math.floor(unit.x / TILE_SIZE);
      const row = Math.floor(unit.y / TILE_SIZE);
      const radius = unit.unitType === 'builder' ? BUILDER_VISION : UNIT_VISION;
      this.reveal(col, row, radius);
    }

    for (const b of playerBuildings) {
      if (b.destroyed || b.owner !== 'player') continue;
      // Reveal from center of building footprint
      const centerCol = b.col + Math.floor(b.def.footprint / 2);
      const centerRow = b.row + Math.floor(b.def.footprint / 2);
      this.reveal(centerCol, centerRow, BUILDING_VISION);
    }

    for (const t of playerTowers) {
      if (t.destroyed || t.owner !== 'player') continue;
      this.reveal(t.col, t.row, TOWER_VISION);
    }
  }

  /** Reveal tiles in a circle around (col, row) */
  private reveal(col: number, row: number, radius: number): void {
    let offsets = this.circleCache.get(radius);
    if (!offsets) {
      this.precomputeCircle(radius);
      offsets = this.circleCache.get(radius)!;
    }

    for (const { dc, dr } of offsets) {
      const c = col + dc;
      const r = row + dr;
      if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) {
        this.fog[r][c] = 2;
      }
    }
  }

  /** Is a tile currently visible? */
  isVisible(col: number, row: number): boolean {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
    return this.fog[row][col] === 2;
  }

  /** Has a tile been explored (seen at least once)? */
  isExplored(col: number, row: number): boolean {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
    return this.fog[row][col] >= 1;
  }

  /** Get fog state for a tile */
  getState(col: number, row: number): FogState {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return 0;
    return this.fog[row][col];
  }
}
