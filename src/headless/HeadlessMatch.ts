/**
 * HeadlessMatch — runs one full game-match in-process, no Phaser
 * rendering, no UI. Drives the same system layer GameScene drives
 * (Grid, SpawnManager, TowerManager, CreepManager, WaveController,
 * EconomyManager, FrontierManager) but replaces the scene with a
 * stub and the human player with a BotBrain.
 *
 * The "player" is a `BotBrain` instance (defaults to BalancedBrain).
 * Each between-waves tick the brain picks a place/upgrade/sell/skip
 * and the match applies it; once the brain skips, the next wave
 * fires immediately so match sim runs as fast as the CPU allows.
 *
 * Scope: standard + endless modes only for v1. Circle Co-op /
 * Versus / Hero Defense need extra setup (opponent sim, arena,
 * shared-economy routing) and are intentionally deferred.
 */
import { PathPoint, findPath } from '../systems/Pathfinding';
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
import { FRONTIER_BUILDINGS, GENERIC_OUTPOSTS } from '../data/FrontierBuildings';
import { STARTING_LIVES } from '../config';
import { EventLog } from '../ui/EventLog';
import { BotBrain, BotContext, Cell, FrontierOptionInfo, PlacedTower } from '../systems/bots/BotBrain';
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
import { seedRng } from '../systems/Rng';

/** Stub EventLog — the real class writes to the DOM; for headless
 *  we just swallow everything. `_scene: unknown` in the real
 *  constructor lets us pass anything. */
function makeEventLog(scene: HeadlessScene): EventLog {
  return new EventLog(scene.asScene(), 0);
}

export async function runMatch(config: MatchConfig): Promise<MatchResult> {
  const wallStart = Date.now();
  const stepMs = config.stepMs ?? 32;
  const maxSimMs = config.maxSimMs ?? 30 * 60 * 1000;
  const maxWaves = config.maxWaves ?? 60;

  try {
    return await runMatchInner(config, wallStart, stepMs, maxSimMs, maxWaves);
  } catch (err) {
    return {
      config,
      outcome: 'error',
      waveReached: 0,
      livesRemaining: 0,
      goldEarned: 0,
      goldSpent: 0,
      creepsKilled: 0,
      towersBuilt: 0,
      simTimeMs: 0,
      wallTimeMs: Date.now() - wallStart,
      buildHash: '00000000',
      error: (err as Error).message,
    };
  }
}

