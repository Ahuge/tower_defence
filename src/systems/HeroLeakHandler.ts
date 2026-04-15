import { LeakHandler } from './CreepManager';
import { ArenaManager } from './ArenaManager';
import { StatsTracker } from './StatsTracker';
import { EventLog } from '../ui/EventLog';
import { Creep } from '../entities/Creep';

/**
 * Hero Defense leak handler: instead of losing lives, leaked creeps
 * spawn in the hero arena where the player-controlled hero fights them.
 * Returns 0 damage — base HP is managed separately by ArenaManager.
 */
export class HeroLeakHandler implements LeakHandler {
  private arenaManager: ArenaManager;
  private statsTracker: StatsTracker;
  private eventLog: EventLog;

  constructor(arenaManager: ArenaManager, statsTracker: StatsTracker, eventLog: EventLog) {
    this.arenaManager = arenaManager;
    this.statsTracker = statsTracker;
    this.eventLog = eventLog;
  }

  onCreepLeaked(creep: Creep): number {
    // Convert TD creep to arena creep data — carry over tower damage and sprite info
    this.arenaManager.spawnArenaCreep({
      hp: Math.round(creep.hp),
      speed: creep.baseSpeed * 0.5,
      isBoss: creep.isBoss,
      color: creep.color,
      size: creep.size,
      creepTypeId: creep.creepTypeId,
    });

    const label = creep.isBoss ? 'BOSS' : 'Creep';
    this.eventLog.gameMessage(`${label} leaked → arena!`);
    this.statsTracker.recordLeak();

    // Return 0 — no direct life damage; arena handles base HP
    return 0;
  }
}
