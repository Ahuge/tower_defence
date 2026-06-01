/**
 * Match — class form of the headless game loop.
 *
 * Why a class? `runMatch` used to be a single async function with
 * all state captured in closures. That works fine for one-shot
 * batch runs but blocks the RL training harness (`TwoSidedMatch`,
 * sabotage event injection in Phase 2.5, snapshot rollouts) which
 * needs to drive the sim externally tick-by-tick. The class exposes
 * `step()` / `isDone()` / `result()` so callers can interleave two
 * Matches in the same process, inject events between steps, or
 * snapshot mid-match state without forking the runner.
 *
 * `runMatch` (in `HeadlessMatch.ts`) is now a thin wrapper that
 * just loops `step()` until done — the existing single-side batch
 * harness keeps working unchanged, and the determinism snapshot
 * test in `determinism.test.ts` gates the refactor.
 *
 * RNG note: the module-level singleton in `systems/Rng.ts` is
 * shared process-wide. Two `Match` instances in the same process
 * would otherwise stomp each other's PRNG state. Each Match holds
 * its own `rngState` field and uses save/restore (`getRngState` /
 * `setRngState`) around every constructor body and every `step()`
 * to keep the singleton effectively scoped to whichever Match is
 * currently executing.
 */
import { PathPoint, findPath } from '../systems/Pathfinding';

/** Snapshot of a Match at a between-wave moment. See Match.snapshot() /
 *  Match.restoreFromSnapshot(). Designed for rung 2 beam-search
 *  lookahead — no creep state, no projectile state, no cooldowns.
 *  Restricted to between-wave moments to keep the scope tractable. */
export interface MatchSnapshot {
  rngState: number;
  currentWave: number;
  lives: number;
  simTime: number;
  brainTicksSinceProgress: number;
  finished: boolean;
  outcome: MatchResult['outcome'];
  gold: number;
  totalGoldEarned: number;
  totalGoldSpent: number;
  creepsKilled: number;
  towers: Array<{
    col: number;
    row: number;
    typeId: string;
    level: number;
    chosenBranch?: string;
    totalInvested: number;
  }>;
  totalTowersBuilt: number;
  waveMgrCurrentWave: number;
  waveMgrBetweenWaves: boolean;
}
import { Grid } from '../systems/Grid';
import { EventBus } from '../systems/EventBus';
import { EconomyManager } from '../systems/EconomyManager';
import { IncomeManager } from '../systems/IncomeManager';
import { StatsTracker } from '../systems/StatsTracker';
import { SpawnManager } from '../systems/SpawnManager';
import { SendManager } from '../systems/SendManager';
import { TowerManager } from '../systems/TowerManager';
import { CreepManager, StandardLeakHandler, StandardDeathHandler } from '../systems/CreepManager';
import { WaveController } from '../systems/WaveController';
import { FrontierManager } from '../systems/FrontierManager';
import { MAPS } from '../data/Maps';
import { DIFFICULTIES } from '../data/Difficulty';
import { FACTIONS } from '../data/Factions';
import { getWavesForMode, generateEndlessWaves, WaveDefinition } from '../data/WaveDefinitions';
import { getTowerType, TOWER_TYPES } from '../data/TowerTypes';
import { STARTING_LIVES } from '../config';
import { EventLog } from '../ui/EventLog';
import { BotBrain, BotContext, BotDecision, Cell, FrontierOptionInfo, PlacedTower } from '../systems/bots/BotBrain';
import { BRAIN_REGISTRY } from '../systems/bots/BotBrain';
// Side-effect imports so trait handlers and brain factories
// register themselves — same pattern `main.ts` uses in the real
// game boot. Without the brain side-effects BRAIN_REGISTRY is
// empty when the match runner looks up the id.
import '../systems/traits/TowerTraitHandlers';
import '../systems/traits/CreepTraitHandlers';
import '../systems/bots/brains/BalancedBrain';
import '../systems/bots/brains/RushBrain';
import '../systems/bots/brains/SynergyBrain';
import '../systems/bots/brains/NatureBrain';
import '../systems/bots/brains/GreedyBrain';
import '../systems/bots/brains/UltimateBrain';
import '../systems/bots/brains/EconBrain';
import '../systems/bots/brains/AOEFocusBrain';
import { HeadlessScene } from './HeadlessScene';
import { MatchConfig, MatchResult } from './types';
import { seedRng, getRngState, setRngState } from '../systems/Rng';

