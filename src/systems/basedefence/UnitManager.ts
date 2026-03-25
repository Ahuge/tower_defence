import { TILE_SIZE } from '../../config';
import { Grid, CellType } from '../Grid';
import { EventBus } from '../EventBus';
import { RtsUnit, UnitOwner } from '../../entities/RtsUnit';
import { BuilderUnit, MINE_TRIP_GOLD, MINE_TRIP_GAS } from '../../entities/BuilderUnit';
import { CombatUnit } from '../../entities/CombatUnit';
import { Building } from '../../entities/Building';
import { BuildingManager } from './BuildingManager';
import { BUILDING_TYPES } from '../../data/basedefence/BuildingTypes';
import { COMBAT_UNIT_TYPES, CombatUnitDef } from '../../data/basedefence/CombatUnitTypes';
import { ResourceManager } from '../ResourceManager';
import { TowerDefence } from './TowerDefence';
import { FactionId, FACTIONS } from '../../data/Factions';

export class UnitManager {
  readonly units: RtsUnit[] = [];
  private grid: Grid;
  private events: EventBus;
  private buildingMgr: BuildingManager;
  private playerResources: ResourceManager;
  private cpuResources: ResourceManager | null = null;
  private towerDef: TowerDefence | null = null;
  private playerFaction: FactionId = 'military';
  private cpuFaction: FactionId = 'mechanical';

  private _selected: RtsUnit[] = [];
  get selected(): readonly RtsUnit[] { return this._selected; }

  /** Control groups (Ctrl+1-9 to assign, 1-9 to recall) */
  private controlGroups: Map<number, RtsUnit[]> = new Map();

  constructor(grid: Grid, events: EventBus, buildingMgr: BuildingManager, playerResources: ResourceManager) {
    this.grid = grid;
    this.events = events;
    this.buildingMgr = buildingMgr;
    this.playerResources = playerResources;
  }

  setTowerDefence(td: TowerDefence): void { this.towerDef = td; }
  setCpuResources(res: ResourceManager): void { this.cpuResources = res; }
  setFactions(player: FactionId, cpu: FactionId): void { this.playerFaction = player; this.cpuFaction = cpu; }

  private getFactionColor(owner: UnitOwner): number {
    const factionId = owner === 'player' ? this.playerFaction : this.cpuFaction;
    return FACTIONS[factionId]?.primaryColor ?? 0xffffff;
  }

  /** Get the resource pool for an owner */
  private getResources(owner: UnitOwner): ResourceManager {
    return owner === 'cpu' && this.cpuResources ? this.cpuResources : this.playerResources;
  }

  // ── Spawning ──

  spawnBuilder(owner: UnitOwner, col: number, row: number, color: number): BuilderUnit {
    const builder = new BuilderUnit(this.grid, owner, col, row, color);
    // Military builders construct 20% faster
    const faction = owner === 'player' ? this.playerFaction : this.cpuFaction;
    if (faction === 'military') builder.buildSpeedMult = 1.2;
    this.units.push(builder);
    return builder;
  }

  spawnCombatUnit(owner: UnitOwner, def: CombatUnitDef, col: number, row: number): CombatUnit {
    const unit = new CombatUnit(this.grid, owner, def, col, row);
    this.units.push(unit);
    return unit;
  }

  // ── Selection ──

  selectUnit(unit: RtsUnit): void {
    this.clearSelection();
    if (unit.owner === 'player') {
      unit.selected = true;
      this._selected = [unit];
    }
  }

  addToSelection(unit: RtsUnit): void {
    if (unit.owner !== 'player' || unit.selected) return;
    unit.selected = true;
    this._selected.push(unit);
  }

  selectInRect(x1: number, y1: number, x2: number, y2: number): void {
    this.clearSelection();
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    for (const unit of this.units) {
      if (!unit.alive || unit.owner !== 'player') continue;
      if (unit.x >= minX && unit.x <= maxX && unit.y >= minY && unit.y <= maxY) {
        unit.selected = true;
        this._selected.push(unit);
      }
    }
  }

