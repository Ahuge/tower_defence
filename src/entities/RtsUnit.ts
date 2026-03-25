import { TILE_SIZE } from '../config';
import { Grid } from '../systems/Grid';
import { findPath, PathPoint } from '../systems/Pathfinding';

export type UnitOwner = 'player' | 'cpu';

export type UnitState = 'idle' | 'moving' | 'building' | 'attacking' | 'mining';

/**
 * Base class for all RTS-mode units (builders, combat units).
 * Handles tile-based pathfinding movement and pixel-smooth interpolation.
 */
export class RtsUnit {
  /** Pixel position */
  x: number;
  y: number;
  /** Current tile (derived from pixel pos) */
  get col(): number { return Math.floor(this.x / TILE_SIZE); }
  get row(): number { return Math.floor(this.y / TILE_SIZE); }

  readonly owner: UnitOwner;
  readonly unitType: string;

  hp: number;
  maxHp: number;
  moveSpeed: number; // pixels per second
  alive: boolean = true;
  selected: boolean = false;
  state: UnitState = 'idle';

  /** If true, unit will engage enemies encountered while moving */
  attackMove: boolean = false;
  /** Current attack target (for combat units) */
  attackTarget: RtsUnit | null = null;

  /** Fallback destination in pixels — unit walks directly here if no A* path */
  directMoveX: number = 0;
  directMoveY: number = 0;
  directMoveActive: boolean = false;

  /** Path to follow (tile coordinates) */
  protected path: PathPoint[] = [];
  protected pathIndex: number = 0;

  /** Reference to grid for pathfinding */
  protected grid: Grid;

  constructor(
    grid: Grid,
    owner: UnitOwner,
    unitType: string,
    col: number,
    row: number,
    hp: number,
    moveSpeed: number,
  ) {
    this.grid = grid;
    this.owner = owner;
    this.unitType = unitType;
    this.x = col * TILE_SIZE + TILE_SIZE / 2;
    this.y = row * TILE_SIZE + TILE_SIZE / 2;
    this.hp = hp;
    this.maxHp = hp;
    this.moveSpeed = moveSpeed;
  }

  /** Command this unit to move to a tile. Calculates path. */
  moveTo(targetCol: number, targetRow: number): boolean {
    const path = findPath(this.grid, { col: this.col, row: this.row }, { col: targetCol, row: targetRow });
    if (!path || path.length === 0) return false;

    this.path = path;
    this.pathIndex = 0;
    this.state = 'moving';
    this.attackMove = false;
    this.attackTarget = null;
    return true;
  }

  /** Attack-move: move to tile but engage enemies encountered along the way */
  attackMoveTo(targetCol: number, targetRow: number): boolean {
    const result = this.moveTo(targetCol, targetRow);
    if (result) {
      this.attackMove = true;
    }
    return result;
  }

  /** Stop moving and go idle */
  stop(): void {
    this.path = [];
    this.pathIndex = 0;
    if (this.state === 'moving') {
      this.state = 'idle';
    }
  }

  /** Update movement along path. Returns true if destination reached this frame. */
  updateMovement(deltaSec: number): boolean {
    // Fallback: direct pixel movement when no A* path
    if (this.state === 'moving' && this.path.length === 0 && this.directMoveActive) {
      const dx = this.directMoveX - this.x;
      const dy = this.directMoveY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const step = this.moveSpeed * deltaSec;
      if (dist <= step) {
        this.x = this.directMoveX;
        this.y = this.directMoveY;
        this.directMoveActive = false;
        this.state = 'idle';
        return true;
      }
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
      return false;
    }

    if (this.state !== 'moving' || this.path.length === 0) return false;

    const target = this.path[this.pathIndex];
    const tx = target.col * TILE_SIZE + TILE_SIZE / 2;
    const ty = target.row * TILE_SIZE + TILE_SIZE / 2;

    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const step = this.moveSpeed * deltaSec;

    if (dist <= step) {
      // Reached this waypoint
      this.x = tx;
      this.y = ty;
      this.pathIndex++;

      if (this.pathIndex >= this.path.length) {
        // Reached final destination
        this.path = [];
        this.pathIndex = 0;
        this.state = 'idle';
        return true;
      }
    } else {
      // Move toward waypoint
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
    }

    return false;
  }

  takeDamage(amount: number): boolean {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      return true;
    }
    return false;
  }

  /** Distance in pixels to another point */
  distanceTo(px: number, py: number): number {
    const dx = px - this.x;
    const dy = py - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** Distance in tiles to a tile coordinate */
  tileDistanceTo(col: number, row: number): number {
    return Math.abs(this.col - col) + Math.abs(this.row - row);
  }
}