/** Stub EventLog — the real class writes to the DOM; for headless
 *  we just swallow everything. */
function makeEventLog(scene: HeadlessScene): EventLog {
  return new EventLog(scene.asScene(), 0);
}

export class Match {
  // ---- Immutable run config ----
  readonly config: MatchConfig;
  private readonly wallStart: number;
  private readonly stepMs: number;
  private readonly maxSimMs: number;
  private readonly maxWaves: number;

  // ---- RNG isolation ----
  // Captured singleton state for this Match. Save/restore wraps
  // every constructor body and every step() so two Matches in the
  // same process don't stomp each other's PRNG progress.
  private rngState: number;

  // ---- Game systems (built once in the constructor) ----
  private scene!: HeadlessScene;
  private grid!: Grid;
  private mapDef!: typeof MAPS[keyof typeof MAPS];
  private eventBus!: EventBus;
  private statsTracker!: StatsTracker;
  private economy!: EconomyManager;
  private incomeMgr!: IncomeManager;
  private eventLog!: EventLog;
  private spawner!: SpawnManager;
  private sendMgr!: SendManager;
  private creepMgr!: CreepManager;
  private towerMgr!: TowerManager;
  private frontierMgr!: FrontierManager;
  private waveMgr!: WaveController;
  private brain!: BotBrain;
  private towerPool!: ReturnType<typeof getTowerType>[];
  private candidateCells!: Cell[];

  // ---- Mutable loop state ----
  private allPaths: (PathPoint[] | null)[] = [];
  private currentPath: PathPoint[] | null = null;
  private currentWave = 0;
  private lives = STARTING_LIVES;
  private simTime = 0;
  private outcome: MatchResult['outcome'] = 'timeout';
  private brainTicksSinceProgress = 0;
  private finished = false;

  // ---- Caught error (so isDone()/result() can surface it without throwing) ----
  private error: Error | null = null;

  constructor(config: MatchConfig, brainOverride?: BotBrain | null) {
    this.config = config;
    this.wallStart = Date.now();
    this.stepMs = config.stepMs ?? 32;
    this.maxSimMs = config.maxSimMs ?? 30 * 60 * 1000;
    this.maxWaves = config.maxWaves ?? 60;
    this.rngState = config.seed >>> 0;

    // All setup-time `rng()` calls (e.g. inside SpawnManager) need
    // to draw from this Match's RNG. Save/restore around the setup
    // body so the live singleton sees no change for outside callers.
    const prev = getRngState();
    setRngState(this.rngState);
    try {
      this.setup(brainOverride ?? null);
    } catch (err) {
      this.error = err as Error;
      this.outcome = 'error';
      this.finished = true;
    } finally {
      this.rngState = getRngState();
      setRngState(prev);
    }
  }

  // ===========================================================
  //                          PUBLIC API
  // ===========================================================

  isDone(): boolean {
    return this.finished;
  }

  step(): void {
    if (this.finished) return;
    const prev = getRngState();
    setRngState(this.rngState);
    try {
      this.runOneIteration();
    } catch (err) {
      this.error = err as Error;
      this.outcome = 'error';
      this.finished = true;
    } finally {
      this.rngState = getRngState();
      setRngState(prev);
    }
  }

  result(): MatchResult {
    if (this.error) {
      return {
        config: this.config,
        outcome: 'error',
        waveReached: 0,
        livesRemaining: 0,
        goldEarned: 0,
        goldSpent: 0,
        creepsKilled: 0,
        towersBuilt: 0,
        simTimeMs: 0,
        wallTimeMs: Date.now() - this.wallStart,
        buildHash: '00000000',
        error: this.error.message,
      };
    }
    return {
      config: this.config,
      outcome: this.outcome,
      waveReached: this.currentWave,
      livesRemaining: Math.max(0, this.lives),
      goldEarned: this.statsTracker.stats.totalGoldEarned,
      goldSpent: this.statsTracker.stats.totalGoldSpent,
      creepsKilled: this.statsTracker.stats.creepsKilled,
      towersBuilt: this.towerMgr.totalTowersBuilt,
      simTimeMs: this.simTime,
      wallTimeMs: Date.now() - this.wallStart,
      buildHash: hashBuild(this.towerMgr.towers),
    };
  }

  async runToEnd(): Promise<MatchResult> {
    while (!this.finished) this.step();
    return this.result();
  }