  clearSelection(): void {
    for (const u of this._selected) u.selected = false;
    this._selected = [];
  }

  /** Assign current selection to a control group (Ctrl+number) */
  assignGroup(groupNum: number): void {
    this.controlGroups.set(groupNum, [...this._selected]);
  }

  /** Recall a control group (selects those units) */
  recallGroup(groupNum: number): void {
    const group = this.controlGroups.get(groupNum);
    if (!group || group.length === 0) return;
    // Filter out dead units
    const alive = group.filter(u => u.alive);
    this.controlGroups.set(groupNum, alive);
    if (alive.length === 0) return;

    this.clearSelection();
    for (const u of alive) {
      u.selected = true;
      this._selected.push(u);
    }
  }

  /** Get the control group number for a unit (for rendering), or -1 */
  getGroupNumber(unit: RtsUnit): number {
    for (const [num, group] of this.controlGroups) {
      if (group.includes(unit)) return num;
    }
    return -1;
  }

  /** Get center of a control group (for camera centering) */
  getGroupCenter(groupNum: number): { x: number; y: number } | null {
    const group = this.controlGroups.get(groupNum)?.filter(u => u.alive);
    if (!group || group.length === 0) return null;
    const cx = group.reduce((s, u) => s + u.x, 0) / group.length;
    const cy = group.reduce((s, u) => s + u.y, 0) / group.length;
    return { x: cx, y: cy };
  }

  getUnitAt(px: number, py: number, threshold: number = TILE_SIZE * 0.6): RtsUnit | null {
    let best: RtsUnit | null = null;
    let bestDist = threshold;
    for (const unit of this.units) {
      if (!unit.alive) continue;
      const dist = unit.distanceTo(px, py);
      if (dist < bestDist) { best = unit; bestDist = dist; }
    }
    return best;
  }

  // ── Commands ──

  commandMove(col: number, row: number): void {
    for (const unit of this._selected) {
      if (!unit.alive) continue;
      if (unit instanceof BuilderUnit) {
        this.refundPrepaid(unit);
        unit.cancelBuild();
      }
      unit.moveTo(col, row);
    }
  }

  commandAttackMove(col: number, row: number): void {
    for (const unit of this._selected) {
      if (!unit.alive) continue;
      if (unit instanceof BuilderUnit) {
        this.refundPrepaid(unit);
        unit.cancelBuild();
      }
      unit.attackMoveTo(col, row);
    }
  }

  commandBuild(buildingId: string, col: number, row: number): boolean {
    const builder = this._selected.find(
      u => u.alive && u instanceof BuilderUnit
    ) as BuilderUnit | undefined;
    if (!builder) return false;

    const def = BUILDING_TYPES[buildingId];
    if (!def) return false;
    if (!this.buildingMgr.canPlace(def, col, row)) return false;
    if (!this.playerResources.canAfford('gold', def.costGold)) return false;
    if (def.costGas > 0 && !this.playerResources.canAfford('gas', def.costGas)) return false;

    // Refund any existing prepaid cost on this builder (if they had a previous build order)
    this.refundPrepaid(builder);

    // Charge upfront
    this.playerResources.spend('gold', def.costGold);
    if (def.costGas > 0) this.playerResources.spend('gas', def.costGas);

    const success = builder.commandBuild({ buildingId, col, row });
    if (!success) {
      this.playerResources.add('gold', def.costGold);
      if (def.costGas > 0) this.playerResources.add('gas', def.costGas);
    } else {
      builder.prepaidGold = def.costGold;
      builder.prepaidGas = def.costGas;
    }
    return success;
  }

