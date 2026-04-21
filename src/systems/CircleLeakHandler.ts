import { LeakHandler } from './CreepManager';
import { CircleManager } from './multiplayer/CircleManager';
import { StatsTracker } from './StatsTracker';
import { EventLog } from '../ui/EventLog';
import { Creep } from '../entities/Creep';

/**
 * Circle Co-op leak handler — shared-pool life accounting.
 *
 * Host is authoritative: when a creep reaches its exit, the host's
 * `CircleManager.deductLives()` decrements the shared pool + broadcasts
 * the new total. Joiners' copies of `sharedLives` only ever change
 * via inbound `lives_update` messages (see CircleManager.handleMessage).
 *
 * We unconditionally call `deductLives` here; the defensive early-
 * return inside `deductLives` makes it a no-op on non-host. That
 * removes a branch in this file and keeps the authority boundary
 * in one place — CircleManager.
 *
 * The `this.lives` scalar in GameScene and `sharedLives` in
 * CircleManager both track the same quantity in circle mode. See
 * `GameScene.update()` — the per-frame sync block pulls
 * `sharedLives` into `this.lives` on joiners, and copies the other
 * direction on host, so the UI layer can keep reading `this.lives`
 * without caring about which peer it's running on.
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
    // Authoritative on host, no-op on joiner — the gate lives in
    // CircleManager.deductLives so there's one single place that
    // decides who actually mutates shared state.
    this.circle.deductLives(damage);
    return damage;
  }
}
