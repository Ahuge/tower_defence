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

  /** Overclock state (Mechanical faction ability) */
  overclockTimer: number = 0; // seconds remaining, 0 = not active
  overclockCooldown: number = 0; // seconds until can overclock again

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

  /** Is this building currently overclocked? */
  get isOverclocked(): boolean { return this.overclockTimer > 0; }

  /** Training speed multiplier (2× when overclocked) */
  get trainingSpeedMult(): number { return this.overclockTimer > 0 ? 2 : 1; }

  /** Activate overclock — 2× production for 15s, costs 50 HP */
  activateOverclock(): boolean {
    if (!this.isBuilt || this.destroyed) return false;
    if (this.overclockTimer > 0 || this.overclockCooldown > 0) return false;
    if (this.def.faction !== 'mechanical') return false;
    if (this.hp <= 50) return false; // don't kill yourself

    this.overclockTimer = 15;
    this.overclockCooldown = 30; // can't overclock again for 30s after it ends
    this.hp -= 50;
    return true;
  }

  /** Tick overclock timers each frame */
  tickOverclock(deltaSec: number): void {
    if (this.overclockTimer > 0) {
      this.overclockTimer = Math.max(0, this.overclockTimer - deltaSec);
    }
    if (this.overclockCooldown > 0 && this.overclockTimer <= 0) {
      this.overclockCooldown = Math.max(0, this.overclockCooldown - deltaSec);
    }
  }
}
