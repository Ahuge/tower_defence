import Phaser from 'phaser';
import {
  TILE_SIZE, GRID_COLS, GRID_ROWS, GAME_WIDTH, GAME_HEIGHT,
  SIDEBAR_WIDTH, getGridOffsetX, getCanvasWidth, getGameWidth, getGridCols,
  COLOR_GROUND, COLOR_GRID_LINE, COLOR_ENTRY, COLOR_EXIT,
  COLOR_HOVER_VALID, COLOR_HOVER_INVALID, STARTING_LIVES,
  gridX, gridY, gridLeftX, pixelToCol, setGridOffsetY,
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
import { MapId, MAPS, MapDefinition } from '../data/Maps';
import { generateRandomMap, getDailySeed } from '../data/MapGenerator';
import { DifficultyLevel, DIFFICULTIES, DifficultyHints } from '../data/Difficulty';
import { DraftModifier } from '../data/DraftModifiers';
import { IncomeManager } from '../systems/IncomeManager';
import { SendManager } from '../systems/SendManager';
import { GameMode, GameModeContext } from '../systems/GameMode';
import { StandardMode } from '../systems/modes/StandardMode';
import { BattleMode } from '../systems/modes/BattleMode';
import { HeroDefenseMode } from '../systems/modes/HeroDefenseMode';
import { HeroLeakHandler } from '../systems/HeroLeakHandler';
import { ArenaManager } from '../systems/ArenaManager';
import { AbilitySystem } from '../systems/AbilitySystem';
import { getLayout, LayoutConfig } from '../systems/LayoutConfig';
import { HeroId, HERO_TYPES } from '../data/HeroTypes';

// Send options map moved to StandardMode
import { TowerSelectBar } from '../ui/TowerSelectBar';
import { TowerInfoPanel } from '../ui/TowerInfoPanel';
import { IncomeDisplay } from '../ui/IncomeDisplay';
import { EventLog } from '../ui/EventLog';
import { CreepInfoPanel } from '../ui/CreepInfoPanel';
import { UpcomingWaves } from '../ui/UpcomingWaves';
import { StatsTracker } from '../systems/StatsTracker';
import { TowerManager } from '../systems/TowerManager';
import { CreepManager, StandardLeakHandler, StandardDeathHandler } from '../systems/CreepManager';
import { WaveController } from '../systems/WaveController';
import { VersusManager } from '../systems/multiplayer/VersusManager';
import { CircleManager } from '../systems/multiplayer/CircleManager';
import { OpponentSimulation } from '../systems/multiplayer/OpponentSimulation';
import { OpponentMinimap } from '../ui/OpponentMinimap';
import { CirclePlayerRoster } from '../ui/CircleMinimaps';
import { CircleLeakHandler } from '../systems/CircleLeakHandler';
import { SidebarOverlay } from '../ui/SidebarOverlay';
import { ResponsiveManager } from '../systems/ResponsiveManager';
import { CircleDeathHandler } from '../systems/CircleDeathHandler';
import { CircleCoopMode } from '../systems/modes/CircleCoopMode';
import { UpdateContext } from '../systems/traits/Trait';
import { GameOverData } from './GameOverScene';
import { Creep } from '../entities/Creep';
import { Tower } from '../entities/Tower';
import { GameControlBar } from '../ui/GameControlBar';

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
  incomeDisplay!: IncomeDisplay;
  gameMode!: GameMode;
  eventLog!: EventLog;
  creepInfo!: CreepInfoPanel;
  upcomingWaves!: UpcomingWaves;
  statsTracker!: StatsTracker;
  towerMgr!: TowerManager;
  creepMgr!: CreepManager;
  waveMgr!: WaveController;
  versus: VersusManager | null = null;
  circle: CircleManager | null = null;
  circleRoster: CirclePlayerRoster | null = null;
  circleZoneOverlay: Phaser.GameObjects.Graphics | null = null;
  /** Which zone cells can this player build on? null = no restriction */
  private circleMyZone: Set<string> | null = null;
  /** Tower ownership: "col,row" → playerIndex */
  towerOwners: Map<string, number> = new Map();
  private _circleSyncTimer: number = 0;
  sidebarOverlay: SidebarOverlay | null = null;
  opponentMinimap: OpponentMinimap | null = null;
  opponentSim: OpponentSimulation | null = null;
  viewingOpponent: boolean = false;
  arenaManager: ArenaManager | null = null;
  abilitySystem: AbilitySystem | null = null;
  private controlBar: GameControlBar | null = null;
  heroId: HeroId | null = null;
  layout!: LayoutConfig;
  gridOffsetY: number = 0;
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
  randomSeed: number = 0;
  dailySeed: boolean = false;
  private generatedMapDef: MapDefinition | null = null;
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

  init(data: { mode?: MatchMode; faction?: FactionId | null; map?: MapId; modifier?: DraftModifier | null; difficulty?: DifficultyLevel; heroId?: HeroId; randomSeed?: number; dailySeed?: boolean }): void {
    this.matchMode = data.mode || 'standard';
    this.faction = data.faction ?? null;
    this.mapId = data.map || 'plains';
    this.modifier = data.modifier ?? null;
    this.difficulty = data.difficulty || 'normal';
    this.heroId = data.heroId ?? null;
    this.dailySeed = data.dailySeed ?? false;
    this.randomSeed = data.randomSeed ?? 0;
    this.generatedMapDef = null;
    // Hero defense requires its own map (12-row grid)
    if (this.matchMode === 'hero_defense') {
      this.mapId = 'hero_plains';
    }
    this.layout = getLayout(this.matchMode);
    this.gridOffsetY = this.layout.gridOffsetY;
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

  /** Get the active map definition (generated for random, static otherwise) */
  getMapDef(): MapDefinition {
    return this.generatedMapDef ?? MAPS[this.mapId];
  }

  private rollRandomTowers(): string[] {
    const all = getAllFactionTowerIds().filter(id => !getTowerType(id).ultimate);
    const shuffled = [...all].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 6);
  }

  create(): void {
    // Set global grid Y offset for hero defense (arena above grid)
    setGridOffsetY(this.gridOffsetY);

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

    this.arenaManager = null;
    this.abilitySystem = null;

    // Reset circle/multiplayer state and clean registry
    this.circle = null;
    this.circleRoster = null;
    this.circleZoneOverlay = null;
    this.circleMyZone = null;
    this.towerOwners.clear();
    this._circleSyncTimer = 0;
    this.versus = null;
    this.opponentMinimap = null;
    this.opponentSim = null;
    this.viewingOpponent = false;
    // Only keep registry entries for the current mode
    if (this.matchMode !== 'circle_coop') {
      const oldCircle = this.registry.get('circle');
      if (oldCircle) { oldCircle.close?.(); }
      this.registry.remove('circle');
    }
    if (this.matchMode === 'circle_coop') {
      const oldVersus = this.registry.get('versus');
      if (oldVersus) { oldVersus.close?.(); }
      this.registry.remove('versus');
    }

    this.eventBus = new EventBus();

    // Resolve map definition — generate for random maps
    let mapDef: MapDefinition;
    if (this.mapId === 'random') {
      // For versus, use sharedSeed from VersusManager
      const versusRef2 = this.registry.get('versus') as VersusManager | null;
      if (versusRef2 && this.randomSeed === 0) {
        this.randomSeed = versusRef2.sharedSeed;
      }
      // If still no seed, generate one (single player)
      if (this.randomSeed === 0) {
        this.randomSeed = this.dailySeed ? getDailySeed() : Math.floor(Math.random() * 999999999);
      }
      mapDef = generateRandomMap(this.randomSeed, this.difficulty);
      this.generatedMapDef = mapDef;
    } else {
      mapDef = MAPS[this.mapId];
    }

    const gridRows = this.layout.gridRows !== GRID_ROWS ? this.layout.gridRows : undefined;
    this.grid = new Grid(mapDef, gridRows);
    this.waves = getWavesForMode(this.matchMode);
    this.recalculatePaths();

    // Systems
    this.economy = new EconomyManager(this.eventBus);
    const versusRef = this.registry.get('versus') as VersusManager | null;
    const waveSeed = versusRef?.sharedSeed ?? 0;
    this.spawner = new SpawnManager(this, this.eventBus, this.difficultyHints, waveSeed);
    this.inputMgr = new InputManager(this, this.eventBus);
    if (this.layout.gridRows !== GRID_ROWS) {
      this.inputMgr.setGridRows(this.layout.gridRows);
    }
    this.ui = new UIOverlay(this, this.eventBus, this.gridOffsetY > 0 ? 'base_hp' : 'lives');
    this.ui.setCallbacks(
      () => {
        // Wave start (same as SPACE)
        if (this.betweenWaves && this.currentWave < this.waves.length) {
          if (this.circle) {
            this.circle.voteReady();
            this.eventLog.gameMessage('Ready! Waiting for other players...');
          } else if (this.versus) {
            this.versus.voteReady();
            this.eventLog.gameMessage('Ready! Waiting for opponent...');
          } else {
            this.startWave();
          }
        }
      },
      () => this.cycleSpeed(),
    );

    if (this.modifier && this.modifier.extraGold > 0) {
      this.economy.addGold(this.modifier.extraGold);
    }

    // Show seed for random maps
    if (this.mapId === 'random' && this.randomSeed) {
      this.ui.showSeed(this.randomSeed);
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
    this.towerInfo.setCallbacks(
      (tower) => {
        // Upgrade
        if (tower.canUpgrade()) {
          const cost = tower.getUpgradeCost();
          if (this.economy.spend(cost)) {
            tower.upgrade();
            this.towerInfo.show(tower);
            this.versus?.send({ type: 'tower_upgraded', col: tower.col, row: tower.row, level: tower.level });
            this.circle?.broadcast({ type: 'tower_upgraded', col: tower.col, row: tower.row, level: tower.level });
          }
        }
      },
      (tower) => {
        // Sell
        this.handleRightClick(tower.col, tower.row);
      },
    );
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

    // Event log (bottom of sidebar)
    this.eventLog = new EventLog(this, 480);

    // Hero defense: create ArenaManager before game mode
    if (this.matchMode === 'hero_defense' && this.heroId) {
      const heroType = HERO_TYPES[this.heroId];
      this.arenaManager = new ArenaManager(
        this, heroType, getGameWidth(), this.layout.arenaHeight,
        this.economy, this.eventLog, 10000,
      );
      this.abilitySystem = new AbilitySystem(this);
    }

    // Circle co-op: get CircleManager from registry
    this.circle = this.registry.get('circle') as CircleManager | null;

    // Game mode creates mode-specific UI (sends, frontier/essence panels)
    if (this.matchMode === 'hero_defense' && this.arenaManager) {
      this.gameMode = new HeroDefenseMode(this.arenaManager);
    } else if (this.matchMode === 'battle') {
      this.gameMode = new BattleMode();
    } else if (this.matchMode === 'circle_coop' && this.circle) {
      this.gameMode = new CircleCoopMode();
    } else {
      this.gameMode = new StandardMode(this.matchMode);
    }

    const gameModeCtx: GameModeContext = {
      scene: this,
      economy: this.economy,
      incomeMgr: this.incomeMgr,
      sendMgr: this.sendMgr,
      statsTracker: this.statsTracker,
      eventBus: this.eventBus,
      eventLog: this.eventLog,
      faction: this.faction,
      modifier: this.modifier,
      versus: null, // set after versus init
      sidebarTopY: UpcomingWaves.HEIGHT,
    };
    this.gameMode.createUI(gameModeCtx);

    this.incomeDisplay = new IncomeDisplay(this);

    // Core managers
    this.towerMgr = new TowerManager(this, this.grid, this.economy, this.statsTracker, this.eventLog, this.eventBus, this.modifier);
    const leakHandler = this.arenaManager
      ? new HeroLeakHandler(this.arenaManager, this.statsTracker, this.eventLog)
      : this.circle
        ? new CircleLeakHandler(this.circle, this.statsTracker, this.eventLog)
        : new StandardLeakHandler(this.eventLog, this.statsTracker);
    const deathHandler = this.circle
      ? new CircleDeathHandler(this.economy, this.statsTracker, this.eventBus, this.modifier?.killGoldMult ?? 1, this.towerOwners, this.circle.playerIndex)
      : new StandardDeathHandler(this.economy, this.statsTracker, this.eventBus,
          // Hero Defense: 10x creeps so reduce kill gold to 30%
          this.matchMode === 'hero_defense' ? 0.3 : (this.modifier?.killGoldMult ?? 1));
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
        this.gameMode.onWaveStart?.(wave, waveNum);
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

    // Sidebar background (desktop) or overlay (tablet)
    if (ResponsiveManager.isTablet()) {
      this.sidebarOverlay = new SidebarOverlay(this);
      // Reparent sidebar panels into the overlay
      this.sidebarOverlay.addPanel(this.upcomingWaves.getContainer());
      this.sidebarOverlay.addPanel(this.eventLog.getContainer());
      this.gameMode.reparentSidebarPanels?.(this.sidebarOverlay);
    } else {
      const sidebarBg = this.add.graphics().setDepth(0);
      sidebarBg.fillStyle(0x0e0e12, 1);
      sidebarBg.fillRect(0, 0, SIDEBAR_WIDTH, GAME_HEIGHT + 28 + TowerSelectBar.BAR_HEIGHT);
    }

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
        if (this.circle) {
          // Circle: vote ready, host checks all-ready
          this.circle.voteReady();
          this.eventLog.gameMessage('Ready! Waiting for other players...');
        } else if (this.versus) {
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

    this.inputMgr.onKey('ESC', () => {
      this.arenaManager?.cancelTargeting();
      this.enterNoneMode();
    });
    this.inputMgr.onKey('P', () => this.togglePause());
    this.inputMgr.onKey('A', () => this.toggleAutoPlay());
    this.inputMgr.onKey('TAB', () => this.cycleSpeed());
    this.inputMgr.onKey('ENTER', () => this.openChat());
    this.inputMgr.onKey('L', () => this.enterLinkMode());
    this.input.keyboard!.addCapture('TAB');

    // Hero defense: arena click + ability keys
    if (this.arenaManager) {
      this.inputMgr.onRawClick((px, py) => {
        if (py < this.gridOffsetY && px >= getGridOffsetX()) {
          this.arenaManager!.handleClick(px, py);
        }
      });
      this.inputMgr.onKey('Q', () => this.arenaManager!.handleAbilityKey(0));
      this.inputMgr.onKey('W', () => this.arenaManager!.handleAbilityKey(1));
      this.inputMgr.onKey('E', () => this.arenaManager!.handleAbilityKey(2));
      this.inputMgr.onKey('R', () => this.arenaManager!.handleAbilityKey(3));
      this.inputMgr.onKey('T', () => this.arenaManager!.handleAccessoryKey());
    }

    // Phone: touch control bar with wave/speed/pause + ability buttons
    if (ResponsiveManager.isPhone()) {
      const controlBarY = this.layout.totalHeight + 28; // below status bar
      this.controlBar = new GameControlBar(this, controlBarY, this.arenaManager);
      this.controlBar.setCallbacks(
        () => {
          if (this.betweenWaves && this.currentWave < this.waves.length) {
            if (this.circle) this.circle.voteReady();
            else if (this.versus) this.versus.voteReady();
            else this.startWave();
          }
        },
        () => this.cycleSpeed(),
        () => this.togglePause(),
      );
    }

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
      this.opponentSim = new OpponentSimulation(this.versus, this.getMapDef(), this.difficultyHints);

      this.eventLog.gameMessage('VERSUS MODE — sends go to opponent!');
      // Start initial 60s countdown for first wave
      this.versus.waveTimer = 60000;
      this.versus.waveTimerActive = true;
      // Sync initial speed from host
      if (this.versus.isHost) {
        this.versus.send({ type: 'speed_change', speed: this.gameSpeed });
      }

      // Wire versus into game mode context (was null at createUI time)
      gameModeCtx.versus = this.versus;
    }

    // Circle co-op setup
    if (this.circle) {
      this.towerOwners.clear();

      // Build zone restriction set for this player
      const circleMapDef = this.getMapDef();
      if (circleMapDef.zones && circleMapDef.zones[this.circle.playerIndex]) {
        this.circleMyZone = new Set(
          circleMapDef.zones[this.circle.playerIndex].map(p => `${p.col},${p.row}`)
        );
      }

      // Wire message handler
      this.circle.onGameMessage = (msg, fromPlayer) => {
        switch (msg.type) {
          case 'wave_ready':
            this.eventLog.gameMessage(`Player ${fromPlayer} is ready!`);
            break;
          case 'all_waves_cleared':
            break;
          case 'speed_change':
            this.gameSpeed = msg.speed;
            this.speedIndex = GameScene.SPEED_OPTIONS.indexOf(msg.speed);
            if (this.speedIndex === -1) this.speedIndex = 2;
            this.eventLog.gameMessage(`Host set speed: ${msg.speed}x`);
            break;
          case 'lives_update':
            // Joiner: sync shared lives from host
            if (!this.circle!.isHost) {
              this.lives = msg.lives;
            }
            break;
          case 'circle_victory':
            this.goToGameOver(true);
            break;
          case 'chat':
            this.eventLog.gameMessage(`[P${fromPlayer}] ${msg.text}`);
            break;
        }
      };

      // Create player roster UI
      const zoneColors = mapDef.zoneColors ?? [];
      this.circleRoster = new CirclePlayerRoster(this, this.circle, zoneColors);

      // Draw zone overlay on grid
      this.drawCircleZones();

      this.eventLog.gameMessage(`CIRCLE CO-OP — Player ${this.circle.playerIndex} of ${this.circle.playerCount}`);
      this.eventLog.gameMessage('Build in your zone (highlighted). Shared lives!');

      // Start initial 60s countdown
      this.circle.startWaveCountdown(60000);
      if (this.circle.isHost) {
        this.circle.broadcast({ type: 'countdown_start', duration: 60000 });
        this.circle.broadcast({ type: 'speed_change', speed: this.gameSpeed });
      }
    }

    const versusTimer = this.versus?.waveTimerActive
      ? this.versus.getWaveTimerSeconds()
      : this.circle?.waveTimerActive
        ? this.circle.getWaveTimerSeconds()
        : -1;
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

    if (this.grid.canPlaceTower(col, row) && this.canBuildInZone(col, row)) {
      const towerType = getTowerType(this.selectedBuildType);
      const cost = this.towerMgr.getEffectiveCost(towerType.cost);
      const canPlace = this.economy.canAfford(cost);
      const color = canPlace ? COLOR_HOVER_VALID : COLOR_HOVER_INVALID;

      // gridY() already includes gridOffsetY
      this.hoverGraphics.fillStyle(color, 0.2);
      this.hoverGraphics.fillRect(gridLeftX(col), gridY(row) - TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
      this.hoverGraphics.lineStyle(1, color, 0.6);
      this.hoverGraphics.strokeRect(gridLeftX(col), gridY(row) - TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);

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
              this.circle?.broadcast({ type: 'tower_upgraded', col: existingTower.col, row: existingTower.row, level: existingTower.level });
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
    // Circle co-op: can only sell your own towers
    if (this.circle) {
      const owner = this.towerOwners.get(`${col},${row}`);
      if (owner !== undefined && owner !== this.circle.playerIndex) return;
    }

    const result = this.towerMgr.sellTower(col, row);
    if (!result) return;

    if (this.selectedTower === result.tower) this.enterNoneMode();
    if (this.circle) {
      this.towerOwners.delete(`${col},${row}`);
      this.circle.broadcast({ type: 'tower_sold', col, row });
    }
    this.versus?.send({ type: 'tower_sold', col, row });

    if (!result.tower.isMobile) {
      this.recalculatePaths();
      this.drawPath();
    }
  }

  private tryBuildTower(col: number, row: number): void {
    if (!this.selectedBuildType) return;
    // Circle co-op: zone restriction
    if (!this.canBuildInZone(col, row)) return;

    const towerType = getTowerType(this.selectedBuildType);

    const result = this.towerMgr.placeTower(col, row, towerType, this.allPaths, () => {
      this.recalculatePaths();
      return this.allPaths;
    });

    if (!result) return;

    // Track tower ownership for circle co-op
    if (this.circle) {
      this.towerOwners.set(`${col},${row}`, this.circle.playerIndex);
      this.circle.broadcast({ type: 'tower_placed', towerId: towerType.id, col, row });
    }

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
    // Circle co-op: host deducts shared lives via CircleLeakHandler; joiners sync via message
    if (!this.circle || this.circle.isHost) {
      this.lives -= leakResult.totalLeakDamage;
    }

    // Clean up expired towers
    this.towerMgr.cleanupExpired();

    // Spawning + wave clear detection
    this.waveMgr.updateSpawning(delta, this.allPaths, this.currentPath, this.creeps);
    this.waveMgr.checkWaveComplete(this.creeps.length);

    // Hero defense: check arena base HP instead of lives
    const isHeroDead = this.arenaManager && this.arenaManager.baseHp <= 0;
    if (this.lives <= 0 || isHeroDead) {
      this.lives = 0;
      this.eventBus.emit('gameOver');
      if (this.versus) {
        this.versus.notifyGameOver(false, this.statsTracker.stats, this.currentWave, 0);
      }
      // Circle co-op: all lose together
      if (this.circle) {
        this.circle.broadcast({ type: 'circle_victory', winnerIndex: -1 });
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
      if (this.circle) {
        this.circle.broadcast({ type: 'circle_victory', winnerIndex: this.circle.playerIndex });
      }
      this.goToGameOver(true);
      return;
    }

    const versusTimer = this.versus?.waveTimerActive
      ? this.versus.getWaveTimerSeconds()
      : this.circle?.waveTimerActive
        ? this.circle.getWaveTimerSeconds()
        : -1;
    const displayLives = this.arenaManager ? this.arenaManager.baseHp : this.lives;
    this.ui.update(this.economy.gold, displayLives, this.currentWave, this.waves.length, this.waveActive, this.betweenWaves, this.gameSpeed, versusTimer);
    this.incomeDisplay.update(this.incomeMgr.getBreakdown());
    this.creepInfo.updateTracked();
    this.statsTracker.updateTime(delta);

    // Mode-specific per-frame update (essence ticking, arena, etc.)
    this.gameMode.update(delta);

    // Phone control bar
    if (this.controlBar) {
      this.controlBar.setState(this.waveActive, this.betweenWaves, this.currentWave < this.waves.length, this.gameSpeed);
      this.controlBar.update();
    }

    // Ability VFX
    if (this.abilitySystem) this.abilitySystem.update(delta);

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
        this.gameMode.handleSend(sendId);
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

    // Circle co-op: wave timer, incoming tower events, roster, chat
    if (this.circle) {
      // Wave timer
      if (this.circle.waveTimerActive) {
        if (this.circle.updateWaveTimer(delta)) {
          this.startWave();
        }
      }

      // Process incoming tower events from other players
      const towerEvents = this.circle.drainTowerEvents();
      for (const { from, msg } of towerEvents) {
        if (msg.type === 'tower_placed') {
          this.placeRemoteTower(msg.towerId, msg.col, msg.row, from);
        } else if (msg.type === 'tower_sold') {
          this.towerMgr.sellTower(msg.col, msg.row);
          this.towerOwners.delete(`${msg.col},${msg.row}`);
          this.recalculatePaths();
          this.drawPath();
        } else if (msg.type === 'tower_upgraded') {
          const tower = this.towers.find(t => t.col === msg.col && t.row === msg.row);
          if (tower && tower.canUpgrade()) {
            tower.upgrade();
          }
        } else if (msg.type === 'tower_sync') {
          // Reconcile — add any towers we're missing from this player
          for (const rt of msg.towers) {
            const existing = this.towers.find(t => t.col === rt.col && t.row === rt.row);
            if (!existing) {
              this.placeRemoteTower(rt.towerId, rt.col, rt.row, from);
            }
          }
        }
      }

      // Incoming chats
      const chats = this.circle.drainChats();
      for (const { from: fromIdx, text } of chats) {
        this.eventLog.gameMessage(`[P${fromIdx}] ${text}`);
      }

      // Sync shared lives (host is authoritative, joiners read from circle)
      if (this.circle.isHost) {
        this.circle.sharedLives = this.lives;
      } else {
        this.lives = this.circle.sharedLives;
      }

      // Periodic tower sync — broadcast our tower state every 5s
      this._circleSyncTimer += delta;
      if (this._circleSyncTimer >= 5000) {
        this._circleSyncTimer = 0;
        const myTowers = this.towers
          .filter(t => {
            const owner = this.towerOwners.get(`${t.col},${t.row}`);
            return owner === this.circle!.playerIndex || owner === undefined;
          })
          .map(t => ({ towerId: t.typeId, col: t.col, row: t.row, level: t.level }));
        this.circle.broadcast({ type: 'tower_sync', towers: myTowers });
      }

      // Update roster UI
      this.circleRoster?.update(this.lives);
    }

    // Update tower alive time for DPS calc
    for (const tower of this.towers) {
      const ts = this.statsTracker.stats.towerStats[tower.typeId];
      if (ts) ts.timeAlive += delta;
    }
  }

  // === Helpers ===

  private goToGameOver(won: boolean): void {
    // Reset global grid offset
    setGridOffsetY(0);

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
      // Hero defense data
      heroStats: this.arenaManager ? {
        kills: this.arenaManager.hero.kills,
        deaths: this.arenaManager.hero.deaths,
        damageDealt: this.arenaManager.hero.totalDamageDealt,
        abilitiesUsed: this.arenaManager.hero.abilitiesUsed,
        heroName: this.arenaManager.hero.typeDef.name,
      } : null,
    };
    this.versus?.close();
    this.registry.remove('versus');
    this.circle?.close();
    this.registry.remove('circle');
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

    const gw = getGameWidth();
    const cx = getGridOffsetX() + gw / 2;
    const cy = GAME_HEIGHT / 2;

    this.pauseOverlay = this.add.container(0, 0).setDepth(50);

    // Dim overlay
    const dim = this.add.graphics();
    dim.fillStyle(0x000000, 0.6);
    dim.fillRect(getGridOffsetX(), 0, gw, GAME_HEIGHT);
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
      setGridOffsetY(0);
      this.versus?.close();
      this.circle?.close();
      this.registry.remove('versus');
      this.registry.remove('circle');
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

    const oY = this.gridOffsetY;
    const rows = this.grid.rows;
    const gridH = rows * TILE_SIZE;

    const cols = getGridCols();
    const gw = getGameWidth();

    g.fillStyle(COLOR_GROUND, 1);
    g.fillRect(getGridOffsetX(), oY, gw, gridH);

    g.lineStyle(1, COLOR_GRID_LINE, 0.3);
    for (let col = 0; col <= cols; col++) {
      g.lineBetween(gridLeftX(col), oY, gridLeftX(col), oY + gridH);
    }
    for (let row = 0; row <= rows; row++) {
      g.lineBetween(getGridOffsetX(), oY + row * TILE_SIZE, getGridOffsetX() + gw, oY + row * TILE_SIZE);
    }

    // Blocked terrain — use gridY-based coords (includes offset)
    g.fillStyle(0x1a1a1a, 1);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cell = this.grid.cells[row][col];
        const cellY = oY + row * TILE_SIZE;
        if (cell === CellType.Blocked) {
          g.fillStyle(0x1a1a1a, 1);
          g.fillRect(gridLeftX(col), cellY, TILE_SIZE, TILE_SIZE);
          g.lineStyle(1, 0x333333, 0.5);
          g.strokeRect(gridLeftX(col), cellY, TILE_SIZE, TILE_SIZE);
        } else if (cell === CellType.NoBuild) {
          g.fillStyle(0x2a2222, 1);
          g.fillRect(gridLeftX(col), cellY, TILE_SIZE, TILE_SIZE);
          g.lineStyle(1, 0x442222, 0.3);
          const lx = gridLeftX(col);
          g.lineBetween(lx + 4, cellY + 4, lx + TILE_SIZE - 4, cellY + TILE_SIZE - 4);
          g.lineBetween(lx + TILE_SIZE - 4, cellY + 4, lx + 4, cellY + TILE_SIZE - 4);
        }
        if (cell === CellType.Blocked || cell === CellType.NoBuild) {
          g.lineStyle(1, COLOR_GRID_LINE, 0.3);
        }
      }
    }

    for (const entry of this.grid.entries) {
      g.fillStyle(COLOR_ENTRY, 0.5);
      g.fillRect(gridLeftX(entry.col), oY + entry.row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
    for (const exit of this.grid.exits) {
      g.fillStyle(COLOR_EXIT, 0.5);
      g.fillRect(gridLeftX(exit.col), oY + exit.row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
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
    this.opponentOverlay.fillRect(getGridOffsetX(), 0, getGameWidth(), GAME_HEIGHT);

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
    this.opponentOverlay.fillRect(getGridOffsetX(), 0, 220, 22);

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
      this.opponentLabel = this.add.text(getGridOffsetX() + 8, 3, 'VIEWING OPPONENT', {
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

  /** Place a tower from a remote player (free, no economy check) */
  private placeRemoteTower(towerId: string, col: number, row: number, fromPlayer: number): void {
    const tt = getTowerType(towerId);
    if (!tt) return;
    const placeResult = this.towerMgr.placeTower(col, row, tt, this.allPaths, () => {
      this.recalculatePaths();
      return this.allPaths;
    }, true);
    if (placeResult) {
      this.towerOwners.set(`${col},${row}`, fromPlayer);
      if (placeResult.pathsChanged) this.drawPath();
    }
  }

  /** Check if player can build at this cell (zone restriction for circle co-op) */
  private canBuildInZone(col: number, row: number): boolean {
    if (!this.circleMyZone) return true; // no zone restriction
    return this.circleMyZone.has(`${col},${row}`);
  }

  /** Draw zone tint overlay on the grid for circle co-op */
  private drawCircleZones(): void {
    if (!this.circle) return;
    const zoneMapDef = this.getMapDef();
    if (!zoneMapDef.zones || !zoneMapDef.zoneColors) return;

    if (!this.circleZoneOverlay) {
      this.circleZoneOverlay = this.add.graphics().setDepth(0.5);
    }
    const g = this.circleZoneOverlay;
    g.clear();

    for (let z = 0; z < zoneMapDef.zones.length; z++) {
      const color = zoneMapDef.zoneColors[z];
      const isMyZone = z === this.circle.playerIndex;
      const alpha = isMyZone ? 0.12 : 0.06;
      g.fillStyle(color, alpha);
      for (const cell of zoneMapDef.zones[z]) {
        g.fillRect(gridLeftX(cell.col), gridY(cell.row) - TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
      }
      // Draw zone border for my zone
      if (isMyZone) {
        g.lineStyle(1, color, 0.3);
        for (const cell of zoneMapDef.zones[z]) {
          g.strokeRect(gridLeftX(cell.col), gridY(cell.row) - TILE_SIZE / 2, TILE_SIZE, TILE_SIZE);
        }
      }
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

    // Circle: notify
    if (this.circle) {
      this.circle.notifyWaveCleared(waveNum);
    }

    // Mode-specific wave-end (frontier income, essence, etc.)
    this.gameMode.onWaveCleared(waveNum);

    // Events + UI
    this.eventBus.emit('waveCleared', waveNum);
    this.eventLog.waveCleared(waveNum, this.incomeMgr.getWaveIncome());
    this.statsTracker.recordWaveCompleted();
    this.upcomingWaves.update(waveNum, this.waves);

    // Random faction rotation
    if (this.faction === 'random') {
      this.activeTowerIds = this.rollRandomTowers();
      this.towerBar.setTowerIds(this.activeTowerIds);
      if (this.gameMode instanceof StandardMode) {
        (this.gameMode as StandardMode).rotateRandomFrontier();
      }
      this.eventLog.gameMessage('Tower + frontier pool rotated!');
      this.enterNoneMode();
      if (this.versus?.isHost) {
        this.versus.send({ type: 'tower_pool', towerIds: this.activeTowerIds });
      }
    }
  }
}
