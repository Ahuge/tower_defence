import { DeathHandler } from './CreepManager';
import { EconomyManager } from './EconomyManager';
import { StatsTracker } from './StatsTracker';
import { EventBus } from './EventBus';
import { Creep } from '../entities/Creep';

/**
 * Circle Co-op death handler: only awards kill gold if the
 * killing tower belongs to the local player.
 */
export class CircleDeathHandler implements DeathHandler {
  private economy: EconomyManager;
  private statsTracker: StatsTracker;
  private eventBus: EventBus;
  private killGoldMult: number;
  private towerOwners: Map<string, number>;
  private myPlayerIndex: number;

  constructor(
    economy: EconomyManager,
    statsTracker: StatsTracker,
    eventBus: EventBus,
    killGoldMult: number,
    towerOwners: Map<string, number>,
    myPlayerIndex: number,
  ) {
    this.economy = economy;
    this.statsTracker = statsTracker;
    this.eventBus = eventBus;
    this.killGoldMult = killGoldMult;
    this.towerOwners = towerOwners;
    this.myPlayerIndex = myPlayerIndex;
  }

  onCreepKilled(creep: Creep): void {
    this.statsTracker.recordKill();

    // Check if the killing tower belongs to this player
    const key = `${creep.lastHitCol},${creep.lastHitRow}`;
    const owner = this.towerOwners.get(key);

    // Award gold only if we own the tower (or it's untracked — our own pre-circle towers)
    if (owner === this.myPlayerIndex || owner === undefined) {
      const killGold = Math.round(this.economy.getKillGold() * this.killGoldMult);
      this.eventBus.emit('creepKilled', 0, killGold);
      this.statsTracker.recordGoldEarned(killGold);
    }
  }
}
