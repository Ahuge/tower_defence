import Phaser from 'phaser';
import {
  TILE_SIZE, GRID_COLS, GRID_ROWS, GAME_WIDTH, GAME_HEIGHT,
  COLOR_GROUND, COLOR_GRID_LINE, COLOR_ENTRY, COLOR_EXIT,
  COLOR_HOVER_VALID, COLOR_HOVER_INVALID, STARTING_LIVES,
} from '../config';
import { Grid, CellType } from '../systems/Grid';
import { findPath, PathPoint } from '../systems/Pathfinding';
import { EventBus } from '../systems/EventBus';
import { EconomyManager } from '../systems/EconomyManager';
import { SpawnManager } from '../systems/SpawnManager';
import { InputManager } from '../systems/InputManager';
import { UIOverlay } from '../systems/UIOverlay';
import { getTowerType, TOWER_ORDER } from '../data/TowerTypes';
import { FactionId, getFaction } from '../data/Factions';
import { MatchMode, WaveDefinition, getWavesForMode } from '../data/WaveDefinitions';
import { MapId, MAPS } from '../data/Maps';
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
import { FighterManager } from '../systems/FighterManager';
import { FighterType } from '../data/FighterTypes';
import { GameOverData } from './GameOverScene';
import { Creep } from '../entities/Creep';
import { Tower } from '../entities/Tower';

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

  // Game state
  towers: Tower[] = [];
  creeps: Creep[] = [];
  currentPath: PathPoint[] | null = null;
  allPaths: (PathPoint[] | null)[] = []; // one path per entry
  waves!: WaveDefinition[];
  matchMode: MatchMode = 'standard';
  mapId: MapId = 'plains';
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

  // Graphics layers
  gridGraphics!: Phaser.GameObjects.Graphics;
  pathGraphics!: Phaser.GameObjects.Graphics;
  hoverGraphics!: Phaser.GameObjects.Graphics;
  rangeGraphics!: Phaser.GameObjects.Graphics;

  // Current tower type for placement
  selectedTowerType: string = 'arrow';
  selectedTower: Tower | null = null;

  constructor() {
    super('GameScene');
  }

  init(data: { mode?: MatchMode; faction?: FactionId | null; map?: MapId; modifier?: DraftModifier | null }): void {
    this.matchMode = data.mode || 'standard';
    this.faction = data.faction ?? null;
    this.mapId = data.map || 'plains';
    this.modifier = data.modifier ?? null;
    if (this.faction) {
      const f = getFaction(this.faction);
      this.activeTowerIds = f.towerIds;
    } else {
      this.activeTowerIds = TOWER_ORDER;
    }
  }

  create(): void {
    // Reset state
    this.towers = [];
    this.creeps = [];
    this.lives = STARTING_LIVES;
    this.currentWave = 0;
    this.waveActive = false;
    this.betweenWaves = true;
    this.paused = false;
    this.selectedTower = null;
    this.selectedTowerType = this.activeTowerIds[0];
    this.totalTowersBuilt = 0;
    this.totalCreepsKilled = 0;

    // Apply modifier effects
    this.applyModifier();

    this.eventBus = new EventBus();
    const mapDef = MAPS[this.mapId];
    this.grid = new Grid(mapDef);
    this.waves = getWavesForMode(this.matchMode);
    this.recalculatePaths();

    // Systems
    this.economy = new EconomyManager(this.eventBus);
    this.spawner = new SpawnManager(this, this.eventBus);
    this.inputMgr = new InputManager(this, this.eventBus);
    this.ui = new UIOverlay(this, this.eventBus);

    // Apply modifier: extra gold
    if (this.modifier?.effect === 'extra_gold') {
      this.economy.addGold(50);
    }

    // UI panels
    this.towerBar = new TowerSelectBar(this, this.activeTowerIds, (typeId) => {
      this.selectedTowerType = typeId;
      this.deselectTower();
    });
    this.towerInfo = new TowerInfoPanel(this);

    // Economy systems
    this.incomeMgr = new IncomeManager(this.eventBus);
    if (this.modifier?.effect === 'extra_income') {
      this.incomeMgr.baseIncome += 5;
    }
    this.sendMgr = new SendManager(this, this.eventBus);
    this.sendPanel = new SendPanel(this, (opt: SendCreepOption) => {
      if (this.betweenWaves && this.economy.spend(opt.cost)) {
        this.sendMgr.queueSend(opt);
        this.incomeMgr.addSendBonus(opt.incomeReward);
      }
    });
    this.incomeDisplay = new IncomeDisplay(this);

    // Frontier
    this.frontierMgr = new FrontierManager(this.eventBus, this.incomeMgr, this.faction);
    this.frontierPanel = new FrontierPanel(this, this.frontierMgr, (building: FrontierBuilding) => {
      if (this.economy.spend(building.cost)) {
        this.frontierMgr.purchaseBuilding(building);
        this.frontierPanel.updateOwned();
      }
    });

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

    this.drawGrid();
    this.drawPath();

    // Wire input
    this.inputMgr.onHover((col, row) => this.drawHover(col, row));
    this.inputMgr.onClick((col, row) => this.handleClick(col, row));
    this.inputMgr.onRightClick((col, row) => this.handleRightClick(col, row));
    this.inputMgr.onSpace(() => {
      if (this.betweenWaves && this.currentWave < this.waves.length) {
        this.startWave();
      }
    });

    // Tower selection hotkeys
    const numKeys = ['ONE', 'TWO', 'THREE', 'FOUR'];
    for (let i = 0; i < numKeys.length; i++) {
      const idx = i;
      this.inputMgr.onKey(numKeys[i], () => {
        this.towerBar.selectByIndex(idx);
      });
    }

    // Escape to deselect
    this.inputMgr.onKey('ESC', () => this.deselectTower());

    // Pause
    this.inputMgr.onKey('P', () => this.togglePause());

    this.ui.update(this.economy.gold, this.lives, this.currentWave, this.waves.length, this.waveActive, this.betweenWaves);
  }

  private applyModifier(): void {
    if (!this.modifier) return;
    switch (this.modifier.effect) {
      case 'extra_lives':
        this.lives += 10;
        break;
      case 'glass_cannon':
        this.lives = 5;
        break;
    }
  }

  update(time: number, delta: number): void {
    if (this.paused) return;

    // Update adjacency buffs (nature_blossom)
    this.updateAdjacencyBuffs();

    // Collect siphon gold
    for (const tower of this.towers) {
      if (tower.ability === 'gold_on_hit' && tower.goldEarned > 0) {
        this.economy.addGold(tower.goldEarned);
        tower.goldEarned = 0;
      }
    }

    // Update towers
    for (const tower of this.towers) {
      tower.update(time, delta, this.creeps);
    }

    // Update creeps (pass nearby creeps for heal aura)
    for (const creep of this.creeps) {
      creep.update(delta, this.creeps);
    }

    // Update fighters
    if (this.fighterMgr) {
      this.fighterMgr.update(time, delta, this.creeps);
    }

    // Check for creeps that reached the exit
    for (const creep of this.creeps) {
      if (creep.reached) {
        this.lives--;
        this.eventBus.emit('livesChanged', this.lives);
        this.eventBus.emit('creepReached', 0);
        creep.reached = false;
        creep.alive = false;
      }
    }

    // Award kill gold
    for (const creep of this.creeps) {
      if (!creep.alive && !creep.reached && creep.hp <= 0) {
        let killGold = this.economy.getKillGold();
        if (this.modifier?.effect === 'strong_creeps') {
          killGold = Math.round(killGold * 1.5);
        }
        this.eventBus.emit('creepKilled', 0, killGold);
        this.totalCreepsKilled++;
        creep.hp = -999;
      }
    }

    // Clean up dead creeps
    this.creeps = this.creeps.filter(c => c.alive);

    // Spawning
    this.spawner.update(delta, this.currentPath, this.creeps);

    // Send creep spawning
    this.sendMgr.update(delta, this.currentPath, this.creeps);

    // Check wave complete
    if (this.waveActive && !this.spawner.isSpawning() && !this.sendMgr.isSpawning() && this.creeps.length === 0) {
      this.waveActive = false;
      this.betweenWaves = true;
      // Frontier wave processing
      const frontierGold = this.frontierMgr.onWaveEnd(this.currentWave);
      this.economy.addGold(frontierGold);
      this.frontierPanel.updateOwned();

      // Award wave income
      const income = this.incomeMgr.collectWaveIncome();
      this.economy.addGold(income);
      this.eventBus.emit('waveCleared', this.currentWave);
    }

    // Game over
    if (this.lives <= 0) {
      this.lives = 0;
      this.eventBus.emit('gameOver');
      this.goToGameOver(false);
      return;
    }

    // Win
    if (this.currentWave >= this.waves.length && this.creeps.length === 0 && !this.waveActive) {
      this.eventBus.emit('gameWon');
      this.goToGameOver(true);
      return;
    }

    this.ui.update(this.economy.gold, this.lives, this.currentWave, this.waves.length, this.waveActive, this.betweenWaves);
    this.incomeDisplay.update(this.incomeMgr.getBreakdown());
  }

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
    };
    this.scene.start('GameOverScene', data);
  }

  private togglePause(): void {
    this.paused = !this.paused;
    if (this.paused) {
      this.ui.setStatus('PAUSED - Press P to resume');
    }
  }

  recalculatePaths(): void {
    // Calculate paths from all entries to all exits
    this.allPaths = [];
    for (const entry of this.grid.entries) {
      for (const exit of this.grid.exits) {
        this.allPaths.push(findPath(this.grid, entry, exit));
      }
    }
    // Use the first valid path as primary
    this.currentPath = this.allPaths.find(p => p !== null) ?? null;
  }

  drawGrid(): void {
    const g = this.gridGraphics;
    g.clear();

    g.fillStyle(COLOR_GROUND, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    g.lineStyle(1, COLOR_GRID_LINE, 0.3);
    for (let col = 0; col <= GRID_COLS; col++) {
      g.lineBetween(col * TILE_SIZE, 0, col * TILE_SIZE, GAME_HEIGHT);
    }
    for (let row = 0; row <= GRID_ROWS; row++) {
      g.lineBetween(0, row * TILE_SIZE, GAME_WIDTH, row * TILE_SIZE);
    }

    // Draw blocked terrain
    g.fillStyle(0x1a1a1a, 1);
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (this.grid.cells[row][col] === CellType.Blocked) {
          g.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          g.lineStyle(1, 0x333333, 0.5);
          g.strokeRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          g.lineStyle(1, COLOR_GRID_LINE, 0.3); // restore
        }
      }
    }

    // All entries and exits
    for (const entry of this.grid.entries) {
      g.fillStyle(COLOR_ENTRY, 0.5);
      g.fillRect(entry.col * TILE_SIZE, entry.row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
    for (const exit of this.grid.exits) {
      g.fillStyle(COLOR_EXIT, 0.5);
      g.fillRect(exit.col * TILE_SIZE, exit.row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  drawPath(): void {
    const g = this.pathGraphics;
    g.clear();

    // Draw all paths
    for (const path of this.allPaths) {
      if (!path || path.length < 2) continue;

      g.lineStyle(2, 0x666666, 0.4);
      g.beginPath();
      g.moveTo(
        path[0].col * TILE_SIZE + TILE_SIZE / 2,
        path[0].row * TILE_SIZE + TILE_SIZE / 2
      );
      for (let i = 1; i < path.length; i++) {
        g.lineTo(
          path[i].col * TILE_SIZE + TILE_SIZE / 2,
          path[i].row * TILE_SIZE + TILE_SIZE / 2
        );
      }
      g.strokePath();
    }
  }

  drawHover(col: number, row: number): void {
    this.hoverGraphics.clear();
    this.rangeGraphics.clear();

    if (this.grid.canPlaceTower(col, row)) {
      const towerType = getTowerType(this.selectedTowerType);
      let cost = towerType.cost;
      if (this.modifier?.effect === 'cheap_towers') {
        cost = Math.round(cost * 0.8);
      }
      const canPlace = this.economy.canAfford(cost);
      const color = canPlace ? COLOR_HOVER_VALID : COLOR_HOVER_INVALID;

      this.hoverGraphics.fillStyle(color, 0.2);
      this.hoverGraphics.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      this.hoverGraphics.lineStyle(1, color, 0.6);
      this.hoverGraphics.strokeRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);

      if (canPlace) {
        const cx = col * TILE_SIZE + TILE_SIZE / 2;
        const cy = row * TILE_SIZE + TILE_SIZE / 2;
        let range = towerType.range;
        if (this.modifier?.effect === 'long_range') range += 1;
        this.rangeGraphics.lineStyle(1, color, 0.2);
        this.rangeGraphics.strokeCircle(cx, cy, range * TILE_SIZE);
      }
    }
  }

  handleClick(col: number, row: number): void {
    // Check if clicking an existing tower (select/upgrade)
    const existingTower = this.towers.find(t => t.col === col && t.row === row);
    if (existingTower) {
      if (this.selectedTower === existingTower && existingTower.canUpgrade()) {
        const cost = existingTower.getUpgradeCost();
        if (this.economy.spend(cost)) {
          existingTower.upgrade();
          this.applyTowerModifiers(existingTower);
          this.towerInfo.show(existingTower);
        }
      } else {
        this.selectTower(existingTower);
      }
      return;
    }

    this.deselectTower();

    const towerType = getTowerType(this.selectedTowerType);
    let cost = towerType.cost;
    if (this.modifier?.effect === 'cheap_towers') {
      cost = Math.round(cost * 0.8);
    }

    if (!this.grid.canPlaceTower(col, row)) return;
    if (!this.economy.canAfford(cost)) return;

    this.grid.placeTower(col, row);

    // Check all paths remain valid
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
    this.applyTowerModifiers(tower);
    this.towers.push(tower);
    this.totalTowersBuilt++;
    this.eventBus.emit('towerPlaced', col, row, towerType.id);
    this.eventBus.emit('pathUpdated', this.currentPath);

    // Update existing creep paths
    for (const creep of this.creeps) {
      if (!creep.alive || creep.reached) continue;
      const creepPos = {
        col: Math.round((creep.x - TILE_SIZE / 2) / TILE_SIZE),
        row: Math.round((creep.y - TILE_SIZE / 2) / TILE_SIZE),
      };
      // Find path from creep to nearest exit
      let bestPath: PathPoint[] | null = null;
      for (const exit of this.grid.exits) {
        const p = findPath(this.grid, creepPos, exit);
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

  private applyTowerModifiers(tower: Tower): void {
    if (this.modifier?.effect === 'fast_towers') {
      tower.fireRate = Math.round(tower.fireRate * 0.85);
    }
    if (this.modifier?.effect === 'long_range') {
      tower.range = (tower.typeDef.range + 1) * TILE_SIZE;
    }
    if (this.modifier?.effect === 'glass_cannon') {
      tower.damage = Math.round(tower.damage * 1.5);
    }
  }

  handleRightClick(col: number, row: number): void {
    if (this.grid.cells[row]?.[col] !== CellType.Tower) return;

    const idx = this.towers.findIndex(t => t.col === col && t.row === row);
    if (idx !== -1) {
      const tower = this.towers[idx];
      this.economy.addGold(tower.getSellValue());
      if (this.selectedTower === tower) this.deselectTower();
      tower.destroy();
      this.towers.splice(idx, 1);
    }

    this.grid.removeTower(col, row);
    this.eventBus.emit('towerSold', col, row);
    this.recalculatePaths();
    this.drawPath();
  }

  selectTower(tower: Tower): void {
    this.selectedTower = tower;
    this.towerInfo.show(tower);
  }

  deselectTower(): void {
    this.selectedTower = null;
    this.towerInfo.hide();
  }

  updateAdjacencyBuffs(): void {
    for (const tower of this.towers) {
      tower.adjacencyDamageBonus = 0;
      tower.adjacencyRateBonus = 0;
    }

    for (const blossom of this.towers) {
      if (blossom.ability !== 'adjacency_buff') continue;
      for (const other of this.towers) {
        if (other === blossom) continue;
        const dc = Math.abs(other.col - blossom.col);
        const dr = Math.abs(other.row - blossom.row);
        if (dc <= 1 && dr <= 1) {
          other.adjacencyDamageBonus += Math.round(other.damage * 0.15 * blossom.level);
          other.adjacencyRateBonus += 50 * blossom.level;
        }
      }
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

    // Activate queued sends
    const baseHp = wave.groups[0]?.hpScale || 30;
    const baseSpeed = wave.groups[0]?.speedScale || 1;
    this.sendMgr.activateSends(baseHp, baseSpeed);
  }
}
