import { LeakHandler } from './CreepManager';
import { CircleManager } from './multiplayer/CircleManager';
import { StatsTracker } from './StatsTracker';
import { EventLog } from '../ui/EventLog';
import { Creep } from '../entities/Creep';

/**
 * Circle Co-op leak handler: leaked creeps reduce shared lives.
 * Host is authoritative for life count and broadcasts to all.
 */
export class CircleLeakHandler implements LeakHandler {
  private circle: CircleManager;
  private statsTracker: StatsTracker;
  private eventLog: EventLog;

  constructor(circle: CircleManager, statsTracker: StatsTracker, eventLog: EventLog) {
    this.circle = circle;
    this.statsTracker = statsTracker;
    this.eventLog = eventLog;
  }

  onCreepLeaked(creep: Creep): number {
    const damage = creep.isBoss ? 5 : 1;
    const label = creep.isBoss ? 'BOSS' : 'Creep';
    this.eventLog.gameMessage(`${label} completed the loop! -${damage} shared life${damage > 1 ? 's' : ''}`);
    this.statsTracker.recordLeak();

    // Host deducts shared lives and broadcasts
    if (this.circle.isHost) {
      this.circle.deductLives(damage);
    }

    return damage;
  }
}
