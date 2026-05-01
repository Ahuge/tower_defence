import * as Phaser from 'phaser';
import {
  TILE_SIZE, GRID_COLS, GRID_ROWS, GAME_WIDTH, GAME_HEIGHT,
  SIDEBAR_WIDTH, getGridOffsetX, getCanvasWidth, getGameWidth, getGridCols,
  COLOR_GROUND, COLOR_GRID_LINE, COLOR_ENTRY, COLOR_EXIT,
  COLOR_HOVER_VALID, COLOR_HOVER_INVALID, STARTING_LIVES,
  gridX, gridY, gridLeftX, pixelToCol, setGridOffsetY,
} from '../config';
import { Grid, CellType } from '../systems/Grid';
import { DEBUG } from '../systems/DebugFlags';
import { findPath, findPathWithWaypoints, PathPoint } from '../systems/Pathfinding';
import { EventBus } from '../systems/EventBus';
import { EconomyManager } from '../systems/EconomyManager';
import { SpawnManager } from '../systems/SpawnManager';
import { InputManager } from '../systems/InputManager';
import { UIOverlay } from '../systems/UIOverlay';
import { getTowerType, TOWER_ORDER, TOWER_TYPES, getAllFactionTowerIds } from '../data/TowerTypes';
import { FactionId, getFaction, FACTIONS, FACTION_ORDER } from '../data/Factions';
import { PlayerInventory, claimRewarded, BattlePass, DiscoveryTracker } from '../systems/monetization';
import { GameUIStore, TowerStats, TowerUpgradeOption, CircleRosterPlayer } from '../ui/GameUIStore';
import { DOODAD_DRAW, DOODAD_CELL } from '../../frontier_doodad_sprites';
import { MatchMode, WaveDefinition, getWavesForMode, generateEndlessWaves } from '../data/WaveDefinitions';
import { MapId, MAPS, MapDefinition } from '../data/Maps';
import { generateRandomMap, getDailySeed } from '../data/MapGenerator';
import { DifficultyLevel, DIFFICULTIES, DifficultyHints } from '../data/Difficulty';
import { DraftModifier } from '../data/DraftModifiers';
import { IncomeManager } from '../systems/IncomeManager';
import { SendManager } from '../systems/SendManager';
import { GameMode, GameModeContext } from '../systems/GameMode';
import { StandardMode } from '../systems/modes/StandardMode';
import { BaseFrontierMode } from '../systems/modes/BaseFrontierMode';
import { BattleMode } from '../systems/modes/BattleMode';
import { HeroDefenseMode } from '../systems/modes/HeroDefenseMode';
import { GauntletMode } from '../systems/modes/GauntletMode';
import { goToMenu } from '../ui/navigation';
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
import { UpcomingWaves } from '../ui/UpcomingWaves';
import { StatsTracker } from '../systems/StatsTracker';
import { TowerManager } from '../systems/TowerManager';
import { CreepManager, StandardLeakHandler, StandardDeathHandler } from '../systems/CreepManager';
import { WaveController } from '../systems/WaveController';
import { VersusManager } from '../systems/multiplayer/VersusManager';
import { SkinManager } from '../systems/monetization/SkinManager';
import { CircleManager } from '../systems/multiplayer/CircleManager';
import { BotAI } from '../systems/bots/BotAI';
import { OpponentSimulation } from '../systems/multiplayer/OpponentSimulation';
import { OpponentMinimap } from '../ui/OpponentMinimap';
import { CircleLeakHandler } from '../systems/CircleLeakHandler';
import { SidebarOverlay } from '../ui/SidebarOverlay';
import { ResponsiveManager } from '../systems/ResponsiveManager';
import { UIScale } from '../systems/UIScale';
import { CircleDeathHandler } from '../systems/CircleDeathHandler';
import { TutorialManager } from '../systems/Tutorial/TutorialManager';
import { PathFlowIndicator } from '../systems/PathFlowIndicator';
import { TutorialMode } from '../systems/modes/TutorialMode';
import { CircleCoopMode } from '../systems/modes/CircleCoopMode';
import { UpdateContext, hasTrait, getTrait } from '../systems/traits/Trait';
import { GameOverData, CoopPlayerStats } from './GameOverScene';
import { SEND_OPTIONS, SendCreepOption, getSendCost, getSendIncome } from '../data/SendCreepTypes';
import { FRONTIER_BUILDINGS, GENERIC_OUTPOSTS, getAllFactionFrontierBuildings } from '../data/FrontierBuildings';
import { Creep } from '../entities/Creep';
import { playCreepDeath } from '../systems/CreepSpriteManager';
import { Tower } from '../entities/Tower';
import { GameControlBar } from '../ui/GameControlBar';
import { preloadSprites, createSpriteAnimations, getTowerSpriteConfig } from '../systems/SpriteManager';
import { CameraController } from '../systems/CameraController';
import { UILayer } from '../systems/UILayer';
import { TerrainManager } from '../systems/TerrainManager';
import { Analytics } from '../systems/AnalyticsClient';
import { PlayerProfile } from '../systems/profile/PlayerProfile';
import { platformBridge } from '../systems/platform';
import { AD_GAME_OVER_CONTINUE, AD_SPEED_BOOST_10M } from '../systems/platform/AdPlacements';
import { unlockAchievement } from '../data/Achievements';
import { preloadCreepSprites, createCreepAnimations } from '../systems/CreepSpriteManager';

type SelectionMode = 'build' | 'inspect' | 'inspect_creep' | 'link' | 'none';

/** Tower ids treated as "walls" for the Plan 14 campaign-restriction
 *  `noWalls` check + the `maxTowers` cap (which only counts non-wall
 *  shooters). Hardcoded list — small surface, the kit doesn't rotate
 *  often enough to justify a per-tower flag in the data layer yet. */
const WALL_TOWER_IDS = new Set<string>(['mech_wall', 'mil_sandbag', 'mil_wire']);
function isWallTower(towerId: string): boolean { return WALL_TOWER_IDS.has(towerId); }

/** Single-shot seeded roll in [0, 1). Used by the Endless faction
 *  rotation so host + joiner converge on the same faction for a
 *  given (sharedSeed, waveNum) pair. Same mulberry32 math as
 *  `data/MapGenerator.ts`; not worth factoring out for one call. */