  /** Command a builder to walk to a tile and build a tower there */
  commandBuildTower(towerId: string, col: number, row: number): boolean {
    if (!this.towerDef) return false;
    const builder = this._selected.find(
      u => u.alive && u instanceof BuilderUnit
    ) as BuilderUnit | undefined;
    if (!builder) return false;

    if (!this.towerDef.canPlace(col, row)) return false;
    const cost = this.towerDef.getTowerCost(towerId);
    if (!this.playerResources.canAfford('gold', cost)) return false;

    this.refundPrepaid(builder);

    this.playerResources.spend('gold', cost);

    const success = builder.commandBuild({ buildingId: `tower:${towerId}`, col, row });
    if (!success) {
      this.playerResources.add('gold', cost);
    } else {
      builder.prepaidGold = cost;
      builder.prepaidGas = 0;
    }
    return success;
  }

  // ── Mining ──

  private static MAX_MINERS_PER_PATCH = 2;
  /** Max search radius in tiles when looking for alternative gold patches */
  private static MINE_SEARCH_RADIUS = 30;

  /** Count how many builders are currently mining at a specific tile */
  getMinersAtPatch(col: number, row: number): number {
    return this.units.filter(u =>
      u.alive && u instanceof BuilderUnit &&
      (u as BuilderUnit).miningTarget?.col === col &&
      (u as BuilderUnit).miningTarget?.row === row
    ).length;
  }

  /**
   * Assign a builder to mine gold/gas.
   * For raw gold: sends the builder to the requested patch. Occupancy is checked
   * on ARRIVAL — if the patch has 2 active miners, the builder auto-redirects to
   * the nearest available patch.
   * For buildings (extractor): caps at 2 assigned.
   */
  commandMine(builder: BuilderUnit, requestedCol: number, requestedRow: number, baseCol: number, baseRow: number): boolean {
    // Check if this is a building (extractor/miner)
    const building = this.buildingMgr.getBuildingAt(requestedCol, requestedRow);
    if (building && building.isBuilt && !building.destroyed &&
        (building.def.category === 'miner' || building.def.category === 'extractor')) {
      if (this.getMinersAtPatch(requestedCol, requestedRow) < UnitManager.MAX_MINERS_PER_PATCH) {
        return builder.commandMine(requestedCol, requestedRow, baseCol, baseRow);
      }
      return false;
    }

    // Raw gold patch — just send the builder. Occupancy checked on arrival.
    return builder.commandMine(requestedCol, requestedRow, baseCol, baseRow);
  }

  /**
   * Count builders actively mining (state==='mining') at a specific tile.
   * This is the "on arrival" check — only counts builders physically mining, not those walking.
   */
  private getActiveMinersAtPatch(col: number, row: number): number {
    return this.units.filter(u =>
      u.alive && u instanceof BuilderUnit &&
      (u as BuilderUnit).miningTarget?.col === col &&
      (u as BuilderUnit).miningTarget?.row === row &&
      u.state === 'mining'
    ).length;
  }

  /**
   * Find the nearest gold patch with <2 active miners, searching outward.
   * @param activeOnly - if true, only count builders in 'mining' state (for arrival check)
   */
  private findAvailableGoldPatch(
    startCol: number, startRow: number, builder: BuilderUnit, activeOnly: boolean = false,
  ): { col: number; row: number } | null {
    const maxRadius = UnitManager.MINE_SEARCH_RADIUS;

    for (let radius = 0; radius <= maxRadius; radius++) {
      for (let dr = -radius; dr <= radius; dr++) {
        for (let dc = -radius; dc <= radius; dc++) {
          if (Math.abs(dr) !== radius && Math.abs(dc) !== radius) continue;

          const c = startCol + dc;
          const r = startRow + dr;

          if (c < 0 || c >= this.grid.cols || r < 0 || r >= this.grid.rows) continue;
          if (this.grid.cells[r][c] !== CellType.GoldDeposit) continue;

          const count = activeOnly
            ? this.getActiveMinersAtPatch(c, r)
            : this.getMinersAtPatch(c, r);

          if (count < UnitManager.MAX_MINERS_PER_PATCH) {
            return { col: c, row: r };
          }
        }
      }
    }

    return null;
  }

