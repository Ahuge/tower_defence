import { Grid, CellType } from '../Grid';
import { BuildingManager } from './BuildingManager';
import { UnitManager } from './UnitManager';
import { ResourceManager } from '../ResourceManager';
import { FactionId } from '../../data/Factions';
import { getFactionBuildingIds, BUILDING_TYPES } from '../../data/basedefence/BuildingTypes';
import { getFactionUnitIds, COMBAT_UNIT_TYPES } from '../../data/basedefence/CombatUnitTypes';
import { Building } from '../../entities/Building';
import { BuilderUnit } from '../../entities/BuilderUnit';
import { CombatUnit } from '../../entities/CombatUnit';
import { TILE_SIZE } from '../../config';
import { DifficultyLevel } from '../../data/Difficulty';

type AIState = 'expand' | 'build_army' | 'attack' | 'defend';

interface DifficultyConfig {
  tickInterval: number;   // seconds between decisions (lower = faster)
  incomeBonus: number;    // flat gold per tick
  incomeMult: number;     // multiplier on mining income (applied separately)
  attackThreshold: number; // army size before attacking
  maxBarracks: number;
  maxMiners: number;
  scoutChance: number;    // chance per tick to send a scout
  retreatThreshold: number; // retreat if army drops below this during attack
}

const DIFFICULTY_CONFIGS: Record<DifficultyLevel, DifficultyConfig> = {
  easy:   { tickInterval: 3,   incomeBonus: 3,  incomeMult: 1.0, attackThreshold: 8,  maxBarracks: 1, maxMiners: 2, scoutChance: 0,    retreatThreshold: 2 },
  normal: { tickInterval: 2,   incomeBonus: 5,  incomeMult: 1.1, attackThreshold: 6,  maxBarracks: 2, maxMiners: 3, scoutChance: 0.1,  retreatThreshold: 3 },
  hard:   { tickInterval: 1.5, incomeBonus: 8,  incomeMult: 1.2, attackThreshold: 5,  maxBarracks: 3, maxMiners: 4, scoutChance: 0.2,  retreatThreshold: 2 },
  insane: { tickInterval: 1,   incomeBonus: 12, incomeMult: 1.3, attackThreshold: 4,  maxBarracks: 4, maxMiners: 5, scoutChance: 0.3,  retreatThreshold: 1 },
};

/**
 * Improved CPU AI with difficulty levels, scouting, reactive builds, and smarter attacking.
 */
export class CpuAI {
  private grid: Grid;
  private buildingMgr: BuildingManager;
  private unitMgr: UnitManager;
  private resources: ResourceManager;
  private faction: FactionId;
  private playerBaseCol: number;
  private playerBaseRow: number;
  private config: DifficultyConfig;

  private state: AIState = 'expand';
  private tickTimer: number = 0;
  private gameTime: number = 0;
  private buildingIds: string[];
  private unitIds: string[];

  /** Track what player is building (from scouted info) */
  private lastSeenPlayerArmy: number = 0;
  private lastSeenPlayerHeavy: boolean = false;

  constructor(
    grid: Grid,
    buildingMgr: BuildingManager,
    unitMgr: UnitManager,
    cpuResources: ResourceManager,
    faction: FactionId,
    playerBaseCol: number,
    playerBaseRow: number,
    difficulty: DifficultyLevel = 'normal',
  ) {
    this.grid = grid;
    this.buildingMgr = buildingMgr;
    this.unitMgr = unitMgr;
    this.resources = cpuResources;
    this.faction = faction;
    this.playerBaseCol = playerBaseCol;
    this.playerBaseRow = playerBaseRow;
    this.config = DIFFICULTY_CONFIGS[difficulty];
    this.buildingIds = getFactionBuildingIds(faction);
    this.unitIds = getFactionUnitIds(faction);
  }

  update(deltaSec: number): void {
    this.gameTime += deltaSec;
    this.tickTimer += deltaSec;
    if (this.tickTimer < this.config.tickInterval) return;
    this.tickTimer = 0;

    // Passive income bonus
    this.resources.add('gold', this.config.incomeBonus);

    const miners = this.buildingMgr.getByCategory('cpu', 'miner');
    const extractors = this.buildingMgr.getByCategory('cpu', 'extractor');
    const barracks = this.buildingMgr.getByCategory('cpu', 'barracks');
    const supply = this.buildingMgr.getSupply('cpu');
    const combatUnits = this.unitMgr.getCombatUnits('cpu');
    const builders = this.unitMgr.getBuilders('cpu');

    // Scouting — check player army periodically
    this.doScout();

    // State machine
    switch (this.state) {
      case 'expand':
        this.doExpand(miners, extractors, barracks, supply, builders);
        if (barracks.length > 0 && miners.length >= 2) {
          this.state = 'build_army';
        }
        break;

      case 'build_army':
        this.doTrainUnits(barracks, supply);
        this.doExpand(miners, extractors, barracks, supply, builders);
        if (combatUnits.length >= this.config.attackThreshold) {
          // Don't attack if player has a much larger army (wait for more units)
          if (this.lastSeenPlayerArmy <= combatUnits.length * 1.5) {
            this.state = 'attack';
          }
        }
        break;

      case 'attack':
        this.doAttack(combatUnits);
        this.doTrainUnits(barracks, supply);
        this.doExpand(miners, extractors, barracks, supply, builders);
        // Retreat if army gets too small
        if (combatUnits.length < this.config.retreatThreshold) {
          this.state = 'build_army';
          this.doRetreat(combatUnits);
        }
        break;

      case 'defend':
        // Defend base — keep units near base
        this.doDefend(combatUnits);
        this.doTrainUnits(barracks, supply);
        this.doExpand(miners, extractors, barracks, supply, builders);
        if (combatUnits.length >= this.config.attackThreshold) {
          this.state = 'attack';
        }
        break;
    }

    // Check if base is under attack — switch to defend
    if (this.state !== 'defend' && this.isBaseUnderAttack()) {
      this.state = 'defend';
    }

    // Always assign idle builders to mine if there are available miners/extractors
    this.doAssignMiners(builders);
  }

