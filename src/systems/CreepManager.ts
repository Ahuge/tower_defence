import { EconomyManager } from './EconomyManager';
import { StatsTracker } from './StatsTracker';
import { EventBus } from './EventBus';
import { EventLog } from '../ui/EventLog';
import { Creep } from '../entities/Creep';

export interface LeakResult {
  totalLeakDamage: number;
  leakCount: number;
}

/**
 * Manages creep lifecycle: movement updates, leak handling,
 * kill processing, and dead creep cleanup.
 */
export class CreepManager {
  creeps: Creep[] = [];
  private economy: EconomyManager;
  private statsTracker: StatsTracker;
  private eventBus: EventBus;
  private eventLog: EventLog;
  private killGoldMult: number;
  totalCreepsKilled: number = 0;

  constructor(
    economy: EconomyManager,
    statsTracker: StatsTracker,
    eventBus: EventBus,
    eventLog: EventLog,
    killGoldMult: number = 1,
  ) {
    this.economy = economy;
    this.statsTracker = statsTracker;
    this.eventBus = eventBus;
    this.eventLog = eventLog;
    this.killGoldMult = killGoldMult;
  }

  /** Update all creeps, process leaks and kills. Returns leak damage. */
  update(delta: number): LeakResult {
    // Move creeps
    for (const creep of this.creeps) {
      creep.update(delta, this.creeps);
    }

    // Process leaks
    let totalLeakDamage = 0;
    let leakCount = 0;
    for (const creep of this.creeps) {
      if (creep.reached) {
        const leakDamage = creep.isBoss ? 5 : 1;
        totalLeakDamage += leakDamage;
        leakCount++;
        this.eventBus.emit('livesChanged', -leakDamage);
        this.eventLog.gameMessage(leakDamage > 1 ? `BOSS leaked! -${leakDamage} lives` : 'Creep reached exit! -1 life');
        this.statsTracker.recordLeak();
        creep.reached = false;
        creep.alive = false;
      }
    }

    // Process kills
    for (const creep of this.creeps) {
      if (!creep.alive && !creep.reached && creep.hp <= 0) {
        const killGold = Math.round(this.economy.getKillGold() * this.killGoldMult);
        this.eventBus.emit('creepKilled', 0, killGold);
        this.totalCreepsKilled++;
        this.statsTracker.recordKill();
        this.statsTracker.recordGoldEarned(killGold);
        creep.hp = -999;
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
