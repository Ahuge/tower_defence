import { Building, BuildingOwner } from '../../entities/Building';
import { BuildingDef, BUILDING_TYPES, BuildingCategory } from '../../data/basedefence/BuildingTypes';
import { Grid, CellType } from '../Grid';
import { ResourceManager } from '../ResourceManager';
import { EventBus } from '../EventBus';

export class BuildingManager {
  readonly buildings: Building[] = [];
  private grid: Grid;
  private resources: ResourceManager;
  private events: EventBus;

  /** Current supply: { player: { used, max }, cpu: { used, max } } */
  private supply: Record<BuildingOwner, { used: number; max: number }> = {
    player: { used: 0, max: 0 },
    cpu: { used: 0, max: 0 },
  };

  constructor(grid: Grid, resources: ResourceManager, events: EventBus) {
    this.grid = grid;
    this.resources = resources;
    this.events = events;
  }

  /** Get supply info for an owner */
  getSupply(owner: BuildingOwner): { used: number; max: number } {
    return this.supply[owner];
  }

  /** Use supply (when training a unit). Returns false if not enough. */
  useSupply(owner: BuildingOwner, amount: number): boolean {
    const s = this.supply[owner];
    if (s.used + amount > s.max) return false;
    s.used += amount;
    return true;
  }

  /** Free supply (when a unit dies) */
  freeSupply(owner: BuildingOwner, amount: number): void {
    this.supply[owner].used = Math.max(0, this.supply[owner].used - amount);
  }

  /**
   * Try to place a building. Checks costs, grid validity.
   * For player buildings, spends resources. CPU buildings can bypass cost check.
   */
  placeBuilding(
    buildingId: string,
    owner: BuildingOwner,
    col: number,
    row: number,
    skipCost: boolean = false,
    startBuilt: boolean = false,
  ): Building | null {
    const def = BUILDING_TYPES[buildingId];
    if (!def) return null;

    // Validate placement
    if (!this.canPlace(def, col, row)) return null;

    // Check and spend resources (player only, unless skipCost)
    if (!skipCost && owner === 'player') {
      if (!this.resources.canAfford('gold', def.costGold)) return null;
      if (def.costGas > 0 && !this.resources.canAfford('gas', def.costGas)) return null;
      this.resources.spend('gold', def.costGold);
      if (def.costGas > 0) this.resources.spend('gas', def.costGas);
    }

    // Record original cell type for restoration on destroy
    const originalCell = this.grid.cells[row][col];

    // Mark grid cells as occupied
    for (let dr = 0; dr < def.footprint; dr++) {
      for (let dc = 0; dc < def.footprint; dc++) {
        this.grid.placeBuilding(col + dc, row + dr);
      }
    }

    const building = new Building(def, owner, col, row, originalCell, startBuilt);
    this.buildings.push(building);

    // Update supply
    if (building.isBuilt && def.supplyProvided > 0) {
      this.supply[owner].max += def.supplyProvided;
    }

    this.events.emit('buildingPlaced', buildingId, col, row);
    return building;
  }

  /** Check if a building can be placed at (col, row) */
  canPlace(def: BuildingDef, col: number, row: number): boolean {
    for (let dr = 0; dr < def.footprint; dr++) {
      for (let dc = 0; dc < def.footprint; dc++) {
        const c = col + dc;
        const r = row + dr;
        if (c < 0 || c >= this.grid.cols || r < 0 || r >= this.grid.rows) return false;
        const cell = this.grid.cells[r][c];

        if (def.category === 'miner') {
          // Miners must be on gold deposits (check top-left cell only)
          if (dr === 0 && dc === 0 && cell !== CellType.GoldDeposit) return false;
          if ((dr !== 0 || dc !== 0) && cell !== CellType.Empty && cell !== CellType.GoldDeposit) return false;
        } else if (def.category === 'extractor') {
          // Extractors must be on geysers
          if (dr === 0 && dc === 0 && cell !== CellType.Geyser) return false;
          if ((dr !== 0 || dc !== 0) && cell !== CellType.Empty && cell !== CellType.Geyser) return false;
        } else {
          // Generic buildings need empty cells
          if (cell !== CellType.Empty) return false;
        }
      }
    }
    return true;
  }

