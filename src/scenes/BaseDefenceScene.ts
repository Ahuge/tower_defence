import Phaser from 'phaser';
import { TILE_SIZE, COLOR_GROUND, COLOR_GRID_LINE } from '../config';
import { CellType } from '../systems/Grid';
import { FactionId, FACTIONS } from '../data/Factions';
import { MatchMode } from '../data/WaveDefinitions';
import { MapId } from '../data/Maps';
import { DifficultyLevel } from '../data/Difficulty';
import { EventBus } from '../systems/EventBus';
import { ResourceManager } from '../systems/ResourceManager';
import { generateBaseDefenceMap, BaseDefenceMapResult } from '../systems/basedefence/BaseDefenceMapGenerator';
import { BuildingManager } from '../systems/basedefence/BuildingManager';
import { UnitManager } from '../systems/basedefence/UnitManager';
import { Building } from '../entities/Building';
import { BuilderUnit } from '../entities/BuilderUnit';
import { RtsUnit } from '../entities/RtsUnit';
import { CHUNK_SIZE } from '../data/basedefence/Chunks';
import { getFactionBaseId, getFactionBuildingIds, BUILDING_TYPES } from '../data/basedefence/BuildingTypes';
import { CombatUnit } from '../entities/CombatUnit';
import { getFactionUnitIds, COMBAT_UNIT_TYPES } from '../data/basedefence/CombatUnitTypes';
import { CpuAI } from '../systems/basedefence/CpuAI';
import { ReinforcementWaves } from '../systems/basedefence/ReinforcementWaves';
import { TowerDefence } from '../systems/basedefence/TowerDefence';
import { TOWER_TYPES } from '../data/TowerTypes';
import { FogOfWar } from '../systems/basedefence/FogOfWar';

/** Terrain colors */
const COLOR_GOLD_DEPOSIT = 0xccaa22;
const COLOR_GEYSER = 0x22cc88;
const COLOR_BLOCKED = 0x111111;
const COLOR_NOBUILD = 0x222222;

/** Map size */
const MAP_CHUNKS_X = 5;
const MAP_CHUNKS_Y = 4;

/** Camera */
const SCROLL_SPEED = 600;
const EDGE_SCROLL_MARGIN = 20;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.0;
const DEFAULT_ZOOM = 0.8;

/** Builder spawn count */
const STARTING_BUILDERS = 4;

/** Build mode state */
type BuildMode =
  | { active: false }
  | { active: true; buildingId: string; isTower?: false }
  | { active: true; buildingId: string; isTower: true };

interface BaseDefenceInit {
  mode: MatchMode;
  faction: FactionId;
  map?: MapId;
  difficulty?: DifficultyLevel;
  randomSeed?: number;
  dailySeed?: boolean;
}

export class BaseDefenceScene extends Phaser.Scene {
  private faction!: FactionId;
  private cpuFaction!: FactionId;
  private difficulty: DifficultyLevel = 'normal';
  private seed: number = 0;

  // Map
  private mapResult!: BaseDefenceMapResult;

  // Systems
  private eventBus!: EventBus;
  private resources!: ResourceManager;
  private cpuResources!: ResourceManager;
  private buildingMgr!: BuildingManager;
  private unitMgr!: UnitManager;
  private cpuAI!: CpuAI;
  private waves!: ReinforcementWaves;
  private towerDef!: TowerDefence;
  private fogOfWar!: FogOfWar;

  // Rendering layers
  private buildingGraphics!: Phaser.GameObjects.Graphics;
  private towerGraphics!: Phaser.GameObjects.Graphics;
  private unitGraphics!: Phaser.GameObjects.Graphics;
  private hoverGraphics!: Phaser.GameObjects.Graphics;
  private selectionBoxGraphics!: Phaser.GameObjects.Graphics;
  private fogGraphics!: Phaser.GameObjects.Graphics;
  /** All game-world objects (terrain, etc.) that the UI camera should ignore */
  private gameWorldObjects: Phaser.GameObjects.GameObject[] = [];

  // Build mode
  private buildMode: BuildMode = { active: false };

  // Attack mode (A key — next click issues attack-move)
  private attackMode: boolean = false;
  // Blink mode (B key — Arcane units teleport to clicked location)
  private blinkMode: boolean = false;

  // Selected building (any player building, for info display + barracks training)
  private selectedBuilding: Building | null = null;

  // Selection drag
  private dragStart: { x: number; y: number } | null = null;
  private isDragging: boolean = false;

  // Camera input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;

  // HUD
  private hudText!: Phaser.GameObjects.Text;
  private commandPanelGraphics!: Phaser.GameObjects.Graphics;
  private commandPanelTexts: Phaser.GameObjects.Text[] = [];
  private lastPanelContext: string = ''; // track what's shown to avoid rebuilding every frame
  private uiElements: Phaser.GameObjects.GameObject[] = [];

  // Mini-map
  private minimapGraphics!: Phaser.GameObjects.Graphics;
  private minimapX: number = 0;
  private minimapY: number = 0;
  private minimapW: number = 180;
  private minimapH: number = 140;
  private minimapScaleX: number = 1;
  private minimapScaleY: number = 1;

  // Game over state
  private gameOver: boolean = false;

  constructor() {
    super('BaseDefenceScene');
  }

  init(data: BaseDefenceInit): void {
    this.faction = data.faction;
    this.difficulty = data.difficulty || 'normal';
    this.seed = data.randomSeed || Math.floor(Math.random() * 999999);

    const cpuOptions: FactionId[] = (['military', 'mechanical', 'arcane'] as FactionId[]).filter(f => f !== this.faction);
    this.cpuFaction = cpuOptions[Math.floor(Math.random() * cpuOptions.length)];
  }

  create(): void {
    // Disable browser right-click menu on game canvas
    this.game.canvas.oncontextmenu = (e) => { e.preventDefault(); return false; };
    this.input.mouse?.disableContextMenu();

    this.eventBus = new EventBus();

    // Generate map
    this.mapResult = generateBaseDefenceMap(this.seed, MAP_CHUNKS_X, MAP_CHUNKS_Y);

    // Resources (separate pools for player and CPU)
    this.setupResources();

    // Buildings
    this.buildingMgr = new BuildingManager(this.mapResult.grid, this.resources, this.eventBus);

    // Units
    this.unitMgr = new UnitManager(this.mapResult.grid, this.eventBus, this.buildingMgr, this.resources);


    // Place starting bases + builders
    this.placeStartingEntities();

    // CPU AI (uses its own resource pool)
    this.cpuAI = new CpuAI(
      this.mapResult.grid, this.buildingMgr, this.unitMgr, this.cpuResources,
      this.cpuFaction, this.mapResult.playerBase.col, this.mapResult.playerBase.row,
      this.difficulty,
    );

    // Towers (static defense)
    this.towerDef = new TowerDefence(this.mapResult.grid, this.resources, this.eventBus);
    this.unitMgr.setTowerDefence(this.towerDef);
    this.unitMgr.setCpuResources(this.cpuResources);
    this.unitMgr.setFactions(this.faction, this.cpuFaction);

    // Fog of war
    this.fogOfWar = new FogOfWar(this.mapResult.grid.rows, this.mapResult.grid.cols);

    // Reinforcement waves (spawn near CPU base, attack toward player base)
    this.waves = new ReinforcementWaves(
      this.mapResult.grid, this.unitMgr,
      this.mapResult.playerBase.col, this.mapResult.playerBase.row,
      this.mapResult.cpuBase.col, this.mapResult.cpuBase.row,
      this.difficulty,
    );

    // Camera
    this.setupCamera();

    // Static terrain
    this.drawTerrain();
    this.drawChunkBorders();

    // Dynamic layers (redrawn each frame) — depth order matters
    this.fogGraphics = this.add.graphics();
    this.fogGraphics.setDepth(10); // above terrain, below entities
    this.buildingGraphics = this.add.graphics();
    this.buildingGraphics.setDepth(20);
    this.towerGraphics = this.add.graphics();
    this.towerGraphics.setDepth(21);
    this.unitGraphics = this.add.graphics();
    this.unitGraphics.setDepth(30);
    this.hoverGraphics = this.add.graphics();
    this.hoverGraphics.setDepth(40);
    this.selectionBoxGraphics = this.add.graphics();
    this.selectionBoxGraphics.setDepth(41);

    // HUD + input
    this.setupHUD();
    this.setupInput();
    this.setupClickHandler();
  }