function seededRoll(seed: number): number {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

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
  upcomingWaves!: UpcomingWaves;
  statsTracker!: StatsTracker;
  towerMgr!: TowerManager;
  creepMgr!: CreepManager;
  waveMgr!: WaveController;
  versus: VersusManager | null = null;
  circle: CircleManager | null = null;
  // Host-only CPU bot driver. Null on joiners, and on host when
  // there are no bot slots. Created after `circle` is initialised
  // (needs playerFactions + zone data).
  circleBotAI: BotAI | null = null;
  cpuOpponentAI: BotAI | null = null;
  /** Wave number the CPU opponent's shadow sim has most recently
   *  completed. Guards against re-firing `wave_cleared` every frame
   *  while the countdown is ticking between waves. */
  private _cpuLastClearedWave: number = 0;
  // Kept for the roster UI to read per-player kill counts via
  // `getKillsByPlayer()`. Null in non-circle matches.
  circleDeathHandler: CircleDeathHandler | null = null;
  /** Zone swatches for the DOM roster. Populated at Circle setup;
   *  read by `publishCircleRoster` each frame. */
  private _circleZoneColors: number[] = [];
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
  private creepCounter: Phaser.GameObjects.Text | null = null;
  abilitySystem: AbilitySystem | null = null;
  private controlBar: GameControlBar | null = null;
  private cameraCtrl: CameraController | null = null;
  private uiCamera: Phaser.Cameras.Scene2D.Camera | null = null;
  uiLayer: UILayer | null = null;
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
  // Full list — 3× is Battle Pass only; 2× is always on for ads-off
  // owners, temporarily on for free players who watched the ad, and
  // baseline caps at 1.5×. See activeSpeedOptions() for the slice
  // that's valid right now for this player.
  private static readonly SPEED_OPTIONS = [0, 0.5, 1.0, 1.5, 2.0, 3.0];
  private speedIndex: number = 2;

  /**
   * Return the speed-cycle values this player can currently reach.
   *
   *   - Battle Pass `all_speeds` perk: full list, up to 3×.
   *   - ads_off IAP: up to 2× (permanently).
   *   - Free player with an active speed-boost ad: up to 2× (timed).
   *   - Otherwise: baseline [0, 0.5, 1, 1.5].
   *
   * The 3× slot is intentionally Battle-Pass-exclusive — it's a
   * premium-tier bonus, not an ad-reachable one. Ads unlock 2×.
   */
  private activeSpeedOptions(): number[] {
    if (BattlePass.hasPerk('all_speeds')) return GameScene.SPEED_OPTIONS;
    if (PlayerInventory.isAdFree() || this.isSpeedBoosted()) {
      return GameScene.SPEED_OPTIONS.slice(0, 5); // [0, 0.5, 1, 1.5, 2]
    }
    return GameScene.SPEED_OPTIONS.slice(0, 4);   // [0, 0.5, 1, 1.5]
  }

  /** True while the rewarded speed-boost ad timer is running. */
  isSpeedBoosted(now: number = Date.now()): boolean {
    return now < this._speedBoostUntil;
  }

  /** Remaining milliseconds on the speed boost. 0 when expired. */
  speedBoostRemainingMs(now: number = Date.now()): number {
    return Math.max(0, this._speedBoostUntil - now);
  }

  // Selection state
  selectionMode: SelectionMode = 'none';
  selectedBuildType: string | null = null;
  selectedTower: Tower | null = null;
  private _infoRefreshAccum: number = 0;

  // Graphics layers
  gridGraphics!: Phaser.GameObjects.Graphics;
  pathGraphics!: Phaser.GameObjects.Graphics;
  private terrainMgr!: TerrainManager;

  // Path flow indicator — one per distinct path (multi-entry maps get several).
  // Continuously visible between waves, dims while a wave is running. Replaces
  // the old single-Arc pip that lerped along the path and kept getting
  // mistaken for a creep.
  private pathFlows: PathFlowIndicator[] = [];
  private mapDef!: MapDefinition;
  private _gameStartTime: number = 0;
  hoverGraphics!: Phaser.GameObjects.Graphics;
  rangeGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super('GameScene');
  }

  creepFaction: FactionId = 'arcane';
  private _gauntletOrder: FactionId[] | undefined;
  private _gauntletTransitioning: boolean = false;
  private _gauntletHud: Phaser.GameObjects.Text | null = null;

  // Continue-ad state.
  //   _awaitingContinueDecision: update loop early-returns while the
  //     modal is up so the game world visibly freezes — creeps stop
  //     marching, towers stop shooting. Cleared on accept or decline.
  //   _continueUsedThisMatch: true after a successful revive, so we
  //     never offer a second ad in the same match (ad-strategy.md #6
  //     is explicitly 1/match).
  //   _continueAdShown: true if any continue ad actually played — used
  //     by GameOverScreen to suppress the post-match interstitial so
  //     the player doesn't get two ads back-to-back.
  private _awaitingContinueDecision: boolean = false;
  private _continueUsedThisMatch: boolean = false;
  private _continueAdShown: boolean = false;

  // Speed boost state (strategy-doc #5).
  //   Baseline cycle caps at 2×; when `_speedBoostUntil > Date.now()`
  //   the cycle extends to include 3×. Granted by claimRewarded, lasts
  //   10 min of wall-clock time (stacks with existing boost, capped at
  //   30 min total). If the clock expires mid-match while the player
  //   is at 3×, the next speed read-out snaps them back to 2×.
  private _speedBoostUntil: number = 0;

  // Encyclopedia creep-discovery tracker. Subscribes to creepSpawned
  // for the lifetime of the scene, de-dups against persisted state,
  // and ticks the DISCOVER_CREEPS incremental achievement when new
  // creep types appear. Skipped in tutorial mode (see the constructor
  // argument check inside the tracker).
  private _discoveryTracker: DiscoveryTracker | null = null;
  private waveCount?: number;

  private customMapDef: MapDefinition | null = null;

  /** Timestamp when mode_entered fired; used to compute mode_exited durationMs. */
  private _modeEnteredAt: number = 0;

  /** Plan 10: campaign mission context. Populated when the scene was
   *  launched by `MissionRunner.start`; null otherwise. GameScene
   *  reads this in init() to apply mission-specific overrides
   *  (lives, gold, restrictions) and uses it at game-end to call
   *  `MissionRunner.finalize`. */
  private missionContext: import('../systems/missions/MissionRunner').MissionContext | null = null;

  /** Mission-applied gold/lives overrides (snapshot of init data). */
  private _missionGoldStart?: number;
  private _missionGoldStartMult?: number;
  private _missionLives?: number;

  /** Plan 14 custom counters fed into MissionResult.custom at game-end.
   *  Populated only when the scene was launched as a campaign mission;
   *  ignored otherwise. */
  private _missionSendsBought = 0;
  private _missionHeroHpMinFraction = 1;

  init(data: { mode?: MatchMode; faction?: FactionId | null; map?: MapId; modifier?: DraftModifier | null; difficulty?: DifficultyLevel; heroId?: HeroId; randomSeed?: number; dailySeed?: boolean; creepFaction?: FactionId; gauntletOrder?: FactionId[]; customMapDef?: MapDefinition; waveCount?: number; missionContext?: import('../systems/missions/MissionRunner').MissionContext; missionGoldStart?: number; missionGoldStartMult?: number; missionLives?: number }): void {
    this.matchMode = data.mode || 'standard';
    this.faction = data.faction ?? null;
    this.mapId = data.map || 'plains';
    this.modifier = data.modifier ?? null;
    this.difficulty = data.difficulty || 'normal';
    this.heroId = data.heroId ?? null;
    this.dailySeed = data.dailySeed ?? false;
    this.randomSeed = data.randomSeed ?? 0;
    this.creepFaction = data.creepFaction ?? 'arcane';
    this.waveCount = data.waveCount;
    this.missionContext = data.missionContext ?? null;
    this._missionGoldStart = data.missionGoldStart;
    this._missionGoldStartMult = data.missionGoldStartMult;
    this._missionLives = data.missionLives;
    // Live-capture mode forces 20-wave matches to match the
    // headless training data shape — bot data is generated at
    // waveCount=20, so human-captured rows must use the same to
    // be mixable. Only applies to standard mode (the only mode
    // capture targets).
    try {
      const win = (typeof window !== 'undefined') ? window : null;
      const capActive = win && (
        new URLSearchParams(win.location.search).get('capture') === '1' ||
        win.localStorage.getItem('learning.capture') === '1'
      );
      if (capActive && this.matchMode === 'standard') {
        this.waveCount = 20;
      }
    } catch { /* ignore (headless / sandboxed) */ }
    this._gauntletOrder = (data as any).gauntletOrder ?? undefined;
    this._gauntletTransitioning = false;
    this.generatedMapDef = null;
    this.customMapDef = data.customMapDef ?? null;
    // Hero defense requires its own map (12-row grid)
    if (this.matchMode === 'hero_defense') {
      this.mapId = 'hero_plains';
    }
    this.layout = getLayout(this.matchMode);
    this.gridOffsetY = this.layout.gridOffsetY;
    this.difficultyHints = DIFFICULTIES[this.difficulty];
    if (this.faction === 'chaos') {
      this.activeTowerIds = this.rollRandomTowers();
    } else if (this.faction) {
      const f = getFaction(this.faction);
      this.activeTowerIds = f.towerIds;
    } else {
      this.activeTowerIds = TOWER_ORDER;
    }
  }

  /** Get the active map definition (generated for random, custom, static otherwise) */
  getMapDef(): MapDefinition {
    return this.generatedMapDef ?? this.customMapDef ?? MAPS[this.mapId];
  }

  private rollRandomTowers(): string[] {
    // Only roll towers from factions the player owns
    const ownedFactions = PlayerInventory.getOwnedFactions();
    const ownedTowerIds = getAllFactionTowerIds().filter(id => {
      const t = getTowerType(id);
      return t.faction && ownedFactions.includes(t.faction as FactionId);
    });

    const nonUlt = ownedTowerIds.filter(id => !getTowerType(id).ultimate);
    const shuffled = [...nonUlt].sort(() => Math.random() - 0.5);
    const pool = shuffled.slice(0, 6);

    // 5% chance to replace the last slot with a random ultimate tower
    if (Math.random() < 0.05) {
      const ultimates = ownedTowerIds.filter(id => getTowerType(id).ultimate);
      if (ultimates.length > 0) {
        pool[5] = ultimates[Math.floor(Math.random() * ultimates.length)];
      }
    }

    return pool;
  }

  preload(): void {
    // Load sprite assets (only downloads what's needed)
    preloadSprites(this);
    TerrainManager.preload(this);
    preloadCreepSprites(this);
  }

  create(): void {
    // Clean up previous run if scene is being restarted
    this.events.once('shutdown', () => this.shutdown());

    // Activate DOM game UI
    GameUIStore.activate(this.matchMode, this.waves?.length ?? 0);
    GameUIStore.registerCallbacks({
      onUpgrade: (tower, branchId) => {
        if (!this.canModifyTower(tower.col, tower.row)) return;
        // Re-read options off the live tower so we spend the right
        // cost even if a stale click event carries an old branch id.
        const opt = tower.getUpgradeOptions().find(o => o.branchId === (branchId ?? null));
        if (!opt) return;
        if (this.economy.spend(opt.cost)) {
          this._captureHumanAction({ kind: 'upgrade', col: tower.col, row: tower.row, branch: branchId });
          tower.upgrade(branchId ?? null);
          GameUIStore.selectTower(this.towerToStats(tower));
          const msg = { type: 'tower_upgraded' as const, col: tower.col, row: tower.row, level: tower.level, branch: branchId ?? undefined };
          this.versus?.send(msg);
          this.circle?.broadcast(msg);
        }
      },
      onSell: (tower) => {
        this.handleRightClick(tower.col, tower.row);
      },
      onToggleAutoPlay: () => {
        this.toggleAutoPlay();
      },
      onStartWave: () => {
        if (!this.betweenWaves) {
          if (DEBUG) console.warn(`[wave] Next Wave ignored: wave ${this.currentWave} still active (creeps=${this.creeps.length})`);
          return;
        }
        if (this.currentWave >= this.waves.length) {
          if (DEBUG) console.warn('[wave] Next Wave ignored: all waves completed');
          return;
        }
        this.startWave();
      },
      onCycleSpeed: () => {
        this.cycleSpeed();
      },
      onRequestSpeedBoost: () => {
        void this.requestSpeedBoost();
      },
      onPause: () => {
        this.togglePause();
      },
      onFrontierDoodad: (color: number, buildingId: string, factionFallback?: string) => {
        return this.placeFrontierDoodad(color, buildingId, factionFallback);
      },
      onSelectDockTower: (index: number) => {
        this.inputMgr.dbg(`DOCK idx=${index} id=${index >= 0 ? this.activeTowerIds[index] ?? '?' : 'deselect'}`);
        if (index < 0) {
          this.enterNoneMode();
          GameUIStore.selectDockTower(-1);
          // Intentionally don't emit dockTowerSelected on deselect — the
          // tutorial's pick_tower step advances only on actual selection.
        } else if (index < this.activeTowerIds.length) {
          const towerId = this.activeTowerIds[index];
          this.enterBuildMode(towerId);
          GameUIStore.selectDockTower(index);
          this.eventBus.emit('dockTowerSelected', index, towerId);
        }
      },
      onDeselectTower: () => {
        // Full deselect from the sidebar UI — must clear `this.selectedTower`
        // too, otherwise the per-frame refresh below re-pushes the snapshot
        // and the panel reappears 250ms later.
        if (this.selectionMode === 'inspect') this.enterNoneMode();
        else GameUIStore.deselectTower();
      },
    });

    // Create sprite animations from loaded sheets
    createSpriteAnimations(this);
    TerrainManager.createAnimations(this);
    createCreepAnimations(this, this.creepFaction);

    // Set global grid Y offset for hero defense (arena above grid)
    setGridOffsetY(this.gridOffsetY);

    this._towers = [];
    this._creeps = [];
    // Tutorial gets 99 lives so the player literally can't die. The
    // matching +150 gold bump lives further down — after `this.economy`
    // is constructed.
    this.lives = this.matchMode === 'tutorial' ? 99 : STARTING_LIVES;
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
    // Plan 10: campaign mission lives override takes precedence over
    // tutorial / modifier defaults. Final showdowns / boss rushes
    // use this for tighter constraints.
    if (this._missionLives !== undefined) {
      this.lives = this._missionLives;
    }

    this.arenaManager = null;
    this.abilitySystem = null;

    // Reset circle/multiplayer state and clean registry
    this.circle = null;
    this._circleZoneColors = [];
    GameUIStore.setCircleRoster(null);
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
    TutorialManager.setGameEventBus(this.eventBus);
    TutorialManager.onGameSceneCreated(this.matchMode);

    // Live-capture for sends + frontier purchases. Both events are
    // emitted ONLY from human-player code paths (DOM callbacks +
    // panel-click handlers in StandardMode / GauntletMode /
    // BaseFrontierMode); bot purchases route through the BotAI
    // frontierCb / sendCb pathway which doesn't emit these. So
    // subscribing here captures human actions only — no bot leakage.
    this.eventBus.on('sendPurchased', (sendOptionId: string) => {
      this._captureHumanAction({ kind: 'send', sendOptionId });
      // Plan 14 mission counter — feeds the "Win without sends"
      // star-3 predicate at finalize. Capture mode runs alongside
      // the mission counter cleanly since only one is active per
      // session.
      this._missionSendsBought++;
    });
    this.eventBus.on('frontierPurchased', (buildingId: string) => {
      this._captureHumanAction({ kind: 'frontier', buildingId });
    });
    this.eventBus.on('frontierActionPerformed', (event) => {
      this._captureHumanAction({
        kind: 'frontierManage',
        action: event.action,
        idx: event.idx,
        defId: event.defId,
      });
    });

    // Resolve map definition — generate for random maps, use custom if provided
    let mapDef: MapDefinition;
    if (this.mapId === 'custom' && this.customMapDef) {
      mapDef = this.customMapDef;
      this.generatedMapDef = mapDef;
    } else if (this.mapId === 'random') {
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

    this.mapDef = mapDef;
    const gridRows = this.layout.gridRows !== GRID_ROWS ? this.layout.gridRows : undefined;
    this.grid = new Grid(mapDef, gridRows);
    this.waves = getWavesForMode(this.matchMode, this.waveCount);
    this.recalculatePaths();

    // Systems
    this.economy = new EconomyManager(this.eventBus);
    // Tutorial: +150 gold on top of STARTING_GOLD so the player can afford
    // two Arcane Bolts + a send and a Leyline Nexus.
    if (this.matchMode === 'tutorial') this.economy.addGold(150);
    // Plan 10: campaign mission gold tweaks. `missionGoldStart` is an
    // additive bump; `missionGoldStartMult` halves (frugal) or
    // doubles starting gold. Both can apply.
    if (this._missionGoldStart !== undefined) {
      this.economy.addGold(this._missionGoldStart);
    }
    if (this._missionGoldStartMult !== undefined && this._missionGoldStartMult !== 1) {
      const current = this.economy.gold;
      const adjusted = Math.round(current * this._missionGoldStartMult);
      // Subtract or add the delta — there's no setGold helper.
      this.economy.addGold(adjusted - current);
    }
    const versusRef = this.registry.get('versus') as VersusManager | null;
    const waveSeed = versusRef?.sharedSeed ?? 0;
    this.spawner = new SpawnManager(this, this.eventBus, this.difficultyHints, waveSeed);
    // Attach waypoint-chain spawners (Circle Co-op) so every new
    // creep knows its ordered waypoints + exit — enables proper
    // mid-wave rerouting instead of "A* to shortest exit" guessing.
    this.spawner.setSpawners(this.mapDef?.spawners ?? null);

    // Circle Co-op creep-count scaling: more defenders → more
    // creeps, with a bonus +1 for smaller teams so 2-player
    // matches still feel busy. Formula: playerCount + (pc < 4 ? 1 : 0).
    // Values: 2p = 3×, 3p = 4×, 4p = 4×. Non-coop modes get 1×.
    const circleMgr = this.registry.get('circle') as CircleManager | null;
    if (circleMgr) {
      const pc = circleMgr.playerCount;
      const mult = pc + (pc < 4 ? 1 : 0);
      this.spawner.setCountMultiplier(mult);
      // Tag every wave creep with its spawner's owner so the shared
      // kill-gold split knows who to pay the spawn-owner half.
      this.spawner.setTrackSpawnOwnership(true);
      // Coop late-game scaling: creep HP gets an extra additive
      // ramp per wave. Wave 10 ≈ 1.35×, wave 25 ≈ 1.875×, wave 40
      // = 2.4×. Compounds with difficulty + the natural wave-count
      // curve, which weren't keeping up with stacked team DPS.
      this.spawner.setHpWaveMultiplier((wave) => 1 + wave * 0.035);
    }
    this.inputMgr = new InputManager(this, this.eventBus);
    if (this.layout.gridRows !== GRID_ROWS) {
      this.inputMgr.setGridRows(this.layout.gridRows);
    }
    // Tower bar first — sets BAR_HEIGHT which UIOverlay needs for positioning
    this.towerBar = new TowerSelectBar(this, this.activeTowerIds, (typeId) => {
      if (typeId) {
        this.enterBuildMode(typeId);
      } else if (this.selectionMode === 'build') {
        this.enterNoneMode();
      }
    });
    // Hide Phaser tower bar — DOM version takes over.
    // Disable input on the container so invisible zones don't swallow touches.
    this.towerBar.getContainer().setVisible(false);
    this.towerBar.getContainer().setActive(false);
    this.towerBar.getContainer().disableInteractive();
    this.syncTowerBarToDOM();

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
    this.towerInfo = new TowerInfoPanel(this);
    this.towerInfo.setCallbacks(
      (tower) => {
        // Upgrade
        if (!this.canModifyTower(tower.col, tower.row)) return;
        if (tower.canUpgrade()) {
          const cost = tower.getUpgradeCost();
          if (this.economy.spend(cost)) {
            tower.upgrade();
            GameUIStore.selectTower(this.towerToStats(tower)); // refresh DOM panel
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
    // Economy systems
    this.incomeMgr = new IncomeManager(this.eventBus);
    if (this.modifier && this.modifier.extraIncome > 0) {
      this.incomeMgr.baseIncome += this.modifier.extraIncome;
    }
    this.sendMgr = new SendManager(this, this.eventBus);
    this.spawner.setFlyingPath(this.grid.entries[0], this.grid.exits[0]);
    this.sendMgr.setFlyingPath(this.grid.entries[0], this.grid.exits[0]);

    // Subscribe the Encyclopedia discovery tracker. Skips writing
    // during tutorial mode so the scripted-creep sequence doesn't
    // front-load discovery progress before the player fairly
    // encounters creep types in normal play.
    this._discoveryTracker = new DiscoveryTracker(this.eventBus, this.matchMode);

    // Stats tracker
    this.statsTracker = new StatsTracker();

    // Upcoming waves — Phaser panel hidden, DOM version takes over
    this.upcomingWaves = new UpcomingWaves(this, () => this.toggleAutoPlay());
    this.upcomingWaves.update(this.currentWave, this.waves);
    this.upcomingWaves.getContainer().setVisible(false);
    this.upcomingWaves.getContainer().setActive(false);
    this.updateDOMWaves(this.currentWave);

    // Event log — Phaser panel hidden, but still functional (pushes to DOM)
    this.eventLog = new EventLog(this, 480);
    this.eventLog.getContainer().setVisible(false);

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
      // Creep counter for hero defense — bottom-left of game area
      const counterY = GAME_HEIGHT - UIScale.space(12);
      const counterX = getGridOffsetX() + UIScale.space(8);
      this.creepCounter = this.add.text(counterX, counterY, '', {
        fontSize: UIScale.font(11), color: '#ff8888', fontFamily: 'monospace',
      }).setDepth(25).setOrigin(0, 1);
    } else if (this.matchMode === 'battle') {
      this.gameMode = new BattleMode();
    } else if (this.matchMode === 'tutorial') {
      this.gameMode = new TutorialMode();
    } else if (this.matchMode === 'circle_coop' && this.circle) {
      this.gameMode = new CircleCoopMode();
    } else if (this.matchMode === 'gauntlet') {
      const gauntlet = new GauntletMode(this.faction ?? 'arcane', this.difficulty, this._gauntletOrder);
      this.gameMode = gauntlet;
      // Set initial creep faction and waves for stage 1
      this.creepFaction = gauntlet.getCurrentFaction();
      this.mapDef = gauntlet.getCurrentMap();
      this.waves = gauntlet.getStageWaves();
      this.lives = gauntlet.getLivesPerStage();
      // Rebuild grid with the gauntlet map (was built from default mapId)
      this.grid = new Grid(this.mapDef);
      this.recalculatePaths();
      createCreepAnimations(this, this.creepFaction);
      // Gauntlet HUD: stage indicator
      const factionName = FACTIONS[this.creepFaction]?.name ?? this.creepFaction;
      this._gauntletHud = this.add.text(
        getGridOffsetX() + 8, 4,
        `Stage ${gauntlet.getStageNumber()}/${gauntlet.getTotalStages()}: ${factionName}`,
        { fontSize: UIScale.font(11), color: '#ff6644', fontFamily: 'monospace' }
      ).setDepth(30);
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
      missionRestrictions: this.missionContext?.restrictions ?? null,
    };
    this.gameMode.createUI(gameModeCtx);

    // Coop frontier buff: +50% on baseIncome + per-wave bonus
    // + overcharge / harvest payouts. Balances against the coop
    // kill-gold nerf so the meta-economy path stays compelling.
    if (this.circle && this.gameMode instanceof BaseFrontierMode) {
      this.gameMode.frontierMgr.incomeMultiplier = 1.5;
    }

    this.incomeDisplay = new IncomeDisplay(this);

    // Hide Phaser HUD — DOM takes over.
    // Disable input on ALL hidden Phaser UI so invisible interactive zones
    // don't swallow touches (was previously handled by SidebarOverlay reparenting).
    this.ui.hideAll();
    this.incomeDisplay.hide();
    this.disableHiddenPhaserUI();

    // Core managers
    this.towerMgr = new TowerManager(this, this.grid, this.economy, this.statsTracker, this.eventLog, this.eventBus, this.modifier);
    const leakHandler = this.arenaManager
      ? new HeroLeakHandler(this.arenaManager, this.statsTracker, this.eventLog)
      : this.circle
        ? new CircleLeakHandler(this.circle, this.statsTracker, this.eventLog)
        : new StandardLeakHandler(this.eventLog, this.statsTracker, () => this.towerMgr.towers);
    // Coop kill-gold nerf: with the 50/50 killer-spawner split and
    // teams of 2-4 players, an unscaled mult left coop with way
    // more team gold than solo — players outgrew creep HP fast.
    // 0.7× trims each share to 35% of solo, team total to 70%.
    const circleKillGoldMult = (this.modifier?.killGoldMult ?? 1) * 0.7;
    const circleDeathHandler = this.circle
      ? new CircleDeathHandler(
          this.economy, this.statsTracker, this.eventBus,
          circleKillGoldMult, this.towerOwners, this.circle.playerIndex,
          {
            // Broadcast each local kill so other peers update their
            // rosters + credit their half of the shared gold.
            broadcast: (killedBy, spawnOwnerIndex, goldValue) => {
              this.circle?.broadcast({
                type: 'creep_killed', killedBy, spawnOwnerIndex, goldValue,
              });
            },
            // Route bot-owned kills to their private pools. Bots live
            // on the host only; on clients this resolves to a no-op
            // because `circleBotAI` stays null.
            creditBot: (botIndex, gold) => this.circleBotAI?.creditKill(botIndex, gold),
            isLocalBot: (idx) => !!this.circle?.isBotSlot(idx) && !!this.circleBotAI,
          },
        )
      : null;
    // Stash the circle death handler on the scene so the roster can
    // read per-player kill counts without threading a supplier down
    // through the constructor chain.
    this.circleDeathHandler = circleDeathHandler;
    const deathHandler = circleDeathHandler
      ?? new StandardDeathHandler(this.economy, this.statsTracker, this.eventBus,
          // Hero Defense: 10x creeps so reduce kill gold to 30%
          this.matchMode === 'hero_defense' ? 0.3 : (this.modifier?.killGoldMult ?? 1));
    this.creepMgr = new CreepManager(leakHandler, deathHandler);
    // Shared procedural overlay for all creeps (HP bars, shadows,
    // status rings). Replaces the previous per-creep Graphics — 1
    // render entry instead of N. Depth 10 matches the old per-creep
    // setting so layering stays the same.
    const creepOverlay = this.add.graphics();
    creepOverlay.setDepth(10);
    this.creepMgr.setOverlay(creepOverlay);

    // Wave controller
    this.waveMgr = new WaveController(this.waves, this.spawner, this.sendMgr, {
      canStartWave: () => !!this.currentPath,
      onWaveStart: (wave, waveNum, totalWaves) => {
        this.towerMgr.spawnBroodMotherSwarmlings();
        this.opponentSim?.startWave(wave);
        const creepTypes = [...new Set(wave.groups.map(g => g.creepType))];
        this.eventLog.waveStarted(waveNum, totalWaves, creepTypes);
        this.upcomingWaves.update(waveNum, this.waves);
        this.updateDOMWaves(waveNum);
        this.eventBus.emit('waveStarted', waveNum);
        // Fan waveStarted out to bot economies — they subscribe
        // on their own EventBus instances, not the shared one.
        this.circleBotAI?.creditWaveStart(waveNum);
        this.cpuOpponentAI?.creditWaveStart(waveNum);
        this.gameMode.onWaveStart?.(wave, waveNum);
      },
      onWaveCleared: (waveNum) => {
        this.onWaveCleared(waveNum);
      },
      onStuckForceClear: () => {
        // Wave hung > 30s with creeps alive but nothing spawning.
        // Force-leak the rest so the wave can clear. Player loses
        // lives proportional to the creep count; better than
        // hanging the entire match indefinitely.
        this.creepMgr.forceLeakAllAlive();
        this.eventLog.gameMessage('Wave timed out — remaining creeps escaped.');
      },
    });
    this.eventLog.gameMessage('Game started. Press SPACE for wave 1. [A] to auto-play.');
    Analytics.gameStart(this.matchMode, this.faction ?? 'unknown', this.difficulty, this.mapId);
    Analytics.track('mode_entered', { mode: this.matchMode });
    this._modeEnteredAt = Date.now();

    // Live-capture hook — when ?capture=1 (or localStorage flag) is
    // set, record every human place/upgrade/sell for offline retrain
    // of LearningBrain. No-op when capture mode is off.
    import('../systems/learning/LiveCapture').then(m => {
      if (m.isCaptureEnabled() && this.faction && this.matchMode === 'standard') {
        m.startSession(this.faction, this.difficulty);
      }
    });

    // Signal loading screen that scene is ready (triggers fade-out)
    import('../ui/UIBridge').then(m => m.UIBridge.signalSceneReady());
    this._gameStartTime = Date.now();
    const h = this.difficultyHints;
    this.eventLog.gameMessage(`Difficulty: ${this.difficulty} (HP:${h.toughness}x Count:${h.count}x Spd:${h.speed}x Gold:${h.goldMult}x)`);

    // Graphics layers
    this.terrainMgr = new TerrainManager(this);
    this.gridGraphics = this.add.graphics().setDepth(0); // kept for compatibility
    this.pathGraphics = this.add.graphics().setDepth(1);
    this.hoverGraphics = this.add.graphics().setDepth(20);
    this.rangeGraphics = this.add.graphics().setDepth(19);

    // Sidebar — DOM UI handles all panels now.
    // Hide ALL Phaser sidebar panels on all layouts (desktop, tablet, phone).
    // Don't add EventLog/UpcomingWaves containers — they're DOM-only stubs.
    // Hide + disable interactive on mode-specific Phaser panels (SendPanel, FrontierPanel, etc)
    // so invisible zones don't consume touch events on the game grid.
    this.gameMode.reparentSidebarPanels?.({
      addPanel: (panel: Phaser.GameObjects.Container) => {
        panel.setVisible(false);
        // Recursively disable interactivity on all children
        const disableAll = (c: Phaser.GameObjects.Container) => {
          for (const child of c.list) {
            if ((child as any).disableInteractive) (child as any).disableInteractive();
            if (child instanceof Phaser.GameObjects.Container) disableAll(child);
          }
        };
        disableAll(panel);
      },
    } as any);

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
      const controlBarY = ResponsiveManager.canvasHeight() - GameControlBar.BAR_HEIGHT - UIScale.current.bottomSafeMargin;
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
        () => this.toggleAutoPlay(),
      );
      // Hide Phaser control bar — DOM status bar handles wave/speed/pause.
      // hide() now uses disableInteractive() on all zones so invisible buttons
      // don't consume touches that should go to the DOM tower dock underneath.
      this.controlBar.hide?.();
    }

    // Camera controller: phone gets pinch-to-zoom + viewport clip, desktop gets scroll wheel + buttons
    {
      const canvasW = getCanvasWidth();
      if (ResponsiveManager.isPhone()) {
        const canvasH = ResponsiveManager.canvasHeight();
        // DOM UI overlays are transparent — full viewport for the game
        const viewportH = canvasH;
        this.cameraCtrl = new CameraController(this, canvasW, GAME_HEIGHT, viewportH);
        this.inputMgr.setSidebarCheck(() => this.sidebarOverlay?.isVisible() ?? false);
      } else {
        // Desktop: full canvas for bounds, grid offset for zoom center
        const canvasH = ResponsiveManager.canvasHeight();
        this.cameraCtrl = new CameraController(this, canvasW, canvasH);
        this.cameraCtrl.setCanPanCheck(() => this.selectionMode !== 'build');
        this.cameraCtrl.setGridOffset(getGridOffsetX());
      }
      this.inputMgr.setCameraController(this.cameraCtrl);
      // Tutorial mode: camera stays unlocked so the player can pan /
      // zoom freely. The tutorial's canvas-rect spotlights track the
      // camera via `camera.worldView`, and TutorialManager auto-pans
      // to each step's target on step change so the player never
      // loses the highlighted cell off-screen. Mobile's 2.4x intro
      // zoom + animated zoom-in lives in CameraController — applies
      // to every mobile match, not just the tutorial.
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
            if (this.faction === 'chaos') {
              this.activeTowerIds = msg.towerIds;
              this.towerBar.setTowerIds(this.activeTowerIds); this.syncTowerBarToDOM();
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

      // Chaos faction in versus: host rolls towers for joiner too
      if (this.faction === 'chaos' && this.versus.isHost) {
        // Send the initial pool to joiner (if they're also chaos,
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

      // CPU opponent (local, no networking): spin up a BotAI that
      // places/upgrades/sells on the opponent's shadow grid and
      // publishes each action as a synthetic tower_* message via
      // `versus.injectFromCpu`, so the existing opponent pipeline
      // (opponentTowers, opponentSim.rebuildGrid) stays the single
      // source of truth for the CPU's board.
      if (this.versus.cpuOpponent) {
        this.setupCpuOpponent();
      }

      // Wire versus into the game mode context so sends go to opponent
      gameModeCtx.versus = this.versus;
      this.eventLog.gameMessage('VERSUS MODE — sends go to opponent!');
      // Start initial 60s countdown for first wave
      this.versus.startWaveCountdown(60000);
      if (this.versus.isHost) {
        this.versus.send({ type: 'countdown_start', duration: 60000 });
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

      // Host only: spin up the bot AI driver for any CPU slots. The
      // bot placement callback mirrors the human placement path:
      // deduct from shared gold (placeTower with free=false), record
      // owner as the bot's playerIndex, broadcast with `ownerIndex`
      // so joiners attribute the tower to the bot slot. Skipped
      // entirely if `botSlots` is empty so non-bot matches pay no
      // update-loop cost.
      if (this.circle.isHost && this.circle.botSlots.size > 0) {
        this.circleBotAI = new BotAI(
          this.grid,
          (botIndex, col, row, towerType) => {
            // Bots have private gold — the driver already debited
            // the cost before calling us. Place with `free=true`
            // so TowerManager doesn't also deduct from the shared
            // human economy.
            const placeResult = this.towerMgr.placeTower(col, row, towerType, this.allPaths, () => {
              this.recalculatePaths();
              return this.allPaths;
            }, true);
            if (!placeResult) return { ok: false, upgradeCost: 0, sellValue: 0 };
            // Stamp ownership on the tower itself so TowerManager's
            // per-hit gold sweep routes gold_on_hit / jackpot gold
            // into the bot's economy instead of the shared pool.
            placeResult.tower.ownerIndex = botIndex;
            this.towerOwners.set(`${col},${row}`, botIndex);
            this.circle!.broadcast({
              type: 'tower_placed',
              towerId: towerType.id,
              col, row,
              ownerIndex: botIndex,
            });
            if (placeResult.pathsChanged) {
              this.rerouteCreepsAroundTower(col, row);
              this.drawPath();
            }
            this.circleBotAI?.invalidate();
            return this._placeResultFromTower(placeResult.tower);
          },
          () => this.currentWave,
          () => this.lives,
          () => this.allPaths,
          // Upgrade: level up in-place, broadcast, return fresh stats.
          (_botIndex, col, row, branchId) => {
            const tower = this.towerMgr.getTowerAt(col, row);
            if (!tower || !tower.canUpgrade()) return { ok: false, newLevel: 0, nextUpgradeCost: 0, sellValue: 0 };
            tower.upgrade(branchId ?? null);
            this.circle!.broadcast({ type: 'tower_upgraded', col, row, level: tower.level, branch: branchId ?? undefined });
            const stats = this._placeResultFromTower(tower);
            return {
              ok: true,
              newLevel: tower.level,
              nextUpgradeCost: stats.upgradeCost,
              sellValue: stats.sellValue,
              upgradeBranches: stats.upgradeBranches,
              branchUpgradeCosts: stats.branchUpgradeCosts,
            };
          },
          // Sell: refund goes to bot economy via the driver (free=true
          // keeps human shared gold untouched).
          (_botIndex, col, row) => {
            const result = this.towerMgr.sellTower(col, row, true);
            if (!result) return 0;
            this.towerOwners.delete(`${col},${row}`);
            this.circle!.broadcast({ type: 'tower_sold', col, row });
            if (!result.tower.isMobile) {
              this.recalculatePaths();
              this.drawPath();
            }
            this.circleBotAI?.invalidate();
            return result.refund;
          },
        );
        for (const botIndex of this.circle.botSlots) {
          const fac = this.circle.playerFactions.get(botIndex) as FactionId | undefined;
          const zone = circleMapDef.zones?.[botIndex];
          if (fac && zone) this.circleBotAI.addBot(botIndex, fac, zone, 'balanced');
        }

        // Route per-hit gold (gold_on_hit / jackpot) from bot-owned
        // towers into the correct bot's private economy. Without
        // this, TowerManager defaults every tower's gold to the
        // shared human pool — Void bots would fire Market Towers
        // all match and their +1g/hit would silently fatten the
        // human, not the bot.
        this.towerMgr.botGoldRouter = (ownerIndex, amount) => {
          this.circleBotAI?.creditGold(ownerIndex, amount);
        };

        // Circle Co-op: wire frontier so bots also invest in
        // per-wave income. No sends in co-op (the creep-flow is
        // shared PvE, not competitive), so sendCb stays null. Each
        // bot's frontier pool is seeded from its own faction — the
        // brain pays from its private gold pool and the income
        // bonus pays out on wave clear.
        this.circleBotAI.setMetaCallbacks({
          frontierCb: (botIdx, buildingId) => {
            const botFac = this.circle!.playerFactions.get(botIdx) as FactionId | undefined;
            const pool = botFac === 'chaos'
              ? getAllFactionFrontierBuildings()
              : (botFac ? (FRONTIER_BUILDINGS[botFac] ?? GENERIC_OUTPOSTS) : GENERIC_OUTPOSTS);
            const b = pool.find(b => b.id === buildingId);
            if (!b) return false;
            this.circleBotAI?.addIncomeBonus(botIdx, b.baseIncome);
            this.eventLog.gameMessage(`P${botIdx} [CPU] built ${b.name} (+${b.baseIncome}g/wave).`);
            return true;
          },
          frontierOpts: () => {
            // Report the first bot's frontier pool. Good enough for
            // Circle Co-op — bots share the same faction pool if
            // they share a faction, and the driver re-looks up the
            // actual building from id at purchase time anyway.
            const firstBotIdx = [...this.circle!.botSlots][0];
            if (firstBotIdx === undefined) return [];
            const fac = this.circle!.playerFactions.get(firstBotIdx) as FactionId | undefined;
            const pool = fac === 'chaos'
              ? getAllFactionFrontierBuildings()
              : (fac ? (FRONTIER_BUILDINGS[fac] ?? GENERIC_OUTPOSTS) : GENERIC_OUTPOSTS);
            return pool.map(b => ({ id: b.id, cost: b.cost, income: b.baseIncome }));
          },
          betweenWaves: () => this.betweenWaves,
        });
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
          case 'creep_killed':
            // Apply the same kill accounting the sender already did.
            // Updates our roster's per-player kill count and credits
            // any economy share (self or local bots) we're owed.
            this.circleDeathHandler?.onRemoteKill(msg.killedBy, msg.spawnOwnerIndex, msg.goldValue);
            break;
        }
      };

      // Roster is a DOM panel (see `CircleRosterDOM`) — GameScene
      // just writes snapshots into GameUIStore each frame. Zone
      // colors are stashed here so the per-frame builder can tag
      // each row with the right swatch.
      this._circleZoneColors = mapDef.zoneColors ?? [];

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
    // GameUIStore.activate() reset the DOM state to lives=0, gold=0.
    // Without this sync push, the HUD renders "DEAD" (lives=0) for
    // one frame between create() finishing and the first update()
    // tick — most noticeable when restarting after a loss, where
    // deactivate() had already parked lives at 0.
    const initialDisplayLives = this.arenaManager ? this.arenaManager.baseHp : this.lives;
    GameUIStore.updateEconomy(this.economy.gold, initialDisplayLives, this.incomeMgr.getBreakdown().total);

    // Set up UI camera so HUD stays fixed while game camera zooms/pans (once)
    if (!this.uiCamera) {
      this.setupUiCamera();
    }
  }

  /** Set up dual camera: main camera zooms game objects, UI camera stays at 1x.
   *  UILayer provides factory methods that set camera filters at creation time,
   *  eliminating the need for per-frame fixes or depth-threshold hacks. */
  private setupUiCamera(): void {
    const canvasW = getCanvasWidth();
    const canvasH = ResponsiveManager.canvasHeight();

    // UI camera: full canvas, 1x zoom, no scroll
    this.uiCamera = this.cameras.add(0, 0, canvasW, canvasH);
    this.uiCamera.setScroll(0, 0);
    this.uiCamera.setName('ui');
    this.uiCamera.transparent = true;

    // Create UILayer — the single API for creating UI objects with correct camera filters
    this.uiLayer = new UILayer(this, this.uiCamera);

    // UI camera ignores all existing objects (they're game objects by default)
    for (const child of this.children.list) {
      this.uiCamera.ignore(child);
    }

    // New game objects auto-ignored by UI camera
    this.events.on('addedtoscene', (go: Phaser.GameObjects.GameObject) => {
      if (!this.uiCamera) return;
      this.uiCamera.ignore(go);
    });

    // Existing UI objects (depth >= 28) → register with UILayer
    for (const child of this.children.list) {
      if (((child as any).depth ?? 0) >= 28) {
        this.uiLayer.register(child);
        // Also register children of UI containers
        if ((child as any).list) {
          for (const inner of (child as any).list) {
            this.uiLayer.register(inner);
          }
        }
      }
    }
  }

  // === Selection Mode Management ===

  /** Push tower bar state to the DOM */
  private syncTowerBarToDOM(): void {
    const towers = this.activeTowerIds.map((id, i) => {
      const t = getTowerType(id);
      return { id, name: t.name, cost: t.cost, hotkey: String(i + 1), color: t.color };
    });
    GameUIStore.setTowerBar(towers);
  }

  /** Convert a Tower entity to a TowerStats snapshot for the DOM UI */
  private towerToStats(tower: Tower): TowerStats {
    const traits: string[] = [];
    for (const t of tower.typeDef.traits) {
      switch (t.id) {
        case 'splash_damage': traits.push(`Splash ${((t.radius ?? 0) / TILE_SIZE).toFixed(1)}`); break;
        case 'chain_damage': traits.push(`Chain ${(t.chainCount ?? 2) + 1}`); break;
        case 'teleport_delivery': traits.push('Teleport'); break;
        case 'slow_on_hit': traits.push(`Slow ${Math.round((1 - (t.factor ?? 1)) * 100)}%`); break;
        case 'gold_on_hit': traits.push(`+${t.amount}g/hit`); break;
        case 'crit_chance': traits.push(`${Math.round((t.chance ?? 0.25) * 100)}% crit x${t.multiplier ?? 3}`); break;
        case 'burn_dot': traits.push(`Burn ${t.dps}dps`); break;
        case 'poison_dot': traits.push(`Poison ${Math.round((t.percentPerSec ?? 0.02) * 100)}%/s`); break;
        case 'pierce_delivery': traits.push('Pierce'); break;
        case 'armor_shred_on_hit': traits.push('Armor shred'); break;
        case 'damage_amp_on_hit': traits.push(`+${Math.round((t.ampAmount ?? 0.15) * 100)}% vuln`); break;
        case 'root_on_hit': traits.push(`${Math.round((t.chance ?? 0.2) * 100)}% root`); break;
        case 'adjacency_buff': traits.push('Adj. aura'); break;
        case 'damage_variance': traits.push(`Var ${Math.round((t.min ?? 0.5) * 100)}-${Math.round((t.max ?? 1.5) * 100)}%`); break;
        case 'direct_damage': break;
        default: if (t.id && !t.id.startsWith('_')) traits.push(t.id.replace(/_/g, ' ')); break;
      }
    }
    // Collect all active aura/buff traits. These are internal
    // underscore-prefixed traits that aura towers pump into nearby
    // towers each frame; they drive the "effective" stats below and
    // get surfaced as chips in the info panel.
    const auraBuffs: string[] = [];
    const adjDmg = getTrait(tower.traits, '_adj_damage_buff');
    const adjRate = getTrait(tower.traits, '_adj_rate_buff');
    const spellAmp = getTrait(tower.traits, '_spell_amp_buff');
    const overclock = getTrait(tower.traits, '_overclock_buff');
    const factionRate = getTrait(tower.traits, '_faction_rate_buff');
    const harmDmg = getTrait(tower.traits, '_harmonic_damage');
    const harmRate = getTrait(tower.traits, '_harmonic_rate');
    const harmRange = getTrait(tower.traits, '_harmonic_range');
    const harmCrit = getTrait(tower.traits, '_harmonic_crit');
    const rampUp = getTrait(tower.traits, 'ramp_up');
    if (adjDmg && adjDmg.bonus > 0) auraBuffs.push(`+${adjDmg.bonus} DMG (adj)`);
    if (adjRate && adjRate.bonus > 0) auraBuffs.push(`-${Math.round(adjRate.bonus * 100)}% SPD (adj)`);
    // Harmonic buffs are now multiplier-style (bonus >= 1 = no buff) —
    // display the *effect*, (bonus - 1) * 100, only when actually buffed.
    if (harmDmg && harmDmg.bonus > 1) auraBuffs.push(`+${Math.round((harmDmg.bonus - 1) * 100)}% DMG`);
    if (harmRate && harmRate.bonus > 1) auraBuffs.push(`+${Math.round((harmRate.bonus - 1) * 100)}% SPD`);
    if (harmRange && harmRange.bonus > 1) auraBuffs.push(`+${Math.round((harmRange.bonus - 1) * 100)}% RNG`);
    if (harmCrit && (harmCrit.chance ?? 0) > 0) auraBuffs.push(`${Math.round((harmCrit.chance ?? 0) * 100)}% crit x${harmCrit.multiplier ?? 2}`);
    if (factionRate && factionRate.bonus > 0) auraBuffs.push(`-${Math.round(factionRate.bonus * 100)}% SPD (faction)`);
    if (spellAmp && spellAmp.bonus > 0 && tower.damageType === 'magic') auraBuffs.push(`+${Math.round(spellAmp.bonus * 100)}% magic`);
    if (overclock && overclock.bonus > 0) auraBuffs.push(`-${Math.round(overclock.bonus * 100)}% SPD (OC)`);
    if (rampUp && (rampUp._stacks ?? 0) > 0) {
      const stacks = rampUp._stacks as number;
      const perStack = (rampUp.reductionPerStack ?? 0.08) as number;
      const maxStacks = (rampUp.maxStacks ?? 5) as number;
      const reduction = Math.min(stacks * perStack, maxStacks * perStack);
      auraBuffs.push(`Ramp ${stacks}/${maxStacks} (-${Math.round(reduction * 100)}% SPD)`);
    }

    // Effective (post-buff) stats. Damage mirrors the runtime pipeline
    // in resolveDamageModifiers: flat adj bonus → harmonic-damage
    // multiplier (>=1, identity 1) → spell-amp (magic-only, additive
    // fraction). Fire rate goes through tower.getEffectiveFireRate()
    // so display is always consistent with runtime shot pacing.
    // tower.range is already the post-aura value (TowerManager applies
    // the harmonic-range multiplier in its second pass), so we read it
    // directly — no further bonus addition.
    let effDmg = tower.damage;
    if (adjDmg && adjDmg.bonus > 0) effDmg += adjDmg.bonus;
    if (harmDmg && harmDmg.bonus > 1) effDmg = Math.round(effDmg * harmDmg.bonus);
    if (spellAmp && spellAmp.bonus > 0 && tower.damageType === 'magic') effDmg = Math.round(effDmg * (1 + spellAmp.bonus));
    const effFireRate = tower.getEffectiveFireRate();
    const effRange = tower.range / TILE_SIZE;

    // Build the multi-option upgrade list (one entry per available
    // path — linear towers get length 1, branching towers get 2+).
    // Delta strings are precomputed relative to the tower's current
    // base stats so the UI only has to render text.
    const rawOptions = tower.getUpgradeOptions();
    // Upgrade RNG deltas compare against the *pre-aura* base range
    // (`_basePxRange`) — not `tower.range`, which is post-aura and
    // would make a +0.5 tile upgrade look like -2 tiles when buffed.
    const baseRangeTiles = tower._basePxRange / TILE_SIZE;
    const makeDelta = (o: { damage: number; range: number; fireRate: number }) => {
      const dd = o.damage - tower.damage;
      const dr = o.range - baseRangeTiles;
      const ds = o.fireRate - tower.fireRate;
      return {
        dmg: dd !== 0 ? `${dd > 0 ? '+' : ''}${dd} DMG` : '',
        rng: dr !== 0 ? `${dr > 0 ? '+' : ''}${dr.toFixed(1)} RNG` : '',
        spd: ds !== 0 ? `${ds}ms SPD` : '',
      };
    };
    const upgradeOptions: TowerUpgradeOption[] = rawOptions.map(o => ({
      branchId: o.branchId,
      label: o.label,
      cost: o.cost,
      resolvedName: o.resolvedName,
      ...makeDelta(o),
    }));
    const defaultOpt = upgradeOptions.find(o => o.branchId === null);
    const upgradePreview: TowerStats['upgradePreview'] = defaultOpt
      ? { dmg: defaultOpt.dmg, rng: defaultOpt.rng, spd: defaultOpt.spd }
      : null;

    return {
      name: tower.displayName ?? tower.typeDef.name,
      level: tower.level,
      maxLevel: tower.typeDef.upgrades.length + 1,
      cost: tower.typeDef.cost,
      sellValue: tower.getSellValue(),
      damage: tower.damage,
      range: tower._basePxRange / TILE_SIZE,
      fireRate: tower.fireRate,
      effectiveDamage: effDmg,
      effectiveRange: effRange,
      effectiveFireRate: effFireRate,
      damageType: tower.damageType,
      isUltimate: tower.typeDef.ultimate === true,
      canUpgrade: tower.canUpgrade(),
      upgradeCost: defaultOpt ? defaultOpt.cost : 0,
      owned: this.canModifyTower(tower.col, tower.row),
      traits,
      auraBuffs,
      upgradePreview,
      upgradeOptions,
      _tower: tower,
    };
  }

  /** Convert wave data to previews for the DOM UI */
  private updateDOMWaves(currentWave: number): void {
    const previews: { waveNum: number; label: string; creepTypes: string; count: number; isBoss: boolean }[] = [];
    for (let i = 0; i < 3; i++) {
      const idx = currentWave + i;
      if (idx >= this.waves.length) break;
      const w = this.waves[idx];
      const types = w.groups.map(g => g.creepType).filter((v, j, a) => a.indexOf(v) === j).join(', ');
      const count = w.groups.reduce((s, g) => s + g.count, 0);
      const isBoss = w.groups.some(g => g.creepType === 'boss');
      previews.push({
        waveNum: idx + 1,
        label: i === 0 ? `W${idx + 1}` : `+${i + 1} W${idx + 1}`,
        creepTypes: types,
        count,
        isBoss,
      });
    }
    GameUIStore.updateWaves(currentWave, previews);
  }

  /** Place a pixel art doodad on a random blocked terrain cell.
   *  Looks up art by building ID first, then falls back to faction, then generic. */
  placeFrontierDoodad(color: number = 0xffaa44, buildingId: string = 'generic', factionFallback?: string): Phaser.GameObjects.Image | null {
    void color; // reserved for future palette tinting
    const blocked: { col: number; row: number }[] = [];
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        if (this.grid.cells[r][c] === CellType.Blocked) blocked.push({ col: c, row: r });
      }
    }
    if (blocked.length === 0) return null;
    const cell = blocked[Math.floor(Math.random() * blocked.length)];
    const px = gridX(cell.col) + (Math.random() - 0.5) * TILE_SIZE * 0.4;
    const py = gridY(cell.row) + (Math.random() - 0.5) * TILE_SIZE * 0.4;

    // Render doodad sprite to a small canvas, then add as Phaser image
    const drawFn = DOODAD_DRAW[buildingId] ?? (factionFallback ? DOODAD_DRAW[factionFallback] : undefined) ?? DOODAD_DRAW.generic;
    const canvas = document.createElement('canvas');
    canvas.width = DOODAD_CELL; canvas.height = DOODAD_CELL;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    drawFn(ctx, 0, 0);

    const texKey = `doodad_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.textures.addCanvas(texKey, canvas);
    const img = this.add.image(px, py, texKey).setDepth(3);
    img.setScale(TILE_SIZE / DOODAD_CELL * 0.7); // slightly smaller than a tile
    img.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    return img;
  }

  private enterBuildMode(typeId: string): void {
    this.selectionMode = 'build';
    this.selectedBuildType = typeId;
    this.selectedTower = null;
    this.towerInfo?.hide();
    GameUIStore.deselectTower();
    GameUIStore.selectDockTower(this.activeTowerIds.indexOf(typeId));
    this.opponentMinimap?.setFaded(true);
  }

  private enterInspectMode(tower: Tower): void {
    this.selectionMode = 'inspect';
    this.selectedBuildType = null;
    this.selectedTower = tower;
    this.selectedCreep = null;
    this.towerBar.deselect();
    GameUIStore.selectTower(this.towerToStats(tower));
    GameUIStore.deselectCreep();
    // Draw range circle on the game canvas
    this.rangeGraphics.clear();
    this.rangeGraphics.lineStyle(1, 0xffffff, 0.2);
    this.rangeGraphics.strokeCircle(tower.x, tower.y, tower.range);
  }

  private enterNoneMode(): void {
    this.selectionMode = 'none';
    this.selectedBuildType = null;
    this.selectedTower = null;
    this.selectedCreep = null;
    this.linkingConduit = null;
    this.towerBar.deselect();
    this.towerInfo.hide();
    GameUIStore.deselectTower();
    this.rangeGraphics.clear();
    GameUIStore.selectDockTower(-1);
    this.opponentMinimap?.setFaded(false);
    GameUIStore.deselectCreep();
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
    // Only clear the range circle if we're not inspecting a placed tower —
    // otherwise hovering over the map would wipe the selected tower's range.
    if (this.selectionMode !== 'inspect') {
      this.rangeGraphics.clear();
    }

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
    this.inputMgr.dbg(`CLICK ${col},${row} mode=${this.selectionMode} build=${this.selectedBuildType ?? 'null'}`);
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
          if (existingTower === this.selectedTower && existingTower.canUpgrade() && this.canModifyTower(existingTower.col, existingTower.row)) {
            const cost = existingTower.getUpgradeCost();
            if (this.economy.spend(cost)) {
              existingTower.upgrade();
              GameUIStore.selectTower(this.towerToStats(existingTower));
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
    GameUIStore.deselectTower();
    GameUIStore.selectCreep(this.creepToStats(creep));
  }

  /** Build a CreepStats snapshot from a live Creep. Cheap — only small
   *  allocations and primitive field reads. Called every frame while
   *  inspecting; GameUIStore.updateSelectedCreep skips the re-render
   *  when nothing has changed, so the 60Hz cadence is effectively free
   *  when a creep walks uncontested. */
  private creepToStats(c: Creep): import('../ui/GameUIStore').CreepStats {
    const factionName = c.creepFaction ? (FACTIONS[c.creepFaction]?.name ?? '') : '';
    const displayName = factionName ? `${factionName} ${c.creepType.name}` : c.creepType.name;
    const factionColor = c.creepFaction && FACTIONS[c.creepFaction]
      ? '#' + FACTIONS[c.creepFaction]!.primaryColor.toString(16).padStart(6, '0')
      : null;

    const effects: import('../ui/GameUIStore').CreepEffect[] = [];
    for (const e of c.statusEffects.effects) {
      const durS = Math.round(e.duration / 100) / 10;
      let label: string;
      switch (e.type) {
        case 'slow':        label = `Slow ${Math.round((1 - e.magnitude) * 100)}%`; break;
        case 'burn':        label = `Burn ${e.magnitude}dps`; break;
        case 'poison':      label = `Poison ${Math.round(e.magnitude * 100)}%/s`; break;
        case 'root':        label = 'Rooted'; break;
        case 'armor_shred': label = `Armor -${e.magnitude}`; break;
        case 'damage_amp':  label = `Vuln +${Math.round(e.magnitude * 100)}%`; break;
        default:            label = e.type;
      }
      effects.push({ label, durationS: durS, kind: e.type });
    }

    const traits: string[] = [];
    for (const t of c.traits) {
      if (t.id === 'shield') {
        const maxShield = Math.floor(c.maxHp * ((t as any).hpPercent ?? 0.3));
        traits.push(`Shield: ${(t as any)._shieldHp ?? 0}/${maxShield}`);
      } else if (t.id === 'heal_aura') {
        traits.push('Heal aura (3% nearby/s)');
      }
    }

    return {
      name: displayName,
      factionColor,
      isBoss: c.isBoss,
      hp: c.hp,
      maxHp: c.maxHp,
      armor: c.armor,
      baseArmor: c.baseArmor,
      speed: c.speed,
      baseSpeed: c.baseSpeed,
      effects,
      traits,
      _creep: c,
    };
  }

  /**
   * Circle co-op: returns false if this tower belongs to another
   * player (human or bot) — gates upgrade and sell so you can't
   * spend your gold on someone else's tower.
   */
  /** Build the PlaceResult / UpgradeResult payload the bot driver
   *  needs from a Tower reference. Centralised so the Circle Co-op
   *  and 1v1 CPU paths stay in lock-step on what branch metadata
   *  looks like after place/upgrade. */
  private _placeResultFromTower(t: Tower) {
    const options = t.getUpgradeOptions();
    const defaultOpt = options.find(o => o.branchId === null);
    const branches = options.filter(o => o.branchId !== null);
    const branchUpgradeCosts: Record<string, number> = {};
    for (const b of branches) if (b.branchId) branchUpgradeCosts[b.branchId] = b.cost;
    return {
      ok: true,
      upgradeCost: defaultOpt ? defaultOpt.cost : 0,
      sellValue: t.getSellValue(),
      upgradeBranches: branches.map(b => b.branchId!).filter((id): id is string => !!id),
      branchUpgradeCosts,
    };
  }

  canModifyTower(col: number, row: number): boolean {
    if (!this.circle) return true;
    const owner = this.towerOwners.get(`${col},${row}`);
    return owner === undefined || owner === this.circle.playerIndex;
  }

  /**
   * 1v1 Versus CPU opponent setup. Builds a private grid + BotAI
   * whose place/upgrade/sell operations synthesize `tower_*`
   * messages into the VersusManager — from the rest of the scene's
   * point of view, an invisible peer is playing on the other side.
   * Cheap: the CPU side is not a real Phaser simulation, just the
   * existing OpponentSimulation driven by the bot's placements.
   */
  private setupCpuOpponent(): void {
    if (!this.versus || !this.opponentSim) return;
    const CPU_INDEX = 1; // arbitrary non-0 index — the human is 0
    const cpuGrid = new Grid(this.getMapDef());
    // Full-grid candidate set — unlike Circle Co-op, no zone
    // restriction. Every placeable cell is fair game for the bot.
    const candidates: { col: number; row: number }[] = [];
    for (let r = 0; r < cpuGrid.cells.length; r++) {
      for (let c = 0; c < cpuGrid.cells[r].length; c++) {
        if (cpuGrid.canPlaceTower(c, r)) candidates.push({ col: c, row: r });
      }
    }

    // Synthesise `tower_placed` / `tower_upgraded` / `tower_sold`
    // into the VersusManager so OpponentSimulation + minimap see
    // the bot's board as though a real remote peer were playing it.
    const injectPlaced = (towerId: string, col: number, row: number) => {
      this.versus!.injectFromCpu({ type: 'tower_placed', towerId, col, row });
    };
    const injectUpgraded = (col: number, row: number, level: number) => {
      this.versus!.injectFromCpu({ type: 'tower_upgraded', col, row, level });
    };
    const injectSold = (col: number, row: number) => {
      this.versus!.injectFromCpu({ type: 'tower_sold', col, row });
    };

    // Helper to look up the last-placed tower def for deriving
    // upgrade cost / sell value + any branches available at the
    // current upgrade point. Without a live Tower instance we work
    // directly off the TowerType definitions.
    const derive = (towerId: string, level: number) => {
      const def = TOWER_TYPES[towerId];
      if (!def) return { upgradeCost: 0, sellValue: 0, upgradeBranches: [], branchUpgradeCosts: {} };
      const upg = def.upgrades[level - 1];
      const totalCost = def.cost + def.upgrades.slice(0, level - 1).reduce((s, u) => s + u.cost, 0);
      const branches = upg?.branches ?? [];
      const branchUpgradeCosts: Record<string, number> = {};
      for (const b of branches) {
        const target = TOWER_TYPES[b.transformsTo];
        if (target) branchUpgradeCosts[b.id] = target.cost;
      }
      return {
        upgradeCost: upg?.cost ?? 0,
        sellValue: Math.round(totalCost * 0.75),
        upgradeBranches: branches.map(b => b.id),
        branchUpgradeCosts,
      };
    };

    this.cpuOpponentAI = new BotAI(
      cpuGrid,
      (_botIdx, col, row, towerType) => {
        if (!cpuGrid.canPlaceTower(col, row)) return { ok: false, upgradeCost: 0, sellValue: 0 };
        cpuGrid.placeTower(col, row);
        injectPlaced(towerType.id, col, row);
        this.opponentSim?.rebuildGrid();
        this.cpuOpponentAI?.invalidate();
        // derive() returns both the linear next-upgrade cost AND any
        // branch info — surfaces Bramble → Razor for the brain.
        const stats = derive(towerType.id, 1);
        return { ok: true, ...stats };
      },
      () => this.currentWave,
      () => this.versus?.opponentLives ?? 0,
      () => {
        // Supply every entry→exit path on the CPU grid so the
        // brain's maze/DPS scoring runs against the right graph.
        const paths: (PathPoint[] | null)[] = [];
        for (const entry of cpuGrid.entries) {
          for (const exit of cpuGrid.exits) {
            paths.push(findPath(cpuGrid, entry, exit));
          }
        }
        return paths;
      },
      (_botIdx, col, row, branchId) => {
        const t = this.versus!.opponentTowers.find(x => x.col === col && x.row === row);
        if (!t) return { ok: false, newLevel: 0, nextUpgradeCost: 0, sellValue: 0 };
        const def = TOWER_TYPES[t.towerId];
        if (!def) return { ok: false, newLevel: t.level, nextUpgradeCost: 0, sellValue: 0 };
        const upg = def.upgrades[t.level - 1];
        if (!upg) return { ok: false, newLevel: t.level, nextUpgradeCost: 0, sellValue: 0 };
        // Branch path: swap the stored towerId so subsequent
        // upgrades pull from the target TowerType's ladder.
        if (branchId && upg.branches) {
          const branch = upg.branches.find(b => b.id === branchId);
          const target = branch ? TOWER_TYPES[branch.transformsTo] : null;
          if (!target) return { ok: false, newLevel: t.level, nextUpgradeCost: 0, sellValue: 0 };
          t.towerId = target.id;
          t.level = upg.level;
          injectUpgraded(col, row, t.level);
          this.versus!.injectFromCpu({ type: 'tower_upgraded', col, row, level: t.level, branch: branchId });
          const stats = derive(t.towerId, t.level);
          return {
            ok: true, newLevel: t.level,
            nextUpgradeCost: stats.upgradeCost, sellValue: stats.sellValue,
            upgradeBranches: stats.upgradeBranches, branchUpgradeCosts: stats.branchUpgradeCosts,
          };
        }
        // Default (linear) path.
        t.level += 1;
        injectUpgraded(col, row, t.level);
        const stats = derive(t.towerId, t.level);
        return {
          ok: true, newLevel: t.level,
          nextUpgradeCost: stats.upgradeCost, sellValue: stats.sellValue,
          upgradeBranches: stats.upgradeBranches, branchUpgradeCosts: stats.branchUpgradeCosts,
        };
      },
      (_botIdx, col, row) => {
        const idx = this.versus!.opponentTowers.findIndex(x => x.col === col && x.row === row);
        if (idx < 0) return 0;
        const t = this.versus!.opponentTowers[idx];
        const def = TOWER_TYPES[t.towerId];
        if (!def) return 0;
        const totalCost = def.cost + def.upgrades.slice(0, t.level - 1).reduce((s, u) => s + u.cost, 0);
        const refund = Math.round(totalCost * 0.75);
        cpuGrid.removeTower(col, row);
        injectSold(col, row);
        this.opponentSim?.rebuildGrid();
        this.cpuOpponentAI?.invalidate();
        return refund;
      },
    );
    this.cpuOpponentAI.addBot(CPU_INDEX, this.versus.cpuFaction as FactionId, candidates, this.versus.cpuBrainId);

    // Wire the meta economy: sends + frontier buildings. The human's
    // sends land on the CPU's shadow sim (so send is no longer
    // cosmetic in CPU matches), and the bot can purchase its own
    // sends / frontier to build income and pressure the human.
    const cpuFaction = this.versus.cpuFaction as FactionId;
    const frontierPool = cpuFaction === 'chaos'
      ? getAllFactionFrontierBuildings()
      : (FRONTIER_BUILDINGS[cpuFaction] ?? GENERIC_OUTPOSTS);
    this.cpuOpponentAI.setMetaCallbacks({
      // Human sends land on CPU shadow sim.
      // (Wired on versus below — this block only sets up the bot's
      // purchase pipeline; receiving happens via cpuSendReceiver.)
      sendCb: (_idx, optionId, _cost, income) => {
        const opt = SEND_OPTIONS.find(o => o.id === optionId);
        if (!opt) return false;
        // Queue creeps on the HUMAN's sendMgr — the bot's send is
        // additional pressure on us, mirroring how a human opponent
        // sending would arrive in our `incomingSends` queue.
        this.sendMgr.queueSend(opt);
        this.eventLog.gameMessage(`CPU sent ${opt.name}!`);
        this.versus!.sendsReceived++;
        this.cpuOpponentAI?.addIncomeBonus(1, income);
        return true;
      },
      frontierCb: (_idx, buildingId) => {
        const b = frontierPool.find(b => b.id === buildingId);
        if (!b) return false;
        // We don't simulate the faction-specific mechanic (dig /
        // overcharge / grow / gamble) for the CPU — a flat income
        // bump matches baseIncome closely enough and avoids a
        // headless FrontierManager per bot.
        this.cpuOpponentAI?.addIncomeBonus(1, b.baseIncome);
        this.eventLog.gameMessage(`CPU built ${b.name} (+${b.baseIncome}g/wave).`);
        return true;
      },
      sendOpts: () => {
        const wave = this.currentWave;
        return SEND_OPTIONS.map(opt => ({
          id: opt.id,
          cost: getSendCost(opt.cost, wave),
          income: getSendIncome(opt.incomeReward, wave),
          unlocked: wave >= opt.unlockWave,
        }));
      },
      frontierOpts: () => frontierPool.map(b => ({ id: b.id, cost: b.cost, income: b.baseIncome })),
      betweenWaves: () => this.betweenWaves,
    });

    // Install the send receiver so the human's `versus.send` for
    // `send_purchased` actually lands on the CPU's shadow sim.
    this.versus.cpuSendReceiver = (sendOptionId) => {
      const opt = SEND_OPTIONS.find(o => o.id === sendOptionId);
      if (opt) this.opponentSim?.enqueueSend(opt);
    };

    this.eventLog.gameMessage(`CPU opponent: ${this.versus.cpuFaction} (${this.versus.cpuBrainId})`);
    // Mark the CPU as ready immediately so the initial 60s
    // pre-wave-1 countdown can be skipped by the human hitting
    // ready. We re-fire wave_ready after every CPU wave clear
    // (see the update loop) so the flag resets properly.
    this.versus.injectFromCpu({ type: 'wave_ready' });
  }

  handleRightClick(col: number, row: number): void {
    // Circle co-op: can only sell your own towers
    if (!this.canModifyTower(col, row)) return;

    // Capture BEFORE the sell mutates state so the recorded
    // snapshot reflects what the player saw at decision time.
    this._captureHumanAction({ kind: 'sell', col, row });

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

  /** Build a synthetic BotContext + record one human action through
   *  LiveCapture. No-op when capture mode is off. Errors are
   *  swallowed inside the capture module. */
  private _captureHumanAction(decision: any): void {
    if (!this.faction) return;
    void import('../systems/learning/LiveCapture').then(m => {
      if (!m.isCaptureEnabled()) return;
      // Convert live tower instances → PlacedTower shape the
      // featurizer expects.
      const placed = this.towerMgr.towers
        .filter(t => (t as any).ownerIndex === undefined)
        .map(t => ({
          col: t.col, row: t.row, towerId: t.typeId, level: t.level,
          upgradeCost: 0, upgradeBranches: [], branchUpgradeCosts: {}, sellValue: 0,
        }));
      const ctx = m.buildCtxFromSnapshot({
        faction: this.faction!,
        wave: this.currentWave,
        lives: this.lives,
        budget: this.economy?.gold ?? 0,
        candidateCells: [],
        placedTowers: placed,
        allPaths: this.allPaths,
        betweenWaves: this.betweenWaves,
      });
      m.recordAction(ctx, decision);
    });
  }

  private tryBuildTower(col: number, row: number): void {
    if (!this.selectedBuildType) return;
    // Circle co-op: zone restriction
    if (!this.canBuildInZone(col, row)) return;

    const towerType = getTowerType(this.selectedBuildType);

    // Plan 14: enforce campaign mission restrictions at the placement
    // gate. allowedTowerIds + allowedFactions filter the kit; maxTowers
    // caps non-wall placements; noWalls bans wall-class towers entirely.
    if (this.missionContext?.restrictions) {
      const r = this.missionContext.restrictions;
      if (r.allowedTowerIds && !r.allowedTowerIds.includes(towerType.id)) return;
      if (r.allowedFactions && towerType.faction && !r.allowedFactions.includes(towerType.faction)) return;
      if (r.noWalls && isWallTower(towerType.id)) return;
      if (r.maxTowers !== undefined) {
        const placed = this._towers.filter(t => !isWallTower(t.typeId)).length;
        if (placed >= r.maxTowers) return;
      }
    }

    // Capture BEFORE placement so the snapshot is the pre-action state.
    this._captureHumanAction({ kind: 'place', col, row, type: towerType });

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
      this.rerouteCreepsAroundTower(col, row);
      this.drawPath();
    }
  }

  /** Debug: ms accumulated since we last printed the stuck-creep
   *  roster (throttle so the console doesn't flood). */
  private _stuckCreepLogElapsed: number = 0;

  /**
   * If the wave has been active too long, print each alive creep's
   * position + pathIndex + path length so the dev can see which
   * creep (or creeps) is stuck. Pairs with WaveController's
   * "wave stuck" line — that one tells you the category of
   * blockage, this one identifies the specific creep.
   */
  /** Build the roster snapshot from live Circle state + suppliers
   *  and push it into GameUIStore. CircleRosterDOM reads from
   *  there and renders. Called each frame; the store skips the
   *  notify when nothing changed (shallow-equal check). */
  private publishCircleRoster(): void {
    if (!this.circle) { GameUIStore.setCircleRoster(null); return; }
    const botGold = this.circleBotAI?.getBotGold() ?? new Map<number, number>();
    const kills = this.circleDeathHandler?.getKillsByPlayer() ?? new Map<number, number>();
    const owners = this.towerOwners;
    const players: CircleRosterPlayer[] = [];
    for (let i = 0; i < this.circle.playerCount; i++) {
      const color = this._circleZoneColors[i] ?? 0xffffff;
      const colorHex = '#' + color.toString(16).padStart(6, '0');
      const isMe = i === this.circle.playerIndex;
      const isBot = this.circle.isBotSlot(i);
      const ready = isMe ? this.circle.localReady : this.circle.playersReady.has(i);
      let towers = 0;
      for (const owner of owners.values()) if (owner === i) towers++;
      players.push({
        index: i,
        kind: isMe ? 'me' : isBot ? 'bot' : 'remote',
        faction: this.circle.playerFactions.get(i) ?? '',
        colorHex,
        ready,
        gold: isBot ? (botGold.get(i) ?? 0) : null,
        towers,
        kills: kills.get(i) ?? 0,
      });
    }
    GameUIStore.setCircleRoster({
      players,
      timerS: this.circle.waveTimerActive ? this.circle.getWaveTimerSeconds() : -1,
      sharedLives: this.lives,
    });
  }

  private diagLogStuckCreeps(delta: number): void {
    if (!DEBUG) return;
    if (!this.waveActive) {
      this._stuckCreepLogElapsed = 0;
      return;
    }
    this._stuckCreepLogElapsed += delta;
    // Match the WaveController gate so logs from both systems line up.
    if (this._stuckCreepLogElapsed < 5000) return;
    if (this._stuckCreepLogElapsed % 3000 > delta) return; // roughly every 3s
    if (this.creeps.length === 0) return;
    const rows = this.creeps.slice(0, 8).map((c) => {
      const col = pixelToCol(c.x);
      const row = Math.round((c.y - TILE_SIZE / 2) / TILE_SIZE);
      return `${c.creepTypeId}@(${col},${row}) idx=${c.pathIndex}/${c.path.length} reached=${c.reached} alive=${c.alive}`;
    });
    console.warn('[wave] stuck creeps:\n  ' + rows.join('\n  '));
  }

  /**
   * Re-route creeps whose remaining path passes through the newly-
   * placed tower cell. Delegates to Creep.rerouteViaWaypoints which
   * re-runs findPathWithWaypoints through the creep's REMAINING
   * (unvisited) waypoints to the spawner's exit — preserves both
   * direction and traversal goal on Circle Co-op maps where the
   * exit is at the same cell as the entry.
   *
   * Creeps whose remaining path doesn't hit the tower are left
   * alone (no wasted pathfinding work).
   */
  private rerouteCreepsAroundTower(towerCol: number, towerRow: number): void {
    for (const creep of this.creepMgr.creeps) {
      if (!creep.alive || creep.reached) continue;
      const remaining = creep.path.slice(creep.pathIndex);
      const hitByTower = remaining.some(p => p.col === towerCol && p.row === towerRow);
      if (!hitByTower) continue;

      const creepCol = pixelToCol(creep.x);
      const creepRow = Math.round((creep.y - TILE_SIZE / 2) / TILE_SIZE);
      const current: PathPoint = { col: creepCol, row: creepRow };

      // Creep-side reroute handles both the waypoint path (circle
      // co-op) and the simple destination case (everywhere else).
      if (creep.rerouteViaWaypoints(this.grid, current)) continue;

      // Fallback for creeps with no spawner metadata — just try to
      // reach whatever the final cell of the original path was.
      const dest = creep.path[creep.path.length - 1];
      const newPath = findPath(this.grid, current, dest);
      if (newPath) {
        creep.path = newPath;
        creep.pathIndex = 1;
      }
    }
  }

  // === Game Loop ===

  update(time: number, delta: number): void {
    if (this.paused) return;

    // Path flow indicator (uses real delta — visual effect is independent
    // of game speed). Dims while a wave is active so it doesn't compete
    // with the live creeps.
    this.updatePathFlow(delta);

    // Plan 14: track minimum hero HP fraction during the run for the
    // "Hero never falls below 50% HP" star objective. Sampled once per
    // frame; no allocation in steady state.
    if (this.missionContext && this.arenaManager?.hero) {
      const h = this.arenaManager.hero;
      if (h.maxHp > 0) {
        const frac = Math.max(0, h.hp / h.maxHp);
        if (frac < this._missionHeroHpMinFraction) this._missionHeroHpMinFraction = frac;
      }
    }

    // Apply game speed
    delta *= this.gameSpeed;
    if (delta === 0) return; // speed 0 = paused

    // Tower updates: aura resets, trait updates, gold/damage collection, fire.
    // Pass justDiedCreeps so life_on_kill (Celestial) can react to deaths from
    // the previous frame — the list is populated in processKills before the
    // dead-creep filter runs, then read here.
    this.towerMgr.updateTowers(time, delta, this.creepMgr.creeps, this.creepMgr.justDiedCreeps);

    // Keep the selected tower's range circle in sync with its position
    // (mobile units move) and persistent across other graphics clears.
    if (this.selectedTower && !(this.selectedTower as any)._expired) {
      this.rangeGraphics.clear();
      this.rangeGraphics.lineStyle(1, 0xffffff, 0.2);
      this.rangeGraphics.strokeCircle(this.selectedTower.x, this.selectedTower.y, this.selectedTower.range);

      // Refresh the info-panel snapshot a few times per second so
      // aura buffs and effective stats update live while the player
      // keeps a tower selected. Buff traits refresh every 200ms, so
      // 250ms cadence is enough to stay in sync without re-rendering
      // the DOM on every tick.
      this._infoRefreshAccum = (this._infoRefreshAccum ?? 0) + delta;
      if (this._infoRefreshAccum >= 250) {
        this._infoRefreshAccum = 0;
        GameUIStore.selectTower(this.towerToStats(this.selectedTower));
      }
    }

    // Creep updates: movement, leak handling, kill processing, cleanup
    const leakResult = this.creepMgr.update(delta);
    // After all creeps have moved and been culled, repaint the shared
    // overlay (HP bars, shadows, status rings) in one pass.
    this.creepMgr.drawAll();
    // Non-circle modes (standard / hero defense / versus): this.lives
    // is authoritative. Circle mode has TWO life pools (local
    // this.lives + circle.sharedLives) that are kept synchronised by
    // the sync block later in this update tick; for circle mode the
    // decrement has already happened inside `CircleLeakHandler`
    // (→ circle.deductLives), and the sync block copies sharedLives
    // into this.lives. Double-decrementing here would over-report
    // damage when sharedLives is pulled back into this.lives.
    if (!this.circle) {
      this.lives -= leakResult.totalLeakDamage;
    }

    // Clean up expired towers
    this.towerMgr.cleanupExpired();

    // Spawning + wave clear detection
    this.waveMgr.updateSpawning(delta, this.allPaths, this.currentPath, this.creeps);
    this.waveMgr.checkWaveComplete(this.creeps.length, delta);

    // When a wave has been active well past its expected duration,
    // also log each alive creep's state periodically. This pairs
    // with the "wave N stuck" line from WaveController and shows
    // exactly which creep(s) are the problem.
    this.diagLogStuckCreeps(delta);

    // While the continue-ad modal is up the game visibly freezes —
    // early-return here prevents the defeat branch from re-firing
    // every frame while the player is deciding, and keeps creeps +
    // towers static so the revive lands the player back on the
    // exact same board state.
    if (this._awaitingContinueDecision) return;

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
      this.offerContinueOrGameOver(!!isHeroDead);
      return;
    }

    // Check if opponent lost in versus
    if (this.versus?.opponentGameOver) {
      this.versus.notifyGameOver(true, this.statsTracker.stats, this.currentWave, this.lives);
      this.goToGameOver(true);
      return;
    }

    if (this.waveMgr.isComplete() && this.creeps.length === 0 && this.matchMode !== 'endless') {
      // Gauntlet: stage transition instead of game over
      if (this.matchMode === 'gauntlet' && !this._gauntletTransitioning) {
        const gauntlet = this.gameMode as any;
        if (gauntlet && typeof gauntlet.hasNextStage === 'function' && gauntlet.hasNextStage()) {
          this._gauntletTransitioning = true;
          this.startGauntletTransition(gauntlet);
          return;
        }
      }
      if (this._gauntletTransitioning) return; // still transitioning

      this.eventBus.emit('gameWon');
      if (this.versus) {
        this.versus.notifyGameOver(true, this.statsTracker.stats, this.currentWave, this.lives);
      }
      if (this.circle) {
        this.circle.broadcast({ type: 'circle_victory', winnerIndex: this.circle.playerIndex });
      }
      // Native achievement unlock. No-op on web / platforms without
      // a registered achievement id. Fire-and-forget — a failed
      // unlock shouldn't block the goToGameOver hand-off.
      if (this.matchMode !== 'tutorial') {
        void unlockAchievement('FIRST_WIN');
      }
      // Tutorial match: skip the GameOverScene hand-off so the player
      // stays inside the match while the tutorial's closing popover
      // (with "Back to Menu" CTA) sits over the live board. Prevents
      // the victory screen from flashing over the popover.
      if (this.matchMode === 'tutorial') return;
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
    GameUIStore.updateEconomy(this.economy.gold, displayLives, this.incomeMgr.getBreakdown().total);
    // Demote 3× → 2× the moment the boost lapses so the UI + game
    // stay in sync. Cheap check (just a timestamp compare).
    this.reconcileSpeedToBoostState();
    const boostSec = Math.ceil(this.speedBoostRemainingMs() / 1000);
    GameUIStore.updateGameState(this.waveActive, this.betweenWaves, this.gameSpeed, versusTimer, boostSec);
    this.incomeDisplay.update(this.incomeMgr.getBreakdown());
    // Refresh inspected creep — store skips the re-render when the snapshot
    // hasn't changed, so this is essentially free when the creep is uncontested.
    if (this.selectedCreep) {
      if (!this.selectedCreep.alive) {
        this.selectedCreep = null;
        GameUIStore.deselectCreep();
        if (this.selectionMode === 'inspect_creep') this.selectionMode = 'none';
      } else {
        GameUIStore.updateSelectedCreep(this.creepToStats(this.selectedCreep));
      }
    }
    this.statsTracker.updateTime(delta);

    // Mode-specific per-frame update (essence ticking, arena, etc.)
    this.gameMode.update(delta);

    // Phone control bar
    if (this.controlBar) {
      this.controlBar.setState(this.waveActive, this.betweenWaves, this.currentWave < this.waves.length, this.gameSpeed, this.autoPlay);
      this.controlBar.update();
    }

    // Ability VFX
    if (this.abilitySystem) this.abilitySystem.update(delta);
    if (this.cameraCtrl) this.cameraCtrl.update(delta);

    // Hero Defense creep counter
    if (this.creepCounter && this.arenaManager) {
      const alive = this.arenaManager.arenaCreeps.filter(c => c.alive).length;
      this.creepCounter.setText(alive > 0 ? `Creeps: ${alive}` : '');
    }

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

      // CPU opponent: tick the bot AI, then drain shadow-sim events
      // (leaks → opponentLives down, kills → bot economy + wave
      // progress). All state changes flow through versus via
      // injectFromCpu so the existing opponent pipeline stays
      // authoritative.
      if (this.versus.cpuOpponent && this.cpuOpponentAI) {
        this.cpuOpponentAI.tick(delta);
        const { leaks, kills, goldEarned } = this.opponentSim?.drainEvents() ?? { leaks: 0, kills: [], goldEarned: 0 };
        if (leaks > 0) {
          const boss = kills.some(k => k.isBoss);
          const cost = boss ? 5 : 1;
          const newLives = Math.max(0, (this.versus.opponentLives ?? 0) - leaks * cost);
          this.versus.injectFromCpu({ type: 'lives_update', lives: newLives });
          if (newLives <= 0 && !this.versus.opponentGameOver) {
            this.versus.injectFromCpu({
              type: 'game_over', won: false,
              stats: { damageDealt: 0, creepsKilled: 0, towersBuilt: 0, goldSpent: 0, goldEarned: 0, timePlayed: 0 } as any,
              wave: this.currentWave, lives: 0,
              sendsSent: 0, sendsReceived: 0,
            });
          }
        }
        if (kills.length > 0) {
          // Approximate gold reward per creep — mirrors the human's
          // killGold curve (falls off slightly each 10 waves). Boss
          // kills pay ~5× a trash kill.
          const baseGold = Math.max(2, 4 - Math.floor(this.currentWave / 10));
          for (const k of kills) {
            this.cpuOpponentAI.creditKill(1, k.isBoss ? baseGold * 5 : baseGold);
          }
        }
        // Per-hit / per-kill gold from the shadow sim — covers void
        // siphon, gambler jackpot, soul drain etc. that the earlier
        // DPS-smear simulation couldn't credit.
        if (goldEarned > 0) {
          this.cpuOpponentAI.creditGold(1, goldEarned);
        }
        // If the shadow sim finished its wave (no queue, no creeps,
        // not active) and we haven't already fired `wave_cleared`
        // for this wave, synth wave_cleared + wave_ready so the 1v1
        // wave-sync flow progresses as if the remote player had
        // cleared. The _cpuLastClearedWave guard prevents re-firing
        // on every frame during the between-wave countdown.
        if (!this.opponentSim?.isWaveActive() && this.currentWave > 0 && this._cpuLastClearedWave < this.currentWave) {
          this._cpuLastClearedWave = this.currentWave;
          this.versus.injectFromCpu({ type: 'wave_cleared', wave: this.currentWave });
          this.versus.injectFromCpu({ type: 'wave_ready' });
        }
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
          // `ownerIndex` overrides the envelope `from` — it's set
          // when the message was generated by a host-side CPU bot
          // so the receiver attributes the tower to the correct
          // bot slot, not the host that sent it.
          this.placeRemoteTower(msg.towerId, msg.col, msg.row, msg.ownerIndex ?? from);
        } else if (msg.type === 'tower_sold') {
          this.towerMgr.sellTower(msg.col, msg.row);
          this.towerOwners.delete(`${msg.col},${msg.row}`);
          this.recalculatePaths();
          this.drawPath();
        } else if (msg.type === 'tower_upgraded') {
          const tower = this.towers.find(t => t.col === msg.col && t.row === msg.row);
          if (tower && tower.canUpgrade()) {
            tower.upgrade(msg.branch ?? null);
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

      // Bot AI tick — host only, no-op when `circleBotAI` is null
      // (joiner, or host with no CPU slots). Runs after the tower
      // event drain so bot placements this frame don't race against
      // remote placements being applied to the grid.
      this.circleBotAI?.tick(delta);

      // Incoming chats
      const chats = this.circle.drainChats();
      for (const { from: fromIdx, text } of chats) {
        this.eventLog.gameMessage(`[P${fromIdx}] ${text}`);
      }

      // Pull shared lives into the local mirror for UI read. In
      // circle mode `circle.sharedLives` is the authoritative value
      // (host mutates it inside `deductLives`; joiners receive it via
      // `lives_update` broadcasts). `this.lives` is a convenience
      // copy so every UI path that reads `this.lives` works without
      // a mode check. Before this consolidation host had a separate
      // `this.lives` counter that also drifted-corrected sharedLives
      // via `sharedLives = this.lives` — harmless when in sync but
      // one accidental drift away from eating lives silently. Now
      // both host and joiner read-only from sharedLives here.
      //
      // On joiners, if the shared pool dropped without our local sim
      // having logged a leak this frame (no "Creep completed the loop"
      // entry), it was a remote player's leak. Surface that explicitly
      // so "lives lost randomly" has an audit trail in the event log.
      const prev = this.lives;
      this.lives = this.circle.sharedLives;
      if (!this.circle.isHost && this.lives < prev && leakResult.totalLeakDamage === 0) {
        const dropped = prev - this.lives;
        this.eventLog.gameMessage(`Another player lost ${dropped} shared life${dropped > 1 ? 's' : ''}.`);
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

      // Publish roster snapshot for the DOM panel.
      this.publishCircleRoster();
    }

    // Update tower alive time for DPS calc
    for (const tower of this.towers) {
      const ts = this.statsTracker.stats.towerStats[tower.typeId];
      if (ts) ts.timeAlive += delta;
    }
  }

  // === Helpers ===

  /**
   * Intercepts the defeat branch. Decides whether the player is
   * eligible for the continue-ad rescue, offers it if so (pausing
   * the world until the modal closes), otherwise falls straight
   * through to the normal game-over screen.
   *
   * Gated off for:
   *   - Hero Defense (loss mode is hero HP, not lives — "+5 lives"
   *     would grant nothing meaningful)
   *   - Tutorial match (see ad-strategy.md: no ads in tutorial)
   *   - Versus / Circle co-op (other players are waiting; a rescue
   *     would de-sync the match and give one player a private
   *     second life the other doesn't know about)
   *   - Already-used in this match (1/match cap from strategy doc)
   */
  private offerContinueOrGameOver(isHeroDead: boolean): void {
    const eligible =
      !isHeroDead &&
      this.matchMode !== 'hero_defense' &&
      this.matchMode !== 'tutorial' &&
      !this.versus &&
      !this.circle &&
      !this._continueUsedThisMatch &&
      // On web the rewarded call returns 'unavailable' immediately
      // so the offer would be a dead-end. BUT if the user owns
      // ads_off we grant the revive directly — they've paid for
      // the courtesy. Covers the edge case of someone buying
      // ads_off on the web build and still wanting the rescue.
      (platformBridge().isNative || PlayerInventory.isAdFree());

    if (!eligible) {
      this.goToGameOver(false);
      return;
    }

    // TODO(ad-strategy.md #6): scale to difficulty once we settle
    // balance — `max(5, floor(startingLives * 0.15))`. Flat 5 today.
    const livesGranted = 5;

    this._awaitingContinueDecision = true;
    GameUIStore.offerContinue({
      livesGranted,
      onAccept: async () => {
        // Regardless of the ad / claim result we clear the freeze
        // flag — on success we grant + resume, on fail we fall
        // through to game-over. Never leave the player stuck on a
        // frozen board.
        try {
          this._continueUsedThisMatch = true;
          const granted = await claimRewarded(AD_GAME_OVER_CONTINUE);
          if (granted) {
            // Only mark "ad actually shown" when there WAS an ad —
            // ads-off owners skipped the video so the post-match
            // interstitial should still be allowed to play on them
            // (wait — interstitials are also disabled for ads-off,
            // so the flag is moot in that case. Setting it is still
            // safe). Keeps the two suppression paths aligned.
            this._continueAdShown = true;
            this.lives = livesGranted;
            GameUIStore.updateEconomy(this.economy.gold, this.lives, this.incomeMgr.getBreakdown().total);
            // Clear the board — otherwise a revive is worthless
            // when six creeps are one tile from the exit about to
            // burn through the +5 lives instantly. Visual: shockwave
            // ring expanding from each exit, killing creeps as it
            // sweeps over them.
            this.playReviveShockwave();
            this._awaitingContinueDecision = false;
            // Deliberately do NOT fall through to goToGameOver —
            // the player keeps playing. The next frame's update()
            // loop resumes spawning + shooting.
            return;
          }
          // Ad didn't actually play (unfilled / disabled / errored).
          // Treat as a decline rather than silently trapping the
          // player in a frozen match.
          this._awaitingContinueDecision = false;
          this.goToGameOver(false);
        } catch {
          this._awaitingContinueDecision = false;
          this.goToGameOver(false);
        }
      },
      onDecline: () => {
        this._awaitingContinueDecision = false;
        this.goToGameOver(false);
      },
    });
  }

  /**
   * Continue-ad board wipe. Plays a gold shockwave outward from each
   * map exit, killing creeps as the ring sweeps over them. Without
   * this a rewarded revive is a trap — the next six creeps one tile
   * from the exit would burn through the granted +5 lives faster than
   * the player can even process what happened.
   *
   * No gold / stat bounty awarded — these creeps were "cleared by
   * divine intervention" not killed by a tower, and paying out for
   * them would make the ad effectively a gold dispenser on top of
   * the revive.
   */
  private playReviveShockwave(): void {
    // Collect all map exits (last PathPoint of each currently-live path).
    const exits: { x: number; y: number }[] = [];
    for (const path of this.allPaths) {
      if (!path || path.length === 0) continue;
      const last = path[path.length - 1];
      exits.push({ x: gridX(last.col), y: gridY(last.row) });
    }
    if (exits.length === 0) {
      // No paths (defensive — shouldn't happen mid-match). Kill
      // creeps instantly and bail.
      for (const creep of this.creeps) this.killCreepForRevive(creep);
      return;
    }

    // Pair every alive creep with its nearest exit + distance-to, so
    // the shockwave-front math only has to check "is the ring past my
    // distance yet?".
    const targets: { creep: Creep; dist: number }[] = [];
    for (const creep of this.creeps) {
      if (!creep.alive) continue;
      let minDist = Infinity;
      for (const e of exits) {
        const dx = creep.x - e.x;
        const dy = creep.y - e.y;
        const d = Math.hypot(dx, dy);
        if (d < minDist) minDist = d;
      }
      targets.push({ creep, dist: minDist });
    }

    // Fixed duration looks more satisfying than scaling with map
    // size — players want the effect to feel "instant but readable"
    // rather than dependent on whether their nearest exit is close
    // or far.
    const duration = 900;
    // Expand a bit past the furthest creep so the ring visibly clears
    // the whole board before dissipating.
    const maxRadius = Math.max(
      GAME_WIDTH,
      ...targets.map(t => t.dist),
    ) * 1.1;

    const waveGraphics = exits.map(() => {
      const g = this.add.graphics();
      g.setDepth(10_000);
      return g;
    });
    const killed = new WeakSet<Creep>();
    const ring = { r: 0 };

    this.tweens.add({
      targets: ring,
      r: maxRadius,
      duration,
      ease: 'Cubic.Out',
      onUpdate: () => {
        const progress = ring.r / maxRadius;
        const alpha = 1 - progress;
        for (let i = 0; i < exits.length; i++) {
          const g = waveGraphics[i];
          g.clear();
          g.lineStyle(6, 0xe8b76d, Math.max(0, alpha));
          g.strokeCircle(exits[i].x, exits[i].y, ring.r);
          g.fillStyle(0xf5d08a, Math.max(0, alpha * 0.08));
          g.fillCircle(exits[i].x, exits[i].y, ring.r);
        }
        // Kill creeps the ring has reached this frame.
        for (const t of targets) {
          if (killed.has(t.creep)) continue;
          if (t.dist <= ring.r) {
            this.killCreepForRevive(t.creep);
            killed.add(t.creep);
          }
        }
      },
      onComplete: () => {
        for (const g of waveGraphics) g.destroy();
        // Safety net — stragglers (shouldn't happen given maxRadius
        // covers all, but cheap to guarantee).
        for (const t of targets) {
          if (!killed.has(t.creep)) this.killCreepForRevive(t.creep);
        }
      },
    });
  }

  /** Remove a creep from play without awarding gold or firing a
   *  creepKilled event. Used exclusively by the revive shockwave;
   *  normal damage paths still go through `creep.hp -= …`. */
  private killCreepForRevive(creep: Creep): void {
    if (!creep.alive) return;
    creep.alive = false;
    if (creep.sprite) {
      playCreepDeath(this, creep.sprite, this.creepFaction, creep.creepTypeId);
      creep.sprite = null;
    }
  }

  /**
   * Circle Co-op: assemble one stats row per player slot for the
   * end-of-match screen. Kills come from the death handler's
   * per-player ledger; tower counts come from the towerOwners map
   * we already maintain; gold comes from the per-bot EconomyManagers
   * (bots) or from our local economy (self). Remote human gold
   * isn't synced — reported as 0 until we add a message for it.
   * Returns undefined outside Circle Co-op so GameOverScreen knows
   * to hide the section.
   */
  private buildCoopPlayerRows(): CoopPlayerStats[] | undefined {
    if (!this.circle) return undefined;
    const kills = this.circleDeathHandler?.getKillsByPlayer() ?? new Map<number, number>();
    const botGold = this.circleBotAI?.getBotGold() ?? new Map<number, number>();

    const towersByPlayer = new Map<number, number>();
    for (const ownerIdx of this.towerOwners.values()) {
      towersByPlayer.set(ownerIdx, (towersByPlayer.get(ownerIdx) ?? 0) + 1);
    }

    const rows: CoopPlayerStats[] = [];
    for (let i = 0; i < this.circle.playerCount; i++) {
      const isLocal = i === this.circle.playerIndex;
      const isBot = this.circle.botSlots.has(i);
      const gold = isLocal ? this.economy.gold : (isBot ? (botGold.get(i) ?? 0) : 0);
      rows.push({
        playerIndex: i,
        faction: this.circle.playerFactions.get(i) ?? 'unknown',
        isBot,
        isLocal,
        kills: kills.get(i) ?? 0,
        towersBuilt: towersByPlayer.get(i) ?? 0,
        goldRemaining: gold,
      });
    }
    return rows;
  }

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
      difficulty: this.difficulty,
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
      continueAdShown: this._continueAdShown,
      coopPlayers: this.buildCoopPlayerRows(),
      coopLocalIndex: this.circle?.playerIndex,
    };
    const duration = Math.round((Date.now() - this._gameStartTime) / 1000);
    Analytics.gameEnd(this.matchMode, this.lives > 0 ? 'victory' : 'defeat', this.currentWave, duration);
    if (this._modeEnteredAt) {
      Analytics.track('mode_exited', { mode: this.matchMode, durationMs: Date.now() - this._modeEnteredAt });
      this._modeEnteredAt = 0;
    }

    // Award global Player Level XP. Distinct from BattlePass XP which
    // also fires elsewhere — Player Level is permanent and gates
    // mode/map unlocks across seasons.
    PlayerProfile.awardGameEndXP({
      mode: this.matchMode,
      result: this.lives > 0 ? 'victory' : 'defeat',
      wave: this.currentWave,
      difficulty: this.difficulty,
      faction: this.faction ?? null,
      mapId: this.mapId,
      waveCount: this.waveCount,
    });

    // Plan 10: if this was a campaign mission, hand the result to
    // MissionRunner so it can evaluate star objectives and persist.
    // The runner reads the same result snapshot we built for the
    // GameOverScene, plus a couple of mission-specific fields.
    if (this.missionContext) {
      const won = this.lives > 0;
      const livesStart = this._missionLives ?? STARTING_LIVES;
      const heroHpMin = this._missionHeroHpMinFraction;
      const sendsBought = this._missionSendsBought;
      void import('../systems/missions/MissionRunner').then(m => {
        m.MissionRunner.finalize({
          won,
          wave: this.currentWave,
          durationMs: Date.now() - this._gameStartTime,
          livesRemaining: this.lives,
          livesStart,
          goldRemaining: this.economy.gold,
          goldEarned: this.statsTracker.stats.totalGoldEarned ?? 0,
          towerCount: this.towerMgr.totalTowersBuilt,
          perfectRun: won && this.lives === livesStart && !this._continueAdShown,
          custom: {
            // Plan 14 v1.1: counter-driven star objectives. Predicates
            // in arcane.ts read these by name.
            sendsBought,
            heroHpMin,
          },
        });
      });
    }

    // Live-capture session close — appends this match's turns to
    // localStorage with the match outcome attached.
    void import('../systems/learning/LiveCapture').then(m => {
      if (m.isCaptureEnabled()) {
        m.finishSession(this.lives > 0 ? 'win' : 'loss', this.currentWave);
      }
    });

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
    // Demote if the current slot is 3× but boost has expired — keeps
    // the runtime speed honest with the active option list.
    this.reconcileSpeedToBoostState();
    const options = this.activeSpeedOptions();
    // Advance through the reduced list when not boosted.
    this.speedIndex = (this.speedIndex + 1) % options.length;
    this.gameSpeed = options[this.speedIndex];
    this.eventLog.gameMessage(`Speed: ${this.gameSpeed}x`);
    if (this.versus) {
      this.versus.send({ type: 'speed_change', speed: this.gameSpeed });
    }
  }

  /** If the current speed is above what the player can now reach
   *  (boost timer expired, perk lost, etc.), snap down to the
   *  highest valid option. Called before cycling + during regular
   *  ticks so the transition is visible exactly when the cap
   *  changes. */
  private reconcileSpeedToBoostState(): void {
    const options = this.activeSpeedOptions();
    const maxAllowed = options[options.length - 1];
    if (this.gameSpeed > maxAllowed) {
      const wasBoosted = this.gameSpeed > 1.5 && !BattlePass.hasPerk('all_speeds') && !PlayerInventory.isAdFree();
      this.gameSpeed = maxAllowed;
      this.speedIndex = options.indexOf(maxAllowed);
      if (wasBoosted) {
        this.eventLog.gameMessage(`Speed boost expired. Reverted to ${maxAllowed}×.`);
      }
    }
  }

  /** Request a speed boost. Routes through claimRewarded so ads-off
   *  owners get it free. 10 min of wall-clock time; stacks with any
   *  existing boost up to a 30-min ceiling so a determined player
   *  can't accumulate hours of 3× by chaining ads. Solo only —
   *  skipped in versus/circle so multiplayer sync stays honest. */
  async requestSpeedBoost(): Promise<boolean> {
    if (this.versus || this.circle) return false;
    const granted = await claimRewarded(AD_SPEED_BOOST_10M);
    if (!granted) return false;
    const now = Date.now();
    const CEILING_MS = 30 * 60 * 1000;
    const STEP_MS = 10 * 60 * 1000;
    const base = Math.max(now, this._speedBoostUntil);
    this._speedBoostUntil = Math.min(base + STEP_MS, now + CEILING_MS);
    this.eventLog.gameMessage(`3× Speed unlocked for ${Math.round(this.speedBoostRemainingMs() / 60_000)} min.`);
    return true;
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

  /** Recursively disable interactivity on all children of hidden Phaser containers.
   *  Prevents invisible UI zones from swallowing touch events on the game grid. */
  private disableHiddenPhaserUI(): void {
    const disable = (container: Phaser.GameObjects.Container) => {
      for (const child of container.list) {
        if ((child as any).disableInteractive) (child as any).disableInteractive();
        if (child instanceof Phaser.GameObjects.Container) disable(child);
      }
    };
    // All hidden Phaser UI containers
    const containers = [
      this.towerBar?.getContainer(),
      (this.towerInfo as any)?.container,
      this.upcomingWaves?.getContainer(),
    ].filter(Boolean) as Phaser.GameObjects.Container[];
    for (const c of containers) disable(c);
  }

  private togglePause(): void {
    this.paused = !this.paused;
    GameUIStore.setPaused(this.paused);
    if (this.paused) {
      this.showPauseMenu();
    } else {
      this.hidePauseMenu();
    }
  }

  private showPauseMenu(): void {
    if (this.pauseOverlay) return;

    // Use full canvas dimensions so the menu is screen-centered (not world-centered)
    const canvasW = getCanvasWidth();
    const canvasH = ResponsiveManager.canvasHeight();
    const cx = canvasW / 2;
    const cy = canvasH / 2;

    this.pauseOverlay = this.add.container(0, 0).setDepth(50);

    // Pause overlay renders on the UI camera only. The UI-camera setup at
    // line ~902 installs an `addedtoscene` listener that auto-ignores every
    // new GameObject on the UI camera, so we have to explicitly un-ignore
    // via uiLayer.register — which also tells the main camera to ignore it.
    const registerUi = (obj: Phaser.GameObjects.GameObject) => {
      if (this.uiLayer) this.uiLayer.register(obj);
      else this.cameras.main.ignore(obj);
    };
    registerUi(this.pauseOverlay);

    // Dim overlay — covers entire canvas
    const dim = this.add.graphics();
    dim.fillStyle(0x000000, 0.6);
    dim.fillRect(0, 0, canvasW, canvasH);
    this.pauseOverlay.add(dim);
    registerUi(dim);

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
    registerUi(panel);

    const title = this.add.text(cx, py + 20, 'PAUSED', {
      fontSize: '24px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(51);
    this.pauseOverlay.add(title);
    registerUi(title);

    // Resume button
    const resumeBtn = this.add.text(cx, py + 70, '[ Resume ]', {
      fontSize: '16px', color: '#44ff44', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(51);
    this.pauseOverlay.add(resumeBtn);
    registerUi(resumeBtn);
    resumeBtn.setInteractive({ useHandCursor: true });
    resumeBtn.on('pointerdown', () => this.togglePause());
    resumeBtn.on('pointerover', () => resumeBtn.setColor('#88ff88'));
    resumeBtn.on('pointerout', () => resumeBtn.setColor('#44ff44'));

    // Exit to menu button
    const exitBtn = this.add.text(cx, py + 110, '[ Exit to Menu ]', {
      fontSize: '16px', color: '#ff8844', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(51);
    this.pauseOverlay.add(exitBtn);
    registerUi(exitBtn);
    exitBtn.setInteractive({ useHandCursor: true });
    exitBtn.on('pointerdown', () => {
      this.hidePauseMenu();
      setGridOffsetY(0);
      this.versus?.close();
      this.circle?.close();
      this.registry.remove('versus');
      this.registry.remove('circle');
      goToMenu();
    });
    exitBtn.on('pointerover', () => exitBtn.setColor('#ffbb77'));
    exitBtn.on('pointerout', () => exitBtn.setColor('#ff8844'));

    // Hint
    const hint = this.add.text(cx, py + panelH - 16, 'Press P to resume', {
      fontSize: '10px', color: '#666666', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(51);
    this.pauseOverlay.add(hint);
    registerUi(hint);
  }

  private hidePauseMenu(): void {
    if (this.pauseOverlay) {
      this.pauseOverlay.destroy(true);
      this.pauseOverlay = null;
    }
  }

  recalculatePaths(): void {
    this.allPaths = [];
    // Circle co-op maps carry a `spawners` list, each with an
    // ordered waypoint chain (entry → waypoints[...] → exit). When
    // present, use waypoint-chained pathing so creeps physically
    // circumnavigate the map before exiting; when absent (standard
    // / gauntlet / hero-defense / versus), fall back to a simple
    // entry-exit A* cross-product per the original behaviour.
    if (this.mapDef?.spawners && this.mapDef.spawners.length > 0) {
      for (const spawner of this.mapDef.spawners) {
        this.allPaths.push(findPathWithWaypoints(this.grid, spawner.entry, spawner.waypoints, spawner.exit));
      }
    } else {
      for (const entry of this.grid.entries) {
        for (const exit of this.grid.exits) {
          this.allPaths.push(findPath(this.grid, entry, exit));
        }
      }
    }
    this.currentPath = this.allPaths.find(p => p !== null) ?? null;
  }

  drawGrid(): void {
    // Themed rendering routes through SkinManager so equipped store
    // themes can override the map's authored theme. See
    // SkinManager.getActiveTerrainTheme for the full resolution order
    // (Gauntlet + custom maps suppress the override; coop guests
    // render the host's broadcast theme).
    const circle = this.registry.get('circle') as { isHost: boolean; hostTerrainOverride: string | null } | null;
    const themeId = SkinManager.getActiveTerrainTheme({
      matchMode: this.matchMode,
      mapTheme: this.mapDef?.theme,
      isCustomMap: this.mapId === 'custom' && !!this.customMapDef,
      isCoopHost: this.matchMode === 'circle_coop' ? (circle?.isHost ?? true) : undefined,
      hostOverrideTheme: circle?.hostTerrainOverride ?? null,
    });
    this.terrainMgr.compute(this.grid, themeId, this.mapDef?.structures, this.mapDef?.animated);
    this.terrainMgr.render(this.grid, this.gridOffsetY);
  }

  /** Overlay opponent's towers on the main grid when viewing their board */
  private opponentOverlay: Phaser.GameObjects.Graphics | null = null;

  private opponentLabel: Phaser.GameObjects.Text | null = null;
  private _opponentSprites: Phaser.GameObjects.Sprite[] = [];

  drawOpponentView(): void {
    if (!this.opponentOverlay) {
      this.opponentOverlay = this.add.graphics().setDepth(22);
    }
    this.opponentOverlay.clear();

    if (!this.viewingOpponent || !this.versus) {
      if (this.opponentLabel) this.opponentLabel.setVisible(false);
      // Clean up opponent tower sprites
      for (const spr of this._opponentSprites) spr.destroy();
      this._opponentSprites = [];
      return;
    }

    // Dim the grid background
    this.opponentOverlay.fillStyle(0x000000, 0.3);
    this.opponentOverlay.fillRect(getGridOffsetX(), 0, getGameWidth(), GAME_HEIGHT);

    // Draw opponent towers — use sprites if available, colored squares as fallback
    // Clean up previous opponent sprites
    if (this._opponentSprites) {
      for (const spr of this._opponentSprites) spr.destroy();
    }
    this._opponentSprites = [];

    for (const t of this.versus.opponentTowers) {
      const towerDef = TOWER_TYPES[t.towerId];
      const x = gridLeftX(t.col) + TILE_SIZE / 2;
      const y = t.row * TILE_SIZE + TILE_SIZE / 2;

      const cfg = getTowerSpriteConfig(t.towerId);
      if (cfg && this.textures.exists(cfg.sheetKey)) {
        // Calculate frame for this tower's level
        const levelOffset = Math.min(t.level - 1, (cfg.maxLevel ?? 1) - 1) * (cfg.rowsPerLevel ?? 4);
        const frameIdx = (levelOffset + cfg.rows.idle) * cfg.totalCols + cfg.column;
        const spr = this.add.sprite(x, y, cfg.sheetKey, frameIdx).setDepth(22);
        spr.setScale(TILE_SIZE / 64 * 0.85);
        spr.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        spr.setAlpha(0.85);
        this._opponentSprites.push(spr);
      } else {
        // Fallback: colored square
        const color = towerDef?.color ?? 0xffffff;
        const s = TILE_SIZE * 0.4;
        this.opponentOverlay.fillStyle(color, 0.9);
        this.opponentOverlay.fillRect(x - s, y - s, s * 2, s * 2);
        this.opponentOverlay.lineStyle(2, 0xffffff, 0.5);
        this.opponentOverlay.strokeRect(x - s, y - s, s * 2, s * 2);
      }
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

    // Rebuild path flow indicators — one per distinct path. Reuse existing
    // indicators where possible so the `time` phase keeps flowing smoothly
    // across path recomputes instead of resetting to 0. Any surplus
    // indicators (paths that disappeared) get destroyed. A freshly built
    // indicator is flashed so the player's eye catches the new routing.
    const validPaths = this.allPaths.filter(p => p && p.length >= 2);
    while (this.pathFlows.length > validPaths.length) {
      const surplus = this.pathFlows.pop();
      surplus?.destroy();
    }
    for (let i = 0; i < validPaths.length; i++) {
      const path = validPaths[i]!;
      if (this.pathFlows[i]) {
        this.pathFlows[i].setPath(path);
      } else {
        this.pathFlows[i] = new PathFlowIndicator(this, path);
      }
      this.pathFlows[i].flash();
    }
  }

  private resetPathFlow(): void {
    for (const f of this.pathFlows) f.destroy();
    this.pathFlows = [];
  }

  private updatePathFlow(realDelta: number): void {
    if (this.pathFlows.length === 0) return;
    const dimmed = this.waveActive;
    for (const f of this.pathFlows) f.tick(realDelta, dimmed);
  }

  toggleAutoPlay(): void {
    this.autoPlay = !this.autoPlay;
    this.upcomingWaves.setAutoPlay(this.autoPlay);
    GameUIStore.setAutoPlay(this.autoPlay);
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
      if (placeResult.pathsChanged) {
        // Same re-route rule as local placement — only touch creeps
        // whose remaining path hits the new tower. Without this,
        // remote placements (humans AND bots) mid-wave would leave
        // creeps colliding with new towers.
        this.rerouteCreepsAroundTower(col, row);
        this.drawPath();
      }
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
    if (livesGained > 0) {
      const handled = this.gameMode.onLifeGain?.(livesGained) ?? false;
      if (!handled) this.lives += livesGained;
    }

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
    // Fan waveCleared out to bot economies so they get the same
    // bonus via their own EconomyManager subscriptions.
    this.circleBotAI?.creditWaveClear(waveNum);
    this.cpuOpponentAI?.creditWaveClear(waveNum);
    this.eventLog.waveCleared(waveNum, this.incomeMgr.getWaveIncome());
    this.statsTracker.recordWaveCompleted();

    // Endless mode: append more waves when running low, rotate creep faction every 10 waves
    if (this.matchMode === 'endless') {
      if (this.currentWave >= this.waves.length - 5) {
        const nextStart = this.waves.length + 1;
        const newWaves = generateEndlessWaves(nextStart, 10);
        this.waves.push(...newWaves);
        if (DEBUG) console.log(`[Endless] Appended waves ${nextStart}-${nextStart + 9}, total: ${this.waves.length}`);
      }
      if (waveNum % 10 === 0) {
        const playable = FACTION_ORDER.filter(f => f !== 'chaos' && f !== 'random' && f !== this.creepFaction);
        // Deterministic faction pick for multiplayer Endless — host
        // and joiner must land on the same faction or wave 11+ creeps
        // diverge. Seeded from (sharedSeed XOR waveNum); solo falls
        // back to Math.random so standalone runs stay unpredictable.
        const sharedSeed = this.versus?.sharedSeed ?? this.circle?.sharedSeed ?? 0;
        const roll = sharedSeed > 0
          ? seededRoll((sharedSeed ^ (waveNum * 2654435761)) >>> 0)
          : Math.random();
        this.creepFaction = playable[Math.floor(roll * playable.length)];
        if (DEBUG) console.log(`[Endless] Creep faction rotated to: ${this.creepFaction}`);
        this.eventLog.gameMessage(`Enemy faction changed to ${FACTIONS[this.creepFaction].name}!`);
        // Bind the new faction's sprites + animations. Without this
        // creeps spawned on wave 11+ render with the prior faction's
        // textures (or fall back to the Graphics shape).
        preloadCreepSprites(this);
        createCreepAnimations(this, this.creepFaction);
      }
    }

    // Upcoming-waves snapshot runs AFTER the Endless append so the
    // just-pushed waves show up in the panel on the same tick rather
    // than after the next clear.
    this.upcomingWaves.update(waveNum, this.waves);
    this.updateDOMWaves(waveNum);

    // Chaos faction rotation (rolls a fresh tower + frontier pool each wave).
    if (this.faction === 'chaos') {
      this.activeTowerIds = this.rollRandomTowers();
      this.towerBar.setTowerIds(this.activeTowerIds); this.syncTowerBarToDOM();
      if (this.gameMode instanceof BaseFrontierMode) {
        this.gameMode.rotateRandomFrontier();
      }
      this.eventLog.gameMessage('Tower + frontier pool rotated!');
      this.enterNoneMode();
      if (this.versus?.isHost) {
        this.versus.send({ type: 'tower_pool', towerIds: this.activeTowerIds });
      }
    }
  }

  /** Gauntlet: transition to the next stage */
  private startGauntletTransition(gauntlet: GauntletMode): void {
    const nextFaction = gauntlet.advanceStage();
    if (!nextFaction) return; // shouldn't happen, checked hasNextStage

    const stageNum = gauntlet.getStageNumber();
    const factionName = FACTIONS[nextFaction]?.name ?? nextFaction;

    // Fade to black
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      // Destroy all towers (use towerMgr which owns the real array)
      for (const t of this.towerMgr.towers) t.destroy();
      this.towerMgr.towers = [];
      this._towers = [];
      // Destroy all creeps (sprites only; the shared overlay graphics
      // is owned by CreepManager and survives the reset).
      for (const c of this.creepMgr.creeps) { c.sprite?.destroy(); }
      this.creepMgr.creeps = [];
      this._creeps = [];

      // Load new stage
      this.creepFaction = nextFaction;
      this.mapDef = gauntlet.getCurrentMap();
      this.waves = gauntlet.getStageWaves();
      this.currentWave = 0;
      this.lives = gauntlet.getLivesPerStage();
      this.betweenWaves = true;
      this.waveActive = false;
      this.economy.gold = gauntlet.getStageStartingGold();

      // Rebuild grid with new map
      this.grid = new Grid(this.mapDef);
      this.towerMgr.grid = this.grid;
      this.allPaths = this.grid.entries.map(e => {
        const closest = this.grid.exits.reduce((best, ex) => {
          const d = Math.abs(e.col - ex.col) + Math.abs(e.row - ex.row);
          return d < best.d ? { ex, d } : best;
        }, { ex: this.grid.exits[0], d: Infinity }).ex;
        return findPath(this.grid, e, closest);
      });
      this.currentPath = this.allPaths.find(p => p !== null) ?? null;

      // Update flying path for new map entry/exit
      this.spawner.setFlyingPath(this.grid.entries[0], this.grid.exits[0]);
      this.sendMgr.setFlyingPath(this.grid.entries[0], this.grid.exits[0]);

      // Create creep animations for new faction
      createCreepAnimations(this, this.creepFaction);

      // Redraw terrain + grid
      this.drawGrid();
      this.drawPath();

      // Show stage banner
      const cx = getCanvasWidth() / 2;
      const cy = GAME_HEIGHT / 2;
      const bannerBg = this.add.graphics().setDepth(50);
      bannerBg.fillStyle(0x000000, 0.8);
      bannerBg.fillRect(0, cy - 60, getCanvasWidth(), 120);

      const stageText = this.add.text(cx, cy - 20, `STAGE ${stageNum}`, {
        fontSize: UIScale.font(28), color: '#ff4444', fontFamily: 'monospace',
      }).setOrigin(0.5).setDepth(51);

      const factionText = this.add.text(cx, cy + 20, factionName, {
        fontSize: UIScale.font(18), color: '#ffffff', fontFamily: 'monospace',
      }).setOrigin(0.5).setDepth(51);

      // Fade in
      this.cameras.main.fadeIn(500, 0, 0, 0);

      // Remove banner after 2 seconds, then allow gameplay
      this.time.delayedCall(2500, () => {
        bannerBg.destroy();
        stageText.destroy();
        factionText.destroy();
        this._gauntletTransitioning = false;
        // Rebuild wave controller for new stage
        this.waveMgr = new WaveController(this.waves, this.spawner, this.sendMgr, {
          canStartWave: () => !!this.currentPath,
          onWaveStart: (wave, waveNum, totalWaves) => {
            this.towerMgr.spawnBroodMotherSwarmlings();
            const creepTypes = [...new Set(wave.groups.map(g => g.creepType))];
            this.eventLog.waveStarted(waveNum, totalWaves, creepTypes);
            this.upcomingWaves.update(waveNum, this.waves);
        this.updateDOMWaves(waveNum);
            this.eventBus.emit('waveStarted', waveNum);
            this.gameMode.onWaveStart?.(wave, waveNum);
          },
          onWaveCleared: (waveNum) => {
            this.onWaveCleared(waveNum);
          },
          onStuckForceClear: () => {
            this.creepMgr.forceLeakAllAlive();
            this.eventLog.gameMessage('Wave timed out — remaining creeps escaped.');
          },
        });
        // Update gauntlet HUD
        if (this._gauntletHud) {
          this._gauntletHud.setText(`Stage ${stageNum}/${gauntlet.getTotalStages()}: ${factionName}`);
        }
        this.eventLog.gameMessage(`Stage ${stageNum}: ${factionName} — 10 waves!`);
        this.eventLog.gameMessage('Press SPACE to start wave 1.');
      });
    });
  }

  /** Clean up on scene shutdown (returning to menu, restarting) */
  shutdown(): void {
    GameUIStore.deactivate();
    // Destroy all towers and their sprites
    for (const t of this._towers) t.destroy();
    this._towers = [];
    // Destroy all creep sprites (shared overlay graphics is auto-cleaned
    // when the scene tears down — no per-creep graphics to destroy).
    for (const c of this._creeps) { c.sprite?.destroy(); }
    this._creeps = [];
    // Clean up path flow indicators
    this.resetPathFlow();
    // Clean up game mode (panels, keyboard listeners)
    this.gameMode.destroy?.();
    // Clean up event bus
    TutorialManager.setGameEventBus(null);
    this._discoveryTracker?.destroy();
    this._discoveryTracker = null;
    this.eventBus.clear();
    // Reset UI camera + layer so they're re-created on next game
    if (this.uiCamera) {
      this.cameras.remove(this.uiCamera);
    }
    this.uiCamera = null;
    this.uiLayer = null;
    // Clear event listeners
    this.events.off('shutdown');
    this.events.off('addedtoscene');
    this.input.off('pointerdown');
    this.input.off('pointermove');
    this.input.off('pointerup');
    this.input.off('wheel');
  }
}