  /** Find the nearest base building for a given owner (for resource drop-off) */
  private findNearestBase(owner: UnitOwner, px: number, py: number): { col: number; row: number } | null {
    const bases = this.buildingMgr.getByCategory(owner, 'base');
    if (bases.length === 0) return null;

    let best = bases[0];
    let bestDist = Infinity;
    for (const b of bases) {
      if (b.destroyed || !b.isBuilt) continue;
      const bx = (b.col + b.def.footprint / 2) * TILE_SIZE;
      const by = (b.row + b.def.footprint / 2) * TILE_SIZE;
      const dx = bx - px;
      const dy = by - py;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        best = b;
      }
    }
    return { col: best.col, row: best.row };
  }

  /** Refund any prepaid build cost on a builder and clear the amounts */
  private refundPrepaid(builder: BuilderUnit): void {
    if (builder.prepaidGold > 0 || builder.prepaidGas > 0) {
      const res = this.getResources(builder.owner);
      if (builder.prepaidGold > 0) res.add('gold', builder.prepaidGold);
      if (builder.prepaidGas > 0) res.add('gas', builder.prepaidGas);
      builder.prepaidGold = 0;
      builder.prepaidGas = 0;
    }
  }

  /**
   * Queue a unit for training at a barracks.
   * Returns true if successfully queued.
   */
  queueTraining(barracks: Building, unitId: string, owner: UnitOwner): boolean {
    if (!barracks.isBuilt || barracks.destroyed) return false;
    if (barracks.def.category !== 'barracks') return false;

    const unitDef = COMBAT_UNIT_TYPES[unitId];
    if (!unitDef) return false;

    // Tech tree: heavy units require at least 1 extractor
    if (unitDef.role === 'heavy') {
      const extractors = this.buildingMgr.getByCategory(owner, 'extractor');
      if (extractors.length === 0) return false;
    }

    // Check cost
    const res = this.getResources(owner);
    if (!res.canAfford('gold', unitDef.costGold)) return false;
    if (unitDef.costGas > 0 && !res.canAfford('gas', unitDef.costGas)) return false;

    // Check supply
    if (!this.buildingMgr.useSupply(owner, unitDef.supply)) return false;

    // Spend resources
    res.spend('gold', unitDef.costGold);
    if (unitDef.costGas > 0) res.spend('gas', unitDef.costGas);

    barracks.trainingQueue.push(unitId);
    return true;
  }

  /** Cancel the last unit in a barracks training queue. Refunds cost. */
  cancelTraining(barracks: Building, owner: UnitOwner): boolean {
    if (barracks.trainingQueue.length === 0) return false;

    const unitId = barracks.trainingQueue.pop()!;
    const unitDef = COMBAT_UNIT_TYPES[unitId];
    if (!unitDef) return false;

    // Refund cost
    const res = this.getResources(owner);
    res.add('gold', unitDef.costGold);
    if (unitDef.costGas > 0) res.add('gas', unitDef.costGas);

    // Free supply
    this.buildingMgr.freeSupply(owner, unitDef.supply);

    // Reset progress if queue is now empty
    if (barracks.trainingQueue.length === 0) {
      barracks.trainingProgress = 0;
    }

    return true;
  }

  /** Builder training constants */
  private static BUILDER_COST = 50;
  private static BUILDER_TRAIN_TIME = 6;
  private static BUILDER_SUPPLY = 1;

  /** Queue a builder for training at the base building */
  queueBuilderTraining(base: Building, owner: UnitOwner): boolean {
    if (!base.isBuilt || base.destroyed || base.def.category !== 'base') return false;
    if (base.trainingQueue.length >= 5) return false;

    const res = this.getResources(owner);
    if (!res.canAfford('gold', UnitManager.BUILDER_COST)) return false;
    if (!this.buildingMgr.useSupply(owner, UnitManager.BUILDER_SUPPLY)) return false;
    res.spend('gold', UnitManager.BUILDER_COST);

    base.trainingQueue.push('builder');
    return true;
  }

  /** Cancel last builder in base training queue */
  cancelBuilderTraining(base: Building, owner: UnitOwner): boolean {
    const idx = base.trainingQueue.lastIndexOf('builder');
    if (idx === -1) return false;
    base.trainingQueue.splice(idx, 1);
    this.getResources(owner).add('gold', UnitManager.BUILDER_COST);
    this.buildingMgr.freeSupply(owner, UnitManager.BUILDER_SUPPLY);
    if (base.trainingQueue.length === 0) base.trainingProgress = 0;
    return true;
  }

  // ── Update ──

  update(deltaSec: number, time: number): void {
    // Get enemy lists for combat
    const playerUnits = this.units.filter(u => u.alive && u.owner === 'player');
    const cpuUnits = this.units.filter(u => u.alive && u.owner === 'cpu');
    const playerBuildings = this.buildingMgr.getByOwner('player');
    const cpuBuildings = this.buildingMgr.getByOwner('cpu');

    for (const unit of this.units) {
      if (!unit.alive) continue;

      if (unit instanceof BuilderUnit) {
        this.updateBuilder(unit, deltaSec);
      } else if (unit instanceof CombatUnit) {
        const enemies = unit.owner === 'player' ? cpuUnits : playerUnits;
        const enemyBldgs = unit.owner === 'player' ? cpuBuildings : playerBuildings;
        const result = unit.updateCombat(deltaSec, time, enemies, enemyBldgs);
        if (result.unit) {
          result.unit.takeDamage(unit.damage);
          // Supply freed in dead unit cleanup below
        }
        if (result.building) {
          result.building.takeDamage(unit.damage);
        }
      } else {
        unit.updateMovement(deltaSec);
      }
    }

    // Process barracks training queues
    this.updateTraining(deltaSec);

    // Clean up dead units
    for (let i = this.units.length - 1; i >= 0; i--) {
      const u = this.units[i];
      if (!u.alive) {
        // Free supply + refund prepaid build cost
        if (u instanceof BuilderUnit) {
          this.refundPrepaid(u);
          this.buildingMgr.freeSupply(u.owner, UnitManager.BUILDER_SUPPLY);
        } else if (u instanceof CombatUnit) {
          this.buildingMgr.freeSupply(u.owner, u.def.supply);
        }
        const selIdx = this._selected.indexOf(u);
        if (selIdx !== -1) this._selected.splice(selIdx, 1);
        this.units.splice(i, 1);
      }
    }
  }

  private updateBuilder(unit: BuilderUnit, deltaSec: number): void {
    const readyToBuild = unit.updateBuilder(deltaSec);

    // Check if builder just arrived at a mine — verify occupancy
    if (unit.arrivedAtMine && unit.miningTarget) {
      const t = unit.miningTarget;
      // Count builders actively mining (state === 'mining') at this exact patch
      const activeMiners = this.units.filter(u =>
        u !== unit && u.alive && u instanceof BuilderUnit &&
        (u as BuilderUnit).miningTarget?.col === t.col &&
        (u as BuilderUnit).miningTarget?.row === t.row &&
        (u as BuilderUnit).state === 'mining'
      ).length;

      if (activeMiners < UnitManager.MAX_MINERS_PER_PATCH) {
        // Space available — start mining
        unit.startMining();
      } else {
        // Full — find another patch nearby
        const alt = this.findAvailableGoldPatch(t.col, t.row, unit, true);
        if (alt) {
          unit.redirectToMine(alt.col, alt.row);
        } else {
          // No patches available — just mine here anyway (overflow)
          unit.startMining();
        }
      }
    }

    // Check if builder needs nearest base for deposit
    if (unit.needsDepositUpdate) {
      unit.needsDepositUpdate = false;
      const nearest = this.findNearestBase(unit.owner, unit.x, unit.y);
      if (nearest) {
        unit.depositCol = nearest.col;
        unit.depositRow = nearest.row;
      }
      unit.pathToBase();
    }

    // Builder returned true = either ready to build OR depositing resources
    if (readyToBuild) {
      if (unit.buildOrder) {
        // Construction arrival — cost already prepaid, skip charging again
        const order = unit.buildOrder;
        if (order.buildingId.startsWith('tower:') && this.towerDef) {
          const towerId = order.buildingId.slice(6);
          const tower = this.towerDef.placeTower(towerId, unit.owner, order.col, order.row, true);
          if (tower) {
            unit.activeConstruction = { col: order.col, row: order.row };
            unit.prepaidGold = 0; // cost consumed
            unit.prepaidGas = 0;
          } else {
            this.refundPrepaid(unit);
            unit.cancelBuild();
          }
        } else {
          const building = this.buildingMgr.placeBuilding(
            order.buildingId, unit.owner, order.col, order.row, true, false,
          );
          if (building) {
            unit.activeConstruction = { col: order.col, row: order.row };
            unit.prepaidGold = 0; // cost consumed
            unit.prepaidGas = 0;
          } else {
            this.refundPrepaid(unit);
            unit.cancelBuild();
          }
        }
      } else if (unit.miningTarget) {
        // Mining deposit — builder returned to base with resources
        const mine = this.buildingMgr.getBuildingAt(unit.miningTarget.col, unit.miningTarget.row);
        if (mine && mine.def.incomeResource) {
          // Mining from a building (refinery/extractor)
          const resourceId = mine.def.incomeResource;
          const amount = resourceId === 'gas' ? MINE_TRIP_GAS : MINE_TRIP_GOLD;
          this.getResources(unit.owner).add(resourceId, amount);
        } else {
          // Mining from a raw gold deposit (no building)
          const t = unit.miningTarget;
          if (t.col >= 0 && t.row >= 0 && t.col < this.grid.cols && t.row < this.grid.rows) {
            const cell = this.grid.cells[t.row][t.col];
            if (cell === CellType.GoldDeposit) {
              this.getResources(unit.owner).add('gold', MINE_TRIP_GOLD);
            }
          }
        }
      }
    }

    // Apply build speed bonus (Military builders construct faster)
    if (unit.state === 'building' && unit.activeConstruction && unit.buildSpeedMult > 1) {
      const bonus = unit.buildSpeedMult - 1; // e.g., 0.2 for 20% faster
      const b = this.buildingMgr.getBuildingAt(unit.activeConstruction.col, unit.activeConstruction.row);
      if (b && !b.isBuilt) {
        b.tickBuild(deltaSec * bonus); // extra progress
      }
    }

    // Check construction completion
    if (unit.state === 'building' && unit.activeConstruction) {
      const isTower = unit.buildOrder?.buildingId.startsWith('tower:');
      if (isTower && this.towerDef) {
        const t = this.towerDef.getTowerAt(unit.activeConstruction.col, unit.activeConstruction.row);
        if (!t || t.isBuilt || t.destroyed) {
          unit.buildOrder = null;
          unit.activeConstruction = null;
          unit.state = 'idle';
        }
      } else {
        const b = this.buildingMgr.getBuildingAt(unit.activeConstruction.col, unit.activeConstruction.row);
        if (!b || b.isBuilt || b.destroyed) {
          unit.buildOrder = null;
          unit.activeConstruction = null;
          unit.state = 'idle';
        }
      }
    }

    // Check if mining target is still valid
    if (unit.miningTarget) {
      const t = unit.miningTarget;
      const building = this.buildingMgr.getBuildingAt(t.col, t.row);
      if (building) {
        // Mining from a building — cancel if destroyed
        if (building.destroyed) unit.cancelMining();
      } else {
        // Mining from raw tile — cancel if tile is no longer a gold deposit
        if (t.col < 0 || t.row < 0 || t.col >= this.grid.cols || t.row >= this.grid.rows ||
            this.grid.cells[t.row][t.col] !== CellType.GoldDeposit) {
          unit.cancelMining();
        }
      }
    }
  }

  private updateTraining(deltaSec: number): void {
    for (const b of this.buildingMgr.buildings) {
      if (!b.isBuilt || b.destroyed) continue;
      if (b.trainingQueue.length === 0) continue;

      // Base building trains builders, barracks trains combat units
      if (b.def.category === 'base') {
        if (b.trainingQueue[0] !== 'builder') { b.trainingQueue.shift(); continue; }
        const rate = 1 / UnitManager.BUILDER_TRAIN_TIME;
        b.trainingProgress += rate * deltaSec * b.trainingSpeedMult;
        if (b.trainingProgress >= 1) {
          b.trainingProgress = 0;
          b.trainingQueue.shift();
          // Spawn builder adjacent to the base (not on it — it's not walkable)
          // Use faction primary color, not building color
          const color = this.getFactionColor(b.owner);
          const spawnCol = b.col + b.def.footprint;
          const spawnRow = b.row + Math.floor(b.def.footprint / 2);
          const builder = this.spawnBuilder(b.owner, spawnCol, spawnRow, color);

          // If rally point is on a mine-able target, auto-start mining
          const rallyBuilding = this.buildingMgr.getBuildingAt(b.rallyCol, b.rallyRow);
          const isRallyMine = rallyBuilding && rallyBuilding.isBuilt && !rallyBuilding.destroyed &&
              (rallyBuilding.def.category === 'miner' || rallyBuilding.def.category === 'extractor');
          const isRallyGold = !rallyBuilding && b.rallyCol >= 0 && b.rallyRow >= 0 &&
              b.rallyCol < this.grid.cols && b.rallyRow < this.grid.rows &&
              this.grid.cells[b.rallyRow][b.rallyCol] === CellType.GoldDeposit;

          if (isRallyMine || isRallyGold) {
            const base = this.buildingMgr.getBase(b.owner);
            const baseCol = base ? base.col : b.col;
            const baseRow = base ? base.row : b.row;
            this.commandMine(builder, b.rallyCol, b.rallyRow, baseCol, baseRow);
          } else {
            builder.moveTo(b.rallyCol, b.rallyRow);
          }
        }
        continue;
      }

      if (b.def.category !== 'barracks') continue;

      const unitId = b.trainingQueue[0];
      const unitDef = COMBAT_UNIT_TYPES[unitId];
      if (!unitDef) { b.trainingQueue.shift(); continue; }

      const rate = unitDef.trainTime > 0 ? 1 / unitDef.trainTime : 1;
      b.trainingProgress += rate * deltaSec * b.trainingSpeedMult;

      if (b.trainingProgress >= 1) {
        b.trainingProgress = 0;
        b.trainingQueue.shift();
        // Spawn at building, then walk to rally
        const spawnCol = b.col + b.def.footprint;
        const spawnRow = b.row + Math.floor(b.def.footprint / 2);
        const unit = this.spawnCombatUnit(b.owner, unitDef, spawnCol, spawnRow);
        unit.attackMoveTo(b.rallyCol, b.rallyRow);
      }
    }
  }

  // ── Queries ──

  getBuilders(owner: UnitOwner): BuilderUnit[] {
    return this.units.filter(u => u.alive && u.owner === owner && u instanceof BuilderUnit) as BuilderUnit[];
  }

  getCombatUnits(owner: UnitOwner): CombatUnit[] {
    return this.units.filter(u => u.alive && u.owner === owner && u instanceof CombatUnit) as CombatUnit[];
  }

  getByOwner(owner: UnitOwner): RtsUnit[] {
    return this.units.filter(u => u.alive && u.owner === owner);
  }
}
