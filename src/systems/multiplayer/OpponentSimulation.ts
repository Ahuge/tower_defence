import { TILE_SIZE, GRID_COLS, GRID_ROWS, gridX, gridY } from '../../config';
import { Grid } from '../Grid';
import { findPath, PathPoint } from '../Pathfinding';
import { VersusManager } from './VersusManager';
import { TOWER_TYPES } from '../../data/TowerTypes';
import { Trait } from '../traits/Trait';
import { CREEP_TYPES } from '../../data/CreepTypes';
import { WaveDefinition } from '../../data/WaveDefinitions';
import { DifficultyHints } from '../../data/Difficulty';
import { MapDefinition } from '../../data/Maps';
import { SendCreepOption } from '../../data/SendCreepTypes';

interface SimPoison { dps: number; expiresAt: number; }

interface SimCreep {
  x: number; y: number;
  hp: number; maxHp: number;
  speed: number; baseSpeed: number;
  pathIndex: number;
  path: PathPoint[];
  alive: boolean;
  reached: boolean;
  color: number;
  size: number;
  isBoss: boolean;
  typeId: string;
  // Status effects — applied by tower hits.
  slowUntil: number;   // simTime ms at which slow ends
  slowFactor: number;  // 0..1 multiplier on speed (1 = no slow)
  rootUntil: number;   // simTime ms until the creep can move again
  poisons: SimPoison[];
}

/** Per-tower combat state kept across ticks. Preserved by
 *  (col,row) so rebuildGrid() doesn't reset cooldowns every time
 *  the bot touches the grid. */
interface SimTower {
  col: number; row: number;
  towerId: string;
  level: number;
  // Resolved effective stats (after level ladder + adjacency buffs).
  damage: number;
  range: number;     // tile units
  rangeSq: number;   // pixel² for quick distance compare
  fireRateMs: number;
  lastFireAt: number; // simTime of last shot (ms)
  // Pre-extracted trait params for quick access.
  splashRadius: number;   // pixels, 0 if no splash
  slowFactor: number;     // 1 = no slow
  slowDuration: number;   // ms
  rootChance: number;     // 0..1
  rootDuration: number;   // ms
  poisonPctPerSec: number;
  poisonDuration: number;
  goldOnHit: number;
  goldOnKill: number;
  jackpotKillChance: number; // instant kill chance
  jackpotMissChance: number;
  dmgVarMin: number;      // multiplier, 1 = no variance
  dmgVarMax: number;
  auraDamageRadius: number; // Spore-style
  isMobile: boolean;      // skip — mobile units don't contribute
  isAdjBuffSource: boolean;
  adjDamagePct: number;
  adjRatePct: number;
  isSupport: boolean;     // pure support (no attack)
}

/**
 * Per-tower-per-creep combat simulation for the CPU opponent in
 * 1v1 Versus. Replaces the earlier DPS-smear approximation so
 * per-hit traits (gold_on_hit, jackpot, damage variance) credit
 * the bot's economy correctly and the opponent minimap reflects
 * a realistic creep attrition curve.
 *
 * Simplifications vs. the real `TowerManager`/`Tower` pipeline:
 *  - No projectile travel time (hits resolve immediately).
 *  - Targeting mode is always "first-in-line" (closest to the path end).
 *  - Range-bonus and growth_scaling traits are ignored (minor fidelity).
 *  - Creeps have no armor / shield / mage resistances.
 *
 * These simplifications are fine because the sim only exists to
 * drive the CPU's economy and the opponent-minimap visuals — the
 * user never directly sees the damage numbers.
 */
export class OpponentSimulation {
  grid: Grid;
  private versus: VersusManager;
  private difficulty: DifficultyHints;
  private mapDef: MapDefinition;
  creeps: SimCreep[] = [];
  private spawnQueue: { typeId: string; hp: number; speed: number }[] = [];
  private spawnTimer: number = 0;
  private spawnInterval: number = 500;
  paths: (PathPoint[] | null)[] = [];
  private waveActive: boolean = false;

