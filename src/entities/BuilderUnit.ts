import { TILE_SIZE } from '../config';
import { Grid } from '../systems/Grid';
import { RtsUnit, UnitOwner } from './RtsUnit';

/** Pending build order for a builder */
export interface BuildOrder {
  buildingId: string;
  col: number;
  row: number;
}

/** Mining trip state */
export type MiningPhase = 'walking_to_mine' | 'mining' | 'walking_to_base' | 'depositing';

const BUILDER_HP = 60;
const BUILDER_SPEED = 90;
/** Seconds to mine before heading back to base */
const MINE_DURATION = 4;
/** Seconds to deposit at base */
const DEPOSIT_DURATION = 1;
/** Gold per mining trip */
export const MINE_TRIP_GOLD = 8;
/** Gas per mining trip */
export const MINE_TRIP_GAS = 4;

export class BuilderUnit extends RtsUnit {
  buildOrder: BuildOrder | null = null;
  activeConstruction: { col: number; row: number } | null = null;

  /** Mining state */
  miningTarget: { col: number; row: number } | null = null;
  miningPhase: MiningPhase = 'walking_to_mine';
  miningTimer: number = 0;
  /** Base position to return resources to */
  depositCol: number = 0;
  depositRow: number = 0;
  /** Whether the builder is carrying resources (mined but not deposited) */
  carrying: boolean = false;

  /** Set to true when builder arrives at the mine — UnitManager should check occupancy */
  arrivedAtMine: boolean = false;

  /** Set to true when builder needs deposit location updated (before walking to base) */
  needsDepositUpdate: boolean = false;

  /** Construction speed multiplier (Military gets 1.2) */
  buildSpeedMult: number = 1.0;

  /** Prepaid build cost (for refund if cancelled before construction starts) */
  prepaidGold: number = 0;
  prepaidGas: number = 0;

  readonly color: number;

  constructor(grid: Grid, owner: UnitOwner, col: number, row: number, color: number) {
    super(grid, owner, 'builder', col, row, BUILDER_HP, BUILDER_SPEED);
    this.color = color;
  }

  commandBuild(order: BuildOrder): boolean {
    this.cancelMining();
    this.buildOrder = order;
    this.activeConstruction = null;

    const arrived = this.moveTo(order.col, order.row);
    if (!arrived) {
      const adjacents = [
        { col: order.col - 1, row: order.row },
        { col: order.col + 1, row: order.row },
        { col: order.col, row: order.row - 1 },
        { col: order.col, row: order.row + 1 },
      ];
      for (const adj of adjacents) {
        if (this.moveTo(adj.col, adj.row)) return true;
      }
      this.buildOrder = null;
      return false;
    }
    return true;
  }

  cancelBuild(): void {
    const hadPrepaid = this.prepaidGold > 0 || this.prepaidGas > 0;
    this.buildOrder = null;
    this.activeConstruction = null;
    // prepaidGold/Gas cleared by UnitManager after refunding
    this.cancelMining();
    if (this.state === 'building') {
      this.state = 'idle';
    }
  }

  /**
   * Start a mining loop: walk to mine → mine for a bit → walk to base → deposit → repeat.
   * depositCol/depositRow should be set to the player's base location.
   */
  commandMine(col: number, row: number, baseCol: number, baseRow: number): boolean {
    this.buildOrder = null;
    this.activeConstruction = null;
    this.miningTarget = { col, row };
    this.miningPhase = 'walking_to_mine';
    this.miningTimer = 0;
    this.carrying = false;
    this.depositCol = baseCol;
    this.depositRow = baseRow;

    return this.pathToMine();
  }

  /** Called by UnitManager when occupancy check passes — start actually mining */
  startMining(): void {
    this.arrivedAtMine = false;
    this.miningPhase = 'mining';
    this.miningTimer = 0;
    this.state = 'mining';
  }

  /** Redirect to a different gold patch (called when current one is full on arrival) */
  redirectToMine(col: number, row: number): void {
    this.arrivedAtMine = false;
    this.miningTarget = { col, row };
    this.miningPhase = 'walking_to_mine';
    this.pathToMine();
  }

  cancelMining(): void {
    this.miningTarget = null;
    this.carrying = false;
    this.miningTimer = 0;
    if (this.state === 'mining') {
      this.state = 'idle';
    }
  }

