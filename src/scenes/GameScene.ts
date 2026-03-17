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
import { getTowerType, TOWER_ORDER, TOWER_TYPES, getAllFactionTowerIds } from '../data/TowerTypes';
import { FactionId, getFaction } from '../data/Factions';
import { MatchMode, WaveDefinition, getWavesForMode } from '../data/WaveDefinitions';
import { MapId, MAPS } from '../data/Maps';
import { DifficultyLevel, DIFFICULTIES, DifficultyHints } from '../data/Difficulty';
import { DraftModifier } from '../data/DraftModifiers';
import { IncomeManager } from '../systems/IncomeManager';
import { SendManager } from '../systems/SendManager';
import { FrontierManager } from '../systems/FrontierManager';
import { FrontierBuilding } from '../data/FrontierBuildings';
import { SEND_OPTIONS, SendCreepOption } from '../data/SendCreepTypes';

const SEND_OPTIONS_MAP: Record<string, SendCreepOption> = {};
for (const opt of SEND_OPTIONS) SEND_OPTIONS_MAP[opt.id] = opt;
import { TowerSelectBar } from '../ui/TowerSelectBar';
import { TowerInfoPanel } from '../ui/TowerInfoPanel';
import { SendPanel } from '../ui/SendPanel';
import { IncomeDisplay } from '../ui/IncomeDisplay';
import { FrontierPanel } from '../ui/FrontierPanel';
import { EventLog } from '../ui/EventLog';
import { CreepInfoPanel } from '../ui/CreepInfoPanel';
import { UpcomingWaves } from '../ui/UpcomingWaves';
import { StatsTracker } from '../systems/StatsTracker';
import { TowerManager } from '../systems/TowerManager';
import { CreepManager, StandardLeakHandler, StandardDeathHandler } from '../systems/CreepManager';
import { WaveController } from '../systems/WaveController';
import { VersusManager } from '../systems/multiplayer/VersusManager';
import { OpponentSimulation } from '../systems/multiplayer/OpponentSimulation';
import { OpponentMinimap } from '../ui/OpponentMinimap';
import { UpdateContext } from '../systems/traits/Trait';
import { GameOverData } from './GameOverScene';
import { Creep } from '../entities/Creep';
import { Tower } from '../entities/Tower';