  /** Async equivalent of `step()` that awaits the brain's
   *  `decideAsync` if it exists, else falls back to sync `decide`.
   *  Used by validators / rollout generators that drive PPOBrain
   *  (whose real inference path is async, because onnxruntime-node
   *  returns a Promise from `session.run`).
   *
   *  The sync `step()` path stays the canonical one — determinism
   *  tests, two-sided lockstep, batch runner — because BotBrain's
   *  contract is sync. `stepAsync` is the opt-in escape hatch. */
  async stepAsync(): Promise<void> {
    if (this.finished) return;
    const prev = getRngState();
    setRngState(this.rngState);
    try {
      await this.runOneIterationAsync();
    } catch (err) {
      this.error = err as Error;
      this.outcome = 'error';
      this.finished = true;
    } finally {
      this.rngState = getRngState();
      setRngState(prev);
    }
  }

  /** Capture the minimum state needed to reconstruct this Match
   *  at a between-wave moment. Used by beam-search lookahead in
   *  rung 2 of the search-based pivot (see notes/rl/mcts-plan-v3.md).
   *
   *  Restricted to between-wave moments because:
   *    - No live creeps to serialize (creep state is complex)
   *    - No in-flight projectiles
   *    - Tower runtime state (cooldowns) doesn't matter
   *
   *  Throws if called mid-wave. */
  snapshot(): MatchSnapshot {
    if (!this.waveMgr.betweenWaves && this.currentWave > 0) {
      throw new Error(`Match.snapshot() only supported between waves (currentWave=${this.currentWave}, waveActive=${this.waveMgr.waveActive})`);
    }
    return {
      rngState: this.rngState,
      currentWave: this.currentWave,
      lives: this.lives,
      simTime: this.simTime,
      brainTicksSinceProgress: this.brainTicksSinceProgress,
      finished: this.finished,
      outcome: this.outcome,
      gold: this.economy.gold,
      totalGoldEarned: this.statsTracker.stats.totalGoldEarned,
      totalGoldSpent: this.statsTracker.stats.totalGoldSpent,
      creepsKilled: this.statsTracker.stats.creepsKilled,
      towers: this.towerMgr.towers.map(t => ({
        col: t.col,
        row: t.row,
        typeId: t.typeId,
        level: t.level,
        chosenBranch: t.chosenBranch,
        totalInvested: t.totalInvested,
      })),
      totalTowersBuilt: this.towerMgr.totalTowersBuilt,
      waveMgrCurrentWave: this.waveMgr.currentWave,
      waveMgrBetweenWaves: this.waveMgr.betweenWaves,
    };
  }

  /** Reconstruct a Match from a snapshot. The fresh Match runs
   *  setup as normal (so managers + callbacks are wired) then
   *  applies the snapshot's state on top. Returns the new Match. */
  static restoreFromSnapshot(config: MatchConfig, snapshot: MatchSnapshot, brainOverride?: BotBrain | null): Match {
    const m = new Match(config, brainOverride);
    // Restore scalars first so any subsequent recalcPaths / placeTower
    // operations see the right wave / lives / gold.
    m.rngState = snapshot.rngState;
    m.currentWave = snapshot.currentWave;
    m.lives = snapshot.lives;
    m.simTime = snapshot.simTime;
    m.brainTicksSinceProgress = snapshot.brainTicksSinceProgress;
    m.finished = snapshot.finished;
    m.outcome = snapshot.outcome;
    m.economy.gold = snapshot.gold;
    m.statsTracker.stats.totalGoldEarned = snapshot.totalGoldEarned;
    m.statsTracker.stats.totalGoldSpent = snapshot.totalGoldSpent;
    m.statsTracker.stats.creepsKilled = snapshot.creepsKilled;
    m.waveMgr.currentWave = snapshot.waveMgrCurrentWave;
    m.waveMgr.betweenWaves = snapshot.waveMgrBetweenWaves;
    // Re-place towers via free=true (skip economy checks since gold
    // was already set above). placeTower mutates the grid, so paths
    // will be recomputed after the loop.
    for (const t of snapshot.towers) {
      const towerType = getTowerType(t.typeId);
      const result = m.towerMgr.placeTower(t.col, t.row, towerType, m.allPaths, () => m.recalcPaths(), true);
      if (result) {
        // Apply upgrades to reach the right level.
        while (result.tower.level < t.level) {
          result.tower.upgrade(t.chosenBranch ?? null);
        }
        result.tower.totalInvested = t.totalInvested;
      }
    }
    m.towerMgr.totalTowersBuilt = snapshot.totalTowersBuilt;
    m.recalcPaths();
    m.currentPath = m.allPaths.find(p => p !== null) ?? null;
    return m;
  }