  /** Per-cell tower combat state. Keyed `col,row`. */
  private simTowers: Map<string, SimTower> = new Map();
  /** Monotonic sim clock (ms). Used for cooldown/status-effect timing. */
  private simTime: number = 0;

  /** Creeps that leaked since the last drain. For CPU-opponent 1v1,
   *  GameScene reads these each tick and applies life loss + game-
   *  over detection against `versus.opponentLives`. */
  private pendingLeaks: number = 0;
  /** Typed kills since the last drain. Used by CPU-opponent 1v1 to
   *  credit the bot's economy. */
  private pendingKills: { typeId: string; isBoss: boolean }[] = [];
  /** Per-hit / per-kill gold earned since the last drain. Routed
   *  into the CPU bot's EconomyManager so void siphon / gambler /
   *  soul drain credit correctly. */
  private pendingGold: number = 0;

  constructor(versus: VersusManager, mapDef: MapDefinition, difficulty: DifficultyHints) {
    this.versus = versus;
    this.mapDef = mapDef;
    this.difficulty = difficulty;
    this.grid = new Grid(mapDef);
    this.recalcPaths();
  }

  /** Rebuild grid + resynthesise the SimTower set from the
   *  authoritative opponentTowers list. Preserves cooldowns for
   *  towers that are still there (by col,row key). */
  rebuildGrid(): void {
    this.grid = new Grid(this.mapDef);
    const prev = this.simTowers;
    this.simTowers = new Map();
    for (const t of this.versus.opponentTowers) {
      const def = TOWER_TYPES[t.towerId];
      if (!def) continue;
      const isMobile = def.traits.some(tr => tr.id === 'mobile_unit');
      // Mobile towers don't block grid
      if (!isMobile && t.col >= 0 && t.col < GRID_COLS && t.row >= 0 && t.row < GRID_ROWS) {
        this.grid.placeTower(t.col, t.row);
      }
      const key = `${t.col},${t.row}`;
      const prevSim = prev.get(key);
      const sim = this.buildSimTower(t.towerId, t.level, t.col, t.row, isMobile);
      if (prevSim && prevSim.towerId === sim.towerId) {
        // Preserve cooldown so upgrades don't reset firing.
        sim.lastFireAt = prevSim.lastFireAt;
      }
      this.simTowers.set(key, sim);
    }
    // Pass 2 — apply adjacency buffs (e.g. Nature Blossom) to neighbouring towers.
    this.applyAdjacencyBuffs();
    this.recalcPaths();
  }

  private buildSimTower(towerId: string, level: number, col: number, row: number, isMobile: boolean): SimTower {
    const def = TOWER_TYPES[towerId];
    // Resolve current-level stats via the upgrade ladder.
    let dmg = def.damage, rng = def.range, fr = def.fireRate;
    for (const up of def.upgrades) {
      if (up.level <= level) {
        dmg = up.damage; rng = up.range; fr = up.fireRate;
      }
    }
    const sim: SimTower = {
      col, row, towerId, level,
      damage: dmg, range: rng, rangeSq: (rng * TILE_SIZE) * (rng * TILE_SIZE),
      fireRateMs: fr, lastFireAt: -fr,
      splashRadius: 0,
      slowFactor: 1, slowDuration: 0,
      rootChance: 0, rootDuration: 0,
      poisonPctPerSec: 0, poisonDuration: 0,
      goldOnHit: 0, goldOnKill: 0,
      jackpotKillChance: 0, jackpotMissChance: 0,
      dmgVarMin: 1, dmgVarMax: 1,
      auraDamageRadius: 0,
      isMobile,
      isAdjBuffSource: false,
      adjDamagePct: 0, adjRatePct: 0,
      isSupport: dmg === 0 || fr >= 99999 || isMobile,
    };
    for (const tr of def.traits as Trait[]) {
      switch (tr.id) {
        case 'splash_damage': sim.splashRadius = (tr.radius ?? 0); break;
        case 'slow_on_hit':
          sim.slowFactor = (tr.factor ?? 1);
          sim.slowDuration = (tr.duration ?? 0);
          break;
        case 'root_on_hit':
          sim.rootChance = (tr.chance ?? 0);
          sim.rootDuration = (tr.duration ?? 0);
          break;
        case 'poison_dot':
          sim.poisonPctPerSec = (tr.percentPerSec ?? 0);
          sim.poisonDuration = (tr.duration ?? 0);
          break;
        case 'gold_on_hit': sim.goldOnHit = (tr.amount ?? 0); break;
        case 'gold_on_kill': sim.goldOnKill = (tr.amount ?? 0); break;
        case 'jackpot':
          sim.jackpotKillChance = (tr.killChance ?? 0);
          sim.jackpotMissChance = (tr.missChance ?? 0);
          break;
        case 'damage_variance':
          sim.dmgVarMin = (tr.min ?? 1);
          sim.dmgVarMax = (tr.max ?? 1);
          break;
        case 'tower_aura_damage': sim.auraDamageRadius = (tr.radius ?? 0); break;
        case 'adjacency_buff':
          sim.isAdjBuffSource = true;
          sim.adjDamagePct = (tr.damagePercent ?? 0);
          sim.adjRatePct = (tr.ratePercent ?? 0);
          break;
      }
    }
    return sim;
  }

