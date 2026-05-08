import { GRID_COLS, GRID_ROWS, getGridCols } from '../config';
import { MapDefinition } from '../data/Maps';

export enum CellType {
  Empty,
  Tower,
  Entry,
  Exit,
  Blocked,  // can't walk or build
  NoBuild,  // can walk through, can't build on
}

export class Grid {
  cells: CellType[][];
  entry: { col: number; row: number };
  exit: { col: number; row: number };
  entries: { col: number; row: number }[];
  exits: { col: number; row: number }[];
  readonly rows: number;
  readonly cols: number;
  /** Monotonic counter that bumps on every cell mutation through
   *  placeTower / removeTower. Used by MazingScorer (and any other
   *  consumer that wants to invalidate cached layouts when the grid
   *  changes) — compare-equal means "grid is unchanged since you
   *  cached your computation". Initial-state mutations during the
   *  constructor are NOT counted, so a freshly-built grid starts at 0
   *  regardless of its blocked-cell density. */
  version: number = 0;

  constructor(mapDef?: MapDefinition, rows?: number, cols?: number) {
    this.rows = rows ?? GRID_ROWS;
    this.cols = cols ?? getGridCols();
    this.cells = Array.from({ length: this.rows }, () =>
      Array(this.cols).fill(CellType.Empty)
    );

    if (mapDef) {
      this.entries = mapDef.entries;
      this.exits = mapDef.exits;
      this.entry = mapDef.entries[0];
      this.exit = mapDef.exits[0];

      for (const e of mapDef.entries) {
        if (e.row >= 0 && e.row < this.rows && e.col >= 0 && e.col < this.cols) {
          this.cells[e.row][e.col] = CellType.Entry;
        }
      }
      for (const e of mapDef.exits) {
        if (e.row >= 0 && e.row < this.rows && e.col >= 0 && e.col < this.cols) {
          this.cells[e.row][e.col] = CellType.Exit;
        }
      }
      for (const b of mapDef.blocked) {
        if (b.row >= 0 && b.row < this.rows && b.col >= 0 && b.col < this.cols) {
          this.cells[b.row][b.col] = CellType.Blocked;
        }
      }
      for (const b of (mapDef.noBuild || [])) {
        if (b.row >= 0 && b.row < this.rows && b.col >= 0 && b.col < this.cols) {
          this.cells[b.row][b.col] = CellType.NoBuild;
        }
      }
    } else {
      // Default: plains
      this.entry = { col: 0, row: Math.floor(this.rows / 2) };
      this.exit = { col: this.cols - 1, row: Math.floor(this.rows / 2) };
      this.entries = [this.entry];
      this.exits = [this.exit];

      this.cells[this.entry.row][this.entry.col] = CellType.Entry;
      this.cells[this.exit.row][this.exit.col] = CellType.Exit;
    }
  }

  isWalkable(col: number, row: number): boolean {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
    const cell = this.cells[row][col];
    return cell !== CellType.Tower && cell !== CellType.Blocked;
    // NoBuild IS walkable (creeps can walk through, towers can't be placed)
  }

  canPlaceTower(col: number, row: number): boolean {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
    return this.cells[row][col] === CellType.Empty;
    // NoBuild, Blocked, Tower, Entry, Exit all return false
  }

  placeTower(col: number, row: number): boolean {
    if (!this.canPlaceTower(col, row)) return false;
    this.cells[row][col] = CellType.Tower;
    this.version++;
    return true;
  }

  removeTower(col: number, row: number): boolean {
    if (this.cells[row][col] !== CellType.Tower) return false;
    this.cells[row][col] = CellType.Empty;
    this.version++;
    return true;
  }
}
