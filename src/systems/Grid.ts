import { GRID_COLS, GRID_ROWS } from '../config';
import { MapDefinition } from '../data/Maps';

export enum CellType {
  Empty,
  Tower,
  Entry,
  Exit,
  Blocked, // terrain
}

export class Grid {
  cells: CellType[][];
  entry: { col: number; row: number };
  exit: { col: number; row: number };
  entries: { col: number; row: number }[];
  exits: { col: number; row: number }[];

  constructor(mapDef?: MapDefinition) {
    this.cells = Array.from({ length: GRID_ROWS }, () =>
      Array(GRID_COLS).fill(CellType.Empty)
    );

    if (mapDef) {
      this.entries = mapDef.entries;
      this.exits = mapDef.exits;
      this.entry = mapDef.entries[0];
      this.exit = mapDef.exits[0];

      for (const e of mapDef.entries) {
        this.cells[e.row][e.col] = CellType.Entry;
      }
      for (const e of mapDef.exits) {
        this.cells[e.row][e.col] = CellType.Exit;
      }
      for (const b of mapDef.blocked) {
        if (b.row >= 0 && b.row < GRID_ROWS && b.col >= 0 && b.col < GRID_COLS) {
          this.cells[b.row][b.col] = CellType.Blocked;
        }
      }
    } else {
      // Default: plains
      this.entry = { col: 0, row: Math.floor(GRID_ROWS / 2) };
      this.exit = { col: GRID_COLS - 1, row: Math.floor(GRID_ROWS / 2) };
      this.entries = [this.entry];
      this.exits = [this.exit];

      this.cells[this.entry.row][this.entry.col] = CellType.Entry;
      this.cells[this.exit.row][this.exit.col] = CellType.Exit;
    }
  }

  isWalkable(col: number, row: number): boolean {
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return false;
    const cell = this.cells[row][col];
    return cell !== CellType.Tower && cell !== CellType.Blocked;
  }

  canPlaceTower(col: number, row: number): boolean {
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return false;
    return this.cells[row][col] === CellType.Empty;
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