  /** Apply Blossom-style adjacency buffs to each tower's effective
   *  damage / fire-rate. Only counts orthogonal + diagonal
   *  neighbours (Chebyshev distance ≤ 1). Multiple buff sources
   *  stack additively — same as the live game. */
  private applyAdjacencyBuffs(): void {
    const sources: SimTower[] = [];
    for (const t of this.simTowers.values()) if (t.isAdjBuffSource) sources.push(t);
    if (sources.length === 0) return;
    for (const t of this.simTowers.values()) {
      if (t.isSupport) continue;
      let dmgMult = 1, rateMult = 1;
      for (const s of sources) {
        if (s === t) continue;
        const dc = Math.abs(s.col - t.col), dr = Math.abs(s.row - t.row);
        if (dc <= 1 && dr <= 1) {
          dmgMult += s.adjDamagePct * (s.level || 1);
          rateMult += s.adjRatePct * (s.level || 1);
        }
      }
      if (dmgMult !== 1) t.damage *= dmgMult;
      if (rateMult !== 1) t.fireRateMs = Math.max(50, t.fireRateMs / rateMult);
    }
  }

  private recalcPaths(): void {
    this.paths = [];
    for (const entry of this.grid.entries) {
      for (const exit of this.grid.exits) {
        this.paths.push(findPath(this.grid, entry, exit));
      }
    }
  }

  startWave(waveDef: WaveDefinition): void {
    this.rebuildGrid();
    this.spawnQueue = [];

    for (const group of waveDef.groups) {
      const ct = CREEP_TYPES[group.creepType];
      if (!ct) continue;
      const resolved = ct.applyDifficulty(this.difficulty);
      const count = Math.round(group.count * (ct.count || 1) * resolved.countMult);

      for (let i = 0; i < count; i++) {
        this.spawnQueue.push({
          typeId: group.creepType,
          hp: Math.round(group.hpScale * ct.hpMultiplier * resolved.hpMult),
          speed: 80 * group.speedScale * ct.speedMultiplier * resolved.speedMult,
        });
      }
    }

    this.spawnInterval = waveDef.spawnInterval || 500;
    this.spawnTimer = 0;
    this.waveActive = true;
  }

