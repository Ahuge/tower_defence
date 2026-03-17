import Phaser from 'phaser';
import {
  TILE_SIZE, GRID_COLS, GRID_ROWS, GAME_WIDTH, GAME_HEIGHT,
  CANVAS_WIDTH, GRID_OFFSET_X, SIDEBAR_WIDTH,
  COLOR_GROUND, COLOR_GRID_LINE, COLOR_ENTRY, COLOR_EXIT,
  COLOR_HOVER_VALID, COLOR_HOVER_INVALID, STARTING_LIVES,
  gridX, gridY, gridLeftX, pixelToCol,
} from '../config';
import { Grid, CellType } from '../systems/Grid';
import { findPath, PathPoint } from '../systems/Pathfinding';
import { EventBus } from '../systems/EventBus';
import { EconomyManager } from '../systems/EconomyManager';
import { SpawnManager } from '../systems/SpawnManager';
import { InputManager } from '../systems/InputManager';
import { UIOverlay } from '../systems/UIOverlay';
import { getTowerType, TOWER_ORDER, getAllFactionTowerIds } from '../data/TowerTypes';
import { FactionId, getFaction } from '../data/Factions';
import { MatchMode, WaveDefinition, getWavesForMode } from '../data/WaveDefinitions';
import { MapId, MAPS } from '../data/Maps';
import { DifficultyLevel, DIFFICULTIES, DifficultyHints } from '../data/Difficulty';
import { DraftModifier } from '../data/DraftModifiers';
import { IncomeManager } from '../systems/IncomeManager';
import { SendManager } from '../systems/SendManager';
import { FrontierManager } from '../systems/FrontierManager';
import { FrontierBuilding } from '../data/FrontierBuildings';
import { SendCreepOption } from '../data/SendCreepTypes';
import { TowerSelectBar } from '../ui/TowerSelectBar';
import { TowerInfoPanel } from '../ui/TowerInfoPanel';
import { SendPanel } from '../ui/SendPanel';
import { IncomeDisplay } from '../ui/IncomeDisplay';
import { FrontierPanel } from '../ui/FrontierPanel';
import { FighterPanel } from '../ui/FighterPanel';
import { EventLog } from '../ui/EventLog';
import { CreepInfoPanel } from '../ui/CreepInfoPanel';
import { UpcomingWaves } from '../ui/UpcomingWaves';
import { StatsTracker } from '../systems/StatsTracker';
import { FighterManager } from '../systems/FighterManager';
import { FighterType } from '../data/FighterTypes';
import { UpdateContext } from '../systems/traits/Trait';
import { GameOverData } from './GameOverScene';
import { Creep } from '../entities/Creep';
import { Tower } from '../entities/Tower';

type SelectionMode = 'build' | 'inspect' | 'inspect_creep' | 'none';

export class GameScene extends Phaser.Scene {
  // Core systems
  eventBus!: EventBus;
  grid!: Grid;
  economy!: EconomyManager;
  spawner!: SpawnManager;
  inputMgr!: InputManager;
  ui!: UIOverlay;

  // UI panels
  towerBar!: TowerSelectBar;
  towerInfo!: TowerInfoPanel;
  fighterPanel: FighterPanel | null = null;
  fighterMgr: FighterManager | null = null;
  incomeMgr!: IncomeManager;
  sendMgr!: SendManager;
  sendPanel!: SendPanel;
  incomeDisplay!: IncomeDisplay;
  frontierMgr!: FrontierManager;
  frontierPanel!: FrontierPanel;
  eventLog!: EventLog;
  creepInfo!: CreepInfoPanel;
  upcomingWaves!: UpcomingWaves;
  statsTracker!: StatsTracker;
  selectedCreep: Creep | null = null;

