/**
 * replay_sim_entry.ts — Browser-side deterministic live simulation engine
 * for ml/desktop/replay-viewer.html.
 *
 * Bundled via esbuild into ml/desktop/replay-sim-bundle.js and attached to
 * `window.ReplaySim`. Given a Replay JSON `{ faction, difficulty, seed, placements }`,
 * it constructs the exact same deterministic game systems as `HeadlessMatch.ts`
 * (Grid, SpawnManager, TowerManager, CreepManager, WaveController, EconomyManager,
 * Rng) and replays the recorded placements on their exact wave / budget triggers
 * while stepping the simulation frame-by-frame in the browser!
 */
import { PathPoint, findPath } from '../../src/systems/Pathfinding';
import { Grid } from '../../src/systems/Grid';
import { EventBus } from '../../src/systems/EventBus';
import { EconomyManager } from '../../src/systems/EconomyManager';
import { IncomeManager } from '../../src/systems/IncomeManager';
import { StatsTracker } from '../../src/systems/StatsTracker';
import { SpawnManager } from '../../src/systems/SpawnManager';
import { SendManager } from '../../src/systems/SendManager';
import { TowerManager } from '../../src/systems/TowerManager';
import { CreepManager, StandardLeakHandler, StandardDeathHandler } from '../../src/systems/CreepManager';
import { WaveController } from '../../src/systems/WaveController';
import { FrontierManager } from '../../src/systems/FrontierManager';
import { MAPS } from '../../src/data/Maps';
import { DIFFICULTIES } from '../../src/data/Difficulty';
import { getWavesForMode, WaveDefinition } from '../../src/data/WaveDefinitions';
import { getTowerType, TOWER_TYPES } from '../../src/data/TowerTypes';
import { STARTING_LIVES, TILE_SIZE, getGridOffsetX, getGridOffsetY } from '../../src/config';
import { EventLog } from '../../src/ui/EventLog';
import '../../src/systems/traits/TowerTraitHandlers';
import '../../src/systems/traits/CreepTraitHandlers';
import { HeadlessScene } from '../../src/headless/HeadlessScene';
import { seedRng } from '../../src/systems/Rng';
import { getTowerSpriteConfig, getProjectileSpriteConfig } from '../../src/systems/SpriteManager';
import { autoTileIndex } from '../../src/systems/TerrainTheme';

export interface ReplayPlacement {
  wave: number;
  kind: 'place' | 'upgrade' | 'sell';
  towerId: string;
  col: number;
  row: number;
  cost?: number;
  goldAfter?: number;
  level?: number;
  branch?: string | null;
}

export interface ReplayData {
  faction: string;
  difficulty: 'hard' | 'normal' | string;
  seed: number;
  won: boolean;
  waveReached: number;
  placements: ReplayPlacement[];
}

export class LiveReplaySession {
  readonly replay: ReplayData;
  readonly grid: Grid;
  readonly economy: EconomyManager;
  readonly statsTracker: StatsTracker;
  readonly towerMgr: TowerManager;
  readonly creepMgr: CreepManager;
  readonly waveMgr: WaveController;
  readonly scene: HeadlessScene;
  readonly allPaths: (PathPoint[] | null)[] = [];
  currentPath: PathPoint[] | null = null;

  currentWave = 0;
  lives = STARTING_LIVES;
  simTime = 0;
  placementCursor = 0;
  outcome: 'running' | 'win' | 'loss' = 'running';
  private brainTicksSinceProgress = 0;