  /** Main per-frame tick. Spawns, moves, resolves tower combat. */
  update(delta: number): void {
    this.simTime += delta;

    // --- Spawn ---
    if (this.spawnQueue.length > 0) {
      this.spawnTimer -= delta;
      if (this.spawnTimer <= 0) {
        const entry = this.spawnQueue.shift()!;
        const ct = CREEP_TYPES[entry.typeId];
        const pathIdx = this.paths.length > 1
          ? Math.floor(Math.random() * this.paths.length)
          : 0;
        const path = this.paths[pathIdx];
        if (path && path.length >= 2) {
          this.creeps.push({
            x: gridX(path[0].col), y: gridY(path[0].row),
            hp: entry.hp, maxHp: entry.hp,
            speed: entry.speed, baseSpeed: entry.speed,
            pathIndex: 1, path,
            alive: true, reached: false,
            color: ct?.color ?? 0xff4444,
            size: ct?.size ?? 1,
            isBoss: entry.typeId === 'boss',
            typeId: entry.typeId,
            slowUntil: 0, slowFactor: 1,
            rootUntil: 0,
            poisons: [],
          });
        }
        this.spawnTimer = this.spawnInterval;
      }
    }

    // --- Poison ticks + status cleanup ---
    const deltaSec = delta / 1000;
    for (const c of this.creeps) {
      if (!c.alive || c.reached) continue;
      // Clear expired slow / root
      if (c.slowUntil <= this.simTime) c.slowFactor = 1;
      // Apply poisons (sum DPS across active stacks)
      let pDps = 0;
      for (let i = c.poisons.length - 1; i >= 0; i--) {
        if (c.poisons[i].expiresAt <= this.simTime) c.poisons.splice(i, 1);
        else pDps += c.poisons[i].dps;
      }
      if (pDps > 0) {
        c.hp -= pDps * deltaSec;
        if (c.hp <= 0) this.killCreep(c, null);
      }
    }

    // --- Tower-aura DoTs (Spore) — poison everything in radius ---
    for (const t of this.simTowers.values()) {
      if (t.auraDamageRadius <= 0 || t.poisonPctPerSec <= 0) continue;
      const tx = gridX(t.col), ty = gridY(t.row);
      const r2 = t.auraDamageRadius * t.auraDamageRadius;
      for (const c of this.creeps) {
        if (!c.alive || c.reached) continue;
        const dx = c.x - tx, dy = c.y - ty;
        if (dx * dx + dy * dy <= r2) {
          // Refresh / extend the poison slot for this tower.
          const dps = c.maxHp * t.poisonPctPerSec;
          c.poisons.push({ dps, expiresAt: this.simTime + t.poisonDuration });
        }
      }
    }

    // --- Tower firing ---
    for (const t of this.simTowers.values()) {
      if (t.isSupport) continue;
      if (this.simTime - t.lastFireAt < t.fireRateMs) continue;
      const target = this.pickTarget(t);
      if (!target) continue;
      t.lastFireAt = this.simTime;
      this.fire(t, target);
    }

    // --- Movement + leak detection ---
    for (const c of this.creeps) {
      if (!c.alive || c.reached) continue;
      if (c.rootUntil > this.simTime) continue;
      if (c.pathIndex >= c.path.length) {
        c.reached = true;
        this.pendingLeaks++;
        continue;
      }
      const target = c.path[c.pathIndex];
      const tx = gridX(target.col), ty = gridY(target.row);
      const dx = tx - c.x, dy = ty - c.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const speed = c.baseSpeed * c.slowFactor;
      const move = speed * deltaSec;
      if (dist <= move) {
        c.x = tx; c.y = ty; c.pathIndex++;
      } else if (dist > 0) {
        c.x += (dx / dist) * move; c.y += (dy / dist) * move;
      }
    }

    // --- Cleanup ---
    this.creeps = this.creeps.filter(c => c.alive && !c.reached);

    // --- Wave-clear detection ---
    if (this.waveActive && this.spawnQueue.length === 0 && this.creeps.length === 0) {
      this.waveActive = false;
    }
  }

  /** Pick the creep in range that's furthest along its path
   *  (closest to the exit) — mirrors the default 'first'
   *  targeting mode in the live game. */
  private pickTarget(t: SimTower): SimCreep | null {
    const tx = gridX(t.col), ty = gridY(t.row);
    let best: SimCreep | null = null;
    let bestProgress = -1;
    for (const c of this.creeps) {
      if (!c.alive || c.reached) continue;
      const dx = c.x - tx, dy = c.y - ty;
      if (dx * dx + dy * dy > t.rangeSq) continue;
      if (c.pathIndex > bestProgress) {
        bestProgress = c.pathIndex;
        best = c;
      }
    }
    return best;
  }