  /** Async equivalent of `runToEnd()`. */
  async runToEndAsync(): Promise<MatchResult> {
    while (!this.finished) await this.stepAsync();
    return this.result();
  }

  /** Snapshot the BotContext for this Match's player. Same object
   *  the brain sees during `step()`. Exposed for ActionSpace /
   *  ObsTensor builders that need to inspect game state without
   *  driving a decision. */
  observe() {
    return this.makeCtx();
  }

  /** Live creep list — exposed for ObsTensor's per-cell density
   *  channel. Returns the actual array, not a snapshot; callers
   *  must not mutate. */
  getCreeps() {
    return this.creepMgr.creeps;
  }

  /** Live grid reference — exposed for ObsTensor's terrain channels.
   *  Returns the actual grid, not a snapshot; callers must not mutate. */
  getGrid() {
    return this.grid;
  }

  /** Active map definition — exposed for ObsTensor's path/entry/exit
   *  channels (path cells are derived from `allPaths`). */
  getAllPaths() {
    return this.allPaths;
  }

  /** Current sim time in ms. Exposed so observation builders don't
   *  have to allocate a full `result()` object just to read it. */
  getSimTimeMs(): number {
    return this.simTime;
  }

  // ===========================================================
  //                          SETUP
  // ===========================================================

  private setup(brainOverride: BotBrain | null): void {
    this.scene = new HeadlessScene();
    const sceneAs = this.scene.asScene();

    const mapDef = MAPS[this.config.mapId];
    if (!mapDef) throw new Error(`unknown map: ${this.config.mapId}`);
    this.mapDef = mapDef;
    this.grid = new Grid(mapDef);

    this.eventBus = new EventBus();
    this.statsTracker = new StatsTracker();
    this.economy = new EconomyManager(this.eventBus);
    this.incomeMgr = new IncomeManager(this.eventBus);
    this.eventLog = makeEventLog(this.scene);

    const difficultyHints = DIFFICULTIES[this.config.difficulty];
    this.spawner = new SpawnManager(sceneAs, this.eventBus, difficultyHints, this.config.seed);
    this.spawner.setSpawners(mapDef.spawners ?? null);
    this.sendMgr = new SendManager(sceneAs, this.eventBus);
    if (this.grid.entries.length > 0 && this.grid.exits.length > 0) {
      this.spawner.setFlyingPath(this.grid.entries[0], this.grid.exits[0]);
      this.sendMgr.setFlyingPath(this.grid.entries[0], this.grid.exits[0]);
    }

    const leakHandler = new StandardLeakHandler(this.eventLog, this.statsTracker, () => this.towerMgr.towers);
    const deathHandler = new StandardDeathHandler(this.economy, this.statsTracker, this.eventBus, 1);
    this.creepMgr = new CreepManager(leakHandler, deathHandler);

    this.towerMgr = new TowerManager(sceneAs, this.grid, this.economy, this.statsTracker, this.eventLog, this.eventBus, null);

    const factionDef = FACTIONS[this.config.faction];
    this.frontierMgr = new FrontierManager(this.eventBus, this.incomeMgr, this.config.faction);

    const waves: WaveDefinition[] = getWavesForMode(this.config.matchMode, this.config.waveCount);
    this.recalcPaths();
    this.currentPath = this.allPaths.find(p => p !== null) ?? null;

    this.waveMgr = new WaveController(waves, this.spawner, this.sendMgr, {
      onWaveStart: (_wave, waveNum) => {
        this.currentWave = waveNum;
        this.eventBus.emit('waveStarted', waveNum);
      },
      onWaveCleared: (waveNum) => {
        if (this.config.matchMode === 'endless' && this.waveMgr.currentWave >= this.waveMgr.waves.length - 5) {
          const nextStart = this.waveMgr.waves.length + 1;
          this.waveMgr.waves.push(...generateEndlessWaves(nextStart, 10));
        }
        this.eventBus.emit('waveCleared', waveNum);
        this.statsTracker.recordWaveCompleted();
        const bonus = this.frontierMgr.onWaveEnd(waveNum);
        if (bonus > 0) this.economy.addGold(bonus);
        const income = this.incomeMgr.getWaveIncome();
        if (income > 0) this.economy.addGold(income);
      },
      canStartWave: () => this.currentPath !== null,
    });

    if (brainOverride) {
      this.brain = brainOverride;
    } else {
      const brainFactory = BRAIN_REGISTRY[this.config.brainId];
      if (!brainFactory) throw new Error(`unknown brain: ${this.config.brainId}`);
      this.brain = brainFactory();
    }
    // Duck-typed Match-attach hook. Brains that need full live state
    // (PPOBrain for ObsTensor, future obs-recording brains) implement
    // `attachMatch(this)`. Keeps the canonical BotBrain interface free
    // of a Match-shaped circular dep — Match imports BotBrain, not the
    // other way around.
    const attachable = this.brain as { attachMatch?: (m: Match) => void };
    attachable.attachMatch?.(this);

    this.towerPool = factionDef.towerIds.map(id => getTowerType(id)).sort((a, b) => a.cost - b.cost);
    this.candidateCells = buildCandidateCells(this.grid);
    this.brain.init?.(this.makeCtx());
  }