  /**
   * Update all buildings each frame.
   * - Advance construction
   * - Clean up destroyed buildings
   * NOTE: Income is NOT auto-ticked. Builders must actively mine at a miner/extractor.
   */
  update(deltaSec: number, allUnits?: import('../../entities/RtsUnit').RtsUnit[]): void {
    for (const b of this.buildings) {
      if (b.destroyed) continue;

      // Construction — only progresses if a builder is actively working on it
      if (!b.isBuilt) {
        // Check if any builder is assigned to this building
        const hasBuilder = allUnits?.some(u => {
          if (!u.alive || u.state !== 'building') return false;
          const bu = u as any;
          return bu.activeConstruction?.col === b.col && bu.activeConstruction?.row === b.row;
        }) ?? false;

        if (!hasBuilder) continue; // no builder present — construction paused

        const justCompleted = b.tickBuild(deltaSec);
        if (justCompleted) {
          if (b.def.supplyProvided > 0) {
            this.supply[b.owner].max += b.def.supplyProvided;
          }
          // Walls block pathing when complete
          if (b.def.blocksPathing) {
            for (let dr = 0; dr < b.def.footprint; dr++) {
              for (let dc = 0; dc < b.def.footprint; dc++) {
                this.grid.cells[b.row + dr][b.col + dc] = CellType.Blocked;
              }
            }
          }
          this.events.emit('buildingCompleted', b.def.id, b.col, b.row);
        }
        continue;
      }

      // Tick overclock timers
      b.tickOverclock(deltaSec);

      // Passive resource generation (Mana Wells, Bloom Nodes) — player buildings only
      if (b.def.passiveRate && b.def.passiveResource && b.owner === 'player') {
        let rate = b.def.passiveRate;
        // Bloom Node adjacency bonus: +0.3g/sec per adjacent Bloom Node
        if (b.def.id === 'nat_bloom') {
          for (const other of this.buildings) {
            if (other === b || other.destroyed || !other.isBuilt || other.def.id !== 'nat_bloom') continue;
            const dc = Math.abs(other.col - b.col);
            const dr = Math.abs(other.row - b.row);
            if (dc <= 1 && dr <= 1 && (dc + dr) > 0) rate += 0.3;
          }
        }
        this.resources.add(b.def.passiveResource, rate * deltaSec);
      }

      // Infernal building decay — non-base infernal buildings lose 1 HP/sec
      if (b.def.faction === 'infernal' && b.def.category !== 'base' && b.isBuilt) {
        b.hp -= 1 * deltaSec;
        if (b.hp <= 0) { b.hp = 0; b.destroyed = true; }
      }

      // Probability Engine (Void) — random event every 30s
      if (b.def.id === 'void_prob_engine' && b.owner === 'player') {
        b.probEngineTimer += deltaSec;
        if (b.probEngineTimer >= 30) {
          b.probEngineTimer = 0;
          const roll = Math.random();
          if (roll < 0.25) {
            // Double current gold
            const current = this.resources.get('gold');
            this.resources.add('gold', current);
            this.events.emit('buildingCompleted', 'prob_double_gold', b.col, b.row);
          } else if (roll < 0.5) {
            // Lose 25% gold
            const current = this.resources.get('gold');
            this.resources.spend('gold', Math.floor(current * 0.25));
            this.events.emit('buildingCompleted', 'prob_lose_gold', b.col, b.row);
          } else if (roll < 0.75) {
            // Free unit — spawn a random cheap unit (handled by event listener)
            this.events.emit('buildingCompleted', 'prob_free_unit', b.col, b.row);
          } else {
            // Damage random enemy building for 200 HP
            const enemyOwner = b.owner === 'player' ? 'cpu' : 'player';
            const enemyBldgs = this.getByOwner(enemyOwner);
            if (enemyBldgs.length > 0) {
              const target = enemyBldgs[Math.floor(Math.random() * enemyBldgs.length)];
              target.takeDamage(200);
            }
            this.events.emit('buildingCompleted', 'prob_damage_enemy', b.col, b.row);
          }
        }
      }

      // Repair Bay (positive heal) / Soul Pyre (negative heal = drain)
      if (b.def.healRate && b.def.healRadius && allUnits) {
        const hpPerFrame = b.def.healRate * deltaSec;
        const isHeal = b.def.healRate > 0;
        const radiusPx = b.def.healRadius * 28;
        const bx = (b.col + b.def.footprint / 2) * 28;
        const by = (b.row + b.def.footprint / 2) * 28;
        const r2 = radiusPx * radiusPx;

        for (const u of allUnits) {
          if (!u.alive || u.owner !== b.owner) continue;
          const dx = u.x - bx;
          const dy = u.y - by;
          if (dx * dx + dy * dy < r2) {
            if (isHeal) {
              // Repair: only heal damaged units
              if (u.hp < u.maxHp) u.hp = Math.min(u.maxHp, u.hp + hpPerFrame);
            } else {
              // Drain: damage all units in range (Soul Pyre)
              u.hp += hpPerFrame; // negative = damage
              if (u.hp <= 0) { u.hp = 0; u.alive = false; }
            }
          }
        }

        // Heal nearby buildings
        for (const ob of this.buildings) {
          if (ob.destroyed || ob.owner !== b.owner || !ob.isBuilt) continue;
          const obx = (ob.col + ob.def.footprint / 2) * 28;
          const oby = (ob.row + ob.def.footprint / 2) * 28;
          const ddx = obx - bx;
          const ddy = oby - by;
          if (ddx * ddx + ddy * ddy < r2 && ob.hp < ob.maxHp) {
            ob.hp = Math.min(ob.maxHp, ob.hp + hpPerFrame);
          }
        }
      }
    }

    // Clean up destroyed buildings
    for (let i = this.buildings.length - 1; i >= 0; i--) {
      const b = this.buildings[i];
      if (!b.destroyed) continue;

      // Restore grid cells
      for (let dr = 0; dr < b.def.footprint; dr++) {
        for (let dc = 0; dc < b.def.footprint; dc++) {
          // Restore original cell type for the primary tile, Empty for the rest
          const restoreTo = (dr === 0 && dc === 0) ? b.originalCellType as CellType : CellType.Empty;
          this.grid.removeBuilding(b.col + dc, b.row + dr, restoreTo);
        }
      }

      // Remove supply
      if (b.isBuilt && b.def.supplyProvided > 0) {
        this.supply[b.owner].max = Math.max(0, this.supply[b.owner].max - b.def.supplyProvided);
      }

      this.events.emit('buildingDestroyed', b.def.id, b.col, b.row, b.owner);
      this.buildings.splice(i, 1);
    }
  }

  /** Get all buildings of a specific owner */
  getByOwner(owner: BuildingOwner): Building[] {
    return this.buildings.filter(b => b.owner === owner && !b.destroyed);
  }

  /** Get all buildings of a specific category for an owner */
  getByCategory(owner: BuildingOwner, category: BuildingCategory): Building[] {
    return this.buildings.filter(b => b.owner === owner && b.def.category === category && !b.destroyed);
  }

  /** Get the base building for an owner (should be exactly 1) */
  getBase(owner: BuildingOwner): Building | undefined {
    return this.buildings.find(b => b.owner === owner && b.def.category === 'base' && !b.destroyed);
  }

  /** Get building at a tile coordinate (checks footprint) */
  getBuildingAt(col: number, row: number): Building | undefined {
    return this.buildings.find(b => {
      if (b.destroyed) return false;
      return col >= b.col && col < b.col + b.def.footprint &&
             row >= b.row && row < b.row + b.def.footprint;
    });
  }
}