type SelectionMode = 'build' | 'inspect' | 'inspect_creep' | 'link' | 'none';

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
  towerMgr!: TowerManager;
  creepMgr!: CreepManager;
  waveMgr!: WaveController;
  versus: VersusManager | null = null;
  opponentMinimap: OpponentMinimap | null = null;
  opponentSim: OpponentSimulation | null = null;
  viewingOpponent: boolean = false;
  selectedCreep: Creep | null = null;
  linkingConduit: Tower | null = null; // tower being linked in link mode

  // Game state — towers and creeps live in managers, these are accessors
  get towers(): Tower[] { return this.towerMgr?.towers ?? this._towers; }
  set towers(v: Tower[]) { if (this.towerMgr) this.towerMgr.towers = v; else this._towers = v; }
  private _towers: Tower[] = [];
  get creeps(): Creep[] { return this.creepMgr?.creeps ?? this._creeps; }
  set creeps(v: Creep[]) { if (this.creepMgr) this.creepMgr.creeps = v; else this._creeps = v; }
  private _creeps: Creep[] = [];
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
  // Wave state delegated to WaveController — getters for backward compat
  get currentWave(): number { return this.waveMgr?.currentWave ?? this._currentWave; }
  set currentWave(v: number) { if (this.waveMgr) this.waveMgr.currentWave = v; else this._currentWave = v; }
  private _currentWave: number = 0;
  get waveActive(): boolean { return this.waveMgr?.waveActive ?? this._waveActive; }
  set waveActive(v: boolean) { if (this.waveMgr) this.waveMgr.waveActive = v; else this._waveActive = v; }
  private _waveActive: boolean = false;
  get betweenWaves(): boolean { return this.waveMgr?.betweenWaves ?? this._betweenWaves; }
  set betweenWaves(v: boolean) { if (this.waveMgr) this.waveMgr.betweenWaves = v; else this._betweenWaves = v; }
  private _betweenWaves: boolean = true;
  paused: boolean = false;
  gameSpeed: number = 1.0;
  autoPlay: boolean = false;
  private static readonly SPEED_OPTIONS = [0, 0.5, 1.0, 1.5, 2.0, 3.0];
  private speedIndex: number = 2;

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
    this._towers = [];
    this._creeps = [];
    this.lives = STARTING_LIVES;
    this.currentWave = 0;
    this.waveActive = false;
    this.betweenWaves = true;
    this.paused = false;
    this.selectionMode = 'none';
    this.selectedBuildType = null;
    this.selectedTower = null;
    // totalTowersBuilt and totalCreepsKilled tracked by managers

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
    const versusRef = this.registry.get('versus') as VersusManager | null;
    const waveSeed = versusRef?.sharedSeed ?? 0;
    this.spawner = new SpawnManager(this, this.eventBus, this.difficultyHints, waveSeed);
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
    this.upcomingWaves = new UpcomingWaves(this, () => this.toggleAutoPlay());
    this.upcomingWaves.update(this.currentWave, this.waves);

    const sidebarTopOffset = UpcomingWaves.HEIGHT;
    this.sendPanel = new SendPanel(this, (opt: SendCreepOption) => {
      if (this.betweenWaves && this.economy.spend(opt.cost)) {
        if (this.versus && this.versus.isConnected()) {
          // Versus: sends go to opponent, not to self
          this.versus.send({ type: 'send_purchased', sendOptionId: opt.id });
          this.versus.sendsSent++;
          this.eventLog.gameMessage(`Sent ${opt.name} to opponent!`);
        } else {
          this.sendMgr.queueSend(opt);
        }
        this.incomeMgr.addSendBonus(opt.incomeReward);
        this.eventLog.sendQueued(opt.name, opt.cost);
        this.statsTracker.recordSendSpent(opt.cost);
        this.statsTracker.recordSendIncome(opt.incomeReward);
        this.statsTracker.recordGoldSpent(opt.cost);
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
          this.statsTracker.recordGoldSpent(building.cost);
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

    // Core managers
    this.towerMgr = new TowerManager(this, this.grid, this.economy, this.statsTracker, this.eventLog, this.eventBus, this.modifier);
    const leakHandler = new StandardLeakHandler(this.eventLog, this.statsTracker);
    const deathHandler = new StandardDeathHandler(this.economy, this.statsTracker, this.eventBus, this.modifier?.killGoldMult ?? 1);
    this.creepMgr = new CreepManager(leakHandler, deathHandler);

    // Wave controller
    this.waveMgr = new WaveController(this.waves, this.spawner, this.sendMgr, {
      canStartWave: () => !!this.currentPath,
      onWaveStart: (wave, waveNum, totalWaves) => {
        this.towerMgr.spawnBroodMotherSwarmlings();
        this.opponentSim?.startWave(wave);
        const creepTypes = [...new Set(wave.groups.map(g => g.creepType))];
        this.eventLog.waveStarted(waveNum, totalWaves, creepTypes);
        this.upcomingWaves.update(waveNum, this.waves);
        this.eventBus.emit('waveStarted', waveNum);
      },
      onWaveCleared: (waveNum) => {
        this.onWaveCleared(waveNum);
      },
    });
    this.eventLog.gameMessage('Game started. Press SPACE for wave 1. [A] to auto-play.');
    const h = this.difficultyHints;
    this.eventLog.gameMessage(`Difficulty: ${this.difficulty} (HP:${h.toughness}x Count:${h.count}x Spd:${h.speed}x Gold:${h.goldMult}x)`);

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
        if (this.versus) {
          // Versus: vote ready instead of instant start
          this.versus.voteReady();
          this.eventLog.gameMessage('Ready! Waiting for opponent...');
        } else {
          this.startWave();
        }
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
    this.inputMgr.onKey('A', () => this.toggleAutoPlay());
    this.inputMgr.onKey('TAB', () => this.cycleSpeed());
    this.inputMgr.onKey('ENTER', () => this.openChat());
    this.inputMgr.onKey('L', () => this.enterLinkMode());
    this.input.keyboard!.addCapture('TAB');

    // Versus mode setup
    this.versus = this.registry.get('versus') as VersusManager | null;
    if (this.versus) {
      // Rewire message handler from lobby to game scene
      this.versus.onGameMessage = (msg) => {
        switch (msg.type) {
          case 'wave_ready':
            this.eventLog.gameMessage('Opponent is ready!');
            break;
          case 'game_over':
            this.eventLog.gameMessage('Opponent defeated! You win!');
            break;
          case 'tower_pool':
            if (this.faction === 'random') {
              this.activeTowerIds = msg.towerIds;
              this.towerBar.setTowerIds(this.activeTowerIds);
              this.enterNoneMode();
              this.eventLog.gameMessage('Tower pool updated!');
            }
            break;
          case 'speed_change':
            this.gameSpeed = msg.speed;
            this.speedIndex = GameScene.SPEED_OPTIONS.indexOf(msg.speed);
            if (this.speedIndex === -1) this.speedIndex = 2;
            this.eventLog.gameMessage(`Host set speed: ${msg.speed}x`);
            break;
          case 'tower_placed':
          case 'tower_sold':
          case 'tower_upgraded':
            // Rebuild opponent simulation grid when their towers change
            this.opponentSim?.rebuildGrid();
            break;
          case 'chat':
            this.eventLog.gameMessage(`[OPP] ${msg.text}`);
            break;
        }
      };

      // Random faction in versus: host rolls towers for joiner too
      if (this.faction === 'random' && this.versus.isHost) {
        // Send the initial pool to joiner (if they're also random,
        // they'll use this; if not, they'll ignore it)
        this.versus.send({ type: 'tower_pool', towerIds: this.activeTowerIds });
      }
      this.opponentMinimap = new OpponentMinimap(this, this.versus, () => {
        this.viewingOpponent = !this.viewingOpponent;
        if (this.viewingOpponent) {
          this.eventLog.gameMessage('Viewing opponent board');
          // Hide own towers
          for (const tower of this.towers) {
            tower.graphics.setVisible(false);
          }
        } else {
          this.eventLog.gameMessage('Viewing your board');
          // Show own towers
          for (const tower of this.towers) {
            tower.graphics.setVisible(true);
            tower.drawTower();
          }
          this.opponentOverlay?.clear();
        }
        this.drawGrid();
        this.drawOpponentView();
      });
      // Create opponent simulation
      const mapDef = MAPS[this.mapId];
      this.opponentSim = new OpponentSimulation(this.versus, mapDef, this.difficultyHints);

      this.eventLog.gameMessage('VERSUS MODE — sends go to opponent!');
      // Start initial 60s countdown for first wave
      this.versus.waveTimer = 60000;
      this.versus.waveTimerActive = true;
      // Sync initial speed from host
      if (this.versus.isHost) {
        this.versus.send({ type: 'speed_change', speed: this.gameSpeed });
      }
    }

        const versusTimer = this.versus?.waveTimerActive ? this.versus.getWaveTimerSeconds() : -1;
    this.ui.update(this.economy.gold, this.lives, this.currentWave, this.waves.length, this.waveActive, this.betweenWaves, this.gameSpeed, versusTimer);
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
    this.linkingConduit = null;
    this.towerBar.deselect();
    this.towerInfo.hide();
    this.creepInfo.hide();
    this.hoverGraphics.clear();
    this.rangeGraphics.clear();
  }

  private handleLinkClick(target: Tower): void {
    if (!this.linkingConduit) return;
    const conduitTrait = this.linkingConduit.traits.find(t => t.id === 'conduit_link');
    if (!conduitTrait) return;

    const auraTraitIds = ['damage_aura', 'rate_aura', 'range_aura', 'crit_aura'];
    const targetAura = target.traits.find(t => auraTraitIds.includes(t.id));

    if (!targetAura) {
      this.eventLog.gameMessage('Not an aura tower. Click an Amplifier, Quickener, Reach, or Critical Mass.');
      return;
    }

    // Check range
    const dx = target.x - this.linkingConduit.x;
    const dy = target.y - this.linkingConduit.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const linkRange = (conduitTrait.linkRange ?? 6) * TILE_SIZE;
    if (dist > linkRange) {
      this.eventLog.gameMessage('Too far! Move the Conduit closer.');
      return;
    }

    // Init manual links array
    if (!conduitTrait._manualLinks) conduitTrait._manualLinks = [];
    const links = conduitTrait._manualLinks as { col: number; row: number }[];
    const maxLinks = conduitTrait.maxLinks ?? 2;

    // Check if already linked — toggle off
    const existingIdx = links.findIndex(l => l.col === target.col && l.row === target.row);
    if (existingIdx !== -1) {
      links.splice(existingIdx, 1);
      this.eventLog.gameMessage(`Unlinked ${target.typeDef.name}.`);
      return;
    }

    // Check if already have a tower of this aura type linked
    for (const link of links) {
      const linkedTower = this.towers.find(t => t.col === link.col && t.row === link.row);
      if (linkedTower) {
        const linkedAura = linkedTower.traits.find(t => auraTraitIds.includes(t.id));
        if (linkedAura && linkedAura.id === targetAura.id) {
          this.eventLog.gameMessage(`Already linked a ${targetAura.id.replace('_', ' ')}. Link a different aura type.`);
          return;
        }
      }
    }

    if (links.length >= maxLinks) {
      this.eventLog.gameMessage(`Max ${maxLinks} links. Unlink one first (click linked tower).`);
      return;
    }

    links.push({ col: target.col, row: target.row });
    this.eventLog.gameMessage(`Linked ${target.typeDef.name}! (${links.length}/${maxLinks})`);
  }

  private enterLinkMode(): void {
    // Only works when inspecting a Conduit tower
    if (this.selectionMode !== 'inspect' || !this.selectedTower) return;
    const conduitTrait = this.selectedTower.traits.find(t => t.id === 'conduit_link');
    if (!conduitTrait) {
      this.eventLog.gameMessage('Select a Conduit tower first.');
      return;
    }
    this.selectionMode = 'link';
    this.linkingConduit = this.selectedTower;
    this.eventLog.gameMessage('LINK MODE: Click aura towers to link/unlink. ESC to cancel.');
  }

  // === Input Handlers ===

  handleHover(col: number, row: number): void {
    this.hoverGraphics.clear();
    this.rangeGraphics.clear();

    if (this.selectionMode !== 'build' || !this.selectedBuildType) return;

    if (this.grid.canPlaceTower(col, row)) {
      const towerType = getTowerType(this.selectedBuildType);
      const cost = this.towerMgr.getEffectiveCost(towerType.cost);
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
              this.versus?.send({ type: 'tower_upgraded', col: existingTower.col, row: existingTower.row, level: existingTower.level });
            }
          } else {
            this.enterInspectMode(existingTower);
          }
        } else {
          this.enterNoneMode();
        }
        break;

      case 'link':
        if (existingTower && this.linkingConduit) {
          this.handleLinkClick(existingTower);
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
    return this.creepMgr.findCreepNear(px, py, TILE_SIZE);
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
    const result = this.towerMgr.sellTower(col, row);
    if (!result) return;

    if (this.selectedTower === result.tower) this.enterNoneMode();
    this.versus?.send({ type: 'tower_sold', col, row });

    if (!result.tower.isMobile) {
      this.recalculatePaths();
      this.drawPath();
    }
  }

  private tryBuildTower(col: number, row: number): void {
    if (!this.selectedBuildType) return;
    const towerType = getTowerType(this.selectedBuildType);

    const result = this.towerMgr.placeTower(col, row, towerType, this.allPaths, () => {
      this.recalculatePaths();
      return this.allPaths;
    });

    if (!result) return;

    this.versus?.send({ type: 'tower_placed', towerId: towerType.id, col, row });

    if (result.pathsChanged) {
      // Update existing creep paths
      for (const creep of this.creepMgr.creeps) {
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

    // Apply game speed
    delta *= this.gameSpeed;
    if (delta === 0) return; // speed 0 = paused

    // Tower updates: aura resets, trait updates, gold/damage collection, fire
    this.towerMgr.updateTowers(time, delta, this.creepMgr.creeps);

    // Creep updates: movement, leak handling, kill processing, cleanup
    const leakResult = this.creepMgr.update(delta);
    this.lives -= leakResult.totalLeakDamage;

    // Clean up expired towers
    this.towerMgr.cleanupExpired();

    // Spawning + wave clear detection
    this.waveMgr.updateSpawning(delta, this.allPaths, this.currentPath, this.creeps);
    this.waveMgr.checkWaveComplete(this.creeps.length);

    if (this.lives <= 0) {
      this.lives = 0;
      this.eventBus.emit('gameOver');
      if (this.versus) {
        this.versus.notifyGameOver(false, this.statsTracker.stats, this.currentWave, 0);
      }
      this.goToGameOver(false);
      return;
    }

    // Check if opponent lost in versus
    if (this.versus?.opponentGameOver) {
      this.versus.notifyGameOver(true, this.statsTracker.stats, this.currentWave, this.lives);
      this.goToGameOver(true);
      return;
    }

    if (this.waveMgr.isComplete() && this.creeps.length === 0) {
      this.eventBus.emit('gameWon');
      if (this.versus) {
        this.versus.notifyGameOver(true, this.statsTracker.stats, this.currentWave, this.lives);
      }
      this.goToGameOver(true);
      return;
    }

        const versusTimer = this.versus?.waveTimerActive ? this.versus.getWaveTimerSeconds() : -1;
    this.ui.update(this.economy.gold, this.lives, this.currentWave, this.waves.length, this.waveActive, this.betweenWaves, this.gameSpeed, versusTimer);
    this.incomeDisplay.update(this.incomeMgr.getBreakdown());
    this.creepInfo.updateTracked();
    this.statsTracker.updateTime(delta);

    // Versus: wave timer, minimap, incoming sends, ping, disconnect, chat
    if (this.versus) {
      if (this.versus.waveTimerActive) {
        if (this.versus.updateWaveTimer(delta)) {
          this.startWave();
        }
      }

      // Update opponent simulation
      this.opponentSim?.update(delta);

      const myTowerData = this.towers.map(t => ({ col: t.col, row: t.row, color: t.color }));
      this.opponentMinimap?.update(myTowerData);
      if (this.viewingOpponent) {
        this.drawOpponentView();
      }

      // Incoming sends
      const incoming = this.versus.drainIncomingSends();
      for (const sendId of incoming) {
        const opt = SEND_OPTIONS_MAP[sendId];
        if (opt) {
          this.sendMgr.queueSend(opt);
          this.eventLog.gameMessage(`Incoming send: ${opt.name}!`);
        }
      }

      // Incoming chat
      const chats = this.versus.drainIncomingChats();
      for (const text of chats) {
        this.eventLog.gameMessage(`[OPP] ${text}`);
      }

      // Ping
      this.versus.updatePing(delta);

      // Disconnect detection
      if (this.versus.opponentDisconnected) {
        this.eventLog.gameMessage('Opponent disconnected!');
        this.ui.setStatus('OPPONENT DISCONNECTED — P to continue solo');
        this.versus = null; // detach, continue as single player
      }

      // Broadcast lives
      this.versus?.send({ type: 'lives_update', lives: this.lives });
    }

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
      towersBuilt: this.towerMgr.totalTowersBuilt,
      creepsKilled: this.creepMgr.totalCreepsKilled,
      matchMode: this.matchMode,
      faction: this.faction,
      stats: this.statsTracker.stats,
      // Versus data
      isVersus: !!this.versus,
      sendsSent: this.versus?.sendsSent ?? 0,
      sendsReceived: this.versus?.sendsReceived ?? 0,
      opponentStats: this.versus?.opponentEndStats ?? null,
      opponentLives: this.versus?.opponentLives ?? 0,
      lives: this.lives,
    };
    this.versus?.close();
    this.registry.remove('versus');
    this.scene.start('GameOverScene', data);
  }

  // Pause menu
  private pauseOverlay: Phaser.GameObjects.Container | null = null;

  private cycleSpeed(): void {
    // In versus, only host can change speed
    if (this.versus && !this.versus.isHost) {
      this.eventLog.gameMessage('Only the host can change game speed.');
      return;
    }
    this.speedIndex = (this.speedIndex + 1) % GameScene.SPEED_OPTIONS.length;
    this.gameSpeed = GameScene.SPEED_OPTIONS[this.speedIndex];
    this.eventLog.gameMessage(`Speed: ${this.gameSpeed}x`);
    if (this.versus) {
      this.versus.send({ type: 'speed_change', speed: this.gameSpeed });
    }
  }

  /** Send a chat message (Enter key opens prompt) */
  private openChat(): void {
    if (!this.versus) return;
    const text = prompt('Chat:');
    if (text && text.trim()) {
      this.versus.sendChat(text.trim());
      this.eventLog.gameMessage(`[YOU] ${text.trim()}`);
    }
  }

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

  /** Overlay opponent's towers on the main grid when viewing their board */
  private opponentOverlay: Phaser.GameObjects.Graphics | null = null;

  private opponentLabel: Phaser.GameObjects.Text | null = null;

  drawOpponentView(): void {
    if (!this.opponentOverlay) {
      this.opponentOverlay = this.add.graphics().setDepth(22);
    }
    this.opponentOverlay.clear();

    if (!this.viewingOpponent || !this.versus) {
      if (this.opponentLabel) this.opponentLabel.setVisible(false);
      return;
    }

    // Dim the grid background
    this.opponentOverlay.fillStyle(0x000000, 0.3);
    this.opponentOverlay.fillRect(GRID_OFFSET_X, 0, GAME_WIDTH, GAME_HEIGHT);

    // Draw opponent towers as colored squares on the main grid
    for (const t of this.versus.opponentTowers) {
      const towerDef = TOWER_TYPES[t.towerId];
      const color = towerDef?.color ?? 0xffffff;
      const s = TILE_SIZE * 0.4;
      const x = gridLeftX(t.col) + TILE_SIZE / 2;
      const y = t.row * TILE_SIZE + TILE_SIZE / 2;
      this.opponentOverlay.fillStyle(color, 0.9);
      this.opponentOverlay.fillRect(x - s, y - s, s * 2, s * 2);
      this.opponentOverlay.lineStyle(2, 0xffffff, 0.5);
      this.opponentOverlay.strokeRect(x - s, y - s, s * 2, s * 2);
    }

    // "VIEWING OPPONENT" banner
    this.opponentOverlay.fillStyle(0xff2222, 0.8);
    this.opponentOverlay.fillRect(GRID_OFFSET_X, 0, 220, 22);

    // Draw simulated opponent creeps
    if (this.opponentSim) {
      for (const creep of this.opponentSim.creeps) {
        if (!creep.alive || creep.reached) continue;
        const baseSize = creep.isBoss ? TILE_SIZE * 0.4 : TILE_SIZE * 0.25;
        const drawSize = baseSize * creep.size;
        this.opponentOverlay.fillStyle(creep.color, 0.8);
        this.opponentOverlay.fillCircle(creep.x, creep.y, drawSize);
        // HP bar
        const barW = TILE_SIZE * 0.6;
        const barH = 2;
        const hpRatio = creep.hp / creep.maxHp;
        this.opponentOverlay.fillStyle(0x333333, 1);
        this.opponentOverlay.fillRect(creep.x - barW / 2, creep.y - drawSize - 4, barW, barH);
        this.opponentOverlay.fillStyle(hpRatio > 0.5 ? 0x44ff44 : 0xff4444, 1);
        this.opponentOverlay.fillRect(creep.x - barW / 2, creep.y - drawSize - 4, barW * hpRatio, barH);
      }
    }

    if (!this.opponentLabel) {
      this.opponentLabel = this.add.text(GRID_OFFSET_X + 8, 3, 'VIEWING OPPONENT', {
        fontSize: '13px', color: '#ffffff', fontFamily: 'monospace',
      }).setDepth(23);
    }
    this.opponentLabel.setVisible(true);
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

  toggleAutoPlay(): void {
    this.autoPlay = !this.autoPlay;
    this.upcomingWaves.setAutoPlay(this.autoPlay);
    this.eventLog.gameMessage(this.autoPlay ? 'Auto-play ON' : 'Auto-play OFF');
    if (this.autoPlay && this.betweenWaves && this.currentWave < this.waves.length) {
      this.time.delayedCall(1500, () => {
        if (this.autoPlay && this.betweenWaves && this.currentWave < this.waves.length) {
          this.startWave();
        }
      });
    }
  }

  startWave(): void {
    this.waveMgr.startWave(this.allPaths);
  }

  /** Called by WaveController when a wave clears */
  private onWaveCleared(waveNum: number): void {
    // Auto-play: schedule next wave automatically
    if (this.autoPlay && this.currentWave < this.waves.length && !this.versus) {
      this.time.delayedCall(1500, () => {
        if (this.autoPlay && this.betweenWaves && this.currentWave < this.waves.length) {
          this.startWave();
        }
      });
    }

    // Tower wave-end processing
    const livesGained = this.towerMgr.onWaveEnd();
    this.lives += livesGained;

    // Versus: notify
    if (this.versus) {
      this.versus.notifyWaveCleared(waveNum);
    }

    // Frontier
    const frontierBonus = this.frontierMgr.onWaveEnd(waveNum);
    if (frontierBonus > 0) {
      this.economy.addGold(frontierBonus);
      this.statsTracker.recordFrontierEarned(frontierBonus);
      this.statsTracker.recordGoldEarned(frontierBonus);
    }
    this.frontierPanel.updateOwned();

    // Income
    const income = this.incomeMgr.collectWaveIncome();
    this.economy.addGold(income);
    this.statsTracker.recordGoldEarned(income);

    // Events + UI
    this.eventBus.emit('waveCleared', waveNum);
    this.eventLog.waveCleared(waveNum, income + (frontierBonus > 0 ? frontierBonus : 0));
    this.statsTracker.recordWaveCompleted();
    this.upcomingWaves.update(waveNum, this.waves);
    if (frontierBonus > 0) {
      this.eventLog.frontierIncome('Frontier bonus', frontierBonus);
    }

    // Random faction rotation
    if (this.faction === 'random') {
      this.activeTowerIds = this.rollRandomTowers();
      this.towerBar.setTowerIds(this.activeTowerIds);
      this.frontierMgr.rotateRandomFrontier();
      this.frontierPanel.rebuildPurchaseList();
      this.eventLog.gameMessage('Tower + frontier pool rotated!');
      this.enterNoneMode();
      if (this.versus?.isHost) {
        this.versus.send({ type: 'tower_pool', towerIds: this.activeTowerIds });
      }
    }
  }
}