  constructor(replay: ReplayData) {
    this.replay = replay;
    seedRng(replay.seed);
    this.scene = new HeadlessScene();
    const sceneAs = this.scene.asScene();

    const mapDef = MAPS['plains'];
    this.grid = new Grid(mapDef);

    const eventBus = new EventBus();
    this.statsTracker = new StatsTracker();
    this.economy = new EconomyManager(eventBus);
    const incomeMgr = new IncomeManager(eventBus);
    const eventLog = new EventLog(sceneAs, 0);

    const diffKey = (replay.difficulty in DIFFICULTIES ? replay.difficulty : 'hard') as keyof typeof DIFFICULTIES;
    const spawner = new SpawnManager(sceneAs, eventBus, DIFFICULTIES[diffKey], replay.seed);
    spawner.setSpawners(mapDef.spawners ?? null);
    const sendMgr = new SendManager(sceneAs, eventBus);
    if (this.grid.entries.length > 0 && this.grid.exits.length > 0) {
      spawner.setFlyingPath(this.grid.entries[0], this.grid.exits[0]);
      sendMgr.setFlyingPath(this.grid.entries[0], this.grid.exits[0]);
    }

    const leakHandler = new StandardLeakHandler(eventLog, this.statsTracker, () => this.towerMgr.towers);
    const deathHandler = new StandardDeathHandler(this.economy, this.statsTracker, eventBus, 1);
    this.creepMgr = new CreepManager(leakHandler, deathHandler);
    this.towerMgr = new TowerManager(sceneAs, this.grid, this.economy, this.statsTracker, eventLog, eventBus, null);

    const frontierMgr = new FrontierManager(eventBus, incomeMgr, replay.faction as any);

    const waves: WaveDefinition[] = getWavesForMode('standard', 20);
    this.towerMgr.getLives = () => this.lives;
    this.towerMgr.spendLives = (n: number) => { this.lives = Math.max(0, this.lives - n); };

    this.recalcPaths();

    this.waveMgr = new WaveController(waves, spawner, sendMgr, {
      onWaveStart: (_wave, waveNum) => {
        this.currentWave = waveNum;
        eventBus.emit('waveStarted', waveNum);
      },
      onWaveCleared: (waveNum) => {
        eventBus.emit('waveCleared', waveNum);
        this.statsTracker.recordWaveCompleted();
        const bonus = frontierMgr.onWaveEnd(waveNum);
        if (bonus > 0) this.economy.addGold(bonus);
        const income = incomeMgr.getWaveIncome();
        if (income > 0) this.economy.addGold(income);
      },
      canStartWave: () => this.currentPath !== null,
    });
  }

  recalcPaths = (): (PathPoint[] | null)[] => {
    this.allPaths.length = 0;
    for (const entry of this.grid.entries) {
      for (const exit of this.grid.exits) {
        this.allPaths.push(findPath(this.grid, entry, exit));
      }
    }
    this.currentPath = this.allPaths.find(p => p !== null) ?? null;
    return this.allPaths;
  };

  private applyRecordedPlacement(p: ReplayPlacement): boolean {
    if (p.kind === 'place') {
      const tt = getTowerType(p.towerId);
      if (!tt) return false;
      const res = this.towerMgr.placeTower(p.col, p.row, tt, this.allPaths, this.recalcPaths);
      if (!res) return false;
      if (res.pathsChanged) this.recalcPaths();
      return true;
    }
    if (p.kind === 'upgrade') {
      const t = this.towerMgr.towers.find(tw => tw.col === p.col && tw.row === p.row);
      if (!t || !t.canUpgrade()) return false;
      const cost = p.branch
        ? (TOWER_TYPES[t.typeDef.upgrades[0]?.branches?.find(b => b.id === p.branch)?.transformsTo ?? '']?.cost ?? 9999)
        : t.getUpgradeCost();
      if (!this.economy.spend(cost)) return false;
      t.upgrade(p.branch ?? null);
      return true;
    }
    if (p.kind === 'sell') {
      const res = this.towerMgr.sellTower(p.col, p.row);
      if (!res) return false;
      this.recalcPaths();
      return true;
    }
    return false;
  }

  /** Step one 32ms simulation tick — identical to HeadlessMatch main loop. */
  tick(stepMs = 32): void {
    if (this.outcome !== 'running') return;

    // 1. Between-waves placement application
    while (this.waveMgr.betweenWaves && this.placementCursor < this.replay.placements.length) {
      const nextP = this.replay.placements[this.placementCursor];
      if (nextP.wave > this.currentWave) break;
      this.placementCursor++;
      // Backward compatibility for replays that recorded a duplicate mid-wave place on an occupied cell
      if (nextP.kind === 'place' && !this.grid.canPlaceTower(nextP.col, nextP.row)) {
        continue;
      }
      const applied = this.applyRecordedPlacement(nextP);
      if (applied) {
        this.brainTicksSinceProgress = 0;
      }
    }

    // 2. Check win or start next wave
    if (!this.waveMgr.hasMoreWaves() && this.creepMgr.creeps.length === 0) {
      this.outcome = 'win';
      return;
    }
    if (this.waveMgr.betweenWaves) {
      const started = this.waveMgr.startWave(this.allPaths);
      if (!started) {
        this.recalcPaths();
        if (!this.currentPath) {
          this.outcome = 'loss';
          return;
        }
      }
    }

    // 3. Sim clock + combat + creep movement
    this.scene.tick(stepMs);
    this.towerMgr.updateTowers(this.simTime, stepMs, this.creepMgr.creeps, this.creepMgr.justDiedCreeps, () => this.lives);
    this.towerMgr.cleanupExpired();

    const leak = this.creepMgr.update(stepMs);
    this.lives -= leak.totalLeakDamage;
    if (this.lives <= 0) {
      this.lives = 0;
      this.outcome = 'loss';
      return;
    }

    this.waveMgr.updateSpawning(stepMs, this.allPaths, this.currentPath, this.creepMgr.creeps);
    this.waveMgr.checkWaveComplete(this.creepMgr.creeps.length, stepMs);

    this.simTime += stepMs;
    this.brainTicksSinceProgress++;

    // 4. Mid-wave upgrades/sells recorded during active wave
    if (this.brainTicksSinceProgress % 30 === 0 && this.placementCursor < this.replay.placements.length) {
      const nextP = this.replay.placements[this.placementCursor];
      if (nextP.wave === this.currentWave && (nextP.kind === 'upgrade' || nextP.kind === 'sell')) {
        if (this.applyRecordedPlacement(nextP)) {
          this.placementCursor++;
        }
      }
    }
  }