  /** Assign idle CPU builders to mine at available miners/extractors */
  private doAssignMiners(builders: BuilderUnit[]): void {
    const cpuBase = this.buildingMgr.getBase('cpu');
    if (!cpuBase) return;
    const baseCol = cpuBase.col;
    const baseRow = cpuBase.row;

    // Try to assign idle builders to mine — first buildings, then raw gold deposits
    const miners = this.buildingMgr.getByCategory('cpu', 'miner');
    const extractors = this.buildingMgr.getByCategory('cpu', 'extractor');
    const mineBuildings = [...miners, ...extractors].filter(b => b.isBuilt && !b.destroyed);

    for (const builder of builders) {
      if (builder.state !== 'idle') continue;

      // Try buildings first
      let assigned = false;
      for (const target of mineBuildings) {
        if (this.unitMgr.getMinersAtPatch(target.col, target.row) < 2) {
          this.unitMgr.commandMine(builder, target.col, target.row, baseCol, baseRow);
          assigned = true;
          break;
        }
      }
      if (assigned) continue;

      // Try raw gold deposits near base
      const baseCx = cpuBase.col + 1;
      const baseCy = cpuBase.row + 1;
      this.unitMgr.commandMine(builder, baseCx, baseCy, baseCol, baseRow);
    }
  }

  private doScout(): void {
    if (Math.random() > this.config.scoutChance) return;

    // "Scout" by reading player units (CPU cheats — no real vision needed)
    const playerCombat = this.unitMgr.getCombatUnits('player');
    this.lastSeenPlayerArmy = playerCombat.length;
    this.lastSeenPlayerHeavy = playerCombat.some(u => u.def.role === 'heavy');
  }

  private isBaseUnderAttack(): boolean {
    const cpuBase = this.buildingMgr.getBase('cpu');
    if (!cpuBase) return false;
    const baseCx = (cpuBase.col + 1) * TILE_SIZE;
    const baseCy = (cpuBase.row + 1) * TILE_SIZE;
    const threatRange = TILE_SIZE * 15;

    const playerUnits = this.unitMgr.getByOwner('player');
    return playerUnits.some(u => {
      const dx = u.x - baseCx;
      const dy = u.y - baseCy;
      return dx * dx + dy * dy < threatRange * threatRange;
    });
  }

  private doExpand(
    miners: Building[], extractors: Building[],
    barracks: Building[], supply: { used: number; max: number },
    builders: BuilderUnit[],
  ): void {
    const idleBuilder = builders.find(b => b.state === 'idle');
    if (!idleBuilder) return;

    const cpuBase = this.buildingMgr.getBase('cpu');
    if (!cpuBase) return;
    const baseCenterCol = cpuBase.col + 1;
    const baseCenterRow = cpuBase.row + 1;

    // Priority 1: Miners
    if (miners.length < this.config.maxMiners) {
      const minerId = this.buildingIds.find(id => BUILDING_TYPES[id]?.category === 'miner');
      if (minerId && this.resources.canAfford('gold', BUILDING_TYPES[minerId].costGold)) {
        const deposit = this.findNearestCellType(baseCenterCol, baseCenterRow, CellType.GoldDeposit, 25);
        if (deposit) {
          idleBuilder.commandBuild({ buildingId: minerId, col: deposit.col, row: deposit.row });
          return;
        }
      }
    }

    // Priority 2: Extractor
    if (extractors.length < Math.ceil(this.config.maxMiners / 2)) {
      const extractorId = this.buildingIds.find(id => BUILDING_TYPES[id]?.category === 'extractor');
      if (extractorId && this.resources.canAfford('gold', BUILDING_TYPES[extractorId].costGold)) {
        const geyser = this.findNearestCellType(baseCenterCol, baseCenterRow, CellType.Geyser, 25);
        if (geyser) {
          idleBuilder.commandBuild({ buildingId: extractorId, col: geyser.col, row: geyser.row });
          return;
        }
      }
    }

    // Priority 3: Barracks (search wider area)
    if (barracks.length < this.config.maxBarracks) {
      const barracksId = this.buildingIds.find(id => BUILDING_TYPES[id]?.category === 'barracks');
      if (barracksId && this.resources.canAfford('gold', BUILDING_TYPES[barracksId].costGold)) {
        const spot = this.findEmptyNear(baseCenterCol, baseCenterRow, 15, BUILDING_TYPES[barracksId].footprint);
        if (spot) {
          idleBuilder.commandBuild({ buildingId: barracksId, col: spot.col, row: spot.row });
          return;
        }
      }
    }

    // Priority 4: Supply
    if (supply.max - supply.used < 6) {
      const supplyId = this.buildingIds.find(id => BUILDING_TYPES[id]?.category === 'supply');
      if (supplyId && this.resources.canAfford('gold', BUILDING_TYPES[supplyId].costGold)) {
        const spot = this.findEmptyNear(baseCenterCol, baseCenterRow, 15);
        if (spot) {
          idleBuilder.commandBuild({ buildingId: supplyId, col: spot.col, row: spot.row });
        }
      }
    }
  }