  // Game state
  towers: Tower[] = [];
  creeps: Creep[] = [];
  currentPath: PathPoint[] | null = null;
  allPaths: (PathPoint[] | null)[] = [];
  waves!: WaveDefinition[];
  matchMode: MatchMode = 'standard';
  mapId: MapId = 'plains';
  difficulty: DifficultyLevel = 'normal';
  difficultyHints!: DifficultyHints;
  faction: FactionId | null = null;
  modifier: DraftModifier | null = null;
  activeTowerIds: string[] = TOWER_ORDER;
  lives: number = STARTING_LIVES;
  currentWave: number = 0;
  waveActive: boolean = false;
  betweenWaves: boolean = true;
  paused: boolean = false;
  totalTowersBuilt: number = 0;
  totalCreepsKilled: number = 0;

  // Selection state
  selectionMode: SelectionMode = 'none';
  selectedBuildType: string | null = null;
  selectedTower: Tower | null = null;

  // Graphics layers
  gridGraphics!: Phaser.GameObjects.Graphics;
  pathGraphics!: Phaser.GameObjects.Graphics;
  hoverGraphics!: Phaser.GameObjects.Graphics;
  rangeGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super('GameScene');
  }

  init(data: { mode?: MatchMode; faction?: FactionId | null; map?: MapId; modifier?: DraftModifier | null; difficulty?: DifficultyLevel }): void {
    this.matchMode = data.mode || 'standard';
    this.faction = data.faction ?? null;
    this.mapId = data.map || 'plains';
    this.modifier = data.modifier ?? null;
    this.difficulty = data.difficulty || 'normal';
    this.difficultyHints = DIFFICULTIES[this.difficulty];
    if (this.faction === 'random') {
      this.activeTowerIds = this.rollRandomTowers();
    } else if (this.faction) {
      const f = getFaction(this.faction);
      this.activeTowerIds = f.towerIds;
    } else {
      this.activeTowerIds = TOWER_ORDER;
    }
  }

  private rollRandomTowers(): string[] {
    const all = getAllFactionTowerIds().filter(id => !getTowerType(id).ultimate);
    const shuffled = [...all].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 6);
  }

  create(): void {
    this.towers = [];
    this.creeps = [];
    this.lives = STARTING_LIVES;
    this.currentWave = 0;
    this.waveActive = false;
    this.betweenWaves = true;
    this.paused = false;
    this.selectionMode = 'none';
    this.selectedBuildType = null;
    this.selectedTower = null;
    this.totalTowersBuilt = 0;
    this.totalCreepsKilled = 0;

    // Apply one-time modifier effects
    if (this.modifier) {
      this.lives += this.modifier.extraLives;
      if (this.modifier.livesOverride !== null) {
        this.lives = this.modifier.livesOverride;
      }
    }

    this.eventBus = new EventBus();
    const mapDef = MAPS[this.mapId];
    this.grid = new Grid(mapDef);
    this.waves = getWavesForMode(this.matchMode);
    this.recalculatePaths();

    // Systems
    this.economy = new EconomyManager(this.eventBus);
    this.spawner = new SpawnManager(this, this.eventBus, this.difficultyHints);
    this.inputMgr = new InputManager(this, this.eventBus);
    this.ui = new UIOverlay(this, this.eventBus);

    if (this.modifier && this.modifier.extraGold > 0) {
      this.economy.addGold(this.modifier.extraGold);
    }

    // Tower bar (starts deselected)
    this.towerBar = new TowerSelectBar(this, this.activeTowerIds, (typeId) => {
      if (typeId) {
        this.enterBuildMode(typeId);
      } else if (this.selectionMode === 'build') {
        // Only enter none mode if we were in build mode.
        // If deselect was triggered by enterInspectMode, don't override it.
        this.enterNoneMode();
      }
    });
    this.towerInfo = new TowerInfoPanel(this);
    this.creepInfo = new CreepInfoPanel(this);

    // Economy systems
    this.incomeMgr = new IncomeManager(this.eventBus);
    if (this.modifier && this.modifier.extraIncome > 0) {
      this.incomeMgr.baseIncome += this.modifier.extraIncome;
    }
    this.sendMgr = new SendManager(this, this.eventBus);
    this.spawner.setFlyingPath(this.grid.entries[0], this.grid.exits[0]);

    // Stats tracker
    this.statsTracker = new StatsTracker();

    // Upcoming waves (top of sidebar)
    this.upcomingWaves = new UpcomingWaves(this);
    this.upcomingWaves.update(this.currentWave, this.waves);

    const sidebarTopOffset = UpcomingWaves.HEIGHT;
    this.sendPanel = new SendPanel(this, (opt: SendCreepOption) => {
      if (this.betweenWaves && this.economy.spend(opt.cost)) {
        this.sendMgr.queueSend(opt);
        this.incomeMgr.addSendBonus(opt.incomeReward);
        this.eventLog.sendQueued(opt.name, opt.cost);
        this.statsTracker.recordSendSpent(opt.cost);
        this.statsTracker.recordSendIncome(opt.incomeReward);
      }
    }, sidebarTopOffset);
    this.incomeDisplay = new IncomeDisplay(this);

    // Frontier (with action callbacks)
    this.frontierMgr = new FrontierManager(this.eventBus, this.incomeMgr, this.faction);
    this.frontierPanel = new FrontierPanel(
      this,
      this.frontierMgr,
      (building: FrontierBuilding) => {
        if (this.economy.spend(building.cost)) {
          this.frontierMgr.purchaseBuilding(building);
          this.frontierPanel.updateOwned();
          this.eventLog.frontierPurchased(building.name, building.cost);
          this.statsTracker.recordFrontierSpent(building.cost);
        }
      },
      (action: string, idx: number) => {
        this.handleFrontierAction(action, idx);
      },
      (action: string, defId: string) => {
        this.handleFrontierBatchAction(action, defId);
      },
    );

    // Event log (bottom of sidebar)
    this.eventLog = new EventLog(this, 480);
    this.eventLog.gameMessage('Game started. Press SPACE for wave 1.');
    const h = this.difficultyHints;
    this.eventLog.gameMessage(`Difficulty: ${this.difficulty} (HP:${h.toughness}x Count:${h.count}x Spd:${h.speed}x Gold:${h.goldMult}x)`);

    // Fighter system (only with faction)
    if (this.faction) {
      const rallyCol = Math.floor(GRID_COLS / 2);
      const rallyRow = Math.floor(GRID_ROWS / 2);
      this.fighterMgr = new FighterManager(this, this.eventBus, rallyCol, rallyRow);
      this.fighterPanel = new FighterPanel(this, this.faction, (ft: FighterType) => {
        if (this.economy.spend(ft.cost) && this.fighterMgr) {
          this.fighterMgr.purchaseFighter(ft);
        }
      });
    }

    // Graphics layers
    this.gridGraphics = this.add.graphics().setDepth(0);
    this.pathGraphics = this.add.graphics().setDepth(1);
    this.hoverGraphics = this.add.graphics().setDepth(20);
    this.rangeGraphics = this.add.graphics().setDepth(19);

    // Sidebar background
    const sidebarBg = this.add.graphics().setDepth(0);
    sidebarBg.fillStyle(0x0e0e12, 1);
    sidebarBg.fillRect(0, 0, SIDEBAR_WIDTH, GAME_HEIGHT + 28 + TowerSelectBar.BAR_HEIGHT);

    this.drawGrid();
    this.drawPath();

    // Wire input
    this.inputMgr.onHover((col, row) => this.handleHover(col, row));
    this.inputMgr.onClick((col, row) => this.handleClick(col, row));
    this.inputMgr.onClickMiss(() => {
      // Clicked outside grid (sidebar) — don't change selection
    });
    this.inputMgr.onRightClick((col, row) => this.handleRightClick(col, row));
    this.inputMgr.onSpace(() => {
      if (this.betweenWaves && this.currentWave < this.waves.length) {
        this.startWave();
      }
    });

    // Tower selection hotkeys
    const numKeys = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT'];
    for (let i = 0; i < numKeys.length; i++) {
      const idx = i;
      this.inputMgr.onKey(numKeys[i], () => {
        this.towerBar.selectByIndex(idx);
      });
    }

    this.inputMgr.onKey('ESC', () => this.enterNoneMode());
    this.inputMgr.onKey('P', () => this.togglePause());

    this.ui.update(this.economy.gold, this.lives, this.currentWave, this.waves.length, this.waveActive, this.betweenWaves);
  }

  // === Selection Mode Management ===

  private enterBuildMode(typeId: string): void {
    this.selectionMode = 'build';
    this.selectedBuildType = typeId;
    this.selectedTower = null;
    this.towerInfo?.hide();
  }

  private enterInspectMode(tower: Tower): void {
    this.selectionMode = 'inspect';
    this.selectedBuildType = null;
    this.selectedTower = tower;
    this.selectedCreep = null;
    this.towerBar.deselect();
    this.towerInfo.show(tower);
    this.creepInfo.hide();
  }

  private enterNoneMode(): void {
    this.selectionMode = 'none';
    this.selectedBuildType = null;
    this.selectedTower = null;
    this.selectedCreep = null;
    this.towerBar.deselect();
    this.towerInfo.hide();
    this.creepInfo.hide();
    this.hoverGraphics.clear();
    this.rangeGraphics.clear();
  }

  // === Input Handlers ===

  handleHover(col: number, row: number): void {
    this.hoverGraphics.clear();
    this.rangeGraphics.clear();

    if (this.selectionMode !== 'build' || !this.selectedBuildType) return;

    if (this.grid.canPlaceTower(col, row)) {
      const towerType = getTowerType(this.selectedBuildType);
      const cost = this.getEffectiveCost(towerType.cost);
      const canPlace = this.economy.canAfford(cost);
      const color = canPlace ? COLOR_HOVER_VALID : COLOR_HOVER_INVALID;

      this.hoverGraphics.fillStyle(color, 0.2);
      this.hoverGraphics.fillRect(gridLeftX(col), row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      this.hoverGraphics.lineStyle(1, color, 0.6);
      this.hoverGraphics.strokeRect(gridLeftX(col), row * TILE_SIZE, TILE_SIZE, TILE_SIZE);

      if (canPlace) {
        let range = towerType.range;
        const rangeBonus = (this.modifier?.towerTraits ?? []).find(t => t.id === 'range_bonus');
        if (rangeBonus) range += rangeBonus.bonus ?? 0;
        this.rangeGraphics.lineStyle(1, color, 0.2);
        this.rangeGraphics.strokeCircle(gridX(col), gridY(row), range * TILE_SIZE);
      }
    }
  }

  handleClick(col: number, row: number): void {
    const existingTower = this.towers.find(t => t.col === col && t.row === row);

    // Check for creep click (any mode except build)
    if (!existingTower && this.selectionMode !== 'build') {
      const clickX = gridX(col);
      const clickY = gridY(col);
      const clickedCreep = this.findCreepNear(gridX(col), gridY(row));
      if (clickedCreep) {
        this.enterCreepInspect(clickedCreep);
        return;
      }
    }

    switch (this.selectionMode) {
      case 'build':
        if (existingTower) {
          this.enterInspectMode(existingTower);
        } else {
          this.tryBuildTower(col, row);
        }
        break;

      case 'inspect':
      case 'inspect_creep':
        if (existingTower) {
          if (existingTower === this.selectedTower && existingTower.canUpgrade()) {
            const cost = existingTower.getUpgradeCost();
            if (this.economy.spend(cost)) {
              existingTower.upgrade();
              this.towerInfo.show(existingTower);
            }
          } else {
            this.enterInspectMode(existingTower);
          }
        } else {
          this.enterNoneMode();
        }
        break;

      case 'none':
        if (existingTower) {
          this.enterInspectMode(existingTower);
        }
        break;
    }
  }

  private findCreepNear(px: number, py: number): Creep | null {
    let closest: Creep | null = null;
    let closestDist = TILE_SIZE; // detection radius
    for (const creep of this.creeps) {
      if (!creep.alive || creep.reached) continue;
      const dx = creep.x - px;
      const dy = creep.y - py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < closestDist) {
        closest = creep;
        closestDist = dist;
      }
    }
    return closest;
  }

  private enterCreepInspect(creep: Creep): void {
    this.selectionMode = 'inspect_creep';
    this.selectedBuildType = null;
    this.selectedTower = null;
    this.selectedCreep = creep;
    this.towerBar.deselect();
    this.towerInfo.hide();
    this.creepInfo.show(creep);
  }

  handleRightClick(col: number, row: number): void {
    if (this.grid.cells[row]?.[col] !== CellType.Tower) return;

    const idx = this.towers.findIndex(t => t.col === col && t.row === row);
    if (idx !== -1) {
      const tower = this.towers[idx];
      const refund = tower.getSellValue();
      this.economy.addGold(refund);
      this.eventLog.towerSold(tower.typeDef.name, refund);
      if (this.selectedTower === tower) this.enterNoneMode();
      tower.destroy();
      this.towers.splice(idx, 1);
    }

    this.grid.removeTower(col, row);
    this.eventBus.emit('towerSold', col, row);
    this.recalculatePaths();
    this.drawPath();
  }

  private tryBuildTower(col: number, row: number): void {
    if (!this.selectedBuildType) return;
    const towerType = getTowerType(this.selectedBuildType);
    const cost = this.getEffectiveCost(towerType.cost);

    if (!this.grid.canPlaceTower(col, row)) return;
    if (!this.economy.canAfford(cost)) return;

    this.grid.placeTower(col, row);

    const oldPaths = this.allPaths;
    this.recalculatePaths();
    const anyBlocked = this.allPaths.some(p => p === null);

    if (anyBlocked || !this.currentPath) {
      this.grid.removeTower(col, row);
      this.allPaths = oldPaths;
      this.currentPath = oldPaths.find(p => p !== null) ?? null;
      return;
    }

    this.economy.spend(cost);
    const tower = new Tower(this, col, row, towerType);

    if (this.modifier) {
      for (const t of this.modifier.towerTraits) {
        tower.traits.push({ ...t });
      }
    }

    this.towers.push(tower);
    this.totalTowersBuilt++;
    this.eventLog.towerBuilt(towerType.name, cost);
    this.statsTracker.recordTowerBuilt(towerType.id);
    this.statsTracker.recordGoldSpent(cost);
    this.eventBus.emit('towerPlaced', col, row, towerType.id);

    // Update existing creep paths
    for (const creep of this.creeps) {
      if (!creep.alive || creep.reached) continue;
      const creepCol = pixelToCol(creep.x);
      const creepRow = Math.round((creep.y - TILE_SIZE / 2) / TILE_SIZE);
      let bestPath: PathPoint[] | null = null;
      for (const exit of this.grid.exits) {
        const p = findPath(this.grid, { col: creepCol, row: creepRow }, exit);
        if (p && (!bestPath || p.length < bestPath.length)) {
          bestPath = p;
        }
      }
      if (bestPath) {
        creep.path = bestPath;
        creep.pathIndex = 1;
      }
    }

    this.drawPath();
  }

  // === Frontier Actions ===

  private handleFrontierAction(action: string, idx: number): void {
    switch (action) {
      case 'overcharge': {
        const gold = this.frontierMgr.overchargeBuilding(idx);
        if (gold > 0) {
          this.economy.addGold(gold);
          this.eventLog.frontierAction('Overcharge', `+${gold}g burst, dormant 2 waves`);
        }
        break;
      }
      case 'dig': {
        const result = this.frontierMgr.digDeeper(idx);
        if (result.collapsed) {
          this.eventLog.frontierAction('Dig Deeper', 'CAVE-IN! Mine destroyed');
        } else if (result.success) {
          this.eventLog.frontierAction('Dig Deeper', 'Success! +1 depth');
        }
        break;
      }
      case 'harvest': {
        const gold = this.frontierMgr.harvestGrowth(idx);
        if (gold > 0) {
          this.economy.addGold(gold);
          this.eventLog.frontierAction('Harvest', `+${gold}g collected`);
        }
        break;
      }
    }
    this.frontierPanel.updateOwned();
  }

  private handleFrontierBatchAction(action: string, defId: string): void {
    switch (action) {
      case 'overcharge': {
        const gold = this.frontierMgr.overchargeAllOfType(defId);
        if (gold > 0) {
          this.economy.addGold(gold);
          this.eventLog.frontierAction('Overcharge All', `+${gold}g burst`);
        }
        break;
      }
      case 'dig': {
        const result = this.frontierMgr.digAllOfType(defId);
        this.eventLog.frontierAction('Dig All', `${result.successes} ok, ${result.collapses} collapsed`);
        break;
      }
      case 'harvest': {
        const gold = this.frontierMgr.harvestAllOfType(defId);
        if (gold > 0) {
          this.economy.addGold(gold);
          this.eventLog.frontierAction('Harvest All', `+${gold}g collected`);
        }
        break;
      }
    }
    this.frontierPanel.updateOwned();
  }

  // === Game Loop ===

  update(time: number, delta: number): void {
    if (this.paused) return;

    const traitCtx: UpdateContext = {
      allTowers: this.towers,
      allCreeps: this.creeps,
      time,
      delta,
    };

    for (const tower of this.towers) {
      tower.runTraitUpdates(traitCtx);
    }

    for (const tower of this.towers) {
      if (tower.goldEarned > 0) {
        this.economy.addGold(tower.goldEarned);
        this.statsTracker.recordTowerGold(tower.typeId, tower.goldEarned);
        tower.goldEarned = 0;
      }
      if (tower.damageDealt > 0) {
        this.statsTracker.recordDamage(tower.typeId, tower.damageDealt);
        this.statsTracker.recordHitStats(tower.typeId, tower.hitStatsAccum);
        tower.damageDealt = 0;
        // Reset granular stats
        for (const key of Object.keys(tower.hitStatsAccum)) {
          tower.hitStatsAccum[key] = 0;
        }
      }
    }

    for (const tower of this.towers) {
      tower.update(time, delta, this.creeps);
    }

    for (const creep of this.creeps) {
      creep.update(delta, this.creeps);
    }

    if (this.fighterMgr) {
      this.fighterMgr.update(time, delta, this.creeps);
    }

    for (const creep of this.creeps) {
      if (creep.reached) {
        this.lives--;
        this.eventBus.emit('livesChanged', this.lives);
        this.eventLog.creepReached();
        this.statsTracker.recordLeak();
        creep.reached = false;
        creep.alive = false;
      }
    }

    const killGoldMult = this.modifier?.killGoldMult ?? 1;
    for (const creep of this.creeps) {
      if (!creep.alive && !creep.reached && creep.hp <= 0) {
        const killGold = Math.round(this.economy.getKillGold() * killGoldMult);
        this.eventBus.emit('creepKilled', 0, killGold);
        this.totalCreepsKilled++;
        this.statsTracker.recordKill();
        creep.hp = -999;
      }
    }

    this.creeps = this.creeps.filter(c => c.alive);

    this.spawner.update(delta, this.currentPath, this.creeps);
    this.sendMgr.update(delta, this.currentPath, this.creeps);

    if (this.waveActive && !this.spawner.isSpawning() && !this.sendMgr.isSpawning() && this.creeps.length === 0) {
      this.waveActive = false;
      this.betweenWaves = true;
      // Frontier mechanic bonuses (growth, dig, gamble)
      const frontierBonus = this.frontierMgr.onWaveEnd(this.currentWave);
      if (frontierBonus > 0) {
        this.economy.addGold(frontierBonus);
        this.statsTracker.recordFrontierEarned(frontierBonus);
      }
      this.frontierPanel.updateOwned();
      // Wave income (includes base + sends + frontier base)
      const income = this.incomeMgr.collectWaveIncome();
      this.economy.addGold(income);
      this.eventBus.emit('waveCleared', this.currentWave);
      this.eventLog.waveCleared(this.currentWave, income + (frontierBonus > 0 ? frontierBonus : 0));
      this.statsTracker.recordWaveCompleted();
      this.upcomingWaves.update(this.currentWave, this.waves);
      if (frontierBonus > 0) {
        this.eventLog.frontierIncome('Frontier bonus', frontierBonus);
      }

      // Random faction: rotate available towers each wave
      if (this.faction === 'random') {
        this.activeTowerIds = this.rollRandomTowers();
        this.towerBar.setTowerIds(this.activeTowerIds);
        this.eventLog.gameMessage('Tower pool rotated!');
        this.enterNoneMode();
      }
    }

    if (this.lives <= 0) {
      this.lives = 0;
      this.eventBus.emit('gameOver');
      this.goToGameOver(false);
      return;
    }

    if (this.currentWave >= this.waves.length && this.creeps.length === 0 && !this.waveActive) {
      this.eventBus.emit('gameWon');
      this.goToGameOver(true);
      return;
    }

    this.ui.update(this.economy.gold, this.lives, this.currentWave, this.waves.length, this.waveActive, this.betweenWaves);
    this.incomeDisplay.update(this.incomeMgr.getBreakdown());
    this.creepInfo.updateTracked();
    this.statsTracker.updateTime(delta);

    // Update tower alive time for DPS calc
    for (const tower of this.towers) {
      const ts = this.statsTracker.stats.towerStats[tower.typeId];
      if (ts) ts.timeAlive += delta;
    }
  }

  // === Helpers ===

  private goToGameOver(won: boolean): void {
    const data: GameOverData = {
      won,
      wave: this.currentWave,
      totalWaves: this.waves.length,
      gold: this.economy.gold,
      towersBuilt: this.totalTowersBuilt,
      creepsKilled: this.totalCreepsKilled,
      matchMode: this.matchMode,
      faction: this.faction,
      stats: this.statsTracker.stats,
    };
    this.scene.start('GameOverScene', data);
  }

  // Pause menu
  private pauseOverlay: Phaser.GameObjects.Container | null = null;

  private togglePause(): void {
    this.paused = !this.paused;
    if (this.paused) {
      this.showPauseMenu();
    } else {
      this.hidePauseMenu();
    }
  }

  private showPauseMenu(): void {
    if (this.pauseOverlay) return;

    const cx = GRID_OFFSET_X + GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.pauseOverlay = this.add.container(0, 0).setDepth(50);

    // Dim overlay
    const dim = this.add.graphics();
    dim.fillStyle(0x000000, 0.6);
    dim.fillRect(GRID_OFFSET_X, 0, GAME_WIDTH, GAME_HEIGHT);
    this.pauseOverlay.add(dim);

    // Panel
    const panelW = 260;
    const panelH = 180;
    const px = cx - panelW / 2;
    const py = cy - panelH / 2;

    const panel = this.add.graphics();
    panel.fillStyle(0x1a1a1a, 0.95);
    panel.fillRect(px, py, panelW, panelH);
    panel.lineStyle(2, 0x555555, 1);
    panel.strokeRect(px, py, panelW, panelH);
    this.pauseOverlay.add(panel);

    this.add.text(cx, py + 20, 'PAUSED', {
      fontSize: '24px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(51);
    this.pauseOverlay.add(this.children.getAt(this.children.length - 1) as Phaser.GameObjects.Text);

    // Resume button
    const resumeBtn = this.add.text(cx, py + 70, '[ Resume ]', {
      fontSize: '16px', color: '#44ff44', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(51);
    this.pauseOverlay.add(resumeBtn);
    resumeBtn.setInteractive({ useHandCursor: true });
    resumeBtn.on('pointerdown', () => this.togglePause());
    resumeBtn.on('pointerover', () => resumeBtn.setColor('#88ff88'));
    resumeBtn.on('pointerout', () => resumeBtn.setColor('#44ff44'));

    // Exit to menu button
    const exitBtn = this.add.text(cx, py + 110, '[ Exit to Menu ]', {
      fontSize: '16px', color: '#ff8844', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(51);
    this.pauseOverlay.add(exitBtn);
    exitBtn.setInteractive({ useHandCursor: true });
    exitBtn.on('pointerdown', () => {
      this.hidePauseMenu();
      this.scene.start('MenuScene');
    });
    exitBtn.on('pointerover', () => exitBtn.setColor('#ffbb77'));
    exitBtn.on('pointerout', () => exitBtn.setColor('#ff8844'));

    // Hint
    const hint = this.add.text(cx, py + panelH - 16, 'Press P to resume', {
      fontSize: '10px', color: '#666666', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(51);
    this.pauseOverlay.add(hint);
  }

  private hidePauseMenu(): void {
    if (this.pauseOverlay) {
      this.pauseOverlay.destroy(true);
      this.pauseOverlay = null;
    }
  }

  private getEffectiveCost(baseCost: number): number {
    return Math.round(baseCost * (this.modifier?.costMult ?? 1));
  }

  recalculatePaths(): void {
    this.allPaths = [];
    for (const entry of this.grid.entries) {
      for (const exit of this.grid.exits) {
        this.allPaths.push(findPath(this.grid, entry, exit));
      }
    }
    this.currentPath = this.allPaths.find(p => p !== null) ?? null;
  }

  drawGrid(): void {
    const g = this.gridGraphics;
    g.clear();

    g.fillStyle(COLOR_GROUND, 1);
    g.fillRect(GRID_OFFSET_X, 0, GAME_WIDTH, GAME_HEIGHT);

    g.lineStyle(1, COLOR_GRID_LINE, 0.3);
    for (let col = 0; col <= GRID_COLS; col++) {
      g.lineBetween(gridLeftX(col), 0, gridLeftX(col), GAME_HEIGHT);
    }
    for (let row = 0; row <= GRID_ROWS; row++) {
      g.lineBetween(GRID_OFFSET_X, row * TILE_SIZE, GRID_OFFSET_X + GAME_WIDTH, row * TILE_SIZE);
    }

    // Blocked terrain
    g.fillStyle(0x1a1a1a, 1);
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const cell = this.grid.cells[row][col];
        if (cell === CellType.Blocked) {
          g.fillStyle(0x1a1a1a, 1);
          g.fillRect(gridLeftX(col), row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          g.lineStyle(1, 0x333333, 0.5);
          g.strokeRect(gridLeftX(col), row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        } else if (cell === CellType.NoBuild) {
          // Walkable but unbuildable — subtle X pattern
          g.fillStyle(0x2a2222, 1);
          g.fillRect(gridLeftX(col), row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          g.lineStyle(1, 0x442222, 0.3);
          const lx = gridLeftX(col);
          const ty = row * TILE_SIZE;
          g.lineBetween(lx + 4, ty + 4, lx + TILE_SIZE - 4, ty + TILE_SIZE - 4);
          g.lineBetween(lx + TILE_SIZE - 4, ty + 4, lx + 4, ty + TILE_SIZE - 4);
        }
        if (cell === CellType.Blocked || cell === CellType.NoBuild) {
          g.lineStyle(1, COLOR_GRID_LINE, 0.3); // restore
        }
      }
    }

    for (const entry of this.grid.entries) {
      g.fillStyle(COLOR_ENTRY, 0.5);
      g.fillRect(gridLeftX(entry.col), entry.row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
    for (const exit of this.grid.exits) {
      g.fillStyle(COLOR_EXIT, 0.5);
      g.fillRect(gridLeftX(exit.col), exit.row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  drawPath(): void {
    const g = this.pathGraphics;
    g.clear();

    for (const path of this.allPaths) {
      if (!path || path.length < 2) continue;

      g.lineStyle(2, 0x666666, 0.4);
      g.beginPath();
      g.moveTo(gridX(path[0].col), gridY(path[0].row));
      for (let i = 1; i < path.length; i++) {
        g.lineTo(gridX(path[i].col), gridY(path[i].row));
      }
      g.strokePath();
    }
  }

  startWave(): void {
    if (!this.currentPath) return;

    this.betweenWaves = false;
    this.waveActive = true;
    const wave = this.waves[this.currentWave];
    this.currentWave++;
    this.eventBus.emit('waveStarted', this.currentWave);
    this.spawner.startWave(wave);

    // Log wave start with creep types
    const creepTypes = [...new Set(wave.groups.map(g => g.creepType))];
    this.eventLog.waveStarted(this.currentWave, this.waves.length, creepTypes);
    this.upcomingWaves.update(this.currentWave, this.waves);

    const baseHp = wave.groups[0]?.hpScale || 30;
    const baseSpeed = wave.groups[0]?.speedScale || 1;
    this.sendMgr.activateSends(baseHp, baseSpeed);
  }
}