  /** Resolve a shot from `t` against `target`. Applies damage,
   *  variance, splash, status effects, per-hit gold. */
  private fire(t: SimTower, target: SimCreep): void {
    // Jackpot — instant kill / miss dice roll. Kill slice halves
    // against bosses so the shadow sim matches the real jackpot
    // handler's boss resistance (Tower tracks this via HitTarget.isBoss).
    if (t.jackpotKillChance > 0 || t.jackpotMissChance > 0) {
      const killChance = target.isBoss ? t.jackpotKillChance * 0.5 : t.jackpotKillChance;
      const r = Math.random();
      if (r < killChance) {
        this.applyHit(t, target, target.hp + 1);
        this.creditGoldOnHit(t);
        return;
      }
      if (r < killChance + t.jackpotMissChance) {
        this.creditGoldOnHit(t); // counts as a shot
        return;
      }
    }

    // Base damage with variance (spike, oblivion).
    const variance = t.dmgVarMin + Math.random() * (t.dmgVarMax - t.dmgVarMin);
    const dmg = t.damage * variance;

    this.applyHit(t, target, dmg);
    // Splash around the target.
    if (t.splashRadius > 0) {
      const r2 = t.splashRadius * t.splashRadius;
      for (const c of this.creeps) {
        if (c === target || !c.alive || c.reached) continue;
        const dx = c.x - target.x, dy = c.y - target.y;
        if (dx * dx + dy * dy <= r2) this.applyHit(t, c, dmg);
      }
    }
    this.creditGoldOnHit(t);
  }

  /** Apply a single hit's damage + on-hit debuffs to a creep.
   *  Credits gold_on_kill through the bot's event path. */
  private applyHit(t: SimTower, c: SimCreep, dmg: number): void {
    c.hp -= dmg;
    if (t.slowDuration > 0 && t.slowFactor < 1) {
      c.slowFactor = Math.min(c.slowFactor, t.slowFactor);
      c.slowUntil = Math.max(c.slowUntil, this.simTime + t.slowDuration);
    }
    if (t.rootChance > 0 && Math.random() < t.rootChance) {
      c.rootUntil = Math.max(c.rootUntil, this.simTime + t.rootDuration);
    }
    if (t.poisonPctPerSec > 0 && t.poisonDuration > 0) {
      const dps = c.maxHp * t.poisonPctPerSec;
      c.poisons.push({ dps, expiresAt: this.simTime + t.poisonDuration });
    }
    if (c.hp <= 0) this.killCreep(c, t);
  }

  /** Mark a creep dead and credit any per-kill gold from the
   *  killing tower (Soul Drain). */
  private killCreep(c: SimCreep, killer: SimTower | null): void {
    if (!c.alive) return;
    c.alive = false;
    this.pendingKills.push({ typeId: c.typeId, isBoss: c.isBoss });
    if (killer && killer.goldOnKill > 0) {
      this.pendingGold += killer.goldOnKill;
    }
  }

  private creditGoldOnHit(t: SimTower): void {
    if (t.goldOnHit > 0) this.pendingGold += t.goldOnHit;
  }

  isWaveActive(): boolean {
    return this.waveActive;
  }

  /** Drain accumulated leaks/kills/gold since the last call. */
  drainEvents(): { leaks: number; kills: { typeId: string; isBoss: boolean }[]; goldEarned: number } {
    const out = {
      leaks: this.pendingLeaks,
      kills: this.pendingKills,
      goldEarned: this.pendingGold,
    };
    this.pendingLeaks = 0;
    this.pendingKills = [];
    this.pendingGold = 0;
    return out;
  }

  /** Queue extra creeps for the CPU side — the shadow-sim equivalent
   *  of `SendManager.queueSend`. */
  enqueueSend(opt: SendCreepOption): void {
    const ct = CREEP_TYPES[opt.creepType];
    if (!ct) return;
    const count = opt.count * (ct.count || 1);
    const tmpl = this.spawnQueue[0];
    const hp = tmpl ? tmpl.hp : Math.round(20 * ct.hpMultiplier);
    const speed = tmpl ? tmpl.speed : 80 * ct.speedMultiplier;
    for (let i = 0; i < count; i++) {
      this.spawnQueue.push({ typeId: opt.creepType, hp, speed });
    }
    this.waveActive = true;
  }
}
