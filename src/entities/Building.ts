import { BuildingDef } from '../data/basedefence/BuildingTypes';

export type BuildingOwner = 'player' | 'cpu';

export class Building {
  readonly def: BuildingDef;
  readonly owner: BuildingOwner;
  /** Top-left tile coordinate */
  readonly col: number;
  readonly row: number;

  hp: number;
  maxHp: number;
  /** Build progress 0→1. At 1 the building is complete and functional. */
  buildProgress: number;
  /** Whether construction is finished */
  get isBuilt(): boolean { return this.buildProgress >= 1; }
  /** Marked for removal */
  destroyed: boolean = false;

  /** Original CellType under this building (for restoration on destroy) */
  readonly originalCellType: number;

  /** Training queue — unit IDs waiting to be trained */
  trainingQueue: string[] = [];
  /** Progress of current training (0→1) */
  trainingProgress: number = 0;
  /** Rally point for trained units (tile coords) */
  rallyCol: number = 0;
  rallyRow: number = 0;

  constructor(def: BuildingDef, owner: BuildingOwner, col: number, row: number, originalCellType: number, startBuilt: boolean = false) {
    this.def = def;
    this.owner = owner;
    this.col = col;
    this.row = row;
    this.maxHp = def.hp;
    this.hp = startBuilt ? def.hp : Math.floor(def.hp * 0.1); // starts with 10% HP while building
    this.buildProgress = startBuilt ? 1 : 0;
    this.originalCellType = originalCellType;
    this.rallyCol = col + def.footprint;
    this.rallyRow = row + def.footprint;
  }

  /** Advance construction. Returns true when just completed. */
  tickBuild(deltaSec: number): boolean {
    if (this.buildProgress >= 1) return false;
    const rate = this.def.buildTime > 0 ? 1 / this.def.buildTime : 1;
    this.buildProgress = Math.min(1, this.buildProgress + rate * deltaSec);
    // HP scales with build progress
    this.hp = Math.floor(this.maxHp * (0.1 + 0.9 * this.buildProgress));
    return this.buildProgress >= 1;
  }

  /** Apply damage. Returns true if destroyed. */
  takeDamage(amount: number): boolean {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.destroyed = true;
      return true;
    }
    return false;
  }
}