async function runMatchInner(
  config: MatchConfig, wallStart: number, stepMs: number, maxSimMs: number, maxWaves: number,
): Promise<MatchResult> {
  // Seed every Math.random equivalent that flows through
  // `systems/Rng` — same (config, seed) pair now gives the same
  // match outcome. Not all variance is captured yet (SpawnManager
  // has its own seeded RNG that takes the seed independently, and
  // Grid / Pathfinding are deterministic by construction), but the
  // trait rolls, brain meta-economy roll, frontier gamble, and
  // evasion dodge all route through this one source now.
  seedRng(config.seed);
  const scene = new HeadlessScene();
  const sceneAs = scene.asScene();

  // ---- Map + grid ----
  const mapDef = MAPS[config.mapId];
  if (!mapDef) throw new Error(`unknown map: ${config.mapId}`);
  const grid = new Grid(mapDef);

  // ---- Core systems ----
  const eventBus = new EventBus();
  const statsTracker = new StatsTracker();
  const economy = new EconomyManager(eventBus);
  const incomeMgr = new IncomeManager(eventBus);
  const eventLog = makeEventLog(scene);

  const difficultyHints = DIFFICULTIES[config.difficulty];
  const spawner = new SpawnManager(sceneAs, eventBus, difficultyHints, config.seed);
  spawner.setSpawners(mapDef.spawners ?? null);
  const sendMgr = new SendManager(sceneAs, eventBus);
  if (grid.entries.length > 0 && grid.exits.length > 0) {
    spawner.setFlyingPath(grid.entries[0], grid.exits[0]);
    sendMgr.setFlyingPath(grid.entries[0], grid.exits[0]);
  }

  // Standard death / leak handlers — the simplest pair. Circle Co-
  // op and Hero Defense use their own; we're not simulating those.
  const leakHandler = new StandardLeakHandler(eventLog, statsTracker, () => towerMgr.towers);
  const deathHandler = new StandardDeathHandler(economy, statsTracker, eventBus, 1);
  const creepMgr = new CreepManager(leakHandler, deathHandler);

  const towerMgr = new TowerManager(sceneAs, grid, economy, statsTracker, eventLog, eventBus, null);

  // Frontier — brains can buy from it. Real game mounts this via
  // BaseFrontierMode; we just build the manager directly since we
  // don't need the panel UI.
  const factionDef = FACTIONS[config.faction];
  const frontierMgr = new FrontierManager(eventBus, incomeMgr, config.faction);

  // ---- Waves + paths ----
  let waves: WaveDefinition[] = getWavesForMode(config.matchMode, config.waveCount);
  let currentWave = 0;
  let lives = STARTING_LIVES;

  const allPaths: (PathPoint[] | null)[] = [];
  const recalcPaths = (): (PathPoint[] | null)[] => {
    allPaths.length = 0;
    if (mapDef.spawners && mapDef.spawners.length > 0) {
      for (const s of mapDef.spawners) {
        allPaths.push(findPath(grid, s.entry, s.exit));
      }
    } else {
      for (const entry of grid.entries) {
        for (const exit of grid.exits) {
          allPaths.push(findPath(grid, entry, exit));
        }
      }
    }
    return allPaths;
  };
  recalcPaths();
  let currentPath = allPaths.find(p => p !== null) ?? null;

  // ---- Wave controller ----
  const waveMgr = new WaveController(waves, spawner, sendMgr, {
    onWaveStart: (_wave, waveNum) => {
      currentWave = waveNum;
      eventBus.emit('waveStarted', waveNum);
    },
    onWaveCleared: (waveNum) => {
      // Endless: append more waves as we run low.
      if (config.matchMode === 'endless' && waveMgr.currentWave >= waveMgr.waves.length - 5) {
        const nextStart = waveMgr.waves.length + 1;
        waveMgr.waves.push(...generateEndlessWaves(nextStart, 10));
      }
      // Fire the wave-clear bonus through EconomyManager.
      eventBus.emit('waveCleared', waveNum);
      statsTracker.recordWaveCompleted();
      // Per-wave frontier bonus payout + IncomeManager payout.
      const bonus = frontierMgr.onWaveEnd(waveNum);
      if (bonus > 0) economy.addGold(bonus);
      const income = incomeMgr.getWaveIncome();
      if (income > 0) economy.addGold(income);
    },
    canStartWave: () => currentPath !== null,
  });

  // ---- Brain ----
  const brainFactory = BRAIN_REGISTRY[config.brainId];
  if (!brainFactory) throw new Error(`unknown brain: ${config.brainId}`);
  const brain: BotBrain = brainFactory();

  const towerPool = factionDef.towerIds.map(id => getTowerType(id)).sort((a, b) => a.cost - b.cost);
  const candidateCells = buildCandidateCells(grid, mapDef);
  brain.init?.(makeCtx());

  function placedTowersSnapshot(): PlacedTower[] {
    return towerMgr.towers
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

  function frontierOptions(): FrontierOptionInfo[] {
    return frontierMgr.availableBuildings
      .filter(b => b.cost <= economy.gold)
      .map(b => ({ id: b.id, cost: b.cost, income: b.baseIncome }))
      .sort((a, b) => a.cost - b.cost);
  }

  function makeCtx(): BotContext {
    return {
      playerIndex: 0,
      faction: config.faction,
      candidateCells: currentCandidateCells(),
      towerPool,
      budget: economy.gold,
      wave: currentWave,
      lives,
      grid,
      allPaths,
      placedTowers: placedTowersSnapshot(),
      sendOptions: [],
      frontierOptions: frontierOptions(),
      betweenWaves: waveMgr.betweenWaves,
      // Surface the next 3 waves so wave-lookahead brains can pick
      // counter towers. The `waveMgr.currentWave` is already
      // 1-indexed past the current wave, so `waves[currentWave]`
      // is wave N+1 — exactly what we want as "upcoming".
      upcomingWaves: waveMgr.waves.slice(waveMgr.currentWave, waveMgr.currentWave + 3),
    };
  }

  function currentCandidateCells(): Cell[] {
    // Filter out cells now occupied by towers. TowerManager updates
    // the grid state at placeTower time; the brain expects empty
    // `Entry`/`Exit`/`NoBuild` cells to be excluded. We reuse the
    // precomputed `candidateCells` list and filter down to those
    // whose grid cell is still Empty.
    return candidateCells.filter(c => grid.canPlaceTower(c.col, c.row));
  }

  // ---- Main loop ----
  let simTime = 0;
  let outcome: MatchResult['outcome'] = 'timeout';
  // Per-tick between-wave budget — once the brain skips, start the
  // next wave immediately instead of burning cycles waiting. A small
  // "give the brain 1 tick to commit" window is enough because the
  // BotAI cooldown infra doesn't apply here (we call decide directly).
  let brainTicksSinceProgress = 0;

  while (simTime < maxSimMs && currentWave <= maxWaves) {
    // Between-waves brain loop — let the brain spend its budget
    // until it skips, then advance to the next wave.
    while (waveMgr.betweenWaves) {
      const decision = brain.decide(makeCtx());
      if (decision.kind === 'skip') break;
      const applied = applyDecision(decision);
      if (!applied) break;
      brainTicksSinceProgress = 0;
    }

    // Advance the wave.
    if (!waveMgr.hasMoreWaves() && creepMgr.creeps.length === 0) {
      outcome = 'win';
      break;
    }
    if (waveMgr.betweenWaves) {
      const started = waveMgr.startWave(allPaths);
      if (!started) {
        // Couldn't start (no valid path) — recompute once, retry next tick.
        recalcPaths();
        currentPath = allPaths.find(p => p !== null) ?? null;
        if (!currentPath) { outcome = 'error'; break; }
      }
    }

    // Tick the sim clock — fires visual-effect callbacks (all no-op
    // for us but we run them anyway to keep timer state healthy).
    scene.tick(stepMs);

    // Tower AI + combat.
    towerMgr.updateTowers(simTime, stepMs, creepMgr.creeps, creepMgr.justDiedCreeps);
    towerMgr.cleanupExpired();

    // Creep movement + leak processing.
    const leak = creepMgr.update(stepMs);
    lives -= leak.totalLeakDamage;
    if (lives <= 0) { outcome = 'loss'; break; }

    // Spawning + wave-clear detection.
    waveMgr.updateSpawning(stepMs, allPaths, currentPath, creepMgr.creeps);
    waveMgr.checkWaveComplete(creepMgr.creeps.length, stepMs);

    simTime += stepMs;
    brainTicksSinceProgress++;

    // In-wave brain upgrades — occasionally let the brain spend
    // kill gold mid-wave (on upgrades). Cheap: one decide() every 30
    // ticks (~1s sim time).
    if (brainTicksSinceProgress % 30 === 0) {
      const decision = brain.decide(makeCtx());
      if (decision.kind === 'upgrade' || decision.kind === 'sell') {
        applyDecision(decision);
      }
    }
  }

  if (outcome === 'timeout' && simTime >= maxSimMs) outcome = 'timeout';

  return {
    config,
    outcome,
    waveReached: currentWave,
    livesRemaining: Math.max(0, lives),
    goldEarned: statsTracker.stats.totalGoldEarned,
    goldSpent: statsTracker.stats.totalGoldSpent,
    creepsKilled: statsTracker.stats.creepsKilled,
    towersBuilt: towerMgr.totalTowersBuilt,
    simTimeMs: simTime,
    wallTimeMs: Date.now() - wallStart,
    buildHash: hashBuild(towerMgr.towers),
  };

  // ---- Decision dispatch ----
  function applyDecision(d: ReturnType<BotBrain['decide']>): boolean {
    switch (d.kind) {
      case 'place': {
        const result = towerMgr.placeTower(d.col, d.row, d.type, allPaths, recalcPaths);
        if (!result) return false;
        if (result.pathsChanged) {
          recalcPaths();
          currentPath = allPaths.find(p => p !== null) ?? null;
        }
        return true;
      }
      case 'upgrade': {
        const t = towerMgr.towers.find(t => t.col === d.col && t.row === d.row);
        if (!t || !t.canUpgrade()) return false;
        const cost = d.branch
          ? (TOWER_TYPES[t.typeDef.upgrades[0]?.branches?.find(b => b.id === d.branch)?.transformsTo ?? '']?.cost ?? 9999)
          : t.getUpgradeCost();
        if (!economy.spend(cost)) return false;
        t.upgrade(d.branch ?? null);
        return true;
      }
      case 'sell': {
        const result = towerMgr.sellTower(d.col, d.row);
        if (!result) return false;
        recalcPaths();
        currentPath = allPaths.find(p => p !== null) ?? null;
        return true;
      }
      case 'frontier': {
        const building = frontierMgr.availableBuildings.find(b => b.id === d.buildingId);
        if (!building) return false;
        if (!economy.spend(building.cost)) return false;
        frontierMgr.purchaseBuilding(building);
        return true;
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
function buildCandidateCells(grid: Grid, _mapDef: unknown): Cell[] {
  const cells: Cell[] = [];
  for (let row = 0; row < grid.cells.length; row++) {
    for (let col = 0; col < grid.cells[row].length; col++) {
      if (grid.canPlaceTower(col, row)) cells.push({ col, row });
    }
  }
  return cells;
}