  // ===========================================================
  //                       PER-ITERATION
  // ===========================================================

  /** Dispatch brain.decide to its async variant if defined.
   *  PPOBrain exposes `decideAsync` for ONNX inference; everything
   *  else falls through to the sync `decide`. */
  private async brainDecideAsync(ctx: BotContext) {
    const ab = this.brain as { decideAsync?: (ctx: BotContext) => Promise<BotDecision> };
    if (ab.decideAsync) return ab.decideAsync(ctx);
    return this.brain.decide(ctx);
  }

  /** Async mirror of `runOneIteration`. Body MUST stay structurally
   *  identical to its sync sibling — only the two `brain.decide`
   *  call sites swap to `await this.brainDecideAsync`. If you change
   *  one, change the other or the determinism snapshot test will
   *  drift between the two paths. */
  private async runOneIterationAsync(): Promise<void> {
    if (this.simTime >= this.maxSimMs || this.currentWave > this.maxWaves) {
      this.finished = true;
      return;
    }

    while (this.waveMgr.betweenWaves) {
      const decision = await this.brainDecideAsync(this.makeCtx());
      if (decision.kind === 'skip') break;
      const applied = this.applyDecision(decision);
      if (!applied) break;
      this.brainTicksSinceProgress = 0;
    }

    if (!this.waveMgr.hasMoreWaves() && this.creepMgr.creeps.length === 0) {
      this.outcome = 'win';
      this.finished = true;
      return;
    }
    if (this.waveMgr.betweenWaves) {
      const started = this.waveMgr.startWave(this.allPaths);
      if (!started) {
        this.recalcPaths();
        this.currentPath = this.allPaths.find(p => p !== null) ?? null;
        if (!this.currentPath) {
          this.outcome = 'error';
          this.finished = true;
          return;
        }
      }
    }

    this.scene.tick(this.stepMs);
    this.towerMgr.updateTowers(this.simTime, this.stepMs, this.creepMgr.creeps, this.creepMgr.justDiedCreeps);
    this.towerMgr.cleanupExpired();
    const leak = this.creepMgr.update(this.stepMs);
    this.lives -= leak.totalLeakDamage;
    if (this.lives <= 0) {
      this.outcome = 'loss';
      this.finished = true;
      return;
    }
    this.waveMgr.updateSpawning(this.stepMs, this.allPaths, this.currentPath, this.creepMgr.creeps);
    this.waveMgr.checkWaveComplete(this.creepMgr.creeps.length, this.stepMs);
    this.simTime += this.stepMs;
    this.brainTicksSinceProgress++;

    if (this.brainTicksSinceProgress % 30 === 0) {
      const decision = await this.brainDecideAsync(this.makeCtx());
      if (decision.kind === 'upgrade' || decision.kind === 'sell') {
        this.applyDecision(decision);
      }
    }
  }

