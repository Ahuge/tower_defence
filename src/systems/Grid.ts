import { GRID_COLS, GRID_ROWS, getGridCols } from '../config';
import { MapDefinition } from '../data/Maps';

export enum CellType {
  Empty,
  Tower,
  Entry,
  Exit,
  Blocked,  // can't walk or build
  NoBuild,  // can walk through, can't build on
  GoldDeposit, // walkable, not tower-buildable — place Miner here
  Geyser,      // walkable, not tower-buildable — place Extractor here
  Building,    // occupied by a non-tower building (Base Defence mode)
}

export class Grid {
  cells: CellType[][];
  entry: { col: number; row: number };
  exit: { col: number; row: number };
  entries: { col: number; row: number }[];
  exits: { col: number; row: number }[];
  readonly rows: number;
  readonly cols: number;

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
      for (const g of (mapDef.goldDeposits || [])) {
        if (g.row >= 0 && g.row < this.rows && g.col >= 0 && g.col < this.cols) {
          this.cells[g.row][g.col] = CellType.GoldDeposit;
        }
      }
      for (const g of (mapDef.geysers || [])) {
        if (g.row >= 0 && g.row < this.rows && g.col >= 0 && g.col < this.cols) {
          this.cells[g.row][g.col] = CellType.Geyser;
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
    return cell !== CellType.Tower && cell !== CellType.Blocked && cell !== CellType.Building;
    // NoBuild, GoldDeposit, Geyser ARE walkable
  }

  canPlaceTower(col: number, row: number): boolean {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
    return this.cells[row][col] === CellType.Empty;
    // NoBuild, Blocked, Tower, Entry, Exit, GoldDeposit, Geyser, Building all return false
  }

  /** Check if a Miner can be placed on this cell (must be GoldDeposit) */
  canPlaceMiner(col: number, row: number): boolean {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
    return this.cells[row][col] === CellType.GoldDeposit;
  }

  /** Check if an Extractor can be placed on this cell (must be Geyser) */
  canPlaceExtractor(col: number, row: number): boolean {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
    return this.cells[row][col] === CellType.Geyser;
  }

  /** Check if a generic building can be placed (must be Empty) */
  canPlaceBuilding(col: number, row: number): boolean {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return false;
    return this.cells[row][col] === CellType.Empty;
  }

  placeBuilding(col: number, row: number): boolean {
    const cell = this.cells[row]?.[col];
    if (cell === undefined) return false;
    if (cell !== CellType.Empty && cell !== CellType.GoldDeposit && cell !== CellType.Geyser) return false;
    this.cells[row][col] = CellType.Building;
    return true;
  }

  removeBuilding(col: number, row: number, restoreTo: CellType = CellType.Empty): boolean {
    if (this.cells[row]?.[col] !== CellType.Building) return false;
    this.cells[row][col] = restoreTo;
    return true;
  }

  placeTower(col: number, row: number): boolean {
    if (!this.canPlaceTower(col, row)) return false;
    this.cells[row][col] = CellType.Tower;
    return true;
  }

  removeTower(col: number, row: number): boolean {
    if (this.cells[row][col] !== CellType.Tower) return false;
    this.cells[row][col] = CellType.Empty;
    return true;
  }
}