  // ── Starting State ──

  private placeStartingEntities(): void {
    const pb = this.mapResult.playerBase;
    const cb = this.mapResult.cpuBase;
    const grid = this.mapResult.grid;

    // Clear area around each base center to ensure 3×3 base can be placed
    // Preserve gold deposits and geysers outside the 3×3 footprint
    for (const pos of [pb, cb]) {
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const r = pos.row + dr;
          const c = pos.col + dc;
          if (r >= 0 && r < grid.rows && c >= 0 && c < grid.cols) {
            const cell = grid.cells[r][c];
            // Only clear the 3×3 footprint area completely (base needs Empty cells)
            const inFootprint = dr >= -1 && dr <= 1 && dc >= -1 && dc <= 1;
            if (inFootprint) {
              grid.cells[r][c] = CellType.Empty;
            } else if (cell === CellType.Blocked) {
              // Clear blocked tiles around footprint for access, but keep resources
              grid.cells[r][c] = CellType.Empty;
            }
          }
        }
      }
    }

    // Bases (3×3 footprint, placed at center-1 so center is in the middle)
    const pBase = this.buildingMgr.placeBuilding(getFactionBaseId(this.faction), 'player', pb.col - 1, pb.row - 1, true, true);
    const cBase = this.buildingMgr.placeBuilding(getFactionBaseId(this.cpuFaction), 'cpu', cb.col - 1, cb.row - 1, true, true);
    if (!pBase) console.error('Failed to place player base at', pb.col - 1, pb.row - 1);
    if (!cBase) console.error('Failed to place CPU base at', cb.col - 1, cb.row - 1);

    // Player builders near base (each costs 1 supply)
    const playerColor = FACTIONS[this.faction].primaryColor;
    for (let i = 0; i < STARTING_BUILDERS; i++) {
      const offset = i - Math.floor(STARTING_BUILDERS / 2);
      this.unitMgr.spawnBuilder('player', pb.col + offset, pb.row + 2, playerColor);
      this.buildingMgr.useSupply('player', 1);
    }

    // CPU builders near base
    const cpuColor = FACTIONS[this.cpuFaction].primaryColor;
    for (let i = 0; i < STARTING_BUILDERS; i++) {
      const offset = i - Math.floor(STARTING_BUILDERS / 2);
      this.unitMgr.spawnBuilder('cpu', cb.col + offset, cb.row + 2, cpuColor);
      this.buildingMgr.useSupply('cpu', 1);
    }
  }

  // ── Camera ──

  private setupCamera(): void {
    const grid = this.mapResult.grid;
    const cam = this.cameras.main;
    cam.setBounds(0, 0, grid.cols * TILE_SIZE, grid.rows * TILE_SIZE);
    cam.setZoom(DEFAULT_ZOOM);

    const pb = this.mapResult.playerBase;
    cam.centerOn(pb.col * TILE_SIZE + TILE_SIZE / 2, pb.row * TILE_SIZE + TILE_SIZE / 2);

    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _go: Phaser.GameObjects.GameObject[], _dx: number, dy: number) => {
      cam.setZoom(Phaser.Math.Clamp(cam.zoom - dy * 0.001, MIN_ZOOM, MAX_ZOOM));
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.middleButtonDown()) {
        cam.scrollX -= (pointer.x - pointer.prevPosition.x) / cam.zoom;
        cam.scrollY -= (pointer.y - pointer.prevPosition.y) / cam.zoom;
      }
    });
  }

  // ── Input ──

  private setupInput(): void {
    if (!this.input.keyboard) return;
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    // ESC: cancel attack → cancel build → deselect → menu
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).on('down', () => {
      if (this.attackMode) {
        this.attackMode = false;
      } else if (this.buildMode.active) {
        this.buildMode = { active: false };
      } else if (this.unitMgr.selected.length > 0 || this.selectedBuilding) {
        this.unitMgr.clearSelection();
        this.selectedBuilding = null;
      } else {
        this.scene.start('MenuScene');
      }
    });

    // A key: attack mode (when units selected) — next click is attack-move
    this.keyA.on('down', () => {
      if (this.unitMgr.selected.length > 0) {
        this.attackMode = true;
        this.buildMode = { active: false };
      }
    });

    // Number keys 1-9: context-dependent
    // - Ctrl+N: assign control group
    // - N with builder selected: building/tower hotkey
    // - N without builder: recall control group (double-tap centers camera)
    // Filter out base from building hotkeys — buildings are [1-4], towers start at [5]
    const buildingIds = getFactionBuildingIds(this.faction);
    const towerIds = this.towerDef.getTowerIds(this.faction);
    const towerKeyStart = buildingIds.length + 1; // towers start after buildings (e.g., key 5 if 4 buildings)
    const lastGroupTap: Record<number, number> = {};

    for (let i = 0; i < 9; i++) {
      const key = this.input.keyboard.addKey(49 + i); // '1' = 49
      const num = i + 1;
      key.on('down', (evt: KeyboardEvent) => {
        if (evt.ctrlKey) {
          this.unitMgr.assignGroup(num);
          return;
        }

        const hasBuilder = this.unitMgr.selected.some(u => u instanceof BuilderUnit);

        // Building hotkeys: keys 1 through buildingIds.length
        if (i < buildingIds.length && hasBuilder) {
          this.buildMode = { active: true, buildingId: buildingIds[i] };
          return;
        }

        // Tower hotkeys: keys after buildings
        const towerIdx = i - buildingIds.length;
        if (towerIdx >= 0 && towerIdx < towerIds.length && hasBuilder) {
          this.buildMode = { active: true, buildingId: towerIds[towerIdx], isTower: true };
          return;
        }

        // No builder selected → recall control group
        // Double-tap → center camera on group
        const now = Date.now();
        if (lastGroupTap[num] && now - lastGroupTap[num] < 400) {
          const center = this.unitMgr.getGroupCenter(num);
          if (center) this.cameras.main.centerOn(center.x, center.y);
          lastGroupTap[num] = 0;
        } else {
          this.unitMgr.recallGroup(num);
          lastGroupTap[num] = now;
        }
      });
    }

    // Q/R/T for training units at selected barracks
    const trainKeys = [
      Phaser.Input.Keyboard.KeyCodes.Q,
      Phaser.Input.Keyboard.KeyCodes.R, // skip W (camera), use R
      Phaser.Input.Keyboard.KeyCodes.T,
    ];
    const unitIds = getFactionUnitIds(this.faction);
    for (let i = 0; i < trainKeys.length && i < unitIds.length; i++) {
      const key = this.input.keyboard.addKey(trainKeys[i]);
      const uid = unitIds[i];
      key.on('down', () => {
        if (this.selectedBuilding?.def.category === 'barracks') {
          this.unitMgr.queueTraining(this.selectedBuilding, uid, 'player');
        }
        // Q on base building = train builder
        if (i === 0 && this.selectedBuilding?.def.category === 'base') {
          this.unitMgr.queueBuilderTraining(this.selectedBuilding, 'player');
        }
      });
    }

    // X to cancel last queued unit
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X).on('down', () => {
      if (this.selectedBuilding?.def.category === 'barracks') {
        this.unitMgr.cancelTraining(this.selectedBuilding, 'player');
      }
      if (this.selectedBuilding?.def.category === 'base') {
        this.unitMgr.cancelBuilderTraining(this.selectedBuilding, 'player');
      }
    });

    // O key: Overclock (Mechanical faction — selected building)
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.O).on('down', () => {
      if (this.selectedBuilding?.def.faction === 'mechanical') {
        this.selectedBuilding.activateOverclock();
      }
    });

    // B key: Blink (Arcane faction — selected combat units)
    this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B).on('down', () => {
      if (this.faction === 'arcane') {
        this.blinkMode = true;
        this.buildMode = { active: false };
      }
    });
  }

  /** Blink selected Arcane combat units to target location (8 tile max range, 30s cooldown) */
  private performBlink(wx: number, wy: number): void {
    const maxRange = TILE_SIZE * 8;
    const sel = this.unitMgr.selected;
    for (const u of sel) {
      if (!(u instanceof CombatUnit) || !u.alive) continue;
      if (u.def.faction !== 'arcane') continue;
      if (u.blinkCooldown > 0) continue;

      const dx = wx - u.x;
      const dy = wy - u.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= maxRange) {
        // Teleport to exact position
        u.x = wx;
        u.y = wy;
      } else {
        // Blink max range in the target direction
        u.x += (dx / dist) * maxRange;
        u.y += (dy / dist) * maxRange;
      }
      u.blinkCooldown = 30;
      u.state = 'idle';
      u.attackTarget = null;
    }
  }

  /** Convert pointer screen coords to world coords using the main (game) camera */
  private pointerWorld(pointer: Phaser.Input.Pointer): { x: number; y: number } {
    const cam = this.cameras.main;
    const out = cam.getWorldPoint(pointer.x, pointer.y);
    return { x: out.x, y: out.y };
  }

  private worldToTile(wx: number, wy: number): { col: number; row: number } {
    return {
      col: Math.floor(wx / TILE_SIZE),
      row: Math.floor(wy / TILE_SIZE),
    };
  }

  private setupClickHandler(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.middleButtonDown()) return;

      if (pointer.rightButtonDown()) {
        this.handleRightClick(pointer);
        return;
      }

      // Left click
      const world = this.pointerWorld(pointer);

      // Blink mode: B was pressed, now clicking teleports Arcane units
      if (this.blinkMode) {
        this.performBlink(world.x, world.y);
        this.blinkMode = false;
        return;
      }

      // Attack mode: A was pressed, now clicking issues attack-move
      if (this.attackMode) {
        const tile = this.worldToTile(world.x, world.y);
        this.unitMgr.commandAttackMove(tile.col, tile.row);
        this.attackMode = false;
        return;
      }

      if (this.buildMode.active) {
        this.handleBuildClick(world.x, world.y, pointer.event.shiftKey);
        return;
      }

      // Start potential drag-select
      this.dragStart = { x: world.x, y: world.y };
      this.isDragging = false;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.dragStart || pointer.middleButtonDown()) return;
      if (!pointer.leftButtonDown()) return;

      const world = this.pointerWorld(pointer);
      const dx = world.x - this.dragStart.x;
      const dy = world.y - this.dragStart.y;
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        this.isDragging = true;
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.dragStart) return;
      const world = this.pointerWorld(pointer);

      if (this.isDragging) {
        this.unitMgr.selectInRect(
          this.dragStart.x, this.dragStart.y,
          world.x, world.y
        );
      } else {
        this.handleLeftClick(world.x, world.y, pointer.event.shiftKey);
      }

      this.dragStart = null;
      this.isDragging = false;
    });
  }

  private handleLeftClick(wx: number, wy: number, shift: boolean): void {
    // Try selecting a unit first
    const unit = this.unitMgr.getUnitAt(wx, wy);
    if (unit && unit.owner === 'player') {
      if (shift) {
        this.unitMgr.addToSelection(unit);
      } else {
        this.unitMgr.selectUnit(unit);
      }
      this.selectedBuilding = null;
      this.buildMode = { active: false };
      return;
    }

    // Try selecting any player building (#4 — click any building for info)
    const tile = this.worldToTile(wx, wy);
    const building = this.buildingMgr.getBuildingAt(tile.col, tile.row);
    if (building && building.owner === 'player') {
      this.selectedBuilding = building;
      this.unitMgr.clearSelection();
      this.buildMode = { active: false };
      return;
    }

    // Deselect all
    if (!shift) {
      this.unitMgr.clearSelection();
      this.selectedBuilding = null;
    }
    this.buildMode = { active: false };
  }

  private handleRightClick(pointer: Phaser.Input.Pointer): void {
    // Cancel build/attack mode
    if (this.buildMode.active) { this.buildMode = { active: false }; return; }
    if (this.attackMode) { this.attackMode = false; return; }

    const world = this.pointerWorld(pointer);
    const tile = this.worldToTile(world.x, world.y);

    // Rally point for base or barracks
    const cat = this.selectedBuilding?.def.category;
    if ((cat === 'barracks' || cat === 'base') && this.unitMgr.selected.length === 0) {
      this.selectedBuilding!.rallyCol = tile.col;
      this.selectedBuilding!.rallyRow = tile.row;
      return;
    }

    if (this.unitMgr.selected.length === 0) return;

    // Right-click on miner/extractor building or gold deposit → assign builders to mine
    const clickedBuilding = this.buildingMgr.getBuildingAt(tile.col, tile.row);
    const grid = this.mapResult.grid;
    const isMinableBuilding = clickedBuilding && clickedBuilding.owner === 'player' && clickedBuilding.isBuilt &&
        (clickedBuilding.def.category === 'miner' || clickedBuilding.def.category === 'extractor');
    const isGoldDeposit = tile.col >= 0 && tile.col < grid.cols && tile.row >= 0 && tile.row < grid.rows &&
        grid.cells[tile.row][tile.col] === CellType.GoldDeposit;

    if (isMinableBuilding || isGoldDeposit) {
      const builders = this.unitMgr.selected.filter(
        u => u instanceof BuilderUnit && u.alive
      ) as BuilderUnit[];
      if (builders.length > 0) {
        const playerBase = this.buildingMgr.getBase('player');
        const baseCol = playerBase ? playerBase.col : this.mapResult.playerBase.col - 1;
        const baseRow = playerBase ? playerBase.row : this.mapResult.playerBase.row - 1;
        for (const b of builders) {
          this.unitMgr.commandMine(b, tile.col, tile.row, baseCol, baseRow);
        }
        return;
      }
    }

    // Shift+right-click = attack-move, plain right-click = move
    if (pointer.event.shiftKey) {
      this.unitMgr.commandAttackMove(tile.col, tile.row);
    } else {
      this.unitMgr.commandMove(tile.col, tile.row);
    }
  }

  private handleBuildClick(wx: number, wy: number, shift: boolean): void {
    if (!this.buildMode.active) return;

    const tile = this.worldToTile(wx, wy);
    let success: boolean;
    if (this.buildMode.isTower) {
      success = this.unitMgr.commandBuildTower(this.buildMode.buildingId, tile.col, tile.row);
    } else {
      success = this.unitMgr.commandBuild(this.buildMode.buildingId, tile.col, tile.row);
    }

    // #5: Exit build mode after placing, unless shift is held
    if (!shift) {
      this.buildMode = { active: false };
    }
  }

  // ── Terrain (static) ──

  private drawTerrain(): void {
    const grid = this.mapResult.grid;
    const totalCols = grid.cols;
    const totalRows = grid.rows;
    const worldW = totalCols * TILE_SIZE;
    const worldH = totalRows * TILE_SIZE;

    // Ground fill as one big rectangle (much cheaper than per-tile)
    const bg = this.add.graphics();
    bg.fillStyle(COLOR_GROUND, 1);
    bg.fillRect(0, 0, worldW, worldH);
    this.gameWorldObjects.push(bg);

    // Only draw non-ground tiles
    const terrain = this.add.graphics();
    this.gameWorldObjects.push(terrain);
    for (let row = 0; row < totalRows; row++) {
      for (let col = 0; col < totalCols; col++) {
        const cell = grid.cells[row][col];
        if (cell === CellType.Empty) continue; // skip — background covers it

        const x = col * TILE_SIZE;
        const y = row * TILE_SIZE;

        switch (cell) {
          case CellType.Blocked:
            terrain.fillStyle(COLOR_BLOCKED, 1);
            terrain.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            break;
          case CellType.NoBuild:
            terrain.fillStyle(COLOR_NOBUILD, 0.8);
            terrain.fillRect(x, y, TILE_SIZE, TILE_SIZE);
            break;
          case CellType.GoldDeposit:
            // Draw gold deposit as a bright marker with glow
            terrain.fillStyle(0x665522, 0.5);
            terrain.fillRect(x - TILE_SIZE * 0.5, y - TILE_SIZE * 0.5, TILE_SIZE * 2, TILE_SIZE * 2);
            terrain.fillStyle(COLOR_GOLD_DEPOSIT, 0.9);
            terrain.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            terrain.fillStyle(0xffdd44, 0.6);
            terrain.fillRect(x + 6, y + 6, TILE_SIZE - 12, TILE_SIZE - 12);
            break;
          case CellType.Geyser:
            // Draw geyser as a bright green marker with glow
            terrain.fillStyle(0x114433, 0.5);
            terrain.fillRect(x - TILE_SIZE * 0.5, y - TILE_SIZE * 0.5, TILE_SIZE * 2, TILE_SIZE * 2);
            terrain.fillStyle(COLOR_GEYSER, 0.8);
            terrain.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
            terrain.fillStyle(0x44ffaa, 0.5);
            terrain.fillRect(x + 6, y + 6, TILE_SIZE - 12, TILE_SIZE - 12);
            break;
        }
      }
    }

    // Grid lines — draw only every 4th line for performance on large maps
    const gridLines = this.add.graphics();
    this.gameWorldObjects.push(gridLines);
    gridLines.lineStyle(1, COLOR_GRID_LINE, 0.1);
    const lineStep = 4;
    for (let col = 0; col <= totalCols; col += lineStep) gridLines.lineBetween(col * TILE_SIZE, 0, col * TILE_SIZE, worldH);
    for (let row = 0; row <= totalRows; row += lineStep) gridLines.lineBetween(0, row * TILE_SIZE, worldW, row * TILE_SIZE);
  }

  private drawChunkBorders(): void {
    const grid = this.mapResult.grid;
    const g = this.add.graphics();
    this.gameWorldObjects.push(g);
    g.lineStyle(1, 0x444400, 0.25);
    for (let cx = 1; cx < this.mapResult.chunksX; cx++) {
      const x = cx * CHUNK_SIZE * TILE_SIZE;
      g.lineBetween(x, 0, x, grid.rows * TILE_SIZE);
    }
    for (let cy = 1; cy < this.mapResult.chunksY; cy++) {
      const y = cy * CHUNK_SIZE * TILE_SIZE;
      g.lineBetween(0, y, grid.cols * TILE_SIZE, y);
    }
  }

  // ── Dynamic Rendering ──

  private drawBuildings(): void {
    const g = this.buildingGraphics;
    g.clear();

    for (const b of this.buildingMgr.buildings) {
      if (b.destroyed) continue;
      // CPU buildings: hide in unexplored, show dimmed in explored, full in visible
      let fogDim = 1.0;
      if (b.owner === 'cpu') {
        const fogState = this.fogOfWar.getState(b.col, b.row);
        if (fogState === 0) continue; // unexplored — fully hidden
        if (fogState === 1) fogDim = 0.35; // explored — ghosted
      }
      const x = b.col * TILE_SIZE;
      const y = b.row * TILE_SIZE;
      const size = b.def.footprint * TILE_SIZE;

      const alpha = (b.isBuilt ? 0.8 : 0.3 + 0.4 * b.buildProgress) * fogDim;
      g.fillStyle(b.def.color, alpha);
      g.fillRect(x + 1, y + 1, size - 2, size - 2);

      const borderColor = b.owner === 'player' ? 0x4488ff : 0xff4444;
      g.lineStyle(b.def.category === 'base' ? 3 : 1, borderColor, b.isBuilt ? 0.9 : 0.4);
      g.strokeRect(x + 1, y + 1, size - 2, size - 2);

      // HP bar
      if (b.hp < b.maxHp || !b.isBuilt) {
        const barW = size - 4;
        const barX = x + 2;
        const barY = y + size - 5;
        const hpRatio = b.hp / b.maxHp;
        g.fillStyle(0x000000, 0.6);
        g.fillRect(barX, barY, barW, 3);
        g.fillStyle(hpRatio > 0.5 ? 0x44ff44 : hpRatio > 0.25 ? 0xffaa44 : 0xff4444, 0.8);
        g.fillRect(barX, barY, barW * hpRatio, 3);
      }

      // Build progress
      if (!b.isBuilt) {
        const barW = size - 4;
        g.fillStyle(0x000000, 0.6);
        g.fillRect(x + 2, y + 2, barW, 2);
        g.fillStyle(0x44aaff, 0.8);
        g.fillRect(x + 2, y + 2, barW * b.buildProgress, 2);
      }

      // Selection highlight for player buildings
      if (b === this.selectedBuilding) {
        g.lineStyle(2, 0x44ff44, 0.8);
        g.strokeRect(x - 1, y - 1, size + 2, size + 2);
      }
    }

    // Rally point flag for selected base or barracks
    const selCat = this.selectedBuilding?.def.category;
    if ((selCat === 'barracks' || selCat === 'base') && this.selectedBuilding?.isBuilt) {
      const rb = this.selectedBuilding!;
      const rx = rb.rallyCol * TILE_SIZE + TILE_SIZE / 2;
      const ry = rb.rallyRow * TILE_SIZE + TILE_SIZE / 2;
      const bx = (rb.col + rb.def.footprint / 2) * TILE_SIZE;
      const by = (rb.row + rb.def.footprint / 2) * TILE_SIZE;

      // Line from barracks to rally
      g.lineStyle(1, 0x44ff44, 0.3);
      g.lineBetween(bx, by, rx, ry);

      // Flag
      g.fillStyle(0x44ff44, 0.8);
      g.fillTriangle(rx, ry - 10, rx + 8, ry - 6, rx, ry - 2);
      g.lineStyle(1, 0x44ff44, 0.9);
      g.lineBetween(rx, ry, rx, ry - 10);
    }
  }

  private drawTowers(): void {
    const g = this.towerGraphics;
    g.clear();

    for (const t of this.towerDef.towers) {
      if (t.destroyed) continue;
      let fogDim = 1.0;
      if (t.owner === 'cpu') {
        const fogState = this.fogOfWar.getState(t.col, t.row);
        if (fogState === 0) continue;
        if (fogState === 1) fogDim = 0.35;
      }
      const size = TILE_SIZE;
      const halfSize = size / 2;
      const alpha = (t.isBuilt ? 0.9 : 0.3 + 0.5 * t.buildProgress) * fogDim;

      // Tower body — filled square with color
      g.fillStyle(t.def.color, alpha);
      g.fillRect(t.x - halfSize + 2, t.y - halfSize + 2, size - 4, size - 4);

      // Owner border
      const borderColor = t.owner === 'player' ? 0x4488ff : 0xff4444;
      g.lineStyle(2, borderColor, t.isBuilt ? 0.8 : 0.3);
      g.strokeRect(t.x - halfSize + 2, t.y - halfSize + 2, size - 4, size - 4);

      // Range indicator (subtle circle when selected/hovered — skip for now)

      // HP bar
      if (t.hp < t.maxHp || !t.isBuilt) {
        const barW = size - 6;
        const barX = t.x - barW / 2;
        const barY = t.y + halfSize - 4;
        const hpRatio = t.hp / t.maxHp;
        g.fillStyle(0x000000, 0.6);
        g.fillRect(barX, barY, barW, 3);
        g.fillStyle(hpRatio > 0.5 ? 0x44ff44 : 0xff4444, 0.8);
        g.fillRect(barX, barY, barW * hpRatio, 3);
      }

      // Build progress
      if (!t.isBuilt) {
        const barW = size - 6;
        g.fillStyle(0x000000, 0.6);
        g.fillRect(t.x - barW / 2, t.y - halfSize + 3, barW, 2);
        g.fillStyle(0x44aaff, 0.8);
        g.fillRect(t.x - barW / 2, t.y - halfSize + 3, barW * t.buildProgress, 2);
      }
    }
  }

  private drawUnits(): void {
    const g = this.unitGraphics;
    g.clear();

    for (const unit of this.unitMgr.units) {
      if (!unit.alive) continue;
      // Hide CPU units in fog
      if (unit.owner === 'cpu' && !this.isVisibleToPlayer(unit.x, unit.y)) continue;

      const isBuilder = unit instanceof BuilderUnit;
      const isCombat = unit instanceof CombatUnit;
      const size = TILE_SIZE * (isBuilder ? 0.3 : isCombat ? 0.35 : 0.25);
      const color = isBuilder ? (unit as BuilderUnit).color
        : isCombat ? (unit as CombatUnit).color : 0xffffff;

      // Selection ring
      if (unit.selected) {
        g.lineStyle(2, 0x44ff44, 0.8);
        g.strokeCircle(unit.x, unit.y, size + 3);
      }

      if (isCombat) {
        // Diamond shape for combat units
        g.fillStyle(color, 0.9);
        g.beginPath();
        g.moveTo(unit.x, unit.y - size);
        g.lineTo(unit.x + size, unit.y);
        g.lineTo(unit.x, unit.y + size);
        g.lineTo(unit.x - size, unit.y);
        g.closePath();
        g.fillPath();
      } else {
        // Circle for builders
        g.fillStyle(color, 0.9);
        g.fillCircle(unit.x, unit.y, size);
      }

      // Owner pip
      const ownerColor = unit.owner === 'player' ? 0x4488ff : 0xff4444;
      g.fillStyle(ownerColor, 1);
      g.fillCircle(unit.x, unit.y - size - 2, 2);

      // State indicator
      if (unit.state === 'building') {
        g.lineStyle(1, 0xffff44, 0.8);
        g.lineBetween(unit.x - 3, unit.y - 3, unit.x + 3, unit.y + 3);
        g.lineBetween(unit.x + 3, unit.y - 3, unit.x - 3, unit.y + 3);
      } else if (unit.state === 'mining') {
        // Pickaxe indicator
        g.lineStyle(2, 0xccaa22, 0.8);
        g.lineBetween(unit.x - 4, unit.y - 4, unit.x + 2, unit.y + 2);
        g.lineBetween(unit.x + 2, unit.y + 2, unit.x + 4, unit.y);
      } else if (unit.state === 'attacking') {
        g.lineStyle(1, 0xff4444, 0.8);
        g.strokeCircle(unit.x, unit.y, size + 1);
      }

      // HP bar (only if damaged)
      if (unit.hp < unit.maxHp) {
        const barW = TILE_SIZE * 0.5;
        const barX = unit.x - barW / 2;
        const barY = unit.y - size - 6;
        const hpRatio = unit.hp / unit.maxHp;
        g.fillStyle(0x333333, 0.8);
        g.fillRect(barX, barY, barW, 2);
        g.fillStyle(0x44ff44, 1);
        g.fillRect(barX, barY, barW * hpRatio, 2);
      }
    }
  }

  private drawHover(): void {
    const g = this.hoverGraphics;
    g.clear();

    if (!this.buildMode.active) return;

    const pointer = this.input.activePointer;
    const world = this.pointerWorld(pointer);
    const tile = this.worldToTile(world.x, world.y);
    const x = tile.col * TILE_SIZE;
    const y = tile.row * TILE_SIZE;

    if (this.buildMode.isTower) {
      const cost = this.towerDef.getTowerCost(this.buildMode.buildingId);
      const canAfford = this.resources.canAfford('gold', cost);
      const canPlace = this.towerDef.canPlace(tile.col, tile.row) && canAfford;
      const color = canPlace ? 0x44ff44 : 0xff4444;
      g.fillStyle(color, 0.25);
      g.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      g.lineStyle(2, color, 0.6);
      g.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
      if (canPlace) {
        const tDef = TOWER_TYPES[this.buildMode.buildingId];
        if (tDef) {
          g.lineStyle(1, 0xffffff, 0.15);
          g.strokeCircle(x + TILE_SIZE / 2, y + TILE_SIZE / 2, tDef.range * TILE_SIZE);
        }
      }
    } else {
      const def = BUILDING_TYPES[this.buildMode.buildingId];
      if (!def) return;
      const canAfford = this.resources.canAfford('gold', def.costGold) &&
        (def.costGas <= 0 || this.resources.canAfford('gas', def.costGas));
      const canPlace = this.buildingMgr.canPlace(def, tile.col, tile.row) && canAfford;
      const size = def.footprint * TILE_SIZE;
      const color = canPlace ? 0x44ff44 : 0xff4444;
      g.fillStyle(color, 0.25);
      g.fillRect(x, y, size, size);
      g.lineStyle(2, color, 0.6);
      g.strokeRect(x, y, size, size);
    }
  }

  private drawSelectionBox(): void {
    const g = this.selectionBoxGraphics;
    g.clear();

    if (!this.isDragging || !this.dragStart) return;

    const pointer = this.input.activePointer;
    const world = this.pointerWorld(pointer);

    const x1 = this.dragStart.x;
    const y1 = this.dragStart.y;
    const x2 = world.x;
    const y2 = world.y;

    g.lineStyle(1, 0x44ff44, 0.7);
    g.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
    g.fillStyle(0x44ff44, 0.1);
    g.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
  }

  /** Update fog visibility and render overlay */
  private updateFogState(): void {
    const playerUnits = this.unitMgr.getByOwner('player');
    const playerBuildings = this.buildingMgr.getByOwner('player');
    const playerTowers = this.towerDef.towers.filter(t => !t.destroyed && t.owner === 'player');
    this.fogOfWar.update(playerUnits, playerBuildings, playerTowers);

    // Render fog overlay — 4×4 blocks, viewport only
    const g = this.fogGraphics;
    g.clear();
    const cam = this.cameras.main;
    const viewL = cam.scrollX - cam.width / cam.zoom * 0.5;
    const viewT = cam.scrollY - cam.height / cam.zoom * 0.5;
    const viewR = viewL + cam.width / cam.zoom * 2;
    const viewB = viewT + cam.height / cam.zoom * 2;

    const step = 4;
    const startCol = Math.max(0, Math.floor(viewL / TILE_SIZE));
    const endCol = Math.min(this.fogOfWar.cols, Math.ceil(viewR / TILE_SIZE));
    const startRow = Math.max(0, Math.floor(viewT / TILE_SIZE));
    const endRow = Math.min(this.fogOfWar.rows, Math.ceil(viewB / TILE_SIZE));

    for (let row = startRow; row < endRow; row += step) {
      for (let col = startCol; col < endCol; col += step) {
        // Use max visibility in the block (show block as most-visible tile)
        let maxState = 0;
        for (let dr = 0; dr < step && row + dr < this.fogOfWar.rows; dr++) {
          for (let dc = 0; dc < step && col + dc < this.fogOfWar.cols; dc++) {
            const s = this.fogOfWar.getState(col + dc, row + dr);
            if (s > maxState) maxState = s;
          }
        }
        if (maxState === 2) continue; // fully visible

        const x = col * TILE_SIZE;
        const y = row * TILE_SIZE;
        const size = step * TILE_SIZE;
        g.fillStyle(0x000000, maxState === 0 ? 0.85 : 0.4);
        g.fillRect(x, y, size, size);
      }
    }
  }

  /** Check if an enemy entity should be hidden by fog */
  private isVisibleToPlayer(px: number, py: number): boolean {
    const col = Math.floor(px / TILE_SIZE);
    const row = Math.floor(py / TILE_SIZE);
    return this.fogOfWar.isVisible(col, row);
  }

  private drawMinimap(): void {
    const g = this.minimapGraphics;
    g.clear();
    const mx = this.minimapX;
    const my = this.minimapY;
    const sx = this.minimapScaleX;
    const sy = this.minimapScaleY;
    const grid = this.mapResult.grid;

    // Background
    g.fillStyle(0x111111, 0.85);
    g.fillRect(mx, my, this.minimapW, this.minimapH);
    g.lineStyle(1, 0x555555, 0.7);
    g.strokeRect(mx, my, this.minimapW, this.minimapH);

    // Terrain (simplified — only blocked cells)
    g.fillStyle(0x333333, 1);
    const step = 3; // sample every 3 tiles for performance
    for (let row = 0; row < grid.rows; row += step) {
      for (let col = 0; col < grid.cols; col += step) {
        const cell = grid.cells[row][col];
        if (cell === CellType.Blocked) {
          g.fillRect(
            mx + col * TILE_SIZE * sx,
            my + row * TILE_SIZE * sy,
            step * TILE_SIZE * sx + 1,
            step * TILE_SIZE * sy + 1,
          );
        } else if (cell === CellType.GoldDeposit) {
          g.fillStyle(0xccaa22, 0.8);
          g.fillRect(mx + col * TILE_SIZE * sx, my + row * TILE_SIZE * sy, 2, 2);
          g.fillStyle(0x333333, 1);
        } else if (cell === CellType.Geyser) {
          g.fillStyle(0x22cc88, 0.8);
          g.fillRect(mx + col * TILE_SIZE * sx, my + row * TILE_SIZE * sy, 2, 2);
          g.fillStyle(0x333333, 1);
        }
      }
    }

    // Fog overlay on minimap
    for (let row = 0; row < grid.rows; row += step * 2) {
      for (let col = 0; col < grid.cols; col += step * 2) {
        const fogState = this.fogOfWar.getState(col, row);
        if (fogState === 2) continue;
        const fx = mx + col * TILE_SIZE * sx;
        const fy = my + row * TILE_SIZE * sy;
        const fw = step * 2 * TILE_SIZE * sx + 1;
        const fh = step * 2 * TILE_SIZE * sy + 1;
        g.fillStyle(0x000000, fogState === 0 ? 0.9 : 0.4);
        g.fillRect(fx, fy, fw, fh);
      }
    }

    // Buildings (only visible or player-owned)
    for (const b of this.buildingMgr.buildings) {
      if (b.destroyed) continue;
      if (b.owner === 'cpu' && !this.fogOfWar.isVisible(b.col, b.row)) continue;
      const bx = mx + b.col * TILE_SIZE * sx;
      const by = my + b.row * TILE_SIZE * sy;
      const bw = Math.max(2, b.def.footprint * TILE_SIZE * sx);
      const bh = Math.max(2, b.def.footprint * TILE_SIZE * sy);
      g.fillStyle(b.owner === 'player' ? 0x4488ff : 0xff4444, 0.9);
      g.fillRect(bx, by, bw, bh);
    }

    // Units (only visible or player-owned)
    for (const u of this.unitMgr.units) {
      if (!u.alive) continue;
      if (u.owner === 'cpu' && !this.isVisibleToPlayer(u.x, u.y)) continue;
      const ux = mx + u.x * sx;
      const uy = my + u.y * sy;
      g.fillStyle(u.owner === 'player' ? 0x44ff44 : 0xff6644, 1);
      g.fillRect(ux - 1, uy - 1, 2, 2);
    }

    // Camera viewport rectangle
    const cam = this.cameras.main;
    const viewW = cam.width / cam.zoom;
    const viewH = cam.height / cam.zoom;
    g.lineStyle(1, 0xffffff, 0.6);
    g.strokeRect(
      mx + cam.scrollX * sx,
      my + cam.scrollY * sy,
      viewW * sx,
      viewH * sy,
    );
  }

  private checkWinLose(): void {
    if (this.gameOver) return;

    // Lose if ALL player bases destroyed, win if ALL CPU bases destroyed
    const playerBases = this.buildingMgr.getByCategory('player', 'base');
    const cpuBases = this.buildingMgr.getByCategory('cpu', 'base');

    if (playerBases.length === 0) {
      this.gameOver = true;
      this.showGameOver(false);
    } else if (cpuBases.length === 0) {
      this.gameOver = true;
      this.showGameOver(true);
    }
  }

  private showGameOver(won: boolean): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, this.scale.width, this.scale.height);
    this.uiElements.push(overlay);
    this.cameras.main.ignore(overlay);

    const title = this.add.text(cx, cy - 40, won ? 'VICTORY!' : 'DEFEAT', {
      fontSize: '48px', color: won ? '#44ff44' : '#ff4444', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.uiElements.push(title);
    this.cameras.main.ignore(title);

    const subtitle = this.add.text(cx, cy + 20, won ? 'Enemy base destroyed!' : 'Your base was destroyed!', {
      fontSize: '18px', color: '#cccccc', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.uiElements.push(subtitle);
    this.cameras.main.ignore(subtitle);

    const menuBtn = this.add.text(cx, cy + 70, '[ Click to return to menu ]', {
      fontSize: '16px', color: '#aaaaaa', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    menuBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    this.uiElements.push(menuBtn);
    this.cameras.main.ignore(menuBtn);
  }

  // ── Resources ──

  private setupResources(): void {
    // Player resources
    this.resources = new ResourceManager(this.eventBus);
    this.resources.addResource({ id: 'gold', name: 'Gold', startingAmount: 150, tickRate: 0, color: '#ffcc00' });
    this.resources.addResource({ id: 'gas', name: 'Vespene', startingAmount: 0, tickRate: 0, color: '#22cc88' });

    // CPU resources (separate pool)
    this.cpuResources = new ResourceManager(this.eventBus);
    this.cpuResources.addResource({ id: 'gold', name: 'Gold', startingAmount: 200, tickRate: 0, color: '#ffcc00' });
    this.cpuResources.addResource({ id: 'gas', name: 'Vespene', startingAmount: 0, tickRate: 0, color: '#22cc88' });
  }

  // ── HUD ──

  private setupHUD(): void {
    const uiCam = this.cameras.add(0, 0, this.scale.width, this.scale.height);
    uiCam.setName('ui');
    uiCam.setScroll(0, 0);

    // Top bar
    this.hudText = this.add.text(10, 10, '', {
      fontSize: '13px', color: '#ffffff', fontFamily: 'monospace',
      backgroundColor: '#000000aa', padding: { x: 8, y: 4 },
    });
    this.uiElements.push(this.hudText);

    // Dynamic command panel (bottom-left) — rebuilt based on selection context
    this.commandPanelGraphics = this.add.graphics();
    this.uiElements.push(this.commandPanelGraphics);

    // Back button
    const backBtn = this.add.text(this.scale.width - 120, this.scale.height - 26, '[ ESC ] Menu', {
      fontSize: '11px', color: '#666666', fontFamily: 'monospace',
      backgroundColor: '#00000088', padding: { x: 6, y: 2 },
    }).setInteractive({ useHandCursor: true });
    backBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    this.uiElements.push(backBtn);

    // Mini-map (top-right)
    this.minimapX = this.scale.width - this.minimapW - 10;
    this.minimapY = 10;
    this.minimapScaleX = this.minimapW / (this.mapResult.grid.cols * TILE_SIZE);
    this.minimapScaleY = this.minimapH / (this.mapResult.grid.rows * TILE_SIZE);
    this.minimapGraphics = this.add.graphics();
    this.uiElements.push(this.minimapGraphics);

    // Minimap click handler
    const mmZone = this.add.zone(
      this.minimapX + this.minimapW / 2, this.minimapY + this.minimapH / 2,
      this.minimapW, this.minimapH,
    ).setInteractive();
    mmZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const relX = pointer.x - this.minimapX;
      const relY = pointer.y - this.minimapY;
      const worldX = relX / this.minimapScaleX;
      const worldY = relY / this.minimapScaleY;
      this.cameras.main.centerOn(worldX, worldY);
    });
    this.uiElements.push(mmZone);

    // Camera separation:
    // - Main camera sees game world, NOT UI elements
    // - UI camera sees UI elements, NOT game world
    const uiCamera = this.cameras.getCamera('ui');
    for (const el of this.uiElements) {
      this.cameras.main.ignore(el);
    }
    if (uiCamera) {
      // Ignore all tracked game-world objects (terrain, chunk borders)
      for (const obj of this.gameWorldObjects) {
        uiCamera.ignore(obj);
      }
      // Ignore dynamic rendering layers
      const dynamicLayers = [
        this.fogGraphics, this.buildingGraphics, this.towerGraphics,
        this.unitGraphics, this.hoverGraphics, this.selectionBoxGraphics,
      ];
      for (const obj of dynamicLayers) {
        uiCamera.ignore(obj);
      }
    }
  }

  // ── Update ──

  update(time: number, delta: number): void {
    const deltaSec = delta / 1000;

    this.handleCameraScroll(delta);

    // Tick systems
    this.buildingMgr.update(deltaSec, this.unitMgr.units);
    this.unitMgr.update(deltaSec, time);
    this.cpuAI.update(deltaSec);
    this.waves.update(deltaSec);

    // Update towers — each side's towers attack the opposing side's units
    const cpuUnits = this.unitMgr.getByOwner('cpu');
    const playerUnits = this.unitMgr.getByOwner('player');
    this.towerDef.update(deltaSec, time, playerUnits, cpuUnits);

    // Check win/lose
    this.checkWinLose();
    if (this.gameOver) return;

    // Fog of war (update visibility tracking but skip rendering for now — TODO: use render texture)
    this.updateFogState();

    // Render dynamic layers
    this.drawBuildings();
    this.drawTowers();
    this.drawUnits();
    this.drawHover();
    this.drawSelectionBox();
    this.drawMinimap();
    this.updateCommandPanel();
    this.updateHUD();
  }

  private handleCameraScroll(delta: number): void {
    const cam = this.cameras.main;
    const speed = SCROLL_SPEED * (delta / 1000) / cam.zoom;

    let dx = 0;
    let dy = 0;
    // A/D only scroll camera when no units selected (A is also attack-move hotkey)
    const hasSelection = this.unitMgr.selected.length > 0;
    if (this.cursors?.left.isDown || (!hasSelection && this.keyA?.isDown)) dx -= speed;
    if (this.cursors?.right.isDown || (!hasSelection && this.keyD?.isDown)) dx += speed;
    if (this.cursors?.up.isDown || this.keyW?.isDown) dy -= speed;
    if (this.cursors?.down.isDown || this.keyS?.isDown) dy += speed;

    const pointer = this.input.activePointer;
    if (pointer.x < EDGE_SCROLL_MARGIN) dx -= speed;
    if (pointer.x > this.scale.width - EDGE_SCROLL_MARGIN) dx += speed;
    if (pointer.y < EDGE_SCROLL_MARGIN) dy -= speed;
    if (pointer.y > this.scale.height - EDGE_SCROLL_MARGIN) dy += speed;

    if (dx !== 0 || dy !== 0) {
      cam.scrollX += dx;
      cam.scrollY += dy;
    }
  }

  /** Rebuild the bottom command panel based on current selection context */
  private updateCommandPanel(): void {
    // Determine context
    const sel = this.unitMgr.selected;
    const hasBuilder = sel.some(u => u instanceof BuilderUnit);
    const hasCombat = sel.some(u => u instanceof CombatUnit);
    const selBldg = this.selectedBuilding;

    let context = 'none';
    if (this.buildMode.active) context = 'buildmode';
    else if (hasBuilder) context = 'builder';
    else if (selBldg?.def.category === 'barracks') context = `barracks:${selBldg.trainingQueue.length}:${Math.floor(selBldg.trainingProgress * 10)}:oc${Math.floor(selBldg.overclockTimer)}`;
    else if (selBldg?.def.category === 'base') context = `base:${selBldg.trainingQueue.length}:${Math.floor(selBldg.trainingProgress * 10)}:oc${Math.floor(selBldg.overclockTimer)}`;
    else if (selBldg) context = `building:${selBldg.def.id}:${selBldg.hp}`;
    else if (hasCombat) {
      const blinkCd = sel.filter(u => u instanceof CombatUnit).map(u => Math.floor((u as CombatUnit).blinkCooldown)).join(',');
      context = `combat:${sel.length}:b${blinkCd}`;
    }
    else if (sel.length > 0) context = 'units';

    // Only rebuild if context changed
    if (context === this.lastPanelContext) return;
    this.lastPanelContext = context;

    // Clear old panel
    for (const t of this.commandPanelTexts) t.destroy();
    this.commandPanelTexts = [];
    this.commandPanelGraphics.clear();

    const panelY = this.scale.height - 80;
    const panelW = Math.min(this.scale.width - 20, 1100);
    const g = this.commandPanelGraphics;
    g.fillStyle(0x000000, 0.7);
    g.fillRect(10, panelY, panelW, 70);
    g.lineStyle(1, 0x555555, 0.5);
    g.strokeRect(10, panelY, panelW, 70);

    const items: { label: string; color: string; bg: string; action?: () => void }[] = [];

    if (context === 'builder' || context.startsWith('buildmode')) {
      // Buildings
      const bIds = getFactionBuildingIds(this.faction);
      for (let i = 0; i < bIds.length; i++) {
        const def = BUILDING_TYPES[bIds[i]];
        if (!def) continue;
        const cost = def.costGas > 0 ? `${def.costGold}g+${def.costGas}v` : `${def.costGold}g`;
        const bid = bIds[i];
        items.push({
          label: `[${i + 1}] ${def.name}\n    ${cost} ${def.buildTime}s`,
          color: '#cccccc', bg: '#333333',
          action: () => { this.buildMode = { active: true, buildingId: bid }; },
        });
      }
      // Towers
      const tIds = this.towerDef.getTowerIds(this.faction);
      for (let i = 0; i < Math.min(5, tIds.length); i++) {
        const tDef = TOWER_TYPES[tIds[i]];
        if (!tDef) continue;
        const cost = this.towerDef.getTowerCost(tIds[i]);
        const tid = tIds[i];
        items.push({
          label: `[${bIds.length + i + 1}] ${tDef.name}\n    ${cost}g`,
          color: '#ddcc88', bg: '#333322',
          action: () => { this.buildMode = { active: true, buildingId: tid, isTower: true }; },
        });
      }
    } else if (context.startsWith('barracks') && selBldg) {
      const unitIds = getFactionUnitIds(this.faction);
      const keys = ['Q', 'R', 'T'];
      const hasExtractor = this.buildingMgr.getByCategory('player', 'extractor').length > 0;
      for (let i = 0; i < unitIds.length && i < keys.length; i++) {
        const def = COMBAT_UNIT_TYPES[unitIds[i]];
        if (!def) continue;
        const cost = def.costGas > 0 ? `${def.costGold}g+${def.costGas}v` : `${def.costGold}g`;
        const locked = def.role === 'heavy' && !hasExtractor;
        const uid = unitIds[i];
        items.push({
          label: `[${keys[i]}] ${def.name}\n    ${cost} ${def.trainTime}s HP:${def.hp} DMG:${def.damage}${locked ? ' LOCKED' : ''}`,
          color: locked ? '#666666' : '#cccccc', bg: locked ? '#222222' : '#333333',
          action: locked ? undefined : () => { this.unitMgr.queueTraining(selBldg, uid, 'player'); },
        });
      }
      // Cancel button
      items.push({
        label: `[X] Cancel\n    last queued`,
        color: '#ff8888', bg: '#332222',
        action: () => { this.unitMgr.cancelTraining(selBldg, 'player'); },
      });
      // Show queue
      if (selBldg.trainingQueue.length > 0) {
        const queueNames = selBldg.trainingQueue.map(id => {
          const d = COMBAT_UNIT_TYPES[id]; return d ? d.name.slice(0, 8) : '?';
        });
        const pBar = `[${'='.repeat(Math.floor(selBldg.trainingProgress * 10))}${'.'.repeat(10 - Math.floor(selBldg.trainingProgress * 10))}]`;
        items.push({ label: `${pBar}\n    ${queueNames.join(' → ')}`, color: '#88aaff', bg: '#222233' });
      }
      // Overclock for Mechanical
      if (selBldg.def.faction === 'mechanical') {
        const canOC = selBldg.overclockCooldown <= 0 && !selBldg.isOverclocked && selBldg.hp > 50;
        const ocLabel = selBldg.isOverclocked ? `OVERCLOCKED!\n    ${Math.ceil(selBldg.overclockTimer)}s left`
          : selBldg.overclockCooldown > 0 ? `[O] Overclock\n    CD: ${Math.ceil(selBldg.overclockCooldown)}s`
          : `[O] Overclock\n    2× speed, -50HP`;
        items.push({ label: ocLabel, color: selBldg.isOverclocked ? '#ffaa00' : canOC ? '#ffcc44' : '#666644', bg: '#332200',
          action: canOC ? () => { selBldg.activateOverclock(); } : undefined });
      }
    } else if (context.startsWith('base') && selBldg) {
      items.push({
        label: `[Q] Train Builder\n    50g 6s HP:60 (1 supply)`,
        color: '#cccccc', bg: '#333333',
        action: () => { this.unitMgr.queueBuilderTraining(selBldg, 'player'); },
      });
      items.push({
        label: `[X] Cancel\n    last queued`,
        color: '#ff8888', bg: '#332222',
        action: () => { this.unitMgr.cancelBuilderTraining(selBldg, 'player'); },
      });
      // Show queue
      if (selBldg.trainingQueue.length > 0) {
        const pBar = `[${'='.repeat(Math.floor(selBldg.trainingProgress * 10))}${'.'.repeat(10 - Math.floor(selBldg.trainingProgress * 10))}]`;
        items.push({ label: `${pBar}\n    Queue: ${selBldg.trainingQueue.length} builder(s)`, color: '#88aaff', bg: '#222233' });
      }
    } else if (context.startsWith('combat')) {
      const combat = sel.filter(u => u instanceof CombatUnit) as CombatUnit[];
      if (combat.length === 1) {
        const u = combat[0];
        items.push({ label: `${u.def.name}\nHP:${u.hp}/${u.maxHp} DMG:${u.damage} SPD:${u.moveSpeed} RNG:${Math.round(u.attackRange / TILE_SIZE)}`, color: '#cccccc', bg: '#333333' });
      } else {
        items.push({ label: `${combat.length} units selected\n[A] Attack-move  [RMB] Move`, color: '#cccccc', bg: '#333333' });
      }
      // Blink for Arcane
      if (this.faction === 'arcane') {
        const blinkReady = combat.filter(u => u.def.faction === 'arcane' && u.blinkCooldown <= 0);
        if (blinkReady.length > 0) {
          items.push({ label: `[B] Blink\n    Teleport 8 tiles`, color: '#aa88ff', bg: '#332244' });
        } else {
          const minCd = Math.min(...combat.filter(u => u.def.faction === 'arcane').map(u => u.blinkCooldown));
          items.push({ label: `[B] Blink\n    CD: ${Math.ceil(minCd)}s`, color: '#665588', bg: '#222233' });
        }
      }
    } else if (context.startsWith('building:') && selBldg) {
      items.push({ label: `${selBldg.def.name}\nHP:${selBldg.hp}/${selBldg.maxHp}`, color: '#cccccc', bg: '#333333' });
    } else {
      items.push({ label: 'Select a unit or building\nLMB: select  RMB: move  A: attack-move', color: '#888888', bg: '#222222' });
    }

    // Render items
    let bx = 18;
    for (const item of items) {
      const txt = this.add.text(bx, panelY + 8, item.label, {
        fontSize: '11px', color: item.color, fontFamily: 'monospace',
        backgroundColor: item.bg, padding: { x: 6, y: 4 },
      });
      if (item.action) {
        txt.setInteractive({ useHandCursor: true });
        txt.on('pointerdown', item.action);
        txt.on('pointerover', () => txt.setBackgroundColor('#555555'));
        txt.on('pointerout', () => txt.setBackgroundColor(item.bg));
      }
      this.commandPanelTexts.push(txt);
      this.cameras.main.ignore(txt);
      bx += txt.width + 12;
    }
  }

  private updateHUD(): void {
    const gold = this.resources.get('gold');
    const gas = this.resources.get('gas');
    const supply = this.buildingMgr.getSupply('player');
    const playerBases = this.buildingMgr.getByCategory('player', 'base');
    const cpuBases = this.buildingMgr.getByCategory('cpu', 'base');
    const pTotalHp = playerBases.reduce((s, b) => s + b.hp, 0);
    const pMaxHp = playerBases.reduce((s, b) => s + b.maxHp, 0);
    const cTotalHp = cpuBases.reduce((s, b) => s + b.hp, 0);
    const cMaxHp = cpuBases.reduce((s, b) => s + b.maxHp, 0);
    const baseHp = playerBases.length > 0 ? `${pTotalHp}/${pMaxHp}(${playerBases.length})` : 'DESTROYED';
    const enemyHp = cpuBases.length > 0 ? `${cTotalHp}/${cMaxHp}(${cpuBases.length})` : 'DESTROYED';

    const sel = this.unitMgr.selected;
    let selStr = '';
    if (sel.length > 0) {
      const builders = sel.filter(u => u instanceof BuilderUnit).length;
      const others = sel.length - builders;
      const parts: string[] = [];
      if (builders > 0) parts.push(`${builders} builder${builders > 1 ? 's' : ''}`);
      if (others > 0) parts.push(`${others} unit${others > 1 ? 's' : ''}`);
      selStr = `  |  Selected: ${parts.join(', ')}`;
      if (builders > 0) selStr += ' — [1-4] to build';
    }

    const buildStr = this.buildMode.active
      ? `  |  Placing: ${BUILDING_TYPES[this.buildMode.buildingId]?.name ?? '?'} (click tile, RMB cancel)`
      : '';

    // Attack mode indicator
    const attackStr = this.attackMode ? '  |  ATTACK MODE (click target)' : '';

    // Selected building name (details in bottom command panel now)
    let buildingStr = '';
    if (this.selectedBuilding && !this.selectedBuilding.destroyed) {
      const sb = this.selectedBuilding;
      buildingStr = `  |  ${sb.def.name} HP:${sb.hp}/${sb.maxHp}`;
    }

    const waveStatus = this.waves.getStatus();
    const waveStr = `Wave ${waveStatus.wave} | Next: ${Math.ceil(waveStatus.nextIn)}s`;

    this.hudText.setText(
      `Gold: ${Math.floor(gold)}  Gas: ${Math.floor(gas)}  Supply: ${supply.used}/${supply.max}  Base: ${baseHp}  Enemy: ${enemyHp}  |  ${waveStr}${selStr}${buildStr}${attackStr}${buildingStr}`
    );
  }
}