  /** Path toward the mining building */
  private pathToMine(): boolean {
    if (!this.miningTarget) return false;
    const t = this.miningTarget;
    // Mine building occupies the grid cell, so path to adjacent tiles
    // Sort by distance from current position so we pick the closest side
    const adjacents = [
      { col: t.col - 1, row: t.row },
      { col: t.col + 1, row: t.row },
      { col: t.col, row: t.row - 1 },
      { col: t.col, row: t.row + 1 },
      { col: t.col - 1, row: t.row - 1 },
      { col: t.col + 1, row: t.row - 1 },
      { col: t.col - 1, row: t.row + 1 },
      { col: t.col + 1, row: t.row + 1 },
    ].sort((a, b) => this.tileDistanceTo(a.col, a.row) - this.tileDistanceTo(b.col, b.row));

    for (const adj of adjacents) {
      if (this.moveTo(adj.col, adj.row)) return true;
    }
    this.cancelMining();
    return false;
  }

  /** Path toward the nearest adjacent tile of the base (3×3 footprint) for deposit */
  pathToBase(): boolean {
    // Base is 3×3 starting at (depositCol, depositRow).
    // Generate all tiles adjacent to the 3×3 footprint, sorted by distance from builder.
    const fp = 3; // base footprint
    const adjacents: { col: number; row: number }[] = [];
    for (let dc = -1; dc <= fp; dc++) {
      for (let dr = -1; dr <= fp; dr++) {
        // Only include tiles on the border (not inside the footprint)
        const inside = dc >= 0 && dc < fp && dr >= 0 && dr < fp;
        if (!inside) {
          adjacents.push({ col: this.depositCol + dc, row: this.depositRow + dr });
        }
      }
    }
    // Sort by distance from current position — closest first
    adjacents.sort((a, b) => this.tileDistanceTo(a.col, a.row) - this.tileDistanceTo(b.col, b.row));

    for (const adj of adjacents) {
      if (this.moveTo(adj.col, adj.row)) return true;
    }
    return false;
  }

  /**
   * Update builder each frame.
   * Returns true if builder just arrived at build site (for construction).
   * Mining trips are self-managed — UnitManager checks `carrying` to deposit resources.
   */
  updateBuilder(deltaSec: number): boolean {
    if (!this.alive) return false;

    // Construction
    if (this.state === 'building' && this.activeConstruction) {
      return false;
    }

    // Mining loop
    if (this.miningTarget) {
      return this.updateMining(deltaSec);
    }

    // Moving toward build site
    if (this.state === 'moving') {
      const arrived = this.updateMovement(deltaSec);
      if (arrived && this.buildOrder) {
        this.state = 'building';
        return true;
      }
    }

    return false;
  }

  /** Returns true when resources should be deposited (builder arrived at base with cargo) */
  private updateMining(deltaSec: number): boolean {
    switch (this.miningPhase) {
      case 'walking_to_mine':
        if (this.state === 'moving') {
          const arrived = this.updateMovement(deltaSec);
          if (arrived) {
            // Signal UnitManager to check occupancy before starting to mine
            this.arrivedAtMine = true;
          }
        } else if (this.state === 'idle' && !this.arrivedAtMine) {
          this.pathToMine();
        }
        break;

      case 'mining':
        this.state = 'mining';
        this.miningTimer += deltaSec;
        if (this.miningTimer >= MINE_DURATION) {
          this.carrying = true;
          this.needsDepositUpdate = true; // UnitManager will set nearest base
          this.miningPhase = 'walking_to_base';
          // Don't pathToBase yet — wait for UnitManager to update deposit location
        }
        break;

      case 'walking_to_base':
        if (this.state === 'moving') {
          const arrived = this.updateMovement(deltaSec);
          if (arrived) {
            this.miningPhase = 'depositing';
            this.miningTimer = 0;
            this.state = 'mining';
          }
        } else {
          this.pathToBase();
        }
        break;

      case 'depositing':
        this.miningTimer += deltaSec;
        if (this.miningTimer >= DEPOSIT_DURATION) {
          // Resources deposited — UnitManager handles the actual resource add
          this.carrying = false;
          this.miningPhase = 'walking_to_mine';
          this.pathToMine();
          return true; // signal to deposit
        }
        break;
    }

    return false;
  }

  isAdjacentTo(col: number, row: number): boolean {
    return this.tileDistanceTo(col, row) <= 1;
  }
}