  private runOneIteration(): void {
    // Loop guard — was the outer while condition in runMatchInner.
    if (this.simTime >= this.maxSimMs || this.currentWave > this.maxWaves) {
      this.finished = true;
      return;
    }

    // Between-waves brain spending loop.
    while (this.waveMgr.betweenWaves) {
      const decision = this.brain.decide(this.makeCtx());
      if (decision.kind === 'skip') break;
      const applied = this.applyDecision(decision);
      if (!applied) break;
      this.brainTicksSinceProgress = 0;
    }

    // Win check / wave advance.
    if (!this.waveMgr.hasMoreWaves() && this.creepMgr.creeps.length === 0) {
      this.outcome = 'win';
      this.finished = true;
      return;
    }
    if (this.waveMgr.betweenWaves) {
      const started = this.waveMgr.startWave(this.allPaths);
      if (!started) {
        this.recalcPaths();
        this.currentPath = this.allPaths.find(p => p !== null) ?? null;
        if (!this.currentPath) {
          this.outcome = 'error';
          this.finished = true;
          return;
        }
      }
    }

    // Sim tick — visual-effect timers (no-op in headless), tower
    // combat, creep movement, spawning, wave-clear detection.
    this.scene.tick(this.stepMs);
    this.towerMgr.updateTowers(this.simTime, this.stepMs, this.creepMgr.creeps, this.creepMgr.justDiedCreeps);
    this.towerMgr.cleanupExpired();
    const leak = this.creepMgr.update(this.stepMs);
    this.lives -= leak.totalLeakDamage;
    if (this.lives <= 0) {
      this.outcome = 'loss';
      this.finished = true;
      return;
    }
    this.waveMgr.updateSpawning(this.stepMs, this.allPaths, this.currentPath, this.creepMgr.creeps);
    this.waveMgr.checkWaveComplete(this.creepMgr.creeps.length, this.stepMs);
    this.simTime += this.stepMs;
    this.brainTicksSinceProgress++;

    // In-wave brain upgrades — cheap (one decide every 30 ticks).
    if (this.brainTicksSinceProgress % 30 === 0) {
      const decision = this.brain.decide(this.makeCtx());
      if (decision.kind === 'upgrade' || decision.kind === 'sell') {
        this.applyDecision(decision);
      }
    }
  }

  // ===========================================================
  //                          HELPERS
  // ===========================================================

  private recalcPaths(): (PathPoint[] | null)[] {
    this.allPaths.length = 0;
    if (this.mapDef.spawners && this.mapDef.spawners.length > 0) {
      for (const s of this.mapDef.spawners) {
        this.allPaths.push(findPath(this.grid, s.entry, s.exit));
      }
    } else {
      for (const entry of this.grid.entries) {
        for (const exit of this.grid.exits) {
          this.allPaths.push(findPath(this.grid, entry, exit));
        }
      }
    }
    return this.allPaths;
  }

  private placedTowersSnapshot(): PlacedTower[] {
    return this.towerMgr.towers
      .filter(t => (t as any).ownerIndex === undefined || (t as any).ownerIndex === 0)
      .map(t => {
        const upgrades = t.typeDef.upgrades;
        const nextUpgrade = upgrades.find(u => u.level > t.level);
        const branches = nextUpgrade?.branches?.map(b => b.id) ?? [];
        const branchCosts: Record<string, number> = {};
        for (const b of nextUpgrade?.branches ?? []) {
          const tgt = TOWER_TYPES[b.transformsTo];
          if (tgt) branchCosts[b.id] = tgt.cost;
        }
        return {
          col: t.col,
          row: t.row,
          towerId: t.typeId,
          level: t.level,
          upgradeCost: nextUpgrade?.cost ?? 0,
          upgradeBranches: branches,
          branchUpgradeCosts: branchCosts,
          sellValue: t.getSellValue(),
        };
      });
  }

  private frontierOptions(): FrontierOptionInfo[] {
    return this.frontierMgr.availableBuildings
      .filter(b => b.cost <= this.economy.gold)
      .map(b => ({ id: b.id, cost: b.cost, income: b.baseIncome }))
      .sort((a, b) => a.cost - b.cost);
  }

  private currentCandidateCells(): Cell[] {
    return this.candidateCells.filter(c => this.grid.canPlaceTower(c.col, c.row));
  }

  private makeCtx(): BotContext {
    return {
      playerIndex: 0,
      faction: this.config.faction,
      candidateCells: this.currentCandidateCells(),
      towerPool: this.towerPool,
      budget: this.economy.gold,
      wave: this.currentWave,
      lives: this.lives,
      grid: this.grid,
      allPaths: this.allPaths,
      placedTowers: this.placedTowersSnapshot(),
      sendOptions: [],
      frontierOptions: this.frontierOptions(),
      betweenWaves: this.waveMgr.betweenWaves,
      upcomingWaves: this.waveMgr.waves.slice(this.waveMgr.currentWave, this.waveMgr.currentWave + 3),
    };
  }

