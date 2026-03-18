import { EconomyManager } from './EconomyManager';
import { StatsTracker } from './StatsTracker';
import { EventBus } from './EventBus';
import { EventLog } from '../ui/EventLog';
import { Creep } from '../entities/Creep';

/**
 * Called when a creep reaches the exit. Different game modes handle
 * this differently:
 * - Standard: subtract lives
 * - Hero Defense: route creep to hero arena
 * - Circle Co-op: pass to next player's sector
 */
export interface LeakHandler {
  onCreepLeaked(creep: Creep): number; // returns life damage (0 if handled otherwise)
}

/**
 * Called when a creep is killed. Different modes can add behavior:
 * - Standard: award gold
 * - Hero Defense: hero arena kills award 50% gold
 */
export interface DeathHandler {
  onCreepKilled(creep: Creep): void;
}

/** Standard leak handler: boss = 5 lives, normal = 1 life */
export class StandardLeakHandler implements LeakHandler {
  private eventLog: EventLog;
  private statsTracker: StatsTracker;

  constructor(eventLog: EventLog, statsTracker: StatsTracker) {
    this.eventLog = eventLog;
    this.statsTracker = statsTracker;
  }

  onCreepLeaked(creep: Creep): number {
    const damage = creep.isBoss ? 5 : 1;
    this.eventLog.gameMessage(damage > 1 ? `BOSS leaked! -${damage} lives` : 'Creep reached exit! -1 life');
    this.statsTracker.recordLeak();
    return damage;
  }
}

/** Standard death handler: award kill gold */
export class StandardDeathHandler implements DeathHandler {
  private economy: EconomyManager;
  private statsTracker: StatsTracker;
  private eventBus: EventBus;
  private killGoldMult: number;

  constructor(economy: EconomyManager, statsTracker: StatsTracker, eventBus: EventBus, killGoldMult: number) {
    this.economy = economy;
    this.statsTracker = statsTracker;
    this.eventBus = eventBus;
    this.killGoldMult = killGoldMult;
  }

  onCreepKilled(creep: Creep): void {
    const killGold = Math.round(this.economy.getKillGold() * this.killGoldMult);
    this.eventBus.emit('creepKilled', 0, killGold);
    this.statsTracker.recordKill();
    this.statsTracker.recordGoldEarned(killGold);
  }
}

export interface LeakResult {
  totalLeakDamage: number;
  leakCount: number;
}

/**
 * Manages creep lifecycle: movement, leaks, kills, cleanup.
 * Leak and death behavior is pluggable via handlers.
 */
export class CreepManager {
  creeps: Creep[] = [];
  totalCreepsKilled: number = 0;
  leakHandler: LeakHandler;
  deathHandler: DeathHandler;

  constructor(leakHandler: LeakHandler, deathHandler: DeathHandler) {
    this.leakHandler = leakHandler;
    this.deathHandler = deathHandler;
  }

  /** Update all creeps, process leaks and kills. Returns leak damage. */
  update(delta: number): LeakResult {
    // Move creeps
    for (const creep of this.creeps) {
      creep.update(delta, this.creeps);
    }

    // Process leaks via handler
    let totalLeakDamage = 0;
    let leakCount = 0;
    for (const creep of this.creeps) {
      if (creep.reached) {
        const damage = this.leakHandler.onCreepLeaked(creep);
        totalLeakDamage += damage;
        leakCount++;
        creep.reached = false;
        creep.alive = false;
      }
    }

    // Process kills via handler
    for (const creep of this.creeps) {
      if (!creep.alive && !creep.reached && creep.hp <= 0) {
        this.deathHandler.onCreepKilled(creep);
        this.totalCreepsKilled++;
        creep.hp = -999; // sentinel to prevent double-processing
      }
    }

    // Clean up dead
    this.creeps = this.creeps.filter(c => c.alive);

    return { totalLeakDamage, leakCount };
  }

  /** Find nearest creep to a pixel position */
  findCreepNear(px: number, py: number, maxDist: number): Creep | null {
    let closest: Creep | null = null;
    let closestDist = maxDist;
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
}