  /** Fast-forward until the simulation reaches targetWave or targetPlacementIndex. */
  skipToWave(targetWave: number): void {
    let guard = 0;
    while (this.outcome === 'running' && this.currentWave < targetWave && guard < 100000) {
      this.tick(32);
      guard++;
    }
  }

  /** Convert internal pixel coordinates (which include gridOffsetX) to 0..36 tile coordinates. */
  getRenderState() {
    const offX = getGridOffsetX();
    const offY = getGridOffsetY();

    const towers = this.towerMgr.towers.map(t => ({
      col: t.col,
      row: t.row,
      typeId: t.typeId,
      level: t.level,
      rangeTiles: t.range / TILE_SIZE,
      lastFired: t.lastFired,
      fireRate: t.fireRate,
      damageDealt: t.damageDealt,
      projectiles: t.projectiles.map(p => ({
        col: (p.x - offX) / TILE_SIZE,
        row: (p.y - offY) / TILE_SIZE,
        destCol: (p.destX - offX) / TILE_SIZE,
        destRow: (p.destY - offY) / TILE_SIZE,
        towerId: p.towerId || t.typeId,
        isPierce: !!p.isPierce,
      })),
    }));

    const creeps = this.creepMgr.creeps
      .filter(c => c.alive && !c.reached)
      .map(c => ({
        col: (c.x - offX) / TILE_SIZE,
        row: (c.y - offY) / TILE_SIZE,
        hp: c.hp,
        maxHp: c.maxHp,
        typeId: c.creepType.id,
        isBoss: c.isBoss,
        size: c.size,
        slowed: c.speed < c.baseSpeed * 0.95,
      }));

    return {
      simTime: this.simTime,
      wave: this.currentWave,
      lives: this.lives,
      gold: this.economy.gold,
      killed: this.statsTracker.stats.creepsKilled,
      placementCursor: this.placementCursor,
      outcome: this.outcome,
      path: this.currentPath ?? [],
      towers,
      creeps,
    };
  }
}

const CREEP_TYPE_TO_COL: Record<string, number> = {
  standard: 0, fast: 1, armored: 2, swarm: 3,
  healer: 4, boss: 5, group: 6, splitter: 7,
  shielded: 8, evasive: 9, regenerator: 10, flying: 11,
  mage_armor: 12, mage_speed: 13, mage_evasion: 14, mage_heal: 15,
  splitter_child: 3,
  arcane_sigil: 12,
  arcane_scribe: 15,
  arcane_archmage_meteor: 12,
  arcane_archmage_storm: 13,
  arcane_archmage_necro: 14,
  warlord_stalwart: 5,
  warlord_healer: 5,
  warlord_champion: 5,
  warlord_tactician: 5,
  warlord_captain: 5,
  void_counterfactual: 5,
  mech_scout: 1,
  mech_skiff: 3,
  mech_light_walker: 0,
  mech_armored_walker: 2,
  mech_flagship_walker: 5,
  mech_ace_pilot: 8,
};

(globalThis as any).ReplaySim = {
  LiveReplaySession,
  getTowerSpriteConfig,
  getProjectileSpriteConfig,
  CREEP_TYPE_TO_COL,
  autoTileIndex,
};