  private applyDecision(d: BotDecision): boolean {
    switch (d.kind) {
      case 'place': {
        const result = this.towerMgr.placeTower(d.col, d.row, d.type, this.allPaths, () => this.recalcPaths());
        if (!result) return false;
        if (result.pathsChanged) {
          this.recalcPaths();
          this.currentPath = this.allPaths.find(p => p !== null) ?? null;
        }
        return true;
      }
      case 'upgrade': {
        const t = this.towerMgr.towers.find(t => t.col === d.col && t.row === d.row);
        if (!t || !t.canUpgrade()) return false;
        const cost = d.branch
          ? (TOWER_TYPES[t.typeDef.upgrades[0]?.branches?.find(b => b.id === d.branch)?.transformsTo ?? '']?.cost ?? 9999)
          : t.getUpgradeCost();
        if (!this.economy.spend(cost)) return false;
        t.upgrade(d.branch ?? null);
        return true;
      }
      case 'sell': {
        const result = this.towerMgr.sellTower(d.col, d.row);
        if (!result) return false;
        this.recalcPaths();
        this.currentPath = this.allPaths.find(p => p !== null) ?? null;
        return true;
      }
      case 'frontier': {
        const building = this.frontierMgr.availableBuildings.find(b => b.id === d.buildingId);
        if (!building) return false;
        if (!this.economy.spend(building.cost)) return false;
        this.frontierMgr.purchaseBuilding(building);
        return true;
      }
      case 'frontierManage': {
        if (d.defId) {
          if (d.action === 'overcharge') {
            const gold = this.frontierMgr.overchargeAllOfType(d.defId);
            if (gold > 0) this.economy.addGold(gold);
            return true;
          }
          if (d.action === 'dig') { this.frontierMgr.digAllOfType(d.defId); return true; }
          if (d.action === 'harvest') {
            const gold = this.frontierMgr.harvestAllOfType(d.defId);
            if (gold > 0) this.economy.addGold(gold);
            return true;
          }
        } else if (d.idx !== undefined) {
          if (d.action === 'overcharge') {
            const gold = this.frontierMgr.overchargeBuilding(d.idx);
            if (gold > 0) this.economy.addGold(gold);
            return true;
          }
          if (d.action === 'dig') { this.frontierMgr.digDeeper(d.idx); return true; }
          if (d.action === 'harvest') {
            const gold = this.frontierMgr.harvestGrowth(d.idx);
            if (gold > 0) this.economy.addGold(gold);
            return true;
          }
        }
        return false;
      }
      case 'send':
        // Standard mode doesn't have a real send target — skip.
        return false;
      case 'skip':
        return false;
    }
    return false;
  }
}

// ===============================================================
//                       MODULE-LEVEL HELPERS
// ===============================================================

/** Compact fingerprint of the final tower build: sorted multiset of
 *  `id@Llevel` joined by `,` then run through a 32-bit FNV-1a fold so
 *  the result is short and easy to compare. Two runs with identical
 *  builds produce identical hashes; any tower id/level/count
 *  difference flips it. Used by the harness to diagnose brain-noise
 *  (same build, moved winrate) vs. real signal (different build). */
function hashBuild(towers: { typeDef: { id: string }; level: number }[]): string {
  const counts = new Map<string, number>();
  for (const t of towers) {
    const key = `${t.typeDef.id}@L${t.level}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const joined = sorted.map(([k, n]) => `${k}x${n}`).join(',');
  let h = 0x811c9dc5;
  for (let i = 0; i < joined.length; i++) {
    h ^= joined.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Walk the grid once and collect every cell the player could
 *  legally build on. Entries / Exits / Blocked / NoBuild stay out.
 *  Brains can call `grid.isBuildable(col, row)` to refilter for
 *  live state (towers placed mid-match). */
function buildCandidateCells(grid: Grid): Cell[] {
  const cells: Cell[] = [];
  for (let row = 0; row < grid.cells.length; row++) {
    for (let col = 0; col < grid.cells[row].length; col++) {
      if (grid.canPlaceTower(col, row)) cells.push({ col, row });
    }
  }
  return cells;
}