  private doTrainUnits(barracks: Building[], supply: { used: number; max: number }): void {
    for (const b of barracks) {
      if (!b.isBuilt || b.trainingQueue.length >= 3) continue;

      const gas = this.resources.get('gas');
      let unitId: string | undefined;

      // Reactive: if player has heavies, build more ranged (counter)
      if (this.lastSeenPlayerHeavy && this.unitIds.length > 1 && Math.random() < 0.6) {
        // Ranged units (index 1 — typically mid-tier ranged)
        unitId = this.unitIds.find(id => COMBAT_UNIT_TYPES[id]?.role === 'ranged') || this.unitIds[1];
      } else if (gas >= 50 && Math.random() < 0.25 && this.unitIds.length > 2) {
        unitId = this.unitIds[2]; // heavy
      } else if (Math.random() < 0.5) {
        unitId = this.unitIds[0]; // cheap
      } else if (this.unitIds.length > 1) {
        unitId = this.unitIds[1]; // mid
      }

      if (unitId) {
        const def = COMBAT_UNIT_TYPES[unitId];
        if (def && supply.max - supply.used >= def.supply) {
          this.unitMgr.queueTraining(b, unitId, 'cpu');
        }
      }
    }
  }

  private doAttack(combatUnits: CombatUnit[]): void {
    for (const unit of combatUnits) {
      if (unit.state === 'idle') {
        unit.attackMoveTo(this.playerBaseCol, this.playerBaseRow);
      }
    }
  }

  private doRetreat(combatUnits: CombatUnit[]): void {
    const cpuBase = this.buildingMgr.getBase('cpu');
    if (!cpuBase) return;
    for (const unit of combatUnits) {
      unit.moveTo(cpuBase.col + 1, cpuBase.row + 3);
    }
  }

  private doDefend(combatUnits: CombatUnit[]): void {
    const cpuBase = this.buildingMgr.getBase('cpu');
    if (!cpuBase) return;
    const baseCx = cpuBase.col + 1;
    const baseCy = cpuBase.row + 1;

    // Attack-move to base area (will engage any enemies near base)
    for (const unit of combatUnits) {
      if (unit.state === 'idle') {
        unit.attackMoveTo(baseCx, baseCy);
      }
    }
  }

  private findNearestCellType(
    cx: number, cy: number, cellType: CellType, maxRadius: number,
  ): { col: number; row: number } | null {
    for (let r = 1; r <= maxRadius; r++) {
      for (let dr = -r; dr <= r; dr++) {
        for (let dc = -r; dc <= r; dc++) {
          if (Math.abs(dr) !== r && Math.abs(dc) !== r) continue;
          const c = cx + dc;
          const row = cy + dr;
          if (c >= 0 && c < this.grid.cols && row >= 0 && row < this.grid.rows) {
            if (this.grid.cells[row][c] === cellType) {
              return { col: c, row };
            }
          }
        }
      }
    }
    return null;
  }

  /** Find an empty spot near (cx,cy) where a building of given footprint can be placed */
  private findEmptyNear(cx: number, cy: number, maxRadius: number, footprint: number = 1): { col: number; row: number } | null {
    for (let r = 2; r <= maxRadius; r++) {
      for (let dr = -r; dr <= r; dr++) {
        for (let dc = -r; dc <= r; dc++) {
          if (Math.abs(dr) !== r && Math.abs(dc) !== r) continue;
          const c = cx + dc;
          const row = cy + dr;
          if (c < 0 || c + footprint > this.grid.cols || row < 0 || row + footprint > this.grid.rows) continue;
          // Check all cells in the footprint are empty
          let allEmpty = true;
          for (let fr = 0; fr < footprint && allEmpty; fr++) {
            for (let fc = 0; fc < footprint && allEmpty; fc++) {
              if (this.grid.cells[row + fr][c + fc] !== CellType.Empty) allEmpty = false;
            }
          }
          if (allEmpty) return { col: c, row };
        }
      }
    }
    return null;
  }
}
